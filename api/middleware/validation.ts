/**
 * API Request Validation Middleware
 * Provides comprehensive input validation for all API endpoints
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'solana-address';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate Solana public key address
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    // Base58 check - should be 32-44 characters
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a single field against a rule
 */
function validateField(value: any, rule: ValidationRule): ValidationErrorDetail | null {
  const { field, type, required, min, max, pattern, enum: enumValues, custom } = rule;

  // Check if required
  if (required && (value === undefined || value === null || value === '')) {
    return {
      field,
      message: `${field} is required`,
    };
  }

  // Skip validation if not required and value is empty
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: `${field} must be a string`, value };
      }
      if (min !== undefined && value.length < min) {
        return { field, message: `${field} must be at least ${min} characters`, value };
      }
      if (max !== undefined && value.length > max) {
        return { field, message: `${field} must be at most ${max} characters`, value };
      }
      if (pattern && !pattern.test(value)) {
        return { field, message: `${field} has invalid format`, value };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, message: `${field} must be a number`, value };
      }
      if (min !== undefined && value < min) {
        return { field, message: `${field} must be at least ${min}`, value };
      }
      if (max !== undefined && value > max) {
        return { field, message: `${field} must be at most ${max}`, value };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field, message: `${field} must be a boolean`, value };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { field, message: `${field} must be an array`, value };
      }
      if (min !== undefined && value.length < min) {
        return { field, message: `${field} must have at least ${min} items`, value };
      }
      if (max !== undefined && value.length > max) {
        return { field, message: `${field} must have at most ${max} items`, value };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { field, message: `${field} must be an object`, value };
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return { field, message: `${field} must be a valid email address`, value };
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        return { field, message: `${field} must be a valid URL`, value };
      }
      break;

    case 'solana-address':
      if (typeof value !== 'string' || !isValidSolanaAddress(value)) {
        return { field, message: `${field} must be a valid Solana address`, value };
      }
      break;

    default:
      return { field, message: `Unknown validation type: ${type}` };
  }

  // Enum validation
  if (enumValues && !enumValues.includes(value)) {
    return {
      field,
      message: `${field} must be one of: ${enumValues.join(', ')}`,
      value,
    };
  }

  // Custom validation
  if (custom) {
    const customResult = custom(value);
    if (customResult !== true) {
      return {
        field,
        message: typeof customResult === 'string' ? customResult : `${field} validation failed`,
        value,
      };
    }
  }

  return null;
}

/**
 * Validate request body against rules
 */
export function validateRequest(
  body: any,
  rules: ValidationRule[]
): { valid: boolean; errors: ValidationErrorDetail[] } {
  const errors: ValidationErrorDetail[] = [];

  for (const rule of rules) {
    const value = body[rule.field];
    const error = validateField(value, rule);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(rules: ValidationRule[]) {
  return (req: VercelRequest, res: VercelResponse, next?: Function) => {
    const validation = validateRequest(req.body, rules);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    if (next) {
      next();
    }
    return true;
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(
  query: any,
  rules: ValidationRule[]
): { valid: boolean; errors: ValidationErrorDetail[] } {
  return validateRequest(query, rules);
}

/**
 * Sanitize input by removing potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove script tags
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove HTML tags
  input = input.replace(/<[^>]*>/g, '');
  
  // Encode special characters
  input = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return input;
}

/**
 * Rate limiting helper (in-memory, use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

/**
 * Extract client IP from request
 */
export function getClientIp(req: VercelRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    (req.headers['cf-connecting-ip'] as string) ||
    'unknown'
  );
}
