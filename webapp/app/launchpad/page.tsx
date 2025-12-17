'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';

export default function LaunchpadPage() {
  const { publicKey } = useWallet();
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState('1000000');
  const [airdropPercent, setAirdropPercent] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [deploymentCost] = useState(0.01);

  const deployToken = async () => {
    if (!publicKey) {
      alert('Connect wallet first!');
      return;
    }

    if (!tokenName || !tokenSymbol) {
      alert('Please fill in all fields!');
      return;
    }

    try {
      alert(`Preparing to deploy ${tokenName} (${tokenSymbol})...\n\nNote: Token deployment requires:\n- SPL Token program integration\n- Metadata creation via Metaplex\n- Initial liquidity provision\n- Pool creation on DEX\n\nThis feature requires backend integration for secure token creation.`);
      
      // Real implementation would:
      // 1. Create token mint with @solana/spl-token
      // 2. Create token metadata with Metaplex
      // 3. Mint initial supply
      // 4. Set up airdrop allocation
      // 5. Create liquidity pool on Raydium/Orca/Jupiter
      // 6. Initialize roulette contract
      
      console.log('[Launchpad] Token deployment parameters:', {
        name: tokenName,
        symbol: tokenSymbol,
        supply: totalSupply,
        airdropPercent,
        deploymentCost,
      });
    } catch (error) {
      console.error('[Launchpad] Deployment error:', error);
      alert('Token deployment failed. Please try again.');
    }
  };

  const spinRoulette = () => {
    if (!tokenSymbol) {
      alert('Please set a token symbol first!');
      return;
    }
    
    setSpinning(true);
    
    // Realistic roulette simulation with weighted probabilities
    setTimeout(() => {
      setSpinning(false);
      
      // Weighted random: 50% small, 30% good, 15% big, 5% grand
      const rand = Math.random();
      let reward = 0;
      let tier = '';
      
      if (rand < 0.50) {
        reward = 100;
        tier = 'Small Win 🎯';
      } else if (rand < 0.80) {
        reward = 1000;
        tier = 'Good Win 🥉';
      } else if (rand < 0.95) {
        reward = 5000;
        tier = 'Big Win 🥈';
      } else {
        reward = 10000;
        tier = 'Grand Prize 🥇';
      }
      
      alert(`🎉 ${tier}\n\nYou won ${reward} ${tokenSymbol}!\n\nNote: This is a demonstration. Real roulette would require:\n- On-chain smart contract\n- Verifiable random function (VRF)\n- Token distribution logic`);
      
      console.log('[Launchpad] Roulette result:', { reward, tier, token: tokenSymbol });
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2">🚀 Token Launchpad</h1>
        <p className="text-gray-300 mb-8">
          Launch your token with advanced airdrop roulette game
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Token Creation Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">📝 Token Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Token Name</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="My Awesome Token"
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg"
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
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Total Supply</label>
                <input
                  type="number"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg"
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
                  className="w-full"
                />
              </div>

              <div className="bg-purple-900/30 rounded-lg p-4">
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

              <button
                onClick={deployToken}
                disabled={!publicKey || !tokenName || !tokenSymbol}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50"
              >
                {publicKey ? `🚀 Deploy Token (${deploymentCost} SOL)` : 'Connect Wallet'}
              </button>
            </div>
          </div>

          {/* 3D Roulette Game */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">🎰 Airdrop Roulette</h2>
            
            <div className="relative">
              {/* Roulette Wheel Visualization */}
              <div className="aspect-square bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 rounded-full flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={spinning ? { rotate: 360 } : {}}
                  transition={{ duration: 3, ease: "easeInOut", repeat: spinning ? Infinity : 0 }}
                  className="absolute inset-0"
                  style={{
                    background: 'conic-gradient(from 0deg, #9333ea, #ec4899, #3b82f6, #10b981, #eab308, #ef4444, #9333ea)',
                  }}
                />
                <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded-full w-3/4 h-3/4 flex flex-col items-center justify-center">
                  <div className="text-white text-4xl font-bold mb-2">🎁</div>
                  <div className="text-white text-xl font-bold">
                    {spinning ? 'Spinning...' : 'Spin to Win!'}
                  </div>
                </div>
              </div>

              {/* Prize Tiers */}
              <div className="mt-6 space-y-3">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-3 text-white">
                  <div className="flex justify-between">
                    <span>🥇 Grand Prize</span>
                    <span className="font-bold">10,000 tokens</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-3 text-white">
                  <div className="flex justify-between">
                    <span>🥈 Big Win</span>
                    <span className="font-bold">5,000 tokens</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-3 text-white">
                  <div className="flex justify-between">
                    <span>🥉 Good Win</span>
                    <span className="font-bold">1,000 tokens</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-3 text-white">
                  <div className="flex justify-between">
                    <span>🎯 Small Win</span>
                    <span className="font-bold">100 tokens</span>
                  </div>
                </div>
              </div>

              <button
                onClick={spinRoulette}
                disabled={spinning || !tokenSymbol}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
              >
                {spinning ? '🎰 Spinning...' : '🎰 Spin Roulette'}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🌐</div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Platform</h3>
            <p className="text-gray-300">Pump.fun, Raydium, Jupiter Studio</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🎨</div>
            <h3 className="text-xl font-bold text-white mb-2">3D Design</h3>
            <p className="text-gray-300">Modern Solana digital purple, blue, green FX</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Deploy</h3>
            <p className="text-gray-300">0.01 SOL deployment cost</p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
