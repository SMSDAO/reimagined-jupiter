'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Audit Logs Viewer Component
 * For admin panel - view and export audit logs
 */

interface AuditLogEntry {
  timestamp: string;
  operation: string;
  walletAddress?: string;
  walletCount?: number;
  score?: number;
  tier?: string;
  riskLevel?: string;
  duration: number;
  success: boolean;
  error?: string;
}

interface AuditStats {
  totalOperations: number;
  successRate: number;
  avgDuration: number;
  operationCounts: Record<string, number>;
  failureReasons: Record<string, number>;
}

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  /**
   * Fetch audit logs
   */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit-logs?action=recent&limit=50');
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export logs as JSON
   */
  const exportJSON = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs?action=export-json');
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Export logs as CSV
   */
  const exportCSV = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs?action=export-csv');
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchLogs();
  }, []);

  /**
   * Get operation badge color
   */
  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'wallet-analysis':
        return 'bg-blue-600';
      case 'batch-scoring':
        return 'bg-purple-600';
      case 'export':
        return 'bg-green-600';
      case 'admin-action':
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">📜 Audit Logs</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-white text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
        <button
          onClick={exportJSON}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          📥 Export JSON
        </button>
        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Statistics Summary */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-lg p-4 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-3">📊 Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Total Operations</div>
              <div className="text-white font-bold text-xl">{stats.totalOperations}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Success Rate</div>
              <div className="text-green-400 font-bold text-xl">{stats.successRate}%</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Avg Duration</div>
              <div className="text-white font-bold text-xl">{stats.avgDuration}ms</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Analyses</div>
              <div className="text-blue-400 font-bold text-xl">
                {stats.operationCounts['wallet-analysis'] || 0}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Logs Table */}
      {logs.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-white/10 sticky top-0">
                <tr>
                  <th className="text-left text-white font-bold p-3 text-sm">Timestamp</th>
                  <th className="text-center text-white font-bold p-3 text-sm">Operation</th>
                  <th className="text-left text-white font-bold p-3 text-sm">Details</th>
                  <th className="text-right text-white font-bold p-3 text-sm">Duration</th>
                  <th className="text-center text-white font-bold p-3 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr
                    key={`${log.timestamp}-${index}`}
                    className={`border-t border-white/10 ${
                      index % 2 === 0 ? 'bg-white/5' : ''
                    }`}
                  >
                    <td className="p-3 text-white text-xs font-mono">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`${getOperationColor(
                          log.operation
                        )} text-white text-xs font-bold px-2 py-1 rounded`}
                      >
                        {log.operation}
                      </span>
                    </td>
                    <td className="p-3 text-white text-sm">
                      {log.walletAddress && (
                        <div className="font-mono text-xs">{log.walletAddress}</div>
                      )}
                      {log.walletCount && (
                        <div className="text-gray-300">{log.walletCount} wallets</div>
                      )}
                      {log.score && (
                        <div className="text-gray-300">
                          Score: {log.score} | {log.tier}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right text-white">{log.duration}ms</td>
                    <td className="p-3 text-center">
                      {log.success ? (
                        <span className="text-green-400">✅</span>
                      ) : (
                        <span className="text-red-400" title={log.error}>
                          ❌
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          {loading ? 'Loading logs...' : 'No audit logs found'}
        </div>
      )}
    </div>
  );
}
