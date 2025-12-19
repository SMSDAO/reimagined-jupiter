'use client';

import { useState, useEffect } from 'react';
import { getRPCRotator, type RPCEndpoint } from '@/lib/rpc-rotator';

/**
 * RPCHealthIndicator - Real-time RPC endpoint health monitor
 * 
 * Displays:
 * - Current RPC endpoints
 * - Health status (green/red indicator)
 * - Latency in milliseconds
 * - Updates every 5 seconds
 */
export default function RPCHealthIndicator() {
  const [endpoints, setEndpoints] = useState<RPCEndpoint[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Get initial status
    const rotator = getRPCRotator();
    setEndpoints(rotator.getEndpointStatus());

    // Update status every 5 seconds
    const interval = setInterval(() => {
      const status = rotator.getEndpointStatus();
      setEndpoints(status);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-2 text-xs text-white hover:bg-black/90 transition-colors z-50"
        aria-label="Show RPC status"
      >
        🌐 RPC Status
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-3 text-xs shadow-lg z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-white">🌐 RPC Status</div>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Hide RPC status"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1">
        {endpoints.map((ep, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-gray-300"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                ep.healthy ? 'bg-green-400' : 'bg-red-400'
              }`}
              title={ep.healthy ? 'Healthy' : 'Unhealthy'}
            />
            <span className="flex-1 truncate" title={ep.url}>
              {ep.name}
            </span>
            <span className="text-gray-500">
              {ep.latency > 0 && ep.latency < 9999 ? `${ep.latency}ms` : '---'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
