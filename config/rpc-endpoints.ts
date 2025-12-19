/**
 * RPC endpoint configuration with backup nodes
 * Provides fallback endpoints for high availability
 */

export interface RpcEndpoint {
  name: string;
  url: string;
  priority: number; // Lower is higher priority
  rateLimit: number; // Requests per second
  tier: 'premium' | 'standard' | 'free';
  healthCheckUrl?: string;
}

/**
 * Mainnet RPC endpoints with fallback support
 */
export const MAINNET_RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    name: 'Primary (Environment)',
    url: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    priority: 1,
    rateLimit: 100,
    tier: process.env.SOLANA_RPC_URL ? 'premium' : 'free',
  },
  {
    name: 'QuickNode',
    url: process.env.QUICKNODE_RPC_URL || '',
    priority: 2,
    rateLimit: 150,
    tier: 'premium',
  },
  {
    name: 'Helius',
    url: process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=',
    priority: 3,
    rateLimit: 100,
    tier: process.env.HELIUS_RPC_URL ? 'premium' : 'free',
  },
  {
    name: 'Triton',
    url: process.env.TRITON_RPC_URL || '',
    priority: 4,
    rateLimit: 100,
    tier: 'premium',
  },
  {
    name: 'Solana Free Tier 1',
    url: 'https://api.mainnet-beta.solana.com',
    priority: 10,
    rateLimit: 10,
    tier: 'free',
  },
  {
    name: 'Solana Free Tier 2',
    url: 'https://solana-api.projectserum.com',
    priority: 11,
    rateLimit: 10,
    tier: 'free',
  },
].filter(endpoint => endpoint.url); // Remove endpoints without URLs

/**
 * Devnet RPC endpoints for testing
 */
export const DEVNET_RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    name: 'Solana Devnet',
    url: 'https://api.devnet.solana.com',
    priority: 1,
    rateLimit: 50,
    tier: 'free',
  },
  {
    name: 'QuickNode Devnet',
    url: process.env.QUICKNODE_DEVNET_RPC_URL || '',
    priority: 2,
    rateLimit: 100,
    tier: 'premium',
  },
].filter(endpoint => endpoint.url);

/**
 * Get RPC endpoints for the current environment
 */
export function getRpcEndpoints(): RpcEndpoint[] {
  const isDevnet = process.env.SOLANA_NETWORK === 'devnet';
  return isDevnet ? DEVNET_RPC_ENDPOINTS : MAINNET_RPC_ENDPOINTS;
}

/**
 * Get active RPC endpoints (with valid URLs) sorted by priority
 */
export function getActiveRpcEndpoints(): RpcEndpoint[] {
  return getRpcEndpoints()
    .filter(endpoint => endpoint.url && endpoint.url.startsWith('http'))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get premium RPC endpoints only
 */
export function getPremiumRpcEndpoints(): RpcEndpoint[] {
  return getActiveRpcEndpoints().filter(endpoint => endpoint.tier === 'premium');
}

/**
 * Get primary RPC endpoint
 */
export function getPrimaryRpcEndpoint(): RpcEndpoint | null {
  const endpoints = getActiveRpcEndpoints();
  return endpoints.length > 0 ? endpoints[0] : null;
}

/**
 * Get backup RPC endpoints (excluding primary)
 */
export function getBackupRpcEndpoints(): RpcEndpoint[] {
  const endpoints = getActiveRpcEndpoints();
  return endpoints.slice(1); // All except first
}
