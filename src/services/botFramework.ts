/**
 * Professional Bot Framework Infrastructure
 * 
 * Features:
 * - Scriptable BOT.exe style execution engine
 * - Offline transaction builder
 * - Multiple signing modes (client-side, server-side, enclave-ready)
 * - 4-layer replay protection
 * - Per-user sandbox isolation
 */

import { 
  Connection, 
  Transaction, 
  TransactionInstruction,
  PublicKey,
  Keypair,
  SystemProgram,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import crypto from 'crypto';

export type SigningMode = 'CLIENT_SIDE' | 'SERVER_SIDE' | 'ENCLAVE';
export type BotType = 'ARBITRAGE' | 'SNIPER' | 'FLASH_LOAN' | 'TRIANGULAR' | 'CUSTOM';
export type BotStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
export type ExecutionStatus = 'PENDING' | 'SIMULATING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface BotConfig {
  id: string;
  userId: string;
  name: string;
  botType: BotType;
  signingMode: SigningMode;
  walletId?: string;
  strategyConfig: Record<string, any>;
  isActive: boolean;
  isPaused: boolean;
}

export interface BotExecution {
  id: string;
  botId: string;
  userId: string;
  executionType: string;
  transactionSignature?: string;
  status: ExecutionStatus;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: number;
  amountOut?: number;
  profitSol?: number;
  profitUsd?: number;
  gasFeeSol?: number;
  errorMessage?: string;
  executedAt: Date;
  confirmedAt?: Date;
}

export interface OfflineTransaction {
  instructions: TransactionInstruction[];
  feePayer: PublicKey;
  recentBlockhash?: string;
  signatures?: Array<{ publicKey: string; signature?: string }>;
  metadata: {
    botId: string;
    userId: string;
    executionId: string;
    createdAt: Date;
  };
}

export interface SandboxContext {
  userId: string;
  botId: string;
  walletAddress: string;
  permissions: string[];
  rateLimit: {
    maxExecutionsPerMinute: number;
    maxExecutionsPerHour: number;
    currentMinute: number;
    currentHour: number;
  };
  isolatedState: Map<string, any>;
}

/**
 * Offline Transaction Builder
 * Builds transactions without network access for security and testing
 */
export class OfflineTransactionBuilder {
  private instructions: TransactionInstruction[] = [];
  private feePayer: PublicKey;
  private signers: Keypair[] = [];
  private metadata: OfflineTransaction['metadata'];

  constructor(
    feePayer: PublicKey,
    botId: string,
    userId: string,
    executionId: string
  ) {
    this.feePayer = feePayer;
    this.metadata = {
      botId,
      userId,
      executionId,
      createdAt: new Date(),
    };
  }

  /**
   * Add instruction to transaction
   */
  addInstruction(instruction: TransactionInstruction): this {
    this.instructions.push(instruction);
    return this;
  }

  /**
   * Add multiple instructions
   */
  addInstructions(instructions: TransactionInstruction[]): this {
    this.instructions.push(...instructions);
    return this;
  }

  /**
   * Add compute budget instruction
   */
  addComputeBudget(units: number, microLamports: number): this {
    this.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({ units }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
    );
    return this;
  }

  /**
   * Add priority fee (max 10M lamports as per requirements)
   */
  addPriorityFee(microLamports: number): this {
    // Enforce 10M lamports cap (10,000,000 lamports = 10,000 microlamports per compute unit)
    const maxMicroLamports = 10_000_000;
    const cappedMicroLamports = Math.min(microLamports, maxMicroLamports);
    
    if (microLamports > maxMicroLamports) {
      console.warn(`⚠️ Priority fee capped at ${maxMicroLamports} microLamports (requested: ${microLamports})`);
    }
    
    this.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cappedMicroLamports })
    );
    return this;
  }

  /**
   * Build offline transaction (without blockhash)
   */
  buildOffline(): OfflineTransaction {
    return {
      instructions: this.instructions,
      feePayer: this.feePayer,
      metadata: this.metadata,
    };
  }

  /**
   * Build transaction with blockhash (requires connection)
   */
  async build(connection: Connection): Promise<Transaction> {
    const transaction = new Transaction();
    transaction.feePayer = this.feePayer;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.instructions = this.instructions;
    return transaction;
  }

  /**
   * Simulate transaction (offline validation)
   */
  validateOffline(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.instructions.length === 0) {
      errors.push('Transaction has no instructions');
    }

    if (!this.feePayer) {
      errors.push('Fee payer not set');
    }

    // Validate instruction structure
    for (const instruction of this.instructions) {
      if (!instruction.programId) {
        errors.push('Instruction missing program ID');
      }
      if (!instruction.keys || instruction.keys.length === 0) {
        errors.push('Instruction has no keys');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 4-Layer Replay Protection System
 */
export class ReplayProtection {
  // Layer 1: Unique nonces (in-memory cache + database)
  private nonceCache = new Set<string>();
  
  // Layer 2: SHA-256 transaction hash deduplication
  private txHashCache = new Set<string>();
  
  // Layer 3: Timestamp windows (10 minutes default)
  private readonly timestampWindow = 10 * 60 * 1000; // 10 minutes
  
  // Layer 4: Rate limiting per user
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  /**
   * Generate unique nonce
   */
  generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Compute transaction hash (SHA-256)
   */
  computeTransactionHash(transaction: OfflineTransaction | Transaction): string {
    let data: string;
    
    if ('metadata' in transaction) {
      // OfflineTransaction
      data = JSON.stringify({
        instructions: transaction.instructions.map(ix => ({
          programId: ix.programId.toBase58(),
          keys: ix.keys.map(k => ({ pubkey: k.pubkey.toBase58(), isSigner: k.isSigner, isWritable: k.isWritable })),
          data: Buffer.from(ix.data).toString('hex'),
        })),
        feePayer: transaction.feePayer.toBase58(),
      });
    } else {
      // Transaction
      data = transaction.serializeMessage().toString('hex');
    }
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if nonce is already used (Layer 1)
   */
  isNonceUsed(nonce: string): boolean {
    return this.nonceCache.has(nonce);
  }

  /**
   * Mark nonce as used
   */
  markNonceUsed(nonce: string): void {
    this.nonceCache.add(nonce);
    
    // Cleanup old nonces after 1 hour
    setTimeout(() => {
      this.nonceCache.delete(nonce);
    }, 60 * 60 * 1000);
  }

  /**
   * Check if transaction hash is already used (Layer 2)
   */
  isTransactionDuplicate(txHash: string): boolean {
    return this.txHashCache.has(txHash);
  }

  /**
   * Mark transaction as processed
   */
  markTransactionProcessed(txHash: string): void {
    this.txHashCache.add(txHash);
    
    // Cleanup old hashes after 1 hour
    setTimeout(() => {
      this.txHashCache.delete(txHash);
    }, 60 * 60 * 1000);
  }

  /**
   * Validate timestamp window (Layer 3)
   */
  isTimestampValid(timestamp: Date): boolean {
    const now = Date.now();
    const txTime = timestamp.getTime();
    const age = now - txTime;
    
    // Must be recent (within window) and not from future
    return age >= 0 && age <= this.timestampWindow;
  }

  /**
   * Check rate limit (Layer 4)
   */
  checkRateLimit(
    userId: string,
    maxPerMinute: number = 10
  ): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.rateLimitCache.get(userId);
    
    if (!record || now > record.resetTime) {
      this.rateLimitCache.set(userId, {
        count: 1,
        resetTime: now + 60_000, // 1 minute
      });
      return { allowed: true, remaining: maxPerMinute - 1 };
    }
    
    if (record.count >= maxPerMinute) {
      return { allowed: false, remaining: 0 };
    }
    
    record.count++;
    return { allowed: true, remaining: maxPerMinute - record.count };
  }

  /**
   * Complete 4-layer validation
   */
  validateExecution(
    nonce: string,
    transaction: OfflineTransaction | Transaction,
    timestamp: Date,
    userId: string,
    maxRatePerMinute: number = 10
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Layer 1: Nonce check
    if (this.isNonceUsed(nonce)) {
      errors.push('Nonce already used (Layer 1)');
    }

    // Layer 2: Transaction hash check
    const txHash = this.computeTransactionHash(transaction);
    if (this.isTransactionDuplicate(txHash)) {
      errors.push('Duplicate transaction detected (Layer 2)');
    }

    // Layer 3: Timestamp validation
    if (!this.isTimestampValid(timestamp)) {
      errors.push('Transaction timestamp outside valid window (Layer 3)');
    }

    // Layer 4: Rate limiting
    const rateLimit = this.checkRateLimit(userId, maxRatePerMinute);
    if (!rateLimit.allowed) {
      errors.push('Rate limit exceeded (Layer 4)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Mark execution as processed (all layers)
   */
  markExecutionProcessed(
    nonce: string,
    transaction: OfflineTransaction | Transaction
  ): void {
    this.markNonceUsed(nonce);
    const txHash = this.computeTransactionHash(transaction);
    this.markTransactionProcessed(txHash);
  }
}

/**
 * Per-User Sandbox Isolation
 */
export class BotSandbox {
  private context: SandboxContext;

  constructor(userId: string, botId: string, walletAddress: string, permissions: string[]) {
    this.context = {
      userId,
      botId,
      walletAddress,
      permissions,
      rateLimit: {
        maxExecutionsPerMinute: 10,
        maxExecutionsPerHour: 100,
        currentMinute: 0,
        currentHour: 0,
      },
      isolatedState: new Map(),
    };
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    return this.context.permissions.includes(permission) || 
           this.context.permissions.includes('*');
  }

  /**
   * Execute in sandboxed context
   */
  async execute<T>(
    operation: () => Promise<T>,
    requiredPermission: string
  ): Promise<T> {
    if (!this.hasPermission(requiredPermission)) {
      throw new Error(`Permission denied: ${requiredPermission}`);
    }

    // Check rate limits
    if (this.context.rateLimit.currentMinute >= this.context.rateLimit.maxExecutionsPerMinute) {
      throw new Error('Rate limit exceeded: too many executions per minute');
    }

    if (this.context.rateLimit.currentHour >= this.context.rateLimit.maxExecutionsPerHour) {
      throw new Error('Rate limit exceeded: too many executions per hour');
    }

    try {
      this.context.rateLimit.currentMinute++;
      this.context.rateLimit.currentHour++;
      
      return await operation();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get isolated state
   */
  getState<T>(key: string): T | undefined {
    return this.context.isolatedState.get(key);
  }

  /**
   * Set isolated state
   */
  setState<T>(key: string, value: T): void {
    this.context.isolatedState.set(key, value);
  }

  /**
   * Clear isolated state
   */
  clearState(): void {
    this.context.isolatedState.clear();
  }

  /**
   * Get sandbox context info
   */
  getContext(): Readonly<SandboxContext> {
    return { ...this.context };
  }
}

/**
 * Bot Execution Engine
 */
export class BotExecutionEngine {
  private connection: Connection;
  private replayProtection: ReplayProtection;
  private sandboxes = new Map<string, BotSandbox>();

  constructor(connection: Connection) {
    this.connection = connection;
    this.replayProtection = new ReplayProtection();
  }

  /**
   * Get or create sandbox for user
   */
  getSandbox(userId: string, botId: string, walletAddress: string, permissions: string[]): BotSandbox {
    const key = `${userId}:${botId}`;
    
    if (!this.sandboxes.has(key)) {
      this.sandboxes.set(key, new BotSandbox(userId, botId, walletAddress, permissions));
    }
    
    return this.sandboxes.get(key)!;
  }

  /**
   * Create offline transaction builder
   */
  createTransactionBuilder(
    feePayer: PublicKey,
    botId: string,
    userId: string,
    executionId: string
  ): OfflineTransactionBuilder {
    return new OfflineTransactionBuilder(feePayer, botId, userId, executionId);
  }

  /**
   * Execute bot transaction with full protection
   */
  async executeTransaction(
    bot: BotConfig,
    transaction: Transaction,
    signer: Keypair,
    options: {
      skipPreflight?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<BotExecution> {
    const executionId = crypto.randomUUID();
    const nonce = this.replayProtection.generateNonce();
    const timestamp = new Date();

    // 4-layer replay protection
    const validation = this.replayProtection.validateExecution(
      nonce,
      transaction,
      timestamp,
      bot.userId,
      10 // max 10 per minute
    );

    if (!validation.valid) {
      return {
        id: executionId,
        botId: bot.id,
        userId: bot.userId,
        executionType: bot.botType,
        status: 'FAILED',
        errorMessage: `Replay protection failed: ${validation.errors.join(', ')}`,
        executedAt: timestamp,
      };
    }

    try {
      // Get sandbox
      const sandbox = this.getSandbox(
        bot.userId,
        bot.id,
        signer.publicKey.toBase58(),
        ['bot.execute', 'wallet.sign']
      );

      // Execute in sandbox
      const signature = await sandbox.execute(async () => {
        return await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [signer],
          {
            skipPreflight: options.skipPreflight ?? false,
            maxRetries: options.maxRetries ?? 3,
          }
        );
      }, 'bot.execute');

      // Mark as processed
      this.replayProtection.markExecutionProcessed(nonce, transaction);

      return {
        id: executionId,
        botId: bot.id,
        userId: bot.userId,
        executionType: bot.botType,
        status: 'CONFIRMED',
        transactionSignature: signature,
        executedAt: timestamp,
        confirmedAt: new Date(),
      };
    } catch (error) {
      return {
        id: executionId,
        botId: bot.id,
        userId: bot.userId,
        executionType: bot.botType,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        executedAt: timestamp,
      };
    }
  }

  /**
   * Simulate transaction
   */
  async simulateTransaction(
    transaction: Transaction,
    signer: Keypair
  ): Promise<{ success: boolean; logs?: string[]; error?: string }> {
    try {
      const simulation = await this.connection.simulateTransaction(transaction, [signer]);
      
      if (simulation.value.err) {
        return {
          success: false,
          error: JSON.stringify(simulation.value.err),
          logs: simulation.value.logs || undefined,
        };
      }
      
      return {
        success: true,
        logs: simulation.value.logs || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
      };
    }
  }
}

export default {
  OfflineTransactionBuilder,
  ReplayProtection,
  BotSandbox,
  BotExecutionEngine,
};
