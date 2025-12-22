/**
 * Admin Authentication & Authorization Utilities
 * Server-side only - handles JWT validation, RBAC, and audit logging
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Import from root lib (shared utilities)
import { verifyToken, extractTokenFromHeader } from '../../lib/auth.js';

/**
 * Admin Role Types
 */
export type AdminRole = 'admin' | 'operator' | 'viewer';

/**
 * Admin User Session
 */
export interface AdminSession {
  userId: string;
  username: string;
  role: AdminRole;
  permissions: {
    canControlBot: boolean;
    canModifyConfig: boolean;
    canExecuteTrades: boolean;
    canViewLogs: boolean;
    canViewMetrics: boolean;
  };
  sessionId: string;
  expiresAt: number;
}

/**
 * Permission Check Result
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Audit Log Entry
 */
export interface AuditLogData {
  action: string;
  resource?: string;
  resourceId?: string;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
}

/**
 * Extract and verify admin session from request
 * Returns null if authentication fails
 */
export async function getAdminSession(
  request: NextRequest
): Promise<AdminSession | null> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || undefined);

    if (!token) {
      return null;
    }

    // Verify JWT token
    const verification = verifyToken(token);

    if (!verification.valid || !verification.payload) {
      return null;
    }

    const payload = verification.payload;

    // Validate required fields
    if (!payload.userId || !payload.username || !payload.role) {
      return null;
    }

    // Check if session is expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    // Build session object
    const session: AdminSession = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      permissions: {
        canControlBot: payload.canControlBot || false,
        canModifyConfig: payload.canModifyConfig || false,
        canExecuteTrades: payload.canExecuteTrades || false,
        canViewLogs: payload.canViewLogs || false,
        canViewMetrics: payload.canViewMetrics || false,
      },
      sessionId: payload.sessionId || '',
      expiresAt: payload.exp || 0,
    };

    return session;
  } catch (error) {
    console.error('Error extracting admin session:', error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export function checkPermission(
  session: AdminSession,
  permission: keyof AdminSession['permissions']
): PermissionCheck {
  // Admin role has all permissions
  if (session.role === 'admin') {
    return { allowed: true };
  }

  // Check specific permission
  if (!session.permissions[permission]) {
    return {
      allowed: false,
      reason: `User does not have '${permission}' permission`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user has required role
 */
export function checkRole(
  session: AdminSession,
  requiredRole: AdminRole | AdminRole[]
): PermissionCheck {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes(session.role)) {
    return {
      allowed: false,
      reason: `User role '${session.role}' is not authorized. Required: ${roles.join(' or ')}`,
    };
  }

  return { allowed: true };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AdminSession> {
  const session = await getAdminSession(request);

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
}

/**
 * Require specific permission - throws if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  permission: keyof AdminSession['permissions']
): Promise<AdminSession> {
  const session = await requireAuth(request);
  const check = checkPermission(session, permission);

  if (!check.allowed) {
    throw new Error(check.reason || 'Permission denied');
  }

  return session;
}

/**
 * Require specific role - throws if not authorized
 */
export async function requireRole(
  request: NextRequest,
  role: AdminRole | AdminRole[]
): Promise<AdminSession> {
  const session = await requireAuth(request);
  const check = checkRole(session, role);

  if (!check.allowed) {
    throw new Error(check.reason || 'Insufficient role');
  }

  return session;
}

/**
 * Log admin action to audit log
 * This should be called after every admin action
 */
export async function logAdminAction(
  session: AdminSession | null,
  request: NextRequest,
  data: AuditLogData
): Promise<void> {
  try {
    // Extract request metadata
    const method = request.method;
    const endpoint = request.nextUrl.pathname;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Build audit log entry
    const auditLog = {
      userId: session?.userId,
      username: session?.username,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      method,
      endpoint,
      ipAddress,
      userAgent,
      requestData: data.requestData,
      responseData: data.responseData,
      status: data.status,
      errorMessage: data.errorMessage,
      timestamp: new Date().toISOString(),
    };

    // Log to console (in production, send to database or log service)
    console.log('🔐 AUDIT LOG:', JSON.stringify(auditLog));

    // In production, save to database:
    // await createAuditLog(auditLog);
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw - audit logging failures should not block the main operation
  }
}

/**
 * Hash token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Check common headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}

/**
 * Sanitize sensitive data before logging
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (!data) return data;

  const sanitized = { ...data as Record<string, unknown> };
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'privateKey',
    'secret',
    'token',
    'apiKey',
    'mnemonic',
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Validate input using simple validation rules
 * For complex validation, use Zod schemas
 */
export function validateInput(
  input: Record<string, unknown>,
  rules: {
    required?: string[];
    maxLength?: Record<string, number>;
    minLength?: Record<string, number>;
    pattern?: Record<string, RegExp>;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (rules.required) {
    for (const field of rules.required) {
      if (!input[field] || input[field] === '') {
        errors.push(`Field '${field}' is required`);
      }
    }
  }

  // Check max length
  if (rules.maxLength) {
    for (const [field, maxLen] of Object.entries(rules.maxLength)) {
      if (input[field] && input[field].length > maxLen) {
        errors.push(`Field '${field}' must be at most ${maxLen} characters`);
      }
    }
  }

  // Check min length
  if (rules.minLength) {
    for (const [field, minLen] of Object.entries(rules.minLength)) {
      if (input[field] && input[field].length < minLen) {
        errors.push(`Field '${field}' must be at least ${minLen} characters`);
      }
    }
  }

  // Check patterns
  if (rules.pattern) {
    for (const [field, pattern] of Object.entries(rules.pattern)) {
      if (input[field] && !pattern.test(input[field])) {
        errors.push(`Field '${field}' has invalid format`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiter for admin endpoints
 * In-memory implementation - use Redis in production
 */
class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private maxAttempts: number = 10,
    private windowMs: number = 60 * 1000 // 1 minute
  ) {}

  /**
   * Check if identifier has exceeded rate limit
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      return false;
    }

    return record.count >= this.maxAttempts;
  }

  /**
   * Record an attempt
   */
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
    } else {
      record.count++;
    }
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier);

    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - record.count);
  }

  /**
   * Reset attempts for identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global rate limiter instances
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const adminApiRateLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute

export default {
  getAdminSession,
  requireAuth,
  requirePermission,
  requireRole,
  checkPermission,
  checkRole,
  logAdminAction,
  hashToken,
  getClientIp,
  sanitizeForLogging,
  validateInput,
  authRateLimiter,
  adminApiRateLimiter,
};
