/**
 * Trade executor module
 * Executes trades via Jupiter API v6 with proper error handling and retries
 */

import { 
  Connection, 
  Keypair, 
  VersionedTransaction,
  ComputeBudgetProgram,
  TransactionMessage,
} from '@solana/web3.js';
import type { Opportunity } from './scanner.js';

export interface ExecutionResult {
  success: boolean;
  signature?: string;
  profit?: number;
  gasUsed?: number;
  executionTime?: number;
  error?: string;
  retries?: number;
}

interface ExecuteOptions {
  slippage?: number; // Slippage in bps (e.g., 100 = 1%)
  priorityFee?: 'auto' | number; // Priority fee in lamports or 'auto'
  maxRetries?: number;
  timeout?: number; // Timeout in milliseconds
  computeUnits?: number; // Compute units
}

const DEFAULT_OPTIONS: ExecuteOptions = {
  slippage: 100, // 1%
  priorityFee: 'auto',
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  computeUnits: 200000,
};

/**
 * Execute a trade opportunity
 */
export async function executeTrade(
  connection: Connection,
  keypair: Keypair,
  opportunity: Opportunity,
  options: ExecuteOptions = {}
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log(`⚡ Executing ${opportunity.type} opportunity: ${opportunity.id}`);
  console.log(`   Estimated profit: ${opportunity.estimatedProfit.toFixed(4)} SOL`);
  
  try {
    // Calculate trade amount based on opportunity type
    const amount = opportunity.type === 'flash-loan' 
      ? 10 * 1e9 // 10 SOL for flash loans
      : 0.1 * 1e9; // 0.1 SOL for regular arbitrage
    
    // Execute with retries
    for (let attempt = 1; attempt <= opts.maxRetries!; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${opts.maxRetries}`);
        
        const result = await executeWithTimeout(
          connection,
          keypair,
          opportunity,
          amount,
          opts,
          opts.timeout!
        );
        
        const executionTime = Date.now() - startTime;
        
        return {
          ...result,
          executionTime,
          retries: attempt,
        };
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt === opts.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
    
    throw new Error('All retry attempts exhausted');
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Trade execution failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime,
    };
  }
}

/**
 * Execute trade with timeout
 */
async function executeWithTimeout(
  connection: Connection,
  keypair: Keypair,
  opportunity: Opportunity,
  amount: number,
  options: ExecuteOptions,
  timeoutMs: number
): Promise<ExecutionResult> {
  return Promise.race([
    executeTradeInternal(connection, keypair, opportunity, amount, options),
    new Promise<ExecutionResult>((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Internal trade execution logic
 */
async function executeTradeInternal(
  connection: Connection,
  keypair: Keypair,
  opportunity: Opportunity,
  amount: number,
  options: ExecuteOptions
): Promise<ExecutionResult> {
  // Step 1: Get Jupiter quote
  console.log('📊 Getting Jupiter quote...');
  const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
  quoteUrl.searchParams.set('inputMint', opportunity.inputToken);
  quoteUrl.searchParams.set('outputMint', opportunity.outputToken);
  quoteUrl.searchParams.set('amount', amount.toString());
  quoteUrl.searchParams.set('slippageBps', (options.slippage || 100).toString());
  
  const quoteResponse = await fetch(quoteUrl.toString());
  
  if (!quoteResponse.ok) {
    throw new Error(`Jupiter quote failed: ${quoteResponse.statusText}`);
  }
  
  const quoteData = await quoteResponse.json();
  
  console.log(`✅ Quote received: ${quoteData.outAmount} output tokens`);
  
  // Step 2: Get swap transaction
  console.log('🔨 Building swap transaction...');
  
  // Calculate priority fee
  let priorityFeeLamports: number | 'auto' = options.priorityFee || 'auto';
  
  if (priorityFeeLamports === 'auto') {
    priorityFeeLamports = await calculateDynamicPriorityFee(connection);
  }
  
  const swapRequest = {
    quoteResponse: quoteData,
    userPublicKey: keypair.publicKey.toString(),
    wrapAndUnwrapSol: true,
    prioritizationFeeLamports: priorityFeeLamports,
    dynamicComputeUnitLimit: true,
    computeUnitPriceMicroLamports: 'auto',
  };
  
  const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(swapRequest),
  });
  
  if (!swapResponse.ok) {
    throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
  }
  
  const { swapTransaction } = await swapResponse.json();
  
  // Step 3: Deserialize and sign transaction
  console.log('✍️ Signing transaction...');
  const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  
  transaction.sign([keypair]);
  
  // Step 4: Send transaction
  console.log('📤 Sending transaction...');
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 0, // We handle retries at higher level
  });
  
  console.log(`📝 Transaction signature: ${signature}`);
  
  // Step 5: Confirm transaction
  console.log('⏳ Confirming transaction...');
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  
  // Step 6: Get transaction details for gas calculation
  const txDetails = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  
  const gasUsed = txDetails?.meta?.fee || 0;
  
  console.log(`✅ Transaction confirmed!`);
  console.log(`   Gas used: ${(gasUsed / 1e9).toFixed(6)} SOL`);
  console.log(`   Net profit: ${(opportunity.estimatedProfit - gasUsed / 1e9).toFixed(6)} SOL`);
  
  return {
    success: true,
    signature,
    profit: opportunity.estimatedProfit - (gasUsed / 1e9),
    gasUsed,
  };
}

/**
 * Calculate dynamic priority fee based on network congestion
 */
async function calculateDynamicPriorityFee(connection: Connection): Promise<number> {
  try {
    // Get recent prioritization fees
    const recentFees = await connection.getRecentPrioritizationFees();
    
    if (recentFees.length === 0) {
      return 10000; // Default: 10,000 micro-lamports
    }
    
    // Calculate median fee
    const fees = recentFees
      .map(f => f.prioritizationFee)
      .filter(f => f > 0)
      .sort((a, b) => a - b);
    
    const medianFee = fees.length > 0 
      ? fees[Math.floor(fees.length / 2)]
      : 10000;
    
    // Add 50% buffer for faster inclusion
    const priorityFee = Math.ceil(medianFee * 1.5);
    
    // Cap at reasonable maximum (1 SOL = 1,000,000 micro-lamports)
    const maxFee = 100000; // 0.1 SOL max
    
    return Math.min(priorityFee, maxFee);
  } catch (error) {
    console.error('Error calculating priority fee:', error);
    return 10000; // Fallback to default
  }
}

/**
 * Build compute budget instruction
 */
function buildComputeBudgetInstructions(
  computeUnits: number,
  priorityFeeMicroLamports: number
) {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFeeMicroLamports,
    }),
  ];
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate trade execution (for testing without actual execution)
 */
export async function simulateTrade(
  connection: Connection,
  opportunity: Opportunity
): Promise<{ success: boolean; estimatedProfit: number }> {
  console.log(`🎭 Simulating trade for opportunity: ${opportunity.id}`);
  
  // In a real simulation, we would:
  // 1. Get current prices
  // 2. Validate opportunity is still profitable
  // 3. Calculate exact execution costs
  
  // For now, just validate the opportunity hasn't expired
  const age = Date.now() - opportunity.timestamp;
  if (age > 30000) { // 30 seconds
    return {
      success: false,
      estimatedProfit: 0,
    };
  }
  
  return {
    success: true,
    estimatedProfit: opportunity.estimatedProfit,
  };
}
