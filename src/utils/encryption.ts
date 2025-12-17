import crypto from 'crypto';

/**
 * Encryption utility for securing sensitive variables
 * Uses AES-256-GCM for encryption with authentication
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private saltLength = 64;
  private tagLength = 16;
  private iterations = 100000;

  /**
   * Encrypt sensitive data
   * @param plaintext Data to encrypt
   * @param password Encryption password (from secure env var)
   * @returns Encrypted string with salt, iv, tag, and ciphertext
   */
  encrypt(plaintext: string, password: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive key from password using PBKDF2
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        this.iterations,
        this.keyLength,
        'sha512'
      );

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        encrypted,
      ]).toString('base64');

      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt encrypted data
   * @param encryptedData Base64 encoded encrypted string
   * @param password Decryption password
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string, password: string): string {
    try {
      // Decode from base64
      const data = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = data.subarray(0, this.saltLength);
      const iv = data.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = data.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = data.subarray(this.saltLength + this.ivLength + this.tagLength);

      // Derive key from password
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        this.iterations,
        this.keyLength,
        'sha512'
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash sensitive data (one-way)
   * Useful for verification without storing plaintext
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random password
   * @param length Length of password (default 32)
   * @returns Random password string
   */
  generateSecurePassword(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  /**
   * Encrypt wallet private key
   * @param privateKey Private key in base58 or array format
   * @param password Encryption password
   * @returns Encrypted private key
   */
  encryptPrivateKey(privateKey: string, password: string): string {
    if (!privateKey || !password) {
      throw new Error('Private key and password are required');
    }
    return this.encrypt(privateKey, password);
  }

  /**
   * Decrypt wallet private key
   * @param encryptedKey Encrypted private key
   * @param password Decryption password
   * @returns Decrypted private key
   */
  decryptPrivateKey(encryptedKey: string, password: string): string {
    if (!encryptedKey || !password) {
      throw new Error('Encrypted key and password are required');
    }
    return this.decrypt(encryptedKey, password);
  }

  /**
   * Securely compare two strings (timing-attack resistant)
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Generate encryption key from environment
   * This should be stored in a secure environment variable
   */
  static generateMasterKey(): string {
    const key = crypto.randomBytes(32).toString('base64');
    console.log('🔐 Generated Master Encryption Key (store in ENCRYPTION_KEY env var):');
    console.log(key);
    console.log('\n⚠️ IMPORTANT: Store this securely and never commit to version control!');
    return key;
  }

  /**
   * Encrypt environment variables for storage
   */
  encryptEnvVars(vars: Record<string, string>, password: string): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(vars)) {
      encrypted[key] = this.encrypt(value, password);
    }
    return encrypted;
  }

  /**
   * Decrypt environment variables
   */
  decryptEnvVars(vars: Record<string, string>, password: string): Record<string, string> {
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(vars)) {
      try {
        decrypted[key] = this.decrypt(value, password);
      } catch (error) {
        console.error(`Failed to decrypt ${key}:`, error);
        decrypted[key] = ''; // Set empty on failure
      }
    }
    return decrypted;
  }
}

/**
 * Singleton instance for easy access
 */
export const encryptionService = new EncryptionService();

/**
 * Helper function to securely load encrypted environment variables
 */
export function loadSecureEnv(encryptionKey: string): Record<string, string> {
  const encryption = new EncryptionService();
  const secureVars: Record<string, string> = {};

  // List of variables that should be encrypted
  const sensitiveVars = [
    'WALLET_PRIVATE_KEY',
    'QUICKNODE_API_KEY',
    'ENCRYPTION_KEY',
  ];

  for (const varName of sensitiveVars) {
    const encryptedValue = process.env[`${varName}_ENCRYPTED`];
    if (encryptedValue) {
      try {
        secureVars[varName] = encryption.decrypt(encryptedValue, encryptionKey);
      } catch (error) {
        console.error(`Failed to decrypt ${varName}:`, error);
      }
    } else {
      // Fall back to unencrypted value (for backwards compatibility)
      secureVars[varName] = process.env[varName] || '';
    }
  }

  return secureVars;
}
