/**
 * Endpoint Validation Script
 * Tests all API endpoints for proper response and error handling
 */

import https from 'https';
import http from 'http';

interface EndpointTest {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiresAuth?: boolean;
  expectedStatus?: number[];
  body?: any;
}

const endpoints: EndpointTest[] = [
  {
    path: '/api/health',
    method: 'GET',
    expectedStatus: [200, 503],
  },
  {
    path: '/api/monitor',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: [200, 401, 500],
  },
  {
    path: '/api/execute',
    method: 'POST',
    requiresAuth: true,
    expectedStatus: [200, 401, 500],
  },
  {
    path: '/api/admin/auth',
    method: 'POST',
    expectedStatus: [200, 400, 401],
    body: {
      username: 'test',
      password: 'test',
    },
  },
  {
    path: '/api/admin/metrics',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: [200, 401],
  },
  {
    path: '/api/admin/control',
    method: 'POST',
    requiresAuth: true,
    expectedStatus: [200, 401, 400],
    body: {
      command: 'get-status',
    },
  },
];

interface TestResult {
  path: string;
  method: string;
  status: number;
  passed: boolean;
  error?: string;
  responseTime: number;
}

async function testEndpoint(
  baseUrl: string,
  test: EndpointTest,
  authToken?: string
): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(test.path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && test.requiresAuth
          ? { Authorization: `Bearer ${authToken}` }
          : {}),
      },
    };

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const status = res.statusCode || 0;
        const expectedStatuses = test.expectedStatus || [200];
        const passed = expectedStatuses.includes(status);

        resolve({
          path: test.path,
          method: test.method,
          status,
          passed,
          responseTime,
          error: !passed ? `Expected ${expectedStatuses.join(' or ')}, got ${status}` : undefined,
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        path: test.path,
        method: test.method,
        status: 0,
        passed: false,
        error: error.message,
        responseTime,
      });
    });

    if (test.body) {
      req.write(JSON.stringify(test.body));
    }

    req.end();
  });
}

async function validateAllEndpoints(baseUrl: string): Promise<void> {
  console.log('🔍 Validating API Endpoints');
  console.log(`📍 Base URL: ${baseUrl}\n`);

  const results: TestResult[] = [];

  for (const test of endpoints) {
    console.log(`Testing ${test.method} ${test.path}...`);
    const result = await testEndpoint(baseUrl, test);
    results.push(result);

    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(
      `  ${icon} ${status} - HTTP ${result.status} (${result.responseTime}ms)`
    );
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    console.log();
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0);
  const avgTime = totalTime / results.length;

  console.log('═══════════════════════════════════════');
  console.log('📊 Validation Summary');
  console.log('═══════════════════════════════════════');
  console.log(`Total Tests:    ${results.length}`);
  console.log(`Passed:         ${passed} ✅`);
  console.log(`Failed:         ${failed} ${failed > 0 ? '❌' : '✅'}`);
  console.log(`Success Rate:   ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`Avg Response:   ${avgTime.toFixed(0)}ms`);
  console.log('═══════════════════════════════════════\n');

  if (failed > 0) {
    console.log('❌ Some tests failed. Review the errors above.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Main execution
const baseUrl = process.argv[2] || 'http://localhost:3000';

console.log('Starting endpoint validation...\n');
validateAllEndpoints(baseUrl).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
