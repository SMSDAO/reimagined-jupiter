'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

export default function LiveTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([
    { symbol: 'SOL', price: 98.45, change: 2.5, volume: 1234567 },
    { symbol: 'BONK', price: 0.000023, change: -1.2, volume: 987654 },
    { symbol: 'JUP', price: 1.34, change: 5.7, volume: 456789 },
    { symbol: 'WIF', price: 2.87, change: -0.8, volume: 234567 },
    { symbol: 'RAY', price: 4.56, change: 3.2, volume: 345678 },
  ]);

  // Simulate real-time price updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev => prev.map(ticker => ({
        ...ticker,
        price: ticker.price * (1 + (Math.random() - 0.5) * 0.01),
        change: ticker.change + (Math.random() - 0.5) * 0.5,
        volume: ticker.volume + Math.floor((Math.random() - 0.5) * 10000),
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden bg-black/40 backdrop-blur-sm border-y border-purple-500/30">
      <div className="flex animate-scroll-left whitespace-nowrap py-3 gap-8">
        {[...tickers, ...tickers].map((ticker, index) => (
          <motion.div
            key={`${ticker.symbol}-${index}`}
            className="inline-flex items-center gap-3 px-4"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="font-bold text-white text-sm sm:text-base">{ticker.symbol}</span>
            <span className="text-gray-300 text-sm sm:text-base">
              ${ticker.price.toFixed(ticker.price < 1 ? 6 : 2)}
            </span>
            <span className={`text-xs sm:text-sm font-semibold ${
              ticker.change >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {ticker.change >= 0 ? '▲' : '▼'} {Math.abs(ticker.change).toFixed(2)}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
