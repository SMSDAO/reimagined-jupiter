-- =====================================================
-- ADMIN SECURITY & RBAC SCHEMA
-- GXQ Studio Admin Panel - Role-Based Access Control
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ADMIN USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Account status
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP,
  locked_until TIMESTAMP,
  
  -- Session management
  last_login TIMESTAMP,
  last_activity TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  must_change_password BOOLEAN DEFAULT FALSE,
  
  -- Security
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  recovery_codes TEXT[],
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES admin_users(id),
  
  -- Constraints
  CONSTRAINT username_length CHECK (LENGTH(username) >= 3),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- =====================================================
-- 2. ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Role attributes
  is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted
  priority INTEGER DEFAULT 0, -- Higher priority for conflict resolution
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT role_name_format CHECK (name ~* '^[a-z_]+$')
);

-- =====================================================
-- 3. PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL, -- e.g., 'bot', 'config', 'logs'
  action VARCHAR(50) NOT NULL, -- e.g., 'read', 'write', 'execute'
  description TEXT,
  
  -- Permission attributes
  is_dangerous BOOLEAN DEFAULT FALSE, -- Requires extra confirmation
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT permission_name_format CHECK (name ~* '^[a-z_:]+$'),
  CONSTRAINT unique_resource_action UNIQUE(resource, action)
);

-- =====================================================
-- 4. USER-ROLE MAPPING (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  
  -- Grant details
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID REFERENCES admin_users(id),
  expires_at TIMESTAMP, -- NULL for permanent grants
  
  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- =====================================================
-- 5. ROLE-PERMISSION MAPPING (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  
  -- Grant details
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID REFERENCES admin_users(id),
  
  CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

-- =====================================================
-- 6. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who, what, when
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  username VARCHAR(50), -- Denormalized for historical records
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  
  -- Action details
  method VARCHAR(10), -- GET, POST, PUT, DELETE
  endpoint VARCHAR(255),
  status_code INTEGER,
  
  -- Changes tracking
  old_value JSONB,
  new_value JSONB,
  changes JSONB,
  
  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  session_id UUID,
  
  -- Metadata
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  
  -- Additional context
  metadata JSONB
);

-- =====================================================
-- 7. REFRESH TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  
  -- Token lifecycle
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES admin_users(id),
  revoke_reason VARCHAR(255),
  
  -- Token metadata
  ip_address INET,
  user_agent TEXT,
  last_used_at TIMESTAMP,
  
  CONSTRAINT expires_after_issued CHECK (expires_at > issued_at)
);

-- =====================================================
-- 8. API KEYS TABLE (for service-to-service auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Permissions
  role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
  scopes TEXT[], -- Additional scope restrictions
  
  -- Lifecycle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES admin_users(id),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP,
  
  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 9. SECURITY EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL, -- 'brute_force', 'suspicious_activity', etc.
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Target
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  username VARCHAR(50),
  
  -- Event details
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Response
  action_taken VARCHAR(100), -- 'account_locked', 'ip_blocked', etc.
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES admin_users(id),
  
  -- Metadata
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- =====================================================
-- 10. CONFIGURATION HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_config_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  
  -- Change tracking
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  change_reason TEXT,
  
  -- Rollback capability
  is_active BOOLEAN DEFAULT TRUE,
  reverted_at TIMESTAMP,
  reverted_by UUID REFERENCES admin_users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Admin Users indexes
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX idx_admin_users_last_login ON admin_users(last_login);

-- Roles indexes
CREATE INDEX idx_admin_roles_name ON admin_roles(name);

-- Permissions indexes
CREATE INDEX idx_admin_permissions_resource ON admin_permissions(resource);
CREATE INDEX idx_admin_permissions_action ON admin_permissions(action);

-- User-Role mapping indexes
CREATE INDEX idx_admin_user_roles_user_id ON admin_user_roles(user_id);
CREATE INDEX idx_admin_user_roles_role_id ON admin_user_roles(role_id);
CREATE INDEX idx_admin_user_roles_expires_at ON admin_user_roles(expires_at);

-- Role-Permission mapping indexes
CREATE INDEX idx_admin_role_permissions_role_id ON admin_role_permissions(role_id);
CREATE INDEX idx_admin_role_permissions_permission_id ON admin_role_permissions(permission_id);

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_user_id ON admin_audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON admin_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON admin_audit_logs(resource);
CREATE INDEX idx_audit_logs_success ON admin_audit_logs(success);
CREATE INDEX idx_audit_logs_ip_address ON admin_audit_logs(ip_address);

-- Refresh Tokens indexes
CREATE INDEX idx_refresh_tokens_user_id ON admin_refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON admin_refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON admin_refresh_tokens(revoked_at);

-- API Keys indexes
CREATE INDEX idx_api_keys_key_prefix ON admin_api_keys(key_prefix);
CREATE INDEX idx_api_keys_created_by ON admin_api_keys(created_by);
CREATE INDEX idx_api_keys_is_active ON admin_api_keys(is_active);

-- Security Events indexes
CREATE INDEX idx_security_events_event_type ON admin_security_events(event_type);
CREATE INDEX idx_security_events_severity ON admin_security_events(severity);
CREATE INDEX idx_security_events_timestamp ON admin_security_events(timestamp DESC);
CREATE INDEX idx_security_events_user_id ON admin_security_events(user_id);

-- Config History indexes
CREATE INDEX idx_config_history_config_key ON admin_config_history(config_key);
CREATE INDEX idx_config_history_changed_at ON admin_config_history(changed_at DESC);
CREATE INDEX idx_config_history_is_active ON admin_config_history(is_active);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp on admin_users
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION update_admin_users_updated_at();

-- Update updated_at timestamp on admin_roles
CREATE OR REPLACE FUNCTION update_admin_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_roles_updated_at
BEFORE UPDATE ON admin_roles
FOR EACH ROW
EXECUTE FUNCTION update_admin_roles_updated_at();

-- =====================================================
-- SEED DATA - DEFAULT ROLES AND PERMISSIONS
-- =====================================================

-- Insert default roles
INSERT INTO admin_roles (name, description, is_system_role, priority) VALUES
  ('super_admin', 'Full system access with all permissions', TRUE, 100),
  ('admin', 'Full administrative access except user management', TRUE, 90),
  ('operator', 'Can control bot and view configurations but cannot modify', TRUE, 50),
  ('viewer', 'Read-only access to dashboard and logs', TRUE, 10)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO admin_permissions (name, resource, action, description, is_dangerous) VALUES
  -- Bot control
  ('bot:start', 'bot', 'start', 'Start the trading bot', FALSE),
  ('bot:stop', 'bot', 'stop', 'Stop the trading bot', FALSE),
  ('bot:pause', 'bot', 'pause', 'Pause the trading bot', FALSE),
  ('bot:resume', 'bot', 'resume', 'Resume the trading bot', FALSE),
  ('bot:emergency_stop', 'bot', 'emergency_stop', 'Emergency stop all bot operations', TRUE),
  ('bot:view_status', 'bot', 'read', 'View bot status and metrics', FALSE),
  
  -- Configuration management
  ('config:view', 'config', 'read', 'View system configuration', FALSE),
  ('config:update_rpc', 'config', 'update_rpc', 'Update RPC endpoints', TRUE),
  ('config:update_fees', 'config', 'update_fees', 'Update transaction fees and gas limits', TRUE),
  ('config:update_dao_skim', 'config', 'update_dao_skim', 'Update DAO skimming percentage', TRUE),
  ('config:update_trading', 'config', 'update_trading', 'Update trading parameters (slippage, min profit)', TRUE),
  ('config:update_strategies', 'config', 'update_strategies', 'Enable/disable trading strategies', TRUE),
  
  -- API management
  ('api:view_policies', 'api', 'read', 'View API access policies', FALSE),
  ('api:update_policies', 'api', 'write', 'Update API access policies and rate limits', TRUE),
  ('api:generate_keys', 'api', 'create', 'Generate new API keys', TRUE),
  ('api:revoke_keys', 'api', 'delete', 'Revoke API keys', TRUE),
  
  -- Monitoring
  ('monitoring:view_health', 'monitoring', 'read', 'View SDK and system health', FALSE),
  ('monitoring:view_metrics', 'monitoring', 'read', 'View trading metrics and analytics', FALSE),
  ('monitoring:view_logs', 'monitoring', 'read', 'View system and audit logs', FALSE),
  ('monitoring:export_logs', 'monitoring', 'export', 'Export logs and reports', FALSE),
  
  -- Audit & Security
  ('audit:view', 'audit', 'read', 'View audit logs', FALSE),
  ('audit:export', 'audit', 'export', 'Export audit logs', FALSE),
  ('security:view_events', 'security', 'read', 'View security events', FALSE),
  
  -- User management (super admin only)
  ('users:create', 'users', 'create', 'Create new admin users', TRUE),
  ('users:update', 'users', 'update', 'Update admin user details', TRUE),
  ('users:delete', 'users', 'delete', 'Delete admin users', TRUE),
  ('users:view', 'users', 'read', 'View admin users list', FALSE),
  ('users:assign_roles', 'users', 'assign_roles', 'Assign roles to users', TRUE),
  
  -- Role management (super admin only)
  ('roles:create', 'roles', 'create', 'Create new roles', TRUE),
  ('roles:update', 'roles', 'update', 'Update role permissions', TRUE),
  ('roles:delete', 'roles', 'delete', 'Delete roles', TRUE),
  ('roles:view', 'roles', 'read', 'View roles and permissions', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
DO $$
DECLARE
  super_admin_role_id UUID;
  admin_role_id UUID;
  operator_role_id UUID;
  viewer_role_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM admin_roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM admin_roles WHERE name = 'admin';
  SELECT id INTO operator_role_id FROM admin_roles WHERE name = 'operator';
  SELECT id INTO viewer_role_id FROM admin_roles WHERE name = 'viewer';
  
  -- Super Admin: All permissions
  INSERT INTO admin_role_permissions (role_id, permission_id)
  SELECT super_admin_role_id, id FROM admin_permissions
  ON CONFLICT DO NOTHING;
  
  -- Admin: All except user/role management
  INSERT INTO admin_role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM admin_permissions
  WHERE resource NOT IN ('users', 'roles')
  ON CONFLICT DO NOTHING;
  
  -- Operator: Bot control and view permissions, no config changes
  INSERT INTO admin_role_permissions (role_id, permission_id)
  SELECT operator_role_id, id FROM admin_permissions
  WHERE action = 'read' OR name IN ('bot:start', 'bot:stop', 'bot:pause', 'bot:resume')
  ON CONFLICT DO NOTHING;
  
  -- Viewer: Read-only access
  INSERT INTO admin_role_permissions (role_id, permission_id)
  SELECT viewer_role_id, id FROM admin_permissions
  WHERE action = 'read'
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- User permissions view (flattened for easy checking)
CREATE OR REPLACE VIEW admin_user_permissions AS
SELECT DISTINCT
  u.id AS user_id,
  u.username,
  r.name AS role_name,
  p.name AS permission_name,
  p.resource,
  p.action,
  p.is_dangerous
FROM admin_users u
JOIN admin_user_roles ur ON u.id = ur.user_id
JOIN admin_roles r ON ur.role_id = r.id
JOIN admin_role_permissions rp ON r.id = rp.role_id
JOIN admin_permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE
  AND u.is_locked = FALSE
  AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- Active sessions view
CREATE OR REPLACE VIEW admin_active_sessions AS
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  rt.token_hash,
  rt.issued_at,
  rt.expires_at,
  rt.last_used_at,
  rt.ip_address,
  EXTRACT(EPOCH FROM (rt.expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
FROM admin_users u
JOIN admin_refresh_tokens rt ON u.id = rt.user_id
WHERE rt.revoked_at IS NULL
  AND rt.expires_at > CURRENT_TIMESTAMP
  AND u.is_active = TRUE
  AND u.is_locked = FALSE;

-- Recent audit log view
CREATE OR REPLACE VIEW admin_recent_audit_logs AS
SELECT
  al.*,
  u.email AS user_email
FROM admin_audit_logs al
LEFT JOIN admin_users u ON al.user_id = u.id
ORDER BY al.timestamp DESC
LIMIT 1000;

-- Security events summary
CREATE OR REPLACE VIEW admin_security_events_summary AS
SELECT
  event_type,
  severity,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS affected_users,
  MAX(timestamp) AS last_occurrence
FROM admin_security_events
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION admin_has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_user_permissions
    WHERE user_id = p_user_id
      AND permission_name = p_permission_name
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION admin_get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_name VARCHAR,
  resource VARCHAR,
  action VARCHAR,
  is_dangerous BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.name,
    p.resource,
    p.action,
    p.is_dangerous
  FROM admin_user_permissions p
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to log audit event
CREATE OR REPLACE FUNCTION admin_log_audit(
  p_user_id UUID,
  p_username VARCHAR,
  p_action VARCHAR,
  p_resource VARCHAR,
  p_success BOOLEAN,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO admin_audit_logs (
    user_id,
    username,
    action,
    resource,
    success,
    old_value,
    new_value,
    ip_address,
    metadata
  ) VALUES (
    p_user_id,
    p_username,
    p_action,
    p_resource,
    p_success,
    p_old_value,
    p_new_value,
    p_ip_address,
    p_metadata
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE admin_users IS 'Admin user accounts with authentication credentials';
COMMENT ON TABLE admin_roles IS 'Role definitions for RBAC system';
COMMENT ON TABLE admin_permissions IS 'Granular permissions for system resources';
COMMENT ON TABLE admin_user_roles IS 'Many-to-many mapping between users and roles';
COMMENT ON TABLE admin_role_permissions IS 'Many-to-many mapping between roles and permissions';
COMMENT ON TABLE admin_audit_logs IS 'Comprehensive audit trail of all admin actions';
COMMENT ON TABLE admin_refresh_tokens IS 'Refresh tokens for session management';
COMMENT ON TABLE admin_api_keys IS 'API keys for service-to-service authentication';
COMMENT ON TABLE admin_security_events IS 'Security-related events and incidents';
COMMENT ON TABLE admin_config_history IS 'Configuration change history with rollback capability';
