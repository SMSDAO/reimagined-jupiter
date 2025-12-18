import { Connection, PublicKey, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SNSDomainResolver } from './snsResolver.js';

export interface ProfitDistributionConfig {
  reserveWalletDomain: string; // SNS domain like "monads.skr"
  userWalletPercentage: number; // 0.20 (20%)
  reserveWalletPercentage: number; // 0.70 (70%)
  daoWalletPercentage: number; // 0.10 (10%)
  daoWalletAddress: PublicKey; // Direct address
}

export interface DistributionResult {
  success: boolean;
  userAmount: number;
  reserveAmount: number;
  daoAmount: number;
  signatures: {
    reserve?: string;
    user?: string;
    dao?: string;
  };
  error?: string;
}

/**
 * ProfitDistributionService handles automated profit splitting after successful trades
 * Distributes profits: 70% to reserve wallet, 20% to user wallet, 10% to DAO wallet
 */
export class ProfitDistributionService {
  private connection: Connection;
  private config: ProfitDistributionConfig;
  private snsResolver: SNSDomainResolver;
  private reserveWalletCache: PublicKey | null = null;
  private totalProfitsDistributed: number = 0;
  private distributionCount: number = 0;

  constructor(connection: Connection, config: ProfitDistributionConfig) {
    this.connection = connection;
    this.config = config;
    this.snsResolver = new SNSDomainResolver(connection);
    
    // Validate percentages
    const total = config.userWalletPercentage + config.reserveWalletPercentage + config.daoWalletPercentage;
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`Profit distribution percentages must sum to 1.0 (100%), got ${total}`);
    }
  }

  /**
   * Resolve the reserve wallet address from SNS domain
   */
  private async getReserveWallet(): Promise<PublicKey> {
    // Use cached address if available and valid
    if (this.reserveWalletCache) {
      return this.reserveWalletCache;
    }

    try {
      console.log(`[ProfitDistribution] Resolving SNS domain: ${this.config.reserveWalletDomain}`);
      const resolvedAddress = await this.snsResolver.resolve(this.config.reserveWalletDomain);
      
      if (!resolvedAddress) {
        throw new Error(`Failed to resolve SNS domain: ${this.config.reserveWalletDomain}`);
      }

      this.reserveWalletCache = resolvedAddress;
      console.log(`[ProfitDistribution] Resolved ${this.config.reserveWalletDomain} to ${resolvedAddress.toBase58()}`);
      return resolvedAddress;
    } catch (error) {
      console.error(`[ProfitDistribution] Error resolving SNS domain:`, error);
      throw error;
    }
  }

  /**
   * Distribute profits from a successful arbitrage trade
   * @param profitAmount Total profit amount in lamports (for SOL) or base units (for tokens)
   * @param userWallet User's wallet that executed the trade
   * @param sourceWallet Wallet containing the profits (typically user wallet after trade)
   * @param tokenMint Optional token mint if distributing token profits (undefined for SOL)
   */
  async distributeProfits(
    profitAmount: number,
    userWallet: PublicKey,
    sourceWallet: Keypair,
    tokenMint?: PublicKey
  ): Promise<DistributionResult> {
    const result: DistributionResult = {
      success: false,
      userAmount: 0,
      reserveAmount: 0,
      daoAmount: 0,
      signatures: {},
    };

    try {
      if (profitAmount <= 0) {
        result.error = 'Profit amount must be greater than 0';
        return result;
      }

      // Calculate distribution amounts
      result.userAmount = Math.floor(profitAmount * this.config.userWalletPercentage);
      result.reserveAmount = Math.floor(profitAmount * this.config.reserveWalletPercentage);
      result.daoAmount = Math.floor(profitAmount * this.config.daoWalletPercentage);

      console.log(`\n💰 Distributing ${profitAmount} ${tokenMint ? 'tokens' : 'lamports'} profit:`);
      console.log(`   User (${(this.config.userWalletPercentage * 100).toFixed(1)}%): ${result.userAmount}`);
      console.log(`   Reserve (${(this.config.reserveWalletPercentage * 100).toFixed(1)}%): ${result.reserveAmount}`);
      console.log(`   DAO (${(this.config.daoWalletPercentage * 100).toFixed(1)}%): ${result.daoAmount}`);

      // Resolve reserve wallet
      const reserveWallet = await this.getReserveWallet();

      if (tokenMint) {
        // Token profit distribution
        await this.distributeTokenProfits(
          result,
          userWallet,
          reserveWallet,
          sourceWallet,
          tokenMint
        );
      } else {
        // SOL profit distribution
        await this.distributeSOLProfits(
          result,
          userWallet,
          reserveWallet,
          sourceWallet
        );
      }

      result.success = true;
      this.totalProfitsDistributed += profitAmount;
      this.distributionCount++;

      console.log(`✅ Profit distribution completed successfully`);
      console.log(`   Total distributed to date: ${this.totalProfitsDistributed}`);
      console.log(`   Distribution count: ${this.distributionCount}`);

      return result;
    } catch (error) {
      console.error(`[ProfitDistribution] Error distributing profits:`, error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Distribute SOL profits
   */
  private async distributeSOLProfits(
    result: DistributionResult,
    userWallet: PublicKey,
    reserveWallet: PublicKey,
    sourceWallet: Keypair
  ): Promise<void> {
    const transaction = new Transaction();

    // Add transfer instructions for each recipient
    if (result.reserveAmount > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sourceWallet.publicKey,
          toPubkey: reserveWallet,
          lamports: result.reserveAmount,
        })
      );
    }

    // User keeps their share (20%) - only transfer if different from source
    if (result.userAmount > 0 && !userWallet.equals(sourceWallet.publicKey)) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sourceWallet.publicKey,
          toPubkey: userWallet,
          lamports: result.userAmount,
        })
      );
    }

    if (result.daoAmount > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sourceWallet.publicKey,
          toPubkey: this.config.daoWalletAddress,
          lamports: result.daoAmount,
        })
      );
    }

    // Send transaction with retry logic
    const signature = await this.sendTransactionWithRetry(transaction, sourceWallet);
    result.signatures.reserve = signature;
    result.signatures.user = signature;
    result.signatures.dao = signature;

    console.log(`   Transaction signature: ${signature}`);
  }

  /**
   * Distribute token profits
   */
  private async distributeTokenProfits(
    result: DistributionResult,
    userWallet: PublicKey,
    reserveWallet: PublicKey,
    sourceWallet: Keypair,
    tokenMint: PublicKey
  ): Promise<void> {
    const transaction = new Transaction();

    // Get associated token accounts
    const sourceTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      sourceWallet.publicKey
    );

    const reserveTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      reserveWallet
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      userWallet
    );

    const daoTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      this.config.daoWalletAddress
    );

    // Add token transfer instructions
    if (result.reserveAmount > 0) {
      transaction.add(
        createTransferInstruction(
          sourceTokenAccount,
          reserveTokenAccount,
          sourceWallet.publicKey,
          result.reserveAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    if (result.userAmount > 0 && !userWallet.equals(sourceWallet.publicKey)) {
      transaction.add(
        createTransferInstruction(
          sourceTokenAccount,
          userTokenAccount,
          sourceWallet.publicKey,
          result.userAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    if (result.daoAmount > 0) {
      transaction.add(
        createTransferInstruction(
          sourceTokenAccount,
          daoTokenAccount,
          sourceWallet.publicKey,
          result.daoAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    // Send transaction with retry logic
    const signature = await this.sendTransactionWithRetry(transaction, sourceWallet);
    result.signatures.reserve = signature;
    result.signatures.user = signature;
    result.signatures.dao = signature;

    console.log(`   Transaction signature: ${signature}`);
  }

  /**
   * Send transaction with retry logic and exponential backoff
   */
  private async sendTransactionWithRetry(
    transaction: Transaction,
    signer: Keypair,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = signer.publicKey;

        // Sign and send transaction
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [signer],
          {
            commitment: 'confirmed',
            maxRetries: 3,
          }
        );

        return signature;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[ProfitDistribution] Transaction attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`   Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`Failed to send transaction after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Get distribution statistics
   */
  getStats(): { totalDistributed: number; distributionCount: number; avgDistribution: number } {
    return {
      totalDistributed: this.totalProfitsDistributed,
      distributionCount: this.distributionCount,
      avgDistribution: this.distributionCount > 0 ? this.totalProfitsDistributed / this.distributionCount : 0,
    };
  }

  /**
   * Update configuration (e.g., change percentages or wallets)
   */
  updateConfig(newConfig: Partial<ProfitDistributionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Validate percentages again
    const total = this.config.userWalletPercentage + this.config.reserveWalletPercentage + this.config.daoWalletPercentage;
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`Profit distribution percentages must sum to 1.0 (100%), got ${total}`);
    }

    // Clear cache if reserve wallet domain changed
    if (newConfig.reserveWalletDomain) {
      this.reserveWalletCache = null;
    }
  }
}
