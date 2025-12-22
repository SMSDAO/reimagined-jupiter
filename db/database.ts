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
 * Upsert airdrop eligibility
 */
export async function upsertAirdropEligibility(data: {
  walletAddress: string;
  protocol: string;
  isEligible: boolean;
  amount?: number;
  tokenMint?: string;
  claimed?: boolean;
  claimDeadline?: Date;
  claimStartTime?: Date;
  merkleProof?: string;
  merkleRoot?: string;
  claimIndex?: number;
  eligibilityCriteria?: any;
  apiResponse?: any;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO airdrop_eligibility (
      wallet_address, protocol, is_eligible, amount, token_mint,
      claimed, claim_deadline, claim_start_time,
      merkle_proof, merkle_root, claim_index,
      eligibility_criteria, api_response
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (wallet_address, protocol)
    DO UPDATE SET
      is_eligible = EXCLUDED.is_eligible,
      amount = EXCLUDED.amount,
      token_mint = EXCLUDED.token_mint,
      claimed = EXCLUDED.claimed,
      claim_deadline = EXCLUDED.claim_deadline,
      claim_start_time = EXCLUDED.claim_start_time,
      merkle_proof = EXCLUDED.merkle_proof,
      merkle_root = EXCLUDED.merkle_root,
      claim_index = EXCLUDED.claim_index,
      eligibility_criteria = EXCLUDED.eligibility_criteria,
      api_response = EXCLUDED.api_response,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  return query(sql, [
    data.walletAddress,
    data.protocol,
    data.isEligible,
    data.amount || null,
    data.tokenMint || null,
    data.claimed || false,
    data.claimDeadline || null,
    data.claimStartTime || null,
    data.merkleProof || null,
    data.merkleRoot || null,
    data.claimIndex || null,
    data.eligibilityCriteria ? JSON.stringify(data.eligibilityCriteria) : null,
    data.apiResponse ? JSON.stringify(data.apiResponse) : null,
  ]);
}

/**
 * Get airdrop eligibility for wallet
 */
export async function getAirdropEligibility(
  walletAddress: string,
  protocol?: string
): Promise<any[]> {
  let sql = `
    SELECT * FROM airdrop_eligibility
    WHERE wallet_address = $1
  `;
  const params: any[] = [walletAddress];

  if (protocol) {
    sql += ` AND protocol = $2`;
    params.push(protocol);
  }

  sql += ` ORDER BY checked_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Insert airdrop claim attempt
 */
export async function insertAirdropClaim(data: {
  walletAddress: string;
  protocol: string;
  amount: number;
  tokenMint: string;
  transactionSignature?: string;
  status: 'pending' | 'success' | 'failed' | 'simulated';
  errorMessage?: string;
  donationAmount?: number;
  donationSent?: boolean;
  donationSignature?: string;
  devWallet?: string;
  slotNumber?: number;
  blockTime?: Date;
  computeUnitsConsumed?: number;
  priorityFee?: number;
  userIpAddress?: string;
  userAgent?: string;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO airdrop_claims (
      wallet_address, protocol, amount, token_mint,
      transaction_signature, status, error_message,
      donation_amount, donation_sent, donation_signature, dev_wallet,
      slot_number, block_time, compute_units_consumed, priority_fee,
      user_ip_address, user_agent,
      completed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *;
  `;

  return query(sql, [
    data.walletAddress,
    data.protocol,
    data.amount,
    data.tokenMint,
    data.transactionSignature || null,
    data.status,
    data.errorMessage || null,
    data.donationAmount || null,
    data.donationSent || false,
    data.donationSignature || null,
    data.devWallet || null,
    data.slotNumber || null,
    data.blockTime || null,
    data.computeUnitsConsumed || null,
    data.priorityFee || null,
    data.userIpAddress || null,
    data.userAgent || null,
    data.status === 'success' || data.status === 'failed' ? new Date() : null,
  ]);
}

/**
 * Update airdrop claim status
 */
export async function updateAirdropClaimStatus(
  claimId: string,
  data: {
    status: 'pending' | 'success' | 'failed' | 'simulated';
    transactionSignature?: string;
    errorMessage?: string;
    slotNumber?: number;
    blockTime?: Date;
    computeUnitsConsumed?: number;
  }
): Promise<QueryResult> {
  const sql = `
    UPDATE airdrop_claims
    SET 
      status = $2,
      transaction_signature = COALESCE($3, transaction_signature),
      error_message = $4,
      slot_number = COALESCE($5, slot_number),
      block_time = COALESCE($6, block_time),
      compute_units_consumed = COALESCE($7, compute_units_consumed),
      completed_at = CASE WHEN $2 IN ('success', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = $1
    RETURNING *;
  `;

  return query(sql, [
    claimId,
    data.status,
    data.transactionSignature || null,
    data.errorMessage || null,
    data.slotNumber || null,
    data.blockTime || null,
    data.computeUnitsConsumed || null,
  ]);
}

/**
 * Get airdrop claims for wallet
 */
export async function getAirdropClaims(
  walletAddress: string,
  limit: number = 50
): Promise<any[]> {
  const sql = `
    SELECT * FROM airdrop_claims
    WHERE wallet_address = $1
    ORDER BY initiated_at DESC
    LIMIT $2;
  `;

  const result = await query(sql, [walletAddress, limit]);
  return result.rows;
}

/**
 * Get all airdrop claims (admin)
 */
export async function getAllAirdropClaims(
  status?: string,
  limit: number = 100
): Promise<any[]> {
  let sql = `
    SELECT * FROM airdrop_claims
  `;
  const params: any[] = [];

  if (status) {
    sql += ` WHERE status = $1`;
    params.push(status);
  }

  sql += ` ORDER BY initiated_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Upsert airdrop program
 */
export async function upsertAirdropProgram(data: {
  protocol: string;
  programId?: string;
  tokenMint: string;
  distributorAccount?: string;
  claimStartTime?: Date;
  claimEndTime?: Date;
  totalAllocation?: number;
  totalClaimed?: number;
  eligibilityApiUrl?: string;
  claimApiUrl?: string;
  isActive?: boolean;
  requiresMerkleProof?: boolean;
  description?: string;
  websiteUrl?: string;
  documentationUrl?: string;
}): Promise<QueryResult> {
  const sql = `
    INSERT INTO airdrop_programs (
      protocol, program_id, token_mint, distributor_account,
      claim_start_time, claim_end_time, total_allocation, total_claimed,
      eligibility_api_url, claim_api_url,
      is_active, requires_merkle_proof,
      description, website_url, documentation_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (protocol)
    DO UPDATE SET
      program_id = EXCLUDED.program_id,
      token_mint = EXCLUDED.token_mint,
      distributor_account = EXCLUDED.distributor_account,
      claim_start_time = EXCLUDED.claim_start_time,
      claim_end_time = EXCLUDED.claim_end_time,
      total_allocation = EXCLUDED.total_allocation,
      total_claimed = EXCLUDED.total_claimed,
      eligibility_api_url = EXCLUDED.eligibility_api_url,
      claim_api_url = EXCLUDED.claim_api_url,
      is_active = EXCLUDED.is_active,
      requires_merkle_proof = EXCLUDED.requires_merkle_proof,
      description = EXCLUDED.description,
      website_url = EXCLUDED.website_url,
      documentation_url = EXCLUDED.documentation_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  return query(sql, [
    data.protocol,
    data.programId || null,
    data.tokenMint,
    data.distributorAccount || null,
    data.claimStartTime || null,
    data.claimEndTime || null,
    data.totalAllocation || null,
    data.totalClaimed || 0,
    data.eligibilityApiUrl || null,
    data.claimApiUrl || null,
    data.isActive !== undefined ? data.isActive : true,
    data.requiresMerkleProof !== undefined ? data.requiresMerkleProof : true,
    data.description || null,
    data.websiteUrl || null,
    data.documentationUrl || null,
  ]);
}

/**
 * Get active airdrop programs
 */
export async function getActiveAirdropPrograms(): Promise<any[]> {
  const sql = `
    SELECT * FROM airdrop_programs
    WHERE is_active = true
    AND (claim_end_time IS NULL OR claim_end_time > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC;
  `;

  const result = await query(sql);
  return result.rows;
}

/**
 * Get airdrop program by protocol
 */
export async function getAirdropProgram(protocol: string): Promise<any> {
  const sql = `
    SELECT * FROM airdrop_programs
    WHERE protocol = $1;
  `;

  const result = await query(sql, [protocol]);
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
  upsertAirdropEligibility,
  getAirdropEligibility,
  insertAirdropClaim,
  updateAirdropClaimStatus,
  getAirdropClaims,
  getAllAirdropClaims,
  upsertAirdropProgram,
  getActiveAirdropPrograms,
  getAirdropProgram,
};
