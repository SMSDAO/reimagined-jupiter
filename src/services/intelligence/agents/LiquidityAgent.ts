/**
 * Liquidity Agent
 *
 * Analyzes real-time pool depth and volatility using Pyth/Jupiter data
 * to recommend optimal trade sizes.
 */

import {
  IntelligenceAgent,
  AgentMetadata,
  AgentStatus,
  AnalysisContext,
  AnalysisResult,
} from "../types.js";

export interface LiquidityAgentConfig {
  minLiquidityThreshold: number; // Minimum pool liquidity in SOL
  maxTradeToLiquidityRatio: number; // Maximum trade size as ratio of liquidity (e.g., 0.05 = 5%)
  volatilityThreshold: number; // Maximum acceptable volatility (e.g., 0.03 = 3%)
  confidenceInterval: number; // Pyth confidence interval threshold (e.g., 0.01 = 1%)
}

export class LiquidityAgent implements IntelligenceAgent {
  readonly metadata: AgentMetadata;
  status: AgentStatus = "INACTIVE";
  private config: LiquidityAgentConfig;

  constructor(config?: Partial<LiquidityAgentConfig>) {
    this.config = {
      minLiquidityThreshold: config?.minLiquidityThreshold ?? 100, // 100 SOL
      maxTradeToLiquidityRatio: config?.maxTradeToLiquidityRatio ?? 0.05, // 5%
      volatilityThreshold: config?.volatilityThreshold ?? 0.03, // 3%
      confidenceInterval: config?.confidenceInterval ?? 0.01, // 1%
    };

    this.metadata = {
      id: "liquidity-agent-v1",
      name: "Liquidity Analysis Agent",
      version: "1.0.0",
      type: "LIQUIDITY",
      author: "GXQ STUDIO",
      description:
        "Analyzes real-time pool depth and volatility to recommend optimal trade sizes",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async initialize(): Promise<void> {
    this.status = "ACTIVE";
    console.log("✅ Liquidity Agent initialized with config:", this.config);
  }

  async cleanup(): Promise<void> {
    this.status = "INACTIVE";
    console.log("🗑️ Liquidity Agent cleaned up");
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    return { healthy: true };
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let adjustments: Record<string, any> = {};

    try {
      const liquidity = context.marketData?.liquidity ?? 0;
      const volatility = context.marketData?.volatility ?? 0;
      const tradeAmount = context.amountIn ?? 0;

      // 1. Check minimum liquidity threshold
      if (liquidity < this.config.minLiquidityThreshold) {
        issues.push(
          `Insufficient liquidity: ${liquidity.toFixed(2)} SOL (minimum: ${this.config.minLiquidityThreshold} SOL)`,
        );
      }

      // 2. Check trade size to liquidity ratio
      const tradeToLiquidityRatio = liquidity > 0 ? tradeAmount / liquidity : 1;
      if (tradeToLiquidityRatio > this.config.maxTradeToLiquidityRatio) {
        issues.push(
          `Trade size ${(tradeToLiquidityRatio * 100).toFixed(2)}% of liquidity exceeds maximum ${(
            this.config.maxTradeToLiquidityRatio * 100
          ).toFixed(2)}%`,
        );

        // Suggest optimal trade size
        const optimalTradeSize =
          liquidity * this.config.maxTradeToLiquidityRatio;
        adjustments.suggestedTradeSize = optimalTradeSize;
        recommendations.push(
          `Reduce trade size to ${optimalTradeSize.toFixed(4)} SOL (${(
            this.config.maxTradeToLiquidityRatio * 100
          ).toFixed(2)}% of pool)`,
        );
      }

      // 3. Check volatility
      if (volatility > this.config.volatilityThreshold) {
        issues.push(
          `High volatility detected: ${(volatility * 100).toFixed(2)}% (threshold: ${(
            this.config.volatilityThreshold * 100
          ).toFixed(2)}%)`,
        );
        recommendations.push(
          "Consider waiting for market conditions to stabilize or reducing trade size",
        );
      }

      // 4. Analyze pool depth distribution (if available)
      if (context.pools && Array.isArray(context.pools)) {
        const poolAnalysis = this.analyzePoolDepth(context.pools);
        if (poolAnalysis.imbalanced) {
          issues.push(
            "Pool depth imbalance detected - may result in higher slippage",
          );
          recommendations.push(
            poolAnalysis.recommendation || "Consider alternative routes",
          );
        }
      }

      // 5. Check price confidence (Pyth data)
      const priceConfidence = context.marketData?.priceConfidence ?? 0;
      if (priceConfidence > this.config.confidenceInterval) {
        issues.push(
          `Price confidence interval too wide: ${(priceConfidence * 100).toFixed(2)}%`,
        );
        recommendations.push(
          "Wait for more stable price data or reduce position size",
        );
      }

      // 6. Calculate optimal execution strategy
      if (tradeAmount > 0 && liquidity > 0) {
        const executionStrategy = this.calculateOptimalExecution(
          tradeAmount,
          liquidity,
        );
        if (executionStrategy.splitTrade) {
          adjustments.executionStrategy = executionStrategy;
          recommendations.push(
            `Consider splitting trade into ${executionStrategy.numSplits} smaller executions`,
          );
        }
      }

      // Determine recommendation
      const hasIssues = issues.length > 0;
      const recommendation = hasIssues ? "ADJUST" : "PROCEED";
      const confidence = hasIssues ? "MEDIUM" : "HIGH";

      const reasoning = [
        hasIssues
          ? "Liquidity analysis identified issues:"
          : "Liquidity conditions are favorable.",
        ...issues,
        ...(recommendations.length > 0
          ? ["Recommendations:", ...recommendations]
          : []),
      ].join("\n- ");

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: true,
        confidence,
        recommendation,
        reasoning,
        adjustments:
          Object.keys(adjustments).length > 0 ? adjustments : undefined,
        metadata: {
          liquidityAnalysis: {
            totalLiquidity: liquidity,
            tradeToLiquidityRatio,
            volatility,
            priceConfidence,
          },
          config: this.config,
          analysisTimestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Liquidity Agent analysis failed:", error);

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: false,
        confidence: "LOW",
        recommendation: "ABORT",
        reasoning: `Liquidity analysis failed: ${errorMsg}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Analyze pool depth distribution
   */
  private analyzePoolDepth(pools: any[]): {
    imbalanced: boolean;
    recommendation?: string;
  } {
    if (pools.length === 0) {
      return { imbalanced: false };
    }

    // Calculate coefficient of variation for pool sizes
    const poolSizes = pools.map((p) => p.liquidity || 0);
    const mean = poolSizes.reduce((a, b) => a + b, 0) / poolSizes.length;
    const variance =
      poolSizes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      poolSizes.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // If coefficient of variation > 0.5, pools are imbalanced
    if (cv > 0.5) {
      return {
        imbalanced: true,
        recommendation: "Route through more balanced liquidity pools",
      };
    }

    return { imbalanced: false };
  }

  /**
   * Calculate optimal execution strategy
   */
  private calculateOptimalExecution(
    tradeAmount: number,
    liquidity: number,
  ): { splitTrade: boolean; numSplits?: number; splitSize?: number } {
    const ratio = tradeAmount / liquidity;

    // If trade is more than 2% of liquidity, consider splitting
    if (ratio > 0.02) {
      const numSplits = Math.ceil(ratio / 0.01); // Split into 1% chunks
      const splitSize = tradeAmount / numSplits;

      return {
        splitTrade: true,
        numSplits,
        splitSize,
      };
    }

    return { splitTrade: false };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LiquidityAgentConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("✅ Liquidity Agent configuration updated:", config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LiquidityAgentConfig {
    return { ...this.config };
  }
}
