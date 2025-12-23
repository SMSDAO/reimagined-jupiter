import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gxq_studio',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Wait 5 seconds before timing out
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handling
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Pool connection event
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

/**
 * Execute a SQL query with parameters
 */
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('✅ Database pool closed');
}

// Database helper functions

/**
 * Insert or update wallet analysis
 */
export async function upsertWalletAnalysis(data: {
  walletAddress: string;
  totalScore: number;
  tier: string;
  balanceScore: number;
  transactionScore: number;
  nftScore: number;
  defiScore: number;
  ageScore: number;
  diversificationScore: number;
  farcasterScore?: number;
  gmScore?: number;
  trustScore?: number;
  riskAdjustment?: number;
  airdropPriority: number;
  estimatedValue: number;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO wallet_analysis (
      wallet_address, total_score, tier,
      balance_score, transaction_score, nft_score,
      defi_score, age_score, diversification_score,
      farcaster_score, gm_score, trust_score, risk_adjustment,
      airdrop_priority, estimated_value
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (wallet_address)
    DO UPDATE SET
      total_score = EXCLUDED.total_score,
      tier = EXCLUDED.tier,
      balance_score = EXCLUDED.balance_score,
      transaction_score = EXCLUDED.transaction_score,
      nft_score = EXCLUDED.nft_score,
      defi_score = EXCLUDED.defi_score,
      age_score = EXCLUDED.age_score,
      diversification_score = EXCLUDED.diversification_score,
      farcaster_score = EXCLUDED.farcaster_score,
      gm_score = EXCLUDED.gm_score,
      trust_score = EXCLUDED.trust_score,
      risk_adjustment = EXCLUDED.risk_adjustment,
      airdrop_priority = EXCLUDED.airdrop_priority,
      estimated_value = EXCLUDED.estimated_value,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  return query(sql, [
    data.walletAddress,
    data.totalScore,
    data.tier,
    data.balanceScore,
    data.transactionScore,
    data.nftScore,
    data.defiScore,
    data.ageScore,
    data.diversificationScore,
    data.farcasterScore || null,
    data.gmScore || null,
    data.trustScore || null,
    data.riskAdjustment || 0,
    data.airdropPriority,
    data.estimatedValue,
  ]);
}

/**
 * Insert or update Farcaster profile
 */
export async function upsertFarcasterProfile(data: {
  walletAddress: string;
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  castCount?: number;
  powerBadge: boolean;
  verifiedEthCount: number;
  verifiedSolCount: number;
  activeOnFarcaster: boolean;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO farcaster_profiles (
      wallet_address, fid, username, display_name, pfp_url, bio,
      follower_count, following_count, cast_count,
      power_badge, verified_eth_count, verified_sol_count, active_on_farcaster
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (fid)
    DO UPDATE SET
      wallet_address = EXCLUDED.wallet_address,
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      pfp_url = EXCLUDED.pfp_url,
      bio = EXCLUDED.bio,
      follower_count = EXCLUDED.follower_count,
      following_count = EXCLUDED.following_count,
      cast_count = EXCLUDED.cast_count,
      power_badge = EXCLUDED.power_badge,
      verified_eth_count = EXCLUDED.verified_eth_count,
      verified_sol_count = EXCLUDED.verified_sol_count,
      active_on_farcaster = EXCLUDED.active_on_farcaster,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  return query(sql, [
    data.walletAddress,
    data.fid,
    data.username,
    data.displayName,
    data.pfpUrl || null,
    data.bio || null,
    data.followerCount,
    data.followingCount,
    data.castCount || 0,
    data.powerBadge,
    data.verifiedEthCount,
    data.verifiedSolCount,
    data.activeOnFarcaster,
  ]);
}

/**
 * Insert GM cast
 */
export async function insertGMCast(data: {
  walletAddress: string;
  castHash: string;
  castText: string;
  likes: number;
  recasts: number;
  replies: number;
  castDate: Date;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO gm_casts (
      wallet_address, cast_hash, cast_text,
      likes, recasts, replies, cast_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (cast_hash) DO NOTHING
    RETURNING *;
  `;

  return query(sql, [
    data.walletAddress,
    data.castHash,
    data.castText,
    data.likes,
    data.recasts,
    data.replies,
    data.castDate,
  ]);
}

/**
 * Insert trust score history
 */
export async function insertTrustScoreHistory(data: {
  walletAddress: string;
  trustScore: number;
  inverseRisk: number;
  farcasterContribution: number;
  gmContribution: number;
  ageBonus: number;
  baseRisk?: number;
  adjustedRisk?: number;
  socialVerificationBonus?: number;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO trust_scores_history (
      wallet_address, trust_score,
      inverse_risk, farcaster_contribution, gm_contribution, age_bonus,
      base_risk, adjusted_risk, social_verification_bonus
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  return query(sql, [
    data.walletAddress,
    data.trustScore,
    data.inverseRisk,
    data.farcasterContribution,
    data.gmContribution,
    data.ageBonus,
    data.baseRisk || null,
    data.adjustedRisk || null,
    data.socialVerificationBonus || 0,
  ]);
}

/**
 * Get wallet analysis by address
 */
export async function getWalletAnalysis(walletAddress: string): Promise<any> {
  const sql = `
    SELECT * FROM wallet_analysis
    WHERE wallet_address = $1;
  `;

  const result = await query(sql, [walletAddress]);
  return result.rows[0] || null;
}

/**
 * Get Farcaster profile by wallet address
 */
export async function getFarcasterProfile(walletAddress: string): Promise<any> {
  const sql = `
    SELECT * FROM farcaster_profiles
    WHERE wallet_address = $1;
  `;

  const result = await query(sql, [walletAddress]);
  return result.rows[0] || null;
}

/**
 * Get GM casts for wallet in date range
 */
export async function getGMCasts(
  walletAddress: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  let sql = `
    SELECT * FROM gm_casts
    WHERE wallet_address = $1
  `;
  const params: any[] = [walletAddress];

  if (startDate) {
    sql += ` AND cast_date >= $2`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND cast_date <= $${params.length + 1}`;
    params.push(endDate);
  }

  sql += ` ORDER BY cast_date DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get trust score history for wallet
 */
export async function getTrustScoreHistory(
  walletAddress: string,
  limit: number = 10
): Promise<any[]> {
  const sql = `
    SELECT * FROM trust_scores_history
    WHERE wallet_address = $1
    ORDER BY calculated_at DESC
    LIMIT $2;
  `;

  const result = await query(sql, [walletAddress, limit]);
  return result.rows;
}

/**
 * Get high-value wallets
 */
export async function getHighValueWallets(limit: number = 50): Promise<any[]> {
  const sql = `
    SELECT * FROM high_value_wallets
    LIMIT $1;
  `;

  const result = await query(sql, [limit]);
  return result.rows;
}

/**
 * Get airdrop priority wallets
 */
export async function getAirdropPriorityWallets(
  minPriority: number = 4,
  limit: number = 100
): Promise<any[]> {
  const sql = `
    SELECT * FROM airdrop_priority_wallets
    WHERE airdrop_priority >= $1
    LIMIT $2;
  `;

  const result = await query(sql, [minPriority, limit]);
  return result.rows;
}

/**
 * Insert wallet audit log entry
 */
export async function insertWalletAuditLog(data: {
  walletId: string;
  userId: string;
  operation: string;
  operationData?: Record<string, any>;
  ipAddressHash?: string;
  fingerprintHash?: string;
  transactionSignature?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO wallet_audit_log (
      wallet_id, user_id, operation, operation_data,
      ip_address_hash, fingerprint_hash, transaction_signature,
      success, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  return query(sql, [
    data.walletId,
    data.userId,
    data.operation,
    data.operationData ? JSON.stringify(data.operationData) : null,
    data.ipAddressHash || null,
    data.fingerprintHash || null,
    data.transactionSignature || null,
    data.success ?? true,
    data.errorMessage || null,
  ]);
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<any> {
  const sql = `
    SELECT * FROM users
    WHERE username = $1;
  `;

  const result = await query(sql, [username]);
  return result.rows[0] || null;
}

/**
 * Get user wallets by user ID
 */
export async function getUserWallets(userId: string): Promise<any[]> {
  const sql = `
    SELECT * FROM user_wallets
    WHERE user_id = $1 AND is_active = true
    ORDER BY is_primary DESC, created_at ASC;
  `;

  const result = await query(sql, [userId]);
  return result.rows;
}

/**
 * Count user wallets
 */
export async function countUserWallets(userId: string): Promise<number> {
  const sql = `
    SELECT COUNT(*) as count FROM user_wallets
    WHERE user_id = $1 AND is_active = true;
  `;

  const result = await query(sql, [userId]);
  return parseInt(result.rows[0]?.count || '0');
}

/**
 * Insert user wallet
 */
export async function insertUserWallet(data: {
  userId: string;
  walletAddress: string;
  walletLabel?: string;
  isPrimary?: boolean;
  encryptedPrivateKey: string;
  encryptionIv: string;
  encryptionSalt: string;
  encryptionTag: string;
  keyDerivationIterations: number;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO user_wallets (
      user_id, wallet_address, wallet_label, is_primary,
      encrypted_private_key, encryption_iv, encryption_salt,
      encryption_tag, key_derivation_iterations
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  return query(sql, [
    data.userId,
    data.walletAddress,
    data.walletLabel || null,
    data.isPrimary || false,
    data.encryptedPrivateKey,
    data.encryptionIv,
    data.encryptionSalt,
    data.encryptionTag,
    data.keyDerivationIterations,
  ]);
}

/**
 * Get user wallet by address
 */
export async function getUserWalletByAddress(
  userId: string,
  walletAddress: string
): Promise<any> {
  const sql = `
    SELECT * FROM user_wallets
    WHERE user_id = $1 AND wallet_address = $2 AND is_active = true;
  `;

  const result = await query(sql, [userId, walletAddress]);
  return result.rows[0] || null;
}

export default {
  query,
  getClient,
  testConnection,
  closePool,
  upsertWalletAnalysis,
  upsertFarcasterProfile,
  insertGMCast,
  insertTrustScoreHistory,
  getWalletAnalysis,
  getFarcasterProfile,
  getGMCasts,
  getTrustScoreHistory,
  getHighValueWallets,
  getAirdropPriorityWallets,
  insertWalletAuditLog,
  getUserByUsername,
  getUserWallets,
  countUserWallets,
  insertUserWallet,
  getUserWalletByAddress,
};
