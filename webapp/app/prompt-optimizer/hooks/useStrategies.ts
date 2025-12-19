/**
 * Custom React hook for strategy management
 */

import { useState, useCallback, useEffect } from 'react';
import { ArbitrageStrategy } from '../types';
import { 
  defaultStrategies, 
  calculateExpectedProfit, 
  scoreStrategy, 
  recommendStrategy,
  optimizeStrategyParameters
} from '../lib/strategyOptimizer';

export function useStrategies() {
  const [strategies, setStrategies] = useState<ArbitrageStrategy[]>(defaultStrategies);
  const [selectedStrategy, setSelectedStrategy] = useState<ArbitrageStrategy | null>(null);
  const [loading, setLoading] = useState(false);

  const getStrategy = useCallback((id: string): ArbitrageStrategy | undefined => {
    return strategies.find(s => s.id === id);
  }, [strategies]);

  const toggleStrategy = useCallback((id: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    );
  }, []);

  const updateStrategy = useCallback((id: string, updates: Partial<ArbitrageStrategy>) => {
    setStrategies(prev =>
      prev.map(s =>
        s.id === id ? { ...s, ...updates } : s
      )
    );
  }, []);

  const calculateProfit = useCallback((
    strategyId: string,
    amount: number,
    priceDifference: number
  ): number => {
    const strategy = getStrategy(strategyId);
    if (!strategy) return 0;
    return calculateExpectedProfit(strategy, amount, priceDifference);
  }, [getStrategy]);

  const getStrategyScore = useCallback((
    strategyId: string,
    marketData: {
      liquidity: number;
      volume24h: number;
      volatility: number;
    }
  ): number => {
    const strategy = getStrategy(strategyId);
    if (!strategy) return 0;
    return scoreStrategy(strategy, marketData);
  }, [getStrategy]);

  const getRecommendation = useCallback((
    marketConditions: {
      volatility: 'low' | 'medium' | 'high';
      liquidity: number;
      trendingTokens: string[];
    }
  ): ArbitrageStrategy | null => {
    return recommendStrategy(marketConditions);
  }, []);

  const optimizeParameters = useCallback((
    strategyId: string,
    marketVolatility: 'low' | 'medium' | 'high'
  ) => {
    const strategy = getStrategy(strategyId);
    if (!strategy) return;
    
    const optimizedParams = optimizeStrategyParameters(strategy, marketVolatility);
    updateStrategy(strategyId, { parameters: optimizedParams });
  }, [getStrategy, updateStrategy]);

  return {
    strategies,
    selectedStrategy,
    setSelectedStrategy,
    getStrategy,
    toggleStrategy,
    updateStrategy,
    calculateProfit,
    getStrategyScore,
    getRecommendation,
    optimizeParameters,
    loading
  };
}
