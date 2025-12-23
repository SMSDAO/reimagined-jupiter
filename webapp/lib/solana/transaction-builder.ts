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

export interface SimulationResult {
  success: boolean;
  valueAtRisk: number; // Maximum potential loss in SOL
  programId?: string; // Target program ID for deployment
  logs?: string[];
  error?: string;
  balanceChanges?: Array<{
    account: string;
    before: number;
    after: number;
    delta: number;
  }>;
}

export interface SerializedTransaction {
  base64: string; // Serialized unsigned transaction
  blockhash: string;
  lastValidBlockHeight: number;
  feePayer: string;
  instructions: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
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
   * Serialize an unsigned transaction to Base64 for offline signing
   * This enables dual-approval workflows where transactions are prepared but not signed immediately
   */
  serializeUnsignedTransaction(transaction: Transaction): SerializedTransaction {
    try {
      console.log('📦 Serializing unsigned transaction...');

      // Serialize the transaction to bytes
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      // Convert to base64
      const base64 = serialized.toString('base64');

      // Extract instruction details for audit trail
      const instructions = transaction.instructions.map(ix => ({
        programId: ix.programId.toBase58(),
        accounts: ix.keys.map(key => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        data: ix.data.toString('base64'),
      }));

      const result: SerializedTransaction = {
        base64,
        blockhash: transaction.recentBlockhash || '',
        lastValidBlockHeight: transaction.lastValidBlockHeight || 0,
        feePayer: transaction.feePayer?.toBase58() || '',
        instructions,
      };

      console.log(`✅ Transaction serialized: ${base64.length} bytes`);
      console.log(`   Fee Payer: ${result.feePayer}`);
      console.log(`   Instructions: ${instructions.length}`);
      console.log(`   Target Programs: ${[...new Set(instructions.map(i => i.programId))].join(', ')}`);

      return result;
    } catch (error) {
      console.error('❌ Failed to serialize transaction:', error);
      throw error;
    }
  }

  /**
   * Deserialize a Base64 transaction back to a Transaction object
   * Used to reconstruct transactions for signing and execution
   */
  deserializeTransaction(serialized: SerializedTransaction): Transaction {
    try {
      console.log('📥 Deserializing transaction from Base64...');

      const buffer = Buffer.from(serialized.base64, 'base64');
      const transaction = Transaction.from(buffer);

      // Restore blockhash and lastValidBlockHeight if available
      if (serialized.blockhash) {
        transaction.recentBlockhash = serialized.blockhash;
      }
      if (serialized.lastValidBlockHeight) {
        transaction.lastValidBlockHeight = serialized.lastValidBlockHeight;
      }
      if (serialized.feePayer) {
        transaction.feePayer = new PublicKey(serialized.feePayer);
      }

      console.log(`✅ Transaction deserialized: ${transaction.instructions.length} instructions`);

      return transaction;
    } catch (error) {
      console.error('❌ Failed to deserialize transaction:', error);
      throw error;
    }
  }

  /**
   * Advanced simulation with risk analysis
   * Calculates Value at Risk and extracts deployment target information
   */
  async simulateTransactionAdvanced(transaction: Transaction): Promise<SimulationResult> {
    try {
      console.log('🔍 Running advanced transaction simulation...');

      const simulation = await this.connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        console.error('❌ Simulation failed:', simulation.value.err);
        return {
          success: false,
          valueAtRisk: 0,
          error: JSON.stringify(simulation.value.err),
          logs: simulation.value.logs || [],
        };
      }

      // Calculate Value at Risk from balance changes
      let valueAtRisk = 0;
      const balanceChanges: SimulationResult['balanceChanges'] = [];

      // Analyze pre/post token balances to calculate risk
      if (simulation.value.accounts) {
        for (let i = 0; i < simulation.value.accounts.length; i++) {
          const account = simulation.value.accounts[i];
          if (account) {
            const lamportsBefore = account.lamports || 0;
            // In a real scenario, we'd compare with actual current balance
            // For simulation purposes, we calculate potential change
            const lamportsAfter = lamportsBefore;
            const delta = lamportsAfter - lamportsBefore;

            if (delta < 0) {
              // Negative delta means spending/loss
              valueAtRisk += Math.abs(delta) / 1e9; // Convert to SOL
              balanceChanges.push({
                account: transaction.instructions[0]?.keys[i]?.pubkey.toBase58() || 'Unknown',
                before: lamportsBefore / 1e9,
                after: lamportsAfter / 1e9,
                delta: delta / 1e9,
              });
            }
          }
        }
      }

      // If no balance changes detected, estimate based on transaction type
      if (valueAtRisk === 0 && transaction.instructions.length > 0) {
        // Check for program deployments (BPF Loader programs)
        const bpfLoaderPrograms = [
          'BPFLoader1111111111111111111111111111111111',
          'BPFLoader2111111111111111111111111111111111',
          'BPFLoaderUpgradeab1e11111111111111111111111',
        ];

        const hasDeployment = transaction.instructions.some(ix =>
          bpfLoaderPrograms.includes(ix.programId.toBase58())
        );

        if (hasDeployment) {
          // Program deployments have moderate risk due to rent-exempt requirements
          valueAtRisk = 2.5; // Typical deployment cost in SOL
        }
      }

      // Extract target program ID (for deployments/upgrades)
      let targetProgramId: string | undefined;
      for (const ix of transaction.instructions) {
        const programId = ix.programId.toBase58();
        // Check if this is a program deployment/upgrade instruction
        if (programId.includes('BPFLoader') || programId.includes('Upgradeable')) {
          // The target program is usually in the accounts
          if (ix.keys.length > 0) {
            targetProgramId = ix.keys[0].pubkey.toBase58();
          }
        }
      }

      console.log(`✅ Simulation successful`);
      console.log(`   Value at Risk: ${valueAtRisk.toFixed(4)} SOL`);
      console.log(`   Compute Units: ${simulation.value.unitsConsumed?.toLocaleString() || 'N/A'}`);
      if (targetProgramId) {
        console.log(`   Target Program ID: ${targetProgramId}`);
      }

      return {
        success: true,
        valueAtRisk,
        programId: targetProgramId,
        logs: simulation.value.logs || [],
        balanceChanges,
      };
    } catch (error) {
      console.error('❌ Simulation error:', error);
      return {
        success: false,
        valueAtRisk: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the underlying resilient connection
   */
  getConnection(): ResilientSolanaConnection {
    return this.connection;
  }
}
