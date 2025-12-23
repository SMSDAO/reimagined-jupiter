/**
 * Railway 24/7 continuous monitoring mode
 * Express server with health checks and continuous arbitrage scanning
 */

import express, { Request, Response } from 'express';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { scanOpportunities } from '../lib/scanner.js';
import { executeTrade } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import { enforceProductionSafety } from './utils/productionGuardrails.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Bot state
let isRunning = false;
let isPaused = false;
let scanCount = 0;
let opportunitiesFound = 0;
let tradesExecuted = 0;
let totalProfit = 0;
let lastScanTime = 0;
let lastTradeTime = 0;

// Connection and keypair
let connection: Connection | null = null;
let keypair: Keypair | null = null;

/**
 * Initialize Solana connection and wallet
 */
async function initialize() {
  try {
    // Initialize RPC connection
    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SOLANA_RPC_URL not configured');
    }
    
    connection = new Connection(rpcUrl, 'confirmed');
    logger.info('Connected to Solana RPC', { rpcUrl: rpcUrl.split('//')[1]?.split('@')[0] || 'unknown' });
    
    // Run production safety checks
    await enforceProductionSafety(connection);
    
    // Test connection
    const slot = await connection.getSlot();
    logger.info('RPC connection verified', { currentSlot: slot });
    
    // Initialize wallet
    const privateKeyString = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('WALLET_PRIVATE_KEY not configured');
    }
    
    const privateKey = privateKeyString.includes('[')
      ? Uint8Array.from(JSON.parse(privateKeyString))
      : bs58.decode(privateKeyString);
    
    keypair = Keypair.fromSecretKey(privateKey);
    logger.info('Wallet loaded', { address: keypair.publicKey.toString() });
    
    // Check wallet balance
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSol = balance / 1e9;
    logger.info('Wallet balance', { balance: balanceSol, unit: 'SOL' });
    
    if (balanceSol < 0.01) {
      logger.warn('Low wallet balance', { balance: balanceSol, minimum: 0.01 });
    }
    
    return true;
  } catch (error) {
    logger.error('Initialization failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  const status = isRunning && connection && keypair ? 'healthy' : 'stopped';
  
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      rss: Math.round(memory.rss / 1024 / 1024),
    },
    bot: {
      running: isRunning,
      paused: isPaused,
      scanCount,
      opportunitiesFound,
      tradesExecuted,
      totalProfit: parseFloat(totalProfit.toFixed(4)),
      lastScanTime,
      lastTradeTime,
    },
    timestamp: Date.now(),
  });
});

/**
 * Metrics endpoint
 */
app.get('/api/metrics', (req: Request, res: Response) => {
  res.json({
    success: true,
    metrics: {
      scanCount,
      opportunitiesFound,
      tradesExecuted,
      totalProfit: parseFloat(totalProfit.toFixed(4)),
      successRate: tradesExecuted > 0 ? 100 : 0,
      avgProfit: tradesExecuted > 0 ? totalProfit / tradesExecuted : 0,
      uptime: Math.floor(process.uptime()),
    },
    timestamp: Date.now(),
  });
});

/**
 * Control endpoint (start/stop/pause/resume)
 */
app.post('/api/control', express.json(), (req: Request, res: Response) => {
  const { command } = req.body;
  
  switch (command) {
    case 'start':
      if (!isRunning) {
        isRunning = true;
        isPaused = false;
        logger.info('Bot started via API');
        res.json({ success: true, message: 'Bot started' });
      } else {
        res.json({ success: false, message: 'Bot already running' });
      }
      break;
      
    case 'stop':
      if (isRunning) {
        isRunning = false;
        isPaused = false;
        logger.info('Bot stopped via API');
        res.json({ success: true, message: 'Bot stopped' });
      } else {
        res.json({ success: false, message: 'Bot not running' });
      }
      break;
      
    case 'pause':
      if (isRunning && !isPaused) {
        isPaused = true;
        logger.info('Bot paused via API');
        res.json({ success: true, message: 'Bot paused' });
      } else {
        res.json({ success: false, message: 'Bot not running or already paused' });
      }
      break;
      
    case 'resume':
      if (isRunning && isPaused) {
        isPaused = false;
        logger.info('Bot resumed via API');
        res.json({ success: true, message: 'Bot resumed' });
      } else {
        res.json({ success: false, message: 'Bot not paused' });
      }
      break;
      
    default:
      res.status(400).json({ success: false, message: 'Invalid command' });
  }
});

/**
 * Continuous monitoring loop
 */
async function monitoringLoop() {
  logger.info('Starting continuous arbitrage monitoring...');
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // Skip if paused or not running
      if (!isRunning || isPaused || !connection || !keypair) {
        await sleep(5000);
        continue;
      }
      
      logger.debug('Scanning for opportunities...');
      lastScanTime = Date.now();
      scanCount++;
      
      // Scan for opportunities
      const opportunities = await scanOpportunities(connection, {
        minProfit: parseFloat(process.env.MINIMUM_PROFIT_SOL || '0.01'),
      });
      
      opportunitiesFound += opportunities.length;
      
      if (opportunities.length > 0) {
        logger.info(`Found ${opportunities.length} opportunities`);
        
        // Execute top opportunity
        const topOpportunity = opportunities[0];
        logger.info('Executing top opportunity', {
          id: topOpportunity.id,
          type: topOpportunity.type,
          estimatedProfit: topOpportunity.estimatedProfit,
        });
        
        const result = await executeTrade(connection, keypair, topOpportunity, {
          maxRetries: 2,
          timeout: 25000,
        });
        
        if (result.success) {
          tradesExecuted++;
          totalProfit += result.profit || 0;
          lastTradeTime = Date.now();
          
          logger.trade('Trade executed successfully', {
            tokenPair: `${topOpportunity.inputToken.slice(0, 8)}.../${topOpportunity.outputToken.slice(0, 8)}...`,
            profit: result.profit || 0,
            route: topOpportunity.route,
            signature: result.signature,
            gasUsed: result.gasUsed,
            executionTime: result.executionTime,
          });
        } else {
          logger.warn('Trade execution failed', {
            error: result.error,
            executionTime: result.executionTime,
          });
        }
      } else {
        logger.debug('No opportunities found');
      }
      
      // Wait before next scan (5 seconds)
      await sleep(5000);
    } catch (error) {
      logger.error('Monitoring loop error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Back off on error (10 seconds)
      await sleep(10000);
    }
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  isRunning = false;
  
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  isRunning = false;
  
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
});

/**
 * Start server and monitoring
 */
async function start() {
  logger.info('🚀 GXQ Studio - Railway Continuous Mode');
  logger.info(`Environment: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`Port: ${PORT}`);
  
  // Start Express server
  app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });
  
  // Initialize Solana connection and wallet
  const initialized = await initialize();
  
  if (!initialized) {
    logger.error('Initialization failed, running in degraded mode');
    return;
  }
  
  // Auto-start monitoring
  isRunning = true;
  logger.info('Auto-starting monitoring...');
  
  // Start monitoring loop (non-blocking)
  monitoringLoop().catch(error => {
    logger.error('Monitoring loop crashed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}

// Start the application
start().catch(error => {
  logger.error('Application startup failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
