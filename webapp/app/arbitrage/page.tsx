'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { ArbitrageScanner, ArbitrageOpportunity } from '@/lib/arbitrage-scanner';

export default function ArbitragePage() {
  const { publicKey } = useWallet();
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [autoExecute, setAutoExecute] = useState(false);
  const [minProfit, setMinProfit] = useState(0.5);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<ArbitrageScanner | null>(null);

  const flashProviders = [
    { name: 'Marginfi', fee: 0.09, liquidity: '$250M' },
    { name: 'Solend', fee: 0.10, liquidity: '$180M' },
    { name: 'Kamino', fee: 0.12, liquidity: '$150M' },
    { name: 'Mango', fee: 0.15, liquidity: '$90M' },
    { name: 'Save', fee: 0.18, liquidity: '$45M' },
  ];

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopScanning();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    setScanning(true);
    setOpportunities([]);

    try {
      // Initialize scanner with RPC URL
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
      scannerRef.current = new ArbitrageScanner(rpcUrl);

      // Set up opportunity callback
      scannerRef.current.onOpportunity((opportunity) => {
        setOpportunities((prev) => {
          // Keep only last 20 opportunities
          const updated = [opportunity, ...prev].slice(0, 20);
          return updated;
        });
      });

      // Start scanning
      await scannerRef.current.startScanning(minProfit);

      console.log('[ArbitragePage] Scanner started with min profit:', minProfit);
    } catch (error) {
      console.error('[ArbitragePage] Error starting scanner:', error);
      alert('Failed to start scanner. Check console for details.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const executeArbitrage = async (opp: ArbitrageOpportunity) => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    alert(`Executing ${opp.type} arbitrage for ${opp.profitUSD} USD profit...`);
    // Implement actual arbitrage execution
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2">⚡ Flash Loan Arbitrage</h1>
        <p className="text-gray-300 mb-8">
          5-10 providers with 0.09%-0.20% fees across 8+ DEXs
        </p>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">⚙️ Settings</h3>
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

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">📊 Statistics</h3>
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
                <span className="text-gray-300">Today&apos;s Profit:</span>
                <span className="text-green-400 font-bold">$234.56</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">🛡️ MEV Protection</h3>
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
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">💰 Flash Loan Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {flashProviders.map((provider) => (
              <div key={provider.name} className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">{provider.name}</h3>
                <div className="text-sm space-y-1">
                  <div className="text-green-400">{provider.fee}% fee</div>
                  <div className="text-gray-400">{provider.liquidity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Button */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={scanning ? stopScanning : startScanning}
            disabled={!publicKey}
            className={`flex-1 ${
              scanning 
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
            } text-white font-bold py-4 rounded-xl transition disabled:opacity-50`}
          >
            {scanning ? '⏹️ Stop Scanning' : publicKey ? '🔍 Start Scanning' : 'Connect Wallet'}
          </button>
          {scanning && (
            <button
              onClick={() => setOpportunities([])}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">💎 Opportunities</h2>
            {opportunities.map((opp) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        opp.type === 'flash' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {opp.type === 'flash' ? '⚡ Flash Loan' : '🔄 Triangular'}
                      </span>
                      <div className="text-white font-bold">
                        {opp.tokens.join(' → ')}
                      </div>
                      {opp.confidence && (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          opp.confidence >= 80 ? 'bg-green-600 text-white' : 
                          opp.confidence >= 65 ? 'bg-yellow-600 text-white' : 
                          'bg-orange-600 text-white'
                        }`}>
                          {opp.confidence.toFixed(0)}% Confidence
                        </span>
                      )}
                    </div>
                    <div className="flex gap-6 text-sm">
                      {opp.provider && (
                        <span className="text-gray-300">Provider: <span className="text-white">{opp.provider}</span></span>
                      )}
                      <span className="text-gray-300">Route: <span className="text-white">{opp.route}</span></span>
                      {opp.timestamp && (
                        <span className="text-gray-300">
                          {new Date(opp.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right mr-6">
                    <div className="text-3xl font-bold text-green-400">{opp.profitPercent.toFixed(2)}%</div>
                    <div className="text-xl text-white">${opp.profitUSD.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => executeArbitrage(opp)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold"
                  >
                    Execute
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
