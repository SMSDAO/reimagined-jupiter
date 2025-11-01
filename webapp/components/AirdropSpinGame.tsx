'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';

// Constants for cooldown configuration
const BASE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const MIN_COOLDOWN_MS = 1 * 60 * 60 * 1000; // Minimum 1 hour
const STRIKES_BEFORE_REDUCTION = 6; // After 3 days (6 strikes at 12 hours each)
const MAX_REDUCTION_STRIKES = 10; // Maximum strikes for reduction calculation
const REDUCTION_RATE = 0.1; // 10% reduction per strike after threshold

interface SpinGameProps {
  tokenSymbol?: string;
  onWin?: (amount: number) => void;
}

interface SpinHistory {
  timestamp: number;
  strikes: number;
}

export default function AirdropSpinGame({ tokenSymbol = 'GXQ', onWin }: SpinGameProps) {
  const { publicKey } = useWallet();
  const [spinning, setSpinning] = useState(false);
  const [lastSpin, setLastSpin] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(BASE_COOLDOWN_MS);
  const [timeUntilSpin, setTimeUntilSpin] = useState<string>('');
  const [wonAmount, setWonAmount] = useState<number | null>(null);

  // Load spin history from localStorage
  useEffect(() => {
    if (!publicKey) return;
    
    const storageKey = `spin_history_${publicKey.toString()}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const history: SpinHistory = JSON.parse(saved);
      setLastSpin(history.timestamp);
      setStrikes(history.strikes);
      
      // Calculate reduced cooldown based on strikes
      if (history.strikes >= STRIKES_BEFORE_REDUCTION) {
        const reductionFactor = Math.min(history.strikes - (STRIKES_BEFORE_REDUCTION - 1), MAX_REDUCTION_STRIKES) * REDUCTION_RATE;
        const reducedCooldown = BASE_COOLDOWN_MS * (1 - reductionFactor);
        setCooldownTime(Math.max(reducedCooldown, MIN_COOLDOWN_MS));
      }
    }
  }, [publicKey, cooldownTime]);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSpin) {
        const now = Date.now();
        const timeSince = now - lastSpin;
        const remaining = cooldownTime - timeSince;

        if (remaining <= 0) {
          setTimeUntilSpin('Ready to spin!');
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeUntilSpin(`${hours}h ${minutes}m ${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSpin, cooldownTime]);

  const canSpin = () => {
    if (!publicKey) return false;
    if (!lastSpin) return true;
    const now = Date.now();
    return now - lastSpin >= cooldownTime;
  };

  const spinWheel = () => {
    if (!canSpin()) return;

    setSpinning(true);
    setWonAmount(null);

    // Simulate spinning animation
    setTimeout(() => {
      // Prize tiers with weighted probability
      const prizes = [
        { amount: 10000, probability: 0.01, color: 'from-yellow-500 to-orange-500' },
        { amount: 5000, probability: 0.05, color: 'from-purple-500 to-pink-500' },
        { amount: 1000, probability: 0.15, color: 'from-blue-500 to-cyan-500' },
        { amount: 500, probability: 0.29, color: 'from-green-500 to-emerald-500' },
        { amount: 100, probability: 0.50, color: 'from-gray-500 to-gray-600' },
      ];

      const random = Math.random();
      let cumulative = 0;
      let won = prizes[prizes.length - 1];

      for (const prize of prizes) {
        cumulative += prize.probability;
        if (random <= cumulative) {
          won = prize;
          break;
        }
      }

      setWonAmount(won.amount);
      setSpinning(false);

      // Save spin history
      const now = Date.now();
      const newStrikes = strikes + 1;
      setLastSpin(now);
      setStrikes(newStrikes);

      if (publicKey) {
        const storageKey = `spin_history_${publicKey.toString()}`;
        const history: SpinHistory = {
          timestamp: now,
          strikes: newStrikes,
        };
        localStorage.setItem(storageKey, JSON.stringify(history));
      }

      // Callback with won amount
      if (onWin) {
        onWin(won.amount);
      }
    }, 3000);
  };

  const getCooldownInfo = () => {
    const days = Math.floor(strikes / 2); // 2 spins per day at 12-hour intervals
    if (days >= 3) {
      const reductionPercent = Math.min((strikes - 5) * 10, 50);
      return `🔥 ${days} day streak! ${reductionPercent}% faster cooldown`;
    }
    return `Day ${days + 1} - Keep spinning to reduce wait time!`;
  };

  return (
    <div className="space-y-6">
      {/* Roulette Wheel */}
      <div className="relative aspect-square max-w-md mx-auto">
        {/* Outer ring with segments */}
        <div className="absolute inset-0 rounded-full overflow-hidden glow-purple">
          <motion.div
            animate={spinning ? { rotate: 360 * 5 + Math.random() * 360 } : {}}
            transition={{ duration: 3, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, #eab308, #ef4444, #9333ea, #ec4899, #3b82f6, #10b981, #eab308, #ef4444, #9333ea, #ec4899, #3b82f6, #10b981)',
            }}
          />
        </div>

        {/* Center circle */}
        <div className="absolute inset-8 bg-gradient-to-br from-purple-900 via-blue-900 to-black rounded-full flex items-center justify-center backdrop-blur-xl border-4 border-white/20">
          <div className="text-center">
            <motion.div
              animate={spinning ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: spinning ? Infinity : 0 }}
              className="text-6xl mb-2"
            >
              🎁
            </motion.div>
            <div className="text-white text-2xl font-bold">
              {spinning ? 'Spinning...' : wonAmount ? `${wonAmount} ${tokenSymbol}!` : 'Spin!'}
            </div>
          </div>
        </div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-6 h-12 bg-red-500 clip-path-triangle shadow-lg glow-pink" />
        </div>
      </div>

      {/* Win Animation */}
      <AnimatePresence>
        {wonAmount && !spinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400">
              You Won!
            </div>
            <div className="text-5xl font-bold text-white mt-2">
              {wonAmount.toLocaleString()} {tokenSymbol}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin Button */}
      <div className="text-center space-y-4">
        <button
          onClick={spinWheel}
          disabled={!canSpin() || spinning}
          className={`px-12 py-4 rounded-xl font-bold text-xl transition-all ${
            canSpin() && !spinning
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white glow-purple cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {spinning ? '🎰 Spinning...' : canSpin() ? '🎰 Spin Now!' : '⏰ Cooldown Active'}
        </button>

        {/* Cooldown Info */}
        {!canSpin() && (
          <div className="bg-purple-900/30 rounded-lg p-4">
            <div className="text-white font-bold text-lg">Next spin in: {timeUntilSpin}</div>
            <div className="text-gray-300 text-sm mt-2">{getCooldownInfo()}</div>
          </div>
        )}

        {/* Strike Counter */}
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Spin Strikes:</span>
            <span className="text-2xl font-bold text-yellow-400">{strikes} 🔥</span>
          </div>
          {strikes >= 6 && (
            <div className="mt-2 text-green-400 text-sm">
              ⚡ Reduced cooldown active!
            </div>
          )}
        </div>
      </div>

      {/* Prize Tiers */}
      <div className="space-y-2">
        <h3 className="text-white font-bold text-lg mb-3">Prize Tiers:</h3>
        {[
          { emoji: '🥇', label: 'Grand Prize', amount: 10000, probability: '1%', color: 'from-yellow-500 to-orange-500' },
          { emoji: '🥈', label: 'Big Win', amount: 5000, probability: '5%', color: 'from-purple-500 to-pink-500' },
          { emoji: '🥉', label: 'Good Win', amount: 1000, probability: '15%', color: 'from-blue-500 to-cyan-500' },
          { emoji: '🎯', label: 'Nice Win', amount: 500, probability: '29%', color: 'from-green-500 to-emerald-500' },
          { emoji: '🎁', label: 'Small Win', amount: 100, probability: '50%', color: 'from-gray-500 to-gray-600' },
        ].map((tier) => (
          <motion.div
            key={tier.label}
            whileHover={{ scale: 1.02 }}
            className={`bg-gradient-to-r ${tier.color} rounded-lg p-3 text-white flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{tier.emoji}</span>
              <span className="font-semibold">{tier.label}</span>
            </div>
            <div className="text-right">
              <div className="font-bold">{tier.amount.toLocaleString()} {tokenSymbol}</div>
              <div className="text-xs opacity-80">{tier.probability}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
