/**
 * Admin Bot Control API Route
 * POST /api/admin/control/bot
 * 
 * Controls bot execution (start, stop, pause, resume, emergency stop)
 * 
 * Security:
 * - Requires authentication
 * - Requires bot control permissions
 * - Full audit logging
 * - Input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermissions,
  withAudit,
  validateInput,
  type AuthContext,
} from '@/lib/adminAuth';

interface BotControlRequest {
  command: 'start' | 'stop' | 'pause' | 'resume' | 'emergency_stop' | 'get_status';
  reason?: string;
}

// In-memory bot state (in production, use database or Redis)
const botState = {
  running: false,
  paused: false,
  uptime: 0,
  startTime: 0,
  lastAction: 'stopped',
  lastActionTime: Date.now(),
  lastActionBy: 'system',
};

async function botControlHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    
    const validation = validateInput<BotControlRequest>(body, {
      command: {
        type: 'string',
        required: true,
        enum: ['start', 'stop', 'pause', 'resume', 'emergency_stop', 'get_status'],
      },
      reason: {
        type: 'string',
        required: false,
        max: 500,
      },
    });
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }
    
    const { command, reason } = validation.data!;
    
    // Check specific permissions for dangerous operations
    if (command === 'emergency_stop') {
      // Emergency stop requires special permission
      if (!auth.user.permissions.includes('bot:emergency_stop')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            message: 'Emergency stop requires bot:emergency_stop permission',
          },
          { status: 403 }
        );
      }
    }
    
    let message = '';
    let oldState = { ...botState };
    
    // Update uptime if running
    if (botState.running && botState.startTime > 0) {
      botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
    }
    
    switch (command) {
      case 'start':
        if (botState.running) {
          message = 'Bot is already running';
        } else {
          botState.running = true;
          botState.paused = false;
          botState.startTime = Date.now();
          botState.uptime = 0;
          botState.lastAction = 'started';
          botState.lastActionTime = Date.now();
          botState.lastActionBy = auth.user.username;
          message = 'Bot started successfully';
          console.log(`▶️ Bot started by ${auth.user.username}`);
        }
        break;
        
      case 'stop':
        if (!botState.running) {
          message = 'Bot is already stopped';
        } else {
          botState.running = false;
          botState.paused = false;
          botState.lastAction = 'stopped';
          botState.lastActionTime = Date.now();
          botState.lastActionBy = auth.user.username;
          message = 'Bot stopped successfully';
          console.log(`⏹️ Bot stopped by ${auth.user.username}`);
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
          botState.lastActionBy = auth.user.username;
          message = 'Bot paused successfully';
          console.log(`⏸️ Bot paused by ${auth.user.username}`);
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
          botState.lastActionBy = auth.user.username;
          message = 'Bot resumed successfully';
          console.log(`▶️ Bot resumed by ${auth.user.username}`);
        }
        break;
        
      case 'emergency_stop':
        botState.running = false;
        botState.paused = false;
        botState.lastAction = 'emergency_stopped';
        botState.lastActionTime = Date.now();
        botState.lastActionBy = auth.user.username;
        message = `🚨 Emergency stop executed by ${auth.user.username}`;
        console.log(`🚨 EMERGENCY STOP by ${auth.user.username}${reason ? `: ${reason}` : ''}`);
        break;
        
      case 'get_status':
        message = 'Status retrieved successfully';
        break;
    }
    
    return NextResponse.json(
      {
        success: true,
        message,
        command,
        reason,
        status: {
          running: botState.running,
          paused: botState.paused,
          uptime: botState.uptime,
          lastAction: botState.lastAction,
          lastActionTime: botState.lastActionTime,
          lastActionBy: botState.lastActionBy,
        },
        oldState: command !== 'get_status' ? oldState : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Bot control error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Bot control failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export with authentication, authorization, and audit logging
export const POST = withAudit({
  action: 'bot_control',
  resource: 'bot',
})(
  requirePermissions(['bot:start', 'bot:stop'])(botControlHandler)
);

// GET for status (read-only)
async function getStatusHandler(request: NextRequest, auth: AuthContext) {
  if (botState.running && botState.startTime > 0) {
    botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  }
  
  return NextResponse.json({
    success: true,
    status: botState,
  });
}

export const GET = requirePermissions(['bot:view_status'])(getStatusHandler);
