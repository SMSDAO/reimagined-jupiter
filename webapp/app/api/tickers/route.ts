import { NextRequest, NextResponse } from 'next/server';
import { HermesClient } from '@pythnetwork/hermes-client';
import { getJupiterPriceService } from '@/lib/jupiter/price-service';

// Pyth Network price feed IDs for Solana tokens
const PYTH_PRICE_FEEDS: Record<string, string> = {
  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'USDC/USD': 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'RAY/USD': '91568baa8f0b0e6e62dc5269c7bcb6e92c5d3e0d5e1ddb645a4a79d27e3b3e25',
  'BONK/USD': '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'JUP/USD': 'g6eRCbboSwK4tSWngn773RCMexr1APQr4uA9bGZBYfo',
  'WIF/USD': '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
};

// Token mint addresses for Jupiter price fetching
const TOKEN_MINTS: Record<string, string> = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
};

interface TokenPrice {
  symbol: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
  source: string;
  metadata?: {
    priceChange24h?: number;
    volume24h?: number;
  };
}

interface TickerResponse {
  success: boolean;
  data?: {
    prices: TokenPrice[];
    timestamp: number;
    count: number;
  };
  error?: string;
  status: {
    connected: boolean;
    providerStatus: Record<string, boolean>;
  };
}

// Initialize Hermes client
const hermesClient = new HermesClient('https://hermes.pyth.network');

// Initialize connection
// const connection = new Connection(
//   process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
//   'confirmed'
// );

async function fetchPythPrices(): Promise<TokenPrice[]> {
  try {
    const priceIds = Object.values(PYTH_PRICE_FEEDS);
    const priceFeeds = await hermesClient.getLatestPriceUpdates(priceIds);

    if (!priceFeeds || !priceFeeds.parsed) {
      return [];
    }

    const prices: TokenPrice[] = [];

    for (const feed of priceFeeds.parsed) {
      const symbol = getSymbolFromPriceId(feed.id);
      if (!symbol) continue;

      const price = feed.price;
      if (!price) continue;

      const priceValue = parseInt(price.price) * Math.pow(10, price.expo);
      const confidence = parseInt(price.conf) * Math.pow(10, price.expo);

      prices.push({
        symbol: symbol.split('/')[0],
        price: priceValue,
        confidence: confidence,
        exponent: price.expo,
        publishTime: price.publish_time,
        source: 'pyth',
      });
    }

    return prices;
  } catch (error) {
    console.error('[API] Error fetching Pyth prices:', error);
    throw error;
  }
}

async function fetchJupiterPrices(symbols?: string[]): Promise<TokenPrice[]> {
  try {
    const jupiterService = getJupiterPriceService();
    
    // Determine which tokens to fetch
    let tokensToFetch = Object.keys(TOKEN_MINTS);
    if (symbols && symbols.length > 0) {
      const uppercaseSymbols = symbols.map(s => s.toUpperCase());
      tokensToFetch = tokensToFetch.filter(symbol => 
        uppercaseSymbols.includes(symbol.toUpperCase())
      );
    }
    
    const mints = tokensToFetch.map(symbol => TOKEN_MINTS[symbol]);
    const pricesMap = await jupiterService.getBulkPrices(mints);
    
    const prices: TokenPrice[] = [];
    
    pricesMap.forEach((priceData, mint) => {
      // Find the symbol for this mint
      const symbol = Object.entries(TOKEN_MINTS).find(([_sym, m]) => m === mint)?.[0];
      if (!symbol) return;
      
      prices.push({
        symbol: symbol,
        price: priceData.price,
        confidence: 0, // Jupiter doesn't provide confidence intervals
        exponent: 0,
        publishTime: Date.now(),
        source: 'jupiter',
      });
    });
    
    return prices;
  } catch (error) {
    console.error('[API] Error fetching Jupiter prices:', error);
    return [];
  }
}

function getSymbolFromPriceId(priceId: string): string | null {
  for (const [symbol, id] of Object.entries(PYTH_PRICE_FEEDS)) {
    if (id === priceId) {
      return symbol;
    }
  }
  return null;
}

async function checkProviderStatus(): Promise<Record<string, boolean>> {
  const status: Record<string, boolean> = {
    pyth: true,
    jupiter: false,
    raydium: false,
    orca: false,
    meteora: false,
  };

  try {
    // Check Pyth
    await hermesClient.getLatestPriceUpdates([PYTH_PRICE_FEEDS['SOL/USD']]);
    status.pyth = true;
  } catch {
    status.pyth = false;
  }

  // Check Jupiter using our price service
  try {
    const jupiterService = getJupiterPriceService();
    const solPrice = await jupiterService.getTokenPrice(TOKEN_MINTS['SOL']);
    status.jupiter = solPrice !== null;
  } catch {
    status.jupiter = false;
  }

  return status;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols')?.split(',');

    // Fetch prices from Pyth
    const pythPrices = await fetchPythPrices();

    // Fetch prices from Jupiter as backup/supplement
    const jupiterPrices = await fetchJupiterPrices(symbols || undefined);

    // Combine prices, preferring Pyth but including Jupiter for tokens not in Pyth
    const pricesMap = new Map<string, TokenPrice>();
    
    // Add Pyth prices first (higher priority)
    pythPrices.forEach(price => {
      pricesMap.set(price.symbol, price);
    });
    
    // Add Jupiter prices for missing tokens
    jupiterPrices.forEach(price => {
      if (!pricesMap.has(price.symbol)) {
        pricesMap.set(price.symbol, price);
      }
    });
    
    let prices = Array.from(pricesMap.values());

    // Filter by requested symbols if provided
    if (symbols && symbols.length > 0) {
      prices = prices.filter(p => 
        symbols.some(s => s.toUpperCase() === p.symbol.toUpperCase())
      );
    }

    // Check provider status
    const providerStatus = await checkProviderStatus();

    const response: TickerResponse = {
      success: true,
      data: {
        prices,
        timestamp: Date.now(),
        count: prices.length,
      },
      status: {
        connected: providerStatus.pyth,
        providerStatus,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[API] Error in /api/tickers:', error);

    const errorResponse: TickerResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: {
        connected: false,
        providerStatus: {},
      },
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  }
}
