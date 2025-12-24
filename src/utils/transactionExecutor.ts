import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  Commitment,
  TransactionMessage,
  AddressLookupTableAccount,
  TransactionInstruction,
} from '@solana/web3.js';
import type { PrioritizationFee } from '../types/solana.js';
import { JitoIntegration, type JitoBundleResult } from '../integrations/jito.js';

export interface TransactionExecutionResult {
  success: boolean;
  signature?: string;
  signatures?: string[];
  bundleId?: string;
  error?: string;
  computeUnits?: number;
  fee?: number;
  usedJito?: boolean;
}

export interface PriorityFeeConfig {
  microLamports: number;
  computeUnitLimit: number;
}

export class TransactionExecutor {
  private connection: Connection;
  private maxRetries: number;
  private retryDelay: number;
  private jitoIntegration: JitoIntegration | null;
  
  constructor(
    connection: Connection,
    maxRetries: number = 3,
    retryDelay: number = 2000,
    enableJito: boolean = true
  ) {
    this.connection = connection;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.jitoIntegration = enableJito ? new JitoIntegration(connection) : null;

    if (this.jitoIntegration) {
      console.log('💎 Jito MEV protection enabled');
    }
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
      const fees = recentFees.map((f: PrioritizationFee) => f.prioritizationFee).sort((a: number, b: number) => a - b);
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
  
  /**
   * Simulate versioned transaction before execution
   */
  async simulateVersionedTransaction(transaction: VersionedTransaction): Promise<boolean> {
    try {
      console.log('🔍 Simulating versioned transaction...');
      
      const simulation = await this.connection.simulateTransaction(transaction, {
        sigVerify: false,
      });
      
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
  
  /**
   * Build a versioned transaction with compute budget instructions
   * This is useful for Jupiter swaps and other complex transactions
   */
  async buildVersionedTransactionWithComputeBudget(
    instructions: TransactionInstruction[],
    payer: Keypair,
    priorityFee: number | PriorityFeeConfig,
    lookupTableAddresses?: AddressLookupTableAccount[]
  ): Promise<VersionedTransaction> {
    try {
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
      
      // Determine priority fee config
      let feeConfig: PriorityFeeConfig;
      if (typeof priorityFee === 'number') {
        feeConfig = {
          microLamports: priorityFee,
          computeUnitLimit: 400_000, // Default compute units
        };
      } else {
        feeConfig = priorityFee;
      }
      
      // Create compute budget instructions
      const computeBudgetInstructions = [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: feeConfig.computeUnitLimit,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: feeConfig.microLamports,
        }),
      ];
      
      // Combine all instructions
      const allInstructions = [...computeBudgetInstructions, ...instructions];
      
      // Create versioned transaction message
      const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions: allInstructions,
      }).compileToV0Message(lookupTableAddresses);
      
      // Create versioned transaction
      const transaction = new VersionedTransaction(messageV0);
      
      console.log('📝 Built versioned transaction with compute budget');
      console.log(`   Priority fee: ${feeConfig.microLamports} microLamports`);
      console.log(`   Compute limit: ${feeConfig.computeUnitLimit.toLocaleString()} units`);
      console.log(`   Instructions: ${allInstructions.length}`);
      console.log(`   Last valid block height: ${lastValidBlockHeight}`);
      
      return transaction;
    } catch (error) {
      console.error('❌ Error building versioned transaction:', error);
      throw error;
    }
  }
  
  /**
   * Execute transaction with pre-flight simulation
   * Simulates the transaction first to catch errors before sending
   */
  async executeTransactionWithSimulation(
    transaction: Transaction,
    signers: Keypair[],
    priorityFee?: PriorityFeeConfig,
    commitment: Commitment = 'confirmed'
  ): Promise<TransactionExecutionResult> {
    // Add priority fee if provided
    if (priorityFee) {
      this.addComputeBudgetInstructions(transaction, priorityFee);
    } else {
      const dynamicFee = await this.calculateDynamicPriorityFee('medium');
      this.addComputeBudgetInstructions(transaction, dynamicFee);
    }
    
    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash(commitment);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = signers[0].publicKey;
    
    // Simulate first
    const simulationSuccess = await this.simulateTransaction(transaction);
    if (!simulationSuccess) {
      return {
        success: false,
        error: 'Transaction simulation failed - transaction would fail on-chain'
      };
    }
    
    // Execute the transaction
    return await this.executeTransaction(transaction, signers, undefined, commitment);
  }
  
  /**
   * Execute versioned transaction with pre-flight simulation
   */
  async executeVersionedTransactionWithSimulation(
    transaction: VersionedTransaction,
    signers: Keypair[],
    commitment: Commitment = 'confirmed'
  ): Promise<TransactionExecutionResult> {
    // Sign the transaction
    transaction.sign(signers);
    
    // Simulate first
    const simulationSuccess = await this.simulateVersionedTransaction(transaction);
    if (!simulationSuccess) {
      return {
        success: false,
        error: 'Transaction simulation failed - transaction would fail on-chain'
      };
    }
    
    // Execute the transaction
    return await this.executeVersionedTransaction(transaction, signers, commitment);
  }

  /**
   * Execute atomic bundle with Jito MEV protection
   * This is the preferred method for arbitrage transactions
   */
  async executeAtomicBundleWithJito(
    transactions: Transaction[],
    signers: Keypair[],
    expectedProfitLamports: number = 0,
    priorityFee?: PriorityFeeConfig
  ): Promise<TransactionExecutionResult> {
    if (!this.jitoIntegration) {
      console.warn('⚠️  Jito integration not enabled, falling back to regular transaction execution');
      
      // Fallback to regular transaction execution
      if (transactions.length === 1) {
        return await this.executeTransaction(transactions[0], signers, priorityFee);
      } else {
        console.error('❌ Cannot execute multiple transactions without Jito');
        return {
          success: false,
          error: 'Jito integration required for multi-transaction bundles',
        };
      }
    }

    try {
      console.log('🚀 Executing atomic bundle with Jito MEV protection...');
      console.log(`   Transactions: ${transactions.length}`);
      console.log(`   Expected profit: ${expectedProfitLamports / 1e9} SOL`);

      // Add priority fees to transactions if provided
      if (priorityFee) {
        for (const tx of transactions) {
          this.addComputeBudgetInstructions(tx, priorityFee);
        }
      } else {
        // Calculate dynamic priority fee
        const dynamicFee = await this.calculateDynamicPriorityFee('high'); // Use high priority for arbitrage
        for (const tx of transactions) {
          this.addComputeBudgetInstructions(tx, dynamicFee);
        }
      }

      // Execute bundle through Jito
      const result: JitoBundleResult = await this.jitoIntegration.executeAtomicBundle(
        transactions,
        signers,
        expectedProfitLamports,
        true // Poll for confirmation
      );

      if (result.success) {
        console.log('✅ Atomic bundle executed successfully!');
        console.log(`   Bundle ID: ${result.bundleId}`);
        if (result.landedSlot) {
          console.log(`   Landed in slot: ${result.landedSlot}`);
        }

        return {
          success: true,
          bundleId: result.bundleId,
          signatures: result.signatures,
          signature: result.signatures[0], // First signature for backwards compatibility
          usedJito: true,
        };
      } else {
        console.error('❌ Atomic bundle execution failed:', result.error);
        return {
          success: false,
          error: result.error || 'Bundle execution failed',
          usedJito: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error executing atomic bundle with Jito:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        usedJito: true,
      };
    }
  }

  /**
   * Get Jito integration instance
   */
  getJitoIntegration(): JitoIntegration | null {
    return this.jitoIntegration;
  }

  /**
   * Enable/disable Jito integration
   */
  setJitoEnabled(enabled: boolean): void {
    if (enabled && !this.jitoIntegration) {
      this.jitoIntegration = new JitoIntegration(this.connection);
      console.log('💎 Jito MEV protection enabled');
    } else if (!enabled && this.jitoIntegration) {
      this.jitoIntegration = null;
      console.log('⚠️  Jito MEV protection disabled');
    }
  }
}
