/**
 * Admin Bot Control API Route
 * POST /api/admin/bot/control
 * 
 * Controls bot execution (start/stop/pause/resume)
 * Requires: canControlBot permission
 * Security: All state changes are server-side and audited
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  logAdminAction,
  validateInput,
  sanitizeForLogging,
} from '@/lib/admin-auth';

/**
 * Bot Control Commands
 */
type BotCommand = 'start' | 'stop' | 'pause' | 'resume' | 'emergency-stop';

/**
 * Bot State (In-memory for now, use database in production)
 */
interface BotState {
  running: boolean;
  paused: boolean;
  startTime?: number;
  strategy?: string;
  lastCommand?: string;
  lastCommandBy?: string;
  lastCommandAt?: number;
}

// In-memory bot state (replace with database in production)
let botState: BotState = {
  running: false,
  paused: false,
};

/**
 * POST /api/admin/bot/control
 * Execute bot control command
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canControlBot');

    // Parse request body
    const body = await request.json();
    const { command, strategy } = body;

    // Validate input
    const validation = validateInput(body, {
      required: ['command'],
    });

    if (!validation.valid) {
      await logAdminAction(session, request, {
        action: 'bot_control',
        resource: 'bot',
        status: 'failure',
        errorMessage: `Validation failed: ${validation.errors.join(', ')}`,
        requestData: sanitizeForLogging(body),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Validate command
    const validCommands: BotCommand[] = ['start', 'stop', 'pause', 'resume', 'emergency-stop'];
    if (!validCommands.includes(command)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid command. Must be one of: ${validCommands.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let message = '';
    let statusCode = 200;

    // Execute command
    switch (command as BotCommand) {
      case 'start':
        if (botState.running) {
          message = 'Bot is already running';
          statusCode = 400;
        } else {
          botState.running = true;
          botState.paused = false;
          botState.startTime = Date.now();
          botState.strategy = strategy || 'arbitrage';
          botState.lastCommand = 'start';
          botState.lastCommandBy = session.username;
          botState.lastCommandAt = Date.now();
          message = 'Bot started successfully';
          console.log(`▶️ Bot started by ${session.username} with strategy: ${botState.strategy}`);
        }
        break;

      case 'stop':
        if (!botState.running) {
          message = 'Bot is not running';
          statusCode = 400;
        } else {
          botState.running = false;
          botState.paused = false;
          botState.strategy = undefined;
          botState.lastCommand = 'stop';
          botState.lastCommandBy = session.username;
          botState.lastCommandAt = Date.now();
          message = 'Bot stopped successfully';
          console.log(`⏹️ Bot stopped by ${session.username}`);
        }
        break;

      case 'pause':
        if (!botState.running) {
          message = 'Bot is not running';
          statusCode = 400;
        } else if (botState.paused) {
          message = 'Bot is already paused';
          statusCode = 400;
        } else {
          botState.paused = true;
          botState.lastCommand = 'pause';
          botState.lastCommandBy = session.username;
          botState.lastCommandAt = Date.now();
          message = 'Bot paused successfully';
          console.log(`⏸️ Bot paused by ${session.username}`);
        }
        break;

      case 'resume':
        if (!botState.running) {
          message = 'Bot is not running';
          statusCode = 400;
        } else if (!botState.paused) {
          message = 'Bot is not paused';
          statusCode = 400;
        } else {
          botState.paused = false;
          botState.lastCommand = 'resume';
          botState.lastCommandBy = session.username;
          botState.lastCommandAt = Date.now();
          message = 'Bot resumed successfully';
          console.log(`▶️ Bot resumed by ${session.username}`);
        }
        break;

      case 'emergency-stop':
        botState.running = false;
        botState.paused = false;
        botState.strategy = undefined;
        botState.lastCommand = 'emergency-stop';
        botState.lastCommandBy = session.username;
        botState.lastCommandAt = Date.now();
        message = '🚨 Emergency stop executed';
        console.log(`🚨 EMERGENCY STOP by ${session.username}`);
        break;
    }

    // In production, persist state to database:
    // await setAdminConfig('bot_state', botState, 'bot', session.userId);

    // Log action
    await logAdminAction(session, request, {
      action: 'bot_control',
      resource: 'bot',
      resourceId: command,
      status: statusCode === 200 ? 'success' : 'failure',
      requestData: sanitizeForLogging({ command, strategy }),
      responseData: { message, botState },
    });

    return NextResponse.json(
      {
        success: statusCode === 200,
        message,
        botState: {
          running: botState.running,
          paused: botState.paused,
          uptime: botState.startTime ? Date.now() - botState.startTime : 0,
          strategy: botState.strategy,
          lastCommand: botState.lastCommand,
          lastCommandBy: botState.lastCommandBy,
          lastCommandAt: botState.lastCommandAt,
        },
        timestamp: Date.now(),
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('❌ Bot control error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bot control failed',
      },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
