import { NextRequest, NextResponse } from "next/server";
import { createResilientConnection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

interface WalletScoreResponse {
  success: boolean;
  score?: number;
  rank?: "beginner" | "intermediate" | "advanced" | "expert" | "whale";
  metrics?: {
    totalTransactions: number;
    successRate: number;
    profitability: number;
    activityLevel: number;
    riskScore: number;
  };
  timestamp: number;
  error?: string;
}

/**
 * Calculate wallet score based on multiple factors
 */
function calculateWalletScore(metrics: {
  totalTransactions: number;
  successRate: number;
  profitability: number;
  activityLevel: number;
  riskScore: number;
}): number {
  // Weighted scoring algorithm
  const weights = {
    transactions: 0.2,
    successRate: 0.3,
    profitability: 0.3,
    activity: 0.1,
    risk: 0.1,
  };

  // Normalize each metric to 0-100 scale
  const normalizedTransactions =
    Math.min(metrics.totalTransactions / 100, 1) * 100;
  const normalizedSuccessRate = metrics.successRate;
  const normalizedProfitability = Math.min(
    Math.max(metrics.profitability, 0),
    100,
  );
  const normalizedActivity = Math.min(metrics.activityLevel, 100);
  const normalizedRisk = 100 - metrics.riskScore; // Invert risk (lower risk = higher score)

  // Calculate weighted score
  const score =
    normalizedTransactions * weights.transactions +
    normalizedSuccessRate * weights.successRate +
    normalizedProfitability * weights.profitability +
    normalizedActivity * weights.activity +
    normalizedRisk * weights.risk;

  return Math.round(score);
}

/**
 * Determine wallet rank based on score
 */
function getWalletRank(
  score: number,
): "beginner" | "intermediate" | "advanced" | "expert" | "whale" {
  if (score >= 90) return "whale";
  if (score >= 75) return "expert";
  if (score >= 60) return "advanced";
  if (score >= 40) return "intermediate";
  return "beginner";
}

/**
 * GET /api/wallet/score
 * Calculate and return wallet score based on trading history
 *
 * Query parameters:
 * - address: Wallet address to analyze (required)
 */
export async function GET(request: NextRequest) {
  const resilientConnection = createResilientConnection();

  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address is required",
          timestamp: Date.now(),
        },
        { status: 400 },
      );
    }

    // Validate address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (_error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address",
          timestamp: Date.now(),
        },
        { status: 400 },
      );
    }

    console.log("[Wallet] Calculating score for:", address);

    const connection = resilientConnection.getConnection();

    // Fetch wallet transaction history
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: 100, // Analyze last 100 transactions
    });

    const totalTransactions = signatures.length;

    // Analyze transactions
    let successfulTxs = 0;
    let failedTxs = 0;

    for (const sig of signatures) {
      if (sig.err === null) {
        successfulTxs++;
      } else {
        failedTxs++;
      }
    }

    // Calculate success rate
    const successRate =
      totalTransactions > 0 ? (successfulTxs / totalTransactions) * 100 : 0;

    // Get account balance for profitability estimate
    const balance = await connection.getBalance(publicKey);
    const balanceSol = balance / 1e9;

    // Estimate profitability based on balance (simplified)
    // In production, you'd analyze token holdings, historical trades, etc.
    let profitability = 0;
    if (balanceSol > 100) profitability = 90;
    else if (balanceSol > 10) profitability = 70;
    else if (balanceSol > 1) profitability = 50;
    else profitability = 30;

    // Calculate activity level based on transaction frequency
    const activityLevel = Math.min((totalTransactions / 10) * 100, 100);

    // Calculate risk score based on failed transaction ratio
    const riskScore =
      totalTransactions > 0 ? (failedTxs / totalTransactions) * 100 : 50;

    // Build metrics object
    const metrics = {
      totalTransactions,
      successRate: Math.round(successRate * 100) / 100,
      profitability: Math.round(profitability * 100) / 100,
      activityLevel: Math.round(activityLevel * 100) / 100,
      riskScore: Math.round(riskScore * 100) / 100,
    };

    // Calculate overall score
    const score = calculateWalletScore(metrics);
    const rank = getWalletRank(score);

    const response: WalletScoreResponse = {
      success: true,
      score,
      rank,
      metrics,
      timestamp: Date.now(),
    };

    console.log("[Wallet] Score calculated:", {
      address,
      score,
      rank,
      totalTransactions,
      successRate: metrics.successRate,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[Wallet] Score calculation error:", error);

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
