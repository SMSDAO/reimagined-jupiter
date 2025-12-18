/**
 * Neynar Farcaster API Integration
 * Profile lookup by wallet address with scoring algorithm
 * GXQ Studio - Advanced Solana DeFi Platform
 */

import axios from 'axios';

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

// Types
interface FarcasterUser {
    fid: number;
    username: string;
    display_name: string;
    profile?: {
        bio?: {
            text: string;
        };
    };
    follower_count: number;
    following_count: number;
    cast_count: number;
    verified_addresses?: {
        eth_addresses?: string[];
        sol_addresses?: string[];
    };
    power_badge?: boolean;
    active_status?: string;
}

interface FarcasterCast {
    text: string;
    timestamp: string;
    reactions?: {
        likes_count: number;
        recasts_count: number;
    };
    replies?: {
        count: number;
    };
}

interface GMStats {
    gm_casts_count: number;
    gm_total_likes: number;
    gm_total_recasts: number;
    gm_total_replies: number;
    gm_engagement_rate: number;
    gm_consistency_days: number;
    period_days: number;
}

interface TrustScoreResult {
    trust_score: number;
    trust_breakdown: {
        inverse_risk: number;
        farcaster: number;
        gm: number;
        age_bonus: number;
    };
    social_verification_bonus: number;
}

// API client
const neynarClient = axios.create({
    baseURL: NEYNAR_BASE_URL,
    headers: {
        'api_key': NEYNAR_API_KEY,
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

/**
 * Get Farcaster user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<FarcasterUser | null> {
    try {
        console.log(`Fetching Farcaster profile for wallet: ${walletAddress}`);
        
        const response = await neynarClient.get('/farcaster/user/by-verification', {
            params: {
                address: walletAddress
            }
        });
        
        if (response.data && response.data.user) {
            console.log(`✅ Found Farcaster user: @${response.data.user.username}`);
            return response.data.user;
        }
        
        console.log('ℹ️ No Farcaster profile found for this wallet');
        return null;
        
    } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status: number } };
            if (axiosError.response?.status === 404) {
                console.log('ℹ️ Wallet not connected to Farcaster');
                return null;
            }
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching Farcaster profile:', errorMessage);
        return null;
    }
}

/**
 * Get Farcaster user by FID
 */
export async function getUserByFID(fid: number): Promise<FarcasterUser | null> {
    try {
        console.log(`Fetching Farcaster profile for FID: ${fid}`);
        
        const response = await neynarClient.get(`/farcaster/user`, {
            params: {
                fid: fid
            }
        });
        
        if (response.data && response.data.user) {
            return response.data.user;
        }
        
        return null;
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching Farcaster profile by FID:', errorMessage);
        return null;
    }
}

/**
 * Get user's casts
 */
export async function getUserCasts(fid: number, limit = 25): Promise<FarcasterCast[]> {
    try {
        const response = await neynarClient.get('/farcaster/casts', {
            params: {
                fid: fid,
                limit: Math.min(limit, 100)
            }
        });
        
        return response.data?.casts || [];
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching user casts:', errorMessage);
        return [];
    }
}

/**
 * Calculate Farcaster Score (0-100)
 * Algorithm: Followers(30pts) + Casts(20pts) + Power Badge(25pts) + Verified(15pts) + Influencer(10pts)
 */
export function calculateFarcasterScore(user: FarcasterUser | null): number {
    if (!user) return 0;
    
    let score = 0;
    
    // 1. Followers Score (0-30 points)
    // Logarithmic scale: 0 followers = 0, 100 = 10pts, 1000 = 20pts, 10000+ = 30pts
    const followers = user.follower_count || 0;
    if (followers > 0) {
        const followersScore = Math.min(30, Math.log10(followers + 1) * 10);
        score += followersScore;
    }
    
    // 2. Casts Score (0-20 points)
    // Logarithmic scale: 0 casts = 0, 100 = 10pts, 1000 = 15pts, 5000+ = 20pts
    const casts = user.cast_count || 0;
    if (casts > 0) {
        const castsScore = Math.min(20, Math.log10(casts + 1) * 6.67);
        score += castsScore;
    }
    
    // 3. Power Badge (25 points)
    if (user.power_badge === true) {
        score += 25;
    }
    
    // 4. Verified (15 points)
    // Check if user has verified addresses
    const hasVerifiedAddresses = (user.verified_addresses?.eth_addresses?.length ?? 0) > 0 || 
                                 (user.verified_addresses?.sol_addresses?.length ?? 0) > 0;
    if (hasVerifiedAddresses) {
        score += 15;
    }
    
    // 5. Influencer Status (10 points)
    // Defined as: high engagement (following/followers ratio < 0.5) and substantial following
    const following = user.following_count || 0;
    const isInfluencer = followers > 1000 && following > 0 && (following / followers) < 0.5;
    if (isInfluencer) {
        score += 10;
    }
    
    return Math.round(score);
}

/**
 * Get GM casts for a user
 */
export async function getGMCasts(fid: number, daysBack = 30): Promise<GMStats> {
    try {
        const casts = await getUserCasts(fid, 100);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        
        const gmCasts = casts.filter(cast => {
            const castDate = new Date(cast.timestamp);
            const text = cast.text?.toLowerCase() || '';
            return castDate >= cutoffDate && (
                text.includes('gm') || 
                text.includes('good morning') ||
                text.startsWith('gm ') ||
                text === 'gm'
            );
        });
        
        // Calculate engagement metrics
        const totalLikes = gmCasts.reduce((sum, cast) => sum + (cast.reactions?.likes_count || 0), 0);
        const totalRecasts = gmCasts.reduce((sum, cast) => sum + (cast.reactions?.recasts_count || 0), 0);
        const totalReplies = gmCasts.reduce((sum, cast) => sum + (cast.replies?.count || 0), 0);
        
        // Calculate engagement rate
        const totalEngagement = totalLikes + totalRecasts + totalReplies;
        const engagementRate = gmCasts.length > 0 
            ? (totalEngagement / gmCasts.length).toFixed(2) 
            : 0;
        
        // Calculate consistency (days with GM casts)
        const uniqueDays = new Set(
            gmCasts.map(cast => new Date(cast.timestamp).toDateString())
        ).size;
        
        return {
            gm_casts_count: gmCasts.length,
            gm_total_likes: totalLikes,
            gm_total_recasts: totalRecasts,
            gm_total_replies: totalReplies,
            gm_engagement_rate: parseFloat(engagementRate.toString()),
            gm_consistency_days: uniqueDays,
            period_days: daysBack
        };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching GM casts:', errorMessage);
        return {
            gm_casts_count: 0,
            gm_total_likes: 0,
            gm_total_recasts: 0,
            gm_total_replies: 0,
            gm_engagement_rate: 0,
            gm_consistency_days: 0,
            period_days: daysBack
        };
    }
}

/**
 * Calculate GM Score (0-100)
 * Factors: GM frequency, engagement, consistency
 */
export function calculateGMScore(gmStats: GMStats): number {
    if (!gmStats || gmStats.gm_casts_count === 0) return 0;
    
    let score = 0;
    
    // 1. Frequency Score (0-40 points)
    // 1 GM/day = 30pts, 2+/day = 40pts
    const gmsPerDay = gmStats.gm_casts_count / gmStats.period_days;
    const frequencyScore = Math.min(40, gmsPerDay * 30);
    score += frequencyScore;
    
    // 2. Engagement Score (0-35 points)
    // High engagement rate = more points
    const engagementScore = Math.min(35, gmStats.gm_engagement_rate * 2);
    score += engagementScore;
    
    // 3. Consistency Score (0-25 points)
    // Consecutive days with GMs
    const consistencyPercentage = (gmStats.gm_consistency_days / gmStats.period_days) * 100;
    const consistencyScore = (consistencyPercentage / 100) * 25;
    score += consistencyScore;
    
    return Math.round(score);
}

/**
 * Get complete Farcaster profile with scores
 */
export async function getCompleteProfile(walletAddress: string) {
    try {
        // Get basic profile
        const user = await getUserByWallet(walletAddress);
        
        if (!user) {
            return {
                found: false,
                farcaster_score: 0,
                gm_score: 0
            };
        }
        
        // Calculate Farcaster score
        const farcasterScore = calculateFarcasterScore(user);
        
        // Get GM stats and score
        const gmStats = await getGMCasts(user.fid, 30);
        const gmScore = calculateGMScore(gmStats);
        
        return {
            found: true,
            farcaster_fid: user.fid,
            farcaster_username: user.username,
            farcaster_display_name: user.display_name,
            farcaster_bio: user.profile?.bio?.text || '',
            farcaster_followers: user.follower_count || 0,
            farcaster_following: user.following_count || 0,
            farcaster_casts: user.cast_count || 0,
            farcaster_verified: ((user.verified_addresses?.eth_addresses?.length ?? 0) > 0 || 
                                (user.verified_addresses?.sol_addresses?.length ?? 0) > 0),
            farcaster_power_badge: user.power_badge || false,
            farcaster_active_badge: user.active_status === 'active',
            farcaster_score: farcasterScore,
            ...gmStats,
            gm_score: gmScore
        };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error getting complete Farcaster profile:', errorMessage);
        return {
            found: false,
            farcaster_score: 0,
            gm_score: 0
        };
    }
}

/**
 * Calculate Trust Score (0-100)
 * Formula: 40% inverse risk + 30% Farcaster + 20% GM + 10% GXQ age bonus
 */
export function calculateTrustScore(
    riskScore: number, 
    farcasterScore: number, 
    gmScore: number, 
    walletAgeDays: number
): TrustScoreResult {
    // 1. Inverse Risk (40% weight)
    const inverseRisk = (100 - riskScore) * 0.40;
    
    // 2. Farcaster Score (30% weight)
    const farcasterComponent = farcasterScore * 0.30;
    
    // 3. GM Score (20% weight)
    const gmComponent = gmScore * 0.20;
    
    // 4. Age Bonus (10% weight)
    // Logarithmic scale: 30 days = 3pts, 90 days = 6pts, 365 days = 10pts
    const ageDays = walletAgeDays || 0;
    const ageBonus = ageDays > 0 
        ? Math.min(10, Math.log10(ageDays + 1) * 4)
        : 0;
    
    // Calculate total trust score
    const trustScore = Math.round(inverseRisk + farcasterComponent + gmComponent + ageBonus);
    
    // Social verification bonus
    const socialBonus = farcasterScore > 50 ? 15 : 0;
    
    return {
        trust_score: Math.min(100, trustScore),
        trust_breakdown: {
            inverse_risk: parseFloat(inverseRisk.toFixed(2)),
            farcaster: parseFloat(farcasterComponent.toFixed(2)),
            gm: parseFloat(gmComponent.toFixed(2)),
            age_bonus: parseFloat(ageBonus.toFixed(2))
        },
        social_verification_bonus: socialBonus
    };
}
