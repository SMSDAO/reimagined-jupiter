import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

export interface AirdropRecipient {
  address: PublicKey;
  amount: number;
  tier?: string;
  score?: number;
}

export interface AirdropCampaign {
  id: string;
  name: string;
  description: string;
  tokenMint?: PublicKey; // undefined for SOL
  totalAmount: number;
  recipients: AirdropRecipient[];
  fundingSource: 'dao_treasury' | 'profit_share';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  signature?: string;
}

/**
 * DAO Airdrop Service
 * Manages community airdrops funded from the 10% DAO profit share
 */
export class DAOAirdropService {
  private connection: Connection;
  private daoWallet: PublicKey;
  private campaigns: Map<string, AirdropCampaign> = new Map();

  constructor(connection: Connection, daoWallet: PublicKey) {
    this.connection = connection;
    this.daoWallet = daoWallet;
  }

  /**
   * Create a new airdrop campaign
   */
  createCampaign(
    name: string,
    description: string,
    recipients: AirdropRecipient[],
    tokenMint?: PublicKey
  ): AirdropCampaign {
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);

    const campaign: AirdropCampaign = {
      id: `campaign-${Date.now()}`,
      name,
      description,
      tokenMint,
      totalAmount,
      recipients,
      fundingSource: 'dao_treasury',
      status: 'pending',
      createdAt: new Date(),
    };

    this.campaigns.set(campaign.id, campaign);

    console.log(`🎁 Airdrop Campaign Created: ${name}`);
    console.log(`   Recipients: ${recipients.length}`);
    console.log(`   Total Amount: ${totalAmount.toFixed(6)} ${tokenMint ? 'tokens' : 'SOL'}`);

    return campaign;
  }

  /**
   * Execute an airdrop campaign
   */
  async executeCampaign(
    campaignId: string,
    payerKeypair: Keypair
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status !== 'pending') {
      return { success: false, error: `Campaign already ${campaign.status}` };
    }

    campaign.status = 'in_progress';

    try {
      console.log(`🚀 Executing Airdrop: ${campaign.name}`);
      console.log(`   Distributing to ${campaign.recipients.length} recipients...`);

      // Check if payer has sufficient balance
      const balance = await this.connection.getBalance(payerKeypair.publicKey);
      const requiredBalance = campaign.tokenMint
        ? 0.01 * LAMPORTS_PER_SOL // Minimum for fees
        : campaign.totalAmount * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL;

      if (balance < requiredBalance) {
        throw new Error(
          `Insufficient balance. Required: ${(requiredBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL, Available: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
        );
      }

      // Create transaction
      const transaction = new Transaction();

      if (campaign.tokenMint) {
        // SPL Token airdrop
        const payerTokenAccount = await getAssociatedTokenAddress(
          campaign.tokenMint,
          payerKeypair.publicKey
        );

        for (const recipient of campaign.recipients) {
          const recipientTokenAccount = await getAssociatedTokenAddress(
            campaign.tokenMint,
            recipient.address
          );

          transaction.add(
            createTransferInstruction(
              payerTokenAccount,
              recipientTokenAccount,
              payerKeypair.publicKey,
              Math.floor(recipient.amount)
            )
          );
        }
      } else {
        // Native SOL airdrop
        for (const recipient of campaign.recipients) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: payerKeypair.publicKey,
              toPubkey: recipient.address,
              lamports: Math.floor(recipient.amount * LAMPORTS_PER_SOL),
            })
          );
        }
      }

      // Send and confirm
      const signature = await this.connection.sendTransaction(transaction, [payerKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      campaign.status = 'completed';
      campaign.executedAt = new Date();
      campaign.signature = signature;

      console.log(`✅ Airdrop Complete! Signature: ${signature}`);
      console.log(`   Distributed ${campaign.totalAmount.toFixed(6)} to ${campaign.recipients.length} recipients`);

      return { success: true, signature };
    } catch (error) {
      campaign.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Airdrop failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create airdrop campaign from DAO profit share
   * This is called automatically when profits are distributed
   */
  async createCampaignFromProfitShare(
    profitAmount: number,
    recipients: AirdropRecipient[],
    tokenMint?: PublicKey
  ): Promise<AirdropCampaign> {
    return this.createCampaign(
      `Profit Share Airdrop - ${new Date().toLocaleDateString()}`,
      `Community airdrop funded from 10% DAO profit share ($${profitAmount.toFixed(2)})`,
      recipients,
      tokenMint
    );
  }

  /**
   * Calculate airdrop distribution based on wallet scores
   * Higher scores get larger allocations
   */
  calculateDistribution(
    totalAmount: number,
    walletScores: Array<{ address: PublicKey; score: number; tier: string }>
  ): AirdropRecipient[] {
    const totalScore = walletScores.reduce((sum, w) => sum + w.score, 0);

    return walletScores.map(wallet => ({
      address: wallet.address,
      amount: (wallet.score / totalScore) * totalAmount,
      tier: wallet.tier,
      score: wallet.score,
    }));
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId: string): AirdropCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all campaigns
   */
  getAllCampaigns(): AirdropCampaign[] {
    return Array.from(this.campaigns.values());
  }

  /**
   * Get campaigns by status
   */
  getCampaignsByStatus(status: AirdropCampaign['status']): AirdropCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.status === status);
  }

  /**
   * Get campaign statistics
   */
  getStats(): {
    totalCampaigns: number;
    completedCampaigns: number;
    failedCampaigns: number;
    pendingCampaigns: number;
    totalDistributed: number;
    totalRecipients: number;
  } {
    const campaigns = Array.from(this.campaigns.values());
    const completed = campaigns.filter(c => c.status === 'completed');

    return {
      totalCampaigns: campaigns.length,
      completedCampaigns: completed.length,
      failedCampaigns: campaigns.filter(c => c.status === 'failed').length,
      pendingCampaigns: campaigns.filter(c => c.status === 'pending').length,
      totalDistributed: completed.reduce((sum, c) => sum + c.totalAmount, 0),
      totalRecipients: completed.reduce((sum, c) => sum + c.recipients.length, 0),
    };
  }

  /**
   * Check DAO wallet balance
   */
  async getDaoBalance(tokenMint?: PublicKey): Promise<number> {
    try {
      if (tokenMint) {
        // SPL Token balance using proper parsing
        const { getAccount } = await import('@solana/spl-token');
        const tokenAccount = await getAssociatedTokenAddress(tokenMint, this.daoWallet);
        
        try {
          const account = await getAccount(this.connection, tokenAccount);
          // Convert from token amount to decimal
          return Number(account.amount);
        } catch (error) {
          // Token account doesn't exist
          return 0;
        }
      } else {
        // Native SOL balance
        const balance = await this.connection.getBalance(this.daoWallet);
        return balance / LAMPORTS_PER_SOL;
      }
    } catch (error) {
      console.error('Failed to get DAO balance:', error);
      return 0;
    }
  }

  /**
   * Validate campaign before execution
   */
  async validateCampaign(campaignId: string, payerKeypair: Keypair): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      console.error('Campaign not found');
      return false;
    }

    // Check payer balance
    const balance = await this.connection.getBalance(payerKeypair.publicKey);
    const requiredBalance = campaign.tokenMint
      ? 0.01 * LAMPORTS_PER_SOL
      : campaign.totalAmount * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL;

    if (balance < requiredBalance) {
      console.error(
        `Insufficient balance for campaign. Required: ${(requiredBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
      );
      return false;
    }

    // Validate all recipient addresses
    for (const recipient of campaign.recipients) {
      if (recipient.amount <= 0) {
        console.error(`Invalid amount for recipient ${recipient.address.toBase58()}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Cancel a pending campaign
   */
  cancelCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return false;
    }

    if (campaign.status !== 'pending') {
      console.error(`Cannot cancel campaign with status: ${campaign.status}`);
      return false;
    }

    this.campaigns.delete(campaignId);
    console.log(`🗑️  Campaign cancelled: ${campaign.name}`);
    return true;
  }

  /**
   * Generate airdrop report
   */
  generateReport(): string {
    const stats = this.getStats();
    const campaigns = this.getAllCampaigns();

    let report = '═══════════════════════════════════════════\n';
    report += '         DAO AIRDROP REPORT\n';
    report += '═══════════════════════════════════════════\n\n';

    report += '📊 Overall Statistics:\n';
    report += `   Total Campaigns: ${stats.totalCampaigns}\n`;
    report += `   Completed: ${stats.completedCampaigns}\n`;
    report += `   Failed: ${stats.failedCampaigns}\n`;
    report += `   Pending: ${stats.pendingCampaigns}\n`;
    report += `   Total Distributed: ${stats.totalDistributed.toFixed(6)}\n`;
    report += `   Total Recipients: ${stats.totalRecipients}\n\n`;

    report += '🎁 Recent Campaigns:\n';
    campaigns.slice(-5).forEach(campaign => {
      report += `   [${campaign.status.toUpperCase()}] ${campaign.name}\n`;
      report += `     Amount: ${campaign.totalAmount.toFixed(6)}\n`;
      report += `     Recipients: ${campaign.recipients.length}\n`;
      if (campaign.signature) {
        report += `     Signature: ${campaign.signature}\n`;
      }
      report += '\n';
    });

    report += '═══════════════════════════════════════════\n';

    return report;
  }
}
