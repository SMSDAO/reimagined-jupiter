/**
 * DeFi arbitrage strategy optimization utilities
 */

import { ArbitrageStrategy, StrategyParameters } from '../types';

/**
 * Pre-defined arbitrage strategies optimized with AI prompts
 */
export const defaultStrategies: ArbitrageStrategy[] = [
  {
    id: 'flash-loan-stablecoin',
    name: 'Flash Loan Stablecoin Arbitrage',
    description: 'Low-risk arbitrage using flash loans on stablecoin pairs',
    prompt: 'Analyze stablecoin arbitrage opportunities between {{dex1}} and {{dex2}} for {{tokenPair}}. Calculate optimal flash loan amount from {{provider}} considering {{fee}}% fee. Evaluate profit after slippage of {{slippage}}%.',
    parameters: {
      minProfitThreshold: 0.003, // 0.3%
      maxSlippage: 0.01, // 1%
      tokens: ['USDC', 'USDT', 'USDH', 'UXD'],
      dexes: ['Raydium', 'Orca', 'Jupiter'],
      flashLoanProvider: 'Marginfi'
    },
    expectedProfit: 0.005, // 0.5%
    riskLevel: 'low',
    enabled: true
  },
  {
    id: 'triangular-sol',
    name: 'SOL Triangular Arbitrage',
    description: 'Medium-risk triangular arbitrage with SOL as base',
    prompt: 'Find triangular arbitrage cycles starting with SOL through {{intermediateTokens}}. Analyze paths: SOL → {{token1}} → {{token2}} → SOL. Calculate expected profit considering {{swapFees}}% total fees and {{networkFee}} SOL network cost.',
    parameters: {
      minProfitThreshold: 0.005, // 0.5%
      maxSlippage: 0.015, // 1.5%
      tokens: ['SOL', 'USDC', 'RAY', 'ORCA', 'MNGO'],
      dexes: ['Raydium', 'Orca', 'Serum', 'Jupiter'],
      flashLoanProvider: undefined
    },
    expectedProfit: 0.008, // 0.8%
    riskLevel: 'medium',
    enabled: true
  },
  {
    id: 'lst-arbitrage',
    name: 'Liquid Staking Token Arbitrage',
    description: 'Low-medium risk arbitrage on liquid staking derivatives',
    prompt: 'Evaluate arbitrage between {{lstToken}} and SOL across {{dexList}}. Consider {{depegPercentage}}% depeg opportunity. Factor in unstaking period of {{unstakeDays}} days and current APY of {{apy}}%.',
    parameters: {
      minProfitThreshold: 0.004, // 0.4%
      maxSlippage: 0.012, // 1.2%
      tokens: ['SOL', 'mSOL', 'stSOL', 'jitoSOL', 'bSOL'],
      dexes: ['Raydium', 'Orca', 'Jupiter', 'Marinade'],
      flashLoanProvider: 'Solend'
    },
    expectedProfit: 0.006, // 0.6%
    riskLevel: 'low',
    enabled: true
  },
  {
    id: 'memecoin-flash',
    name: 'Memecoin Flash Arbitrage',
    description: 'High-risk, high-reward memecoin arbitrage',
    prompt: 'Identify volatile memecoin {{token}} arbitrage between {{dex1}} and {{dex2}}. Price difference: {{priceDiff}}%. Analyze liquidity depth of {{liquidityAmount}} and volatility of {{volatilityPercent}}%. Calculate MEV protection requirements.',
    parameters: {
      minProfitThreshold: 0.01, // 1%
      maxSlippage: 0.03, // 3%
      tokens: ['BONK', 'WIF', 'SAMO', 'MYRO', 'POPCAT'],
      dexes: ['Raydium', 'Orca', 'Jupiter', 'Pump.fun'],
      flashLoanProvider: 'Kamino'
    },
    expectedProfit: 0.02, // 2%
    riskLevel: 'high',
    enabled: false // Disabled by default due to high risk
  },
  {
    id: 'cross-dex-scanner',
    name: 'Cross-DEX Opportunity Scanner',
    description: 'Comprehensive scanner across all major DEXs',
    prompt: 'Scan for arbitrage across all major Solana DEXs: {{dexList}}. For token {{token}}, compare prices and identify best buy/sell venues. Calculate profit after {{totalFees}}% fees. Recommend flash loan provider if beneficial.',
    parameters: {
      minProfitThreshold: 0.005, // 0.5%
      maxSlippage: 0.015, // 1.5%
      tokens: ['SOL', 'USDC', 'USDT', 'RAY', 'ORCA', 'MNGO', 'JUP'],
      dexes: ['Raydium', 'Orca', 'Serum', 'Jupiter', 'Lifinity', 'Meteora', 'Phoenix'],
      flashLoanProvider: 'Marginfi'
    },
    expectedProfit: 0.007, // 0.7%
    riskLevel: 'medium',
    enabled: true
  }
];

/**
 * Calculate expected profit for a strategy
 */
export function calculateExpectedProfit(
  strategy: ArbitrageStrategy,
  amount: number,
  priceDifference: number
): number {
  const { maxSlippage } = strategy.parameters;
  const flashLoanFee = strategy.parameters.flashLoanProvider ? getFlashLoanFee(strategy.parameters.flashLoanProvider) : 0;
  
  // Calculate gross profit
  const grossProfit = amount * priceDifference;
  
  // Subtract costs
  const slippageCost = amount * maxSlippage;
  const flashLoanCost = amount * flashLoanFee;
  const networkFees = 0.000005 * 5; // Estimate 5 transactions at 0.000005 SOL each
  
  const netProfit = grossProfit - slippageCost - flashLoanCost - networkFees;
  
  return Math.max(0, netProfit);
}

/**
 * Get flash loan fee by provider
 */
function getFlashLoanFee(provider: string): number {
  const fees: Record<string, number> = {
    'Marginfi': 0.0009,   // 0.09%
    'Solend': 0.001,      // 0.10%
    'Kamino': 0.0012,     // 0.12%
    'Mango': 0.0015,      // 0.15%
    'Port Finance': 0.002 // 0.20%
  };
  return fees[provider] || 0.001;
}

/**
 * Optimize strategy parameters based on market conditions
 */
export function optimizeStrategyParameters(
  strategy: ArbitrageStrategy,
  marketVolatility: 'low' | 'medium' | 'high'
): StrategyParameters {
  const optimized = { ...strategy.parameters };
  
  switch (marketVolatility) {
    case 'low':
      // Tighter parameters for stable markets
      optimized.minProfitThreshold *= 0.8;
      optimized.maxSlippage *= 0.8;
      break;
    case 'high':
      // Wider parameters for volatile markets
      optimized.minProfitThreshold *= 1.5;
      optimized.maxSlippage *= 1.3;
      break;
    default:
      // Keep default for medium volatility
      break;
  }
  
  return optimized;
}

/**
 * Score strategy viability
 */
export function scoreStrategy(
  strategy: ArbitrageStrategy,
  currentMarketData: {
    liquidity: number;
    volume24h: number;
    volatility: number;
  }
): number {
  let score = 50; // Base score
  
  // Adjust for risk level
  switch (strategy.riskLevel) {
    case 'low':
      score += 20;
      break;
    case 'medium':
      score += 10;
      break;
    case 'high':
      score -= 10;
      break;
  }
  
  // Adjust for liquidity
  if (currentMarketData.liquidity > 1000000) score += 15;
  else if (currentMarketData.liquidity > 100000) score += 10;
  else if (currentMarketData.liquidity < 10000) score -= 20;
  
  // Adjust for volume
  if (currentMarketData.volume24h > 10000000) score += 10;
  else if (currentMarketData.volume24h < 100000) score -= 15;
  
  // Adjust for volatility match
  if (strategy.riskLevel === 'high' && currentMarketData.volatility > 10) score += 15;
  if (strategy.riskLevel === 'low' && currentMarketData.volatility < 3) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Recommend best strategy for current conditions
 */
export function recommendStrategy(
  marketConditions: {
    volatility: 'low' | 'medium' | 'high';
    liquidity: number;
    trendingTokens: string[];
  }
): ArbitrageStrategy | null {
  const enabledStrategies = defaultStrategies.filter(s => s.enabled);
  
  if (enabledStrategies.length === 0) return null;
  
  // Filter strategies that match market conditions
  let candidates = enabledStrategies;
  
  // Match risk level to volatility
  if (marketConditions.volatility === 'low') {
    candidates = candidates.filter(s => s.riskLevel === 'low');
  } else if (marketConditions.volatility === 'high') {
    candidates = candidates.filter(s => s.riskLevel !== 'low');
  }
  
  // Prefer strategies with trending tokens
  const strategiesWithTrending = candidates.filter(s =>
    s.parameters.tokens.some(t => marketConditions.trendingTokens.includes(t))
  );
  
  if (strategiesWithTrending.length > 0) {
    candidates = strategiesWithTrending;
  }
  
  // Return strategy with highest expected profit
  return candidates.reduce((best, current) =>
    current.expectedProfit > best.expectedProfit ? current : best
  );
}

/**
 * Get strategy by ID
 */
export function getStrategyById(id: string): ArbitrageStrategy | undefined {
  return defaultStrategies.find(s => s.id === id);
}

/**
 * Get strategies by risk level
 */
export function getStrategiesByRisk(riskLevel: 'low' | 'medium' | 'high'): ArbitrageStrategy[] {
  return defaultStrategies.filter(s => s.riskLevel === riskLevel);
}
