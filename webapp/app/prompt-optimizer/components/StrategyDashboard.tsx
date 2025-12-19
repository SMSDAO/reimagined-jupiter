'use client';

import { useState } from 'react';
import { ArbitrageStrategy } from '../types';
import { defaultStrategies, calculateExpectedProfit, scoreStrategy, recommendStrategy } from '../lib/strategyOptimizer';

export default function StrategyDashboard() {
  const [selectedStrategy, setSelectedStrategy] = useState<ArbitrageStrategy | null>(null);
  const [tradeAmount, setTradeAmount] = useState<number>(1000);
  const [priceDifference, setPriceDifference] = useState<number>(0.01);

  const handleStrategyClick = (strategy: ArbitrageStrategy) => {
    setSelectedStrategy(strategy);
  };

  const expectedProfit = selectedStrategy
    ? calculateExpectedProfit(selectedStrategy, tradeAmount, priceDifference)
    : 0;

  const strategyScore = selectedStrategy
    ? scoreStrategy(selectedStrategy, {
        liquidity: 500000,
        volume24h: 2000000,
        volatility: 5
      })
    : 0;

  const recommendedStrategy = recommendStrategy({
    volatility: 'medium',
    liquidity: 500000,
    trendingTokens: ['SOL', 'USDC', 'BONK']
  });

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskBgColor = (risk: string): string => {
    switch (risk) {
      case 'low': return 'bg-green-600';
      case 'medium': return 'bg-yellow-600';
      case 'high': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {recommendedStrategy && (
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6 shadow-lg border border-purple-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⭐</span>
            <h3 className="text-xl font-bold text-white">Recommended Strategy</h3>
          </div>
          <p className="text-lg text-white font-semibold">{recommendedStrategy.name}</p>
          <p className="text-gray-300 mt-1">{recommendedStrategy.description}</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-4">Available Strategies</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defaultStrategies.map(strategy => (
            <div
              key={strategy.id}
              onClick={() => handleStrategyClick(strategy)}
              className={`bg-gray-900 p-4 rounded-lg cursor-pointer transition-all border-2 ${
                selectedStrategy?.id === strategy.id
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-transparent hover:border-purple-500/50'
              } ${!strategy.enabled && 'opacity-50'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{strategy.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getRiskBgColor(strategy.riskLevel)}`}>
                  {strategy.riskLevel.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{strategy.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Expected Profit: <span className="text-green-400 font-semibold">{(strategy.expectedProfit * 100).toFixed(2)}%</span>
                </div>
                {!strategy.enabled && (
                  <span className="text-xs text-red-400 font-semibold">DISABLED</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedStrategy && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Strategy Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Min Profit Threshold:</span>
                  <span className="text-white font-semibold">{(selectedStrategy.parameters.minProfitThreshold * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Slippage:</span>
                  <span className="text-white font-semibold">{(selectedStrategy.parameters.maxSlippage * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Flash Loan Provider:</span>
                  <span className="text-white font-semibold">{selectedStrategy.parameters.flashLoanProvider || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level:</span>
                  <span className={`font-semibold ${getRiskColor(selectedStrategy.riskLevel)}`}>
                    {selectedStrategy.riskLevel.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Strategy Score:</span>
                  <span className="text-white font-semibold">{strategyScore.toFixed(0)}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-semibold ${selectedStrategy.enabled ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedStrategy.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">Supported Tokens</h4>
            <div className="flex flex-wrap gap-2">
              {selectedStrategy.parameters.tokens.map(token => (
                <span key={token} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-semibold">
                  {token}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">Supported DEXs</h4>
            <div className="flex flex-wrap gap-2">
              {selectedStrategy.parameters.dexes.map(dex => (
                <span key={dex} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                  {dex}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">AI Prompt Template</h4>
            <div className="bg-gray-900 p-4 rounded-lg border border-purple-500/30">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                {selectedStrategy.prompt}
              </pre>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-white mb-3">Profit Calculator</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Trade Amount (USD)</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(Number(e.target.value))}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Price Difference (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceDifference * 100}
                  onChange={(e) => setPriceDifference(Number(e.target.value) / 100)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-900 to-blue-900 p-4 rounded-lg">
              <div className="text-gray-300 text-sm mb-1">Expected Net Profit</div>
              <div className="text-3xl font-bold text-white">
                ${expectedProfit.toFixed(2)}
              </div>
              <div className="text-green-400 text-sm mt-1">
                {((expectedProfit / tradeAmount) * 100).toFixed(2)}% return
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
