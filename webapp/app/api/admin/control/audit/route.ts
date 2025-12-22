/**
 * Admin Audit Logs API Route
 * GET /api/admin/control/audit
 * 
 * Retrieves audit logs with filtering and pagination
 * 
 * Security:
 * - Requires authentication
 * - Requires audit:view permission
 * - Supports filtering by user, action, resource, date range
 * - Supports export functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermissions,
  type AuthContext,
} from '@/lib/adminAuth';

// In-memory audit logs (in production, use database)
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action: string;
  resource: string;
  method?: string;
  endpoint?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  oldValue?: any;
  newValue?: any;
}

const auditLogs: AuditLog[] = [
  // Sample log entries (will be populated by actual operations)
];

async function getAuditLogsHandler(request: NextRequest, auth: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const success = searchParams.get('success');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const exportFormat = searchParams.get('export') as 'json' | 'csv' | null;
    
    // Filter logs
    let filteredLogs = [...auditLogs];
    
    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }
    
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }
    
    if (resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === resource);
    }
    
    if (success !== null) {
      const successBool = success === 'true';
      filteredLogs = filteredLogs.filter(log => log.success === successBool);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp <= end);
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const total = filteredLogs.length;
    
    // Handle export
    if (exportFormat && auth.user.permissions.includes('audit:export')) {
      if (exportFormat === 'json') {
        return new NextResponse(JSON.stringify(filteredLogs, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename=audit-logs-${new Date().toISOString()}.json`,
          },
        });
      }
      
      if (exportFormat === 'csv') {
        const csv = convertToCSV(filteredLogs);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=audit-logs-${new Date().toISOString()}.csv`,
          },
        });
      }
    }
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    const hasMore = endIndex < total;
    
    return NextResponse.json({
      success: true,
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        userId,
        action,
        resource,
        success,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('❌ Audit logs error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(logs: AuditLog[]): string {
  const headers = [
    'Timestamp',
    'Username',
    'Action',
    'Resource',
    'Method',
    'Endpoint',
    'Success',
    'Error Message',
    'IP Address',
    'Duration (ms)',
  ];
  
  const rows = logs.map(log => [
    new Date(log.timestamp).toISOString(),
    log.username,
    log.action,
    log.resource,
    log.method || '',
    log.endpoint || '',
    log.success ? 'Yes' : 'No',
    log.errorMessage || '',
    log.ipAddress || '',
    log.durationMs?.toString() || '',
  ]);
  
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ];
  
  return csvRows.join('\n');
}

/**
 * Get audit log statistics
 */
async function getAuditStatsHandler(request: NextRequest, auth: AuthContext) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const last24h = auditLogs.filter(log => log.timestamp.getTime() >= oneDayAgo);
  const lastWeek = auditLogs.filter(log => log.timestamp.getTime() >= oneWeekAgo);
  
  // Count by action
  const actionCounts: Record<string, number> = {};
  auditLogs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });
  
  // Count by user
  const userCounts: Record<string, number> = {};
  auditLogs.forEach(log => {
    userCounts[log.username] = (userCounts[log.username] || 0) + 1;
  });
  
  // Count failures
  const failureCount = auditLogs.filter(log => !log.success).length;
  const failureRate = auditLogs.length > 0 ? (failureCount / auditLogs.length) * 100 : 0;
  
  return NextResponse.json({
    success: true,
    stats: {
      total: auditLogs.length,
      last24h: last24h.length,
      lastWeek: lastWeek.length,
      failureCount,
      failureRate: parseFloat(failureRate.toFixed(2)),
      topActions: Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => ({ action, count })),
      topUsers: Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([username, count]) => ({ username, count })),
    },
  });
}

export const GET = requirePermissions(['audit:view'])(getAuditLogsHandler);

// Export separate stats endpoint
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    }
  );
}
