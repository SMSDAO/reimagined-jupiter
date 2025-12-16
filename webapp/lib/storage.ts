// Local storage utilities for persisting user settings and history

export interface UserSettings {
  minProfit: number;
  autoExecute: boolean;
  slippage: number;
  theme: 'dark' | 'light';
  notifications: boolean;
}

export interface TradeHistory {
  id: string;
  type: 'flash' | 'triangular' | 'swap';
  tokens: string[];
  inputAmount: number;
  outputAmount: number;
  profit?: number;
  profitPercent?: number;
  timestamp: number;
  txSignature?: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
}

const SETTINGS_KEY = 'gxq_user_settings';
const HISTORY_KEY = 'gxq_trade_history';

// User Settings
export const saveUserSettings = (settings: UserSettings): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[Storage] Error saving settings:', error);
  }
};

export const loadUserSettings = (): UserSettings | null => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Error loading settings:', error);
    return null;
  }
};

export const getDefaultSettings = (): UserSettings => ({
  minProfit: 0.5,
  autoExecute: false,
  slippage: 1,
  theme: 'dark',
  notifications: true,
});

// Trade History
export const saveTradeHistory = (trade: TradeHistory): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const history = loadTradeHistory();
    const updated = [trade, ...history].slice(0, 100); // Keep last 100 trades
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[Storage] Error saving trade history:', error);
  }
};

export const loadTradeHistory = (): TradeHistory[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Error loading trade history:', error);
    return [];
  }
};

export const clearTradeHistory = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('[Storage] Error clearing trade history:', error);
  }
};

export const getTradeStats = (): {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  avgProfit: number;
} => {
  const history = loadTradeHistory();
  const successful = history.filter(t => t.status === 'success');
  const totalProfit = successful.reduce((sum, t) => sum + (t.profit || 0), 0);
  
  return {
    totalTrades: history.length,
    successfulTrades: successful.length,
    failedTrades: history.filter(t => t.status === 'failed').length,
    totalProfit,
    avgProfit: successful.length > 0 ? totalProfit / successful.length : 0,
  };
};
