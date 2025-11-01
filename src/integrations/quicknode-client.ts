import { Connection } from '@solana/web3.js';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { config } from '../config/index.js';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  successRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

interface RateLimiter {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface WebSocketConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectDelay: number;
  reconnectAttempts: number;
}

export class QuickNodeClient extends EventEmitter {
  private rpcConnection: Connection;
  private apiKey: string;
  private functionsUrl: string;
  private kvUrl: string;
  private streamsUrl: string;
  private ipfsUrl: string;
  private axiosInstance: AxiosInstance;
  
  // Health tracking
  private healthMetrics: HealthMetrics;
  private latencyHistory: number[] = [];
  
  // Rate limiting (100 req/sec)
  private rateLimiter: RateLimiter;
  
  // WebSocket
  private ws: WebSocket | null = null;
  private wsConfig: WebSocketConfig;
  private wsReconnectAttempt = 0;
  
  constructor() {
    super();
    this.rpcConnection = new Connection(config.quicknode.rpcUrl || config.solana.rpcUrl);
    this.apiKey = config.quicknode.apiKey;
    this.functionsUrl = config.quicknode.functionsUrl;
    this.kvUrl = config.quicknode.kvUrl;
    this.streamsUrl = config.quicknode.streamsUrl;
    this.ipfsUrl = process.env.QUICKNODE_IPFS_URL || '';
    
    // Initialize axios with default config
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
    });
    
    // Initialize health metrics
    this.healthMetrics = {
      status: 'healthy',
      latency: 0,
      successRate: 100,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };
    
    // Initialize rate limiter (100 req/sec)
    this.rateLimiter = {
      tokens: 100,
      lastRefill: Date.now(),
      maxTokens: 100,
      refillRate: 100, // 100 tokens per second
    };
    
    // WebSocket configuration with exponential backoff
    this.wsConfig = {
      url: config.quicknode.rpcUrl.replace('https://', 'wss://'),
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectAttempts: 0,
    };
    
    // Start health monitoring
    this.startHealthMonitoring();
  }
  
  // Health Tracking & Latency Monitoring
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkHealth();
    }, 30000); // Check every 30 seconds
  }
  
  private async checkHealth(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.rpcConnection.getSlot();
      const latency = Date.now() - startTime;
      
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 100) {
        this.latencyHistory.shift();
      }
      
      this.healthMetrics.latency = this.getAverageLatency();
      this.healthMetrics.lastCheck = new Date();
      this.healthMetrics.consecutiveFailures = 0;
      
      if (this.healthMetrics.latency > 1000) {
        this.healthMetrics.status = 'degraded';
        this.emit('health:degraded', this.healthMetrics);
      } else {
        this.healthMetrics.status = 'healthy';
      }
      
      this.emit('health:check', this.healthMetrics);
    } catch (error) {
      this.healthMetrics.consecutiveFailures++;
      if (this.healthMetrics.consecutiveFailures >= 3) {
        this.healthMetrics.status = 'down';
        this.emit('health:down', this.healthMetrics);
      }
      this.emit('health:error', error);
    }
  }
  
  public getHealth(): HealthMetrics {
    return { ...this.healthMetrics };
  }
  
  private getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
  }
  
  // Rate Limiting (100 req/sec)
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timePassed = (now - this.rateLimiter.lastRefill) / 1000;
    
    // Refill tokens based on time passed
    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + timePassed * this.rateLimiter.refillRate
    );
    this.rateLimiter.lastRefill = now;
    
    // Wait if no tokens available
    if (this.rateLimiter.tokens < 1) {
      const waitTime = (1 - this.rateLimiter.tokens) / this.rateLimiter.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimiter.tokens = 1;
    }
    
    this.rateLimiter.tokens -= 1;
  }
  
  // QuickNode RPC Methods
  public getRpcConnection(): Connection {
    return this.rpcConnection;
  }
  
  public async callRpcMethod(method: string, params: any[]): Promise<any> {
    await this.waitForRateLimit();
    
    const startTime = Date.now();
    try {
      const response = await this.axiosInstance.post(config.quicknode.rpcUrl, {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      });
      
      const latency = Date.now() - startTime;
      this.latencyHistory.push(latency);
      this.emit('rpc:success', { method, latency });
      
      return response.data.result;
    } catch (error) {
      this.emit('rpc:error', { method, error });
      throw error;
    }
  }
  
  // QuickNode Functions REST API for Serverless Execution
  public async invokeFunction(functionName: string, params: any): Promise<any> {
    if (!this.functionsUrl) {
      this.emit('warning', 'QuickNode Functions URL not configured');
      return null;
    }
    
    await this.waitForRateLimit();
    
    try {
      const response = await this.axiosInstance.post(this.functionsUrl, {
        function: functionName,
        params,
      });
      
      this.emit('function:invoked', { functionName, params });
      return response.data;
    } catch (error) {
      this.emit('function:error', { functionName, error });
      throw error;
    }
  }
  
  public async deployFunction(name: string, code: string, runtime: string): Promise<string | null> {
    if (!this.functionsUrl) {
      return null;
    }
    
    try {
      const response = await this.axiosInstance.post(`${this.functionsUrl}/deploy`, {
        name,
        code,
        runtime,
      });
      
      this.emit('function:deployed', { name });
      return response.data.functionId;
    } catch (error) {
      this.emit('function:deploy-error', { name, error });
      return null;
    }
  }
  
  // IPFS Upload for Transaction Metadata
  public async uploadToIPFS(data: any): Promise<string | null> {
    if (!this.ipfsUrl) {
      this.emit('warning', 'QuickNode IPFS URL not configured');
      return null;
    }
    
    try {
      const response = await this.axiosInstance.post(this.ipfsUrl, data);
      const cid = response.data.cid || response.data.hash;
      
      this.emit('ipfs:uploaded', { cid, size: JSON.stringify(data).length });
      return cid;
    } catch (error) {
      this.emit('ipfs:error', error);
      return null;
    }
  }
  
  public async getFromIPFS(cid: string): Promise<any> {
    if (!this.ipfsUrl) {
      return null;
    }
    
    try {
      const response = await this.axiosInstance.get(`${this.ipfsUrl}/${cid}`);
      this.emit('ipfs:retrieved', { cid });
      return response.data;
    } catch (error) {
      this.emit('ipfs:retrieve-error', { cid, error });
      return null;
    }
  }
  
  // KV Store for Persistent Presets
  public async kvGet(key: string): Promise<any> {
    if (!this.kvUrl) {
      this.emit('warning', 'QuickNode KV URL not configured');
      return null;
    }
    
    await this.waitForRateLimit();
    
    try {
      const response = await this.axiosInstance.get(`${this.kvUrl}/${key}`);
      this.emit('kv:get', { key });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.emit('kv:error', { operation: 'get', key, error });
      return null;
    }
  }
  
  public async kvSet(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.kvUrl) {
      this.emit('warning', 'QuickNode KV URL not configured');
      return false;
    }
    
    await this.waitForRateLimit();
    
    try {
      await this.axiosInstance.post(this.kvUrl, {
        key,
        value,
        ttl,
      });
      
      this.emit('kv:set', { key, ttl });
      return true;
    } catch (error) {
      this.emit('kv:error', { operation: 'set', key, error });
      return false;
    }
  }
  
  public async kvDelete(key: string): Promise<boolean> {
    if (!this.kvUrl) {
      return false;
    }
    
    await this.waitForRateLimit();
    
    try {
      await this.axiosInstance.delete(`${this.kvUrl}/${key}`);
      this.emit('kv:delete', { key });
      return true;
    } catch (error) {
      this.emit('kv:error', { operation: 'delete', key, error });
      return false;
    }
  }
  
  public async kvList(prefix?: string): Promise<string[]> {
    if (!this.kvUrl) {
      return [];
    }
    
    try {
      const response = await this.axiosInstance.get(`${this.kvUrl}/list`, {
        params: { prefix },
      });
      return response.data.keys || [];
    } catch (error) {
      this.emit('kv:error', { operation: 'list', error });
      return [];
    }
  }
  
  // Streams REST for Real-time Data Pipelines
  public async createStream(streamConfig: any): Promise<string | null> {
    if (!this.streamsUrl) {
      this.emit('warning', 'QuickNode Streams URL not configured');
      return null;
    }
    
    try {
      const response = await this.axiosInstance.post(this.streamsUrl, streamConfig);
      const streamId = response.data.streamId;
      
      this.emit('stream:created', { streamId, config: streamConfig });
      return streamId;
    } catch (error) {
      this.emit('stream:error', { operation: 'create', error });
      return null;
    }
  }
  
  public async deleteStream(streamId: string): Promise<boolean> {
    if (!this.streamsUrl) {
      return false;
    }
    
    try {
      await this.axiosInstance.delete(`${this.streamsUrl}/${streamId}`);
      this.emit('stream:deleted', { streamId });
      return true;
    } catch (error) {
      this.emit('stream:error', { operation: 'delete', streamId, error });
      return false;
    }
  }
  
  public async listStreams(): Promise<any[]> {
    if (!this.streamsUrl) {
      return [];
    }
    
    try {
      const response = await this.axiosInstance.get(this.streamsUrl);
      return response.data.streams || [];
    } catch (error) {
      this.emit('stream:error', { operation: 'list', error });
      return [];
    }
  }
  
  // WebSocket with Auto-Reconnect (Exponential Backoff)
  public connectWebSocket(): void {
    if (typeof WebSocket === 'undefined') {
      this.emit('ws:error', 'WebSocket is not available in this environment');
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      this.ws = new WebSocket(this.wsConfig.url);
      
      this.ws.onopen = () => {
        this.wsReconnectAttempt = 0;
        this.wsConfig.reconnectDelay = 1000;
        this.emit('ws:connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('ws:message', data);
        } catch (error) {
          this.emit('ws:parse-error', error);
        }
      };
      
      this.ws.onerror = (error) => {
        this.emit('ws:error', error);
      };
      
      this.ws.onclose = () => {
        this.emit('ws:disconnected');
        this.reconnectWebSocket();
      };
    } catch (error) {
      this.emit('ws:connection-error', error);
      this.reconnectWebSocket();
    }
  }
  
  private reconnectWebSocket(): void {
    if (this.wsReconnectAttempt >= 10) {
      this.emit('ws:max-reconnects-reached');
      return;
    }
    
    this.wsReconnectAttempt++;
    const delay = Math.min(
      this.wsConfig.reconnectDelay * Math.pow(2, this.wsReconnectAttempt - 1),
      this.wsConfig.maxReconnectDelay
    );
    
    this.emit('ws:reconnecting', { attempt: this.wsReconnectAttempt, delay });
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }
  
  public sendWebSocketMessage(message: any): boolean {
    if (typeof WebSocket === 'undefined') {
      this.emit('ws:send-error', 'WebSocket is not available');
      return false;
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emit('ws:send-error', 'WebSocket not connected');
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      this.emit('ws:sent', message);
      return true;
    } catch (error) {
      this.emit('ws:send-error', error);
      return false;
    }
  }
  
  public disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.emit('ws:closed');
    }
  }
  
  // Helper methods for arbitrage
  public async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      const result = await this.invokeFunction('getTokenPrice', { tokenMint });
      return result?.price || null;
    } catch (error) {
      return null;
    }
  }
  
  public async cacheArbitrageOpportunity(opportunity: any, ttl = 300): Promise<boolean> {
    const key = `arb:${opportunity.id}`;
    return await this.kvSet(key, opportunity, ttl);
  }
  
  public async getCachedArbitrageOpportunity(id: string): Promise<any> {
    const key = `arb:${id}`;
    return await this.kvGet(key);
  }
  
  // Transaction metadata archival
  public async archiveTransaction(signature: string, metadata: any): Promise<string | null> {
    const data = {
      signature,
      metadata,
      timestamp: new Date().toISOString(),
    };
    
    const cid = await this.uploadToIPFS(data);
    if (cid) {
      // Also store reference in KV store
      await this.kvSet(`tx:${signature}`, { cid, archived: true }, 86400 * 30); // 30 days
    }
    
    return cid;
  }
  
  public async getArchivedTransaction(signature: string): Promise<any> {
    const kvData = await this.kvGet(`tx:${signature}`);
    if (kvData && kvData.cid) {
      return await this.getFromIPFS(kvData.cid);
    }
    return null;
  }
}
