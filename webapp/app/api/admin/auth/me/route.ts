/**
 * Admin Current User API Route
 * GET /api/admin/auth/me
 * 
 * Returns current authenticated user information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, type AuthContext } from '@/lib/adminAuth';

async function meHandler(request: NextRequest, auth: AuthContext) {
  return NextResponse.json({
    success: true,
    user: {
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
      roles: auth.user.roles,
      permissions: auth.user.permissions,
    },
  });
}

export const GET = requireAuth(meHandler);
