/**
 * Admin Login API Route
 * POST /api/admin/auth/login
 * 
 * Handles admin authentication with JWT tokens, rate limiting, and audit logging
 * Server-side only - no client-side bypass possible
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@/lib/auth';
import {
  authRateLimiter,
  getClientIp,
  logAdminAction,
  sanitizeForLogging,
  validateInput,
} from '@/lib/admin-auth';
import crypto from 'crypto';

/**
 * POST /api/admin/auth/login
 * Authenticate admin user and return JWT tokens
 */
export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  let username: string | undefined;

  try {
    // Check rate limit
    if (authRateLimiter.isRateLimited(ipAddress)) {
      await logAdminAction(null, request, {
        action: 'login_attempt',
        status: 'failure',
        errorMessage: 'Rate limit exceeded',
        requestData: { ipAddress },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again in 15 minutes.',
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    username = body.username;
    const password = body.password;

    // Validate input
    const validation = validateInput(body, {
      required: ['username', 'password'],
      maxLength: { username: 100, password: 255 },
      minLength: { username: 3, password: 8 },
    });

    if (!validation.valid) {
      authRateLimiter.recordAttempt(ipAddress);

      await logAdminAction(null, request, {
        action: 'login_attempt',
        status: 'failure',
        errorMessage: `Validation failed: ${validation.errors.join(', ')}`,
        requestData: sanitizeForLogging({ username, ipAddress }),
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

    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminUsername || !adminPassword || !jwtSecret) {
      console.error('❌ Admin credentials not configured');

      await logAdminAction(null, request, {
        action: 'login_attempt',
        status: 'error',
        errorMessage: 'Server configuration error',
        requestData: sanitizeForLogging({ username, ipAddress }),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Verify username
    if (username !== adminUsername) {
      authRateLimiter.recordAttempt(ipAddress);

      await logAdminAction(null, request, {
        action: 'login_attempt',
        status: 'failure',
        errorMessage: 'Invalid username',
        requestData: sanitizeForLogging({ username, ipAddress }),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // Verify password
    let passwordValid = false;

    if (adminPassword.startsWith('$2b$') || adminPassword.startsWith('$2a$')) {
      // Hashed password (bcrypt)
      passwordValid = await verifyPassword(password, adminPassword);
    } else {
      // Plain password (for development only)
      passwordValid = password === adminPassword;
      console.warn('⚠️ Using plain text password. Hash your password for production!');
    }

    if (!passwordValid) {
      authRateLimiter.recordAttempt(ipAddress);

      await logAdminAction(null, request, {
        action: 'login_attempt',
        status: 'failure',
        errorMessage: 'Invalid password',
        requestData: sanitizeForLogging({ username, ipAddress }),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Generate JWT tokens
    const accessTokenExpiration = '24h'; // 24 hours
    const refreshTokenExpiration = '7d'; // 7 days

    const accessToken = generateToken(
      {
        userId: 'admin-1', // In production, use real user ID from database
        username,
        role: 'admin',
        sessionId,
        // Full admin permissions
        canControlBot: true,
        canModifyConfig: true,
        canExecuteTrades: true,
        canViewLogs: true,
        canViewMetrics: true,
      },
      { expiresIn: accessTokenExpiration }
    );

    const refreshToken = generateToken(
      {
        userId: 'admin-1',
        username,
        sessionId,
        type: 'refresh',
      },
      { expiresIn: refreshTokenExpiration }
    );

    // In production, store session in database:
    // const accessTokenHash = hashToken(accessToken);
    // const refreshTokenHash = hashToken(refreshToken);
    // await createAdminSession({
    //   userId: 'admin-1',
    //   accessTokenHash,
    //   refreshTokenHash,
    //   ipAddress,
    //   userAgent: request.headers.get('user-agent') || undefined,
    //   expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    // });

    // Reset rate limit on successful login
    authRateLimiter.reset(ipAddress);

    // Log successful login
    await logAdminAction(
      {
        userId: 'admin-1',
        username,
        role: 'admin',
        permissions: {
          canControlBot: true,
          canModifyConfig: true,
          canExecuteTrades: true,
          canViewLogs: true,
          canViewMetrics: true,
        },
        sessionId,
        expiresAt: 0,
      },
      request,
      {
        action: 'login',
        status: 'success',
        requestData: { username, ipAddress },
        responseData: { sessionId },
      }
    );

    console.log(`✅ Admin login successful: ${username} from ${ipAddress}`);

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      user: {
        username,
        role: 'admin',
        permissions: {
          canControlBot: true,
          canModifyConfig: true,
          canExecuteTrades: true,
          canViewLogs: true,
          canViewMetrics: true,
        },
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);

    await logAdminAction(null, request, {
      action: 'login_attempt',
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      requestData: sanitizeForLogging({ username, ipAddress }),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Login failed',
      },
      { status: 500 }
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
