'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Admin Audit Logs Viewer
 * View and filter wallet governance audit logs
 * 
 * SECURITY: Admin authentication required
 */

interface AuditLog {
  id: string;
  userId: string;
  subWalletId: string;
  walletPublicKey: string;
  userMainWallet: string;
  subWalletPublicKey: string;
  eventType: string;
  eventAction: string;
  eventDescription: string;
  status: string;
  createdAt: string;
  amountSol?: number;
  profitSol?: number;
  errorMessage?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // Filters
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);

  // Load logs on mount if authenticated
  useEffect(() => {
    if (authToken) {
      loadLogs();
    }
  }, [authToken, eventType, status, limit, offset]);

  // Admin login
  const login = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAuthToken(data.token);
        console.log('✅ Admin login successful');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Load audit logs
  const loadLogs = async () => {
    if (!authToken) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (eventType) params.append('eventType', eventType);
      if (status) params.append('status', status);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(data.error || 'Failed to load logs');
      }
    } catch (err) {
      console.error('Load logs error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get event type color
  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'wallet_created':
      case 'wallet_imported':
        return 'bg-green-500/20 text-green-400';
      case 'wallet_exported':
        return 'bg-orange-500/20 text-orange-400';
      case 'wallet_deleted':
        return 'bg-red-500/20 text-red-400';
      case 'trade_executed':
        return 'bg-blue-500/20 text-blue-400';
      case 'trade_failed':
        return 'bg-red-500/20 text-red-400';
      case 'user_login':
        return 'bg-purple-500/20 text-purple-400';
      case 'balance_check':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failure':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  // Login screen
  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-gray-300">Access wallet governance audit logs</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={login} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/admin" className="text-blue-400 hover:text-blue-300">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Wallet Governance Audit Logs</h1>
            <p className="text-gray-300">Monitor all wallet operations and user activity</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  setOffset(0);
                }}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Events</option>
                <option value="wallet_created">Wallet Created</option>
                <option value="wallet_imported">Wallet Imported</option>
                <option value="wallet_exported">Wallet Exported</option>
                <option value="wallet_deleted">Wallet Deleted</option>
                <option value="trade_executed">Trade Executed</option>
                <option value="trade_failed">Trade Failed</option>
                <option value="user_login">User Login</option>
                <option value="balance_check">Balance Check</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOffset(0);
                }}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Limit</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setOffset(0);
                }}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">&nbsp;</label>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-all disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={loading || offset === 0}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-white">
            Showing {offset + 1} - {offset + logs.length}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={loading || logs.length < limit}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        {/* Logs table */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="text-center py-20 text-white">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              <p className="mt-4">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl">No audit logs found</p>
              <p className="mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-white font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Event Type</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Action</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Wallet</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={`border-t border-white/10 ${
                        index % 2 === 0 ? 'bg-black/20' : 'bg-black/10'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getEventTypeColor(log.eventType)}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {log.eventAction}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm font-mono">
                        {log.walletPublicKey ? (
                          <>
                            {log.walletPublicKey.slice(0, 4)}...{log.walletPublicKey.slice(-4)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {log.eventDescription || '-'}
                        {log.amountSol && (
                          <div className="text-xs text-gray-400 mt-1">
                            Amount: {log.amountSol} SOL
                          </div>
                        )}
                        {log.profitSol && (
                          <div className="text-xs text-green-400 mt-1">
                            Profit: {log.profitSol} SOL
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="text-xs text-red-400 mt-1">
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary statistics */}
        {logs.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Logs</p>
              <p className="text-white text-2xl font-bold">{logs.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-green-400 text-2xl font-bold">
                {((logs.filter(l => l.status === 'success').length / logs.length) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Trades</p>
              <p className="text-white text-2xl font-bold">
                {logs.filter(l => l.eventType === 'trade_executed').length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Profit</p>
              <p className="text-green-400 text-2xl font-bold">
                {logs.reduce((sum, l) => sum + (l.profitSol || 0), 0).toFixed(4)} SOL
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
