/**
 * RPC connection pooling
 * Manages a pool of reusable connections for better performance
 */

import { Connection, ConnectionConfig, Commitment } from '@solana/web3.js';
import { logger } from './logger.js';

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  healthCheckIntervalMs: number;
}

const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 10,
  minConnections: 2,
  idleTimeoutMs: 60000, // 1 minute
  connectionTimeoutMs: 5000, // 5 seconds
  healthCheckIntervalMs: 30000, // 30 seconds
};

interface PooledConnection {
  connection: Connection;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
  requestCount: number;
}

export class ConnectionPool {
  private config: ConnectionPoolConfig;
  private rpcUrl: string;
  private commitment: Commitment;
  private pool: PooledConnection[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(
    rpcUrl: string,
    commitment: Commitment = 'confirmed',
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.rpcUrl = rpcUrl;
    this.commitment = commitment;
    
    logger.info('Connection pool initialized', {
      rpcUrl: this.maskUrl(rpcUrl),
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections,
    });
    
    // Create minimum connections
    this.initializeMinConnections();
    
    // Start health checks
    this.startHealthChecks();
  }
  
  /**
   * Initialize minimum number of connections
   */
  private async initializeMinConnections(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }
  }
  
  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const connection = new Connection(this.rpcUrl, this.commitment);
    
    const pooledConnection: PooledConnection = {
      connection,
      inUse: false,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      requestCount: 0,
    };
    
    this.pool.push(pooledConnection);
    
    logger.debug('Created new connection', {
      poolSize: this.pool.length,
    });
    
    return pooledConnection;
  }
  
  /**
   * Acquire a connection from the pool
   */
  public async acquire(): Promise<Connection> {
    // Find an available connection
    let pooledConn = this.pool.find(pc => !pc.inUse);
    
    // If no available connection and pool not at max, create new one
    if (!pooledConn && this.pool.length < this.config.maxConnections) {
      pooledConn = await this.createConnection();
    }
    
    // Wait for a connection to become available
    if (!pooledConn) {
      pooledConn = await this.waitForAvailableConnection();
    }
    
    // Mark as in use
    pooledConn.inUse = true;
    pooledConn.lastUsed = Date.now();
    pooledConn.requestCount++;
    
    logger.debug('Connection acquired', {
      poolSize: this.pool.length,
      inUse: this.pool.filter(pc => pc.inUse).length,
    });
    
    return pooledConn.connection;
  }
  
  /**
   * Release a connection back to the pool
   */
  public release(connection: Connection): void {
    const pooledConn = this.pool.find(pc => pc.connection === connection);
    
    if (pooledConn) {
      pooledConn.inUse = false;
      pooledConn.lastUsed = Date.now();
      
      logger.debug('Connection released', {
        poolSize: this.pool.length,
        inUse: this.pool.filter(pc => pc.inUse).length,
      });
    }
  }
  
  /**
   * Wait for a connection to become available
   */
  private async waitForAvailableConnection(): Promise<PooledConnection> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.connectionTimeoutMs) {
      const available = this.pool.find(pc => !pc.inUse);
      
      if (available) {
        return available;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Connection pool timeout: no connections available');
  }
  
  /**
   * Execute a function with a pooled connection
   */
  public async withConnection<T>(
    fn: (connection: Connection) => Promise<T>
  ): Promise<T> {
    const connection = await this.acquire();
    
    try {
      return await fn(connection);
    } finally {
      this.release(connection);
    }
  }
  
  /**
   * Remove idle connections
   */
  private removeIdleConnections(): void {
    const now = Date.now();
    const idleThreshold = now - this.config.idleTimeoutMs;
    
    // Keep at least minConnections
    const removable = this.pool.filter(
      pc => !pc.inUse && pc.lastUsed < idleThreshold
    );
    
    const toRemove = removable.slice(0, this.pool.length - this.config.minConnections);
    
    for (const pc of toRemove) {
      const index = this.pool.indexOf(pc);
      if (index > -1) {
        this.pool.splice(index, 1);
        logger.debug('Removed idle connection', {
          idleTimeMs: now - pc.lastUsed,
          poolSize: this.pool.length,
        });
      }
    }
  }
  
  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.removeIdleConnections();
      this.checkPoolHealth();
    }, this.config.healthCheckIntervalMs);
  }
  
  /**
   * Stop health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  /**
   * Check pool health
   */
  private async checkPoolHealth(): Promise<void> {
    const stats = this.getStats();
    
    logger.debug('Connection pool health check', stats);
    
    // Ensure minimum connections
    if (stats.total < this.config.minConnections) {
      const needed = this.config.minConnections - stats.total;
      for (let i = 0; i < needed; i++) {
        await this.createConnection();
      }
    }
  }
  
  /**
   * Get pool statistics
   */
  public getStats(): {
    total: number;
    inUse: number;
    available: number;
    totalRequests: number;
    avgRequestsPerConnection: number;
  } {
    const total = this.pool.length;
    const inUse = this.pool.filter(pc => pc.inUse).length;
    const totalRequests = this.pool.reduce((sum, pc) => sum + pc.requestCount, 0);
    const avgRequestsPerConnection = total > 0 ? totalRequests / total : 0;
    
    return {
      total,
      inUse,
      available: total - inUse,
      totalRequests,
      avgRequestsPerConnection: Math.round(avgRequestsPerConnection),
    };
  }
  
  /**
   * Drain the pool (close all connections)
   */
  public async drain(): Promise<void> {
    logger.info('Draining connection pool');
    
    this.stopHealthChecks();
    
    // Wait for all connections to be released
    const maxWait = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (this.pool.some(pc => pc.inUse) && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.pool = [];
    
    logger.info('Connection pool drained');
  }
  
  /**
   * Mask URL for logging
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('api-key')) {
        urlObj.searchParams.set('api-key', '***');
      }
      return urlObj.toString();
    } catch {
      return url.substring(0, 30) + '***';
    }
  }
}

// Singleton instance
let poolInstance: ConnectionPool | null = null;

/**
 * Initialize connection pool
 */
export function initializeConnectionPool(
  rpcUrl: string,
  commitment?: Commitment,
  config?: Partial<ConnectionPoolConfig>
): ConnectionPool {
  poolInstance = new ConnectionPool(rpcUrl, commitment, config);
  return poolInstance;
}

/**
 * Get connection pool instance
 */
export function getConnectionPool(): ConnectionPool {
  if (!poolInstance) {
    throw new Error('Connection pool not initialized. Call initializeConnectionPool first.');
  }
  return poolInstance;
}
