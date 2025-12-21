-- GXQ Studio Wallet Analysis Database Schema
-- PostgreSQL 12+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. WALLET ANALYSIS TABLE
-- =====================================================
CREATE TABLE wallet_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('WHALE', 'DEGEN', 'ACTIVE', 'CASUAL', 'NOVICE')),
  
  -- On-chain factors (0-100 each, summing components)
  balance_score INTEGER CHECK (balance_score >= 0 AND balance_score <= 20),
  transaction_score INTEGER CHECK (transaction_score >= 0 AND transaction_score <= 20),
  nft_score INTEGER CHECK (nft_score >= 0 AND nft_score <= 15),
  defi_score INTEGER CHECK (defi_score >= 0 AND defi_score <= 15),
  age_score INTEGER CHECK (age_score >= 0 AND age_score <= 15),
  diversification_score INTEGER CHECK (diversification_score >= 0 AND diversification_score <= 15),
  
  -- Social intelligence scores
  farcaster_score INTEGER CHECK (farcaster_score >= 0 AND farcaster_score <= 100),
  gm_score INTEGER CHECK (gm_score >= 0 AND gm_score <= 100),
  trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
  risk_adjustment INTEGER DEFAULT 0,
  
  -- Airdrop eligibility
  airdrop_priority INTEGER CHECK (airdrop_priority >= 1 AND airdrop_priority <= 5),
  estimated_value DECIMAL(20, 2),
  
  -- Timestamps
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CONSTRAINT wallet_address_format CHECK (LENGTH(wallet_address) BETWEEN 32 AND 44)
);

-- =====================================================
-- 2. FARCASTER PROFILES TABLE
-- =====================================================
CREATE TABLE farcaster_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  fid INTEGER NOT NULL UNIQUE,
  username VARCHAR(100),
  display_name VARCHAR(200),
  pfp_url TEXT,
  bio TEXT,
  
  -- Metrics
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  cast_count INTEGER DEFAULT 0,
  
  -- Verification
  power_badge BOOLEAN DEFAULT FALSE,
  verified_eth_count INTEGER DEFAULT 0,
  verified_sol_count INTEGER DEFAULT 0,
  active_on_farcaster BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- =====================================================
-- 3. GM CASTS TRACKING TABLE
-- =====================================================
CREATE TABLE gm_casts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  cast_hash VARCHAR(100) NOT NULL UNIQUE,
  cast_text TEXT,
  
  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  recasts INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  
  -- Timestamps
  cast_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- =====================================================
-- 4. TRUST SCORES HISTORY TABLE
-- =====================================================
CREATE TABLE trust_scores_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  trust_score INTEGER NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Trust components (percentages)
  inverse_risk DECIMAL(5, 2),
  farcaster_contribution DECIMAL(5, 2),
  gm_contribution DECIMAL(5, 2),
  age_bonus DECIMAL(5, 2),
  
  -- Risk metrics
  base_risk INTEGER,
  adjusted_risk INTEGER,
  social_verification_bonus INTEGER DEFAULT 0,
  
  -- Timestamp
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- =====================================================
-- 5. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  signature VARCHAR(88) NOT NULL UNIQUE,
  block_time TIMESTAMP,
  
  -- Transaction details
  transaction_type VARCHAR(50),
  amount DECIMAL(20, 9),
  token_mint VARCHAR(44),
  
  -- Program interactions
  program_id VARCHAR(44),
  dex_used VARCHAR(50),
  
  -- Status
  success BOOLEAN DEFAULT TRUE,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- =====================================================
-- 6. RISK ASSESSMENTS TABLE
-- =====================================================
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  
  -- Risk scores (0-100)
  overall_risk INTEGER NOT NULL CHECK (overall_risk >= 0 AND overall_risk <= 100),
  honeypot_risk INTEGER DEFAULT 0,
  scam_risk INTEGER DEFAULT 0,
  bot_risk INTEGER DEFAULT 0,
  
  -- Risk factors
  new_wallet_penalty INTEGER DEFAULT 0,
  low_activity_penalty INTEGER DEFAULT 0,
  suspicious_patterns BOOLEAN DEFAULT FALSE,
  
  -- Social verification
  has_farcaster BOOLEAN DEFAULT FALSE,
  farcaster_verified BOOLEAN DEFAULT FALSE,
  social_risk_reduction INTEGER DEFAULT 0,
  
  -- Timestamp
  assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- =====================================================
-- 7. ARBITRAGE OPPORTUNITIES TABLE
-- =====================================================
CREATE TABLE arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_type VARCHAR(50) NOT NULL,
  
  -- Tokens involved
  token_a VARCHAR(44) NOT NULL,
  token_b VARCHAR(44),
  token_c VARCHAR(44),
  
  -- Profit metrics
  estimated_profit DECIMAL(20, 9),
  profit_percentage DECIMAL(10, 4),
  required_capital DECIMAL(20, 9),
  
  -- DEX/Provider info
  dex_a VARCHAR(50),
  dex_b VARCHAR(50),
  flash_loan_provider VARCHAR(50),
  
  -- Execution details
  confidence DECIMAL(5, 2),
  executed BOOLEAN DEFAULT FALSE,
  execution_signature VARCHAR(88),
  actual_profit DECIMAL(20, 9),
  
  -- Timestamps
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- =====================================================
-- 8. TRADING HISTORY TABLE
-- =====================================================
CREATE TABLE trading_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  
  -- Trade details
  trade_type VARCHAR(50) NOT NULL,
  signature VARCHAR(88) NOT NULL,
  
  -- Tokens
  token_in VARCHAR(44),
  token_out VARCHAR(44),
  amount_in DECIMAL(20, 9),
  amount_out DECIMAL(20, 9),
  
  -- Profit
  profit_sol DECIMAL(20, 9),
  profit_usd DECIMAL(20, 2),
  
  -- Dev fee
  dev_fee_sol DECIMAL(20, 9),
  dev_fee_sent BOOLEAN DEFAULT FALSE,
  
  -- Timestamp
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Wallet Analysis indexes
CREATE INDEX idx_wallet_address ON wallet_analysis(wallet_address);
CREATE INDEX idx_tier ON wallet_analysis(tier);
CREATE INDEX idx_trust_score ON wallet_analysis(trust_score);
CREATE INDEX idx_farcaster_score ON wallet_analysis(farcaster_score);
CREATE INDEX idx_analyzed_at ON wallet_analysis(analyzed_at);
CREATE INDEX idx_airdrop_priority ON wallet_analysis(airdrop_priority);

-- Farcaster Profiles indexes
CREATE INDEX idx_farcaster_wallet ON farcaster_profiles(wallet_address);
CREATE INDEX idx_farcaster_fid ON farcaster_profiles(fid);
CREATE INDEX idx_farcaster_username ON farcaster_profiles(username);
CREATE INDEX idx_power_badge ON farcaster_profiles(power_badge);

-- GM Casts indexes
CREATE INDEX idx_gm_wallet ON gm_casts(wallet_address);
CREATE INDEX idx_gm_cast_date ON gm_casts(cast_date);
CREATE INDEX idx_gm_cast_hash ON gm_casts(cast_hash);

-- Trust Scores History indexes
CREATE INDEX idx_trust_wallet ON trust_scores_history(wallet_address);
CREATE INDEX idx_trust_calculated_at ON trust_scores_history(calculated_at);

-- Transactions indexes
CREATE INDEX idx_tx_wallet ON transactions(wallet_address);
CREATE INDEX idx_tx_signature ON transactions(signature);
CREATE INDEX idx_tx_block_time ON transactions(block_time);
CREATE INDEX idx_tx_program_id ON transactions(program_id);

-- Risk Assessments indexes
CREATE INDEX idx_risk_wallet ON risk_assessments(wallet_address);
CREATE INDEX idx_risk_overall ON risk_assessments(overall_risk);
CREATE INDEX idx_risk_assessed_at ON risk_assessments(assessed_at);

-- Arbitrage Opportunities indexes
CREATE INDEX idx_arb_type ON arbitrage_opportunities(opportunity_type);
CREATE INDEX idx_arb_detected_at ON arbitrage_opportunities(detected_at);
CREATE INDEX idx_arb_executed ON arbitrage_opportunities(executed);

-- Trading History indexes
CREATE INDEX idx_trade_wallet ON trading_history(wallet_address);
CREATE INDEX idx_trade_executed_at ON trading_history(executed_at);
CREATE INDEX idx_trade_type ON trading_history(trade_type);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_wallet_analysis_updated_at BEFORE UPDATE
    ON wallet_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farcaster_profiles_updated_at BEFORE UPDATE
    ON farcaster_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- High-value wallets view
CREATE OR REPLACE VIEW high_value_wallets AS
SELECT 
    wa.*,
    fp.username,
    fp.follower_count,
    fp.power_badge
FROM wallet_analysis wa
LEFT JOIN farcaster_profiles fp ON wa.wallet_address = fp.wallet_address
WHERE wa.trust_score >= 70 OR wa.tier IN ('WHALE', 'DEGEN')
ORDER BY wa.trust_score DESC, wa.total_score DESC;

-- Airdrop priority view
CREATE OR REPLACE VIEW airdrop_priority_wallets AS
SELECT 
    wa.wallet_address,
    wa.tier,
    wa.total_score,
    wa.trust_score,
    wa.farcaster_score,
    wa.gm_score,
    wa.airdrop_priority,
    wa.estimated_value,
    fp.username,
    fp.power_badge
FROM wallet_analysis wa
LEFT JOIN farcaster_profiles fp ON wa.wallet_address = fp.wallet_address
WHERE wa.airdrop_priority >= 4
ORDER BY wa.airdrop_priority DESC, wa.trust_score DESC;

-- Recent GM activity view
CREATE OR REPLACE VIEW recent_gm_activity AS
SELECT 
    gc.wallet_address,
    COUNT(*) as gm_count,
    AVG(gc.likes) as avg_likes,
    AVG(gc.recasts) as avg_recasts,
    MAX(gc.cast_date) as last_gm_date
FROM gm_casts gc
WHERE gc.cast_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY gc.wallet_address
ORDER BY gm_count DESC;

-- =====================================================
-- INITIAL DATA / SEED DATA
-- =====================================================

-- Example: Insert development wallet
-- INSERT INTO wallet_analysis (wallet_address, total_score, tier, balance_score, transaction_score, nft_score, defi_score, age_score, diversification_score, airdrop_priority, estimated_value)
-- VALUES ('DevWalletAddress123...', 85, 'DEGEN', 18, 19, 12, 15, 14, 13, 5, 5000.00);

-- =====================================================
-- 9. USERS TABLE (Wallet Governance)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_public_key VARCHAR(44) UNIQUE NOT NULL,
  
  -- Hashed identifiers (never store raw values)
  ip_hash VARCHAR(64) NOT NULL,
  device_fingerprint_hash VARCHAR(64) NOT NULL,
  
  -- Session tracking
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  login_count INTEGER DEFAULT 1,
  
  -- User status
  is_active BOOLEAN DEFAULT TRUE,
  is_banned BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT wallet_public_key_format CHECK (LENGTH(wallet_public_key) BETWEEN 32 AND 44)
);

-- =====================================================
-- 10. SUB_WALLETS TABLE (Arbitrage Wallets)
-- =====================================================
CREATE TABLE sub_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  -- Wallet identification
  public_key VARCHAR(44) UNIQUE NOT NULL,
  wallet_name VARCHAR(100),
  
  -- GXQ-ending validation (enforced by application)
  -- Public keys must end with 'GXQ'
  
  -- Wallet metadata
  wallet_index INTEGER NOT NULL CHECK (wallet_index >= 1 AND wallet_index <= 3),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Balance tracking
  last_balance_sol DECIMAL(20, 9) DEFAULT 0,
  last_balance_check TIMESTAMP,
  
  -- Usage statistics
  total_trades INTEGER DEFAULT 0,
  total_profit_sol DECIMAL(20, 9) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT public_key_format CHECK (LENGTH(public_key) BETWEEN 32 AND 44),
  CONSTRAINT unique_user_wallet_index UNIQUE (user_id, wallet_index)
);

-- =====================================================
-- 11. WALLET_KEYS TABLE (Encrypted Private Keys - Secure Enclave)
-- =====================================================
CREATE TABLE wallet_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_wallet_id UUID UNIQUE NOT NULL,
  
  -- Encrypted private key (AES-256-GCM encrypted)
  encrypted_private_key TEXT NOT NULL,
  encryption_iv VARCHAR(32) NOT NULL,
  encryption_tag VARCHAR(32) NOT NULL,
  
  -- Key derivation metadata
  key_version INTEGER DEFAULT 1,
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  
  -- Security metadata
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (sub_wallet_id) REFERENCES sub_wallets(id) ON DELETE CASCADE
);

-- =====================================================
-- 12. WALLET_AUDIT_LOG TABLE (Comprehensive Audit Trail)
-- =====================================================
CREATE TABLE wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and wallet identification
  user_id UUID,
  sub_wallet_id UUID,
  wallet_public_key VARCHAR(44),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_action VARCHAR(100) NOT NULL,
  event_description TEXT,
  
  -- Request metadata (hashed)
  ip_hash VARCHAR(64),
  device_fingerprint_hash VARCHAR(64),
  user_agent TEXT,
  
  -- Transaction details (for trade events)
  transaction_signature VARCHAR(88),
  amount_sol DECIMAL(20, 9),
  profit_sol DECIMAL(20, 9),
  
  -- Status
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys (nullable for flexibility)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (sub_wallet_id) REFERENCES sub_wallets(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'wallet_created', 'wallet_imported', 'wallet_exported', 
    'wallet_deleted', 'wallet_activated', 'wallet_deactivated',
    'trade_executed', 'trade_failed', 'balance_check',
    'user_login', 'user_logout', 'admin_action'
  )),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'pending'))
);

-- =====================================================
-- INDEXES FOR NEW TABLES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_wallet_public_key ON users(wallet_public_key);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Sub-wallets indexes
CREATE INDEX idx_sub_wallets_user_id ON sub_wallets(user_id);
CREATE INDEX idx_sub_wallets_public_key ON sub_wallets(public_key);
CREATE INDEX idx_sub_wallets_is_active ON sub_wallets(is_active);
CREATE INDEX idx_sub_wallets_created_at ON sub_wallets(created_at);

-- Wallet keys indexes
CREATE INDEX idx_wallet_keys_sub_wallet_id ON wallet_keys(sub_wallet_id);
CREATE INDEX idx_wallet_keys_last_used ON wallet_keys(last_used);

-- Wallet audit log indexes
CREATE INDEX idx_audit_user_id ON wallet_audit_log(user_id);
CREATE INDEX idx_audit_sub_wallet_id ON wallet_audit_log(sub_wallet_id);
CREATE INDEX idx_audit_wallet_public_key ON wallet_audit_log(wallet_public_key);
CREATE INDEX idx_audit_event_type ON wallet_audit_log(event_type);
CREATE INDEX idx_audit_created_at ON wallet_audit_log(created_at);
CREATE INDEX idx_audit_status ON wallet_audit_log(status);

-- =====================================================
-- TRIGGERS FOR NEW TABLES
-- =====================================================

-- Update timestamp triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_wallets_updated_at BEFORE UPDATE
    ON sub_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_keys_updated_at BEFORE UPDATE
    ON wallet_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR WALLET GOVERNANCE
-- =====================================================

-- User wallet overview
CREATE OR REPLACE VIEW user_wallet_overview AS
SELECT 
    u.id as user_id,
    u.wallet_public_key as main_wallet,
    u.last_login,
    u.login_count,
    COUNT(sw.id) as sub_wallet_count,
    SUM(CASE WHEN sw.is_active THEN 1 ELSE 0 END) as active_sub_wallets,
    SUM(sw.total_trades) as total_trades,
    SUM(sw.total_profit_sol) as total_profit_sol,
    MAX(sw.last_balance_check) as last_balance_check
FROM users u
LEFT JOIN sub_wallets sw ON u.id = sw.user_id
GROUP BY u.id, u.wallet_public_key, u.last_login, u.login_count;

-- Recent audit events view
CREATE OR REPLACE VIEW recent_audit_events AS
SELECT 
    wal.id,
    wal.event_type,
    wal.event_action,
    wal.wallet_public_key,
    u.wallet_public_key as user_main_wallet,
    sw.public_key as sub_wallet_public_key,
    wal.status,
    wal.created_at
FROM wallet_audit_log wal
LEFT JOIN users u ON wal.user_id = u.id
LEFT JOIN sub_wallets sw ON wal.sub_wallet_id = sw.id
ORDER BY wal.created_at DESC
LIMIT 100;

-- =====================================================
-- GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Create application user (if not exists)
-- CREATE USER gxq_app WITH PASSWORD 'your_secure_password';

-- Grant permissions
-- GRANT CONNECT ON DATABASE gxq_studio TO gxq_app;
-- GRANT USAGE ON SCHEMA public TO gxq_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gxq_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gxq_app;
