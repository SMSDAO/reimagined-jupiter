import { Keypair, Connection, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Security utilities for transaction signing and validation
 */
export class SecurityManager {
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Validate that a keypair is properly formatted and has funds
   */
  async validateKeypair(keypair: Keypair, minBalance: number = 0.01): Promise<{
    valid: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      // Check keypair is valid
      if (!keypair.publicKey) {
        return { valid: false, error: 'Invalid keypair: missing public key' };
      }
      
      // Check balance
      const balance = await this.connection.getBalance(keypair.publicKey);
      const balanceSol = balance / 1e9;
      
      if (balanceSol < minBalance) {
        return {
          valid: false,
          balance: balanceSol,
          error: `Insufficient balance: ${balanceSol.toFixed(6)} SOL (minimum: ${minBalance} SOL)`
        };
      }
      
      console.log(`✅ Wallet validated: ${keypair.publicKey.toBase58().slice(0, 8)}...`);
      console.log(`   Balance: ${balanceSol.toFixed(6)} SOL`);
      
      return { valid: true, balance: balanceSol };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        error: `Keypair validation error: ${errorMessage}`
      };
    }
  }
  
  /**
   * Securely load keypair from base58 encoded private key
   */
  loadKeypairFromEnv(privateKeyBase58: string): Keypair | null {
    try {
      if (!privateKeyBase58 || privateKeyBase58.trim() === '') {
        console.error('❌ Private key is empty or not set');
        return null;
      }
      
      // Decode base58 private key
      const privateKeyBytes = bs58.decode(privateKeyBase58);
      
      // Validate length (should be 64 bytes for Solana keypair)
      if (privateKeyBytes.length !== 64) {
        console.error(`❌ Invalid private key length: ${privateKeyBytes.length} (expected 64)`);
        return null;
      }
      
      const keypair = Keypair.fromSecretKey(privateKeyBytes);
      console.log(`✅ Keypair loaded successfully: ${keypair.publicKey.toBase58().slice(0, 8)}...`);
      
      return keypair;
    } catch (error) {
      console.error('❌ Error loading keypair:', error);
      return null;
    }
  }
  
  /**
   * Validate a public key address
   */
  validatePublicKey(address: string): { valid: boolean; publicKey?: PublicKey; error?: string } {
    try {
      const publicKey = new PublicKey(address);
      
      // Check if it's a valid base58 string
      if (publicKey.toBase58() !== address) {
        return { valid: false, error: 'Invalid public key format' };
      }
      
      return { valid: true, publicKey };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid public key'
      };
    }
  }
  
  /**
   * Validate transaction before signing
   * Checks for common issues that could cause failures
   */
  async validateTransaction(transaction: Transaction): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Check if transaction has instructions
      if (transaction.instructions.length === 0) {
        issues.push('Transaction has no instructions');
      }
      
      // Check if fee payer is set
      if (!transaction.feePayer) {
        issues.push('Transaction fee payer is not set');
      }
      
      // Check if recent blockhash is set
      if (!transaction.recentBlockhash) {
        issues.push('Transaction recent blockhash is not set');
      }
      
      // Check for duplicate instructions (potential bug)
      const instructionHashes = transaction.instructions.map(ix => 
        `${ix.programId.toBase58()}-${ix.keys.length}`
      );
      const uniqueHashes = new Set(instructionHashes);
      if (uniqueHashes.size !== instructionHashes.length) {
        issues.push('Transaction may contain duplicate instructions');
      }
      
      // Validate all account keys are valid
      for (const instruction of transaction.instructions) {
        for (const key of instruction.keys) {
          if (!key.pubkey) {
            issues.push('Transaction contains invalid account key');
            break;
          }
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, issues };
    }
  }
  
  /**
   * Sanitize transaction data for logging (remove sensitive info)
   */
  sanitizeForLogging(transaction: Transaction): object {
    return {
      instructionCount: transaction.instructions.length,
      feePayer: transaction.feePayer?.toBase58().slice(0, 8) + '...',
      hasRecentBlockhash: !!transaction.recentBlockhash,
      signatures: transaction.signatures.length,
      programs: transaction.instructions.map(ix => ix.programId.toBase58().slice(0, 8) + '...')
    };
  }
  
  /**
   * Verify transaction signature on-chain
   */
  async verifyTransactionSignature(signature: string): Promise<{
    confirmed: boolean;
    slot?: number;
    blockTime?: number;
    error?: string;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });
      
      if (!status || !status.value) {
        return {
          confirmed: false,
          error: 'Transaction not found'
        };
      }
      
      if (status.value.err) {
        return {
          confirmed: false,
          error: `Transaction failed: ${JSON.stringify(status.value.err)}`
        };
      }
      
      // Get additional transaction details
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      return {
        confirmed: true,
        slot: tx?.slot,
        blockTime: tx?.blockTime || undefined
      };
    } catch (error) {
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Rate limiter for RPC calls to prevent abuse
   */
  private lastCallTime: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 100; // 10 calls per second per method
  
  async rateLimitedCall<T>(
    method: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const lastCall = this.lastCallTime.get(method) || 0;
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCallTime.set(method, Date.now());
    return fn();
  }
  
  /**
   * Estimate transaction size and fee
   */
  estimateTransactionFee(transaction: Transaction): {
    estimatedSize: number;
    estimatedFee: number;
  } {
    // Rough estimation based on instruction count and signatures
    const baseSize = 64; // Base transaction size
    const signatureSize = 64 * (transaction.signatures.length || 1);
    const instructionSize = transaction.instructions.reduce((sum, ix) => {
      return sum + 32 + ix.keys.length * 34 + ix.data.length;
    }, 0);
    
    const estimatedSize = baseSize + signatureSize + instructionSize;
    
    // Base fee is 5000 lamports per signature
    const estimatedFee = 5000 * (transaction.signatures.length || 1);
    
    return { estimatedSize, estimatedFee };
  }
  
  /**
   * Check if an address is a known malicious address (placeholder)
   */
  checkAddressBlacklist(address: PublicKey): { blacklisted: boolean; reason?: string } {
    // In production, maintain a list of known malicious addresses
    // or integrate with a service like Blowfish or GoPlus Security
    
    const blacklistedAddresses: string[] = [
      // Add known malicious addresses here
    ];
    
    const addressStr = address.toBase58();
    if (blacklistedAddresses.includes(addressStr)) {
      return {
        blacklisted: true,
        reason: 'Address is on security blacklist'
      };
    }
    
    return { blacklisted: false };
  }
  
  /**
   * Generate a transaction fingerprint for deduplication
   */
  generateTransactionFingerprint(transaction: Transaction): string {
    const data = {
      instructions: transaction.instructions.map(ix => ({
        program: ix.programId.toBase58(),
        accounts: ix.keys.map(k => k.pubkey.toBase58()),
        dataHash: Buffer.from(ix.data).toString('hex').slice(0, 16)
      })),
      feePayer: transaction.feePayer?.toBase58()
    };
    
    return JSON.stringify(data);
  }
}

/**
 * Environment variable security checker
 */
export class EnvironmentSecurityChecker {
  /**
   * Check for common security issues in environment configuration
   */
  static checkEnvironmentSecurity(): {
    secure: boolean;
    warnings: string[];
    criticalIssues: string[];
  } {
    const warnings: string[] = [];
    const criticalIssues: string[] = [];
    
    // Check if running in production mode
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      // In production, ensure all sensitive data comes from env vars
      if (!process.env.WALLET_PRIVATE_KEY) {
        criticalIssues.push('WALLET_PRIVATE_KEY not set in production');
      }
      
      if (!process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC_URL.includes('api.mainnet-beta.solana.com')) {
        warnings.push('Using public RPC endpoint in production (use QuickNode or private RPC)');
      }
    }
    
    // Check for default/placeholder values
    if (process.env.DEV_FEE_WALLET === '11111111111111111111111111111111') {
      warnings.push('DEV_FEE_WALLET is set to placeholder value');
    }
    
    if (process.env.DAO_WALLET_ADDRESS === 'DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW') {
      // This is actually the correct value per spec, so no warning
    }
    
    // Check for weak private keys (for testing only)
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (privateKey && privateKey.length < 32) {
      criticalIssues.push('WALLET_PRIVATE_KEY appears to be too short');
    }
    
    // Check profit distribution percentages sum to 100%
    const reservePct = parseFloat(process.env.RESERVE_PERCENTAGE || '0.70');
    const gasPct = parseFloat(process.env.GAS_SLIPPAGE_PERCENTAGE || '0.20');
    const daoPct = parseFloat(process.env.DAO_PERCENTAGE || '0.10');
    const total = reservePct + gasPct + daoPct;
    
    if (Math.abs(total - 1.0) > 0.001) {
      criticalIssues.push(`Profit distribution percentages sum to ${(total * 100).toFixed(1)}%, not 100%`);
    }
    
    return {
      secure: criticalIssues.length === 0,
      warnings,
      criticalIssues
    };
  }
  
  /**
   * Print security check results
   */
  static printSecurityCheck(): void {
    const check = this.checkEnvironmentSecurity();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔒 SECURITY CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (check.secure) {
      console.log('✅ No critical security issues detected');
    } else {
      console.log('❌ Critical security issues found:');
      check.criticalIssues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (check.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      check.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
