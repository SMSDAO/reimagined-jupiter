import { NextRequest, NextResponse } from 'next/server';
import { createResilientConnection } from '@/lib/solana/connection';

// Constants
const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

// Test amounts in lamports/smallest unit
const TEST_AMOUNT_SOL = 1_000_000_000; // 1 SOL
const TEST_AMOUNT_STABLECOIN = 100_000_000; // 100 USDC (6 decimals)

// Fee structure: 0.3% swap fees + 0.1% flash loan fee = 0.4% total
const TOTAL_FEE_PERCENTAGE = 0.4;

// Jupiter API response types
interface JupiterRoutePlan {
  swapInfo?: {
    label?: string;
  };
}

interface ArbitrageOpportunity {
  id: string;
  inputMint: string;
  outputMint: string;
  inputSymbol: string;
  outputSymbol: string;
  profitPercentage: number;
  estimatedProfit: number;
  route: string[];
  priceImpact: number;
  timestamp: number;
}

/**
 * GET /api/arbitrage/scan
 * 
 * Scan for arbitrage opportunities using Jupiter v6 API
 * 
 * Query parameters:
 * - minProfit: Minimum profit threshold in % (optional, default: 0.5)
 * - tokens: Comma-separated token symbols (optional, default: SOL,USDC,USDT)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const minProfit = parseFloat(searchParams.get('minProfit') || '0.5');
  const tokensParam = searchParams.get('tokens') || 'SOL,USDC,USDT';
  const tokens = tokensParam.split(',').map(t => t.trim().toUpperCase());

  console.log('🔍 Scanning for arbitrage opportunities...');
  console.log(`   Tokens: ${tokens.join(', ')}`);
  console.log(`   Min Profit: ${minProfit}%`);

  // Create resilient connection
  const resilientConnection = createResilientConnection();

  try {
    // Get current slot to verify connection
    const slot = await resilientConnection.getSlot();
    console.log(`✅ Connected to Solana, current slot: ${slot}`);

    const opportunities: ArbitrageOpportunity[] = [];

    // Scan token pairs for arbitrage opportunities
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const tokenA = tokens[i];
        const tokenB = tokens[j];

        if (!TOKEN_MINTS[tokenA] || !TOKEN_MINTS[tokenB]) {
          console.log(`⚠️  Skipping ${tokenA}-${tokenB}: unknown token`);
          continue;
        }

        try {
          // Check arbitrage opportunity: A -> B -> A
          const opportunity = await checkArbitrageOpportunity(
            TOKEN_MINTS[tokenA],
            TOKEN_MINTS[tokenB],
            tokenA,
            tokenB
          );

          if (opportunity && opportunity.profitPercentage >= minProfit) {
            opportunities.push(opportunity);
            console.log(`✅ Found opportunity: ${tokenA}-${tokenB} (${opportunity.profitPercentage.toFixed(2)}% profit)`);
          }
        } catch (error) {
          console.error(`❌ Error checking ${tokenA}-${tokenB}:`, error);
        }
      }
    }

    // Cleanup
    resilientConnection.destroy();

    return NextResponse.json({
      success: true,
      opportunities: opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage),
      count: opportunities.length,
      timestamp: Date.now(),
      rpcEndpoint: resilientConnection.getCurrentEndpoint(),
    });
  } catch (error) {
    console.error('❌ Arbitrage scan error:', error);
    resilientConnection.destroy();
    
    const errorMessage = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Check arbitrage opportunity between two tokens using Jupiter v6
 */
async function checkArbitrageOpportunity(
  inputMint: string,
  outputMint: string,
  inputSymbol: string,
  outputSymbol: string
): Promise<ArbitrageOpportunity | null> {
  const jupiterApiUrl = process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://quote-api.jup.ag';
  const jupiterQuoteUrl = `${jupiterApiUrl}/v6`;
  
  // Amount to test (1 SOL or 100 stablecoins)
  const testAmount = inputSymbol === 'SOL' ? TEST_AMOUNT_SOL : TEST_AMOUNT_STABLECOIN;

  try {
    // Step 1: Get quote for A -> B
    const quote1Response = await fetch(
      `${jupiterQuoteUrl}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${testAmount}&slippageBps=50`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!quote1Response.ok) {
      return null;
    }

    const quote1 = await quote1Response.json();
    const intermediateAmount = parseInt(quote1.outAmount);

    // Step 2: Get quote for B -> A
    const quote2Response = await fetch(
      `${jupiterQuoteUrl}/quote?inputMint=${outputMint}&outputMint=${inputMint}&amount=${intermediateAmount}&slippageBps=50`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!quote2Response.ok) {
      return null;
    }

    const quote2 = await quote2Response.json();
    const finalAmount = parseInt(quote2.outAmount);

    // Calculate profit
    const profit = finalAmount - testAmount;
    const profitPercentage = (profit / testAmount) * 100;

    // Account for fees
    const adjustedProfitPercentage = profitPercentage - TOTAL_FEE_PERCENTAGE;

    if (adjustedProfitPercentage <= 0) {
      return null;
    }

    // Extract route information
    const route1 = quote1.routePlan?.map((r: JupiterRoutePlan) => r.swapInfo?.label || 'Unknown') || [];
    const route2 = quote2.routePlan?.map((r: JupiterRoutePlan) => r.swapInfo?.label || 'Unknown') || [];
    const route = [...route1, ...route2];

    // Calculate price impact
    const priceImpact1 = parseFloat(quote1.priceImpactPct || '0');
    const priceImpact2 = parseFloat(quote2.priceImpactPct || '0');
    const totalPriceImpact = Math.abs(priceImpact1) + Math.abs(priceImpact2);

    return {
      id: `${inputSymbol}-${outputSymbol}-${Date.now()}`,
      inputMint,
      outputMint,
      inputSymbol,
      outputSymbol,
      profitPercentage: parseFloat(adjustedProfitPercentage.toFixed(4)),
      estimatedProfit: profit / 1_000_000_000, // Convert to SOL
      route,
      priceImpact: parseFloat(totalPriceImpact.toFixed(4)),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error checking arbitrage for ${inputSymbol}-${outputSymbol}:`, error);
    return null;
  }
}

/**
 * POST /api/arbitrage/scan
 * 
 * Scan for arbitrage opportunities with POST request body
 * 
 * Body parameters:
 * - minProfit: Minimum profit threshold in % (optional, default: 0.5)
 * - tokens: Array of token symbols (optional, default: ['SOL', 'USDC', 'USDT'])
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const minProfit = parseFloat(body.minProfit || '0.5');
    const tokens = (body.tokens || ['SOL', 'USDC', 'USDT']).map((t: string) => t.toUpperCase());

    console.log('🔍 POST: Scanning for arbitrage opportunities...');
    console.log(`   Tokens: ${tokens.join(', ')}`);
    console.log(`   Min Profit: ${minProfit}%`);

    // Create resilient connection
    const resilientConnection = createResilientConnection();

    try {
      // Get current slot to verify connection
      const slot = await resilientConnection.getSlot();
      console.log(`✅ Connected to Solana, current slot: ${slot}`);

      const opportunities: ArbitrageOpportunity[] = [];

      // Scan token pairs for arbitrage opportunities
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = tokens[i];
          const tokenB = tokens[j];

          if (!TOKEN_MINTS[tokenA] || !TOKEN_MINTS[tokenB]) {
            console.log(`⚠️  Skipping ${tokenA}-${tokenB}: unknown token`);
            continue;
          }

          try {
            // Check arbitrage opportunity: A -> B -> A
            const opportunity = await checkArbitrageOpportunity(
              TOKEN_MINTS[tokenA],
              TOKEN_MINTS[tokenB],
              tokenA,
              tokenB
            );

            if (opportunity && opportunity.profitPercentage >= minProfit) {
              opportunities.push(opportunity);
              console.log(`✅ Found opportunity: ${tokenA}-${tokenB} (${opportunity.profitPercentage.toFixed(2)}% profit)`);
            }
          } catch (error) {
            console.error(`❌ Error checking ${tokenA}-${tokenB}:`, error);
          }
        }
      }

      // Cleanup
      resilientConnection.destroy();

      return NextResponse.json({
        success: true,
        opportunities: opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage),
        count: opportunities.length,
        timestamp: Date.now(),
        rpcEndpoint: resilientConnection.getCurrentEndpoint(),
      });
    } catch (error) {
      resilientConnection.destroy();
      throw error;
    }
  } catch (error) {
    console.error('❌ Arbitrage scan error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
