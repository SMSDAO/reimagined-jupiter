import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Admin Portfolio Analytics API
 * 
 * Provides aggregated portfolio analytics for admin dashboard:
 * - Multiple wallet analysis
 * - Export functionality
 * - Batch scoring
 * - Audit logging
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Helper function to create Solana connection
 */
function createConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 
                 process.env.SOLANA_RPC_URL || 
                 'https://api.mainnet-beta.solana.com';
  
  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Quick wallet score calculation for batch operations
 */
async function quickScoreWallet(connection: Connection, address: string) {
  try {
    const publicKey = new PublicKey(address);
    
    // Fetch minimal data for scoring
    const [balance, signatures] = await Promise.all([
      connection.getBalance(publicKey),
      connection.getSignaturesForAddress(publicKey, { limit: 100 })
    ]);
    
    const totalTxs = signatures.length;
    const successCount = signatures.filter(sig => sig.err === null).length;
    const successRate = totalTxs > 0 ? (successCount / totalTxs) * 100 : 0;
    
    // Quick score calculation (0-100)
    let score = 0;
    
    // Balance component (max 30)
    const solBalance = balance / 1e9;
    if (solBalance >= 100) score += 30;
    else if (solBalance >= 10) score += 25;
    else if (solBalance >= 1) score += 20;
    else score += Math.min(20, solBalance * 10);
    
    // Transaction component (max 40)
    if (totalTxs >= 1000) score += 40;
    else if (totalTxs >= 100) score += 30;
    else if (totalTxs >= 10) score += 20;
    else score += Math.min(20, totalTxs * 2);
    
    // Success rate component (max 30)
    score += (successRate / 100) * 30;
    
    score = Math.round(Math.min(100, score));
    
    // Determine tier
    let tier = 'NOVICE';
    if (score >= 80) tier = 'WHALE';
    else if (score >= 65) tier = 'DEGEN';
    else if (score >= 50) tier = 'ACTIVE';
    else if (score >= 30) tier = 'CASUAL';
    
    return {
      address,
      score,
      tier,
      balance: solBalance,
      transactions: totalTxs,
      successRate: Math.round(successRate),
    };
  } catch (error) {
    console.error(`[Admin API] Error scoring wallet ${address}:`, error);
    return {
      address,
      score: 0,
      tier: 'NOVICE',
      balance: 0,
      transactions: 0,
      successRate: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST /api/admin/portfolio-analytics
 * Batch analyze multiple wallets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallets, action } = body;
    
    if (!wallets || !Array.isArray(wallets)) {
      return NextResponse.json(
        { error: 'Invalid request: wallets array required' },
        { status: 400 }
      );
    }
    
    const connection = createConnection();
    
    if (action === 'batch-score') {
      console.log(`[Admin API] Batch scoring ${wallets.length} wallets...`);
      
      const results = await Promise.all(
        wallets.map(wallet => quickScoreWallet(connection, wallet))
      );
      
      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      
      // Calculate aggregate stats
      const totalScore = results.reduce((sum, r) => sum + r.score, 0);
      const avgScore = results.length > 0 ? totalScore / results.length : 0;
      
      const tierCounts = results.reduce((acc, r) => {
        acc[r.tier] = (acc[r.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return NextResponse.json({
        success: true,
        results,
        stats: {
          total: results.length,
          avgScore: Math.round(avgScore),
          tierCounts,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    if (action === 'export') {
      console.log(`[Admin API] Exporting portfolio data for ${wallets.length} wallets...`);
      
      const results = await Promise.all(
        wallets.map(wallet => quickScoreWallet(connection, wallet))
      );
      
      // Create CSV export
      const csvHeader = 'Address,Score,Tier,Balance (SOL),Transactions,Success Rate (%)';
      const csvRows = results.map(r => 
        `${r.address},${r.score},${r.tier},${r.balance},${r.transactions},${r.successRate}`
      );
      const csv = [csvHeader, ...csvRows].join('\n');
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="portfolio-analytics-${Date.now()}.csv"`,
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Supported: batch-score, export' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[Admin API] Portfolio analytics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process portfolio analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/portfolio-analytics
 * Get portfolio analytics dashboard stats
 */
export async function GET(_request: NextRequest) {
  try {
    // In production, this would query database for aggregated stats
    // For now, return placeholder stats
    
    return NextResponse.json({
      success: true,
      stats: {
        totalWalletsAnalyzed: 0,
        avgPortfolioValue: 0,
        totalVolume: 0,
        topTier: 'WHALE',
        topTierCount: 0,
      },
      recentAnalyses: [],
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Admin API] Get portfolio analytics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch portfolio analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
