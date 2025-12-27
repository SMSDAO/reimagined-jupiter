import { NextRequest, NextResponse } from "next/server";
import { createResilientConnection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

interface PoolInfoRequest {
  poolAddress: string;
  dex?: string;
}

interface PoolInfoResponse {
  success: boolean;
  pool?: {
    address: string;
    dex: string;
    tokenA: string;
    tokenB: string;
    liquidity?: number;
    volume24h?: number;
    fee?: number;
    isActive: boolean;
    timestamp: number;
  };
  error?: string;
}

/**
 * POST /api/pools/info
 * Get detailed information about a liquidity pool
 *
 * Body:
 * - poolAddress: Pool public key (required)
 * - dex: DEX name for optimized parsing (optional)
 */
export async function POST(request: NextRequest) {
  const resilientConnection = createResilientConnection();

  try {
    const body: PoolInfoRequest = await request.json();
    const { poolAddress, dex } = body;

    if (!poolAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Pool address is required",
        },
        { status: 400 },
      );
    }

    // Validate pool address
    let poolPubkey: PublicKey;
    try {
      poolPubkey = new PublicKey(poolAddress);
    } catch (_error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pool address",
        },
        { status: 400 },
      );
    }

    console.log("[PoolInfo] Fetching info for pool:", poolAddress, "DEX:", dex);

    const connection = resilientConnection.getConnection();

    // Fetch pool account data
    const accountInfo = await connection.getAccountInfo(poolPubkey);

    if (!accountInfo) {
      return NextResponse.json(
        {
          success: false,
          error: "Pool not found",
        },
        { status: 404 },
      );
    }

    // Parse pool data based on DEX
    // Note: In production, you'd implement proper parsers for each DEX
    // This is a simplified implementation

    const isActive = accountInfo.lamports > 0;

    // For demonstration, return basic pool information
    // Real implementation would parse the account data based on DEX program structure
    const poolInfo = {
      address: poolAddress,
      dex: dex || "unknown",
      tokenA: "So11111111111111111111111111111111111111112", // SOL (example)
      tokenB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC (example)
      liquidity: accountInfo.lamports / 1e9,
      volume24h: 0, // Would need to fetch from DEX analytics
      fee: 0.003, // 0.3% typical for AMM pools
      isActive,
      timestamp: Date.now(),
    };

    const response: PoolInfoResponse = {
      success: true,
      pool: poolInfo,
    };

    console.log("[PoolInfo] Pool info retrieved:", {
      address: poolAddress,
      isActive,
      liquidity: poolInfo.liquidity,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[PoolInfo] Error fetching pool info:", error);

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

/**
 * GET /api/pools/info?address=...
 * Get pool info via GET request
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const poolAddress = searchParams.get("address");
  const dex = searchParams.get("dex");

  if (!poolAddress) {
    return NextResponse.json(
      {
        success: false,
        error: "Pool address is required",
      },
      { status: 400 },
    );
  }

  // Create a POST request body and call POST handler
  const postRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ poolAddress, dex }),
  });

  return POST(postRequest);
}
