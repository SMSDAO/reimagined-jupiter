import { Connection } from "@solana/web3.js";
import { ArbitrageOpportunity, TokenConfig } from "../types.js";
import { JupiterV6Integration } from "../integrations/jupiter.js";
import { config, SUPPORTED_TOKENS } from "../config/index.js";

export interface ScannerConfig {
  pollingIntervalMs: number;
  enableNotifications: boolean;
  minProfitThreshold: number;
  maxSlippage: number;
  minConfidence: number;
  batchSize?: number;
  startAmount?: number;
  estimatedGasFeeLamports?: number;
}

export type OpportunityCallback = (opportunity: ArbitrageOpportunity) => void;

export class RealTimeArbitrageScanner {
  private connection: Connection;
  private jupiter: JupiterV6Integration;
  private scannerConfig: ScannerConfig;
  private isScanning: boolean;
  private scanIntervalId: NodeJS.Timeout | null;
  private opportunityCallbacks: OpportunityCallback[];
  private tokenPairs: Array<{
    tokenA: TokenConfig;
    tokenB: TokenConfig;
    tokenC: TokenConfig;
  }>;
  private intervals: Set<NodeJS.Timeout>;
  private isCleanedUp: boolean = false;

  constructor(connection: Connection, customConfig?: Partial<ScannerConfig>) {
    this.connection = connection;
    this.jupiter = new JupiterV6Integration(connection);
    this.scannerConfig = {
      pollingIntervalMs:
        customConfig?.pollingIntervalMs ?? config.scanner.pollingIntervalMs,
      enableNotifications:
        customConfig?.enableNotifications ?? config.scanner.enableNotifications,
      minProfitThreshold:
        customConfig?.minProfitThreshold ?? config.arbitrage.minProfitThreshold,
      maxSlippage: customConfig?.maxSlippage ?? config.arbitrage.maxSlippage,
      minConfidence:
        customConfig?.minConfidence ?? config.scanner.minConfidence,
      batchSize: customConfig?.batchSize ?? 10,
      startAmount: customConfig?.startAmount ?? 1000000,
      estimatedGasFeeLamports: customConfig?.estimatedGasFeeLamports ?? 10000,
    };
    this.isScanning = false;
    this.scanIntervalId = null;
    this.opportunityCallbacks = [];
    this.tokenPairs = [];
    this.intervals = new Set();

    // Register cleanup handlers for process termination
    this.registerCleanupHandlers();
  }

  /**
   * Initialize token pairs for scanning
   * @param tokens Optional array of token symbols to scan. If not provided, uses all supported tokens
   */
  initializeTokenPairs(tokens?: string[]): void {
    const tokensToScan = tokens || SUPPORTED_TOKENS.map((t) => t.symbol);
    this.tokenPairs = [];

    // Generate all possible triangular arbitrage paths (A -> B -> C -> A)
    for (let i = 0; i < tokensToScan.length; i++) {
      for (let j = 0; j < tokensToScan.length; j++) {
        for (let k = 0; k < tokensToScan.length; k++) {
          if (i !== j && j !== k && i !== k) {
            const tokenA = SUPPORTED_TOKENS.find(
              (t) => t.symbol === tokensToScan[i],
            );
            const tokenB = SUPPORTED_TOKENS.find(
              (t) => t.symbol === tokensToScan[j],
            );
            const tokenC = SUPPORTED_TOKENS.find(
              (t) => t.symbol === tokensToScan[k],
            );

            if (tokenA && tokenB && tokenC) {
              this.tokenPairs.push({ tokenA, tokenB, tokenC });
            }
          }
        }
      }
    }

    console.log(
      `[Scanner] Initialized ${this.tokenPairs.length} token pair combinations for scanning`,
    );
  }

  /**
   * Register a callback to be called when profitable opportunities are found
   */
  onOpportunityFound(callback: OpportunityCallback): void {
    this.opportunityCallbacks.push(callback);
  }

  /**
   * Start continuous scanning for arbitrage opportunities
   */
  async startScanning(): Promise<void> {
    if (this.isScanning) {
      console.warn("[Scanner] Already scanning");
      return;
    }

    if (this.tokenPairs.length === 0) {
      console.log(
        "[Scanner] No token pairs initialized. Initializing with default tokens...",
      );
      this.initializeTokenPairs();
    }

    this.isScanning = true;
    console.log(
      `[Scanner] Starting continuous scan every ${this.scannerConfig.pollingIntervalMs}ms`,
    );

    // Run initial scan immediately
    await this.performScan();

    // Schedule periodic scans
    this.scanIntervalId = setInterval(async () => {
      if (this.isScanning) {
        await this.performScan();
      }
    }, this.scannerConfig.pollingIntervalMs);

    // Track the interval for cleanup
    if (this.scanIntervalId) {
      this.intervals.add(this.scanIntervalId);
    }
  }

  /**
   * Stop continuous scanning
   */
  stopScanning(): void {
    if (!this.isScanning) {
      console.warn("[Scanner] Not currently scanning");
      return;
    }

    this.isScanning = false;
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    console.log("[Scanner] Scanning stopped");
  }

  /**
   * Perform a single scan of all token pairs
   */
  private async performScan(): Promise<void> {
    console.log(
      `[Scanner] Performing scan of ${this.tokenPairs.length} token pairs...`,
    );
    const startTime = Date.now();
    let opportunitiesFound = 0;

    // Scan in batches to avoid overwhelming the API
    const batchSize = this.scannerConfig.batchSize || 10;
    for (let i = 0; i < this.tokenPairs.length; i += batchSize) {
      const batch = this.tokenPairs.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((pair) =>
          this.scanTriangleArbitrage(pair.tokenA, pair.tokenB, pair.tokenC),
        ),
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value) {
          opportunitiesFound++;
          this.notifyOpportunity(result.value);
        } else if (result.status === "rejected") {
          // Log rejected results at debug level
          if (process.env.DEBUG_SCANNER === "true") {
            console.debug(`[Scanner] Scan rejected: ${result.reason}`);
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Scanner] Scan completed in ${duration}ms. Found ${opportunitiesFound} opportunities`,
    );
  }

  /**
   * Scan for triangle arbitrage opportunity for a specific path
   */
  async scanTriangleArbitrage(
    tokenA: TokenConfig,
    tokenB: TokenConfig,
    tokenC: TokenConfig,
  ): Promise<ArbitrageOpportunity | null> {
    try {
      // Use configured start amount, adjusting for token decimals
      const baseAmount = this.scannerConfig.startAmount || 1000000;
      const startAmount = Math.floor(
        (baseAmount * Math.pow(10, tokenA.decimals)) / 1e9,
      );
      const timestamp = Date.now();

      // Get quote for A -> B
      const quoteAB = await this.jupiter.getQuote(
        tokenA.mint.toString(),
        tokenB.mint.toString(),
        startAmount,
      );

      if (!quoteAB) return null;

      const amountB = parseInt(quoteAB.outAmount);
      const priceImpactAB = parseFloat(quoteAB.priceImpactPct);

      // Get quote for B -> C
      const quoteBC = await this.jupiter.getQuote(
        tokenB.mint.toString(),
        tokenC.mint.toString(),
        amountB,
      );

      if (!quoteBC) return null;

      const amountC = parseInt(quoteBC.outAmount);
      const priceImpactBC = parseFloat(quoteBC.priceImpactPct);

      // Get quote for C -> A
      const quoteCA = await this.jupiter.getQuote(
        tokenC.mint.toString(),
        tokenA.mint.toString(),
        amountC,
      );

      if (!quoteCA) return null;

      const finalAmountA = parseInt(quoteCA.outAmount);
      const priceImpactCA = parseFloat(quoteCA.priceImpactPct);

      // Calculate profit and metrics
      const rawProfit = finalAmountA - startAmount;
      const totalPriceImpact = priceImpactAB + priceImpactBC + priceImpactCA;

      // Use configured gas fee estimate (in lamports)
      const estimatedGasFee =
        this.scannerConfig.estimatedGasFeeLamports || 10000;
      const profitAfterGas = rawProfit - estimatedGasFee;

      // Calculate profit percentage
      const profitPercent = (profitAfterGas / startAmount) * 100;

      // Estimate slippage from price impact
      const estimatedSlippage = Math.abs(totalPriceImpact) / 100;

      // Calculate confidence based on price impact and profit margin
      let confidence = 0.5;
      if (Math.abs(totalPriceImpact) < 1) confidence += 0.2; // Low price impact
      if (profitPercent > 1) confidence += 0.2; // Good profit margin
      if (profitPercent > 2) confidence += 0.1; // Excellent profit margin
      confidence = Math.min(confidence, 1.0);

      // Check if opportunity meets minimum criteria
      if (profitPercent < this.scannerConfig.minProfitThreshold * 100) {
        return null;
      }

      if (estimatedSlippage > this.scannerConfig.maxSlippage) {
        return null;
      }

      if (confidence < this.scannerConfig.minConfidence) {
        return null;
      }

      // Extract DEX information from route plans
      const dexes = [
        ...(quoteAB.routePlan || []).map((r) => r.swapInfo.label),
        ...(quoteBC.routePlan || []).map((r) => r.swapInfo.label),
        ...(quoteCA.routePlan || []).map((r) => r.swapInfo.label),
      ];

      const opportunity: ArbitrageOpportunity = {
        type: "triangular",
        path: [tokenA, tokenB, tokenC, tokenA],
        estimatedProfit: profitAfterGas / Math.pow(10, tokenA.decimals),
        requiredCapital: startAmount / Math.pow(10, tokenA.decimals),
        confidence,
        timestamp,
        priceImpact: totalPriceImpact,
        estimatedSlippage,
        estimatedGasFee: estimatedGasFee / 1e9, // Convert to SOL
        routeDetails: {
          dexes: [...new Set(dexes)], // Unique DEX names
          priceImpactPct: totalPriceImpact.toFixed(4),
        },
      };

      console.log(
        `[Scanner] Found opportunity: ${tokenA.symbol} -> ${tokenB.symbol} -> ${tokenC.symbol} -> ${tokenA.symbol}`,
      );
      console.log(
        `[Scanner] Profit: ${opportunity.estimatedProfit.toFixed(6)} ${tokenA.symbol} (${profitPercent.toFixed(2)}%)`,
      );

      return opportunity;
    } catch (error) {
      // Log errors at debug level to avoid flooding logs during continuous scanning
      if (process.env.DEBUG_SCANNER === "true") {
        console.debug(
          `[Scanner] Error scanning ${tokenA.symbol}->${tokenB.symbol}->${tokenC.symbol}:`,
          error,
        );
      }
      return null;
    }
  }

  /**
   * Scan for multiple arbitrage opportunities across token pairs
   */
  async scanForOpportunities(
    tokens: string[],
  ): Promise<ArbitrageOpportunity[]> {
    console.log(
      `[Scanner] Scanning for opportunities with tokens: ${tokens.join(", ")}`,
    );

    const opportunities: ArbitrageOpportunity[] = [];
    const tokenConfigs = tokens
      .map((symbol) => SUPPORTED_TOKENS.find((t) => t.symbol === symbol))
      .filter((t): t is TokenConfig => t !== undefined);

    if (tokenConfigs.length < 3) {
      console.warn("[Scanner] Need at least 3 tokens for triangular arbitrage");
      return opportunities;
    }

    // Generate and scan all triangular paths
    for (let i = 0; i < tokenConfigs.length; i++) {
      for (let j = 0; j < tokenConfigs.length; j++) {
        for (let k = 0; k < tokenConfigs.length; k++) {
          if (i !== j && j !== k && i !== k) {
            const opportunity = await this.scanTriangleArbitrage(
              tokenConfigs[i],
              tokenConfigs[j],
              tokenConfigs[k],
            );

            if (opportunity) {
              opportunities.push(opportunity);
            }
          }
        }
      }
    }

    console.log(
      `[Scanner] Found ${opportunities.length} profitable opportunities`,
    );
    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  /**
   * Notify all registered callbacks of a new opportunity
   */
  private notifyOpportunity(opportunity: ArbitrageOpportunity): void {
    if (this.scannerConfig.enableNotifications) {
      for (const callback of this.opportunityCallbacks) {
        try {
          callback(opportunity);
        } catch (error) {
          console.error("[Scanner] Error in opportunity callback:", error);
        }
      }
    }
  }

  /**
   * Get current scanner configuration
   */
  getConfig(): ScannerConfig {
    return { ...this.scannerConfig };
  }

  /**
   * Update scanner configuration
   */
  updateConfig(newConfig: Partial<ScannerConfig>): void {
    this.scannerConfig = {
      ...this.scannerConfig,
      ...newConfig,
    };
    console.log("[Scanner] Configuration updated:", this.scannerConfig);
  }

  /**
   * Get scanning status
   */
  isRunning(): boolean {
    return this.isScanning;
  }

  /**
   * Get number of token pairs being monitored
   */
  getTokenPairCount(): number {
    return this.tokenPairs.length;
  }

  /**
   * Register cleanup handlers for graceful shutdown
   * Prevents memory leaks by cleaning up intervals on process termination
   */
  private registerCleanupHandlers(): void {
    // Handle SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      if (!this.isCleanedUp) {
        console.log("\n[Scanner] Received SIGINT, cleaning up...");
        this.cleanup();
        process.exit(0);
      }
    });

    // Handle SIGTERM (kill command)
    process.on("SIGTERM", () => {
      if (!this.isCleanedUp) {
        console.log("\n[Scanner] Received SIGTERM, cleaning up...");
        this.cleanup();
        process.exit(0);
      }
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("[Scanner] Uncaught exception:", error);
      this.cleanup();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error(
        "[Scanner] Unhandled rejection at:",
        promise,
        "reason:",
        reason,
      );
      this.cleanup();
      process.exit(1);
    });
  }

  /**
   * Cleanup all resources
   * Clears all intervals and connections to prevent memory leaks
   */
  cleanup(): void {
    if (this.isCleanedUp) {
      return;
    }

    console.log("[Scanner] Cleaning up resources...");

    // Stop scanning
    if (this.isScanning) {
      this.stopScanning();
    }

    // Clear all tracked intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    // Clear scan interval if it exists
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    // Clear callbacks
    this.opportunityCallbacks = [];

    this.isCleanedUp = true;
    console.log("[Scanner] Cleanup complete");
  }

  /**
   * Destroy scanner instance
   * Public method to manually trigger cleanup
   */
  destroy(): void {
    this.cleanup();
  }
}
