/**
 * Admin authentication endpoint
 * Implements JWT-based authentication with rate limiting
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AuthRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
}

// Rate limiting storage (in-memory for serverless)
// In production, use Redis or Vercel KV
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

// Rate limit: 5 attempts per 15 minutes
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, {
      attempts: 1,
      resetTime: now + WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  
  if (record.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  
  record.attempts++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.attempts };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
  
  try {
    // Get client IP for rate limiting
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               (req.headers['x-real-ip'] as string) || 
               'unknown';
    
    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
      });
    }
    
    console.log(`🔐 Login attempt from IP: ${ip} (${rateLimit.remaining} attempts remaining)`);
    
    // Parse request body
    const body = req.body as AuthRequest;
    const { username, password } = body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }
    
    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!adminUsername || !adminPassword || !jwtSecret) {
      console.error('❌ Admin credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }
    
    // Verify username
    if (username !== adminUsername) {
      console.warn(`⚠️ Invalid username attempt: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    
    // Verify password
    // Support both hashed and plain passwords for easier setup
    let passwordValid = false;
    
    if (adminPassword.startsWith('$2b$') || adminPassword.startsWith('$2a$')) {
      // Hashed password (bcrypt)
      passwordValid = await bcrypt.compare(password, adminPassword);
    } else {
      // Plain password (for development)
      passwordValid = password === adminPassword;
      console.warn('⚠️ Using plain text password. Hash your password for production!');
    }
    
    if (!passwordValid) {
      console.warn('⚠️ Invalid password attempt');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    
    // Generate JWT token (24 hour expiration)
    const expiresIn = 24 * 60 * 60; // 24 hours in seconds
    const token = jwt.sign(
      {
        username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      { expiresIn }
    );
    
    console.log(`✅ Login successful for user: ${username}`);
    
    return res.status(200).json({
      success: true,
      token,
      expiresIn,
    });
  } catch (error) {
    console.error('❌ Auth error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Utility function to hash passwords (for setup scripts)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Utility function to verify JWT token (for other endpoints)
 */
export function verifyToken(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return { valid: false, error: 'JWT_SECRET not configured' };
    }
    
    const payload = jwt.verify(token, jwtSecret);
    return { valid: true, payload };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';
    return { valid: false, error: errorMessage };
  }
}
