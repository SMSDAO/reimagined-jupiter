import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface CommunityAirdropConfig {
  daoWalletAddress: PublicKey;
  minHoldingRequirement?: number; // Min tokens/SOL to be eligible
  distributionPercentage: number; // % of DAO profits to distribute
}

export interface AirdropRecipient {
  address: PublicKey;
  amount: number;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  score: number;
}

export interface AirdropDistributionResult {
  success: boolean;
  totalDistributed: number;
  recipientCount: number;
  failedRecipients: number;
  signatures: string[];
  error?: string;
}

/**
 * CommunityAirdropService manages automated airdrops to community members
 * Funded by DAO profit share (10% of arbitrage profits)
 */
export class CommunityAirdropService {
  private connection: Connection;
  private config: CommunityAirdropConfig;
  private totalDistributed: number = 0;
  private distributionHistory: Array<{
    timestamp: number;
    amount: number;
    recipients: number;
  }> = [];

  constructor(connection: Connection, config: CommunityAirdropConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Distribute DAO profits to community members based on their tier and activity
   * @param daoBalance Current DAO balance available for distribution
   * @param recipients List of eligible recipients with their allocation
   * @param sourceWallet Wallet containing the DAO funds (must be signer)
   */
  async distributeToCommunity(
    daoBalance: number,
    recipients: AirdropRecipient[],
    sourceWallet: Keypair
  ): Promise<AirdropDistributionResult> {
    const result: AirdropDistributionResult = {
      success: false,
      totalDistributed: 0,
      recipientCount: 0,
      failedRecipients: 0,
      signatures: [],
    };

    try {
      if (recipients.length === 0) {
        result.error = 'No recipients provided';
        return result;
      }

      // Calculate total distribution amount (e.g., 10% of DAO balance)
      const distributionAmount = Math.floor(daoBalance * this.config.distributionPercentage);

      if (distributionAmount <= 0) {
        result.error = 'Insufficient DAO balance for distribution';
        return result;
      }

      console.log(`\n🎁 Community Airdrop Distribution`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Total Amount: ${(distributionAmount / 1e9).toFixed(4)} SOL`);
      console.log(`Recipients: ${recipients.length}`);
      console.log(`Distribution %: ${(this.config.distributionPercentage * 100).toFixed(1)}%`);

      // Calculate individual allocations
      const allocatedRecipients = this.calculateAllocations(recipients, distributionAmount);

      // Distribute in batches to avoid transaction size limits
      const batchSize = 10;
      for (let i = 0; i < allocatedRecipients.length; i += batchSize) {
        const batch = allocatedRecipients.slice(i, i + batchSize);
        
        try {
          const signature = await this.distributeBatch(batch, sourceWallet);
          result.signatures.push(signature);
          
          // Update counters
          const batchAmount = batch.reduce((sum, r) => sum + r.amount, 0);
          result.totalDistributed += batchAmount;
          result.recipientCount += batch.length;
          
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} distributed: ${batch.length} recipients`);
        } catch (error) {
          console.error(`Failed to distribute batch ${Math.floor(i / batchSize) + 1}:`, error);
          result.failedRecipients += batch.length;
        }
      }

      result.success = result.recipientCount > 0;

      // Update history
      this.totalDistributed += result.totalDistributed;
      this.distributionHistory.push({
        timestamp: Date.now(),
        amount: result.totalDistributed,
        recipients: result.recipientCount,
      });

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ Distribution Complete`);
      console.log(`   Successful: ${result.recipientCount} recipients`);
      console.log(`   Failed: ${result.failedRecipients} recipients`);
      console.log(`   Total: ${(result.totalDistributed / 1e9).toFixed(4)} SOL`);

      return result;
    } catch (error) {
      console.error('Error in community distribution:', error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Calculate individual allocations based on tier and score
   */
  private calculateAllocations(
    recipients: AirdropRecipient[],
    totalAmount: number
  ): AirdropRecipient[] {
    // Tier weights
    const tierWeights = {
      platinum: 4,
      gold: 3,
      silver: 2,
      bronze: 1,
    };

    // Calculate total weight
    const totalWeight = recipients.reduce((sum, r) => {
      return sum + (tierWeights[r.tier] * (r.score / 100));
    }, 0);

    // Allocate proportionally
    return recipients.map(recipient => {
      const weight = tierWeights[recipient.tier] * (recipient.score / 100);
      const allocation = Math.floor((weight / totalWeight) * totalAmount);
      
      return {
        ...recipient,
        amount: allocation,
      };
    });
  }

  /**
   * Distribute to a batch of recipients
   */
  private async distributeBatch(
    recipients: AirdropRecipient[],
    sourceWallet: Keypair
  ): Promise<string> {
    const transaction = new Transaction();

    // Add transfer instructions for each recipient
    for (const recipient of recipients) {
      if (recipient.amount > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: sourceWallet.publicKey,
            toPubkey: recipient.address,
            lamports: recipient.amount,
          })
        );
      }
    }

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sourceWallet.publicKey;

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [sourceWallet],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    return signature;
  }

  /**
   * Distribute tokens (SPL tokens) to community
   */
  async distributeTokensToCommunity(
    tokenMint: PublicKey,
    daoTokenBalance: number,
    recipients: AirdropRecipient[],
    sourceWallet: Keypair
  ): Promise<AirdropDistributionResult> {
    const result: AirdropDistributionResult = {
      success: false,
      totalDistributed: 0,
      recipientCount: 0,
      failedRecipients: 0,
      signatures: [],
    };

    try {
      if (recipients.length === 0) {
        result.error = 'No recipients provided';
        return result;
      }

      // Calculate distribution amount
      const distributionAmount = Math.floor(daoTokenBalance * this.config.distributionPercentage);

      if (distributionAmount <= 0) {
        result.error = 'Insufficient token balance for distribution';
        return result;
      }

      console.log(`\n🎁 Token Airdrop Distribution`);
      console.log(`Token Mint: ${tokenMint.toBase58()}`);
      console.log(`Total Amount: ${distributionAmount}`);
      console.log(`Recipients: ${recipients.length}`);

      // Calculate allocations
      const allocatedRecipients = this.calculateAllocations(recipients, distributionAmount);

      // Get source token account
      const sourceTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        sourceWallet.publicKey
      );

      // Distribute in batches
      const batchSize = 5; // Smaller batch for token transfers
      for (let i = 0; i < allocatedRecipients.length; i += batchSize) {
        const batch = allocatedRecipients.slice(i, i + batchSize);
        
        try {
          const signature = await this.distributeTokenBatch(
            batch,
            tokenMint,
            sourceTokenAccount,
            sourceWallet
          );
          result.signatures.push(signature);
          
          const batchAmount = batch.reduce((sum, r) => sum + r.amount, 0);
          result.totalDistributed += batchAmount;
          result.recipientCount += batch.length;
          
          console.log(`✅ Token batch ${Math.floor(i / batchSize) + 1} distributed`);
        } catch (error) {
          console.error(`Failed to distribute token batch:`, error);
          result.failedRecipients += batch.length;
        }
      }

      result.success = result.recipientCount > 0;

      console.log(`✅ Token distribution complete: ${result.recipientCount} recipients`);

      return result;
    } catch (error) {
      console.error('Error in token distribution:', error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Distribute tokens to a batch of recipients
   */
  private async distributeTokenBatch(
    recipients: AirdropRecipient[],
    tokenMint: PublicKey,
    sourceTokenAccount: PublicKey,
    sourceWallet: Keypair
  ): Promise<string> {
    const transaction = new Transaction();

    // Add token transfer instructions
    for (const recipient of recipients) {
      if (recipient.amount > 0) {
        const recipientTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          recipient.address
        );

        transaction.add(
          createTransferInstruction(
            sourceTokenAccount,
            recipientTokenAccount,
            sourceWallet.publicKey,
            recipient.amount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }
    }

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sourceWallet.publicKey;

    // Send and confirm
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [sourceWallet],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    return signature;
  }

  /**
   * Get eligible recipients based on wallet scoring
   */
  async getEligibleRecipients(
    walletAddresses: PublicKey[],
    minScore: number = 50
  ): Promise<AirdropRecipient[]> {
    // This would integrate with WalletScoring service
    // For now, return mock data
    const recipients: AirdropRecipient[] = [];

    for (const address of walletAddresses) {
      // Mock scoring logic
      const score = Math.random() * 100;
      
      if (score >= minScore) {
        let tier: 'platinum' | 'gold' | 'silver' | 'bronze';
        if (score >= 90) tier = 'platinum';
        else if (score >= 75) tier = 'gold';
        else if (score >= 60) tier = 'silver';
        else tier = 'bronze';

        recipients.push({
          address,
          amount: 0, // Will be calculated during distribution
          tier,
          score,
        });
      }
    }

    return recipients;
  }

  /**
   * Schedule recurring airdrops (would need cron/scheduler integration)
   */
  scheduleRecurringAirdrops(
    frequency: 'daily' | 'weekly' | 'monthly',
    _callback: () => Promise<void>
  ): void {
    console.log(`📅 Scheduled recurring airdrops: ${frequency}`);
    // Implementation would use a scheduler like node-cron
    // For now, just log the schedule
  }

  /**
   * Get distribution statistics
   */
  getStats(): {
    totalDistributed: number;
    distributionCount: number;
    avgDistribution: number;
    history: Array<{ timestamp: number; amount: number; recipients: number }>;
  } {
    return {
      totalDistributed: this.totalDistributed,
      distributionCount: this.distributionHistory.length,
      avgDistribution: this.distributionHistory.length > 0
        ? this.totalDistributed / this.distributionHistory.length
        : 0,
      history: [...this.distributionHistory],
    };
  }

  /**
   * Log distribution statistics
   */
  logStats(): void {
    const stats = this.getStats();
    console.log('\n🎁 Community Airdrop Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Distributed: ${(stats.totalDistributed / 1e9).toFixed(4)} SOL`);
    console.log(`Distribution Events: ${stats.distributionCount}`);
    console.log(`Avg per Event: ${(stats.avgDistribution / 1e9).toFixed(4)} SOL`);
    
    if (stats.history.length > 0) {
      console.log('\nRecent Distributions:');
      stats.history.slice(-5).reverse().forEach((event: { timestamp: number; amount: number; recipients: number }, idx: number) => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        console.log(`  ${idx + 1}. ${date}: ${(event.amount / 1e9).toFixed(4)} SOL to ${event.recipients} recipients`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
