'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadUserSettings, saveUserSettings, getDefaultSettings, type UserSettings } from '@/lib/storage';

interface UnifiedTradingPanelProps {
  onSettingsChange?: (settings: TradingSettings) => void;
  onStart?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
  showAdvanced?: boolean;
}

export interface TradingSettings {
  autoExecute: boolean;
  priorityFee: 'low' | 'medium' | 'high' | 'critical';
  slippage: number;
  customSlippage?: number;
  customRpcUrl?: string;
}

/**
 * UnifiedTradingPanel - Normalized control panel for all trading pages
 * 
 * Features:
 * - Execution controls (Start/Stop bot, Auto-execute toggle)
 * - Gas controls (Priority fee levels)
 * - Slippage controls (Preset buttons + Custom input)
 * - Collapsible Advanced Settings
 */
export default function UnifiedTradingPanel({
  onSettingsChange,
  onStart,
  onStop,
  isRunning = false,
  showAdvanced = true,
}: UnifiedTradingPanelProps) {
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    if (typeof window !== 'undefined') {
      return loadUserSettings() || getDefaultSettings();
    }
    return getDefaultSettings();
  });

  const [settings, setSettings] = useState<TradingSettings>({
    autoExecute: userSettings.autoExecute,
    priorityFee: 'medium',
    slippage: userSettings.slippage,
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [customSlippageInput, setCustomSlippageInput] = useState('');

  const slippagePresets = [0.1, 0.5, 1, 5];

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const handleSettingChange = (updates: Partial<TradingSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    // Update user settings in local storage
    if ('autoExecute' in updates || 'slippage' in updates) {
      const updatedUserSettings = {
        ...userSettings,
        ...(updates.autoExecute !== undefined && { autoExecute: updates.autoExecute }),
        ...(updates.slippage !== undefined && { slippage: updates.slippage }),
      };
      setUserSettings(updatedUserSettings);
      saveUserSettings(updatedUserSettings);
    }
  };

  const handleSlippagePreset = (value: number) => {
    setCustomSlippageInput('');
    handleSettingChange({ slippage: value, customSlippage: undefined });
  };

  const handleCustomSlippage = () => {
    const value = parseFloat(customSlippageInput);
    if (!isNaN(value) && value > 0 && value <= 100) {
      handleSettingChange({ slippage: value, customSlippage: value });
    }
  };

  const priorityFeeInfo = {
    low: { label: 'Low', fee: '~0.00001 SOL', color: 'bg-gray-600' },
    medium: { label: 'Medium', fee: '~0.0001 SOL', color: 'bg-blue-600' },
    high: { label: 'High', fee: '~0.001 SOL', color: 'bg-orange-600' },
    critical: { label: 'Critical', fee: '~0.01 SOL', color: 'bg-red-600' },
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">⚙️ Trading Controls</h3>

      <div className="space-y-4">
        {/* Execution Controls */}
        <div>
          <label className="text-white text-sm font-semibold mb-2 block">🎮 Execution</label>
          <div className="flex gap-2 mb-3">
            {onStart && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isRunning ? onStop : onStart}
                disabled={isRunning && !onStop}
                className={`flex-1 font-bold py-2 px-4 rounded-lg transition-all text-sm sm:text-base shadow-lg ${
                  isRunning
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isRunning ? '⏹️ Stop Bot' : '▶️ Start Bot'}
              </motion.button>
            )}
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <span className="text-white text-sm">Auto-Execute</span>
            <button
              onClick={() => handleSettingChange({ autoExecute: !settings.autoExecute })}
              className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                settings.autoExecute
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30'
                  : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
            >
              {settings.autoExecute ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Gas/Priority Fee Controls */}
        <div>
          <label className="text-white text-sm font-semibold mb-2 block">⛽ Priority Fee</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(priorityFeeInfo) as Array<keyof typeof priorityFeeInfo>).map((level) => (
              <motion.button
                key={level}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSettingChange({ priorityFee: level })}
                className={`px-3 py-2 rounded-lg transition-all text-sm ${
                  settings.priorityFee === level
                    ? `${priorityFeeInfo[level].color} text-white shadow-lg`
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <div className="font-semibold capitalize">{priorityFeeInfo[level].label}</div>
                <div className="text-xs opacity-75">{priorityFeeInfo[level].fee}</div>
              </motion.button>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Higher priority = faster confirmation but higher fees
          </p>
        </div>

        {/* Slippage Controls */}
        <div>
          <label className="text-white text-sm font-semibold mb-2 block">
            📊 Slippage Tolerance: {settings.slippage}%
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {slippagePresets.map((preset) => (
              <motion.button
                key={preset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSlippagePreset(preset)}
                className={`px-3 py-2 rounded-lg transition-all text-sm ${
                  settings.slippage === preset && !settings.customSlippage
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {preset}%
              </motion.button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={customSlippageInput}
              onChange={(e) => setCustomSlippageInput(e.target.value)}
              onBlur={handleCustomSlippage}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSlippage()}
              placeholder="Custom %"
              className="flex-1 bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none text-sm"
              step="0.1"
              min="0.1"
              max="100"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCustomSlippage}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                settings.customSlippage
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Set
            </motion.button>
          </div>
        </div>

        {/* Advanced Settings (Collapsible) */}
        {showAdvanced && (
          <div>
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full text-white text-sm font-semibold mb-2 hover:text-purple-400 transition-colors"
            >
              <span>🔧 Advanced Settings</span>
              <span className="text-xl">{showAdvancedSettings ? '▼' : '▶'}</span>
            </button>

            {showAdvancedSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 bg-white/5 rounded-lg p-3"
              >
                <div>
                  <label className="text-white text-xs mb-1 block">Custom RPC URL</label>
                  <input
                    type="text"
                    value={settings.customRpcUrl || ''}
                    onChange={(e) => handleSettingChange({ customRpcUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none text-sm"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Leave blank to use default RPC
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs text-gray-400">
                    ℹ️ Advanced settings are for experienced users. Incorrect values may cause transaction failures.
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Status:</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-green-500 animate-pulse-glow' : 'bg-gray-500'
                }`}
              />
              <span className="text-white font-semibold">
                {isRunning ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-300">Auto-Execute:</span>
            <span className="text-white font-semibold">
              {settings.autoExecute ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
