/**
 * API Health Checker Service
 * 
 * Monitors API endpoints health and provides automatic fallback mechanisms.
 * Runs periodic health checks and maintains endpoint availability status.
 */

import { getAPIConfig, APIEndpoint } from './api-config';

export interface HealthCheckResult {
  endpoint: string;
  name: string;
  healthy: boolean;
  latency: number;
  timestamp: number;
  error?: string;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  lastCheck: number;
}

/**
 * API Health Checker
 */
export class APIHealthChecker {
  private static instance: APIHealthChecker;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthStatus: HealthStatus | null = null;
  private checkIntervalMs: number = 60000; // 60 seconds

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): APIHealthChecker {
    if (!APIHealthChecker.instance) {
      APIHealthChecker.instance = new APIHealthChecker();
    }
    return APIHealthChecker.instance;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      console.warn('Health checks already running');
      return;
    }

    this.checkIntervalMs = intervalMs;
    
    // Run initial check
    this.runHealthChecks().catch(error => {
      console.error('Initial health check failed:', error);
    });

    // Schedule periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks().catch(error => {
        console.error('Health check failed:', error);
      });
    }, intervalMs);

    console.log(`🏥 API health checks started (interval: ${intervalMs / 1000}s)`);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 API health checks stopped');
    }
  }

  /**
   * Run health checks on all endpoints
   */
  async runHealthChecks(): Promise<HealthStatus> {
    const apiConfig = getAPIConfig();
    const allEndpoints = apiConfig.getHealthStatus().map(e => ({
      url: e.endpoint,
      name: e.name,
      healthy: true,
      lastChecked: 0,
    }));

    const checks: HealthCheckResult[] = [];

    // Check each endpoint
    for (const endpoint of allEndpoints) {
      const result = await this.checkSingleEndpoint(endpoint);
      checks.push(result);
    }

    // Determine overall health
    const healthyCount = checks.filter(c => c.healthy).length;
    const totalCount = checks.length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount * 0.5) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const status: HealthStatus = {
      overall,
      checks,
      lastCheck: Date.now(),
    };

    this.lastHealthStatus = status;
    
    // Log summary
    console.log(`🏥 Health check complete: ${overall} (${healthyCount}/${totalCount} healthy)`);
    
    return status;
  }

  /**
   * Check health of a single endpoint
   */
  private async checkSingleEndpoint(endpoint: APIEndpoint): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Special handling for different endpoint types
      let checkUrl = endpoint.url;
      
      // For Jupiter APIs, try a lightweight health check endpoint
      if (endpoint.url.includes('api.jup.ag') || endpoint.url.includes('quote-api.jup.ag')) {
        // Quote API - use /health endpoint if available
        checkUrl = endpoint.url;
      } else if (endpoint.url.includes('price.jup.ag')) {
        // Price API - check with a simple query
        checkUrl = `${endpoint.url}/price?ids=So11111111111111111111111111111111111111112`;
      } else if (endpoint.url.includes('token.jup.ag')) {
        // Token list - just HEAD request
        checkUrl = endpoint.url;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(checkUrl, {
        method: endpoint.url.includes('token.jup.ag') ? 'HEAD' : 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      const healthy = response.ok || response.status === 404;

      return {
        endpoint: endpoint.url,
        name: endpoint.name,
        healthy,
        latency,
        timestamp: Date.now(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        endpoint: endpoint.url,
        name: endpoint.name,
        healthy: false,
        latency,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get last health status
   */
  getLastHealthStatus(): HealthStatus | null {
    return this.lastHealthStatus;
  }

  /**
   * Check if a specific service is healthy
   */
  isServiceHealthy(serviceName: 'jupiter' | 'pyth' | 'jito'): boolean {
    if (!this.lastHealthStatus) {
      return true; // Assume healthy if no checks run yet
    }

    const relevantChecks = this.lastHealthStatus.checks.filter(c => 
      c.name.toLowerCase().includes(serviceName)
    );

    if (relevantChecks.length === 0) {
      return true;
    }

    return relevantChecks.some(c => c.healthy);
  }

  /**
   * Get healthy endpoint for a service
   */
  getHealthyEndpoint(serviceName: 'jupiter-quote' | 'jupiter-price' | 'jupiter-tokens' | 'jupiter-worker' | 'pyth' | 'jito'): string | null {
    if (!this.lastHealthStatus) {
      return null;
    }

    const searchTerms: Record<string, string> = {
      'jupiter-quote': 'quote api',
      'jupiter-price': 'price api',
      'jupiter-tokens': 'token list',
      'jupiter-worker': 'worker api',
      'pyth': 'pyth',
      'jito': 'jito',
    };

    const searchTerm = searchTerms[serviceName].toLowerCase();
    
    const healthyCheck = this.lastHealthStatus.checks.find(c => 
      c.healthy && c.name.toLowerCase().includes(searchTerm)
    );

    return healthyCheck?.endpoint || null;
  }
}

/**
 * Convenience function to get health checker instance
 */
export function getHealthChecker(): APIHealthChecker {
  return APIHealthChecker.getInstance();
}

/**
 * Start health checks (call once on app initialization)
 */
export function startAPIHealthMonitoring(intervalMs: number = 60000): void {
  if (typeof window !== 'undefined') {
    // Client-side only
    getHealthChecker().startHealthChecks(intervalMs);
  }
}

/**
 * Stop health checks (call on app cleanup)
 */
export function stopAPIHealthMonitoring(): void {
  getHealthChecker().stopHealthChecks();
}
