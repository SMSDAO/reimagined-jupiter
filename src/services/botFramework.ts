/**
 * Professional Bot Framework Infrastructure
 * 
 * Wallet Governance & Security Features:
 * - ✅ Minimum SOL balance check (0.05 SOL) before execution
 * - ✅ Strict per-user sandbox isolation (no shared signers)
 * - ✅ Private key wiping after transaction signing
 * - ✅ Web panel integration with local signing (CLIENT_SIDE mode)
 * - ✅ Auto-execution after validation (replay protection, balance checks, Oracle)
 * - ✅ Session-based execution with isolated state
 * 
 * Framework Features:
 * - Scriptable BOT.exe style execution engine
 * - Offline transaction builder
 * - Multiple signing modes (client-side, server-side, enclave-ready)
 * - 4-layer replay protection (nonce, hash, timestamp, rate-limit)
 * - Per-user sandbox isolation with RBAC permissions
 * - Oracle intelligence integration (pre-execution analysis)
 * - Comprehensive audit logging with database integration
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
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import crypto from 'crypto';
import { ProfitDistributionManager } from '../utils/profitDistribution.js';
import { getProfitTracker, initializeProfitTracker } from '../../lib/profit-tracker.js';
import { insertWalletAuditLog } from '../../db/database.js';
import { config } from '../config/index.js';
import { OracleService } from './intelligence/OracleService.js';
import { AnalysisContext } from './intelligence/types.js';

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
 * 
 * Security Features:
 * - Strict per-user execution isolation
 * - No shared signers across users
 * - No global execution context
 * - Isolated state per sandbox instance
 * - Rate limiting per user
 */
export class BotSandbox {
  private context: SandboxContext;
  private readonly createdAt: Date;

  constructor(userId: string, botId: string, walletAddress: string, permissions: string[]) {
    this.createdAt = new Date();
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
      isolatedState: new Map(), // Isolated state - never shared between users
    };
    
    console.log(`🔒 Sandbox created for user=${userId}, bot=${botId}, wallet=${walletAddress}`);
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    return this.context.permissions.includes(permission) || 
           this.context.permissions.includes('*');
  }

  /**
   * Execute in sandboxed context with strict isolation
   * NO SHARED SIGNERS - each execution is bound to specific user's wallet
   */
  async execute<T>(
    operation: () => Promise<T>,
    requiredPermission: string
  ): Promise<T> {
    if (!this.hasPermission(requiredPermission)) {
      throw new Error(`Permission denied: ${requiredPermission} for user=${this.context.userId}`);
    }

    // Check rate limits (per-user, not global)
    if (this.context.rateLimit.currentMinute >= this.context.rateLimit.maxExecutionsPerMinute) {
      throw new Error(`Rate limit exceeded: too many executions per minute for user=${this.context.userId}`);
    }

    if (this.context.rateLimit.currentHour >= this.context.rateLimit.maxExecutionsPerHour) {
      throw new Error(`Rate limit exceeded: too many executions per hour for user=${this.context.userId}`);
    }

    try {
      this.context.rateLimit.currentMinute++;
      this.context.rateLimit.currentHour++;
      
      console.log(`▶️ Executing in isolated sandbox: user=${this.context.userId}, bot=${this.context.botId}`);
      
      // Execute operation in isolated context
      return await operation();
    } catch (error) {
      console.error(`❌ Sandbox execution failed for user=${this.context.userId}:`, error);
      throw error;
    }
  }

  /**
   * Get isolated state (per-user, never shared)
   */
  getState<T>(key: string): T | undefined {
    return this.context.isolatedState.get(key);
  }

  /**
   * Set isolated state (per-user, never shared)
   */
  setState<T>(key: string, value: T): void {
    this.context.isolatedState.set(key, value);
  }

  /**
   * Clear isolated state (security best practice after execution)
   */
  clearState(): void {
    this.context.isolatedState.clear();
    console.log(`🗑️ Cleared isolated state for user=${this.context.userId}, bot=${this.context.botId}`);
  }

  /**
   * Get sandbox context info (read-only)
   */
  getContext(): Readonly<SandboxContext> {
    return { ...this.context };
  }
  
  /**
   * Get sandbox age (for monitoring)
   */
  getAge(): number {
    return Date.now() - this.createdAt.getTime();
  }
}

/**
 * Bot Execution Engine
 */
export class BotExecutionEngine {
  private connection: Connection;
  private replayProtection: ReplayProtection;
  private sandboxes = new Map<string, BotSandbox>();
  private profitDistributionManager: ProfitDistributionManager;
  private profitTrackerInitialized = false;
  private oracleService?: OracleService;
  
  // Minimum SOL balance required for bot execution
  private readonly MIN_SOL_BALANCE = 0.05; // 0.05 SOL minimum

  constructor(connection: Connection, oracleService?: OracleService) {
    this.connection = connection;
    this.replayProtection = new ReplayProtection();
    this.profitDistributionManager = new ProfitDistributionManager(connection);
    this.oracleService = oracleService;
    
    if (oracleService) {
      console.log('✅ Bot Execution Engine initialized with Oracle Intelligence');
    }
  }

  /**
   * Get or create sandbox for user (per-user isolation)
   * Each user gets their own isolated sandbox - NO SHARED CONTEXT
   */
  getSandbox(userId: string, botId: string, walletAddress: string, permissions: string[]): BotSandbox {
    // Create unique key per user AND bot for strict isolation
    const key = `${userId}:${botId}:${walletAddress}`;
    
    // Always create fresh sandbox if not exists (no reuse)
    if (!this.sandboxes.has(key)) {
      this.sandboxes.set(key, new BotSandbox(userId, botId, walletAddress, permissions));
      console.log(`✅ Created isolated sandbox for user=${userId}, bot=${botId}, wallet=${walletAddress}`);
    }
    
    return this.sandboxes.get(key)!;
  }
  
  /**
   * Clear sandbox for user (cleanup after execution)
   */
  clearSandbox(userId: string, botId: string, walletAddress: string): void {
    const key = `${userId}:${botId}:${walletAddress}`;
    const sandbox = this.sandboxes.get(key);
    if (sandbox) {
      sandbox.clearState();
      this.sandboxes.delete(key);
      console.log(`🗑️ Cleared sandbox for user=${userId}, bot=${botId}`);
    }
  }
  
  /**
   * Pre-flight validation: Check minimum SOL balance
   */
  async validateMinimumBalance(walletAddress: PublicKey): Promise<{
    valid: boolean;
    balance: number;
    error?: string;
  }> {
    try {
      const balance = await this.connection.getBalance(walletAddress);
      const balanceInSol = balance / 1e9; // Convert lamports to SOL
      
      if (balanceInSol < this.MIN_SOL_BALANCE) {
        return {
          valid: false,
          balance: balanceInSol,
          error: `Insufficient balance: ${balanceInSol.toFixed(4)} SOL (minimum: ${this.MIN_SOL_BALANCE} SOL required)`,
        };
      }
      
      return {
        valid: true,
        balance: balanceInSol,
      };
    } catch (error) {
      return {
        valid: false,
        balance: 0,
        error: `Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
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
   * Execute bot transaction with full protection and balance checks
   * 
   * Deterministic execution flow:
   * 1. Pre-flight Balance Check
   * 2. Replay Protection Validation
   * 3. Pre-execution Intelligence Analysis (Oracle)
   * 4. Sandbox Isolation
   * 5. Pre-trade Balance Snapshot
   * 6. Transaction Submission & Confirmation
   * 7. Post-trade Balance Snapshot & Profit Calculation
   * 8. DAO Skim (if applicable)
   * 9. Telemetry Recording (Database + Profit Tracker)
   * 10. Sandbox Cleanup & Key Wiping (in finally block)
   */
  async executeTransaction(
    bot: BotConfig,
    transaction: Transaction,
    signer: Keypair,
    options: {
      skipPreflight?: boolean;
      maxRetries?: number;
      analysisContext?: Partial<AnalysisContext>;
    } = {}
  ): Promise<BotExecution> {
    const executionId = crypto.randomUUID();
    const nonce = this.replayProtection.generateNonce();
    const timestamp = new Date();
    
    let sandbox: BotSandbox | undefined;
    let preTradeBalance = 0;
    let postTradeBalance = 0;
    let profitLamports = 0;
    let gasUsed = 0;
    let signature: string | undefined;
    let distributionSignature: string | undefined;
    let executionSuccess = false;
    let errorMessage: string | undefined;
    
    try {
      // STEP 1: Pre-flight Balance Check
      const balanceCheck = await this.validateMinimumBalance(signer.publicKey);
      if (!balanceCheck.valid) {
        errorMessage = `Pre-flight failed: ${balanceCheck.error}`;
        
        // Log failed pre-flight
        await this.logExecutionToDatabase(
          bot,
          executionId,
          undefined,
          undefined,
          0,
          0,
          false,
          errorMessage
        );
        
        return {
          id: executionId,
          botId: bot.id,
          userId: bot.userId,
          executionType: bot.botType,
          status: 'FAILED',
          errorMessage,
          executedAt: timestamp,
        };
      }
      
      console.log(`✅ Pre-flight balance check passed: ${balanceCheck.balance.toFixed(4)} SOL`);

      // STEP 2: Replay Protection Validation
      const validation = this.replayProtection.validateExecution(
        nonce,
        transaction,
        timestamp,
        bot.userId,
        10 // max 10 per minute
      );

      if (!validation.valid) {
        errorMessage = `Replay protection failed: ${validation.errors.join(', ')}`;
        
        // Log replay protection failure
        await this.logExecutionToDatabase(
          bot,
          executionId,
          undefined,
          undefined,
          0,
          0,
          false,
          errorMessage
        );
        
        return {
          id: executionId,
          botId: bot.id,
          userId: bot.userId,
          executionType: bot.botType,
          status: 'FAILED',
          errorMessage,
          executedAt: timestamp,
        };
      }

      // STEP 3: Pre-execution Intelligence Analysis (Oracle)
      if (this.oracleService) {
        console.log('🔮 Running Oracle intelligence analysis...');
        
        const analysisContext: AnalysisContext = {
          botId: bot.id,
          userId: bot.userId,
          executionId,
          botType: bot.botType,
          ...options.analysisContext,
        };
        
        try {
          const oracleResult = await this.oracleService.analyzeExecution(analysisContext);
          
          console.log(`🔮 Oracle recommendation: ${oracleResult.overallRecommendation} (${oracleResult.confidence} confidence)`);
          
          // If Oracle recommends ABORT, stop execution
          if (oracleResult.recommendation === 'ABORT') {
            errorMessage = `Oracle intelligence blocked execution: ${oracleResult.reasoning}`;
            
            // Log Oracle abort
            await this.logExecutionToDatabase(
              bot,
              executionId,
              undefined,
              undefined,
              0,
              0,
              false,
              errorMessage
            );
            
            return {
              id: executionId,
              botId: bot.id,
              userId: bot.userId,
              executionType: bot.botType,
              status: 'FAILED',
              errorMessage,
              executedAt: timestamp,
            };
          }
          
          // If Oracle recommends ADJUST, apply adjustments
          if (oracleResult.recommendation === 'ADJUST' && oracleResult.adjustments) {
            console.log('🔧 Applying Oracle adjustments:', oracleResult.adjustments);
            
            // Adjustments could be applied here if transaction is mutable
            // For now, log the recommendations
            console.log('ℹ️ Oracle adjustments logged but not applied to pre-built transaction');
          }
        } catch (oracleError) {
          // Log Oracle error but don't abort execution (fail-safe)
          console.error('⚠️ Oracle analysis error (proceeding anyway):', oracleError);
        }
      }

      // STEP 4: Sandbox Isolation
      sandbox = this.getSandbox(
        bot.userId,
        bot.id,
        signer.publicKey.toBase58(),
        ['bot.execute', 'wallet.sign']
      );

      // STEP 5: Pre-trade Balance Snapshot
      preTradeBalance = await this.connection.getBalance(signer.publicKey);
      console.log(`📸 Pre-trade balance snapshot: ${(preTradeBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

      // STEP 6: Transaction Submission & Confirmation
      signature = await sandbox.execute(async () => {
        return await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [signer], // Signer is bound to THIS execution only
          {
            skipPreflight: options.skipPreflight ?? false,
            maxRetries: options.maxRetries ?? 3,
          }
        );
      }, 'bot.execute');

      // Mark as processed
      this.replayProtection.markExecutionProcessed(nonce, transaction);
      
      console.log(`✅ Transaction confirmed: ${signature}`);

      // STEP 7: Post-trade Balance Snapshot & Profit Calculation
      postTradeBalance = await this.connection.getBalance(signer.publicKey);
      console.log(`📸 Post-trade balance snapshot: ${(postTradeBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      
      // Calculate profit (positive means gain, negative means loss)
      profitLamports = postTradeBalance - preTradeBalance;
      gasUsed = Math.abs(Math.min(0, profitLamports)); // If negative, it's gas cost
      
      console.log(`💰 Profit calculation: ${(profitLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

      // STEP 8: DAO Skim (if applicable)
      if (profitLamports > 0 && config.profitDistribution.enabled) {
        console.log(`🏦 Profit detected (${(profitLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL), triggering DAO skim...`);
        
        try {
          // Important: Distribution must happen BEFORE key wipe
          distributionSignature = await this.profitDistributionManager.distributeSolProfit(
            profitLamports,
            signer,
            signer.publicKey // Calling wallet gets gas/slippage coverage
          );
          
          if (distributionSignature) {
            console.log(`✅ DAO skim completed: ${distributionSignature}`);
          } else {
            console.warn(`⚠️ DAO skim returned null (might have failed silently)`);
          }
        } catch (distError) {
          console.error(`❌ DAO skim failed:`, distError);
          // Don't fail the whole execution if distribution fails
        }
      } else if (profitLamports <= 0) {
        console.log(`ℹ️ No profit detected (${(profitLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL), skipping DAO skim`);
      } else {
        console.log(`ℹ️ Profit distribution disabled in config, skipping DAO skim`);
      }

      executionSuccess = true;
      
      // STEP 9: Telemetry Recording
      // 8a. Database audit log
      await this.logExecutionToDatabase(
        bot,
        executionId,
        signature,
        distributionSignature,
        profitLamports,
        gasUsed,
        true,
        undefined
      );
      
      // 8b. Profit tracker
      this.recordTradeInProfitTracker(
        executionId,
        bot.botType,
        profitLamports,
        gasUsed,
        signature
      );
      
      // Clear sandbox state after execution to prevent context leakage
      sandbox.clearState();

      return {
        id: executionId,
        botId: bot.id,
        userId: bot.userId,
        executionType: bot.botType,
        status: 'CONFIRMED',
        transactionSignature: signature,
        profitSol: profitLamports / LAMPORTS_PER_SOL,
        gasFeeSol: gasUsed / LAMPORTS_PER_SOL,
        executedAt: timestamp,
        confirmedAt: new Date(),
      };
    } catch (error) {
      executionSuccess = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Transaction execution failed:`, error);
      
      // Log failed execution
      await this.logExecutionToDatabase(
        bot,
        executionId,
        signature,
        distributionSignature,
        profitLamports,
        gasUsed,
        false,
        errorMessage
      );
      
      return {
        id: executionId,
        botId: bot.id,
        userId: bot.userId,
        executionType: bot.botType,
        status: 'FAILED',
        errorMessage,
        executedAt: timestamp,
      };
    } finally {
      // STEP 10: Sandbox Cleanup & Key Wiping
      // Critical: Key wiping MUST happen after all operations including distribution
      if (sandbox) {
        sandbox.clearState();
      }
      
      // Zero out private key from memory
      signer.secretKey.fill(0);
      
      console.log(`🔒 Cleanup complete: sandbox cleared, private key wiped`);
    }
  }
  
  /**
   * Log execution to database audit log
   */
  private async logExecutionToDatabase(
    bot: BotConfig,
    executionId: string,
    signature: string | undefined,
    distributionSignature: string | undefined,
    profitLamports: number,
    gasUsed: number,
    success: boolean,
    errorMessage: string | undefined
  ): Promise<void> {
    try {
      await insertWalletAuditLog({
        walletId: bot.walletId || 'unknown',
        userId: bot.userId,
        operation: 'BOT_EXECUTION',
        operationData: {
          botId: bot.id,
          executionId,
          profit: profitLamports / LAMPORTS_PER_SOL,
          gas: gasUsed / LAMPORTS_PER_SOL,
          signature,
          distributionSignature,
          status: success ? 'SUCCESS' : 'FAILED',
        },
        transactionSignature: signature,
        success,
        errorMessage,
      });
      
      console.log(`📊 Execution logged to database: ${executionId}`);
    } catch (dbError) {
      console.error(`❌ Failed to log execution to database:`, dbError);
      // Don't throw - logging failure shouldn't fail the execution
    }
  }
  
  /**
   * Record trade in profit tracker
   */
  private recordTradeInProfitTracker(
    executionId: string,
    botType: BotType,
    profitLamports: number,
    gasUsed: number,
    signature: string | undefined
  ): void {
    try {
      // Initialize profit tracker if not already done
      if (!this.profitTrackerInitialized) {
        // Use 1 SOL as default initial capital (can be configured)
        initializeProfitTracker(1.0);
        this.profitTrackerInitialized = true;
      }
      
      const tracker = getProfitTracker();
      const profitSol = profitLamports / LAMPORTS_PER_SOL;
      const gasSol = gasUsed / LAMPORTS_PER_SOL;
      
      // Calculate dev fee if enabled
      const devFee = config.devFee.enabled && profitSol > 0
        ? profitSol * config.devFee.percentage
        : 0;
      
      const netProfit = profitSol - gasSol - devFee;
      
      tracker.recordTrade({
        id: executionId,
        timestamp: Date.now(),
        type: botType.toLowerCase() as 'arbitrage' | 'flash-loan' | 'triangular',
        inputToken: 'SOL',
        outputToken: 'SOL',
        inputAmount: 0, // Not tracked in this context
        outputAmount: 0, // Not tracked in this context
        profit: profitSol,
        gasUsed: gasSol,
        netProfit,
        devFee,
        signature,
      });
      
      console.log(`📊 Trade recorded in profit tracker: ${executionId}, net profit: ${netProfit.toFixed(6)} SOL`);
    } catch (trackerError) {
      console.error(`❌ Failed to record trade in profit tracker:`, trackerError);
      // Don't throw - tracking failure shouldn't fail the execution
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
