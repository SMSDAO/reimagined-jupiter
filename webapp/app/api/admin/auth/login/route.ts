/**
 * Admin Authentication API Route
 * POST /api/admin/auth/login
 * 
 * Handles admin user login with JWT tokens and audit logging
 * 
 * Security Features:
 * - Rate limiting (5 attempts per 15 minutes)
 * - Brute force protection
 * - Audit logging
 * - Secure password comparison
 * - IP tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import {
  generateAccessToken,
  generateRefreshToken,
  getClientIp,
  getUserAgent,
  checkLoginAttempts,
  recordLoginAttempt,
  validateInput,
} from '@/lib/adminAuth';

// For MVP, use environment-based auth
// In production, this will use database
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gxq.studio';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  const startTime = Date.now();
  const ipAddress = getClientIp(request);
  const userAgent = getUserAgent(request);
  
  try {
    // Parse and validate request body
    const body = await request.json();
    
    const validation = validateInput<LoginRequest>(body, {
      username: {
        type: 'string',
        required: true,
        min: 3,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
      },
      password: {
        type: 'string',
        required: true,
        min: 1,
        max: 255,
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
    
    const { username, password } = validation.data!;
    
    // Check login attempts (brute force protection)
    const loginCheck = checkLoginAttempts(`${ipAddress}:${username}`);
    
    if (!loginCheck.allowed) {
      console.warn(`⚠️ Login rate limit exceeded for ${username} from ${ipAddress}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts',
          message: `Account temporarily locked. Try again in ${loginCheck.lockDuration} minutes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': ((loginCheck.lockDuration || 0) * 60).toString(),
          },
        }
      );
    }
    
    // Verify credentials
    // TODO: When database is connected, use:
    // const user = await verifyUserPassword(username, password);
    
    // For MVP, check environment variables
    let isValid = false;
    let user: { id: string; username: string; email: string; roles: string[]; permissions: string[] } | null = null;
    
    if (username === ADMIN_USERNAME) {
      // Support both hashed and plain passwords
      if (ADMIN_PASSWORD.startsWith('$2b$') || ADMIN_PASSWORD.startsWith('$2a$')) {
        isValid = await bcrypt.compare(password, ADMIN_PASSWORD);
      } else {
        isValid = password === ADMIN_PASSWORD;
        console.warn('⚠️ Using plain text password. Please hash your password in production!');
      }
      
      if (isValid) {
        // Get user roles and permissions (hardcoded for MVP)
        user = {
          id: '00000000-0000-0000-0000-000000000000', // Placeholder ID
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          roles: ['super_admin'],
          permissions: [
            // Bot control
            'bot:start', 'bot:stop', 'bot:pause', 'bot:resume', 'bot:emergency_stop', 'bot:view_status',
            // Configuration
            'config:view', 'config:update_rpc', 'config:update_fees', 'config:update_dao_skim',
            'config:update_trading', 'config:update_strategies',
            // API management
            'api:view_policies', 'api:update_policies', 'api:generate_keys', 'api:revoke_keys',
            // Monitoring
            'monitoring:view_health', 'monitoring:view_metrics', 'monitoring:view_logs', 'monitoring:export_logs',
            // Audit
            'audit:view', 'audit:export', 'security:view_events',
            // User management
            'users:create', 'users:update', 'users:delete', 'users:view', 'users:assign_roles',
            // Role management
            'roles:create', 'roles:update', 'roles:delete', 'roles:view',
          ],
        };
      }
    }
    
    if (!isValid || !user) {
      // Record failed attempt
      recordLoginAttempt(`${ipAddress}:${username}`, false);
      
      console.warn(`⚠️ Failed login attempt for ${username} from ${ipAddress}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        },
        { status: 401 }
      );
    }
    
    // Record successful login
    recordLoginAttempt(`${ipAddress}:${username}`, true);
    
    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    });
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      username: user.username,
    });
    
    // TODO: When database is connected, store refresh token:
    // await createRefreshToken({
    //   userId: user.id,
    //   token: refreshToken,
    //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    //   ipAddress,
    //   userAgent,
    // });
    
    // TODO: When database is connected, update last login:
    // await updateUserLastLogin(user.id);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Login successful for ${username} from ${ipAddress} (${duration}ms)`);
    
    return NextResponse.json(
      {
        success: true,
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
        user: {
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
        },
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': `${duration}ms`,
        },
      }
    );
  } catch (error) {
    console.error('❌ Login error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
