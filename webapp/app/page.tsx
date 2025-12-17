'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import LiveTicker from '@/components/LiveTicker';
import StatCard from '@/components/StatCard';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import { useState, useEffect } from 'react';

export default function Home() {
  const [liveStats, setLiveStats] = useState({
    opportunities: 12,
    profit24h: 234.56,
    activeTrades: 8,
    successRate: 94.2,
  });

  // Simulate real-time stat updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        opportunities: Math.max(0, prev.opportunities + Math.floor((Math.random() - 0.5) * 3)),
        profit24h: Math.max(0, prev.profit24h + (Math.random() - 0.3) * 10),
        activeTrades: Math.max(0, prev.activeTrades + Math.floor((Math.random() - 0.5) * 2)),
        successRate: Math.max(85, Math.min(99, prev.successRate + (Math.random() - 0.5) * 0.5)),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    {
      title: '🔍 Wallet Analysis',
      description: 'Professional wallet forensics & risk assessment',
      href: '/wallet-analysis',
      color: 'from-cyan-500 to-blue-500',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 sm:space-y-6 px-4"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          GXQ Studio
        </h1>
        <p className="text-xl sm:text-2xl text-gray-300">
          The Most Advanced Solana DeFi Platform
        </p>
        <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto">
          Flash loan arbitrage, MEV protection, sniper bot, token launchpad with 3D roulette,
          Jupiter swap integration, and comprehensive staking solutions.
        </p>
      </motion.div>

      {/* Live Ticker */}
      <LiveTicker />

      {/* Real-time Stats Dashboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 px-4">
          📊 Live Dashboard
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard
            icon="🔍"
            label="Active Opportunities"
            value={liveStats.opportunities}
            color="text-purple-400"
            trend="up"
            trendValue="+3 today"
          />
          <StatCard
            icon="💰"
            label="24h Profit"
            value={`$${liveStats.profit24h.toFixed(2)}`}
            color="text-green-400"
            trend="up"
            trendValue="+12.5%"
          />
          <StatCard
            icon="⚡"
            label="Active Trades"
            value={liveStats.activeTrades}
            color="text-blue-400"
            trend="neutral"
            trendValue="stable"
          />
          <StatCard
            icon="✅"
            label="Success Rate"
            value={`${liveStats.successRate.toFixed(1)}%`}
            color="text-pink-400"
            trend="up"
            trendValue="+0.3%"
          />
        </div>
      </motion.div>

      {/* Features Grid with Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Features - 2 columns on large screens */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 px-4 lg:px-0">
            🚀 Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Link href={feature.href}>
                  <div className={`p-4 sm:p-6 rounded-xl bg-gradient-to-br ${feature.color} hover:scale-105 transition-transform cursor-pointer shadow-xl h-full`}>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-white/90">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed - 1 column on large screens */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <LiveActivityFeed />
          </motion.div>
        </div>
      </div>

      {/* Platform Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center border border-white/10">
          <div className="text-2xl sm:text-3xl font-bold text-purple-400">30+</div>
          <div className="text-sm sm:text-base text-gray-300 mt-1">Tokens Supported</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center border border-white/10">
          <div className="text-2xl sm:text-3xl font-bold text-pink-400">8+ DEXs</div>
          <div className="text-sm sm:text-base text-gray-300 mt-1">Integrated</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center border border-white/10">
          <div className="text-2xl sm:text-3xl font-bold text-blue-400">5 Providers</div>
          <div className="text-sm sm:text-base text-gray-300 mt-1">Flash Loans</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center border border-white/10">
          <div className="text-2xl sm:text-3xl font-bold text-green-400">10% Fee</div>
          <div className="text-sm sm:text-base text-gray-300 mt-1">To Dev Wallet</div>
        </div>
      </motion.div>

      {/* Expected Profitability */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-md rounded-xl p-6 sm:p-8 border border-white/10"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">📊 Expected Profitability</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center sm:text-left">
            <div className="text-lg sm:text-xl font-semibold text-purple-300 mb-1">Flash Loan Arbitrage</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">$50-$500/day</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-lg sm:text-xl font-semibold text-pink-300 mb-1">Sniper Bot</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">$100-$1000/week</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-lg sm:text-xl font-semibold text-blue-300 mb-1">Total Monthly</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">$2,000-$10,000+</div>
          </div>
        </div>
        <div className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-300">
          💰 ROI: 10x-40x after first month
        </div>
      </motion.div>
    </div>
  );
}
