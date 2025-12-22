import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SniperConfigRequest {
  buyAmount?: number;
  slippageBps?: number;
  autoSnipe?: boolean;
  minLiquiditySOL?: number;
  maxPriceImpact?: number;
  maxPositionSize?: number;
  maxDailyVolume?: number;
  maxOpenPositions?: number;
  maxPositionPerToken?: number;
  priorityFeeLamports?: number;
  useJito?: boolean;
  blacklistedMints?: string[];
  whitelistedMints?: string[];
}

/**
 * GET /api/sniper/config
 * Get current sniper bot configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Load configuration from localStorage or environment
    // For now, return default configuration
    const config = {
      buyAmount: 0.1,
      slippageBps: 1000,
      autoSnipe: false,
      minLiquiditySOL: 1.0,
      maxPriceImpact: 0.05,
      maxPositionSize: 1.0,
      maxDailyVolume: 10.0,
      maxOpenPositions: 5,
      maxPositionPerToken: 0.5,
      blockDelayMs: 100,
      priorityFeeLamports: 5000000,
      useJito: true,
      jitoTipLamports: 1000000,
      blacklistedMints: [],
      whitelistedMints: [],
      minHolderCount: 0,
    };

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[SniperConfigAPI] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sniper/config
 * Update sniper bot configuration
 * 
 * Body: Partial<SniperConfig>
 */
export async function POST(request: NextRequest) {
  try {
    const body: SniperConfigRequest = await request.json();

    // Validate configuration
    if (body.buyAmount !== undefined && (body.buyAmount <= 0 || body.buyAmount > 10)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Buy amount must be between 0 and 10 SOL',
        },
        { status: 400 }
      );
    }

    if (body.slippageBps !== undefined && (body.slippageBps < 0 || body.slippageBps > 5000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slippage must be between 0 and 5000 bps (0-50%)',
        },
        { status: 400 }
      );
    }

    if (body.minLiquiditySOL !== undefined && body.minLiquiditySOL < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Minimum liquidity must be non-negative',
        },
        { status: 400 }
      );
    }

    if (body.maxPriceImpact !== undefined && (body.maxPriceImpact < 0 || body.maxPriceImpact > 1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Max price impact must be between 0 and 1 (0-100%)',
        },
        { status: 400 }
      );
    }

    if (body.maxPositionSize !== undefined && (body.maxPositionSize <= 0 || body.maxPositionSize > 100)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Max position size must be between 0 and 100 SOL',
        },
        { status: 400 }
      );
    }

    if (body.maxDailyVolume !== undefined && (body.maxDailyVolume <= 0 || body.maxDailyVolume > 1000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Max daily volume must be between 0 and 1000 SOL',
        },
        { status: 400 }
      );
    }

    if (body.maxOpenPositions !== undefined && (body.maxOpenPositions <= 0 || body.maxOpenPositions > 50)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Max open positions must be between 1 and 50',
        },
        { status: 400 }
      );
    }

    if (body.priorityFeeLamports !== undefined && body.priorityFeeLamports > 10_000_000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Priority fee cannot exceed 10M lamports (0.01 SOL)',
        },
        { status: 400 }
      );
    }

    console.log('[SniperConfigAPI] Updating configuration:', body);

    // In production, save configuration to database or persistent storage
    // For now, return success with updated configuration
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: body,
    });
  } catch (error) {
    console.error('[SniperConfigAPI] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
