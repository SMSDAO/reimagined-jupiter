/**
 * Audit Logger System
 * 
 * Comprehensive logging of all bot executions and security events.
 * Every action is linked to user, wallet, time, and transaction hash.
 * 
 * SECURITY: All logs are immutable and stored permanently for compliance.
 */

import { query } from '../../db/database.js';
import { PublicKey } from '@solana/web3.js';

export type ActionType = 'config' | 'execution' | 'security' | 'error';
export type Severity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  /** User ID (wallet address) */
  userId: string;
  /** Action performed */
  action: string;
  /** Type of action */
  actionType: ActionType;
  /** Severity level */
  severity: Severity;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Bot configuration ID (if applicable) */
  botConfigId?: string;
  /** Bot execution ID (if applicable) */
  botExecutionId?: string;
  /** IP address of the request */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Wallet address involved */
  walletAddress?: string;
  /** Transaction signature */
  transactionSignature?: string;
  /** Signing mode used */
  signingMode?: 'client' | 'server' | 'enclave';
}

export class AuditLogger {
  /**
   * Log an action to the database
   */
  async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO bot_audit_logs (
          user_id, action, action_type, severity, metadata,
          bot_config_id, bot_execution_id,
          ip_address, user_agent,
          wallet_address, transaction_signature, signing_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          entry.userId,
          entry.action,
          entry.actionType,
          entry.severity,
          JSON.stringify(entry.metadata || {}),
          entry.botConfigId || null,
          entry.botExecutionId || null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.walletAddress || null,
          entry.transactionSignature || null,
          entry.signingMode || null,
        ]
      );

      // Also log to console for immediate visibility
      this.logToConsole(entry);
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Still log to console even if database write fails
      this.logToConsole(entry);
    }
  }

  /**
   * Log bot configuration change
   */
  async logConfigChange(
    userId: string,
    botConfigId: string,
    action: string,
    changes: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      botConfigId,
      action,
      actionType: 'config',
      severity: 'info',
      metadata: {
        changes,
      },
      ipAddress,
    });
  }

  /**
   * Log bot execution start
   */
  async logExecutionStart(
    userId: string,
    botConfigId: string,
    botExecutionId: string,
    transactionType: string,
    transactionHash: string
  ): Promise<void> {
    await this.logAction({
      userId,
      botConfigId,
      botExecutionId,
      action: 'bot_execution_started',
      actionType: 'execution',
      severity: 'info',
      metadata: {
        transactionType,
        transactionHash,
      },
    });
  }

  /**
   * Log bot execution completion
   */
  async logExecutionComplete(
    userId: string,
    botConfigId: string,
    botExecutionId: string,
    signature: string,
    profitLoss: number,
    executionTimeMs: number
  ): Promise<void> {
    await this.logAction({
      userId,
      botConfigId,
      botExecutionId,
      transactionSignature: signature,
      action: 'bot_execution_completed',
      actionType: 'execution',
      severity: 'info',
      metadata: {
        profitLoss,
        executionTimeMs,
      },
    });
  }

  /**
   * Log bot execution failure
   */
  async logExecutionFailure(
    userId: string,
    botConfigId: string,
    botExecutionId: string,
    error: string,
    transactionHash?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      botConfigId,
      botExecutionId,
      action: 'bot_execution_failed',
      actionType: 'error',
      severity: 'error',
      metadata: {
        error,
        transactionHash,
      },
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string,
    event: string,
    severity: Severity,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      action: event,
      actionType: 'security',
      severity,
      metadata: details,
      ipAddress,
    });
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(
    userId: string,
    attemptedAction: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      action: 'unauthorized_access_attempt',
      actionType: 'security',
      severity: 'warning',
      metadata: {
        attemptedAction,
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(
    userId: string,
    botConfigId: string,
    limit: number,
    actual: number
  ): Promise<void> {
    await this.logAction({
      userId,
      botConfigId,
      action: 'rate_limit_exceeded',
      actionType: 'security',
      severity: 'warning',
      metadata: {
        limit,
        actual,
      },
    });
  }

  /**
   * Get recent audit logs for a user
   */
  async getRecentLogs(
    userId: string,
    limit: number = 100,
    actionType?: ActionType
  ): Promise<any[]> {
    try {
      let sql = `
        SELECT * FROM bot_audit_logs
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      if (actionType) {
        sql += ` AND action_type = $2`;
        params.push(actionType);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific bot execution
   */
  async getExecutionLogs(botExecutionId: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM bot_audit_logs
         WHERE bot_execution_id = $1
         ORDER BY created_at ASC`,
        [botExecutionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Failed to retrieve execution logs:', error);
      return [];
    }
  }

  /**
   * Get security events for a user
   */
  async getSecurityEvents(
    userId: string,
    severity?: Severity,
    limit: number = 50
  ): Promise<any[]> {
    try {
      let sql = `
        SELECT * FROM bot_audit_logs
        WHERE user_id = $1 AND action_type = 'security'
      `;
      const params: any[] = [userId];

      if (severity) {
        sql += ` AND severity = $2`;
        params.push(severity);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to retrieve security events:', error);
      return [];
    }
  }

  /**
   * Get audit summary statistics
   */
  async getAuditStats(userId: string, hours: number = 24): Promise<{
    total: number;
    byType: Record<ActionType, number>;
    bySeverity: Record<Severity, number>;
    recentErrors: number;
  }> {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN action_type = 'config' THEN 1 END) as config_count,
           COUNT(CASE WHEN action_type = 'execution' THEN 1 END) as execution_count,
           COUNT(CASE WHEN action_type = 'security' THEN 1 END) as security_count,
           COUNT(CASE WHEN action_type = 'error' THEN 1 END) as error_count,
           COUNT(CASE WHEN severity = 'debug' THEN 1 END) as debug_count,
           COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_count,
           COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count,
           COUNT(CASE WHEN severity = 'error' THEN 1 END) as error_severity_count,
           COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
         FROM bot_audit_logs
         WHERE user_id = $1 
         AND created_at >= NOW() - INTERVAL '${hours} hours'`,
        [userId]
      );

      const row = result.rows[0];
      return {
        total: parseInt(row.total, 10),
        byType: {
          config: parseInt(row.config_count, 10),
          execution: parseInt(row.execution_count, 10),
          security: parseInt(row.security_count, 10),
          error: parseInt(row.error_count, 10),
        },
        bySeverity: {
          debug: parseInt(row.debug_count, 10),
          info: parseInt(row.info_count, 10),
          warning: parseInt(row.warning_count, 10),
          error: parseInt(row.error_severity_count, 10),
          critical: parseInt(row.critical_count, 10),
        },
        recentErrors: parseInt(row.error_severity_count, 10) + parseInt(row.critical_count, 10),
      };
    } catch (error) {
      console.error('Failed to retrieve audit stats:', error);
      return {
        total: 0,
        byType: { config: 0, execution: 0, security: 0, error: 0 },
        bySeverity: { debug: 0, info: 0, warning: 0, error: 0, critical: 0 },
        recentErrors: 0,
      };
    }
  }

  /**
   * Log to console with color coding
   */
  private logToConsole(entry: AuditLogEntry): void {
    const colors = {
      debug: '\x1b[90m',    // Gray
      info: '\x1b[36m',     // Cyan
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      critical: '\x1b[35m', // Magenta
      reset: '\x1b[0m',
    };

    const color = colors[entry.severity] || colors.info;
    const timestamp = new Date().toISOString();
    
    console.log(
      `${color}[${timestamp}] [${entry.severity.toUpperCase()}] [${entry.actionType}] ${entry.action}${colors.reset}`,
      {
        user: entry.userId.slice(0, 8) + '...',
        ...(entry.metadata || {}),
      }
    );
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
