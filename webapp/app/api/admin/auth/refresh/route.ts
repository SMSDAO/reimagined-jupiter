/**
 * Admin Token Refresh API Route
 * POST /api/admin/auth/refresh
 * 
 * Refreshes access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  generateAccessToken,
  validateInput,
} from '@/lib/adminAuth';

// For MVP, use environment-based auth
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gxq.studio';

interface RefreshRequest {
  refreshToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validateInput<RefreshRequest>(body, {
      refreshToken: {
        type: 'string',
        required: true,
        min: 10,
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
    
    const { refreshToken } = validation.data!;
    
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid refresh token',
          message: 'Refresh token is invalid or expired',
        },
        { status: 401 }
      );
    }
    
    // TODO: When database is connected, check if token is revoked:
    // const tokenRecord = await getRefreshTokenByToken(refreshToken);
    // if (!tokenRecord) { return 401; }
    
    // Generate new access token (MVP: hardcoded permissions)
    const accessToken = generateAccessToken({
      userId: payload.userId,
      username: payload.username,
      email: ADMIN_EMAIL,
      roles: ['super_admin'],
      permissions: [
        'bot:start', 'bot:stop', 'bot:pause', 'bot:resume', 'bot:emergency_stop', 'bot:view_status',
        'config:view', 'config:update_rpc', 'config:update_fees', 'config:update_dao_skim',
        'config:update_trading', 'config:update_strategies',
        'api:view_policies', 'api:update_policies', 'api:generate_keys', 'api:revoke_keys',
        'monitoring:view_health', 'monitoring:view_metrics', 'monitoring:view_logs', 'monitoring:export_logs',
        'audit:view', 'audit:export', 'security:view_events',
        'users:create', 'users:update', 'users:delete', 'users:view', 'users:assign_roles',
        'roles:create', 'roles:update', 'roles:delete', 'roles:view',
      ],
    });
    
    console.log(`✅ Token refreshed for ${payload.username}`);
    
    return NextResponse.json({
      success: true,
      accessToken,
      expiresIn: 15 * 60, // 15 minutes
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
