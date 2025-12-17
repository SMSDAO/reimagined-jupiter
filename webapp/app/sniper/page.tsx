'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';

interface SniperTarget {
  name: string;
  mint: string;
  platform: string;
  liquidity: number;
  holders: number;
  status: 'monitoring' | 'ready' | 'sniped';
}

export default function SniperPage() {
  const { publicKey } = useWallet();
  const [targets, setTargets] = useState<SniperTarget[]>([]);
  const [autoSnipe, setAutoSnipe] = useState(false);
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [slippage, setSlippage] = useState(10);
  const [monitoring, setMonitoring] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);

  // Listen for pool creation events
  useEffect(() => {
    const handlePoolCreation = (event: CustomEvent) => {
      const poolData = event.detail;
      console.log('[SniperUI] Pool creation detected:', poolData);
      
      setDetectedCount(prev => prev + 1);
      
      // Add to targets list
      const newTarget: SniperTarget = {
        name: `Token_${poolData.tokenMint?.slice(0, 6) || 'NEW'}`,
        mint: poolData.tokenMint || poolData.poolAddress,
        platform: poolData.dex,
        liquidity: poolData.initialLiquidity || 0,
        holders: 0,
        status: 'ready',
      };
      
      setTargets(prev => [newTarget, ...prev].slice(0, 10)); // Keep last 10
    };

    window.addEventListener('pool-creation-detected', handlePoolCreation as EventListener);
    
    return () => {
      window.removeEventListener('pool-creation-detected', handlePoolCreation as EventListener);
    };
  }, []);

  // Listen for wallet connection
  useEffect(() => {
    const handleWalletConnect = (event: CustomEvent) => {
      console.log('[SniperUI] Wallet connected:', event.detail);
    };

    window.addEventListener('wallet-connected', handleWalletConnect as EventListener);
    
    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnect as EventListener);
    };
  }, []);

  const platforms = [
    { name: 'Pump.fun', active: true, launches: 143 },
    { name: 'Raydium', active: true, launches: 89 },
    { name: 'Jupiter Studio', active: true, launches: 45 },
    { name: 'Orca', active: true, launches: 34 },
    { name: 'Meteora', active: true, launches: 28 },
    { name: 'Phoenix', active: false, launches: 12 },
    { name: 'OpenBook', active: false, launches: 8 },
    { name: 'FluxBeam', active: false, launches: 5 },
  ];

  const startMonitoring = () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    setMonitoring(true);
    console.log('[SniperUI] Starting monitoring with config:', {
      buyAmount,
      slippage,
      autoSnipe,
    });

    // Note: Real-time pool monitoring is handled by the backend SniperBot service
    // The UI listens for 'pool-creation-detected' events dispatched by the backend
    // This would require a backend WebSocket or API endpoint integration
    // For now, we're ready to receive events but not generating mock data
    
    console.log('[SniperUI] Monitoring active - waiting for pool creation events...');
    console.log('[SniperUI] Backend integration required for live monitoring');
  };

  const snipeToken = async (target: SniperTarget) => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    try {
      console.log('[SniperUI] Attempting to snipe token:', target);
      
      // Real implementation would:
      // 1. Get quote from Jupiter for SOL -> target token
      // 2. Set high priority fee for faster execution
      // 3. Create and send transaction
      // 4. Monitor for confirmation
      
      const amountInLamports = Math.floor(parseFloat(buyAmount) * 1e9);
      
      // Get Jupiter quote
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${target.mint}&amount=${amountInLamports}&slippageBps=${slippage * 100}`
      );
      
      if (!quoteResponse.ok) {
        throw new Error('Failed to get quote from Jupiter');
      }
      
      const quote = await quoteResponse.json();
      
      alert(`Snipe prepared for ${target.name}!\n\nBuy: ${buyAmount} SOL\nExpected: ~${(parseInt(quote.outAmount) / 1e9).toFixed(4)} tokens\nSlippage: ${slippage}%\n\nNote: Actual transaction execution requires wallet signing.\nThis would submit a high-priority transaction to maximize success chance.`);
      
      console.log('[SniperUI] Quote received:', quote);
      
      // Update target status
      setTargets(prev => prev.map(t => 
        t.mint === target.mint ? { ...t, status: 'sniped' as const } : t
      ));
    } catch (error) {
      console.error('[SniperUI] Snipe error:', error);
      alert(`Failed to snipe ${target.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2">🎯 Sniper Bot</h1>
        <p className="text-gray-300 mb-8">
          Monitor and snipe new token launches across Pump.fun + Raydium, Orca, Meteora, Phoenix & more DEXs
        </p>
        {monitoring && detectedCount > 0 && (
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4 inline-block">
            ✅ {detectedCount} pool{detectedCount !== 1 ? 's' : ''} detected
          </div>
        )}

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">⚙️ Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Buy Amount (SOL)</label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full bg-white/10 text-white px-4 py-2 rounded-lg"
                  step="0.01"
                  min="0.01"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Slippage Tolerance (%)</label>
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(parseInt(e.target.value))}
                  className="w-full bg-white/10 text-white px-4 py-2 rounded-lg"
                  min="1"
                  max="50"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white">Auto-Snipe</span>
                <button
                  onClick={() => setAutoSnipe(!autoSnipe)}
                  className={`px-4 py-2 rounded-lg ${
                    autoSnipe ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {autoSnipe ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🌐 Monitored Platforms</h2>
            <div className="space-y-2">
              {platforms.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between">
                  <span className="text-white">{platform.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">{platform.launches} today</span>
                    <span
                      className={`w-3 h-3 rounded-full ${
                        platform.active ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monitoring Control */}
        <div className="mb-8">
          <button
            onClick={startMonitoring}
            disabled={monitoring || !publicKey}
            className="w-full bg-gradient-to-r from-pink-600 to-red-600 text-white font-bold py-4 rounded-xl hover:from-pink-700 hover:to-red-700 transition disabled:opacity-50"
          >
            {monitoring ? '🔴 Monitoring Active...' : publicKey ? '▶️ Start Monitoring' : 'Connect Wallet'}
          </button>
        </div>

        {/* Detected Targets */}
        {targets.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-md rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">🎯 Detected Targets</h2>
            <div className="space-y-4">
              {targets.map((target) => (
                <div
                  key={target.mint}
                  className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xl font-bold text-white">{target.name}</h3>
                    <p className="text-gray-400 text-sm">{target.platform}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-green-400">💰 ${target.liquidity.toLocaleString()}</span>
                      <span className="text-blue-400">👥 {target.holders} holders</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {target.status === 'ready' && (
                      <button
                        onClick={() => snipeToken(target)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold"
                      >
                        SNIPE NOW
                      </button>
                    )}
                    {target.status === 'monitoring' && (
                      <span className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold">
                        Monitoring...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dev Fee Notice */}
        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
