/**
 * Database Connection Manager
 * PostgreSQL connection pooling with pg library
 * GXQ Studio - Advanced Solana DeFi Platform
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gxq_wallet_analysis',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool size
    min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    
    // SSL configuration (for production)
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handler
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Pool connection handler
pool.on('connect', (client) => {
    console.log('New database connection established');
});

// Pool removal handler
pool.on('remove', (client) => {
    console.log('Database connection removed from pool');
});

/**
 * Initialize database schema
 */
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        console.log('Initializing database schema...');
        
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema
        await client.query(schema);
        
        console.log('Database schema initialized successfully');
        return { success: true };
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Test database connection
 */
async function testConnection() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
        console.log('Database connection test successful');
        console.log('Server time:', result.rows[0].current_time);
        console.log('PostgreSQL version:', result.rows[0].postgres_version);
        return { success: true, data: result.rows[0] };
    } catch (error) {
        console.error('Database connection test failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}

/**
 * Get a client from the pool for transaction
 */
async function getClient() {
    return await pool.connect();
}

/**
 * Wallet Analysis Operations
 */
const walletAnalysisOps = {
    /**
     * Upsert wallet analysis data
     */
    async upsert(walletData) {
        const {
            wallet_address,
            age_days,
            first_transaction_date,
            total_sol_transacted,
            total_transactions,
            protocol_diversity,
            token_count,
            portfolio_value_usd,
            current_balance_sol,
            swap_count,
            lp_stake_count,
            airdrop_count,
            nft_mint_count,
            nft_sale_count,
            risk_score,
            risk_level,
            wallet_type,
            is_honeypot,
            is_bot,
            is_scam,
            farcaster_fid,
            farcaster_username,
            farcaster_display_name,
            farcaster_bio,
            farcaster_followers,
            farcaster_following,
            farcaster_casts,
            farcaster_verified,
            farcaster_power_badge,
            farcaster_active_badge,
            farcaster_score,
            gm_casts_count,
            gm_total_likes,
            gm_total_recasts,
            gm_engagement_rate,
            gm_consistency_days,
            gm_score,
            trust_score,
            trust_breakdown,
            social_verification_bonus
        } = walletData;

        const queryText = `
            INSERT INTO wallet_analysis (
                wallet_address, age_days, first_transaction_date, total_sol_transacted,
                total_transactions, protocol_diversity, token_count, portfolio_value_usd,
                current_balance_sol, swap_count, lp_stake_count, airdrop_count,
                nft_mint_count, nft_sale_count, risk_score, risk_level, wallet_type,
                is_honeypot, is_bot, is_scam, farcaster_fid, farcaster_username,
                farcaster_display_name, farcaster_bio, farcaster_followers,
                farcaster_following, farcaster_casts, farcaster_verified,
                farcaster_power_badge, farcaster_active_badge, farcaster_score,
                gm_casts_count, gm_total_likes, gm_total_recasts, gm_engagement_rate,
                gm_consistency_days, gm_score, trust_score, trust_breakdown,
                social_verification_bonus, last_updated
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, CURRENT_TIMESTAMP
            )
            ON CONFLICT (wallet_address) DO UPDATE SET
                age_days = EXCLUDED.age_days,
                first_transaction_date = EXCLUDED.first_transaction_date,
                total_sol_transacted = EXCLUDED.total_sol_transacted,
                total_transactions = EXCLUDED.total_transactions,
                protocol_diversity = EXCLUDED.protocol_diversity,
                token_count = EXCLUDED.token_count,
                portfolio_value_usd = EXCLUDED.portfolio_value_usd,
                current_balance_sol = EXCLUDED.current_balance_sol,
                swap_count = EXCLUDED.swap_count,
                lp_stake_count = EXCLUDED.lp_stake_count,
                airdrop_count = EXCLUDED.airdrop_count,
                nft_mint_count = EXCLUDED.nft_mint_count,
                nft_sale_count = EXCLUDED.nft_sale_count,
                risk_score = EXCLUDED.risk_score,
                risk_level = EXCLUDED.risk_level,
                wallet_type = EXCLUDED.wallet_type,
                is_honeypot = EXCLUDED.is_honeypot,
                is_bot = EXCLUDED.is_bot,
                is_scam = EXCLUDED.is_scam,
                farcaster_fid = EXCLUDED.farcaster_fid,
                farcaster_username = EXCLUDED.farcaster_username,
                farcaster_display_name = EXCLUDED.farcaster_display_name,
                farcaster_bio = EXCLUDED.farcaster_bio,
                farcaster_followers = EXCLUDED.farcaster_followers,
                farcaster_following = EXCLUDED.farcaster_following,
                farcaster_casts = EXCLUDED.farcaster_casts,
                farcaster_verified = EXCLUDED.farcaster_verified,
                farcaster_power_badge = EXCLUDED.farcaster_power_badge,
                farcaster_active_badge = EXCLUDED.farcaster_active_badge,
                farcaster_score = EXCLUDED.farcaster_score,
                gm_casts_count = EXCLUDED.gm_casts_count,
                gm_total_likes = EXCLUDED.gm_total_likes,
                gm_total_recasts = EXCLUDED.gm_total_recasts,
                gm_engagement_rate = EXCLUDED.gm_engagement_rate,
                gm_consistency_days = EXCLUDED.gm_consistency_days,
                gm_score = EXCLUDED.gm_score,
                trust_score = EXCLUDED.trust_score,
                trust_breakdown = EXCLUDED.trust_breakdown,
                social_verification_bonus = EXCLUDED.social_verification_bonus,
                last_updated = CURRENT_TIMESTAMP
            RETURNING *;
        `;

        const params = [
            wallet_address, age_days, first_transaction_date, total_sol_transacted,
            total_transactions, protocol_diversity, token_count, portfolio_value_usd,
            current_balance_sol, swap_count || 0, lp_stake_count || 0, airdrop_count || 0,
            nft_mint_count || 0, nft_sale_count || 0, risk_score, risk_level, wallet_type,
            is_honeypot || false, is_bot || false, is_scam || false, farcaster_fid,
            farcaster_username, farcaster_display_name, farcaster_bio,
            farcaster_followers || 0, farcaster_following || 0, farcaster_casts || 0,
            farcaster_verified || false, farcaster_power_badge || false,
            farcaster_active_badge || false, farcaster_score || 0, gm_casts_count || 0,
            gm_total_likes || 0, gm_total_recasts || 0, gm_engagement_rate || 0,
            gm_consistency_days || 0, gm_score || 0, trust_score,
            trust_breakdown ? JSON.stringify(trust_breakdown) : null,
            social_verification_bonus || 0
        ];

        const result = await query(queryText, params);
        return result.rows[0];
    },

    /**
     * Get wallet analysis by address
     */
    async getByAddress(walletAddress) {
        const result = await query(
            'SELECT * FROM wallet_analysis WHERE wallet_address = $1',
            [walletAddress]
        );
        return result.rows[0] || null;
    },

    /**
     * Get top trusted wallets
     */
    async getTopTrusted(limit = 100) {
        const result = await query(
            'SELECT * FROM top_trusted_wallets LIMIT $1',
            [limit]
        );
        return result.rows;
    },

    /**
     * Get high-risk wallets
     */
    async getHighRisk(limit = 100) {
        const result = await query(
            'SELECT * FROM high_risk_wallets LIMIT $1',
            [limit]
        );
        return result.rows;
    },

    /**
     * Get active social wallets
     */
    async getActiveSocial(limit = 100) {
        const result = await query(
            'SELECT * FROM active_social_wallets LIMIT $1',
            [limit]
        );
        return result.rows;
    }
};

/**
 * Transaction Operations
 */
const transactionOps = {
    /**
     * Insert transaction record
     */
    async insert(txData) {
        const {
            wallet_address,
            signature,
            block_time,
            slot,
            fee,
            success,
            tx_type,
            programs,
            token_transfers,
            sol_change,
            raw_data
        } = txData;

        const queryText = `
            INSERT INTO transactions (
                wallet_address, signature, block_time, slot, fee, success,
                tx_type, programs, token_transfers, sol_change, raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (signature) DO NOTHING
            RETURNING *;
        `;

        const params = [
            wallet_address, signature, block_time, slot, fee, success,
            tx_type, programs, JSON.stringify(token_transfers),
            sol_change, JSON.stringify(raw_data)
        ];

        const result = await query(queryText, params);
        return result.rows[0];
    },

    /**
     * Get transactions for wallet
     */
    async getByWallet(walletAddress, limit = 50) {
        const result = await query(
            'SELECT * FROM transactions WHERE wallet_address = $1 ORDER BY block_time DESC LIMIT $2',
            [walletAddress, limit]
        );
        return result.rows;
    }
};

/**
 * Risk Assessment Operations
 */
const riskAssessmentOps = {
    /**
     * Insert risk assessment
     */
    async insert(assessmentData) {
        const {
            wallet_address,
            risk_score,
            risk_level,
            age_risk,
            balance_risk,
            activity_risk,
            diversity_risk,
            pattern_risk,
            honeypot_indicators,
            bot_indicators,
            scam_indicators,
            social_verification_bonus,
            farcaster_score_at_time,
            assessment_reason
        } = assessmentData;

        const queryText = `
            INSERT INTO risk_assessments (
                wallet_address, risk_score, risk_level, age_risk, balance_risk,
                activity_risk, diversity_risk, pattern_risk, honeypot_indicators,
                bot_indicators, scam_indicators, social_verification_bonus,
                farcaster_score_at_time, assessment_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *;
        `;

        const params = [
            wallet_address, risk_score, risk_level, age_risk, balance_risk,
            activity_risk, diversity_risk, pattern_risk,
            JSON.stringify(honeypot_indicators), JSON.stringify(bot_indicators),
            JSON.stringify(scam_indicators), social_verification_bonus,
            farcaster_score_at_time, assessment_reason
        ];

        const result = await query(queryText, params);
        return result.rows[0];
    },

    /**
     * Get risk assessment history
     */
    async getHistory(walletAddress, limit = 10) {
        const result = await query(
            'SELECT * FROM risk_assessments WHERE wallet_address = $1 ORDER BY assessed_at DESC LIMIT $2',
            [walletAddress, limit]
        );
        return result.rows;
    }
};

/**
 * Close pool connection
 */
async function closePool() {
    await pool.end();
    console.log('Database connection pool closed');
}

// Export pool and operations
module.exports = {
    pool,
    query,
    getClient,
    initializeDatabase,
    testConnection,
    closePool,
    
    // Operations
    walletAnalysis: walletAnalysisOps,
    transaction: transactionOps,
    riskAssessment: riskAssessmentOps
};
