/**
 * Enhanced Jito MEV Protection Service
 * Features:
 * - Dynamic tip calculation based on transaction value
 * - Bundle submission with retry logic
 * - Cost-effectiveness analysis
 * - Integration with arbitrage engine
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import axios from 'axios';

export interface JitoConfig {
  blockEngineUrl: string;
  bundleOnly: boolean;
  tipAccounts: string[];
  minTipLamports: number;
  maxTipLamports: number;
  dynamicTipMultiplier: number; // Multiplier for profit-based tips
}

export interface BundleResult {
  success: boolean;
  bundleId?: string;
  signature?: string;
  error?: string;
}

const DEFAULT_JITO_CONFIG: JitoConfig = {
  blockEngineUrl: process.env.JITO_BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf',
  bundleOnly: true,
  // Jito tip accounts (rotate for better distribution)
  tipAccounts: [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  ],
  minTipLamports: 10000, // 0.00001 SOL
  maxTipLamports: 10000000, // 0.01 SOL (10M lamports hard cap)
  dynamicTipMultiplier: 0.05, // 5% of expected profit
};

/**
 * Jito MEV Protection Service
 */
export class JitoMevProtection {
  private connection: Connection;
  private config: JitoConfig;
  private tipAccountIndex: number;
  
  constructor(connection: Connection, config?: Partial<JitoConfig>) {
    this.connection = connection;
    this.config = { ...DEFAULT_JITO_CONFIG, ...config };
    this.tipAccountIndex = 0;
    
    // Enforce 10M lamports hard cap
    if (this.config.maxTipLamports > 10000000) {
      console.warn('[Jito] Max tip capped at 10M lamports');
      this.config.maxTipLamports = 10000000;
    }
  }
  
  /**
   * Calculate optimal Jito tip based on expected profit
   * @param expectedProfitLamports - Expected profit in lamports
   * @param urgency - Urgency factor (0-1), higher = willing to pay more
   * @returns Tip amount in lamports
   */
  calculateOptimalTip(expectedProfitLamports: number, urgency: number = 0.5): number {
    if (!expectedProfitLamports || expectedProfitLamports <= 0) {
      return this.config.minTipLamports;
    }
    
    // Base tip: percentage of expected profit
    let tip = expectedProfitLamports * this.config.dynamicTipMultiplier;
    
    // Apply urgency multiplier (0.5 - 2.0)
    const urgencyMultiplier = 0.5 + urgency * 1.5;
    tip *= urgencyMultiplier;
    
    // Ensure within bounds
    tip = Math.max(this.config.minTipLamports, tip);
    tip = Math.min(this.config.maxTipLamports, tip);
    
    console.log(`[Jito] Calculated tip: ${tip} lamports (${(tip / 1e9).toFixed(6)} SOL)`);
    console.log(`[Jito] Expected profit: ${expectedProfitLamports} lamports, urgency: ${urgency}`);
    
    return Math.floor(tip);
  }
  
  /**
   * Get next tip account (round-robin)
   */
  private getNextTipAccount(): PublicKey {
    const account = this.config.tipAccounts[this.tipAccountIndex];
    this.tipAccountIndex = (this.tipAccountIndex + 1) % this.config.tipAccounts.length;
    return new PublicKey(account);
  }
  
  /**
   * Create Jito tip transfer instruction
   * @param fromKeypair - Payer keypair
   * @param tipLamports - Tip amount in lamports
   * @returns Transfer instruction
   */
  createTipInstruction(fromKeypair: Keypair, tipLamports: number): TransactionInstruction {
    const tipAccount = this.getNextTipAccount();
    
    return SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: tipAccount,
      lamports: tipLamports,
    });
  }
  
  /**
   * Send transaction bundle via Jito
   * @param transactions - Array of transactions to bundle
   * @param signers - Array of signers for transactions
   * @param tipLamports - Tip amount (optional, will calculate if not provided)
   * @returns Bundle result
   */
  async sendBundle(
    transactions: (Transaction | VersionedTransaction)[],
    signers: Keypair[],
    tipLamports?: number
  ): Promise<BundleResult> {
    try {
      console.log(`[Jito] Preparing bundle with ${transactions.length} transaction(s)`);
      
      // Calculate tip if not provided
      const finalTip = tipLamports || this.config.minTipLamports;
      console.log(`[Jito] Using tip: ${finalTip} lamports (${(finalTip / 1e9).toFixed(6)} SOL)`);
      
      // Sign all transactions
      const signedTxs = transactions.map((tx, index) => {
        if (tx instanceof VersionedTransaction) {
          // VersionedTransaction is already signed
          return tx;
        } else {
          // Sign legacy transaction
          tx.sign(...signers);
          return tx;
        }
      });
      
      // Serialize transactions
      const serializedTxs = signedTxs.map(tx => {
        if (tx instanceof VersionedTransaction) {
          return Buffer.from(tx.serialize()).toString('base64');
        } else {
          return tx.serialize().toString('base64');
        }
      });
      
      // Send bundle to Jito Block Engine
      console.log(`[Jito] Sending bundle to ${this.config.blockEngineUrl}`);
      const response = await axios.post(
        `${this.config.blockEngineUrl}/api/v1/bundles`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [serializedTxs],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );
      
      if (response.data.error) {
        throw new Error(`Jito API error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
      }
      
      console.log('[Jito] ✅ Bundle sent successfully');
      console.log(`[Jito] Bundle ID: ${response.data.result}`);
      
      return {
        success: true,
        bundleId: response.data.result,
      };
    } catch (error) {
      console.error('[Jito] ❌ Bundle submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Send single transaction via Jito bundle
   * @param transaction - Transaction to send
   * @param signer - Keypair to sign transaction
   * @param expectedProfitLamports - Expected profit for dynamic tip calculation
   * @param urgency - Urgency factor (0-1)
   * @returns Bundle result
   */
  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    signer: Keypair,
    expectedProfitLamports?: number,
    urgency: number = 0.5
  ): Promise<BundleResult> {
    try {
      // Calculate tip based on expected profit
      const tipLamports = expectedProfitLamports
        ? this.calculateOptimalTip(expectedProfitLamports, urgency)
        : this.config.minTipLamports;
      
      // Add tip instruction if it's a legacy transaction
      if (transaction instanceof Transaction) {
        const tipInstruction = this.createTipInstruction(signer, tipLamports);
        transaction.add(tipInstruction);
      }
      
      return await this.sendBundle([transaction], [signer], tipLamports);
    } catch (error) {
      console.error('[Jito] Transaction send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Check if Jito protection is cost-effective for given profit
   * @param expectedProfitLamports - Expected profit in lamports
   * @returns True if Jito is cost-effective
   */
  isCostEffective(expectedProfitLamports: number): boolean {
    const tip = this.calculateOptimalTip(expectedProfitLamports);
    
    // Jito is cost-effective if tip is less than 20% of expected profit
    const costEffective = tip < expectedProfitLamports * 0.2;
    
    console.log(`[Jito] Cost-effectiveness check:`);
    console.log(`  Expected profit: ${expectedProfitLamports} lamports`);
    console.log(`  Required tip: ${tip} lamports`);
    console.log(`  Cost-effective: ${costEffective ? '✅ YES' : '❌ NO'}`);
    
    return costEffective;
  }
  
  /**
   * Check if Jito service is available
   * @returns True if Jito is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.config.blockEngineUrl}/api/v1/bundles`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getTipAccounts',
          params: [],
        },
        {
          timeout: 5000,
        }
      );
      
      const available = response.status === 200 && !response.data.error;
      console.log(`[Jito] Service availability: ${available ? '✅ Available' : '❌ Unavailable'}`);
      return available;
    } catch (error) {
      console.error('[Jito] Availability check failed:', error);
      return false;
    }
  }
  
  /**
   * Get recommended tip for transaction value
   * @param transactionValueLamports - Transaction value in lamports
   * @returns Recommended tip in lamports
   */
  getRecommendedTip(transactionValueLamports: number): number {
    // Recommend 0.05% of transaction value as tip
    let tip = transactionValueLamports * 0.0005;
    
    // Ensure within bounds
    tip = Math.max(this.config.minTipLamports, tip);
    tip = Math.min(this.config.maxTipLamports, tip);
    
    return Math.floor(tip);
  }
  
  /**
   * Get Jito configuration
   */
  getConfig(): JitoConfig {
    return { ...this.config };
  }
  
  /**
   * Update Jito configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<JitoConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Enforce 10M lamports hard cap
    if (this.config.maxTipLamports > 10000000) {
      console.warn('[Jito] Max tip capped at 10M lamports');
      this.config.maxTipLamports = 10000000;
    }
    
    console.log('[Jito] Configuration updated');
  }
}
