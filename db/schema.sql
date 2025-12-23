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

-- Pending approvals view with requester and approver details
CREATE OR REPLACE VIEW pending_approvals_view AS
SELECT 
    pa.id,
    pa.transaction_hash,
    pa.transaction_type,
    pa.value_at_risk,
    pa.target_program_id,
    pa.description,
    pa.requested_by,
    pa.requested_by_username,
    pa.approved_by,
    pa.approved_by_username,
    pa.status,
    pa.created_at,
    pa.approved_at,
    pa.executed_at,
    pa.expires_at,
    req_role.name as requester_role,
    appr_role.name as approver_role
FROM pending_approvals pa
LEFT JOIN user_roles ur_req ON pa.requested_by = ur_req.user_id
LEFT JOIN roles req_role ON ur_req.role_id = req_role.id
LEFT JOIN user_roles ur_appr ON pa.approved_by = ur_appr.user_id
LEFT JOIN roles appr_role ON ur_appr.role_id = appr_role.id
WHERE pa.status IN ('PENDING', 'APPROVED')
ORDER BY pa.created_at DESC;

-- =====================================================
-- INITIAL DATA / SEED DATA
-- =====================================================

-- Example: Insert development wallet
-- INSERT INTO wallet_analysis (wallet_address, total_score, tier, balance_score, transaction_score, nft_score, defi_score, age_score, diversification_score, airdrop_priority, estimated_value)
-- VALUES ('DevWalletAddress123...', 85, 'DEGEN', 18, 19, 12, 15, 14, 13, 5, 5000.00);

-- =====================================================
-- 9. RBAC - USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Solana wallet association
  primary_wallet VARCHAR(44) UNIQUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  
  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 100),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- 10. RBAC - ROLES TABLE
-- =====================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT role_name CHECK (name IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'TRADER', 'VIEWER', 'BOT_MANAGER'))
);

-- =====================================================
-- 11. RBAC - PERMISSIONS TABLE
-- =====================================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT permission_resource CHECK (resource IN ('WALLET', 'BOT', 'ADMIN', 'AIRDROP', 'TOKEN_LAUNCHER', 'SNIPER', 'RPC_CONFIG', 'FEE_MANAGEMENT', 'ANALYTICS', 'AUDIT_LOG')),
  CONSTRAINT permission_action CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'CONFIGURE', 'APPROVE'))
);

-- =====================================================
-- 12. RBAC - USER ROLES (Junction Table)
-- =====================================================
CREATE TABLE user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 13. RBAC - ROLE PERMISSIONS (Junction Table)
-- =====================================================
CREATE TABLE role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- =====================================================
-- 14. ADMIN AUDIT LOG
-- =====================================================
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  username VARCHAR(100) NOT NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  
  -- Changes
  old_value JSONB,
  new_value JSONB,
  
  -- Request metadata
  ip_address_hash VARCHAR(64),
  user_agent TEXT,
  request_id VARCHAR(100),
  
  -- Status
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 15. USER WALLETS (Sub-wallets with encryption)
-- =====================================================
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  -- Wallet details
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  wallet_label VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Encryption (AES-256-GCM)
  encrypted_private_key TEXT NOT NULL,
  encryption_iv VARCHAR(64) NOT NULL,
  encryption_salt VARCHAR(64) NOT NULL,
  encryption_tag VARCHAR(64) NOT NULL,
  key_derivation_iterations INTEGER DEFAULT 100000,
  
  -- GXQ suffix validation (last 3 chars must be GXQ)
  has_gxq_suffix BOOLEAN GENERATED ALWAYS AS (
    RIGHT(wallet_address, 3) = 'GXQ'
  ) STORED,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT max_3_wallets_per_user CHECK (
    (SELECT COUNT(*) FROM user_wallets WHERE user_id = user_wallets.user_id) <= 3
  )
);

-- =====================================================
-- 16. WALLET AUDIT LOG
-- =====================================================
CREATE TABLE wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Operation details
  operation VARCHAR(50) NOT NULL,
  operation_data JSONB,
  
  -- Security metadata
  ip_address_hash VARCHAR(64),
  fingerprint_hash VARCHAR(64),
  
  -- Transaction signature (if applicable)
  transaction_signature VARCHAR(88),
  
  -- Status
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  CONSTRAINT operation_type CHECK (operation IN ('LOGIN', 'KEY_DECRYPT', 'TRANSACTION_SIGN', 'TRANSFER', 'SWAP', 'STAKE', 'UNSTAKE', 'CLAIM', 'BOT_EXECUTION'))
);

-- =====================================================
-- 17. BOTS TABLE
-- =====================================================
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  -- Bot configuration
  name VARCHAR(100) NOT NULL,
  bot_type VARCHAR(50) NOT NULL,
  strategy_config JSONB NOT NULL,
  
  -- Execution settings
  signing_mode VARCHAR(50) NOT NULL DEFAULT 'CLIENT_SIDE',
  wallet_id UUID,
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  is_paused BOOLEAN DEFAULT FALSE,
  
  -- Performance metrics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_profit_sol DECIMAL(20, 9) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_execution_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE SET NULL,
  
  CONSTRAINT bot_type_check CHECK (bot_type IN ('ARBITRAGE', 'SNIPER', 'FLASH_LOAN', 'TRIANGULAR', 'CUSTOM')),
  CONSTRAINT signing_mode_check CHECK (signing_mode IN ('CLIENT_SIDE', 'SERVER_SIDE', 'ENCLAVE'))
);

-- =====================================================
-- 18. BOT EXECUTIONS
-- =====================================================
CREATE TABLE bot_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Execution details
  execution_type VARCHAR(50) NOT NULL,
  transaction_signature VARCHAR(88),
  
  -- Tokens involved
  token_in VARCHAR(44),
  token_out VARCHAR(44),
  amount_in DECIMAL(20, 9),
  amount_out DECIMAL(20, 9),
  
  -- Profit metrics
  profit_sol DECIMAL(20, 9),
  profit_usd DECIMAL(20, 2),
  gas_fees_sol DECIMAL(20, 9),
  
  -- Status
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  
  -- Timestamp
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  CONSTRAINT execution_status CHECK (status IN ('PENDING', 'SIMULATING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED'))
);

-- =====================================================
-- 19. REPLAY PROTECTION
-- =====================================================
CREATE TABLE replay_protection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Layer 1: Unique nonces
  nonce VARCHAR(64) UNIQUE NOT NULL,
  
  -- Layer 2: SHA-256 deduplication
  transaction_hash VARCHAR(64) UNIQUE NOT NULL,
  
  -- Layer 3: Timestamp window
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  -- Layer 4: Rate limiting
  user_id UUID NOT NULL,
  ip_address_hash VARCHAR(64),
  
  -- Metadata
  bot_id UUID,
  transaction_signature VARCHAR(88),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- =====================================================
-- 20. BOT AUDIT LOG
-- =====================================================
CREATE TABLE bot_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  action_data JSONB,
  
  -- Changes
  old_config JSONB,
  new_config JSONB,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  CONSTRAINT bot_action CHECK (action IN ('CREATED', 'UPDATED', 'ACTIVATED', 'DEACTIVATED', 'PAUSED', 'RESUMED', 'DELETED', 'CONFIG_CHANGED', 'WALLET_CHANGED'))
);

-- =====================================================
-- 21. AIRDROP ELIGIBILITY
-- =====================================================
CREATE TABLE airdrop_eligibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(44) NOT NULL,
  
  -- Airdrop details
  airdrop_name VARCHAR(100) NOT NULL,
  protocol VARCHAR(50) NOT NULL,
  
  -- Eligibility
  is_eligible BOOLEAN NOT NULL,
  allocation_amount DECIMAL(20, 9),
  allocation_token VARCHAR(44),
  
  -- Requirements met
  requirements_met JSONB,
  
  -- Status
  claim_status VARCHAR(50) DEFAULT 'UNCLAIMED',
  
  -- Timestamps
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE,
  
  CONSTRAINT protocol_check CHECK (protocol IN ('JUPITER', 'JITO', 'PYTH', 'KAMINO', 'MARGINFI', 'ORCA', 'RAYDIUM', 'SOLEND')),
  CONSTRAINT claim_status_check CHECK (claim_status IN ('UNCLAIMED', 'PENDING', 'CLAIMED', 'DONATED', 'FAILED'))
);

-- =====================================================
-- 22. AIRDROP CLAIMS
-- =====================================================
CREATE TABLE airdrop_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eligibility_id UUID NOT NULL,
  wallet_address VARCHAR(44) NOT NULL,
  user_id UUID,
  
  -- Claim details
  claimed_amount DECIMAL(20, 9) NOT NULL,
  claimed_token VARCHAR(44) NOT NULL,
  transaction_signature VARCHAR(88) NOT NULL,
  
  -- Donation (10% to dev wallet)
  donation_amount DECIMAL(20, 9) NOT NULL,
  donation_signature VARCHAR(88),
  donation_sent BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  donation_sent_at TIMESTAMP,
  
  FOREIGN KEY (eligibility_id) REFERENCES airdrop_eligibility(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 23. DONATION TRACKING
-- =====================================================
CREATE TABLE donation_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  
  -- Donation details
  donor_wallet VARCHAR(44) NOT NULL,
  donation_amount DECIMAL(20, 9) NOT NULL,
  donation_token VARCHAR(44) NOT NULL,
  
  -- Dev wallet
  dev_wallet VARCHAR(44) NOT NULL,
  transaction_signature VARCHAR(88) NOT NULL,
  
  -- Percentage
  donation_percentage DECIMAL(5, 2) NOT NULL,
  
  -- Timestamp
  donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT source_type_check CHECK (source_type IN ('AIRDROP_CLAIM', 'BOT_PROFIT', 'ARBITRAGE_PROFIT', 'SNIPER_PROFIT'))
);

-- =====================================================
-- 24. LAUNCHED TOKENS
-- =====================================================
CREATE TABLE launched_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  -- Token details
  token_mint VARCHAR(44) UNIQUE NOT NULL,
  token_name VARCHAR(100) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_decimals INTEGER NOT NULL DEFAULT 9,
  
  -- Supply
  initial_supply DECIMAL(30, 9) NOT NULL,
  max_supply DECIMAL(30, 9),
  
  -- Authority management
  mint_authority VARCHAR(44),
  freeze_authority VARCHAR(44),
  mint_authority_revoked BOOLEAN DEFAULT FALSE,
  freeze_authority_revoked BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  token_uri TEXT,
  description TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graduated_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  CONSTRAINT token_decimals_check CHECK (token_decimals >= 0 AND token_decimals <= 18)
);

-- =====================================================
-- 25. TOKEN MILESTONES
-- =====================================================
CREATE TABLE token_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL,
  
  -- Milestone details
  milestone_type VARCHAR(50) NOT NULL,
  milestone_value DECIMAL(30, 9) NOT NULL,
  description TEXT,
  
  -- Status
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP,
  
  -- Reward/Action
  action_taken VARCHAR(100),
  action_signature VARCHAR(88),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (token_id) REFERENCES launched_tokens(id) ON DELETE CASCADE,
  
  CONSTRAINT milestone_type_check CHECK (milestone_type IN ('MARKET_CAP', 'VOLUME', 'HOLDERS', 'LIQUIDITY', 'GRADUATION', 'LISTING'))
);

-- =====================================================
-- 26. SNIPER TARGETS
-- =====================================================
CREATE TABLE sniper_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  bot_id UUID,
  
  -- Target details
  token_mint VARCHAR(44),
  dex VARCHAR(50) NOT NULL,
  pool_address VARCHAR(44),
  
  -- Entry criteria
  target_price DECIMAL(30, 18),
  max_price_impact DECIMAL(5, 2) DEFAULT 1.0,
  max_position_size_sol DECIMAL(20, 9),
  
  -- Risk limits
  max_priority_fee_lamports BIGINT DEFAULT 10000000,
  max_slippage_bps INTEGER DEFAULT 100,
  
  -- Jito MEV protection
  use_jito BOOLEAN DEFAULT TRUE,
  jito_tip_lamports BIGINT DEFAULT 10000,
  
  -- Status
  status VARCHAR(50) DEFAULT 'ACTIVE',
  
  -- Execution
  executed BOOLEAN DEFAULT FALSE,
  execution_signature VARCHAR(88),
  execution_price DECIMAL(30, 18),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  
  CONSTRAINT dex_check CHECK (dex IN ('RAYDIUM', 'ORCA', 'PUMP_FUN', 'METEORA', 'PHOENIX', 'JUPITER')),
  CONSTRAINT status_check CHECK (status IN ('ACTIVE', 'PAUSED', 'EXECUTED', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT max_priority_fee_limit CHECK (max_priority_fee_lamports <= 10000000)
);

-- =====================================================
-- 27. RPC CONFIGURATION
-- =====================================================
CREATE TABLE rpc_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- RPC details
  name VARCHAR(100) NOT NULL,
  rpc_url TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  
  -- Credentials (encrypted)
  api_key_encrypted TEXT,
  
  -- Limits
  rate_limit_per_second INTEGER DEFAULT 100,
  monthly_request_quota BIGINT,
  
  -- Priority
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_fallback BOOLEAN DEFAULT FALSE,
  
  -- Health monitoring
  last_health_check TIMESTAMP,
  health_status VARCHAR(20) DEFAULT 'UNKNOWN',
  consecutive_failures INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT provider_check CHECK (provider IN ('QUICKNODE', 'HELIUS', 'TRITON', 'ALCHEMY', 'SOLANA_MAINNET', 'CUSTOM')),
  CONSTRAINT health_status_check CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN'))
);

-- =====================================================
-- 28. FEE CONFIGURATION
-- =====================================================
CREATE TABLE fee_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Fee type
  fee_type VARCHAR(50) NOT NULL,
  
  -- Fee values
  fee_percentage DECIMAL(5, 4) NOT NULL,
  min_fee_sol DECIMAL(20, 9) DEFAULT 0,
  max_fee_sol DECIMAL(20, 9),
  
  -- Recipient
  recipient_wallet VARCHAR(44) NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fee_type_check CHECK (fee_type IN ('DEV_FEE', 'PLATFORM_FEE', 'REFERRAL_FEE', 'BOT_FEE', 'AIRDROP_DONATION')),
  CONSTRAINT fee_percentage_check CHECK (fee_percentage >= 0 AND fee_percentage <= 1)
);

-- =====================================================
-- 29. PENDING APPROVALS (Dual-Approval for Deployments)
-- =====================================================
CREATE TABLE pending_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Transaction details
  transaction_hash VARCHAR(64) UNIQUE NOT NULL,
  serialized_transaction TEXT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  
  -- Risk assessment
  value_at_risk DECIMAL(20, 9) NOT NULL,
  target_program_id VARCHAR(44),
  
  -- Metadata
  description TEXT,
  instructions_count INTEGER NOT NULL,
  
  -- Requester
  requested_by UUID NOT NULL,
  requested_by_username VARCHAR(100) NOT NULL,
  request_reason TEXT,
  
  -- Approver
  approved_by UUID,
  approved_by_username VARCHAR(100),
  approval_signature VARCHAR(88),
  approval_reason TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'PENDING',
  
  -- Execution
  executed BOOLEAN DEFAULT FALSE,
  execution_signature VARCHAR(88),
  execution_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  CONSTRAINT transaction_type_check CHECK (transaction_type IN ('PROGRAM_DEPLOYMENT', 'PROGRAM_UPGRADE', 'AUTHORITY_TRANSFER', 'CONFIG_UPDATE', 'CRITICAL_OPERATION')),
  CONSTRAINT status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED'))
);

-- =====================================================
-- ADDITIONAL INDEXES FOR NEW TABLES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_primary_wallet ON users(primary_wallet);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);

-- RBAC indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Admin audit log indexes
CREATE INDEX idx_admin_audit_user_id ON admin_audit_log(user_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_resource_type ON admin_audit_log(resource_type);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at);

-- User wallets indexes
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX idx_user_wallets_is_primary ON user_wallets(is_primary);
CREATE INDEX idx_user_wallets_has_gxq_suffix ON user_wallets(has_gxq_suffix);

-- Wallet audit log indexes
CREATE INDEX idx_wallet_audit_wallet_id ON wallet_audit_log(wallet_id);
CREATE INDEX idx_wallet_audit_user_id ON wallet_audit_log(user_id);
CREATE INDEX idx_wallet_audit_operation ON wallet_audit_log(operation);
CREATE INDEX idx_wallet_audit_created_at ON wallet_audit_log(created_at);

-- Bots indexes
CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_bots_bot_type ON bots(bot_type);
CREATE INDEX idx_bots_is_active ON bots(is_active);
CREATE INDEX idx_bots_wallet_id ON bots(wallet_id);

-- Bot executions indexes
CREATE INDEX idx_bot_executions_bot_id ON bot_executions(bot_id);
CREATE INDEX idx_bot_executions_user_id ON bot_executions(user_id);
CREATE INDEX idx_bot_executions_status ON bot_executions(status);
CREATE INDEX idx_bot_executions_executed_at ON bot_executions(executed_at);

-- Replay protection indexes
CREATE INDEX idx_replay_protection_nonce ON replay_protection(nonce);
CREATE INDEX idx_replay_protection_tx_hash ON replay_protection(transaction_hash);
CREATE INDEX idx_replay_protection_user_id ON replay_protection(user_id);
CREATE INDEX idx_replay_protection_expires_at ON replay_protection(expires_at);

-- Bot audit log indexes
CREATE INDEX idx_bot_audit_bot_id ON bot_audit_log(bot_id);
CREATE INDEX idx_bot_audit_user_id ON bot_audit_log(user_id);
CREATE INDEX idx_bot_audit_action ON bot_audit_log(action);

-- Airdrop indexes
CREATE INDEX idx_airdrop_eligibility_wallet ON airdrop_eligibility(wallet_address);
CREATE INDEX idx_airdrop_eligibility_protocol ON airdrop_eligibility(protocol);
CREATE INDEX idx_airdrop_eligibility_status ON airdrop_eligibility(claim_status);
CREATE INDEX idx_airdrop_claims_eligibility_id ON airdrop_claims(eligibility_id);
CREATE INDEX idx_airdrop_claims_wallet ON airdrop_claims(wallet_address);

-- Donation tracking indexes
CREATE INDEX idx_donation_tracking_source_type ON donation_tracking(source_type);
CREATE INDEX idx_donation_tracking_donor_wallet ON donation_tracking(donor_wallet);
CREATE INDEX idx_donation_tracking_donated_at ON donation_tracking(donated_at);

-- Token launcher indexes
CREATE INDEX idx_launched_tokens_user_id ON launched_tokens(user_id);
CREATE INDEX idx_launched_tokens_mint ON launched_tokens(token_mint);
CREATE INDEX idx_launched_tokens_is_active ON launched_tokens(is_active);
CREATE INDEX idx_token_milestones_token_id ON token_milestones(token_id);

-- Sniper targets indexes
CREATE INDEX idx_sniper_targets_user_id ON sniper_targets(user_id);
CREATE INDEX idx_sniper_targets_bot_id ON sniper_targets(bot_id);
CREATE INDEX idx_sniper_targets_dex ON sniper_targets(dex);
CREATE INDEX idx_sniper_targets_status ON sniper_targets(status);
CREATE INDEX idx_sniper_targets_executed ON sniper_targets(executed);

-- RPC configuration indexes
CREATE INDEX idx_rpc_config_provider ON rpc_configuration(provider);
CREATE INDEX idx_rpc_config_is_active ON rpc_configuration(is_active);
CREATE INDEX idx_rpc_config_priority ON rpc_configuration(priority);

-- Fee configuration indexes
CREATE INDEX idx_fee_config_fee_type ON fee_configuration(fee_type);
CREATE INDEX idx_fee_config_is_active ON fee_configuration(is_active);

-- Pending approvals indexes
CREATE INDEX idx_pending_approvals_tx_hash ON pending_approvals(transaction_hash);
CREATE INDEX idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX idx_pending_approvals_requested_by ON pending_approvals(requested_by);
CREATE INDEX idx_pending_approvals_approved_by ON pending_approvals(approved_by);
CREATE INDEX idx_pending_approvals_created_at ON pending_approvals(created_at);
CREATE INDEX idx_pending_approvals_expires_at ON pending_approvals(expires_at);
CREATE INDEX idx_pending_approvals_executed ON pending_approvals(executed);

-- =====================================================
-- TRIGGERS FOR NEW TABLES
-- =====================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE
    ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE
    ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at BEFORE UPDATE
    ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_airdrop_eligibility_updated_at BEFORE UPDATE
    ON airdrop_eligibility FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_launched_tokens_updated_at BEFORE UPDATE
    ON launched_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rpc_configuration_updated_at BEFORE UPDATE
    ON rpc_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_configuration_updated_at BEFORE UPDATE
    ON fee_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION TO AUTO-EXPIRE PENDING APPROVALS
-- =====================================================
CREATE OR REPLACE FUNCTION expire_old_pending_approvals()
RETURNS void AS $$
BEGIN
  UPDATE pending_approvals
  SET status = 'EXPIRED'
  WHERE status = 'PENDING'
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA FOR RBAC
-- =====================================================

-- Insert default roles
INSERT INTO roles (name, description, is_system_role) VALUES
  ('SUPER_ADMIN', 'Full system access with all permissions', TRUE),
  ('ADMIN', 'Administrative access with most permissions except critical system changes', TRUE),
  ('MODERATOR', 'Moderate user activities and content', TRUE),
  ('TRADER', 'Execute trades and manage bots', TRUE),
  ('VIEWER', 'Read-only access to system data', TRUE),
  ('BOT_MANAGER', 'Create and manage trading bots', TRUE);

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('wallet.create', 'WALLET', 'CREATE', 'Create new wallets'),
  ('wallet.read', 'WALLET', 'READ', 'View wallet information'),
  ('wallet.update', 'WALLET', 'UPDATE', 'Update wallet settings'),
  ('wallet.delete', 'WALLET', 'DELETE', 'Delete wallets'),
  ('bot.create', 'BOT', 'CREATE', 'Create new bots'),
  ('bot.read', 'BOT', 'READ', 'View bot information'),
  ('bot.update', 'BOT', 'UPDATE', 'Update bot configuration'),
  ('bot.delete', 'BOT', 'DELETE', 'Delete bots'),
  ('bot.execute', 'BOT', 'EXECUTE', 'Execute bot trades'),
  ('admin.read', 'ADMIN', 'READ', 'View admin panel'),
  ('admin.configure', 'ADMIN', 'CONFIGURE', 'Configure system settings'),
  ('admin.approve', 'ADMIN', 'APPROVE', 'Approve pending deployment transactions'),
  ('airdrop.read', 'AIRDROP', 'READ', 'View airdrop eligibility'),
  ('airdrop.claim', 'AIRDROP', 'EXECUTE', 'Claim airdrops'),
  ('token_launcher.create', 'TOKEN_LAUNCHER', 'CREATE', 'Launch new tokens'),
  ('token_launcher.read', 'TOKEN_LAUNCHER', 'READ', 'View launched tokens'),
  ('sniper.create', 'SNIPER', 'CREATE', 'Create sniper targets'),
  ('sniper.execute', 'SNIPER', 'EXECUTE', 'Execute sniper trades'),
  ('rpc_config.read', 'RPC_CONFIG', 'READ', 'View RPC configuration'),
  ('rpc_config.configure', 'RPC_CONFIG', 'CONFIGURE', 'Configure RPC endpoints'),
  ('fee_management.read', 'FEE_MANAGEMENT', 'READ', 'View fee configuration'),
  ('fee_management.configure', 'FEE_MANAGEMENT', 'CONFIGURE', 'Configure fees'),
  ('analytics.read', 'ANALYTICS', 'READ', 'View analytics data'),
  ('audit_log.read', 'AUDIT_LOG', 'READ', 'View audit logs');

-- Assign permissions to SUPER_ADMIN (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'SUPER_ADMIN'),
  id
FROM permissions;

-- Assign permissions to ADMIN (all except critical system config)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'ADMIN'),
  id
FROM permissions
WHERE name NOT IN ('rpc_config.configure', 'fee_management.configure');

-- Assign permissions to TRADER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'TRADER'),
  id
FROM permissions
WHERE name IN (
  'wallet.read', 'wallet.update',
  'bot.read', 'bot.execute',
  'airdrop.read', 'airdrop.claim',
  'sniper.execute',
  'analytics.read'
);

-- Assign permissions to BOT_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'BOT_MANAGER'),
  id
FROM permissions
WHERE resource IN ('BOT', 'WALLET') OR name IN ('analytics.read', 'airdrop.read');

-- Assign permissions to VIEWER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'VIEWER'),
  id
FROM permissions
WHERE action = 'READ';

-- Insert default fee configuration
INSERT INTO fee_configuration (fee_type, fee_percentage, recipient_wallet, is_active) VALUES
  ('DEV_FEE', 0.1000, '11111111111111111111111111111111', TRUE),
  ('AIRDROP_DONATION', 0.1000, '11111111111111111111111111111111', TRUE);

-- =====================================================
-- CLEANUP FUNCTION FOR EXPIRED REPLAY PROTECTION
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_replay_protection()
RETURNS void AS $$
BEGIN
  DELETE FROM replay_protection WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

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
