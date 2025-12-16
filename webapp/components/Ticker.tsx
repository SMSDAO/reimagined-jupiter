'use client';

import { useTicker } from '@/hooks/useTicker';
import { useEffect, useState } from 'react';

interface TickerProps {
  symbols?: string[];
  showConfidence?: boolean;
  compact?: boolean;
}

export default function Ticker({ 
  symbols, 
  showConfidence = false,
  compact = false 
}: TickerProps) {
  const { data, status, error, loading } = useTicker({
    symbols,
    refreshInterval: 1000, // 1 second updates
  });

  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data?.prices) {
      const newChanges: Record<string, number> = {};
      data.prices.forEach(price => {
        // Calculate price change indicator (simplified)
        const prevPrice = priceChanges[price.symbol];
        if (prevPrice !== undefined) {
          newChanges[price.symbol] = price.price - prevPrice;
        } else {
          newChanges[price.symbol] = price.price;
        }
      });
      setPriceChanges(newChanges);
    }
  }, [data]);

  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(6);
    }
  };

  const getPriceChangeColor = (symbol: string, currentPrice: number): string => {
    const prevPrice = priceChanges[symbol];
    if (prevPrice === undefined || prevPrice === currentPrice) {
      return 'text-gray-400';
    }
    return currentPrice > prevPrice ? 'text-green-500' : 'text-red-500';
  };

  const getPriceChangeIndicator = (symbol: string, currentPrice: number): string => {
    const prevPrice = priceChanges[symbol];
    if (prevPrice === undefined || prevPrice === currentPrice) {
      return '●';
    }
    return currentPrice > prevPrice ? '▲' : '▼';
  };

  if (loading && !data) {
    return (
      <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
        <span className="text-gray-500">Loading prices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
        <div className="flex items-center space-x-2 text-red-500">
          <span className="text-xl">⚠️</span>
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!data || data.prices.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
        <span className="text-gray-500">No price data available</span>
      </div>
    );
  }

  return (
    <div className={`ticker-container ${compact ? 'text-sm' : ''}`}>
      {/* Connection Status Indicator */}
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
        <span className={`text-xs ${status.connected ? 'text-green-400' : 'text-red-400'}`}>
          {status.connected ? 'Connected' : 'Disconnected'}
        </span>
        {status.connected && (
          <span className="text-xs text-gray-500">
            ({Object.values(status.providerStatus).filter(Boolean).length} providers active)
          </span>
        )}
      </div>

      {/* Price Ticker */}
      <div className={`flex flex-wrap gap-4 ${compact ? 'gap-2' : ''}`}>
        {data.prices.map((price) => (
          <div
            key={price.symbol}
            className={`
              ticker-item 
              bg-gray-800/50 
              backdrop-blur-sm 
              rounded-lg 
              ${compact ? 'p-2' : 'p-3'}
              border border-gray-700
              hover:border-blue-500
              transition-all
              duration-200
            `}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'} text-white`}>
                {price.symbol}
              </span>
              <span className={`${getPriceChangeColor(price.symbol, price.price)} ${compact ? 'text-xs' : 'text-sm'}`}>
                {getPriceChangeIndicator(price.symbol, price.price)}
              </span>
            </div>
            <div className={`${compact ? 'text-sm' : 'text-lg'} font-mono font-bold text-blue-400`}>
              ${formatPrice(price.price)}
            </div>
            {showConfidence && (
              <div className="text-xs text-gray-500">
                ±${formatPrice(price.confidence)}
              </div>
            )}
            <div className="text-xs text-gray-600 mt-1">
              {price.source}
            </div>
          </div>
        ))}
      </div>

      {/* Provider Status (when not connected) */}
      {!status.connected && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded text-xs">
          <div className="font-semibold text-red-400 mb-1">Provider Status:</div>
          <div className="space-y-1">
            {Object.entries(status.providerStatus).map(([provider, active]) => (
              <div key={provider} className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={active ? 'text-green-400' : 'text-red-400'}>
                  {provider}: {active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {data.timestamp && (
        <div className="text-xs text-gray-600 mt-2">
          Last update: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
