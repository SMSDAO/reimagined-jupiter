import { NextRequest, NextResponse } from "next/server";
import { createResilientConnection } from "@/lib/solana/connection";

/**
 * GET /api/admin/status
 *
 * Get system status including RPC health using resilient connection
 */
export async function GET(request: NextRequest) {
  console.log("🔧 Checking system status...");

  // Create resilient connection
  const resilientConnection = createResilientConnection();

  try {
    // Get current slot
    const startTime = Date.now();
    const slot = await resilientConnection.getSlot();
    const latency = Date.now() - startTime;

    console.log(`✅ RPC latency: ${latency}ms`);
    console.log(`✅ Current slot: ${slot}`);

    // Get endpoint health
    const endpointHealth = resilientConnection.getEndpointHealth();

    // Get recent prioritization fees to check network conditions
    const recentFees = await resilientConnection.getRecentPrioritizationFees();
    const avgFee =
      recentFees.length > 0
        ? recentFees.reduce((sum, f) => sum + f.prioritizationFee, 0) /
          recentFees.length
        : 0;

    // Cleanup
    resilientConnection.destroy();

    return NextResponse.json({
      success: true,
      status: "operational",
      rpc: {
        currentEndpoint: resilientConnection.getCurrentEndpoint(),
        latency,
        currentSlot: slot,
        endpoints: endpointHealth.map((e) => ({
          url: e.url,
          isHealthy: e.isHealthy,
          failureCount: e.failureCount,
          lastChecked: e.lastChecked,
        })),
        healthyCount: endpointHealth.filter((e) => e.isHealthy).length,
        totalCount: endpointHealth.length,
      },
      network: {
        averagePriorityFee: Math.round(avgFee),
        networkCongestion:
          avgFee > 100000 ? "high" : avgFee > 10000 ? "medium" : "low",
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Status check error:", error);
    resilientConnection.destroy();

    const errorMessage =
      error instanceof Error ? error.message : "Status check failed";
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: errorMessage,
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/status
 *
 * Trigger manual health check of all RPC endpoints
 */
export async function POST(request: NextRequest) {
  console.log("🏥 Running manual RPC health check...");

  // Create resilient connection
  const resilientConnection = createResilientConnection();

  try {
    // Get endpoint health before check
    const beforeHealth = resilientConnection.getEndpointHealth();

    // Wait a moment for health checks to run
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get endpoint health after check
    const afterHealth = resilientConnection.getEndpointHealth();

    const results = afterHealth.map((endpoint, index) => ({
      url: endpoint.url,
      wasHealthy: beforeHealth[index].isHealthy,
      isHealthy: endpoint.isHealthy,
      statusChanged: beforeHealth[index].isHealthy !== endpoint.isHealthy,
      failureCount: endpoint.failureCount,
    }));

    // Cleanup
    resilientConnection.destroy();

    return NextResponse.json({
      success: true,
      message: "Health check completed",
      results,
      healthyCount: results.filter((r) => r.isHealthy).length,
      totalCount: results.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Health check error:", error);
    resilientConnection.destroy();

    const errorMessage =
      error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
