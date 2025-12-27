import { NextRequest, NextResponse } from "next/server";
import { getSlippageManager } from "@/lib/slippage-manager";

export const dynamic = "force-dynamic";

interface SlippageCalculateRequest {
  tokenAddress: string;
  amountIn: number;
  networkCongestion?: "low" | "medium" | "high";
  priceImpact?: number;
  volatility?: number;
}

/**
 * POST /api/slippage/calculate
 * Calculate recommended slippage based on market conditions
 *
 * Body:
 * - tokenAddress: Token mint address (required)
 * - amountIn: Amount to trade (required)
 * - networkCongestion: Current network congestion level (optional)
 * - priceImpact: Expected price impact percentage (optional)
 * - volatility: Token volatility metric (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body: SlippageCalculateRequest = await request.json();
    const {
      tokenAddress,
      amountIn,
      networkCongestion,
      priceImpact,
      volatility,
    } = body;

    if (!tokenAddress || !amountIn) {
      return NextResponse.json(
        {
          success: false,
          error: "tokenAddress and amountIn are required",
        },
        { status: 400 },
      );
    }

    if (amountIn <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "amountIn must be greater than 0",
        },
        { status: 400 },
      );
    }

    console.log("[Slippage] Calculating for:", {
      tokenAddress,
      amountIn,
      networkCongestion,
      priceImpact,
    });

    const slippageManager = getSlippageManager();
    const recommendation = await slippageManager.getRecommendedSlippage({
      tokenAddress,
      amountIn,
      networkCongestion,
      priceImpact,
      volatility,
    });

    console.log("[Slippage] Recommendation:", recommendation);

    return NextResponse.json(
      {
        success: true,
        ...recommendation,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    console.error("[Slippage] Calculation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/slippage/calculate
 * Get recommended slippage via GET request
 *
 * Query parameters:
 * - tokenAddress: Token mint address (required)
 * - amountIn: Amount to trade (required)
 * - networkCongestion: Network congestion level (optional)
 * - priceImpact: Price impact percentage (optional)
 * - txType: Transaction type (swap, snipe, flashloan) for quick recommendation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenAddress = searchParams.get("tokenAddress");
    const amountIn = searchParams.get("amountIn");
    const networkCongestion = searchParams.get("networkCongestion") as
      | "low"
      | "medium"
      | "high"
      | null;
    const priceImpact = searchParams.get("priceImpact");
    const txType = searchParams.get("txType") as
      | "swap"
      | "snipe"
      | "flashloan"
      | null;

    // If txType is provided, return quick recommendation
    if (txType) {
      const slippageManager = getSlippageManager();
      const slippage = slippageManager.getSlippageByType(txType);

      return NextResponse.json(
        {
          success: true,
          slippage,
          slippageBps: Math.round(slippage * 100),
          reason: `Recommended slippage for ${txType} transactions`,
          confidence: "high",
          timestamp: Date.now(),
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    if (!tokenAddress || !amountIn) {
      return NextResponse.json(
        {
          success: false,
          error:
            "tokenAddress and amountIn are required (or provide txType for quick recommendation)",
        },
        { status: 400 },
      );
    }

    const amountInNum = parseFloat(amountIn);
    if (isNaN(amountInNum) || amountInNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "amountIn must be a valid number greater than 0",
        },
        { status: 400 },
      );
    }

    const slippageManager = getSlippageManager();
    const recommendation = await slippageManager.getRecommendedSlippage({
      tokenAddress,
      amountIn: amountInNum,
      networkCongestion: networkCongestion || undefined,
      priceImpact: priceImpact ? parseFloat(priceImpact) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        ...recommendation,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    console.error("[Slippage] Calculation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
