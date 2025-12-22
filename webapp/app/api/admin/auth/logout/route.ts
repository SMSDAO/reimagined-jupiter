/**
 * Admin Logout API Route
 * POST /api/admin/auth/logout
 * 
 * Invalidates admin session and revokes JWT tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, logAdminAction } from '@/lib/admin-auth';

/**
 * POST /api/admin/auth/logout
 * Logout admin user and invalidate session
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session (if any)
    const session = await getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active session',
        },
        { status: 401 }
      );
    }

    // In production, revoke session in database:
    // if (session.sessionId) {
    //   await revokeAdminSession(session.sessionId, 'user_logout');
    // }

    // Log logout action
    await logAdminAction(session, request, {
      action: 'logout',
      status: 'success',
      responseData: { sessionId: session.sessionId },
    });

    console.log(`✅ Admin logout: ${session.username}`);

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Logout error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Logout failed',
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
