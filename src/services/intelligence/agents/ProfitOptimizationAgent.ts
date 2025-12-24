/**
 * Profit Optimization Agent
 * 
 * Math-driven micro-profit optimization by adjusting parameters per-trade
 * to capture maximum value after fees and DAO skims.
 */

import {
  IntelligenceAgent,
  AgentMetadata,
  AgentStatus,
  AnalysisContext,
  AnalysisResult,
} from '../types.js';

export interface ProfitOptimizationAgentConfig {
  minProfitMargin: number; // Minimum profit margin (e.g., 0.01 = 1%)
  feeStructure: {
    gasFee: number; // Estimated gas fee in SOL
    daoSkimPercentage: number; // DAO skim percentage (e.g., 0.1 = 10%)
    devFeePercentage: number; // Dev fee percentage (e.g., 0.1 = 10%)
  };
  optimizationStrategy: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
}

export class ProfitOptimizationAgent implements IntelligenceAgent {
  readonly metadata: AgentMetadata;
  status: AgentStatus = 'INACTIVE';
  private config: ProfitOptimizationAgentConfig;

  constructor(config?: Partial<ProfitOptimizationAgentConfig>) {
    this.config = {
      minProfitMargin: config?.minProfitMargin ?? 0.003, // 0.3% minimum
      feeStructure: {
        gasFee: config?.feeStructure?.gasFee ?? 0.000005, // ~5000 lamports
        daoSkimPercentage: config?.feeStructure?.daoSkimPercentage ?? 0.1, // 10%
        devFeePercentage: config?.feeStructure?.devFeePercentage ?? 0.1, // 10%
      },
      optimizationStrategy: config?.optimizationStrategy ?? 'BALANCED',
    };

    this.metadata = {
      id: 'profit-optimization-agent-v1',
      name: 'Profit Optimization Agent',
      version: '1.0.0',
      type: 'PROFIT_OPTIMIZATION',
      author: 'GXQ STUDIO',
      description: 'Math-driven micro-profit optimization for maximum value capture',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async initialize(): Promise<void> {
    this.status = 'ACTIVE';
    console.log('✅ Profit Optimization Agent initialized with config:', this.config);
  }

  async cleanup(): Promise<void> {
    this.status = 'INACTIVE';
    console.log('🗑️ Profit Optimization Agent cleaned up');
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    return { healthy: true };
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const adjustments: Record<string, any> = {};
    const calculations: string[] = [];

    try {
      const amountIn = context.amountIn ?? 0;
      const expectedAmountOut = context.expectedAmountOut ?? 0;
      const grossProfit = expectedAmountOut - amountIn;

      // 1. Calculate all fees and costs
      const feeBreakdown = this.calculateFeeBreakdown(grossProfit);
      const netProfit = grossProfit - feeBreakdown.totalFees;
      const profitMargin = amountIn > 0 ? netProfit / amountIn : 0;

      calculations.push(`Gross profit: ${grossProfit.toFixed(6)} SOL`);
      calculations.push(`Gas fee: ${feeBreakdown.gasFee.toFixed(6)} SOL`);
      calculations.push(`DAO skim: ${feeBreakdown.daoSkim.toFixed(6)} SOL`);
      calculations.push(`Dev fee: ${feeBreakdown.devFee.toFixed(6)} SOL`);
      calculations.push(`Total fees: ${feeBreakdown.totalFees.toFixed(6)} SOL`);
      calculations.push(`Net profit: ${netProfit.toFixed(6)} SOL`);
      calculations.push(`Profit margin: ${(profitMargin * 100).toFixed(2)}%`);

      // 2. Check if profit meets minimum threshold
      if (profitMargin < this.config.minProfitMargin) {
        return {
          agentId: this.metadata.id,
          agentType: this.metadata.type,
          success: false,
          confidence: 'HIGH',
          recommendation: 'ABORT',
          reasoning: [
            'Profit margin below threshold:',
            ...calculations,
            `Minimum required: ${(this.config.minProfitMargin * 100).toFixed(2)}%`,
          ].join('\n- '),
          metadata: {
            feeBreakdown,
            netProfit,
            profitMargin,
            analysisTimestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        };
      }

      // 3. Optimize trade size for maximum net profit
      const optimalTradeSize = this.calculateOptimalTradeSize(context);
      if (optimalTradeSize && Math.abs(optimalTradeSize - amountIn) > 0.001) {
        adjustments.amountIn = optimalTradeSize;
        calculations.push(
          `Optimal trade size: ${optimalTradeSize.toFixed(6)} SOL (current: ${amountIn.toFixed(6)} SOL)`
        );
      }

      // 4. Optimize slippage tolerance based on strategy
      const optimalSlippage = this.calculateOptimalSlippage(context, profitMargin);
      if (optimalSlippage !== context.riskParams?.maxSlippage) {
        adjustments.maxSlippage = optimalSlippage;
        calculations.push(
          `Optimal slippage: ${(optimalSlippage * 100).toFixed(2)}%`
        );
      }

      // 5. Calculate break-even point
      const breakEven = this.calculateBreakEven(feeBreakdown.totalFees, amountIn);
      calculations.push(`Break-even price change: ${(breakEven * 100).toFixed(2)}%`);

      // 6. Recommend timing optimization
      const timingRecommendation = this.recommendTiming(context, profitMargin);
      if (timingRecommendation) {
        calculations.push(`Timing: ${timingRecommendation}`);
      }

      const reasoning = [
        'Profit optimization analysis:',
        ...calculations,
        netProfit > 0 ? '✅ Trade is profitable after all fees' : '❌ Trade is not profitable',
      ].join('\n- ');

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: true,
        confidence: 'HIGH',
        recommendation: Object.keys(adjustments).length > 0 ? 'ADJUST' : 'PROCEED',
        reasoning,
        adjustments: Object.keys(adjustments).length > 0 ? adjustments : undefined,
        metadata: {
          feeBreakdown,
          netProfit,
          profitMargin,
          breakEven,
          config: this.config,
          analysisTimestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Profit Optimization Agent analysis failed:', error);

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: false,
        confidence: 'LOW',
        recommendation: 'ABORT',
        reasoning: `Profit optimization failed: ${errorMsg}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Calculate comprehensive fee breakdown
   */
  private calculateFeeBreakdown(grossProfit: number): {
    gasFee: number;
    daoSkim: number;
    devFee: number;
    totalFees: number;
  } {
    const { gasFee, daoSkimPercentage, devFeePercentage } = this.config.feeStructure;
    
    // DAO and dev fees are calculated on gross profit
    const daoSkim = grossProfit > 0 ? grossProfit * daoSkimPercentage : 0;
    const devFee = grossProfit > 0 ? grossProfit * devFeePercentage : 0;
    
    return {
      gasFee,
      daoSkim,
      devFee,
      totalFees: gasFee + daoSkim + devFee,
    };
  }

  /**
   * Calculate optimal trade size to maximize net profit
   */
  private calculateOptimalTradeSize(context: AnalysisContext): number | undefined {
    const liquidity = context.marketData?.liquidity ?? 0;
    const amountIn = context.amountIn ?? 0;
    
    if (liquidity === 0) return undefined;
    
    // Use calculus to find optimal trade size considering price impact
    // Simplified model: profit = (expected_out - amount_in) - fees - price_impact
    // Price impact increases quadratically with trade size
    
    // Optimal is typically around 2-5% of liquidity for most pools
    const optimalRatio = this.config.optimizationStrategy === 'AGGRESSIVE' ? 0.05 :
                         this.config.optimizationStrategy === 'BALANCED' ? 0.03 : 0.02;
    
    const optimal = liquidity * optimalRatio;
    
    // Only suggest if it's different from current and not too small
    return optimal > 0.001 && Math.abs(optimal - amountIn) > amountIn * 0.1 ? optimal : undefined;
  }

  /**
   * Calculate optimal slippage tolerance
   */
  private calculateOptimalSlippage(context: AnalysisContext, profitMargin: number): number {
    const volatility = context.marketData?.volatility ?? 0.01;
    
    // Base slippage on strategy
    const baseSlippage = {
      AGGRESSIVE: 0.02,   // 2%
      BALANCED: 0.015,    // 1.5%
      CONSERVATIVE: 0.01, // 1%
    }[this.config.optimizationStrategy];
    
    // Adjust for volatility (add 50% of volatility)
    const adjustedSlippage = baseSlippage + (volatility * 0.5);
    
    // But never exceed half of profit margin (to protect profits)
    const maxSlippage = profitMargin / 2;
    
    return Math.min(adjustedSlippage, maxSlippage, 0.05); // Cap at 5%
  }

  /**
   * Calculate break-even point
   */
  private calculateBreakEven(totalFees: number, amountIn: number): number {
    if (amountIn === 0) return 0;
    return totalFees / amountIn;
  }

  /**
   * Recommend timing for execution
   */
  private recommendTiming(context: AnalysisContext, profitMargin: number): string | undefined {
    const volatility = context.marketData?.volatility ?? 0;
    
    // High profit margin + low volatility = execute immediately
    if (profitMargin > 0.02 && volatility < 0.02) {
      return 'Execute immediately - favorable conditions';
    }
    
    // High volatility = wait
    if (volatility > 0.05) {
      return 'Consider waiting for lower volatility';
    }
    
    // Marginal profit + moderate volatility = execute quickly
    if (profitMargin > this.config.minProfitMargin && profitMargin < 0.01) {
      return 'Execute soon - profit margin is marginal';
    }
    
    return undefined;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProfitOptimizationAgentConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('✅ Profit Optimization Agent configuration updated:', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ProfitOptimizationAgentConfig {
    return { ...this.config };
  }
}
