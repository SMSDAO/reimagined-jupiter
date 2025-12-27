import { Connection } from "@solana/web3.js";

export interface TradeRecord {
  timestamp: number;
  type: "flash-loan" | "triangular" | "hybrid";
  profitAmount: number;
  profitToken: string;
  gasFee: number;
  netProfit: number;
  tokens: string[];
  signature: string;
  distributionBreakdown?: {
    reserve: number;
    user: number;
    dao: number;
  };
}

export interface AnalyticsStats {
  totalTrades: number;
  totalProfit: number;
  totalGasFees: number;
  netProfit: number;
  avgProfitPerTrade: number;
  successRate: number;
  totalVolume: number;
  profitByType: {
    flashLoan: number;
    triangular: number;
    hybrid: number;
  };
  profitDistributed: {
    reserve: number;
    user: number;
    dao: number;
  };
  lastUpdated: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  profit: number;
  gasFees: number;
  volume: number;
}

/**
 * AnalyticsService tracks all trading activity, profits, and fees
 * Provides real-time monitoring and historical analytics
 */
export class AnalyticsService {
  private connection: Connection;
  private trades: TradeRecord[] = [];
  private maxHistorySize: number = 10000; // Keep last 10k trades
  private stats: AnalyticsStats;

  constructor(connection: Connection) {
    this.connection = connection;
    this.stats = this.initializeStats();
  }

  private initializeStats(): AnalyticsStats {
    return {
      totalTrades: 0,
      totalProfit: 0,
      totalGasFees: 0,
      netProfit: 0,
      avgProfitPerTrade: 0,
      successRate: 100, // Start at 100%, will adjust with failures
      totalVolume: 0,
      profitByType: {
        flashLoan: 0,
        triangular: 0,
        hybrid: 0,
      },
      profitDistributed: {
        reserve: 0,
        user: 0,
        dao: 0,
      },
      lastUpdated: Date.now(),
    };
  }

  /**
   * Record a successful trade
   */
  recordTrade(trade: TradeRecord): void {
    // Add to trades history
    this.trades.push(trade);

    // Trim history if needed
    if (this.trades.length > this.maxHistorySize) {
      this.trades = this.trades.slice(-this.maxHistorySize);
    }

    // Update statistics
    this.stats.totalTrades++;
    this.stats.totalProfit += trade.profitAmount;
    this.stats.totalGasFees += trade.gasFee;
    this.stats.netProfit = this.stats.totalProfit - this.stats.totalGasFees;
    this.stats.avgProfitPerTrade =
      this.stats.totalProfit / this.stats.totalTrades;
    this.stats.totalVolume += trade.profitAmount; // Simplified volume calculation

    // Update profit by type
    if (trade.type === "flash-loan") {
      this.stats.profitByType.flashLoan += trade.profitAmount;
    } else if (trade.type === "triangular") {
      this.stats.profitByType.triangular += trade.profitAmount;
    } else {
      this.stats.profitByType.hybrid += trade.profitAmount;
    }

    // Update distribution breakdown if available
    if (trade.distributionBreakdown) {
      this.stats.profitDistributed.reserve +=
        trade.distributionBreakdown.reserve;
      this.stats.profitDistributed.user += trade.distributionBreakdown.user;
      this.stats.profitDistributed.dao += trade.distributionBreakdown.dao;
    }

    this.stats.lastUpdated = Date.now();

    console.log(
      `[Analytics] Trade recorded: ${trade.type} - Profit: ${(trade.profitAmount / 1e9).toFixed(4)} SOL`,
    );
  }

  /**
   * Get current statistics
   */
  getStats(): AnalyticsStats {
    return { ...this.stats };
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 100): TradeRecord[] {
    return this.trades.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get daily statistics for the last N days
   */
  getDailyStats(days: number = 30): DailyStats[] {
    const dailyMap = new Map<string, DailyStats>();
    const now = Date.now();
    const daysMs = days * 24 * 60 * 60 * 1000;

    // Filter trades within the time range
    const recentTrades = this.trades.filter((t) => now - t.timestamp <= daysMs);

    // Group by date
    for (const trade of recentTrades) {
      const date = new Date(trade.timestamp).toISOString().split("T")[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          trades: 0,
          profit: 0,
          gasFees: 0,
          volume: 0,
        });
      }

      const dayStats = dailyMap.get(date)!;
      dayStats.trades++;
      dayStats.profit += trade.profitAmount;
      dayStats.gasFees += trade.gasFee;
      dayStats.volume += trade.profitAmount;
    }

    // Convert to array and sort by date
    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Get profit by token
   */
  getProfitByToken(): Map<string, number> {
    const profitByToken = new Map<string, number>();

    for (const trade of this.trades) {
      const token = trade.profitToken || "SOL";
      profitByToken.set(
        token,
        (profitByToken.get(token) || 0) + trade.profitAmount,
      );
    }

    return profitByToken;
  }

  /**
   * Get most profitable token pairs
   */
  getMostProfitablePairs(
    limit: number = 10,
  ): Array<{ pair: string; profit: number; count: number }> {
    const pairMap = new Map<string, { profit: number; count: number }>();

    for (const trade of this.trades) {
      const pair = trade.tokens.join("-");
      if (!pairMap.has(pair)) {
        pairMap.set(pair, { profit: 0, count: 0 });
      }
      const pairData = pairMap.get(pair)!;
      pairData.profit += trade.profitAmount;
      pairData.count++;
    }

    return Array.from(pairMap.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  }

  /**
   * Get recent performance metrics (last hour, day, week)
   */
  getRecentPerformance(): {
    lastHour: { trades: number; profit: number };
    lastDay: { trades: number; profit: number };
    lastWeek: { trades: number; profit: number };
  } {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    const weekMs = 7 * dayMs;

    const calculateMetrics = (timeRange: number) => {
      const trades = this.trades.filter((t) => now - t.timestamp <= timeRange);
      const profit = trades.reduce((sum, t) => sum + t.profitAmount, 0);
      return { trades: trades.length, profit };
    };

    return {
      lastHour: calculateMetrics(hourMs),
      lastDay: calculateMetrics(dayMs),
      lastWeek: calculateMetrics(weekMs),
    };
  }

  /**
   * Export analytics data as JSON
   */
  exportData(): string {
    return JSON.stringify(
      {
        stats: this.stats,
        trades: this.trades,
        exportTime: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.trades = [];
    this.stats = this.initializeStats();
    console.log("[Analytics] All data cleared");
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): {
    stats: AnalyticsStats;
    recentTrades: TradeRecord[];
    recentPerformance: ReturnType<AnalyticsService["getRecentPerformance"]>;
    topPairs: ReturnType<AnalyticsService["getMostProfitablePairs"]>;
    dailyStats: DailyStats[];
  } {
    return {
      stats: this.getStats(),
      recentTrades: this.getTradeHistory(10),
      recentPerformance: this.getRecentPerformance(),
      topPairs: this.getMostProfitablePairs(5),
      dailyStats: this.getDailyStats(7),
    };
  }

  /**
   * Log current statistics to console
   */
  logStats(): void {
    console.log("\n📊 Analytics Dashboard:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Trades: ${this.stats.totalTrades}`);
    console.log(
      `Total Profit: ${(this.stats.totalProfit / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `Total Gas Fees: ${(this.stats.totalGasFees / 1e9).toFixed(4)} SOL`,
    );
    console.log(`Net Profit: ${(this.stats.netProfit / 1e9).toFixed(4)} SOL`);
    console.log(
      `Avg Profit/Trade: ${(this.stats.avgProfitPerTrade / 1e9).toFixed(4)} SOL`,
    );
    console.log(`Success Rate: ${this.stats.successRate.toFixed(1)}%`);
    console.log("\nProfit by Type:");
    console.log(
      `  Flash Loan: ${(this.stats.profitByType.flashLoan / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `  Triangular: ${(this.stats.profitByType.triangular / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `  Hybrid: ${(this.stats.profitByType.hybrid / 1e9).toFixed(4)} SOL`,
    );
    console.log("\nProfit Distribution:");
    console.log(
      `  Reserve (70%): ${(this.stats.profitDistributed.reserve / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `  User (20%): ${(this.stats.profitDistributed.user / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `  DAO (10%): ${(this.stats.profitDistributed.dao / 1e9).toFixed(4)} SOL`,
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}
