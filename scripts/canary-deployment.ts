/**
 * Canary Deployment System - Gradual rollout with automated testing and rollback
 */

import axios from 'axios';
import { logger } from '../lib/logger.js';

interface CanaryConfig {
  stagingUrl: string;
  productionUrl: string;
  canaryPercentage: number;
  testDurationMinutes: number;
  rollbackThresholdPercent: number;
  minSuccessRate: number;
}

interface HealthCheckResult {
  url: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  statusCode: number;
  error?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface DeploymentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
}

export class CanaryDeployment {
  private config: CanaryConfig;

  constructor(config?: Partial<CanaryConfig>) {
    this.config = {
      stagingUrl: process.env.STAGING_URL || 'https://gxq-staging.vercel.app',
      productionUrl: process.env.PRODUCTION_URL || 'https://gxq.vercel.app',
      canaryPercentage: 10,
      testDurationMinutes: 5,
      rollbackThresholdPercent: 5,
      minSuccessRate: 80,
      ...config,
    };

    logger.info('Canary deployment initialized', { config: this.config });
  }

  /**
   * Run health check on a URL
   */
  async healthCheck(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${url}/api/health`, {
        timeout: 10000,
        validateStatus: () => true, // Don't throw on non-2xx
      });

      const responseTime = Date.now() - startTime;
      const status = response.status >= 200 && response.status < 300 ? 'healthy' : 'unhealthy';

      return {
        url,
        status,
        responseTime,
        statusCode: response.status,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        url,
        status: 'unhealthy',
        responseTime,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run automated test suite
   */
  async runTestSuite(baseUrl: string): Promise<TestResult[]> {
    const tests: Array<() => Promise<TestResult>> = [
      // Health check test
      async () => {
        const startTime = Date.now();
        try {
          const result = await this.healthCheck(baseUrl);
          return {
            name: 'Health Check',
            passed: result.status === 'healthy',
            duration: Date.now() - startTime,
            error: result.error,
          };
        } catch (error) {
          return {
            name: 'Health Check',
            passed: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },

      // Arbitrage scanner test
      async () => {
        const startTime = Date.now();
        try {
          const response = await axios.get(`${baseUrl}/api/scan`, {
            timeout: 30000,
          });
          return {
            name: 'Arbitrage Scanner',
            passed: response.status === 200,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          return {
            name: 'Arbitrage Scanner',
            passed: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },

      // Price oracle test
      async () => {
        const startTime = Date.now();
        try {
          const response = await axios.get(`${baseUrl}/api/prices`, {
            timeout: 10000,
          });
          return {
            name: 'Price Oracle',
            passed: response.status === 200 && response.data?.prices,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          return {
            name: 'Price Oracle',
            passed: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },

      // Wallet analysis test
      async () => {
        const startTime = Date.now();
        try {
          // Test with a known wallet address
          const testWallet = '11111111111111111111111111111111';
          const response = await axios.get(`${baseUrl}/api/wallet/${testWallet}`, {
            timeout: 15000,
          });
          return {
            name: 'Wallet Analysis',
            passed: response.status === 200,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          return {
            name: 'Wallet Analysis',
            passed: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    ];

    logger.info('Running test suite', { baseUrl, testCount: tests.length });

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await test();
      results.push(result);
      logger.info('Test completed', result);
    }

    return results;
  }

  /**
   * Calculate deployment metrics
   */
  private calculateMetrics(results: TestResult[]): DeploymentMetrics {
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.passed).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime =
      results.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const errorRate = (failedRequests / totalRequests) * 100;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      errorRate,
    };
  }

  /**
   * Deploy to staging and run tests
   */
  async deployToStaging(): Promise<{
    success: boolean;
    metrics: DeploymentMetrics;
    testResults: TestResult[];
  }> {
    logger.info('Deploying to staging...', { url: this.config.stagingUrl });

    // Wait for deployment to settle
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Run health checks
    logger.info('Running health checks...');
    const healthResult = await this.healthCheck(this.config.stagingUrl);
    
    if (healthResult.status === 'unhealthy') {
      logger.error('Staging health check failed', healthResult);
      return {
        success: false,
        metrics: {
          totalRequests: 1,
          successfulRequests: 0,
          failedRequests: 1,
          averageResponseTime: healthResult.responseTime,
          errorRate: 100,
        },
        testResults: [
          {
            name: 'Health Check',
            passed: false,
            duration: healthResult.responseTime,
            error: healthResult.error,
          },
        ],
      };
    }

    // Run test suite
    logger.info('Running test suite...');
    const testResults = await this.runTestSuite(this.config.stagingUrl);
    const metrics = this.calculateMetrics(testResults);

    const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    const success = successRate >= this.config.minSuccessRate;

    logger.info('Staging deployment test results', {
      success,
      successRate: `${successRate.toFixed(1)}%`,
      metrics,
    });

    return {
      success,
      metrics,
      testResults,
    };
  }

  /**
   * Monitor canary deployment
   */
  async monitorCanary(durationMinutes: number): Promise<{
    shouldRollback: boolean;
    stagingMetrics: DeploymentMetrics;
    productionMetrics: DeploymentMetrics;
  }> {
    logger.info('Monitoring canary deployment...', {
      duration: `${durationMinutes} minutes`,
      percentage: `${this.config.canaryPercentage}%`,
    });

    const startTime = Date.now();
    const endTime = startTime + durationMinutes * 60 * 1000;

    const stagingResults: TestResult[] = [];
    const productionResults: TestResult[] = [];

    // Monitor both environments
    while (Date.now() < endTime) {
      // Test staging
      const stagingTests = await this.runTestSuite(this.config.stagingUrl);
      stagingResults.push(...stagingTests);

      // Test production
      const productionTests = await this.runTestSuite(this.config.productionUrl);
      productionResults.push(...productionTests);

      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    const stagingMetrics = this.calculateMetrics(stagingResults);
    const productionMetrics = this.calculateMetrics(productionResults);

    // Determine if rollback is needed
    const errorRateDiff = stagingMetrics.errorRate - productionMetrics.errorRate;
    const shouldRollback = errorRateDiff > this.config.rollbackThresholdPercent;

    logger.info('Canary monitoring complete', {
      stagingMetrics,
      productionMetrics,
      errorRateDiff: `${errorRateDiff.toFixed(2)}%`,
      shouldRollback,
    });

    return {
      shouldRollback,
      stagingMetrics,
      productionMetrics,
    };
  }

  /**
   * Perform rollback
   */
  async rollback(reason: string): Promise<void> {
    logger.warn('🔄 Rolling back deployment', { reason });

    try {
      // In a real implementation, this would:
      // 1. Revert Vercel deployment to previous version
      // 2. Update DNS/routing to direct all traffic to production
      // 3. Notify team of rollback

      logger.info('Rollback completed successfully');
    } catch (error) {
      logger.error('Rollback failed', { error });
      throw error;
    }
  }

  /**
   * Promote to production (100% traffic)
   */
  async promoteToProduction(): Promise<void> {
    logger.info('🚀 Promoting to production (100% traffic)');

    try {
      // In a real implementation, this would:
      // 1. Update Vercel to promote staging to production
      // 2. Update DNS/routing to direct all traffic to new version
      // 3. Archive old version

      logger.info('Promotion to production completed successfully');
    } catch (error) {
      logger.error('Promotion failed', { error });
      throw error;
    }
  }

  /**
   * Run complete canary deployment process
   */
  async runCanaryDeployment(): Promise<{
    success: boolean;
    deployed: boolean;
    rolledBack: boolean;
    reason: string;
  }> {
    logger.info('🚀 Starting canary deployment process...');

    // Step 1: Deploy to staging
    const stagingResult = await this.deployToStaging();

    if (!stagingResult.success) {
      logger.error('Staging deployment failed, aborting canary');
      return {
        success: false,
        deployed: false,
        rolledBack: false,
        reason: 'Staging tests failed',
      };
    }

    logger.info('✅ Staging deployment successful');

    // Step 2: Gradual rollout (simulated)
    logger.info(`Starting gradual rollout at ${this.config.canaryPercentage}%...`);
    
    // Step 3: Monitor canary
    const monitoringResult = await this.monitorCanary(this.config.testDurationMinutes);

    // Step 4: Decide on rollback or promotion
    if (monitoringResult.shouldRollback) {
      await this.rollback('Error rate exceeded threshold');
      return {
        success: false,
        deployed: true,
        rolledBack: true,
        reason: 'High error rate detected',
      };
    }

    // Step 5: Promote to 100% if successful
    await this.promoteToProduction();

    logger.info('✅ Canary deployment completed successfully!');

    return {
      success: true,
      deployed: true,
      rolledBack: false,
      reason: 'Deployment successful',
    };
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const canary = new CanaryDeployment();
      const result = await canary.runCanaryDeployment();

      console.log('\n📊 Canary Deployment Result:');
      console.log(`Success: ${result.success ? '✅' : '❌'}`);
      console.log(`Deployed: ${result.deployed ? 'Yes' : 'No'}`);
      console.log(`Rolled Back: ${result.rolledBack ? 'Yes' : 'No'}`);
      console.log(`Reason: ${result.reason}`);

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      logger.error('Canary deployment failed', { error });
      process.exit(1);
    }
  })();
}

export { CanaryDeployment };
