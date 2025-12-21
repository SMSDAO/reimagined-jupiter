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
 * =====================================================
 * WALLET GOVERNANCE FUNCTIONS
 * =====================================================
 */

/**
 * Create or update user on login
 */
export async function upsertUser(data: {
  walletPublicKey: string;
  ipHash: string;
  deviceFingerprintHash: string;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO users (
      wallet_public_key, ip_hash, device_fingerprint_hash,
      last_login, login_count
    ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 1)
    ON CONFLICT (wallet_public_key)
    DO UPDATE SET
      ip_hash = EXCLUDED.ip_hash,
      device_fingerprint_hash = EXCLUDED.device_fingerprint_hash,
      last_login = CURRENT_TIMESTAMP,
      login_count = users.login_count + 1,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  return query(sql, [
    data.walletPublicKey,
    data.ipHash,
    data.deviceFingerprintHash,
  ]);
}

/**
 * Get user by wallet public key
 */
export async function getUserByWallet(walletPublicKey: string): Promise<any> {
  const sql = `
    SELECT * FROM users
    WHERE wallet_public_key = $1;
  `;

  const result = await query(sql, [walletPublicKey]);
  return result.rows[0] || null;
}

/**
 * Create sub-wallet
 */
export async function createSubWallet(data: {
  userId: string;
  publicKey: string;
  walletName?: string;
  walletIndex: number;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO sub_wallets (
      user_id, public_key, wallet_name, wallet_index
    ) VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  return query(sql, [
    data.userId,
    data.publicKey,
    data.walletName || `Arbitrage Wallet ${data.walletIndex}`,
    data.walletIndex,
  ]);
}

/**
 * Get sub-wallets for user
 */
export async function getSubWallets(userId: string, activeOnly: boolean = false): Promise<any[]> {
  let sql = `
    SELECT * FROM sub_wallets
    WHERE user_id = $1
  `;
  
  if (activeOnly) {
    sql += ` AND is_active = true`;
  }
  
  sql += ` ORDER BY wallet_index ASC`;

  const result = await query(sql, [userId]);
  return result.rows;
}

/**
 * Get sub-wallet by public key
 */
export async function getSubWalletByPublicKey(publicKey: string): Promise<any> {
  const sql = `
    SELECT * FROM sub_wallets
    WHERE public_key = $1;
  `;

  const result = await query(sql, [publicKey]);
  return result.rows[0] || null;
}

/**
 * Update sub-wallet balance
 */
export async function updateSubWalletBalance(
  subWalletId: string,
  balance: number
): Promise<QueryResult> {
  const sql = `
    UPDATE sub_wallets
    SET last_balance_sol = $1,
        last_balance_check = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;

  return query(sql, [balance, subWalletId]);
}

/**
 * Store encrypted wallet key
 */
export async function storeWalletKey(data: {
  subWalletId: string;
  encryptedPrivateKey: string;
  encryptionIv: string;
  encryptionTag: string;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO wallet_keys (
      sub_wallet_id, encrypted_private_key,
      encryption_iv, encryption_tag
    ) VALUES ($1, $2, $3, $4)
    RETURNING id, sub_wallet_id, key_version, created_at;
  `;

  return query(sql, [
    data.subWalletId,
    data.encryptedPrivateKey,
    data.encryptionIv,
    data.encryptionTag,
  ]);
}

/**
 * Get encrypted wallet key
 */
export async function getWalletKey(subWalletId: string): Promise<any> {
  const sql = `
    SELECT * FROM wallet_keys
    WHERE sub_wallet_id = $1;
  `;

  const result = await query(sql, [subWalletId]);
  return result.rows[0] || null;
}

/**
 * Update wallet key usage
 */
export async function updateWalletKeyUsage(subWalletId: string): Promise<QueryResult> {
  const sql = `
    UPDATE wallet_keys
    SET last_used = CURRENT_TIMESTAMP,
        usage_count = usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE sub_wallet_id = $1
    RETURNING *;
  `;

  return query(sql, [subWalletId]);
}

/**
 * Insert audit log entry
 */
export async function insertAuditLog(data: {
  userId?: string;
  subWalletId?: string;
  walletPublicKey?: string;
  eventType: string;
  eventAction: string;
  eventDescription?: string;
  ipHash?: string;
  deviceFingerprintHash?: string;
  userAgent?: string;
  transactionSignature?: string;
  amountSol?: number;
  profitSol?: number;
  status?: string;
  errorMessage?: string;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO wallet_audit_log (
      user_id, sub_wallet_id, wallet_public_key,
      event_type, event_action, event_description,
      ip_hash, device_fingerprint_hash, user_agent,
      transaction_signature, amount_sol, profit_sol,
      status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  return query(sql, [
    data.userId || null,
    data.subWalletId || null,
    data.walletPublicKey || null,
    data.eventType,
    data.eventAction,
    data.eventDescription || null,
    data.ipHash || null,
    data.deviceFingerprintHash || null,
    data.userAgent || null,
    data.transactionSignature || null,
    data.amountSol || null,
    data.profitSol || null,
    data.status || 'success',
    data.errorMessage || null,
  ]);
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(
  filters?: {
    userId?: string;
    subWalletId?: string;
    eventType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  let sql = `
    SELECT 
      wal.*,
      u.wallet_public_key as user_main_wallet,
      sw.public_key as sub_wallet_public_key
    FROM wallet_audit_log wal
    LEFT JOIN users u ON wal.user_id = u.id
    LEFT JOIN sub_wallets sw ON wal.sub_wallet_id = sw.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.userId) {
    sql += ` AND wal.user_id = $${paramIndex++}`;
    params.push(filters.userId);
  }

  if (filters?.subWalletId) {
    sql += ` AND wal.sub_wallet_id = $${paramIndex++}`;
    params.push(filters.subWalletId);
  }

  if (filters?.eventType) {
    sql += ` AND wal.event_type = $${paramIndex++}`;
    params.push(filters.eventType);
  }

  if (filters?.status) {
    sql += ` AND wal.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.startDate) {
    sql += ` AND wal.created_at >= $${paramIndex++}`;
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    sql += ` AND wal.created_at <= $${paramIndex++}`;
    params.push(filters.endDate);
  }

  sql += ` ORDER BY wal.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get user wallet overview
 */
export async function getUserWalletOverview(userId: string): Promise<any> {
  const sql = `
    SELECT * FROM user_wallet_overview
    WHERE user_id = $1;
  `;

  const result = await query(sql, [userId]);
  return result.rows[0] || null;
}

/**
 * Update sub-wallet trade statistics
 */
export async function updateSubWalletStats(
  subWalletId: string,
  profitSol: number
): Promise<QueryResult> {
  const sql = `
    UPDATE sub_wallets
    SET total_trades = total_trades + 1,
        total_profit_sol = total_profit_sol + $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;

  return query(sql, [profitSol, subWalletId]);
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
  // Wallet Governance
  upsertUser,
  getUserByWallet,
  createSubWallet,
  getSubWallets,
  getSubWalletByPublicKey,
  updateSubWalletBalance,
  storeWalletKey,
  getWalletKey,
  updateWalletKeyUsage,
  insertAuditLog,
  getAuditLogs,
  getUserWalletOverview,
  updateSubWalletStats,
};
