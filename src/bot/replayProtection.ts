/**
 * Replay Protection System
 * 
 * Prevents duplicate transaction execution through multiple layers:
 * 1. Nonce tracking per user
 * 2. Transaction hash deduplication
 * 3. Timestamp validation
 * 4. Signature tracking
 * 
 * All transactions are checked before execution to ensure they haven't been processed.
 */

import { query } from '../../db/database.js';
import { createHash } from 'crypto';

export interface ReplayCheckResult {
  /** Whether the transaction is safe to execute */
  safe: boolean;
  /** Reason if not safe */
  reason?: string;
  /** Whether this is a duplicate */
  isDuplicate: boolean;
}

export interface TransactionRecord {
  userId: string;
  transactionHash: string;
  nonce: bigint;
  timestamp: number;
  signature?: string;
}

export class ReplayProtection {
  /**
   * Maximum age of a transaction in milliseconds (5 minutes)
   * Transactions older than this are rejected
   */
  private readonly MAX_TRANSACTION_AGE_MS = 5 * 60 * 1000;

  /**
   * Maximum number of pending nonces per user
   * This prevents nonce exhaustion attacks
   */
  private readonly MAX_PENDING_NONCES = 100;

  /**
   * Check if a transaction is safe to execute
   * 
   * This performs multiple checks:
   * - Nonce hasn't been used
   * - Transaction hash hasn't been seen
   * - Transaction isn't too old
   * - User hasn't hit rate limits
   */
  async checkTransaction(record: TransactionRecord): Promise<ReplayCheckResult> {
    try {
      // Check 1: Validate timestamp (not too old)
      const age = Date.now() - record.timestamp;
      if (age > this.MAX_TRANSACTION_AGE_MS) {
        return {
          safe: false,
          isDuplicate: false,
          reason: `Transaction is ${Math.floor(age / 1000)}s old (max: ${this.MAX_TRANSACTION_AGE_MS / 1000}s)`,
        };
      }

      // Check 2: Verify nonce hasn't been used
      const nonceUsed = await this.isNonceUsed(record.userId, record.nonce);
      if (nonceUsed) {
        return {
          safe: false,
          isDuplicate: true,
          reason: `Nonce ${record.nonce} already used by user ${record.userId.slice(0, 8)}...`,
        };
      }

      // Check 3: Verify transaction hash hasn't been seen
      const hashSeen = await this.isTransactionHashSeen(record.transactionHash);
      if (hashSeen) {
        return {
          safe: false,
          isDuplicate: true,
          reason: `Transaction hash ${record.transactionHash.slice(0, 16)}... already processed`,
        };
      }

      // Check 4: Verify user hasn't hit pending nonce limit
      const pendingNonces = await this.getPendingNonceCount(record.userId);
      if (pendingNonces >= this.MAX_PENDING_NONCES) {
        return {
          safe: false,
          isDuplicate: false,
          reason: `User has ${pendingNonces} pending transactions (max: ${this.MAX_PENDING_NONCES})`,
        };
      }

      // All checks passed
      return {
        safe: true,
        isDuplicate: false,
      };
    } catch (error) {
      console.error('Replay protection check error:', error);
      return {
        safe: false,
        isDuplicate: false,
        reason: `Internal error during replay check: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Record a transaction nonce
   * 
   * This should be called BEFORE sending the transaction to the network.
   * It reserves the nonce and marks it as pending.
   */
  async recordNonce(
    userId: string,
    nonce: bigint,
    transactionHash: string,
    expiresInMs: number = 60000 // 1 minute default
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + expiresInMs);
      
      await query(
        `INSERT INTO transaction_nonces (user_id, nonce, transaction_hash, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, nonce) DO NOTHING`,
        [userId, nonce.toString(), transactionHash, expiresAt]
      );
    } catch (error) {
      console.error('Failed to record nonce:', error);
      throw new Error(`Failed to record nonce: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mark a transaction as executed
   * 
   * This should be called AFTER the transaction is confirmed on-chain.
   */
  async markExecuted(
    userId: string,
    transactionHash: string,
    signature: string,
    nonce: bigint
  ): Promise<void> {
    try {
      // Update the bot_executions table with the signature
      await query(
        `UPDATE bot_executions 
         SET transaction_signature = $1, status = 'success'
         WHERE user_id = $2 AND transaction_hash = $3 AND nonce = $4`,
        [signature, userId, transactionHash, nonce.toString()]
      );

      // Update the nonce record
      await query(
        `UPDATE transaction_nonces
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND nonce = $2`,
        [userId, nonce.toString()]
      );
    } catch (error) {
      console.error('Failed to mark transaction as executed:', error);
      throw new Error(`Failed to mark executed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a nonce has been used
   */
  private async isNonceUsed(userId: string, nonce: bigint): Promise<boolean> {
    try {
      const result = await query(
        `SELECT 1 FROM transaction_nonces
         WHERE user_id = $1 AND nonce = $2
         LIMIT 1`,
        [userId, nonce.toString()]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking nonce:', error);
      // Fail safe: if we can't check, assume it's used to prevent duplicates
      return true;
    }
  }

  /**
   * Check if a transaction hash has been seen
   */
  private async isTransactionHashSeen(transactionHash: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT 1 FROM bot_executions
         WHERE transaction_hash = $1
         LIMIT 1`,
        [transactionHash]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking transaction hash:', error);
      // Fail safe: if we can't check, assume it's seen to prevent duplicates
      return true;
    }
  }

  /**
   * Get count of pending nonces for a user
   */
  private async getPendingNonceCount(userId: string): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM transaction_nonces
         WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [userId]
      );
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Error counting pending nonces:', error);
      // Fail safe: return max to prevent execution if we can't check
      return this.MAX_PENDING_NONCES;
    }
  }

  /**
   * Clean up expired nonces
   * 
   * This should be called periodically (e.g., via cron job).
   * It removes expired nonces that were never executed.
   */
  async cleanupExpiredNonces(): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM transaction_nonces
         WHERE expires_at < CURRENT_TIMESTAMP
         AND used_at IS NULL`
      );
      
      const deleted = result.rowCount || 0;
      console.log(`Cleaned up ${deleted} expired nonces`);
      return deleted;
    } catch (error) {
      console.error('Error cleaning up expired nonces:', error);
      return 0;
    }
  }

  /**
   * Get nonce statistics for a user
   */
  async getNonceStats(userId: string): Promise<{
    total: number;
    pending: number;
    used: number;
    expired: number;
  }> {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN used_at IS NULL AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as pending,
           COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used,
           COUNT(CASE WHEN used_at IS NULL AND expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired
         FROM transaction_nonces
         WHERE user_id = $1`,
        [userId]
      );

      const row = result.rows[0];
      return {
        total: parseInt(row.total, 10),
        pending: parseInt(row.pending, 10),
        used: parseInt(row.used, 10),
        expired: parseInt(row.expired, 10),
      };
    } catch (error) {
      console.error('Error getting nonce stats:', error);
      return { total: 0, pending: 0, used: 0, expired: 0 };
    }
  }

  /**
   * Validate transaction hash format
   */
  validateTransactionHash(hash: string): boolean {
    // SHA-256 hash should be 64 hex characters
    return /^[a-f0-9]{64}$/i.test(hash);
  }

  /**
   * Generate a deterministic transaction ID for logging
   */
  generateTransactionId(userId: string, nonce: bigint, timestamp: number): string {
    const hash = createHash('sha256');
    hash.update(userId);
    hash.update(nonce.toString());
    hash.update(timestamp.toString());
    return hash.digest('hex').slice(0, 16);
  }
}

// Export singleton instance
export const replayProtection = new ReplayProtection();
