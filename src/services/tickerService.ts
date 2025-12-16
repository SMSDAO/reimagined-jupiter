import { HermesClient } from '@pythnetwork/hermes-client';
import { Connection, PublicKey } from '@solana/web3.js';
import EventEmitter from 'events';

export interface TokenPrice {
  symbol: string;
  mint: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
  source: 'pyth' | 'jupiter' | 'dex';
  metadata?: {
    volume24h?: number;
    priceChange24h?: number;
  };
}

export interface PriceUpdate {
  prices: Map<string, TokenPrice>;
  timestamp: number;
}

interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

// Pyth Network price feed IDs for Solana tokens
export const PYTH_PRICE_FEEDS: Record<string, string> = {
  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'USDC/USD': 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'RAY/USD': '91568baa8f0b0e6e62dc5269c7bcb6e92c5d3e0d5e1ddb645a4a79d27e3b3e25',
  'BONK/USD': '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'JUP/USD': 'g6eRCbboSwK4tSWngn773RCMexr1APQr4uA9bGZBYfo',
  'WIF/USD': '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  'PYTH/USD': '0bbf28e9a42a1e5f9b67c3d1c23a8c5a8d7d3b3e6e1d4f1e7e7f3f9f3f9f3f9f',
};

export class TickerService extends EventEmitter {
  private hermesClient: HermesClient;
  private connection: Connection;
  private priceCache: Map<string, TokenPrice>;
  private wsConnected: boolean;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private updateInterval: NodeJS.Timeout | null;
  private priceHistory: Map<string, TokenPrice[]>;
  private maxHistorySize: number;

  constructor(connection: Connection, hermesEndpoint: string = 'https://hermes.pyth.network') {
    super();
    this.hermesClient = new HermesClient(hermesEndpoint);
    this.connection = connection;
    this.priceCache = new Map();
    this.wsConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000; // 5 seconds
    this.updateInterval = null;
    this.priceHistory = new Map();
    this.maxHistorySize = 1000; // Keep last 1000 price updates per token
  }

  async start(): Promise<void> {
    try {
      console.log('[TickerService] Starting ticker service...');
      await this.connectWebSocket();
      this.startPriceUpdates();
      console.log('[TickerService] Ticker service started successfully');
    } catch (error) {
      console.error('[TickerService] Failed to start ticker service:', error);
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    try {
      console.log('[TickerService] Connecting to Pyth Hermes WebSocket...');
      
      // For now, we'll use HTTP polling instead of WebSocket
      // since @pythnetwork/hermes-client primarily uses REST API
      this.wsConnected = true;
      this.reconnectAttempts = 0;
      
      this.emit('connected');
      console.log('[TickerService] Connected to Pyth Network');
    } catch (error) {
      console.error('[TickerService] WebSocket connection error:', error);
      this.wsConnected = false;
      this.emit('error', error);
      await this.handleReconnect();
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[TickerService] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[TickerService] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(async () => {
      try {
        await this.connectWebSocket();
      } catch (error) {
        console.error('[TickerService] Reconnection failed:', error);
        await this.handleReconnect();
      }
    }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
  }

  private startPriceUpdates(): void {
    // Update prices every second
    this.updateInterval = setInterval(async () => {
      try {
        await this.fetchPrices();
      } catch (error) {
        console.error('[TickerService] Error fetching prices:', error);
        this.emit('error', error);
      }
    }, 1000);
  }

  private async fetchPrices(): Promise<void> {
    try {
      const priceIds = Object.values(PYTH_PRICE_FEEDS);
      
      // Fetch latest prices from Pyth
      const priceFeeds = await this.hermesClient.getLatestPriceUpdates(priceIds);
      
      if (!priceFeeds || !priceFeeds.parsed) {
        console.warn('[TickerService] No price data received');
        return;
      }

      const updates: PriceUpdate = {
        prices: new Map(),
        timestamp: Date.now(),
      };

      // Process each price feed
      for (const feed of priceFeeds.parsed) {
        const symbol = this.getSymbolFromPriceId(feed.id);
        if (!symbol) continue;

        const price = this.parsePythPrice(feed);
        if (price) {
          this.priceCache.set(symbol, price);
          updates.prices.set(symbol, price);
          
          // Store in history
          this.addToHistory(symbol, price);
        }
      }

      // Emit price update event
      if (updates.prices.size > 0) {
        this.emit('priceUpdate', updates);
      }
    } catch (error) {
      console.error('[TickerService] Error in fetchPrices:', error);
      throw error;
    }
  }

  private parsePythPrice(feed: any): TokenPrice | null {
    try {
      const price = feed.price;
      if (!price) return null;

      const priceValue = parseInt(price.price) * Math.pow(10, price.expo);
      const confidence = parseInt(price.conf) * Math.pow(10, price.expo);

      return {
        symbol: this.getSymbolFromPriceId(feed.id) || 'UNKNOWN',
        mint: '', // Will be populated from token config
        price: priceValue,
        confidence: confidence,
        exponent: price.expo,
        publishTime: price.publish_time,
        source: 'pyth',
      };
    } catch (error) {
      console.error('[TickerService] Error parsing Pyth price:', error);
      return null;
    }
  }

  private getSymbolFromPriceId(priceId: string): string | null {
    for (const [symbol, id] of Object.entries(PYTH_PRICE_FEEDS)) {
      if (id === priceId) {
        return symbol.split('/')[0]; // Return token symbol without /USD
      }
    }
    return null;
  }

  private addToHistory(symbol: string, price: TokenPrice): void {
    let history = this.priceHistory.get(symbol);
    if (!history) {
      history = [];
      this.priceHistory.set(symbol, history);
    }

    history.push(price);

    // Keep only the last maxHistorySize entries
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  public getCurrentPrices(): Map<string, TokenPrice> {
    return new Map(this.priceCache);
  }

  public getPrice(symbol: string): TokenPrice | null {
    return this.priceCache.get(symbol) || null;
  }

  public getPriceHistory(symbol: string, limit?: number): TokenPrice[] {
    const history = this.priceHistory.get(symbol) || [];
    if (limit && limit < history.length) {
      return history.slice(-limit);
    }
    return [...history];
  }

  public isConnected(): boolean {
    return this.wsConnected;
  }

  public getStatus(): {
    connected: boolean;
    priceCount: number;
    lastUpdate: number;
    reconnectAttempts: number;
  } {
    const prices = Array.from(this.priceCache.values());
    const lastUpdate = prices.length > 0 
      ? Math.max(...prices.map(p => p.publishTime))
      : 0;

    return {
      connected: this.wsConnected,
      priceCount: this.priceCache.size,
      lastUpdate,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public async stop(): Promise<void> {
    console.log('[TickerService] Stopping ticker service...');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.wsConnected = false;
    this.emit('disconnected');
    
    console.log('[TickerService] Ticker service stopped');
  }
}
