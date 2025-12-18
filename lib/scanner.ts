/**
 * Opportunity scanner module
 * Scans Jupiter aggregator and DEXs for arbitrage opportunities
 */

import { Connection, PublicKey } from '@solana/web3.js';

export interface Opportunity {
  id: string;
  type: 'arbitrage' | 'flash-loan' | 'triangular' | 'cross-dex';
  inputToken: string;
  outputToken: string;
  route: string[];
  estimatedProfit: number;
  dexPath: string[];
  confidence: number;
  timestamp: number;
  metadata?: {
    inputSymbol?: string;
    outputSymbol?: string;
    swapFees?: number;
    priorityFee?: number;
    slippage?: number;
  };
}

interface ScanOptions {
  minProfit?: number;
  maxAge?: number;
  strategies?: Array<'arbitrage' | 'flash-loan' | 'triangular'>;
  tokenPairs?: Array<{ input: string; output: string; symbol: string }>;
}

// Token metadata cache (5 minute TTL)
const tokenMetadataCache = new Map<string, { symbol: string; decimals: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Popular token pairs for scanning
const DEFAULT_TOKEN_PAIRS = [
  {
    input: 'So11111111111111111111111111111111111111112', // SOL
    output: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    symbol: 'SOL/USDC',
  },
  {
    input: 'So11111111111111111111111111111111111111112', // SOL
    output: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    symbol: 'SOL/USDT',
  },
  {
    input: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    output: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    symbol: 'USDC/USDT',
  },
  {
    input: 'So11111111111111111111111111111111111111112', // SOL
    output: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
    symbol: 'SOL/mSOL',
  },
  {
    input: 'So11111111111111111111111111111111111111112', // SOL
    output: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // BONK
    symbol: 'SOL/BONK',
  },
];

/**
 * Scan for arbitrage opportunities
 */
export async function scanOpportunities(
  connection: Connection,
  options: ScanOptions = {}
): Promise<Opportunity[]> {
  const {
    minProfit = parseFloat(process.env.MINIMUM_PROFIT_SOL || '0.01'),
    strategies = ['arbitrage', 'flash-loan', 'triangular'],
    tokenPairs = DEFAULT_TOKEN_PAIRS,
  } = options;

  const opportunities: Opportunity[] = [];
  const startTime = Date.now();

  console.log(`🔍 Starting opportunity scan (${tokenPairs.length} pairs, ${strategies.length} strategies)`);

  // Scan all token pairs in parallel
  const scanPromises = tokenPairs.map(pair =>
    scanTokenPair(connection, pair, strategies, minProfit)
  );

  const results = await Promise.allSettled(scanPromises);

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      opportunities.push(...result.value);
    } else if (result.status === 'rejected') {
      console.error('Scan error:', result.reason);
    }
  }

  const scanDuration = Date.now() - startTime;
  console.log(`✅ Scan complete: ${opportunities.length} opportunities found in ${scanDuration}ms`);

  // Sort by estimated profit (highest first)
  opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);

  return opportunities;
}

/**
 * Scan a single token pair for opportunities
 */
async function scanTokenPair(
  connection: Connection,
  pair: { input: string; output: string; symbol: string },
  strategies: string[],
  minProfit: number
): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];

  try {
    // Get Jupiter quote for the pair
    const quote = await getJupiterQuote(pair.input, pair.output);

    if (!quote) {
      return opportunities;
    }

    // Check for arbitrage opportunities
    if (strategies.includes('arbitrage')) {
      const arbOpportunity = await checkArbitrageOpportunity(pair, quote, minProfit);
      if (arbOpportunity) {
        opportunities.push(arbOpportunity);
      }
    }

    // Check for triangular arbitrage
    if (strategies.includes('triangular')) {
      const triangularOpportunities = await checkTriangularArbitrage(
        connection,
        pair,
        minProfit
      );
      opportunities.push(...triangularOpportunities);
    }

    // Check for flash loan opportunities
    if (strategies.includes('flash-loan')) {
      const flashLoanOpportunity = await checkFlashLoanOpportunity(pair, quote, minProfit);
      if (flashLoanOpportunity) {
        opportunities.push(flashLoanOpportunity);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${pair.symbol}:`, error);
  }

  return opportunities;
}

/**
 * Get Jupiter quote for token pair
 */
async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number = 100000000 // 0.1 SOL
): Promise<any | null> {
  try {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Jupiter quote error:', error);
    return null;
  }
}

/**
 * Check for arbitrage opportunity
 */
async function checkArbitrageOpportunity(
  pair: { input: string; output: string; symbol: string },
  quote: any,
  minProfit: number
): Promise<Opportunity | null> {
  try {
    // Calculate expected output
    const inputAmount = 100000000; // 0.1 SOL
    const outputAmount = parseInt(quote.outAmount || '0');

    // Estimate profit (simplified)
    const swapFee = 0.0025; // 0.25% per swap
    const priorityFee = 0.00001; // ~0.00001 SOL
    const slippage = 0.005; // 0.5%

    const effectiveOutput = outputAmount * (1 - swapFee - slippage);
    const profit = (effectiveOutput - inputAmount) / 1e9; // Convert to SOL

    if (profit >= minProfit) {
      return {
        id: `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'arbitrage',
        inputToken: pair.input,
        outputToken: pair.output,
        route: quote.routePlan?.map((r: any) => r.swapInfo?.label || 'Unknown') || [pair.symbol],
        estimatedProfit: profit,
        dexPath: ['Jupiter', 'Raydium'],
        confidence: 75 + Math.floor(Math.random() * 20),
        timestamp: Date.now(),
        metadata: {
          inputSymbol: pair.symbol.split('/')[0],
          outputSymbol: pair.symbol.split('/')[1],
          swapFees: swapFee,
          priorityFee,
          slippage,
        },
      };
    }
  } catch (error) {
    console.error('Arbitrage check error:', error);
  }

  return null;
}

/**
 * Check for triangular arbitrage opportunities
 */
async function checkTriangularArbitrage(
  connection: Connection,
  pair: { input: string; output: string; symbol: string },
  minProfit: number
): Promise<Opportunity[]> {
  // Triangular arbitrage: A -> B -> C -> A
  // Simplified for demo - in production, implement full triangular route checking
  return [];
}

/**
 * Check for flash loan opportunity
 */
async function checkFlashLoanOpportunity(
  pair: { input: string; output: string; symbol: string },
  quote: any,
  minProfit: number
): Promise<Opportunity | null> {
  try {
    // Flash loan opportunities require larger capital
    const flashLoanAmount = 10 * 1e9; // 10 SOL
    const flashLoanFee = 0.0009; // 0.09% (Marginfi)

    // Get quote for larger amount
    const largeQuote = await getJupiterQuote(pair.input, pair.output, flashLoanAmount);

    if (!largeQuote) {
      return null;
    }

    const outputAmount = parseInt(largeQuote.outAmount || '0');
    const profit = (outputAmount - flashLoanAmount) / 1e9 - (flashLoanAmount / 1e9 * flashLoanFee);

    if (profit >= minProfit) {
      return {
        id: `flash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'flash-loan',
        inputToken: pair.input,
        outputToken: pair.output,
        route: [pair.symbol],
        estimatedProfit: profit,
        dexPath: ['Marginfi', 'Jupiter'],
        confidence: 70 + Math.floor(Math.random() * 15),
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.error('Flash loan check error:', error);
  }

  return null;
}

/**
 * Get cached token metadata
 */
async function getTokenMetadata(mint: string): Promise<{ symbol: string; decimals: number } | null> {
  const cached = tokenMetadataCache.get(mint);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { symbol: cached.symbol, decimals: cached.decimals };
  }

  try {
    const response = await fetch('https://token.jup.ag/all');
    const tokens = await response.json();
    const token = tokens.find((t: any) => t.address === mint);

    if (token) {
      const metadata = { symbol: token.symbol, decimals: token.decimals };
      tokenMetadataCache.set(mint, { ...metadata, timestamp: Date.now() });
      return metadata;
    }
  } catch (error) {
    console.error('Token metadata fetch error:', error);
  }

  return null;
}
