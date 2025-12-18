import { useState, useEffect, useCallback } from 'react';

interface LiveSyncOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * useLiveSync - Custom hook for live data synchronization
 * 
 * Features:
 * - Automatically fetches data at specified intervals
 * - Tracks loading, error, and last update states
 * - Can be enabled/disabled dynamically
 * - Cleans up on unmount
 * 
 * @param fetchFn Function that fetches the data (must be stable)
 * @param options Configuration options
 * @returns Object with data, loading, error, and lastUpdate states
 * 
 * @example
 * const { data, loading, error, lastUpdate } = useLiveSync(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   },
 *   { intervalMs: 3000, enabled: true }
 * );
 */
export function useLiveSync<T>(
  fetchFn: () => Promise<T>,
  options: LiveSyncOptions = {}
) {
  const { intervalMs = 3000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Memoize the fetch function to prevent infinite loops
  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchFn();
      setData(result);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[useLiveSync] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const runFetch = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        const result = await fetchFn();
        if (isMounted) {
          setData(result);
          setError(null);
          setLastUpdate(new Date());
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          console.error('[useLiveSync] Fetch error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          // Schedule next fetch
          timeoutId = setTimeout(runFetch, intervalMs);
        }
      }
    };

    // Initial fetch
    runFetch();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchFn, intervalMs, enabled]);

  return { data, loading, error, lastUpdate };
}
