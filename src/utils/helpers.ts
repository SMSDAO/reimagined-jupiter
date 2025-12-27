import { PublicKey } from "@solana/web3.js";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatTokenAmount(amount: number, decimals: number): number {
  return amount / Math.pow(10, decimals);
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function isValidPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function calculateProfit(
  initialAmount: number,
  finalAmount: number,
  fees: number[],
): number {
  const totalFees = fees.reduce((sum, fee) => sum + fee, 0);
  return finalAmount - initialAmount - totalFees;
}

export function calculateProfitPercentage(
  initialAmount: number,
  finalAmount: number,
): number {
  return ((finalAmount - initialAmount) / initialAmount) * 100;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove old timestamps outside the time window
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.timeWindow,
    );

    if (this.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = this.timeWindow - (now - oldestTimestamp);

      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }

    this.timestamps.push(Date.now());
  }
}
