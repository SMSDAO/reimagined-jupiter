/**
 * Bot Telemetry API
 * 
 * Endpoints for retrieving bot performance metrics, statistics, and monitoring data.
 * Provides real-time and historical telemetry for dashboards.
 */

import { Request, Response } from 'express';
import { query } from '../../db/database.js';
import { replayProtection } from '../../src/bot/replayProtection.js';
import { auditLogger } from '../../src/bot/auditLogger.js';

/**
 * Get bot status and live metrics
 * GET /api/bot/telemetry/status
 */
export async function getBotStatus(req: Request, res: Response): Promise<void> {
  try {
    const { userId, botConfigId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    let sql = `
      SELECT 
        bc.id,
        bc.bot_name,
        bc.bot_type,
        bc.enabled,
        bc.auto_execute,
        bc.last_executed_at,
        COUNT(be.id) FILTER (WHERE be.started_at >= NOW() - INTERVAL '1 hour') as executions_last_hour,
        COUNT(be.id) FILTER (WHERE be.started_at >= CURRENT_DATE) as executions_today,
        COUNT(be.id) FILTER (WHERE be.status = 'success') as total_successful,
        COUNT(be.id) FILTER (WHERE be.status = 'failed') as total_failed,
        COALESCE(SUM(be.total_fee_lamports) FILTER (WHERE be.started_at >= CURRENT_DATE), 0) as gas_spent_today,
        COALESCE(SUM(be.profit_loss_lamports) FILTER (WHERE be.started_at >= CURRENT_DATE), 0) as profit_today
      FROM bot_configurations bc
      LEFT JOIN bot_executions be ON bc.id = be.bot_config_id
      WHERE bc.user_id = $1
    `;
    const params: any[] = [userId];

    if (botConfigId) {
      params.push(botConfigId);
      sql += ` AND bc.id = $${params.length}`;
    }

    sql += ` GROUP BY bc.id, bc.bot_name, bc.bot_type, bc.enabled, bc.auto_execute, bc.last_executed_at`;

    const result = await query(sql, params);

    res.json({
      success: true,
      bots: result.rows.map(row => ({
        id: row.id,
        name: row.bot_name,
        type: row.bot_type,
        enabled: row.enabled,
        autoExecute: row.auto_execute,
        lastExecutedAt: row.last_executed_at,
        metrics: {
          executionsLastHour: parseInt(row.executions_last_hour, 10),
          executionsToday: parseInt(row.executions_today, 10),
          totalSuccessful: parseInt(row.total_successful, 10),
          totalFailed: parseInt(row.total_failed, 10),
          gasSpentToday: parseInt(row.gas_spent_today, 10),
          profitToday: parseInt(row.profit_today, 10),
        },
      })),
    });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({
      error: 'Failed to get bot status',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get detailed bot performance metrics
 * GET /api/bot/telemetry/performance
 */
export async function getBotPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { userId, botConfigId, hours = 24 } = req.query;

    if (!userId || !botConfigId) {
      res.status(400).json({ error: 'userId and botConfigId are required' });
      return;
    }

    // Get performance summary
    const result = await query(
      `SELECT 
         COUNT(*) as total_executions,
         COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         ROUND(COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as success_rate,
         AVG(execution_time_ms) as avg_execution_time_ms,
         MAX(execution_time_ms) as max_execution_time_ms,
         MIN(execution_time_ms) as min_execution_time_ms,
         COALESCE(SUM(total_fee_lamports), 0) as total_gas_spent,
         COALESCE(SUM(profit_loss_lamports), 0) as total_profit_loss,
         MAX(started_at) as last_execution
       FROM bot_executions
       WHERE bot_config_id = $1 AND user_id = $2
       AND started_at >= NOW() - INTERVAL '${parseInt(hours as string, 10)} hours'`,
      [botConfigId, userId]
    );

    const perf = result.rows[0];

    // Get hourly breakdown
    const hourlyResult = await query(
      `SELECT 
         DATE_TRUNC('hour', started_at) as hour,
         COUNT(*) as executions,
         COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         COALESCE(SUM(total_fee_lamports), 0) as gas_spent,
         COALESCE(SUM(profit_loss_lamports), 0) as profit_loss
       FROM bot_executions
       WHERE bot_config_id = $1 AND user_id = $2
       AND started_at >= NOW() - INTERVAL '${parseInt(hours as string, 10)} hours'
       GROUP BY DATE_TRUNC('hour', started_at)
       ORDER BY hour DESC`,
      [botConfigId, userId]
    );

    res.json({
      success: true,
      performance: {
        totalExecutions: parseInt(perf.total_executions, 10),
        successful: parseInt(perf.successful, 10),
        failed: parseInt(perf.failed, 10),
        successRate: parseFloat(perf.success_rate) || 0,
        avgExecutionTimeMs: parseFloat(perf.avg_execution_time_ms) || 0,
        maxExecutionTimeMs: parseInt(perf.max_execution_time_ms, 10) || 0,
        minExecutionTimeMs: parseInt(perf.min_execution_time_ms, 10) || 0,
        totalGasSpent: parseInt(perf.total_gas_spent, 10),
        totalProfitLoss: parseInt(perf.total_profit_loss, 10),
        lastExecution: perf.last_execution,
      },
      hourlyBreakdown: hourlyResult.rows.map(row => ({
        hour: row.hour,
        executions: parseInt(row.executions, 10),
        successful: parseInt(row.successful, 10),
        failed: parseInt(row.failed, 10),
        gasSpent: parseInt(row.gas_spent, 10),
        profitLoss: parseInt(row.profit_loss, 10),
      })),
    });
  } catch (error) {
    console.error('Error getting bot performance:', error);
    res.status(500).json({
      error: 'Failed to get bot performance',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get recent errors and failures
 * GET /api/bot/telemetry/errors
 */
export async function getBotErrors(req: Request, res: Response): Promise<void> {
  try {
    const { userId, botConfigId, limit = 50 } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    let sql = `
      SELECT 
        be.id,
        be.bot_config_id,
        bc.bot_name,
        be.execution_type,
        be.status,
        be.error_message,
        be.transaction_hash,
        be.started_at,
        be.completed_at
      FROM bot_executions be
      JOIN bot_configurations bc ON be.bot_config_id = bc.id
      WHERE be.user_id = $1 AND be.status IN ('failed', 'timeout', 'rejected')
    `;
    const params: any[] = [userId];

    if (botConfigId) {
      params.push(botConfigId);
      sql += ` AND be.bot_config_id = $${params.length}`;
    }

    sql += ` ORDER BY be.started_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);

    res.json({
      success: true,
      errors: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error getting bot errors:', error);
    res.status(500).json({
      error: 'Failed to get bot errors',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get nonce and replay protection statistics
 * GET /api/bot/telemetry/nonce-stats
 */
export async function getNonceStats(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const stats = await replayProtection.getNonceStats(userId as string);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting nonce stats:', error);
    res.status(500).json({
      error: 'Failed to get nonce stats',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get audit log summary
 * GET /api/bot/telemetry/audit-stats
 */
export async function getAuditStats(req: Request, res: Response): Promise<void> {
  try {
    const { userId, hours = 24 } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const stats = await auditLogger.getAuditStats(
      userId as string,
      parseInt(hours as string, 10)
    );

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting audit stats:', error);
    res.status(500).json({
      error: 'Failed to get audit stats',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get live dashboard data (combines multiple metrics)
 * GET /api/bot/telemetry/dashboard
 */
export async function getDashboardData(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get active bots
    const botsResult = await query(
      `SELECT 
         id, bot_name, bot_type, enabled, auto_execute
       FROM bot_configurations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get recent executions
    const recentResult = await query(
      `SELECT 
         be.id,
         be.bot_config_id,
         bc.bot_name,
         be.execution_type,
         be.status,
         be.transaction_signature,
         be.profit_loss_lamports,
         be.total_fee_lamports,
         be.execution_time_ms,
         be.started_at,
         be.completed_at
       FROM bot_executions be
       JOIN bot_configurations bc ON be.bot_config_id = bc.id
       WHERE be.user_id = $1
       ORDER BY be.started_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get overall statistics
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total_executions,
         COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         COALESCE(SUM(total_fee_lamports), 0) as total_gas_spent,
         COALESCE(SUM(profit_loss_lamports), 0) as total_profit
       FROM bot_executions
       WHERE user_id = $1
       AND started_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      dashboard: {
        bots: botsResult.rows,
        recentExecutions: recentResult.rows,
        stats: {
          totalExecutions: parseInt(stats.total_executions, 10),
          successful: parseInt(stats.successful, 10),
          failed: parseInt(stats.failed, 10),
          totalGasSpent: parseInt(stats.total_gas_spent, 10),
          totalProfit: parseInt(stats.total_profit, 10),
        },
      },
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Clean up expired nonces (maintenance endpoint)
 * POST /api/bot/telemetry/cleanup-nonces
 */
export async function cleanupNonces(req: Request, res: Response): Promise<void> {
  try {
    const deletedCount = await replayProtection.cleanupExpiredNonces();

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} expired nonces`,
    });
  } catch (error) {
    console.error('Error cleaning up nonces:', error);
    res.status(500).json({
      error: 'Failed to cleanup nonces',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
