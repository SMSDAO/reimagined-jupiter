/**
 * Dynamic slippage protection
 * Adjusts slippage based on market volatility and Jupiter API data
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from './logger.js';

export interface SlippageConfig {
  minSlippage: number; // Minimum slippage (e.g., 0.001 = 0.1%)
  maxSlippage: number; // Maximum slippage (e.g., 0.03 = 3%)
  defaultSlippage: number; // Default slippage (e.g., 0.01 = 1%)
  volatilityMultiplier: number; // Multiplier for volatile conditions (e.g., 1.5)
}

const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  minSlippage: 0.001, // 0.1%
  maxSlippage: 0.03, // 3%
  defaultSlippage: 0.01, // 1%
  volatilityMultiplier: 1.5,
};

/**
 * Calculate dynamic slippage based on market conditions
 */
export async function calculateDynamicSlippage(
  connection: Connection,
  inputMint: string,
  outputMint: string,
  amount: number,
  config: SlippageConfig = DEFAULT_SLIPPAGE_CONFIG
): Promise<number> {
  try {
    logger.debug('Calculating dynamic slippage', {
      inputMint,
      outputMint,
      amount,
    });
    
    // Get volatility indicator from recent price movements
    const volatility = await estimateVolatility(inputMint, outputMint);
    
    // Calculate base slippage
    let slippage = config.defaultSlippage;
    
    // Adjust for volatility
    if (volatility > 0.02) { // High volatility (>2% price swings)
      slippage = slippage * config.volatilityMultiplier;
      logger.debug('High volatility detected, increasing slippage', {
        volatility,
        adjustedSlippage: slippage,
      });
    }
    
    // Adjust for trade size (larger trades need more slippage)
    const sizeAdjustment = calculateSizeAdjustment(amount);
    slippage = slippage * sizeAdjustment;
    
    // Clamp to min/max bounds
    slippage = Math.max(config.minSlippage, Math.min(config.maxSlippage, slippage));
    
    logger.info('Dynamic slippage calculated', {
      slippage,
      slippageBps: Math.round(slippage * 10000),
      volatility,
      sizeAdjustment,
    });
    
    return slippage;
  } catch (error) {
    logger.error('Error calculating dynamic slippage, using default', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return config.defaultSlippage;
  }
}

/**
 * Estimate market volatility based on recent price data
 */
async function estimateVolatility(
  inputMint: string,
  outputMint: string
): Promise<number> {
  try {
    // Get recent Jupiter quotes to estimate volatility
    const quotes = await getRecentQuotes(inputMint, outputMint);
    
    if (quotes.length < 2) {
      return 0.01; // Default 1% volatility
    }
    
    // Calculate price variance
    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Volatility as coefficient of variation
    const volatility = avgPrice > 0 ? stdDev / avgPrice : 0.01;
    
    return Math.min(volatility, 0.1); // Cap at 10% volatility
  } catch (error) {
    logger.error('Error estimating volatility', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0.01; // Default
  }
}

/**
 * Get recent quotes from Jupiter API
 */
async function getRecentQuotes(
  inputMint: string,
  outputMint: string
): Promise<Array<{ price: number; timestamp: number }>> {
  try {
    const amount = 1000000; // 0.001 SOL for price check
    
    // Make multiple requests over short time period
    const quotes: Array<{ price: number; timestamp: number }> = [];
    
    for (let i = 0; i < 3; i++) {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const price = parseInt(data.outAmount) / amount;
        
        quotes.push({
          price,
          timestamp: Date.now(),
        });
      }
      
      // Small delay between requests
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return quotes;
  } catch (error) {
    logger.error('Error fetching quotes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Calculate size adjustment factor for large trades
 */
function calculateSizeAdjustment(amount: number): number {
  // Amount in SOL
  const amountSol = amount / 1e9;
  
  // Increase slippage for larger trades
  if (amountSol > 100) {
    return 1.5; // 50% more slippage for 100+ SOL
  } else if (amountSol > 10) {
    return 1.3; // 30% more slippage for 10-100 SOL
  } else if (amountSol > 1) {
    return 1.1; // 10% more slippage for 1-10 SOL
  }
  
  return 1.0; // No adjustment for small trades
}

/**
 * Convert slippage percentage to basis points for Jupiter API
 */
export function slippageToBps(slippage: number): number {
  return Math.round(slippage * 10000);
}

/**
 * Validate slippage is within acceptable bounds
 */
export function validateSlippage(
  slippage: number,
  config: SlippageConfig = DEFAULT_SLIPPAGE_CONFIG
): boolean {
  if (slippage < config.minSlippage) {
    logger.warn('Slippage below minimum', {
      slippage,
      minSlippage: config.minSlippage,
    });
    return false;
  }
  
  if (slippage > config.maxSlippage) {
    logger.warn('Slippage above maximum', {
      slippage,
      maxSlippage: config.maxSlippage,
    });
    return false;
  }
  
  return true;
}

/**
 * Get recommended slippage for token pair
 */
export async function getRecommendedSlippage(
  connection: Connection,
  inputMint: string,
  outputMint: string,
  amount: number
): Promise<{ slippage: number; slippageBps: number; reason: string }> {
  const slippage = await calculateDynamicSlippage(connection, inputMint, outputMint, amount);
  const slippageBps = slippageToBps(slippage);
  
  let reason = 'Normal market conditions';
  
  if (slippage >= DEFAULT_SLIPPAGE_CONFIG.maxSlippage) {
    reason = 'High volatility detected - using maximum slippage';
  } else if (slippage >= DEFAULT_SLIPPAGE_CONFIG.defaultSlippage * 1.3) {
    reason = 'Elevated volatility or large trade size';
  }
  
  return {
    slippage,
    slippageBps,
    reason,
  };
}
