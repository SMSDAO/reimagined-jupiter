"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  const features = [
    {
      title: "⚡ Flash Loan Arbitrage",
      description: "5-10 providers with 0.09%-0.20% fees",
      href: "/arbitrage",
      color: "from-purple-500 to-pink-500",
      glow: "glow-purple",
    },
    {
      title: "🎯 Sniper Bot",
      description: "Pump.fun + 8-22 DEX programs",
      href: "/sniper",
      color: "from-pink-500 to-red-500",
      glow: "glow-pink",
    },
    {
      title: "🚀 Token Launchpad",
      description: "Launch with airdrop roulette",
      href: "/launchpad",
      color: "from-blue-500 to-cyan-500",
      glow: "glow-blue",
    },
    {
      title: "🔄 Jupiter Swap",
      description: "Best rates across Solana",
      href: "/swap",
      color: "from-green-500 to-emerald-500",
      glow: "glow-green",
    },
    {
      title: "🎁 Airdrop Checker",
      description: "Auto-claim with wallet scoring",
      href: "/airdrop",
      color: "from-yellow-500 to-orange-500",
      glow: "glow-pink",
    },
    {
      title: "💎 Staking",
      description: "Marinade, Lido, Jito, Kamino",
      href: "/staking",
      color: "from-indigo-500 to-purple-500",
      glow: "glow-purple",
    },
    {
      title: "🔍 Wallet Analysis",
      description: "Social intelligence & risk assessment",
      href: "/wallet-analysis",
      color: "from-cyan-500 to-blue-500",
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
        <motion.h1
          className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent pulse-glow"
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          GXQ Studio
        </motion.h1>
        <motion.p
          className="text-2xl md:text-3xl text-gray-300 dark:text-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          The Most Advanced Solana DeFi Platform
        </motion.p>
        <motion.p
          className="text-lg text-gray-400 dark:text-gray-300 max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Flash loan arbitrage, MEV protection, sniper bot, token launchpad with
          3D roulette, Jupiter swap integration, and comprehensive staking
          solutions.
        </motion.p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, rotateY: 5 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href={feature.href}>
              <div
                className={`p-6 rounded-xl bg-gradient-to-br ${feature.color} ${feature.glow} hover:shadow-2xl transition-all cursor-pointer card-3d aura-effect`}
              >
                <h3 className="text-2xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/90">{feature.description}</p>
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
        {[
          { value: "30+", label: "Tokens Supported", color: "text-purple-400" },
          { value: "8+ DEXs", label: "Integrated", color: "text-pink-400" },
          {
            value: "5 Providers",
            label: "Flash Loans",
            color: "text-blue-400",
          },
          { value: "10% Fee", label: "To Dev Wallet", color: "text-green-400" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            whileHover={{ scale: 1.1 }}
            className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6 text-center glow-blue hover:glow-purple transition-all"
          >
            <div className={`text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-gray-300 dark:text-gray-200">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Expected Profitability */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 dark:from-purple-950/70 dark:to-blue-950/70 backdrop-blur-md rounded-xl p-8 glow-purple"
      >
        <h2 className="text-3xl font-bold text-white mb-6">
          📊 Expected Profitability
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 p-4 rounded-lg"
          >
            <div className="text-xl font-semibold text-purple-300">
              Flash Loan Arbitrage
            </div>
            <div className="text-3xl font-bold text-white">$50-$500/day</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 p-4 rounded-lg"
          >
            <div className="text-xl font-semibold text-pink-300">
              Sniper Bot
            </div>
            <div className="text-3xl font-bold text-white">$100-$1000/week</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 p-4 rounded-lg"
          >
            <div className="text-xl font-semibold text-blue-300">
              Total Monthly
            </div>
            <div className="text-3xl font-bold text-white">$2,000-$10,000+</div>
          </motion.div>
        </div>
        <div className="mt-6 text-center text-gray-300 text-lg">
          💰 ROI: 10x-40x after first month
        </div>
      </motion.div>
    </div>
  );
}
