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

    // Validate that this is not a placeholder transaction
    if (signedTransaction === 'PLACEHOLDER_PENDING_SDK_INTEGRATION' || signedTransaction === '') {
      console.log('⚠️  SDK Integration Required');
      console.log('   This endpoint is ready but requires actual transaction building');
      console.log('   The transaction framework is in place, pending protocol SDK integration');
      
      return NextResponse.json({
        success: false,
        message: 'SDK Integration Required',
        error: 'Claim execution requires protocol-specific SDK integration',
        note: 'The transaction building framework is ready. Integrate Jupiter, Jito, Pyth, Kamino, or Marginfi SDKs to enable actual claims.',
        protocol,
        walletAddress,
        timestamp: Date.now(),
      });
    }

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

    // Get user IP address for audit logging (fraud prevention - GDPR legitimate interest)
    // Note: Ensure your proxy/load balancer properly sets these headers
    // Validate IP extraction method matches your deployment architecture
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    // X-Forwarded-For may contain multiple IPs (client, proxy1, proxy2, ...)
    // Take the first IP which is typically the original client
    const userIpAddress = forwardedFor 
      ? forwardedFor.split(',')[0].trim()
      : realIp || 'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log audit information securely (avoid exposing in production logs)
    console.log(`🔐 Claim attempt - Protocol: ${protocol}, Wallet: ${walletAddress.slice(0, 8)}...`);

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
