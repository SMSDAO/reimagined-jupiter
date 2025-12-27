"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { getTradeStats } from "@/lib/storage";
import { getOptimalConnection } from "@/lib/rpc-rotator";

export default function PortfolioAnalytics() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    avgProfit: 0,
  });

  useEffect(() => {
    const loadStats = () => {
      setStats(getTradeStats());
    };

    loadStats();

    // Update stats every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(0);
        return;
      }

      setLoading(true);
      try {
        const connection = await getOptimalConnection();
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / 1e9); // Convert lamports to SOL
      } catch (error) {
        console.error("[PortfolioAnalytics] Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center">
        <p className="text-gray-300 text-lg">
          Connect your wallet to view portfolio analytics
        </p>
      </div>
    );
  }

  const successRate =
    stats.totalTrades > 0
      ? (stats.successfulTrades / stats.totalTrades) * 100
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-md rounded-xl p-6"
    >
      <h2 className="text-3xl font-bold text-white mb-6">
        📊 Portfolio Analytics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Wallet Balance</div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : `${balance.toFixed(4)} SOL`}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Total Trades</div>
          <div className="text-2xl font-bold text-blue-400">
            {stats.totalTrades}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Success Rate</div>
          <div className="text-2xl font-bold text-green-400">
            {successRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Total Profit</div>
          <div className="text-2xl font-bold text-green-400">
            ${stats.totalProfit.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300 mb-2">Performance</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Successful Trades:</span>
              <span className="text-green-400 font-bold">
                {stats.successfulTrades}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Average Profit:</span>
              <span className="text-blue-400 font-bold">
                ${stats.avgProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300 mb-2">Wallet Info</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Address:</span>
              <span className="text-white font-mono text-xs">
                {publicKey.toString().slice(0, 4)}...
                {publicKey.toString().slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Network:</span>
              <span className="text-purple-400 font-bold">Mainnet</span>
            </div>
          </div>
        </div>
      </div>

      {stats.totalTrades === 0 && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          Start trading to see detailed analytics
        </div>
      )}
    </motion.div>
  );
}
