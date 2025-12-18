/**
 * Structured logging utility
 * Provides JSON formatted logs with different levels and specialized loggers
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

interface TradeLogMetadata {
  tokenPair: string;
  profit: number;
  route: string[];
  signature?: string;
  gasUsed?: number;
  slippage?: number;
  executionTime?: number;
}

interface OpportunityLogMetadata {
  opportunityId: string;
  type: string;
  estimatedProfit: number;
  confidence: number;
  dexPath: string[];
}

interface PerformanceTimer {
  start: number;
  label: string;
}

// Active performance timers
const performanceTimers = new Map<string, PerformanceTimer>();

// Request ID for distributed tracing
let currentRequestId: string | undefined;

/**
 * Get current log level from environment
 */
function getLogLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return validLevels.includes(level as LogLevel) ? (level as LogLevel) : 'info';
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  
  const currentLevel = getLogLevel();
  return levels[level] >= levels[currentLevel];
}

/**
 * Format log entry as JSON
 */
function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Get color code for log level (for development)
 */
function getColorCode(level: LogLevel): string {
  const colors = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };
  return colors[level];
}

/**
 * Reset color code
 */
const RESET_COLOR = '\x1b[0m';

/**
 * Output log entry
 */
function output(entry: LogEntry): void {
  if (!shouldLog(entry.level)) {
    return;
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Color-coded console output in development
    const color = getColorCode(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    console.log(
      `${color}[${entry.level.toUpperCase()}]${RESET_COLOR} ${timestamp} - ${entry.message}${metadataStr}`
    );
  } else {
    // JSON formatted logs for production
    console.log(formatLog(entry));
  }
}

/**
 * Set request ID for distributed tracing
 */
export function setRequestId(requestId: string): void {
  currentRequestId = requestId;
}

/**
 * Clear request ID
 */
export function clearRequestId(): void {
  currentRequestId = undefined;
}

/**
 * Generate request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debug log
 */
export function debug(message: string, metadata?: Record<string, any>): void {
  output({
    timestamp: new Date().toISOString(),
    level: 'debug',
    message,
    metadata,
    requestId: currentRequestId,
  });
}

/**
 * Info log
 */
export function info(message: string, metadata?: Record<string, any>): void {
  output({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    metadata,
    requestId: currentRequestId,
  });
}

/**
 * Warning log
 */
export function warn(message: string, metadata?: Record<string, any>): void {
  output({
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    metadata,
    requestId: currentRequestId,
  });
}

/**
 * Error log
 */
export function error(message: string, metadata?: Record<string, any>): void {
  output({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    metadata,
    requestId: currentRequestId,
  });
}

/**
 * Trade execution log with specialized format
 */
export function trade(message: string, metadata: TradeLogMetadata): void {
  output({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `[TRADE] ${message}`,
    metadata: {
      type: 'trade',
      ...metadata,
    },
    requestId: currentRequestId,
  });
}

/**
 * Opportunity detection log with specialized format
 */
export function opportunity(message: string, metadata: OpportunityLogMetadata): void {
  output({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `[OPPORTUNITY] ${message}`,
    metadata: {
      type: 'opportunity',
      ...metadata,
    },
    requestId: currentRequestId,
  });
}

/**
 * Start performance timer
 */
export function startTimer(label: string): void {
  performanceTimers.set(label, {
    start: Date.now(),
    label,
  });
}

/**
 * End performance timer and log duration
 */
export function endTimer(label: string): number {
  const timer = performanceTimers.get(label);
  
  if (!timer) {
    warn(`Timer '${label}' not found`);
    return 0;
  }
  
  const duration = Date.now() - timer.start;
  performanceTimers.delete(label);
  
  debug(`Performance: ${label}`, {
    duration,
    unit: 'ms',
  });
  
  return duration;
}

/**
 * Get timer duration without ending it
 */
export function getTimerDuration(label: string): number {
  const timer = performanceTimers.get(label);
  
  if (!timer) {
    return 0;
  }
  
  return Date.now() - timer.start;
}

/**
 * Log with automatic timing
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  startTimer(label);
  
  try {
    const result = await fn();
    const duration = endTimer(label);
    
    info(`Completed: ${label}`, { duration });
    
    return result;
  } catch (err) {
    const duration = endTimer(label);
    
    error(`Failed: ${label}`, {
      duration,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    
    throw err;
  }
}

/**
 * Create child logger with default metadata
 */
export function createChildLogger(defaultMetadata: Record<string, any>) {
  return {
    debug: (message: string, metadata?: Record<string, any>) =>
      debug(message, { ...defaultMetadata, ...metadata }),
    info: (message: string, metadata?: Record<string, any>) =>
      info(message, { ...defaultMetadata, ...metadata }),
    warn: (message: string, metadata?: Record<string, any>) =>
      warn(message, { ...defaultMetadata, ...metadata }),
    error: (message: string, metadata?: Record<string, any>) =>
      error(message, { ...defaultMetadata, ...metadata }),
    trade: (message: string, metadata: TradeLogMetadata) =>
      trade(message, { ...defaultMetadata, ...metadata } as TradeLogMetadata),
    opportunity: (message: string, metadata: OpportunityLogMetadata) =>
      opportunity(message, { ...defaultMetadata, ...metadata } as OpportunityLogMetadata),
  };
}

/**
 * Default logger export
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  trade,
  opportunity,
  startTimer,
  endTimer,
  getTimerDuration,
  withTiming,
  setRequestId,
  clearRequestId,
  generateRequestId,
  createChildLogger,
};

export default logger;
