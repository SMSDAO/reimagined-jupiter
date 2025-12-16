'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadTradeHistory, clearTradeHistory, getTradeStats, TradeHistory as Trade } from '@/lib/storage';

export default function TradeHistory() {
  const [history, setHistory] = useState<Trade[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalProfit: 0,
    avgProfit: 0,
  });

  useEffect(() => {
    const loadData = () => {
      setHistory(loadTradeHistory());
      setStats(getTradeStats());
    };

    loadData();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gxq_trade_history') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all trade history?')) {
      clearTradeHistory();
      setHistory([]);
      setStats({
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalProfit: 0,
        avgProfit: 0,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Total Trades</div>
          <div className="text-2xl font-bold text-white">{stats.totalTrades}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Successful</div>
          <div className="text-2xl font-bold text-green-400">{stats.successfulTrades}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Failed</div>
          <div className="text-2xl font-bold text-red-400">{stats.failedTrades}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Total Profit</div>
          <div className="text-2xl font-bold text-green-400">${stats.totalProfit.toFixed(2)}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="text-sm text-gray-300">Avg Profit</div>
          <div className="text-2xl font-bold text-blue-400">${stats.avgProfit.toFixed(2)}</div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Trade History</h2>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No trades yet. Start trading to see your history here.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={getStatusColor(trade.status)}>
                        {getStatusIcon(trade.status)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        trade.type === 'flash' 
                          ? 'bg-purple-600 text-white' 
                          : trade.type === 'triangular'
                          ? 'bg-blue-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                      <div className="text-white font-semibold">
                        {trade.tokens.join(' → ')}
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <span className="text-gray-300">
                        Input: <span className="text-white">{trade.inputAmount.toFixed(4)}</span>
                      </span>
                      <span className="text-gray-300">
                        Output: <span className="text-white">{trade.outputAmount.toFixed(4)}</span>
                      </span>
                      {trade.profit !== undefined && (
                        <span className="text-gray-300">
                          Profit: <span className="text-green-400">${trade.profit.toFixed(2)} ({trade.profitPercent?.toFixed(2)}%)</span>
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">
                        {new Date(trade.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {trade.txSignature && (
                      <div className="text-xs text-blue-400 mt-1">
                        <a
                          href={`https://solscan.io/tx/${trade.txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          View on Solscan →
                        </a>
                      </div>
                    )}
                    {trade.error && (
                      <div className="text-xs text-red-400 mt-1">
                        Error: {trade.error}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
