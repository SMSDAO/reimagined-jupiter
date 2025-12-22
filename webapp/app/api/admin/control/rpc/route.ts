/**
 * Admin RPC Configuration API Route
 * POST /api/admin/control/rpc
 * 
 * Manages RPC endpoint configuration
 * 
 * Security:
 * - Requires authentication
 * - Requires config:update_rpc permission
 * - URL sanitization (SSRF prevention)
 * - Full audit logging
 * - Input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermissions,
  withAudit,
  validateInput,
  sanitizeUrl,
  type AuthContext,
} from '@/lib/adminAuth';

interface RpcConfigRequest {
  action: 'add' | 'remove' | 'set_primary' | 'get' | 'test';
  url?: string;
  name?: string;
  priority?: number;
}

// In-memory RPC configuration (in production, use database)
const rpcEndpoints: Array<{
  id: string;
  name: string;
  url: string;
  priority: number;
  isPrimary: boolean;
  isHealthy: boolean;
  lastChecked?: Date;
}> = [
  {
    id: 'default',
    name: 'Default RPC',
    url: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
    priority: 1,
    isPrimary: true,
    isHealthy: true,
  },
];

async function rpcConfigHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    
    const validation = validateInput<RpcConfigRequest>(body, {
      action: {
        type: 'string',
        required: true,
        enum: ['add', 'remove', 'set_primary', 'get', 'test'],
      },
      url: {
        type: 'string',
        required: false,
        min: 10,
        max: 500,
      },
      name: {
        type: 'string',
        required: false,
        min: 1,
        max: 100,
      },
      priority: {
        type: 'number',
        required: false,
        min: 1,
        max: 100,
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
    
    const { action, url, name, priority } = validation.data!;
    
    let message = '';
    let result: any = {};
    
    switch (action) {
      case 'add':
        if (!url || !name) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required fields',
              message: 'URL and name are required for add action',
            },
            { status: 400 }
          );
        }
        
        // Sanitize URL to prevent SSRF
        const urlCheck = sanitizeUrl(url);
        if (!urlCheck.valid) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid URL',
              message: urlCheck.error || 'URL validation failed',
            },
            { status: 400 }
          );
        }
        
        // Check if URL already exists
        if (rpcEndpoints.some(ep => ep.url === url)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Duplicate URL',
              message: 'This RPC URL is already configured',
            },
            { status: 400 }
          );
        }
        
        const newEndpoint = {
          id: `rpc_${Date.now()}`,
          name,
          url,
          priority: priority || rpcEndpoints.length + 1,
          isPrimary: false,
          isHealthy: true,
        };
        
        rpcEndpoints.push(newEndpoint);
        
        message = `RPC endpoint "${name}" added successfully`;
        result = { endpoint: newEndpoint };
        
        console.log(`✅ RPC endpoint added by ${auth.user.username}: ${name} (${url})`);
        break;
        
      case 'remove':
        if (!url) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required fields',
              message: 'URL is required for remove action',
            },
            { status: 400 }
          );
        }
        
        const indexToRemove = rpcEndpoints.findIndex(ep => ep.url === url);
        
        if (indexToRemove === -1) {
          return NextResponse.json(
            {
              success: false,
              error: 'Not found',
              message: 'RPC endpoint not found',
            },
            { status: 404 }
          );
        }
        
        // Don't allow removing primary endpoint
        if (rpcEndpoints[indexToRemove].isPrimary) {
          return NextResponse.json(
            {
              success: false,
              error: 'Cannot remove primary',
              message: 'Cannot remove primary RPC endpoint. Set another endpoint as primary first.',
            },
            { status: 400 }
          );
        }
        
        const removed = rpcEndpoints.splice(indexToRemove, 1)[0];
        message = `RPC endpoint "${removed.name}" removed successfully`;
        result = { removed };
        
        console.log(`✅ RPC endpoint removed by ${auth.user.username}: ${removed.name}`);
        break;
        
      case 'set_primary':
        if (!url) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required fields',
              message: 'URL is required for set_primary action',
            },
            { status: 400 }
          );
        }
        
        const endpoint = rpcEndpoints.find(ep => ep.url === url);
        
        if (!endpoint) {
          return NextResponse.json(
            {
              success: false,
              error: 'Not found',
              message: 'RPC endpoint not found',
            },
            { status: 404 }
          );
        }
        
        // Set all endpoints to non-primary
        rpcEndpoints.forEach(ep => {
          ep.isPrimary = false;
        });
        
        // Set selected endpoint as primary
        endpoint.isPrimary = true;
        
        message = `RPC endpoint "${endpoint.name}" set as primary`;
        result = { endpoint };
        
        console.log(`✅ Primary RPC endpoint changed by ${auth.user.username}: ${endpoint.name}`);
        break;
        
      case 'get':
        message = 'RPC endpoints retrieved successfully';
        result = { endpoints: rpcEndpoints };
        break;
        
      case 'test':
        if (!url) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required fields',
              message: 'URL is required for test action',
            },
            { status: 400 }
          );
        }
        
        // Sanitize URL
        const testUrlCheck = sanitizeUrl(url);
        if (!testUrlCheck.valid) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid URL',
              message: testUrlCheck.error || 'URL validation failed',
            },
            { status: 400 }
          );
        }
        
        // Test RPC connection
        try {
          const { Connection } = await import('@solana/web3.js');
          const connection = new Connection(url, 'confirmed');
          const startTime = Date.now();
          const slot = await connection.getSlot();
          const latency = Date.now() - startTime;
          
          message = 'RPC endpoint test successful';
          result = {
            healthy: true,
            latency,
            currentSlot: slot,
          };
        } catch (testError) {
          message = 'RPC endpoint test failed';
          result = {
            healthy: false,
            error: testError instanceof Error ? testError.message : 'Unknown error',
          };
        }
        break;
    }
    
    return NextResponse.json({
      success: true,
      message,
      action,
      ...result,
    });
  } catch (error) {
    console.error('❌ RPC config error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'RPC configuration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withAudit({
  action: 'rpc_config',
  resource: 'config',
})(
  requirePermissions(['config:update_rpc'])(rpcConfigHandler)
);

// GET for viewing (requires lower permissions)
async function getRpcConfigHandler(request: NextRequest, auth: AuthContext) {
  return NextResponse.json({
    success: true,
    endpoints: rpcEndpoints,
  });
}

export const GET = requirePermissions(['config:view'])(getRpcConfigHandler);
