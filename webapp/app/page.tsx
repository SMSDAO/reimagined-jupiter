'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  const features = [
    {
      title: '⚡ Flash Loan Arbitrage',
      description: '5-10 providers with 0.09%-0.20% fees',
      href: '/arbitrage',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: '🎯 Sniper Bot',
      description: 'Pump.fun + 8-22 DEX programs',
      href: '/sniper',
      color: 'from-pink-500 to-red-500',
    },
    {
      title: '🚀 Token Launchpad',
      description: 'Launch with airdrop roulette',
      href: '/launchpad',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: '🔄 Jupiter Swap',
      description: 'Best rates across Solana',
      href: '/swap',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: '🎁 Airdrop Checker',
      description: 'Auto-claim with wallet scoring',
      href: '/airdrop',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      title: '💎 Staking',
      description: 'Marinade, Lido, Jito, Kamino',
      href: '/staking',
      color: 'from-indigo-500 to-purple-500',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          GXQ Studio
        </h1>
        <p className="text-2xl text-gray-300">
          The Most Advanced Solana DeFi Platform
        </p>
        <p className="text-lg text-gray-400 max-w-3xl mx-auto">
          Flash loan arbitrage, MEV protection, sniper bot, token launchpad with 3D roulette,
          Jupiter swap integration, and comprehensive staking solutions.
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={feature.href}>
              <div className={`p-6 rounded-xl bg-gradient-to-br ${feature.color} hover:scale-105 transition-transform cursor-pointer`}>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/90">
                  {feature.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">30+</div>
          <div className="text-gray-300">Tokens Supported</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-pink-400">8+ DEXs</div>
          <div className="text-gray-300">Integrated</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-blue-400">5 Providers</div>
          <div className="text-gray-300">Flash Loans</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-green-400">10% Fee</div>
          <div className="text-gray-300">To Dev Wallet</div>
        </div>
      </motion.div>

      {/* Expected Profitability */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-md rounded-xl p-8"
      >
        <h2 className="text-3xl font-bold text-white mb-6">📊 Expected Profitability</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xl font-semibold text-purple-300">Flash Loan Arbitrage</div>
            <div className="text-3xl font-bold text-white">$50-$500/day</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-pink-300">Sniper Bot</div>
            <div className="text-3xl font-bold text-white">$100-$1000/week</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-blue-300">Total Monthly</div>
            <div className="text-3xl font-bold text-white">$2,000-$10,000+</div>
          </div>
        </div>
        <div className="mt-6 text-center text-gray-300">
          💰 ROI: 10x-40x after first month
        </div>
      </motion.div>
    </div>
  );
}
