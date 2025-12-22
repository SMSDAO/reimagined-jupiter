/**
 * Admin DAO Configuration API Route
 * GET/POST /api/admin/config/dao
 * 
 * Manages DAO skimming percentage and wallet configuration
 * Requires: canModifyConfig permission
 * Security: Validates percentage (0-100%) and wallet addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import {
  requirePermission,
  getClientIp,
  sanitizeForLogging,
  validateInput as _validateInput,
} from '@/lib/admin-auth';

/**
 * DAO Configuration Interface
 */
interface DaoConfig {
  enabled: boolean;
  skimmingPercentage: number; // 0-100 (e.g., 10 = 10%)
  daoWalletAddress: string;
  devFeePercentage: number; // Developer fee percentage (0-100)
  devFeeWalletAddress: string;
}

/**
 * GET /api/admin/config/dao
 * Get current DAO configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canViewMetrics');

    // In production, load from database:
    // const config = await getAdminConfig('dao_configuration');

    // Load from environment with defaults
    const daoConfig: DaoConfig = {
      enabled: process.env.DEV_FEE_ENABLED === 'true',
      skimmingPercentage: parseFloat(process.env.DAO_SKIMMING_PERCENTAGE || '5'),
      daoWalletAddress: process.env.DAO_WALLET_ADDRESS || '',
      devFeePercentage: parseFloat(process.env.DEV_FEE_PERCENTAGE || '10'),
      devFeeWalletAddress: process.env.DEV_FEE_WALLET || '',
    };

    // Log action
    await logAdminAction(session, request, {
      action: 'get_dao_config',
      resource: 'dao_configuration',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      config: daoConfig,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Get DAO config error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get DAO configuration',
      },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/config/dao
 * Update DAO configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canModifyConfig');

    // Parse request body
    const body = await request.json();
    const {
      enabled,
      skimmingPercentage,
      daoWalletAddress,
      devFeePercentage,
      devFeeWalletAddress,
    } = body;

    // Validate skimming percentage
    if (skimmingPercentage !== undefined) {
      if (
        typeof skimmingPercentage !== 'number' ||
        skimmingPercentage < 0 ||
        skimmingPercentage > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'skimmingPercentage must be between 0 and 100',
          },
          { status: 400 }
        );
      }
    }

    // Validate dev fee percentage
    if (devFeePercentage !== undefined) {
      if (
        typeof devFeePercentage !== 'number' ||
        devFeePercentage < 0 ||
        devFeePercentage > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'devFeePercentage must be between 0 and 100',
          },
          { status: 400 }
        );
      }
    }

    // Validate DAO wallet address
    if (daoWalletAddress !== undefined && daoWalletAddress !== '') {
      try {
        new PublicKey(daoWalletAddress);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid DAO wallet address',
          },
          { status: 400 }
        );
      }
    }

    // Validate dev fee wallet address
    if (devFeeWalletAddress !== undefined && devFeeWalletAddress !== '') {
      try {
        new PublicKey(devFeeWalletAddress);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid dev fee wallet address',
          },
          { status: 400 }
        );
      }
    }

    // Build updated config
    const updatedConfig: Partial<DaoConfig> = {};
    if (enabled !== undefined) updatedConfig.enabled = enabled;
    if (skimmingPercentage !== undefined) updatedConfig.skimmingPercentage = skimmingPercentage;
    if (daoWalletAddress !== undefined) updatedConfig.daoWalletAddress = daoWalletAddress;
    if (devFeePercentage !== undefined) updatedConfig.devFeePercentage = devFeePercentage;
    if (devFeeWalletAddress !== undefined) updatedConfig.devFeeWalletAddress = devFeeWalletAddress;

    // In production, save to database:
    // await setAdminConfig(
    //   'dao_configuration',
    //   updatedConfig,
    //   'dao',
    //   session.userId,
    //   { description: 'DAO skimming and fee configuration', requiresAdmin: true }
    // );

    // Log action
    await logAdminAction(session, request, {
      action: 'update_dao_config',
      resource: 'dao_configuration',
      status: 'success',
      requestData: sanitizeForLogging(updatedConfig),
    });

    console.log(`✅ DAO config updated by ${session.username}:`, updatedConfig);

    return NextResponse.json({
      success: true,
      message: 'DAO configuration updated successfully',
      config: updatedConfig,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Update DAO config error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update DAO configuration',
      },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
