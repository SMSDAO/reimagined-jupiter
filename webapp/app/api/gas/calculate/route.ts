import { NextRequest, NextResponse } from "next/server";
import { createResilientConnection } from "@/lib/solana/connection";

export const dynamic = "force-dynamic";

interface GasCalculationResponse {
  success: boolean;
  priorityFee?: number;
  computeUnits?: number;
  totalFee?: number;
  networkCongestion?: "low" | "medium" | "high";
  recommendedSlippage?: number;
  timestamp: number;
  error?: string;
}

/**
 * GET /api/gas/calculate
 * Calculate dynamic gas fees based on current network conditions
 *
 * Query parameters:
 * - txType: Transaction type (swap, transfer, custom) - affects compute unit estimate
 */
export async function GET(request: NextRequest) {
  const resilientConnection = createResilientConnection();

  try {
    const searchParams = request.nextUrl.searchParams;
    const txType = searchParams.get("txType") || "swap";

    console.log("[Gas] Calculating dynamic gas for transaction type:", txType);

    // Get recent prioritization fees from the network
    const recentFees = await resilientConnection.getRecentPrioritizationFees();

    if (!recentFees || recentFees.length === 0) {
      console.warn("[Gas] No recent prioritization fees available");

      // Return default values if no data available
      return NextResponse.json({
        success: true,
        priorityFee: 5000, // Default: 5,000 micro-lamports
        computeUnits: 200000, // Default for swap
        totalFee: 1000000, // ~0.001 SOL
        networkCongestion: "medium",
        recommendedSlippage: 1, // 1%
        timestamp: Date.now(),
      });
    }

    // Calculate statistics from recent fees
    const fees = recentFees
      .map((fee) => fee.prioritizationFee)
      .filter((fee) => fee > 0)
      .sort((a, b) => a - b);

    // Calculate percentiles
    const p50 = fees[Math.floor(fees.length * 0.5)] || 0;
    const p75 = fees[Math.floor(fees.length * 0.75)] || 0;
    const p90 = fees[Math.floor(fees.length * 0.9)] || 0;
    const max = fees[fees.length - 1] || 0;

    // Determine network congestion based on fee distribution
    let networkCongestion: "low" | "medium" | "high" = "medium";
    let recommendedSlippage = 1; // Default 1%
    let priorityFee = p75; // Use 75th percentile for reliable confirmation

    if (max > 100000) {
      // Very high fees indicate high congestion
      networkCongestion = "high";
      priorityFee = p90; // Use 90th percentile for faster confirmation
      recommendedSlippage = 2; // 2% slippage for high volatility
    } else if (max < 10000) {
      // Low fees indicate low congestion
      networkCongestion = "low";
      priorityFee = p50; // Median is sufficient
      recommendedSlippage = 0.5; // 0.5% slippage for low volatility
    }

    // Ensure minimum priority fee
    priorityFee = Math.max(priorityFee, 1000); // Minimum 1,000 micro-lamports

    // Estimate compute units based on transaction type
    let computeUnits = 200000; // Default for swap
    switch (txType.toLowerCase()) {
      case "transfer":
        computeUnits = 50000;
        break;
      case "swap":
        computeUnits = 200000;
        break;
      case "snipe":
        computeUnits = 300000; // Higher for complex sniper transactions
        break;
      case "flashloan":
        computeUnits = 400000; // Highest for flash loan arbitrage
        break;
      default:
        computeUnits = 200000;
    }

    // Calculate total fee: (compute units * priority fee) / 1,000,000
    const totalFee = Math.ceil((computeUnits * priorityFee) / 1000000);

    const response: GasCalculationResponse = {
      success: true,
      priorityFee,
      computeUnits,
      totalFee,
      networkCongestion,
      recommendedSlippage,
      timestamp: Date.now(),
    };

    console.log("[Gas] Calculated gas:", {
      priorityFee,
      computeUnits,
      totalFee,
      networkCongestion,
      p50,
      p75,
      p90,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("[Gas] Calculation error:", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * POST /api/gas/calculate
 * Calculate gas for a specific transaction
 */
export async function POST(request: NextRequest) {
  const resilientConnection = createResilientConnection();

  try {
    const body = await request.json();
    const { transaction, txType = "custom" } = body;

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction data is required",
        },
        { status: 400 },
      );
    }

    console.log("[Gas] Simulating transaction for gas estimation");

    // In a real implementation, you would:
    // 1. Deserialize the transaction
    // 2. Simulate it to get actual compute units used
    // 3. Add priority fee based on network conditions
    // 4. Return precise gas estimate

    // For now, use the GET endpoint logic
    const getResponse = await GET(
      new NextRequest(
        new URL(`/api/gas/calculate?txType=${txType}`, request.url),
      ),
    );

    return getResponse;
  } catch (error) {
    console.error("[Gas] Transaction simulation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    resilientConnection.destroy();
  }
}
