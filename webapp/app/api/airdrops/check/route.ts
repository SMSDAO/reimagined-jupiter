import { NextRequest, NextResponse } from 'next/server';
import { createResilientConnection } from '@/lib/solana/connection';
import { PublicKey, Connection } from '@solana/web3.js';
import { AirdropChecker } from '@/../../src/services/airdropChecker';

/**
 * GET /api/airdrops/check
 * 
 * Check airdrop eligibility using resilient connection and AirdropChecker service
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
    // Verify wallet address
    const pubkey = new PublicKey(walletAddress);
    
    // Create AirdropChecker instance
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    const airdropChecker = new AirdropChecker(connection, pubkey);
    
    // Check all airdrops
    console.log('🔍 Checking eligibility across all protocols...');
    const airdrops = await airdropChecker.checkAllAirdrops();
    
    console.log(`✅ Found ${airdrops.length} eligible airdrops`);
    
    // Format response
    const formattedAirdrops = airdrops.map(airdrop => ({
      protocol: airdrop.protocol,
      tokenMint: airdrop.tokenMint,
      amount: airdrop.amount,
      claimable: airdrop.claimable,
      claimed: airdrop.claimed,
      claimDeadline: airdrop.claimDeadline?.toISOString(),
      claimStartTime: airdrop.claimStartTime?.toISOString(),
      onChainVerified: airdrop.onChainVerified,
      eligibilityReason: airdrop.eligibilityReason,
      hasMerkleProof: !!airdrop.merkleProof,
    }));
    
    // Calculate total claimable value (would need price data for accurate USD value)
    const claimableCount = formattedAirdrops.filter(a => a.claimable && !a.claimed).length;

    // Cleanup
    resilientConnection.destroy();

    return NextResponse.json({
      success: true,
      walletAddress,
      airdrops: formattedAirdrops,
      claimableCount,
      totalAirdrops: airdrops.length,
      timestamp: Date.now(),
      rpcEndpoint: resilientConnection.getCurrentEndpoint(),
      note: 'Eligibility checked using live on-chain data and cached results',
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
