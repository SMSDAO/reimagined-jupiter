import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  Commitment,
} from '@solana/web3.js';

export interface TransactionExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  computeUnits?: number;
  fee?: number;
}

export interface PriorityFeeConfig {
  microLamports: number;
  computeUnitLimit: number;
}

export class TransactionExecutor {
  private connection: Connection;
  private maxRetries: number;
  private retryDelay: number;
  
  constructor(
    connection: Connection,
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
  async calculateDynamicPriorityFee(
    urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<PriorityFeeConfig> {
    try {
      // Get recent prioritization fees from the network
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (recentFees.length === 0) {
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
      const fees = recentFees.map((f: any) => f.prioritizationFee).sort((a: number, b: number) => a - b);
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
      
      console.log(`💎 Dynamic Priority Fee: ${microLamports} microLamports (${urgency} urgency)`);
      
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
  private getDefaultPriorityFee(urgency: 'low' | 'medium' | 'high' | 'critical'): PriorityFeeConfig {
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
    transaction: Transaction,
    priorityFee: PriorityFeeConfig
  ): Transaction {
    // Add compute unit limit instruction
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: priorityFee.computeUnitLimit
      })
    );
    
    // Add compute unit price instruction
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee.microLamports
      })
    );
    
    return transaction;
  }
  
  /**
   * Execute a legacy transaction with retries and confirmation
   */
  async executeTransaction(
    transaction: Transaction,
    signers: Keypair[],
    priorityFee?: PriorityFeeConfig,
    commitment: Commitment = 'confirmed'
  ): Promise<TransactionExecutionResult> {
    try {
      // Add priority fee if provided
      if (priorityFee) {
        this.addComputeBudgetInstructions(transaction, priorityFee);
      } else {
        // Calculate dynamic priority fee
        const dynamicFee = await this.calculateDynamicPriorityFee('medium');
        this.addComputeBudgetInstructions(transaction, dynamicFee);
      }
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = signers[0].publicKey;
      
      let lastError: Error | undefined;
      
      // Retry loop
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`🔄 Transaction attempt ${attempt}/${this.maxRetries}...`);
          
          // Sign and send transaction
          const signature = await sendAndConfirmTransaction(
            this.connection,
            transaction,
            signers,
            {
              commitment,
              preflightCommitment: commitment,
              maxRetries: 0, // We handle retries ourselves
            }
          );
          
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
          
          // Check if blockhash is still valid
          const currentHeight = await this.connection.getBlockHeight(commitment);
          if (currentHeight > lastValidBlockHeight) {
            console.log('🔄 Blockhash expired, getting new blockhash...');
            const { blockhash: newBlockhash } = await this.connection.getLatestBlockhash(commitment);
            transaction.recentBlockhash = newBlockhash;
          }
          
          // Wait before retry
          if (attempt < this.maxRetries) {
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
    signers: Keypair[],
    commitment: Commitment = 'confirmed'
  ): Promise<TransactionExecutionResult> {
    try {
      let lastError: Error | undefined;
      
      // Sign the transaction
      transaction.sign(signers);
      
      // Retry loop
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`🔄 Versioned transaction attempt ${attempt}/${this.maxRetries}...`);
          
          // Send transaction
          const signature = await this.connection.sendTransaction(transaction, {
            skipPreflight: false,
            preflightCommitment: commitment,
            maxRetries: 0
          });
          
          // Confirm transaction
          const recentBlockhash = transaction.message.recentBlockhash;
          if (!recentBlockhash) {
            throw new Error('Transaction missing recentBlockhash');
          }
          
          const latestBlockhash = await this.connection.getLatestBlockhash();
          const confirmation = await this.connection.confirmTransaction({
            signature,
            blockhash: recentBlockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          }, commitment);
          
          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
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
        console.error('Logs:', simulation.value.logs);
        return false;
      }
      
      console.log('✅ Simulation successful');
      console.log(`   Compute units: ${simulation.value.unitsConsumed?.toLocaleString()}`);
      
      return true;
    } catch (error) {
      console.error('❌ Simulation error:', error);
      return false;
    }
  }
}
