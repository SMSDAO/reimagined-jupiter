'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '@/lib/notifications';

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<Notification>;
      const notification = customEvent.detail;

      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss if duration is set
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.duration);
      }
    };

    window.addEventListener('app-notification', handleNotification);
    return () => window.removeEventListener('app-notification', handleNotification);
  }, [dismissNotification]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success': return 'from-green-600 to-emerald-600';
      case 'error': return 'from-red-600 to-rose-600';
      case 'warning': return 'from-yellow-600 to-orange-600';
      case 'info': return 'from-blue-600 to-cyan-600';
      default: return 'from-purple-600 to-pink-600';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`bg-gradient-to-r ${getColor(notification.type)} backdrop-blur-md rounded-xl p-4 shadow-2xl`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getIcon(notification.type)}</div>
              <div className="flex-1">
                <h4 className="text-white font-bold mb-1">{notification.title}</h4>
                <p className="text-white/90 text-sm">{notification.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-white/70 hover:text-white transition"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
