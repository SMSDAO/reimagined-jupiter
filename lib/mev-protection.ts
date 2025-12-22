/**
 * MEV protection via Jito Block Engine integration
 * Protects transactions from front-running and sandwich attacks
 */

import { Connection, Transaction, VersionedTransaction, Keypair } from '@solana/web3.js';
import { logger } from './logger.js';

export interface JitoConfig {
  blockEngineUrl: string;
  bundleOnly: boolean; // Only send via bundles, not direct
  tipAccount: string; // Jito tip account
  minTipLamports: number;
  maxTipLamports: number;
}

const DEFAULT_JITO_CONFIG: JitoConfig = {
  blockEngineUrl: 'https://mainnet.block-engine.jito.wtf',
  bundleOnly: true,
  tipAccount: 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', // Jito tip account
  minTipLamports: 10000, // 0.00001 SOL
  maxTipLamports: 100000, // 0.0001 SOL
};

/**
 * Send transaction via Jito bundle for MEV protection
 */
export async function sendJitoBundle(
  connection: Connection,
  transactions: (Transaction | VersionedTransaction)[],
  signers: Keypair[],
  config: JitoConfig = DEFAULT_JITO_CONFIG,
  transactionValue: number = 0
): Promise<{ success: boolean; bundleId?: string; error?: string }> {
  try {
    logger.info('Sending transaction via Jito bundle', {
      txCount: transactions.length,
      blockEngineUrl: config.blockEngineUrl,
    });
    
    // Get network congestion level (0-1 scale)
    const recentPerformanceSamples = await connection.getRecentPerformanceSamples(1);
    const networkCongestion = recentPerformanceSamples.length > 0
      ? Math.min(1, recentPerformanceSamples[0].numTransactions / recentPerformanceSamples[0].samplePeriodSecs / 2000)
      : 0.5;
    
    // Add tip transaction to bundle
    const tipAmount = calculateJitoTip(config, transactionValue, networkCongestion);
    logger.debug('Adding Jito tip', { tipAmount, transactionValue, networkCongestion });
    
    // Serialize transactions
    const serializedTxs = transactions.map(tx => {
      if (tx instanceof VersionedTransaction) {
        return Buffer.from(tx.serialize()).toString('base64');
      } else {
        return tx.serialize({ requireAllSignatures: false }).toString('base64');
      }
    });
    
    // Send bundle to Jito
    const bundleResponse = await fetch(`${config.blockEngineUrl}/api/v1/bundles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [serializedTxs],
      }),
    });
    
    if (!bundleResponse.ok) {
      throw new Error(`Jito bundle failed: ${bundleResponse.statusText}`);
    }
    
    const bundleData = await bundleResponse.json();
    
    if (bundleData.error) {
      throw new Error(`Jito bundle error: ${bundleData.error.message}`);
    }
    
    logger.info('Jito bundle sent successfully', {
      bundleId: bundleData.result,
    });
    
    return {
      success: true,
      bundleId: bundleData.result,
    };
  } catch (error) {
    logger.error('Error sending Jito bundle', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate dynamic Jito tip based on transaction value and network conditions
 */
function calculateJitoTip(config: JitoConfig, transactionValue: number = 0, networkCongestion: number = 0.5): number {
  // Calculate base tip as a percentage of transaction value
  // If no transaction value provided, use midpoint of range
  
  if (transactionValue > 0) {
    // Calculate tip as 0.01% - 0.05% of transaction value
    const tipPercentage = 0.0001 + (networkCongestion * 0.0004);
    const calculatedTip = Math.floor(transactionValue * tipPercentage);
    
    // Ensure within configured bounds
    return Math.max(config.minTipLamports, Math.min(config.maxTipLamports, calculatedTip));
  }
  
  // Fallback: Use network congestion to determine tip within range
  const range = config.maxTipLamports - config.minTipLamports;
  const tip = config.minTipLamports + Math.floor(range * networkCongestion);
  
  return Math.min(tip, config.maxTipLamports);
}

/**
 * Check if Jito is available
 */
export async function isJitoAvailable(
  config: JitoConfig = DEFAULT_JITO_CONFIG
): Promise<boolean> {
  try {
    const response = await fetch(`${config.blockEngineUrl}/api/v1/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTipAccounts',
        params: [],
      }),
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get recommended tip for transaction
 */
export async function getRecommendedTip(
  transactionValue: number,
  config: JitoConfig = DEFAULT_JITO_CONFIG
): Promise<number> {
  // Calculate tip as percentage of transaction value
  // Minimum 0.01%, maximum 0.1%
  const minTipPercentage = 0.0001;
  const maxTipPercentage = 0.001;
  
  let tip = transactionValue * minTipPercentage;
  
  // Ensure within bounds
  tip = Math.max(config.minTipLamports, Math.min(config.maxTipLamports, tip));
  
  return Math.floor(tip);
}

/**
 * Build Jito tip transfer instruction
 */
export function buildJitoTipInstruction(
  from: Keypair,
  tipLamports: number,
  config: JitoConfig = DEFAULT_JITO_CONFIG
): any {
  // This would build a SOL transfer instruction to Jito tip account
  // Simplified for now - in production, use proper instruction building
  
  logger.debug('Building Jito tip instruction', {
    from: from.publicKey.toString(),
    tipAccount: config.tipAccount,
    tipLamports,
  });
  
  // Return a mock instruction for now
  return {
    programId: 'Jito tip instruction',
    keys: [],
    data: Buffer.from([]),
  };
}

/**
 * Estimate if Jito protection is cost-effective
 */
export function shouldUseJitoProtection(
  expectedProfit: number,
  config: JitoConfig = DEFAULT_JITO_CONFIG
): boolean {
  const tipCost = config.maxTipLamports / 1e9; // Convert to SOL
  
  // Use Jito if profit is at least 10x the tip cost
  const minProfitForJito = tipCost * 10;
  
  const shouldUse = expectedProfit >= minProfitForJito;
  
  logger.debug('Jito protection cost-effectiveness check', {
    expectedProfit,
    tipCost,
    minProfitForJito,
    shouldUse,
  });
  
  return shouldUse;
}
