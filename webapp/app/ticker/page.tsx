"use client";

import Ticker from "@/components/Ticker";

export default function TickerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Real-Time Token Prices
          </h1>
          <p className="text-gray-400">
            Live Solana token prices powered by Pyth Network and multiple DEX
            aggregators
          </p>
        </div>

        {/* Main Ticker - All Tokens */}
        <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">All Tokens</h2>
          <Ticker showConfidence={true} />
        </div>

        {/* Featured Tokens - Compact View */}
        <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Featured Tokens
          </h2>
          <Ticker symbols={["SOL", "BTC", "ETH", "USDC"]} compact={true} />
        </div>

        {/* Memecoins */}
        <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">
            🚀 Memecoins
          </h2>
          <Ticker symbols={["BONK", "WIF", "JUP"]} showConfidence={true} />
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Real-Time Updates
            </h3>
            <p className="text-gray-400 text-sm">
              Prices update every second with low latency data from Pyth Network
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Multi-Source Aggregation
            </h3>
            <p className="text-gray-400 text-sm">
              Combines prices from Pyth, Jupiter, Raydium, Orca, and Meteora for
              accuracy
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Confidence Intervals
            </h3>
            <p className="text-gray-400 text-sm">
              Shows price confidence ranges to help you make informed decisions
            </p>
          </div>
        </div>

        {/* API Information */}
        <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 mt-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">API Access</h2>
          <div className="space-y-3">
            <div>
              <code className="text-sm bg-gray-900 px-3 py-2 rounded text-green-400 block">
                GET /api/tickers
              </code>
              <p className="text-gray-400 text-sm mt-2">
                Get all available token prices
              </p>
            </div>
            <div>
              <code className="text-sm bg-gray-900 px-3 py-2 rounded text-green-400 block">
                GET /api/tickers?symbols=SOL,BTC,ETH
              </code>
              <p className="text-gray-400 text-sm mt-2">
                Get specific token prices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
