import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/../../src/services/auditLogger';

/**
 * Admin Audit Logs API
 * 
 * Provides access to audit logs for monitoring and compliance
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/audit-logs
 * Retrieve audit logs with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');

    let logs;
    let stats;

    switch (action) {
      case 'stats':
        // Get statistics only
        stats = auditLog.getStatistics();
        return NextResponse.json({
          success: true,
          stats,
          timestamp: new Date().toISOString(),
        });

      case 'export-json':
        // Export all logs as JSON
        const jsonData = auditLog.exportLogs();
        return new NextResponse(jsonData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.json"`,
          },
        });

      case 'export-csv':
        // Export all logs as CSV
        const csvData = auditLog.exportLogsCSV();
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
          },
        });

      case 'recent':
      default:
        // Get recent logs
        logs = auditLog.getRecentLogs(limit);
        stats = auditLog.getStatistics();
        
        return NextResponse.json({
          success: true,
          logs,
          stats,
          count: logs.length,
          timestamp: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('[Admin API] Audit logs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
