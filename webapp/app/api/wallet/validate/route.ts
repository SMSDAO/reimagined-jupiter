/**
 * Wallet Validation API
 * Validates wallet addresses and private keys
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, privateKey } = body;

    const results: any = {
      success: true,
    };

    // Validate address if provided
    if (address) {
      try {
        new PublicKey(address);
        results.addressValid = true;
        results.address = address;
      } catch {
        results.addressValid = false;
        results.addressError = "Invalid Solana address format";
      }
    }

    // Validate private key if provided (without logging it!)
    if (privateKey) {
      try {
        let secretKey: Uint8Array;

        // Try base58 format
        if (!privateKey.includes("[") && !privateKey.includes(",")) {
          secretKey = bs58.decode(privateKey);
        } else {
          // Try JSON array format
          const parsed = JSON.parse(privateKey);
          if (Array.isArray(parsed)) {
            secretKey = Uint8Array.from(parsed);
          } else {
            throw new Error("Invalid format");
          }
        }

        const keypair = Keypair.fromSecretKey(secretKey);
        results.privateKeyValid = true;
        results.derivedAddress = keypair.publicKey.toString();

        // Check if derived address matches provided address
        if (address && address !== results.derivedAddress) {
          results.addressMismatch = true;
          results.warning = "Private key does not match provided address";
        }

        // SECURITY: Never log or return the private key
        console.log("[Wallet API] Private key validation successful");
      } catch (error) {
        results.privateKeyValid = false;
        results.privateKeyError =
          "Invalid private key format. Use base58 string or [byte array]";
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Wallet API] Validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Validation failed",
      },
      { status: 400 },
    );
  }
}
