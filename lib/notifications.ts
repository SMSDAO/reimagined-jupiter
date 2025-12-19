/**
 * Notification system for Discord/Telegram webhooks
 * Sends alerts and updates about trading activity
 */

import { logger } from './logger.js';

export interface NotificationConfig {
  discordWebhook?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  notifyOnTrade: boolean;
  notifyOnError: boolean;
  notifyOnProfit: boolean;
  notifyOnLoss: boolean;
  minProfitToNotify: number; // Minimum profit in SOL to notify
  minLossToNotify: number; // Minimum loss in SOL to notify
}

const DEFAULT_CONFIG: NotificationConfig = {
  notifyOnTrade: true,
  notifyOnError: true,
  notifyOnProfit: true,
  notifyOnLoss: true,
  minProfitToNotify: 0.01, // 0.01 SOL
  minLossToNotify: 0.005, // 0.005 SOL
};

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * Send Discord notification
 */
export async function sendDiscordNotification(
  webhook: string,
  message: string,
  level: NotificationLevel = 'info'
): Promise<boolean> {
  try {
    const colors = {
      info: 0x3498db, // Blue
      success: 0x2ecc71, // Green
      warning: 0xf39c12, // Orange
      error: 0xe74c3c, // Red
    };
    
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '🤖 GXQ Studio Bot',
            description: message,
            color: colors[level],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    
    if (!response.ok) {
      logger.error('Discord notification failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }
    
    logger.debug('Discord notification sent');
    return true;
  } catch (error) {
    logger.error('Error sending Discord notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Send Telegram notification
 */
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string,
  level: NotificationLevel = 'info'
): Promise<boolean> {
  try {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    
    const formattedMessage = `${emoji[level]} *GXQ Studio Bot*\n\n${message}`;
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedMessage,
          parse_mode: 'Markdown',
        }),
      }
    );
    
    if (!response.ok) {
      logger.error('Telegram notification failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }
    
    logger.debug('Telegram notification sent');
    return true;
  } catch (error) {
    logger.error('Error sending Telegram notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Send notification via all configured channels
 */
export async function sendNotification(
  message: string,
  level: NotificationLevel = 'info',
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const promises: Promise<boolean>[] = [];
  
  // Send Discord notification
  if (config.discordWebhook) {
    promises.push(sendDiscordNotification(config.discordWebhook, message, level));
  }
  
  // Send Telegram notification
  if (config.telegramBotToken && config.telegramChatId) {
    promises.push(
      sendTelegramNotification(config.telegramBotToken, config.telegramChatId, message, level)
    );
  }
  
  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}

/**
 * Notify about successful trade
 */
export async function notifyTrade(
  profit: number,
  signature: string,
  type: string,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  if (!config.notifyOnTrade) return;
  
  if (profit >= 0 && profit < config.minProfitToNotify) return;
  if (profit < 0 && Math.abs(profit) < config.minLossToNotify) return;
  
  const level: NotificationLevel = profit >= 0 ? 'success' : 'warning';
  const profitText = profit >= 0 ? `+${profit.toFixed(4)}` : profit.toFixed(4);
  
  const message = `
**Trade Executed**
Type: ${type}
Profit: ${profitText} SOL
Signature: \`${signature.substring(0, 16)}...\`
  `.trim();
  
  await sendNotification(message, level, config);
}

/**
 * Notify about error
 */
export async function notifyError(
  error: string,
  context?: string,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  if (!config.notifyOnError) return;
  
  const message = `
**Error Occurred**
${context ? `Context: ${context}\n` : ''}Error: ${error}
  `.trim();
  
  await sendNotification(message, 'error', config);
}

/**
 * Notify about circuit breaker opening
 */
export async function notifyCircuitBreaker(
  reason: string,
  stats: any,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const message = `
**🚨 Circuit Breaker Activated**
Reason: ${reason}
Total Trades: ${stats.totalTrades}
Total Profit: ${stats.totalProfit.toFixed(4)} SOL
Error Rate: ${(stats.errorRate * 100).toFixed(1)}%

Bot execution has been paused for safety.
  `.trim();
  
  await sendNotification(message, 'error', config);
}

/**
 * Notify about daily summary
 */
export async function notifyDailySummary(
  stats: any,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const message = `
**📊 Daily Summary**
Trades: ${stats.totalTrades}
Success Rate: ${stats.winRate.toFixed(1)}%
Net Profit: ${stats.netProfit.toFixed(4)} SOL
Average Profit: ${stats.averageProfit.toFixed(4)} SOL
Largest Win: ${stats.largestProfit.toFixed(4)} SOL
${stats.largestLoss > 0 ? `Largest Loss: ${stats.largestLoss.toFixed(4)} SOL` : ''}
  `.trim();
  
  const level: NotificationLevel = stats.netProfit >= 0 ? 'success' : 'warning';
  
  await sendNotification(message, level, config);
}

/**
 * Notify about bot startup
 */
export async function notifyStartup(
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const message = `
**🚀 Bot Started**
GXQ Studio Arbitrage Bot is now running.
Monitoring for opportunities...
  `.trim();
  
  await sendNotification(message, 'info', config);
}

/**
 * Notify about bot shutdown
 */
export async function notifyShutdown(
  reason: string,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const message = `
**🛑 Bot Stopped**
Reason: ${reason}
  `.trim();
  
  await sendNotification(message, 'warning', config);
}

/**
 * Notify about milestone (e.g., total profit reached)
 */
export async function notifyMilestone(
  milestone: string,
  value: number,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const message = `
**🎉 Milestone Reached**
${milestone}: ${value.toFixed(4)} SOL
  `.trim();
  
  await sendNotification(message, 'success', config);
}

/**
 * Load notification config from environment
 */
export function loadNotificationConfig(): NotificationConfig {
  return {
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    notifyOnTrade: process.env.NOTIFY_ON_TRADE !== 'false',
    notifyOnError: process.env.NOTIFY_ON_ERROR !== 'false',
    notifyOnProfit: process.env.NOTIFY_ON_PROFIT !== 'false',
    notifyOnLoss: process.env.NOTIFY_ON_LOSS !== 'false',
    minProfitToNotify: parseFloat(process.env.MIN_PROFIT_TO_NOTIFY || '0.01'),
    minLossToNotify: parseFloat(process.env.MIN_LOSS_TO_NOTIFY || '0.005'),
  };
}
