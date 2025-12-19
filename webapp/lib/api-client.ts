/**
 * API Client for external services integration
 * Centralizes all API calls with proper error handling and type safety
 */

import { API_ENDPOINTS } from './config/api-endpoints';

export interface TokenPrice {
  mint: string;
  price: number;
  extraInfo?: {
    quotedPrice?: {
      buyPrice?: number;
    };
  };
}

export interface PriceResponse {
  data: {
    [mint: string]: TokenPrice;
  };
}

export interface AirdropEligibility {
  amount?: number;
  allocation?: number;
  eligible: boolean;
}

/**
 * Jupiter Price API Client
 */
export class JupiterPriceAPI {
  private static readonly BASE_URL = API_ENDPOINTS.JUPITER_PRICE;

  /**
   * Fetch prices for multiple token mints
   */
  static async getPrices(mints: string[]): Promise<PriceResponse> {
    const mintAddresses = mints.join(',');
    const response = await fetch(`${this.BASE_URL}/price?ids=${mintAddresses}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Fetch price for a single token mint
   */
  static async getPrice(mint: string): Promise<number> {
    const response = await this.getPrices([mint]);
    return response.data[mint]?.price || 0;
  }

  /**
   * Get SOL price
   */
  static async getSOLPrice(): Promise<number> {
    return this.getPrice('So11111111111111111111111111111111111111112');
  }
}

/**
 * Jupiter Quote API Client
 */
export class JupiterQuoteAPI {
  private static readonly BASE_URL = API_ENDPOINTS.JUPITER_QUOTE;

  /**
   * Get quote for a swap
   */
  static async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ) {
    const response = await fetch(
      `${this.BASE_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get quote: ${response.statusText}`);
    }
    
    return response.json();
  }
}

/**
 * Jupiter Airdrop API Client
 */
export class JupiterAirdropAPI {
  private static readonly BASE_URL = API_ENDPOINTS.JUPITER_WORKER;

  /**
   * Check Jupiter airdrop eligibility for a wallet
   */
  static async checkEligibility(walletAddress: string): Promise<AirdropEligibility> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/jup-claim-proof/${walletAddress}`
      );
      
      if (response.status === 404) {
        return { eligible: false };
      }
      
      if (!response.ok) {
        throw new Error(`Failed to check eligibility: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        amount: data.amount,
        eligible: !!data.amount,
      };
    } catch (error) {
      console.error('Jupiter airdrop check failed:', error);
      return { eligible: false };
    }
  }
}

/**
 * Jito Airdrop API Client
 */
export class JitoAirdropAPI {
  private static readonly BASE_URL = API_ENDPOINTS.JITO_API;

  /**
   * Check Jito airdrop allocation for a wallet
   */
  static async checkAllocation(walletAddress: string): Promise<AirdropEligibility> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/airdrop_allocation/${walletAddress}`
      );
      
      if (response.status === 404) {
        return { eligible: false };
      }
      
      if (!response.ok) {
        throw new Error(`Failed to check allocation: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        allocation: data.allocation,
        eligible: !!data.allocation,
      };
    } catch (error) {
      console.error('Jito airdrop check failed:', error);
      return { eligible: false };
    }
  }
}

/**
 * Known token list for symbol resolution
 */
export const KNOWN_TOKENS: { [mint: string]: string } = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'JTO',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'ORCA',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'PYTH',
};

/**
 * Utility: Get token symbol from mint address
 */
export function getTokenSymbol(mint: string): string {
  return KNOWN_TOKENS[mint] || mint.slice(0, 4).toUpperCase();
}

/**
 * Utility: Format token amount with appropriate decimals
 */
export function formatTokenAmount(amount: number, decimals: number = 6): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K`;
  }
  if (amount < 0.01 && amount > 0) {
    return amount.toExponential(2);
  }
  return amount.toFixed(decimals);
}

/**
 * Utility: Format USD value
 */
export function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}
