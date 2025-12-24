'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export type PageType = 'arbitrage' | 'swap' | 'sniper' | 'launchpad' | 'staking' | 'airdrop';

interface InstructionPanelProps {
  pageType: PageType;
  className?: string;
}

const instructions = {
  arbitrage: {
    title: '⚡ Flash Loan Arbitrage',
    emoji: '📚',
    steps: [
      {
        title: 'Connect Wallet',
        description: 'Click "Connect Wallet" button and select your Solana wallet',
        icon: '🔗',
      },
      {
        title: 'Configure Settings',
        description: 'Set your minimum profit threshold and slippage tolerance. Enable auto-execute if you want trades to run automatically.',
        icon: '⚙️',
      },
      {
        title: 'Set Gas Priority',
        description: 'Choose priority fee level: Low (slow), Medium (normal), High (fast), or Critical (instant)',
        icon: '⛽',
      },
      {
        title: 'Start Scanning',
        description: 'Click "Start Bot" to begin scanning for arbitrage opportunities across 5+ flash loan providers and 8+ DEXs',
        icon: '🔍',
      },
      {
        title: 'Execute Trades',
        description: 'When opportunities appear, click "Execute" or let auto-execute handle it. The bot uses Jito bundles for MEV protection.',
        icon: '⚡',
      },
    ],
    tips: [
      'Higher priority fees increase chance of successful execution',
      'Start with low amounts to test the system',
      'Auto-execute is recommended for time-sensitive opportunities',
      '10% of profits go to dev wallet',
    ],
  },
  swap: {
    title: '🔄 Jupiter Swap',
    emoji: '📚',
    steps: [
      {
        title: 'Connect Wallet',
        description: 'Connect your Solana wallet to enable trading',
        icon: '🔗',
      },
      {
        title: 'Select Tokens',
        description: 'Choose input and output tokens from the dropdown menus',
        icon: '🪙',
      },
      {
        title: 'Enter Amount',
        description: 'Input the amount you want to swap. Output amount updates automatically',
        icon: '💰',
      },
      {
        title: 'Set Slippage',
        description: 'Choose slippage tolerance (0.1%, 0.5%, 1%, 5%) or set a custom value',
        icon: '📊',
      },
      {
        title: 'Review & Swap',
        description: 'Check the price impact and route, then click "Swap" to execute via Jupiter aggregator',
        icon: '✅',
      },
    ],
    tips: [
      'Jupiter aggregates 8+ DEXs for best prices',
      'Higher slippage may be needed for volatile tokens',
      'Check price impact before large trades',
      'Use custom RPC for better reliability',
    ],
  },
  sniper: {
    title: '🎯 Sniper Bot',
    emoji: '📚',
    steps: [
      {
        title: 'Connect Wallet',
        description: 'Connect your wallet to enable sniping functionality',
        icon: '🔗',
      },
      {
        title: 'Configure Bot',
        description: 'Set buy amount (in SOL) and slippage tolerance. Higher slippage recommended for new launches.',
        icon: '⚙️',
      },
      {
        title: 'Enable Auto-Snipe',
        description: 'Toggle auto-snipe to automatically buy when new tokens are detected',
        icon: '🤖',
      },
      {
        title: 'Start Monitoring',
        description: 'Click "Start Bot" to monitor Pump.fun, Raydium, Orca, and other platforms for new token launches',
        icon: '👀',
      },
      {
        title: 'Snipe Targets',
        description: 'When targets appear, click "SNIPE NOW" or let auto-snipe handle it with high-priority transactions',
        icon: '🎯',
      },
    ],
    tips: [
      'Critical priority fee recommended for best success rate',
      'Monitor multiple platforms simultaneously',
      'Be aware of rug pull risks with new tokens',
      'Start with small amounts until familiar with the bot',
    ],
  },
  launchpad: {
    title: '🚀 Token Launchpad',
    emoji: '📚',
    steps: [
      {
        title: 'Connect Wallet',
        description: 'Connect your wallet to deploy tokens and participate in airdrops',
        icon: '🔗',
      },
      {
        title: 'Fill Token Details',
        description: 'Enter token name, symbol, and total supply',
        icon: '📝',
      },
      {
        title: 'Set Airdrop Amount',
        description: 'Choose what percentage of supply to allocate to the roulette game (1-50%)',
        icon: '🎰',
      },
      {
        title: 'Deploy Token',
        description: 'Review deployment cost (0.01 SOL) and click "Deploy Token"',
        icon: '🚀',
      },
      {
        title: 'Play Roulette',
        description: 'After deployment, use the airdrop spin game to distribute tokens (12hr cooldown between spins)',
        icon: '🎲',
      },
    ],
    tips: [
      'Token deploys to Jupiter Studio, Raydium, and Pump.fun',
      'Airdrop roulette has 12-hour cooldown',
      'Reduced wait time after 3 days of activity',
      'Integrate with other platforms after launch',
    ],
  },
  staking: {
    title: '💎 Staking',
    emoji: '📚',
    steps: [
      {
        title: 'Connect Wallet',
        description: 'Connect your Solana wallet to start staking',
        icon: '🔗',
      },
      {
        title: 'Select Pool',
        description: 'Choose a staking pool from Marinade, Lido, Jito, BlazeStake, or Kamino based on APY and TVL',
        icon: '🏊',
      },
      {
        title: 'Enter Amount',
        description: 'Input the amount of SOL you want to stake (minimum varies by pool)',
        icon: '💰',
      },
      {
        title: 'Review Returns',
        description: 'Check estimated returns based on current APY rates. Rates update in real-time.',
        icon: '📊',
      },
      {
        title: 'Stake Now',
        description: 'Click "Stake Now" to execute. Receive liquid staking tokens (mSOL, stSOL, etc.) immediately',
        icon: '✅',
      },
    ],
    tips: [
      'Liquid staking tokens can be used in DeFi while earning rewards',
      'APY rates are updated every minute from protocol APIs',
      'Higher TVL generally indicates more mature protocols',
      'You can unstake anytime, but there may be a cooldown period',
    ],
  },
  airdrop: {
    title: '🔍 Airdrop Checker',
    emoji: '📚',
    steps: [
      {
        title: 'Connect Wallet',
        description: 'Connect your Solana wallet to analyze eligibility',
        icon: '🔗',
      },
      {
        title: 'Wallet Analysis',
        description: 'System analyzes your on-chain activity: transactions, NFTs, balance, and trading history',
        icon: '🔍',
      },
      {
        title: 'Social Intelligence',
        description: 'If linked, checks Farcaster profile for follower count, casts, power badge, and GM score',
        icon: '🟦',
      },
      {
        title: 'Trust Score',
        description: 'Calculates overall trust score (0-100) combining on-chain metrics and social factors',
        icon: '🛡️',
      },
      {
        title: 'Claim Airdrops',
        description: 'View claimable airdrops and claim individually or use "Claim All" for eligible drops',
        icon: '💰',
      },
    ],
    tips: [
      'Trust score factors: inverse risk (40%), Farcaster (30%), GM score (20%), age bonus (10%)',
      'Higher trust scores may qualify for more airdrops',
      'Social intelligence is optional but improves scoring',
      'Refresh regularly to check for new airdrops',
    ],
  },
};

export default function InstructionPanel({ pageType, className = '' }: InstructionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const content = instructions[pageType];

  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl">{content.emoji}</span>
          <h3 className="text-lg sm:text-xl font-bold text-white">How to Run</h3>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white text-xl"
        >
          ▼
        </motion.span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="px-4 sm:px-6 pb-4 sm:pb-6"
        >
          {/* Steps */}
          <div className="space-y-3 mb-6">
            {content.steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3 bg-white/5 rounded-lg p-3"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{step.icon}</span>
                    <h4 className="text-white font-semibold text-sm sm:text-base">{step.title}</h4>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/30">
            <h4 className="text-white font-bold text-sm sm:text-base mb-3 flex items-center gap-2">
              <span>💡</span> Pro Tips
            </h4>
            <ul className="space-y-2">
              {content.tips.map((tip, index) => (
                <li key={index} className="text-gray-300 text-xs sm:text-sm flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security Notice */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-yellow-500/30">
            <div className="flex items-start gap-2">
              <span className="text-yellow-500 text-lg">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-200 text-xs font-semibold mb-1">Security Notice</p>
                <p className="text-gray-300 text-xs">
                  All transactions are signed locally using Solana Wallet Adapter. Your private keys{' '}
                  <strong className="text-purple-400">NEVER leave your device</strong>. Always verify
                  transaction details before confirming.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
