'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  mint: string;
}

const POPULAR_TOKENS = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'RAY', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
];

export default function PriceTicker() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const mintAddresses = POPULAR_TOKENS.map(t => t.mint).join(',');
        const response = await fetch(`https://price.jup.ag/v6/price?ids=${mintAddresses}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch prices: ${response.statusText}`);
        }

        const data = await response.json();
        
        const priceData: TokenPrice[] = POPULAR_TOKENS.map(token => {
          const priceInfo = data.data[token.mint];
          // Note: Jupiter Price API v6 doesn't provide historical 24h change data
          // The API only returns current price information
          // For production, integrate Birdeye API or CoinGecko API for historical data
          // Setting to 0 for now to indicate no change data available
          const change24h = 0;
          
          return {
            symbol: token.symbol,
            mint: token.mint,
            price: priceInfo?.price || 0,
            change24h: change24h
          };
        });

        setPrices(priceData);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Failed to fetch prices');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPrices();

    // Update every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-black/30 backdrop-blur-md py-2 overflow-hidden">
        <div className="text-center text-gray-400">Loading prices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/30 backdrop-blur-md py-2 overflow-hidden">
        <div className="text-center text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 backdrop-blur-md py-2 overflow-hidden border-b border-purple-500/30">
      <motion.div
        className="flex space-x-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Duplicate the array for seamless loop */}
        {[...prices, ...prices].map((token, index) => (
          <div
            key={`${token.symbol}-${index}`}
            className="flex items-center space-x-2"
          >
            <span className="font-bold text-white">{token.symbol}</span>
            <span className="text-gray-300">${token.price.toFixed(token.symbol === 'SOL' ? 2 : token.price < 1 ? 6 : 2)}</span>
            <span
              className={`text-sm ${
                token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {token.change24h >= 0 ? '▲' : '▼'} {Math.abs(token.change24h).toFixed(2)}%
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
