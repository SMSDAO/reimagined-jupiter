import { Connection } from '@solana/web3.js';
import axios from 'axios';
import { config } from '../config/index.js';

interface RpcParams {
  [key: string]: unknown;
}

interface FunctionParams {
  [key: string]: unknown;
}

export class QuickNodeIntegration {
  private rpcConnection: Connection;
  private apiKey: string;
  private functionsUrl: string;
  private kvUrl: string;
  private streamsUrl: string;
  
  constructor() {
    this.rpcConnection = new Connection(config.quicknode.rpcUrl || config.solana.rpcUrl);
    this.apiKey = config.quicknode.apiKey;
    this.functionsUrl = config.quicknode.functionsUrl;
    this.kvUrl = config.quicknode.kvUrl;
    this.streamsUrl = config.quicknode.streamsUrl;
  }
  
  // QuickNode RPC Methods
  getRpcConnection(): Connection {
    return this.rpcConnection;
  }
  
  async callRpcMethod(method: string, params: RpcParams[] = []): Promise<unknown> {
    // Null safety checks
    if (!method) {
      console.error('[QuickNode] Invalid method: method name is required');
      return null;
    }
    
    if (!config.quicknode.rpcUrl) {
      console.error('[QuickNode] RPC URL not configured');
      return null;
    }

    try {
      console.log(`[QuickNode] Calling RPC method: ${method}`);
      
      const response = await axios.post(config.quicknode.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method,
        params: params || [],
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.data.error) {
        console.error('[QuickNode] RPC error response:', response.data.error);
        return null;
      }
      
      console.log(`[QuickNode] RPC method ${method} completed successfully`);
      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[QuickNode] RPC request failed:', {
          method,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
      } else {
        console.error('[QuickNode] Unexpected RPC error:', error);
      }
      throw error;
    }
  }
  
  // QuickNode Functions
  async invokeFunction(functionName: string, params: FunctionParams): Promise<unknown> {
    if (!this.functionsUrl) {
      console.warn('[QuickNode] Functions URL not configured');
      return null;
    }
    
    if (!functionName) {
      console.error('[QuickNode] Invalid functionName: function name is required');
      return null;
    }
    
    try {
      console.log(`[QuickNode] Invoking function: ${functionName}`);
      
      const response = await axios.post(this.functionsUrl, {
        function: functionName,
        params: params || {},
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[QuickNode] Function ${functionName} completed successfully`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[QuickNode] Function invocation failed:', {
          function: functionName,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
      } else {
        console.error('[QuickNode] Unexpected function error:', error);
      }
      throw error;
    }
  }
  
  // QuickNode Key-Value Store
  async kvGet(key: string): Promise<unknown> {
    if (!this.kvUrl) {
      console.warn('[QuickNode] KV URL not configured');
      return null;
    }
    
    if (!key) {
      console.error('[QuickNode] Invalid key: key is required');
      return null;
    }
    
    try {
      console.log(`[QuickNode] Getting KV value for key: ${key}`);
      
      const response = await axios.get(`${this.kvUrl}/${key}`, {
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });
      
      console.log(`[QuickNode] KV get successful for key: ${key}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log(`[QuickNode] Key not found: ${key}`);
        } else {
          console.error('[QuickNode] KV get failed:', {
            key,
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error('[QuickNode] Unexpected KV get error:', error);
      }
      return null;
    }
  }
  
  async kvSet(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.kvUrl) {
      console.warn('QuickNode KV URL not configured');
      return false;
    }
    
    try {
      await axios.post(this.kvUrl, {
        key,
        value,
        ttl,
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('QuickNode KV Set error:', error);
      return false;
    }
  }
  
  async kvDelete(key: string): Promise<boolean> {
    if (!this.kvUrl) {
      console.warn('QuickNode KV URL not configured');
      return false;
    }
    
    try {
      await axios.delete(`${this.kvUrl}/${key}`, {
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });
      return true;
    } catch (error) {
      console.error('QuickNode KV Delete error:', error);
      return false;
    }
  }
  
  // QuickNode Streams
  async createStream(config: Record<string, unknown>): Promise<string | null> {
    if (!this.streamsUrl) {
      console.warn('QuickNode Streams URL not configured');
      return null;
    }
    
    try {
      const response = await axios.post(this.streamsUrl, config, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      return response.data.streamId;
    } catch (error) {
      console.error('QuickNode Streams error:', error);
      return null;
    }
  }
  
  async subscribeToStream(streamId: string, _callback: (data: Record<string, unknown>) => void): Promise<void> {
    // WebSocket implementation for real-time data
    console.log(`Subscribing to stream: ${streamId}`);
    // Implementation would use WebSocket to listen to stream events
  }
  
  // Helper methods for arbitrage
  async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      // Could use QuickNode Functions to get price data
      const result = await this.invokeFunction('getTokenPrice', { tokenMint }) as { price?: number };
      return result?.price || null;
    } catch (error) {
      console.error('Error getting token price:', error);
      return null;
    }
  }
  
  async cacheArbitrageOpportunity(opportunity: Record<string, unknown> & { id: string }): Promise<boolean> {
    const key = `arb:${opportunity.id}`;
    return await this.kvSet(key, opportunity, 300); // 5 minute TTL
  }
  
  async getCachedArbitrageOpportunity(id: string): Promise<unknown> {
    const key = `arb:${id}`;
    return await this.kvGet(key);
  }
}
