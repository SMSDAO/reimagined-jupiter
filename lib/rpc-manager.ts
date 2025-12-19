/**
 * Multi-RPC failover manager with health checking
 * Provides automatic failover to backup RPC nodes
 */

import { Connection, ConnectionConfig } from '@solana/web3.js';
import { logger } from './logger.js';
import { getActiveRpcEndpoints, type RpcEndpoint } from '../config/rpc-endpoints.js';

interface RpcHealth {
  endpoint: RpcEndpoint;
  isHealthy: boolean;
  lastCheck: number;
  latency: number;
  errorCount: number;
  successCount: number;
}

export class RpcManager {
  private endpoints: RpcEndpoint[];
  private healthStatus: Map<string, RpcHealth> = new Map();
  private currentEndpointIndex = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly healthCheckIntervalMs = 60000; // 1 minute
  private readonly healthCheckTimeoutMs = 5000; // 5 seconds
  private readonly maxErrorsBeforeFailover = 3;
  
  constructor(endpoints?: RpcEndpoint[]) {
    this.endpoints = endpoints || getActiveRpcEndpoints();
    
    if (this.endpoints.length === 0) {
      throw new Error('No RPC endpoints configured');
    }
    
    // Initialize health status
    this.endpoints.forEach(endpoint => {
      this.healthStatus.set(endpoint.url, {
        endpoint,
        isHealthy: true,
        lastCheck: 0,
        latency: 0,
        errorCount: 0,
        successCount: 0,
      });
    });
    
    logger.info('RPC Manager initialized', {
      endpointCount: this.endpoints.length,
      primaryEndpoint: this.endpoints[0].name,
    });
  }
  
  /**
   * Get current RPC connection
   */
  public getConnection(config?: ConnectionConfig): Connection {
    const endpoint = this.getCurrentEndpoint();
    
    logger.debug('Getting RPC connection', {
      endpoint: endpoint.name,
      url: this.maskUrl(endpoint.url),
    });
    
    return new Connection(endpoint.url, config || 'confirmed');
  }
  
  /**
   * Get current endpoint
   */
  private getCurrentEndpoint(): RpcEndpoint {
    return this.endpoints[this.currentEndpointIndex];
  }
  
  /**
   * Fail over to next healthy endpoint
   */
  public async failover(): Promise<void> {
    const currentEndpoint = this.getCurrentEndpoint();
    
    logger.warn('Initiating RPC failover', {
      from: currentEndpoint.name,
    });
    
    // Mark current endpoint as unhealthy
    const health = this.healthStatus.get(currentEndpoint.url);
    if (health) {
      health.isHealthy = false;
      health.errorCount++;
    }
    
    // Find next healthy endpoint
    for (let i = 0; i < this.endpoints.length; i++) {
      const nextIndex = (this.currentEndpointIndex + 1 + i) % this.endpoints.length;
      const nextEndpoint = this.endpoints[nextIndex];
      const nextHealth = this.healthStatus.get(nextEndpoint.url);
      
      if (nextHealth && nextHealth.isHealthy) {
        this.currentEndpointIndex = nextIndex;
        
        logger.info('Failed over to RPC endpoint', {
          to: nextEndpoint.name,
          url: this.maskUrl(nextEndpoint.url),
        });
        
        return;
      }
    }
    
    // No healthy endpoints found, try first one anyway
    this.currentEndpointIndex = 0;
    logger.error('No healthy RPC endpoints found, using first endpoint');
  }
  
  /**
   * Check health of an endpoint
   */
  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<boolean> {
    const health = this.healthStatus.get(endpoint.url);
    if (!health) return false;
    
    try {
      const startTime = Date.now();
      const connection = new Connection(endpoint.url, 'confirmed');
      
      // Try to get slot with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), this.healthCheckTimeoutMs)
      );
      
      await Promise.race([
        connection.getSlot(),
        timeoutPromise,
      ]);
      
      const latency = Date.now() - startTime;
      
      // Update health status
      health.isHealthy = true;
      health.lastCheck = Date.now();
      health.latency = latency;
      health.successCount++;
      health.errorCount = Math.max(0, health.errorCount - 1); // Decay error count
      
      logger.debug('RPC health check passed', {
        endpoint: endpoint.name,
        latency,
      });
      
      return true;
    } catch (error) {
      health.errorCount++;
      health.lastCheck = Date.now();
      
      if (health.errorCount >= this.maxErrorsBeforeFailover) {
        health.isHealthy = false;
      }
      
      logger.warn('RPC health check failed', {
        endpoint: endpoint.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCount: health.errorCount,
      });
      
      return false;
    }
  }
  
  /**
   * Start periodic health checks
   */
  public startHealthChecks(): void {
    if (this.healthCheckInterval) {
      logger.warn('Health checks already running');
      return;
    }
    
    logger.info('Starting RPC health checks', {
      intervalMs: this.healthCheckIntervalMs,
    });
    
    // Run initial health check
    this.runHealthChecks();
    
    // Schedule periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, this.healthCheckIntervalMs);
  }
  
  /**
   * Stop periodic health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Stopped RPC health checks');
    }
  }
  
  /**
   * Run health checks on all endpoints
   */
  private async runHealthChecks(): Promise<void> {
    logger.debug('Running RPC health checks');
    
    const checks = this.endpoints.map(endpoint =>
      this.checkEndpointHealth(endpoint)
    );
    
    await Promise.allSettled(checks);
    
    // Log health summary
    const healthSummary = Array.from(this.healthStatus.values()).map(h => ({
      endpoint: h.endpoint.name,
      healthy: h.isHealthy,
      latency: h.latency,
    }));
    
    logger.debug('Health check summary', { endpoints: healthSummary });
  }
  
  /**
   * Get health status of all endpoints
   */
  public getHealthStatus(): RpcHealth[] {
    return Array.from(this.healthStatus.values());
  }
  
  /**
   * Get statistics
   */
  public getStats(): {
    totalEndpoints: number;
    healthyEndpoints: number;
    currentEndpoint: string;
    averageLatency: number;
  } {
    const healthArray = Array.from(this.healthStatus.values());
    const healthyEndpoints = healthArray.filter(h => h.isHealthy).length;
    const totalLatency = healthArray.reduce((sum, h) => sum + h.latency, 0);
    const avgLatency = healthArray.length > 0 ? totalLatency / healthArray.length : 0;
    
    return {
      totalEndpoints: this.endpoints.length,
      healthyEndpoints,
      currentEndpoint: this.getCurrentEndpoint().name,
      averageLatency: avgLatency,
    };
  }
  
  /**
   * Mask URL for logging (hide API keys)
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('api-key')) {
        urlObj.searchParams.set('api-key', '***');
      }
      return urlObj.toString();
    } catch {
      // If URL parsing fails, just mask the whole thing
      return url.substring(0, 30) + '***';
    }
  }
  
  /**
   * Record a successful request
   */
  public recordSuccess(): void {
    const health = this.healthStatus.get(this.getCurrentEndpoint().url);
    if (health) {
      health.successCount++;
      health.errorCount = Math.max(0, health.errorCount - 1);
    }
  }
  
  /**
   * Record a failed request
   */
  public recordError(): void {
    const health = this.healthStatus.get(this.getCurrentEndpoint().url);
    if (health) {
      health.errorCount++;
      
      if (health.errorCount >= this.maxErrorsBeforeFailover) {
        this.failover();
      }
    }
  }
}

// Singleton instance
let rpcManagerInstance: RpcManager | null = null;

/**
 * Initialize RPC manager
 */
export function initializeRpcManager(endpoints?: RpcEndpoint[]): RpcManager {
  rpcManagerInstance = new RpcManager(endpoints);
  rpcManagerInstance.startHealthChecks();
  return rpcManagerInstance;
}

/**
 * Get RPC manager instance
 */
export function getRpcManager(): RpcManager {
  if (!rpcManagerInstance) {
    rpcManagerInstance = initializeRpcManager();
  }
  return rpcManagerInstance;
}
