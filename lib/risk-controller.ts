/**
 * Risk Controller - Comprehensive risk management system
 * Implements trade risk evaluation, slippage control, drawdown tracking, and circuit breakers
 */

import { PublicKey } from '@solana/web3.js';
import { logger } from './logger.js';

export interface RiskParameters {
  maxSlippageBps: number; // Max slippage in basis points (100 = 1%)
  maxDrawdownBps: number; // Max drawdown in basis points (500 = 5%)
  minProfitThresholdSol: number; // Minimum profit threshold in SOL
  maxTradeSizeSol: number; // Maximum trade size in SOL
  maxDailyLossSol: number; // Maximum daily loss in SOL
  maxConsecutiveLosses: number; // Maximum consecutive losses before circuit breaker
  emergencyStopEnabled: boolean; // Emergency stop flag
}

export interface TradeMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfitSol: number;
  totalLossSol: number;
  consecutiveLosses: number;
  currentDrawdownBps: number;
  dailyProfitLossSol: number;
  lastTradeTimestamp: number;
  lastResetTimestamp: number;
}

export interface TradeRiskAssessment {
  approved: boolean;
  reason: string;
  riskScore: number; // 0-100, higher = riskier
  checks: {
    slippageCheck: boolean;
    tradeSizeCheck: boolean;
    drawdownCheck: boolean;
    consecutiveLossCheck: boolean;
    dailyLossCheck: boolean;
    emergencyStopCheck: boolean;
  };
}

export class RiskController {
  private parameters: RiskParameters;
  private metrics: TradeMetrics;
  private readonly RISK_THRESHOLD = 70; // Risk score threshold for rejection

  constructor(parameters?: Partial<RiskParameters>) {
    this.parameters = {
      maxSlippageBps: 100, // 1%
      maxDrawdownBps: 500, // 5%
      minProfitThresholdSol: 0.01,
      maxTradeSizeSol: 10,
      maxDailyLossSol: 1.0,
      maxConsecutiveLosses: 3,
      emergencyStopEnabled: false,
      ...parameters,
    };

    this.metrics = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfitSol: 0,
      totalLossSol: 0,
      consecutiveLosses: 0,
      currentDrawdownBps: 0,
      dailyProfitLossSol: 0,
      lastTradeTimestamp: Date.now(),
      lastResetTimestamp: Date.now(),
    };

    logger.info('Risk Controller initialized', {
      parameters: this.parameters,
    });
  }

  /**
   * Evaluate if a trade should be approved based on risk parameters
   */
  evaluateTrade(
    tradeSizeSol: number,
    expectedProfitSol: number,
    slippageBps: number,
  ): TradeRiskAssessment {
    // Check if emergency stop is enabled
    const emergencyStopCheck = !this.parameters.emergencyStopEnabled;

    // Check slippage
    const slippageCheck = slippageBps <= this.parameters.maxSlippageBps;

    // Check trade size
    const tradeSizeCheck = tradeSizeSol <= this.parameters.maxTradeSizeSol;

    // Check drawdown
    const drawdownCheck = this.metrics.currentDrawdownBps < this.parameters.maxDrawdownBps;

    // Check consecutive losses
    const consecutiveLossCheck = this.metrics.consecutiveLosses < this.parameters.maxConsecutiveLosses;

    // Check daily loss limit
    const dailyLossCheck = Math.abs(Math.min(0, this.metrics.dailyProfitLossSol)) < this.parameters.maxDailyLossSol;

    // Calculate risk score
    const riskScore = this.calculateRiskScore({
      slippageBps,
      tradeSizeSol,
      consecutiveLosses: this.metrics.consecutiveLosses,
      currentDrawdownBps: this.metrics.currentDrawdownBps,
      dailyLossSol: Math.abs(Math.min(0, this.metrics.dailyProfitLossSol)),
    });

    // Determine approval
    const allChecks =
      emergencyStopCheck &&
      slippageCheck &&
      tradeSizeCheck &&
      drawdownCheck &&
      consecutiveLossCheck &&
      dailyLossCheck;

    const approved = allChecks && riskScore < this.RISK_THRESHOLD;

    // Build reason
    let reason = '';
    if (!approved) {
      const failures: string[] = [];
      if (!emergencyStopCheck) failures.push('Emergency stop enabled');
      if (!slippageCheck) failures.push(`Slippage too high: ${slippageBps} bps > ${this.parameters.maxSlippageBps} bps`);
      if (!tradeSizeCheck) failures.push(`Trade size too large: ${tradeSizeSol} SOL > ${this.parameters.maxTradeSizeSol} SOL`);
      if (!drawdownCheck) failures.push(`Drawdown too high: ${this.metrics.currentDrawdownBps} bps >= ${this.parameters.maxDrawdownBps} bps`);
      if (!consecutiveLossCheck) failures.push(`Too many consecutive losses: ${this.metrics.consecutiveLosses} >= ${this.parameters.maxConsecutiveLosses}`);
      if (!dailyLossCheck) failures.push(`Daily loss limit exceeded: ${Math.abs(Math.min(0, this.metrics.dailyProfitLossSol)).toFixed(4)} SOL >= ${this.parameters.maxDailyLossSol} SOL`);
      if (riskScore >= this.RISK_THRESHOLD) failures.push(`Risk score too high: ${riskScore} >= ${this.RISK_THRESHOLD}`);
      reason = failures.join('; ');
    } else {
      reason = 'Trade approved';
    }

    const assessment: TradeRiskAssessment = {
      approved,
      reason,
      riskScore,
      checks: {
        slippageCheck,
        tradeSizeCheck,
        drawdownCheck,
        consecutiveLossCheck,
        dailyLossCheck,
        emergencyStopCheck,
      },
    };

    logger.info('Trade risk assessment', {
      tradeSizeSol,
      expectedProfitSol,
      slippageBps,
      assessment,
    });

    return assessment;
  }

  /**
   * Calculate risk score (0-100, higher = riskier)
   */
  private calculateRiskScore(factors: {
    slippageBps: number;
    tradeSizeSol: number;
    consecutiveLosses: number;
    currentDrawdownBps: number;
    dailyLossSol: number;
  }): number {
    // Weight factors
    const slippageScore = (factors.slippageBps / this.parameters.maxSlippageBps) * 30;
    const tradeSizeScore = (factors.tradeSizeSol / this.parameters.maxTradeSizeSol) * 20;
    const consecutiveLossScore = (factors.consecutiveLosses / this.parameters.maxConsecutiveLosses) * 20;
    const drawdownScore = (factors.currentDrawdownBps / this.parameters.maxDrawdownBps) * 20;
    const dailyLossScore = (factors.dailyLossSol / this.parameters.maxDailyLossSol) * 10;

    const totalScore = slippageScore + tradeSizeScore + consecutiveLossScore + drawdownScore + dailyLossScore;

    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * Record a successful trade
   */
  recordSuccess(profitSol: number): void {
    this.metrics.totalTrades++;
    this.metrics.successfulTrades++;
    this.metrics.totalProfitSol += profitSol;
    this.metrics.dailyProfitLossSol += profitSol;
    this.metrics.consecutiveLosses = 0; // Reset on success
    this.metrics.lastTradeTimestamp = Date.now();

    // Update drawdown
    this.updateDrawdown();

    logger.info('Trade success recorded', {
      profitSol,
      metrics: this.getMetrics(),
    });

    // Check if we need daily reset
    this.checkDailyReset();
  }

  /**
   * Record a failed trade
   */
  recordFailure(lossSol: number): void {
    this.metrics.totalTrades++;
    this.metrics.failedTrades++;
    this.metrics.totalLossSol += Math.abs(lossSol);
    this.metrics.dailyProfitLossSol -= Math.abs(lossSol);
    this.metrics.consecutiveLosses++;
    this.metrics.lastTradeTimestamp = Date.now();

    // Update drawdown
    this.updateDrawdown();

    logger.warn('Trade failure recorded', {
      lossSol,
      consecutiveLosses: this.metrics.consecutiveLosses,
      metrics: this.getMetrics(),
    });

    // Check circuit breaker
    if (this.metrics.consecutiveLosses >= this.parameters.maxConsecutiveLosses) {
      this.triggerEmergencyStop('Maximum consecutive losses reached');
    }

    // Check daily loss limit
    if (Math.abs(Math.min(0, this.metrics.dailyProfitLossSol)) >= this.parameters.maxDailyLossSol) {
      this.triggerEmergencyStop('Daily loss limit exceeded');
    }

    // Check if we need daily reset
    this.checkDailyReset();
  }

  /**
   * Update drawdown calculation
   */
  private updateDrawdown(): void {
    const netProfitLoss = this.metrics.totalProfitSol - this.metrics.totalLossSol;
    if (netProfitLoss < 0) {
      // Calculate drawdown as percentage of total capital at risk
      // Assuming initial capital is 10 SOL for calculation purposes
      const assumedCapital = 10;
      this.metrics.currentDrawdownBps = Math.abs((netProfitLoss / assumedCapital) * 10000);
    } else {
      this.metrics.currentDrawdownBps = 0;
    }
  }

  /**
   * Trigger emergency stop
   */
  triggerEmergencyStop(reason: string): void {
    this.parameters.emergencyStopEnabled = true;
    logger.error('🚨 EMERGENCY STOP TRIGGERED', {
      reason,
      metrics: this.getMetrics(),
    });
  }

  /**
   * Disable emergency stop (manual intervention required)
   */
  disableEmergencyStop(): void {
    this.parameters.emergencyStopEnabled = false;
    logger.info('Emergency stop disabled', {
      metrics: this.getMetrics(),
    });
  }

  /**
   * Check if daily reset is needed (at midnight UTC)
   */
  private checkDailyReset(): void {
    const now = Date.now();
    const lastReset = new Date(this.metrics.lastResetTimestamp);
    const currentDate = new Date(now);

    // Check if day has changed
    if (lastReset.getUTCDate() !== currentDate.getUTCDate()) {
      this.metrics.dailyProfitLossSol = 0;
      this.metrics.lastResetTimestamp = now;
      logger.info('Daily metrics reset');
    }
  }

  /**
   * Calculate Sharpe ratio (annualized)
   */
  calculateSharpeRatio(riskFreeRate = 0.02): number {
    if (this.metrics.totalTrades < 2) return 0;

    const avgProfit = this.metrics.totalProfitSol / this.metrics.totalTrades;
    const avgLoss = this.metrics.totalLossSol / this.metrics.totalTrades;
    const avgReturn = avgProfit - avgLoss;

    // Simple standard deviation calculation
    const variance =
      (Math.pow(avgProfit - avgReturn, 2) + Math.pow(-avgLoss - avgReturn, 2)) /
      2;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized Sharpe ratio (assuming 365 trading days)
    const sharpeRatio = ((avgReturn - riskFreeRate / 365) * Math.sqrt(365)) / stdDev;

    return sharpeRatio;
  }

  /**
   * Get current metrics
   */
  getMetrics(): TradeMetrics {
    return { ...this.metrics };
  }

  /**
   * Get risk parameters
   */
  getParameters(): RiskParameters {
    return { ...this.parameters };
  }

  /**
   * Update risk parameters
   */
  updateParameters(parameters: Partial<RiskParameters>): void {
    this.parameters = {
      ...this.parameters,
      ...parameters,
    };
    logger.info('Risk parameters updated', {
      parameters: this.parameters,
    });
  }

  /**
   * Calculate win rate
   */
  getWinRate(): number {
    if (this.metrics.totalTrades === 0) return 0;
    return (this.metrics.successfulTrades / this.metrics.totalTrades) * 100;
  }

  /**
   * Get net profit/loss
   */
  getNetProfitLoss(): number {
    return this.metrics.totalProfitSol - this.metrics.totalLossSol;
  }

  /**
   * Get average profit per successful trade
   */
  getAverageProfit(): number {
    if (this.metrics.successfulTrades === 0) return 0;
    return this.metrics.totalProfitSol / this.metrics.successfulTrades;
  }

  /**
   * Get average loss per failed trade
   */
  getAverageLoss(): number {
    if (this.metrics.failedTrades === 0) return 0;
    return this.metrics.totalLossSol / this.metrics.failedTrades;
  }

  /**
   * Reset all metrics (use with caution)
   */
  resetMetrics(): void {
    this.metrics = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfitSol: 0,
      totalLossSol: 0,
      consecutiveLosses: 0,
      currentDrawdownBps: 0,
      dailyProfitLossSol: 0,
      lastTradeTimestamp: Date.now(),
      lastResetTimestamp: Date.now(),
    };
    logger.info('Metrics reset');
  }
}

// Singleton instance
let riskControllerInstance: RiskController | null = null;

/**
 * Get or create risk controller instance
 */
export function getRiskController(parameters?: Partial<RiskParameters>): RiskController {
  if (!riskControllerInstance) {
    riskControllerInstance = new RiskController(parameters);
  }
  return riskControllerInstance;
}
