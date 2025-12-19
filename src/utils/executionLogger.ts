import fs from 'fs/promises';
import path from 'path';
import { ArbitrageOpportunity } from '../types.js';

export interface ExecutionLog {
  timestamp: string;
  type: 'flash-loan' | 'triangular';
  provider?: string;
  path: string[];
  estimatedProfit: number;
  actualProfit?: number;
  signature?: string;
  status: 'success' | 'failed' | 'simulation_failed';
  error?: string;
  fees?: {
    transaction: number;
    flashLoan?: number;
    prioritization: number;
  };
  profitDistribution?: {
    reserve: number;
    gasSlippage: number;
    dao: number;
  };
  computeUnits?: number;
  slippage?: number;
}

export class ExecutionLogger {
  private logDir: string;
  private logFile: string;
  
  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.logFile = path.join(logDir, 'arbitrage-executions.jsonl');
  }
  
  /**
   * Initialize log directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      console.log(`📁 Execution logs directory: ${this.logDir}`);
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }
  
  /**
   * Log an arbitrage execution
   */
  async logExecution(log: ExecutionLog): Promise<void> {
    try {
      const logLine = JSON.stringify(log) + '\n';
      await fs.appendFile(this.logFile, logLine);
      
      // Also log to console in a formatted way
      this.printExecutionSummary(log);
    } catch (error) {
      console.error('Error writing execution log:', error);
    }
  }
  
  /**
   * Print formatted execution summary to console
   */
  private printExecutionSummary(log: ExecutionLog): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXECUTION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Timestamp: ${log.timestamp}`);
    console.log(`Type: ${log.type}`);
    if (log.provider) console.log(`Provider: ${log.provider}`);
    console.log(`Path: ${log.path.join(' -> ')}`);
    console.log(`Status: ${log.status.toUpperCase()}`);
    
    if (log.signature) {
      console.log(`Signature: ${log.signature}`);
    }
    
    console.log('\n💰 Profit:');
    console.log(`  Estimated: $${log.estimatedProfit.toFixed(6)}`);
    if (log.actualProfit !== undefined) {
      console.log(`  Actual: $${log.actualProfit.toFixed(6)}`);
      const difference = log.actualProfit - log.estimatedProfit;
      const percentage = (difference / log.estimatedProfit) * 100;
      console.log(`  Difference: $${difference.toFixed(6)} (${percentage.toFixed(2)}%)`);
    }
    
    if (log.fees) {
      console.log('\n⚡ Fees:');
      console.log(`  Transaction: ${log.fees.transaction.toFixed(6)} SOL`);
      if (log.fees.flashLoan) {
        console.log(`  Flash Loan: ${log.fees.flashLoan.toFixed(6)} SOL`);
      }
      console.log(`  Prioritization: ${log.fees.prioritization.toFixed(6)} SOL`);
      const totalFees = log.fees.transaction + (log.fees.flashLoan || 0) + log.fees.prioritization;
      console.log(`  Total: ${totalFees.toFixed(6)} SOL`);
    }
    
    if (log.profitDistribution) {
      console.log('\n💸 Profit Distribution:');
      console.log(`  Reserve (70%): $${log.profitDistribution.reserve.toFixed(6)}`);
      console.log(`  Gas/Slippage (20%): $${log.profitDistribution.gasSlippage.toFixed(6)}`);
      console.log(`  DAO (10%): $${log.profitDistribution.dao.toFixed(6)}`);
    }
    
    if (log.computeUnits !== undefined && log.computeUnits !== null) {
      console.log(`\n⚙️  Compute Units: ${log.computeUnits.toLocaleString()}`);
    }
    
    if (log.slippage) {
      console.log(`🔄 Slippage: ${(log.slippage * 100).toFixed(3)}%`);
    }
    
    if (log.error) {
      console.log(`\n❌ Error: ${log.error}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * Get execution statistics
   */
  async getStatistics(since?: Date): Promise<{
    total: number;
    successful: number;
    failed: number;
    totalProfit: number;
    avgProfit: number;
    totalFees: number;
  }> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      const lines = content.trim().split('\n').filter((line: string) => line.length > 0);
      
      let logs = lines.map((line: string) => JSON.parse(line) as ExecutionLog);
      
      // Filter by date if provided
      if (since) {
        logs = logs.filter((log: ExecutionLog) => new Date(log.timestamp) >= since);
      }
      
      const successful = logs.filter((log: ExecutionLog) => log.status === 'success');
      const failed = logs.filter((log: ExecutionLog) => log.status === 'failed' || log.status === 'simulation_failed');
      
      const totalProfit = successful.reduce((sum: number, log: ExecutionLog) => sum + (log.actualProfit || 0), 0);
      const avgProfit = successful.length > 0 ? totalProfit / successful.length : 0;
      
      const totalFees = logs.reduce((sum: number, log: ExecutionLog) => {
        if (!log.fees) return sum;
        return sum + log.fees.transaction + (log.fees.flashLoan || 0) + log.fees.prioritization;
      }, 0);
      
      return {
        total: logs.length,
        successful: successful.length,
        failed: failed.length,
        totalProfit,
        avgProfit,
        totalFees
      };
    } catch (error) {
      console.error('Error reading execution logs:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        totalProfit: 0,
        avgProfit: 0,
        totalFees: 0
      };
    }
  }
  
  /**
   * Print execution statistics
   */
  async printStatistics(since?: Date): Promise<void> {
    const stats = await this.getStatistics(since);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 EXECUTION STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (since) {
      console.log(`Period: Since ${since.toISOString()}`);
    } else {
      console.log('Period: All time');
    }
    
    console.log(`\nTotal Executions: ${stats.total}`);
    console.log(`  ✅ Successful: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    
    console.log(`\n💰 Profit:`);
    console.log(`  Total: $${stats.totalProfit.toFixed(6)}`);
    console.log(`  Average: $${stats.avgProfit.toFixed(6)}`);
    
    console.log(`\n⚡ Total Fees: ${stats.totalFees.toFixed(6)} SOL`);
    
    const netProfit = stats.totalProfit - stats.totalFees;
    console.log(`\n💎 Net Profit: $${netProfit.toFixed(6)}`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * Create execution log from opportunity and result
   */
  createLog(
    opportunity: ArbitrageOpportunity,
    result: {
      success: boolean;
      signature?: string;
      error?: string;
      computeUnits?: number;
      fee?: number;
    },
    actualProfit?: number,
    fees?: {
      flashLoan?: number;
      prioritization: number;
    },
    profitDistribution?: {
      reserve: number;
      gasSlippage: number;
      dao: number;
    }
  ): ExecutionLog {
    return {
      timestamp: new Date().toISOString(),
      type: opportunity.type,
      provider: opportunity.provider,
      path: opportunity.path.map(t => t.symbol),
      estimatedProfit: opportunity.estimatedProfit,
      actualProfit,
      signature: result.signature,
      status: result.success ? 'success' : 'failed',
      error: result.error,
      fees: fees ? {
        transaction: (result.fee || 0) / 1e9,
        flashLoan: fees.flashLoan,
        prioritization: fees.prioritization / 1e9
      } : undefined,
      profitDistribution,
      computeUnits: result.computeUnits,
    };
  }
}
