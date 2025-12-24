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
  priorityFeeLamports?: number; // Custom priority fee in lamports
  jitoTip: number; // Jito tip in lamports (0 = disabled)
  executionSpeed: 'normal' | 'fast' | 'turbo' | 'mev-protected';
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
    priorityFeeLamports: undefined,
    jitoTip: 0,
    executionSpeed: 'normal',
    slippage: userSettings.slippage,
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [customSlippageInput, setCustomSlippageInput] = useState('');
  const [customPriorityFeeInput, setCustomPriorityFeeInput] = useState('');

  const slippagePresets = [0.1, 0.5, 1, 5];
  
  // Priority fee presets in lamports
  const priorityFeePresets = {
    low: 10000, // 0.00001 SOL
    medium: 100000, // 0.0001 SOL
    high: 1000000, // 0.001 SOL
    critical: 10000000, // 0.01 SOL (max 10M lamports)
  };
  
  // Execution speed configurations
  const executionSpeedInfo = {
    normal: { label: 'Normal', description: 'Standard execution', color: 'bg-gray-600' },
    fast: { label: 'Fast', description: 'Higher priority', color: 'bg-blue-600' },
    turbo: { label: 'Turbo', description: 'Maximum priority', color: 'bg-purple-600' },
    'mev-protected': { label: 'MEV-Protected', description: 'Jito bundle', color: 'bg-green-600' },
  };

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

        {/* Gas/Priority Fee Controls with Slider */}
        <div>
          <label className="text-white text-sm font-semibold mb-2 block">
            ⛽ Priority Fee: {settings.priorityFeeLamports 
              ? `${(settings.priorityFeeLamports / 1e9).toFixed(6)} SOL` 
              : priorityFeeInfo[settings.priorityFee].fee}
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(Object.keys(priorityFeeInfo) as Array<keyof typeof priorityFeeInfo>).map((level) => (
              <motion.button
                key={level}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSettingChange({ 
                  priorityFee: level,
                  priorityFeeLamports: priorityFeePresets[level],
                })}
                className={`px-3 py-2 rounded-lg transition-all text-sm ${
                  settings.priorityFee === level && !customPriorityFeeInput
                    ? `${priorityFeeInfo[level].color} text-white shadow-lg`
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <div className="font-semibold capitalize">{priorityFeeInfo[level].label}</div>
                <div className="text-xs opacity-75">{priorityFeeInfo[level].fee}</div>
              </motion.button>
            ))}
          </div>
          
          {/* Priority Fee Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="1000"
              max="10000000"
              step="10000"
              value={settings.priorityFeeLamports || priorityFeePresets[settings.priorityFee]}
              onChange={(e) => {
                const lamports = parseInt(e.target.value);
                handleSettingChange({ 
                  priorityFeeLamports: lamports,
                  priorityFee: 'medium', // Reset preset when using slider
                });
              }}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${
                  ((settings.priorityFeeLamports || priorityFeePresets[settings.priorityFee]) / 10000000) * 100
                }%, rgba(255,255,255,0.2) ${
                  ((settings.priorityFeeLamports || priorityFeePresets[settings.priorityFee]) / 10000000) * 100
                }%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0.000001 SOL</span>
              <span>0.01 SOL (max)</span>
            </div>
          </div>
          
          <p className="text-gray-400 text-xs mt-2">
            Higher priority = faster confirmation but higher fees (max 10M lamports)
          </p>
        </div>

        {/* Execution Speed Selector */}
        <div>
          <label className="text-white text-sm font-semibold mb-2 block">
            ⚡ Execution Speed
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(executionSpeedInfo) as Array<keyof typeof executionSpeedInfo>).map((speed) => (
              <motion.button
                key={speed}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSettingChange({ executionSpeed: speed })}
                className={`px-3 py-2 rounded-lg transition-all text-sm ${
                  settings.executionSpeed === speed
                    ? `${executionSpeedInfo[speed].color} text-white shadow-lg`
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <div className="font-semibold">{executionSpeedInfo[speed].label}</div>
                <div className="text-xs opacity-75">{executionSpeedInfo[speed].description}</div>
              </motion.button>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-2">
            MEV-Protected uses Jito bundles for frontrun protection
          </p>
        </div>

        {/* Jito Tip Slider (shown when MEV-Protected is selected) */}
        {settings.executionSpeed === 'mev-protected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-white text-sm font-semibold mb-2 block">
              💎 Jito Tip: {(settings.jitoTip / 1e9).toFixed(6)} SOL
            </label>
            <input
              type="range"
              min="0"
              max="10000000"
              step="10000"
              value={settings.jitoTip}
              onChange={(e) => handleSettingChange({ jitoTip: parseInt(e.target.value) })}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #059669 ${
                  (settings.jitoTip / 10000000) * 100
                }%, rgba(255,255,255,0.2) ${(settings.jitoTip / 10000000) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0 SOL (disabled)</span>
              <span>0.01 SOL</span>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              Higher tips increase bundle priority. Set to 0 to disable Jito.
            </p>
          </motion.div>
        )}

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
          
          {/* Slippage Slider */}
          <div className="space-y-2 mb-2">
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={settings.slippage}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                handleSettingChange({ slippage: value, customSlippage: value });
              }}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #9333ea ${
                  (settings.slippage / 20) * 100
                }%, rgba(255,255,255,0.2) ${(settings.slippage / 20) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0.1%</span>
              <span>20%</span>
            </div>
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

        {/* Enhanced Status Indicator */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Auto-Execute:</span>
            <span className="text-white font-semibold">
              {settings.autoExecute ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Speed:</span>
            <span className="text-white font-semibold">
              {executionSpeedInfo[settings.executionSpeed].label}
            </span>
          </div>
          {settings.executionSpeed === 'mev-protected' && settings.jitoTip > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Jito Tip:</span>
              <span className="text-green-400 font-semibold">
                {(settings.jitoTip / 1e9).toFixed(6)} SOL
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Priority Fee:</span>
            <span className="text-blue-400 font-semibold">
              {(settings.priorityFeeLamports || priorityFeePresets[settings.priorityFee]) / 1e9} SOL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
