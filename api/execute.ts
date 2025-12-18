/**
 * Vercel serverless function for trade execution
 * Schedule: Every 30 seconds via Vercel cron
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Verify Vercel cron authorization
function isValidCronRequest(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  const userAgent = req.headers['user-agent'] || '';
  return userAgent.includes('vercel-cron') || userAgent.includes('vercel');
}

interface ExecutionResult {
  opportunityId: string;
  success: boolean;
  signature?: string;
  profit?: number;
  error?: string;
}

interface ExecuteResponse {
  success: boolean;
  tradesExecuted: number;
  successCount: number;
  failCount: number;
  totalProfit: number;
  transactions: ExecutionResult[];
  timestamp: number;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<ExecuteResponse>
) {
  console.log('⚡ Execute cron triggered');
  
  // Verify cron authorization
  if (!isValidCronRequest(req)) {
    console.warn('⚠️ Unauthorized execute request');
    return res.status(401).json({
      success: false,
      tradesExecuted: 0,
      successCount: 0,
      failCount: 0,
      totalProfit: 0,
      transactions: [],
      timestamp: Date.now(),
      error: 'Unauthorized',
    });
  }
  
  try {
    // Load wallet from environment
    const privateKeyString = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('WALLET_PRIVATE_KEY not configured');
    }
    
    let keypair: Keypair;
    try {
      // Support both base58 and array formats
      const privateKey = privateKeyString.includes('[')
        ? Uint8Array.from(JSON.parse(privateKeyString))
        : bs58.decode(privateKeyString);
      keypair = Keypair.fromSecretKey(privateKey);
      console.log('✅ Wallet loaded:', keypair.publicKey.toString());
    } catch (error) {
      throw new Error('Invalid WALLET_PRIVATE_KEY format. Use base58 string.');
    }
    
    // Connect to Solana mainnet
    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SOLANA_RPC_URL not configured');
    }
    
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Check wallet balance
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSol = balance / 1e9;
    console.log(`💰 Wallet balance: ${balanceSol.toFixed(4)} SOL`);
    
    if (balanceSol < 0.01) {
      throw new Error('Insufficient wallet balance (minimum 0.01 SOL required)');
    }
    
    // Fetch pending opportunities
    // In production, this would fetch from a database or cache
    const opportunities = await fetchPendingOpportunities();
    
    if (opportunities.length === 0) {
      console.log('ℹ️ No pending opportunities to execute');
      return res.status(200).json({
        success: true,
        tradesExecuted: 0,
        successCount: 0,
        failCount: 0,
        totalProfit: 0,
        transactions: [],
        timestamp: Date.now(),
      });
    }
    
    console.log(`📊 Found ${opportunities.length} opportunities to validate`);
    
    // Execute opportunities
    const results: ExecutionResult[] = [];
    let totalProfit = 0;
    
    for (const opp of opportunities) {
      try {
        // Validate opportunity is still profitable
        const isStillValid = await validateOpportunity(opp, connection);
        
        if (!isStillValid) {
          console.log(`⏭️ Opportunity ${opp.id} no longer valid, skipping`);
          results.push({
            opportunityId: opp.id,
            success: false,
            error: 'Opportunity expired',
          });
          continue;
        }
        
        // Execute trade via Jupiter API v6
        const result = await executeTrade(connection, keypair, opp);
        results.push(result);
        
        if (result.success && result.profit) {
          totalProfit += result.profit;
        }
      } catch (error) {
        console.error(`Error executing opportunity ${opp.id}:`, error);
        results.push({
          opportunityId: opp.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`✅ Execution complete: ${successCount} success, ${failCount} failed, ${totalProfit.toFixed(4)} SOL profit`);
    
    return res.status(200).json({
      success: true,
      tradesExecuted: results.length,
      successCount,
      failCount,
      totalProfit,
      transactions: results,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Execute error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      success: false,
      tradesExecuted: 0,
      successCount: 0,
      failCount: 0,
      totalProfit: 0,
      transactions: [],
      timestamp: Date.now(),
      error: errorMessage,
    });
  }
}

interface Opportunity {
  id: string;
  inputToken: string;
  outputToken: string;
  estimatedProfit: number;
  route: string[];
  timestamp: number;
}

/**
 * Fetch pending opportunities from monitor endpoint
 */
async function fetchPendingOpportunities(): Promise<Opportunity[]> {
  // In production, this would fetch from a database or cache
  // For now, return empty array
  return [];
}

/**
 * Validate opportunity is still profitable
 */
async function validateOpportunity(
  opp: Opportunity,
  connection: Connection
): Promise<boolean> {
  try {
    // Check if opportunity is too old (> 30 seconds)
    const age = Date.now() - opp.timestamp;
    if (age > 30000) {
      return false;
    }
    
    // In production, re-check prices via Jupiter API
    // For now, accept all recent opportunities
    return true;
  } catch (error) {
    console.error('Error validating opportunity:', error);
    return false;
  }
}

/**
 * Execute trade via Jupiter API v6
 */
async function executeTrade(
  connection: Connection,
  keypair: Keypair,
  opp: Opportunity
): Promise<ExecutionResult> {
  try {
    // Get Jupiter quote
    const jupiterApiUrl = 'https://quote-api.jup.ag/v6/quote';
    const amount = 100000000; // 0.1 SOL in lamports
    
    const quoteParams = new URLSearchParams({
      inputMint: opp.inputToken,
      outputMint: opp.outputToken,
      amount: amount.toString(),
      slippageBps: '100', // 1% slippage
    });
    
    const quoteResponse = await fetch(`${jupiterApiUrl}?${quoteParams}`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter quote failed: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: keypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: 'auto',
      }),
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
    }
    
    const { swapTransaction } = await swapResponse.json();
    
    // Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([keypair]);
    
    // Send transaction with confirmation
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    console.log(`📤 Transaction sent: ${signature}`);
    
    // Confirm transaction
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log(`✅ Transaction confirmed: ${signature}`);
    
    return {
      opportunityId: opp.id,
      success: true,
      signature,
      profit: opp.estimatedProfit,
    };
  } catch (error) {
    console.error('Error executing trade:', error);
    return {
      opportunityId: opp.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
