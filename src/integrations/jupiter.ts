import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import axios, { AxiosError } from 'axios';
import { config } from '../config/index.js';

export interface JupiterRoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface JupiterQuote {
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

/**
 * Jupiter Endpoint Health Status
 */
interface EndpointHealth {
  url: string;
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

/**
 * Enhanced Jupiter V6 Integration with Health Checks and Fallback Logic
 * Features:
 * - Multiple endpoint support with automatic failover
 * - Health monitoring of Jupiter API endpoints
 * - Retry logic with exponential backoff
 * - Request rate limiting
 * - Automatic endpoint switching on degradation
 */
export class JupiterV6Integration {
  private connection: Connection;
  private endpoints: EndpointHealth[];
  private currentEndpointIndex: number;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 60 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 100; // Rate limiting
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.currentEndpointIndex = 0;
    
    // Initialize endpoints with health status
    // Primary: Official Jupiter API, Fallback: Alternative endpoints
    this.endpoints = [
      {
        url: config.jupiter.apiUrl || 'https://api.jup.ag/v6',
        healthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
      },
      {
        url: 'https://quote-api.jup.ag/v6', // Fallback 1
        healthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
      },
      {
        url: 'https://api.jup.ag/v6', // Fallback 2 (explicit)
        healthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
      },
    ];
    
    // Start health check monitoring
    this.startHealthMonitoring();
  }
  
  /**
   * Start periodic health monitoring of endpoints
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkEndpointsHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }
  
  /**
   * Check health of all endpoints
   */
  private async checkEndpointsHealth(): Promise<void> {
    console.log('[Jupiter] Running endpoint health checks...');
    
    for (let i = 0; i < this.endpoints.length; i++) {
      try {
        const endpoint = this.endpoints[i];
        const response = await axios.get(`${endpoint.url}/health`, {
          timeout: 5000,
        });
        
        if (response.status === 200) {
          endpoint.healthy = true;
          endpoint.consecutiveFailures = 0;
          console.log(`[Jupiter] ✅ Endpoint ${i + 1} healthy: ${endpoint.url}`);
        } else {
          endpoint.healthy = false;
          endpoint.consecutiveFailures++;
          console.warn(`[Jupiter] ⚠️ Endpoint ${i + 1} degraded: ${endpoint.url}`);
        }
        
        endpoint.lastCheck = Date.now();
      } catch (error) {
        this.endpoints[i].healthy = false;
        this.endpoints[i].consecutiveFailures++;
        this.endpoints[i].lastCheck = Date.now();
        console.error(`[Jupiter] ❌ Endpoint ${i + 1} failed: ${this.endpoints[i].url}`);
      }
    }
  }
  
  /**
   * Get current healthy endpoint or switch to next available
   */
  private getCurrentEndpoint(): string {
    // Try current endpoint first
    if (this.endpoints[this.currentEndpointIndex].healthy) {
      return this.endpoints[this.currentEndpointIndex].url;
    }
    
    // Find next healthy endpoint
    for (let i = 0; i < this.endpoints.length; i++) {
      const index = (this.currentEndpointIndex + i) % this.endpoints.length;
      if (this.endpoints[index].healthy) {
        this.currentEndpointIndex = index;
        console.log(`[Jupiter] Switched to endpoint ${index + 1}: ${this.endpoints[index].url}`);
        return this.endpoints[index].url;
      }
    }
    
    // All endpoints unhealthy, use primary and mark for health check
    console.warn('[Jupiter] All endpoints unhealthy, using primary endpoint');
    this.currentEndpointIndex = 0;
    return this.endpoints[0].url;
  }
  
  /**
   * Mark current endpoint as failed and switch to next
   */
  private markEndpointFailed(): void {
    const endpoint = this.endpoints[this.currentEndpointIndex];
    endpoint.consecutiveFailures++;
    
    if (endpoint.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      endpoint.healthy = false;
      console.warn(`[Jupiter] Endpoint marked unhealthy after ${endpoint.consecutiveFailures} failures: ${endpoint.url}`);
    }
    
    // Switch to next endpoint
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
  }
  
  /**
   * Apply rate limiting to requests
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
      const delay = this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Execute request with retry and fallback logic
   */
  private async executeWithRetry<T>(
    requestFn: (apiUrl: string) => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        await this.applyRateLimit();
        const apiUrl = this.getCurrentEndpoint();
        const result = await requestFn(apiUrl);
        
        // Success - reset failure count
        this.endpoints[this.currentEndpointIndex].consecutiveFailures = 0;
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[Jupiter] ${operationName} attempt ${attempt}/${this.RETRY_ATTEMPTS} failed:`, error);
        
        if (attempt < this.RETRY_ATTEMPTS) {
          // Mark endpoint as failed and switch
          this.markEndpointFailed();
          
          // Exponential backoff
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[Jupiter] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[Jupiter] ${operationName} failed after ${this.RETRY_ATTEMPTS} attempts:`, lastError);
    return null;
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<JupiterQuote | null> {
    // Null safety checks
    if (!inputMint || inputMint.trim() === '' || !outputMint || outputMint.trim() === '') {
      console.error('[Jupiter] Invalid parameters: inputMint and outputMint are required and must not be empty');
      return null;
    }
    
    if (!amount || amount <= 0) {
      console.error('[Jupiter] Invalid amount: must be greater than 0, received:', amount);
      return null;
    }

    console.log(`[Jupiter] Fetching quote: ${inputMint.slice(0, 8)}... -> ${outputMint.slice(0, 8)}..., amount: ${amount}`);
    
    return this.executeWithRetry(async (apiUrl) => {
      const response = await axios.get(`${apiUrl}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
        },
        timeout: 10000, // 10 second timeout
      });
      
      if (!response.data) {
        throw new Error('Empty response from quote API');
      }
      
      console.log(`[Jupiter] Quote received: out amount ${response.data.outAmount}`);
      return response.data;
    }, 'getQuote');
  }
  
  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true
  ): Promise<VersionedTransaction | null> {
    // Null safety checks
    if (!quote) {
      console.error('[Jupiter] Invalid quote: quote object is required');
      return null;
    }
    
    if (!userPublicKey) {
      console.error('[Jupiter] Invalid userPublicKey: public key is required');
      return null;
    }

    console.log(`[Jupiter] Creating swap transaction for user: ${userPublicKey.slice(0, 8)}...`);
    
    return this.executeWithRetry(async (apiUrl) => {
      const response = await axios.post(`${apiUrl}/swap`, {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: wrapUnwrapSOL,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }, {
        timeout: 15000, // 15 second timeout
      });
      
      if (!response.data || !response.data.swapTransaction) {
        throw new Error('Invalid swap response: missing swapTransaction');
      }
      
      const swapTransactionBuf = Buffer.from(response.data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      console.log('[Jupiter] Swap transaction created successfully');
      return transaction;
    }, 'getSwapTransaction');
  }
  
  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    userPublicKey: PublicKey,
    slippageBps: number = 50
  ): Promise<string | null> {
    // Null safety checks
    if (!userPublicKey) {
      console.error('[Jupiter] Invalid userPublicKey: PublicKey is required');
      return null;
    }

    try {
      console.log(`[Jupiter] Executing swap for ${amount} of ${inputMint.slice(0, 8)}...`);
      
      const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);
      if (!quote) {
        console.error('[Jupiter] Failed to get quote, cannot execute swap');
        return null;
      }
      
      const swapTransaction = await this.getSwapTransaction(
        quote,
        userPublicKey.toString(),
        true
      );
      
      if (!swapTransaction) {
        console.error('[Jupiter] Failed to get swap transaction, cannot execute swap');
        return null;
      }
      
      console.log('[Jupiter] Swap transaction ready for signing and execution');
      console.warn('[Jupiter] Transaction execution requires wallet signing - transaction object ready but not submitted');
      // Note: In production, the swapTransaction would be signed by the user's wallet
      // and submitted to the network. This method returns null to indicate that
      // the caller should handle transaction signing and submission.
      // Example:
      // swapTransaction.sign([userKeypair]);
      // const signature = await this.connection.sendRawTransaction(swapTransaction.serialize());
      // await this.connection.confirmTransaction(signature);
      return null;
    } catch (error) {
      console.error('[Jupiter] Execute swap error:', error);
      return null;
    }
  }
  
  async findTriangularArbitrage(
    tokenA: string,
    tokenB: string,
    tokenC: string,
    amount: number
  ): Promise<{ profitable: boolean; profit: number; path: string[] } | null> {
    try {
      // A -> B
      const quoteAB = await this.getQuote(tokenA, tokenB, amount);
      if (!quoteAB) return null;
      
      const amountB = parseInt(quoteAB.outAmount);
      
      // B -> C
      const quoteBC = await this.getQuote(tokenB, tokenC, amountB);
      if (!quoteBC) return null;
      
      const amountC = parseInt(quoteBC.outAmount);
      
      // C -> A
      const quoteCA = await this.getQuote(tokenC, tokenA, amountC);
      if (!quoteCA) return null;
      
      const finalAmountA = parseInt(quoteCA.outAmount);
      const profit = finalAmountA - amount;
      const profitable = profit > 0;
      
      return {
        profitable,
        profit,
        path: [tokenA, tokenB, tokenC, tokenA],
      };
    } catch (error) {
      console.error('Triangular arbitrage search error:', error);
      return null;
    }
  }
  
  async getTokenList(): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    try {
      const response = await axios.get('https://token.jup.ag/all');
      return response.data;
    } catch (error) {
      console.error('Jupiter token list error:', error);
      return [];
    }
  }
  
  async getPriceInUSD(tokenMint: string): Promise<number | null> {
    // Null safety checks
    if (!tokenMint || tokenMint.trim() === '') {
      console.error('[Jupiter] Invalid tokenMint: token mint address is required and must not be empty');
      return null;
    }

    try {
      console.log(`[Jupiter] Fetching USD price for token: ${tokenMint.slice(0, 8)}...`);
      
      // Use v6 price API with fallback to v4
      const priceApiUrl = config.jupiter.priceApiUrl || 'https://price.jup.ag/v6';
      const response = await axios.get(`${priceApiUrl}/price?ids=${tokenMint}`);
      
      if (!response.data || !response.data.data) {
        console.error('[Jupiter] Invalid price response: missing data');
        return null;
      }
      
      const price = response.data.data[tokenMint]?.price;
      
      if (price === undefined || price === null) {
        console.warn(`[Jupiter] No price available for token: ${tokenMint.slice(0, 8)}...`);
        return null;
      }
      
      console.log(`[Jupiter] Price fetched: $${price}`);
      return price;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Jupiter] Price API error:', {
          status: error.response?.status,
          message: error.message,
        });
      } else {
        console.error('[Jupiter] Unexpected price fetch error:', error);
      }
      return null;
    }
  }
  
  /**
   * Get health status of all endpoints
   * @returns Array of endpoint health information
   */
  getEndpointHealthStatus(): Array<{
    url: string;
    healthy: boolean;
    lastCheck: number;
    consecutiveFailures: number;
  }> {
    return this.endpoints.map(endpoint => ({
      url: endpoint.url,
      healthy: endpoint.healthy,
      lastCheck: endpoint.lastCheck,
      consecutiveFailures: endpoint.consecutiveFailures,
    }));
  }
  
  /**
   * Manually trigger endpoint health check
   */
  async triggerHealthCheck(): Promise<void> {
    await this.checkEndpointsHealth();
  }
  
  /**
   * Get current active endpoint
   */
  getActiveEndpoint(): string {
    return this.endpoints[this.currentEndpointIndex].url;
  }
  
  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}
