/**
 * Dynamic Slippage Manager
 * Automatically adjusts slippage tolerance based on market conditions
 */

export interface SlippageConfig {
  minSlippage: number; // Minimum slippage in percentage (e.g., 0.5)
  maxSlippage: number; // Maximum slippage in percentage (e.g., 5)
  defaultSlippage: number; // Default slippage in percentage (e.g., 1)
}

export interface SlippageRecommendation {
  slippage: number; // Recommended slippage in percentage
  slippageBps: number; // Recommended slippage in basis points (100 = 1%)
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

export class SlippageManager {
  private config: SlippageConfig;

  constructor(config?: Partial<SlippageConfig>) {
    this.config = {
      minSlippage: config?.minSlippage ?? 0.5,
      maxSlippage: config?.maxSlippage ?? 5,
      defaultSlippage: config?.defaultSlippage ?? 1,
    };
  }

  /**
   * Calculate recommended slippage based on multiple factors
   */
  async getRecommendedSlippage(params: {
    tokenAddress: string;
    amountIn: number;
    networkCongestion?: 'low' | 'medium' | 'high';
    priceImpact?: number;
    volatility?: number;
  }): Promise<SlippageRecommendation> {
    const {
      networkCongestion = 'medium',
      priceImpact = 0,
      volatility = 1,
    } = params;

    // Start with default slippage
    let recommendedSlippage = this.config.defaultSlippage;
    let reason = 'Default slippage for normal market conditions';
    let confidence: 'low' | 'medium' | 'high' = 'medium';

    // Adjust based on network congestion
    if (networkCongestion === 'high') {
      recommendedSlippage += 0.5;
      reason = 'Increased slippage due to high network congestion';
      confidence = 'high';
    } else if (networkCongestion === 'low') {
      recommendedSlippage -= 0.2;
      reason = 'Reduced slippage due to low network congestion';
      confidence = 'high';
    }

    // Adjust based on price impact
    if (priceImpact > 2) {
      recommendedSlippage += 1;
      reason = 'High price impact detected - increased slippage';
      confidence = 'high';
    } else if (priceImpact > 1) {
      recommendedSlippage += 0.5;
      reason = 'Moderate price impact - slightly increased slippage';
      confidence = 'medium';
    }

    // Adjust based on volatility (simplified)
    if (volatility > 2) {
      recommendedSlippage += 0.5;
      reason = 'High market volatility - increased slippage';
      confidence = 'medium';
    }

    // Ensure within bounds
    recommendedSlippage = Math.max(
      this.config.minSlippage,
      Math.min(this.config.maxSlippage, recommendedSlippage)
    );

    // Convert to basis points
    const slippageBps = Math.round(recommendedSlippage * 100);

    return {
      slippage: recommendedSlippage,
      slippageBps,
      reason,
      confidence,
    };
  }

  /**
   * Get slippage based on transaction type
   */
  getSlippageByType(txType: 'swap' | 'snipe' | 'flashloan'): number {
    switch (txType) {
      case 'swap':
        return this.config.defaultSlippage;
      case 'snipe':
        return Math.min(this.config.maxSlippage, this.config.defaultSlippage * 2);
      case 'flashloan':
        return this.config.minSlippage; // Lower slippage for arbitrage
      default:
        return this.config.defaultSlippage;
    }
  }

  /**
   * Calculate slippage tolerance from amount and price
   */
  calculateSlippageTolerance(params: {
    expectedAmount: number;
    minimumAmount: number;
  }): number {
    const { expectedAmount, minimumAmount } = params;
    
    if (expectedAmount <= 0) {
      return this.config.defaultSlippage;
    }

    const slippagePercent =
      ((expectedAmount - minimumAmount) / expectedAmount) * 100;

    return Math.max(
      this.config.minSlippage,
      Math.min(this.config.maxSlippage, slippagePercent)
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SlippageConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): SlippageConfig {
    return { ...this.config };
  }
}

// Singleton instance
let slippageManagerInstance: SlippageManager | null = null;

/**
 * Get or create the SlippageManager singleton
 */
export function getSlippageManager(config?: Partial<SlippageConfig>): SlippageManager {
  if (!slippageManagerInstance) {
    slippageManagerInstance = new SlippageManager(config);
  }
  return slippageManagerInstance;
}

/**
 * Helper function for quick slippage calculation
 */
export async function calculateRecommendedSlippage(params: {
  tokenAddress: string;
  amountIn: number;
  networkCongestion?: 'low' | 'medium' | 'high';
  priceImpact?: number;
}): Promise<SlippageRecommendation> {
  const manager = getSlippageManager();
  return manager.getRecommendedSlippage(params);
}
