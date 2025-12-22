/**
 * Bot Execution API
 * 
 * Endpoints for executing bot transactions with full security and replay protection.
 * All executions are audited and tracked.
 */

import { Request, Response } from 'express';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { query } from '../../db/database.js';
import { sandboxManager } from '../../src/bot/sandbox.js';
import { TransactionBuilder } from '../../src/bot/transactionBuilder.js';
import { ScriptEngine } from '../../src/bot/scriptEngine.js';
import { auditLogger } from '../../src/bot/auditLogger.js';

// Initialize connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

/**
 * Execute a bot transaction
 * POST /api/bot/execute
 */
export async function executeBot(req: Request, res: Response): Promise<void> {
  try {
    const {
      userId,
      botConfigId,
      instructions,
      transactionType,
      walletSignFunction,
      encryptedPrivateKey,
    } = req.body;

    // Validate required fields
    if (!userId || !botConfigId) {
      res.status(400).json({ error: 'userId and botConfigId are required' });
      return;
    }

    // Get bot configuration
    const botConfig = await query(
      `SELECT * FROM bot_configurations WHERE id = $1 AND user_id = $2`,
      [botConfigId, userId]
    );

    if (botConfig.rows.length === 0) {
      res.status(404).json({ error: 'Bot configuration not found' });
      return;
    }

    const bot = botConfig.rows[0];

    // Check if bot is enabled
    if (!bot.enabled) {
      res.status(400).json({ error: 'Bot is not enabled' });
      return;
    }

    // Parse config
    const config = JSON.parse(bot.config);

    // Get or create sandbox for this bot
    const sandbox = await sandboxManager.getSandbox({
      userId,
      botConfigId,
      maxExecutionsPerHour: bot.max_executions_per_hour,
      maxDailySpendLamports: bot.max_daily_spend_lamports,
      maxGasFeeLamports: bot.max_gas_fee,
      connection,
    });

    // Build transaction
    const transactionBuilder = new TransactionBuilder(connection);
    const userWallet = new PublicKey(userId);

    // Parse instructions if they come as JSON
    const parsedInstructions: TransactionInstruction[] = instructions.map((ix: any) => ({
      programId: new PublicKey(ix.programId),
      keys: ix.keys.map((k: any) => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(ix.data, 'base64'),
    }));

    const builtTx = await transactionBuilder.buildTransaction(
      userWallet,
      parsedInstructions,
      {
        type: transactionType || 'custom',
        description: `Bot execution: ${bot.bot_name}`,
      }
    );

    // Execute in sandbox
    const result = await sandbox.execute(
      builtTx,
      {
        mode: bot.signing_mode,
        userWallet,
      },
      walletSignFunction,
      encryptedPrivateKey
    );

    res.json({
      success: result.success,
      signature: result.signature,
      executionTimeMs: result.executionTimeMs,
      gasSpentLamports: result.gasSpentLamports,
      error: result.error,
    });
  } catch (error) {
    console.error('Error executing bot:', error);
    res.status(500).json({
      error: 'Failed to execute bot',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Execute a bot script
 * POST /api/bot/execute/script
 */
export async function executeScript(req: Request, res: Response): Promise<void> {
  try {
    const {
      userId,
      botConfigId,
      scriptId,
    } = req.body;

    // Validate required fields
    if (!userId || !botConfigId || !scriptId) {
      res.status(400).json({
        error: 'userId, botConfigId, and scriptId are required',
      });
      return;
    }

    // Get bot configuration
    const botConfig = await query(
      `SELECT * FROM bot_configurations WHERE id = $1 AND user_id = $2`,
      [botConfigId, userId]
    );

    if (botConfig.rows.length === 0) {
      res.status(404).json({ error: 'Bot configuration not found' });
      return;
    }

    const bot = botConfig.rows[0];

    // Check if bot is enabled
    if (!bot.enabled) {
      res.status(400).json({ error: 'Bot is not enabled' });
      return;
    }

    // Get script
    const scriptResult = await query(
      `SELECT * FROM bot_scripts WHERE id = $1 AND bot_config_id = $2 AND enabled = true`,
      [scriptId, botConfigId]
    );

    if (scriptResult.rows.length === 0) {
      res.status(404).json({ error: 'Script not found or disabled' });
      return;
    }

    const script = scriptResult.rows[0];

    // Get user balance
    const userWallet = new PublicKey(userId);
    const balance = await connection.getBalance(userWallet);

    // Parse bot config
    const config = JSON.parse(bot.config);

    // Execute script
    const scriptEngine = new ScriptEngine(connection);
    const scriptResult2 = await scriptEngine.executeScript(
      {
        id: script.id,
        name: script.script_name,
        code: script.script_code,
        hash: script.script_hash,
        triggerType: script.trigger_type,
        triggerConfig: script.trigger_config,
      },
      {
        userWallet,
        botConfigId,
        connection,
        balanceLamports: balance,
        params: config,
      }
    );

    if (!scriptResult2.success) {
      res.status(400).json({
        error: 'Script execution failed',
        details: scriptResult2.error,
        logs: scriptResult2.logs,
      });
      return;
    }

    // If script returned instructions, execute them
    if (scriptResult2.instructions && scriptResult2.instructions.length > 0) {
      // Get sandbox
      const sandbox = await sandboxManager.getSandbox({
        userId,
        botConfigId,
        maxExecutionsPerHour: bot.max_executions_per_hour,
        maxDailySpendLamports: bot.max_daily_spend_lamports,
        maxGasFeeLamports: bot.max_gas_fee,
        connection,
      });

      // Build transaction
      const transactionBuilder = new TransactionBuilder(connection);
      const builtTx = await transactionBuilder.buildTransaction(
        userWallet,
        scriptResult2.instructions,
        scriptResult2.metadata || {
          type: 'script',
          description: `Script: ${script.script_name}`,
        }
      );

      // Execute in sandbox
      const execResult = await sandbox.execute(
        builtTx,
        {
          mode: bot.signing_mode,
          userWallet,
        }
      );

      res.json({
        success: execResult.success,
        signature: execResult.signature,
        executionTimeMs: execResult.executionTimeMs,
        gasSpentLamports: execResult.gasSpentLamports,
        logs: scriptResult2.logs,
        error: execResult.error,
      });
    } else {
      // Script ran but didn't produce transactions
      res.json({
        success: true,
        message: 'Script executed successfully without transactions',
        logs: scriptResult2.logs,
      });
    }
  } catch (error) {
    console.error('Error executing script:', error);
    res.status(500).json({
      error: 'Failed to execute script',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get execution history
 * GET /api/bot/execute/history
 */
export async function getExecutionHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId, botConfigId, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    let sql = `
      SELECT 
        id, bot_config_id, execution_type, transaction_signature,
        status, error_message, profit_loss_lamports, profit_loss_usd,
        priority_fee_lamports, total_fee_lamports, execution_time_ms,
        started_at, completed_at
      FROM bot_executions
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (botConfigId) {
      params.push(botConfigId);
      sql += ` AND bot_config_id = $${params.length}`;
    }

    sql += ` ORDER BY started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM bot_executions WHERE user_id = $1';
    const countParams: any[] = [userId];
    if (botConfigId) {
      countParams.push(botConfigId);
      countSql += ' AND bot_config_id = $2';
    }
    const countResult = await query(countSql, countParams);

    res.json({
      success: true,
      executions: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error getting execution history:', error);
    res.status(500).json({
      error: 'Failed to get execution history',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Cancel/stop a bot execution
 * POST /api/bot/execute/stop
 */
export async function stopBot(req: Request, res: Response): Promise<void> {
  try {
    const { userId, botConfigId } = req.body;

    if (!userId || !botConfigId) {
      res.status(400).json({ error: 'userId and botConfigId are required' });
      return;
    }

    // Verify ownership
    const ownerCheck = await query(
      'SELECT id FROM bot_configurations WHERE id = $1 AND user_id = $2',
      [botConfigId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Bot not found or unauthorized' });
      return;
    }

    // Destroy sandbox if exists
    await sandboxManager.destroySandbox(userId, botConfigId);

    // Log stop
    await auditLogger.logConfigChange(
      userId,
      botConfigId,
      'bot_stopped',
      {},
      req.ip
    );

    res.json({
      success: true,
      message: 'Bot stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping bot:', error);
    res.status(500).json({
      error: 'Failed to stop bot',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
