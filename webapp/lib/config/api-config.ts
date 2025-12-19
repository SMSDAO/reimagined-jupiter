/**
 * Centralized API Configuration Module
 * 
 * Manages all external API endpoints with dynamic environment-based switching,
 * runtime validation, and health checking capabilities.
 * 
 * Features:
 * - Production mode detection
 * - Automatic endpoint switching based on environment
 * - Runtime environment validation
 * - API health checking with fallback
 * - TypeScript type safety for all endpoints
 */

/**
 * Environment type detection
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * API endpoint configuration interface
 */
export interface APIEndpoint {
  url: string;
  name: string;
  healthy: boolean;
  lastChecked: number;
}

/**
 * Complete API configuration structure
 */
export interface APIConfiguration {
  jupiter: {
    quote: APIEndpoint[];
    price: APIEndpoint[];
    tokens: APIEndpoint[];
    worker: APIEndpoint[];
  };
  pyth: {
    hermes: APIEndpoint[];
  };
  jito: {
    api: APIEndpoint[];
  };
  solana: {
    explorer: string;
  };
  vercel: {
    deployUrl?: string;
  };
}

/**
 * Environment detection utility
 */
export class EnvironmentDetector {
  /**
   * Get current environment
   */
  static getEnvironment(): Environment {
    // Check NODE_ENV first
    if (process.env.NODE_ENV === 'test') {
      return 'test';
    }
    
    // Check for Vercel production deployment
    if (process.env.VERCEL_ENV === 'production') {
      return 'production';
    }
    
    // Check NODE_ENV for production
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }
    
    return 'development';
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  /**
   * Check if running in development
   */
  static isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  /**
   * Check if running in test environment
   */
  static isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  /**
   * Check if running on Vercel
   */
  static isVercel(): boolean {
    return Boolean(process.env.VERCEL);
  }

  /**
   * Get Vercel deployment URL
   */
  static getVercelUrl(): string | undefined {
    return process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  }
}

/**
 * Environment validator
 */
export class EnvironmentValidator {
  private static requiredVars: string[] = [];
  private static warnings: string[] = [];

  /**
   * Validate that required environment variables are set
   */
  static validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical variables - must be set
    const criticalVars = ['NEXT_PUBLIC_RPC_URL'];
    
    criticalVars.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    });

    // Recommended variables - should be set for optimal performance
    const recommendedVars = [
      'NEXT_PUBLIC_HELIUS_RPC',
      'NEXT_PUBLIC_QUICKNODE_RPC',
      'NEXT_PUBLIC_JUPITER_API_URL',
    ];

    recommendedVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Recommended environment variable not set: ${varName}`);
      }
    });

    // Production-specific validation
    if (EnvironmentDetector.isProduction()) {
      if (!process.env.NEXT_PUBLIC_HELIUS_RPC && !process.env.NEXT_PUBLIC_QUICKNODE_RPC) {
        warnings.push('Production deployment should use premium RPC endpoints (Helius or QuickNode)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Log validation results
   */
  static logValidation(): void {
    const result = this.validate();
    
    console.log('=== Environment Validation ===');
    console.log(`Environment: ${EnvironmentDetector.getEnvironment()}`);
    console.log(`Running on Vercel: ${EnvironmentDetector.isVercel()}`);
    
    if (result.errors.length > 0) {
      console.error('❌ Environment Errors:');
      result.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️  Environment Warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    if (result.valid && result.warnings.length === 0) {
      console.log('✅ Environment validation passed');
    }
  }
}

/**
 * API Configuration Manager
 */
export class APIConfigManager {
  private static instance: APIConfigManager;
  private config: APIConfiguration;

  private constructor() {
    this.config = this.initializeConfig();
    
    // Log validation on initialization
    if (typeof window === 'undefined') {
      // Server-side only
      EnvironmentValidator.logValidation();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): APIConfigManager {
    if (!APIConfigManager.instance) {
      APIConfigManager.instance = new APIConfigManager();
    }
    return APIConfigManager.instance;
  }

  /**
   * Initialize API configuration from environment variables
   */
  private initializeConfig(): APIConfiguration {
    const jupiterApiUrl = process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://quote-api.jup.ag';
    const pythHermesUrl = process.env.PYTH_HERMES_ENDPOINT || 'https://hermes.pyth.network';

    return {
      jupiter: {
        quote: [
          {
            url: `${jupiterApiUrl}/v6`,
            name: 'Jupiter Quote API v6',
            healthy: true,
            lastChecked: 0,
          },
        ],
        price: [
          {
            url: 'https://price.jup.ag/v6',
            name: 'Jupiter Price API v6',
            healthy: true,
            lastChecked: 0,
          },
          {
            url: 'https://price.jup.ag/v4',
            name: 'Jupiter Price API v4 (fallback)',
            healthy: true,
            lastChecked: 0,
          },
        ],
        tokens: [
          {
            url: 'https://token.jup.ag/all',
            name: 'Jupiter Token List',
            healthy: true,
            lastChecked: 0,
          },
        ],
        worker: [
          {
            url: 'https://worker.jup.ag',
            name: 'Jupiter Worker API',
            healthy: true,
            lastChecked: 0,
          },
        ],
      },
      pyth: {
        hermes: [
          {
            url: pythHermesUrl,
            name: 'Pyth Hermes',
            healthy: true,
            lastChecked: 0,
          },
        ],
      },
      jito: {
        api: [
          {
            url: 'https://kek.jito.network/api/v1',
            name: 'Jito API v1',
            healthy: true,
            lastChecked: 0,
          },
        ],
      },
      solana: {
        explorer: 'https://solscan.io',
      },
      vercel: {
        deployUrl: EnvironmentDetector.getVercelUrl(),
      },
    };
  }

  /**
   * Get full configuration
   */
  getConfig(): APIConfiguration {
    return this.config;
  }

  /**
   * Get Jupiter Quote API URL
   */
  getJupiterQuoteUrl(): string {
    return this.getHealthyEndpoint(this.config.jupiter.quote);
  }

  /**
   * Get Jupiter Price API URL
   */
  getJupiterPriceUrl(): string {
    return this.getHealthyEndpoint(this.config.jupiter.price);
  }

  /**
   * Get Jupiter Token List URL
   */
  getJupiterTokensUrl(): string {
    return this.getHealthyEndpoint(this.config.jupiter.tokens);
  }

  /**
   * Get Jupiter Worker API URL
   */
  getJupiterWorkerUrl(): string {
    return this.getHealthyEndpoint(this.config.jupiter.worker);
  }

  /**
   * Get Pyth Hermes URL
   */
  getPythHermesUrl(): string {
    return this.getHealthyEndpoint(this.config.pyth.hermes);
  }

  /**
   * Get Jito API URL
   */
  getJitoApiUrl(): string {
    return this.getHealthyEndpoint(this.config.jito.api);
  }

  /**
   * Get Solana Explorer URL
   */
  getSolanaExplorerUrl(): string {
    return this.config.solana.explorer;
  }

  /**
   * Get first healthy endpoint from a list
   */
  private getHealthyEndpoint(endpoints: APIEndpoint[]): string {
    const healthy = endpoints.find(e => e.healthy);
    return healthy?.url || endpoints[0].url;
  }

  /**
   * Check health of a specific endpoint
   */
  async checkEndpointHealth(endpoint: APIEndpoint): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      endpoint.healthy = response.ok || response.status === 404; // 404 is OK for some endpoints
      endpoint.lastChecked = Date.now();

      return endpoint.healthy;
    } catch (error) {
      endpoint.healthy = false;
      endpoint.lastChecked = Date.now();
      console.warn(`Health check failed for ${endpoint.name}:`, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Check health of all endpoints
   */
  async checkAllEndpointsHealth(): Promise<void> {
    const allEndpoints = [
      ...this.config.jupiter.quote,
      ...this.config.jupiter.price,
      ...this.config.jupiter.tokens,
      ...this.config.jupiter.worker,
      ...this.config.pyth.hermes,
      ...this.config.jito.api,
    ];

    await Promise.all(
      allEndpoints.map(endpoint => this.checkEndpointHealth(endpoint))
    );
  }

  /**
   * Get health status of all endpoints
   */
  getHealthStatus(): {
    endpoint: string;
    name: string;
    healthy: boolean;
    lastChecked: number;
  }[] {
    const allEndpoints = [
      ...this.config.jupiter.quote,
      ...this.config.jupiter.price,
      ...this.config.jupiter.tokens,
      ...this.config.jupiter.worker,
      ...this.config.pyth.hermes,
      ...this.config.jito.api,
    ];

    return allEndpoints.map(e => ({
      endpoint: e.url,
      name: e.name,
      healthy: e.healthy,
      lastChecked: e.lastChecked,
    }));
  }

  /**
   * Mark an endpoint as unhealthy and switch to fallback
   */
  markEndpointUnhealthy(url: string): void {
    const allEndpoints = [
      ...this.config.jupiter.quote,
      ...this.config.jupiter.price,
      ...this.config.jupiter.tokens,
      ...this.config.jupiter.worker,
      ...this.config.pyth.hermes,
      ...this.config.jito.api,
    ];

    const endpoint = allEndpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.healthy = false;
      endpoint.lastChecked = Date.now();
      console.warn(`Marked endpoint as unhealthy: ${endpoint.name} (${url})`);
    }
  }
}

/**
 * Convenience function to get API config instance
 */
export function getAPIConfig(): APIConfigManager {
  return APIConfigManager.getInstance();
}

/**
 * Convenience functions for quick access to common endpoints
 */
export const API = {
  /**
   * Get Jupiter Quote API URL
   */
  jupiterQuote: () => getAPIConfig().getJupiterQuoteUrl(),

  /**
   * Get Jupiter Price API URL
   */
  jupiterPrice: () => getAPIConfig().getJupiterPriceUrl(),

  /**
   * Get Jupiter Token List URL
   */
  jupiterTokens: () => getAPIConfig().getJupiterTokensUrl(),

  /**
   * Get Jupiter Worker API URL
   */
  jupiterWorker: () => getAPIConfig().getJupiterWorkerUrl(),

  /**
   * Get Pyth Hermes URL
   */
  pythHermes: () => getAPIConfig().getPythHermesUrl(),

  /**
   * Get Jito API URL
   */
  jitoApi: () => getAPIConfig().getJitoApiUrl(),

  /**
   * Get Solana Explorer URL
   */
  solanaExplorer: () => getAPIConfig().getSolanaExplorerUrl(),

  /**
   * Get environment info
   */
  environment: {
    current: () => EnvironmentDetector.getEnvironment(),
    isProduction: () => EnvironmentDetector.isProduction(),
    isDevelopment: () => EnvironmentDetector.isDevelopment(),
    isVercel: () => EnvironmentDetector.isVercel(),
  },
};

// Export types
export type { APIEndpoint, APIConfiguration };
