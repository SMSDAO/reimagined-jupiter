/**
 * Admin Logout API Route
 * POST /api/admin/auth/logout
 * 
 * Revokes refresh token and logs out user
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  withAudit,
  type AuthContext,
} from '@/lib/adminAuth';

async function logoutHandler(request: NextRequest, auth: AuthContext) {
  try {
    // TODO: When database is connected, revoke refresh token:
    // const body = await request.json();
    // if (body.refreshToken) {
    //   await revokeRefreshToken(body.refreshToken);
    // }
    // await revokeAllUserTokens(auth.user.id, 'User logout');
    
    console.log(`✅ Logout successful for ${auth.user.username}`);
    
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
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withAudit({
  action: 'logout',
  resource: 'auth',
})(logoutHandler);
