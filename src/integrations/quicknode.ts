import { Connection } from '@solana/web3.js';
import axios from 'axios';
import { config } from '../config/index.js';

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
  
  async callRpcMethod(method: string, params: any[]): Promise<any> {
    try {
      const response = await axios.post(config.quicknode.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('QuickNode RPC error:', error);
      throw error;
    }
  }
  
  // QuickNode Functions
  async invokeFunction(functionName: string, params: any): Promise<any> {
    if (!this.functionsUrl) {
      console.warn('QuickNode Functions URL not configured');
      return null;
    }
    
    try {
      const response = await axios.post(this.functionsUrl, {
        function: functionName,
        params,
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('QuickNode Functions error:', error);
      throw error;
    }
  }
  
  // QuickNode Key-Value Store
  async kvGet(key: string): Promise<any> {
    if (!this.kvUrl) {
      console.warn('QuickNode KV URL not configured');
      return null;
    }
    
    try {
      const response = await axios.get(`${this.kvUrl}/${key}`, {
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('QuickNode KV Get error:', error);
      return null;
    }
  }
  
  async kvSet(key: string, value: any, ttl?: number): Promise<boolean> {
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
  async createStream(config: any): Promise<string | null> {
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
      const result = await this.invokeFunction('getTokenPrice', { tokenMint });
      return result?.price || null;
    } catch (error) {
      console.error('Error getting token price:', error);
      return null;
    }
  }
  
  async cacheArbitrageOpportunity(opportunity: any): Promise<boolean> {
    const key = `arb:${opportunity.id}`;
    return await this.kvSet(key, opportunity, 300); // 5 minute TTL
  }
  
  async getCachedArbitrageOpportunity(id: string): Promise<any> {
    const key = `arb:${id}`;
    return await this.kvGet(key);
  }
}
