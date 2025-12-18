/**
 * Real-time metrics endpoint for admin dashboard
 * Returns comprehensive trading metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './auth.js';
import { getBotStatus } from './control.js';

interface MetricsResponse {
  success: boolean;
  metrics: {
    profitToday: number;
    profitWeek: number;
    profitMonth: number;
    profitAll: number;
    tradesCount: number;
    successRate: number;
    avgProfit: number;
    opportunities24h: number;
    avgExecutionTime: number;
    rpcHealth: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency: number;
      uptime: number;
    };
    gasUsed: number;
    activeStrategies: string[];
    liveOpportunities: Array<{
      id: string;
      type: string;
      profit: number;
      confidence: number;
      age: number;
    }>;
  };
  timestamp: number;
  error?: string;
}

// In-memory metrics storage (in production, use database)
interface MetricsData {
  trades: Array<{
    timestamp: number;
    profit: number;
    success: boolean;
    executionTime: number;
    gasUsed: number;
  }>;
  opportunities: Array<{
    id: string;
    type: string;
    profit: number;
    confidence: number;
    timestamp: number;
  }>;
}

const metricsData: MetricsData = {
  trades: [],
  opportunities: [],
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<MetricsResponse>
) {
  try {
    // Verify JWT authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        metrics: {} as any,
        timestamp: Date.now(),
        error: 'Authentication required',
      });
    }
    
    const token = authHeader.substring(7);
    const verification = verifyToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        metrics: {} as any,
        timestamp: Date.now(),
        error: verification.error || 'Invalid token',
      });
    }
    
    console.log(`📊 Metrics request from admin: ${verification.payload.username}`);
    
    // Calculate time windows
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Filter trades by time window
    const tradesLast24h = metricsData.trades.filter(t => t.timestamp >= oneDayAgo);
    const tradesLastWeek = metricsData.trades.filter(t => t.timestamp >= oneWeekAgo);
    const tradesLastMonth = metricsData.trades.filter(t => t.timestamp >= oneMonthAgo);
    
    // Calculate profits
    const profitToday = tradesLast24h
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.profit, 0);
    
    const profitWeek = tradesLastWeek
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.profit, 0);
    
    const profitMonth = tradesLastMonth
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.profit, 0);
    
    const profitAll = metricsData.trades
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.profit, 0);
    
    // Calculate success rate
    const tradesCount = metricsData.trades.length;
    const successCount = metricsData.trades.filter(t => t.success).length;
    const successRate = tradesCount > 0 ? (successCount / tradesCount) * 100 : 0;
    
    // Calculate average profit
    const avgProfit = successCount > 0 ? profitAll / successCount : 0;
    
    // Count opportunities in last 24h
    const opportunities24h = metricsData.opportunities.filter(
      o => o.timestamp >= oneDayAgo
    ).length;
    
    // Calculate average execution time
    const avgExecutionTime = metricsData.trades.length > 0
      ? metricsData.trades.reduce((sum, t) => sum + t.executionTime, 0) / metricsData.trades.length
      : 0;
    
    // Calculate total gas used
    const gasUsed = metricsData.trades.reduce((sum, t) => sum + t.gasUsed, 0);
    
    // Get bot status for active strategies
    const botStatus = getBotStatus();
    const activeStrategies = botStatus.running
      ? ['arbitrage', 'flash-loan', 'triangular']
      : [];
    
    // Get RPC health
    let rpcHealth = {
      status: 'healthy' as const,
      latency: 0,
      uptime: botStatus.uptime,
    };
    
    try {
      const { Connection } = await import('@solana/web3.js');
      const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
      
      if (rpcUrl) {
        const connection = new Connection(rpcUrl, 'confirmed');
        const start = Date.now();
        await connection.getSlot();
        rpcHealth.latency = Date.now() - start;
        
        if (rpcHealth.latency > 1000) {
          rpcHealth.status = 'degraded';
        }
      }
    } catch (error) {
      rpcHealth.status = 'unhealthy';
      console.error('RPC health check failed:', error);
    }
    
    // Get live opportunities (last 5 minutes)
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const liveOpportunities = metricsData.opportunities
      .filter(o => o.timestamp >= fiveMinutesAgo)
      .map(o => ({
        id: o.id,
        type: o.type,
        profit: o.profit,
        confidence: o.confidence,
        age: Math.floor((now - o.timestamp) / 1000),
      }))
      .slice(0, 10); // Limit to 10 most recent
    
    return res.status(200).json({
      success: true,
      metrics: {
        profitToday: parseFloat(profitToday.toFixed(4)),
        profitWeek: parseFloat(profitWeek.toFixed(4)),
        profitMonth: parseFloat(profitMonth.toFixed(4)),
        profitAll: parseFloat(profitAll.toFixed(4)),
        tradesCount,
        successRate: parseFloat(successRate.toFixed(2)),
        avgProfit: parseFloat(avgProfit.toFixed(4)),
        opportunities24h,
        avgExecutionTime: parseFloat(avgExecutionTime.toFixed(2)),
        rpcHealth,
        gasUsed,
        activeStrategies,
        liveOpportunities,
      },
      timestamp: now,
    });
  } catch (error) {
    console.error('❌ Metrics error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics';
    
    return res.status(500).json({
      success: false,
      metrics: {} as any,
      timestamp: Date.now(),
      error: errorMessage,
    });
  }
}

/**
 * Add trade to metrics (exported for execute endpoint)
 */
export function recordTrade(trade: {
  profit: number;
  success: boolean;
  executionTime: number;
  gasUsed: number;
}) {
  metricsData.trades.push({
    timestamp: Date.now(),
    ...trade,
  });
  
  // Keep only last 1000 trades
  if (metricsData.trades.length > 1000) {
    metricsData.trades = metricsData.trades.slice(-1000);
  }
}

/**
 * Add opportunity to metrics (exported for monitor endpoint)
 */
export function recordOpportunity(opportunity: {
  id: string;
  type: string;
  profit: number;
  confidence: number;
}) {
  metricsData.opportunities.push({
    timestamp: Date.now(),
    ...opportunity,
  });
  
  // Keep only last 1000 opportunities
  if (metricsData.opportunities.length > 1000) {
    metricsData.opportunities = metricsData.opportunities.slice(-1000);
  }
}
