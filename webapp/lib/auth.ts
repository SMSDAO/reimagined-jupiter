/**
 * Auth utility for role-based access control
 */

// Admin wallet addresses (can be configured via environment variable)
const ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];

// Default admin wallet for development
const DEFAULT_ADMIN = 'monads.solana';

/**
 * Check if a wallet address is an admin
 */
export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  
  const normalizedAddress = walletAddress.toLowerCase().trim();
  
  // Check against configured admin wallets
  if (ADMIN_WALLETS.some(admin => admin.toLowerCase() === normalizedAddress)) {
    return true;
  }
  
  // Check against default admin
  if (normalizedAddress === DEFAULT_ADMIN.toLowerCase()) {
    return true;
  }
  
  return false;
}

/**
 * Check if a wallet has premium features enabled
 */
export function hasPremiumAccess(walletAddress: string | null | undefined): boolean {
  // For now, all connected wallets have premium access
  // This can be extended to check NFT holdings, token balance, etc.
  return !!walletAddress;
}

/**
 * Get user role
 */
export function getUserRole(walletAddress: string | null | undefined): 'guest' | 'user' | 'admin' {
  if (!walletAddress) return 'guest';
  if (isAdmin(walletAddress)) return 'admin';
  return 'user';
}
