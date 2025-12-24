/**
 * Risk Agent
 * 
 * Implements DAO-safe heuristics to validate that any proposed execution
 * follows strict safety bounds (max loss, slippage, program safety).
 */

import {
  IntelligenceAgent,
  AgentMetadata,
  AgentStatus,
  AnalysisContext,
  AnalysisResult,
} from '../types.js';

export interface RiskAgentConfig {
  maxSlippage: number; // Maximum allowed slippage (e.g., 0.01 = 1%)
  maxPriceImpact: number; // Maximum allowed price impact (e.g., 0.02 = 2%)
  maxLoss: number; // Maximum allowed loss in SOL
  minProfit: number; // Minimum required profit in SOL
  trustedPrograms: string[]; // List of trusted program IDs
  blacklistedPrograms: string[]; // List of blacklisted program IDs
}

export class RiskAgent implements IntelligenceAgent {
  readonly metadata: AgentMetadata;
  status: AgentStatus = 'INACTIVE';
  private config: RiskAgentConfig;

  constructor(config?: Partial<RiskAgentConfig>) {
    this.config = {
      maxSlippage: config?.maxSlippage ?? 0.015, // 1.5% default
      maxPriceImpact: config?.maxPriceImpact ?? 0.025, // 2.5% default
      maxLoss: config?.maxLoss ?? 0.1, // 0.1 SOL default
      minProfit: config?.minProfit ?? 0.005, // 0.005 SOL default
      trustedPrograms: config?.trustedPrograms ?? [
        // Add known trusted program IDs
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
        'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
      ],
      blacklistedPrograms: config?.blacklistedPrograms ?? [],
    };

    this.metadata = {
      id: 'risk-agent-v1',
      name: 'Risk Management Agent',
      version: '1.0.0',
      type: 'RISK',
      author: 'GXQ STUDIO',
      description: 'DAO-safe risk validation with strict safety bounds for arbitrage execution',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async initialize(): Promise<void> {
    this.status = 'ACTIVE';
    console.log('✅ Risk Agent initialized with config:', this.config);
  }

  async cleanup(): Promise<void> {
    this.status = 'INACTIVE';
    console.log('🗑️ Risk Agent cleaned up');
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    return { healthy: true };
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 1. Check slippage
      const slippage = context.marketData?.slippage ?? context.riskParams?.maxSlippage ?? 0;
      if (slippage > this.config.maxSlippage) {
        violations.push(
          `Slippage ${(slippage * 100).toFixed(2)}% exceeds maximum ${(
            this.config.maxSlippage * 100
          ).toFixed(2)}%`
        );
      }

      // 2. Check price impact
      const priceImpact = context.marketData?.priceImpact ?? 0;
      if (priceImpact > this.config.maxPriceImpact) {
        violations.push(
          `Price impact ${(priceImpact * 100).toFixed(2)}% exceeds maximum ${(
            this.config.maxPriceImpact * 100
          ).toFixed(2)}%`
        );
      }

      // 3. Check potential loss
      const expectedProfit = context.expectedAmountOut
        ? (context.expectedAmountOut - (context.amountIn ?? 0))
        : 0;
      
      if (expectedProfit < -this.config.maxLoss) {
        violations.push(
          `Potential loss ${Math.abs(expectedProfit).toFixed(4)} SOL exceeds maximum ${this.config.maxLoss} SOL`
        );
      }

      // 4. Check minimum profit threshold
      if (expectedProfit < this.config.minProfit) {
        violations.push(
          `Expected profit ${expectedProfit.toFixed(6)} SOL is below minimum ${this.config.minProfit} SOL`
        );
      }

      // 5. Check program safety (if route information available)
      if (context.route?.programIds) {
        const programIds = Array.isArray(context.route.programIds)
          ? context.route.programIds
          : [context.route.programIds];

        for (const programId of programIds) {
          const programIdStr = typeof programId === 'string' ? programId : programId.toString();
          
          // Check blacklist
          if (this.config.blacklistedPrograms.includes(programIdStr)) {
            violations.push(`Route includes blacklisted program: ${programIdStr}`);
          }

          // Warn if not in trusted list
          if (!this.config.trustedPrograms.includes(programIdStr)) {
            warnings.push(`Route includes untrusted program: ${programIdStr}`);
          }
        }
      }

      // 6. Check liquidity depth
      const liquidity = context.marketData?.liquidity ?? 0;
      if (liquidity > 0 && context.amountIn) {
        const liquidityRatio = context.amountIn / liquidity;
        if (liquidityRatio > 0.1) { // 10% of pool
          warnings.push(
            `Trade size is ${(liquidityRatio * 100).toFixed(2)}% of pool liquidity - high impact expected`
          );
        }
      }

      // 7. Check volatility
      const volatility = context.marketData?.volatility ?? 0;
      if (volatility > 0.05) { // 5% volatility threshold
        warnings.push(
          `High market volatility detected: ${(volatility * 100).toFixed(2)}%`
        );
      }

      // Determine recommendation
      const hasViolations = violations.length > 0;
      const recommendation = hasViolations ? 'ABORT' : warnings.length > 0 ? 'PROCEED' : 'PROCEED';
      const confidence = hasViolations ? 'HIGH' : warnings.length > 0 ? 'MEDIUM' : 'HIGH';

      const reasoning = [
        hasViolations ? 'Risk violations detected:' : 'Risk assessment passed.',
        ...violations,
        ...(warnings.length > 0 ? ['Warnings:', ...warnings] : []),
      ].join('\n- ');

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: !hasViolations,
        confidence,
        recommendation,
        reasoning,
        metadata: {
          violations,
          warnings,
          config: this.config,
          analysisTimestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Risk Agent analysis failed:', error);

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: false,
        confidence: 'HIGH',
        recommendation: 'ABORT',
        reasoning: `Risk analysis failed: ${errorMsg}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update risk configuration
   */
  updateConfig(config: Partial<RiskAgentConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('✅ Risk Agent configuration updated:', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): RiskAgentConfig {
    return { ...this.config };
  }
}
