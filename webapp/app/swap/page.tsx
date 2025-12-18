'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { VersionedTransaction } from '@solana/web3.js';

export default function SwapPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [inputToken, setInputToken] = useState('SOL');
  const [outputToken, setOutputToken] = useState('USDC');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState(1);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);

  const tokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'ORCA', 'RAY'];

  const getQuote = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return;
    
    setLoading(true);
    try {
      // Jupiter API v6 quote
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${getTokenMint(inputToken)}&outputMint=${getTokenMint(outputToken)}&amount=${Math.floor(parseFloat(inputAmount) * 1e9)}&slippageBps=${slippage * 100}`
      );
      const quote = await response.json();
      const outAmount = parseInt(quote.outAmount) / 1e9;
      setOutputAmount(outAmount.toFixed(6));
      
      // Calculate price impact
      if (quote.priceImpactPct) {
        setPriceImpact(parseFloat(quote.priceImpactPct));
      }
    } catch (error) {
      console.error('Quote error:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      // Get quote
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${getTokenMint(inputToken)}&outputMint=${getTokenMint(outputToken)}&amount=${Math.floor(parseFloat(inputAmount) * 1e9)}&slippageBps=${slippage * 100}`
      );
      const quote = await quoteResponse.json();

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });
      
      const { swapTransaction } = await swapResponse.json();
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      alert(`✅ Swap successful!\n\nSignature: ${signature}`);
    } catch (error) {
      console.error('Swap error:', error);
      alert('❌ Swap failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTokenMint = (token: string): string => {
    const mints: { [key: string]: string } = {
      SOL: 'So11111111111111111111111111111111111111112',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
      RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    };
    return mints[token] || mints.SOL;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputAmount) getQuote();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputAmount, inputToken, outputToken, slippage]);

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-2xl p-8 glow-blue"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              🔄 Jupiter Swap
            </h1>
            <p className="text-gray-300 dark:text-gray-200">Best rates across all Solana DEXs</p>
          </div>
          <motion.div
            animate={{ rotate: loading ? 360 : 0 }}
            transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
            className="text-3xl"
          >
            🔄
          </motion.div>
        </div>

        {/* Slippage Settings */}
        <div className="mb-6">
          <label className="text-white text-sm mb-2 block">Slippage Tolerance</label>
          <div className="flex gap-2">
            {[0.5, 1, 2, 5].map((value) => (
              <motion.button
                key={value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSlippage(value)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  slippage === value
                    ? 'bg-purple-600 text-white glow-purple'
                    : 'bg-white/10 dark:bg-black/20 text-gray-300 hover:bg-white/20'
                }`}
              >
                {value}%
              </motion.button>
            ))}
          </div>
        </div>

        {/* Input Token */}
        <div className="bg-white/5 dark:bg-black/20 rounded-xl p-4 mb-4 border border-purple-500/30">
          <label className="text-gray-400 text-sm mb-2 block">You pay</label>
          <div className="flex gap-4">
            <select
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              className="bg-white/10 dark:bg-black/30 text-white px-4 py-2 rounded-lg outline-none border border-purple-500/30 focus:border-purple-500"
            >
              {tokens.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-white text-2xl outline-none"
            />
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center mb-4">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setInputToken(outputToken);
              setOutputToken(inputToken);
              setInputAmount(outputAmount);
              setOutputAmount(inputAmount);
            }}
            className="bg-purple-600 p-3 rounded-full hover:bg-purple-700 transition glow-purple"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </motion.button>
        </div>

        {/* Output Token */}
        <div className="bg-white/5 dark:bg-black/20 rounded-xl p-4 mb-6 border border-purple-500/30">
          <label className="text-gray-400 text-sm mb-2 block">You receive</label>
          <div className="flex gap-4">
            <select
              value={outputToken}
              onChange={(e) => setOutputToken(e.target.value)}
              className="bg-white/10 dark:bg-black/30 text-white px-4 py-2 rounded-lg outline-none border border-purple-500/30 focus:border-purple-500"
            >
              {tokens.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={outputAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-transparent text-white text-2xl outline-none"
            />
          </div>
        </div>

        {/* Price Impact */}
        {priceImpact !== null && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Price Impact:</span>
              <span className={`font-bold ${priceImpact > 1 ? 'text-red-400' : 'text-green-400'}`}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={executeSwap}
          disabled={loading || !publicKey || !inputAmount}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed glow-purple"
        >
          {loading ? '⏳ Processing...' : publicKey ? '🔄 Swap' : '🔐 Connect Wallet'}
        </motion.button>

        {/* Info Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white/5 dark:bg-black/20 rounded-lg p-3 border border-blue-500/30">
            <div className="text-xs text-gray-400 mb-1">Network Fee</div>
            <div className="text-white font-bold">~0.000005 SOL</div>
          </div>
          <div className="bg-white/5 dark:bg-black/20 rounded-lg p-3 border border-purple-500/30">
            <div className="text-xs text-gray-400 mb-1">Route</div>
            <div className="text-white font-bold">Jupiter V6</div>
          </div>
        </div>

        {/* Dev Fee Notice */}
        <div className="mt-4 text-center text-sm text-gray-400">
          💰 10% of profits go to dev wallet: <span className="text-purple-400">monads.solana</span>
        </div>
      </motion.div>

      {/* Supported DEXs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-6"
      >
        <h3 className="text-white font-bold mb-4">🌐 Aggregated DEXs</h3>
        <div className="grid grid-cols-4 gap-3">
          {['Orca', 'Raydium', 'Meteora', 'Phoenix', 'Lifinity', 'Aldrin', 'Saber', 'Serum'].map((dex) => (
            <div
              key={dex}
              className="bg-white/5 dark:bg-black/20 rounded-lg p-2 text-center text-white text-sm hover:bg-white/10 transition"
            >
              {dex}
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* RPC Health Indicator */}
      <RPCHealthIndicator />
    </div>
  );
}

import RPCHealthIndicator from '@/components/RPCHealthIndicator';
