import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';

/**
 * Pyth Network Integration for Real-Time Price Feeds
 * Provides secure, validated price data for arbitrage execution
 */
export class PythNetworkIntegration {
  private connection: Connection;
  private pythClient: PythHttpClient;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.pythClient = new PythHttpClient(connection, getPythProgramKeyForCluster('mainnet-beta'));
  }
  
  /**
   * Get real-time price for a token from Pyth oracle
   * @param tokenSymbol - Token symbol (e.g., 'SOL', 'USDC')
   * @returns Price in USD with confidence interval
   */
  async getPrice(tokenSymbol: string): Promise<{ price: number; confidence: number; timestamp: number } | null> {
    try {
      // Input validation
      if (!tokenSymbol || typeof tokenSymbol !== 'string' || tokenSymbol.trim() === '') {
        console.error('[Pyth] Invalid tokenSymbol: must be a non-empty string');
        return null;
      }
      
      const priceId = this.getPriceId(tokenSymbol);
      if (!priceId) {
        console.warn(`[Pyth] No price feed available for token: ${tokenSymbol}`);
        return null;
      }
      
      const data = await this.pythClient.getData();
      const priceData = data.productPrice.get(priceId.toString());
      
      if (!priceData || !priceData.price || !priceData.confidence) {
        console.error(`[Pyth] Invalid price data for ${tokenSymbol}`);
        return null;
      }
      
      // Validate price is positive
      if (priceData.price <= 0) {
        console.error(`[Pyth] Invalid price value for ${tokenSymbol}: ${priceData.price}`);
        return null;
      }
      
      return {
        price: priceData.price,
        confidence: priceData.confidence,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[Pyth] Error fetching price for ${tokenSymbol}:`, error);
      return null;
    }
  }
  
  /**
   * Get multiple prices in a single call for efficiency
   * @param tokenSymbols - Array of token symbols
   * @returns Map of token symbols to prices
   */
  async getPrices(tokenSymbols: string[]): Promise<Map<string, { price: number; confidence: number }>> {
    const prices = new Map<string, { price: number; confidence: number }>();
    
    // Input validation
    if (!Array.isArray(tokenSymbols) || tokenSymbols.length === 0) {
      console.error('[Pyth] Invalid tokenSymbols: must be a non-empty array');
      return prices;
    }
    
    try {
      const data = await this.pythClient.getData();
      
      for (const symbol of tokenSymbols) {
        const priceId = this.getPriceId(symbol);
        if (!priceId) continue;
        
        const priceData = data.productPrice.get(priceId.toString());
        if (priceData && priceData.price && priceData.price > 0) {
          prices.set(symbol, {
            price: priceData.price,
            confidence: priceData.confidence || 0,
          });
        }
      }
    } catch (error) {
      console.error('[Pyth] Error fetching multiple prices:', error);
    }
    
    return prices;
  }
  
  /**
   * Validate if price is fresh enough for trading
   * @param timestamp - Price timestamp
   * @param maxAgeSeconds - Maximum acceptable age in seconds (default: 60)
   * @returns true if price is fresh enough
   */
  isPriceFresh(timestamp: number, maxAgeSeconds: number = 60): boolean {
    const now = Date.now();
    const ageMs = now - timestamp;
    const ageSeconds = ageMs / 1000;
    
    return ageSeconds <= maxAgeSeconds;
  }
  
  /**
   * Validate price confidence is acceptable for trading
   * @param price - Price value
   * @param confidence - Confidence interval
   * @param maxConfidencePercent - Maximum acceptable confidence as percentage (default: 1%)
   * @returns true if confidence is acceptable
   */
  isConfidenceAcceptable(price: number, confidence: number, maxConfidencePercent: number = 1.0): boolean {
    if (price <= 0) return false;
    
    const confidencePercent = (confidence / price) * 100;
    return confidencePercent <= maxConfidencePercent;
  }
  
  /**
   * Get Pyth price feed ID for a token symbol
   * @param tokenSymbol - Token symbol
   * @returns PublicKey of the price feed or null
   */
  private getPriceId(tokenSymbol: string): PublicKey | null {
    // Mainnet Pyth price feed IDs
    const priceFeeds: Record<string, string> = {
      'SOL': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
      'USDC': 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD',
      'USDT': '3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL',
      'BTC': 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU',
      'ETH': 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
      'BONK': '8ihFLu5FimgTQ1Unh4dVyEHUGodJ5gJQCrQf4KUVB9bN',
      'JUP': 'g6eRCbboSwK4tSWngn773RCMexr1APQr4uA9bGZBYfo',
      'PYTH': 'nrYkQQQur7z8rYTST3G9GqATviK5SxTDkrqd21MW6Ue',
    };
    
    const feedId = priceFeeds[tokenSymbol.toUpperCase()];
    return feedId ? new PublicKey(feedId) : null;
  }
  
  /**
   * Calculate slippage protection based on real-time volatility
   * @param tokenSymbol - Token symbol
   * @param baseSlippage - Base slippage percentage (e.g., 0.01 for 1%)
   * @returns Adjusted slippage based on market conditions
   */
  async calculateDynamicSlippage(tokenSymbol: string, baseSlippage: number): Promise<number> {
    try {
      const priceData = await this.getPrice(tokenSymbol);
      if (!priceData) return baseSlippage;
      
      // Higher confidence interval = higher volatility = need more slippage
      const volatilityMultiplier = priceData.confidence / priceData.price;
      
      // Cap the multiplier at 3x
      const cappedMultiplier = Math.min(1 + volatilityMultiplier * 10, 3);
      
      const adjustedSlippage = baseSlippage * cappedMultiplier;
      
      // Cap at 5% maximum slippage
      return Math.min(adjustedSlippage, 0.05);
    } catch (error) {
      console.error('[Pyth] Error calculating dynamic slippage:', error);
      return baseSlippage;
    }
  }
}
