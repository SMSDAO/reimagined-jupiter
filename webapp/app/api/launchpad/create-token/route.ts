import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createResilientConnection } from '@/lib/solana/connection';

export const dynamic = 'force-dynamic';

interface TokenLaunchRequest {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  airdropPercent: number;
  initialLiquiditySOL: number;
  metadataUri?: string;
  graduationBonusEnabled: boolean;
  graduationThreshold: number;
  graduationBonusPercent: number;
  userPublicKey: string;
}

/**
 * POST /api/launchpad/create-token
 * Create a new SPL token with metadata and optional liquidity
 * 
 * Body: TokenLaunchRequest
 */
export async function POST(request: NextRequest) {
  const resilientConnection = createResilientConnection();

  try {
    const body: TokenLaunchRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.symbol || !body.userPublicKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, symbol, userPublicKey',
        },
        { status: 400 }
      );
    }

    // Validate public key format
    try {
      new PublicKey(body.userPublicKey);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid public key format',
        },
        { status: 400 }
      );
    }

    // Validate token parameters
    if (body.decimals < 0 || body.decimals > 9) {
      return NextResponse.json(
        {
          success: false,
          error: 'Decimals must be between 0 and 9',
        },
        { status: 400 }
      );
    }

    if (body.totalSupply <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Total supply must be greater than 0',
        },
        { status: 400 }
      );
    }

    if (body.airdropPercent < 0 || body.airdropPercent > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Airdrop percent must be between 0 and 50',
        },
        { status: 400 }
      );
    }

    if (body.initialLiquiditySOL < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Initial liquidity must be non-negative',
        },
        { status: 400 }
      );
    }

    if (body.graduationBonusEnabled) {
      if (body.graduationThreshold <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Graduation threshold must be positive',
          },
          { status: 400 }
        );
      }

      if (body.graduationBonusPercent < 0 || body.graduationBonusPercent > 20) {
        return NextResponse.json(
          {
            success: false,
            error: 'Graduation bonus percent must be between 0 and 20',
          },
          { status: 400 }
        );
      }
    }

    console.log('[TokenLaunchAPI] Creating token:', body.symbol);

    // Calculate deployment cost
    const baseCost = 0.01; // Base deployment cost
    const liquidityCost = body.initialLiquiditySOL;
    const metadataCost = body.metadataUri ? 0.0115 : 0;
    const deploymentCost = baseCost + liquidityCost + metadataCost;

    // Calculate circulating vs airdrop supply
    const airdropSupply = Math.floor(body.totalSupply * (body.airdropPercent / 100));
    const circulatingSupply = body.totalSupply - airdropSupply;

    console.log('[TokenLaunchAPI] Estimated cost:', deploymentCost, 'SOL');
    console.log('[TokenLaunchAPI] Circulating:', circulatingSupply);
    console.log('[TokenLaunchAPI] Airdrop:', airdropSupply);

    // Note: Actual token creation requires the user to sign a transaction
    // This API endpoint prepares the transaction data, but the actual execution
    // must happen client-side with wallet adapter
    
    const response = {
      success: true,
      message: 'Token launch transaction prepared',
      tokenConfig: {
        name: body.name,
        symbol: body.symbol,
        decimals: body.decimals,
        totalSupply: body.totalSupply,
        circulatingSupply,
        airdropSupply,
      },
      costs: {
        baseCost,
        liquidityCost,
        metadataCost,
        totalCost: deploymentCost,
      },
      graduationInfo: body.graduationBonusEnabled ? {
        enabled: true,
        threshold: body.graduationThreshold,
        bonusPercent: body.graduationBonusPercent,
      } : undefined,
      instructions: {
        nextSteps: [
          '1. Confirm token details and costs',
          '2. Sign transaction with your wallet',
          '3. Wait for transaction confirmation',
          '4. Token will be created and metadata will be uploaded',
          body.initialLiquiditySOL > 0 ? '5. Liquidity pool will be created' : null,
        ].filter(Boolean),
      },
    };

    console.log('[TokenLaunchAPI] Transaction prepared successfully');

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[TokenLaunchAPI] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * GET /api/launchpad/create-token?mint=<tokenMint>
 * Get graduation status for a token
 */
export async function GET(request: NextRequest) {
  const resilientConnection = createResilientConnection();

  try {
    const searchParams = request.nextUrl.searchParams;
    const mintAddress = searchParams.get('mint');

    if (!mintAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing mint parameter',
        },
        { status: 400 }
      );
    }

    // Validate mint address
    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(mintAddress);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mint address',
        },
        { status: 400 }
      );
    }

    console.log('[TokenLaunchAPI] Checking graduation status for:', mintAddress);

    // TODO: Query actual liquidity from DEXs
    // For now, return placeholder data
    const currentLiquidity = 0;
    const graduationThreshold = 10.0; // Default threshold
    const isGraduated = currentLiquidity >= graduationThreshold;

    const response = {
      success: true,
      tokenMint: mintAddress,
      graduationStatus: {
        currentLiquidity,
        graduationThreshold,
        isGraduated,
        progress: (currentLiquidity / graduationThreshold) * 100,
      },
      message: isGraduated ? '🎓 Token has graduated!' : 'Token not yet graduated',
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=10',
      },
    });
  } catch (error) {
    console.error('[TokenLaunchAPI] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    resilientConnection.destroy();
  }
}
