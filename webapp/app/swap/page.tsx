'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export default function SwapPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [inputToken, setInputToken] = useState('SOL');
  const [outputToken, setOutputToken] = useState('USDC');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState(1);

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
      setOutputAmount((parseInt(quote.outAmount) / 1e9).toFixed(6));
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
      alert(`Swap successful! Signature: ${signature}`);
    } catch (error) {
      console.error('Swap error:', error);
      alert('Swap failed. Please try again.');
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
  }, [inputAmount, inputToken, outputToken, slippage]);

  // Real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (inputAmount && !loading) {
        getQuote();
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [inputAmount, inputToken, outputToken, loading]);

  return (
    <div className="max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">🔄 Jupiter Swap</h1>
            <p className="text-sm sm:text-base text-gray-300">Best rates across all Solana DEXs</p>
          </div>
          {loading && (
            <div className="animate-pulse-glow text-blue-400 text-xl sm:text-2xl">
              🔄
            </div>
          )}
        </div>

        {/* Slippage Settings */}
        <div className="mb-4 sm:mb-6">
          <label className="text-white text-xs sm:text-sm mb-2 block">Slippage Tolerance</label>
          <div className="grid grid-cols-4 gap-2">
            {[0.5, 1, 2, 5].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all ${
                  slippage === value
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>

        {/* Input Token */}
        <div className="bg-white/5 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border border-white/10">
          <label className="text-gray-400 text-xs sm:text-sm mb-2 block">You pay</label>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              className="bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base outline-none border border-white/10 focus:border-purple-500"
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
              className="flex-1 bg-transparent text-white text-xl sm:text-2xl outline-none"
            />
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <button
            onClick={() => {
              setInputToken(outputToken);
              setOutputToken(inputToken);
              setInputAmount(outputAmount);
              setOutputAmount(inputAmount);
            }}
            className="bg-purple-600 p-2 sm:p-3 rounded-full hover:bg-purple-700 transition-all hover:scale-110 shadow-lg"
            aria-label="Swap tokens"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Output Token */}
        <div className="bg-white/5 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-white/10">
          <label className="text-gray-400 text-xs sm:text-sm mb-2 block">You receive (estimated)</label>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={outputToken}
              onChange={(e) => setOutputToken(e.target.value)}
              className="bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base outline-none border border-white/10 focus:border-purple-500"
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
              className="flex-1 bg-transparent text-white text-xl sm:text-2xl outline-none"
            />
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={executeSwap}
          disabled={loading || !publicKey || !inputAmount}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-pulse-glow">🔄</span> Processing...
            </span>
          ) : publicKey ? '🔄 Swap Tokens' : '🔗 Connect Wallet'}
        </button>

        {/* Swap Info */}
        {inputAmount && outputAmount && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex justify-between text-xs sm:text-sm text-gray-300 mb-1">
              <span>Rate:</span>
              <span className="text-white">
                1 {inputToken} ≈ {(parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6)} {outputToken}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-gray-300">
              <span>Slippage:</span>
              <span className="text-white">{slippage}%</span>
            </div>
          </div>
        )}

        {/* Dev Fee Notice */}
        <div className="mt-4 text-center text-xs sm:text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
