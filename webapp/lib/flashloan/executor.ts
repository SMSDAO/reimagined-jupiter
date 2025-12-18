import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import { FlashloanProvider, selectBestProvider, getProviderByName } from './providers';

/**
 * Arbitrage Opportunity Interface
 * Defines the structure of an arbitrage opportunity
 */
export interface ArbitrageOpportunity {
  inputMint: string;
  outputMint: string;
  amount: number;
  estimatedProfit: number;
  route?: string[];
  slippageBps?: number;
}

/**
 * Flashloan Execution Result
 * Result of executing a flashloan arbitrage
 */
export interface FlashloanExecutionResult {
  success: boolean;
  signature?: string;
  profit?: number;
  provider?: string;
  error?: string;
}

/**
 * FlashloanExecutor
 * Handles flashloan-based arbitrage execution
 */
export class FlashloanExecutor {
  private connection: Connection;
  private jupiterApiUrl: string;

  constructor(connection: Connection, jupiterApiUrl: string = 'https://quote-api.jup.ag/v6') {
    this.connection = connection;
    this.jupiterApiUrl = jupiterApiUrl;
  }

  /**
   * Execute arbitrage with flashloan
   * Main entry point for flashloan arbitrage execution
   * 
   * @param opportunity Arbitrage opportunity details
   * @param userPublicKey User's public key
   * @param providerName Optional specific provider to use
   * @returns Execution result with signature and profit details
   */
  async executeArbitrageWithFlashloan(
    opportunity: ArbitrageOpportunity,
    userPublicKey: PublicKey,
    providerName?: string
  ): Promise<FlashloanExecutionResult> {
    try {
      console.log('[FlashloanExecutor] Starting arbitrage execution');
      console.log(`  Input: ${opportunity.inputMint}`);
      console.log(`  Output: ${opportunity.outputMint}`);
      console.log(`  Amount: ${opportunity.amount}`);

      // Step 1: Validate inputs
      const validation = this.validateOpportunity(opportunity);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Step 2: Select best provider
      let provider: FlashloanProvider | undefined;
      if (providerName) {
        provider = getProviderByName(providerName);
        if (!provider) {
          return {
            success: false,
            error: `Provider ${providerName} not found`,
          };
        }
      } else {
        provider = selectBestProvider(opportunity.amount);
        if (!provider) {
          return {
            success: false,
            error: `No provider available for loan amount ${opportunity.amount}`,
          };
        }
      }

      console.log(`[FlashloanExecutor] Selected provider: ${provider.name}`);
      console.log(`  Max Loan: ${provider.maxLoan}`);
      console.log(`  Fee: ${provider.fee} bps (${provider.fee / 100}%)`);

      // Step 3: Check provider capacity
      if (opportunity.amount > provider.maxLoan) {
        return {
          success: false,
          error: `Loan amount ${opportunity.amount} exceeds provider max ${provider.maxLoan}`,
        };
      }

      // Step 4: Get Jupiter quote for the swap
      const quote = await this.getJupiterQuote(
        opportunity.inputMint,
        opportunity.outputMint,
        opportunity.amount,
        opportunity.slippageBps || 50
      );

      if (!quote) {
        return {
          success: false,
          error: 'Failed to get Jupiter quote',
        };
      }

      console.log(`[FlashloanExecutor] Jupiter quote received`);
      console.log(`  Out Amount: ${quote.outAmount}`);
      console.log(`  Price Impact: ${quote.priceImpactPct || 'N/A'}`);

      // Step 5: Calculate profitability including flashloan fee
      const profitability = this.calculateProfitability(
        opportunity.amount,
        parseInt(quote.outAmount),
        provider.fee
      );

      if (!profitability.profitable) {
        return {
          success: false,
          error: profitability.reason,
        };
      }

      console.log(`[FlashloanExecutor] Profitable! Expected: ${profitability.profit}`);

      // Step 6: Build atomic transaction
      const transaction = await this.buildFlashloanTransaction(
        provider,
        opportunity,
        quote,
        userPublicKey
      );

      if (!transaction) {
        return {
          success: false,
          error: 'Failed to build transaction',
        };
      }

      // Step 7: Simulate transaction
      console.log('[FlashloanExecutor] Simulating transaction...');
      const simulation = await this.connection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        return {
          success: false,
          error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
        };
      }

      console.log('[FlashloanExecutor] Simulation successful!');

      // Note: In production, the transaction would be signed by the user's wallet
      // and sent to the network. For API endpoint, we return the unsigned transaction
      // or the transaction data for the client to sign.
      
      // TODO: Return serialized transaction for client-side signing
      // const serializedTx = transaction.serialize({ requireAllSignatures: false });
      
      return {
        success: true,
        signature: 'SIMULATION_SUCCESS', // Simulation only - requires client-side signing
        profit: profitability.profit,
        provider: provider.name,
      };
    } catch (error) {
      console.error('[FlashloanExecutor] Execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate arbitrage opportunity
   * @param opportunity Arbitrage opportunity to validate
   * @returns Validation result
   */
  private validateOpportunity(opportunity: ArbitrageOpportunity): { valid: boolean; error?: string } {
    if (!opportunity.inputMint || !opportunity.outputMint) {
      return { valid: false, error: 'Input and output mints are required' };
    }

    if (!opportunity.amount || opportunity.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    try {
      new PublicKey(opportunity.inputMint);
      new PublicKey(opportunity.outputMint);
    } catch (error) {
      return { valid: false, error: 'Invalid mint address' };
    }

    return { valid: true };
  }

  /**
   * Get Jupiter quote for token swap
   * @param inputMint Input token mint address
   * @param outputMint Output token mint address
   * @param amount Amount to swap
   * @param slippageBps Slippage in basis points
   * @returns Jupiter quote or null
   */
  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number
  ): Promise<any> {
    try {
      const url = `${this.jupiterApiUrl}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Jupiter API error: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[FlashloanExecutor] Jupiter quote error:', error);
      return null;
    }
  }

  /**
   * Calculate profitability including flashloan fee
   * @param loanAmount Amount borrowed
   * @param outputAmount Amount received from swap
   * @param feeBps Fee in basis points
   * @returns Profitability result
   */
  private calculateProfitability(
    loanAmount: number,
    outputAmount: number,
    feeBps: number
  ): { profitable: boolean; profit: number; reason?: string } {
    // Calculate fee amount
    const feeAmount = Math.floor((loanAmount * feeBps) / 10000);
    
    // Calculate repayment amount
    const repayAmount = loanAmount + feeAmount;
    
    // Check if output > repayment
    if (outputAmount <= repayAmount) {
      return {
        profitable: false,
        profit: 0,
        reason: `Output ${outputAmount} insufficient to repay ${repayAmount}`,
      };
    }
    
    // Calculate profit
    const profit = outputAmount - repayAmount;
    
    // Check minimum profit threshold (0.1% of loan amount by default)
    // TODO: Make this configurable via constructor or environment variable
    const minProfitThreshold = 0.001; // 0.1%
    const minProfit = Math.floor(loanAmount * minProfitThreshold);
    if (profit < minProfit) {
      return {
        profitable: false,
        profit,
        reason: `Profit ${profit} below minimum threshold ${minProfit} (${minProfitThreshold * 100}%)`,
      };
    }
    
    return { profitable: true, profit };
  }

  /**
   * Build atomic flashloan transaction
   * Creates a transaction with: borrow -> swap -> repay
   * 
   * @param provider Flashloan provider
   * @param opportunity Arbitrage opportunity
   * @param quote Jupiter quote
   * @param userPublicKey User's public key
   * @returns Built transaction or null
   */
  private async buildFlashloanTransaction(
    provider: FlashloanProvider,
    opportunity: ArbitrageOpportunity,
    quote: any,
    userPublicKey: PublicKey
  ): Promise<Transaction | null> {
    try {
      const transaction = new Transaction();

      // Add compute budget instructions
      const priorityFee = await this.calculatePriorityFee();
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
        })
      );

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 400000,
        })
      );

      // IMPORTANT: Production implementation requires provider-specific SDK integration
      // Each provider has unique program interfaces for borrow/repay operations:
      // 
      // Example structure (pseudo-code):
      // 1. const borrowIx = await provider.createBorrowInstruction(amount, tokenMint);
      // 2. const swapIxs = await jupiter.getSwapInstructions(quote);
      // 3. const repayIx = await provider.createRepayInstruction(amount + fee, tokenMint);
      // 
      // transaction.add(borrowIx);
      // transaction.add(...swapIxs);
      // transaction.add(repayIx);
      //
      // This creates an atomic bundle that must all succeed or all fail

      console.log('[FlashloanExecutor] Transaction structure prepared (simulation mode)');
      console.warn('[FlashloanExecutor] WARNING: Actual borrow/repay instructions not implemented');
      console.warn('[FlashloanExecutor] Provider SDK integration required for production use');

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      return transaction;
    } catch (error) {
      console.error('[FlashloanExecutor] Build transaction error:', error);
      return null;
    }
  }

  /**
   * Calculate dynamic priority fee based on network conditions
   * @returns Priority fee in microlamports
   */
  private async calculatePriorityFee(): Promise<number> {
    try {
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (!recentFees || recentFees.length === 0) {
        return 10000; // Default: 10,000 microlamports
      }
      
      // Calculate median fee
      const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b);
      const medianFee = fees[Math.floor(fees.length / 2)] || 10000;
      
      // Apply multiplier for urgency
      const urgencyMultiplier = 2.5;
      const adjustedFee = medianFee * urgencyMultiplier;
      
      // Cap at reasonable maximum
      return Math.min(adjustedFee, 500000);
    } catch (error) {
      console.error('[FlashloanExecutor] Priority fee calculation error:', error);
      return 10000;
    }
  }

  /**
   * Get connection instance
   * @returns Solana connection
   */
  getConnection(): Connection {
    return this.connection;
  }
}
