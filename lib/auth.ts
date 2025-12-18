/**
 * Authentication utilities
 * JWT token generation, verification, and password hashing
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// JWT configuration
const JWT_EXPIRATION = '24h';
const BCRYPT_ROUNDS = 10;

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
 * Generate a JWT token
 */
export function generateToken(
  payload: Record<string, any>,
  options?: { expiresIn?: string }
): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
    },
    jwtSecret,
    {
      expiresIn: options?.expiresIn || JWT_EXPIRATION,
    }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): {
  valid: boolean;
  payload?: any;
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
    
    const payload = jwt.verify(token, jwtSecret);
    
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
};
