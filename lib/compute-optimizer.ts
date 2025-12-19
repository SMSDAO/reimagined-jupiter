/**
 * Dynamic compute unit optimization
 * Optimizes compute units and priority fees for transactions
 */

import { Connection, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { logger } from './logger.js';

export interface ComputeConfig {
  defaultComputeUnits: number;
  maxComputeUnits: number;
  minPriorityFee: number; // micro-lamports
  maxPriorityFee: number; // micro-lamports
  dynamicPriorityFee: boolean;
}

const DEFAULT_COMPUTE_CONFIG: ComputeConfig = {
  defaultComputeUnits: 200000,
  maxComputeUnits: 1400000, // Max per transaction
  minPriorityFee: 1000, // 0.000001 SOL
  maxPriorityFee: 100000, // 0.0001 SOL
  dynamicPriorityFee: true,
};

/**
 * Get recommended compute units for transaction type
 */
export function getRecommendedComputeUnits(
  transactionType: 'simple-swap' | 'arbitrage' | 'flash-loan' | 'complex',
  config: ComputeConfig = DEFAULT_COMPUTE_CONFIG
): number {
  const recommendations = {
    'simple-swap': 100000,
    'arbitrage': 200000,
    'flash-loan': 400000,
    'complex': 600000,
  };
  
  const recommended = recommendations[transactionType] || config.defaultComputeUnits;
  
  return Math.min(recommended, config.maxComputeUnits);
}

/**
 * Calculate dynamic priority fee based on network conditions
 */
export async function calculateDynamicPriorityFee(
  connection: Connection,
  config: ComputeConfig = DEFAULT_COMPUTE_CONFIG
): Promise<number> {
  try {
    if (!config.dynamicPriorityFee) {
      return config.minPriorityFee;
    }
    
    logger.debug('Calculating dynamic priority fee');
    
    // Get recent prioritization fees
    const recentFees = await connection.getRecentPrioritizationFees();
    
    if (recentFees.length === 0) {
      logger.debug('No recent fees available, using default');
      return config.minPriorityFee;
    }
    
    // Filter out zero fees and sort
    const validFees = recentFees
      .map(f => f.prioritizationFee)
      .filter(f => f > 0)
      .sort((a, b) => a - b);
    
    if (validFees.length === 0) {
      return config.minPriorityFee;
    }
    
    // Use 75th percentile for competitive fee
    const percentile75Index = Math.floor(validFees.length * 0.75);
    const baseFee = validFees[percentile75Index];
    
    // Add 25% buffer for faster inclusion
    const bufferedFee = Math.ceil(baseFee * 1.25);
    
    // Clamp to min/max bounds
    const finalFee = Math.max(
      config.minPriorityFee,
      Math.min(config.maxPriorityFee, bufferedFee)
    );
    
    logger.info('Dynamic priority fee calculated', {
      baseFee,
      bufferedFee,
      finalFee,
      sampleSize: validFees.length,
    });
    
    return finalFee;
  } catch (error) {
    logger.error('Error calculating dynamic priority fee', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return config.minPriorityFee;
  }
}

/**
 * Build compute budget instructions
 */
export async function buildComputeBudgetInstructions(
  connection: Connection,
  transactionType: 'simple-swap' | 'arbitrage' | 'flash-loan' | 'complex',
  config: Partial<ComputeConfig> = {}
): Promise<TransactionInstruction[]> {
  const cfg = { ...DEFAULT_COMPUTE_CONFIG, ...config };
  
  const computeUnits = getRecommendedComputeUnits(transactionType, cfg);
  const priorityFee = await calculateDynamicPriorityFee(connection, cfg);
  
  logger.debug('Building compute budget instructions', {
    transactionType,
    computeUnits,
    priorityFee,
  });
  
  return [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    }),
  ];
}

/**
 * Estimate transaction cost
 */
export function estimateTransactionCost(
  computeUnits: number,
  priorityFeePerUnit: number,
  numSignatures: number = 1
): number {
  // Base fee: 5000 lamports per signature
  const baseFee = 5000 * numSignatures;
  
  // Compute fee: units * price (in micro-lamports)
  const computeFee = (computeUnits * priorityFeePerUnit) / 1_000_000; // Convert micro-lamports to lamports
  
  return baseFee + computeFee;
}

/**
 * Get optimal compute configuration for profit target
 */
export async function getOptimalComputeConfig(
  connection: Connection,
  transactionType: 'simple-swap' | 'arbitrage' | 'flash-loan' | 'complex',
  targetProfitSol: number
): Promise<{ computeUnits: number; priorityFee: number; estimatedCost: number }> {
  const config = DEFAULT_COMPUTE_CONFIG;
  
  // Get base recommendations
  const computeUnits = getRecommendedComputeUnits(transactionType, config);
  const basePriorityFee = await calculateDynamicPriorityFee(connection, config);
  
  // Adjust priority fee based on profit target
  let priorityFee = basePriorityFee;
  
  // For high-profit trades, use higher priority fees for faster execution
  if (targetProfitSol > 0.1) {
    priorityFee = Math.min(config.maxPriorityFee, basePriorityFee * 2);
  } else if (targetProfitSol > 0.05) {
    priorityFee = Math.min(config.maxPriorityFee, basePriorityFee * 1.5);
  }
  
  const estimatedCost = estimateTransactionCost(computeUnits, priorityFee);
  
  logger.info('Optimal compute config calculated', {
    transactionType,
    targetProfitSol,
    computeUnits,
    priorityFee,
    estimatedCostSOL: estimatedCost / 1e9,
  });
  
  return {
    computeUnits,
    priorityFee,
    estimatedCost,
  };
}

/**
 * Check if transaction cost is acceptable for profit
 */
export function isTransactionCostAcceptable(
  estimatedCost: number,
  expectedProfit: number,
  minProfitRatio: number = 0.1 // Cost should be max 10% of profit
): boolean {
  const costInSol = estimatedCost / 1e9;
  const maxAcceptableCost = expectedProfit * minProfitRatio;
  
  const acceptable = costInSol <= maxAcceptableCost;
  
  logger.debug('Transaction cost check', {
    estimatedCostSOL: costInSol,
    expectedProfit,
    maxAcceptableCost,
    acceptable,
  });
  
  return acceptable;
}

/**
 * Get network congestion level
 */
export async function getNetworkCongestion(
  connection: Connection
): Promise<'low' | 'medium' | 'high'> {
  try {
    const recentFees = await connection.getRecentPrioritizationFees();
    
    if (recentFees.length === 0) {
      return 'low';
    }
    
    const avgFee = recentFees.reduce((sum, f) => sum + f.prioritizationFee, 0) / recentFees.length;
    
    if (avgFee > 50000) {
      return 'high';
    } else if (avgFee > 10000) {
      return 'medium';
    } else {
      return 'low';
    }
  } catch (error) {
    logger.error('Error checking network congestion', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 'medium'; // Default to medium
  }
}
