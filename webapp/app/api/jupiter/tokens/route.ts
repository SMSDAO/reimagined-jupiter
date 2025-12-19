import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    coingeckoId?: string;
  };
}

interface TokenListResponse {
  success: boolean;
  tokens?: JupiterToken[];
  count?: number;
  timestamp: number;
  error?: string;
}

// Cache for token list
let tokenListCache: {
  data: JupiterToken[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * GET /api/jupiter/tokens
 * Fetch token list from Jupiter with caching
 * 
 * Query parameters:
 * - search: Optional search term to filter tokens
 * - limit: Maximum number of tokens to return (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '100');

    // Check if we have valid cached data
    if (tokenListCache && Date.now() - tokenListCache.timestamp < CACHE_DURATION) {
      console.log('[Jupiter] Using cached token list');
      
      let tokens = tokenListCache.data;
      
      // Apply search filter if provided
      if (searchTerm) {
        tokens = tokens.filter(
          (token) =>
            token.symbol.toLowerCase().includes(searchTerm) ||
            token.name.toLowerCase().includes(searchTerm) ||
            token.address.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply limit
      tokens = tokens.slice(0, limit);
      
      const response: TokenListResponse = {
        success: true,
        tokens,
        count: tokens.length,
        timestamp: Date.now(),
      };
      
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Fetch fresh token list from Jupiter
    console.log('[Jupiter] Fetching token list from Jupiter API');
    
    // Jupiter token list endpoint
    const tokenListUrl = 'https://token.jup.ag/all';
    
    const fetchResponse = await fetch(tokenListUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch token list: ${fetchResponse.statusText}`);
    }

    const tokens: JupiterToken[] = await fetchResponse.json();
    
    console.log(`[Jupiter] Fetched ${tokens.length} tokens`);

    // Update cache
    tokenListCache = {
      data: tokens,
      timestamp: Date.now(),
    };

    // Apply search filter if provided
    let filteredTokens = tokens;
    if (searchTerm) {
      filteredTokens = tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(searchTerm) ||
          token.name.toLowerCase().includes(searchTerm) ||
          token.address.toLowerCase().includes(searchTerm)
      );
    }

    // Apply limit
    filteredTokens = filteredTokens.slice(0, limit);

    const response: TokenListResponse = {
      success: true,
      tokens: filteredTokens,
      count: filteredTokens.length,
      timestamp: Date.now(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('[Jupiter] Token list fetch error:', error);
    
    const errorResponse: TokenListResponse = {
      success: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/jupiter/tokens/[address]
 * Get details for a specific token by address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token address is required',
        },
        { status: 400 }
      );
    }

    // Use cached data if available
    let tokens: JupiterToken[] = [];
    
    if (tokenListCache && Date.now() - tokenListCache.timestamp < CACHE_DURATION) {
      tokens = tokenListCache.data;
    } else {
      // Fetch fresh data
      const tokenListUrl = 'https://token.jup.ag/all';
      const fetchResponse = await fetch(tokenListUrl);
      
      if (!fetchResponse.ok) {
        throw new Error(`Failed to fetch token list: ${fetchResponse.statusText}`);
      }
      
      tokens = await fetchResponse.json();
      
      // Update cache
      tokenListCache = {
        data: tokens,
        timestamp: Date.now(),
      };
    }

    // Find token by address
    const token = tokens.find((t) => t.address === address);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      token,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Jupiter] Token details fetch error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
