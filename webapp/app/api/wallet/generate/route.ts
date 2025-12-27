/**
 * Wallet Generation API
 * Generates ephemeral wallet (returns public key only)
 * Private key generation happens client-side for security
 */

import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export async function POST(request: NextRequest) {
  try {
    // Generate new keypair server-side (for demonstration purposes)
    // In production, wallet generation should happen client-side
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);

    // WARNING: In production, private keys should NEVER be sent over the network
    // This is only for demonstration. Client should generate wallets locally.
    console.log("[Wallet API] Generated new ephemeral wallet:", publicKey);

    return NextResponse.json({
      success: true,
      publicKey,
      privateKey, // Should be removed in production
      message:
        "Wallet generated successfully. Store your private key securely!",
    });
  } catch (error) {
    console.error("[Wallet API] Error generating wallet:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate wallet",
      },
      { status: 500 },
    );
  }
}
