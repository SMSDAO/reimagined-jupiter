'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { loadUserSettings, saveUserSettings, getDefaultSettings, clearTradeHistory } from '@/lib/storage';
import { notifySuccess, requestNotificationPermission } from '@/lib/notifications';
import { isAdmin } from '@/lib/auth';

export default function AdminPanel() {
  const { publicKey } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  // Use lazy initialization to avoid useState in useEffect
  const [settings, setSettings] = useState(() => loadUserSettings() || getDefaultSettings());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => 
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Memoize admin check to avoid repeated calculations
  const userIsAdmin = useMemo(() => isAdmin(publicKey?.toString()), [publicKey]);

  const handleSave = () => {
    saveUserSettings(settings);
    notifySuccess('Settings Saved', 'Your settings have been updated successfully');
    setIsOpen(false);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      const defaults = getDefaultSettings();
      setSettings(defaults);
      saveUserSettings(defaults);
      notifySuccess('Settings Reset', 'Settings have been reset to defaults');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all trade history? This action cannot be undone.')) {
      clearTradeHistory();
      notifySuccess('History Cleared', 'Trade history has been cleared');
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      notifySuccess('Notifications Enabled', 'You will now receive browser notifications');
    } else {
      setNotificationPermission('denied');
    }
  };

  return (
    <>
      {/* Floating Settings Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
        aria-label={userIsAdmin ? 'Admin Settings' : 'Settings'}
      >
        ⚙️
      </button>

      {/* Admin Panel Modal */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">
                ⚙️ {userIsAdmin ? 'Admin Settings' : 'Settings'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Admin Badge */}
            {userIsAdmin && (
              <div className="mb-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="text-yellow-400 font-bold">Admin Access</div>
                    <div className="text-xs text-gray-300">You have administrative privileges</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Trading Settings */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <h3 className="text-xl font-bold text-white mb-4">Trading Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">
                      Min Profit Threshold: {settings.minProfit}%
                    </label>
                    <input
                      type="range"
                      value={settings.minProfit}
                      onChange={(e) => setSettings({ ...settings, minProfit: parseFloat(e.target.value) })}
                      min="0.1"
                      max="5"
                      step="0.1"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm mb-2 block">
                      Slippage Tolerance: {settings.slippage}%
                    </label>
                    <input
                      type="range"
                      value={settings.slippage}
                      onChange={(e) => setSettings({ ...settings, slippage: parseFloat(e.target.value) })}
                      min="0.1"
                      max="5"
                      step="0.1"
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Auto-Execute Trades</span>
                    <button
                      onClick={() => setSettings({ ...settings, autoExecute: !settings.autoExecute })}
                      className={`px-4 py-2 rounded-lg font-bold transition ${
                        settings.autoExecute 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      {settings.autoExecute ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <h3 className="text-xl font-bold text-white mb-4">Notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">In-App Notifications</span>
                    <button
                      onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                      className={`px-4 py-2 rounded-lg font-bold transition ${
                        settings.notifications 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      {settings.notifications ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Browser Notifications</div>
                      <div className="text-sm text-gray-300">
                        Status: {notificationPermission === 'granted' ? '✅ Enabled' : notificationPermission === 'denied' ? '❌ Blocked' : '⚠️ Not Set'}
                      </div>
                    </div>
                    {notificationPermission !== 'granted' && (
                      <button
                        onClick={handleEnableNotifications}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <h3 className="text-xl font-bold text-white mb-4">Data Management</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={handleClearHistory}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold transition"
                  >
                    Clear Trade History
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-bold transition"
                  >
                    Reset All Settings
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
