/**
 * Admin Session Verification API Route
 * GET /api/admin/auth/verify
 * 
 * Verifies admin session and returns user information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, logAdminAction } from '@/lib/admin-auth';

/**
 * GET /api/admin/auth/verify
 * Verify admin session and return user information
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
          authenticated: false,
        },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (session.expiresAt && Date.now() / 1000 > session.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired',
          authenticated: false,
        },
        { status: 401 }
      );
    }

    // In production, verify session in database:
    // const dbSession = await getAdminSessionByTokenHash(hashToken(token));
    // if (!dbSession || !dbSession.isValid) {
    //   return error response
    // }
    // await updateSessionActivity(dbSession.id);

    // Log verification (optional, can be noisy)
    // await logAdminAction(session, request, {
    //   action: 'verify_session',
    //   status: 'success',
    // });

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        userId: session.userId,
        username: session.username,
        role: session.role,
        permissions: session.permissions,
      },
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('❌ Session verification error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed',
        authenticated: false,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
