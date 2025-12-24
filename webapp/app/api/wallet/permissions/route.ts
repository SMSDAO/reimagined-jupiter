/**
 * Wallet Permissions API
 * Validates wallet ownership and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, validateWalletOwnership, UserRole } from '@/../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const { walletAddress, action } = body;
    
    // Authorize the request
    const auth = authorizeRequest(authHeader, [UserRole.USER, UserRole.ADMIN]);
    
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || 'Unauthorized',
        },
        { status: 401 }
      );
    }
    
    // Validate wallet ownership
    const hasPermission = validateWalletOwnership(auth.payload, walletAddress);
    
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to access this wallet',
        },
        { status: 403 }
      );
    }
    
    // Additional action-based validation
    const actionPermissions: Record<string, boolean> = {
      read: true,
      trade: hasPermission,
      transfer: hasPermission,
      admin: auth.payload?.role === UserRole.ADMIN,
    };
    
    const canPerformAction = action ? actionPermissions[action] !== false : true;
    
    return NextResponse.json({
      success: true,
      hasPermission,
      canPerformAction,
      role: auth.payload?.role,
      walletAddress,
    });
  } catch (error) {
    console.error('[Wallet Permissions API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Permission check failed',
      },
      { status: 500 }
    );
  }
}
