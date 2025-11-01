/**
 * Neynar Farcaster API Integration
 * Profile lookup by wallet address with scoring algorithm
 * GXQ Studio - Advanced Solana DeFi Platform
 */

const axios = require('axios');

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

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
 * @param {string} walletAddress - Solana or Ethereum wallet address
 * @returns {Promise<Object|null>} Farcaster user data or null
 */
async function getUserByWallet(walletAddress) {
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
        if (error.response?.status === 404) {
            console.log('ℹ️ Wallet not connected to Farcaster');
            return null;
        }
        console.error('Error fetching Farcaster profile:', error.message);
        return null;
    }
}

/**
 * Get Farcaster user by FID
 * @param {number} fid - Farcaster ID
 * @returns {Promise<Object|null>} Farcaster user data or null
 */
async function getUserByFID(fid) {
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
        console.error('Error fetching Farcaster profile by FID:', error.message);
        return null;
    }
}

/**
 * Get user's casts
 * @param {number} fid - Farcaster ID
 * @param {number} limit - Number of casts to fetch (default: 25, max: 100)
 * @returns {Promise<Array>} Array of casts
 */
async function getUserCasts(fid, limit = 25) {
    try {
        const response = await neynarClient.get('/farcaster/casts', {
            params: {
                fid: fid,
                limit: Math.min(limit, 100)
            }
        });
        
        return response.data?.casts || [];
        
    } catch (error) {
        console.error('Error fetching user casts:', error.message);
        return [];
    }
}

/**
 * Calculate Farcaster Score (0-100)
 * Algorithm: Followers(30pts) + Casts(20pts) + Power Badge(25pts) + Verified(15pts) + Influencer(10pts)
 * 
 * @param {Object} user - Farcaster user object
 * @returns {number} Score from 0-100
 */
function calculateFarcasterScore(user) {
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
    const hasVerifiedAddresses = user.verified_addresses?.eth_addresses?.length > 0 || 
                                 user.verified_addresses?.sol_addresses?.length > 0;
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
 * @param {number} fid - Farcaster ID
 * @param {number} daysBack - Days to look back (default: 30)
 * @returns {Promise<Object>} GM cast statistics
 */
async function getGMCasts(fid, daysBack = 30) {
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
            gm_engagement_rate: parseFloat(engagementRate),
            gm_consistency_days: uniqueDays,
            period_days: daysBack
        };
        
    } catch (error) {
        console.error('Error fetching GM casts:', error.message);
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
 * 
 * @param {Object} gmStats - GM cast statistics
 * @returns {number} Score from 0-100
 */
function calculateGMScore(gmStats) {
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
 * @param {string} walletAddress - Wallet address to lookup
 * @returns {Promise<Object>} Complete profile data with scores
 */
async function getCompleteProfile(walletAddress) {
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
            farcaster_verified: (user.verified_addresses?.eth_addresses?.length > 0 || 
                                user.verified_addresses?.sol_addresses?.length > 0),
            farcaster_power_badge: user.power_badge || false,
            farcaster_active_badge: user.active_status === 'active',
            farcaster_score: farcasterScore,
            ...gmStats,
            gm_score: gmScore
        };
        
    } catch (error) {
        console.error('Error getting complete Farcaster profile:', error.message);
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
 * 
 * @param {number} riskScore - Risk score (0-100, higher = more risky)
 * @param {number} farcasterScore - Farcaster score (0-100)
 * @param {number} gmScore - GM score (0-100)
 * @param {number} walletAgeDays - Age of wallet in days
 * @returns {Object} Trust score and breakdown
 */
function calculateTrustScore(riskScore, farcasterScore, gmScore, walletAgeDays) {
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

module.exports = {
    getUserByWallet,
    getUserByFID,
    getUserCasts,
    getGMCasts,
    calculateFarcasterScore,
    calculateGMScore,
    calculateTrustScore,
    getCompleteProfile
};
