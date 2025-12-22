/**
 * Admin Authentication & Authorization Middleware
 * 
 * Provides secure JWT-based authentication and role-based access control (RBAC)
 * for admin panel API routes.
 * 
 * Security Features:
 * - JWT access tokens (short-lived, 15 minutes)
 * - Refresh tokens (long-lived, 7 days)
 * - Server-side authorization checks
 * - Audit logging for all admin actions
 * - Rate limiting per user
 * - IP-based security monitoring
 * - Brute force protection
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Type definitions (avoiding database module import for webapp build)
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AdminPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  isDangerous: boolean;
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const JWT_REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// In-memory storage (use Redis in production)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * JWT Token Payload Interface
 */
export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * Auth Context Interface
 */
export interface AuthContext {
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
  ipAddress: string;
  userAgent: string;
  requestId: string;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('⚠️ Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn('⚠️ Invalid access token');
    }
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Generate request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Check login attempts (brute force protection)
 */
export function checkLoginAttempts(identifier: string): { allowed: boolean; remaining: number; lockDuration?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    loginAttempts.set(identifier, {
      count: 0,
      resetTime: now + LOGIN_ATTEMPT_WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }
  
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const lockRemaining = Math.ceil((record.resetTime - now) / 1000 / 60);
    return {
      allowed: false,
      remaining: 0,
      lockDuration: lockRemaining,
    };
  }
  
  return {
    allowed: true,
    remaining: MAX_LOGIN_ATTEMPTS - record.count,
  };
}

/**
 * Record login attempt
 */
export function recordLoginAttempt(identifier: string, success: boolean): void {
  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(identifier);
    return;
  }
  
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  
  if (!record || now > record.resetTime) {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: now + LOGIN_ATTEMPT_WINDOW_MS,
    });
  } else {
    record.count++;
  }
}

/**
 * Check rate limit for admin operations
 */
export function checkRateLimit(identifier: string, maxRequests: number = 60, windowMs: number = 60000): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Authenticate request and extract auth context
 */
export function authenticate(request: NextRequest): AuthContext | null {
  const token = extractBearerToken(request);
  
  if (!token) {
    return null;
  }
  
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return null;
  }
  
  return {
    user: {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    requestId: generateRequestId(),
  };
}

/**
 * Check if user has required permission
 */
export function hasPermission(auth: AuthContext, permission: string): boolean {
  return auth.user.permissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(auth: AuthContext, permissions: string[]): boolean {
  return permissions.some(p => auth.user.permissions.includes(p));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(auth: AuthContext, permissions: string[]): boolean {
  return permissions.every(p => auth.user.permissions.includes(p));
}

/**
 * Check if user has required role
 */
export function hasRole(auth: AuthContext, role: string): boolean {
  return auth.user.roles.includes(role);
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(auth: AuthContext, roles: string[]): boolean {
  return roles.some(r => auth.user.roles.includes(r));
}

/**
 * Authentication middleware wrapper
 */
export function requireAuth(
  handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = authenticate(request);
    
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          message: 'Please provide a valid access token',
        },
        { status: 401 }
      );
    }
    
    // Check rate limit
    const rateLimit = checkRateLimit(auth.user.id);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    
    try {
      return await handler(request, auth);
    } catch (error) {
      console.error('❌ Handler error:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Authorization middleware wrapper (requires specific permissions)
 */
export function requirePermissions(permissions: string[]) {
  return (handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>) => {
    return requireAuth(async (request: NextRequest, auth: AuthContext) => {
      // Check if user has all required permissions
      if (!hasAllPermissions(auth, permissions)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            message: `Required permissions: ${permissions.join(', ')}`,
            requiredPermissions: permissions,
            userPermissions: auth.user.permissions,
          },
          { status: 403 }
        );
      }
      
      return await handler(request, auth);
    });
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRoles(roles: string[]) {
  return (handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>) => {
    return requireAuth(async (request: NextRequest, auth: AuthContext) => {
      // Check if user has any of the required roles
      if (!hasAnyRole(auth, roles)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient privileges',
            message: `Required roles: ${roles.join(', ')}`,
            requiredRoles: roles,
            userRoles: auth.user.roles,
          },
          { status: 403 }
        );
      }
      
      return await handler(request, auth);
    });
  };
}

/**
 * Audit logging wrapper
 */
export function withAudit(options: {
  action: string;
  resource: string;
}) {
  return (handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>) => {
    return requireAuth(async (request: NextRequest, auth: AuthContext) => {
      const startTime = Date.now();
      
      let response: NextResponse;
      let success = false;
      let errorMessage: string | undefined;
      
      try {
        response = await handler(request, auth);
        success = response.status >= 200 && response.status < 400;
        
        return response;
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        
        // Log audit event (async, don't wait)
        logAuditEvent({
          userId: auth.user.id,
          username: auth.user.username,
          action: options.action,
          resource: options.resource,
          method: request.method,
          endpoint: request.url,
          success,
          errorMessage,
          ipAddress: auth.ipAddress,
          userAgent: auth.userAgent,
          requestId: auth.requestId,
          durationMs: duration,
        }).catch(err => {
          console.error('❌ Failed to log audit event:', err);
        });
      }
    });
  };
}

/**
 * Log audit event (async)
 */
async function logAuditEvent(data: {
  userId: string;
  username: string;
  action: string;
  resource: string;
  method: string;
  endpoint: string;
  success: boolean;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  durationMs: number;
}): Promise<void> {
  try {
    // TODO: When database is connected, use:
    // await createAuditLog(data);
    
    // For now, log to console
    console.log('📝 Audit:', {
      user: data.username,
      action: data.action,
      resource: data.resource,
      success: data.success,
      duration: `${data.durationMs}ms`,
      ip: data.ipAddress,
    });
  } catch (error) {
    console.error('❌ Audit logging failed:', error);
  }
}

/**
 * Validate input against a schema
 */
export function validateInput<T>(
  input: any,
  schema: {
    [K in keyof T]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: RegExp;
      enum?: any[];
      custom?: (value: any) => boolean;
    };
  }
): { valid: boolean; errors: string[]; data?: T } {
  const errors: string[] = [];
  const data: any = {};
  
  for (const [key, rulesObj] of Object.entries(schema)) {
    const rules = rulesObj as {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: RegExp;
      enum?: any[];
      custom?: (value: any) => boolean;
    };
    const value = input[key];
    
    // Check required
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }
    
    // Skip validation if not required and no value
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      errors.push(`${key} must be a ${rules.type}`);
      continue;
    }
    
    // String validations
    if (rules.type === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        errors.push(`${key} must be at least ${rules.min} characters`);
      }
      if (rules.max !== undefined && value.length > rules.max) {
        errors.push(`${key} must be at most ${rules.max} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
      }
    }
    
    // Number validations
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
    }
    
    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      errors.push(`${key} validation failed`);
    }
    
    data[key] = value;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data as T : undefined,
  };
}

/**
 * Sanitize URL to prevent SSRF attacks
 */
export function sanitizeUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow https
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }
    
    // Block private IP ranges
    const hostname = parsed.hostname;
    
    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }
    
    // Block private IP ranges (simplified check)
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
      return { valid: false, error: 'Private IP ranges are not allowed' };
    }
    
    // Block metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { valid: false, error: 'Metadata endpoints are not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authenticate,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  requireAuth,
  requirePermissions,
  requireRoles,
  withAudit,
  validateInput,
  sanitizeUrl,
  getClientIp,
  getUserAgent,
  checkLoginAttempts,
  recordLoginAttempt,
};
