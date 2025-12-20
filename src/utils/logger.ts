/**
 * Centralized Logging Utility
 * Provides structured logging with Winston for better traceability
 * Includes request IDs, timestamps, and context information
 */

import winston from 'winston';
import path from 'path';

// Determine log directory (use environment variable or default to logs/)
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

// Define log colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  verbose: 'cyan',
};

winston.addColors(logColors);

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.printf(({ level, message, timestamp, metadata }) => {
    const meta = metadata as Record<string, unknown>;
    const requestId = meta.requestId ? `[${meta.requestId}]` : '';
    const context = meta.context ? `[${meta.context}]` : '';
    const metaStr = Object.keys(meta).length > 0 && !meta.requestId && !meta.context
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    
    return `${timestamp} ${level.toUpperCase()} ${context}${requestId}: ${message}${metaStr}`;
  })
);

// Create the Winston logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
  // Don't exit on error
  exitOnError: false,
});

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Logger class with context support
 */
export class Logger {
  private context?: string;
  private requestId?: string;

  constructor(context?: string, requestId?: string) {
    this.context = context;
    this.requestId = requestId;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, requestId?: string): Logger {
    return new Logger(
      context,
      requestId || this.requestId
    );
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    logger.error(message, {
      context: this.context,
      requestId: this.requestId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...meta,
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    logger.warn(message, {
      context: this.context,
      requestId: this.requestId,
      ...meta,
    });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    logger.info(message, {
      context: this.context,
      requestId: this.requestId,
      ...meta,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    logger.debug(message, {
      context: this.context,
      requestId: this.requestId,
      ...meta,
    });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, meta?: Record<string, any>): void {
    logger.verbose(message, {
      context: this.context,
      requestId: this.requestId,
      ...meta,
    });
  }

  /**
   * Log RPC error with details
   */
  rpcError(operation: string, error: Error | unknown, meta?: Record<string, any>): void {
    this.error(`RPC Error during ${operation}`, error, {
      category: 'RPC',
      operation,
      ...meta,
    });
  }

  /**
   * Log transaction failure with details
   */
  transactionError(signature: string, error: Error | unknown, meta?: Record<string, any>): void {
    this.error(`Transaction failed`, error, {
      category: 'Transaction',
      signature,
      ...meta,
    });
  }

  /**
   * Log authentication event
   */
  authEvent(event: string, success: boolean, meta?: Record<string, any>): void {
    const level = success ? 'info' : 'warn';
    logger[level](`Authentication: ${event}`, {
      context: this.context,
      requestId: this.requestId,
      category: 'Auth',
      success,
      ...meta,
    });
  }

  /**
   * Log arbitrage opportunity
   */
  opportunity(profit: number, route: string[], meta?: Record<string, any>): void {
    this.info(`Arbitrage opportunity found`, {
      category: 'Arbitrage',
      profit,
      route,
      ...meta,
    });
  }

  /**
   * Log trade execution
   */
  trade(action: string, success: boolean, meta?: Record<string, any>): void {
    const level = success ? 'info' : 'error';
    logger[level](`Trade ${action}`, {
      context: this.context,
      requestId: this.requestId,
      category: 'Trade',
      success,
      ...meta,
    });
  }
}

// Export default logger instance
export const defaultLogger = new Logger('App');

// Export the base winston logger for advanced usage
export { logger as winstonLogger };
