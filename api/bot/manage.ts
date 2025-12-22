/**
 * Bot Management API
 * 
 * Endpoints for creating, updating, and managing bot configurations.
 * All endpoints require authentication and validate user ownership.
 */

import { Request, Response } from 'express';
import { query } from '../../db/database.js';
import { PublicKey } from '@solana/web3.js';
import { auditLogger } from '../../src/bot/auditLogger.js';

/**
 * Create a new bot configuration
 * POST /api/bot/manage/create
 */
export async function createBot(req: Request, res: Response): Promise<void> {
  try {
    const {
      userId,
      botName,
      botType,
      config,
      maxGasFee = 10000000, // 0.01 SOL default
      maxSlippageBps = 100,
      autoExecute = false,
      signingMode = 'client',
      maxExecutionsPerHour = 100,
      maxDailySpendLamports = 1000000000, // 1 SOL default
      encryptedPrivateKey,
    } = req.body;

    // Validate required fields
    if (!userId || !botName || !botType || !config) {
      res.status(400).json({
        error: 'Missing required fields: userId, botName, botType, config',
      });
      return;
    }

    // Validate wallet address
    try {
      new PublicKey(userId);
    } catch {
      res.status(400).json({ error: 'Invalid wallet address' });
      return;
    }

    // Validate bot type
    const validTypes = ['arbitrage', 'sniper', 'dca', 'grid', 'custom'];
    if (!validTypes.includes(botType)) {
      res.status(400).json({
        error: `Invalid bot type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // Validate signing mode
    const validSigningModes = ['client', 'server', 'enclave'];
    if (!validSigningModes.includes(signingMode)) {
      res.status(400).json({
        error: `Invalid signing mode. Must be one of: ${validSigningModes.join(', ')}`,
      });
      return;
    }

    // Insert bot configuration
    const result = await query(
      `INSERT INTO bot_configurations (
        user_id, bot_name, bot_type, enabled, config,
        max_gas_fee, max_slippage_bps, auto_execute, signing_mode,
        max_executions_per_hour, max_daily_spend_lamports,
        wallet_private_key_encrypted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at`,
      [
        userId,
        botName,
        botType,
        false, // Start disabled for safety
        JSON.stringify(config),
        maxGasFee,
        maxSlippageBps,
        autoExecute,
        signingMode,
        maxExecutionsPerHour,
        maxDailySpendLamports,
        encryptedPrivateKey || null,
      ]
    );

    const botId = result.rows[0].id;

    // Log creation
    await auditLogger.logConfigChange(
      userId,
      botId,
      'bot_created',
      { botName, botType, signingMode },
      req.ip
    );

    res.status(201).json({
      success: true,
      botId,
      message: 'Bot configuration created successfully',
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({
      error: 'Failed to create bot configuration',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get bot configuration
 * GET /api/bot/manage/:botId
 */
export async function getBot(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await query(
      `SELECT 
        id, user_id, bot_name, bot_type, enabled, config,
        max_gas_fee, max_slippage_bps, auto_execute, signing_mode,
        max_executions_per_hour, max_daily_spend_lamports,
        created_at, updated_at, last_executed_at
       FROM bot_configurations
       WHERE id = $1 AND user_id = $2`,
      [botId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const bot = result.rows[0];
    
    // Parse config JSON
    bot.config = JSON.parse(bot.config);

    res.json({
      success: true,
      bot,
    });
  } catch (error) {
    console.error('Error getting bot:', error);
    res.status(500).json({
      error: 'Failed to get bot configuration',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * List all bots for a user
 * GET /api/bot/manage/list
 */
export async function listBots(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await query(
      `SELECT 
        id, bot_name, bot_type, enabled, auto_execute,
        max_gas_fee, max_slippage_bps, signing_mode,
        created_at, updated_at, last_executed_at
       FROM bot_configurations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      bots: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error listing bots:', error);
    res.status(500).json({
      error: 'Failed to list bots',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update bot configuration
 * PUT /api/bot/manage/:botId
 */
export async function updateBot(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const {
      userId,
      enabled,
      config,
      maxGasFee,
      maxSlippageBps,
      autoExecute,
      maxExecutionsPerHour,
      maxDailySpendLamports,
    } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Verify ownership
    const ownerCheck = await query(
      'SELECT id FROM bot_configurations WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Bot not found or unauthorized' });
      return;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(enabled);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(config));
    }
    if (maxGasFee !== undefined) {
      updates.push(`max_gas_fee = $${paramCount++}`);
      values.push(maxGasFee);
    }
    if (maxSlippageBps !== undefined) {
      updates.push(`max_slippage_bps = $${paramCount++}`);
      values.push(maxSlippageBps);
    }
    if (autoExecute !== undefined) {
      updates.push(`auto_execute = $${paramCount++}`);
      values.push(autoExecute);
    }
    if (maxExecutionsPerHour !== undefined) {
      updates.push(`max_executions_per_hour = $${paramCount++}`);
      values.push(maxExecutionsPerHour);
    }
    if (maxDailySpendLamports !== undefined) {
      updates.push(`max_daily_spend_lamports = $${paramCount++}`);
      values.push(maxDailySpendLamports);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(botId, userId);

    const result = await query(
      `UPDATE bot_configurations 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING updated_at`,
      values
    );

    // Log update
    await auditLogger.logConfigChange(
      userId,
      botId,
      'bot_updated',
      req.body,
      req.ip
    );

    res.json({
      success: true,
      message: 'Bot configuration updated successfully',
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({
      error: 'Failed to update bot configuration',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete bot configuration
 * DELETE /api/bot/manage/:botId
 */
export async function deleteBot(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Verify ownership
    const ownerCheck = await query(
      'SELECT id, bot_name FROM bot_configurations WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Bot not found or unauthorized' });
      return;
    }

    // Delete bot (cascades to executions, scripts, etc.)
    await query(
      'DELETE FROM bot_configurations WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    // Log deletion
    await auditLogger.logConfigChange(
      userId as string,
      botId,
      'bot_deleted',
      { botName: ownerCheck.rows[0].bot_name },
      req.ip
    );

    res.json({
      success: true,
      message: 'Bot configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({
      error: 'Failed to delete bot configuration',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
