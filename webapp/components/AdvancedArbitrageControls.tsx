'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface AdvancedArbitrageSettings {
  // Jito MEV Protection
  jitoEnabled: boolean;
  jitoMinTipLamports: number;
  jitoMaxTipLamports: number;
  jitoDynamicTipMultiplier: number;
  
  // Slippage & Price Impact
  maxSlippageBps: number;
  maxPriceImpact: number;
  
  // Priority Fees & Gas
  priorityFeeLamports: number;
  computeUnits: number;
  
  // Profit Thresholds
  minProfitPercent: number;
  minProfitLamports: number;
  
  // Flash Loan Providers
  preferredProviders: string[];
  
  // Multi-Hop Routes
  minHops: number;
  maxHops: number;
  
  // Safety
  simulateBeforeExecute: boolean;
  requireAtomicExecution: boolean;
  maxRetries: number;
}

const DEFAULT_SETTINGS: AdvancedArbitrageSettings = {
  jitoEnabled: true,
  jitoMinTipLamports: 10000,
  jitoMaxTipLamports: 10000000, // 10M lamports hard cap
  jitoDynamicTipMultiplier: 0.05, // 5% of profit
  
  maxSlippageBps: 50, // 0.5%
  maxPriceImpact: 0.03, // 3%
  
  priorityFeeLamports: 5000000, // 5M lamports
  computeUnits: 400000, // 400k CUs
  
  minProfitPercent: 0.3, // 0.3%
  minProfitLamports: 100000, // 0.0001 SOL
  
  preferredProviders: ['marginfi', 'solend', 'saveFinance', 'kamino', 'tulip', 'drift', 'mango', 'jet', 'portFinance'],
  
  minHops: 3,
  maxHops: 7,
  
  simulateBeforeExecute: true,
  requireAtomicExecution: true,
  maxRetries: 3,
};

interface AdvancedArbitrageControlsProps {
  onSettingsChange: (settings: AdvancedArbitrageSettings) => void;
}

export default function AdvancedArbitrageControls({ onSettingsChange }: AdvancedArbitrageControlsProps) {
  const [settings, setSettings] = useState<AdvancedArbitrageSettings>(DEFAULT_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('advanced-arbitrage-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        onSettingsChange(parsed);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
  }, [onSettingsChange]);
  
  // Save settings to localStorage and notify parent
  const updateSettings = (updates: Partial<AdvancedArbitrageSettings>) => {
    const newSettings = { ...settings, ...updates };
    
    // Enforce hard cap on Jito tips
    if (newSettings.jitoMaxTipLamports > 10000000) {
      newSettings.jitoMaxTipLamports = 10000000;
      alert('⚠️ Jito tip capped at 10M lamports (0.01 SOL)');
    }
    
    // Enforce priority fee cap
    if (newSettings.priorityFeeLamports > 10000000) {
      newSettings.priorityFeeLamports = 10000000;
      alert('⚠️ Priority fee capped at 10M lamports (0.01 SOL)');
    }
    
    setSettings(newSettings);
    localStorage.setItem('advanced-arbitrage-settings', JSON.stringify(newSettings));
    onSettingsChange(newSettings);
  };
  
  const resetToDefaults = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('advanced-arbitrage-settings', JSON.stringify(DEFAULT_SETTINGS));
      onSettingsChange(DEFAULT_SETTINGS);
      alert('✅ Settings reset to defaults');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-white">⚙️ Advanced Settings</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
        >
          {showAdvanced ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {showAdvanced && (
        <div className="space-y-6">
          {/* Jito MEV Protection */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              🛡️ Jito MEV Protection
              <span className="text-xs text-gray-400">(Tips are profit-based)</span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Enable Jito Bundles</label>
                <button
                  onClick={() => updateSettings({ jitoEnabled: !settings.jitoEnabled })}
                  className={`px-4 py-1 rounded ${settings.jitoEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  {settings.jitoEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              
              {settings.jitoEnabled && (
                <>
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">
                      Min Tip: {(settings.jitoMinTipLamports / 1e9).toFixed(6)} SOL ({settings.jitoMinTipLamports.toLocaleString()} lamports)
                    </label>
                    <input
                      type="range"
                      value={settings.jitoMinTipLamports}
                      onChange={(e) => updateSettings({ jitoMinTipLamports: parseInt(e.target.value) })}
                      min="1000"
                      max="1000000"
                      step="1000"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">
                      Max Tip: {(settings.jitoMaxTipLamports / 1e9).toFixed(6)} SOL ({settings.jitoMaxTipLamports.toLocaleString()} lamports)
                      <span className="text-red-400 ml-2">(Hard cap: 10M)</span>
                    </label>
                    <input
                      type="range"
                      value={settings.jitoMaxTipLamports}
                      onChange={(e) => updateSettings({ jitoMaxTipLamports: parseInt(e.target.value) })}
                      min="10000"
                      max="10000000"
                      step="10000"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">
                      Dynamic Tip: {(settings.jitoDynamicTipMultiplier * 100).toFixed(1)}% of profit
                    </label>
                    <input
                      type="range"
                      value={settings.jitoDynamicTipMultiplier}
                      onChange={(e) => updateSettings({ jitoDynamicTipMultiplier: parseFloat(e.target.value) })}
                      min="0.01"
                      max="0.20"
                      step="0.01"
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Slippage & Price Impact */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-white font-semibold mb-3">📊 Slippage & Price Impact</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Max Slippage: {(settings.maxSlippageBps / 100).toFixed(2)}% ({settings.maxSlippageBps} bps)
                </label>
                <input
                  type="range"
                  value={settings.maxSlippageBps}
                  onChange={(e) => updateSettings({ maxSlippageBps: parseInt(e.target.value) })}
                  min="10"
                  max="500"
                  step="5"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Max Price Impact: {(settings.maxPriceImpact * 100).toFixed(2)}%
                </label>
                <input
                  type="range"
                  value={settings.maxPriceImpact}
                  onChange={(e) => updateSettings({ maxPriceImpact: parseFloat(e.target.value) })}
                  min="0.001"
                  max="0.10"
                  step="0.001"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Priority Fees & Gas */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-white font-semibold mb-3">⚡ Priority Fees & Compute Units</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Priority Fee: {(settings.priorityFeeLamports / 1e9).toFixed(6)} SOL ({settings.priorityFeeLamports.toLocaleString()} lamports)
                  <span className="text-red-400 ml-2">(Hard cap: 10M)</span>
                </label>
                <input
                  type="range"
                  value={settings.priorityFeeLamports}
                  onChange={(e) => updateSettings({ priorityFeeLamports: parseInt(e.target.value) })}
                  min="100000"
                  max="10000000"
                  step="100000"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Compute Units: {settings.computeUnits.toLocaleString()} CUs
                </label>
                <input
                  type="range"
                  value={settings.computeUnits}
                  onChange={(e) => updateSettings({ computeUnits: parseInt(e.target.value) })}
                  min="200000"
                  max="1400000"
                  step="50000"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Profit Thresholds */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-white font-semibold mb-3">💰 Profit Thresholds</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Min Profit: {settings.minProfitPercent.toFixed(2)}%
                </label>
                <input
                  type="range"
                  value={settings.minProfitPercent}
                  onChange={(e) => updateSettings({ minProfitPercent: parseFloat(e.target.value) })}
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Min Profit (Absolute): {(settings.minProfitLamports / 1e9).toFixed(6)} SOL
                </label>
                <input
                  type="range"
                  value={settings.minProfitLamports}
                  onChange={(e) => updateSettings({ minProfitLamports: parseInt(e.target.value) })}
                  min="10000"
                  max="10000000"
                  step="10000"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Multi-Hop Routes */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-white font-semibold mb-3">🔀 Multi-Hop Routes</h4>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">
                    Min Hops: {settings.minHops}
                  </label>
                  <input
                    type="number"
                    value={settings.minHops}
                    onChange={(e) => updateSettings({ minHops: parseInt(e.target.value) })}
                    min="2"
                    max="7"
                    className="w-full px-3 py-2 bg-black/30 rounded border border-white/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">
                    Max Hops: {settings.maxHops}
                  </label>
                  <input
                    type="number"
                    value={settings.maxHops}
                    onChange={(e) => updateSettings({ maxHops: parseInt(e.target.value) })}
                    min="3"
                    max="7"
                    className="w-full px-3 py-2 bg-black/30 rounded border border-white/20 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Safety */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-white font-semibold mb-3">🔒 Safety Settings</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Simulate Before Execute</label>
                <button
                  onClick={() => updateSettings({ simulateBeforeExecute: !settings.simulateBeforeExecute })}
                  className={`px-4 py-1 rounded ${settings.simulateBeforeExecute ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  {settings.simulateBeforeExecute ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Require Atomic Execution</label>
                <button
                  onClick={() => updateSettings({ requireAtomicExecution: !settings.requireAtomicExecution })}
                  className={`px-4 py-1 rounded ${settings.requireAtomicExecution ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  {settings.requireAtomicExecution ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Max Retries: {settings.maxRetries}
                </label>
                <input
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => updateSettings({ maxRetries: parseInt(e.target.value) })}
                  min="0"
                  max="10"
                  className="w-full px-3 py-2 bg-black/30 rounded border border-white/20 text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Reset Button */}
          <div className="border-t border-white/20 pt-4">
            <button
              onClick={resetToDefaults}
              className="w-full px-4 py-2 bg-red-600/50 hover:bg-red-600 rounded text-white font-semibold"
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
