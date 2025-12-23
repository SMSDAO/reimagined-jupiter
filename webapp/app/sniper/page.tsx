'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import UnifiedTradingPanel, { type TradingSettings } from '@/components/Trading/UnifiedTradingPanel';
import InstructionPanel from '@/components/Trading/InstructionPanel';

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
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [monitoring, setMonitoring] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [settings, setSettings] = useState<TradingSettings>({
    autoExecute: false,
    priorityFee: 'critical', // Sniper bot should default to critical priority
    slippage: 10, // Higher default slippage for new tokens
  });

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
      slippage: settings.slippage,
      autoSnipe: settings.autoExecute,
      priorityFee: settings.priorityFee,
    });

    // Note: Real-time pool monitoring is handled by the backend SniperBot service
    // The UI listens for 'pool-creation-detected' events dispatched by the backend
    // This would require a backend WebSocket or API endpoint integration
    // For now, we're ready to receive events but not generating mock data
    
    console.log('[SniperUI] Monitoring active - waiting for pool creation events...');
    console.log('[SniperUI] Backend integration required for live monitoring');
  };

  const stopMonitoring = () => {
    setMonitoring(false);
    console.log('[SniperUI] Stopped monitoring');
  };

  const snipeToken = async (target: SniperTarget) => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    try {
      console.log('[SniperUI] Attempting to snipe token:', target);
      
      // Validate buy amount
      const amount = parseFloat(buyAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Invalid buy amount. Please enter a valid number greater than 0.');
        return;
      }
      
      // Call our sniper API to prepare the transaction
      const response = await fetch('/api/sniper/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenMint: target.mint,
          buyAmountSol: amount,
          slippageBps: settings.slippage * 100,
          priorityFee: settings.priorityFee,
          userPublicKey: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to prepare snipe transaction');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to prepare snipe transaction');
      }

      const { estimatedOutput, priceImpact, quote } = data;
      
      alert(
        `Snipe prepared for ${target.name}!\n\n` +
        `Buy: ${buyAmount} SOL\n` +
        `Expected: ~${estimatedOutput?.toFixed(4) || 'N/A'} tokens\n` +
        `Price Impact: ${priceImpact?.toFixed(2) || 'N/A'}%\n` +
        `Slippage: ${settings.slippage}%\n` +
        `Priority: ${settings.priorityFee}\n\n` +
        `Note: Actual transaction execution requires wallet signing.\n` +
        `This would submit a high-priority transaction to maximize success chance.`
      );
      
      console.log('[SniperUI] Snipe prepared:', {
        estimatedOutput,
        priceImpact,
        quote,
      });
      
      // Update target status
      setTargets(prev => prev.map(t => 
        t.mint === target.mint ? { ...t, status: 'sniped' as const } : t
      ));
    } catch (error) {
      console.error('[SniperUI] Snipe error:', error);
      alert(`Failed to snipe ${target.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Auto-snipe when enabled
  useEffect(() => {
    if (!monitoring || !settings.autoExecute || targets.length === 0) return;

    const readyTargets = targets.filter(t => t.status === 'ready');
    if (readyTargets.length > 0) {
      const topTarget = readyTargets[0];
      console.log('[SniperUI] Auto-sniping target:', topTarget);
      snipeToken(topTarget);
    }
  }, [targets, settings.autoExecute, monitoring]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">🎯 Sniper Bot</h1>
        <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8">
          Monitor and snipe new token launches across Pump.fun + Raydium, Orca, Meteora, Phoenix & more DEXs
        </p>
        {monitoring && detectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 shadow-lg"
          >
            <span className="animate-pulse-glow">✅</span>
            <span className="text-sm sm:text-base">{detectedCount} pool{detectedCount !== 1 ? 's' : ''} detected</span>
          </motion.div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
          {/* Left column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <UnifiedTradingPanel
              onSettingsChange={setSettings}
              onStart={startMonitoring}
              onStop={stopMonitoring}
              isRunning={monitoring}
              showAdvanced={true}
            />

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">💰 Sniper Config</h3>
              <div>
                <label className="text-white text-xs sm:text-sm mb-2 block">Buy Amount (SOL)</label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none text-sm sm:text-base"
                  step="0.01"
                  min="0.01"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Amount of SOL to spend per snipe
                </p>
              </div>
            </div>

            <InstructionPanel pageType="sniper" />
          </div>

          {/* Right column - Monitoring and Targets */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">🌐 Monitored Platforms</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {platforms.map((platform) => (
                  <div key={platform.name} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-semibold">{platform.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          platform.active ? 'bg-green-500 animate-pulse-glow' : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <div className="text-gray-400 text-xs">{platform.launches} today</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Targets */}
            {targets.length > 0 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="animate-pulse-glow text-green-400">🔴</span>
                  Detected Targets ({targets.length})
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {targets.map((target) => (
                    <motion.div
                      key={target.mint}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 w-full">
                          <h3 className="text-lg sm:text-xl font-bold text-white truncate">{target.name}</h3>
                          <p className="text-gray-400 text-xs sm:text-sm mb-2">{target.platform}</p>
                          <div className="flex flex-wrap gap-3 sm:gap-4">
                            <span className="text-green-400 text-xs sm:text-sm">💰 ${target.liquidity.toLocaleString()}</span>
                            <span className="text-blue-400 text-xs sm:text-sm">👥 {target.holders} holders</span>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          {target.status === 'ready' && (
                            <button
                              onClick={() => snipeToken(target)}
                              disabled={settings.autoExecute}
                              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base shadow-lg whitespace-nowrap disabled:opacity-50"
                            >
                              {settings.autoExecute ? 'Auto' : 'SNIPE NOW'}
                            </button>
                          )}
                          {target.status === 'monitoring' && (
                            <span className="flex-1 sm:flex-none bg-yellow-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base text-center whitespace-nowrap">
                              Monitoring...
                            </span>
                          )}
                          {target.status === 'sniped' && (
                            <span className="flex-1 sm:flex-none bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base text-center whitespace-nowrap">
                              Sniped ✅
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : monitoring ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/10 text-center">
                <div className="text-4xl mb-4 animate-pulse-glow">👀</div>
                <p className="text-white text-lg mb-2">Monitoring for new launches...</p>
                <p className="text-gray-400 text-sm">Watching {platforms.filter(p => p.active).length} platforms</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/10 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-white text-lg mb-2">Ready to start sniping</p>
                <p className="text-gray-400 text-sm">Click "Start Bot" to begin monitoring</p>
              </div>
            )}
          </div>
        </div>

        {/* Dev Fee Notice */}
        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}

  return (
    <div className="max-w-7xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">🎯 Sniper Bot</h1>
        <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8">
          Monitor and snipe new token launches across Pump.fun + Raydium, Orca, Meteora, Phoenix & more DEXs
        </p>
        {monitoring && detectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 shadow-lg"
          >
            <span className="animate-pulse-glow">✅</span>
            <span className="text-sm sm:text-base">{detectedCount} pool{detectedCount !== 1 ? 's' : ''} detected</span>
          </motion.div>
        )}

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">⚙️ Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white text-xs sm:text-sm mb-2 block">Buy Amount (SOL)</label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none text-sm sm:text-base"
                  step="0.01"
                  min="0.01"
                />
              </div>

              <div>
                <label className="text-white text-xs sm:text-sm mb-2 block">Slippage Tolerance (%)</label>
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(parseInt(e.target.value))}
                  className="w-full bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none text-sm sm:text-base"
                  min="1"
                  max="50"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-white text-sm sm:text-base">Auto-Snipe</span>
                <button
                  onClick={() => setAutoSnipe(!autoSnipe)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                    autoSnipe ? 'bg-green-600 shadow-lg shadow-green-500/50' : 'bg-gray-600'
                  }`}
                >
                  {autoSnipe ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">🌐 Monitored Platforms</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {platforms.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-white text-sm sm:text-base">{platform.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs sm:text-sm">{platform.launches} today</span>
                    <span
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        platform.active ? 'bg-green-500 animate-pulse-glow' : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monitoring Control */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={startMonitoring}
            disabled={monitoring || !publicKey}
            className="w-full bg-gradient-to-r from-pink-600 to-red-600 text-white font-bold py-3 sm:py-4 rounded-xl hover:from-pink-700 hover:to-red-700 transition-all disabled:opacity-50 shadow-lg text-sm sm:text-base"
          >
            {monitoring ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-pulse-glow">🔴</span> Monitoring Active...
              </span>
            ) : publicKey ? '▶️ Start Monitoring' : '🔗 Connect Wallet'}
          </button>
        </div>

        {/* Detected Targets */}
        {targets.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="animate-pulse-glow text-green-400">🔴</span>
              Detected Targets ({targets.length})
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {targets.map((target) => (
                <motion.div
                  key={target.mint}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <h3 className="text-lg sm:text-xl font-bold text-white truncate">{target.name}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm mb-2">{target.platform}</p>
                      <div className="flex flex-wrap gap-3 sm:gap-4">
                        <span className="text-green-400 text-xs sm:text-sm">💰 ${target.liquidity.toLocaleString()}</span>
                        <span className="text-blue-400 text-xs sm:text-sm">👥 {target.holders} holders</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {target.status === 'ready' && (
                        <button
                          onClick={() => snipeToken(target)}
                          className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base shadow-lg whitespace-nowrap"
                        >
                          SNIPE NOW
                        </button>
                      )}
                      {target.status === 'monitoring' && (
                        <span className="flex-1 sm:flex-none bg-yellow-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base text-center whitespace-nowrap">
                          Monitoring...
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dev Fee Notice */}
        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
