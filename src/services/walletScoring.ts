import { Connection, PublicKey } from "@solana/web3.js";
import {
  FarcasterScoring,
  FarcasterScore,
  GMScore,
  TrustScore,
} from "./farcasterScoring.js";

export type WalletTier = "WHALE" | "DEGEN" | "ACTIVE" | "CASUAL" | "NOVICE";

export interface WalletScore {
  address: string;
  totalScore: number; // 0-100
  tier: WalletTier;
  factors: {
    balance: number; // 0-20
    transactionCount: number; // 0-20
    nftHoldings: number; // 0-15
    defiActivity: number; // 0-15
    ageAndConsistency: number; // 0-15
    diversification: number; // 0-15
  };
  socialIntelligence?: {
    farcasterScore: FarcasterScore;
    gmScore: GMScore;
    trustScore: TrustScore;
    riskAdjustment: number;
  };
  airdropPriority: number; // 1-5 (5 = highest)
  estimatedAirdropValue: number;
  analyzedAt: Date;
}

export class WalletScoring {
  private connection: Connection;
  private farcasterScoring?: FarcasterScoring;

  constructor(connection: Connection, neynarApiKey?: string) {
    this.connection = connection;
    if (neynarApiKey) {
      this.farcasterScoring = new FarcasterScoring(neynarApiKey);
    }
  }

  async analyzeWallet(
    address: PublicKey,
    includeSocial: boolean = true,
  ): Promise<WalletScore> {
    if (!address) {
      throw new Error("Invalid address: PublicKey is required");
    }
    console.log(`Analyzing wallet: ${address.toString().slice(0, 8)}...`);

    const factors = {
      balance: await this.analyzeBalance(address),
      transactionCount: await this.analyzeTransactionCount(address),
      nftHoldings: await this.analyzeNFTHoldings(address),
      defiActivity: await this.analyzeDeFiActivity(address),
      ageAndConsistency: await this.analyzeAgeAndConsistency(address),
      diversification: await this.analyzeDiversification(address),
    };

    const totalScore = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0,
    );
    const tier = this.determineTier(totalScore);
    const airdropPriority = this.calculateAirdropPriority(tier, factors);
    const estimatedAirdropValue = this.estimateAirdropValue(tier, factors);

    const result: WalletScore = {
      address: address.toString(),
      totalScore,
      tier,
      factors,
      airdropPriority,
      estimatedAirdropValue,
      analyzedAt: new Date(),
    };

    // Add social intelligence if enabled and Farcaster is configured
    if (includeSocial && this.farcasterScoring) {
      try {
        const walletAddress = address.toString();
        const farcasterScore =
          await this.farcasterScoring.calculateFarcasterScore(walletAddress);
        const gmScore =
          await this.farcasterScoring.calculateGMScore(walletAddress);

        // Calculate risk score for trust calculation (based on wallet age and activity)
        const signatures = await this.connection.getSignaturesForAddress(
          address,
          { limit: 1000 },
        );
        const oldestTx = signatures[signatures.length - 1]?.blockTime;
        const walletAgeInDays = oldestTx
          ? (Date.now() / 1000 - oldestTx) / 86400
          : 0;

        // Simple risk calculation: new wallets with low activity = higher risk
        const baseRisk = Math.max(0, 100 - totalScore);
        const ageRiskAdjustment = Math.max(0, 30 - walletAgeInDays) * 2; // Penalty for new wallets
        const riskScore = Math.min(100, baseRisk + ageRiskAdjustment);

        const trustScore = await this.farcasterScoring.calculateTrustScore(
          walletAddress,
          riskScore,
          walletAgeInDays,
        );

        const socialVerificationBonus =
          await this.farcasterScoring.getSocialVerificationBonus(walletAddress);

        result.socialIntelligence = {
          farcasterScore,
          gmScore,
          trustScore,
          riskAdjustment: socialVerificationBonus,
        };

        // Boost airdrop priority for wallets with good social scores
        if (farcasterScore.totalScore > 50) {
          result.airdropPriority = Math.min(5, result.airdropPriority + 1);
        }
      } catch (error) {
        console.error("Error analyzing social intelligence:", error);
      }
    }

    return result;
  }

  private async analyzeBalance(address: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(address);
      const solBalance = balance / 1e9;

      // Score: 0-20 based on SOL balance
      if (solBalance >= 1000) return 20;
      if (solBalance >= 100) return 18;
      if (solBalance >= 50) return 16;
      if (solBalance >= 10) return 14;
      if (solBalance >= 5) return 12;
      if (solBalance >= 1) return 10;
      if (solBalance >= 0.5) return 8;
      if (solBalance >= 0.1) return 6;
      return 4;
    } catch (error) {
      console.error("Error analyzing balance:", error);
      return 0;
    }
  }

  private async analyzeTransactionCount(address: PublicKey): Promise<number> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        address,
        { limit: 1000 },
      );
      const txCount = signatures.length;

      // Score: 0-20 based on transaction count
      if (txCount >= 10000) return 20;
      if (txCount >= 5000) return 18;
      if (txCount >= 1000) return 16;
      if (txCount >= 500) return 14;
      if (txCount >= 100) return 12;
      if (txCount >= 50) return 10;
      if (txCount >= 10) return 8;
      return 6;
    } catch (error) {
      console.error("Error analyzing transaction count:", error);
      return 0;
    }
  }

  private async analyzeNFTHoldings(address: PublicKey): Promise<number> {
    try {
      // Simplified NFT analysis
      // In production, would use Metaplex or Helius API
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        address,
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          ),
        },
      );

      let nftCount = 0;
      for (const account of tokenAccounts.value) {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        const decimals = account.account.data.parsed.info.tokenAmount.decimals;
        if (amount === 1 && decimals === 0) {
          nftCount++;
        }
      }

      // Score: 0-15 based on NFT holdings
      if (nftCount >= 100) return 15;
      if (nftCount >= 50) return 13;
      if (nftCount >= 20) return 11;
      if (nftCount >= 10) return 9;
      if (nftCount >= 5) return 7;
      if (nftCount >= 1) return 5;
      return 0;
    } catch (error) {
      console.error("Error analyzing NFT holdings:", error);
      return 0;
    }
  }

  private async analyzeDeFiActivity(address: PublicKey): Promise<number> {
    try {
      // Check interaction with major DeFi protocols
      const signatures = await this.connection.getSignaturesForAddress(
        address,
        { limit: 100 },
      );

      let defiScore = 0;
      // Track major DeFi protocol interactions
      // const defiProtocols = [
      //   'Jupiter', 'Raydium', 'Orca', 'Marinade', 'Lido',
      //   'Mango', 'Solend', 'Marginfi', 'Kamino'
      // ];

      // Simplified scoring based on recent activity
      if (signatures.length > 50) defiScore += 10;
      else if (signatures.length > 20) defiScore += 7;
      else defiScore += 5;

      // Additional 5 points for active trading
      defiScore += 5;

      return Math.min(defiScore, 15);
    } catch (error) {
      console.error("Error analyzing DeFi activity:", error);
      return 0;
    }
  }

  private async analyzeAgeAndConsistency(address: PublicKey): Promise<number> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        address,
        { limit: 1000 },
      );

      if (signatures.length === 0) return 0;

      const oldest = signatures[signatures.length - 1].blockTime;
      const newest = signatures[0].blockTime;

      if (!oldest || !newest) return 5;

      const ageInDays = (Date.now() / 1000 - oldest) / 86400;
      const activitySpan = (newest - oldest) / 86400;

      // Score: 0-15 based on age and consistency
      if (ageInDays >= 365 && activitySpan >= 180) return 15;
      if (ageInDays >= 180 && activitySpan >= 90) return 13;
      if (ageInDays >= 90 && activitySpan >= 30) return 11;
      if (ageInDays >= 30) return 9;
      if (ageInDays >= 7) return 7;
      return 5;
    } catch (error) {
      console.error("Error analyzing age and consistency:", error);
      return 0;
    }
  }

  private async analyzeDiversification(address: PublicKey): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        address,
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          ),
        },
      );

      const uniqueTokens = tokenAccounts.value.length;

      // Score: 0-15 based on token diversity
      if (uniqueTokens >= 50) return 15;
      if (uniqueTokens >= 30) return 13;
      if (uniqueTokens >= 20) return 11;
      if (uniqueTokens >= 10) return 9;
      if (uniqueTokens >= 5) return 7;
      if (uniqueTokens >= 1) return 5;
      return 0;
    } catch (error) {
      console.error("Error analyzing diversification:", error);
      return 0;
    }
  }

  private determineTier(totalScore: number): WalletTier {
    if (totalScore >= 80) return "WHALE";
    if (totalScore >= 65) return "DEGEN";
    if (totalScore >= 50) return "ACTIVE";
    if (totalScore >= 30) return "CASUAL";
    return "NOVICE";
  }

  private calculateAirdropPriority(
    tier: WalletTier,
    _factors: WalletScore["factors"],
  ): number {
    const tierPriority = {
      WHALE: 5,
      DEGEN: 4,
      ACTIVE: 3,
      CASUAL: 2,
      NOVICE: 1,
    };

    return tierPriority[tier];
  }

  private estimateAirdropValue(
    tier: WalletTier,
    factors: WalletScore["factors"],
  ): number {
    const baseValues = {
      WHALE: 10000,
      DEGEN: 5000,
      ACTIVE: 2000,
      CASUAL: 500,
      NOVICE: 100,
    };

    const multiplier =
      1 + factors.defiActivity / 100 + factors.nftHoldings / 100;
    return Math.round(baseValues[tier] * multiplier);
  }

  async batchAnalyzeWallets(addresses: PublicKey[]): Promise<WalletScore[]> {
    const results: WalletScore[] = [];

    for (const address of addresses) {
      try {
        const score = await this.analyzeWallet(address);
        results.push(score);

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing wallet ${address.toString()}:`, error);
      }
    }

    return results.sort((a, b) => b.totalScore - a.totalScore);
  }

  getHighPriorityWallets(scores: WalletScore[]): WalletScore[] {
    return scores.filter((s) => s.airdropPriority >= 4);
  }
}
