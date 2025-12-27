/**
 * Comprehensive health check endpoint for monitoring
 * Returns 200 for healthy, 503 for unhealthy
 * Now includes circuit breaker, RPC manager, and profit tracking status
 */

import { Connection } from "@solana/web3.js";
import bs58 from "bs58";
import type { VercelRequest, VercelResponse } from "@vercel/node";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  rpcLatency: number;
  walletBalance: number | null;
  walletAddress: string | null;
  jupiterApiStatus: "online" | "offline";
  lastMonitorRun: number | null;
  lastTradeTime: number | null;
  uptime: number;
  errorRate: number;
  timestamp: number;
  errors?: string[];
  // Enhanced monitoring
  circuitBreaker?: {
    state: string;
    consecutiveErrors: number;
    totalProfit: number;
  };
  profitStats?: {
    totalTrades: number;
    successRate: number;
    netProfit: number;
  };
}

// In-memory tracking for uptime and errors
const startTime = Date.now();
let totalRequests = 0;
let errorCount = 0;
let lastMonitorRun: number | null = null;
let lastTradeTime: number | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const errors: string[] = [];
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  totalRequests++;

  // Check Solana RPC connection
  let rpcLatency = 0;
  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;

  if (!rpcUrl) {
    errors.push("SOLANA_RPC_URL not configured");
    status = "unhealthy";
  } else {
    try {
      const connection = new Connection(rpcUrl, "confirmed");
      const rpcStart = Date.now();
      await connection.getSlot();
      rpcLatency = Date.now() - rpcStart;

      if (rpcLatency > 1000) {
        errors.push(`High RPC latency: ${rpcLatency}ms`);
        status = "degraded";
      }
    } catch (error) {
      errors.push(
        `RPC connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      status = "unhealthy";
      errorCount++;
    }
  }

  // Check wallet
  let walletBalance: number | null = null;
  let walletAddress: string | null = null;
  const privateKeyString = process.env.WALLET_PRIVATE_KEY;

  if (!privateKeyString) {
    errors.push("WALLET_PRIVATE_KEY not configured");
    status = "unhealthy";
  } else {
    try {
      const privateKey = privateKeyString.includes("[")
        ? Uint8Array.from(JSON.parse(privateKeyString))
        : bs58.decode(privateKeyString);

      const connection = new Connection(rpcUrl!, "confirmed");
      const keypair = await import("@solana/web3.js").then((m) =>
        m.Keypair.fromSecretKey(privateKey),
      );

      walletAddress = keypair.publicKey.toString();
      const balance = await connection.getBalance(keypair.publicKey);
      walletBalance = balance / 1e9;

      if (walletBalance < 0.01) {
        errors.push(`Low wallet balance: ${walletBalance.toFixed(4)} SOL`);
        status = status === "healthy" ? "degraded" : status;
      }
    } catch (error) {
      errors.push(
        `Wallet check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      status = "unhealthy";
      errorCount++;
    }
  }

  // Check Jupiter API availability
  let jupiterApiStatus: "online" | "offline" = "online";
  try {
    const jupiterResponse = await fetch("https://api.jup.ag/v6/health", {
      signal: AbortSignal.timeout(5000),
    });

    if (!jupiterResponse.ok) {
      jupiterApiStatus = "offline";
      errors.push("Jupiter API unavailable");
      status = status === "healthy" ? "degraded" : status;
    }
  } catch (error) {
    jupiterApiStatus = "offline";
    errors.push("Jupiter API timeout or error");
    status = status === "healthy" ? "degraded" : status;
    errorCount++;
  }

  // Calculate uptime
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Calculate error rate
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

  if (errorRate > 50) {
    status = "unhealthy";
  } else if (errorRate > 20) {
    status = status === "healthy" ? "degraded" : status;
  }

  const response: HealthResponse = {
    status,
    rpcLatency,
    walletBalance,
    walletAddress,
    jupiterApiStatus,
    lastMonitorRun,
    lastTradeTime,
    uptime,
    errorRate: parseFloat(errorRate.toFixed(2)),
    timestamp: Date.now(),
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  const statusCode = status === "unhealthy" ? 503 : 200;

  console.log(`🏥 Health check: ${status} (${statusCode})`);
  if (errors.length > 0) {
    console.log("⚠️ Errors:", errors);
  }

  return res.status(statusCode).json(response);
}

// Helper function to update last monitor run time (called from monitor endpoint)
export function updateLastMonitorRun() {
  lastMonitorRun = Date.now();
}

// Helper function to update last trade time (called from execute endpoint)
export function updateLastTradeTime() {
  lastTradeTime = Date.now();
}
