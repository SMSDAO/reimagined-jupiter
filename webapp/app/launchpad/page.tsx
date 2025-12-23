'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import AirdropSpinGame from '@/components/AirdropSpinGame';
import UnifiedTradingPanel from '@/components/Trading/UnifiedTradingPanel';
import InstructionPanel from '@/components/Trading/InstructionPanel';

export default function LaunchpadPage() {
  const { publicKey } = useWallet();
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState('1000000');
  const [airdropPercent, setAirdropPercent] = useState(10);
  const [deploymentCost] = useState(0.01);
  const [showSpinGame, setShowSpinGame] = useState(false);
  const [deployedToken, setDeployedToken] = useState<string | null>(null);
  // Gas settings prepared for future use
  // const [slippage, setSlippage] = useState(1);
  // const [gasLimit, setGasLimit] = useState(400000);
  // const [priorityFee, setPriorityFee] = useState(1000000);

  const deployToken = async () => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    if (!tokenName || !tokenSymbol) {
      alert('Please fill in all fields!');
      return;
    }

    // Simulate deployment
    setDeployedToken(tokenSymbol);
    setShowSpinGame(true);
    alert(`✅ Successfully deployed ${tokenName} (${tokenSymbol})!\n\nToken can now be used in the airdrop spin game.`);
  };

  const handleWin = (amount: number) => {
    console.log(`Won ${amount} ${deployedToken || tokenSymbol}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          🚀 Token Launchpad Studio
        </h1>
        <p className="text-gray-300 dark:text-gray-200 mb-8">
          Launch your token with advanced airdrop roulette game - Jupiter, Raydium, Pump.fun integrated
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Token Creation Panel */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 glow-blue">
            <h2 className="text-2xl font-bold text-white mb-6">📝 Token Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Token Name</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="My Awesome Token"
                  className="w-full bg-white/10 dark:bg-black/20 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Token Symbol</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="MAT"
                  maxLength={10}
                  className="w-full bg-white/10 dark:bg-black/20 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Total Supply</label>
                <input
                  type="number"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                  className="w-full bg-white/10 dark:bg-black/20 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">
                  Airdrop for Roulette: {airdropPercent}%
                </label>
                <input
                  type="range"
                  value={airdropPercent}
                  onChange={(e) => setAirdropPercent(parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1%</span>
                  <span>50%</span>
                </div>
              </div>

              <div className="bg-purple-900/30 dark:bg-purple-950/50 rounded-lg p-4 border border-purple-500/20">
                <div className="flex justify-between text-white mb-2">
                  <span>Deployment Cost:</span>
                  <span className="font-bold">{deploymentCost} SOL</span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>For Circulation:</span>
                  <span>{(parseFloat(totalSupply) * (100 - airdropPercent) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>For Roulette:</span>
                  <span>{(parseFloat(totalSupply) * airdropPercent / 100).toLocaleString()}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={deployToken}
                disabled={!publicKey || !tokenName || !tokenSymbol}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed glow-blue"
              >
                {publicKey ? `🚀 Deploy Token (${deploymentCost} SOL)` : 'Connect Wallet'}
              </motion.button>
            </div>
          </div>

          {/* 3D Roulette Game */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 glow-purple">
            <h2 className="text-2xl font-bold text-white mb-6">🎰 Airdrop Roulette Game</h2>
            
            {showSpinGame && deployedToken ? (
              <AirdropSpinGame tokenSymbol={deployedToken} onWin={handleWin} />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎲</div>
                <p className="text-gray-300 dark:text-gray-200 mb-4">
                  Deploy a token to activate the airdrop spin game
                </p>
                <div className="text-sm text-gray-400">
                  • 12-hour cooldown between spins<br />
                  • Reduced wait time after 3 days<br />
                  • Win tokens from the airdrop pool
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 text-center glow-blue card-3d"
          >
            <div className="text-4xl mb-2">🌐</div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Platform</h3>
            <p className="text-gray-300 dark:text-gray-200 text-sm">Jupiter Studio, Raydium, Pump.fun</p>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 text-center glow-purple card-3d"
          >
            <div className="text-4xl mb-2">🎨</div>
            <h3 className="text-xl font-bold text-white mb-2">3D Design</h3>
            <p className="text-gray-300 dark:text-gray-200 text-sm">Solana style neon FX with aura effects</p>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 text-center glow-green card-3d"
          >
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Deploy</h3>
            <p className="text-gray-300 dark:text-gray-200 text-sm">0.01 SOL deployment cost</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 text-center glow-pink card-3d"
          >
            <div className="text-4xl mb-2">🎰</div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Rewards</h3>
            <p className="text-gray-300 dark:text-gray-200 text-sm">12hr cooldown, faster after 3 days</p>
          </motion.div>
        </div>

        {/* Integration Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 dark:from-purple-950/70 dark:to-blue-950/70 backdrop-blur-md rounded-xl p-6 border border-purple-500/30"
        >
          <h3 className="text-2xl font-bold text-white mb-4">🔗 Integrated Platforms</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['Jupiter', 'Raydium', 'Pump.fun', 'Orca', 'Meteora'].map((platform) => (
              <div key={platform} className="bg-white/10 dark:bg-black/20 rounded-lg p-3 text-center text-white font-semibold hover:bg-white/20 transition">
                {platform}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana | 🎯 Earn GXQ tokens through affiliate program
        </div>
      </motion.div>
    </div>
  );
}
