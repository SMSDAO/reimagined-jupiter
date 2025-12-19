/**
 * Real-time profit and loss (P&L) tracking
 * Tracks trading performance and calculates metrics
 */

import { logger } from './logger.js';

export interface TradeRecord {
  id: string;
  timestamp: number;
  type: 'arbitrage' | 'flash-loan' | 'triangular';
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  profit: number; // In SOL
  gasUsed: number; // In SOL
  netProfit: number; // profit - gasUsed - devFee
  devFee: number; // In SOL
  signature?: string;
  executionTimeMs?: number;
}

export interface ProfitStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number; // Gross profit
  totalGasUsed: number;
  totalDevFees: number;
  netProfit: number; // After gas and fees
  averageProfit: number;
  largestProfit: number;
  largestLoss: number;
  winRate: number; // Percentage
  profitFactor: number; // Total wins / Total losses
  startTime: number;
  lastTradeTime: number;
  uptimeMs: number;
}

export class ProfitTracker {
  private trades: TradeRecord[] = [];
  private startTime: number;
  private initialCapital: number;
  
  constructor(initialCapital: number) {
    this.initialCapital = initialCapital;
    this.startTime = Date.now();
    
    logger.info('Profit tracker initialized', {
      initialCapital,
    });
  }
  
  /**
   * Record a trade
   */
  public recordTrade(trade: TradeRecord): void {
    this.trades.push(trade);
    
    logger.info('Trade recorded', {
      id: trade.id,
      type: trade.type,
      profit: trade.profit,
      netProfit: trade.netProfit,
      gasUsed: trade.gasUsed,
      signature: trade.signature,
    });
  }
  
  /**
   * Get all trades
   */
  public getTrades(): TradeRecord[] {
    return [...this.trades];
  }
  
  /**
   * Get trades within time range
   */
  public getTradesInRange(startTime: number, endTime: number): TradeRecord[] {
    return this.trades.filter(
      t => t.timestamp >= startTime && t.timestamp <= endTime
    );
  }
  
  /**
   * Get recent trades
   */
  public getRecentTrades(count: number = 10): TradeRecord[] {
    return this.trades.slice(-count);
  }
  
  /**
   * Calculate current statistics
   */
  public getStats(): ProfitStats {
    const now = Date.now();
    const successfulTrades = this.trades.filter(t => t.netProfit > 0);
    const failedTrades = this.trades.filter(t => t.netProfit <= 0);
    
    const totalProfit = this.trades.reduce((sum, t) => sum + t.profit, 0);
    const totalGasUsed = this.trades.reduce((sum, t) => sum + t.gasUsed, 0);
    const totalDevFees = this.trades.reduce((sum, t) => sum + t.devFee, 0);
    const netProfit = this.trades.reduce((sum, t) => sum + t.netProfit, 0);
    
    const profits = successfulTrades.map(t => t.netProfit);
    const losses = failedTrades.map(t => Math.abs(t.netProfit));
    
    const totalWins = profits.reduce((sum, p) => sum + p, 0);
    const totalLosses = losses.reduce((sum, l) => sum + l, 0);
    
    const largestProfit = profits.length > 0 ? Math.max(...profits) : 0;
    const largestLoss = losses.length > 0 ? Math.max(...losses) : 0;
    
    const winRate = this.trades.length > 0
      ? (successfulTrades.length / this.trades.length) * 100
      : 0;
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
    
    const averageProfit = this.trades.length > 0
      ? netProfit / this.trades.length
      : 0;
    
    const lastTradeTime = this.trades.length > 0
      ? this.trades[this.trades.length - 1].timestamp
      : this.startTime;
    
    return {
      totalTrades: this.trades.length,
      successfulTrades: successfulTrades.length,
      failedTrades: failedTrades.length,
      totalProfit,
      totalGasUsed,
      totalDevFees,
      netProfit,
      averageProfit,
      largestProfit,
      largestLoss,
      winRate,
      profitFactor,
      startTime: this.startTime,
      lastTradeTime,
      uptimeMs: now - this.startTime,
    };
  }
  
  /**
   * Get daily statistics
   */
  public getDailyStats(): ProfitStats {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = this.getTradesInRange(oneDayAgo, Date.now());
    
    // Create temporary tracker for daily stats
    const dailyTracker = new ProfitTracker(this.initialCapital);
    dailyTracker.trades = recentTrades;
    dailyTracker.startTime = oneDayAgo;
    
    return dailyTracker.getStats();
  }
  
  /**
   * Get hourly statistics
   */
  public getHourlyStats(): ProfitStats {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentTrades = this.getTradesInRange(oneHourAgo, Date.now());
    
    const hourlyTracker = new ProfitTracker(this.initialCapital);
    hourlyTracker.trades = recentTrades;
    hourlyTracker.startTime = oneHourAgo;
    
    return hourlyTracker.getStats();
  }
  
  /**
   * Calculate ROI (Return on Investment)
   */
  public calculateROI(): number {
    const stats = this.getStats();
    return this.initialCapital > 0
      ? (stats.netProfit / this.initialCapital) * 100
      : 0;
  }
  
  /**
   * Calculate daily ROI
   */
  public calculateDailyROI(): number {
    const dailyStats = this.getDailyStats();
    return this.initialCapital > 0
      ? (dailyStats.netProfit / this.initialCapital) * 100
      : 0;
  }
  
  /**
   * Get performance summary
   */
  public getSummary(): string {
    const stats = this.getStats();
    const roi = this.calculateROI();
    const dailyROI = this.calculateDailyROI();
    
    return `
📊 Performance Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Trades: ${stats.totalTrades}
Success Rate: ${stats.winRate.toFixed(2)}%
Net Profit: ${stats.netProfit.toFixed(4)} SOL
ROI: ${roi.toFixed(2)}%
Daily ROI: ${dailyROI.toFixed(2)}%
Average Profit: ${stats.averageProfit.toFixed(4)} SOL
Largest Win: ${stats.largestProfit.toFixed(4)} SOL
Largest Loss: ${stats.largestLoss.toFixed(4)} SOL
Profit Factor: ${stats.profitFactor.toFixed(2)}
Total Gas: ${stats.totalGasUsed.toFixed(4)} SOL
Total Dev Fees: ${stats.totalDevFees.toFixed(4)} SOL
Uptime: ${this.formatUptime(stats.uptimeMs)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
  
  /**
   * Format uptime as human-readable string
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  /**
   * Export trades to JSON
   */
  public exportTrades(): string {
    return JSON.stringify(this.trades, null, 2);
  }
  
  /**
   * Clear trade history (keep stats)
   */
  public clearHistory(): void {
    logger.warn('Clearing trade history', {
      tradeCount: this.trades.length,
    });
    
    this.trades = [];
  }
  
  /**
   * Reset tracker (clear all data)
   */
  public reset(): void {
    logger.warn('Resetting profit tracker');
    
    this.trades = [];
    this.startTime = Date.now();
  }
}

// Singleton instance
let profitTrackerInstance: ProfitTracker | null = null;

/**
 * Initialize profit tracker
 */
export function initializeProfitTracker(initialCapital: number): ProfitTracker {
  profitTrackerInstance = new ProfitTracker(initialCapital);
  return profitTrackerInstance;
}

/**
 * Get profit tracker instance
 */
export function getProfitTracker(): ProfitTracker {
  if (!profitTrackerInstance) {
    throw new Error('Profit tracker not initialized. Call initializeProfitTracker first.');
  }
  return profitTrackerInstance;
}
