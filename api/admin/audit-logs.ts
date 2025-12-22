/**
 * Admin Audit Log Endpoint
 * View and filter wallet governance audit logs
 * 
 * SECURITY:
 * - Admin authentication required
 * - RBAC enforced
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../../lib/auth.js';
import { getAuditLogs } from '../../db/database.js';

/**
 * Verify admin authentication
 */
function verifyAdminAuth(req: VercelRequest): {
  valid: boolean;
  error?: string;
} {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Missing or invalid authorization header',
    };
  }
  
  const token = authHeader.substring(7);
  const verification = verifyToken(token);
  
  if (!verification.valid) {
    return {
      valid: false,
      error: verification.error || 'Invalid token',
    };
  }
  
  // Check if user has admin role
  if (verification.payload?.role !== 'admin') {
    return {
      valid: false,
      error: 'Insufficient permissions. Admin access required.',
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * Main handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type'
  );
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
  
  // Verify admin authentication
  const auth = verifyAdminAuth(req);
  
  if (!auth.valid) {
    return res.status(403).json({
      success: false,
      error: auth.error || 'Unauthorized',
    });
  }
  
  try {
    // Parse query parameters
    const {
      userId,
      subWalletId,
      eventType,
      status,
      startDate,
      endDate,
      limit = '100',
      offset = '0',
    } = req.query;
    
    // Build filters
    const filters: any = {};
    
    if (userId && typeof userId === 'string') {
      filters.userId = userId;
    }
    
    if (subWalletId && typeof subWalletId === 'string') {
      filters.subWalletId = subWalletId;
    }
    
    if (eventType && typeof eventType === 'string') {
      filters.eventType = eventType;
    }
    
    if (status && typeof status === 'string') {
      filters.status = status;
    }
    
    if (startDate && typeof startDate === 'string') {
      filters.startDate = new Date(startDate);
    }
    
    if (endDate && typeof endDate === 'string') {
      filters.endDate = new Date(endDate);
    }
    
    // Parse pagination parameters
    const limitNum = parseInt(limit as string, 10) || 100;
    const offsetNum = parseInt(offset as string, 10) || 0;
    
    // Validate pagination
    if (limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 1000',
      });
    }
    
    if (offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be non-negative',
      });
    }
    
    // Get audit logs
    const logs = await getAuditLogs(filters, limitNum, offsetNum);
    
    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: logs.length,
      },
      filters,
    });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
