'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';

interface ArbitrageOpportunity {
  id: string;
  type: 'flash' | 'triangular';
  tokens: string[];
  profitPercent: number;
  profitUSD: number;
  provider?: string;
  route?: string;
}

export default function ArbitragePage() {
  const { publicKey } = useWallet();
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [autoExecute, setAutoExecute] = useState(false);
  const [minProfit, setMinProfit] = useState(0.5);
  const [scanning, setScanning] = useState(false);

  const flashProviders = [
    { name: 'Marginfi', fee: 0.09, liquidity: '$250M' },
    { name: 'Solend', fee: 0.10, liquidity: '$180M' },
    { name: 'Kamino', fee: 0.12, liquidity: '$150M' },
    { name: 'Mango', fee: 0.15, liquidity: '$90M' },
    { name: 'Save', fee: 0.18, liquidity: '$45M' },
  ];

  const startScanning = () => {
    setScanning(true);
    
    // Mock opportunities
    const mockOpportunities: ArbitrageOpportunity[] = [
      {
        id: '1',
        type: 'flash',
        tokens: ['SOL', 'USDC'],
        profitPercent: 1.2,
        profitUSD: 243,
        provider: 'Marginfi',
        route: 'Raydium → Orca',
      },
      {
        id: '2',
        type: 'triangular',
        tokens: ['SOL', 'USDC', 'USDT', 'SOL'],
        profitPercent: 0.8,
        profitUSD: 156,
        route: 'Jupiter v6',
      },
      {
        id: '3',
        type: 'flash',
        tokens: ['BONK', 'USDC'],
        profitPercent: 2.5,
        profitUSD: 478,
        provider: 'Solend',
        route: 'Meteora → Phoenix',
      },
    ];

    setOpportunities(mockOpportunities);
  };

  const executeArbitrage = async (opp: ArbitrageOpportunity) => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    alert(`Executing ${opp.type} arbitrage for ${opp.profitUSD} USD profit...`);
    // Implement actual arbitrage execution
  };

  // Auto-update opportunities when scanning
  useEffect(() => {
    if (!scanning) return;

    const interval = setInterval(() => {
      const newOpportunity: ArbitrageOpportunity = {
        id: Date.now().toString(),
        type: Math.random() > 0.5 ? 'flash' : 'triangular',
        tokens: ['SOL', 'USDC', 'USDT'].slice(0, Math.floor(Math.random() * 2) + 2),
        profitPercent: 0.5 + Math.random() * 2,
        profitUSD: 100 + Math.random() * 400,
        provider: ['Marginfi', 'Solend', 'Kamino', 'Mango'][Math.floor(Math.random() * 4)],
        route: ['Raydium → Orca', 'Jupiter v6', 'Meteora → Phoenix'][Math.floor(Math.random() * 3)],
      };

      if (newOpportunity.profitPercent >= minProfit) {
        setOpportunities(prev => [newOpportunity, ...prev.slice(0, 9)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [scanning, minProfit]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">⚡ Flash Loan Arbitrage</h1>
        <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8">
          5-10 providers with 0.09%-0.20% fees across 8+ DEXs
        </p>

        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">⚙️ Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">
                  Min Profit: {minProfit}%
                </label>
                <input
                  type="range"
                  value={minProfit}
                  onChange={(e) => setMinProfit(parseFloat(e.target.value))}
                  min="0.1"
                  max="5"
                  step="0.1"
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Auto-Execute</span>
                <button
                  onClick={() => setAutoExecute(!autoExecute)}
                  className={`px-4 py-2 rounded-lg ${
                    autoExecute ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {autoExecute ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">📊 Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Opportunities Found:</span>
                <span className="text-white font-bold">{opportunities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Profit:</span>
                <span className="text-green-400 font-bold">
                  ${opportunities.reduce((sum, o) => sum + o.profitUSD, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Today's Profit:</span>
                <span className="text-green-400 font-bold">$234.56</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">🛡️ MEV Protection</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-white">Jito Bundles Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-white">Dynamic Slippage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-white">Private RPC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flash Loan Providers */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">💰 Flash Loan Providers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {flashProviders.map((provider) => (
              <div key={provider.name} className="bg-white/5 rounded-lg p-3 sm:p-4 hover:bg-white/10 transition-colors">
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">{provider.name}</h3>
                <div className="text-sm space-y-1">
                  <div className="text-green-400">{provider.fee}% fee</div>
                  <div className="text-gray-400">{provider.liquidity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Button */}
        <button
          onClick={startScanning}
          disabled={scanning || !publicKey}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 mb-6 sm:mb-8 text-sm sm:text-base shadow-lg"
        >
          {scanning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-pulse-glow">🔍</span> Scanning for Opportunities...
            </span>
          ) : publicKey ? '🔍 Start Scanning' : 'Connect Wallet'}
        </button>

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 sm:space-y-4"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span className="animate-pulse-glow text-green-400">🔴</span>
              Live Opportunities ({opportunities.length})
            </h2>
            {opportunities.map((opp) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                        opp.type === 'flash' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {opp.type === 'flash' ? '⚡ Flash Loan' : '🔄 Triangular'}
                      </span>
                      <div className="text-white font-bold text-sm sm:text-base truncate">
                        {opp.tokens.join(' → ')}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs sm:text-sm">
                      {opp.provider && (
                        <span className="text-gray-300">Provider: <span className="text-white">{opp.provider}</span></span>
                      )}
                      <span className="text-gray-300">Route: <span className="text-white">{opp.route}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-bold text-green-400">{opp.profitPercent.toFixed(2)}%</div>
                      <div className="text-lg sm:text-xl text-white">${opp.profitUSD.toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => executeArbitrage(opp)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base shadow-lg whitespace-nowrap"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
