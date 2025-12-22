/**
 * Admin Bot Status API Route
 * GET /api/admin/bot/status
 * 
 * Get bot execution status and SDK health monitoring
 * Requires: canViewMetrics permission
 * Returns: Real-time bot status, RPC health, SDK versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { requirePermission } from '@/lib/admin-auth';

/**
 * SDK Health Status
 */
interface SdkHealth {
  name: string;
  version: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  lastChecked: number;
}

/**
 * GET /api/admin/bot/status
 * Get comprehensive bot status and SDK health
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and permission
    await requirePermission(request, 'canViewMetrics');

    const startTime = Date.now();

    // Check RPC health
    let rpcHealth: SdkHealth = {
      name: 'Solana RPC',
      version: '@solana/web3.js',
      status: 'unhealthy',
      lastChecked: Date.now(),
    };

    try {
      const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
      if (rpcUrl) {
        const connection = new Connection(rpcUrl, 'confirmed');
        const rpcStart = Date.now();
        await connection.getSlot();
        const rpcLatency = Date.now() - rpcStart;

        rpcHealth = {
          name: 'Solana RPC',
          version: '@solana/web3.js@1.98.4',
          status: rpcLatency < 500 ? 'healthy' : rpcLatency < 1000 ? 'degraded' : 'unhealthy',
          latency: rpcLatency,
          lastChecked: Date.now(),
        };
      }
    } catch (error) {
      console.error('RPC health check failed:', error);
      rpcHealth.status = 'unhealthy';
    }

    // Check Jupiter SDK health
    let jupiterHealth: SdkHealth = {
      name: 'Jupiter Aggregator',
      version: '@jup-ag/api@6.0.45',
      status: 'healthy',
      lastChecked: Date.now(),
    };

    try {
      const jupiterStart = Date.now();
      const response = await fetch('https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const jupiterLatency = Date.now() - jupiterStart;

      jupiterHealth = {
        name: 'Jupiter Aggregator',
        version: '@jup-ag/api@6.0.45',
        status: response.ok ? 'healthy' : 'degraded',
        latency: jupiterLatency,
        lastChecked: Date.now(),
      };
    } catch (error) {
      console.error('Jupiter health check failed:', error);
      jupiterHealth.status = 'unhealthy';
    }

    // Check Pyth Network health
    let pythHealth: SdkHealth = {
      name: 'Pyth Network',
      version: '@pythnetwork/hermes-client@2.0.0',
      status: 'healthy',
      lastChecked: Date.now(),
    };

    try {
      const pythStart = Date.now();
      const response = await fetch('https://hermes.pyth.network/api/latest_price_feeds?ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const pythLatency = Date.now() - pythStart;

      pythHealth = {
        name: 'Pyth Network',
        version: '@pythnetwork/hermes-client@2.0.0',
        status: response.ok ? 'healthy' : 'degraded',
        latency: pythLatency,
        lastChecked: Date.now(),
      };
    } catch (error) {
      console.error('Pyth health check failed:', error);
      pythHealth.status = 'unhealthy';
    }

    // Overall SDK health
    const sdkHealth: SdkHealth[] = [rpcHealth, jupiterHealth, pythHealth];
    const healthyCount = sdkHealth.filter(s => s.status === 'healthy').length;
    const overallStatus =
      healthyCount === sdkHealth.length
        ? 'healthy'
        : healthyCount >= sdkHealth.length / 2
        ? 'degraded'
        : 'unhealthy';

    // Bot status (from in-memory state or database)
    const botStatus = {
      running: false, // Get from bot state
      paused: false,
      uptime: 0,
      strategy: null as string | null,
      profitToday: 0,
      tradesExecuted: 0,
      successRate: 0,
      lastCommand: null as string | null,
      lastCommandBy: null as string | null,
      lastCommandAt: null as number | null,
    };

    // In production, load from database:
    // const config = await getAdminConfig('bot_state');
    // if (config) {
    //   botStatus = config.value;
    // }

    const totalLatency = Date.now() - startTime;

    // Log action (optional, can be noisy)
    // await logAdminAction(session, request, {
    //   action: 'get_bot_status',
    //   resource: 'bot',
    //   status: 'success',
    // });

    return NextResponse.json({
      success: true,
      bot: botStatus,
      sdk: {
        overall: overallStatus,
        services: sdkHealth,
        healthyCount,
        totalCount: sdkHealth.length,
      },
      performance: {
        responseTime: totalLatency,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Get bot status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bot status',
      },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 500 }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
