/**
 * Admin Database Operations
 * Handles all database operations for admin panel RBAC and audit logging
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { query, getClient } from './database.js';

/**
 * Admin User Role Types
 */
export type AdminRole = 'admin' | 'operator' | 'viewer';

/**
 * Admin User Interface
 */
export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  role: AdminRole;
  canControlBot: boolean;
  canModifyConfig: boolean;
  canExecuteTrades: boolean;
  canViewLogs: boolean;
  canViewMetrics: boolean;
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled: boolean;
}

/**
 * Admin Session Interface
 */
export interface AdminSession {
  id: string;
  userId: string;
  accessTokenHash: string;
  refreshTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  isValid: boolean;
  createdAt: Date;
  lastActivity: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

/**
 * Admin Audit Log Interface
 */
export interface AdminAuditLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Admin Configuration Interface
 */
export interface AdminConfig {
  id: string;
  key: string;
  value: any;
  category: 'rpc' | 'fees' | 'dao' | 'bot' | 'security' | 'general';
  description?: string;
  isSensitive: boolean;
  requiresAdmin: boolean;
  version: number;
  previousValue?: any;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

// =====================================================
// ADMIN USER OPERATIONS
// =====================================================

/**
 * Create a new admin user
 */
export async function createAdminUser(data: {
  username: string;
  email?: string;
  passwordHash: string;
  role: AdminRole;
  canControlBot?: boolean;
  canModifyConfig?: boolean;
  canExecuteTrades?: boolean;
  canViewLogs?: boolean;
  canViewMetrics?: boolean;
  createdBy?: string;
}): Promise<AdminUser> {
  const sql = `
    INSERT INTO admin_users (
      username, email, password_hash, role,
      can_control_bot, can_modify_config, can_execute_trades,
      can_view_logs, can_view_metrics, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const result = await query(sql, [
    data.username,
    data.email || null,
    data.passwordHash,
    data.role,
    data.canControlBot ?? false,
    data.canModifyConfig ?? false,
    data.canExecuteTrades ?? false,
    data.canViewLogs ?? true,
    data.canViewMetrics ?? true,
    data.createdBy || null,
  ]);

  return mapAdminUser(result.rows[0]);
}

/**
 * Get admin user by username
 */
export async function getAdminUserByUsername(username: string): Promise<AdminUser | null> {
  const sql = `SELECT * FROM admin_users WHERE username = $1;`;
  const result = await query(sql, [username]);
  return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
}

/**
 * Get admin user by ID
 */
export async function getAdminUserById(userId: string): Promise<AdminUser | null> {
  const sql = `SELECT * FROM admin_users WHERE id = $1;`;
  const result = await query(sql, [userId]);
  return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
}

/**
 * Update admin user login tracking
 */
export async function updateAdminUserLogin(
  userId: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  if (success) {
    const sql = `
      UPDATE admin_users
      SET last_login_at = CURRENT_TIMESTAMP,
          last_login_ip = $1,
          failed_login_attempts = 0
      WHERE id = $2;
    `;
    await query(sql, [ipAddress, userId]);
  } else {
    const sql = `
      UPDATE admin_users
      SET failed_login_attempts = failed_login_attempts + 1,
          last_failed_login = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    await query(sql, [userId]);
  }
}

/**
 * Unlock admin user
 */
export async function unlockAdminUser(userId: string): Promise<void> {
  const sql = `
    UPDATE admin_users
    SET is_locked = FALSE,
        failed_login_attempts = 0
    WHERE id = $1;
  `;
  await query(sql, [userId]);
}

/**
 * Update admin user role
 */
export async function updateAdminUserRole(
  userId: string,
  role: AdminRole,
  updatedBy: string
): Promise<void> {
  const sql = `
    UPDATE admin_users
    SET role = $1
    WHERE id = $2;
  `;
  await query(sql, [role, userId]);
}

/**
 * Update admin user permissions
 */
export async function updateAdminUserPermissions(
  userId: string,
  permissions: {
    canControlBot?: boolean;
    canModifyConfig?: boolean;
    canExecuteTrades?: boolean;
    canViewLogs?: boolean;
    canViewMetrics?: boolean;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (permissions.canControlBot !== undefined) {
    updates.push(`can_control_bot = $${paramIndex++}`);
    values.push(permissions.canControlBot);
  }
  if (permissions.canModifyConfig !== undefined) {
    updates.push(`can_modify_config = $${paramIndex++}`);
    values.push(permissions.canModifyConfig);
  }
  if (permissions.canExecuteTrades !== undefined) {
    updates.push(`can_execute_trades = $${paramIndex++}`);
    values.push(permissions.canExecuteTrades);
  }
  if (permissions.canViewLogs !== undefined) {
    updates.push(`can_view_logs = $${paramIndex++}`);
    values.push(permissions.canViewLogs);
  }
  if (permissions.canViewMetrics !== undefined) {
    updates.push(`can_view_metrics = $${paramIndex++}`);
    values.push(permissions.canViewMetrics);
  }

  if (updates.length === 0) return;

  values.push(userId);
  const sql = `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${paramIndex};`;
  await query(sql, values);
}

// =====================================================
// ADMIN SESSION OPERATIONS
// =====================================================

/**
 * Create admin session
 */
export async function createAdminSession(data: {
  userId: string;
  accessTokenHash: string;
  refreshTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<AdminSession> {
  const sql = `
    INSERT INTO admin_sessions (
      user_id, access_token_hash, refresh_token_hash,
      ip_address, user_agent, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const result = await query(sql, [
    data.userId,
    data.accessTokenHash,
    data.refreshTokenHash || null,
    data.ipAddress || null,
    data.userAgent || null,
    data.expiresAt,
  ]);

  return mapAdminSession(result.rows[0]);
}

/**
 * Get admin session by token hash
 */
export async function getAdminSessionByTokenHash(
  tokenHash: string
): Promise<AdminSession | null> {
  const sql = `
    SELECT * FROM admin_sessions
    WHERE access_token_hash = $1
      AND is_valid = TRUE
      AND expires_at > CURRENT_TIMESTAMP;
  `;
  const result = await query(sql, [tokenHash]);
  return result.rows[0] ? mapAdminSession(result.rows[0]) : null;
}

/**
 * Update session last activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const sql = `
    UPDATE admin_sessions
    SET last_activity = CURRENT_TIMESTAMP
    WHERE id = $1;
  `;
  await query(sql, [sessionId]);
}

/**
 * Revoke admin session
 */
export async function revokeAdminSession(
  sessionId: string,
  reason: string
): Promise<void> {
  const sql = `
    UPDATE admin_sessions
    SET is_valid = FALSE,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = $1
    WHERE id = $2;
  `;
  await query(sql, [reason, sessionId]);
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: string
): Promise<void> {
  const sql = `
    UPDATE admin_sessions
    SET is_valid = FALSE,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = $1
    WHERE user_id = $2 AND is_valid = TRUE;
  `;
  await query(sql, [reason, userId]);
}

/**
 * Clean expired sessions
 */
export async function cleanExpiredSessions(): Promise<number> {
  const sql = `SELECT clean_expired_sessions();`;
  await query(sql);
  
  const countSql = `
    SELECT COUNT(*) as count FROM admin_sessions
    WHERE is_valid = FALSE AND revoked_reason = 'expired';
  `;
  const result = await query(countSql);
  return parseInt(result.rows[0].count);
}

// =====================================================
// ADMIN AUDIT LOG OPERATIONS
// =====================================================

/**
 * Create audit log entry
 */
export async function createAuditLog(data: {
  userId?: string;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
}): Promise<void> {
  const sql = `
    INSERT INTO admin_audit_logs (
      user_id, username, action, resource, resource_id,
      method, endpoint, ip_address, user_agent,
      request_data, response_data, status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
  `;

  await query(sql, [
    data.userId || null,
    data.username || null,
    data.action,
    data.resource || null,
    data.resourceId || null,
    data.method || null,
    data.endpoint || null,
    data.ipAddress || null,
    data.userAgent || null,
    data.requestData ? JSON.stringify(data.requestData) : null,
    data.responseData ? JSON.stringify(data.responseData) : null,
    data.status,
    data.errorMessage || null,
  ]);
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(options: {
  userId?: string;
  action?: string;
  status?: 'success' | 'failure' | 'error';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<AdminAuditLog[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (options.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(options.userId);
  }
  if (options.action) {
    conditions.push(`action = $${paramIndex++}`);
    values.push(options.action);
  }
  if (options.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(options.status);
  }
  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    values.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    values.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  const sql = `
    SELECT * FROM admin_audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, offset);
  const result = await query(sql, values);
  return result.rows.map(mapAuditLog);
}

// =====================================================
// ADMIN CONFIGURATION OPERATIONS
// =====================================================

/**
 * Get configuration by key
 */
export async function getAdminConfig(key: string): Promise<AdminConfig | null> {
  const sql = `SELECT * FROM admin_config WHERE key = $1;`;
  const result = await query(sql, [key]);
  return result.rows[0] ? mapAdminConfig(result.rows[0]) : null;
}

/**
 * Set configuration value
 */
export async function setAdminConfig(
  key: string,
  value: any,
  category: AdminConfig['category'],
  updatedBy: string,
  options?: {
    description?: string;
    isSensitive?: boolean;
    requiresAdmin?: boolean;
  }
): Promise<AdminConfig> {
  const existingConfig = await getAdminConfig(key);

  if (existingConfig) {
    const sql = `
      UPDATE admin_config
      SET value = $1,
          previous_value = $2,
          version = version + 1,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE key = $4
      RETURNING *;
    `;
    const result = await query(sql, [
      JSON.stringify(value),
      JSON.stringify(existingConfig.value),
      updatedBy,
      key,
    ]);
    return mapAdminConfig(result.rows[0]);
  } else {
    const sql = `
      INSERT INTO admin_config (
        key, value, category, description,
        is_sensitive, requires_admin, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await query(sql, [
      key,
      JSON.stringify(value),
      category,
      options?.description || null,
      options?.isSensitive ?? false,
      options?.requiresAdmin ?? false,
      updatedBy,
    ]);
    return mapAdminConfig(result.rows[0]);
  }
}

/**
 * Get all configuration by category
 */
export async function getAdminConfigByCategory(
  category: AdminConfig['category']
): Promise<AdminConfig[]> {
  const sql = `SELECT * FROM admin_config WHERE category = $1 ORDER BY key;`;
  const result = await query(sql, [category]);
  return result.rows.map(mapAdminConfig);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function mapAdminUser(row: any): AdminUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    canControlBot: row.can_control_bot,
    canModifyConfig: row.can_modify_config,
    canExecuteTrades: row.can_execute_trades,
    canViewLogs: row.can_view_logs,
    canViewMetrics: row.can_view_metrics,
    isActive: row.is_active,
    isLocked: row.is_locked,
    failedLoginAttempts: row.failed_login_attempts,
    lastFailedLogin: row.last_failed_login,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mfaEnabled: row.mfa_enabled,
  };
}

function mapAdminSession(row: any): AdminSession {
  return {
    id: row.id,
    userId: row.user_id,
    accessTokenHash: row.access_token_hash,
    refreshTokenHash: row.refresh_token_hash,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    expiresAt: row.expires_at,
    isValid: row.is_valid,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
    revokedAt: row.revoked_at,
    revokedReason: row.revoked_reason,
  };
}

function mapAuditLog(row: any): AdminAuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    method: row.method,
    endpoint: row.endpoint,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    requestData: row.request_data,
    responseData: row.response_data,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function mapAdminConfig(row: any): AdminConfig {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    category: row.category,
    description: row.description,
    isSensitive: row.is_sensitive,
    requiresAdmin: row.requires_admin,
    version: row.version,
    previousValue: row.previous_value,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export default {
  createAdminUser,
  getAdminUserByUsername,
  getAdminUserById,
  updateAdminUserLogin,
  unlockAdminUser,
  updateAdminUserRole,
  updateAdminUserPermissions,
  createAdminSession,
  getAdminSessionByTokenHash,
  updateSessionActivity,
  revokeAdminSession,
  revokeAllUserSessions,
  cleanExpiredSessions,
  createAuditLog,
  getAuditLogs,
  getAdminConfig,
  setAdminConfig,
  getAdminConfigByCategory,
};
