/**
 * Authentication utilities
 * JWT token generation, verification, and password hashing
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// JWT configuration
const JWT_EXPIRATION = '24h';
const BCRYPT_ROUNDS = 10;

// User roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SERVICE = 'service',
}

// JWT payload interface
export interface JWTPayload {
  userId?: string;
  walletAddress?: string;
  role: UserRole;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token with role-based scoping
 */
export function generateToken(
  payload: JWTPayload,
  options?: { expiresIn?: string }
): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  // Ensure role is set (default to USER)
  const tokenPayload: JWTPayload = {
    ...payload,
    role: payload.role || UserRole.USER,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(
    tokenPayload,
    jwtSecret,
    {
      expiresIn: options?.expiresIn || JWT_EXPIRATION,
    }
  );
}

/**
 * Verify a JWT token with role validation
 */
export function verifyToken(token: string): {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
} {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      return {
        valid: false,
        error: 'JWT_SECRET not configured',
      };
    }
    
    const payload = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Validate role exists
    if (!payload.role || !Object.values(UserRole).includes(payload.role)) {
      return {
        valid: false,
        error: 'Invalid role in token',
      };
    }
    
    return {
      valid: true,
      payload,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token expired',
      };
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }
    
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

/**
 * Decode a JWT token without verification (useful for debugging)
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Generate a secure random secret (for JWT_SECRET)
 */
export function generateSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return secret;
}

/**
 * Check if password meets security requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiter for authentication attempts
 */
class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
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

// Global rate limiter instance
export const authRateLimiter = new RateLimiter();

/**
 * Create an API key (for service-to-service authentication)
 */
export function generateApiKey(): string {
  const prefix = 'gxq';
  const random = generateSecret(32);
  return `${prefix}_${random}`;
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  return /^gxq_[A-Za-z0-9]{32}$/.test(apiKey);
}

/**
 * Check if user has required role
 */
export function hasRole(payload: JWTPayload | undefined, requiredRole: UserRole): boolean {
  if (!payload || !payload.role) {
    return false;
  }
  
  // Admin has access to everything
  if (payload.role === UserRole.ADMIN) {
    return true;
  }
  
  return payload.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(payload: JWTPayload | undefined, requiredRoles: UserRole[]): boolean {
  if (!payload || !payload.role) {
    return false;
  }
  
  // Admin has access to everything
  if (payload.role === UserRole.ADMIN) {
    return true;
  }
  
  return requiredRoles.includes(payload.role);
}

/**
 * Check if user has specific permission
 */
export function hasPermission(payload: JWTPayload | undefined, permission: string): boolean {
  if (!payload) {
    return false;
  }
  
  // Admin has all permissions
  if (payload.role === UserRole.ADMIN) {
    return true;
  }
  
  return payload.permissions?.includes(permission) || false;
}

/**
 * Validate wallet ownership
 */
export function validateWalletOwnership(
  payload: JWTPayload | undefined,
  walletAddress: string
): boolean {
  if (!payload) {
    return false;
  }
  
  // Admin can access any wallet
  if (payload.role === UserRole.ADMIN) {
    return true;
  }
  
  // Check if the wallet address matches the one in the token
  return payload.walletAddress === walletAddress;
}

/**
 * Create authorization middleware result
 */
export interface AuthorizationResult {
  authorized: boolean;
  error?: string;
  payload?: JWTPayload;
}

/**
 * Authorize request with role check
 */
export function authorizeRequest(
  authHeader: string | undefined,
  requiredRoles?: UserRole[]
): AuthorizationResult {
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return {
      authorized: false,
      error: 'No authorization token provided',
    };
  }
  
  const verification = verifyToken(token);
  
  if (!verification.valid) {
    return {
      authorized: false,
      error: verification.error || 'Invalid token',
    };
  }
  
  // If no specific roles required, just check if token is valid
  if (!requiredRoles || requiredRoles.length === 0) {
    return {
      authorized: true,
      payload: verification.payload,
    };
  }
  
  // Check if user has required role
  if (!hasAnyRole(verification.payload, requiredRoles)) {
    return {
      authorized: false,
      error: 'Insufficient permissions',
    };
  }
  
  return {
    authorized: true,
    payload: verification.payload,
  };
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  generateSecret,
  validatePasswordStrength,
  authRateLimiter,
  generateApiKey,
  validateApiKey,
  hasRole,
  hasAnyRole,
  hasPermission,
  validateWalletOwnership,
  authorizeRequest,
  UserRole,
};
