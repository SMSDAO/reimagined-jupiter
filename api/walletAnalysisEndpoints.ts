/**
 * Wallet Analysis API Endpoints
 *
 * This file provides API endpoint implementations for wallet analysis
 * with social intelligence integration.
 *
 * Usage:
 * - Can be integrated with Express.js, Fastify, or Next.js API routes
 * - All endpoints require proper authentication in production
 * - Rate limiting should be applied
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { WalletScoring } from "../src/services/walletScoring.js";
import { FarcasterScoring } from "../src/services/farcasterScoring.js";
import database from "../db/database.js";
import { config } from "../src/config/index.js";

// Initialize services
const connection = new Connection(config.solana.rpcUrl);
const walletScoring = new WalletScoring(connection, config.neynar.apiKey);
const farcasterScoring = config.neynar.apiKey
  ? new FarcasterScoring(config.neynar.apiKey)
  : null;

/**
 * POST /api/wallet/analyze
 * Analyze wallet with optional social intelligence
 *
 * Body:
 * {
 *   walletAddress: string,
 *   includeSocial?: boolean (default: true),
 *   saveToDatabase?: boolean (default: false)
 * }
 */
export async function analyzeWallet(req: any, res: any) {
  try {
    const {
      walletAddress,
      includeSocial = true,
      saveToDatabase = false,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    // Analyze wallet
    const analysis = await walletScoring.analyzeWallet(
      publicKey,
      includeSocial,
    );

    // Save to database if requested
    if (saveToDatabase && analysis) {
      await database.upsertWalletAnalysis({
        walletAddress: analysis.address,
        totalScore: analysis.totalScore,
        tier: analysis.tier,
        balanceScore: analysis.factors.balance,
        transactionScore: analysis.factors.transactionCount,
        nftScore: analysis.factors.nftHoldings,
        defiScore: analysis.factors.defiActivity,
        ageScore: analysis.factors.ageAndConsistency,
        diversificationScore: analysis.factors.diversification,
        farcasterScore: analysis.socialIntelligence?.farcasterScore.totalScore,
        gmScore: analysis.socialIntelligence?.gmScore.totalScore,
        trustScore: analysis.socialIntelligence?.trustScore.totalScore,
        riskAdjustment: analysis.socialIntelligence?.riskAdjustment,
        airdropPriority: analysis.airdropPriority,
        estimatedValue: analysis.estimatedAirdropValue,
      });

      // Save Farcaster profile if available
      if (analysis.socialIntelligence?.farcasterScore.profile) {
        const profile = analysis.socialIntelligence.farcasterScore.profile;
        await database.upsertFarcasterProfile({
          walletAddress: analysis.address,
          fid: profile.fid,
          username: profile.username,
          displayName: profile.displayName,
          pfpUrl: profile.pfpUrl,
          bio: profile.bio,
          followerCount: profile.followerCount,
          followingCount: profile.followingCount,
          powerBadge: profile.powerBadge,
          verifiedEthCount: profile.verifiedAddresses.eth.length,
          verifiedSolCount: profile.verifiedAddresses.sol.length,
          activeOnFarcaster: profile.activeOnFarcaster,
        });
      }

      // Save trust score history
      if (analysis.socialIntelligence?.trustScore) {
        const trustScore = analysis.socialIntelligence.trustScore;
        await database.insertTrustScoreHistory({
          walletAddress: analysis.address,
          trustScore: trustScore.totalScore,
          inverseRisk: trustScore.components.inverseRisk,
          farcasterContribution: trustScore.components.farcasterScore,
          gmContribution: trustScore.components.gmScore,
          ageBonus: trustScore.components.ageBonus,
          socialVerificationBonus: analysis.socialIntelligence.riskAdjustment,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error analyzing wallet:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/wallet/:address/trust
 * Get trust score for a wallet
 */
export async function getTrustScore(req: any, res: any) {
  try {
    const { address } = req.params;

    if (!farcasterScoring) {
      return res
        .status(503)
        .json({ error: "Farcaster integration not configured" });
    }

    // Get from database first
    const cached = await database.getWalletAnalysis(address);
    if (cached && cached.trust_score) {
      return res.status(200).json({
        success: true,
        data: {
          trustScore: cached.trust_score,
          farcasterScore: cached.farcaster_score,
          gmScore: cached.gm_score,
          lastUpdated: cached.updated_at,
        },
        cached: true,
      });
    }

    // Calculate fresh if not cached
    const publicKey = new PublicKey(address);
    const analysis = await walletScoring.analyzeWallet(publicKey, true);

    return res.status(200).json({
      success: true,
      data: analysis.socialIntelligence?.trustScore || null,
      cached: false,
    });
  } catch (error) {
    console.error("Error getting trust score:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/wallet/:address/farcaster
 * Get Farcaster profile for a wallet
 */
export async function getFarcasterProfile(req: any, res: any) {
  try {
    const { address } = req.params;

    if (!farcasterScoring) {
      return res
        .status(503)
        .json({ error: "Farcaster integration not configured" });
    }

    // Check database first
    const cached = await database.getFarcasterProfile(address);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from Farcaster API
    const profile = await farcasterScoring.getProfileByWallet(address);

    if (profile) {
      // Cache in database
      await database.upsertFarcasterProfile({
        walletAddress: address,
        fid: profile.fid,
        username: profile.username,
        displayName: profile.displayName,
        pfpUrl: profile.pfpUrl,
        bio: profile.bio,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
        powerBadge: profile.powerBadge,
        verifiedEthCount: profile.verifiedAddresses.eth.length,
        verifiedSolCount: profile.verifiedAddresses.sol.length,
        activeOnFarcaster: profile.activeOnFarcaster,
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
      cached: false,
    });
  } catch (error) {
    console.error("Error getting Farcaster profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/wallet/:address/gm
 * Get GM score for a wallet
 */
export async function getGMScore(req: any, res: any) {
  try {
    const { address } = req.params;

    if (!farcasterScoring) {
      return res
        .status(503)
        .json({ error: "Farcaster integration not configured" });
    }

    const gmScore = await farcasterScoring.calculateGMScore(address);

    return res.status(200).json({
      success: true,
      data: gmScore,
    });
  } catch (error) {
    console.error("Error getting GM score:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/wallets/high-value
 * Get high-value wallets
 */
export async function getHighValueWallets(req: any, res: any) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const wallets = await database.getHighValueWallets(limit);

    return res.status(200).json({
      success: true,
      data: wallets,
      count: wallets.length,
    });
  } catch (error) {
    console.error("Error getting high-value wallets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/wallets/airdrop-priority
 * Get airdrop priority wallets
 */
export async function getAirdropPriorityWallets(req: any, res: any) {
  try {
    const minPriority = parseInt(req.query.minPriority) || 4;
    const limit = parseInt(req.query.limit) || 100;

    const wallets = await database.getAirdropPriorityWallets(
      minPriority,
      limit,
    );

    return res.status(200).json({
      success: true,
      data: wallets,
      count: wallets.length,
    });
  } catch (error) {
    console.error("Error getting airdrop priority wallets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Express.js example integration
export function setupExpressRoutes(app: any) {
  app.post("/api/wallet/analyze", analyzeWallet);
  app.get("/api/wallet/:address/trust", getTrustScore);
  app.get("/api/wallet/:address/farcaster", getFarcasterProfile);
  app.get("/api/wallet/:address/gm", getGMScore);
  app.get("/api/wallets/high-value", getHighValueWallets);
  app.get("/api/wallets/airdrop-priority", getAirdropPriorityWallets);
}

export default {
  analyzeWallet,
  getTrustScore,
  getFarcasterProfile,
  getGMScore,
  getHighValueWallets,
  getAirdropPriorityWallets,
  setupExpressRoutes,
};
