'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { VersionedTransaction } from '@solana/web3.js';
import RPCHealthIndicator from '@/components/RPCHealthIndicator';
import UnifiedTradingPanel from '@/components/Trading/UnifiedTradingPanel';
import InstructionPanel from '@/components/Trading/InstructionPanel';

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
  const [tokenList, setTokenList] = useState<Array<{ symbol: string; address: string }>>([]);

  const defaultTokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'ORCA', 'RAY'];
  const tokens = tokenList.length > 0 ? tokenList.map(t => t.symbol) : defaultTokens;

  // Fetch token list on mount
  useEffect(() => {
    const fetchTokenList = async () => {
      try {
        const response = await fetch('/api/jupiter/tokens?limit=50');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.tokens) {
            // Type definition for Jupiter token response
            interface JupiterToken {
              symbol?: string;
              address?: string;
            }
            // Filter for popular tokens
            const popularTokens = data.tokens
              .filter((t: JupiterToken) => t.symbol && t.address)
              .slice(0, 50);
            setTokenList(popularTokens);
            console.log('[Swap] Loaded Jupiter token list:', popularTokens.length);
          }
        }
      } catch (error) {
        console.error('[Swap] Failed to load token list:', error);
      }
    };
    
    fetchTokenList();
  }, []);

  const getQuote = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return;
    
    setLoading(true);
    try {
      const jupiterApiUrl = process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://quote-api.jup.ag';
      
      // Jupiter API v6 quote
      const response = await fetch(
        `${jupiterApiUrl}/v6/quote?inputMint=${getTokenMint(inputToken)}&outputMint=${getTokenMint(outputToken)}&amount=${Math.floor(parseFloat(inputAmount) * 1e9)}&slippageBps=${slippage * 100}`
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
      const jupiterApiUrl = process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://quote-api.jup.ag';
      
      // Get quote
      const quoteResponse = await fetch(
        `${jupiterApiUrl}/v6/quote?inputMint=${getTokenMint(inputToken)}&outputMint=${getTokenMint(outputToken)}&amount=${Math.floor(parseFloat(inputAmount) * 1e9)}&slippageBps=${slippage * 100}`
      );
      const quote = await quoteResponse.json();

      // Get swap transaction
      const swapResponse = await fetch(`${jupiterApiUrl}/v6/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
          prioritizationFeeLamports: 'auto',
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
    // Check if we have the token in our loaded list
    const foundToken = tokenList.find(t => t.symbol === token);
    if (foundToken) {
      return foundToken.address;
    }
    
    // Fallback to default mints
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
    <div className="max-w-7xl mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          🔄 Jupiter Swap
        </h1>
        <p className="text-sm sm:text-base text-gray-300">Best rates across all Solana DEXs</p>
      </motion.div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Column: Trading Panel */}
        <UnifiedTradingPanel
          title="Swap Tokens"
          description="Powered by Jupiter Aggregator V6"
          onExecute={executeSwap}
          executeLabel={loading ? '⏳ Processing...' : publicKey ? '🔄 Swap' : '🔐 Connect Wallet'}
          executeDisabled={loading || !publicKey || !inputAmount}
          slippage={slippage}
          onSlippageChange={setSlippage}
        >
          {/* Swap Interface */}
          <div className="space-y-4">
            {/* Input Token */}
            <div className="bg-white/5 rounded-xl p-4 border border-purple-500/30">
              <label className="text-gray-400 text-sm mb-2 block">You pay</label>
              <div className="flex gap-4">
                <select
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="bg-white/10 text-white px-4 py-2 rounded-lg outline-none border border-purple-500/30 focus:border-purple-500"
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
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
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
              </motion.button>
            </div>

            {/* Output Token */}
            <div className="bg-white/5 rounded-xl p-4 border border-purple-500/30">
              <label className="text-gray-400 text-sm mb-2 block">You receive</label>
              <div className="flex gap-4">
                <select
                  value={outputToken}
                  onChange={(e) => setOutputToken(e.target.value)}
                  className="bg-white/10 text-white px-4 py-2 rounded-lg outline-none border border-purple-500/30 focus:border-purple-500"
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
              <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Price Impact:</span>
                  <span className={`font-bold ${priceImpact > 1 ? 'text-red-400' : 'text-green-400'}`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-blue-500/30">
                <div className="text-xs text-gray-400 mb-1">Network Fee</div>
                <div className="text-white font-bold text-sm">~0.000005 SOL</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-purple-500/30">
                <div className="text-xs text-gray-400 mb-1">Route</div>
                <div className="text-white font-bold text-sm">Jupiter V6</div>
              </div>
            </div>
          </div>
        </UnifiedTradingPanel>

        {/* Right Column: Instructions & Info */}
        <div className="space-y-6">
          <InstructionPanel
            steps={[
              {
                icon: '🔗',
                title: 'Connect Wallet',
                description: 'Connect your Solana wallet to start swapping tokens',
              },
              {
                icon: '💱',
                title: 'Select Tokens',
                description: 'Choose which tokens you want to swap and enter the amount',
              },
              {
                icon: '⚙️',
                title: 'Adjust Settings',
                description: 'Set your slippage tolerance and other preferences',
              },
              {
                icon: '✅',
                title: 'Execute Swap',
                description: 'Review the details and confirm the transaction in your wallet',
              },
            ]}
            additionalInfo={
              <div className="space-y-3">
                <div className="text-sm text-gray-300">
                  <strong className="text-white">Supported DEXs:</strong> Orca, Raydium, Meteora, Phoenix, Lifinity, Aldrin, Saber, Serum
                </div>
                <div className="text-xs text-gray-400 text-center border-t border-white/10 pt-3">
                  💰 10% of profits go to dev wallet: <span className="text-purple-400">monads.solana</span>
                </div>
              </div>
            }
          />
        </div>
      </div>
      
      {/* RPC Health Indicator */}
      <RPCHealthIndicator />
    </div>
  );
}
