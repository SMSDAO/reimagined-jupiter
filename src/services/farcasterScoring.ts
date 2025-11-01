import axios from 'axios';

export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  followerCount: number;
  followingCount: number;
  bio?: string;
  verifiedAddresses: {
    eth: string[];
    sol: string[];
  };
  powerBadge: boolean;
  activeOnFarcaster: boolean;
}

export interface FarcasterCast {
  hash: string;
  text: string;
  timestamp: string;
  likes: number;
  recasts: number;
  replies: number;
}

export interface FarcasterScore {
  totalScore: number; // 0-100
  factors: {
    followers: number; // 0-30 pts
    casts: number; // 0-20 pts
    powerBadge: number; // 0-25 pts
    verified: number; // 0-15 pts
    influencer: number; // 0-10 pts
  };
  profile?: FarcasterProfile;
}

export interface GMScore {
  totalScore: number; // 0-100
  gmCastCount: number;
  averageLikes: number;
  averageRecasts: number;
  communityEngagement: number;
  consistency: number; // Days with GM casts
}

export interface TrustScore {
  totalScore: number; // 0-100
  components: {
    inverseRisk: number; // 40%
    farcasterScore: number; // 30%
    gmScore: number; // 20%
    ageBonus: number; // 10%
  };
}

export class FarcasterScoring {
  private neynarApiKey: string;
  private baseUrl: string = 'https://api.neynar.com/v2/farcaster';

  constructor(neynarApiKey: string) {
    this.neynarApiKey = neynarApiKey;
  }

  /**
   * Look up Farcaster profile by Solana wallet address
   */
  async getProfileByWallet(walletAddress: string): Promise<FarcasterProfile | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/user/bulk-by-address`, {
        params: {
          addresses: walletAddress,
          address_types: 'verified_addresses',
        },
        headers: {
          'api_key': this.neynarApiKey,
        },
      });

      if (response.data && response.data[walletAddress] && response.data[walletAddress].length > 0) {
        const user = response.data[walletAddress][0];
        return this.mapNeynarUserToProfile(user);
      }

      return null;
    } catch (error) {
      console.error('Error fetching Farcaster profile:', error);
      return null;
    }
  }

  /**
   * Get user's recent casts
   */
  async getUserCasts(fid: number, limit: number = 100): Promise<FarcasterCast[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/feed/user/casts`, {
        params: {
          fid,
          limit,
        },
        headers: {
          'api_key': this.neynarApiKey,
        },
      });

      if (response.data && response.data.casts) {
        return response.data.casts.map((cast: any) => ({
          hash: cast.hash,
          text: cast.text,
          timestamp: cast.timestamp,
          likes: cast.reactions?.likes_count || 0,
          recasts: cast.reactions?.recasts_count || 0,
          replies: cast.replies?.count || 0,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching casts:', error);
      return [];
    }
  }

  /**
   * Calculate Farcaster Score (0-100)
   * Breakdown: Followers(30pts) + Casts(20pts) + Power Badge(25pts) + Verified(15pts) + Influencer(10pts)
   */
  async calculateFarcasterScore(walletAddress: string): Promise<FarcasterScore> {
    const profile = await this.getProfileByWallet(walletAddress);

    if (!profile) {
      return {
        totalScore: 0,
        factors: {
          followers: 0,
          casts: 0,
          powerBadge: 0,
          verified: 0,
          influencer: 0,
        },
      };
    }

    const casts = await this.getUserCasts(profile.fid);

    // Calculate follower score (0-30 pts)
    const followerScore = this.calculateFollowerScore(profile.followerCount);

    // Calculate cast score (0-20 pts)
    const castScore = this.calculateCastScore(casts.length);

    // Power badge (0-25 pts)
    const powerBadgeScore = profile.powerBadge ? 25 : 0;

    // Verified addresses (0-15 pts)
    const verifiedScore = this.calculateVerifiedScore(profile.verifiedAddresses);

    // Influencer status (0-10 pts)
    const influencerScore = this.calculateInfluencerScore(profile, casts);

    return {
      totalScore: followerScore + castScore + powerBadgeScore + verifiedScore + influencerScore,
      factors: {
        followers: followerScore,
        casts: castScore,
        powerBadge: powerBadgeScore,
        verified: verifiedScore,
        influencer: influencerScore,
      },
      profile,
    };
  }

  /**
   * Calculate GM Score (0-100)
   * Tracks 'GM' casts, engagement metrics, and community participation
   */
  async calculateGMScore(walletAddress: string): Promise<GMScore> {
    const profile = await this.getProfileByWallet(walletAddress);

    if (!profile) {
      return {
        totalScore: 0,
        gmCastCount: 0,
        averageLikes: 0,
        averageRecasts: 0,
        communityEngagement: 0,
        consistency: 0,
      };
    }

    const casts = await this.getUserCasts(profile.fid, 200);
    const gmCasts = casts.filter(cast => 
      cast.text.toLowerCase().includes('gm') || 
      cast.text.toLowerCase().includes('good morning')
    );

    const gmCastCount = gmCasts.length;
    const averageLikes = gmCasts.length > 0 
      ? gmCasts.reduce((sum, cast) => sum + cast.likes, 0) / gmCasts.length 
      : 0;
    const averageRecasts = gmCasts.length > 0 
      ? gmCasts.reduce((sum, cast) => sum + cast.recasts, 0) / gmCasts.length 
      : 0;

    // Calculate consistency (unique days with GM casts)
    const uniqueDays = new Set(
      gmCasts.map(cast => new Date(cast.timestamp).toDateString())
    ).size;

    // Scoring
    const gmCountScore = Math.min(gmCastCount * 2, 30); // Max 30 pts (15 GM casts)
    const likesScore = Math.min(averageLikes * 2, 25); // Max 25 pts
    const recastsScore = Math.min(averageRecasts * 3, 20); // Max 20 pts
    const consistencyScore = Math.min(uniqueDays * 2, 25); // Max 25 pts (12.5 days)

    const totalScore = gmCountScore + likesScore + recastsScore + consistencyScore;

    return {
      totalScore,
      gmCastCount,
      averageLikes,
      averageRecasts,
      communityEngagement: (likesScore + recastsScore) / 45 * 100,
      consistency: uniqueDays,
    };
  }

  /**
   * Calculate Trust Score composite
   * 40% inverse risk + 30% Farcaster + 20% GM + 10% age bonus
   */
  async calculateTrustScore(
    walletAddress: string,
    riskScore: number, // 0-100 (where 100 is highest risk)
    walletAgeInDays: number
  ): Promise<TrustScore> {
    const farcasterScore = await this.calculateFarcasterScore(walletAddress);
    const gmScore = await this.calculateGMScore(walletAddress);

    // Inverse risk: 100 - riskScore (so low risk = high trust)
    const inverseRisk = (100 - riskScore) * 0.4;

    // Farcaster score contribution (30%)
    const farcasterContribution = farcasterScore.totalScore * 0.3;

    // GM score contribution (20%)
    const gmContribution = gmScore.totalScore * 0.2;

    // Age bonus (10%): Max score at 365+ days
    const ageBonus = Math.min(walletAgeInDays / 365, 1) * 10;

    const totalScore = inverseRisk + farcasterContribution + gmContribution + ageBonus;

    return {
      totalScore,
      components: {
        inverseRisk,
        farcasterScore: farcasterContribution,
        gmScore: gmContribution,
        ageBonus,
      },
    };
  }

  /**
   * Calculate social verification risk bonus
   * Returns -15 risk points if Farcaster score > 50
   */
  async getSocialVerificationBonus(walletAddress: string): Promise<number> {
    const farcasterScore = await this.calculateFarcasterScore(walletAddress);
    return farcasterScore.totalScore > 50 ? -15 : 0;
  }

  // Private helper methods

  private mapNeynarUserToProfile(user: any): FarcasterProfile {
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url,
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      bio: user.profile?.bio?.text,
      verifiedAddresses: {
        eth: user.verified_addresses?.eth_addresses || [],
        sol: user.verified_addresses?.sol_addresses || [],
      },
      powerBadge: user.power_badge || false,
      activeOnFarcaster: user.active_status === 'active',
    };
  }

  private calculateFollowerScore(followerCount: number): number {
    // 0-30 points based on follower count
    if (followerCount >= 10000) return 30;
    if (followerCount >= 5000) return 27;
    if (followerCount >= 2000) return 24;
    if (followerCount >= 1000) return 21;
    if (followerCount >= 500) return 18;
    if (followerCount >= 250) return 15;
    if (followerCount >= 100) return 12;
    if (followerCount >= 50) return 9;
    if (followerCount >= 25) return 6;
    if (followerCount >= 10) return 3;
    return 0;
  }

  private calculateCastScore(castCount: number): number {
    // 0-20 points based on cast count
    if (castCount >= 1000) return 20;
    if (castCount >= 500) return 18;
    if (castCount >= 250) return 16;
    if (castCount >= 100) return 14;
    if (castCount >= 50) return 12;
    if (castCount >= 25) return 10;
    if (castCount >= 10) return 8;
    if (castCount >= 5) return 6;
    return castCount >= 1 ? 4 : 0;
  }

  private calculateVerifiedScore(verifiedAddresses: { eth: string[]; sol: string[] }): number {
    // 0-15 points based on verified addresses
    const totalVerified = verifiedAddresses.eth.length + verifiedAddresses.sol.length;
    if (totalVerified >= 3) return 15;
    if (totalVerified === 2) return 10;
    if (totalVerified === 1) return 5;
    return 0;
  }

  private calculateInfluencerScore(profile: FarcasterProfile, casts: FarcasterCast[]): number {
    // 0-10 points based on engagement rate
    if (casts.length === 0) return 0;

    const totalEngagement = casts.reduce(
      (sum, cast) => sum + cast.likes + cast.recasts + cast.replies,
      0
    );
    const averageEngagement = totalEngagement / casts.length;

    if (averageEngagement >= 50) return 10;
    if (averageEngagement >= 25) return 8;
    if (averageEngagement >= 10) return 6;
    if (averageEngagement >= 5) return 4;
    if (averageEngagement >= 2) return 2;
    return 0;
  }
}
