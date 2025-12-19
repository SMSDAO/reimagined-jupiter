/**
 * Jupiter API v6 Client
 * 
 * Centralized client for Jupiter aggregator API with automatic failover
 * and proper error handling.
 * 
 * Updated endpoints:
 * - Quote API: https://api.jup.ag/v6 (formerly quote-api.jup.ag)
 * - Price API: https://price.jup.ag/v6
 * - Token List: https://token.jup.ag/all
 */

import { API } from './config';

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
}

export interface JupiterSwapInfo {
  ammKey: string;
  label?: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  feeAmount: string;
  feeMint: string;
}

export interface JupiterRoutePlan {
  swapInfo: JupiterSwapInfo;
  percent: number;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: JupiterRoutePlan[];
}

export interface JupiterSwapParams {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: number | 'auto';
}

export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
}

export interface JupiterPriceData {
  id: string;
  mintSymbol?: string;
  vsToken?: string;
  vsTokenSymbol?: string;
  price: number;
}

export interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

/**
 * Jupiter API v6 Client
 */
export class JupiterAPIClient {
  private quoteApiUrl: string;
  private priceApiUrl: string;
  private tokenListUrl: string;
  private timeout: number;

  constructor(timeout: number = 10000) {
    this.quoteApiUrl = API.jupiterQuote();
    this.priceApiUrl = API.jupiterPrice();
    this.tokenListUrl = API.jupiterTokens();
    this.timeout = timeout;
  }

  /**
   * Get quote for a swap
   */
  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse | null> {
    try {
      const {
        inputMint,
        outputMint,
        amount,
        slippageBps = 50,
        onlyDirectRoutes = false,
        asLegacyTransaction = false,
      } = params;

      const url = new URL(`${this.quoteApiUrl}/quote`);
      url.searchParams.set('inputMint', inputMint);
      url.searchParams.set('outputMint', outputMint);
      url.searchParams.set('amount', amount.toString());
      url.searchParams.set('slippageBps', slippageBps.toString());
      url.searchParams.set('onlyDirectRoutes', onlyDirectRoutes.toString());
      url.searchParams.set('asLegacyTransaction', asLegacyTransaction.toString());

      console.log(`[Jupiter] Fetching quote: ${inputMint.slice(0, 8)}... -> ${outputMint.slice(0, 8)}..., amount: ${amount}`);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.error(`[Jupiter] Quote API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log(`[Jupiter] Quote received: out amount ${data.outAmount}`);
      return data;
    } catch (error) {
      console.error('[Jupiter] Get quote error:', error);
      return null;
    }
  }

  /**
   * Get swap transaction from quote
   */
  async getSwapTransaction(params: JupiterSwapParams): Promise<JupiterSwapResponse | null> {
    try {
      const {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol = true,
        dynamicComputeUnitLimit = true,
        prioritizationFeeLamports = 'auto',
      } = params;

      console.log(`[Jupiter] Creating swap transaction for user: ${userPublicKey.slice(0, 8)}...`);

      const response = await fetch(`${this.quoteApiUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapAndUnwrapSol,
          dynamicComputeUnitLimit,
          prioritizationFeeLamports,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.error(`[Jupiter] Swap API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log('[Jupiter] Swap transaction created successfully');
      return data;
    } catch (error) {
      console.error('[Jupiter] Get swap transaction error:', error);
      return null;
    }
  }

  /**
   * Get token price in USD
   */
  async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      console.log(`[Jupiter] Fetching USD price for token: ${tokenMint.slice(0, 8)}...`);

      const response = await fetch(`${this.priceApiUrl}/price?ids=${tokenMint}`, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.error(`[Jupiter] Price API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const priceData = data.data?.[tokenMint];

      if (!priceData || priceData.price === undefined) {
        console.warn(`[Jupiter] No price available for token: ${tokenMint.slice(0, 8)}...`);
        return null;
      }

      console.log(`[Jupiter] Price fetched: $${priceData.price}`);
      return priceData.price;
    } catch (error) {
      console.error('[Jupiter] Get token price error:', error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getTokenPrices(tokenMints: string[]): Promise<Record<string, JupiterPriceData> | null> {
    try {
      const ids = tokenMints.join(',');
      console.log(`[Jupiter] Fetching USD prices for ${tokenMints.length} tokens`);

      const response = await fetch(`${this.priceApiUrl}/price?ids=${ids}`, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.error(`[Jupiter] Price API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log(`[Jupiter] Fetched prices for ${Object.keys(data.data || {}).length} tokens`);
      return data.data || {};
    } catch (error) {
      console.error('[Jupiter] Get token prices error:', error);
      return null;
    }
  }

  /**
   * Get all available tokens
   */
  async getTokenList(): Promise<JupiterToken[]> {
    try {
      console.log('[Jupiter] Fetching token list...');

      const response = await fetch(this.tokenListUrl, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.error(`[Jupiter] Token list API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log(`[Jupiter] Fetched ${data.length} tokens`);
      return data;
    } catch (error) {
      console.error('[Jupiter] Get token list error:', error);
      return [];
    }
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.quoteApiUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('[Jupiter] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let jupiterClientInstance: JupiterAPIClient | null = null;

/**
 * Get Jupiter API client instance
 */
export function getJupiterClient(): JupiterAPIClient {
  if (!jupiterClientInstance) {
    jupiterClientInstance = new JupiterAPIClient();
  }
  return jupiterClientInstance;
}

/**
 * Convenience functions for common operations
 */
export const jupiterApi = {
  getQuote: (params: JupiterQuoteParams) => getJupiterClient().getQuote(params),
  getSwapTransaction: (params: JupiterSwapParams) => getJupiterClient().getSwapTransaction(params),
  getTokenPrice: (tokenMint: string) => getJupiterClient().getTokenPrice(tokenMint),
  getTokenPrices: (tokenMints: string[]) => getJupiterClient().getTokenPrices(tokenMints),
  getTokenList: () => getJupiterClient().getTokenList(),
  checkHealth: () => getJupiterClient().checkHealth(),
};
