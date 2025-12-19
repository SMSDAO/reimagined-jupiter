import { NextRequest, NextResponse } from 'next/server';
import { createResilientConnection } from '@/lib/solana/connection';
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  rpcLatency: number;
  jupiterApiStatus: 'online' | 'offline';
  timestamp: number;
  errors?: string[];
  rpcEndpoint?: string;
}

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring
 * Returns 200 for healthy, 503 for unhealthy
 */
export async function GET(_request: NextRequest) {
  const errors: string[] = [];
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let rpcLatency = 0;
  let rpcEndpoint = '';

  // Check Solana RPC connection
  const resilientConnection = createResilientConnection();

  try {
    const rpcStart = Date.now();
    const slot = await resilientConnection.getSlot();
    rpcLatency = Date.now() - rpcStart;
    rpcEndpoint = resilientConnection.getCurrentEndpoint();

    console.log(`✅ RPC health check: slot ${slot}, latency ${rpcLatency}ms`);

    if (rpcLatency > 1000) {
      errors.push(`High RPC latency: ${rpcLatency}ms`);
      status = 'degraded';
    }
  } catch (error) {
    errors.push(`RPC connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    status = 'unhealthy';
    console.error('❌ RPC health check failed:', error);
  } finally {
    resilientConnection.destroy();
  }

  // Check Jupiter API availability
  let jupiterApiStatus: 'online' | 'offline' = 'online';
  try {
    const jupiterResponse = await fetch(`${API_ENDPOINTS.JUPITER_QUOTE}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!jupiterResponse.ok) {
      jupiterApiStatus = 'offline';
      errors.push('Jupiter API unavailable');
      status = status === 'healthy' ? 'degraded' : status;
    }
  } catch (error) {
    jupiterApiStatus = 'offline';
    errors.push('Jupiter API timeout or error');
    status = status === 'healthy' ? 'degraded' : status;
    console.error('❌ Jupiter API health check failed:', error);
  }

  const response: HealthResponse = {
    status,
    rpcLatency,
    jupiterApiStatus,
    timestamp: Date.now(),
  };

  if (rpcEndpoint) {
    response.rpcEndpoint = rpcEndpoint;
  }

  if (errors.length > 0) {
    response.errors = errors;
  }

  const statusCode = status === 'unhealthy' ? 503 : 200;

  console.log(`🏥 Health check: ${status} (${statusCode})`);

  return NextResponse.json(response, { status: statusCode });
}
