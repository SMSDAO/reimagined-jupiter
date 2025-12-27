import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

interface SniperExecuteRequest {
  tokenMint: string;
  buyAmountSol: number;
  slippageBps: number;
  userPublicKey: string;
}

interface JupiterQuote {
  inAmount: string;
  outAmount: string;
  priceImpactPct?: string;
  [key: string]: unknown;
}

interface SniperExecuteResponse {
  success: boolean;
  quote?: JupiterQuote;
  transaction?: string;
  error?: string;
  estimatedOutput?: number;
  priceImpact?: number;
}

/**
 * POST /api/sniper/execute
 * Execute a sniper buy order using Jupiter with high priority fee
 *
 * Body:
 * - tokenMint: Target token mint address
 * - buyAmountSol: Amount of SOL to spend
 * - slippageBps: Slippage tolerance in basis points (e.g., 1000 = 10%)
 * - userPublicKey: User's wallet public key
 */
export async function POST(request: NextRequest) {
  try {
    const body: SniperExecuteRequest = await request.json();
    const { tokenMint, buyAmountSol, slippageBps, userPublicKey } = body;

    // Validate inputs
    if (!tokenMint || !buyAmountSol || !slippageBps || !userPublicKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required parameters: tokenMint, buyAmountSol, slippageBps, userPublicKey",
        },
        { status: 400 },
      );
    }

    if (buyAmountSol <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "buyAmountSol must be greater than 0",
        },
        { status: 400 },
      );
    }

    // Validate public keys
    try {
      new PublicKey(tokenMint);
      new PublicKey(userPublicKey);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid public key format",
        },
        { status: 400 },
      );
    }

    console.log("[Sniper] Executing snipe:", {
      tokenMint,
      buyAmountSol,
      slippageBps,
      userPublicKey,
    });

    // Convert SOL to lamports
    const amountInLamports = Math.floor(buyAmountSol * 1e9);

    // SOL mint address (wrapped SOL)
    const SOL_MINT = "So11111111111111111111111111111111111111112";

    // Get Jupiter API URL from environment
    const jupiterApiUrl =
      process.env.NEXT_PUBLIC_JUPITER_API_URL || "https://api.jup.ag";

    // Step 1: Get quote from Jupiter
    const quoteUrl = `${jupiterApiUrl}/v6/quote?inputMint=${SOL_MINT}&outputMint=${tokenMint}&amount=${amountInLamports}&slippageBps=${slippageBps}`;

    console.log("[Sniper] Fetching quote from Jupiter:", quoteUrl);

    const quoteResponse = await fetch(quoteUrl);

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error("[Sniper] Quote fetch failed:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to get quote from Jupiter: ${quoteResponse.statusText}`,
        },
        { status: 502 },
      );
    }

    const quote = await quoteResponse.json();

    console.log("[Sniper] Got quote:", {
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
    });

    // Calculate estimated output in tokens
    const estimatedOutput = parseInt(quote.outAmount) / 1e9;
    const priceImpact = parseFloat(quote.priceImpactPct || "0");

    // Check if price impact is too high (>5% warning)
    if (priceImpact > 5) {
      console.warn("[Sniper] High price impact detected:", priceImpact);
    }

    // Step 2: Get swap transaction with high priority fee
    const swapUrl = `${jupiterApiUrl}/v6/swap`;
    const swapPayload = {
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: "auto", // Use auto for optimal priority fee
      dynamicComputeUnitLimit: true, // Optimize compute units
    };

    console.log("[Sniper] Requesting swap transaction");

    const swapResponse = await fetch(swapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(swapPayload),
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      console.error("[Sniper] Swap transaction creation failed:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create swap transaction: ${swapResponse.statusText}`,
        },
        { status: 502 },
      );
    }

    const swapResult = await swapResponse.json();

    const response: SniperExecuteResponse = {
      success: true,
      quote,
      transaction: swapResult.swapTransaction,
      estimatedOutput,
      priceImpact,
    };

    console.log("[Sniper] Snipe prepared successfully:", {
      estimatedOutput,
      priceImpact,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Sniper] Execution error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
