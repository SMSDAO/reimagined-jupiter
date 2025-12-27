import { Connection, PublicKey } from "@solana/web3.js";
import {
  BaseFlashLoanProvider,
  MarginfiProvider,
  SolendProvider,
  MangoProvider,
  KaminoProvider,
  PortFinanceProvider,
  SaveFinanceProvider,
  TulipProvider,
  DriftProvider,
  JetProvider,
} from "../providers/flashLoan.js";
import { config, FLASH_LOAN_FEES } from "../config/index.js";

/**
 * Provider Manager for Dynamic Flash Loan Provider Switching
 * Features:
 * - Select provider based on user preferences
 * - Automatic failover to backup providers
 * - Liquidity and availability checking
 * - Provider health monitoring
 */
export class ProviderManager {
  private connection: Connection;
  private providers: Map<string, BaseFlashLoanProvider>;
  private providerHealth: Map<string, boolean>;
  private preferredProviders: string[];

  constructor(connection: Connection, preferredProviders?: string[]) {
    this.connection = connection;
    this.providers = new Map();
    this.providerHealth = new Map();

    // Default order: lowest fee first
    this.preferredProviders = preferredProviders || [
      "marginfi",
      "solend",
      "kamino",
      "tulip",
      "drift",
      "mango",
      "jet",
      "portFinance",
      "saveFinance",
    ];

    this.initializeProviders();
  }

  /**
   * Initialize all available flash loan providers
   */
  private initializeProviders(): void {
    try {
      this.providers.set(
        "marginfi",
        new MarginfiProvider(
          this.connection,
          config.flashLoanProviders.marginfi,
          FLASH_LOAN_FEES.marginfi,
        ),
      );

      this.providers.set(
        "solend",
        new SolendProvider(
          this.connection,
          config.flashLoanProviders.solend,
          FLASH_LOAN_FEES.solend,
        ),
      );

      this.providers.set(
        "mango",
        new MangoProvider(
          this.connection,
          config.flashLoanProviders.mango,
          FLASH_LOAN_FEES.mango,
        ),
      );

      this.providers.set(
        "kamino",
        new KaminoProvider(
          this.connection,
          config.flashLoanProviders.kamino,
          FLASH_LOAN_FEES.kamino,
        ),
      );

      this.providers.set(
        "portFinance",
        new PortFinanceProvider(
          this.connection,
          config.flashLoanProviders.portFinance,
          FLASH_LOAN_FEES.portFinance,
        ),
      );

      this.providers.set(
        "saveFinance",
        new SaveFinanceProvider(
          this.connection,
          config.flashLoanProviders.saveFinance,
          FLASH_LOAN_FEES.saveFinance,
        ),
      );

      this.providers.set(
        "tulip",
        new TulipProvider(
          this.connection,
          config.flashLoanProviders.tulip,
          FLASH_LOAN_FEES.tulip,
        ),
      );

      this.providers.set(
        "drift",
        new DriftProvider(
          this.connection,
          config.flashLoanProviders.drift,
          FLASH_LOAN_FEES.drift,
        ),
      );

      this.providers.set(
        "jet",
        new JetProvider(
          this.connection,
          config.flashLoanProviders.jet,
          FLASH_LOAN_FEES.jet,
        ),
      );

      // Initialize all providers as healthy
      for (const providerName of this.providers.keys()) {
        this.providerHealth.set(providerName, true);
      }

      console.log(
        `[ProviderManager] Initialized ${this.providers.size} providers`,
      );
    } catch (error) {
      console.error("[ProviderManager] Error initializing providers:", error);
    }
  }

  /**
   * Get the best available provider for a loan amount
   * @param tokenMint - Token mint address to borrow
   * @param amount - Amount to borrow
   * @returns Best provider or null if none available
   */
  async getBestProvider(
    tokenMint: PublicKey,
    amount: number,
  ): Promise<{ name: string; provider: BaseFlashLoanProvider } | null> {
    // Input validation
    if (!tokenMint) {
      console.error("[ProviderManager] Invalid tokenMint");
      return null;
    }

    if (!amount || amount <= 0) {
      console.error("[ProviderManager] Invalid amount");
      return null;
    }

    try {
      // Try providers in preferred order
      for (const providerName of this.preferredProviders) {
        const provider = this.providers.get(providerName);
        const isHealthy = this.providerHealth.get(providerName);

        if (!provider || !isHealthy) {
          continue;
        }

        // Check if provider has sufficient liquidity
        const liquidity = await provider.getAvailableLiquidity(tokenMint);
        if (liquidity >= amount) {
          console.log(
            `[ProviderManager] Selected provider: ${providerName} (fee: ${provider.getFee()}%)`,
          );
          return { name: providerName, provider };
        }

        console.log(
          `[ProviderManager] ${providerName} has insufficient liquidity (${liquidity} < ${amount})`,
        );
      }

      console.warn(
        "[ProviderManager] No provider with sufficient liquidity found",
      );
      return null;
    } catch (error) {
      console.error("[ProviderManager] Error getting best provider:", error);
      return null;
    }
  }

  /**
   * Get provider by name
   * @param name - Provider name
   * @returns Provider instance or null
   */
  getProvider(name: string): BaseFlashLoanProvider | null {
    if (!name || typeof name !== "string") {
      console.error("[ProviderManager] Invalid provider name");
      return null;
    }

    const provider = this.providers.get(name);
    if (!provider) {
      console.warn(`[ProviderManager] Provider not found: ${name}`);
      return null;
    }

    return provider;
  }

  /**
   * Set preferred provider order
   * @param providerNames - Array of provider names in preferred order
   */
  setPreferredProviders(providerNames: string[]): void {
    // Input validation
    if (!Array.isArray(providerNames) || providerNames.length === 0) {
      console.error(
        "[ProviderManager] Invalid providerNames: must be non-empty array",
      );
      return;
    }

    // Validate all providers exist
    const validProviders = providerNames.filter((name) =>
      this.providers.has(name),
    );

    if (validProviders.length === 0) {
      console.error("[ProviderManager] No valid providers in list");
      return;
    }

    this.preferredProviders = validProviders;
    console.log(
      `[ProviderManager] Updated preferred providers: ${validProviders.join(", ")}`,
    );
  }

  /**
   * Mark a provider as unhealthy (for failover)
   * @param providerName - Provider name
   */
  markProviderUnhealthy(providerName: string): void {
    if (!providerName || typeof providerName !== "string") {
      return;
    }

    this.providerHealth.set(providerName, false);
    console.warn(`[ProviderManager] Marked ${providerName} as unhealthy`);
  }

  /**
   * Mark a provider as healthy
   * @param providerName - Provider name
   */
  markProviderHealthy(providerName: string): void {
    if (!providerName || typeof providerName !== "string") {
      return;
    }

    this.providerHealth.set(providerName, true);
    console.log(`[ProviderManager] Marked ${providerName} as healthy`);
  }

  /**
   * Get all available providers with their info
   * @returns Array of provider information
   */
  async getAllProvidersInfo(): Promise<
    Array<{
      name: string;
      fee: number;
      healthy: boolean;
      maxLoanAmount: number;
      availableLiquidity: number;
    }>
  > {
    const providersInfo = [];

    // Use SOL as default token for liquidity check
    const { DEFAULT_LIQUIDITY_CHECK_MINT } = await import("../constants.js");
    const solMint = DEFAULT_LIQUIDITY_CHECK_MINT;

    for (const [name, provider] of this.providers) {
      try {
        const maxLoan = await provider.getMaxLoanAmount(solMint);
        const liquidity = await provider.getAvailableLiquidity(solMint);

        providersInfo.push({
          name,
          fee: provider.getFee(),
          healthy: this.providerHealth.get(name) || false,
          maxLoanAmount: maxLoan,
          availableLiquidity: liquidity,
        });
      } catch (error) {
        console.error(
          `[ProviderManager] Error getting info for ${name}:`,
          error,
        );
        providersInfo.push({
          name,
          fee: provider.getFee(),
          healthy: false,
          maxLoanAmount: 0,
          availableLiquidity: 0,
        });
      }
    }

    return providersInfo;
  }

  /**
   * Health check all providers
   * @returns Map of provider names to health status
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    console.log("[ProviderManager] Running health check on all providers...");

    const healthStatus = new Map<string, boolean>();
    const { DEFAULT_LIQUIDITY_CHECK_MINT } = await import("../constants.js");
    const solMint = DEFAULT_LIQUIDITY_CHECK_MINT;

    for (const [name, provider] of this.providers) {
      try {
        // Try to fetch liquidity as a health check
        const liquidity = await provider.getAvailableLiquidity(solMint);
        const isHealthy = liquidity > 0;

        healthStatus.set(name, isHealthy);
        this.providerHealth.set(name, isHealthy);

        console.log(`[ProviderManager] ${name}: ${isHealthy ? "✅" : "❌"}`);
      } catch (error) {
        console.error(
          `[ProviderManager] Health check failed for ${name}:`,
          error,
        );
        healthStatus.set(name, false);
        this.providerHealth.set(name, false);
      }
    }

    return healthStatus;
  }

  /**
   * Get provider statistics
   * @returns Statistics object
   */
  getStatistics(): {
    totalProviders: number;
    healthyProviders: number;
    preferredOrder: string[];
  } {
    const healthyCount = Array.from(this.providerHealth.values()).filter(
      (h) => h,
    ).length;

    return {
      totalProviders: this.providers.size,
      healthyProviders: healthyCount,
      preferredOrder: [...this.preferredProviders],
    };
  }
}
