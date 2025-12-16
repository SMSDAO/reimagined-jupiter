import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterV6Integration } from '../integrations/jupiter.js';
import { PythPriceStreamService } from './pythPriceStream.js';
import { ArbitrageOpportunity, TokenConfig } from '../types.js';

export interface ArbitrageConfig {
  minProfitThreshold: number;
  maxSlippage: number;
  prioritizationFeeLamports: number;
  scanIntervalMs: number;
  enabledAggregators: string[];
}

export interface EnhancedOpportunity extends ArbitrageOpportunity {
  aggregators: string[];
  gasEstimate: number;
  slippage: number;
  timestamp: Date;
  pythPrices?: Record<string, number>;
}

const DEFAULT_CONFIG: ArbitrageConfig = {
  minProfitThreshold: 0.003, // 0.3%
  maxSlippage: 0.01, // 1%
  prioritizationFeeLamports: 5000000, // 5M lamports (0.005 SOL)
  scanIntervalMs: 1000, // 1 second
  enabledAggregators: [
    'Raydium',
    'Orca',
    'Meteora',
    'Pump',
    'Serum',
    'Phoenix',
    'OpenBook',
    'Lifinity',
  ],
};

export class EnhancedArbitrageScanner {
  private connection: Connection;
  private jupiter: JupiterV6Integration;
  private pythStream: PythPriceStreamService | null;
  private config: ArbitrageConfig;
  private isScanning: boolean;
  private scanIntervalId: NodeJS.Timeout | null;
  private opportunityCache: Map<string, EnhancedOpportunity>;
  
  constructor(
    connection: Connection,
    pythStream?: PythPriceStreamService,
    config?: Partial<ArbitrageConfig>
  ) {
    this.connection = connection;
    this.jupiter = new JupiterV6Integration(connection);
    this.pythStream = pythStream || null;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isScanning = false;
    this.scanIntervalId = null;
    this.opportunityCache = new Map();
    
    // Ensure prioritization fee doesn't exceed 10M lamports
    if (this.config.prioritizationFeeLamports > 10000000) {
      console.warn('[EnhancedArbitrage] Capping prioritization fee at 10M lamports');
      this.config.prioritizationFeeLamports = 10000000;
    }
  }
  
  /**
   * Start continuous scanning for arbitrage opportunities
   */
  async startScanning(tokens: string[]): Promise<void> {
    if (this.isScanning) {
      console.log('[EnhancedArbitrage] Scan already running');
      return;
    }
    
    console.log('[EnhancedArbitrage] Starting enhanced arbitrage scanner...');
    console.log(`[EnhancedArbitrage] Scan interval: ${this.config.scanIntervalMs}ms`);
    console.log(`[EnhancedArbitrage] Min profit: ${(this.config.minProfitThreshold * 100).toFixed(2)}%`);
    console.log(`[EnhancedArbitrage] Max slippage: ${(this.config.maxSlippage * 100).toFixed(2)}%`);
    console.log(`[EnhancedArbitrage] Max gas: ${this.config.prioritizationFeeLamports} lamports`);
    console.log(`[EnhancedArbitrage] Aggregators: ${this.config.enabledAggregators.join(', ')}`);
    
    this.isScanning = true;
    
    // Start Pyth price stream if available
    if (this.pythStream) {
      await this.pythStream.start(tokens);
    }
    
    // Initial scan
    await this.scanOpportunities(tokens);
    
    // Set up interval for continuous scanning
    this.scanIntervalId = setInterval(async () => {
      await this.scanOpportunities(tokens);
    }, this.config.scanIntervalMs);
  }
  
  /**
   * Stop scanning
   */
  stopScanning(): void {
    if (!this.isScanning) {
      console.log('[EnhancedArbitrage] Scanner not running');
      return;
    }
    
    console.log('[EnhancedArbitrage] Stopping scanner...');
    
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    
    if (this.pythStream) {
      this.pythStream.stop();
    }
    
    this.isScanning = false;
    console.log('[EnhancedArbitrage] Scanner stopped');
  }
  
  /**
   * Scan for arbitrage opportunities across multiple aggregators
   */
  private async scanOpportunities(tokens: string[]): Promise<void> {
    try {
      const opportunities: EnhancedOpportunity[] = [];
      
      // Get Pyth prices if available
      const pythPrices: Record<string, number> = {};
      if (this.pythStream) {
        const allPrices = this.pythStream.getAllPrices();
        for (const [symbol, priceUpdate] of allPrices.entries()) {
          pythPrices[symbol] = priceUpdate.price;
        }
      }
      
      // Scan token pairs
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = tokens[i];
          const tokenB = tokens[j];
          
          const opportunity = await this.checkPairOpportunity(
            tokenA,
            tokenB,
            pythPrices
          );
          
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }
      
      // Update cache with new opportunities
      for (const opp of opportunities) {
        const key = this.getOpportunityKey(opp);
        this.opportunityCache.set(key, opp);
      }
      
      // Clean up old opportunities (older than 10 seconds)
      this.cleanupCache();
      
      if (opportunities.length > 0) {
        console.log(`[EnhancedArbitrage] Found ${opportunities.length} opportunities`);
        const best = opportunities[0];
        console.log(`[EnhancedArbitrage] Best: ${best.path.map(t => t.symbol).join(' -> ')} - $${best.estimatedProfit.toFixed(4)}`);
      }
    } catch (error) {
      console.error('[EnhancedArbitrage] Scan error:', error);
    }
  }
  
  /**
   * Check arbitrage opportunity for a token pair
   * Note: tokenA and tokenB should be mint addresses, not symbols
   */
  private async checkPairOpportunity(
    tokenAMint: string,
    tokenBMint: string,
    pythPrices: Record<string, number>
  ): Promise<EnhancedOpportunity | null> {
    try {
      // Note: For production use, symbols should be resolved to mint addresses
      // via a token registry (e.g., Jupiter token list)
      
      // Use Jupiter to get actual quotes across aggregators
      // This will check multiple DEXs including Raydium, Orca, Meteora, etc.
      const amount = 1000000; // Test amount
      
      // Jupiter v6 automatically routes through multiple aggregators
      const forwardQuote = await this.jupiter.getQuote(
        tokenAMint,
        tokenBMint,
        amount,
        this.config.maxSlippage * 10000 // Convert to bps
      );
      
      if (!forwardQuote) return null;
      
      const receivedAmount = parseInt(forwardQuote.outAmount);
      
      const reverseQuote = await this.jupiter.getQuote(
        tokenBMint,
        tokenAMint,
        receivedAmount,
        this.config.maxSlippage * 10000
      );
      
      if (!reverseQuote) return null;
      
      const finalAmount = parseInt(reverseQuote.outAmount);
      const profit = finalAmount - amount;
      const profitPercent = profit / amount;
      
      if (profitPercent >= this.config.minProfitThreshold) {
        // Extract aggregators from route plan
        const aggregators = this.extractAggregators(forwardQuote, reverseQuote);
        
        // Create TokenConfig with proper mint addresses
        const tokenA: TokenConfig = {
          symbol: 'TOKEN_A', // Would be resolved from token registry
          mint: new PublicKey(tokenAMint),
          decimals: 9, // Would be fetched from token metadata
          category: 'native', // Would be determined from token registry
        };
        
        const tokenB: TokenConfig = {
          symbol: 'TOKEN_B', // Would be resolved from token registry
          mint: new PublicKey(tokenBMint),
          decimals: 9, // Would be fetched from token metadata
          category: 'native', // Would be determined from token registry
        };
        
        return {
          type: 'triangular',
          path: [tokenA, tokenB],
          estimatedProfit: profit,
          requiredCapital: amount,
          confidence: 0.85,
          aggregators,
          gasEstimate: this.config.prioritizationFeeLamports,
          slippage: this.config.maxSlippage,
          timestamp: new Date(),
          pythPrices,
        };
      }
    } catch (error) {
      // Silently ignore errors for individual pairs
    }
    
    return null;
  }
  
  /**
   * Extract aggregator names from Jupiter route plan
   * Note: Using 'any' type because Jupiter quote response structure is complex
   * and may change between versions. For production, consider defining proper
   * interfaces based on @jup-ag/api types.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractAggregators(forwardQuote: any, reverseQuote: any): string[] {
    const aggregators = new Set<string>();
    
    // Extract from forward route
    if (forwardQuote.routePlan) {
      for (const step of forwardQuote.routePlan) {
        if (step.swapInfo?.label) {
          aggregators.add(step.swapInfo.label);
        }
      }
    }
    
    // Extract from reverse route
    if (reverseQuote.routePlan) {
      for (const step of reverseQuote.routePlan) {
        if (step.swapInfo?.label) {
          aggregators.add(step.swapInfo.label);
        }
      }
    }
    
    return Array.from(aggregators);
  }
  
  /**
   * Get opportunity key for caching
   */
  private getOpportunityKey(opp: EnhancedOpportunity): string {
    return opp.path.map(t => t.symbol).join('-');
  }
  
  /**
   * Clean up old opportunities from cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, opp] of this.opportunityCache.entries()) {
      if (now - opp.timestamp.getTime() > 10000) {
        this.opportunityCache.delete(key);
      }
    }
  }
  
  /**
   * Get all current opportunities
   */
  getOpportunities(): EnhancedOpportunity[] {
    return Array.from(this.opportunityCache.values())
      .sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<ArbitrageConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Ensure prioritization fee doesn't exceed 10M lamports
    if (this.config.prioritizationFeeLamports > 10000000) {
      console.warn('[EnhancedArbitrage] Capping prioritization fee at 10M lamports');
      this.config.prioritizationFeeLamports = 10000000;
    }
    
    console.log('[EnhancedArbitrage] Configuration updated:', this.config);
  }
  
  /**
   * Get current configuration
   */
  getConfig(): ArbitrageConfig {
    return { ...this.config };
  }
  
  /**
   * Get scanner status
   */
  getStatus(): {
    isScanning: boolean;
    config: ArbitrageConfig;
    cachedOpportunities: number;
    pythStreamActive: boolean;
  } {
    return {
      isScanning: this.isScanning,
      config: this.config,
      cachedOpportunities: this.opportunityCache.size,
      pythStreamActive: this.pythStream?.getStatus().running || false,
    };
  }
}
