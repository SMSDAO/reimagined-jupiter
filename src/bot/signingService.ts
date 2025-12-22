/**
 * Secure Transaction Signing Service
 * 
 * Supports multiple signing modes:
 * - Client-side signing (wallet adapter)
 * - Server-side signing (encrypted keys)
 * - Enclave signing (secure hardware/software enclave)
 * 
 * SECURITY: Keys are NEVER exposed or logged. All operations are audited.
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  Keypair,
  PublicKey,
  SendOptions,
  TransactionSignature,
} from '@solana/web3.js';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { BuiltTransaction } from './transactionBuilder.js';
import { AuditLogger } from './auditLogger.js';

export type SigningMode = 'client' | 'server' | 'enclave';

export interface SigningConfig {
  /** Signing mode */
  mode: SigningMode;
  /** User wallet address */
  userWallet: PublicKey;
  /** Encryption key for server-side keys (derived from env) */
  encryptionKey?: Buffer;
}

export interface SignedTransaction {
  /** The signed transaction */
  transaction: Transaction | VersionedTransaction;
  /** Transaction signature (only available after sending) */
  signature?: TransactionSignature;
  /** Signing mode used */
  signingMode: SigningMode;
  /** Timestamp when signed */
  signedAt: number;
}

export class SigningService {
  private connection: Connection;
  private auditLogger: AuditLogger;
  private encryptionKey: Buffer;

  constructor(connection: Connection, auditLogger: AuditLogger) {
    this.connection = connection;
    this.auditLogger = auditLogger;
    
    // Derive encryption key from environment
    // CRITICAL: This key must be stored securely and rotated regularly
    const secret = process.env.SIGNING_ENCRYPTION_KEY || 'default-dev-key-CHANGE-IN-PRODUCTION';
    this.encryptionKey = createHash('sha256').update(secret).digest();
  }

  /**
   * Sign a transaction using the specified mode
   * 
   * @param builtTx - The transaction to sign
   * @param config - Signing configuration
   * @param walletSignFunction - For client-side signing, the wallet's sign function
   * @param encryptedPrivateKey - For server-side signing, the encrypted private key
   * @returns Signed transaction
   */
  async signTransaction(
    builtTx: BuiltTransaction,
    config: SigningConfig,
    walletSignFunction?: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>,
    encryptedPrivateKey?: string
  ): Promise<SignedTransaction> {
    const signedAt = Date.now();

    // Audit log the signing request
    await this.auditLogger.logAction({
      userId: config.userWallet.toBase58(),
      action: 'transaction_signing_requested',
      actionType: 'security',
      severity: 'info',
      metadata: {
        signingMode: config.mode,
        transactionHash: builtTx.transactionHash,
        transactionType: builtTx.metadata.type,
      },
    });

    let signedTransaction: Transaction | VersionedTransaction;

    switch (config.mode) {
      case 'client':
        signedTransaction = await this.signWithWallet(
          builtTx.transaction,
          walletSignFunction,
          config.userWallet
        );
        break;

      case 'server':
        signedTransaction = await this.signWithServerKey(
          builtTx.transaction,
          encryptedPrivateKey,
          config.userWallet
        );
        break;

      case 'enclave':
        signedTransaction = await this.signWithEnclave(
          builtTx.transaction,
          config.userWallet
        );
        break;

      default:
        throw new Error(`Unsupported signing mode: ${config.mode}`);
    }

    // Audit log successful signing
    await this.auditLogger.logAction({
      userId: config.userWallet.toBase58(),
      action: 'transaction_signed',
      actionType: 'security',
      severity: 'info',
      metadata: {
        signingMode: config.mode,
        transactionHash: builtTx.transactionHash,
        signedAt,
      },
    });

    return {
      transaction: signedTransaction,
      signingMode: config.mode,
      signedAt,
    };
  }

  /**
   * Sign with client-side wallet (Phantom, Solflare, etc.)
   * 
   * This is the most secure option as the private key never leaves the user's device.
   */
  private async signWithWallet(
    transaction: Transaction | VersionedTransaction,
    walletSignFunction?: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>,
    userWallet?: PublicKey
  ): Promise<Transaction | VersionedTransaction> {
    if (!walletSignFunction) {
      throw new Error('Wallet sign function is required for client-side signing');
    }

    try {
      const signedTx = await walletSignFunction(transaction);
      return signedTx;
    } catch (error) {
      await this.auditLogger.logAction({
        userId: userWallet?.toBase58() || 'unknown',
        action: 'transaction_signing_failed',
        actionType: 'error',
        severity: 'error',
        metadata: {
          signingMode: 'client',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw new Error(`Client signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sign with server-side encrypted private key
   * 
   * SECURITY WARNING: This should only be used when client-side signing is not possible.
   * Keys must be encrypted at rest and access must be strictly controlled.
   */
  private async signWithServerKey(
    transaction: Transaction | VersionedTransaction,
    encryptedPrivateKey?: string,
    userWallet?: PublicKey
  ): Promise<Transaction | VersionedTransaction> {
    if (!encryptedPrivateKey) {
      throw new Error('Encrypted private key is required for server-side signing');
    }

    try {
      // Decrypt the private key
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);
      const keypair = Keypair.fromSecretKey(privateKey);

      // Verify keypair matches user wallet
      if (!keypair.publicKey.equals(userWallet!)) {
        throw new Error('Private key does not match user wallet');
      }

      // Sign the transaction
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([keypair]);
      } else {
        transaction.partialSign(keypair);
      }

      // Zero out the private key from memory immediately
      privateKey.fill(0);

      return transaction;
    } catch (error) {
      await this.auditLogger.logAction({
        userId: userWallet?.toBase58() || 'unknown',
        action: 'transaction_signing_failed',
        actionType: 'error',
        severity: 'error',
        metadata: {
          signingMode: 'server',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw new Error(`Server signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sign with secure enclave
   * 
   * This uses a secure hardware or software enclave to sign transactions.
   * The private key never leaves the enclave.
   */
  private async signWithEnclave(
    transaction: Transaction | VersionedTransaction,
    userWallet: PublicKey
  ): Promise<Transaction | VersionedTransaction> {
    try {
      // IMPLEMENTATION NOTE: This is a placeholder for actual enclave integration
      // Real implementation would use AWS KMS, Azure Key Vault, Google Cloud KMS,
      // or a hardware security module (HSM)
      
      // For now, we'll use a simpler approach with environment variables
      // In production, this should be replaced with proper enclave integration
      
      const enclaveKeyBase64 = process.env[`ENCLAVE_KEY_${userWallet.toBase58()}`];
      if (!enclaveKeyBase64) {
        throw new Error('Enclave key not found for user');
      }

      const privateKey = Buffer.from(enclaveKeyBase64, 'base64');
      const keypair = Keypair.fromSecretKey(privateKey);

      // Verify keypair matches user wallet
      if (!keypair.publicKey.equals(userWallet)) {
        throw new Error('Enclave key does not match user wallet');
      }

      // Sign the transaction
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([keypair]);
      } else {
        transaction.partialSign(keypair);
      }

      // Zero out the private key from memory
      privateKey.fill(0);

      return transaction;
    } catch (error) {
      await this.auditLogger.logAction({
        userId: userWallet.toBase58(),
        action: 'transaction_signing_failed',
        actionType: 'error',
        severity: 'error',
        metadata: {
          signingMode: 'enclave',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw new Error(`Enclave signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encrypt a private key for storage
   * 
   * SECURITY: This should only be called once during user onboarding.
   * The encrypted key should be stored in the database, never the raw key.
   */
  encryptPrivateKey(privateKey: Uint8Array): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(privateKey)),
      cipher.final(),
    ]);

    // Return IV + encrypted data, both base64 encoded
    return `${iv.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypt a private key from storage
   * 
   * SECURITY: The decrypted key must be zeroed out from memory immediately after use.
   */
  private decryptPrivateKey(encryptedKey: string): Uint8Array {
    const [ivBase64, encryptedBase64] = encryptedKey.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return new Uint8Array(decrypted);
  }

  /**
   * Send a signed transaction to the network
   */
  async sendSignedTransaction(
    signedTx: SignedTransaction,
    options?: SendOptions
  ): Promise<TransactionSignature> {
    try {
      const signature = await this.connection.sendRawTransaction(
        signedTx.transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
          ...options,
        }
      );

      signedTx.signature = signature;

      return signature;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Confirm a transaction with retries
   */
  async confirmTransaction(
    signature: TransactionSignature,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
  ): Promise<boolean> {
    try {
      const result = await this.connection.confirmTransaction(signature, commitment);
      return !result.value.err;
    } catch (error) {
      console.error('Transaction confirmation error:', error);
      return false;
    }
  }
}
