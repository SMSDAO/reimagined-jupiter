'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
  id: string;
  type: 'arbitrage' | 'swap' | 'snipe' | 'stake';
  message: string;
  timestamp: Date;
  amount?: string;
  status: 'success' | 'pending' | 'failed';
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket service for real-time activity updates
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');
        
        ws.onopen = () => {
          console.log('[LiveActivityFeed] WebSocket connected');
          // Subscribe to activity feed
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'activity'
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'activity') {
              const newActivity: Activity = {
                id: data.id || Date.now().toString(),
                type: data.activityType || 'swap',
                message: data.message || 'Transaction processed',
                timestamp: new Date(data.timestamp || Date.now()),
                amount: data.amount ? `$${data.amount.toFixed(2)}` : undefined,
                status: data.status || 'success',
              };
              
              setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
            }
          } catch (error) {
            console.error('[LiveActivityFeed] Error parsing message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('[LiveActivityFeed] WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('[LiveActivityFeed] WebSocket closed, reconnecting...');
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('[LiveActivityFeed] Error connecting to WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getTypeIcon = (type: Activity['type']) => {
    switch (type) {
      case 'arbitrage': return '⚡';
      case 'swap': return '🔄';
      case 'snipe': return '🎯';
      case 'stake': return '💎';
    }
  };

  const getStatusColor = (status: Activity['status']) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10 max-h-96 overflow-y-auto">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sticky top-0 bg-inherit pb-2">
        🔴 Live Activity
      </h3>
      <AnimatePresence mode="popLayout">
        {activities.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <div className="animate-pulse">Waiting for activity...</div>
          </div>
        ) : (
          activities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mb-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl sm:text-2xl">{getTypeIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-white text-sm sm:text-base font-medium truncate">
                      {activity.message}
                    </span>
                    {activity.amount && (
                      <span className={`text-xs sm:text-sm font-bold ${getStatusColor(activity.status)}`}>
                        {activity.amount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{activity.timestamp.toLocaleTimeString()}</span>
                    <span className={`${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
