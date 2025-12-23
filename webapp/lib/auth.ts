// Simple admin role checking utility
// In a real implementation, this would connect to a backend auth service

/**
 * Check if the current wallet is an admin
 * For now, this is a placeholder that checks against a hardcoded list
 * In production, this should call an API endpoint that verifies roles
 */
export const isAdmin = (walletAddress: string | null | undefined): boolean => {
  if (!walletAddress) return false;

  // In production, this should be an API call
  // For now, using environment variable or returning false
  const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',') || [];
  
  return adminWallets.some(
    (admin) => admin.trim().toLowerCase() === walletAddress.toLowerCase()
  );
};

/**
 * Check if the current wallet has super admin privileges
 */
export const isSuperAdmin = (walletAddress: string | null | undefined): boolean => {
  if (!walletAddress) return false;

  const superAdminWallets = process.env.NEXT_PUBLIC_SUPER_ADMIN_WALLETS?.split(',') || [];
  
  return superAdminWallets.some(
    (admin) => admin.trim().toLowerCase() === walletAddress.toLowerCase()
  );
};

/**
 * Get admin role for a wallet
 */
export const getAdminRole = (walletAddress: string | null | undefined): 'super_admin' | 'admin' | 'user' => {
  if (isSuperAdmin(walletAddress)) return 'super_admin';
  if (isAdmin(walletAddress)) return 'admin';
  return 'user';
};
