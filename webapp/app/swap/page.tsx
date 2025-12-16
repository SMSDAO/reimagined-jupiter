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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputAmount, inputToken, outputToken, slippage]);

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">🔄 Jupiter Swap</h1>
        <p className="text-gray-300 mb-8">Best rates across all Solana DEXs</p>

        {/* Slippage Settings */}
        <div className="mb-6">
          <label className="text-white text-sm mb-2 block">Slippage Tolerance</label>
          <div className="flex gap-2">
            {[0.5, 1, 2, 5].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-4 py-2 rounded-lg ${
                  slippage === value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>

        {/* Input Token */}
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <label className="text-gray-400 text-sm mb-2 block">You pay</label>
          <div className="flex gap-4">
            <select
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              className="bg-white/10 text-white px-4 py-2 rounded-lg"
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
          <button
            onClick={() => {
              setInputToken(outputToken);
              setOutputToken(inputToken);
              setInputAmount(outputAmount);
              setOutputAmount(inputAmount);
            }}
            className="bg-purple-600 p-3 rounded-full hover:bg-purple-700 transition"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Output Token */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <label className="text-gray-400 text-sm mb-2 block">You receive</label>
          <div className="flex gap-4">
            <select
              value={outputToken}
              onChange={(e) => setOutputToken(e.target.value)}
              className="bg-white/10 text-white px-4 py-2 rounded-lg"
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

        {/* Swap Button */}
        <button
          onClick={executeSwap}
          disabled={loading || !publicKey || !inputAmount}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : publicKey ? 'Swap' : 'Connect Wallet'}
        </button>

        {/* Dev Fee Notice */}
        <div className="mt-4 text-center text-sm text-gray-400">
          💰 10% of profits go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
