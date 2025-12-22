/**
 * Secure Sandbox Execution Environment
 * 
 * Provides isolated execution context for each user's bots.
 * CRITICAL SECURITY: No shared state or keys between users.
 * 
 * Each sandbox has:
 * - Isolated execution context
 * - Per-user rate limiting
 * - Per-user spending limits
 * - Isolated wallet/signer management
 * - Resource quotas
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TransactionBuilder, BuiltTransaction } from './transactionBuilder.js';
import { SigningService, SigningConfig, SignedTransaction } from './signingService.js';
import { ReplayProtection, TransactionRecord } from './replayProtection.js';
import { AuditLogger } from './auditLogger.js';
import { query } from '../../db/database.js';

export interface SandboxConfig {
  /** User wallet address */
  userId: string;
  /** Bot configuration ID */
  botConfigId: string;
  /** Maximum executions per hour */
  maxExecutionsPerHour: number;
  /** Maximum daily spend in lamports */
  maxDailySpendLamports: number;
  /** Maximum gas fee per transaction in lamports */
  maxGasFeeLamports: number;
  /** Connection to Solana network */
  connection: Connection;
}

export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Transaction signature (if successful) */
  signature?: string;
  /** Error message (if failed) */
  error?: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Profit/loss in lamports */
  profitLossLamports?: number;
  /** Gas spent in lamports */
  gasSpentLamports: number;
}

export interface SandboxStats {
  /** Total executions today */
  executionsToday: number;
  /** Total spend today in lamports */
  spendTodayLamports: number;
  /** Executions in the last hour */
  executionsLastHour: number;
  /** Available executions remaining this hour */
  availableExecutionsThisHour: number;
  /** Available spend remaining today in lamports */
  availableSpendToday: number;
}

export class Sandbox {
  private config: SandboxConfig;
  private transactionBuilder: TransactionBuilder;
  private signingService: SigningService;
  private replayProtection: ReplayProtection;
  private auditLogger: AuditLogger;

  // Per-sandbox rate limiting state
  private executionCount: number = 0;
  private executionWindowStart: number = Date.now();
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  constructor(config: SandboxConfig) {
    this.config = config;
    
    // Initialize isolated services for this sandbox
    this.transactionBuilder = new TransactionBuilder(config.connection);
    this.auditLogger = new AuditLogger();
    this.signingService = new SigningService(config.connection, this.auditLogger);
    this.replayProtection = new ReplayProtection();

    // Log sandbox creation
    this.auditLogger.logAction({
      userId: config.userId,
      botConfigId: config.botConfigId,
      action: 'sandbox_created',
      actionType: 'security',
      severity: 'info',
      metadata: {
        maxExecutionsPerHour: config.maxExecutionsPerHour,
        maxDailySpendLamports: config.maxDailySpendLamports,
      },
    });
  }

  /**
   * Execute a bot transaction within the sandbox
   * 
   * This is the main entry point for bot execution.
   * All security checks and rate limiting are enforced here.
   */
  async execute(
    builtTx: BuiltTransaction,
    signingConfig: SigningConfig,
    walletSignFunction?: any,
    encryptedPrivateKey?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Security Check 1: Verify user matches sandbox
      if (signingConfig.userWallet.toBase58() !== this.config.userId) {
        throw new Error('User mismatch: transaction user does not match sandbox user');
      }

      // Security Check 2: Rate limiting
      await this.enforceRateLimit();

      // Security Check 3: Spending limits
      await this.enforceSpendingLimit(builtTx.priorityFeeLamports);

      // Security Check 4: Replay protection
      const replayCheck = await this.replayProtection.checkTransaction({
        userId: this.config.userId,
        transactionHash: builtTx.transactionHash,
        nonce: builtTx.nonce,
        timestamp: builtTx.timestamp,
      });

      if (!replayCheck.safe) {
        throw new Error(`Replay protection failed: ${replayCheck.reason}`);
      }

      // Record nonce before execution
      await this.replayProtection.recordNonce(
        this.config.userId,
        builtTx.nonce,
        builtTx.transactionHash,
        60000 // 1 minute expiry
      );

      // Create execution record
      const executionId = await this.createExecutionRecord(builtTx);

      // Log execution start
      await this.auditLogger.logExecutionStart(
        this.config.userId,
        this.config.botConfigId,
        executionId,
        builtTx.metadata.type,
        builtTx.transactionHash
      );

      // Sign the transaction
      const signedTx = await this.signingService.signTransaction(
        builtTx,
        signingConfig,
        walletSignFunction,
        encryptedPrivateKey
      );

      // Send the transaction
      const signature = await this.signingService.sendSignedTransaction(signedTx);

      // Wait for confirmation
      const confirmed = await this.signingService.confirmTransaction(signature, 'confirmed');

      if (!confirmed) {
        throw new Error('Transaction failed to confirm');
      }

      // Mark as executed in replay protection
      await this.replayProtection.markExecuted(
        this.config.userId,
        builtTx.transactionHash,
        signature,
        builtTx.nonce
      );

      // Update execution record
      const executionTimeMs = Date.now() - startTime;
      await this.updateExecutionRecord(
        executionId,
        'success',
        signature,
        executionTimeMs,
        builtTx.priorityFeeLamports
      );

      // Log execution completion
      await this.auditLogger.logExecutionComplete(
        this.config.userId,
        this.config.botConfigId,
        executionId,
        signature,
        0, // TODO: Calculate actual profit/loss
        executionTimeMs
      );

      // Update rate limit counter
      this.executionCount++;

      return {
        success: true,
        signature,
        executionTimeMs,
        gasSpentLamports: builtTx.priorityFeeLamports,
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log execution failure
      await this.auditLogger.logAction({
        userId: this.config.userId,
        botConfigId: this.config.botConfigId,
        action: 'bot_execution_failed',
        actionType: 'error',
        severity: 'error',
        metadata: {
          error: errorMessage,
          transactionHash: builtTx.transactionHash,
        },
      });

      return {
        success: false,
        error: errorMessage,
        executionTimeMs,
        gasSpentLamports: 0,
      };
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    // Reset window if expired
    if (Date.now() - this.executionWindowStart > this.RATE_LIMIT_WINDOW_MS) {
      this.executionCount = 0;
      this.executionWindowStart = Date.now();
    }

    // Check if limit exceeded
    if (this.executionCount >= this.config.maxExecutionsPerHour) {
      await this.auditLogger.logRateLimitExceeded(
        this.config.userId,
        this.config.botConfigId,
        this.config.maxExecutionsPerHour,
        this.executionCount
      );
      throw new Error(`Rate limit exceeded: ${this.executionCount}/${this.config.maxExecutionsPerHour} per hour`);
    }
  }

  /**
   * Enforce spending limits
   */
  private async enforceSpendingLimit(gasFeeLamports: number): Promise<void> {
    // Get today's spending
    const stats = await this.getStats();
    
    if (stats.spendTodayLamports + gasFeeLamports > this.config.maxDailySpendLamports) {
      await this.auditLogger.logAction({
        userId: this.config.userId,
        botConfigId: this.config.botConfigId,
        action: 'spending_limit_exceeded',
        actionType: 'security',
        severity: 'warning',
        metadata: {
          spendToday: stats.spendTodayLamports,
          attemptedSpend: gasFeeLamports,
          limit: this.config.maxDailySpendLamports,
        },
      });
      throw new Error(`Daily spending limit exceeded: ${stats.spendTodayLamports + gasFeeLamports} / ${this.config.maxDailySpendLamports} lamports`);
    }

    // Check per-transaction gas limit
    if (gasFeeLamports > this.config.maxGasFeeLamports) {
      throw new Error(`Gas fee ${gasFeeLamports} exceeds maximum ${this.config.maxGasFeeLamports} lamports`);
    }
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(builtTx: BuiltTransaction): Promise<string> {
    const result = await query(
      `INSERT INTO bot_executions (
        bot_config_id, user_id, execution_type, transaction_hash,
        nonce, timestamp_ms, status, instructions_count,
        priority_fee_lamports, estimated_compute_units
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        this.config.botConfigId,
        this.config.userId,
        builtTx.metadata.type,
        builtTx.transactionHash,
        builtTx.nonce.toString(),
        builtTx.timestamp,
        'pending',
        builtTx.metadata.instructions.length,
        builtTx.priorityFeeLamports,
        builtTx.estimatedComputeUnits,
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Update execution record after completion/failure
   */
  private async updateExecutionRecord(
    executionId: string,
    status: 'success' | 'failed',
    signature: string | null,
    executionTimeMs: number,
    gasSpentLamports: number
  ): Promise<void> {
    await query(
      `UPDATE bot_executions
       SET status = $1, transaction_signature = $2, execution_time_ms = $3,
           total_fee_lamports = $4, completed_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [status, signature, executionTimeMs, gasSpentLamports, executionId]
    );
  }

  /**
   * Get sandbox statistics
   */
  async getStats(): Promise<SandboxStats> {
    const result = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE) as executions_today,
         COALESCE(SUM(total_fee_lamports) FILTER (WHERE started_at >= CURRENT_DATE), 0) as spend_today,
         COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '1 hour') as executions_last_hour
       FROM bot_executions
       WHERE bot_config_id = $1 AND user_id = $2`,
      [this.config.botConfigId, this.config.userId]
    );

    const row = result.rows[0];
    const executionsToday = parseInt(row.executions_today, 10);
    const spendTodayLamports = parseInt(row.spend_today, 10);
    const executionsLastHour = parseInt(row.executions_last_hour, 10);

    return {
      executionsToday,
      spendTodayLamports,
      executionsLastHour,
      availableExecutionsThisHour: Math.max(0, this.config.maxExecutionsPerHour - executionsLastHour),
      availableSpendToday: Math.max(0, this.config.maxDailySpendLamports - spendTodayLamports),
    };
  }

  /**
   * Destroy the sandbox
   * 
   * This should be called when the bot is stopped or the user session ends.
   */
  async destroy(): Promise<void> {
    await this.auditLogger.logAction({
      userId: this.config.userId,
      botConfigId: this.config.botConfigId,
      action: 'sandbox_destroyed',
      actionType: 'security',
      severity: 'info',
      metadata: {
        totalExecutions: this.executionCount,
      },
    });

    // Clear any sensitive data from memory
    this.executionCount = 0;
  }
}

/**
 * Sandbox Manager
 * 
 * Manages lifecycle of sandboxes, ensuring strict isolation between users.
 */
export class SandboxManager {
  private sandboxes: Map<string, Sandbox> = new Map();
  private auditLogger: AuditLogger = new AuditLogger();

  /**
   * Create or get a sandbox for a user's bot
   */
  async getSandbox(config: SandboxConfig): Promise<Sandbox> {
    const key = `${config.userId}:${config.botConfigId}`;

    // Check if sandbox already exists
    if (this.sandboxes.has(key)) {
      return this.sandboxes.get(key)!;
    }

    // Create new sandbox
    const sandbox = new Sandbox(config);
    this.sandboxes.set(key, sandbox);

    // Log sandbox creation
    await this.auditLogger.logAction({
      userId: config.userId,
      botConfigId: config.botConfigId,
      action: 'sandbox_manager_created_sandbox',
      actionType: 'security',
      severity: 'info',
      metadata: {
        totalSandboxes: this.sandboxes.size,
      },
    });

    return sandbox;
  }

  /**
   * Destroy a sandbox
   */
  async destroySandbox(userId: string, botConfigId: string): Promise<void> {
    const key = `${userId}:${botConfigId}`;
    const sandbox = this.sandboxes.get(key);

    if (sandbox) {
      await sandbox.destroy();
      this.sandboxes.delete(key);

      await this.auditLogger.logAction({
        userId,
        botConfigId,
        action: 'sandbox_manager_destroyed_sandbox',
        actionType: 'security',
        severity: 'info',
        metadata: {
          totalSandboxes: this.sandboxes.size,
        },
      });
    }
  }

  /**
   * Get all active sandboxes for a user
   */
  getUserSandboxes(userId: string): Sandbox[] {
    const userSandboxes: Sandbox[] = [];
    
    for (const [key, sandbox] of this.sandboxes.entries()) {
      if (key.startsWith(userId + ':')) {
        userSandboxes.push(sandbox);
      }
    }

    return userSandboxes;
  }

  /**
   * Destroy all sandboxes for a user
   */
  async destroyUserSandboxes(userId: string): Promise<void> {
    const keys = Array.from(this.sandboxes.keys()).filter(key => key.startsWith(userId + ':'));
    
    for (const key of keys) {
      const [_, botConfigId] = key.split(':');
      await this.destroySandbox(userId, botConfigId);
    }
  }

  /**
   * Get total number of active sandboxes
   */
  getTotalSandboxes(): number {
    return this.sandboxes.size;
  }
}

// Export singleton instance
export const sandboxManager = new SandboxManager();
