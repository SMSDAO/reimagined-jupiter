// Browser notification utilities

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // Auto-dismiss after duration (ms), 0 = never
}

// Request browser notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title: string, body: string, icon?: string): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
};

// Custom event-based notification system for in-app notifications
export const dispatchNotification = (
  type: NotificationType,
  title: string,
  message: string,
  duration: number = 5000
): void => {
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.random()}`,
    type,
    title,
    message,
    timestamp: Date.now(),
    duration,
  };

  window.dispatchEvent(
    new CustomEvent('app-notification', {
      detail: notification,
    })
  );
};

// Convenience functions
export const notifySuccess = (title: string, message: string): void => {
  dispatchNotification('success', title, message);
  showBrowserNotification(title, message);
};

export const notifyError = (title: string, message: string): void => {
  dispatchNotification('error', title, message, 8000); // Errors stay longer
  showBrowserNotification(title, message);
};

export const notifyInfo = (title: string, message: string): void => {
  dispatchNotification('info', title, message);
};

export const notifyWarning = (title: string, message: string): void => {
  dispatchNotification('warning', title, message, 6000);
};

// Notification for arbitrage opportunities
export const notifyOpportunity = (profitUSD: number, tokens: string[]): void => {
  const title = '💰 Arbitrage Opportunity Found!';
  const message = `${tokens.join(' → ')} - Potential profit: $${profitUSD.toFixed(2)}`;
  
  dispatchNotification('success', title, message, 10000);
  
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      requireInteraction: true, // Stay until clicked
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

// Notification for trade execution
export const notifyTradeExecution = (
  success: boolean,
  tokens: string[],
  profit?: number
): void => {
  if (success) {
    notifySuccess(
      '✅ Trade Executed Successfully!',
      `${tokens.join(' → ')} - Profit: $${profit?.toFixed(2) || '0.00'}`
    );
  } else {
    notifyError(
      '❌ Trade Execution Failed',
      `${tokens.join(' → ')} - Please check your wallet and try again`
    );
  }
};
