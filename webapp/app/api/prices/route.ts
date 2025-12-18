import { NextRequest, NextResponse } from 'next/server';
import { getJupiterPriceService } from '@/lib/jupiter/price-service';

export const dynamic = 'force-dynamic';

interface PriceAPIResponse {
  success: boolean;
  data?: {
    prices: Record<string, {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number;
      timeTaken: number;
    }>;
    timestamp: number;
  };
  error?: string;
}

/**
 * GET /api/prices
 * Fetch token prices from Jupiter Price API
 * 
 * Query parameters:
 * - ids: Comma-separated list of token mint addresses (required)
 * - vsToken: Quote token address (optional, defaults to USDC)
 * 
 * Example: /api/prices?ids=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ids = searchParams.get('ids');
    const vsToken = searchParams.get('vsToken');

    if (!ids) {
      const errorResponse: PriceAPIResponse = {
        success: false,
        error: 'Missing required parameter: ids',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const tokenIds = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);

    if (tokenIds.length === 0) {
      const errorResponse: PriceAPIResponse = {
        success: false,
        error: 'No valid token IDs provided',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const service = getJupiterPriceService();
    const pricesMap = await service.getBulkPrices(
      tokenIds,
      vsToken || undefined
    );

    const prices: Record<string, {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number;
      timeTaken: number;
    }> = {};
    pricesMap.forEach((priceData, tokenId) => {
      prices[tokenId] = {
        id: priceData.id,
        mintSymbol: priceData.mintSymbol,
        vsToken: priceData.vsToken,
        vsTokenSymbol: priceData.vsTokenSymbol,
        price: priceData.price,
        timeTaken: priceData.timeTaken,
      };
    });

    const response: PriceAPIResponse = {
      success: true,
      data: {
        prices,
        timestamp: Date.now(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[API] Error in /api/prices:', error);

    const errorResponse: PriceAPIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
