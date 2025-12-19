/**
 * Pre-execution transaction simulation guard
 * Simulates transactions before execution to prevent failures
 */

import { Connection, Transaction, VersionedTransaction, SimulatedTransactionResponse } from '@solana/web3.js';
import { logger } from './logger.js';

export interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
  returnData?: any;
}

/**
 * Simulate a transaction before execution
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<SimulationResult> {
  try {
    logger.debug('Simulating transaction');
    
    let simulation: SimulatedTransactionResponse;
    
    if (transaction instanceof VersionedTransaction) {
      simulation = await connection.simulateTransaction(transaction, {
        sigVerify: false,
        replaceRecentBlockhash: true,
      });
    } else {
      simulation = await connection.simulateTransaction(transaction, undefined, false);
    }
    
    if (simulation.value.err) {
      logger.warn('Transaction simulation failed', {
        error: JSON.stringify(simulation.value.err),
        logs: simulation.value.logs,
      });
      
      return {
        success: false,
        error: JSON.stringify(simulation.value.err),
        logs: simulation.value.logs || [],
      };
    }
    
    logger.info('Transaction simulation successful', {
      unitsConsumed: simulation.value.unitsConsumed,
      logs: simulation.value.logs?.slice(0, 3), // First 3 logs
    });
    
    return {
      success: true,
      logs: simulation.value.logs || [],
      unitsConsumed: simulation.value.unitsConsumed,
      returnData: simulation.value.returnData,
    };
  } catch (error) {
    logger.error('Error during transaction simulation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate simulation result meets requirements
 */
export function validateSimulation(
  result: SimulationResult,
  requirements: {
    maxComputeUnits?: number;
    requiredLogs?: string[];
    forbiddenErrors?: string[];
  } = {}
): { valid: boolean; reason?: string } {
  if (!result.success) {
    return {
      valid: false,
      reason: `Simulation failed: ${result.error}`,
    };
  }
  
  // Check compute units
  if (requirements.maxComputeUnits && result.unitsConsumed) {
    if (result.unitsConsumed > requirements.maxComputeUnits) {
      return {
        valid: false,
        reason: `Compute units ${result.unitsConsumed} exceeds maximum ${requirements.maxComputeUnits}`,
      };
    }
  }
  
  // Check required logs
  if (requirements.requiredLogs && result.logs) {
    const logsText = result.logs.join('\n');
    
    for (const requiredLog of requirements.requiredLogs) {
      if (!logsText.includes(requiredLog)) {
        return {
          valid: false,
          reason: `Required log pattern not found: ${requiredLog}`,
        };
      }
    }
  }
  
  // Check forbidden errors
  if (requirements.forbiddenErrors && result.logs) {
    const logsText = result.logs.join('\n');
    
    for (const forbiddenError of requirements.forbiddenErrors) {
      if (logsText.includes(forbiddenError)) {
        return {
          valid: false,
          reason: `Forbidden error pattern found: ${forbiddenError}`,
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Estimate transaction fees from simulation
 */
export function estimateFeesFromSimulation(
  result: SimulationResult,
  priorityFeePerUnit: number = 1
): number {
  if (!result.success || !result.unitsConsumed) {
    return 5000; // Default base fee in lamports
  }
  
  // Base fee (5000 lamports per signature) + compute units
  const baseFee = 5000;
  const computeFee = result.unitsConsumed * priorityFeePerUnit;
  
  return baseFee + computeFee;
}

/**
 * Check if simulation indicates profitable trade
 */
export function isProfitableFromSimulation(
  result: SimulationResult,
  expectedProfit: number,
  minProfitThreshold: number
): boolean {
  if (!result.success) {
    return false;
  }
  
  // Estimate fees
  const estimatedFee = estimateFeesFromSimulation(result) / 1e9; // Convert to SOL
  const netProfit = expectedProfit - estimatedFee;
  
  logger.debug('Profitability check', {
    expectedProfit,
    estimatedFee,
    netProfit,
    minProfitThreshold,
  });
  
  return netProfit >= minProfitThreshold;
}

/**
 * Simulate and validate a Jupiter swap
 */
export async function simulateJupiterSwap(
  connection: Connection,
  transaction: VersionedTransaction,
  expectedProfit: number,
  minProfitThreshold: number
): Promise<{ approved: boolean; reason: string; simulation?: SimulationResult }> {
  const simulation = await simulateTransaction(connection, transaction);
  
  if (!simulation.success) {
    return {
      approved: false,
      reason: `Simulation failed: ${simulation.error}`,
      simulation,
    };
  }
  
  // Check for common error patterns
  const validation = validateSimulation(simulation, {
    maxComputeUnits: 1400000, // Jupiter typical max
    forbiddenErrors: [
      'slippage tolerance exceeded',
      'insufficient funds',
      'insufficient liquidity',
    ],
  });
  
  if (!validation.valid) {
    return {
      approved: false,
      reason: validation.reason || 'Validation failed',
      simulation,
    };
  }
  
  // Check profitability
  if (!isProfitableFromSimulation(simulation, expectedProfit, minProfitThreshold)) {
    return {
      approved: false,
      reason: 'Trade not profitable after fees',
      simulation,
    };
  }
  
  logger.info('Simulation approved', {
    unitsConsumed: simulation.unitsConsumed,
    estimatedFee: estimateFeesFromSimulation(simulation) / 1e9,
  });
  
  return {
    approved: true,
    reason: 'Simulation passed all checks',
    simulation,
  };
}
