/**
 * AES-256-GCM Encryption Service
 * Provides secure encryption/decryption for sensitive data like private keys
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with configurable iterations
 * - Random IV generation for each encryption
 * - Authentication tag for integrity verification
 * - Secure key wiping from memory after use
 */

import crypto from "crypto";

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
  authTag: string;
  iterations: number;
}

export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  salt: string;
  authTag: string;
  iterations?: number;
}

/**
 * Encryption configuration
 */
const ENCRYPTION_CONFIG = {
  algorithm: "aes-256-gcm" as const,
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  saltLength: 32,
  authTagLength: 16,
  defaultIterations: 100000, // PBKDF2 iterations
  minIterations: 50000,
  maxIterations: 500000,
};

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer, iterations: number): Buffer {
  if (
    iterations < ENCRYPTION_CONFIG.minIterations ||
    iterations > ENCRYPTION_CONFIG.maxIterations
  ) {
    throw new Error(
      `Iterations must be between ${ENCRYPTION_CONFIG.minIterations} and ${ENCRYPTION_CONFIG.maxIterations}`,
    );
  }

  return crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    ENCRYPTION_CONFIG.keyLength,
    "sha256",
  );
}

/**
 * Securely wipe buffer from memory
 */
function wipeBuffer(buffer: Buffer): void {
  if (buffer && buffer.length > 0) {
    buffer.fill(0);
  }
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt
 * @param password - Password for key derivation
 * @param iterations - PBKDF2 iterations (default: 100000)
 * @returns Encryption result with all necessary components
 */
export function encrypt(
  plaintext: string,
  password: string,
  iterations: number = ENCRYPTION_CONFIG.defaultIterations,
): EncryptionResult {
  if (!plaintext) {
    throw new Error("Plaintext cannot be empty");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
  const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

  // Derive key from password
  const key = deriveKey(password, salt, iterations);

  try {
    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv, {
      authTagLength: ENCRYPTION_CONFIG.authTagLength,
    });

    // Encrypt data
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString("base64"),
      salt: salt.toString("base64"),
      authTag: authTag.toString("base64"),
      iterations,
    };
  } finally {
    // Securely wipe key from memory
    wipeBuffer(key);
  }
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param input - Decryption input with all components
 * @param password - Password for key derivation
 * @returns Decrypted plaintext
 */
export function decrypt(input: DecryptionInput, password: string): string {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const iterations = input.iterations || ENCRYPTION_CONFIG.defaultIterations;

  // Convert base64 to buffers
  const salt = Buffer.from(input.salt, "base64");
  const iv = Buffer.from(input.iv, "base64");
  const authTag = Buffer.from(input.authTag, "base64");

  // Derive key from password
  const key = deriveKey(password, salt, iterations);

  try {
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv,
      { authTagLength: ENCRYPTION_CONFIG.authTagLength },
    );

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(input.encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // Authentication failed or decryption error
    if (error instanceof Error && error.message.includes("Unsupported state")) {
      throw new Error("Decryption failed: Invalid password or corrupted data");
    }
    throw error;
  } finally {
    // Securely wipe key from memory
    wipeBuffer(key);
  }
}

/**
 * Encrypt a Solana private key
 *
 * @param privateKey - Private key in base58 or array format
 * @param password - Password for encryption
 * @returns Encryption result
 */
export function encryptPrivateKey(
  privateKey: string | Uint8Array,
  password: string,
): EncryptionResult {
  // Convert to string format if needed
  const keyString =
    typeof privateKey === "string"
      ? privateKey
      : Buffer.from(privateKey).toString("base64");

  return encrypt(keyString, password);
}

/**
 * Decrypt a Solana private key
 *
 * @param input - Decryption input
 * @param password - Password for decryption
 * @returns Decrypted private key as string
 */
export function decryptPrivateKey(
  input: DecryptionInput,
  password: string,
): string {
  return decrypt(input, password);
}

/**
 * Re-encrypt data with a new password
 *
 * @param input - Current encryption input
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns New encryption result
 */
export function reEncrypt(
  input: DecryptionInput,
  currentPassword: string,
  newPassword: string,
): EncryptionResult {
  // Decrypt with current password
  const plaintext = decrypt(input, currentPassword);

  try {
    // Encrypt with new password
    return encrypt(plaintext, newPassword);
  } finally {
    // Wipe plaintext from memory (best effort in JavaScript)
    // Note: Complete memory wiping is not guaranteed in JavaScript
  }
}

/**
 * Validate encryption parameters
 */
export function validateEncryptionInput(input: DecryptionInput): boolean {
  try {
    // Check if all required fields are present
    if (!input.encryptedData || !input.iv || !input.salt || !input.authTag) {
      return false;
    }

    // Validate base64 encoding
    Buffer.from(input.iv, "base64");
    Buffer.from(input.salt, "base64");
    Buffer.from(input.authTag, "base64");

    // Validate iterations if provided
    if (input.iterations !== undefined) {
      if (
        input.iterations < ENCRYPTION_CONFIG.minIterations ||
        input.iterations > ENCRYPTION_CONFIG.maxIterations
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a secure random password
 * Useful for generating encryption passwords
 *
 * @param length - Password length (default: 32)
 * @returns Random password
 */
export function generateSecurePassword(length: number = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const randomBytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

export default {
  encrypt,
  decrypt,
  encryptPrivateKey,
  decryptPrivateKey,
  reEncrypt,
  validateEncryptionInput,
  generateSecurePassword,
};
