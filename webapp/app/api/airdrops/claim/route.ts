import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/airdrops/claim
 * 
 * Claim a single airdrop
 * 
 * Body:
 * - protocol: Protocol name (required)
 * - walletAddress: Wallet address (required)
 * - signedTransaction: Base64 encoded signed transaction (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { protocol, walletAddress, signedTransaction } = body;

    if (!protocol || !walletAddress || !signedTransaction) {
      return NextResponse.json(
        { success: false, error: 'protocol, walletAddress, and signedTransaction are required' },
        { status: 400 }
      );
    }

    console.log('🎁 Processing airdrop claim...');
    console.log(`   Protocol: ${protocol}`);
    console.log(`   Wallet: ${walletAddress}`);

    // In a production environment, this endpoint would:
    // 1. Validate the signed transaction
    // 2. Verify eligibility from database/on-chain
    // 3. Send the transaction to the network
    // 4. Wait for confirmation
    // 5. Log the result in database
    // 6. Handle donation transaction
    
    // For now, return a structured response indicating implementation is needed
    console.log('⚠️  Claim execution requires client-side transaction signing');
    console.log('   The transaction should be built and signed on the client');
    console.log('   This endpoint can be used to log the claim attempt');

    // Get user IP and User-Agent for audit logging
    const userIpAddress = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(`   IP: ${userIpAddress}, UA: ${userAgent.substring(0, 50)}...`);

    return NextResponse.json({
      success: false,
      message: 'Claim endpoint ready - requires client-side transaction signing',
      note: 'Build and sign the claim transaction on the client, then submit the signed transaction',
      recommendation: 'Use @solana/wallet-adapter for transaction signing in the browser',
      protocol,
      walletAddress,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Airdrop claim error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Claim failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
