/**
 * Admin Database Module
 * Handles all database operations for admin authentication, RBAC, and audit logging
 * 
 * Security Features:
 * - Parameterized queries (SQL injection prevention)
 * - Password hashing with bcrypt
 * - Audit logging for all operations
 * - Role-based access control (RBAC)
 * - Session management with refresh tokens
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Use existing pool from database.ts
import { query as dbQuery, getClient } from './database.js';

/**
 * Password hashing configuration
 */
const BCRYPT_ROUNDS = 12; // Secure but not too slow

/**
 * Admin User Interface
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  lockedUntil?: Date;
  lastLogin?: Date;
  lastActivity?: Date;
  passwordChangedAt: Date;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  recoveryCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role Interface
 */
export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission Interface
 */
export interface AdminPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  isDangerous: boolean;
  createdAt: Date;
}

/**
 * Audit Log Interface
 */
export interface AuditLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  oldValue?: any;
  newValue?: any;
  changes?: any;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  timestamp: Date;
  durationMs?: number;
  metadata?: any;
}

/**
 * Refresh Token Interface
 */
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt?: Date;
}

// =====================================================
// USER MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Create a new admin user
 */
export async function createAdminUser(data: {
  username: string;
  email: string;
  password: string;
  roleIds: string[];
  createdBy?: string;
}): Promise<AdminUser> {
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Insert user
    const userResult = await client.query(
      `INSERT INTO admin_users (username, email, password_hash, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.username, data.email, passwordHash, data.createdBy || null]
    );
    
    const user = userResult.rows[0];
    
    // Assign roles
    for (const roleId of data.roleIds) {
      await client.query(
        `INSERT INTO admin_user_roles (user_id, role_id, granted_by)
         VALUES ($1, $2, $3)`,
        [user.id, roleId, data.createdBy || null]
      );
    }
    
    await client.query('COMMIT');
    return mapUserRow(user);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get admin user by username
 */
export async function getAdminUserByUsername(username: string): Promise<AdminUser | null> {
  const result = await dbQuery(
    'SELECT * FROM admin_users WHERE username = $1',
    [username]
  );
  
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

/**
 * Get admin user by ID
 */
export async function getAdminUserById(userId: string): Promise<AdminUser | null> {
  const result = await dbQuery(
    'SELECT * FROM admin_users WHERE id = $1',
    [userId]
  );
  
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

/**
 * Update user last login
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  await dbQuery(
    `UPDATE admin_users 
     SET last_login = CURRENT_TIMESTAMP,
         last_activity = CURRENT_TIMESTAMP,
         failed_login_attempts = 0
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Increment failed login attempts
 */
export async function incrementFailedLoginAttempts(userId: string): Promise<void> {
  await dbQuery(
    `UPDATE admin_users 
     SET failed_login_attempts = failed_login_attempts + 1,
         last_failed_login = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Lock user account
 */
export async function lockUserAccount(userId: string, durationMinutes: number = 30): Promise<void> {
  await dbQuery(
    `UPDATE admin_users 
     SET is_locked = TRUE,
         locked_until = CURRENT_TIMESTAMP + INTERVAL '${durationMinutes} minutes'
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Unlock user account
 */
export async function unlockUserAccount(userId: string): Promise<void> {
  await dbQuery(
    `UPDATE admin_users 
     SET is_locked = FALSE,
         locked_until = NULL,
         failed_login_attempts = 0
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Verify user password
 */
export async function verifyUserPassword(username: string, password: string): Promise<AdminUser | null> {
  const user = await getAdminUserByUsername(username);
  
  if (!user) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  return user;
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  await dbQuery(
    `UPDATE admin_users 
     SET password_hash = $1,
         password_changed_at = CURRENT_TIMESTAMP,
         must_change_password = FALSE
     WHERE id = $2`,
    [passwordHash, userId]
  );
}

// =====================================================
// RBAC FUNCTIONS
// =====================================================

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: string): Promise<AdminPermission[]> {
  const result = await dbQuery(
    `SELECT DISTINCT p.*
     FROM admin_user_permissions up
     JOIN admin_permissions p ON up.permission_name = p.name
     WHERE up.user_id = $1`,
    [userId]
  );
  
  return result.rows.map(mapPermissionRow);
}

/**
 * Check if user has permission
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const result = await dbQuery(
    'SELECT admin_has_permission($1, $2) AS has_permission',
    [userId, permissionName]
  );
  
  return result.rows[0]?.has_permission || false;
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
  for (const permission of permissionNames) {
    if (await hasPermission(userId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
  for (const permission of permissionNames) {
    if (!(await hasPermission(userId, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string): Promise<AdminRole[]> {
  const result = await dbQuery(
    `SELECT r.*
     FROM admin_roles r
     JOIN admin_user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1
       AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)`,
    [userId]
  );
  
  return result.rows.map(mapRoleRow);
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: string): Promise<AdminRole | null> {
  const result = await dbQuery(
    'SELECT * FROM admin_roles WHERE name = $1',
    [roleName]
  );
  
  return result.rows.length > 0 ? mapRoleRow(result.rows[0]) : null;
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<AdminRole[]> {
  const result = await dbQuery(
    'SELECT * FROM admin_roles ORDER BY priority DESC, name'
  );
  
  return result.rows.map(mapRoleRow);
}

/**
 * Get all permissions
 */
export async function getAllPermissions(): Promise<AdminPermission[]> {
  const result = await dbQuery(
    'SELECT * FROM admin_permissions ORDER BY resource, action'
  );
  
  return result.rows.map(mapPermissionRow);
}

// =====================================================
// AUDIT LOGGING FUNCTIONS
// =====================================================

/**
 * Create audit log entry
 */
export async function createAuditLog(data: {
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  oldValue?: any;
  newValue?: any;
  changes?: any;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  durationMs?: number;
  metadata?: any;
}): Promise<string> {
  const result = await dbQuery(
    `INSERT INTO admin_audit_logs (
      user_id, username, action, resource, method, endpoint, status_code,
      old_value, new_value, changes, success, error_message,
      ip_address, user_agent, request_id, session_id, duration_ms, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id`,
    [
      data.userId || null,
      data.username || null,
      data.action,
      data.resource,
      data.method || null,
      data.endpoint || null,
      data.statusCode || null,
      data.oldValue ? JSON.stringify(data.oldValue) : null,
      data.newValue ? JSON.stringify(data.newValue) : null,
      data.changes ? JSON.stringify(data.changes) : null,
      data.success,
      data.errorMessage || null,
      data.ipAddress || null,
      data.userAgent || null,
      data.requestId || null,
      data.sessionId || null,
      data.durationMs || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  
  return result.rows[0].id;
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 1;
  
  if (filters.userId) {
    conditions.push(`user_id = $${paramCount++}`);
    params.push(filters.userId);
  }
  
  if (filters.action) {
    conditions.push(`action = $${paramCount++}`);
    params.push(filters.action);
  }
  
  if (filters.resource) {
    conditions.push(`resource = $${paramCount++}`);
    params.push(filters.resource);
  }
  
  if (filters.success !== undefined) {
    conditions.push(`success = $${paramCount++}`);
    params.push(filters.success);
  }
  
  if (filters.startDate) {
    conditions.push(`timestamp >= $${paramCount++}`);
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    conditions.push(`timestamp <= $${paramCount++}`);
    params.push(filters.endDate);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await dbQuery(
    `SELECT COUNT(*) AS total FROM admin_audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get logs with pagination
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  
  const logsResult = await dbQuery(
    `SELECT * FROM admin_audit_logs ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramCount++} OFFSET $${paramCount}`,
    [...params, limit, offset]
  );
  
  return {
    logs: logsResult.rows.map(mapAuditLogRow),
    total,
  };
}

// =====================================================
// REFRESH TOKEN FUNCTIONS
// =====================================================

/**
 * Create refresh token
 */
export async function createRefreshToken(data: {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
  
  const result = await dbQuery(
    `INSERT INTO admin_refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.userId, tokenHash, data.expiresAt, data.ipAddress || null, data.userAgent || null]
  );
  
  return result.rows[0].id;
}

/**
 * Get refresh token by token string
 */
export async function getRefreshTokenByToken(token: string): Promise<RefreshToken | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const result = await dbQuery(
    `SELECT * FROM admin_refresh_tokens 
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP`,
    [tokenHash]
  );
  
  return result.rows.length > 0 ? mapRefreshTokenRow(result.rows[0]) : null;
}

/**
 * Update refresh token last used
 */
export async function updateRefreshTokenLastUsed(tokenId: string): Promise<void> {
  await dbQuery(
    `UPDATE admin_refresh_tokens 
     SET last_used_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [tokenId]
  );
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(tokenId: string, revokedBy?: string, reason?: string): Promise<void> {
  await dbQuery(
    `UPDATE admin_refresh_tokens 
     SET revoked_at = CURRENT_TIMESTAMP,
         revoked_by = $2,
         revoke_reason = $3
     WHERE id = $1`,
    [tokenId, revokedBy || null, reason || null]
  );
}

/**
 * Revoke all user tokens
 */
export async function revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
  await dbQuery(
    `UPDATE admin_refresh_tokens 
     SET revoked_at = CURRENT_TIMESTAMP,
         revoke_reason = $2
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId, reason || null]
  );
}

// =====================================================
// SECURITY EVENTS FUNCTIONS
// =====================================================

/**
 * Create security event
 */
export async function createSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  username?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  actionTaken?: string;
  metadata?: any;
}): Promise<string> {
  const result = await dbQuery(
    `INSERT INTO admin_security_events (
      event_type, severity, user_id, username, description,
      ip_address, user_agent, action_taken, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      data.eventType,
      data.severity,
      data.userId || null,
      data.username || null,
      data.description,
      data.ipAddress || null,
      data.userAgent || null,
      data.actionTaken || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  
  return result.rows[0].id;
}

// =====================================================
// CONFIGURATION HISTORY FUNCTIONS
// =====================================================

/**
 * Create configuration history entry
 */
export async function createConfigHistory(data: {
  configKey: string;
  oldValue?: any;
  newValue: any;
  changedBy: string;
  changeReason?: string;
}): Promise<string> {
  const result = await dbQuery(
    `INSERT INTO admin_config_history (config_key, old_value, new_value, changed_by, change_reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      data.configKey,
      data.oldValue ? JSON.stringify(data.oldValue) : null,
      JSON.stringify(data.newValue),
      data.changedBy,
      data.changeReason || null,
    ]
  );
  
  return result.rows[0].id;
}

/**
 * Get configuration history
 */
export async function getConfigHistory(configKey: string, limit: number = 50): Promise<any[]> {
  const result = await dbQuery(
    `SELECT * FROM admin_config_history
     WHERE config_key = $1
       AND is_active = TRUE
     ORDER BY changed_at DESC
     LIMIT $2`,
    [configKey, limit]
  );
  
  return result.rows;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function mapUserRow(row: any): AdminUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    isLocked: row.is_locked,
    failedLoginAttempts: row.failed_login_attempts,
    lastFailedLogin: row.last_failed_login,
    lockedUntil: row.locked_until,
    lastLogin: row.last_login,
    lastActivity: row.last_activity,
    passwordChangedAt: row.password_changed_at,
    mustChangePassword: row.must_change_password,
    twoFactorEnabled: row.two_factor_enabled,
    twoFactorSecret: row.two_factor_secret,
    recoveryCodes: row.recovery_codes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoleRow(row: any): AdminRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystemRole: row.is_system_role,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPermissionRow(row: any): AdminPermission {
  return {
    id: row.id,
    name: row.name,
    resource: row.resource,
    action: row.action,
    description: row.description,
    isDangerous: row.is_dangerous,
    createdAt: row.created_at,
  };
}

function mapAuditLogRow(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    action: row.action,
    resource: row.resource,
    method: row.method,
    endpoint: row.endpoint,
    statusCode: row.status_code,
    oldValue: row.old_value,
    newValue: row.new_value,
    changes: row.changes,
    success: row.success,
    errorMessage: row.error_message,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    requestId: row.request_id,
    sessionId: row.session_id,
    timestamp: row.timestamp,
    durationMs: row.duration_ms,
    metadata: row.metadata,
  };
}

function mapRefreshTokenRow(row: any): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    revokeReason: row.revoke_reason,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    lastUsedAt: row.last_used_at,
  };
}

export default {
  // User management
  createAdminUser,
  getAdminUserByUsername,
  getAdminUserById,
  updateUserLastLogin,
  incrementFailedLoginAttempts,
  lockUserAccount,
  unlockUserAccount,
  verifyUserPassword,
  updateUserPassword,
  
  // RBAC
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserRoles,
  getRoleByName,
  getAllRoles,
  getAllPermissions,
  
  // Audit logging
  createAuditLog,
  getAuditLogs,
  
  // Refresh tokens
  createRefreshToken,
  getRefreshTokenByToken,
  updateRefreshTokenLastUsed,
  revokeRefreshToken,
  revokeAllUserTokens,
  
  // Security events
  createSecurityEvent,
  
  // Configuration history
  createConfigHistory,
  getConfigHistory,
};
