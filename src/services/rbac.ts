/**
 * Role-Based Access Control (RBAC) Service
 * Provides granular permission management for admin panel and API endpoints
 * 
 * Features:
 * - User authentication and authorization
 * - Role and permission management
 * - Server-side validation
 * - Audit logging for all access attempts
 */

import crypto from 'crypto';
import { verifyToken } from '../lib/auth.js';

export interface User {
  id: string;
  username: string;
  email?: string;
  primaryWallet?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  grantedBy?: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface AdminAuditEntry {
  id: string;
  userId?: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddressHash?: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export type Resource = 
  | 'WALLET' 
  | 'BOT' 
  | 'ADMIN' 
  | 'AIRDROP' 
  | 'TOKEN_LAUNCHER' 
  | 'SNIPER' 
  | 'RPC_CONFIG' 
  | 'FEE_MANAGEMENT' 
  | 'ANALYTICS' 
  | 'AUDIT_LOG';

export type Action = 
  | 'CREATE' 
  | 'READ' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'EXECUTE' 
  | 'CONFIGURE' 
  | 'APPROVE';

/**
 * RBAC Service Class
 */
export class RBACService {
  // In-memory cache for permissions (should be backed by database)
  private userPermissionsCache = new Map<string, Set<string>>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Hash sensitive data for audit logging
   */
  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate permission name
   */
  static generatePermissionName(resource: Resource, action: Action): string {
    return `${resource.toLowerCase()}.${action.toLowerCase()}`;
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    const permissionName = RBACService.generatePermissionName(resource, action);
    
    // Check cache first
    const cached = this.userPermissionsCache.get(userId);
    if (cached) {
      return cached.has(permissionName) || cached.has('*');
    }

    // In production, this would query the database:
    // 1. Get user's roles from user_roles table
    // 2. Get permissions for those roles from role_permissions table
    // 3. Check if permission exists
    
    // For now, return false (implement database queries in production)
    return false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: Resource; action: Action }>
  ): Promise<boolean> {
    for (const perm of permissions) {
      if (await this.hasPermission(userId, perm.resource, perm.action)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: Resource; action: Action }>
  ): Promise<boolean> {
    for (const perm of permissions) {
      if (!(await this.hasPermission(userId, perm.resource, perm.action))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    // In production, query database
    // SELECT r.* FROM roles r
    // JOIN user_roles ur ON r.id = ur.role_id
    // WHERE ur.user_id = $1
    // AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    
    return [];
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // In production, query database
    // SELECT DISTINCT p.* FROM permissions p
    // JOIN role_permissions rp ON p.id = rp.permission_id
    // JOIN user_roles ur ON rp.role_id = ur.role_id
    // WHERE ur.user_id = $1
    // AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    
    return [];
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    grantedBy: string,
    expiresAt?: Date
  ): Promise<UserRole> {
    // In production, insert into database
    // INSERT INTO user_roles (user_id, role_id, granted_by, expires_at)
    // VALUES ($1, $2, $3, $4)
    
    // Clear cache
    this.userPermissionsCache.delete(userId);
    
    return {
      userId,
      roleId,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
    };
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    // In production, delete from database
    // DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2
    
    // Clear cache
    this.userPermissionsCache.delete(userId);
  }

  /**
   * Create audit log entry
   */
  async createAuditEntry(
    entry: Omit<AdminAuditEntry, 'id' | 'createdAt'>
  ): Promise<AdminAuditEntry> {
    const auditEntry: AdminAuditEntry = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date(),
    };

    // In production, insert into database
    // INSERT INTO admin_audit_log (...)
    // VALUES (...)
    
    console.log(`📝 Audit: ${entry.username} ${entry.action} ${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ''} - ${entry.success ? 'SUCCESS' : 'FAILED'}`);
    
    return auditEntry;
  }

  /**
   * Audit admin action
   */
  async auditAction(
    userId: string | undefined,
    username: string,
    action: string,
    resourceType: string,
    options: {
      resourceId?: string;
      oldValue?: Record<string, any>;
      newValue?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<AdminAuditEntry> {
    return this.createAuditEntry({
      userId,
      username,
      action,
      resourceType,
      resourceId: options.resourceId,
      oldValue: options.oldValue,
      newValue: options.newValue,
      ipAddressHash: options.ipAddress ? this.hashData(options.ipAddress) : undefined,
      userAgent: options.userAgent,
      requestId: options.requestId,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    });
  }

  /**
   * Validate input for server-side operations
   */
  validateInput(input: any, schema: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = input[key];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        continue;
      }

      // Skip further validation if not required and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type check
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${key} must be of type ${rules.type}`);
        }
      }

      // String validations
      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${key} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`${key} format is invalid`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
        }
      }

      // Number validations
      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key} must be at most ${rules.max}`);
        }
      }

      // Array validations
      if (rules.type === 'array' && Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push(`${key} must have at least ${rules.minItems} items`);
        }
        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push(`${key} must have at most ${rules.maxItems} items`);
        }
      }

      // Custom validation
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(value);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract user from JWT token
   */
  extractUserFromToken(authHeader: string | undefined): { 
    valid: boolean; 
    user?: { id: string; username: string; role: string }; 
    error?: string;
  } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Authorization header missing or invalid' };
    }

    const token = authHeader.substring(7);
    const verification = verifyToken(token);

    if (!verification.valid) {
      return { valid: false, error: verification.error || 'Invalid token' };
    }

    return {
      valid: true,
      user: verification.payload,
    };
  }

  /**
   * Require authentication middleware
   */
  requireAuth(authHeader: string | undefined): { 
    authenticated: boolean; 
    user?: { id: string; username: string; role: string }; 
    error?: string;
  } {
    const result = this.extractUserFromToken(authHeader);
    
    if (!result.valid) {
      return { authenticated: false, error: result.error };
    }

    return { authenticated: true, user: result.user };
  }

  /**
   * Require permission middleware
   */
  async requirePermission(
    authHeader: string | undefined,
    resource: Resource,
    action: Action
  ): Promise<{
    authorized: boolean;
    user?: { id: string; username: string; role: string };
    error?: string;
  }> {
    const auth = this.requireAuth(authHeader);
    
    if (!auth.authenticated) {
      return { authorized: false, error: auth.error };
    }

    // Check permission
    const hasPermission = await this.hasPermission(auth.user!.id, resource, action);
    
    if (!hasPermission) {
      return { 
        authorized: false, 
        user: auth.user,
        error: `Permission denied: ${resource}.${action}` 
      };
    }

    return { authorized: true, user: auth.user };
  }
}

/**
 * Global RBAC service instance
 */
export const rbacService = new RBACService();

/**
 * Validation schemas for common inputs
 */
export const validationSchemas = {
  rpcConfig: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    rpcUrl: { required: true, type: 'string', pattern: '^https?://' },
    provider: { 
      required: true, 
      type: 'string', 
      enum: ['QUICKNODE', 'HELIUS', 'TRITON', 'ALCHEMY', 'SOLANA_MAINNET', 'CUSTOM'] 
    },
    rateLimit: { required: false, type: 'number', min: 1, max: 10000 },
  },
  feeConfig: {
    feeType: { 
      required: true, 
      type: 'string', 
      enum: ['DEV_FEE', 'PLATFORM_FEE', 'REFERRAL_FEE', 'BOT_FEE', 'AIRDROP_DONATION'] 
    },
    feePercentage: { required: true, type: 'number', min: 0, max: 1 },
    recipientWallet: { 
      required: true, 
      type: 'string', 
      minLength: 32, 
      maxLength: 44,
      validate: (value: string) => {
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
          return 'Invalid Solana address format';
        }
        return null;
      }
    },
  },
  botConfig: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    botType: { 
      required: true, 
      type: 'string', 
      enum: ['ARBITRAGE', 'SNIPER', 'FLASH_LOAN', 'TRIANGULAR', 'CUSTOM'] 
    },
    signingMode: { 
      required: true, 
      type: 'string', 
      enum: ['CLIENT_SIDE', 'SERVER_SIDE', 'ENCLAVE'] 
    },
    strategyConfig: { required: true, type: 'object' },
  },
};

export default {
  RBACService,
  rbacService,
  validationSchemas,
};
