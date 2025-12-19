/**
 * Circuit breaker for auto-shutdown on losses/errors
 * Protects against cascading failures and excessive losses
 */

import { logger } from './logger.js';

export interface CircuitBreakerConfig {
  // Loss thresholds
  maxLossPerTrade: number; // Maximum loss per trade in SOL
  maxTotalLoss: number; // Maximum total loss in SOL
  maxLossPercentage: number; // Maximum loss as percentage of capital
  
  // Error thresholds
  maxConsecutiveErrors: number; // Maximum consecutive errors before opening
  maxErrorRate: number; // Maximum error rate (0.0 to 1.0)
  errorWindowMs: number; // Time window for error rate calculation
  
  // Recovery
  resetTimeoutMs: number; // Time before attempting to close circuit
  halfOpenMaxAttempts: number; // Max attempts in half-open state before re-opening
}

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, blocking all operations
  HALF_OPEN = 'HALF_OPEN', // Testing if system has recovered
}

interface TradeResult {
  success: boolean;
  profit: number;
  timestamp: number;
  error?: string;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxLossPerTrade: 0.1, // 0.1 SOL max loss per trade
  maxTotalLoss: 1.0, // 1 SOL max total loss
  maxLossPercentage: 0.10, // 10% max loss of capital
  maxConsecutiveErrors: 5,
  maxErrorRate: 0.5, // 50% error rate
  errorWindowMs: 300000, // 5 minutes
  resetTimeoutMs: 300000, // 5 minutes
  halfOpenMaxAttempts: 3,
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private config: CircuitBreakerConfig;
  private tradeHistory: TradeResult[] = [];
  private consecutiveErrors = 0;
  private totalProfit = 0;
  private initialCapital: number;
  private stateChangedAt: number = Date.now();
  private halfOpenAttempts = 0;
  
  constructor(initialCapital: number, config: Partial<CircuitBreakerConfig> = {}) {
    this.initialCapital = initialCapital;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Circuit breaker initialized', {
      initialCapital,
      config: this.config,
    });
  }
  
  /**
   * Record a trade result
   */
  public recordTrade(result: TradeResult): void {
    this.tradeHistory.push(result);
    
    if (result.success) {
      this.consecutiveErrors = 0;
      this.totalProfit += result.profit;
      
      logger.debug('Trade recorded', {
        profit: result.profit,
        totalProfit: this.totalProfit,
      });
      
      // If in half-open state and trade succeeds, close circuit
      if (this.state === CircuitState.HALF_OPEN) {
        this.closeCircuit();
      }
    } else {
      this.consecutiveErrors++;
      this.totalProfit += result.profit; // Profit is negative for losses
      
      logger.warn('Failed trade recorded', {
        consecutiveErrors: this.consecutiveErrors,
        totalProfit: this.totalProfit,
        error: result.error,
      });
    }
    
    // Check if we should open the circuit
    this.checkThresholds();
    
    // Clean old trade history (keep only recent window)
    const cutoffTime = Date.now() - this.config.errorWindowMs;
    this.tradeHistory = this.tradeHistory.filter(t => t.timestamp > cutoffTime);
  }
  
  /**
   * Check if operation is allowed
   */
  public async allowRequest(): Promise<boolean> {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitState.OPEN) {
      // Check if enough time has passed to try half-open
      const timeSinceOpen = Date.now() - this.stateChangedAt;
      
      if (timeSinceOpen >= this.config.resetTimeoutMs) {
        this.halfOpenCircuit();
        return true;
      }
      
      logger.warn('Circuit breaker is OPEN - blocking request', {
        timeSinceOpen,
        resetTimeoutMs: this.config.resetTimeoutMs,
      });
      
      return false;
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Allow limited attempts in half-open state
      if (this.halfOpenAttempts < this.config.halfOpenMaxAttempts) {
        this.halfOpenAttempts++;
        return true;
      }
      
      logger.warn('Circuit breaker HALF_OPEN attempt limit reached', {
        attempts: this.halfOpenAttempts,
      });
      
      return false;
    }
    
    return false;
  }
  
  /**
   * Check if any thresholds are exceeded
   */
  private checkThresholds(): void {
    // Check consecutive errors
    if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      this.openCircuit('Consecutive errors threshold exceeded');
      return;
    }
    
    // Check error rate
    const recentTrades = this.tradeHistory.filter(
      t => t.timestamp > Date.now() - this.config.errorWindowMs
    );
    
    if (recentTrades.length >= 10) { // Need minimum sample size
      const errorRate = recentTrades.filter(t => !t.success).length / recentTrades.length;
      
      if (errorRate >= this.config.maxErrorRate) {
        this.openCircuit(`Error rate threshold exceeded: ${(errorRate * 100).toFixed(1)}%`);
        return;
      }
    }
    
    // Check total loss
    if (this.totalProfit < -this.config.maxTotalLoss) {
      this.openCircuit(`Total loss threshold exceeded: ${this.totalProfit.toFixed(4)} SOL`);
      return;
    }
    
    // Check loss percentage
    const lossPercentage = Math.abs(this.totalProfit) / this.initialCapital;
    if (this.totalProfit < 0 && lossPercentage >= this.config.maxLossPercentage) {
      this.openCircuit(`Loss percentage threshold exceeded: ${(lossPercentage * 100).toFixed(1)}%`);
      return;
    }
    
    // Check per-trade loss (most recent trade)
    if (this.tradeHistory.length > 0) {
      const lastTrade = this.tradeHistory[this.tradeHistory.length - 1];
      if (lastTrade.profit < -this.config.maxLossPerTrade) {
        this.openCircuit(`Single trade loss threshold exceeded: ${lastTrade.profit.toFixed(4)} SOL`);
        return;
      }
    }
  }
  
  /**
   * Open the circuit
   */
  private openCircuit(reason: string): void {
    if (this.state === CircuitState.OPEN) {
      return; // Already open
    }
    
    this.state = CircuitState.OPEN;
    this.stateChangedAt = Date.now();
    
    logger.error('🚨 CIRCUIT BREAKER OPENED', {
      reason,
      consecutiveErrors: this.consecutiveErrors,
      totalProfit: this.totalProfit,
      state: this.state,
    });
    
    // TODO: Send alert notification (Discord/Telegram)
  }
  
  /**
   * Transition to half-open state
   */
  private halfOpenCircuit(): void {
    this.state = CircuitState.HALF_OPEN;
    this.stateChangedAt = Date.now();
    this.halfOpenAttempts = 0;
    
    logger.warn('Circuit breaker transitioning to HALF_OPEN', {
      state: this.state,
    });
  }
  
  /**
   * Close the circuit
   */
  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.stateChangedAt = Date.now();
    this.consecutiveErrors = 0;
    
    logger.info('✅ Circuit breaker CLOSED - resuming normal operation', {
      state: this.state,
    });
  }
  
  /**
   * Get current state
   */
  public getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get statistics
   */
  public getStats(): {
    state: CircuitState;
    consecutiveErrors: number;
    totalProfit: number;
    totalTrades: number;
    errorRate: number;
    lossPercentage: number;
  } {
    const recentTrades = this.tradeHistory.filter(
      t => t.timestamp > Date.now() - this.config.errorWindowMs
    );
    
    const errorRate = recentTrades.length > 0
      ? recentTrades.filter(t => !t.success).length / recentTrades.length
      : 0;
    
    const lossPercentage = Math.abs(this.totalProfit) / this.initialCapital;
    
    return {
      state: this.state,
      consecutiveErrors: this.consecutiveErrors,
      totalProfit: this.totalProfit,
      totalTrades: this.tradeHistory.length,
      errorRate,
      lossPercentage: this.totalProfit < 0 ? lossPercentage : 0,
    };
  }
  
  /**
   * Reset the circuit breaker (admin override)
   */
  public reset(): void {
    logger.warn('Circuit breaker manually reset');
    
    this.state = CircuitState.CLOSED;
    this.consecutiveErrors = 0;
    this.halfOpenAttempts = 0;
    this.stateChangedAt = Date.now();
    // Note: totalProfit and tradeHistory are preserved
  }
  
  /**
   * Force open the circuit (emergency shutdown)
   */
  public forceOpen(reason: string): void {
    this.openCircuit(`MANUAL: ${reason}`);
  }
}

// Singleton instance
let circuitBreakerInstance: CircuitBreaker | null = null;

/**
 * Initialize circuit breaker
 */
export function initializeCircuitBreaker(
  initialCapital: number,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  circuitBreakerInstance = new CircuitBreaker(initialCapital, config);
  return circuitBreakerInstance;
}

/**
 * Get circuit breaker instance
 */
export function getCircuitBreaker(): CircuitBreaker {
  if (!circuitBreakerInstance) {
    throw new Error('Circuit breaker not initialized. Call initializeCircuitBreaker first.');
  }
  return circuitBreakerInstance;
}
