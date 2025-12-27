/**
 * Execution Agent
 *
 * Optimizes transaction submission (e.g., Jito tip levels, RPC selection)
 * based on network congestion.
 */

import {
  IntelligenceAgent,
  AgentMetadata,
  AgentStatus,
  AnalysisContext,
  AnalysisResult,
} from "../types.js";

export interface ExecutionAgentConfig {
  baseJitoTip: number; // Base Jito tip in lamports
  maxJitoTip: number; // Maximum Jito tip in lamports
  basePriorityFee: number; // Base priority fee in microlamports
  maxPriorityFee: number; // Maximum priority fee in microlamports (hard cap: 10M lamports)
  congestionThreshold: number; // Network congestion threshold (0-1)
  preferredRpcEndpoints: string[]; // List of preferred RPC endpoints
}

export class ExecutionAgent implements IntelligenceAgent {
  readonly metadata: AgentMetadata;
  status: AgentStatus = "INACTIVE";
  private config: ExecutionAgentConfig;

  constructor(config?: Partial<ExecutionAgentConfig>) {
    this.config = {
      baseJitoTip: config?.baseJitoTip ?? 10_000, // 0.00001 SOL
      maxJitoTip: config?.maxJitoTip ?? 1_000_000, // 0.001 SOL
      basePriorityFee: config?.basePriorityFee ?? 1_000, // 1000 microlamports
      maxPriorityFee: config?.maxPriorityFee ?? 10_000_000, // 10M lamports hard cap
      congestionThreshold: config?.congestionThreshold ?? 0.7, // 70%
      preferredRpcEndpoints: config?.preferredRpcEndpoints ?? [],
    };

    this.metadata = {
      id: "execution-agent-v1",
      name: "Execution Optimization Agent",
      version: "1.0.0",
      type: "EXECUTION",
      author: "GXQ STUDIO",
      description:
        "Optimizes transaction submission based on network conditions",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async initialize(): Promise<void> {
    this.status = "ACTIVE";
    console.log("✅ Execution Agent initialized with config:", this.config);
  }

  async cleanup(): Promise<void> {
    this.status = "INACTIVE";
    console.log("🗑️ Execution Agent cleaned up");
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    return { healthy: true };
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const adjustments: Record<string, any> = {};
    const recommendations: string[] = [];

    try {
      const currentPriorityFee =
        context.executionParams?.priorityFee ?? this.config.basePriorityFee;
      const currentJitoTip =
        context.executionParams?.jitoTipLamports ?? this.config.baseJitoTip;
      const networkCongestion = this.estimateNetworkCongestion(context);

      // 1. Optimize priority fee based on congestion
      const optimalPriorityFee =
        this.calculateOptimalPriorityFee(networkCongestion);
      if (optimalPriorityFee !== currentPriorityFee) {
        adjustments.priorityFee = optimalPriorityFee;
        recommendations.push(
          `Adjust priority fee to ${optimalPriorityFee} microlamports (current: ${currentPriorityFee})`,
        );
      }

      // 2. Optimize Jito tip based on urgency and congestion
      const optimalJitoTip = this.calculateOptimalJitoTip(
        networkCongestion,
        context,
      );
      if (optimalJitoTip !== currentJitoTip) {
        adjustments.jitoTipLamports = optimalJitoTip;
        recommendations.push(
          `Adjust Jito tip to ${optimalJitoTip} lamports (${(
            optimalJitoTip / 1e9
          ).toFixed(6)} SOL)`,
        );
      }

      // 3. Recommend RPC endpoint based on current conditions
      const recommendedRpc = this.selectOptimalRpc(context);
      if (recommendedRpc) {
        adjustments.rpcEndpoint = recommendedRpc;
        recommendations.push(`Use RPC endpoint: ${recommendedRpc}`);
      }

      // 4. Optimize compute units
      const optimalComputeUnits = this.calculateOptimalComputeUnits(context);
      if (optimalComputeUnits !== context.executionParams?.computeUnits) {
        adjustments.computeUnits = optimalComputeUnits;
        recommendations.push(`Set compute units to ${optimalComputeUnits}`);
      }

      // 5. Network congestion warning
      if (networkCongestion > this.config.congestionThreshold) {
        recommendations.push(
          `High network congestion detected (${(networkCongestion * 100).toFixed(1)}%) - increased fees recommended`,
        );
      }

      const reasoning = [
        "Execution optimization analysis:",
        `Network congestion: ${(networkCongestion * 100).toFixed(1)}%`,
        `Optimal priority fee: ${optimalPriorityFee} microlamports`,
        `Optimal Jito tip: ${(optimalJitoTip / 1e9).toFixed(6)} SOL`,
        ...(recommendations.length > 0
          ? ["Recommendations:", ...recommendations]
          : []),
      ].join("\n- ");

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: true,
        confidence: "HIGH",
        recommendation:
          Object.keys(adjustments).length > 0 ? "ADJUST" : "PROCEED",
        reasoning,
        adjustments,
        metadata: {
          networkCongestion,
          optimalPriorityFee,
          optimalJitoTip,
          config: this.config,
          analysisTimestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Execution Agent analysis failed:", error);

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: false,
        confidence: "LOW",
        recommendation: "PROCEED", // Don't abort on execution optimization failure
        reasoning: `Execution analysis failed: ${errorMsg}. Using default parameters.`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Estimate network congestion (placeholder - would use real metrics in production)
   */
  private estimateNetworkCongestion(context: AnalysisContext): number {
    // In production, this would query:
    // - Recent block production rate
    // - Transaction confirmation times
    // - Fee market data
    // - RPC node health metrics

    // For now, return a simulated value
    return 0.3; // 30% congestion
  }

  /**
   * Calculate optimal priority fee based on congestion
   */
  private calculateOptimalPriorityFee(congestion: number): number {
    const { basePriorityFee, maxPriorityFee } = this.config;

    // Linear scaling based on congestion
    const fee =
      basePriorityFee + (maxPriorityFee - basePriorityFee) * congestion;

    // Enforce hard cap of 10M lamports (10_000_000 microlamports)
    return Math.min(Math.round(fee), 10_000_000);
  }

  /**
   * Calculate optimal Jito tip based on congestion and urgency
   */
  private calculateOptimalJitoTip(
    congestion: number,
    context: AnalysisContext,
  ): number {
    const { baseJitoTip, maxJitoTip } = this.config;

    // Higher tips during high congestion
    let tip = baseJitoTip + (maxJitoTip - baseJitoTip) * congestion;

    // Increase tip for higher-value trades
    const tradeValue = context.expectedAmountOut ?? 0;
    if (tradeValue > 1.0) {
      // > 1 SOL
      tip *= 1.5;
    }

    return Math.min(Math.round(tip), maxJitoTip);
  }

  /**
   * Select optimal RPC endpoint
   */
  private selectOptimalRpc(context: AnalysisContext): string | undefined {
    // In production, this would:
    // - Check RPC endpoint latency
    // - Monitor rate limits
    // - Track success rates
    // - Load balance across endpoints

    if (this.config.preferredRpcEndpoints.length > 0) {
      // Simple round-robin (would be more sophisticated in production)
      const index = Math.floor(
        Math.random() * this.config.preferredRpcEndpoints.length,
      );
      return this.config.preferredRpcEndpoints[index];
    }

    return undefined;
  }

  /**
   * Calculate optimal compute units
   */
  private calculateOptimalComputeUnits(context: AnalysisContext): number {
    // Base compute units for different bot types
    const baseComputeUnits: Record<string, number> = {
      ARBITRAGE: 200_000,
      FLASH_LOAN: 400_000,
      TRIANGULAR: 300_000,
      SNIPER: 150_000,
      CUSTOM: 200_000,
    };

    const botType = context.botType || "CUSTOM";
    let computeUnits = baseComputeUnits[botType] || 200_000;

    // Add buffer for complex routes
    const routeComplexity = context.route?.hops?.length ?? 1;
    computeUnits += (routeComplexity - 1) * 50_000;

    // Cap at 1.4M compute units (Solana limit)
    return Math.min(computeUnits, 1_400_000);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExecutionAgentConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("✅ Execution Agent configuration updated:", config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ExecutionAgentConfig {
    return { ...this.config };
  }
}
