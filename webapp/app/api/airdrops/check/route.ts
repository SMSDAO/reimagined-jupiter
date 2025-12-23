import { NextRequest, NextResponse } from 'next/server';
import { createResilientConnection } from '@/lib/solana/connection';
import { PublicKey, Connection } from '@solana/web3.js';
import axios from 'axios';

/**
 * Check wallet for eligible airdrops across major protocols
 */
async function checkWalletAirdrops(connection: Connection, publicKey: PublicKey) {
  const airdrops: Array<{
    project: string;
    amount: number;
    token: string;
    claimable: boolean;
    claimDeadline?: number;
  }> = [];

  // Airdrop API endpoints (configurable via environment)
  const JUPITER_API = process.env.NEXT_PUBLIC_JUPITER_API || 'https://worker.jup.ag';
  const JITO_API = process.env.NEXT_PUBLIC_JITO_API || 'https://kobe.mainnet.jito.network';
  const PYTH_API = process.env.NEXT_PUBLIC_PYTH_API || 'https://api.pyth.network';

  try {
    // Check Jupiter airdrop
    try {
      const jupResponse = await axios.get(
        `${JUPITER_API}/jup-claim-proof/${publicKey.toString()}`,
        { timeout: 5000 }
      );
      
      if (jupResponse.data && jupResponse.data.amount) {
        airdrops.push({
          project: 'Jupiter',
          amount: jupResponse.data.amount / 1e6, // Convert from micro-tokens
          token: 'JUP',
          claimable: true,
        });
      }
    } catch (err) {
      // Jupiter API may not have allocation for this wallet
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.log('No Jupiter airdrop found:', errorMsg);
    }

    // Check Jito airdrop
    try {
      const jitoResponse = await axios.get(
        `${JITO_API}/api/v1/allocation/${publicKey.toString()}`,
        { timeout: 5000 }
      );
      
      if (jitoResponse.data && jitoResponse.data.amount) {
        airdrops.push({
          project: 'Jito',
          amount: jitoResponse.data.amount / 1e9,
          token: 'JTO',
          claimable: true,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.log('No Jito airdrop found:', errorMsg);
    }

    // Check Pyth airdrop (if available)
    try {
      const pythResponse = await axios.get(
        `${PYTH_API}/claim/${publicKey.toString()}`,
        { timeout: 5000 }
      );
      
      if (pythResponse.data && pythResponse.data.amount) {
        airdrops.push({
          project: 'Pyth',
          amount: pythResponse.data.amount / 1e6,
          token: 'PYTH',
          claimable: true,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.log('No Pyth airdrop found:', errorMsg);
    }

  } catch (error) {
    console.error('Error checking airdrops:', error);
  }

  return airdrops;
}

/**
 * GET /api/airdrops/check
 * 
 * Check airdrop eligibility using resilient connection
 * 
 * Query parameters:
 * - walletAddress: Wallet address to check (required)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json(
      { success: false, error: 'walletAddress is required' },
      { status: 400 }
    );
  }

  console.log('🎁 Checking airdrop eligibility...');
  console.log(`   Wallet: ${walletAddress}`);

  // Create resilient connection
  const resilientConnection = createResilientConnection();

  try {
    // Verify and get wallet info
    const pubkey = new PublicKey(walletAddress);
    const balance = await resilientConnection.getBalance(pubkey);
    
    console.log(`💰 Wallet balance: ${(balance / 1e9).toFixed(4)} SOL`);

    // Get transaction history (limited to recent)
    const signatures = await resilientConnection.executeWithRetry(
      (connection) => connection.getSignaturesForAddress(pubkey, { limit: 100 }),
      'getSignaturesForAddress'
    );

    const txCount = signatures.length;
    console.log(`📊 Recent transactions: ${txCount}`);

    // Check against actual airdrop programs using backend service
    // Note: For full functionality, import and use AirdropChecker from backend
    // This is a simplified version for API endpoint
    
    const eligibleAirdrops = await checkWalletAirdrops(
      resilientConnection.getConnection(),
      pubkey
    );

    // Cleanup
    resilientConnection.destroy();

    return NextResponse.json({
      success: true,
      walletAddress,
      balance: balance / 1e9,
      transactionCount: txCount,
      eligibleAirdrops,
      totalValue: eligibleAirdrops.reduce((sum, a) => sum + a.amount, 0),
      timestamp: Date.now(),
      rpcEndpoint: resilientConnection.getCurrentEndpoint(),
    });
  } catch (error) {
    console.error('❌ Airdrop check error:', error);
    resilientConnection.destroy();
    
    const errorMessage = error instanceof Error ? error.message : 'Check failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/airdrops/check
 * 
 * Claim an airdrop
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, airdropId } = body;

    if (!walletAddress || !airdropId) {
      return NextResponse.json(
        { success: false, error: 'walletAddress and airdropId are required' },
        { status: 400 }
      );
    }

    console.log('🎁 Claiming airdrop...');
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Airdrop ID: ${airdropId}`);

    // Create resilient connection
    const resilientConnection = createResilientConnection();

    try {
      const pubkey = new PublicKey(walletAddress);
      
      // Airdrop claiming requires client-side signing with wallet adapter
      // This endpoint validates the claim request but signing must happen client-side
      
      // Verify wallet ownership would happen here
      // In production, use wallet adapter on frontend for signing
      
      // Cleanup
      resilientConnection.destroy();

      return NextResponse.json({
        success: false,
        message: 'Airdrop claiming must be done through wallet adapter (client-side signing required)',
        airdropId,
        instructions: 'Use wallet adapter on frontend to sign and submit claim transaction',
      });
    } catch (error) {
      resilientConnection.destroy();
      throw error;
    }
  } catch (error) {
    console.error('❌ Airdrop claim error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Claim failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
