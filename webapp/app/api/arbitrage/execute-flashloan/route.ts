import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { createResilientConnection } from '@/lib/solana/connection';
import { FlashloanExecutor, ArbitrageOpportunity } from '@/lib/flashloan/executor';
import { FLASHLOAN_PROVIDERS } from '@/lib/flashloan/providers';

/**
 * POST /api/arbitrage/execute-flashloan
 * 
 * Execute flashloan-based arbitrage opportunity
 * 
 * Request body:
 * {
 *   "opportunity": {
 *     "inputMint": "So11111111111111111111111111111111111111112",
 *     "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *     "amount": 1000000000,
 *     "estimatedProfit": 50000,
 *     "slippageBps": 50
 *   },
 *   "walletAddress": "...",
 *   "provider": "Marginfi" // Optional, will auto-select best if not provided
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "signature": "...",
 *   "profit": 50000,
 *   "provider": "Marginfi"
 * }
 */
export async function POST(request: NextRequest) {
  let resilientConnection;
  
  try {
    const body = await request.json();
    const { opportunity, walletAddress, provider } = body;

    // Validate required fields
    if (!opportunity || !walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'opportunity and walletAddress are required',
        },
        { status: 400 }
      );
    }

    // Validate opportunity structure
    if (!opportunity.inputMint || !opportunity.outputMint || !opportunity.amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'opportunity must include inputMint, outputMint, and amount',
        },
        { status: 400 }
      );
    }

    console.log('⚡ Executing flashloan arbitrage...');
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Input: ${opportunity.inputMint}`);
    console.log(`   Output: ${opportunity.outputMint}`);
    console.log(`   Amount: ${opportunity.amount}`);
    if (provider) {
      console.log(`   Provider: ${provider}`);
    }

    // Create resilient connection
    resilientConnection = createResilientConnection();

    // Verify wallet address
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet address',
        },
        { status: 400 }
      );
    }

    // Create opportunity object
    const arbitrageOpportunity: ArbitrageOpportunity = {
      inputMint: opportunity.inputMint,
      outputMint: opportunity.outputMint,
      amount: opportunity.amount,
      estimatedProfit: opportunity.estimatedProfit || 0,
      route: opportunity.route,
      slippageBps: opportunity.slippageBps || 50,
    };

    // Create executor
    const executor = new FlashloanExecutor(
      resilientConnection.getConnection(),
      process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://quote-api.jup.ag/v6'
    );

    // Execute arbitrage
    const result = await executor.executeArbitrageWithFlashloan(
      arbitrageOpportunity,
      userPublicKey,
      provider
    );

    // Cleanup
    resilientConnection.destroy();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Execution failed',
        },
        { status: 400 }
      );
    }

    console.log('✅ Flashloan arbitrage executed successfully!');
    console.log(`   Signature: ${result.signature}`);
    console.log(`   Profit: ${result.profit}`);
    console.log(`   Provider: ${result.provider}`);

    // Return response (omit RPC endpoint in production for security)
    const response: any = {
      success: true,
      signature: result.signature,
      profit: result.profit,
      provider: result.provider,
      timestamp: Date.now(),
    };
    
    // Only include RPC endpoint in development
    if (process.env.NODE_ENV === 'development') {
      response.rpcEndpoint = resilientConnection.getCurrentEndpoint();
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Flashloan arbitrage error:', error);
    
    if (resilientConnection) {
      resilientConnection.destroy();
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Execution failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/arbitrage/execute-flashloan
 * 
 * Get available flashloan providers and their details
 * 
 * Response:
 * {
 *   "success": true,
 *   "providers": [...]
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    console.log('📋 Getting flashloan providers...');

    const providers = FLASHLOAN_PROVIDERS.map(p => ({
      name: p.name,
      programId: p.programId.toString(),
      maxLoan: p.maxLoan,
      fee: p.fee,
      feePercentage: `${p.fee / 100}%`,
    }));

    return NextResponse.json({
      success: true,
      providers,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Get providers error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get providers';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
