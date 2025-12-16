'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TokenPrice {
  symbol: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
  source: string;
  metadata?: {
    priceChange24h?: number;
    volume24h?: number;
  };
}

export interface TickerData {
  prices: TokenPrice[];
  timestamp: number;
  count: number;
}

export interface TickerStatus {
  connected: boolean;
  providerStatus: Record<string, boolean>;
}

export interface UseTickerReturn {
  data: TickerData | null;
  status: TickerStatus;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface UseTickerOptions {
  symbols?: string[];
  refreshInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useTicker(options: UseTickerOptions = {}): UseTickerReturn {
  const {
    symbols,
    refreshInterval = 1000, // Default: 1 second
    enabled = true,
  } = options;

  const [data, setData] = useState<TickerData | null>(null);
  const [status, setStatus] = useState<TickerStatus>({
    connected: false,
    providerStatus: {},
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTickers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (symbols && symbols.length > 0) {
        params.set('symbols', symbols.join(','));
      }

      const url = `/api/tickers${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setStatus(result.status);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch ticker data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus({
        connected: false,
        providerStatus: {},
      });
      console.error('[useTicker] Error fetching ticker data:', err);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchTickers();
  }, [fetchTickers]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial fetch
    fetchTickers();

    // Set up polling interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchTickers();
      }, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, fetchTickers]);

  return {
    data,
    status,
    error,
    loading,
    refetch,
  };
}

// Helper hook to get a specific token price
export function useTokenPrice(symbol: string, refreshInterval?: number) {
  const { data, status, error, loading } = useTicker({
    symbols: [symbol],
    refreshInterval,
  });

  const tokenPrice = data?.prices.find(
    p => p.symbol.toUpperCase() === symbol.toUpperCase()
  );

  return {
    price: tokenPrice,
    status,
    error,
    loading,
  };
}
