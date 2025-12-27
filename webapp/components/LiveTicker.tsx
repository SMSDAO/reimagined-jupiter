"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

export default function LiveTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([
    { symbol: "SOL", price: 98.45, change: 2.5, volume: 1234567 },
    { symbol: "BONK", price: 0.000023, change: -1.2, volume: 987654 },
    { symbol: "JUP", price: 1.34, change: 5.7, volume: 456789 },
    { symbol: "WIF", price: 2.87, change: -0.8, volume: 234567 },
    { symbol: "RAY", price: 4.56, change: 3.2, volume: 345678 },
  ]);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket service for real-time price updates
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(
          process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
        );

        ws.onopen = () => {
          console.log("[LiveTicker] WebSocket connected");
          setIsConnected(true);
          // Subscribe to price feeds
          ws.send(
            JSON.stringify({
              type: "subscribe",
              channel: "prices",
              symbols: ["SOL", "BONK", "JUP", "WIF", "RAY"],
            }),
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "price_update" && data.prices) {
              setTickers((prev) =>
                prev.map((ticker) => {
                  const update = data.prices.find(
                    (p: any) => p.symbol === ticker.symbol,
                  );
                  if (update) {
                    return {
                      ...ticker,
                      price: update.price,
                      change: update.change24h || ticker.change,
                      volume: update.volume24h || ticker.volume,
                    };
                  }
                  return ticker;
                }),
              );
            }
          } catch (error) {
            console.error("[LiveTicker] Error parsing message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[LiveTicker] WebSocket error:", error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log("[LiveTicker] WebSocket closed");
          setIsConnected(false);
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("[LiveTicker] Error connecting to WebSocket:", error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
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
            <span className="font-bold text-white text-sm sm:text-base">
              {ticker.symbol}
            </span>
            <span className="text-gray-300 text-sm sm:text-base">
              ${ticker.price.toFixed(ticker.price < 1 ? 6 : 2)}
            </span>
            <span
              className={`text-xs sm:text-sm font-semibold ${
                ticker.change >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {ticker.change >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(ticker.change).toFixed(2)}%
            </span>
            {!isConnected && index === 0 && (
              <span
                className="text-xs text-yellow-400"
                title="Reconnecting to live data"
              >
                ⚠️
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
