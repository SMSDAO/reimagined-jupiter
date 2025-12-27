import { NextRequest, NextResponse } from "next/server";
import { createResilientConnection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

/**
 * GET /api/airdrops/check
 *
 * Check airdrop eligibility using resilient connection
 *
 * Query parameters:
 * - walletAddress: Wallet address to check (required)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { success: false, error: "walletAddress is required" },
      { status: 400 },
    );
  }

  console.log("🎁 Checking airdrop eligibility...");
  console.log(`   Wallet: ${walletAddress}`);

  // Create resilient connection
  const resilientConnection = createResilientConnection();

  try {
    // Verify and get wallet info
    const pubkey = new PublicKey(walletAddress);
    const balance = await resilientConnection.getBalance(pubkey);

    console.log(`💰 Wallet balance: ${(balance / 1e9).toFixed(4)} SOL`);

    // Get transaction history (limited to recent)
    const signatures = await resilientConnection.executeWithRetry(
      (connection) =>
        connection.getSignaturesForAddress(pubkey, { limit: 100 }),
      "getSignaturesForAddress",
    );

    const txCount = signatures.length;
    console.log(`📊 Recent transactions: ${txCount}`);

    // TODO: Implement actual airdrop checking logic
    // This would check against various airdrop programs:
    // - Jupiter, Jito, Pyth, etc.
    // - Calculate eligibility based on wallet activity
    // - Check for unclaimed tokens

    const eligibleAirdrops = [
      {
        project: "Example Project",
        amount: 100,
        token: "EXAMPLE",
        claimable: true,
        claimDeadline: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    ];

    // Cleanup
    resilientConnection.destroy();

    return NextResponse.json({
      success: true,
      walletAddress,
      balance: balance / 1e9,
      transactionCount: txCount,
      eligibleAirdrops,
      totalValue: eligibleAirdrops.reduce((sum, a) => sum + a.amount, 0),
      timestamp: Date.now(),
      rpcEndpoint: resilientConnection.getCurrentEndpoint(),
    });
  } catch (error) {
    console.error("❌ Airdrop check error:", error);
    resilientConnection.destroy();

    const errorMessage =
      error instanceof Error ? error.message : "Check failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * POST /api/airdrops/check
 *
 * Claim an airdrop
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, airdropId } = body;

    if (!walletAddress || !airdropId) {
      return NextResponse.json(
        { success: false, error: "walletAddress and airdropId are required" },
        { status: 400 },
      );
    }

    console.log("🎁 Claiming airdrop...");
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Airdrop ID: ${airdropId}`);

    // Create resilient connection
    const resilientConnection = createResilientConnection();

    try {
      const pubkey = new PublicKey(walletAddress);

      // TODO: Implement actual airdrop claim logic
      // This would:
      // 1. Verify eligibility
      // 2. Build claim transaction
      // 3. Execute via resilient connection
      // 4. Return claim signature

      // Cleanup
      resilientConnection.destroy();

      return NextResponse.json({
        success: true,
        message: "Airdrop claim not yet implemented",
        airdropId,
      });
    } catch (error) {
      resilientConnection.destroy();
      throw error;
    }
  } catch (error) {
    console.error("❌ Airdrop claim error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Claim failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
