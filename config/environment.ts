/**
 * Environment configuration manager
 * Validates and provides typed access to environment variables
 */

import { logger } from '../lib/logger.js';

export interface EnvironmentConfig {
  // Node environment
  nodeEnv: 'development' | 'production' | 'test';
  
  // Solana configuration
  solanaRpcUrl: string;
  walletPrivateKey: string;
  
  // Trading parameters
  minimumProfitSol: number;
  maxSlippage: number;
  gasBuffer: number;
  
  // Admin configuration
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
  cronSecret?: string;
  
  // Dev fee configuration
  devFeeEnabled: boolean;
  devFeePercentage: number;
  devFeeWallet: string;
  
  // Flash loan providers (program IDs)
  marginfiProgramId: string;
  solendProgramId: string;
  mangoProgramId: string;
  kaminoProgramId: string;
  portFinanceProgramId: string;
  saveFinanceProgramId: string;
  
  // Jupiter configuration
  jupiterV6ProgramId: string;
  
  // Optional: QuickNode configuration
  quicknodeRpcUrl?: string;
  quicknodeApiKey?: string;
  quicknodeFunctionsUrl?: string;
  quicknodeKvUrl?: string;
  quicknodeStreamsUrl?: string;
  
  // Optional: Database configuration
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  
  // Optional: Farcaster integration
  neynarApiKey?: string;
  
  // Optional: GXQ ecosystem
  gxqTokenMint?: string;
  gxqEcosystemProgramId?: string;
  
  // Application settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  port: number;
}

/**
 * Validate required environment variable
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Parse boolean environment variable
 */
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse number environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
}

/**
 * Parse integer environment variable
 */
function parseIntValue(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
}

/**
 * Validate node environment
 */
function validateNodeEnv(env: string | undefined): 'development' | 'production' | 'test' {
  if (env === 'development' || env === 'production' || env === 'test') {
    return env;
  }
  return 'production'; // Default to production for safety
}

/**
 * Validate log level
 */
function validateLogLevel(level: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level;
  }
  return 'info'; // Default to info
}

/**
 * Load and validate environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  try {
    // Load required variables
    const config: EnvironmentConfig = {
      // Node environment
      nodeEnv: validateNodeEnv(process.env.NODE_ENV),
      
      // Solana configuration
      solanaRpcUrl: requireEnv('SOLANA_RPC_URL'),
      walletPrivateKey: requireEnv('WALLET_PRIVATE_KEY'),
      
      // Trading parameters
      minimumProfitSol: parseNumber(process.env.MINIMUM_PROFIT_SOL, 0.01),
      maxSlippage: parseNumber(process.env.MAX_SLIPPAGE, 0.01),
      gasBuffer: parseNumber(process.env.GAS_BUFFER, 1.5),
      
      // Admin configuration
      adminUsername: getEnv('ADMIN_USERNAME', 'admin'),
      adminPassword: requireEnv('ADMIN_PASSWORD'),
      jwtSecret: requireEnv('JWT_SECRET'),
      cronSecret: process.env.CRON_SECRET,
      
      // Dev fee configuration
      devFeeEnabled: parseBool(process.env.DEV_FEE_ENABLED, true),
      devFeePercentage: parseNumber(process.env.DEV_FEE_PERCENTAGE, 0.10),
      devFeeWallet: getEnv('DEV_FEE_WALLET', '11111111111111111111111111111111'),
      
      // Flash loan providers
      marginfiProgramId: getEnv('MARGINFI_PROGRAM_ID', 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'),
      solendProgramId: getEnv('SOLEND_PROGRAM_ID', 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
      mangoProgramId: getEnv('MANGO_PROGRAM_ID', 'mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68'),
      kaminoProgramId: getEnv('KAMINO_PROGRAM_ID', 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD'),
      portFinanceProgramId: getEnv('PORT_FINANCE_PROGRAM_ID', 'Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR'),
      saveFinanceProgramId: getEnv('SAVE_FINANCE_PROGRAM_ID', 'SAVEg4Je7HZcJk2X1FTr1vfLhQqrpXPTvAWmYnYY1Wy'),
      
      // Jupiter configuration
      jupiterV6ProgramId: getEnv('JUPITER_V6_PROGRAM_ID', 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
      
      // Optional: QuickNode configuration
      quicknodeRpcUrl: process.env.QUICKNODE_RPC_URL,
      quicknodeApiKey: process.env.QUICKNODE_API_KEY,
      quicknodeFunctionsUrl: process.env.QUICKNODE_FUNCTIONS_URL,
      quicknodeKvUrl: process.env.QUICKNODE_KV_URL,
      quicknodeStreamsUrl: process.env.QUICKNODE_STREAMS_URL,
      
      // Optional: Database configuration
      dbHost: process.env.DB_HOST,
      dbPort: parseIntValue(process.env.DB_PORT, 5432),
      dbName: process.env.DB_NAME,
      dbUser: process.env.DB_USER,
      dbPassword: process.env.DB_PASSWORD,
      
      // Optional: Farcaster integration
      neynarApiKey: process.env.NEYNAR_API_KEY,
      
      // Optional: GXQ ecosystem
      gxqTokenMint: process.env.GXQ_TOKEN_MINT,
      gxqEcosystemProgramId: process.env.GXQ_ECOSYSTEM_PROGRAM_ID,
      
      // Application settings
      logLevel: validateLogLevel(process.env.LOG_LEVEL),
      port: parseIntValue(process.env.PORT, 3000),
    };
    
    // Validate trading parameters
    if (config.minimumProfitSol <= 0) {
      throw new Error('MINIMUM_PROFIT_SOL must be greater than 0');
    }
    
    if (config.maxSlippage <= 0 || config.maxSlippage > 1) {
      throw new Error('MAX_SLIPPAGE must be between 0 and 1');
    }
    
    if (config.devFeePercentage < 0 || config.devFeePercentage > 1) {
      throw new Error('DEV_FEE_PERCENTAGE must be between 0 and 1');
    }
    
    // Validate JWT secret length
    if (config.jwtSecret.length < 32) {
      logger.warn('JWT_SECRET should be at least 32 characters for security');
    }
    
    // Validate admin password length
    if (config.adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters');
    }
    
    logger.info('Environment configuration loaded successfully', {
      nodeEnv: config.nodeEnv,
      minimumProfitSol: config.minimumProfitSol,
      maxSlippage: config.maxSlippage,
      devFeeEnabled: config.devFeeEnabled,
    });
    
    return config;
  } catch (error) {
    logger.error('Failed to load environment configuration', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Singleton instance of environment configuration
 */
let envConfig: EnvironmentConfig | null = null;

/**
 * Get environment configuration (cached)
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!envConfig) {
    envConfig = loadEnvironmentConfig();
  }
  return envConfig;
}

/**
 * Mask sensitive value for logging
 */
export function maskSecret(value: string): string {
  if (!value || value.length < 8) {
    return '***';
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Get safe environment summary for logging
 */
export function getEnvironmentSummary(): Record<string, any> {
  const config = getEnvironmentConfig();
  
  return {
    nodeEnv: config.nodeEnv,
    solanaRpcUrl: maskSecret(config.solanaRpcUrl),
    walletAddress: maskSecret(config.walletPrivateKey),
    minimumProfitSol: config.minimumProfitSol,
    maxSlippage: config.maxSlippage,
    devFeeEnabled: config.devFeeEnabled,
    devFeePercentage: config.devFeePercentage,
    logLevel: config.logLevel,
    hasQuickNode: !!config.quicknodeRpcUrl,
    hasDatabase: !!config.dbHost,
  };
}
