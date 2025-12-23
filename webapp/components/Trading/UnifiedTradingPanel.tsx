'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface UnifiedTradingPanelProps {
  title: string;
  description?: string;
  // Execution controls
  onExecute?: () => void | Promise<void>;
  executeLabel?: string;
  executeDisabled?: boolean;
  // Settings
  slippage?: number;
  onSlippageChange?: (value: number) => void;
  gasLimit?: number;
  onGasLimitChange?: (value: number) => void;
  priorityFee?: number;
  onPriorityFeeChange?: (value: number) => void;
  // Additional controls
  additionalControls?: React.ReactNode;
  // Children for main content
  children?: React.ReactNode;
}

export default function UnifiedTradingPanel({
  title,
  description,
  onExecute,
  executeLabel = '⚡ Execute',
  executeDisabled = false,
  slippage = 1,
  onSlippageChange,
  gasLimit,
  onGasLimitChange,
  priorityFee,
  onPriorityFeeChange,
  additionalControls,
  children,
}: UnifiedTradingPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{title}</h2>
        {description && (
          <p className="text-sm sm:text-base text-gray-300">{description}</p>
        )}
      </div>

      {/* Main Content */}
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}

      {/* Trading Controls */}
      <div className="space-y-4">
        {/* Basic Controls */}
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">⚙️ Trading Settings</h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-purple-400 hover:text-purple-300 transition"
            >
              {showAdvanced ? '▲ Hide Advanced' : '▼ Show Advanced'}
            </button>
          </div>

          {/* Slippage */}
          {onSlippageChange && (
            <div className="mb-4">
              <label className="text-white text-sm mb-2 block">
                Slippage Tolerance: {slippage}%
              </label>
              <div className="flex gap-2 mb-2">
                {[0.5, 1, 2, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => onSlippageChange(value)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      slippage === value
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                value={slippage}
                onChange={(e) => onSlippageChange(parseFloat(e.target.value))}
                min="0.1"
                max="10"
                step="0.1"
                className="w-full"
              />
            </div>
          )}

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
              {/* Gas Limit */}
              {onGasLimitChange && gasLimit !== undefined && (
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Compute Units: {gasLimit.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    value={gasLimit}
                    onChange={(e) => onGasLimitChange(parseInt(e.target.value))}
                    min="100000"
                    max="1400000"
                    step="50000"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>100K</span>
                    <span>1.4M</span>
                  </div>
                </div>
              )}

              {/* Priority Fee */}
              {onPriorityFeeChange && priorityFee !== undefined && (
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Priority Fee: {(priorityFee / 1_000_000_000).toFixed(3)} SOL
                  </label>
                  <div className="text-xs text-gray-400 mb-2">Priority fee in lamports (1 SOL = 1,000,000,000 lamports)</div>
                  <input
                    type="range"
                    value={priorityFee}
                    onChange={(e) => onPriorityFeeChange(parseInt(e.target.value))}
                    min="0"
                    max="10000000"
                    step="100000"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0 SOL</span>
                    <span>0.01 SOL</span>
                  </div>
                </div>
              )}

              {/* Additional Controls */}
              {additionalControls}
            </div>
          )}
        </div>

        {/* Execute Button */}
        {onExecute && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExecute}
            disabled={executeDisabled}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {executeLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
