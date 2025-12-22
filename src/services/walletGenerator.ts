/**
 * GXQ Wallet Generator
 * Generates Solana wallets with the "GXQ" suffix using vanity address generation
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';
import bs58 from 'bs58';

export interface GeneratedWallet {
  publicKey: string;
  privateKey: Uint8Array;
  mnemonic?: string;
  suffix: string;
  attempts: number;
  generationTime: number;
}

export interface WalletGenerationOptions {
  suffix?: string; // Default: 'GXQ'
  caseSensitive?: boolean; // Default: false
  maxAttempts?: number; // Default: 1000000
  onProgress?: (attempts: number) => void;
}

/**
 * Generate a wallet with a specific suffix (default: GXQ)
 * Uses vanity address generation to find a keypair whose public key ends with the desired suffix
 */
export async function generateGXQWallet(
  options: WalletGenerationOptions = {}
): Promise<GeneratedWallet> {
  const {
    suffix = 'GXQ',
    caseSensitive = false,
    maxAttempts = 1000000,
    onProgress,
  } = options;

  const targetSuffix = caseSensitive ? suffix : suffix.toUpperCase();
  const startTime = Date.now();
  let attempts = 0;

  console.log(`[WalletGenerator] Generating wallet with suffix: ${targetSuffix}`);
  console.log(`[WalletGenerator] Case sensitive: ${caseSensitive}`);
  console.log(`[WalletGenerator] Max attempts: ${maxAttempts}`);

  while (attempts < maxAttempts) {
    attempts++;

    // Generate a random keypair
    const keypair = Keypair.generate();
    const publicKeyStr = keypair.publicKey.toString();
    const checkStr = caseSensitive ? publicKeyStr : publicKeyStr.toUpperCase();

    // Check if the public key ends with the desired suffix
    if (checkStr.endsWith(targetSuffix)) {
      const generationTime = Date.now() - startTime;
      
      console.log(`[WalletGenerator] ✅ Found matching wallet after ${attempts} attempts in ${generationTime}ms`);
      console.log(`[WalletGenerator] Public Key: ${publicKeyStr}`);

      return {
        publicKey: publicKeyStr,
        privateKey: keypair.secretKey,
        suffix: publicKeyStr.slice(-targetSuffix.length),
        attempts,
        generationTime,
      };
    }

    // Report progress every 10000 attempts
    if (onProgress && attempts % 10000 === 0) {
      onProgress(attempts);
    }
  }

  throw new Error(
    `Failed to generate wallet with suffix ${targetSuffix} after ${maxAttempts} attempts`
  );
}

/**
 * Generate multiple GXQ wallets
 */
export async function generateMultipleGXQWallets(
  count: number,
  options: WalletGenerationOptions = {}
): Promise<GeneratedWallet[]> {
  console.log(`[WalletGenerator] Generating ${count} GXQ wallets...`);
  
  const wallets: GeneratedWallet[] = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`[WalletGenerator] Generating wallet ${i + 1}/${count}...`);
    const wallet = await generateGXQWallet(options);
    wallets.push(wallet);
  }
  
  console.log(`[WalletGenerator] Successfully generated ${wallets.length} wallets`);
  return wallets;
}

/**
 * Encrypt a wallet's private key
 */
export function encryptWallet(
  privateKey: Uint8Array,
  password: string
): { encrypted: string; iv: string; salt: string } {
  // Generate a random salt
  const salt = crypto.randomBytes(32);
  
  // Derive encryption key from password using PBKDF2
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Encrypt the private key
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(Buffer.from(privateKey));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  };
}

/**
 * Decrypt a wallet's private key
 */
export function decryptWallet(
  encrypted: string,
  iv: string,
  salt: string,
  password: string
): Uint8Array {
  // Derive decryption key from password
  const saltBuffer = Buffer.from(salt, 'base64');
  const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');
  
  // Decrypt the private key
  const ivBuffer = Buffer.from(iv, 'base64');
  const encryptedBuffer = Buffer.from(encrypted, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return new Uint8Array(decrypted);
}

/**
 * Derive sub-wallets from a master wallet
 * Generates deterministic child wallets for arbitrage execution
 */
export function deriveSubWallets(
  masterPrivateKey: Uint8Array,
  count: number = 3
): GeneratedWallet[] {
  console.log(`[WalletGenerator] Deriving ${count} sub-wallets from master wallet...`);
  
  const subWallets: GeneratedWallet[] = [];
  
  for (let i = 0; i < count; i++) {
    // Derive a child key using HMAC-SHA256
    const hmac = crypto.createHmac('sha256', Buffer.from(masterPrivateKey));
    hmac.update(`gxq-sub-wallet-${i}`);
    const derivedSeed = hmac.digest();
    
    // Create keypair from derived seed
    const keypair = Keypair.fromSeed(derivedSeed.slice(0, 32));
    
    subWallets.push({
      publicKey: keypair.publicKey.toString(),
      privateKey: keypair.secretKey,
      suffix: `SUB${i}`,
      attempts: 0,
      generationTime: 0,
    });
    
    console.log(`[WalletGenerator] Sub-wallet ${i + 1}: ${keypair.publicKey.toString()}`);
  }
  
  return subWallets;
}

/**
 * Validate a GXQ wallet
 */
export function validateGXQWallet(publicKeyStr: string, expectedSuffix: string = 'GXQ'): boolean {
  try {
    // Validate it's a valid Solana public key
    new PublicKey(publicKeyStr);
    
    // Check if it ends with the expected suffix
    return publicKeyStr.toUpperCase().endsWith(expectedSuffix.toUpperCase());
  } catch {
    return false;
  }
}

/**
 * Export wallet to JSON format (encrypted)
 */
export function exportWallet(
  wallet: GeneratedWallet,
  password: string
): string {
  const encrypted = encryptWallet(wallet.privateKey, password);
  
  return JSON.stringify({
    publicKey: wallet.publicKey,
    encrypted: encrypted.encrypted,
    iv: encrypted.iv,
    salt: encrypted.salt,
    suffix: wallet.suffix,
    version: '1.0',
  });
}

/**
 * Import wallet from JSON format (encrypted)
 */
export function importWallet(
  jsonData: string,
  password: string
): GeneratedWallet {
  const data = JSON.parse(jsonData);
  
  const privateKey = decryptWallet(
    data.encrypted,
    data.iv,
    data.salt,
    password
  );
  
  return {
    publicKey: data.publicKey,
    privateKey,
    suffix: data.suffix,
    attempts: 0,
    generationTime: 0,
  };
}
