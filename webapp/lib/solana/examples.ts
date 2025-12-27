/**
 * Integration Examples for Resilient Solana Connection
 *
 * This file contains practical examples of how to integrate the resilient
 * connection pattern into existing Solana applications.
 */

import { createResilientConnection } from "./connection";
import { TransactionBuilder } from "./transaction-builder";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";

/**
 * Example 1: Simple SOL Transfer with Resilient Connection
 */
export async function exampleSolTransfer(
  fromKeypair: Keypair,
  toAddress: string,
  amountSOL: number,
) {
  // Create resilient connection
  const resilientConnection = createResilientConnection();
  const builder = new TransactionBuilder(resilientConnection);

  try {
    console.log("🚀 Starting SOL transfer...");

    // Create transfer instruction
    const instruction = SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports: amountSOL * 1e9,
    });

    // Build transaction with automatic priority fee
    const transaction = await builder.buildTransaction(
      [instruction],
      fromKeypair.publicKey,
      undefined, // Auto-calculate priority fee
      "medium", // Urgency level
    );

    // Execute transaction
    const result = await builder.executeTransaction(
      transaction,
      [fromKeypair],
      "confirmed",
    );

    if (result.success) {
      console.log("✅ Transfer successful!");
      console.log("   Signature:", result.signature);
      console.log("   Fee:", (result.fee! / 1e9).toFixed(6), "SOL");
      return result.signature;
    } else {
      console.error("❌ Transfer failed:", result.error);
      throw new Error(result.error);
    }
  } finally {
    // Always cleanup
    resilientConnection.destroy();
  }
}

/**
 * Example 2: Jupiter Swap Integration
 *
 * This example shows how to integrate resilient connection with Jupiter swaps
 */
export async function exampleJupiterSwap(
  walletPublicKey: PublicKey,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 100,
) {
  const resilientConnection = createResilientConnection();

  try {
    console.log("🔄 Getting Jupiter quote...");

    // Get quote from Jupiter
    const quoteResponse = await fetch(
      `https://api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`,
    );
    const quoteData = await quoteResponse.json();

    console.log("💰 Quote received:", {
      inputAmount: amount / 1e9,
      outputAmount: parseInt(quoteData.outAmount) / 1e9,
      priceImpact: quoteData.priceImpactPct,
    });

    // Get swap transaction from Jupiter
    const swapResponse = await fetch("https://api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: walletPublicKey.toString(),
        wrapAndUnwrapSol: true,
      }),
    });

    const { swapTransaction } = await swapResponse.json();

    // Note: In a real application, this transaction would be signed by the wallet
    // and then executed either client-side or via the API endpoint
    console.log("📝 Swap transaction ready");
    console.log("   Use wallet.sendTransaction() to execute");

    return {
      quote: quoteData,
      transaction: swapTransaction,
      endpoint: resilientConnection.getCurrentEndpoint(),
    };
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * Example 3: Batch Operations with Resilient Connection
 *
 * Execute multiple operations efficiently
 */
export async function exampleBatchOperations(walletAddresses: string[]) {
  const resilientConnection = createResilientConnection();

  try {
    console.log("📊 Fetching data for", walletAddresses.length, "wallets...");

    // Execute multiple operations in parallel
    const results = await Promise.all(
      walletAddresses.map(async (address) => {
        const pubkey = new PublicKey(address);

        // Each operation uses the resilient connection with automatic retry
        const [balance, signatures] = await Promise.all([
          resilientConnection.getBalance(pubkey),
          resilientConnection.executeWithRetry(
            (conn) => conn.getSignaturesForAddress(pubkey, { limit: 10 }),
            "getSignatures",
          ),
        ]);

        return {
          address,
          balance: balance / 1e9,
          recentTxCount: signatures.length,
        };
      }),
    );

    console.log("✅ Batch operations completed");
    return results;
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * Example 4: Monitoring RPC Health
 */
export async function exampleHealthMonitoring() {
  const resilientConnection = createResilientConnection({
    endpoints: [
      "https://api.mainnet-beta.solana.com",
      "https://solana-api.projectserum.com",
      "https://rpc.ankr.com/solana",
    ],
    healthCheckInterval: 10000, // Check every 10 seconds
  });

  try {
    console.log("🏥 Starting health monitoring...");

    // Check initial health
    const initialHealth = resilientConnection.getEndpointHealth();
    console.log("Initial endpoint health:");
    initialHealth.forEach((e) => {
      console.log(`  ${e.url}: ${e.isHealthy ? "✅" : "❌"}`);
    });

    // Perform some operations
    console.log("\n📊 Performing operations...");
    for (let i = 0; i < 5; i++) {
      const slot = await resilientConnection.getSlot();
      console.log(
        `  Operation ${i + 1}: Slot ${slot}, Endpoint: ${resilientConnection.getCurrentEndpoint()}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Check final health
    const finalHealth = resilientConnection.getEndpointHealth();
    console.log("\nFinal endpoint health:");
    finalHealth.forEach((e) => {
      console.log(`  ${e.url}:`);
      console.log(`    Healthy: ${e.isHealthy ? "✅" : "❌"}`);
      console.log(`    Failures: ${e.failureCount}`);
    });

    return finalHealth;
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * Example 5: Server-Side API Integration
 *
 * This example shows how to use the resilient connection in API routes
 */
export async function exampleAPIRoute(walletAddress: string) {
  const resilientConnection = createResilientConnection();

  try {
    // Verify address
    const pubkey = new PublicKey(walletAddress);

    // Get wallet data with automatic retry
    const balance = await resilientConnection.getBalance(pubkey);
    const slot = await resilientConnection.getSlot();

    // Get recent fees for network status
    const fees = await resilientConnection.getRecentPrioritizationFees();
    const avgFee =
      fees.length > 0
        ? fees.reduce((sum, f) => sum + f.prioritizationFee, 0) / fees.length
        : 0;

    return {
      success: true,
      data: {
        walletAddress,
        balance: balance / 1e9,
        currentSlot: slot,
        networkStatus: {
          averagePriorityFee: Math.round(avgFee),
          congestion:
            avgFee > 100000 ? "high" : avgFee > 10000 ? "medium" : "low",
        },
        rpcEndpoint: resilientConnection.getCurrentEndpoint(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * Example 6: Priority Fee Calculation
 */
export async function examplePriorityFees() {
  const resilientConnection = createResilientConnection();
  const builder = new TransactionBuilder(resilientConnection);

  try {
    console.log(
      "💎 Calculating priority fees for different urgency levels...\n",
    );

    const urgencies: Array<"low" | "medium" | "high" | "critical"> = [
      "low",
      "medium",
      "high",
      "critical",
    ];

    for (const urgency of urgencies) {
      const fee = await builder.calculateDynamicPriorityFee(urgency);
      const estimatedFee = (fee.microLamports * fee.computeUnitLimit) / 1e9;

      console.log(`${urgency.toUpperCase()}:`);
      console.log(
        `  Priority Fee: ${fee.microLamports.toLocaleString()} microLamports`,
      );
      console.log(
        `  Compute Limit: ${fee.computeUnitLimit.toLocaleString()} units`,
      );
      console.log(`  Est. Total Fee: ${estimatedFee.toFixed(6)} SOL\n`);
    }
  } finally {
    resilientConnection.destroy();
  }
}

/**
 * Example 7: Client-Side Transaction Execution
 *
 * This example shows how to use the resilient connection from a React component
 */
export async function exampleClientSideExecution(
  transaction: Transaction,
  connection: Connection,
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>,
) {
  try {
    console.log("🔄 Executing transaction from client...");

    // Send transaction using wallet adapter
    const signature = await sendTransaction(transaction, connection);
    console.log("📝 Transaction sent:", signature);

    // Confirm transaction
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed",
    );

    if (confirmation.value.err) {
      throw new Error("Transaction failed");
    }

    console.log("✅ Transaction confirmed:", signature);
    return signature;
  } catch (error) {
    console.error("❌ Transaction failed:", error);
    throw error;
  }
}

/**
 * Example 8: Fallback Pattern
 *
 * Demonstrates how the library handles RPC failures automatically
 */
export async function exampleFallbackBehavior() {
  const resilientConnection = createResilientConnection({
    endpoints: [
      "https://api.mainnet-beta.solana.com",
      "https://solana-api.projectserum.com",
    ],
    maxRetries: 3,
    retryDelay: 1000,
  });

  try {
    console.log("🔄 Testing fallback behavior...\n");

    // This operation will automatically:
    // 1. Try the first endpoint
    // 2. If it fails, switch to the second endpoint
    // 3. Retry with exponential backoff
    // 4. Return result or throw after all retries exhausted

    const slot = await resilientConnection.getSlot();
    console.log("✅ Successfully got slot:", slot);
    console.log("   Using endpoint:", resilientConnection.getCurrentEndpoint());

    // Check which endpoints are healthy
    const health = resilientConnection.getEndpointHealth();
    console.log("\nEndpoint health:");
    health.forEach((e) => {
      console.log(`  ${e.url}:`);
      console.log(`    Status: ${e.isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`);
      console.log(`    Failures: ${e.failureCount}`);
    });
  } finally {
    resilientConnection.destroy();
  }
}
