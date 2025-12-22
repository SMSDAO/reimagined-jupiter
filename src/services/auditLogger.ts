/**
 * Audit Logging Service
 * 
 * Tracks all wallet scoring and portfolio analysis operations
 * for security, compliance, and monitoring purposes.
 * 
 * Logs are stored in memory for this implementation.
 * In production, would integrate with database or external logging service.
 */

export interface AuditLogEntry {
  timestamp: Date;
  operation: 'wallet-analysis' | 'batch-scoring' | 'export' | 'admin-action';
  walletAddress?: string;
  walletCount?: number;
  score?: number;
  tier?: string;
  riskLevel?: string;
  dataSource: {
    jupiter: boolean;
    solanascan: boolean;
    onchain: boolean;
  };
  duration: number; // milliseconds
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit Logger for Portfolio Analytics
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 10000; // Keep last 10k logs in memory

  /**
   * Log a wallet analysis operation
   */
  logWalletAnalysis(params: {
    walletAddress: string;
    score: number;
    tier: string;
    riskLevel: string;
    dataSource: { jupiter: boolean; solanascan: boolean; onchain: boolean };
    duration: number;
    success: boolean;
    error?: string;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'wallet-analysis',
      walletAddress: this.maskAddress(params.walletAddress),
      score: params.score,
      tier: params.tier,
      riskLevel: params.riskLevel,
      dataSource: params.dataSource,
      duration: params.duration,
      success: params.success,
      error: params.error,
    };

    this.addLog(entry);
    this.logToConsole(entry);
  }

  /**
   * Log a batch scoring operation
   */
  logBatchScoring(params: {
    walletCount: number;
    avgScore: number;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'batch-scoring',
      walletCount: params.walletCount,
      score: params.avgScore,
      dataSource: { jupiter: true, solanascan: false, onchain: true },
      duration: params.duration,
      success: params.success,
      error: params.error,
      metadata: params.metadata,
    };

    this.addLog(entry);
    this.logToConsole(entry);
  }

  /**
   * Log an export operation
   */
  logExport(params: {
    walletCount: number;
    duration: number;
    success: boolean;
    error?: string;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'export',
      walletCount: params.walletCount,
      dataSource: { jupiter: true, solanascan: false, onchain: true },
      duration: params.duration,
      success: params.success,
      error: params.error,
    };

    this.addLog(entry);
    this.logToConsole(entry);
  }

  /**
   * Log an admin action
   */
  logAdminAction(params: {
    action: string;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'admin-action',
      dataSource: { jupiter: false, solanascan: false, onchain: false },
      duration: params.duration,
      success: params.success,
      error: params.error,
      metadata: { action: params.action, ...params.metadata },
    };

    this.addLog(entry);
    this.logToConsole(entry);
  }

  /**
   * Get recent audit logs
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by operation type
   */
  getLogsByOperation(operation: AuditLogEntry['operation'], limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.operation === operation)
      .slice(-limit);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => !log.success)
      .slice(-limit);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalOperations: number;
    successRate: number;
    avgDuration: number;
    operationCounts: Record<string, number>;
    failureReasons: Record<string, number>;
  } {
    const total = this.logs.length;
    const successful = this.logs.filter(log => log.success).length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const totalDuration = this.logs.reduce((sum, log) => sum + log.duration, 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    const operationCounts: Record<string, number> = {};
    const failureReasons: Record<string, number> = {};

    for (const log of this.logs) {
      operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1;

      if (!log.success && log.error) {
        failureReasons[log.error] = (failureReasons[log.error] || 0) + 1;
      }
    }

    return {
      totalOperations: total,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      operationCounts,
      failureReasons,
    };
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsCSV(): string {
    const headers = [
      'Timestamp',
      'Operation',
      'Wallet Address',
      'Score',
      'Tier',
      'Risk Level',
      'Duration (ms)',
      'Success',
      'Error',
    ];

    const rows = this.logs.map(log => [
      log.timestamp.toISOString(),
      log.operation,
      log.walletAddress || 'N/A',
      log.score?.toString() || 'N/A',
      log.tier || 'N/A',
      log.riskLevel || 'N/A',
      log.duration.toString(),
      log.success.toString(),
      log.error || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Clear old logs (keep only last maxLogs entries)
   */
  private addLog(entry: AuditLogEntry): void {
    this.logs.push(entry);

    // Remove old logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Mask wallet address for privacy (show first 8 and last 6 characters)
   */
  private maskAddress(address: string): string {
    if (address.length < 14) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: AuditLogEntry): void {
    const emoji = entry.success ? '✅' : '❌';
    const color = entry.success ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(
      `${color}${emoji} [AUDIT]${reset} ${entry.operation.toUpperCase()} - ` +
      `${entry.walletAddress || `${entry.walletCount} wallets`} - ` +
      `${entry.duration}ms - ` +
      `${entry.success ? 'SUCCESS' : `FAILED: ${entry.error}`}`
    );
  }
}

/**
 * Singleton instance
 */
let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get audit logger instance
 */
export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger();
  }
  return auditLoggerInstance;
}

/**
 * Convenience functions
 */
export const auditLog = {
  walletAnalysis: (params: Parameters<AuditLogger['logWalletAnalysis']>[0]) =>
    getAuditLogger().logWalletAnalysis(params),
  
  batchScoring: (params: Parameters<AuditLogger['logBatchScoring']>[0]) =>
    getAuditLogger().logBatchScoring(params),
  
  export: (params: Parameters<AuditLogger['logExport']>[0]) =>
    getAuditLogger().logExport(params),
  
  adminAction: (params: Parameters<AuditLogger['logAdminAction']>[0]) =>
    getAuditLogger().logAdminAction(params),
  
  getRecentLogs: (limit?: number) =>
    getAuditLogger().getRecentLogs(limit),
  
  getStatistics: () =>
    getAuditLogger().getStatistics(),
  
  exportLogs: () =>
    getAuditLogger().exportLogs(),
  
  exportLogsCSV: () =>
    getAuditLogger().exportLogsCSV(),
};
