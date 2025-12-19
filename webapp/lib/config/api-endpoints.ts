/**
 * Centralized API Endpoint Configuration
 * 
 * This module provides dynamic API endpoint management based on environment.
 * All API URLs should be imported from this module to ensure consistency
 * and easy environment-specific configuration.
 */

/**
 * Environment detection
 */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_VERCEL = process.env.VERCEL === '1';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Jupiter API Configuration
 */
export const JUPITER_API_CONFIG = {
  // Quote API (v6)
  QUOTE_API: process.env.NEXT_PUBLIC_JUPITER_QUOTE_API || 
             process.env.NEXT_PUBLIC_JUPITER_API_URL || 
             'https://quote-api.jup.ag/v6',
  
  // Price API (v6)
  PRICE_API: process.env.NEXT_PUBLIC_JUPITER_PRICE_API || 
             'https://price.jup.ag/v6',
  
  // Worker API (for airdrops)
  WORKER_API: process.env.NEXT_PUBLIC_JUPITER_WORKER_API || 
              'https://worker.jup.ag',
  
  // Token List API
  TOKEN_LIST_API: process.env.NEXT_PUBLIC_JUPITER_TOKEN_LIST_API || 
                  'https://token.jup.ag/all',
};

/**
 * Solana RPC Configuration with priority fallback
 */
export const SOLANA_RPC_CONFIG = {
  // Primary endpoint (Helius recommended for production)
  PRIMARY: process.env.NEXT_PUBLIC_HELIUS_RPC || 
           process.env.NEXT_PUBLIC_SOLANA_RPC_PRIMARY || 
           process.env.NEXT_PUBLIC_RPC_URL || 
           'https://api.mainnet-beta.solana.com',
  
  // Secondary endpoint (QuickNode)
  SECONDARY: process.env.NEXT_PUBLIC_QUICKNODE_RPC || 
             process.env.NEXT_PUBLIC_RPC_URL || 
             'https://api.mainnet-beta.solana.com',
  
  // Fallback public endpoint
  FALLBACK: 'https://api.mainnet-beta.solana.com',
  
  // Alternative public endpoints
  ALTERNATIVES: [
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
  ],
};

/**
 * Pyth Network Configuration
 */
export const PYTH_CONFIG = {
  HERMES_ENDPOINT: process.env.NEXT_PUBLIC_PYTH_HERMES_ENDPOINT || 
                   process.env.PYTH_HERMES_ENDPOINT || 
                   'https://hermes.pyth.network',
};

/**
 * Jito Configuration
 */
export const JITO_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_JITO_API_URL || 
           'https://kek.jito.network/api/v1',
};

/**
 * WalletConnect Configuration
 */
export const WALLETCONNECT_CONFIG = {
  PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
};

/**
 * API Endpoint Registry
 * Central registry of all external API endpoints used in the application
 */
export const API_ENDPOINTS = {
  // Jupiter APIs
  JUPITER_QUOTE: JUPITER_API_CONFIG.QUOTE_API,
  JUPITER_PRICE: JUPITER_API_CONFIG.PRICE_API,
  JUPITER_WORKER: JUPITER_API_CONFIG.WORKER_API,
  JUPITER_TOKENS: JUPITER_API_CONFIG.TOKEN_LIST_API,
  
  // Solana RPC
  SOLANA_RPC_PRIMARY: SOLANA_RPC_CONFIG.PRIMARY,
  SOLANA_RPC_SECONDARY: SOLANA_RPC_CONFIG.SECONDARY,
  SOLANA_RPC_FALLBACK: SOLANA_RPC_CONFIG.FALLBACK,
  
  // Pyth Network
  PYTH_HERMES: PYTH_CONFIG.HERMES_ENDPOINT,
  
  // Jito
  JITO_API: JITO_CONFIG.API_URL,
} as const;

/**
 * Get all available RPC endpoints in priority order
 */
export function getRPCEndpoints(): string[] {
  const endpoints = new Set<string>();
  
  // Add in priority order
  endpoints.add(SOLANA_RPC_CONFIG.PRIMARY);
  endpoints.add(SOLANA_RPC_CONFIG.SECONDARY);
  endpoints.add(SOLANA_RPC_CONFIG.FALLBACK);
  
  // Add alternatives
  SOLANA_RPC_CONFIG.ALTERNATIVES.forEach(url => endpoints.add(url));
  
  return Array.from(endpoints);
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Critical variables that should be set in production
  if (IS_PRODUCTION) {
    if (!process.env.NEXT_PUBLIC_RPC_URL && 
        !process.env.NEXT_PUBLIC_HELIUS_RPC && 
        !process.env.NEXT_PUBLIC_QUICKNODE_RPC) {
      missing.push('NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_HELIUS_RPC or NEXT_PUBLIC_QUICKNODE_RPC');
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    isProduction: IS_PRODUCTION,
    isDevelopment: IS_DEVELOPMENT,
    isVercel: IS_VERCEL,
    jupiterQuoteApi: JUPITER_API_CONFIG.QUOTE_API,
    jupiterPriceApi: JUPITER_API_CONFIG.PRICE_API,
    primaryRPC: SOLANA_RPC_CONFIG.PRIMARY,
    pythHermes: PYTH_CONFIG.HERMES_ENDPOINT,
    validation: validateEnvironment(),
  };
}

/**
 * Log environment configuration (safe for production - no secrets)
 */
export function logEnvironmentConfig() {
  if (typeof window !== 'undefined') {
    console.log('🔧 API Configuration:', {
      environment: process.env.NODE_ENV,
      platform: IS_VERCEL ? 'Vercel' : 'Other',
      endpoints: {
        jupiter: {
          quote: JUPITER_API_CONFIG.QUOTE_API,
          price: JUPITER_API_CONFIG.PRICE_API,
        },
        solana: {
          primary: SOLANA_RPC_CONFIG.PRIMARY,
          hasSecondary: !!process.env.NEXT_PUBLIC_QUICKNODE_RPC,
        },
        pyth: PYTH_CONFIG.HERMES_ENDPOINT,
      },
    });
  }
}
