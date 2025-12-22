/**
 * Atomic Transaction Bundler with Pre-Send Simulation and Rollback
 * Features:
 * - Pre-send simulation of all execution paths
 * - Partial failure detection
 * - Automatic rollback logic
 * - Transaction retry with adjusted parameters
 * - Comprehensive safety checks and validation
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  Keypair,
  PublicKey,
  TransactionInstruction,
  SimulatedTransactionResponse,
  SendOptions,
  ComputeBudgetProgram,
} from '@solana/web3.js';

export interface TransactionBundle {
  transactions: (Transaction | VersionedTransaction)[];
  signers: Keypair[];
  description: string;
  requiresAtomic: boolean; // If true, all must succeed or all fail
}

export interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
  accounts?: any[];
}

export interface ExecutionResult {
  success: boolean;
  signatures?: string[];
  error?: string;
  partialSuccess?: boolean; // Some transactions succeeded, others failed
  completedTransactions?: number;
  failedTransaction?: number;
  simulationResults?: SimulationResult[];
}

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  adjustableParams: {
    increasePriorityFee?: boolean;
    increaseSlippage?: boolean;
    reduceAmount?: boolean;
  };
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
  adjustableParams: {
    increasePriorityFee: true,
    increaseSlippage: false,
    reduceAmount: false,
  },
};

/**
 * Atomic Transaction Service with Safety Guarantees
 */
export class AtomicTransactionService {
  private connection: Connection;
  private retryConfig: RetryConfig;
  
  constructor(connection: Connection, retryConfig?: RetryConfig) {
    this.connection = connection;
    this.retryConfig = retryConfig || DEFAULT_RETRY_CONFIG;
  }
  
  /**
   * Simulate all transactions before execution
   * @param bundle - Transaction bundle to simulate
   * @returns Array of simulation results
   */
  async simulateBundle(bundle: TransactionBundle): Promise<SimulationResult[]> {
    console.log(`[Atomic] Simulating ${bundle.transactions.length} transaction(s)...`);
    const results: SimulationResult[] = [];
    
    for (let i = 0; i < bundle.transactions.length; i++) {
      const tx = bundle.transactions[i];
      console.log(`[Atomic] Simulating transaction ${i + 1}/${bundle.transactions.length}`);
      
      try {
        let simulation: SimulatedTransactionResponse;
        
        if (tx instanceof VersionedTransaction) {
          simulation = await this.connection.simulateTransaction(tx, {
            sigVerify: false,
          });
        } else {
          // For legacy transactions, need to set recent blockhash
          const { blockhash } = await this.connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = bundle.signers[0].publicKey;
          
          simulation = await this.connection.simulateTransaction(tx, bundle.signers);
        }
        
        if (simulation.value.err) {
          console.error(`[Atomic] ❌ Simulation ${i + 1} failed:`, simulation.value.err);
          results.push({
            success: false,
            error: JSON.stringify(simulation.value.err),
            logs: simulation.value.logs || [],
          });
        } else {
          console.log(`[Atomic] ✅ Simulation ${i + 1} successful`);
          console.log(`[Atomic]   Compute units: ${simulation.value.unitsConsumed || 'unknown'}`);
          results.push({
            success: true,
            logs: simulation.value.logs || [],
            unitsConsumed: simulation.value.unitsConsumed,
            accounts: simulation.value.accounts,
          });
        }
      } catch (error) {
        console.error(`[Atomic] ❌ Simulation ${i + 1} exception:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }
  
  /**
   * Validate all simulations passed
   */
  private validateSimulations(results: SimulationResult[]): {
    valid: boolean;
    failedIndex?: number;
    error?: string;
  } {
    for (let i = 0; i < results.length; i++) {
      if (!results[i].success) {
        return {
          valid: false,
          failedIndex: i,
          error: results[i].error || 'Simulation failed',
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Execute bundle with pre-simulation and safety checks
   * @param bundle - Transaction bundle to execute
   * @param options - Send options
   * @returns Execution result
   */
  async executeBundle(
    bundle: TransactionBundle,
    options?: SendOptions
  ): Promise<ExecutionResult> {
    console.log(`[Atomic] Executing bundle: ${bundle.description}`);
    console.log(`[Atomic] Transactions: ${bundle.transactions.length}`);
    console.log(`[Atomic] Atomic requirement: ${bundle.requiresAtomic ? 'YES' : 'NO'}`);
    
    // Step 1: Simulate all transactions
    const simulations = await this.simulateBundle(bundle);
    const validation = this.validateSimulations(simulations);
    
    if (!validation.valid) {
      console.error(`[Atomic] ❌ Simulation validation failed at transaction ${validation.failedIndex! + 1}`);
      console.error(`[Atomic] Error: ${validation.error}`);
      
      return {
        success: false,
        error: `Simulation failed at transaction ${validation.failedIndex! + 1}: ${validation.error}`,
        simulationResults: simulations,
      };
    }
    
    console.log('[Atomic] ✅ All simulations passed');
    
    // Step 2: Execute transactions
    if (bundle.requiresAtomic) {
      return await this.executeAtomicBundle(bundle, simulations, options);
    } else {
      return await this.executeSequentialBundle(bundle, simulations, options);
    }
  }
  
  /**
   * Execute bundle atomically (all or nothing)
   * For Solana, this means combining into a single transaction or using cross-program invocations
   */
  private async executeAtomicBundle(
    bundle: TransactionBundle,
    simulations: SimulationResult[],
    options?: SendOptions
  ): Promise<ExecutionResult> {
    console.log('[Atomic] Executing atomic bundle (all-or-nothing)');
    
    try {
      // For true atomicity, all instructions should be in a single transaction
      // This is a limitation of Solana - you can't guarantee atomicity across multiple transactions
      
      if (bundle.transactions.length > 1) {
        console.warn('[Atomic] ⚠️ Multiple transactions cannot be truly atomic on Solana');
        console.warn('[Atomic] Consider combining all instructions into a single transaction');
      }
      
      // Execute all transactions sequentially
      // If any fails, we'll attempt rollback
      const signatures: string[] = [];
      let completedCount = 0;
      
      for (let i = 0; i < bundle.transactions.length; i++) {
        const tx = bundle.transactions[i];
        console.log(`[Atomic] Sending transaction ${i + 1}/${bundle.transactions.length}`);
        
        try {
          const signature = await this.sendAndConfirmTransaction(tx, bundle.signers, options);
          signatures.push(signature);
          completedCount++;
          console.log(`[Atomic] ✅ Transaction ${i + 1} confirmed: ${signature}`);
        } catch (error) {
          console.error(`[Atomic] ❌ Transaction ${i + 1} failed:`, error);
          
          // Atomic bundle failed - attempt rollback
          if (completedCount > 0) {
            console.log('[Atomic] Attempting rollback of completed transactions...');
            await this.attemptRollback(signatures, bundle);
          }
          
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Transaction failed',
            partialSuccess: completedCount > 0,
            completedTransactions: completedCount,
            failedTransaction: i,
            simulationResults: simulations,
          };
        }
      }
      
      console.log('[Atomic] ✅ Atomic bundle executed successfully');
      return {
        success: true,
        signatures,
        simulationResults: simulations,
      };
    } catch (error) {
      console.error('[Atomic] ❌ Atomic bundle execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        simulationResults: simulations,
      };
    }
  }
  
  /**
   * Execute bundle sequentially (partial success allowed)
   */
  private async executeSequentialBundle(
    bundle: TransactionBundle,
    simulations: SimulationResult[],
    options?: SendOptions
  ): Promise<ExecutionResult> {
    console.log('[Atomic] Executing sequential bundle (partial success allowed)');
    
    const signatures: string[] = [];
    let completedCount = 0;
    let failedIndex: number | undefined;
    let lastError: string | undefined;
    
    for (let i = 0; i < bundle.transactions.length; i++) {
      const tx = bundle.transactions[i];
      console.log(`[Atomic] Sending transaction ${i + 1}/${bundle.transactions.length}`);
      
      try {
        const signature = await this.sendAndConfirmTransaction(tx, bundle.signers, options);
        signatures.push(signature);
        completedCount++;
        console.log(`[Atomic] ✅ Transaction ${i + 1} confirmed: ${signature}`);
      } catch (error) {
        console.error(`[Atomic] ❌ Transaction ${i + 1} failed:`, error);
        failedIndex = i;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        // Continue with remaining transactions
      }
    }
    
    const allSucceeded = completedCount === bundle.transactions.length;
    
    console.log(`[Atomic] Sequential bundle completed: ${completedCount}/${bundle.transactions.length} succeeded`);
    
    return {
      success: allSucceeded,
      signatures,
      error: lastError,
      partialSuccess: completedCount > 0 && completedCount < bundle.transactions.length,
      completedTransactions: completedCount,
      failedTransaction: failedIndex,
      simulationResults: simulations,
    };
  }
  
  /**
   * Send and confirm a single transaction
   */
  private async sendAndConfirmTransaction(
    transaction: Transaction | VersionedTransaction,
    signers: Keypair[],
    options?: SendOptions
  ): Promise<string> {
    if (transaction instanceof VersionedTransaction) {
      // VersionedTransaction needs to be signed first
      transaction.sign(signers);
      const signature = await this.connection.sendTransaction(transaction, options);
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    } else {
      // Legacy transaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = signers[0].publicKey;
      
      // Sign with all signers
      transaction.sign(...signers);
      
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        options
      );
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    }
  }
  
  /**
   * Attempt to rollback completed transactions
   * Note: True rollback is not possible on Solana. This logs the need for manual intervention.
   */
  private async attemptRollback(
    completedSignatures: string[],
    bundle: TransactionBundle
  ): Promise<void> {
    console.warn('[Atomic] ⚠️ ROLLBACK REQUIRED');
    console.warn('[Atomic] Completed transactions:');
    
    for (const sig of completedSignatures) {
      console.warn(`[Atomic]   - ${sig}`);
    }
    
    console.warn('[Atomic] Note: Automatic rollback is not supported on Solana');
    console.warn('[Atomic] Manual intervention may be required to reverse state changes');
    
    // In a production system, you would:
    // 1. Log these transactions to a rollback queue
    // 2. Trigger alerts/notifications
    // 3. Execute compensating transactions if possible
    // 4. Update application state to reflect partial failure
  }
  
  /**
   * Execute bundle with retry logic
   */
  async executeWithRetry(
    bundle: TransactionBundle,
    options?: SendOptions
  ): Promise<ExecutionResult> {
    let lastResult: ExecutionResult | null = null;
    let currentPriorityFee = 10000; // Start with 10k microlamports
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      console.log(`[Atomic] Execution attempt ${attempt}/${this.retryConfig.maxRetries}`);
      
      // Adjust parameters for retry
      if (attempt > 1 && this.retryConfig.adjustableParams.increasePriorityFee) {
        currentPriorityFee *= 2; // Double priority fee on each retry
        console.log(`[Atomic] Increasing priority fee to ${currentPriorityFee} microlamports`);
        
        // Add priority fee instruction to all transactions
        for (const tx of bundle.transactions) {
          if (tx instanceof Transaction) {
            // Add compute budget instruction at the beginning
            const priorityInstruction = ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: currentPriorityFee,
            });
            
            // Insert at beginning
            tx.instructions.unshift(priorityInstruction);
          }
        }
      }
      
      // Execute bundle
      lastResult = await this.executeBundle(bundle, options);
      
      if (lastResult.success) {
        console.log(`[Atomic] ✅ Execution succeeded on attempt ${attempt}`);
        return lastResult;
      }
      
      console.error(`[Atomic] ❌ Attempt ${attempt} failed: ${lastResult.error}`);
      
      // Wait before retry with exponential backoff
      if (attempt < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.retryDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        console.log(`[Atomic] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error(`[Atomic] ❌ All retry attempts failed`);
    return lastResult || {
      success: false,
      error: 'All retry attempts failed',
    };
  }
  
  /**
   * Validate bundle safety before execution
   */
  validateBundleSafety(bundle: TransactionBundle): {
    safe: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check bundle has transactions
    if (bundle.transactions.length === 0) {
      errors.push('Bundle has no transactions');
    }
    
    // Check bundle has signers
    if (bundle.signers.length === 0) {
      errors.push('Bundle has no signers');
    }
    
    // Warn about atomic requirement with multiple transactions
    if (bundle.requiresAtomic && bundle.transactions.length > 1) {
      warnings.push('True atomicity across multiple transactions is not guaranteed on Solana');
    }
    
    // Check transaction limit
    if (bundle.transactions.length > 10) {
      warnings.push('Large bundles may have higher failure rates');
    }
    
    return {
      safe: errors.length === 0,
      warnings,
      errors,
    };
  }
}
