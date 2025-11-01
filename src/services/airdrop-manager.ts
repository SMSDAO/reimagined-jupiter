import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import axios from 'axios';

// Wallet Scoring: 6-factor analysis
export interface WalletScore {
  totalScore: number;
  tier: 'WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE';
  factors: {
    transactions: number; // 0-20 points
    protocols: number; // 0-20 points
    volume: number; // 0-20 points
    duration: number; // 0-15 points
    nfts: number; // 0-15 points
    social: number; // 0-10 points
  };
  details: {
    totalTransactions: number;
    uniqueProtocols: number;
    totalVolume: number;
    accountAge: number; // days
    nftCount: number;
    socialConnections: number;
  };
}

// Tier System
export enum WalletTier {
  WHALE = 'WHALE', // 90+
  DEGEN = 'DEGEN', // 70+
  ACTIVE = 'ACTIVE', // 50+
  CASUAL = 'CASUAL', // 30+
  NOVICE = 'NOVICE', // 0+
}

export interface AirdropInfo {
  protocol: string;
  tokenMint: string;
  amount: number;
  amountUSD?: number;
  claimable: boolean;
  claimed: boolean;
  claimDeadline?: Date;
  claimUrl?: string;
  requiresAction?: boolean;
}

export interface ClaimHistory {
  signature: string;
  protocol: string;
  amount: number;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  txUrl: string;
}

export class AirdropManager {
  private connection: Connection;
  private userPublicKey: PublicKey;
  private walletScore?: WalletScore;
  private claimHistory: ClaimHistory[] = [];
  
  // Auto-claim configuration
  private autoClaimEnabled: boolean;
  private autoClaimTiers: ('WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE')[] = ['WHALE', 'DEGEN'];
  
  constructor(connection: Connection, userPublicKey: PublicKey, autoClaimEnabled = true) {
    this.connection = connection;
    this.userPublicKey = userPublicKey;
    this.autoClaimEnabled = autoClaimEnabled;
  }
  
  // Wallet Scoring: 6-factor analysis
  public async scoreWallet(): Promise<WalletScore> {
    const details = {
      totalTransactions: 0,
      uniqueProtocols: 0,
      totalVolume: 0,
      accountAge: 0,
      nftCount: 0,
      socialConnections: 0,
    };
    
    try {
      // Factor 1: Transaction count (0-20 points)
      const signatures = await this.connection.getSignaturesForAddress(
        this.userPublicKey,
        { limit: 1000 }
      );
      details.totalTransactions = signatures.length;
      
      const transactionScore = Math.min(20, Math.floor(details.totalTransactions / 50));
      
      // Factor 2: Unique protocols (0-20 points)
      details.uniqueProtocols = await this.countUniqueProtocols();
      const protocolScore = Math.min(20, details.uniqueProtocols * 2);
      
      // Factor 3: Trading volume (0-20 points)
      details.totalVolume = await this.calculateTotalVolume();
      const volumeScore = Math.min(20, Math.floor(details.totalVolume / 10000));
      
      // Factor 4: Account duration (0-15 points)
      details.accountAge = await this.getAccountAge();
      const durationScore = Math.min(15, Math.floor(details.accountAge / 30));
      
      // Factor 5: NFT holdings (0-15 points)
      details.nftCount = await this.countNFTs();
      const nftScore = Math.min(15, Math.floor(details.nftCount / 5));
      
      // Factor 6: Social connections (0-10 points)
      details.socialConnections = await this.getSocialScore();
      const socialScore = Math.min(10, details.socialConnections);
      
      const totalScore = 
        transactionScore + 
        protocolScore + 
        volumeScore + 
        durationScore + 
        nftScore + 
        socialScore;
      
      const tier = this.calculateTier(totalScore);
      
      this.walletScore = {
        totalScore,
        tier,
        factors: {
          transactions: transactionScore,
          protocols: protocolScore,
          volume: volumeScore,
          duration: durationScore,
          nfts: nftScore,
          social: socialScore,
        },
        details,
      };
      
      return this.walletScore;
    } catch (error) {
      console.error('Error scoring wallet:', error);
      // Return default NOVICE score on error
      return {
        totalScore: 0,
        tier: 'NOVICE',
        factors: {
          transactions: 0,
          protocols: 0,
          volume: 0,
          duration: 0,
          nfts: 0,
          social: 0,
        },
        details,
      };
    }
  }
  
  private calculateTier(score: number): 'WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE' {
    if (score >= 90) return 'WHALE';
    if (score >= 70) return 'DEGEN';
    if (score >= 50) return 'ACTIVE';
    if (score >= 30) return 'CASUAL';
    return 'NOVICE';
  }
  
  private async countUniqueProtocols(): Promise<number> {
    try {
      // This would analyze transaction history to identify unique program IDs
      // For now, returning a placeholder
      const signatures = await this.connection.getSignaturesForAddress(
        this.userPublicKey,
        { limit: 100 }
      );
      
      // Simplified: estimate based on transaction count
      return Math.min(15, Math.floor(signatures.length / 10));
    } catch {
      return 0;
    }
  }
  
  private async calculateTotalVolume(): Promise<number> {
    try {
      // This would sum up all SOL transfers and token swaps
      // For now, returning a placeholder based on balance
      const balance = await this.connection.getBalance(this.userPublicKey);
      return balance / 1e9 * 10; // Rough estimate
    } catch {
      return 0;
    }
  }
  
  private async getAccountAge(): Promise<number> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.userPublicKey,
        { limit: 1 }
      );
      
      if (signatures.length > 0) {
        const firstTxBlockTime = signatures[signatures.length - 1].blockTime;
        if (firstTxBlockTime !== null && firstTxBlockTime !== undefined) {
          const firstTxTime = firstTxBlockTime * 1000;
          const now = Date.now();
          const ageInDays = (now - firstTxTime) / (1000 * 60 * 60 * 24);
          return Math.floor(ageInDays);
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }
  
  private async countNFTs(): Promise<number> {
    try {
      // This would query for NFT token accounts
      // Placeholder implementation
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.userPublicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      // Count accounts with amount = 1 and decimals = 0 (NFTs)
      const nfts = tokenAccounts.value.filter(
        account => 
          account.account.data.parsed.info.tokenAmount.amount === '1' &&
          account.account.data.parsed.info.tokenAmount.decimals === 0
      );
      
      return nfts.length;
    } catch {
      return 0;
    }
  }
  
  private async getSocialScore(): Promise<number> {
    // This would check for social connections (Twitter, Discord, etc.)
    // Placeholder: return score based on account activity
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.userPublicKey,
        { limit: 100 }
      );
      return Math.min(10, Math.floor(signatures.length / 20));
    } catch {
      return 0;
    }
  }
  
  public getWalletScore(): WalletScore | undefined {
    return this.walletScore;
  }
  
  // Multi-Protocol Airdrop Checking
  public async checkAllAirdrops(): Promise<AirdropInfo[]> {
    if (!this.walletScore) {
      await this.scoreWallet();
    }
    
    const airdrops: AirdropInfo[] = [];
    
    // Check Jupiter airdrop (with mobile API)
    const jupiterAirdrop = await this.checkJupiterAirdrop();
    if (jupiterAirdrop) airdrops.push(jupiterAirdrop);
    
    // Check Jito airdrop
    const jitoAirdrop = await this.checkJitoAirdrop();
    if (jitoAirdrop) airdrops.push(jitoAirdrop);
    
    // Check Kamino airdrop
    const kaminoAirdrop = await this.checkKaminoAirdrop();
    if (kaminoAirdrop) airdrops.push(kaminoAirdrop);
    
    // Check Parcl airdrop
    const parclAirdrop = await this.checkParclAirdrop();
    if (parclAirdrop) airdrops.push(parclAirdrop);
    
    // Check Tensor airdrop
    const tensorAirdrop = await this.checkTensorAirdrop();
    if (tensorAirdrop) airdrops.push(tensorAirdrop);
    
    return airdrops;
  }
  
  // Jupiter Mobile Airdrop API Integration with Auto-Claim
  private async checkJupiterAirdrop(): Promise<AirdropInfo | null> {
    try {
      // Jupiter Mobile API endpoint
      const response = await axios.get(
        `https://worker.jup.ag/jup-claim-proof/${this.userPublicKey.toString()}`,
        { timeout: 10000 }
      );
      
      if (response.data && response.data.amount) {
        return {
          protocol: 'Jupiter',
          tokenMint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
          amount: response.data.amount,
          amountUSD: response.data.amountUSD,
          claimable: true,
          claimed: false,
          claimUrl: 'https://jup.ag/claim',
        };
      }
    } catch (error) {
      // No airdrop or already claimed
    }
    return null;
  }
  
  private async checkJitoAirdrop(): Promise<AirdropInfo | null> {
    try {
      const response = await axios.get(
        `https://kek.jito.network/api/v1/airdrop_allocation/${this.userPublicKey.toString()}`,
        { timeout: 10000 }
      );
      
      if (response.data && response.data.allocation) {
        return {
          protocol: 'Jito',
          tokenMint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
          amount: response.data.allocation,
          claimable: true,
          claimed: false,
          claimUrl: 'https://jito.network/claim',
        };
      }
    } catch (error) {
      // No airdrop
    }
    return null;
  }
  
  private async checkKaminoAirdrop(): Promise<AirdropInfo | null> {
    try {
      // Kamino airdrop API (placeholder endpoint)
      const response = await axios.get(
        `https://api.kamino.finance/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 10000 }
      );
      
      if (response.data && response.data.eligible) {
        return {
          protocol: 'Kamino',
          tokenMint: 'KAMINOzQKZKEu7VDxvCLMVXG5QhPhcvKbvJJCQcpump',
          amount: response.data.amount,
          claimable: true,
          claimed: false,
          claimUrl: 'https://kamino.finance/claim',
        };
      }
    } catch (error) {
      // No airdrop
    }
    return null;
  }
  
  private async checkParclAirdrop(): Promise<AirdropInfo | null> {
    try {
      // Parcl airdrop API (placeholder endpoint)
      const response = await axios.get(
        `https://api.parcl.co/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 10000 }
      );
      
      if (response.data && response.data.allocation) {
        return {
          protocol: 'Parcl',
          tokenMint: 'PARCLv4vPTSQNuFQJAiqHEDCyWMYHgZBFPJnxXgnVwj',
          amount: response.data.allocation,
          claimable: true,
          claimed: false,
          claimUrl: 'https://parcl.co/claim',
        };
      }
    } catch (error) {
      // No airdrop
    }
    return null;
  }
  
  private async checkTensorAirdrop(): Promise<AirdropInfo | null> {
    try {
      // Tensor airdrop API (placeholder endpoint)
      const response = await axios.get(
        `https://api.tensor.trade/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 10000 }
      );
      
      if (response.data && response.data.eligible) {
        return {
          protocol: 'Tensor',
          tokenMint: 'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6',
          amount: response.data.amount,
          claimable: true,
          claimed: false,
          claimUrl: 'https://tensor.trade/claim',
        };
      }
    } catch (error) {
      // No airdrop
    }
    return null;
  }
  
  // Auto-Claim for WHALE/DEGEN Tiers Only
  public async autoClaimAll(userKeypair: Keypair): Promise<Map<string, ClaimHistory>> {
    const results = new Map<string, ClaimHistory>();
    
    // Check if auto-claim is enabled
    if (!this.autoClaimEnabled) {
      console.log('Auto-claim is disabled');
      return results;
    }
    
    // Ensure wallet is scored
    if (!this.walletScore) {
      await this.scoreWallet();
    }
    
    // Only auto-claim for WHALE and DEGEN tiers
    if (!this.autoClaimTiers.includes(this.walletScore!.tier)) {
      console.log(`Auto-claim not enabled for tier: ${this.walletScore!.tier}`);
      console.log('Auto-claim is only enabled for WHALE and DEGEN tiers');
      return results;
    }
    
    const airdrops = await this.checkAllAirdrops();
    
    for (const airdrop of airdrops) {
      if (airdrop.claimable && !airdrop.claimed) {
        const claimResult = await this.claimAirdrop(airdrop, userKeypair);
        results.set(airdrop.protocol, claimResult);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    return results;
  }
  
  // Claim History Tracking with Signatures
  private async claimAirdrop(airdrop: AirdropInfo, userKeypair: Keypair): Promise<ClaimHistory> {
    const timestamp = new Date();
    let signature = '';
    let status: 'success' | 'failed' | 'pending' = 'pending';
    
    try {
      console.log(`Claiming ${airdrop.protocol} airdrop...`);
      
      switch (airdrop.protocol) {
        case 'Jupiter':
          signature = await this.claimJupiterAirdrop(userKeypair);
          break;
        case 'Jito':
          signature = await this.claimJitoAirdrop(userKeypair);
          break;
        case 'Kamino':
          signature = await this.claimKaminoAirdrop(userKeypair);
          break;
        case 'Parcl':
          signature = await this.claimParclAirdrop(userKeypair);
          break;
        case 'Tensor':
          signature = await this.claimTensorAirdrop(userKeypair);
          break;
        default:
          throw new Error(`Unknown protocol: ${airdrop.protocol}`);
      }
      
      if (signature) {
        status = 'success';
        console.log(`✓ Claimed ${airdrop.protocol} airdrop: ${signature}`);
      } else {
        status = 'failed';
      }
    } catch (error) {
      console.error(`✗ Error claiming ${airdrop.protocol} airdrop:`, error);
      status = 'failed';
    }
    
    const history: ClaimHistory = {
      signature,
      protocol: airdrop.protocol,
      amount: airdrop.amount,
      timestamp,
      status,
      txUrl: signature ? `https://solscan.io/tx/${signature}` : '',
    };
    
    this.claimHistory.push(history);
    return history;
  }
  
  private async claimJupiterAirdrop(_userKeypair: Keypair): Promise<string> {
    // Implementation would create and send claim transaction
    // Placeholder for now
    console.log('Claiming Jupiter airdrop...');
    
    // In production, this would:
    // 1. Fetch merkle proof from API
    // 2. Create claim instruction
    // 3. Build and sign transaction
    // 4. Send transaction
    // 5. Return signature
    
    return '';
  }
  
  private async claimJitoAirdrop(_userKeypair: Keypair): Promise<string> {
    console.log('Claiming Jito airdrop...');
    return '';
  }
  
  private async claimKaminoAirdrop(_userKeypair: Keypair): Promise<string> {
    console.log('Claiming Kamino airdrop...');
    return '';
  }
  
  private async claimParclAirdrop(_userKeypair: Keypair): Promise<string> {
    console.log('Claiming Parcl airdrop...');
    return '';
  }
  
  private async claimTensorAirdrop(_userKeypair: Keypair): Promise<string> {
    console.log('Claiming Tensor airdrop...');
    return '';
  }
  
  public getClaimHistory(): ClaimHistory[] {
    return [...this.claimHistory];
  }
  
  public getSuccessfulClaims(): ClaimHistory[] {
    return this.claimHistory.filter(h => h.status === 'success');
  }
  
  public getTotalClaimedValue(): number {
    return this.claimHistory
      .filter(h => h.status === 'success')
      .reduce((sum, h) => sum + h.amount, 0);
  }
  
  public setAutoClaimEnabled(enabled: boolean): void {
    this.autoClaimEnabled = enabled;
  }
  
  public setAutoClaimTiers(tiers: ('WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE')[]): void {
    this.autoClaimTiers = tiers;
  }
  
  public isAutoClaimEnabled(): boolean {
    return this.autoClaimEnabled;
  }
  
  public getAutoClaimTiers(): ('WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE')[] {
    return [...this.autoClaimTiers];
  }
}
