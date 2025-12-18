/**
 * Admin control panel API
 * Handle bot commands and configuration updates
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './auth.js';

interface ControlRequest {
  command: 'start' | 'stop' | 'pause' | 'resume' | 'emergency-stop' | 'get-status' | 'update-config';
  config?: {
    minProfit?: number;
    slippage?: number;
    enabledStrategies?: string[];
    maxGasPrice?: number;
  };
}

interface BotStatus {
  running: boolean;
  paused: boolean;
  uptime: number;
  currentStrategy: string | null;
  lastAction: string;
  lastActionTime: number;
}

interface ControlResponse {
  success: boolean;
  message: string;
  currentStatus: BotStatus;
  error?: string;
}

// In-memory bot state (in production, use Redis or database)
let botState: BotStatus = {
  running: false,
  paused: false,
  uptime: 0,
  currentStrategy: null,
  lastAction: 'stopped',
  lastActionTime: Date.now(),
};

let botStartTime = 0;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<ControlResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      currentStatus: botState,
      error: 'Method not allowed',
    });
  }
  
  try {
    // Verify JWT authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        currentStatus: botState,
        error: 'No authentication token provided',
      });
    }
    
    const token = authHeader.substring(7);
    const verification = verifyToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        currentStatus: botState,
        error: verification.error || 'Invalid token',
      });
    }
    
    console.log(`🔧 Control request from admin: ${verification.payload.username}`);
    
    // Parse request body
    const body = req.body as ControlRequest;
    const { command, config } = body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'Command is required',
        currentStatus: botState,
        error: 'Missing command',
      });
    }
    
    // Update uptime if running
    if (botState.running && botStartTime > 0) {
      botState.uptime = Math.floor((Date.now() - botStartTime) / 1000);
    }
    
    // Handle commands
    let message = '';
    
    switch (command) {
      case 'start':
        if (botState.running) {
          message = 'Bot is already running';
        } else {
          botState.running = true;
          botState.paused = false;
          botState.currentStrategy = 'arbitrage';
          botState.lastAction = 'started';
          botState.lastActionTime = Date.now();
          botStartTime = Date.now();
          botState.uptime = 0;
          message = 'Bot started successfully';
          console.log('▶️ Bot started');
        }
        break;
        
      case 'stop':
        if (!botState.running) {
          message = 'Bot is already stopped';
        } else {
          botState.running = false;
          botState.paused = false;
          botState.currentStrategy = null;
          botState.lastAction = 'stopped';
          botState.lastActionTime = Date.now();
          message = 'Bot stopped successfully';
          console.log('⏹️ Bot stopped');
        }
        break;
        
      case 'pause':
        if (!botState.running) {
          message = 'Bot is not running';
        } else if (botState.paused) {
          message = 'Bot is already paused';
        } else {
          botState.paused = true;
          botState.lastAction = 'paused';
          botState.lastActionTime = Date.now();
          message = 'Bot paused successfully';
          console.log('⏸️ Bot paused');
        }
        break;
        
      case 'resume':
        if (!botState.running) {
          message = 'Bot is not running';
        } else if (!botState.paused) {
          message = 'Bot is not paused';
        } else {
          botState.paused = false;
          botState.lastAction = 'resumed';
          botState.lastActionTime = Date.now();
          message = 'Bot resumed successfully';
          console.log('▶️ Bot resumed');
        }
        break;
        
      case 'emergency-stop':
        botState.running = false;
        botState.paused = false;
        botState.currentStrategy = null;
        botState.lastAction = 'emergency-stopped';
        botState.lastActionTime = Date.now();
        message = '🚨 Emergency stop executed';
        console.log('🚨 EMERGENCY STOP');
        break;
        
      case 'get-status':
        message = 'Status retrieved successfully';
        break;
        
      case 'update-config':
        if (!config) {
          return res.status(400).json({
            success: false,
            message: 'Configuration is required',
            currentStatus: botState,
            error: 'Missing config',
          });
        }
        
        // Update configuration (in production, persist to database)
        if (config.minProfit !== undefined) {
          process.env.MINIMUM_PROFIT_SOL = config.minProfit.toString();
          console.log(`⚙️ Updated min profit: ${config.minProfit} SOL`);
        }
        
        if (config.slippage !== undefined) {
          process.env.MAX_SLIPPAGE = config.slippage.toString();
          console.log(`⚙️ Updated slippage: ${config.slippage * 100}%`);
        }
        
        if (config.enabledStrategies) {
          console.log(`⚙️ Updated strategies: ${config.enabledStrategies.join(', ')}`);
        }
        
        if (config.maxGasPrice !== undefined) {
          console.log(`⚙️ Updated max gas: ${config.maxGasPrice} lamports`);
        }
        
        botState.lastAction = 'config-updated';
        botState.lastActionTime = Date.now();
        message = 'Configuration updated successfully';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid command',
          currentStatus: botState,
          error: `Unknown command: ${command}`,
        });
    }
    
    return res.status(200).json({
      success: true,
      message,
      currentStatus: botState,
    });
  } catch (error) {
    console.error('❌ Control error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Control command failed';
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      currentStatus: botState,
      error: errorMessage,
    });
  }
}

/**
 * Get current bot status (exported for other modules)
 */
export function getBotStatus(): BotStatus {
  if (botState.running && botStartTime > 0) {
    botState.uptime = Math.floor((Date.now() - botStartTime) / 1000);
  }
  return { ...botState };
}
