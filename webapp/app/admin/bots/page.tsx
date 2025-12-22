'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Bot {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  autoExecute: boolean;
  lastExecutedAt: string | null;
  metrics: {
    executionsLastHour: number;
    executionsToday: number;
    totalSuccessful: number;
    totalFailed: number;
    gasSpentToday: number;
    profitToday: number;
  };
}

interface Execution {
  id: string;
  botConfigId: string;
  botName: string;
  executionType: string;
  status: string;
  transactionSignature: string | null;
  profitLossLamports: number;
  totalFeeLamports: number;
  executionTimeMs: number;
  startedAt: string;
  completedAt: string | null;
}

interface TelemetryData {
  totalExecutions: number;
  successful: number;
  failed: number;
  successRate: number;
  avgExecutionTimeMs: number;
  totalGasSpent: number;
  totalProfitLoss: number;
  hourlyBreakdown: Array<{
    hour: string;
    executions: number;
    successful: number;
    failed: number;
    gasSpent: number;
    profitLoss: number;
  }>;
}

export default function BotsAdminPage() {
  const { publicKey } = useWallet();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load bots on mount and when wallet changes
  useEffect(() => {
    if (publicKey) {
      loadBots();
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        loadBots();
        if (selectedBot) {
          loadTelemetry(selectedBot);
          loadExecutions(selectedBot);
        }
      }, 5000);
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [publicKey, selectedBot]);

  const loadBots = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/bot/telemetry/status?userId=${publicKey.toBase58()}`);
      const data = await response.json();

      if (data.success) {
        setBots(data.bots);
        setError(null);
      } else {
        setError('Failed to load bots');
      }
    } catch (err) {
      console.error('Error loading bots:', err);
      setError('Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  const loadTelemetry = async (botId: string) => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `/api/bot/telemetry/performance?userId=${publicKey.toBase58()}&botConfigId=${botId}&hours=24`
      );
      const data = await response.json();

      if (data.success) {
        setTelemetry(data.performance);
      }
    } catch (err) {
      console.error('Error loading telemetry:', err);
    }
  };

  const loadExecutions = async (botId: string) => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `/api/bot/execute/history?userId=${publicKey.toBase58()}&botConfigId=${botId}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setExecutions(data.executions);
      }
    } catch (err) {
      console.error('Error loading executions:', err);
    }
  };

  const toggleBot = async (botId: string, currentState: boolean) => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/bot/manage/${botId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: publicKey.toBase58(),
          enabled: !currentState,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Bot ${!currentState ? 'enabled' : 'disabled'} successfully`);
        loadBots();
      } else {
        alert(`Failed to toggle bot: ${data.error}`);
      }
    } catch (err) {
      console.error('Error toggling bot:', err);
      alert('Failed to toggle bot');
    }
  };

  const stopBot = async (botId: string) => {
    if (!publicKey) return;

    if (!confirm('Are you sure you want to stop this bot?')) {
      return;
    }

    try {
      const response = await fetch('/api/bot/execute/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: publicKey.toBase58(),
          botConfigId: botId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Bot stopped successfully');
        loadBots();
      } else {
        alert(`Failed to stop bot: ${data.error}`);
      }
    } catch (err) {
      console.error('Error stopping bot:', err);
      alert('Failed to stop bot');
    }
  };

  const formatLamports = (lamports: number): string => {
    return (lamports / 1e9).toFixed(4) + ' SOL';
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-xl text-gray-300">Please connect your wallet to view bot management dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading bots...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Bot Management Dashboard
          </h1>
          <p className="text-gray-400 text-lg">
            Monitor and control your trading bots
          </p>
        </motion.div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Bot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className={`bg-slate-800/50 backdrop-blur-lg border ${
                selectedBot === bot.id ? 'border-purple-500' : 'border-gray-700'
              } rounded-lg p-6 cursor-pointer`}
              onClick={() => {
                setSelectedBot(bot.id);
                loadTelemetry(bot.id);
                loadExecutions(bot.id);
              }}
            >
              {/* Bot Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{bot.name}</h3>
                  <p className="text-sm text-gray-400">{bot.type.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      bot.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                    }`}
                  ></div>
                  <span className="text-xs text-gray-400">
                    {bot.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Bot Metrics */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Executions (1h):</span>
                  <span className="text-white font-semibold">{bot.metrics.executionsLastHour}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Success Rate:</span>
                  <span className="text-green-400 font-semibold">
                    {bot.metrics.totalSuccessful + bot.metrics.totalFailed > 0
                      ? Math.round(
                          (bot.metrics.totalSuccessful /
                            (bot.metrics.totalSuccessful + bot.metrics.totalFailed)) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Profit Today:</span>
                  <span
                    className={`font-semibold ${
                      bot.metrics.profitToday >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatLamports(bot.metrics.profitToday)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Gas Spent:</span>
                  <span className="text-orange-400 font-semibold">
                    {formatLamports(bot.metrics.gasSpentToday)}
                  </span>
                </div>
              </div>

              {/* Bot Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBot(bot.id, bot.enabled);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                    bot.enabled
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {bot.enabled ? 'Disable' : 'Enable'}
                </button>
                {bot.enabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopBot(bot.id);
                    }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"
                  >
                    Stop
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {/* Add New Bot Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-slate-800/30 backdrop-blur-lg border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer flex items-center justify-center"
            onClick={() => alert('Bot creation UI coming soon')}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">+</div>
              <p className="text-gray-400">Create New Bot</p>
            </div>
          </motion.div>
        </div>

        {/* Detailed View */}
        {selectedBot && telemetry && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-lg border border-gray-700 rounded-lg p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Bot Performance Details</h2>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Executions (24h)</p>
                <p className="text-2xl font-bold text-white">{telemetry.totalExecutions}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">{telemetry.successRate.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Avg Execution Time</p>
                <p className="text-2xl font-bold text-blue-400">{telemetry.avgExecutionTimeMs.toFixed(0)}ms</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Net Profit (24h)</p>
                <p
                  className={`text-2xl font-bold ${
                    telemetry.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {formatLamports(telemetry.totalProfitLoss)}
                </p>
              </div>
            </div>

            {/* Recent Executions */}
            <h3 className="text-xl font-bold text-white mb-4">Recent Executions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400">Profit/Loss</th>
                    <th className="text-left py-3 px-4 text-gray-400">Gas</th>
                    <th className="text-left py-3 px-4 text-gray-400">Time</th>
                    <th className="text-left py-3 px-4 text-gray-400">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec) => (
                    <tr key={exec.id} className="border-b border-gray-800 hover:bg-slate-900/30">
                      <td className="py-3 px-4 text-white">{exec.executionType}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            exec.status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {exec.status}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 font-semibold ${
                          exec.profitLossLamports >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatLamports(exec.profitLossLamports)}
                      </td>
                      <td className="py-3 px-4 text-orange-400">{formatLamports(exec.totalFeeLamports)}</td>
                      <td className="py-3 px-4 text-gray-400">{exec.executionTimeMs}ms</td>
                      <td className="py-3 px-4 text-gray-400">
                        {exec.transactionSignature ? (
                          <a
                            href={`https://solscan.io/tx/${exec.transactionSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            {exec.transactionSignature.slice(0, 8)}...
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
