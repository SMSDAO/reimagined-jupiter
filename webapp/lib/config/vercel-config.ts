/**
 * Vercel-Specific Configuration
 * 
 * Handles Vercel deployment configurations, edge runtime compatibility,
 * and platform-specific optimizations.
 */

import { EnvironmentDetector } from './api-config';

export interface VercelConfig {
  isVercel: boolean;
  region?: string;
  deploymentUrl?: string;
  env: 'production' | 'preview' | 'development';
  gitBranch?: string;
  gitCommitSha?: string;
  gitCommitRef?: string;
}

/**
 * Vercel Configuration Manager
 */
export class VercelConfigManager {
  private static instance: VercelConfigManager;
  private config: VercelConfig;

  private constructor() {
    this.config = this.initializeVercelConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): VercelConfigManager {
    if (!VercelConfigManager.instance) {
      VercelConfigManager.instance = new VercelConfigManager();
    }
    return VercelConfigManager.instance;
  }

  /**
   * Initialize Vercel configuration from environment
   */
  private initializeVercelConfig(): VercelConfig {
    const isVercel = Boolean(process.env.VERCEL);
    const vercelEnv = process.env.VERCEL_ENV as 'production' | 'preview' | 'development' || 'development';

    return {
      isVercel,
      region: process.env.VERCEL_REGION,
      deploymentUrl: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL,
      env: vercelEnv,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    };
  }

  /**
   * Get Vercel configuration
   */
  getConfig(): VercelConfig {
    return { ...this.config };
  }

  /**
   * Check if running on Vercel
   */
  isVercel(): boolean {
    return this.config.isVercel;
  }

  /**
   * Check if running on Vercel production
   */
  isVercelProduction(): boolean {
    return this.config.isVercel && this.config.env === 'production';
  }

  /**
   * Check if running on Vercel preview
   */
  isVercelPreview(): boolean {
    return this.config.isVercel && this.config.env === 'preview';
  }

  /**
   * Get deployment URL with protocol
   */
  getDeploymentUrl(): string | undefined {
    if (this.config.deploymentUrl) {
      // Add protocol if not present
      if (!this.config.deploymentUrl.startsWith('http')) {
        return `https://${this.config.deploymentUrl}`;
      }
      return this.config.deploymentUrl;
    }
    return undefined;
  }

  /**
   * Get environment-specific optimizations
   */
  getOptimizations(): {
    cacheControl: string;
    revalidate: number | false;
    edgeRuntime: boolean;
  } {
    if (this.isVercelProduction()) {
      return {
        cacheControl: 'public, s-maxage=300, stale-while-revalidate=600',
        revalidate: 300, // 5 minutes
        edgeRuntime: true,
      };
    } else if (this.isVercelPreview()) {
      return {
        cacheControl: 'public, s-maxage=60, stale-while-revalidate=120',
        revalidate: 60, // 1 minute
        edgeRuntime: true,
      };
    } else {
      return {
        cacheControl: 'no-store, must-revalidate',
        revalidate: false,
        edgeRuntime: false,
      };
    }
  }

  /**
   * Log Vercel configuration (server-side only)
   */
  logConfiguration(): void {
    if (typeof window !== 'undefined') {
      return; // Client-side, skip
    }

    console.log('=== Vercel Configuration ===');
    console.log(`Running on Vercel: ${this.config.isVercel}`);
    
    if (this.config.isVercel) {
      console.log(`Environment: ${this.config.env}`);
      console.log(`Region: ${this.config.region || 'N/A'}`);
      console.log(`Deployment URL: ${this.getDeploymentUrl() || 'N/A'}`);
      console.log(`Git Branch: ${this.config.gitBranch || 'N/A'}`);
      console.log(`Git Commit: ${this.config.gitCommitSha?.substring(0, 7) || 'N/A'}`);
      
      const optimizations = this.getOptimizations();
      console.log(`Edge Runtime: ${optimizations.edgeRuntime ? 'Enabled' : 'Disabled'}`);
      console.log(`Revalidation: ${optimizations.revalidate !== false ? `${optimizations.revalidate}s` : 'Disabled'}`);
    }
    
    console.log('===========================');
  }
}

/**
 * Edge Runtime Compatibility Checker
 */
export class EdgeRuntimeChecker {
  /**
   * Check if code is running in Edge Runtime
   */
  static isEdgeRuntime(): boolean {
    // Check for Edge Runtime-specific globals
    return typeof EdgeRuntime !== 'undefined';
  }

  /**
   * Check if a feature is available in Edge Runtime
   */
  static isFeatureAvailable(feature: 'crypto' | 'fs' | 'buffer' | 'stream'): boolean {
    if (!this.isEdgeRuntime()) {
      return true; // All features available in Node.js runtime
    }

    // Edge Runtime limitations
    switch (feature) {
      case 'crypto':
        return typeof crypto !== 'undefined';
      case 'fs':
        return false; // File system not available in Edge
      case 'buffer':
        return typeof Buffer !== 'undefined';
      case 'stream':
        return false; // Node.js streams not available in Edge
      default:
        return false;
    }
  }

  /**
   * Get runtime information
   */
  static getRuntimeInfo(): {
    type: 'edge' | 'nodejs';
    features: Record<string, boolean>;
  } {
    const isEdge = this.isEdgeRuntime();
    
    return {
      type: isEdge ? 'edge' : 'nodejs',
      features: {
        crypto: this.isFeatureAvailable('crypto'),
        fs: this.isFeatureAvailable('fs'),
        buffer: this.isFeatureAvailable('buffer'),
        stream: this.isFeatureAvailable('stream'),
      },
    };
  }
}

/**
 * Production Readiness Checker
 */
export class ProductionReadinessChecker {
  /**
   * Check if application is ready for production
   */
  static checkReadiness(): {
    ready: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check critical environment variables
    if (!process.env.NEXT_PUBLIC_RPC_URL) {
      issues.push('NEXT_PUBLIC_RPC_URL is not set');
    }

    // Check for premium RPC in production
    if (EnvironmentDetector.isProduction()) {
      if (!process.env.NEXT_PUBLIC_HELIUS_RPC && !process.env.NEXT_PUBLIC_QUICKNODE_RPC) {
        warnings.push('Consider using premium RPC endpoints (Helius or QuickNode) for production');
      }
    }

    // Check Vercel configuration
    const vercelConfig = VercelConfigManager.getInstance();
    if (vercelConfig.isVercel() && !vercelConfig.getDeploymentUrl()) {
      warnings.push('Vercel deployment URL not detected');
    }

    return {
      ready: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Log readiness check results
   */
  static logReadiness(): void {
    if (typeof window !== 'undefined') {
      return; // Client-side, skip
    }

    const result = this.checkReadiness();
    
    console.log('=== Production Readiness Check ===');
    
    if (result.ready) {
      console.log('✅ Application is ready for production');
    } else {
      console.error('❌ Application has production issues:');
      result.issues.forEach(issue => console.error(`  - ${issue}`));
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️  Production warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    console.log('===================================');
  }
}

/**
 * Convenience function to get Vercel config
 */
export function getVercelConfig(): VercelConfigManager {
  return VercelConfigManager.getInstance();
}

/**
 * Initialize Vercel configuration (call on app start)
 */
export function initializeVercelConfig(): void {
  if (typeof window === 'undefined') {
    // Server-side only
    const vercelConfig = getVercelConfig();
    vercelConfig.logConfiguration();
    
    ProductionReadinessChecker.logReadiness();
  }
}
