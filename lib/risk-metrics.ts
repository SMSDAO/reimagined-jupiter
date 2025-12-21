/**
 * Risk Metrics - Helper functions for risk calculations
 */

export interface RiskMetricsSummary {
  totalTrades: number;
  winRate: number;
  netProfitLoss: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  currentDrawdown: number;
  maxDrawdown: number;
  consecutiveLosses: number;
  dailyPnL: number;
  riskRewardRatio: number;
}

/**
 * Calculate profit factor (total profit / total loss)
 */
export function calculateProfitFactor(totalProfit: number, totalLoss: number): number {
  if (totalLoss === 0) return totalProfit > 0 ? Infinity : 0;
  return totalProfit / totalLoss;
}

/**
 * Calculate risk-reward ratio
 */
export function calculateRiskRewardRatio(averageProfit: number, averageLoss: number): number {
  if (averageLoss === 0) return averageProfit > 0 ? Infinity : 0;
  return averageProfit / averageLoss;
}

/**
 * Calculate maximum drawdown from a series of returns
 */
export function calculateMaxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  let peak = returns[0];
  let maxDrawdown = 0;

  for (const value of returns) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate Value at Risk (VaR) at given confidence level
 */
export function calculateVaR(returns: number[], confidenceLevel = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sorted.length);
  return sorted[index] || 0;
}

/**
 * Calculate Conditional Value at Risk (CVaR / Expected Shortfall)
 */
export function calculateCVaR(returns: number[], confidenceLevel = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sorted.length);
  const tail = sorted.slice(0, index + 1);

  if (tail.length === 0) return 0;

  return tail.reduce((sum, val) => sum + val, 0) / tail.length;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (returns.length - 1);

  return Math.sqrt(variance);
}

/**
 * Calculate Kelly Criterion for optimal position sizing
 */
export function calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0 || winRate === 0 || winRate === 1) return 0;

  const lossRate = 1 - winRate;
  const winLossRatio = avgWin / avgLoss;

  // Kelly formula: (winRate * winLossRatio - lossRate) / winLossRatio
  const kelly = (winRate * winLossRatio - lossRate) / winLossRatio;

  // Cap at 25% to avoid excessive risk
  return Math.max(0, Math.min(0.25, kelly));
}

/**
 * Calculate Sortino Ratio (focuses on downside deviation)
 */
export function calculateSortinoRatio(returns: number[], targetReturn = 0, riskFreeRate = 0.02): number {
  if (returns.length < 2) return 0;

  const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  
  // Calculate downside deviation (only negative returns)
  const downsideReturns = returns.filter(r => r < targetReturn);
  if (downsideReturns.length === 0) return Infinity;

  const downsideDeviation = Math.sqrt(
    downsideReturns.reduce((sum, val) => sum + Math.pow(val - targetReturn, 2), 0) / downsideReturns.length
  );

  if (downsideDeviation === 0) return Infinity;

  return (avgReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Calculate Calmar Ratio (return / max drawdown)
 */
export function calculateCalmarRatio(totalReturn: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return totalReturn > 0 ? Infinity : 0;
  return totalReturn / maxDrawdown;
}

/**
 * Format metrics for display
 */
export function formatRiskMetrics(metrics: RiskMetricsSummary): Record<string, string> {
  return {
    'Total Trades': metrics.totalTrades.toString(),
    'Win Rate': `${metrics.winRate.toFixed(2)}%`,
    'Net P&L': `${metrics.netProfitLoss.toFixed(4)} SOL`,
    'Avg Profit': `${metrics.averageProfit.toFixed(4)} SOL`,
    'Avg Loss': `${metrics.averageLoss.toFixed(4)} SOL`,
    'Profit Factor': metrics.profitFactor.toFixed(2),
    'Sharpe Ratio': metrics.sharpeRatio.toFixed(2),
    'Current Drawdown': `${metrics.currentDrawdown.toFixed(2)}%`,
    'Max Drawdown': `${metrics.maxDrawdown.toFixed(2)}%`,
    'Consecutive Losses': metrics.consecutiveLosses.toString(),
    'Daily P&L': `${metrics.dailyPnL.toFixed(4)} SOL`,
    'Risk/Reward': metrics.riskRewardRatio.toFixed(2),
  };
}

/**
 * Check if metrics meet minimum quality standards
 */
export function meetsQualityStandards(metrics: RiskMetricsSummary): {
  meets: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Minimum win rate: 60%
  if (metrics.winRate < 60) {
    reasons.push(`Win rate below 60%: ${metrics.winRate.toFixed(1)}%`);
  }

  // Minimum profit factor: 1.5
  if (metrics.profitFactor < 1.5) {
    reasons.push(`Profit factor below 1.5: ${metrics.profitFactor.toFixed(2)}`);
  }

  // Minimum Sharpe ratio: 1.0
  if (metrics.sharpeRatio < 1.0 && metrics.totalTrades > 10) {
    reasons.push(`Sharpe ratio below 1.0: ${metrics.sharpeRatio.toFixed(2)}`);
  }

  // Maximum drawdown: 10%
  if (metrics.currentDrawdown > 10) {
    reasons.push(`Current drawdown above 10%: ${metrics.currentDrawdown.toFixed(2)}%`);
  }

  // Net positive P&L
  if (metrics.netProfitLoss <= 0) {
    reasons.push(`Net P&L is not positive: ${metrics.netProfitLoss.toFixed(4)} SOL`);
  }

  return {
    meets: reasons.length === 0,
    reasons,
  };
}
