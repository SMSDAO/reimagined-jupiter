/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses across all API endpoints
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ApiError {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: number;
  requestId?: string;
}

export class ApplicationError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Standard error response format
 */
export function createErrorResponse(
  error: Error | ApplicationError | string,
  req?: VercelRequest
): ApiError {
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof ApplicationError) {
    message = error.message;
    code = error.code || 'APPLICATION_ERROR';
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
    code = 'ERROR';
  }

  // Generate request ID from headers or create new one
  const requestId = req?.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: false,
    error: code,
    message,
    code,
    details,
    timestamp: Date.now(),
    requestId,
  };
}

/**
 * Error handler wrapper for API endpoints
 */
export function withErrorHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<any>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('❌ Unhandled error in API endpoint:', error);
      
      const errorResponse = createErrorResponse(error as Error, req);
      
      let statusCode = 500;
      if (error instanceof ApplicationError) {
        statusCode = error.statusCode;
      }

      // Log error details for debugging
      console.error('Error details:', {
        statusCode,
        code: errorResponse.code,
        message: errorResponse.message,
        requestId: errorResponse.requestId,
        path: req.url,
        method: req.method,
      });

      return res.status(statusCode).json(errorResponse);
    }
  };
}

/**
 * Common error types
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Rate limit exceeded', resetIn?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { resetIn });
    this.name = 'RateLimitError';
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string, missingConfig?: string[]) {
    super(message, 500, 'CONFIGURATION_ERROR', { missingConfig });
    this.name = 'ConfigurationError';
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, details?: any) {
    super(`${service}: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Check required environment variables
 */
export function checkRequiredEnv(vars: string[]): void {
  const missing: string[] = [];
  
  for (const varName of vars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missing.join(', ')}`,
      missing
    );
  }
}

/**
 * Async error wrapper for promises
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (errorMessage) {
      console.error(errorMessage, error);
    }
    throw error;
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Log error with context
 */
export function logError(error: Error | string, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' && 'stack' in error ? error.stack : undefined;

  console.error(`[${timestamp}] ERROR:`, errorMessage);
  
  if (context) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }
  
  if (errorStack) {
    console.error('Stack:', errorStack);
  }
}
