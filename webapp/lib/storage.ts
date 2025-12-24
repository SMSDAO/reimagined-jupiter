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
const ENCRYPTED_WALLET_KEY = 'gxq_encrypted_wallet';

// Wallet storage types
export interface EncryptedWallet {
  encryptedPrivateKey: string;
  publicKey: string;
  salt: string;
  iv: string;
  timestamp: number;
  type: 'ephemeral' | 'imported';
}

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

// Encrypted Wallet Storage
/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt private key with password
 */
export async function encryptPrivateKey(
  privateKey: string,
  password: string
): Promise<{ encryptedData: string; salt: string; iv: string }> {
  if (typeof window === 'undefined') {
    throw new Error('Encryption only available in browser');
  }
  
  // Generate salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive encryption key
  const key = await deriveKey(password, salt);
  
  // Encrypt the private key
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );
  
  // Convert to base64 for storage
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const encryptedData = btoa(String.fromCharCode(...encryptedArray));
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  
  return {
    encryptedData,
    salt: saltBase64,
    iv: ivBase64,
  };
}

/**
 * Decrypt private key with password
 */
export async function decryptPrivateKey(
  encryptedData: string,
  password: string,
  salt: string,
  iv: string
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Decryption only available in browser');
  }
  
  // Convert from base64
  const saltArray = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Derive decryption key
  const key = await deriveKey(password, saltArray);
  
  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivArray,
    },
    key,
    encryptedArray
  );
  
  // Convert back to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Save encrypted wallet to local storage
 * WARNING: Never store unencrypted private keys!
 */
export async function saveEncryptedWallet(
  privateKey: string,
  publicKey: string,
  password: string,
  type: 'ephemeral' | 'imported' = 'ephemeral'
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const { encryptedData, salt, iv } = await encryptPrivateKey(privateKey, password);
    
    const wallet: EncryptedWallet = {
      encryptedPrivateKey: encryptedData,
      publicKey,
      salt,
      iv,
      timestamp: Date.now(),
      type,
    };
    
    localStorage.setItem(ENCRYPTED_WALLET_KEY, JSON.stringify(wallet));
    console.log('[Storage] Wallet encrypted and saved securely');
  } catch (error) {
    console.error('[Storage] Error saving encrypted wallet:', error);
    throw new Error('Failed to save encrypted wallet');
  }
}

/**
 * Load and decrypt wallet from local storage
 */
export async function loadEncryptedWallet(password: string): Promise<{
  privateKey: string;
  publicKey: string;
  type: 'ephemeral' | 'imported';
} | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(ENCRYPTED_WALLET_KEY);
    if (!data) return null;
    
    const wallet: EncryptedWallet = JSON.parse(data);
    
    const privateKey = await decryptPrivateKey(
      wallet.encryptedPrivateKey,
      password,
      wallet.salt,
      wallet.iv
    );
    
    return {
      privateKey,
      publicKey: wallet.publicKey,
      type: wallet.type,
    };
  } catch (error) {
    console.error('[Storage] Error loading encrypted wallet:', error);
    throw new Error('Failed to decrypt wallet. Invalid password?');
  }
}

/**
 * Check if encrypted wallet exists
 */
export function hasEncryptedWallet(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const data = localStorage.getItem(ENCRYPTED_WALLET_KEY);
    return data !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get encrypted wallet metadata (without decrypting)
 */
export function getEncryptedWalletMetadata(): Pick<EncryptedWallet, 'publicKey' | 'timestamp' | 'type'> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(ENCRYPTED_WALLET_KEY);
    if (!data) return null;
    
    const wallet: EncryptedWallet = JSON.parse(data);
    return {
      publicKey: wallet.publicKey,
      timestamp: wallet.timestamp,
      type: wallet.type,
    };
  } catch (error) {
    console.error('[Storage] Error loading wallet metadata:', error);
    return null;
  }
}

/**
 * Delete encrypted wallet from storage
 */
export function deleteEncryptedWallet(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ENCRYPTED_WALLET_KEY);
    console.log('[Storage] Encrypted wallet deleted');
  } catch (error) {
    console.error('[Storage] Error deleting encrypted wallet:', error);
  }
}
