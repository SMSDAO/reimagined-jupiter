-- Bot Framework Database Schema Extensions
-- Add to existing GXQ Studio database

-- =====================================================
-- 1. BOT CONFIGURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(44) NOT NULL, -- Wallet address of the user
  bot_name VARCHAR(100) NOT NULL,
  bot_type VARCHAR(50) NOT NULL CHECK (bot_type IN ('arbitrage', 'sniper', 'dca', 'grid', 'custom')),
  
  -- Configuration
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL, -- Bot-specific configuration (slippage, amounts, etc.)
  
  -- Execution settings
  max_gas_fee BIGINT DEFAULT 10000000, -- Max priority fee in lamports (0.01 SOL)
  max_slippage_bps INTEGER DEFAULT 100, -- Max slippage in basis points
  auto_execute BOOLEAN DEFAULT FALSE,
  
  -- Security settings
  wallet_private_key_encrypted TEXT, -- Encrypted private key (optional, for server-side signing)
  use_enclave BOOLEAN DEFAULT TRUE, -- Use secure enclave for signing
  signing_mode VARCHAR(20) DEFAULT 'client' CHECK (signing_mode IN ('client', 'server', 'enclave')),
  
  -- Rate limiting
  max_executions_per_hour INTEGER DEFAULT 100,
  max_daily_spend_lamports BIGINT DEFAULT 1000000000, -- 1 SOL default
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_executed_at TIMESTAMP,
  
  -- Constraints
  UNIQUE(user_id, bot_name)
);

-- =====================================================
-- 2. BOT SCRIPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_config_id UUID NOT NULL REFERENCES bot_configurations(id) ON DELETE CASCADE,
  user_id VARCHAR(44) NOT NULL,
  
  -- Script details
  script_name VARCHAR(100) NOT NULL,
  script_version VARCHAR(20) DEFAULT '1.0.0',
  script_code TEXT NOT NULL, -- JavaScript/TypeScript code
  script_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for integrity
  
  -- Execution settings
  enabled BOOLEAN DEFAULT TRUE,
  trigger_type VARCHAR(50) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'condition')),
  trigger_config JSONB, -- Trigger-specific configuration
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(bot_config_id, script_name)
);

-- =====================================================
-- 3. BOT EXECUTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_config_id UUID NOT NULL REFERENCES bot_configurations(id) ON DELETE CASCADE,
  bot_script_id UUID REFERENCES bot_scripts(id) ON DELETE SET NULL,
  user_id VARCHAR(44) NOT NULL,
  
  -- Execution details
  execution_type VARCHAR(50) NOT NULL,
  transaction_signature VARCHAR(88) UNIQUE,
  transaction_hash VARCHAR(64), -- For transaction deduplication
  
  -- Transaction details
  instructions_count INTEGER,
  compute_units_used INTEGER,
  priority_fee_lamports BIGINT,
  total_fee_lamports BIGINT,
  
  -- Tokens involved
  token_in VARCHAR(44),
  token_out VARCHAR(44),
  amount_in DECIMAL(20, 9),
  amount_out DECIMAL(20, 9),
  
  -- Results
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'timeout', 'rejected')),
  error_message TEXT,
  profit_loss_lamports BIGINT,
  profit_loss_usd DECIMAL(20, 2),
  
  -- Replay protection
  nonce BIGINT NOT NULL,
  timestamp_ms BIGINT NOT NULL,
  replay_protected BOOLEAN DEFAULT TRUE,
  
  -- Timing
  execution_time_ms INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Index for deduplication
  CONSTRAINT unique_transaction_hash UNIQUE(transaction_hash)
);

-- =====================================================
-- 4. BOT AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_config_id UUID REFERENCES bot_configurations(id) ON DELETE SET NULL,
  bot_execution_id UUID REFERENCES bot_executions(id) ON DELETE SET NULL,
  user_id VARCHAR(44) NOT NULL,
  
  -- Audit details
  action VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('config', 'execution', 'security', 'error')),
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  
  -- Context
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  
  -- Security tracking
  wallet_address VARCHAR(44),
  transaction_signature VARCHAR(88),
  signing_mode VARCHAR(20),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index for fast lookups
  CONSTRAINT idx_audit_user_time UNIQUE(user_id, created_at, action)
);

-- =====================================================
-- 5. BOT TELEMETRY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_config_id UUID NOT NULL REFERENCES bot_configurations(id) ON DELETE CASCADE,
  
  -- Metrics (aggregated per hour)
  hour_timestamp TIMESTAMP NOT NULL,
  
  -- Execution metrics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_gas_spent_lamports BIGINT DEFAULT 0,
  
  -- Performance metrics
  avg_execution_time_ms INTEGER,
  max_execution_time_ms INTEGER,
  min_execution_time_ms INTEGER,
  
  -- Profit metrics
  total_profit_lamports BIGINT DEFAULT 0,
  total_loss_lamports BIGINT DEFAULT 0,
  net_profit_lamports BIGINT DEFAULT 0,
  
  -- Recorded at
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- One record per bot per hour
  UNIQUE(bot_config_id, hour_timestamp)
);

-- =====================================================
-- 6. TRANSACTION NONCE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transaction_nonces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(44) NOT NULL,
  nonce BIGINT NOT NULL,
  transaction_hash VARCHAR(64) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  -- Ensure unique nonce per user
  UNIQUE(user_id, nonce)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Bot Configurations indexes
CREATE INDEX IF NOT EXISTS idx_bot_config_user ON bot_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_config_enabled ON bot_configurations(enabled);
CREATE INDEX IF NOT EXISTS idx_bot_config_type ON bot_configurations(bot_type);
CREATE INDEX IF NOT EXISTS idx_bot_config_updated ON bot_configurations(updated_at);

-- Bot Scripts indexes
CREATE INDEX IF NOT EXISTS idx_bot_script_config ON bot_scripts(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_bot_script_user ON bot_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_script_enabled ON bot_scripts(enabled);

-- Bot Executions indexes
CREATE INDEX IF NOT EXISTS idx_bot_exec_config ON bot_executions(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_bot_exec_user ON bot_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_exec_status ON bot_executions(status);
CREATE INDEX IF NOT EXISTS idx_bot_exec_started ON bot_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_bot_exec_signature ON bot_executions(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_bot_exec_nonce ON bot_executions(user_id, nonce);

-- Bot Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON bot_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_config ON bot_audit_logs(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON bot_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON bot_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_created ON bot_audit_logs(created_at);

-- Bot Telemetry indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_config ON bot_telemetry(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_hour ON bot_telemetry(hour_timestamp);

-- Transaction Nonces indexes
CREATE INDEX IF NOT EXISTS idx_nonce_user ON transaction_nonces(user_id);
CREATE INDEX IF NOT EXISTS idx_nonce_expires ON transaction_nonces(expires_at);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update bot configuration timestamp
CREATE OR REPLACE FUNCTION update_bot_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER bot_config_updated_at BEFORE UPDATE
    ON bot_configurations FOR EACH ROW EXECUTE FUNCTION update_bot_config_timestamp();

-- Update bot script timestamp
CREATE OR REPLACE FUNCTION update_bot_script_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER bot_script_updated_at BEFORE UPDATE
    ON bot_scripts FOR EACH ROW EXECUTE FUNCTION update_bot_script_timestamp();

-- Cleanup expired nonces (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM transaction_nonces WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active bots view
CREATE OR REPLACE VIEW active_bots AS
SELECT 
    bc.*,
    COUNT(be.id) as total_executions,
    SUM(CASE WHEN be.status = 'success' THEN 1 ELSE 0 END) as successful_executions,
    SUM(CASE WHEN be.status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
    COALESCE(SUM(be.profit_loss_lamports), 0) as total_profit_lamports
FROM bot_configurations bc
LEFT JOIN bot_executions be ON bc.id = be.bot_config_id
WHERE bc.enabled = TRUE
GROUP BY bc.id
ORDER BY bc.updated_at DESC;

-- Bot performance summary
CREATE OR REPLACE VIEW bot_performance_summary AS
SELECT 
    bc.id as bot_config_id,
    bc.user_id,
    bc.bot_name,
    bc.bot_type,
    COUNT(be.id) as total_executions,
    COUNT(CASE WHEN be.status = 'success' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN be.status = 'failed' THEN 1 END) as failed_executions,
    ROUND(COUNT(CASE WHEN be.status = 'success' THEN 1 END)::numeric / NULLIF(COUNT(be.id), 0) * 100, 2) as success_rate,
    COALESCE(SUM(be.total_fee_lamports), 0) as total_gas_spent,
    COALESCE(SUM(be.profit_loss_lamports), 0) as total_profit_loss,
    AVG(be.execution_time_ms) as avg_execution_time_ms,
    MAX(be.started_at) as last_execution_at
FROM bot_configurations bc
LEFT JOIN bot_executions be ON bc.id = be.bot_config_id
GROUP BY bc.id, bc.user_id, bc.bot_name, bc.bot_type
ORDER BY total_profit_loss DESC;

-- Recent bot activity
CREATE OR REPLACE VIEW recent_bot_activity AS
SELECT 
    be.id,
    be.user_id,
    bc.bot_name,
    bc.bot_type,
    be.execution_type,
    be.status,
    be.transaction_signature,
    be.profit_loss_lamports,
    be.total_fee_lamports,
    be.execution_time_ms,
    be.started_at,
    be.completed_at
FROM bot_executions be
JOIN bot_configurations bc ON be.bot_config_id = bc.id
WHERE be.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY be.started_at DESC;

-- =====================================================
-- GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bot_configurations TO gxq_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bot_scripts TO gxq_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bot_executions TO gxq_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bot_audit_logs TO gxq_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bot_telemetry TO gxq_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_nonces TO gxq_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gxq_app;
