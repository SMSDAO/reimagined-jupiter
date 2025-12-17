/**
 * Wallet utilities for scoring, analysis, and operations
 */

import { Connection, PublicKey } from '@solana/web3.js';

export type WalletTier = 'WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE';

export interface WalletMetrics {
  balance: number;
  txCount: number;
  nftCount: number;
  tokenCount: number;
  age: number;
}

export interface WalletScore {
  totalScore: number;
  tier: WalletTier;
  metrics: WalletMetrics;
}

/**
 * Calculate wallet score based on various metrics
 */
export function calculateWalletScore(metrics: WalletMetrics): WalletScore {
  let totalScore = 0;
  
  // Balance score (0-30 points)
  const { balance, txCount, nftCount } = metrics;
  
  if (balance >= 100) totalScore += 30;
  else if (balance >= 10) totalScore += 25;
  else if (balance >= 1) totalScore += 20;
  else if (balance >= 0.1) totalScore += 15;
  else totalScore += 10;
  
  // Transaction score (0-40 points)
  if (txCount >= 1000) totalScore += 40;
  else if (txCount >= 500) totalScore += 35;
  else if (txCount >= 100) totalScore += 30;
  else if (txCount >= 50) totalScore += 25;
  else if (txCount >= 10) totalScore += 20;
  else totalScore += 10;
  
  // NFT score (0-30 points)
  if (nftCount >= 50) totalScore += 30;
  else if (nftCount >= 20) totalScore += 25;
  else if (nftCount >= 10) totalScore += 20;
  else if (nftCount >= 5) totalScore += 15;
  else if (nftCount >= 1) totalScore += 10;
  
  // Determine tier
  let tier: WalletTier = 'NOVICE';
  if (totalScore >= 80) tier = 'WHALE';
  else if (totalScore >= 65) tier = 'DEGEN';
  else if (totalScore >= 50) tier = 'ACTIVE';
  else if (totalScore >= 30) tier = 'CASUAL';
  
  return {
    totalScore,
    tier,
    metrics,
  };
}

/**
 * Fetch wallet metrics from on-chain data
 */
export async function fetchWalletMetrics(
  connection: Connection,
  publicKey: PublicKey
): Promise<WalletMetrics> {
  // Get balance
  const balance = await connection.getBalance(publicKey);
  const solBalance = balance / 1e9;
  
  // Get transaction count
  const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
  const txCount = signatures.length;
  
  // Get token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });
  
  // Count NFTs (tokens with amount=1 and decimals=0)
  let nftCount = 0;
  for (const account of tokenAccounts.value) {
    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
    const decimals = account.account.data.parsed.info.tokenAmount.decimals;
    if (amount === 1 && decimals === 0) {
      nftCount++;
    }
  }
  
  // Calculate wallet age
  let age = 0;
  if (signatures.length > 0) {
    const oldestSignature = signatures[signatures.length - 1];
    if (oldestSignature.blockTime) {
      age = Math.floor((Date.now() / 1000 - oldestSignature.blockTime) / 86400);
    }
  }
  
  return {
    balance: solBalance,
    txCount,
    nftCount,
    tokenCount: tokenAccounts.value.length,
    age,
  };
}

/**
 * Get wallet tier color for UI
 */
export function getTierColor(tier: WalletTier): string {
  switch (tier) {
    case 'WHALE':
      return 'from-yellow-400 to-orange-500';
    case 'DEGEN':
      return 'from-purple-400 to-pink-500';
    case 'ACTIVE':
      return 'from-blue-400 to-cyan-500';
    case 'CASUAL':
      return 'from-green-400 to-emerald-500';
    case 'NOVICE':
      return 'from-gray-400 to-gray-500';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

/**
 * Get wallet tier emoji
 */
export function getTierEmoji(tier: WalletTier): string {
  switch (tier) {
    case 'WHALE':
      return '🐋';
    case 'DEGEN':
      return '🎲';
    case 'ACTIVE':
      return '⚡';
    case 'CASUAL':
      return '👤';
    case 'NOVICE':
      return '🌱';
    default:
      return '👤';
  }
}

/**
 * Calculate airdrop priority based on tier and metrics
 */
export function calculateAirdropPriority(score: WalletScore): number {
  const tierPriority = {
    WHALE: 5,
    DEGEN: 4,
    ACTIVE: 3,
    CASUAL: 2,
    NOVICE: 1,
  };
  
  return tierPriority[score.tier];
}

/**
 * Estimate potential airdrop value based on wallet tier
 */
export function estimateAirdropValue(score: WalletScore): number {
  const baseValues = {
    WHALE: 10000,
    DEGEN: 5000,
    ACTIVE: 2000,
    CASUAL: 500,
    NOVICE: 100,
  };
  
  // Apply multipliers based on metrics
  const metrics = score.metrics;
  const multiplier = 1 + 
    (Math.min(metrics.txCount / 1000, 1) * 0.5) +
    (Math.min(metrics.nftCount / 50, 1) * 0.3) +
    (Math.min(metrics.age / 365, 1) * 0.2);
  
  return Math.round(baseValues[score.tier] * multiplier);
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
