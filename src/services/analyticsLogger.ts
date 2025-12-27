import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface TransactionLog {
  timestamp: Date;
  type: "arbitrage" | "distribution" | "airdrop" | "other";
  signature?: string;
  success: boolean;
  profit?: number;
  cost?: number;
  netProfit?: number;
  details: Record<string, any>;
}

export interface ProfitAllocationLog {
  timestamp: Date;
  totalProfit: number;
  reserveAmount: number;
  gasAmount: number;
  daoAmount: number;
  signature?: string;
  success: boolean;
}

export interface ArbitrageExecutionLog {
  timestamp: Date;
  strategy: string;
  tokens: string[];
  estimatedProfit: number;
  actualProfit?: number;
  gasCost: number;
  netProfit?: number;
  signature?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Analytics and Logging Service
 * Provides detailed tracking for transactions, profits, and system events
 */
export class AnalyticsLogger {
  private logsDir: string;
  private transactions: TransactionLog[] = [];
  private profitAllocations: ProfitAllocationLog[] = [];
  private arbitrageExecutions: ArbitrageExecutionLog[] = [];

  constructor(logsDir: string = "./logs") {
    this.logsDir = logsDir;
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log a transaction
   */
  logTransaction(log: Omit<TransactionLog, "timestamp">): void {
    const entry: TransactionLog = {
      ...log,
      timestamp: new Date(),
    };

    this.transactions.push(entry);
    this.appendToFile("transactions.jsonl", entry);

    const status = entry.success ? "✅" : "❌";
    console.log(
      `${status} Transaction [${entry.type}]: ${entry.signature || "N/A"}`,
    );
    if (entry.profit) {
      console.log(
        `   Profit: $${entry.profit.toFixed(4)} | Cost: $${entry.cost?.toFixed(4) || "0"} | Net: $${entry.netProfit?.toFixed(4) || "0"}`,
      );
    }
  }

  /**
   * Log profit allocation
   */
  logProfitAllocation(log: Omit<ProfitAllocationLog, "timestamp">): void {
    const entry: ProfitAllocationLog = {
      ...log,
      timestamp: new Date(),
    };

    this.profitAllocations.push(entry);
    this.appendToFile("profit-allocations.jsonl", entry);

    const status = entry.success ? "✅" : "❌";
    console.log(`${status} Profit Distribution:`);
    console.log(`   Total: $${entry.totalProfit.toFixed(6)}`);
    console.log(`   Reserve (70%): $${entry.reserveAmount.toFixed(6)}`);
    console.log(`   Gas (20%): $${entry.gasAmount.toFixed(6)}`);
    console.log(`   DAO (10%): $${entry.daoAmount.toFixed(6)}`);
    if (entry.signature) {
      console.log(`   Signature: ${entry.signature}`);
    }
  }

  /**
   * Log arbitrage execution
   */
  logArbitrageExecution(log: Omit<ArbitrageExecutionLog, "timestamp">): void {
    const entry: ArbitrageExecutionLog = {
      ...log,
      timestamp: new Date(),
    };

    this.arbitrageExecutions.push(entry);
    this.appendToFile("arbitrage-executions.jsonl", entry);

    const status = entry.success ? "✅" : "❌";
    console.log(`${status} Arbitrage [${entry.strategy}]:`);
    console.log(`   Tokens: ${entry.tokens.join(" -> ")}`);
    console.log(`   Est. Profit: $${entry.estimatedProfit.toFixed(4)}`);
    if (entry.actualProfit !== undefined) {
      console.log(`   Actual Profit: $${entry.actualProfit.toFixed(4)}`);
    }
    console.log(`   Gas Cost: $${entry.gasCost.toFixed(4)}`);
    if (entry.netProfit !== undefined) {
      console.log(`   Net Profit: $${entry.netProfit.toFixed(4)}`);
    }
    if (entry.signature) {
      console.log(`   Signature: ${entry.signature}`);
    }
    if (entry.errorMessage) {
      console.log(`   Error: ${entry.errorMessage}`);
    }
  }

  /**
   * Append log entry to JSONL file
   */
  private appendToFile(filename: string, entry: any): void {
    try {
      const filepath = join(this.logsDir, filename);
      const line = JSON.stringify(entry) + "\n";
      appendFileSync(filepath, line, "utf8");
    } catch (error) {
      console.error(`Failed to write to log file ${filename}:`, error);
    }
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(): {
    total: number;
    successful: number;
    failed: number;
    totalProfit: number;
    totalCost: number;
    totalNetProfit: number;
    byType: Record<string, number>;
  } {
    const successful = this.transactions.filter((t) => t.success);
    const byType: Record<string, number> = {};

    for (const tx of this.transactions) {
      byType[tx.type] = (byType[tx.type] || 0) + 1;
    }

    return {
      total: this.transactions.length,
      successful: successful.length,
      failed: this.transactions.length - successful.length,
      totalProfit: successful.reduce((sum, t) => sum + (t.profit || 0), 0),
      totalCost: successful.reduce((sum, t) => sum + (t.cost || 0), 0),
      totalNetProfit: successful.reduce(
        (sum, t) => sum + (t.netProfit || 0),
        0,
      ),
      byType,
    };
  }

  /**
   * Get profit allocation statistics
   */
  getProfitAllocationStats(): {
    total: number;
    successful: number;
    failed: number;
    totalDistributed: number;
    totalReserve: number;
    totalGas: number;
    totalDao: number;
  } {
    const successful = this.profitAllocations.filter((p) => p.success);

    return {
      total: this.profitAllocations.length,
      successful: successful.length,
      failed: this.profitAllocations.length - successful.length,
      totalDistributed: successful.reduce((sum, p) => sum + p.totalProfit, 0),
      totalReserve: successful.reduce((sum, p) => sum + p.reserveAmount, 0),
      totalGas: successful.reduce((sum, p) => sum + p.gasAmount, 0),
      totalDao: successful.reduce((sum, p) => sum + p.daoAmount, 0),
    };
  }

  /**
   * Get arbitrage execution statistics
   */
  getArbitrageStats(): {
    total: number;
    successful: number;
    failed: number;
    totalEstimatedProfit: number;
    totalActualProfit: number;
    totalGasCost: number;
    totalNetProfit: number;
    averageSlippage: number;
    byStrategy: Record<string, number>;
  } {
    const successful = this.arbitrageExecutions.filter((a) => a.success);
    const byStrategy: Record<string, number> = {};

    for (const arb of this.arbitrageExecutions) {
      byStrategy[arb.strategy] = (byStrategy[arb.strategy] || 0) + 1;
    }

    const totalEstimatedProfit = this.arbitrageExecutions.reduce(
      (sum, a) => sum + a.estimatedProfit,
      0,
    );
    const totalActualProfit = successful.reduce(
      (sum, a) => sum + (a.actualProfit || 0),
      0,
    );

    const averageSlippage =
      successful.length > 0
        ? ((totalEstimatedProfit - totalActualProfit) / totalEstimatedProfit) *
          100
        : 0;

    return {
      total: this.arbitrageExecutions.length,
      successful: successful.length,
      failed: this.arbitrageExecutions.length - successful.length,
      totalEstimatedProfit,
      totalActualProfit,
      totalGasCost: this.arbitrageExecutions.reduce(
        (sum, a) => sum + a.gasCost,
        0,
      ),
      totalNetProfit: successful.reduce(
        (sum, a) => sum + (a.netProfit || 0),
        0,
      ),
      averageSlippage,
      byStrategy,
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): string {
    const txStats = this.getTransactionStats();
    const profitStats = this.getProfitAllocationStats();
    const arbStats = this.getArbitrageStats();

    let report = "═══════════════════════════════════════════\n";
    report += "           ANALYTICS REPORT\n";
    report += "═══════════════════════════════════════════\n\n";

    report += "📊 Transaction Statistics:\n";
    report += `   Total Transactions: ${txStats.total}\n`;
    report += `   Successful: ${txStats.successful} (${((txStats.successful / txStats.total) * 100).toFixed(1)}%)\n`;
    report += `   Failed: ${txStats.failed}\n`;
    report += `   Total Profit: $${txStats.totalProfit.toFixed(2)}\n`;
    report += `   Total Cost: $${txStats.totalCost.toFixed(2)}\n`;
    report += `   Total Net Profit: $${txStats.totalNetProfit.toFixed(2)}\n`;
    report += "   By Type:\n";
    for (const [type, count] of Object.entries(txStats.byType)) {
      report += `     ${type}: ${count}\n`;
    }

    report += "\n💰 Profit Distribution:\n";
    report += `   Total Distributions: ${profitStats.total}\n`;
    report += `   Successful: ${profitStats.successful}\n`;
    report += `   Failed: ${profitStats.failed}\n`;
    report += `   Total Distributed: $${profitStats.totalDistributed.toFixed(2)}\n`;
    report += `   Reserve Wallet (70%): $${profitStats.totalReserve.toFixed(2)}\n`;
    report += `   Gas Coverage (20%): $${profitStats.totalGas.toFixed(2)}\n`;
    report += `   DAO Community (10%): $${profitStats.totalDao.toFixed(2)}\n`;

    report += "\n⚡ Arbitrage Executions:\n";
    report += `   Total Executions: ${arbStats.total}\n`;
    report += `   Successful: ${arbStats.successful} (${((arbStats.successful / arbStats.total) * 100).toFixed(1)}%)\n`;
    report += `   Failed: ${arbStats.failed}\n`;
    report += `   Est. Profit: $${arbStats.totalEstimatedProfit.toFixed(2)}\n`;
    report += `   Actual Profit: $${arbStats.totalActualProfit.toFixed(2)}\n`;
    report += `   Gas Cost: $${arbStats.totalGasCost.toFixed(2)}\n`;
    report += `   Net Profit: $${arbStats.totalNetProfit.toFixed(2)}\n`;
    report += `   Avg Slippage: ${arbStats.averageSlippage.toFixed(2)}%\n`;
    report += "   By Strategy:\n";
    for (const [strategy, count] of Object.entries(arbStats.byStrategy)) {
      report += `     ${strategy}: ${count}\n`;
    }

    report += "\n═══════════════════════════════════════════\n";

    return report;
  }

  /**
   * Export analytics data to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        transactions: this.transactions,
        profitAllocations: this.profitAllocations,
        arbitrageExecutions: this.arbitrageExecutions,
        statistics: {
          transactions: this.getTransactionStats(),
          profitAllocations: this.getProfitAllocationStats(),
          arbitrage: this.getArbitrageStats(),
        },
      },
      null,
      2,
    );
  }

  /**
   * Save report to file
   */
  saveReport(): void {
    const report = this.generateReport();
    const filename = `report-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    const filepath = join(this.logsDir, filename);
    writeFileSync(filepath, report, "utf8");
    console.log(`📄 Report saved to: ${filepath}`);
  }

  /**
   * Clear all logs (use with caution)
   */
  clearLogs(): void {
    this.transactions = [];
    this.profitAllocations = [];
    this.arbitrageExecutions = [];
    console.log("🗑️  All logs cleared");
  }
}
