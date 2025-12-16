import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

export interface ProfitDistributionConfig {
  reserveWallet: PublicKey; // 70% - monads.skr
  gasWallet: PublicKey; // 20% - user wallet for gas coverage
  daoWallet: PublicKey; // 10% - DAO community wallet
}

export interface DistributionResult {
  success: boolean;
  signature?: string;
  error?: string;
  breakdown: {
    reserve: { amount: number; percentage: number; sent: boolean };
    gas: { amount: number; percentage: number; sent: boolean };
    dao: { amount: number; percentage: number; sent: boolean };
  };
  totalDistributed: number;
  timestamp: Date;
}

/**
 * ProfitDistributionService handles automated profit allocation
 * 70% to reserve wallet (monads.skr)
 * 20% to user wallet for gas fees
 * 10% to DAO community wallet
 */
export class ProfitDistributionService {
  private connection: Connection;
  private config: ProfitDistributionConfig;
  private distributionHistory: DistributionResult[] = [];

  constructor(connection: Connection, config: ProfitDistributionConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Distribute profits according to the allocation model
   * @param totalProfit Total profit in USD or token amount
   * @param tokenMint Token mint address (use native SOL if undefined)
   * @param payerKeypair Keypair of the account paying for the distribution
   * @returns Distribution result with breakdown
   */
  async distributeProfit(
    totalProfit: number,
    tokenMint: PublicKey | undefined,
    payerKeypair: Keypair
  ): Promise<DistributionResult> {
    const result: DistributionResult = {
      success: false,
      breakdown: {
        reserve: { amount: 0, percentage: 70, sent: false },
        gas: { amount: 0, percentage: 20, sent: false },
        dao: { amount: 0, percentage: 10, sent: false },
      },
      totalDistributed: 0,
      timestamp: new Date(),
    };

    try {
      // Calculate distribution amounts
      const reserveAmount = totalProfit * 0.70;
      const gasAmount = totalProfit * 0.20;
      const daoAmount = totalProfit * 0.10;

      result.breakdown.reserve.amount = reserveAmount;
      result.breakdown.gas.amount = gasAmount;
      result.breakdown.dao.amount = daoAmount;

      // Validate wallets before proceeding
      const walletsValid = await this.validateWallets();
      if (!walletsValid) {
        result.error = 'Wallet validation failed';
        return result;
      }

      console.log('💰 Profit Distribution Started');
      console.log(`   Total Profit: ${totalProfit.toFixed(6)}`);
      console.log(`   Reserve (70%): ${reserveAmount.toFixed(6)} → ${this.config.reserveWallet.toBase58().slice(0, 8)}...`);
      console.log(`   Gas Coverage (20%): ${gasAmount.toFixed(6)} → ${this.config.gasWallet.toBase58().slice(0, 8)}...`);
      console.log(`   DAO Community (10%): ${daoAmount.toFixed(6)} → ${this.config.daoWallet.toBase58().slice(0, 8)}...`);

      // Create transaction for distribution
      const transaction = new Transaction();

      if (tokenMint) {
        // SPL Token distribution
        const payerTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          payerKeypair.publicKey
        );
        const reserveTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          this.config.reserveWallet
        );
        const gasTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          this.config.gasWallet
        );
        const daoTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          this.config.daoWallet
        );

        // Add transfer instructions
        transaction.add(
          createTransferInstruction(
            payerTokenAccount,
            reserveTokenAccount,
            payerKeypair.publicKey,
            Math.floor(reserveAmount)
          )
        );

        transaction.add(
          createTransferInstruction(
            payerTokenAccount,
            gasTokenAccount,
            payerKeypair.publicKey,
            Math.floor(gasAmount)
          )
        );

        transaction.add(
          createTransferInstruction(
            payerTokenAccount,
            daoTokenAccount,
            payerKeypair.publicKey,
            Math.floor(daoAmount)
          )
        );
      } else {
        // Native SOL distribution
        const reserveLamports = Math.floor(reserveAmount * LAMPORTS_PER_SOL);
        const gasLamports = Math.floor(gasAmount * LAMPORTS_PER_SOL);
        const daoLamports = Math.floor(daoAmount * LAMPORTS_PER_SOL);

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payerKeypair.publicKey,
            toPubkey: this.config.reserveWallet,
            lamports: reserveLamports,
          })
        );

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payerKeypair.publicKey,
            toPubkey: this.config.gasWallet,
            lamports: gasLamports,
          })
        );

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payerKeypair.publicKey,
            toPubkey: this.config.daoWallet,
            lamports: daoLamports,
          })
        );
      }

      // Send and confirm transaction
      const signature = await this.connection.sendTransaction(transaction, [payerKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      result.success = true;
      result.signature = signature;
      result.breakdown.reserve.sent = true;
      result.breakdown.gas.sent = true;
      result.breakdown.dao.sent = true;
      result.totalDistributed = totalProfit;

      console.log(`✅ Distribution Complete! Signature: ${signature}`);
      
      // Store in history
      this.distributionHistory.push(result);

      return result;
    } catch (error) {
      console.error('❌ Profit distribution failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
      this.distributionHistory.push(result);
      return result;
    }
  }

  /**
   * Get distribution statistics
   */
  getStats(): {
    totalDistributions: number;
    successfulDistributions: number;
    failedDistributions: number;
    totalDistributed: number;
    reserveTotal: number;
    gasTotal: number;
    daoTotal: number;
  } {
    const successful = this.distributionHistory.filter(d => d.success);
    const failed = this.distributionHistory.filter(d => !d.success);

    return {
      totalDistributions: this.distributionHistory.length,
      successfulDistributions: successful.length,
      failedDistributions: failed.length,
      totalDistributed: successful.reduce((sum, d) => sum + d.totalDistributed, 0),
      reserveTotal: successful.reduce((sum, d) => sum + d.breakdown.reserve.amount, 0),
      gasTotal: successful.reduce((sum, d) => sum + d.breakdown.gas.amount, 0),
      daoTotal: successful.reduce((sum, d) => sum + d.breakdown.dao.amount, 0),
    };
  }

  /**
   * Get distribution history
   */
  getHistory(limit?: number): DistributionResult[] {
    if (limit) {
      return this.distributionHistory.slice(-limit);
    }
    return [...this.distributionHistory];
  }

  /**
   * Resolve Solana Name Service (SNS) address
   * @param snsName SNS name like "monads.skr"
   * @returns PublicKey or null if not found
   * 
   * Note: This is a placeholder. For production use:
   * 1. Use @bonfida/spl-name-service package for .sol domains
   * 2. Configure RESERVE_WALLET as a PublicKey address directly in .env
   * 3. Or implement custom SNS resolution based on your needs
   */
  async resolveSNS(snsName: string): Promise<PublicKey | null> {
    try {
      console.log(`⚠️ SNS resolution not yet implemented for: ${snsName}`);
      console.log('   Please configure wallets using PublicKey addresses in .env');
      console.log('   Example: RESERVE_WALLET=YourBase58PublicKeyAddress');
      
      // TODO: Implement actual SNS resolution using @bonfida/spl-name-service
      // Example implementation:
      // const { NameRegistryState } = require('@bonfida/spl-name-service');
      // const nameAccount = await NameRegistryState.retrieve(connection, snsName);
      // return nameAccount.owner;
      
      return null;
    } catch (error) {
      console.error(`Failed to resolve SNS name ${snsName}:`, error);
      return null;
    }
  }

  /**
   * Update distribution configuration
   */
  updateConfig(newConfig: Partial<ProfitDistributionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Distribution config updated');
  }

  /**
   * Validate wallet addresses before distribution
   */
  async validateWallets(): Promise<boolean> {
    try {
      // Check if wallets exist on-chain
      const [reserveInfo, gasInfo, daoInfo] = await Promise.all([
        this.connection.getAccountInfo(this.config.reserveWallet),
        this.connection.getAccountInfo(this.config.gasWallet),
        this.connection.getAccountInfo(this.config.daoWallet),
      ]);

      // Wallets don't need to exist beforehand for SOL transfers
      // But we can log warnings
      if (!reserveInfo) {
        console.warn('⚠️ Reserve wallet not found on-chain (will be created on transfer)');
      }
      if (!gasInfo) {
        console.warn('⚠️ Gas wallet not found on-chain (will be created on transfer)');
      }
      if (!daoInfo) {
        console.warn('⚠️ DAO wallet not found on-chain (will be created on transfer)');
      }

      return true;
    } catch (error) {
      console.error('Failed to validate wallets:', error);
      return false;
    }
  }
}
