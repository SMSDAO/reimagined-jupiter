/**
 * Wallet Management Service
 * Manages user sub-wallets with secure encryption and GXQ suffix validation
 * 
 * Features:
 * - Maximum 3 wallets per user
 * - AES-256-GCM encryption for private keys
 * - GXQ suffix validation (last 3 characters must be "GXQ")
 * - Comprehensive audit logging
 * - In-memory key decryption with immediate wiping
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import { encrypt, decrypt, encryptPrivateKey, decryptPrivateKey, type EncryptionResult } from './encryption.js';

export interface UserWallet {
  id: string;
  userId: string;
  walletAddress: string;
  walletLabel?: string;
  isPrimary: boolean;
  hasGxqSuffix: boolean;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedWallet extends UserWallet {
  encryptedPrivateKey: string;
  encryptionIv: string;
  encryptionSalt: string;
  encryptionTag: string;
  keyDerivationIterations: number;
}

export interface WalletCreationOptions {
  label?: string;
  isPrimary?: boolean;
  requireGxqSuffix?: boolean;
}

export interface WalletAuditEntry {
  walletId: string;
  userId: string;
  operation: string;
  operationData?: Record<string, any>;
  ipAddressHash?: string;
  fingerprintHash?: string;
  transactionSignature?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Hash sensitive data for audit logging
 */
function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Validate GXQ suffix (last 3 characters must be "GXQ")
 */
export function validateGxqSuffix(publicKey: string): boolean {
  return publicKey.endsWith('GXQ');
}

/**
 * Generate a new Solana wallet with optional GXQ suffix requirement
 */
export async function generateWallet(
  requireGxqSuffix: boolean = false,
  maxAttempts: number = 100000
): Promise<Keypair> {
  if (!requireGxqSuffix) {
    return Keypair.generate();
  }
  
  // Generate wallets until we find one with GXQ suffix
  for (let i = 0; i < maxAttempts; i++) {
    const keypair = Keypair.generate();
    const publicKeyStr = keypair.publicKey.toBase58();
    
    if (validateGxqSuffix(publicKeyStr)) {
      console.log(`✅ Generated GXQ wallet after ${i + 1} attempts: ${publicKeyStr}`);
      return keypair;
    }
  }
  
  throw new Error(`Failed to generate GXQ wallet after ${maxAttempts} attempts`);
}

/**
 * Create and encrypt a new wallet for a user
 */
export async function createUserWallet(
  userId: string,
  encryptionPassword: string,
  options: WalletCreationOptions = {}
): Promise<{
  wallet: EncryptedWallet;
  keypair: Keypair;
}> {
  // Generate wallet with optional GXQ requirement
  const keypair = await generateWallet(options.requireGxqSuffix);
  const publicKeyStr = keypair.publicKey.toBase58();
  const privateKeyBytes = keypair.secretKey;
  
  // Encrypt private key
  const encrypted = encryptPrivateKey(privateKeyBytes, encryptionPassword);
  
  // Create wallet object
  const wallet: EncryptedWallet = {
    id: crypto.randomUUID(),
    userId,
    walletAddress: publicKeyStr,
    walletLabel: options.label,
    isPrimary: options.isPrimary || false,
    hasGxqSuffix: validateGxqSuffix(publicKeyStr),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    encryptedPrivateKey: encrypted.encryptedData,
    encryptionIv: encrypted.iv,
    encryptionSalt: encrypted.salt,
    encryptionTag: encrypted.authTag,
    keyDerivationIterations: encrypted.iterations,
  };
  
  return { wallet, keypair };
}

/**
 * Decrypt and restore wallet keypair
 * Keys are decrypted in-memory and should be wiped immediately after use
 */
export function decryptWallet(
  wallet: EncryptedWallet,
  encryptionPassword: string
): Keypair {
  try {
    // Decrypt private key
    const decryptedKeyStr = decryptPrivateKey(
      {
        encryptedData: wallet.encryptedPrivateKey,
        iv: wallet.encryptionIv,
        salt: wallet.encryptionSalt,
        authTag: wallet.encryptionTag,
        iterations: wallet.keyDerivationIterations,
      },
      encryptionPassword
    );
    
    // Convert back to Keypair
    let secretKey: Uint8Array;
    
    // Check if it's base58 (old format) or base64 (new format)
    try {
      secretKey = bs58.decode(decryptedKeyStr);
    } catch {
      secretKey = new Uint8Array(Buffer.from(decryptedKeyStr, 'base64'));
    }
    
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(`Failed to decrypt wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import an existing wallet with encryption
 */
export function importWallet(
  userId: string,
  privateKey: string | Uint8Array,
  encryptionPassword: string,
  options: WalletCreationOptions = {}
): {
  wallet: EncryptedWallet;
  keypair: Keypair;
} {
  // Parse private key
  let secretKey: Uint8Array;
  
  if (typeof privateKey === 'string') {
    try {
      // Try base58 first (Solana standard)
      secretKey = bs58.decode(privateKey);
    } catch {
      // Try hex format
      secretKey = new Uint8Array(Buffer.from(privateKey, 'hex'));
    }
  } else {
    secretKey = privateKey;
  }
  
  // Create keypair
  const keypair = Keypair.fromSecretKey(secretKey);
  const publicKeyStr = keypair.publicKey.toBase58();
  
  // Validate GXQ suffix if required
  if (options.requireGxqSuffix && !validateGxqSuffix(publicKeyStr)) {
    throw new Error('Imported wallet does not have GXQ suffix');
  }
  
  // Encrypt private key
  const encrypted = encryptPrivateKey(secretKey, encryptionPassword);
  
  // Create wallet object
  const wallet: EncryptedWallet = {
    id: crypto.randomUUID(),
    userId,
    walletAddress: publicKeyStr,
    walletLabel: options.label,
    isPrimary: options.isPrimary || false,
    hasGxqSuffix: validateGxqSuffix(publicKeyStr),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    encryptedPrivateKey: encrypted.encryptedData,
    encryptionIv: encrypted.iv,
    encryptionSalt: encrypted.salt,
    encryptionTag: encrypted.authTag,
    keyDerivationIterations: encrypted.iterations,
  };
  
  return { wallet, keypair };
}

/**
 * Create audit log entry for wallet operations
 */
export function createAuditEntry(
  walletId: string,
  userId: string,
  operation: string,
  options: {
    operationData?: Record<string, any>;
    ipAddress?: string;
    fingerprint?: string;
    transactionSignature?: string;
    success?: boolean;
    errorMessage?: string;
  } = {}
): WalletAuditEntry {
  return {
    walletId,
    userId,
    operation,
    operationData: options.operationData,
    ipAddressHash: options.ipAddress ? hashData(options.ipAddress) : undefined,
    fingerprintHash: options.fingerprint ? hashData(options.fingerprint) : undefined,
    transactionSignature: options.transactionSignature,
    success: options.success ?? true,
    errorMessage: options.errorMessage,
    createdAt: new Date(),
  };
}

/**
 * Validate wallet ownership
 */
export function validateWalletOwnership(
  wallet: UserWallet,
  userId: string
): boolean {
  return wallet.userId === userId && wallet.isActive;
}

/**
 * Check if user can create more wallets (max 3)
 */
export function canCreateWallet(currentWalletCount: number): boolean {
  return currentWalletCount < 3;
}

/**
 * Rotate wallet encryption
 * Re-encrypts wallet with new password
 */
export function rotateWalletEncryption(
  wallet: EncryptedWallet,
  currentPassword: string,
  newPassword: string
): EncryptedWallet {
  // Decrypt with current password
  const keypair = decryptWallet(wallet, currentPassword);
  
  try {
    // Re-encrypt with new password
    const encrypted = encryptPrivateKey(keypair.secretKey, newPassword);
    
    return {
      ...wallet,
      encryptedPrivateKey: encrypted.encryptedData,
      encryptionIv: encrypted.iv,
      encryptionSalt: encrypted.salt,
      encryptionTag: encrypted.authTag,
      keyDerivationIterations: encrypted.iterations,
      updatedAt: new Date(),
    };
  } finally {
    // Wipe keypair from memory (best effort)
    keypair.secretKey.fill(0);
  }
}

/**
 * Sign a transaction with wallet
 * Keys are decrypted only for signing and immediately wiped
 */
export async function signWithWallet<T extends { sign: (signers: Keypair[]) => void }>(
  wallet: EncryptedWallet,
  encryptionPassword: string,
  transaction: T,
  auditOptions?: {
    userId: string;
    ipAddress?: string;
    fingerprint?: string;
  }
): Promise<{
  signedTransaction: T;
  auditEntry: WalletAuditEntry;
}> {
  let keypair: Keypair | null = null;
  
  try {
    // Decrypt wallet
    keypair = decryptWallet(wallet, encryptionPassword);
    
    // Sign transaction
    transaction.sign([keypair]);
    
    // Create audit entry
    const auditEntry = createAuditEntry(
      wallet.id,
      auditOptions?.userId || wallet.userId,
      'TRANSACTION_SIGN',
      {
        operationData: { walletAddress: wallet.walletAddress },
        ipAddress: auditOptions?.ipAddress,
        fingerprint: auditOptions?.fingerprint,
        success: true,
      }
    );
    
    return {
      signedTransaction: transaction,
      auditEntry,
    };
  } catch (error) {
    // Create failure audit entry
    const auditEntry = createAuditEntry(
      wallet.id,
      auditOptions?.userId || wallet.userId,
      'TRANSACTION_SIGN',
      {
        operationData: { walletAddress: wallet.walletAddress },
        ipAddress: auditOptions?.ipAddress,
        fingerprint: auditOptions?.fingerprint,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
    );
    
    throw error;
  } finally {
    // Wipe keypair from memory
    if (keypair) {
      keypair.secretKey.fill(0);
    }
  }
}

/**
 * Export public key only (safe to share)
 */
export function exportPublicKey(wallet: UserWallet): string {
  return wallet.walletAddress;
}

/**
 * Validate wallet address format
 */
export function validateWalletAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export default {
  generateWallet,
  createUserWallet,
  decryptWallet,
  importWallet,
  createAuditEntry,
  validateWalletOwnership,
  canCreateWallet,
  rotateWalletEncryption,
  signWithWallet,
  exportPublicKey,
  validateWalletAddress,
  validateGxqSuffix,
};
