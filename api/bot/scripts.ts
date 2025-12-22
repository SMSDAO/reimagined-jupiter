/**
 * Bot Script Management API
 * 
 * Endpoints for managing bot scripts: create, update, validate, and delete.
 */

import { Request, Response } from 'express';
import { query } from '../../db/database.js';
import { Connection } from '@solana/web3.js';
import { ScriptEngine } from '../../src/bot/scriptEngine.js';
import { auditLogger } from '../../src/bot/auditLogger.js';

// Initialize connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

/**
 * Create a new bot script
 * POST /api/bot/scripts/create
 */
export async function createScript(req: Request, res: Response): Promise<void> {
  try {
    const {
      userId,
      botConfigId,
      scriptName,
      scriptCode,
      triggerType = 'manual',
      triggerConfig = {},
    } = req.body;

    // Validate required fields
    if (!userId || !botConfigId || !scriptName || !scriptCode) {
      res.status(400).json({
        error: 'Missing required fields: userId, botConfigId, scriptName, scriptCode',
      });
      return;
    }

    // Verify bot ownership
    const ownerCheck = await query(
      'SELECT id FROM bot_configurations WHERE id = $1 AND user_id = $2',
      [botConfigId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Bot not found or unauthorized' });
      return;
    }

    // Validate script
    const scriptEngine = new ScriptEngine(connection);
    const validation = await scriptEngine.validateScript(scriptCode);

    if (!validation.valid) {
      res.status(400).json({
        error: 'Script validation failed',
        errors: validation.errors,
      });
      return;
    }

    // Compute script hash
    const scriptHash = scriptEngine.computeScriptHash(scriptCode);

    // Insert script
    const result = await query(
      `INSERT INTO bot_scripts (
        bot_config_id, user_id, script_name, script_version,
        script_code, script_hash, enabled, trigger_type, trigger_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at`,
      [
        botConfigId,
        userId,
        scriptName,
        '1.0.0',
        scriptCode,
        scriptHash,
        true,
        triggerType,
        JSON.stringify(triggerConfig),
      ]
    );

    const scriptId = result.rows[0].id;

    // Log creation
    await auditLogger.logAction({
      userId,
      botConfigId,
      action: 'script_created',
      actionType: 'config',
      severity: 'info',
      metadata: {
        scriptId,
        scriptName,
        triggerType,
      },
    });

    res.status(201).json({
      success: true,
      scriptId,
      message: 'Script created successfully',
      hash: scriptHash,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error creating script:', error);
    res.status(500).json({
      error: 'Failed to create script',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get a bot script
 * GET /api/bot/scripts/:scriptId
 */
export async function getScript(req: Request, res: Response): Promise<void> {
  try {
    const { scriptId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await query(
      `SELECT * FROM bot_scripts WHERE id = $1 AND user_id = $2`,
      [scriptId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    const script = result.rows[0];
    script.trigger_config = JSON.parse(script.trigger_config || '{}');

    res.json({
      success: true,
      script,
    });
  } catch (error) {
    console.error('Error getting script:', error);
    res.status(500).json({
      error: 'Failed to get script',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * List all scripts for a bot
 * GET /api/bot/scripts/list
 */
export async function listScripts(req: Request, res: Response): Promise<void> {
  try {
    const { userId, botConfigId } = req.query;

    if (!userId || !botConfigId) {
      res.status(400).json({ error: 'userId and botConfigId are required' });
      return;
    }

    const result = await query(
      `SELECT 
        id, script_name, script_version, enabled, trigger_type,
        created_at, updated_at
       FROM bot_scripts
       WHERE bot_config_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [botConfigId, userId]
    );

    res.json({
      success: true,
      scripts: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error listing scripts:', error);
    res.status(500).json({
      error: 'Failed to list scripts',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update a bot script
 * PUT /api/bot/scripts/:scriptId
 */
export async function updateScript(req: Request, res: Response): Promise<void> {
  try {
    const { scriptId } = req.params;
    const {
      userId,
      scriptCode,
      enabled,
      triggerType,
      triggerConfig,
    } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Verify ownership
    const ownerCheck = await query(
      'SELECT bot_config_id FROM bot_scripts WHERE id = $1 AND user_id = $2',
      [scriptId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Script not found or unauthorized' });
      return;
    }

    const botConfigId = ownerCheck.rows[0].bot_config_id;

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (scriptCode !== undefined) {
      // Validate new code
      const scriptEngine = new ScriptEngine(connection);
      const validation = await scriptEngine.validateScript(scriptCode);

      if (!validation.valid) {
        res.status(400).json({
          error: 'Script validation failed',
          errors: validation.errors,
        });
        return;
      }

      const scriptHash = scriptEngine.computeScriptHash(scriptCode);

      updates.push(`script_code = $${paramCount++}`);
      values.push(scriptCode);
      updates.push(`script_hash = $${paramCount++}`);
      values.push(scriptHash);
    }

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(enabled);
    }

    if (triggerType !== undefined) {
      updates.push(`trigger_type = $${paramCount++}`);
      values.push(triggerType);
    }

    if (triggerConfig !== undefined) {
      updates.push(`trigger_config = $${paramCount++}`);
      values.push(JSON.stringify(triggerConfig));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(scriptId, userId);

    const result = await query(
      `UPDATE bot_scripts 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING updated_at`,
      values
    );

    // Log update
    await auditLogger.logAction({
      userId,
      botConfigId,
      action: 'script_updated',
      actionType: 'config',
      severity: 'info',
      metadata: {
        scriptId,
        updates: Object.keys(req.body),
      },
    });

    res.json({
      success: true,
      message: 'Script updated successfully',
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error updating script:', error);
    res.status(500).json({
      error: 'Failed to update script',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete a bot script
 * DELETE /api/bot/scripts/:scriptId
 */
export async function deleteScript(req: Request, res: Response): Promise<void> {
  try {
    const { scriptId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Verify ownership
    const ownerCheck = await query(
      'SELECT bot_config_id, script_name FROM bot_scripts WHERE id = $1 AND user_id = $2',
      [scriptId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Script not found or unauthorized' });
      return;
    }

    const { bot_config_id, script_name } = ownerCheck.rows[0];

    // Delete script
    await query(
      'DELETE FROM bot_scripts WHERE id = $1 AND user_id = $2',
      [scriptId, userId]
    );

    // Log deletion
    await auditLogger.logAction({
      userId: userId as string,
      botConfigId: bot_config_id,
      action: 'script_deleted',
      actionType: 'config',
      severity: 'info',
      metadata: {
        scriptId,
        scriptName: script_name,
      },
    });

    res.json({
      success: true,
      message: 'Script deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({
      error: 'Failed to delete script',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Validate a script without saving it
 * POST /api/bot/scripts/validate
 */
export async function validateScript(req: Request, res: Response): Promise<void> {
  try {
    const { scriptCode } = req.body;

    if (!scriptCode) {
      res.status(400).json({ error: 'scriptCode is required' });
      return;
    }

    const scriptEngine = new ScriptEngine(connection);
    const validation = await scriptEngine.validateScript(scriptCode);

    res.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors,
    });
  } catch (error) {
    console.error('Error validating script:', error);
    res.status(500).json({
      error: 'Failed to validate script',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get script templates
 * GET /api/bot/scripts/templates
 */
export async function getScriptTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = {
      arbitrage: {
        name: 'Arbitrage Bot',
        description: 'Simple arbitrage bot that monitors price differences across DEXs',
        code: ScriptEngine.getArbitrageTemplate(),
      },
      dca: {
        name: 'DCA (Dollar Cost Average)',
        description: 'Regularly buy a fixed amount of a token',
        code: ScriptEngine.getDCATemplate(),
      },
      grid: {
        name: 'Grid Trading',
        description: 'Place buy and sell orders at regular intervals',
        code: ScriptEngine.getGridTemplate(),
      },
    };

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      error: 'Failed to get script templates',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
