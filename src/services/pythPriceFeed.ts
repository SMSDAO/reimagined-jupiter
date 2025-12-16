import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config/index.js';

/**
 * Pyth Network Price Feed Integration
 * Provides real-time price data using Pyth Network's oracle feeds
 */

export interface PythPriceData {
  symbol: string;
  mint: string;
  price: number;
  confidence: number;
  timestamp: number;
  expo: number;
  status: 'trading' | 'halted' | 'auction' | 'unknown';
}

export interface PriceUpdateCallback {
  (priceData: PythPriceData): void;
}

// Pyth price account mappings for common tokens
const PYTH_PRICE_FEEDS: Record<string, string> = {
  'SOL': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
  'BTC': 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU',
  'ETH': 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
  'USDC': 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD',
  'USDT': '3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL',
  'RAY': 'AnLf8tVYCM816gmBjiy8n53eXKKEDydT5piYjjQDPgTB',
  'ORCA': '4ivThkX8uRxBpHsdWSqyXYihzKF3zpRGAUCqyuagnLoV',
  'MNGO': '79wm3jjcPr6RaNQ4DGvP5KxG1mNd3gEBsg6FsNVFezK4',
  'JUP': 'g6eRCbboSwK4tSWngn773RCMexr1APQr4uA9bGZBYfo',
  'BONK': '8ihFLu5FimgTQ1Unh4dVyEHUGodJ5gJQCrQf4KUVB9bN',
};

export class PythPriceFeed {
  private connection: Connection;
  private priceCache: Map<string, PythPriceData>;
  private subscriptions: Map<string, NodeJS.Timeout>;
  private callbacks: Map<string, Set<PriceUpdateCallback>>;
  private updateInterval: number = 2000; // 2 seconds

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl);
    this.priceCache = new Map();
    this.subscriptions = new Map();
    this.callbacks = new Map();
  }

  /**
   * Get the Pyth price feed account for a token symbol
   */
  private getPriceFeedAccount(symbol: string): PublicKey | null {
    const feedAddress = PYTH_PRICE_FEEDS[symbol.toUpperCase()];
    if (!feedAddress) {
      console.warn(`[PythPriceFeed] No price feed found for ${symbol}`);
      return null;
    }
    return new PublicKey(feedAddress);
  }

  /**
   * Parse Pyth price account data
   */
  private parsePriceData(accountData: Buffer, symbol: string): PythPriceData | null {
    try {
      // Pyth account structure (simplified)
      // Full structure: https://github.com/pyth-network/pyth-client/blob/main/program/rust/src/processor.rs
      
      // Magic number check (0xa1b2c3d4)
      const magic = accountData.readUInt32LE(0);
      if (magic !== 0xa1b2c3d4) {
        console.error('[PythPriceFeed] Invalid Pyth account magic number');
        return null;
      }

      // Skip version field (offset 4)
      
      // Account type (should be 3 for price account)
      const accountType = accountData.readUInt32LE(8);
      if (accountType !== 3) {
        console.error('[PythPriceFeed] Not a price account');
        return null;
      }

      // Price data starts at offset 208
      const priceOffset = 208;
      
      // Read price components
      const priceRaw = accountData.readBigInt64LE(priceOffset); // price
      const conf = accountData.readBigUInt64LE(priceOffset + 8); // confidence
      const expo = accountData.readInt32LE(priceOffset + 16); // exponent
      const publishTime = accountData.readBigInt64LE(priceOffset + 20); // publish time
      
      // Price status
      const status = accountData.readUInt32LE(priceOffset + 28);
      const statusMap: Record<number, PythPriceData['status']> = {
        0: 'unknown',
        1: 'trading',
        2: 'halted',
        3: 'auction',
      };

      // Convert price to human-readable format
      const price = Number(priceRaw) * Math.pow(10, expo);
      const confidence = Number(conf) * Math.pow(10, expo);

      return {
        symbol,
        mint: '', // Not stored in Pyth account
        price,
        confidence,
        timestamp: Number(publishTime),
        expo,
        status: statusMap[status] || 'unknown',
      };
    } catch (error) {
      console.error('[PythPriceFeed] Error parsing price data:', error);
      return null;
    }
  }

  /**
   * Fetch current price for a token
   */
  async getPrice(symbol: string): Promise<PythPriceData | null> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached;
    }

    const priceFeedAccount = this.getPriceFeedAccount(symbol);
    if (!priceFeedAccount) {
      return null;
    }

    try {
      const accountInfo = await this.connection.getAccountInfo(priceFeedAccount);
      if (!accountInfo || !accountInfo.data) {
        console.error(`[PythPriceFeed] No account data found for ${symbol}`);
        return null;
      }

      const priceData = this.parsePriceData(accountInfo.data, symbol);
      if (priceData) {
        this.priceCache.set(symbol, priceData);
      }
      
      return priceData;
    } catch (error) {
      console.error(`[PythPriceFeed] Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to price updates for a token
   */
  subscribe(symbol: string, callback: PriceUpdateCallback): () => void {
    // Add callback
    if (!this.callbacks.has(symbol)) {
      this.callbacks.set(symbol, new Set());
    }
    this.callbacks.get(symbol)!.add(callback);

    // Start subscription if not already active
    if (!this.subscriptions.has(symbol)) {
      this.startSubscription(symbol);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        
        // Stop subscription if no more callbacks
        if (callbacks.size === 0) {
          this.stopSubscription(symbol);
        }
      }
    };
  }

  /**
   * Start polling for price updates
   */
  private startSubscription(symbol: string): void {
    const interval = setInterval(async () => {
      const priceData = await this.getPrice(symbol);
      if (priceData) {
        // Notify all callbacks
        const callbacks = this.callbacks.get(symbol);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(priceData);
            } catch (error) {
              console.error('[PythPriceFeed] Callback error:', error);
            }
          });
        }
      }
    }, this.updateInterval);

    this.subscriptions.set(symbol, interval);
    console.log(`[PythPriceFeed] Started subscription for ${symbol}`);
  }

  /**
   * Stop polling for price updates
   */
  private stopSubscription(symbol: string): void {
    const interval = this.subscriptions.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.subscriptions.delete(symbol);
      this.callbacks.delete(symbol);
      console.log(`[PythPriceFeed] Stopped subscription for ${symbol}`);
    }
  }

  /**
   * Get multiple prices at once
   */
  async getPrices(symbols: string[]): Promise<Map<string, PythPriceData>> {
    const results = new Map<string, PythPriceData>();
    
    await Promise.all(
      symbols.map(async (symbol) => {
        const price = await this.getPrice(symbol);
        if (price) {
          results.set(symbol, price);
        }
      })
    );
    
    return results;
  }

  /**
   * Subscribe to multiple price feeds
   */
  subscribeMultiple(symbols: string[], callback: (prices: Map<string, PythPriceData>) => void): () => void {
    const unsubscribers: Array<() => void> = [];

    const aggregatedPrices = new Map<string, PythPriceData>();

    symbols.forEach(symbol => {
      const unsubscribe = this.subscribe(symbol, (priceData) => {
        aggregatedPrices.set(symbol, priceData);
        
        // Call callback with all current prices
        callback(new Map(aggregatedPrices));
      });
      
      unsubscribers.push(unsubscribe);
    });

    // Return function to unsubscribe from all
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Set update interval for subscriptions
   */
  setUpdateInterval(intervalMs: number): void {
    if (intervalMs < 500) {
      console.warn('[PythPriceFeed] Update interval too low, setting to 500ms minimum');
      intervalMs = 500;
    }
    this.updateInterval = intervalMs;
    console.log(`[PythPriceFeed] Update interval set to ${intervalMs}ms`);
  }

  /**
   * Clear all subscriptions and cache
   */
  cleanup(): void {
    // Stop all subscriptions
    this.subscriptions.forEach((interval, symbol) => {
      clearInterval(interval);
      console.log(`[PythPriceFeed] Cleaned up subscription for ${symbol}`);
    });
    
    this.subscriptions.clear();
    this.callbacks.clear();
    this.priceCache.clear();
    
    console.log('[PythPriceFeed] Cleanup complete');
  }

  /**
   * Get cached price data without fetching
   */
  getCachedPrice(symbol: string): PythPriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Check if a symbol has a price feed
   */
  hasPriceFeed(symbol: string): boolean {
    return PYTH_PRICE_FEEDS[symbol.toUpperCase()] !== undefined;
  }

  /**
   * Get all supported symbols
   */
  getSupportedSymbols(): string[] {
    return Object.keys(PYTH_PRICE_FEEDS);
  }
}

// Export singleton instance
export const pythPriceFeed = new PythPriceFeed();
