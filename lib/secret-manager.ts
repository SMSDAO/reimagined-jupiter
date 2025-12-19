/**
 * Secret manager for secure secret handling and masking
 * Provides utilities to mask secrets in logs and validate secret formats
 */

import { logger } from './logger.js';

/**
 * Mask a secret value for safe logging
 */
export function maskSecret(value: string | undefined, visibleChars: number = 4): string {
  if (!value) {
    return '***';
  }
  
  if (value.length <= visibleChars * 2) {
    return '***';
  }
  
  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  return `${start}${'*'.repeat(Math.min(20, value.length - visibleChars * 2))}${end}`;
}

/**
 * Mask API key for logging
 */
export function maskApiKey(apiKey: string | undefined): string {
  return maskSecret(apiKey, 6);
}

/**
 * Mask wallet address for logging
 */
export function maskWalletAddress(address: string | undefined): string {
  return maskSecret(address, 4);
}

/**
 * Mask private key for logging (extra cautious - only show first 2 chars)
 */
export function maskPrivateKey(privateKey: string | undefined): string {
  if (!privateKey) {
    return '***';
  }
  return `${privateKey.substring(0, 2)}${'*'.repeat(20)}`;
}

/**
 * Validate that a value looks like a valid base58 Solana private key
 */
export function isValidSolanaPrivateKey(value: string): boolean {
  // Base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  
  // Solana private keys are typically 87-88 characters in base58
  if (value.length < 80 || value.length > 90) {
    return false;
  }
  
  return base58Regex.test(value);
}

/**
 * Validate that a value looks like a valid Solana public key
 */
export function isValidSolanaPublicKey(value: string): boolean {
  // Base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  
  // Solana public keys are 43-44 characters in base58
  if (value.length < 42 || value.length > 45) {
    return false;
  }
  
  return base58Regex.test(value);
}

/**
 * Check if string contains potential secret patterns
 */
export function containsSecretPattern(value: string): boolean {
  const secretPatterns = [
    /private.?key/i,
    /secret.?key/i,
    /api.?key/i,
    /password/i,
    /token/i,
    /bearer/i,
    /auth/i,
  ];
  
  return secretPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize object for logging by masking potential secrets
 */
export function sanitizeForLogging(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Check if it looks like a secret
    if (containsSecretPattern(obj)) {
      return maskSecret(obj);
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Mask known secret fields
      if (
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth')
      ) {
        sanitized[key] = maskSecret(String(value));
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Secret rotation reminder
 * Logs a warning if secrets haven't been rotated in a while
 */
export interface SecretRotationConfig {
  secretName: string;
  lastRotation: Date;
  rotationIntervalDays: number;
}

export function checkSecretRotation(config: SecretRotationConfig): void {
  const daysSinceRotation = Math.floor(
    (Date.now() - config.lastRotation.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceRotation >= config.rotationIntervalDays) {
    logger.warn(`Secret rotation overdue`, {
      secretName: config.secretName,
      daysSinceRotation,
      rotationIntervalDays: config.rotationIntervalDays,
    });
  } else if (daysSinceRotation >= config.rotationIntervalDays * 0.8) {
    logger.info(`Secret rotation due soon`, {
      secretName: config.secretName,
      daysSinceRotation,
      rotationIntervalDays: config.rotationIntervalDays,
    });
  }
}

/**
 * Validate environment variable secrets on startup
 */
export function validateSecrets(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check WALLET_PRIVATE_KEY
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    errors.push('WALLET_PRIVATE_KEY is not set');
  } else if (!isValidSolanaPrivateKey(privateKey) && !privateKey.includes('[')) {
    errors.push('WALLET_PRIVATE_KEY does not appear to be a valid base58 Solana private key');
  }
  
  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters');
  }
  
  // Check ADMIN_PASSWORD
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    errors.push('ADMIN_PASSWORD is not set');
  } else if (adminPassword.length < 8) {
    errors.push('ADMIN_PASSWORD should be at least 8 characters');
  } else if (adminPassword === 'admin' || adminPassword === 'password' || adminPassword === '12345678') {
    errors.push('ADMIN_PASSWORD is too weak (common password detected)');
  }
  
  const valid = errors.length === 0;
  
  if (!valid) {
    logger.error('Secret validation failed', { errorCount: errors.length });
    errors.forEach(error => logger.error(`  - ${error}`));
  } else {
    logger.info('Secret validation passed');
  }
  
  return { valid, errors };
}
