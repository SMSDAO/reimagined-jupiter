/**
 * Production Environment Guardrails
 * 
 * Validates all critical environment variables and enforces production-ready configurations.
 * This module ensures the system cannot start without proper security and operational settings.
 */

import { PublicKey } from '@solana/web3.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EnvironmentConfig {
  // Solana Configuration
  rpcUrl: string;
  walletPrivateKey: string;
  
  // Admin Panel Security
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
  
  // Trading Configuration
  minProfitSol: number;
  maxSlippage: number;
  gasBuffer: number;
  
  // Dev Fee
  devFeeEnabled: boolean;
  devFeePercentage: number;
  devFeeWallet: string;
  
  // Optional
  cronSecret?: string;
  quicknodeRpcUrl?: string;
  quicknodeApiKey?: string;
  dbHost?: string;
  dbPassword?: string;
  githubToken?: string;
  vercelToken?: string;
}

/**
 * Validates all production environment variables
 */
export function validateProductionEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical: Solana RPC URL
  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    errors.push('SOLANA_RPC_URL is required');
  } else if (rpcUrl.includes('api.mainnet-beta.solana.com')) {
    warnings.push('Using public RPC endpoint - consider using premium RPC (Helius, QuickNode, Triton) for production');
  } else if (!rpcUrl.startsWith('https://')) {
    errors.push('SOLANA_RPC_URL must use HTTPS');
  }

  // Critical: Wallet Private Key
  const walletKey = process.env.WALLET_PRIVATE_KEY;
  if (!walletKey) {
    errors.push('WALLET_PRIVATE_KEY is required');
  } else if (walletKey === 'your_base58_private_key_here') {
    errors.push('WALLET_PRIVATE_KEY must be set to actual private key (not example value)');
  } else if (walletKey.length < 32) {
    errors.push('WALLET_PRIVATE_KEY appears to be invalid (too short)');
  }

  // Critical: Admin Credentials
  const adminUsername = process.env.ADMIN_USERNAME;
  if (!adminUsername) {
    errors.push('ADMIN_USERNAME is required');
  } else if (adminUsername === 'admin') {
    warnings.push('ADMIN_USERNAME is set to default value - consider using a unique username for production');
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    errors.push('ADMIN_PASSWORD is required');
  } else if (adminPassword === 'change_me_in_production') {
    errors.push('ADMIN_PASSWORD must be changed from default value');
  } else if (adminPassword.length < 8) {
    errors.push('ADMIN_PASSWORD must be at least 8 characters');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(adminPassword) && !adminPassword.startsWith('$2')) {
    warnings.push('ADMIN_PASSWORD should contain uppercase, lowercase, and numbers (or use bcrypt hash)');
  }

  // Critical: JWT Secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret === 'your_32_character_secret_key_here') {
    errors.push('JWT_SECRET must be changed from default value');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters for security');
  }

  // Trading Configuration
  const minProfitSol = parseFloat(process.env.MINIMUM_PROFIT_SOL || '0.01');
  if (minProfitSol < 0.001) {
    warnings.push('MINIMUM_PROFIT_SOL is very low - may result in unprofitable trades after fees');
  }
  if (minProfitSol > 1.0) {
    warnings.push('MINIMUM_PROFIT_SOL is very high - may miss profitable opportunities');
  }

  const maxSlippage = parseFloat(process.env.MAX_SLIPPAGE || '0.01');
  if (maxSlippage < 0.001) {
    warnings.push('MAX_SLIPPAGE is very low - trades may fail frequently');
  }
  if (maxSlippage > 0.05) {
    warnings.push('MAX_SLIPPAGE is very high (>5%) - may result in poor execution prices');
  }

  // Dev Fee Configuration
  const devFeeEnabled = process.env.DEV_FEE_ENABLED !== 'false';
  const devFeePercentage = parseFloat(process.env.DEV_FEE_PERCENTAGE || '0.10');
  if (devFeeEnabled) {
    if (devFeePercentage > 0.5) {
      errors.push('DEV_FEE_PERCENTAGE must be <= 50% (0.5)');
    }
    
    const devFeeWallet = process.env.DEV_FEE_WALLET;
    if (!devFeeWallet) {
      errors.push('DEV_FEE_WALLET is required when DEV_FEE_ENABLED=true');
    } else if (devFeeWallet === '11111111111111111111111111111111') {
      errors.push('DEV_FEE_WALLET must be set to actual wallet address');
    } else {
      try {
        new PublicKey(devFeeWallet);
      } catch {
        errors.push('DEV_FEE_WALLET is not a valid Solana address');
      }
    }
  }

  // Node Environment
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'production' && nodeEnv !== 'development') {
    warnings.push('NODE_ENV should be set to "production" or "development"');
  }

  // Optional but recommended: Cron Secret
  if (!process.env.CRON_SECRET) {
    warnings.push('CRON_SECRET is not set - cron endpoints will be publicly accessible');
  }

  // Database Configuration (if using)
  if (process.env.DB_HOST) {
    if (!process.env.DB_PASSWORD) {
      errors.push('DB_PASSWORD is required when DB_HOST is set');
    }
    if (!process.env.DB_USER) {
      errors.push('DB_USER is required when DB_HOST is set');
    }
    if (!process.env.DB_NAME) {
      errors.push('DB_NAME is required when DB_HOST is set');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets validated environment configuration or throws if invalid
 */
export function getProductionConfig(): EnvironmentConfig {
  const validation = validateProductionEnvironment();
  
  if (!validation.valid) {
    console.error('❌ Production environment validation failed:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Invalid production environment configuration');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Production environment warnings:');
    validation.warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  return {
    rpcUrl: process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || '',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    adminUsername: process.env.ADMIN_USERNAME || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    jwtSecret: process.env.JWT_SECRET || '',
    minProfitSol: parseFloat(process.env.MINIMUM_PROFIT_SOL || '0.01'),
    maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.01'),
    gasBuffer: parseFloat(process.env.GAS_BUFFER || '1.5'),
    devFeeEnabled: process.env.DEV_FEE_ENABLED !== 'false',
    devFeePercentage: parseFloat(process.env.DEV_FEE_PERCENTAGE || '0.10'),
    devFeeWallet: process.env.DEV_FEE_WALLET || '',
    cronSecret: process.env.CRON_SECRET,
    quicknodeRpcUrl: process.env.QUICKNODE_RPC_URL,
    quicknodeApiKey: process.env.QUICKNODE_API_KEY,
    dbHost: process.env.DB_HOST,
    dbPassword: process.env.DB_PASSWORD,
    githubToken: process.env.GITHUB_TOKEN,
    vercelToken: process.env.VERCEL_TOKEN,
  };
}

/**
 * Validates that the system is running in a production-safe configuration
 * Checks for common security issues and misconfigurations
 */
export function enforceProductionSafety(): void {
  const validation = validateProductionEnvironment();
  
  // Log all issues
  if (validation.errors.length > 0) {
    console.error('\n❌ CRITICAL: Production environment validation failed!');
    console.error('='.repeat(80));
    validation.errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('='.repeat(80));
    console.error('\nThe system cannot start with these errors.');
    console.error('Please fix the above issues and try again.\n');
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.warn('\n⚠️  Production Environment Warnings:');
    console.warn('='.repeat(80));
    validation.warnings.forEach(warn => console.warn(`  ⚠️  ${warn}`));
    console.warn('='.repeat(80));
    console.warn('\nThese warnings should be addressed for optimal production operation.\n');
  } else {
    console.log('✅ Production environment validation passed');
  }
}

/**
 * Validates priority fee cap (max 10M lamports)
 */
export function validatePriorityFee(feeLamports: number): number {
  const MAX_PRIORITY_FEE = 10_000_000; // 10M lamports
  
  if (feeLamports > MAX_PRIORITY_FEE) {
    console.warn(`⚠️  Priority fee ${feeLamports} lamports exceeds max ${MAX_PRIORITY_FEE}, capping...`);
    return MAX_PRIORITY_FEE;
  }
  
  return feeLamports;
}

/**
 * Validates slippage is within reasonable bounds
 */
export function validateSlippage(slippage: number): void {
  if (slippage < 0 || slippage > 1) {
    throw new Error(`Invalid slippage: ${slippage}. Must be between 0 and 1 (0-100%)`);
  }
  
  if (slippage > 0.1) {
    console.warn(`⚠️  High slippage tolerance: ${(slippage * 100).toFixed(1)}%`);
  }
}

/**
 * Validates minimum profit threshold
 */
export function validateMinProfit(profitSol: number): void {
  if (profitSol < 0) {
    throw new Error(`Invalid minimum profit: ${profitSol}. Must be positive`);
  }
  
  if (profitSol < 0.001) {
    console.warn('⚠️  Very low profit threshold - trades may be unprofitable after fees');
  }
}

/**
 * Checks if a wallet address is valid and not a placeholder
 */
export function validateWalletAddress(address: string, fieldName: string): void {
  if (!address) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (address === '11111111111111111111111111111111') {
    throw new Error(`${fieldName} must be set to actual wallet address (not placeholder)`);
  }
  
  try {
    new PublicKey(address);
  } catch {
    throw new Error(`${fieldName} is not a valid Solana address`);
  }
}

/**
 * Production-ready risk management checks
 */
export interface RiskAssessment {
  safe: boolean;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
}

export function assessTradeRisk(params: {
  profitSol: number;
  slippage: number;
  priorityFeeLamports: number;
  tradeAmountSol: number;
}): RiskAssessment {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check profit vs fees
  const priorityFeeSol = params.priorityFeeLamports / 1e9;
  if (params.profitSol < priorityFeeSol * 2) {
    reasons.push('Profit is less than 2x priority fee');
    riskScore += 2;
  }

  // Check slippage
  if (params.slippage > 0.03) {
    reasons.push(`High slippage: ${(params.slippage * 100).toFixed(1)}%`);
    riskScore += 1;
  }

  // Check trade size
  if (params.tradeAmountSol > 100) {
    reasons.push('Very large trade size (>100 SOL)');
    riskScore += 2;
  }

  // Check profit margin
  const profitMargin = params.profitSol / params.tradeAmountSol;
  if (profitMargin < 0.003) {
    reasons.push('Low profit margin (<0.3%)');
    riskScore += 1;
  }

  // Determine risk level
  let risk: RiskAssessment['risk'];
  if (riskScore === 0) {
    risk = 'LOW';
  } else if (riskScore <= 2) {
    risk = 'MEDIUM';
  } else if (riskScore <= 4) {
    risk = 'HIGH';
  } else {
    risk = 'CRITICAL';
  }

  return {
    safe: riskScore <= 2,
    risk,
    reasons,
  };
}
