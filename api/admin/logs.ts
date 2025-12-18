/**
 * Log viewing endpoint
 * Supports pagination, filtering, and export
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './auth.js';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'trade' | 'opportunity';
  message: string;
  metadata?: Record<string, any>;
}

interface LogsRequest {
  page?: number;
  limit?: number;
  level?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  export?: 'json' | 'csv';
}

interface LogsResponse {
  success: boolean;
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  timestamp: number;
  error?: string;
}

// In-memory log storage (in production, use database or log aggregation service)
const logsStore: LogEntry[] = [];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<LogsResponse | string>
) {
  try {
    // Verify JWT authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
        timestamp: Date.now(),
        error: 'Authentication required',
      });
    }
    
    const token = authHeader.substring(7);
    const verification = verifyToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
        timestamp: Date.now(),
        error: verification.error || 'Invalid token',
      });
    }
    
    console.log(`📜 Logs request from admin: ${verification.payload.username}`);
    
    // Parse query parameters
    const query = req.query as LogsRequest;
    const page = parseInt(query.page?.toString() || '1');
    const limit = Math.min(parseInt(query.limit?.toString() || '50'), 100);
    const level = query.level;
    const type = query.type;
    const startDate = query.startDate ? new Date(query.startDate).getTime() : undefined;
    const endDate = query.endDate ? new Date(query.endDate).getTime() : undefined;
    const search = query.search?.toLowerCase();
    const exportFormat = query.export;
    
    // Filter logs
    let filteredLogs = [...logsStore];
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (type) {
      filteredLogs = filteredLogs.filter(log => 
        log.metadata?.type === type || log.level === type
      );
    }
    
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate);
    }
    
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate);
    }
    
    if (search) {
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(search) ||
        JSON.stringify(log.metadata).toLowerCase().includes(search)
      );
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    const total = filteredLogs.length;
    
    // Handle export
    if (exportFormat) {
      if (exportFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=logs.json');
        return res.status(200).send(JSON.stringify(filteredLogs, null, 2));
      }
      
      if (exportFormat === 'csv') {
        const csv = convertToCSV(filteredLogs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
        return res.status(200).send(csv);
      }
    }
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    const hasMore = endIndex < total;
    
    return res.status(200).json({
      success: true,
      logs: paginatedLogs,
      total,
      page,
      limit,
      hasMore,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Logs error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch logs';
    
    return res.status(500).json({
      success: false,
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      hasMore: false,
      timestamp: Date.now(),
      error: errorMessage,
    });
  }
}

/**
 * Convert logs to CSV format
 */
function convertToCSV(logs: LogEntry[]): string {
  const headers = ['Timestamp', 'Level', 'Message', 'Metadata'];
  const rows = logs.map(log => [
    new Date(log.timestamp).toISOString(),
    log.level,
    log.message.replace(/"/g, '""'), // Escape quotes
    JSON.stringify(log.metadata || {}).replace(/"/g, '""'),
  ]);
  
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ];
  
  return csvRows.join('\n');
}

/**
 * Add log entry (exported for other modules)
 */
export function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  const logEntry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    ...entry,
  };
  
  logsStore.push(logEntry);
  
  // Keep only last 10,000 logs in memory
  if (logsStore.length > 10000) {
    logsStore.splice(0, logsStore.length - 10000);
  }
  
  // Also log to console
  const prefix = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
  }[entry.level] || 'ℹ️';
  
  console.log(`${prefix} [${entry.level.toUpperCase()}] ${entry.message}`, entry.metadata || '');
}

/**
 * Convenience logging functions
 */
export const logger = {
  info: (message: string, metadata?: Record<string, any>) => {
    addLog({ level: 'info', message, metadata });
  },
  warn: (message: string, metadata?: Record<string, any>) => {
    addLog({ level: 'warn', message, metadata });
  },
  error: (message: string, metadata?: Record<string, any>) => {
    addLog({ level: 'error', message, metadata });
  },
  trade: (message: string, metadata?: Record<string, any>) => {
    addLog({ level: 'trade', message, metadata });
  },
  opportunity: (message: string, metadata?: Record<string, any>) => {
    addLog({ level: 'opportunity', message, metadata });
  },
};
