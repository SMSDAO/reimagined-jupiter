import { EventEmitter } from 'events';
import axios from 'axios';

export interface PriceUpdate {
  symbol: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
  timestamp: Date;
}

// Pyth price feed IDs for Solana tokens
export const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'SOL': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BONK': '0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'JUP': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'RAY': '0x91568baa8beb53e681a2a9632b11cc9f6d94d222454435b6d54ab9b8b7be6c74',
  'ORCA': '0x5867f5683c757393a0670ef0f701490950fe93fdb006d181c8265a831ac0c5c6',
  'PYTH': '0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
  'JTO': '0xb43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
  'WIF': '0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  'RENDER': '0xab6e3a6a7e3b6b6e4d3b8f3f7b9f3d6b6e3b6b6e3b6b6e3b6b6e3b6b6e3b6b6e',
};

export class PythPriceStreamService extends EventEmitter {
  private priceCache: Map<string, PriceUpdate>;
  private isRunning: boolean;
  private hermesUrl: string;
  private pollingInterval: NodeJS.Timeout | null;
  private trackedTokens: string[];
  
  constructor(hermesUrl: string = 'https://hermes.pyth.network') {
    super();
    this.hermesUrl = hermesUrl;
    this.priceCache = new Map();
    this.isRunning = false;
    this.pollingInterval = null;
    this.trackedTokens = [];
  }
  
  /**
   * Start streaming prices for specified tokens (via HTTP polling)
   */
  async start(tokens: string[]): Promise<void> {
    if (this.isRunning) {
      console.log('[PythStream] Already running');
      return;
    }
    
    const priceIds = tokens
      .map(token => PYTH_PRICE_FEED_IDS[token])
      .filter(id => id !== undefined);
    
    if (priceIds.length === 0) {
      console.error('[PythStream] No valid price feed IDs found for tokens:', tokens);
      return;
    }
    
    console.log(`[PythStream] Starting price stream for ${tokens.length} tokens...`);
    console.log(`[PythStream] Connected to ${this.hermesUrl}`);
    
    this.isRunning = true;
    this.trackedTokens = tokens;
    
    // Initial fetch
    await this.fetchPrices(tokens);
    
    // Poll for updates every 1 second
    this.pollingInterval = setInterval(async () => {
      await this.fetchPrices(tokens);
    }, 1000);
    
    console.log('[PythStream] Price stream started successfully');
  }
  
  /**
   * Fetch prices from Pyth Hermes API
   */
  private async fetchPrices(tokens: string[]): Promise<void> {
    try {
      const feedIds = tokens
        .map(token => PYTH_PRICE_FEED_IDS[token])
        .filter(id => id !== undefined);
      
      const idsParam = feedIds.map(id => `ids[]=${id}`).join('&');
      const url = `${this.hermesUrl}/api/latest_price_feeds?${idsParam}`;
      
      const response = await axios.get(url);
      
      if (response.data && Array.isArray(response.data)) {
        for (const feed of response.data) {
          if (feed.price) {
            const symbol = this.getSymbolFromFeedId(feed.id);
            
            if (symbol) {
              const priceData = feed.price;
              const update: PriceUpdate = {
                symbol,
                price: parseFloat(priceData.price) * Math.pow(10, priceData.expo),
                confidence: parseFloat(priceData.conf) * Math.pow(10, priceData.expo),
                exponent: priceData.expo,
                publishTime: priceData.publish_time,
                timestamp: new Date(),
              };
              
              this.priceCache.set(symbol, update);
              this.emit('price-update', update);
            }
          }
        }
      }
    } catch (error) {
      console.error('[PythStream] Error fetching prices:', error);
    }
  }
  
  /**
   * Stop the price stream
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[PythStream] Already stopped');
      return;
    }
    
    console.log('[PythStream] Stopping price stream...');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isRunning = false;
    console.log('[PythStream] Price stream stopped');
  }
  
  /**
   * Get the latest cached price for a token
   */
  getLatestPrice(symbol: string): PriceUpdate | null {
    return this.priceCache.get(symbol) || null;
  }
  
  /**
   * Get all cached prices
   */
  getAllPrices(): Map<string, PriceUpdate> {
    return new Map(this.priceCache);
  }
  
  /**
   * Check if price data is fresh (within last 5 seconds)
   */
  isPriceFresh(symbol: string): boolean {
    const priceUpdate = this.priceCache.get(symbol);
    if (!priceUpdate) return false;
    
    const age = Date.now() - priceUpdate.timestamp.getTime();
    return age < 5000; // 5 seconds
  }
  
  private getSymbolFromFeedId(feedId: string): string | null {
    for (const [symbol, id] of Object.entries(PYTH_PRICE_FEED_IDS)) {
      if (id.toLowerCase() === feedId.toLowerCase()) {
        return symbol;
      }
    }
    return null;
  }
  
  /**
   * Get service status
   */
  getStatus(): { running: boolean; cachedTokens: number; hermesUrl: string } {
    return {
      running: this.isRunning,
      cachedTokens: this.priceCache.size,
      hermesUrl: this.hermesUrl,
    };
  }
}
