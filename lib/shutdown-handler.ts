/**
 * Graceful shutdown handler
 * Ensures clean shutdown of all resources on process termination
 */

import { logger } from './logger.js';

type ShutdownCallback = () => Promise<void> | void;

interface ShutdownTask {
  name: string;
  callback: ShutdownCallback;
  priority: number; // Lower numbers execute first
}

class ShutdownHandler {
  private tasks: ShutdownTask[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds
  
  /**
   * Register a shutdown task
   */
  public register(name: string, callback: ShutdownCallback, priority: number = 50): void {
    this.tasks.push({ name, callback, priority });
    this.tasks.sort((a, b) => a.priority - b.priority);
    
    logger.debug(`Registered shutdown task: ${name}`, { priority });
  }
  
  /**
   * Set shutdown timeout (in milliseconds)
   */
  public setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
  }
  
  /**
   * Execute shutdown sequence
   */
  public async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }
    
    this.isShuttingDown = true;
    
    logger.info(`Received ${signal} signal, starting graceful shutdown...`);
    
    // Set timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);
    
    try {
      // Execute all shutdown tasks in priority order
      for (const task of this.tasks) {
        try {
          logger.info(`Executing shutdown task: ${task.name}`);
          await Promise.race([
            task.callback(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Task timeout')), 5000)
            ),
          ]);
          logger.info(`Completed shutdown task: ${task.name}`);
        } catch (error) {
          logger.error(`Error in shutdown task: ${task.name}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      logger.info('Graceful shutdown completed successfully');
      clearTimeout(forceShutdownTimer);
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }
  
  /**
   * Initialize signal handlers
   */
  public initialize(): void {
    // Handle SIGTERM (graceful shutdown)
    process.on('SIGTERM', () => {
      this.shutdown('SIGTERM');
    });
    
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.shutdown('SIGINT');
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      this.shutdown('uncaughtException');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      this.shutdown('unhandledRejection');
    });
    
    logger.info('Shutdown handler initialized');
  }
}

// Singleton instance
const shutdownHandler = new ShutdownHandler();

/**
 * Register a shutdown callback
 */
export function registerShutdownTask(
  name: string,
  callback: ShutdownCallback,
  priority?: number
): void {
  shutdownHandler.register(name, callback, priority);
}

/**
 * Initialize shutdown handler (call once at app startup)
 */
export function initializeShutdownHandler(): void {
  shutdownHandler.initialize();
}

/**
 * Set custom shutdown timeout
 */
export function setShutdownTimeout(timeout: number): void {
  shutdownHandler.setShutdownTimeout(timeout);
}

/**
 * Default export
 */
export default {
  register: registerShutdownTask,
  initialize: initializeShutdownHandler,
  setShutdownTimeout,
};
