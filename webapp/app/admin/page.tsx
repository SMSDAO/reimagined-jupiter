'use client';

/**
 * Secured Admin Panel
 * Requires authentication via JWT tokens
 * All controls are backed by server-side authorization
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface BotStatus {
  running: boolean;
  paused: boolean;
  uptime: number;
  strategy: string | null;
  lastCommand: string | null;
  lastCommandBy: string | null;
}

interface SdkHealth {
  name: string;
  version: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
}

interface AdminUser {
  username: string;
  role: string;
  permissions: {
    canControlBot: boolean;
    canModifyConfig: boolean;
    canExecuteTrades: boolean;
    canViewLogs: boolean;
    canViewMetrics: boolean;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [sdkHealth, setSdkHealth] = useState<SdkHealth[]>([]);
  const [overallHealth, setOverallHealth] = useState<string>('unknown');

  /**
   * Verify authentication on mount
   */
  useEffect(() => {
    verifyAuth();
    // Poll bot status every 5 seconds
    const interval = setInterval(() => {
      fetchBotStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Verify authentication
   */
  const verifyAuth = async () => {
    try {
      const token = localStorage.getItem('admin_access_token');

      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/admin/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.authenticated) {
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        router.push('/admin/login');
        return;
      }

      setUser(data.user);
      setLoading(false);

      // Fetch initial data
      fetchBotStatus();
    } catch (error) {
      console.error('Auth verification error:', error);
      router.push('/admin/login');
    }
  };

  /**
   * Fetch bot status
   */
  const fetchBotStatus = async () => {
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) return;

      const response = await fetch('/api/admin/bot/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.success) {
        setBotStatus(data.bot);
        setSdkHealth(data.sdk.services);
        setOverallHealth(data.sdk.overall);
      }
    } catch (error) {
      console.error('Fetch bot status error:', error);
    }
  };

  /**
   * Control bot
   */
  const controlBot = async (command: string) => {
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        alert('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/bot/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message);
        setBotStatus(data.botState);
      } else {
        alert(`Error: ${data.error || 'Command failed'}`);
      }
    } catch (error) {
      console.error('Bot control error:', error);
      alert('Failed to control bot');
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      const token = localStorage.getItem('admin_access_token');
      if (token) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
      router.push('/admin/login');
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">🔧 Admin Panel</h1>
            <p className="text-gray-300">
              Authenticated as: <span className="text-purple-400 font-bold">{user.username}</span>
              {' '}({user.role})
            </p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
          >
            🚪 Logout
          </button>
        </div>

        {/* Bot Status & Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🤖 Bot Status</h2>
            
            {botStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      botStatus.running
                        ? botStatus.paused
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                        : 'bg-red-500'
                    }`} />
                    <span className="text-white font-bold">
                      {botStatus.running
                        ? botStatus.paused
                          ? 'PAUSED'
                          : 'RUNNING'
                        : 'STOPPED'}
                    </span>
                  </div>
                </div>

                {botStatus.running && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Uptime</span>
                      <span className="text-white font-bold">{formatUptime(Math.floor(botStatus.uptime / 1000))}</span>
                    </div>

                    {botStatus.strategy && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Strategy</span>
                        <span className="text-white font-bold">{botStatus.strategy}</span>
                      </div>
                    )}
                  </>
                )}

                {botStatus.lastCommand && (
                  <div className="text-xs text-gray-400 pt-2 border-t border-white/10">
                    Last command: {botStatus.lastCommand} by {botStatus.lastCommandBy}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Loading...</p>
            )}

            {/* Bot Controls */}
            {user.permissions.canControlBot && botStatus && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {!botStatus.running ? (
                  <button
                    onClick={() => controlBot('start')}
                    className="col-span-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                  >
                    ▶️ Start Bot
                  </button>
                ) : (
                  <>
                    {!botStatus.paused ? (
                      <button
                        onClick={() => controlBot('pause')}
                        className="py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition"
                      >
                        ⏸️ Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => controlBot('resume')}
                        className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                      >
                        ▶️ Resume
                      </button>
                    )}
                    <button
                      onClick={() => controlBot('stop')}
                      className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                    >
                      ⏹️ Stop
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure? This will immediately stop the bot.')) {
                          controlBot('emergency-stop');
                        }
                      }}
                      className="col-span-2 py-3 bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg transition"
                    >
                      🚨 Emergency Stop
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SDK Health */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">💊 SDK Health</h2>
            
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Overall Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  overallHealth === 'healthy'
                    ? 'bg-green-500/20 text-green-400'
                    : overallHealth === 'degraded'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {overallHealth.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {sdkHealth.map((sdk, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{sdk.name}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      sdk.status === 'healthy'
                        ? 'bg-green-500'
                        : sdk.status === 'degraded'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`} />
                  </div>
                  <div className="text-xs text-gray-400">{sdk.version}</div>
                  {sdk.latency && (
                    <div className="text-xs text-gray-500 mt-1">
                      Latency: {sdk.latency}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Links */}
        {user.permissions.canModifyConfig && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">⚙️ Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/config/rpc')}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
              >
                <div className="text-lg font-bold text-white mb-1">🌐 RPC Endpoints</div>
                <div className="text-sm text-gray-400">Configure RPC providers</div>
              </button>
              <button
                onClick={() => router.push('/admin/config/fees')}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
              >
                <div className="text-lg font-bold text-white mb-1">💰 Fee Settings</div>
                <div className="text-sm text-gray-400">Transaction & priority fees</div>
              </button>
              <button
                onClick={() => router.push('/admin/config/dao')}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
              >
                <div className="text-lg font-bold text-white mb-1">🏛️ DAO Config</div>
                <div className="text-sm text-gray-400">Skimming & dev fees</div>
              </button>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h3 className="text-lg font-bold text-purple-400 mb-1">Security Notice</h3>
              <p className="text-sm text-gray-300">
                All admin actions are logged and audited. This panel uses server-side authorization
                for all operations. Your session will expire in 24 hours.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
