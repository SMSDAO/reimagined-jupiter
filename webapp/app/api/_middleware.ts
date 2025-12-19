/**
 * API Middleware for Vercel Serverless Functions
 * 
 * Provides request timeout handling and performance monitoring to ensure
 * compliance with Vercel's 10-second timeout limit for Hobby tier
 * and 60-second limit for Pro tier.
 * 
 * Features:
 * - Request timeout with AbortController
 * - Performance monitoring
 * - Automatic timeout responses
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server';

// Configuration
const REQUEST_TIMEOUT_MS = 8000; // 8 seconds (safe margin under 10s Vercel limit)
const PERFORMANCE_LOG_THRESHOLD_MS = 1000; // Log requests taking more than 1s

export interface MiddlewareConfig {
  timeoutMs?: number;
  logSlowRequests?: boolean;
  enablePerformanceHeaders?: boolean;
}

/**
 * Middleware to handle request timeouts
 */
export async function withTimeout(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
): Promise<NextResponse> {
  const startTime = Date.now();
  const timeoutMs = config.timeoutMs || REQUEST_TIMEOUT_MS;
  const logSlowRequests = config.logSlowRequests !== false;
  const enablePerformanceHeaders = config.enablePerformanceHeaders !== false;

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    // Execute handler with timeout
    const response = await Promise.race([
      handler(request),
      new Promise<NextResponse>((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout'));
        });
      }),
    ]);

    // Clear timeout
    clearTimeout(timeoutId);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log slow requests
    if (logSlowRequests && duration > PERFORMANCE_LOG_THRESHOLD_MS) {
      console.warn(`⚠️  Slow request: ${request.url} took ${duration}ms`);
    }

    // Add performance headers if enabled
    if (enablePerformanceHeaders) {
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Request-Id', crypto.randomUUID());
    }

    return response;
  } catch (error) {
    // Clear timeout
    clearTimeout(timeoutId);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Handle timeout error
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error(`❌ Request timeout after ${duration}ms: ${request.url}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Request timeout',
          message: `Request exceeded ${timeoutMs}ms timeout limit`,
          timestamp: Date.now(),
        },
        {
          status: 504,
          headers: {
            'X-Response-Time': `${duration}ms`,
            'X-Request-Id': crypto.randomUUID(),
          },
        }
      );
    }

    // Handle other errors
    console.error(`❌ Request error after ${duration}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${duration}ms`,
          'X-Request-Id': crypto.randomUUID(),
        },
      }
    );
  }
}

/**
 * Create a timeout wrapper for API routes
 */
export function createTimeoutWrapper(config: MiddlewareConfig = {}) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      return await withTimeout(request, handler, config);
    };
  };
}

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const url = request.url;
    const method = request.method;

    console.log(`📥 ${method} ${url}`);

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      console.log(`📤 ${method} ${url} - ${response.status} (${duration}ms)`);

      // Add performance header
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${method} ${url} - Error (${duration}ms)`, error);
      throw error;
    }
  };
}

/**
 * Rate limiting decorator (simple in-memory implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS
): (req: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // Get client IP or identifier
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const now = Date.now();
    const clientData = requestCounts.get(clientId);

    // Reset if window expired
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });
      return handler(request);
    }

    // Check rate limit
    if (clientData.count >= maxRequests) {
      const remainingTime = Math.ceil((clientData.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${remainingTime} seconds.`,
          timestamp: Date.now(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': remainingTime.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': clientData.resetTime.toString(),
          },
        }
      );
    }

    // Increment count
    clientData.count++;
    return handler(request);
  };
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(
  ...middlewares: Array<(handler: (req: NextRequest) => Promise<NextResponse>) => (req: NextRequest) => Promise<NextResponse>>
) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { withTimeout, withPerformanceMonitoring, withRateLimit, composeMiddleware } from './_middleware';
 * 
 * // Single middleware
 * export const GET = withTimeout(async (request: NextRequest) => {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * });
 * 
 * // Multiple middleware
 * const middleware = composeMiddleware(
 *   withTimeout,
 *   withPerformanceMonitoring,
 *   withRateLimit
 * );
 * 
 * export const GET = middleware(async (request: NextRequest) => {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
