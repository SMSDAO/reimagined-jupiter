/**
 * Jupiter Price Service
 * Provides real-time and bulk price fetching from Jupiter V6 Price API
 * Includes caching, WebSocket support, and portfolio valuation
 */

export interface JupiterPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
  timeTaken: number;
}

interface CacheEntry {
  data: JupiterPriceData;
  timestamp: number;
}

interface PriceSubscription {
  callback: (price: JupiterPriceData) => void;
  tokenId: string;
}

interface PortfolioToken {
  mint: string;
  amount: number;
}

export interface PortfolioValue {
  totalValue: number;
  tokens: Array<{
    mint: string;
    amount: number;
    price: number;
    value: number;
  }>;
  timestamp: number;
}

export class JupiterPriceService {
  private baseUrl = 'https://price.jup.ag/v6';
  private cache = new Map<string, CacheEntry>();
  private cacheDuration = 30000; // 30 seconds
  private subscriptions = new Map<string, PriceSubscription[]>();
  private wsConnections = new Map<string, WebSocket>();
  private globalPollingInterval: NodeJS.Timeout | null = null;
  private pollingIntervalMs = 5000; // 5 seconds

  /**
   * Get price for a single token
   * @param tokenId Token mint address
   * @param vsToken Quote token (default: USDC)
   * @returns Price data or null if not available
   */
  async getTokenPrice(
    tokenId: string,
    vsToken: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ): Promise<JupiterPriceData | null> {
    // Check cache first
    const cached = this.getCachedPrice(tokenId);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/price?ids=${tokenId}&vsToken=${vsToken}`
      );

      if (!response.ok) {
        console.error(`[JupiterPrice] Failed to fetch price for ${tokenId}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.data || !data.data[tokenId]) {
        console.warn(`[JupiterPrice] No price data available for ${tokenId}`);
        return null;
      }

      const priceData: JupiterPriceData = {
        id: data.data[tokenId].id,
        mintSymbol: data.data[tokenId].mintSymbol || 'UNKNOWN',
        vsToken: data.data[tokenId].vsToken || vsToken,
        vsTokenSymbol: data.data[tokenId].vsTokenSymbol || 'USDC',
        price: data.data[tokenId].price,
        timeTaken: data.timeTaken || 0,
      };

      // Cache the result
      this.setCachedPrice(tokenId, priceData);

      return priceData;
    } catch (error) {
      console.error(`[JupiterPrice] Error fetching price for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens in a single request
   * @param tokenIds Array of token mint addresses
   * @param vsToken Quote token (default: USDC)
   * @returns Map of token IDs to price data
   */
  async getBulkPrices(
    tokenIds: string[],
    vsToken: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ): Promise<Map<string, JupiterPriceData>> {
    const result = new Map<string, JupiterPriceData>();
    const tokensToFetch: string[] = [];

    // Check cache for each token
    for (const tokenId of tokenIds) {
      const cached = this.getCachedPrice(tokenId);
      if (cached) {
        result.set(tokenId, cached);
      } else {
        tokensToFetch.push(tokenId);
      }
    }

    // Fetch uncached tokens
    if (tokensToFetch.length === 0) {
      return result;
    }

    try {
      const idsParam = tokensToFetch.join(',');
      const response = await fetch(
        `${this.baseUrl}/price?ids=${idsParam}&vsToken=${vsToken}`
      );

      if (!response.ok) {
        console.error(`[JupiterPrice] Failed to fetch bulk prices: ${response.statusText}`);
        return result;
      }

      const data = await response.json();

      if (!data.data) {
        console.warn('[JupiterPrice] No price data in bulk response');
        return result;
      }

      // Process each token's price data
      for (const tokenId of tokensToFetch) {
        if (data.data[tokenId]) {
          const priceData: JupiterPriceData = {
            id: data.data[tokenId].id,
            mintSymbol: data.data[tokenId].mintSymbol || 'UNKNOWN',
            vsToken: data.data[tokenId].vsToken || vsToken,
            vsTokenSymbol: data.data[tokenId].vsTokenSymbol || 'USDC',
            price: data.data[tokenId].price,
            timeTaken: data.timeTaken || 0,
          };

          result.set(tokenId, priceData);
          this.setCachedPrice(tokenId, priceData);
        }
      }

      return result;
    } catch (error) {
      console.error('[JupiterPrice] Error fetching bulk prices:', error);
      return result;
    }
  }

  /**
   * Subscribe to real-time price updates via WebSocket
   * @param tokenId Token mint address
   * @param callback Function to call when price updates
   * @returns Unsubscribe function
   */
  subscribeToPrice(
    tokenId: string,
    callback: (price: JupiterPriceData) => void
  ): () => void {
    // Add subscription
    if (!this.subscriptions.has(tokenId)) {
      this.subscriptions.set(tokenId, []);
    }

    const subscription: PriceSubscription = { callback, tokenId };
    this.subscriptions.get(tokenId)!.push(subscription);

    // Initialize WebSocket connection if needed
    if (!this.wsConnections.has(tokenId)) {
      this.initializeWebSocket(tokenId);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(tokenId);
      if (subs) {
        const index = subs.indexOf(subscription);
        if (index > -1) {
          subs.splice(index, 1);
        }

        // Close WebSocket if no more subscriptions
        if (subs.length === 0) {
          this.closeWebSocket(tokenId);
          this.subscriptions.delete(tokenId);
        }
      }
    };
  }

  /**
   * Calculate total portfolio value
   * @param tokens Array of tokens with mint addresses and amounts
   * @returns Portfolio value breakdown
   */
  async calculatePortfolioValue(
    tokens: PortfolioToken[]
  ): Promise<PortfolioValue> {
    const mints = tokens.map(t => t.mint);
    const prices = await this.getBulkPrices(mints);

    const tokenValues = tokens.map(token => {
      const priceData = prices.get(token.mint);
      const price = priceData?.price || 0;
      const value = token.amount * price;

      return {
        mint: token.mint,
        amount: token.amount,
        price,
        value,
      };
    });

    const totalValue = tokenValues.reduce((sum, t) => sum + t.value, 0);

    return {
      totalValue,
      tokens: tokenValues,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all cached prices
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Close all WebSocket connections
   */
  closeAllConnections(): void {
    this.stopGlobalPolling();
    this.wsConnections.clear();
    this.subscriptions.clear();
  }

  // Private helper methods

  private getCachedPrice(tokenId: string): JupiterPriceData | null {
    const cached = this.cache.get(tokenId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(tokenId);
      return null;
    }

    return cached.data;
  }

  private setCachedPrice(tokenId: string, data: JupiterPriceData): void {
    this.cache.set(tokenId, {
      data,
      timestamp: Date.now(),
    });
  }

  private initializeWebSocket(tokenId: string): void {
    try {
      // Mark this token as having an active connection
      const pseudoWs = { close: () => {} } as WebSocket;
      this.wsConnections.set(tokenId, pseudoWs);
      
      // Start global polling if not already running
      this.startGlobalPolling();
    } catch (error) {
      console.error(`[JupiterPrice] Error initializing WebSocket for ${tokenId}:`, error);
    }
  }

  private startGlobalPolling(): void {
    if (this.globalPollingInterval !== null) {
      return; // Already running
    }

    // Note: Jupiter Price API doesn't have a public WebSocket endpoint
    // This implementation uses bulk polling as an efficient fallback
    this.globalPollingInterval = setInterval(async () => {
      const subscribedTokens = Array.from(this.subscriptions.keys());
      
      if (subscribedTokens.length === 0) {
        this.stopGlobalPolling();
        return;
      }

      try {
        // Fetch all subscribed tokens in a single bulk request
        const pricesMap = await this.getBulkPrices(subscribedTokens);
        
        // Notify all subscribers
        pricesMap.forEach((priceData, tokenId) => {
          const subs = this.subscriptions.get(tokenId);
          if (subs) {
            subs.forEach(sub => {
              try {
                sub.callback(priceData);
              } catch (error) {
                console.error('[JupiterPrice] Error in subscription callback:', error);
              }
            });
          }
        });
      } catch (error) {
        console.error('[JupiterPrice] Error in global polling:', error);
      }
    }, this.pollingIntervalMs);
  }

  private stopGlobalPolling(): void {
    if (this.globalPollingInterval !== null) {
      clearInterval(this.globalPollingInterval);
      this.globalPollingInterval = null;
    }
  }

  private closeWebSocket(tokenId: string): void {
    this.wsConnections.delete(tokenId);
    
    // Stop global polling if no more subscriptions
    if (this.subscriptions.size === 0) {
      this.stopGlobalPolling();
    }
  }
}

// Singleton instance
let jupiterPriceServiceInstance: JupiterPriceService | null = null;

/**
 * Get the singleton instance of JupiterPriceService
 */
export function getJupiterPriceService(): JupiterPriceService {
  if (!jupiterPriceServiceInstance) {
    jupiterPriceServiceInstance = new JupiterPriceService();
  }
  return jupiterPriceServiceInstance;
}

/**
 * Helper function to get a single token price
 */
export async function getTokenPrice(tokenId: string, vsToken?: string): Promise<number | null> {
  const service = getJupiterPriceService();
  const priceData = await service.getTokenPrice(tokenId, vsToken);
  return priceData ? priceData.price : null;
}

/**
 * Helper function to get multiple token prices
 */
export async function getBulkTokenPrices(
  tokenIds: string[],
  vsToken?: string
): Promise<Record<string, number>> {
  const service = getJupiterPriceService();
  const prices = await service.getBulkPrices(tokenIds, vsToken);
  
  const result: Record<string, number> = {};
  prices.forEach((priceData, tokenId) => {
    result[tokenId] = priceData.price;
  });
  
  return result;
}
