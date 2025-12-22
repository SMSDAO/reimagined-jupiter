'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Portfolio Analytics Dashboard Component
 * For admin panel - batch wallet analysis and export
 */

interface WalletAnalysisResult {
  address: string;
  score: number;
  tier: string;
  balance: number;
  transactions: number;
  successRate: number;
  error?: string;
}

interface PortfolioAnalyticsProps {
  onExport?: (data: WalletAnalysisResult[]) => void;
}

export default function PortfolioAnalyticsDashboard({ onExport }: PortfolioAnalyticsProps) {
  const [walletAddresses, setWalletAddresses] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<WalletAnalysisResult[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    avgScore: number;
    tierCounts: Record<string, number>;
  } | null>(null);

  /**
   * Batch analyze multiple wallets
   */
  const analyzeBatch = async () => {
    const addresses = walletAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    if (addresses.length === 0) {
      alert('Please enter at least one wallet address');
      return;
    }

    setAnalyzing(true);
    setResults([]);
    setStats(null);

    try {
      const response = await fetch('/api/admin/portfolio-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallets: addresses,
          action: 'batch-score',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to analyze wallets');
      }
    } catch (error) {
      console.error('Error analyzing wallets:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Export results as CSV
   */
  const exportResults = async () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    const addresses = results.map(r => r.address);

    try {
      const response = await fetch('/api/admin/portfolio-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallets: addresses,
          action: 'export',
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-analytics-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (onExport) {
        onExport(results);
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Get tier badge color
   */
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'WHALE':
        return 'bg-purple-600';
      case 'DEGEN':
        return 'bg-blue-600';
      case 'ACTIVE':
        return 'bg-green-600';
      case 'CASUAL':
        return 'bg-yellow-600';
      case 'NOVICE':
        return 'bg-gray-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">📊 Portfolio Analytics</h2>

      {/* Input Section */}
      <div className="mb-6">
        <label className="block text-sm text-gray-300 mb-2">
          Enter wallet addresses (one per line):
        </label>
        <textarea
          value={walletAddresses}
          onChange={(e) => setWalletAddresses(e.target.value)}
          placeholder="Enter Solana wallet addresses...&#10;One address per line"
          className="w-full h-32 bg-white/10 text-white rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="text-xs text-gray-400 mt-1">
          {walletAddresses.split('\n').filter(a => a.trim()).length} addresses entered
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={analyzeBatch}
          disabled={analyzing || walletAddresses.trim().length === 0}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 transition"
        >
          {analyzing ? '🔄 Analyzing...' : '🔍 Analyze Wallets'}
        </button>
        <button
          onClick={exportResults}
          disabled={results.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 transition"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-lg p-4 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-3">📈 Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Total Wallets</div>
              <div className="text-white font-bold text-xl">{stats.total}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Avg Score</div>
              <div className="text-white font-bold text-xl">{stats.avgScore}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Whales</div>
              <div className="text-purple-400 font-bold text-xl">
                {stats.tierCounts.WHALE || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Active</div>
              <div className="text-green-400 font-bold text-xl">
                {(stats.tierCounts.DEGEN || 0) + (stats.tierCounts.ACTIVE || 0)}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10">
                <tr>
                  <th className="text-left text-white font-bold p-3 text-sm">Address</th>
                  <th className="text-center text-white font-bold p-3 text-sm">Score</th>
                  <th className="text-center text-white font-bold p-3 text-sm">Tier</th>
                  <th className="text-right text-white font-bold p-3 text-sm">Balance</th>
                  <th className="text-right text-white font-bold p-3 text-sm">TXs</th>
                  <th className="text-right text-white font-bold p-3 text-sm">Success</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr
                    key={result.address}
                    className={`border-t border-white/10 ${
                      index % 2 === 0 ? 'bg-white/5' : ''
                    }`}
                  >
                    <td className="p-3 text-white font-mono text-xs">
                      {result.address.slice(0, 8)}...{result.address.slice(-6)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-white font-bold">{result.score}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`${getTierColor(
                          result.tier
                        )} text-white text-xs font-bold px-2 py-1 rounded`}
                      >
                        {result.tier}
                      </span>
                    </td>
                    <td className="p-3 text-right text-white">
                      {result.balance.toFixed(2)} SOL
                    </td>
                    <td className="p-3 text-right text-white">{result.transactions}</td>
                    <td className="p-3 text-right text-green-400">{result.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!analyzing && results.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          Enter wallet addresses above and click "Analyze Wallets" to get started
        </div>
      )}
    </div>
  );
}
