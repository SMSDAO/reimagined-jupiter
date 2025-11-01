-- PostgreSQL Schema for Wallet Analysis V2
-- GXQ Studio - Advanced Solana DeFi Platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: wallet_analysis
-- Stores comprehensive wallet analysis data including social scores
CREATE TABLE IF NOT EXISTS wallet_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) NOT NULL UNIQUE,
    
    -- Basic Wallet Metrics
    age_days INTEGER,
    first_transaction_date TIMESTAMP,
    total_sol_transacted DECIMAL(20, 9),
    total_transactions INTEGER,
    protocol_diversity INTEGER,
    token_count INTEGER,
    portfolio_value_usd DECIMAL(20, 2),
    current_balance_sol DECIMAL(20, 9),
    
    -- Activity Breakdown
    swap_count INTEGER DEFAULT 0,
    lp_stake_count INTEGER DEFAULT 0,
    airdrop_count INTEGER DEFAULT 0,
    nft_mint_count INTEGER DEFAULT 0,
    nft_sale_count INTEGER DEFAULT 0,
    
    -- Risk Assessment (0-100)
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    
    -- Wallet Type Detection
    wallet_type VARCHAR(50), -- 'NORMAL', 'BOT', 'HONEYPOT', 'SCAM', 'FOUNDER_VC', 'AIRDROP_FARMER'
    is_honeypot BOOLEAN DEFAULT FALSE,
    is_bot BOOLEAN DEFAULT FALSE,
    is_scam BOOLEAN DEFAULT FALSE,
    
    -- Social Intelligence (Farcaster)
    farcaster_fid INTEGER,
    farcaster_username VARCHAR(255),
    farcaster_display_name VARCHAR(255),
    farcaster_bio TEXT,
    farcaster_followers INTEGER DEFAULT 0,
    farcaster_following INTEGER DEFAULT 0,
    farcaster_casts INTEGER DEFAULT 0,
    farcaster_verified BOOLEAN DEFAULT FALSE,
    farcaster_power_badge BOOLEAN DEFAULT FALSE,
    farcaster_active_badge BOOLEAN DEFAULT FALSE,
    farcaster_score INTEGER CHECK (farcaster_score >= 0 AND farcaster_score <= 100),
    
    -- GM Score System
    gm_casts_count INTEGER DEFAULT 0,
    gm_total_likes INTEGER DEFAULT 0,
    gm_total_recasts INTEGER DEFAULT 0,
    gm_engagement_rate DECIMAL(5, 2), -- percentage
    gm_consistency_days INTEGER DEFAULT 0, -- consecutive days with GM casts
    gm_score INTEGER CHECK (gm_score >= 0 AND gm_score <= 100),
    
    -- Trust Score Composite
    trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
    trust_breakdown JSONB, -- Detailed breakdown: {risk: 40, farcaster: 30, gm: 20, age: 10}
    
    -- Social Verification Bonus
    social_verification_bonus INTEGER DEFAULT 0,
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(10) DEFAULT 'V2.0',
    
    -- Indexes
    CONSTRAINT wallet_address_valid CHECK (length(wallet_address) = 44 OR length(wallet_address) = 43)
);

-- Table 2: transactions
-- Stores individual transaction records for detailed analysis
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) NOT NULL,
    signature VARCHAR(88) NOT NULL UNIQUE,
    
    -- Transaction Details
    block_time TIMESTAMP NOT NULL,
    slot BIGINT,
    fee DECIMAL(20, 9),
    success BOOLEAN,
    
    -- Transaction Type
    tx_type VARCHAR(50), -- 'SWAP', 'TRANSFER', 'LP_STAKE', 'AIRDROP', 'NFT_MINT', 'NFT_SALE', etc.
    
    -- Program Interactions
    programs TEXT[], -- Array of program IDs interacted with
    
    -- Token Movements
    token_transfers JSONB, -- {from, to, mint, amount}[]
    sol_change DECIMAL(20, 9), -- Net SOL change (positive/negative)
    
    -- Metadata
    raw_data JSONB, -- Full transaction data for reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- Table 3: arbitrage_opportunities
-- Tracks detected and executed arbitrage opportunities
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Opportunity Details
    opportunity_type VARCHAR(50), -- 'FLASH_LOAN', 'TRIANGULAR', 'HYBRID'
    token_path TEXT[], -- ['SOL', 'USDC', 'RAY', 'SOL']
    dex_path TEXT[], -- ['Raydium', 'Orca', 'Jupiter']
    
    -- Profitability
    expected_profit_sol DECIMAL(20, 9),
    expected_profit_usd DECIMAL(20, 2),
    profit_percentage DECIMAL(5, 2),
    
    -- Execution
    status VARCHAR(20), -- 'DETECTED', 'EXECUTING', 'COMPLETED', 'FAILED', 'EXPIRED'
    execution_signature VARCHAR(88),
    executed_by_wallet VARCHAR(44),
    actual_profit_sol DECIMAL(20, 9),
    actual_profit_usd DECIMAL(20, 2),
    
    -- Flash Loan Details (if applicable)
    flash_loan_provider VARCHAR(50),
    flash_loan_amount DECIMAL(20, 9),
    flash_loan_fee DECIMAL(20, 9),
    
    -- Risk Assessment
    confidence_score DECIMAL(5, 2), -- 0-100
    slippage_tolerance DECIMAL(5, 2),
    
    -- Timing
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    gas_fees DECIMAL(20, 9),
    market_conditions JSONB,
    
    FOREIGN KEY (executed_by_wallet) REFERENCES wallet_analysis(wallet_address)
);

-- Table 4: risk_assessments
-- Historical risk assessment data for tracking changes over time
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) NOT NULL,
    
    -- Risk Score Components
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20),
    
    -- Risk Factors (0-100 each, higher = more risky)
    age_risk INTEGER,
    balance_risk INTEGER,
    activity_risk INTEGER,
    diversity_risk INTEGER,
    pattern_risk INTEGER,
    
    -- Detection Flags
    honeypot_indicators JSONB,
    bot_indicators JSONB,
    scam_indicators JSONB,
    
    -- Social Verification Impact
    social_verification_bonus INTEGER,
    farcaster_score_at_time INTEGER,
    
    -- Metadata
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessment_reason VARCHAR(100), -- 'SCHEDULED', 'TRANSACTION', 'USER_REQUEST', 'ALERT'
    
    FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- Table 5: trading_history
-- Comprehensive trading activity for performance tracking
CREATE TABLE IF NOT EXISTS trading_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) NOT NULL,
    
    -- Trade Details
    trade_type VARCHAR(50), -- 'SWAP', 'ARBITRAGE', 'FLASH_LOAN', 'LIMIT_ORDER'
    
    -- Token Pair
    token_in_mint VARCHAR(44),
    token_in_symbol VARCHAR(20),
    token_in_amount DECIMAL(30, 9),
    token_out_mint VARCHAR(44),
    token_out_symbol VARCHAR(20),
    token_out_amount DECIMAL(30, 9),
    
    -- Execution Details
    dex VARCHAR(50),
    signature VARCHAR(88) UNIQUE,
    slot BIGINT,
    block_time TIMESTAMP,
    
    -- Performance
    price_in_usd DECIMAL(20, 8),
    price_out_usd DECIMAL(20, 8),
    profit_loss_usd DECIMAL(20, 2),
    slippage DECIMAL(5, 2),
    
    -- Fees
    transaction_fee DECIMAL(20, 9),
    platform_fee DECIMAL(20, 9),
    total_fees_usd DECIMAL(20, 2),
    
    -- Strategy
    strategy_used VARCHAR(100),
    preset_name VARCHAR(100),
    
    -- Result
    success BOOLEAN,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_analysis_address ON wallet_analysis(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_analysis_risk_score ON wallet_analysis(risk_score);
CREATE INDEX IF NOT EXISTS idx_wallet_analysis_trust_score ON wallet_analysis(trust_score);
CREATE INDEX IF NOT EXISTS idx_wallet_analysis_farcaster_score ON wallet_analysis(farcaster_score);
CREATE INDEX IF NOT EXISTS idx_wallet_analysis_wallet_type ON wallet_analysis(wallet_type);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_signature ON transactions(signature);
CREATE INDEX IF NOT EXISTS idx_transactions_block_time ON transactions(block_time);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);

CREATE INDEX IF NOT EXISTS idx_arbitrage_status ON arbitrage_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_detected_at ON arbitrage_opportunities(detected_at);
CREATE INDEX IF NOT EXISTS idx_arbitrage_wallet ON arbitrage_opportunities(executed_by_wallet);
CREATE INDEX IF NOT EXISTS idx_arbitrage_profit ON arbitrage_opportunities(expected_profit_usd);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_wallet ON risk_assessments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_score ON risk_assessments(risk_score);

CREATE INDEX IF NOT EXISTS idx_trading_history_wallet ON trading_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trading_history_block_time ON trading_history(block_time);
CREATE INDEX IF NOT EXISTS idx_trading_history_signature ON trading_history(signature);
CREATE INDEX IF NOT EXISTS idx_trading_history_success ON trading_history(success);

-- Create views for common queries

-- View: High-risk wallets with social verification
CREATE OR REPLACE VIEW high_risk_wallets AS
SELECT 
    wallet_address,
    risk_score,
    risk_level,
    trust_score,
    farcaster_score,
    gm_score,
    wallet_type,
    social_verification_bonus,
    last_updated
FROM wallet_analysis
WHERE risk_score > 60
ORDER BY risk_score DESC, trust_score ASC;

-- View: Top trusted wallets
CREATE OR REPLACE VIEW top_trusted_wallets AS
SELECT 
    wallet_address,
    trust_score,
    farcaster_score,
    gm_score,
    risk_score,
    portfolio_value_usd,
    total_transactions,
    protocol_diversity,
    last_updated
FROM wallet_analysis
WHERE trust_score >= 70
ORDER BY trust_score DESC, portfolio_value_usd DESC;

-- View: Active social wallets
CREATE OR REPLACE VIEW active_social_wallets AS
SELECT 
    wallet_address,
    farcaster_username,
    farcaster_display_name,
    farcaster_followers,
    farcaster_casts,
    farcaster_score,
    gm_score,
    gm_casts_count,
    trust_score,
    last_updated
FROM wallet_analysis
WHERE farcaster_score > 0 OR gm_score > 0
ORDER BY trust_score DESC, farcaster_score DESC;

-- View: Recent profitable trades
CREATE OR REPLACE VIEW recent_profitable_trades AS
SELECT 
    t.wallet_address,
    t.trade_type,
    t.token_in_symbol,
    t.token_out_symbol,
    t.profit_loss_usd,
    t.dex,
    t.block_time,
    w.trust_score,
    w.risk_score
FROM trading_history t
JOIN wallet_analysis w ON t.wallet_address = w.wallet_address
WHERE t.success = TRUE AND t.profit_loss_usd > 0
ORDER BY t.block_time DESC
LIMIT 100;

-- View: Arbitrage opportunity summary
CREATE OR REPLACE VIEW arbitrage_summary AS
SELECT 
    opportunity_type,
    COUNT(*) as total_opportunities,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
    AVG(expected_profit_usd) as avg_expected_profit,
    SUM(CASE WHEN status = 'COMPLETED' THEN actual_profit_usd ELSE 0 END) as total_actual_profit,
    AVG(confidence_score) as avg_confidence
FROM arbitrage_opportunities
GROUP BY opportunity_type;

-- Comments for documentation
COMMENT ON TABLE wallet_analysis IS 'Comprehensive wallet analysis with social intelligence and risk assessment';
COMMENT ON TABLE transactions IS 'Individual transaction records for detailed wallet activity tracking';
COMMENT ON TABLE arbitrage_opportunities IS 'Detected and executed arbitrage opportunities across DEXs';
COMMENT ON TABLE risk_assessments IS 'Historical risk assessment data for tracking changes over time';
COMMENT ON TABLE trading_history IS 'Comprehensive trading activity for performance tracking and analysis';

COMMENT ON COLUMN wallet_analysis.farcaster_score IS 'Followers(30pts) + Casts(20pts) + Power Badge(25pts) + Verified(15pts) + Influencer(10pts)';
COMMENT ON COLUMN wallet_analysis.gm_score IS 'Tracks GM casts, engagement metrics (likes/recasts), community participation';
COMMENT ON COLUMN wallet_analysis.trust_score IS '40% inverse risk + 30% Farcaster + 20% GM + 10% GXQ age bonus';
