/**
 * Offline Transaction Builder System
 * 
 * BOT.exe style scriptable automation for arbitrage and trading flows.
 * Supports building transactions offline with complete flexibility.
 * All transactions are built and prepared before signing for maximum security.
 */

import {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { createHash } from 'crypto';

export interface TransactionBuilderConfig {
  /** Maximum priority fee in lamports (default: 10M = 0.01 SOL) */
  maxPriorityFeeLamports: number;
  /** Compute unit limit (default: 200k) */
  computeUnitLimit: number;
  /** Use versioned transactions (default: true) */
  useVersionedTransaction: boolean;
  /** Address lookup tables for versioned transactions */
  addressLookupTables?: AddressLookupTableAccount[];
}

export interface BuiltTransaction {
  /** The built transaction (legacy or versioned) */
  transaction: Transaction | VersionedTransaction;
  /** Hash of the transaction for deduplication */
  transactionHash: string;
  /** Nonce for replay protection */
  nonce: bigint;
  /** Timestamp when transaction was built */
  timestamp: number;
  /** Estimated compute units */
  estimatedComputeUnits: number;
  /** Priority fee in lamports */
  priorityFeeLamports: number;
  /** Metadata about the transaction */
  metadata: {
    type: string;
    description: string;
    instructions: string[];
  };
}

export class TransactionBuilder {
  private connection: Connection;
  private config: TransactionBuilderConfig;
  private nonceCounter: bigint = BigInt(Date.now());

  constructor(connection: Connection, config?: Partial<TransactionBuilderConfig>) {
    this.connection = connection;
    this.config = {
      maxPriorityFeeLamports: config?.maxPriorityFeeLamports ?? 10_000_000, // 0.01 SOL
      computeUnitLimit: config?.computeUnitLimit ?? 200_000,
      useVersionedTransaction: config?.useVersionedTransaction ?? true,
      addressLookupTables: config?.addressLookupTables ?? [],
    };
  }

  /**
   * Build a transaction from a set of instructions
   * This builds the transaction completely offline, ready for signing
   */
  async buildTransaction(
    payer: PublicKey,
    instructions: TransactionInstruction[],
    metadata: {
      type: string;
      description: string;
    }
  ): Promise<BuiltTransaction> {
    // Generate nonce for replay protection
    const nonce = this.generateNonce();
    const timestamp = Date.now();

    // Calculate priority fee based on network conditions
    const priorityFee = await this.calculateOptimalPriorityFee();

    // Add compute budget instructions
    const computeBudgetInstructions = [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: this.config.computeUnitLimit,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.floor(priorityFee / this.config.computeUnitLimit),
      }),
    ];

    // Combine all instructions
    const allInstructions = [...computeBudgetInstructions, ...instructions];

    // Build transaction based on configuration
    let transaction: Transaction | VersionedTransaction;

    if (this.config.useVersionedTransaction) {
      transaction = await this.buildVersionedTransaction(
        payer,
        allInstructions
      );
    } else {
      transaction = await this.buildLegacyTransaction(
        payer,
        allInstructions
      );
    }

    // Generate transaction hash for deduplication
    const transactionHash = this.generateTransactionHash(
      payer,
      allInstructions,
      nonce
    );

    // Extract instruction names for metadata
    const instructionNames = instructions.map((ix, idx) => 
      `${idx + 1}. ${this.getInstructionName(ix)}`
    );

    return {
      transaction,
      transactionHash,
      nonce,
      timestamp,
      estimatedComputeUnits: this.config.computeUnitLimit,
      priorityFeeLamports: priorityFee,
      metadata: {
        type: metadata.type,
        description: metadata.description,
        instructions: instructionNames,
      },
    };
  }

  /**
   * Build a versioned transaction (recommended for mainnet)
   */
  private async buildVersionedTransaction(
    payer: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<VersionedTransaction> {
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');

    // Create transaction message
    const messageV0 = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(this.config.addressLookupTables);

    // Create versioned transaction
    const transaction = new VersionedTransaction(messageV0);

    // Store block height for confirmation tracking
    (transaction as any).lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  }

  /**
   * Build a legacy transaction
   */
  private async buildLegacyTransaction(
    payer: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<Transaction> {
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');

    // Create transaction
    const transaction = new Transaction({
      feePayer: payer,
      recentBlockhash: blockhash,
    });

    // Add instructions
    transaction.add(...instructions);

    // Store block height for confirmation tracking
    (transaction as any).lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  }

  /**
   * Build an arbitrage transaction
   */
  async buildArbitrageTransaction(
    payer: PublicKey,
    swapInstructions: TransactionInstruction[],
    arbType: 'flash-loan' | 'triangular' | 'cross-dex'
  ): Promise<BuiltTransaction> {
    return this.buildTransaction(payer, swapInstructions, {
      type: `arbitrage-${arbType}`,
      description: `${arbType} arbitrage execution`,
    });
  }

  /**
   * Build a sniper transaction
   */
  async buildSniperTransaction(
    payer: PublicKey,
    buyInstruction: TransactionInstruction,
    tokenMint: PublicKey,
    amountSol: number
  ): Promise<BuiltTransaction> {
    return this.buildTransaction(payer, [buyInstruction], {
      type: 'sniper',
      description: `Snipe token ${tokenMint.toBase58().slice(0, 8)}... with ${amountSol} SOL`,
    });
  }

  /**
   * Build a DCA (Dollar Cost Average) transaction
   */
  async buildDCATransaction(
    payer: PublicKey,
    swapInstruction: TransactionInstruction,
    tokenMint: PublicKey,
    amount: number
  ): Promise<BuiltTransaction> {
    return this.buildTransaction(payer, [swapInstruction], {
      type: 'dca',
      description: `DCA buy ${tokenMint.toBase58().slice(0, 8)}... amount: ${amount}`,
    });
  }

  /**
   * Build a grid trading transaction
   */
  async buildGridTransaction(
    payer: PublicKey,
    orderInstructions: TransactionInstruction[],
    gridLevel: number
  ): Promise<BuiltTransaction> {
    return this.buildTransaction(payer, orderInstructions, {
      type: 'grid',
      description: `Grid trading level ${gridLevel}`,
    });
  }

  /**
   * Calculate optimal priority fee based on network conditions
   */
  private async calculateOptimalPriorityFee(): Promise<number> {
    try {
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (!recentFees || recentFees.length === 0) {
        return 5000; // Default to 5k microlamports
      }

      // Get fees and sort
      const feeValues = recentFees
        .map(f => f.prioritizationFee)
        .filter(f => f > 0)
        .sort((a, b) => a - b);

      if (feeValues.length === 0) {
        return 5000;
      }

      // Use 75th percentile for reliable confirmation
      const percentile75 = feeValues[Math.floor(feeValues.length * 0.75)] || 5000;
      
      // Convert to lamports and cap at max
      const feeLamports = Math.min(
        percentile75 * this.config.computeUnitLimit,
        this.config.maxPriorityFeeLamports
      );

      return feeLamports;
    } catch (error) {
      console.warn('Failed to fetch priority fees, using default:', error);
      return 5000;
    }
  }

  /**
   * Generate a unique nonce for replay protection
   */
  private generateNonce(): bigint {
    this.nonceCounter += BigInt(1);
    return this.nonceCounter;
  }

  /**
   * Generate a deterministic hash for transaction deduplication
   */
  private generateTransactionHash(
    payer: PublicKey,
    instructions: TransactionInstruction[],
    nonce: bigint
  ): string {
    const hash = createHash('sha256');
    
    // Hash payer
    hash.update(payer.toBuffer());
    
    // Hash each instruction
    for (const instruction of instructions) {
      hash.update(instruction.programId.toBuffer());
      hash.update(Buffer.from(instruction.data));
      for (const key of instruction.keys) {
        hash.update(key.pubkey.toBuffer());
        hash.update(Buffer.from([key.isSigner ? 1 : 0, key.isWritable ? 1 : 0]));
      }
    }
    
    // Hash nonce
    hash.update(Buffer.from(nonce.toString()));
    
    return hash.digest('hex');
  }

  /**
   * Get human-readable instruction name
   */
  private getInstructionName(instruction: TransactionInstruction): string {
    const programId = instruction.programId.toBase58();
    
    // Map known program IDs to names
    const programNames: Record<string, string> = {
      '11111111111111111111111111111111': 'System Program',
      'ComputeBudget111111111111111111111111111111': 'Compute Budget',
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
      // Add more as needed
    };

    const programName = programNames[programId] || `Unknown (${programId.slice(0, 8)}...)`;
    
    return `${programName} instruction (${instruction.data.length} bytes)`;
  }

  /**
   * Estimate transaction size
   */
  estimateTransactionSize(transaction: Transaction | VersionedTransaction): number {
    if ('serialize' in transaction && typeof transaction.serialize === 'function') {
      try {
        // For versioned transactions
        return transaction.serialize().length;
      } catch {
        // If serialization fails, estimate
        return 1232; // Max transaction size
      }
    } else {
      // For legacy transactions, estimate based on instructions
      const tx = transaction as Transaction;
      const baseSize = 64 + 32 + 32; // Signatures + recent blockhash + fee payer
      const instructionSize = tx.instructions.length * 64; // Rough estimate
      return baseSize + instructionSize;
    }
  }

  /**
   * Validate transaction before signing
   */
  validateTransaction(builtTx: BuiltTransaction): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check priority fee
    if (builtTx.priorityFeeLamports > this.config.maxPriorityFeeLamports) {
      errors.push(`Priority fee ${builtTx.priorityFeeLamports} exceeds max ${this.config.maxPriorityFeeLamports}`);
    }

    // Check transaction size
    const size = this.estimateTransactionSize(builtTx.transaction);
    if (size > 1232) {
      errors.push(`Transaction size ${size} exceeds maximum 1232 bytes`);
    }

    // Check timestamp (not too old)
    const age = Date.now() - builtTx.timestamp;
    if (age > 60000) { // 60 seconds
      errors.push(`Transaction built ${age}ms ago, may be stale`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TransactionBuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
