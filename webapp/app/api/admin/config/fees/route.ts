/**
 * Admin Fee Configuration API Route
 * GET/POST /api/admin/config/fees
 * 
 * Manages transaction fee and priority fee configuration
 * Requires: canModifyConfig permission
 * Security: All values validated, max 10M lamports enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  getClientIp,
  sanitizeForLogging,
  validateInput as _validateInput,
} from '@/lib/admin-auth';

/**
 * Fee Configuration Interface
 */
interface FeeConfig {
  baseFee: number; // Base transaction fee in lamports
  priorityFee: number; // Priority fee in lamports
  maxPriorityFee: number; // Maximum priority fee cap (hard limit: 10M lamports)
  computeUnitPrice: number; // Compute unit price in micro-lamports
  gasBuffer: number; // Gas buffer multiplier (e.g., 1.5 = 150%)
}

// Security: Hard cap for priority fees (as per requirements)
const MAX_PRIORITY_FEE_LAMPORTS = 10_000_000; // 10M lamports = 0.01 SOL

/**
 * GET /api/admin/config/fees
 * Get current fee configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canViewMetrics');

    // In production, load from database:
    // const config = await getAdminConfig('fee_configuration');

    // Load from environment with defaults
    const feeConfig: FeeConfig = {
      baseFee: 5000, // 5000 lamports default
      priorityFee: parseInt(process.env.PRIORITY_FEE || '50000'),
      maxPriorityFee: Math.min(
        parseInt(process.env.MAX_PRIORITY_FEE || '10000000'),
        MAX_PRIORITY_FEE_LAMPORTS
      ),
      computeUnitPrice: parseInt(process.env.COMPUTE_UNIT_PRICE || '1000'),
      gasBuffer: parseFloat(process.env.GAS_BUFFER || '1.5'),
    };

    // Log action
    await logAdminAction(session, request, {
      action: 'get_fee_config',
      resource: 'fee_configuration',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      config: feeConfig,
      limits: {
        maxPriorityFee: MAX_PRIORITY_FEE_LAMPORTS,
        maxPriorityFeeSol: MAX_PRIORITY_FEE_LAMPORTS / 1e9,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Get fee config error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get fee configuration',
      },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/config/fees
 * Update fee configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canModifyConfig');

    // Parse request body
    const body = await request.json();
    const { baseFee, priorityFee, maxPriorityFee, computeUnitPrice, gasBuffer } = body;

    // Validate input
    if (baseFee !== undefined && (typeof baseFee !== 'number' || baseFee < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'baseFee must be a positive number',
        },
        { status: 400 }
      );
    }

    if (priorityFee !== undefined && (typeof priorityFee !== 'number' || priorityFee < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'priorityFee must be a positive number',
        },
        { status: 400 }
      );
    }

    if (maxPriorityFee !== undefined) {
      if (typeof maxPriorityFee !== 'number' || maxPriorityFee < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'maxPriorityFee must be a positive number',
          },
          { status: 400 }
        );
      }

      // Security: Enforce hard cap
      if (maxPriorityFee > MAX_PRIORITY_FEE_LAMPORTS) {
        return NextResponse.json(
          {
            success: false,
            error: `maxPriorityFee cannot exceed ${MAX_PRIORITY_FEE_LAMPORTS} lamports (0.01 SOL)`,
          },
          { status: 400 }
        );
      }
    }

    if (computeUnitPrice !== undefined && (typeof computeUnitPrice !== 'number' || computeUnitPrice < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'computeUnitPrice must be a positive number',
        },
        { status: 400 }
      );
    }

    if (gasBuffer !== undefined && (typeof gasBuffer !== 'number' || gasBuffer < 1 || gasBuffer > 5)) {
      return NextResponse.json(
        {
          success: false,
          error: 'gasBuffer must be between 1 and 5',
        },
        { status: 400 }
      );
    }

    // Build updated config
    const updatedConfig: Partial<FeeConfig> = {};
    if (baseFee !== undefined) updatedConfig.baseFee = baseFee;
    if (priorityFee !== undefined) updatedConfig.priorityFee = priorityFee;
    if (maxPriorityFee !== undefined) {
      updatedConfig.maxPriorityFee = Math.min(maxPriorityFee, MAX_PRIORITY_FEE_LAMPORTS);
    }
    if (computeUnitPrice !== undefined) updatedConfig.computeUnitPrice = computeUnitPrice;
    if (gasBuffer !== undefined) updatedConfig.gasBuffer = gasBuffer;

    // In production, save to database:
    // await setAdminConfig(
    //   'fee_configuration',
    //   updatedConfig,
    //   'fees',
    //   session.userId,
    //   { description: 'Transaction fee configuration', requiresAdmin: true }
    // );

    // Log action
    await logAdminAction(session, request, {
      action: 'update_fee_config',
      resource: 'fee_configuration',
      status: 'success',
      requestData: sanitizeForLogging(updatedConfig),
    });

    console.log(`✅ Fee config updated by ${session.username}:`, updatedConfig);

    return NextResponse.json({
      success: true,
      message: 'Fee configuration updated successfully',
      config: updatedConfig,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Update fee config error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update fee configuration',
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
