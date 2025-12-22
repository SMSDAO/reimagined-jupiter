/**
 * Admin RPC Configuration API Route
 * GET/POST /api/admin/config/rpc
 * 
 * Manages RPC endpoint configuration with server-side authorization
 * Requires: canModifyConfig permission
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  logAdminAction,
  validateInput,
  sanitizeForLogging,
} from '@/lib/admin-auth';

/**
 * RPC Endpoint Configuration
 */
interface RpcEndpoint {
  url: string;
  name: string;
  priority: number;
  enabled: boolean;
  type: 'mainnet' | 'devnet' | 'testnet';
}

/**
 * GET /api/admin/config/rpc
 * Get current RPC configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canViewMetrics');

    // In production, load from database:
    // const config = await getAdminConfig('rpc_endpoints');

    // For now, load from environment
    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
    const quicknodeUrl = process.env.QUICKNODE_RPC_URL;

    const endpoints: RpcEndpoint[] = [];

    if (rpcUrl) {
      endpoints.push({
        url: rpcUrl,
        name: 'Primary RPC',
        priority: 1,
        enabled: true,
        type: 'mainnet',
      });
    }

    if (quicknodeUrl) {
      endpoints.push({
        url: quicknodeUrl,
        name: 'QuickNode RPC',
        priority: 2,
        enabled: true,
        type: 'mainnet',
      });
    }

    // Log action
    await logAdminAction(session, request, {
      action: 'get_rpc_config',
      resource: 'rpc_configuration',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      endpoints,
      activeEndpoint: endpoints[0]?.url,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Get RPC config error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get RPC configuration',
      },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/config/rpc
 * Update RPC configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and permission
    const session = await requirePermission(request, 'canModifyConfig');

    // Parse request body
    const body = await request.json();
    const { endpoints, activeEndpoint } = body;

    // Validate input
    const validation = validateInput(body, {
      required: ['endpoints'],
    });

    if (!validation.valid) {
      await logAdminAction(session, request, {
        action: 'update_rpc_config',
        resource: 'rpc_configuration',
        status: 'failure',
        errorMessage: `Validation failed: ${validation.errors.join(', ')}`,
        requestData: sanitizeForLogging(body),
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

    // Validate endpoints
    if (!Array.isArray(endpoints)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Endpoints must be an array',
        },
        { status: 400 }
      );
    }

    for (const endpoint of endpoints) {
      if (!endpoint.url || !endpoint.name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each endpoint must have url and name',
          },
          { status: 400 }
        );
      }

      // Validate URL format
      try {
        new URL(endpoint.url);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid URL: ${endpoint.url}`,
          },
          { status: 400 }
        );
      }
    }

    // In production, save to database:
    // await setAdminConfig(
    //   'rpc_endpoints',
    //   { endpoints, activeEndpoint },
    //   'rpc',
    //   session.userId,
    //   { description: 'RPC endpoint configuration', requiresAdmin: true }
    // );

    // Log action
    await logAdminAction(session, request, {
      action: 'update_rpc_config',
      resource: 'rpc_configuration',
      status: 'success',
      requestData: sanitizeForLogging({
        endpointCount: endpoints.length,
        activeEndpoint,
      }),
    });

    console.log(`✅ RPC config updated by ${session.username}`);

    return NextResponse.json({
      success: true,
      message: 'RPC configuration updated successfully',
      endpoints,
      activeEndpoint,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Update RPC config error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update RPC configuration',
      },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
