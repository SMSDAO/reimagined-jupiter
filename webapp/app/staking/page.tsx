'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import PortfolioTracker from '@/components/PortfolioTracker';

interface StakingPool {
  name: string;
  protocol: string;
  apy: number;
  tvl: string;
  minStake: number;
  logo: string;
}

export default function StakingPage() {
  const { publicKey } = useWallet();
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');

  const [pools, setPools] = useState<StakingPool[]>([
    { name: 'mSOL', protocol: 'Marinade', apy: 7.2, tvl: '$1.2B', minStake: 0.01, logo: '🌊' },
    { name: 'stSOL', protocol: 'Lido', apy: 6.8, tvl: '$890M', minStake: 0.01, logo: '🌉' },
    { name: 'jitoSOL', protocol: 'Jito', apy: 8.5, tvl: '$650M', minStake: 0.01, logo: '⚡' },
    { name: 'bSOL', protocol: 'BlazeStake', apy: 7.5, tvl: '$230M', minStake: 0.01, logo: '🔥' },
    { name: 'KMNO', protocol: 'Kamino', apy: 12.3, tvl: '$180M', minStake: 1, logo: '💎' },
  ]);

  // Simulate real-time APY updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPools(prev => prev.map(pool => ({
        ...pool,
        apy: Math.max(5, pool.apy + (Math.random() - 0.5) * 0.2),
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const stakeSOL = async () => {
    if (!publicKey || !selectedPool) {
      alert('Connect wallet and select a pool first!');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) < selectedPool.minStake) {
      alert(`Minimum stake is ${selectedPool.minStake} SOL`);
      return;
    }

    alert(`Staking ${stakeAmount} SOL in ${selectedPool.name}...`);
    // Implement actual staking logic
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">💎 Staking</h1>
        <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8">
          Stake SOL across Marinade, Lido, Jito, and Kamino for maximum yields
        </p>

        {/* Portfolio Tracker */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">📊 Your Portfolio</h2>
          <PortfolioTracker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Staking Pools */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="animate-pulse-glow text-green-400">🔴</span>
              Available Pools
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {pools.map((pool, index) => (
                <motion.div
                  key={pool.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedPool(pool)}
                  className={`bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 cursor-pointer transition-all border ${
                    selectedPool?.name === pool.name 
                      ? 'ring-2 ring-purple-500 border-purple-500 shadow-lg shadow-purple-500/50' 
                      : 'border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl sm:text-4xl">{pool.logo}</div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">{pool.name}</h3>
                        <p className="text-sm sm:text-base text-gray-400">{pool.protocol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold text-green-400">{pool.apy.toFixed(2)}%</div>
                      <div className="text-gray-400 text-xs sm:text-sm">APY</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-400">TVL: </span>
                      <span className="text-white font-bold">{pool.tvl}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Min: </span>
                      <span className="text-white font-bold">{pool.minStake} SOL</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Staking Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 h-fit lg:sticky lg:top-20 border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Stake SOL</h2>
            
            {selectedPool ? (
              <div className="space-y-6">
                <div className="bg-purple-900/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{selectedPool.logo}</div>
                    <div>
                      <div className="text-xl font-bold text-white">{selectedPool.name}</div>
                      <div className="text-gray-400">{selectedPool.protocol}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">APY</div>
                      <div className="text-green-400 font-bold text-lg">{selectedPool.apy}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400">TVL</div>
                      <div className="text-white font-bold text-lg">{selectedPool.tvl}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-white text-xs sm:text-sm mb-2 block">Amount (SOL)</label>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder={`Min: ${selectedPool.minStake} SOL`}
                    className="w-full bg-white/10 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xl sm:text-2xl border border-white/10 focus:border-purple-500 outline-none"
                    step="0.01"
                  />
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[1, 5, 10, 50].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setStakeAmount(amount.toString())}
                        className="bg-white/10 text-white px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-white/20 transition-colors font-medium"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                {stakeAmount && parseFloat(stakeAmount) > 0 && (
                  <div className="bg-blue-900/30 rounded-lg p-4">
                    <div className="text-gray-300 text-sm mb-2">Estimated Returns (1 year)</div>
                    <div className="text-3xl font-bold text-white">
                      {(parseFloat(stakeAmount) * (selectedPool.apy / 100)).toFixed(4)} SOL
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      ≈ ${(parseFloat(stakeAmount) * (selectedPool.apy / 100) * 100).toFixed(2)}
                    </div>
                  </div>
                )}

                <button
                  onClick={stakeSOL}
                  disabled={!publicKey || !stakeAmount}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 shadow-lg text-sm sm:text-base"
                >
                  {publicKey ? '💎 Stake Now' : '🔗 Connect Wallet'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="text-5xl sm:text-6xl mb-4">👆</div>
                <p className="text-sm sm:text-base text-gray-300">Select a staking pool to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 text-center border border-white/10">
            <div className="text-2xl sm:text-3xl mb-2">🚀</div>
            <div className="text-sm sm:text-base text-white font-bold">High APY</div>
            <div className="text-gray-400 text-xs sm:text-sm">Up to 12.3%</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 text-center border border-white/10">
            <div className="text-2xl sm:text-3xl mb-2">💰</div>
            <div className="text-sm sm:text-base text-white font-bold">Liquid Staking</div>
            <div className="text-gray-400 text-xs sm:text-sm">Use staked assets</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 text-center border border-white/10">
            <div className="text-2xl sm:text-3xl mb-2">🔒</div>
            <div className="text-sm sm:text-base text-white font-bold">Secure</div>
            <div className="text-gray-400 text-xs sm:text-sm">Battle-tested</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 text-center border border-white/10">
            <div className="text-2xl sm:text-3xl mb-2">⚡</div>
            <div className="text-sm sm:text-base text-white font-bold">Instant</div>
            <div className="text-gray-400 text-xs sm:text-sm">Start earning now</div>
          </div>
        </motion.div>

        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of staking rewards go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
