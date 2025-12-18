'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatCard from './StatCard';

interface PortfolioAsset {
  symbol: string;
  amount: number;
  value: number;
  change24h: number;
}

export default function PortfolioTracker() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([
    { symbol: 'SOL', amount: 10.5, value: 1034.25, change24h: 2.5 },
    { symbol: 'USDC', amount: 500, value: 500, change24h: 0 },
    { symbol: 'JUP', amount: 250, value: 335, change24h: 5.7 },
    { symbol: 'BONK', amount: 1000000, value: 23, change24h: -1.2 },
  ]);

  const [totalValue, setTotalValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);

  // Simulate real-time value updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prev => prev.map(asset => ({
        ...asset,
        value: asset.value * (1 + (Math.random() - 0.5) * 0.01),
        change24h: asset.change24h + (Math.random() - 0.5) * 0.3,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const total = assets.reduce((sum, asset) => sum + asset.value, 0);
    const avgChange = assets.reduce((sum, asset) => sum + asset.change24h, 0) / assets.length;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotalValue(total);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotalChange(avgChange);
  }, [assets]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon="💰"
          label="Total Value"
          value={`$${totalValue.toFixed(2)}`}
          color="text-green-400"
          trend={totalChange >= 0 ? 'up' : 'down'}
          trendValue={`${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%`}
        />
        <StatCard
          icon="📊"
          label="Assets"
          value={assets.length}
          color="text-blue-400"
        />
        <StatCard
          icon="🔥"
          label="Best Performer"
          value={assets.reduce((max, asset) => asset.change24h > max.change24h ? asset : max).symbol}
          color="text-purple-400"
          trend="up"
          trendValue={`${assets.reduce((max, asset) => asset.change24h > max.change24h ? asset : max).change24h.toFixed(2)}%`}
        />
      </div>

      {/* Asset List */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Your Assets</h3>
        <div className="space-y-3">
          {assets.map((asset, index) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {asset.symbol.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base">{asset.symbol}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">{asset.amount.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-sm sm:text-base">${asset.value.toFixed(2)}</div>
                <div className={`text-xs sm:text-sm font-semibold ${
                  asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {asset.change24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
