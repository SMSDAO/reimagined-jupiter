/**
 * Wallet Management Service
 * Handles creation, import, export, and management of sub-wallets for arbitrage
 * 
 * KEY FEATURES:
 * - Generate wallets with public keys ending in "GXQ"
 * - Limit of 3 sub-wallets per user
 * - Encrypted private key storage
 * - Audit logging for all operations
 * - On-chain balance verification
 */

import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import {
  createSubWallet,
  getSubWallets,
  getSubWalletByPublicKey,
  storeWalletKey,
  getWalletKey,
  updateSubWalletBalance,
  updateWalletKeyUsage,
  insertAuditLog,
  getUserByWallet,
  updateSubWalletStats,
} from '../../db/database.js';
import {
  prepareKeyForStorage,
  retrieveKeyFromStorage,
  wipeMemory,
} from './walletEncryption.js';

// Configuration
const MAX_SUB_WALLETS_PER_USER = 3;
const GXQ_SUFFIX = 'GXQ';
const MIN_SOL_BALANCE = 0.05; // Minimum SOL balance for operations

/**
 * Hash a string using SHA-256
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a Solana keypair with public key ending in "GXQ"
 * This uses a brute-force approach to find matching keys
 */
export async function generateGXQWallet(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  console.log('🔑 Generating wallet with GXQ-ending public key...');
  
  let attempts = 0;
  const startTime = Date.now();
  
  while (true) {
    attempts++;
    
    // Generate a new random keypair
    const keypair = Keypair.generate();
    const publicKeyString = keypair.publicKey.toString();
    
    // Check if public key ends with GXQ
    if (publicKeyString.endsWith(GXQ_SUFFIX)) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Found GXQ wallet after ${attempts} attempts in ${elapsed}s`);
      console.log(`📍 Public Key: ${publicKeyString}`);
      
      return {
        publicKey: publicKeyString,
        privateKey: bs58.encode(keypair.secretKey),
      };
    }
    
    // Log progress every 10,000 attempts
    if (attempts % 10000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`⏳ Generated ${attempts} keypairs in ${elapsed}s...`);
    }
  }
}

/**
 * Create a new sub-wallet for a user
 */
export async function createUserSubWallet(
  userWalletPublicKey: string,
  walletName?: string,
  ipHash?: string,
  deviceFingerprintHash?: string
): Promise<{
  success: boolean;
  subWallet?: any;
  error?: string;
}> {
  try {
    // Get user
    const user = await getUserByWallet(userWalletPublicKey);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found. Please login first.',
      };
    }
    
    // Check existing sub-wallets count
    const existingWallets = await getSubWallets(user.id);
    
    if (existingWallets.length >= MAX_SUB_WALLETS_PER_USER) {
      return {
        success: false,
        error: `Maximum of ${MAX_SUB_WALLETS_PER_USER} sub-wallets per user reached.`,
      };
    }
    
    // Generate GXQ-ending wallet
    console.log('🚀 Generating new GXQ wallet...');
    const wallet = await generateGXQWallet();
    
    // Calculate wallet index (1-based)
    const walletIndex = existingWallets.length + 1;
    
    // Create sub-wallet record
    const subWalletResult = await createSubWallet({
      userId: user.id,
      publicKey: wallet.publicKey,
      walletName: walletName || `Arbitrage Wallet ${walletIndex}`,
      walletIndex,
    });
    
    const subWallet = subWalletResult.rows[0];
    
    // Encrypt and store private key
    const encryptedKeyData = prepareKeyForStorage(wallet.privateKey);
    await storeWalletKey({
      subWalletId: subWallet.id,
      encryptedPrivateKey: encryptedKeyData.encryptedPrivateKey,
      encryptionIv: encryptedKeyData.encryptionIv,
      encryptionTag: encryptedKeyData.encryptionTag,
    });
    
    // Wipe private key from memory
    wipeMemory(wallet.privateKey);
    
    // Log audit event
    await insertAuditLog({
      userId: user.id,
      subWalletId: subWallet.id,
      walletPublicKey: wallet.publicKey,
      eventType: 'wallet_created',
      eventAction: 'create_sub_wallet',
      eventDescription: `Created sub-wallet: ${walletName || 'Arbitrage Wallet ' + walletIndex}`,
      ipHash,
      deviceFingerprintHash,
      status: 'success',
    });
    
    console.log(`✅ Sub-wallet created successfully: ${wallet.publicKey}`);
    
    return {
      success: true,
      subWallet: {
        id: subWallet.id,
        publicKey: wallet.publicKey,
        walletName: subWallet.wallet_name,
        walletIndex: subWallet.wallet_index,
        createdAt: subWallet.created_at,
      },
    };
  } catch (error) {
    console.error('❌ Error creating sub-wallet:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sub-wallet',
    };
  }
}

/**
 * Import an existing wallet as a sub-wallet
 * SECURITY: Private key must be validated before storage
 */
export async function importSubWallet(
  userWalletPublicKey: string,
  privateKey: string,
  walletName?: string,
  ipHash?: string,
  deviceFingerprintHash?: string
): Promise<{
  success: boolean;
  subWallet?: any;
  error?: string;
}> {
  try {
    // Get user
    const user = await getUserByWallet(userWalletPublicKey);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found. Please login first.',
      };
    }
    
    // Check existing sub-wallets count
    const existingWallets = await getSubWallets(user.id);
    
    if (existingWallets.length >= MAX_SUB_WALLETS_PER_USER) {
      return {
        success: false,
        error: `Maximum of ${MAX_SUB_WALLETS_PER_USER} sub-wallets per user reached.`,
      };
    }
    
    // Validate and parse private key
    let keypair: Keypair;
    try {
      const secretKey = bs58.decode(privateKey);
      keypair = Keypair.fromSecretKey(secretKey);
    } catch (error) {
      return {
        success: false,
        error: 'Invalid private key format. Please provide a valid base58-encoded private key.',
      };
    }
    
    const publicKeyString = keypair.publicKey.toString();
    
    // Check if public key ends with GXQ
    if (!publicKeyString.endsWith(GXQ_SUFFIX)) {
      return {
        success: false,
        error: `Wallet public key must end with "${GXQ_SUFFIX}" for arbitrage operations.`,
      };
    }
    
    // Check if wallet already exists
    const existing = await getSubWalletByPublicKey(publicKeyString);
    if (existing) {
      return {
        success: false,
        error: 'This wallet is already registered as a sub-wallet.',
      };
    }
    
    // Calculate wallet index (1-based)
    const walletIndex = existingWallets.length + 1;
    
    // Create sub-wallet record
    const subWalletResult = await createSubWallet({
      userId: user.id,
      publicKey: publicKeyString,
      walletName: walletName || `Imported Wallet ${walletIndex}`,
      walletIndex,
    });
    
    const subWallet = subWalletResult.rows[0];
    
    // Encrypt and store private key
    const encryptedKeyData = prepareKeyForStorage(privateKey);
    await storeWalletKey({
      subWalletId: subWallet.id,
      encryptedPrivateKey: encryptedKeyData.encryptedPrivateKey,
      encryptionIv: encryptedKeyData.encryptionIv,
      encryptionTag: encryptedKeyData.encryptionTag,
    });
    
    // Wipe private key from memory
    wipeMemory(privateKey);
    
    // Log audit event
    await insertAuditLog({
      userId: user.id,
      subWalletId: subWallet.id,
      walletPublicKey: publicKeyString,
      eventType: 'wallet_imported',
      eventAction: 'import_sub_wallet',
      eventDescription: `Imported sub-wallet: ${walletName || 'Imported Wallet ' + walletIndex}`,
      ipHash,
      deviceFingerprintHash,
      status: 'success',
    });
    
    console.log(`✅ Sub-wallet imported successfully: ${publicKeyString}`);
    
    return {
      success: true,
      subWallet: {
        id: subWallet.id,
        publicKey: publicKeyString,
        walletName: subWallet.wallet_name,
        walletIndex: subWallet.wallet_index,
        createdAt: subWallet.created_at,
      },
    };
  } catch (error) {
    console.error('❌ Error importing sub-wallet:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import sub-wallet',
    };
  }
}

/**
 * Export a sub-wallet's private key (encrypted)
 * SECURITY: Only export to authenticated user
 */
export async function exportSubWallet(
  userWalletPublicKey: string,
  subWalletPublicKey: string,
  ipHash?: string,
  deviceFingerprintHash?: string
): Promise<{
  success: boolean;
  privateKey?: string;
  error?: string;
}> {
  try {
    // Get user
    const user = await getUserByWallet(userWalletPublicKey);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found. Please login first.',
      };
    }
    
    // Get sub-wallet
    const subWallet = await getSubWalletByPublicKey(subWalletPublicKey);
    
    if (!subWallet) {
      return {
        success: false,
        error: 'Sub-wallet not found.',
      };
    }
    
    // Verify ownership
    if (subWallet.user_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: This sub-wallet does not belong to you.',
      };
    }
    
    // Get encrypted key
    const keyData = await getWalletKey(subWallet.id);
    
    if (!keyData) {
      return {
        success: false,
        error: 'Private key not found.',
      };
    }
    
    // Decrypt private key
    const privateKey = retrieveKeyFromStorage({
      encryptedPrivateKey: keyData.encrypted_private_key,
      encryptionIv: keyData.encryption_iv,
      encryptionTag: keyData.encryption_tag,
    });
    
    // Log audit event
    await insertAuditLog({
      userId: user.id,
      subWalletId: subWallet.id,
      walletPublicKey: subWalletPublicKey,
      eventType: 'wallet_exported',
      eventAction: 'export_sub_wallet',
      eventDescription: `Exported private key for sub-wallet: ${subWallet.wallet_name}`,
      ipHash,
      deviceFingerprintHash,
      status: 'success',
    });
    
    console.log(`✅ Sub-wallet exported: ${subWalletPublicKey}`);
    
    return {
      success: true,
      privateKey,
    };
  } catch (error) {
    console.error('❌ Error exporting sub-wallet:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export sub-wallet',
    };
  }
}

/**
 * Check SOL balance of a sub-wallet
 */
export async function checkSubWalletBalance(
  connection: Connection,
  subWalletPublicKey: string
): Promise<{
  success: boolean;
  balance?: number;
  sufficientBalance?: boolean;
  error?: string;
}> {
  try {
    const publicKey = new PublicKey(subWalletPublicKey);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / 1e9; // Convert lamports to SOL
    
    // Update database
    const subWallet = await getSubWalletByPublicKey(subWalletPublicKey);
    if (subWallet) {
      await updateSubWalletBalance(subWallet.id, solBalance);
    }
    
    return {
      success: true,
      balance: solBalance,
      sufficientBalance: solBalance >= MIN_SOL_BALANCE,
    };
  } catch (error) {
    console.error('❌ Error checking balance:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check balance',
    };
  }
}

/**
 * Get all sub-wallets for a user
 */
export async function getUserSubWallets(
  userWalletPublicKey: string,
  includeBalances: boolean = false,
  connection?: Connection
): Promise<{
  success: boolean;
  wallets?: any[];
  error?: string;
}> {
  try {
    // Get user
    const user = await getUserByWallet(userWalletPublicKey);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found. Please login first.',
      };
    }
    
    // Get sub-wallets
    const wallets = await getSubWallets(user.id);
    
    // Optionally fetch balances
    if (includeBalances && connection) {
      for (const wallet of wallets) {
        const balanceResult = await checkSubWalletBalance(
          connection,
          wallet.public_key
        );
        
        if (balanceResult.success) {
          wallet.current_balance = balanceResult.balance;
          wallet.sufficient_balance = balanceResult.sufficientBalance;
        }
      }
    }
    
    return {
      success: true,
      wallets: wallets.map((w) => ({
        id: w.id,
        publicKey: w.public_key,
        walletName: w.wallet_name,
        walletIndex: w.wallet_index,
        isActive: w.is_active,
        lastBalanceSol: w.last_balance_sol,
        lastBalanceCheck: w.last_balance_check,
        totalTrades: w.total_trades,
        totalProfitSol: w.total_profit_sol,
        createdAt: w.created_at,
        currentBalance: w.current_balance,
        sufficientBalance: w.sufficient_balance,
      })),
    };
  } catch (error) {
    console.error('❌ Error getting sub-wallets:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sub-wallets',
    };
  }
}

/**
 * Get decrypted keypair for signing (use with extreme caution)
 * SECURITY: Wipe memory immediately after use
 */
export async function getSubWalletKeypair(
  subWalletId: string
): Promise<{
  success: boolean;
  keypair?: Keypair;
  error?: string;
}> {
  try {
    // Get encrypted key
    const keyData = await getWalletKey(subWalletId);
    
    if (!keyData) {
      return {
        success: false,
        error: 'Private key not found.',
      };
    }
    
    // Decrypt private key
    const privateKey = retrieveKeyFromStorage({
      encryptedPrivateKey: keyData.encrypted_private_key,
      encryptionIv: keyData.encryption_iv,
      encryptionTag: keyData.encryption_tag,
    });
    
    // Parse keypair
    const secretKey = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(secretKey);
    
    // Update usage statistics
    await updateWalletKeyUsage(subWalletId);
    
    // Wipe private key from memory
    wipeMemory(privateKey);
    
    return {
      success: true,
      keypair,
    };
  } catch (error) {
    console.error('❌ Error getting keypair:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get keypair',
    };
  }
}

export default {
  hashString,
  generateGXQWallet,
  createUserSubWallet,
  importSubWallet,
  exportSubWallet,
  checkSubWalletBalance,
  getUserSubWallets,
  getSubWalletKeypair,
  MIN_SOL_BALANCE,
  MAX_SUB_WALLETS_PER_USER,
};
