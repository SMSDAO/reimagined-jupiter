'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function APIDocsPage() {
  const [selectedAPI, setSelectedAPI] = useState<keyof typeof apis>('swap');

  const apis = {
    swap: {
      title: 'Swap API',
      description: 'Execute token swaps with best rates across Solana DEXs',
      endpoint: 'POST /api/v1/swap',
      params: [
        { name: 'inputMint', type: 'string', required: true, description: 'Input token mint address' },
        { name: 'outputMint', type: 'string', required: true, description: 'Output token mint address' },
        { name: 'amount', type: 'number', required: true, description: 'Amount in base units' },
        { name: 'slippage', type: 'number', required: false, description: 'Slippage tolerance (default: 1%)' },
        { name: 'userPublicKey', type: 'string', required: true, description: 'User wallet public key' },
      ],
      example: `{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": 1000000000,
  "slippage": 1,
  "userPublicKey": "GXQ..."
}`,
    },
    ultra: {
      title: 'Ultra API',
      description: 'Advanced trading with MEV protection and flash loan arbitrage',
      endpoint: 'POST /api/v1/ultra/execute',
      params: [
        { name: 'strategy', type: 'string', required: true, description: 'Trading strategy (arbitrage, sniper, etc.)' },
        { name: 'tokens', type: 'array', required: true, description: 'Array of token addresses' },
        { name: 'maxSlippage', type: 'number', required: false, description: 'Max slippage (default: 2%)' },
        { name: 'mevProtection', type: 'boolean', required: false, description: 'Enable MEV protection (default: true)' },
      ],
      example: `{
  "strategy": "arbitrage",
  "tokens": ["SOL", "USDC", "USDT"],
  "maxSlippage": 2,
  "mevProtection": true
}`,
    },
    lend: {
      title: 'Lend API',
      description: 'Lending and borrowing with integrated protocols',
      endpoint: 'POST /api/v1/lend',
      params: [
        { name: 'protocol', type: 'string', required: true, description: 'Lending protocol (solend, kamino, marginfi)' },
        { name: 'action', type: 'string', required: true, description: 'Action (lend, borrow, withdraw, repay)' },
        { name: 'token', type: 'string', required: true, description: 'Token mint address' },
        { name: 'amount', type: 'number', required: true, description: 'Amount in base units' },
      ],
      example: `{
  "protocol": "kamino",
  "action": "lend",
  "token": "So11111111111111111111111111111111111111112",
  "amount": 5000000000
}`,
    },
    trigger: {
      title: 'Trigger API',
      description: 'Set up automated triggers for smart trading',
      endpoint: 'POST /api/v1/trigger/create',
      params: [
        { name: 'condition', type: 'object', required: true, description: 'Trigger condition' },
        { name: 'action', type: 'object', required: true, description: 'Action to execute' },
        { name: 'expires', type: 'number', required: false, description: 'Expiration timestamp' },
      ],
      example: `{
  "condition": {
    "type": "price",
    "token": "SOL",
    "operator": ">",
    "value": 100
  },
  "action": {
    "type": "swap",
    "inputToken": "SOL",
    "outputToken": "USDC",
    "amount": 1000000000
  }
}`,
    },
    price: {
      title: 'Price API',
      description: 'Real-time price data with accurate slippage calculations',
      endpoint: 'GET /api/v1/price',
      params: [
        { name: 'tokens', type: 'array', required: true, description: 'Array of token symbols or addresses' },
        { name: 'includeFee', type: 'boolean', required: false, description: 'Include fee calculation' },
      ],
      example: `{
  "tokens": ["SOL", "USDC", "BONK"],
  "includeFee": true
}`,
    },
  };

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          📚 GXQ Studio API Documentation
        </h1>
        <p className="text-gray-300 dark:text-gray-200 mb-8">
          Comprehensive API reference for developers building on GXQ Studio
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* API Menu */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-4 sticky top-24">
              <h3 className="text-white font-bold mb-4">API Endpoints</h3>
              <div className="space-y-2">
                {Object.entries(apis).map(([key, api]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedAPI(key as keyof typeof apis)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      selectedAPI === key
                        ? 'bg-purple-600 text-white glow-purple'
                        : 'text-gray-300 hover:bg-white/10 dark:text-gray-200'
                    }`}
                  >
                    {api.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* API Details */}
          <div className="lg:col-span-3">
            <motion.div
              key={selectedAPI}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-8 glow-blue"
            >
              <h2 className="text-3xl font-bold text-white mb-2">{apis[selectedAPI].title}</h2>
              <p className="text-gray-300 dark:text-gray-200 mb-6">{apis[selectedAPI].description}</p>

              {/* Endpoint */}
              <div className="mb-6">
                <h3 className="text-white font-bold mb-2">Endpoint</h3>
                <div className="bg-black/50 rounded-lg p-4 font-mono text-green-400">
                  {apis[selectedAPI].endpoint}
                </div>
              </div>

              {/* Parameters */}
              <div className="mb-6">
                <h3 className="text-white font-bold mb-3">Parameters</h3>
                <div className="space-y-3">
                  {apis[selectedAPI].params.map((param) => (
                    <div key={param.name} className="bg-white/5 dark:bg-black/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-400 font-mono">{param.name}</span>
                        <span className="text-xs bg-blue-600 px-2 py-1 rounded text-white">
                          {param.type}
                        </span>
                        {param.required && (
                          <span className="text-xs bg-red-600 px-2 py-1 rounded text-white">
                            required
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 dark:text-gray-200 text-sm">{param.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example */}
              <div>
                <h3 className="text-white font-bold mb-2">Example Request</h3>
                <div className="bg-black/50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm">
                    {apis[selectedAPI].example}
                  </pre>
                </div>
              </div>
            </motion.div>

            {/* SDK Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 dark:from-purple-950/70 dark:to-blue-950/70 backdrop-blur-md rounded-xl p-6 border border-purple-500/30"
            >
              <h3 className="text-2xl font-bold text-white mb-4">🛠️ Visual SDK for Developers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">📊</div>
                  <h4 className="text-white font-bold mb-1">Accurate Prices</h4>
                  <p className="text-gray-300 dark:text-gray-200 text-sm">Real-time pricing from all DEXs</p>
                </div>
                <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">💹</div>
                  <h4 className="text-white font-bold mb-1">Smart Slippage</h4>
                  <p className="text-gray-300 dark:text-gray-200 text-sm">Dynamic slippage calculation</p>
                </div>
                <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <h4 className="text-white font-bold mb-1">Low Fees</h4>
                  <p className="text-gray-300 dark:text-gray-200 text-sm">Optimized fee structure</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Registration CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gradient-to-r from-green-900/50 to-emerald-900/50 dark:from-green-950/70 dark:to-emerald-950/70 backdrop-blur-md rounded-xl p-8 text-center border border-green-500/30"
        >
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Build?</h3>
          <p className="text-gray-300 dark:text-gray-200 mb-6">
            Register for API access and start building on the most advanced Solana DeFi platform
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition glow-green"
          >
            🚀 Register for API Access
          </motion.button>
        </motion.div>

        {/* Supported Protocols */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6"
        >
          <h3 className="text-2xl font-bold text-white mb-4">🌐 Integrated Protocols & DEXs</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              'Jupiter', 'Raydium', 'Orca', 'Meteora', 'Phoenix',
              'Kamino', 'Solend', 'Marginfi', 'Jito', 'Marinade',
              'Lido', 'Pump.fun', 'Mango', 'Drift', 'Zeta'
            ].map((protocol) => (
              <div
                key={protocol}
                className="bg-white/5 dark:bg-black/20 rounded-lg p-3 text-center text-white font-semibold hover:bg-white/10 transition"
              >
                {protocol}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of API profits to dev wallet: monads.solana | 🎯 Affiliate program available
        </div>
      </motion.div>
    </div>
  );
}
