import {
  Transaction,
  VersionedTransaction,
  Keypair,
  PublicKey,
  ComputeBudgetProgram,
  TransactionInstruction,
  Commitment,
  SendOptions,
} from '@solana/web3.js';
import { ResilientSolanaConnection } from './connection';

export interface PriorityFeeConfig {
  microLamports: number;
  computeUnitLimit: number;
}

export interface TransactionExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  computeUnits?: number;
  fee?: number;
}

export type TransactionUrgency = 'low' | 'medium' | 'high' | 'critical';

/**
 * TransactionBuilder - Centralized transaction building and execution
 * 
 * Features:
 * - Dynamic priority fee calculation
 * - Compute budget optimization
 * - Retry logic with exponential backoff
 * - Support for both legacy and versioned transactions
 * - Real transaction execution (no simulation only)
 */
export class TransactionBuilder {
  private connection: ResilientSolanaConnection;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    connection: ResilientSolanaConnection,
    maxRetries: number = 3,
    retryDelay: number = 2000
  ) {
    this.connection = connection;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Calculate dynamic priority fee based on current network conditions
   */
  async calculateDynamicPriorityFee(urgency: TransactionUrgency = 'medium'): Promise<PriorityFeeConfig> {
    try {
      console.log(`💎 Calculating priority fee for ${urgency} urgency...`);

      // Get recent prioritization fees from the network
      const recentFees = await this.connection.getRecentPrioritizationFees();

      if (!recentFees || recentFees.length === 0) {
        console.warn('⚠️  No recent prioritization fees found, using defaults');
        return this.getDefaultPriorityFee(urgency);
      }

      // Calculate percentile based on urgency
      const percentiles = {
        low: 0.25,      // 25th percentile
        medium: 0.50,   // 50th percentile (median)
        high: 0.75,     // 75th percentile
        critical: 0.95  // 95th percentile
      };

      const targetPercentile = percentiles[urgency];
      const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b);
      const index = Math.floor(fees.length * targetPercentile);
      const baseFee = fees[index] || fees[fees.length - 1] || 1000;

      // Apply multiplier for urgency
      const multipliers = {
        low: 1.0,
        medium: 1.5,
        high: 2.5,
        critical: 5.0
      };

      const microLamports = Math.floor(baseFee * multipliers[urgency]);

      // Set compute unit limit based on urgency
      const computeUnitLimits = {
        low: 200_000,
        medium: 400_000,
        high: 600_000,
        critical: 1_000_000
      };

      console.log(`✅ Priority fee calculated: ${microLamports} microLamports (${urgency})`);

      return {
        microLamports,
        computeUnitLimit: computeUnitLimits[urgency]
      };
    } catch (error) {
      console.error('❌ Error calculating dynamic priority fee:', error);
      return this.getDefaultPriorityFee(urgency);
    }
  }

  /**
   * Get default priority fee if network query fails
   */
  private getDefaultPriorityFee(urgency: TransactionUrgency): PriorityFeeConfig {
    const defaults = {
      low: { microLamports: 1_000, computeUnitLimit: 200_000 },
      medium: { microLamports: 5_000, computeUnitLimit: 400_000 },
      high: { microLamports: 25_000, computeUnitLimit: 600_000 },
      critical: { microLamports: 100_000, computeUnitLimit: 1_000_000 }
    };

    return defaults[urgency];
  }

  /**
   * Add compute budget instructions to a transaction
   */
  addComputeBudgetInstructions(
    instructions: TransactionInstruction[],
    priorityFee: PriorityFeeConfig
  ): TransactionInstruction[] {
    return [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: priorityFee.computeUnitLimit
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee.microLamports
      }),
      ...instructions
    ];
  }

  /**
   * Build and prepare a transaction with compute budget
   */
  async buildTransaction(
    instructions: TransactionInstruction[],
    feePayer: PublicKey,
    priorityFee?: PriorityFeeConfig,
    urgency: TransactionUrgency = 'medium'
  ): Promise<Transaction> {
    // Calculate priority fee if not provided
    const fee = priorityFee || await this.calculateDynamicPriorityFee(urgency);

    // Add compute budget instructions
    const allInstructions = this.addComputeBudgetInstructions(instructions, fee);

    // Create transaction
    const transaction = new Transaction();
    transaction.add(...allInstructions);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = feePayer;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  }

  /**
   * Execute a legacy transaction with retries and confirmation
   */
  async executeTransaction(
    transaction: Transaction,
    signers: Keypair[],
    commitment: Commitment = 'confirmed',
    skipPreflight: boolean = false
  ): Promise<TransactionExecutionResult> {
    try {
      console.log('🚀 Executing transaction...');

      let lastError: Error | undefined;

      // Retry loop
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`🔄 Transaction attempt ${attempt}/${this.maxRetries}...`);

          // Sign transaction
          transaction.sign(...signers);

          // Send transaction
          // Note: maxRetries is set to 0 because we implement our own retry logic with:
          // 1. Automatic endpoint switching on failure
          // 2. Exponential backoff between retries
          // 3. Blockhash refresh when needed
          // This provides better error handling than the default retry mechanism
          const signature = await this.connection.sendTransaction(
            transaction,
            signers,
            {
              skipPreflight,
              preflightCommitment: commitment,
              maxRetries: 0, // Custom retry logic in outer loop
            } as SendOptions
          );

          console.log(`📝 Transaction sent: ${signature}`);

          // Confirm transaction
          const confirmation = await this.connection.confirmTransaction(
            {
              signature,
              blockhash: transaction.recentBlockhash!,
              lastValidBlockHeight: transaction.lastValidBlockHeight!,
            },
            commitment
          );

          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          // Get transaction details for compute units and fee
          const txDetails = await this.connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          const fee = txDetails?.meta?.fee || 0;
          const computeUnits = txDetails?.meta?.computeUnitsConsumed || 0;

          console.log(`✅ Transaction confirmed!`);
          console.log(`   Signature: ${signature}`);
          console.log(`   Compute Units: ${computeUnits.toLocaleString()}`);
          console.log(`   Fee: ${(fee / 1e9).toFixed(6)} SOL`);

          return {
            success: true,
            signature,
            computeUnits,
            fee
          };
        } catch (error) {
          lastError = error as Error;
          console.warn(`⚠️  Attempt ${attempt} failed: ${lastError.message}`);

          // Get new blockhash if current one might be expired
          if (attempt < this.maxRetries) {
            console.log('🔄 Getting new blockhash...');
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            const delay = this.retryDelay * attempt; // Exponential backoff
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      return {
        success: false,
        error: lastError?.message || 'Transaction failed after all retries'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Transaction execution error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute a versioned transaction with retries and confirmation
   */
  async executeVersionedTransaction(
    transaction: VersionedTransaction,
    commitment: Commitment = 'confirmed',
    skipPreflight: boolean = false
  ): Promise<TransactionExecutionResult> {
    try {
      console.log('🚀 Executing versioned transaction...');

      let lastError: Error | undefined;

      // Retry loop
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`🔄 Versioned transaction attempt ${attempt}/${this.maxRetries}...`);

          // Send transaction
          const signature = await this.connection.getConnection().sendTransaction(transaction, {
            skipPreflight,
            preflightCommitment: commitment,
            maxRetries: 0
          });

          console.log(`📝 Versioned transaction sent: ${signature}`);

          // Confirm transaction
          const recentBlockhash = transaction.message.recentBlockhash;
          if (!recentBlockhash) {
            throw new Error('Transaction missing recentBlockhash');
          }

          const latestBlockhash = await this.connection.getLatestBlockhash();
          const confirmation = await this.connection.confirmTransaction(
            {
              signature,
              blockhash: recentBlockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            },
            commitment
          );

          if (confirmation.value.err) {
            throw new Error(`Versioned transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          // Get transaction details
          const txDetails = await this.connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          const fee = txDetails?.meta?.fee || 0;
          const computeUnits = txDetails?.meta?.computeUnitsConsumed || 0;

          console.log(`✅ Versioned transaction confirmed!`);
          console.log(`   Signature: ${signature}`);
          console.log(`   Compute Units: ${computeUnits.toLocaleString()}`);
          console.log(`   Fee: ${(fee / 1e9).toFixed(6)} SOL`);

          return {
            success: true,
            signature,
            computeUnits,
            fee
          };
        } catch (error) {
          lastError = error as Error;
          console.warn(`⚠️  Attempt ${attempt} failed: ${lastError.message}`);

          // Wait before retry
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * attempt;
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      return {
        success: false,
        error: lastError?.message || 'Versioned transaction failed after all retries'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Versioned transaction execution error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Simulate transaction before execution
   */
  async simulateTransaction(transaction: Transaction): Promise<boolean> {
    try {
      console.log('🔍 Simulating transaction...');

      const simulation = await this.connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        console.error('❌ Simulation failed:', simulation.value.err);
        if (simulation.value.logs) {
          console.error('Logs:', simulation.value.logs);
        }
        return false;
      }

      console.log('✅ Simulation successful');
      if (simulation.value.unitsConsumed) {
        console.log(`   Compute units: ${simulation.value.unitsConsumed.toLocaleString()}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Simulation error:', error);
      return false;
    }
  }

  /**
   * Get the underlying resilient connection
   */
  getConnection(): ResilientSolanaConnection {
    return this.connection;
  }
}
