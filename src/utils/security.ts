import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Security validation utilities for mainnet operations
 */
export class SecurityValidator {
  // Known malicious addresses to blacklist
  private static readonly BLACKLISTED_ADDRESSES = new Set<string>([
    // Add known malicious addresses here
  ]);
  
  // Minimum SOL balance required for operations (in lamports)
  private static readonly MIN_SOL_BALANCE = 10000; // 0.00001 SOL
  
  // Maximum slippage allowed (as percentage)
  private static readonly MAX_SLIPPAGE_PERCENT = 0.50; // 50%
  
  /**
   * Validate a Solana address is not blacklisted
   */
  static validateAddress(address: string | PublicKey): boolean {
    try {
      const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
      const addressStr = pubkey.toString();
      
      if (this.BLACKLISTED_ADDRESSES.has(addressStr)) {
        console.error('[Security] Address is blacklisted:', addressStr);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[Security] Invalid address format:', error);
      return false;
    }
  }
  
  /**
   * Validate transaction parameters
   */
  static validateTransaction(
    transaction: Transaction | VersionedTransaction,
    expectedSigners: PublicKey[]
  ): boolean {
    try {
      // Check transaction has instructions
      let instructions;
      if (transaction instanceof Transaction) {
        instructions = transaction.instructions;
      } else {
        // VersionedTransaction
        instructions = transaction.message.compiledInstructions;
      }
      
      if (!instructions || instructions.length === 0) {
        console.error('[Security] Transaction has no instructions');
        return false;
      }
      
      // Validate signers
      if (expectedSigners.length === 0) {
        console.error('[Security] No expected signers provided');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[Security] Transaction validation error:', error);
      return false;
    }
  }
  
  /**
   * Validate slippage is within acceptable range
   */
  static validateSlippage(slippage: number): boolean {
    if (slippage < 0) {
      console.error('[Security] Slippage cannot be negative:', slippage);
      return false;
    }
    
    if (slippage > this.MAX_SLIPPAGE_PERCENT) {
      console.error('[Security] Slippage exceeds maximum allowed:', slippage, 'max:', this.MAX_SLIPPAGE_PERCENT);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate amount is positive and reasonable
   */
  static validateAmount(amount: number, decimals: number = 9): boolean {
    if (amount <= 0) {
      console.error('[Security] Amount must be positive:', amount);
      return false;
    }
    
    if (!Number.isFinite(amount)) {
      console.error('[Security] Amount must be finite:', amount);
      return false;
    }
    
    // Check for unreasonably large amounts (> 1 trillion tokens)
    const maxAmount = 1_000_000_000_000 * Math.pow(10, decimals);
    if (amount > maxAmount) {
      console.error('[Security] Amount exceeds reasonable limit:', amount);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate profit percentage is realistic
   */
  static validateProfitEstimate(profitPercent: number): boolean {
    // Profit cannot be negative (would be a loss)
    if (profitPercent < 0) {
      console.warn('[Security] Negative profit detected:', profitPercent);
      return false;
    }
    
    // Extremely high profit (>100%) is suspicious
    if (profitPercent > 1.0) {
      console.warn('[Security] Suspiciously high profit estimate:', profitPercent);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate token mint address is legitimate
   */
  static validateTokenMint(mint: string | PublicKey): boolean {
    try {
      const mintPubkey = typeof mint === 'string' ? new PublicKey(mint) : mint;
      
      // Check it's not the system program or other invalid addresses
      const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
      const NULL_ADDRESS = '00000000000000000000000000000000';
      const invalidAddresses = [
        SYSTEM_PROGRAM_ID,
        NULL_ADDRESS,
      ];
      
      const mintStr = mintPubkey.toString();
      if (invalidAddresses.includes(mintStr)) {
        console.error('[Security] Invalid token mint:', mintStr);
        return false;
      }
      
      return this.validateAddress(mintPubkey);
    } catch (error) {
      console.error('[Security] Token mint validation error:', error);
      return false;
    }
  }
  
  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/[;]/g, '')  // Remove command separators
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim()
      .slice(0, 1000); // Limit length
  }
  
  /**
   * Validate opportunity is safe to execute
   */
  static validateOpportunity(
    profitPercent: number,
    gasEstimate: number,
    confidence: number,
    minConfidence: number = 0.7
  ): { valid: boolean; reason?: string } {
    // Check profit is realistic
    if (!this.validateProfitEstimate(profitPercent)) {
      return { valid: false, reason: 'Invalid profit estimate' };
    }
    
    // Check confidence is acceptable
    if (confidence < minConfidence) {
      return { valid: false, reason: `Confidence too low: ${confidence} < ${minConfidence}` };
    }
    
    // Check gas estimate is reasonable (< 0.1 SOL)
    const maxGasLamports = 0.1 * 1e9; // 0.1 SOL in lamports
    if (gasEstimate > maxGasLamports) {
      return { valid: false, reason: `Gas estimate too high: ${gasEstimate} lamports` };
    }
    
    // Check profit exceeds gas cost
    // This is a simplified check; actual validation would need token amounts
    if (gasEstimate <= 0) {
      return { valid: false, reason: 'Invalid gas estimate' };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if environment is properly configured for mainnet
   */
  static validateMainnetConfig(
    rpcUrl: string,
    privateKey?: string
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check RPC URL
    if (!rpcUrl || rpcUrl.trim() === '') {
      warnings.push('RPC URL is not configured');
    }
    
    if (rpcUrl.includes('devnet')) {
      warnings.push('Using devnet RPC - switch to mainnet for production');
    }
    
    if (rpcUrl === 'https://api.mainnet-beta.solana.com') {
      warnings.push('Using public RPC - consider using a private/premium RPC for better performance');
    }
    
    // Check private key
    if (privateKey) {
      if (privateKey === 'your_private_key_here') {
        warnings.push('Private key not configured - execution features disabled');
      }
    }
    
    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
  
  /**
   * Log security event for audit trail
   */
  static logSecurityEvent(
    level: 'info' | 'warn' | 'error',
    event: string,
    details?: any
  ): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[Security][${level.toUpperCase()}][${timestamp}] ${event}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, details || '');
        break;
      case 'warn':
        console.warn(logMessage, details || '');
        break;
      default:
        console.log(logMessage, details || '');
    }
  }
}
