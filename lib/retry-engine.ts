/**
 * Smart retry engine with exponential backoff
 * Handles transaction retries with intelligent backoff strategies
 */

import { logger } from './logger.js';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0 to 1, adds randomness to prevent thundering herd
  retryableErrors: string[]; // Error patterns that should trigger retry
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableErrors: [
    'timeout',
    'network',
    'connection',
    'ECONNRESET',
    'ETIMEDOUT',
    'blockhash not found',
    'node is behind',
  ],
};

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    try {
      logger.debug('Executing function', { attempt, maxRetries: cfg.maxRetries });
      
      const result = await fn();
      
      const totalTimeMs = Date.now() - startTime;
      logger.info('Function succeeded', { attempt, totalTimeMs });
      
      return {
        success: true,
        result,
        attempts: attempt,
        totalTimeMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn('Function failed', {
        attempt,
        error: lastError.message,
        willRetry: attempt < cfg.maxRetries && isRetryableError(lastError, cfg),
      });
      
      // Check if error is retryable
      if (!isRetryableError(lastError, cfg)) {
        logger.error('Non-retryable error encountered', {
          error: lastError.message,
          attempt,
        });
        break;
      }
      
      // Don't sleep after last attempt
      if (attempt < cfg.maxRetries) {
        const delay = calculateBackoff(attempt, cfg);
        logger.debug('Waiting before retry', { delay, attempt });
        await sleep(delay);
      }
    }
  }
  
  const totalTimeMs = Date.now() - startTime;
  
  logger.error('All retry attempts exhausted', {
    maxRetries: cfg.maxRetries,
    totalTimeMs,
    finalError: lastError?.message,
  });
  
  return {
    success: false,
    error: lastError,
    attempts: cfg.maxRetries,
    totalTimeMs,
  };
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, config: RetryConfig): boolean {
  const errorMessage = error.message.toLowerCase();
  
  return config.retryableErrors.some(pattern =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  // Calculate exponential backoff
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * (Math.random() - 0.5);
  const finalDelay = Math.max(0, cappedDelay + jitter);
  
  return Math.floor(finalDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryConfig: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
  );
  
  try {
    const result = await Promise.race([
      withRetry(fn, retryConfig),
      timeoutPromise,
    ]);
    
    return result as RetryResult<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: 0,
      totalTimeMs: timeoutMs,
    };
  }
}

/**
 * Retry transaction confirmation
 */
export async function retryConfirmation(
  checkFn: () => Promise<boolean>,
  maxWaitMs: number = 30000,
  pollIntervalMs: number = 1000
): Promise<{ confirmed: boolean; waitTimeMs: number }> {
  const startTime = Date.now();
  const maxAttempts = Math.ceil(maxWaitMs / pollIntervalMs);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const confirmed = await checkFn();
    
    if (confirmed) {
      const waitTimeMs = Date.now() - startTime;
      logger.info('Confirmation successful', { attempt, waitTimeMs });
      return { confirmed: true, waitTimeMs };
    }
    
    const elapsed = Date.now() - startTime;
    if (elapsed >= maxWaitMs) {
      break;
    }
    
    await sleep(Math.min(pollIntervalMs, maxWaitMs - elapsed));
  }
  
  const waitTimeMs = Date.now() - startTime;
  logger.warn('Confirmation timeout', { waitTimeMs });
  
  return { confirmed: false, waitTimeMs };
}

/**
 * Create a retryable function wrapper
 */
export function createRetryableFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config: Partial<RetryConfig> = {}
): (...args: T) => Promise<RetryResult<R>> {
  return async (...args: T) => {
    return withRetry(() => fn(...args), config);
  };
}
