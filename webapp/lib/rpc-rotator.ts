import { Connection } from '@solana/web3.js';
import { getRPCEndpoints } from './config/api-endpoints';

export interface RPCEndpoint {
  url: string;
  name: string;
  healthy: boolean;
  latency: number;
  failures: number;
  lastCheck: number;
}

interface RPCLog {
  endpoint: string;
  method: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

/**
 * RPCRotator - Intelligent RPC endpoint rotation system
 * 
 * Features:
 * - Automatically rotates between multiple RPC endpoints
 * - Health checks every 30 seconds
 * - Prioritizes by latency (fastest first)
 * - Automatic failover on errors
 * - Performance logging and metrics
 */
export class RPCRotator {
  private endpoints: RPCEndpoint[];
  private currentIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private logs: RPCLog[] = [];
  private maxLogs = 1000;

  constructor(endpoints: Array<{ url: string; name: string }>) {
    this.endpoints = endpoints.map(({ url, name }) => ({
      url,
      name,
      healthy: true,
      latency: 0,
      failures: 0,
      lastCheck: Date.now(),
    }));

    // Start health checks immediately
    this.startHealthChecks();
  }

  /**
   * Get the best available connection based on health and latency
   */
  async getConnection(): Promise<Connection> {
    const endpoint = this.getBestEndpoint();
    return new Connection(endpoint.url, 'confirmed');
  }

  /**
   * Get the best endpoint (healthy + lowest latency)
   */
  private getBestEndpoint(): RPCEndpoint {
    // Filter healthy endpoints and sort by latency
    const healthy = this.endpoints
      .filter((e) => e.healthy)
      .sort((a, b) => a.latency - b.latency);

    if (healthy.length === 0) {
      // All endpoints unhealthy, reset and try first
      console.warn('[RPCRotator] All endpoints unhealthy, resetting...');
      this.resetEndpoints();
      return this.endpoints[0];
    }

    return healthy[0];
  }

  /**
   * Reset all endpoints to healthy state
   */
  private resetEndpoints(): void {
    this.endpoints.forEach((e) => {
      e.healthy = true;
      e.failures = 0;
    });
  }

  /**
   * Check health of a single endpoint
   */
  private async checkHealth(endpoint: RPCEndpoint): Promise<void> {
    const start = Date.now();
    try {
      const conn = new Connection(endpoint.url, 'confirmed');
      await Promise.race([
        conn.getSlot(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      endpoint.latency = Date.now() - start;
      endpoint.healthy = true;
      endpoint.failures = 0;

      this.logRequest(endpoint.url, 'health_check', endpoint.latency, true);
    } catch (error) {
      endpoint.failures++;
      endpoint.healthy = endpoint.failures < 3;
      endpoint.latency = 9999; // High latency for failed endpoints

      console.warn(
        `[RPCRotator] Health check failed for ${endpoint.name} (${endpoint.url}):`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      this.logRequest(endpoint.url, 'health_check', Date.now() - start, false);
    }

    endpoint.lastCheck = Date.now();
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Initial check
    this.endpoints.forEach((e) => this.checkHealth(e));

    // Periodic checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.endpoints.forEach((e) => this.checkHealth(e));
    }, 30000);
  }

  /**
   * Stop health checks (cleanup)
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Log RPC request for performance tracking
   */
  private logRequest(
    endpoint: string,
    method: string,
    duration: number,
    success: boolean
  ): void {
    this.logs.push({
      endpoint,
      method,
      duration,
      success,
      timestamp: new Date(),
    });

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get endpoint status for UI display
   */
  getEndpointStatus(): RPCEndpoint[] {
    return this.endpoints.map((e) => ({ ...e }));
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const endpointStats = new Map<
      string,
      {
        calls: number;
        failures: number;
        avgLatency: number;
      }
    >();

    this.logs.forEach((log) => {
      const stats = endpointStats.get(log.endpoint) || {
        calls: 0,
        failures: 0,
        avgLatency: 0,
      };

      stats.calls++;
      if (!log.success) stats.failures++;
      stats.avgLatency =
        (stats.avgLatency * (stats.calls - 1) + log.duration) / stats.calls;

      endpointStats.set(log.endpoint, stats);
    });

    return Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      ...stats,
      successRate:
        (((stats.calls - stats.failures) / stats.calls) * 100).toFixed(2) + '%',
    }));
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
let rotatorInstance: RPCRotator | null = null;

/**
 * Get or create the RPC rotator singleton
 */
export function getRPCRotator(): RPCRotator {
  if (!rotatorInstance) {
    const rpcUrls = getRPCEndpoints();
    
    // Create endpoint objects with names
    const endpoints = rpcUrls.map((url, index) => {
      const names = ['Primary', 'Secondary', 'Fallback', 'Alternative 1', 'Alternative 2'];
      return {
        url,
        name: names[index] || `Endpoint ${index + 1}`,
      };
    });

    rotatorInstance = new RPCRotator(endpoints);
  }

  return rotatorInstance;
}

/**
 * Easy connection getter for pages
 */
export async function getOptimalConnection(): Promise<Connection> {
  return getRPCRotator().getConnection();
}
