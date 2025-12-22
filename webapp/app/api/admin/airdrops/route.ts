import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/../../db/database';

/**
 * GET /api/admin/airdrops
 * 
 * Admin endpoint to view all airdrop claims (audit log)
 * 
 * Query parameters:
 * - status: Filter by status (optional): pending, success, failed, simulated
 * - limit: Number of results (default: 100, max: 500)
 * - wallet: Filter by wallet address (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Basic authentication check (should be enhanced with proper auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const wallet = searchParams.get('wallet') || undefined;

    console.log('👨‍💼 Admin: Fetching airdrop claims audit log');
    console.log(`   Status filter: ${status || 'all'}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Wallet filter: ${wallet || 'all'}`);

    let claims;
    if (wallet) {
      claims = await db.getAirdropClaims(wallet, limit);
    } else {
      claims = await db.getAllAirdropClaims(status, limit);
    }

    // Calculate statistics
    const stats = {
      total: claims.length,
      pending: claims.filter(c => c.status === 'pending').length,
      success: claims.filter(c => c.status === 'success').length,
      failed: claims.filter(c => c.status === 'failed').length,
      simulated: claims.filter(c => c.status === 'simulated').length,
    };

    // Calculate total claimed amounts by protocol
    const byProtocol: Record<string, { count: number; total: number }> = {};
    claims.forEach(claim => {
      if (!byProtocol[claim.protocol]) {
        byProtocol[claim.protocol] = { count: 0, total: 0 };
      }
      byProtocol[claim.protocol].count++;
      if (claim.status === 'success') {
        byProtocol[claim.protocol].total += parseFloat(claim.amount);
      }
    });

    console.log(`✅ Retrieved ${claims.length} claim records`);

    return NextResponse.json({
      success: true,
      claims,
      stats,
      byProtocol,
      filters: {
        status: status || 'all',
        limit,
        wallet: wallet || 'all',
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Admin airdrop claims fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Fetch failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
