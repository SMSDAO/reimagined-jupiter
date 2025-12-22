# Admin Panel Security Documentation

## Overview

This document describes the security architecture, authentication system, and role-based access control (RBAC) implemented for the GXQ Studio admin panel at `gxq.vercel.app/administration`.

## Security Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  - Login UI with form validation                         │
│  - JWT token storage (httpOnly cookies recommended)      │
│  - Role-based UI visibility                              │
│  - Session timeout handling                              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS + JWT Bearer Token
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Authentication Middleware                   │
│  - JWT token verification                                │
│  - Permission checking                                   │
│  - Rate limiting (60 req/min per user)                   │
│  - Brute force protection (5 attempts/15 min)            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Admin API Routes                      │
│  - Input validation with bounds checking                 │
│  - SSRF prevention (URL sanitization)                    │
│  - Business logic execution                              │
│  - Audit logging for all actions                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL Database (RBAC)                    │
│  - Users, roles, and permissions                         │
│  - Refresh tokens                                        │
│  - Audit logs                                            │
│  - Configuration history                                 │
│  - Security events                                       │
└─────────────────────────────────────────────────────────┘
```

## Authentication System

### Token-Based Authentication

The system uses JWT (JSON Web Tokens) with two token types:

1. **Access Token** (Short-lived: 15 minutes)
   - Contains user ID, username, email, roles, and permissions
   - Used for API authentication via `Authorization: Bearer <token>` header
   - Automatically expires after 15 minutes

2. **Refresh Token** (Long-lived: 7 days)
   - Used to obtain new access tokens without re-authentication
   - Stored in database with revocation capability
   - Tracked with IP address and user agent

### Login Flow

```
1. User submits credentials → POST /api/admin/auth/login
2. Check rate limit (5 attempts per 15 minutes)
3. Verify username and password (bcrypt comparison)
4. Generate access token + refresh token
5. Store refresh token in database
6. Return tokens to client
7. Log successful login to audit log
```

### Security Features

- **Brute Force Protection**: Maximum 5 login attempts per 15 minutes per IP/username combination
- **Account Lockout**: After 5 failed attempts, account locked for 30 minutes
- **Password Hashing**: bcrypt with 12 rounds (slow but secure)
- **IP Tracking**: All login attempts logged with IP address
- **User Agent Tracking**: Device/browser fingerprinting

## Role-Based Access Control (RBAC)

### Default Roles

| Role | Priority | Description |
|------|----------|-------------|
| `super_admin` | 100 | Full system access including user management |
| `admin` | 90 | Full administrative access except user management |
| `operator` | 50 | Can control bot and view configurations |
| `viewer` | 10 | Read-only access to dashboard and logs |

### Permission Structure

Permissions follow the format: `resource:action`

**Resources:**
- `bot` - Bot execution control
- `config` - System configuration
- `api` - API management
- `monitoring` - Health and metrics
- `audit` - Audit logs
- `security` - Security events
- `users` - User management
- `roles` - Role management

**Actions:**
- `read` / `view` - View data
- `create` - Create new entities
- `update` / `write` - Modify existing data
- `delete` - Remove entities
- `execute` - Execute operations
- `export` - Export data

**Examples:**
- `bot:start` - Permission to start the bot
- `config:update_rpc` - Permission to update RPC endpoints
- `users:create` - Permission to create new admin users
- `audit:export` - Permission to export audit logs

### Permission Matrix

| Permission | super_admin | admin | operator | viewer |
|-----------|-------------|-------|----------|--------|
| bot:start | ✅ | ✅ | ✅ | ❌ |
| bot:emergency_stop | ✅ | ✅ | ❌ | ❌ |
| config:update_rpc | ✅ | ✅ | ❌ | ❌ |
| config:update_fees | ✅ | ✅ | ❌ | ❌ |
| config:view | ✅ | ✅ | ✅ | ✅ |
| monitoring:view_metrics | ✅ | ✅ | ✅ | ✅ |
| audit:export | ✅ | ✅ | ❌ | ❌ |
| users:create | ✅ | ❌ | ❌ | ❌ |
| users:assign_roles | ✅ | ❌ | ❌ | ❌ |

## API Endpoints

### Authentication Endpoints

#### POST /api/admin/auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "user": {
    "username": "admin",
    "email": "admin@gxq.studio",
    "roles": ["super_admin"],
    "permissions": ["bot:start", "bot:stop", ...]
  }
}
```

**Rate Limits:**
- 5 attempts per 15 minutes per IP/username
- Account locked for 30 minutes after 5 failed attempts

#### POST /api/admin/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "expiresIn": 900
}
```

#### POST /api/admin/auth/logout
Revoke refresh token and logout.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/admin/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@gxq.studio",
    "roles": ["super_admin"],
    "permissions": [...]
  }
}
```

### Bot Control Endpoints

#### POST /api/admin/control/bot
Control bot execution.

**Required Permission:** `bot:start` or `bot:stop`

**Request:**
```json
{
  "command": "start|stop|pause|resume|emergency_stop|get_status",
  "reason": "Optional reason for action"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bot started successfully",
  "command": "start",
  "status": {
    "running": true,
    "paused": false,
    "uptime": 3600,
    "lastAction": "started",
    "lastActionTime": 1234567890,
    "lastActionBy": "admin"
  }
}
```

#### GET /api/admin/control/bot
View bot status.

**Required Permission:** `bot:view_status`

### RPC Configuration Endpoints

#### POST /api/admin/control/rpc
Manage RPC endpoints.

**Required Permission:** `config:update_rpc`

**Request:**
```json
{
  "action": "add|remove|set_primary|get|test",
  "url": "https://api.mainnet-beta.solana.com",
  "name": "Public RPC",
  "priority": 1
}
```

**Security:**
- URL sanitization prevents SSRF attacks
- Only HTTPS URLs allowed
- Private IPs and localhost blocked
- Metadata endpoints blocked

### Configuration Endpoints

#### POST /api/admin/control/config
Update system configuration.

**Required Permission:** Varies by configuration key

**Request:**
```json
{
  "key": "maxGasPrice",
  "value": 5000000,
  "reason": "Reduce gas costs"
}
```

**Configuration Keys:**

| Key | Type | Min | Max | Permission |
|-----|------|-----|-----|------------|
| maxGasPrice | number | 1000 | 10000000 | config:update_fees |
| gasPriorityFee | number | 0 | 100000 | config:update_fees |
| daoSkimPercentage | number | 0.0 | 50.0 | config:update_dao_skim |
| minProfitSol | number | 0.001 | 100.0 | config:update_trading |
| maxSlippage | number | 0.001 | 0.1 | config:update_trading |

**Response:**
```json
{
  "success": true,
  "message": "Configuration 'maxGasPrice' updated successfully",
  "key": "maxGasPrice",
  "oldValue": 10000000,
  "newValue": 5000000,
  "updatedBy": "admin",
  "timestamp": "2025-01-22T00:00:00Z"
}
```

#### GET /api/admin/control/config
View configuration (filtered by permissions).

**Required Permission:** `config:view`

### Audit Log Endpoints

#### GET /api/admin/control/audit
Retrieve audit logs with filtering.

**Required Permission:** `audit:view`

**Query Parameters:**
- `userId` - Filter by user ID
- `action` - Filter by action
- `resource` - Filter by resource
- `success` - Filter by success/failure
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `page` - Page number (default: 1)
- `limit` - Results per page (max: 100, default: 50)
- `export` - Export format (`json` or `csv`) - requires `audit:export` permission

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "timestamp": "2025-01-22T00:00:00Z",
      "username": "admin",
      "action": "bot_control",
      "resource": "bot",
      "success": true,
      "ipAddress": "192.168.1.1",
      "durationMs": 45
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "hasMore": true,
    "totalPages": 20
  }
}
```

## Input Validation

All API endpoints implement comprehensive input validation:

### Validation Rules

- **Type Checking**: Validates data types (string, number, boolean, array, object)
- **Length Constraints**: Min/max length for strings
- **Numeric Bounds**: Min/max values for numbers
- **Pattern Matching**: Regular expressions for format validation
- **Enum Validation**: Restricted set of allowed values
- **Custom Validation**: Function-based validation

### Examples

```typescript
// Username validation
{
  username: {
    type: 'string',
    required: true,
    min: 3,
    max: 50,
    pattern: /^[a-zA-Z0-9_]+$/
  }
}

// Gas price validation
{
  maxGasPrice: {
    type: 'number',
    required: true,
    min: 1000,
    max: 10000000 // Hard cap at 10M lamports
  }
}

// Solana address validation
{
  walletAddress: {
    type: 'string',
    required: true,
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  }
}
```

## Security Best Practices

### For Production Deployment

1. **Environment Variables**
   ```bash
   # Required
   ADMIN_USERNAME=your_admin_username
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=<bcrypt_hash>  # Use npm run hash-password
   JWT_SECRET=<32_char_random_string>  # Use openssl rand -base64 32
   
   # Optional but recommended
   DB_HOST=your-postgres-host
   DB_NAME=gxq_studio
   DB_USER=admin_user
   DB_PASSWORD=<strong_password>
   ```

2. **Password Security**
   - Use bcrypt-hashed passwords (never plain text)
   - Minimum 12 characters
   - Include uppercase, lowercase, numbers, and special characters
   - Rotate passwords every 90 days

3. **JWT Secret**
   - At least 32 characters
   - Cryptographically random
   - Never commit to version control
   - Rotate periodically

4. **Database Security**
   - Use connection pooling
   - Enable SSL/TLS for database connections
   - Implement row-level security
   - Regular backups
   - Audit log retention policy

5. **Network Security**
   - Use HTTPS only (no HTTP)
   - Implement CORS restrictions
   - Use httpOnly cookies for tokens
   - Enable CSP headers
   - Implement CSRF protection

6. **Monitoring**
   - Set up alerts for:
     - Multiple failed login attempts
     - Unusual API access patterns
     - Configuration changes
     - Emergency stop events
   - Regular security audit log reviews
   - Automated security scanning

## Database Schema

### Key Tables

**admin_users**
- Stores user credentials and account status
- Password hashes (bcrypt)
- Failed login tracking
- Account lockout status

**admin_roles**
- Role definitions (super_admin, admin, operator, viewer)
- System roles (cannot be deleted)
- Priority for conflict resolution

**admin_permissions**
- Granular permissions (resource:action format)
- Dangerous flag for critical operations

**admin_user_roles**
- Many-to-many mapping
- Role assignments with expiration support

**admin_role_permissions**
- Many-to-many mapping
- Permission grants to roles

**admin_audit_logs**
- Complete audit trail
- Before/after values for changes
- IP and user agent tracking
- Duration tracking

**admin_refresh_tokens**
- Refresh token storage
- Revocation support
- IP and device tracking

**admin_security_events**
- Security incident tracking
- Severity levels
- Action taken records

**admin_config_history**
- Configuration change history
- Rollback capability
- Change reason tracking

## Audit Logging

All admin actions are logged with:

- **User Context**: User ID, username, roles
- **Action Details**: Action type, resource, method, endpoint
- **Result**: Success/failure, error messages
- **Changes**: Before/after values (for updates)
- **Network Context**: IP address, user agent
- **Performance**: Duration in milliseconds
- **Correlation**: Request ID, session ID

### Audit Log Retention

- Logs stored in PostgreSQL
- Indexed for fast queries
- Recommended retention: 1 year minimum
- Export capability for archival

## Compliance

### GDPR Considerations

- User data minimization
- Right to data portability (audit log export)
- Right to be forgotten (user deletion with cascade)
- Audit trail for data access

### SOC 2 Considerations

- Comprehensive audit logging
- Access control (RBAC)
- Change management (config history)
- Security monitoring (security events)

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Token expired - use refresh token
- Invalid token - re-authenticate
- Missing Authorization header

**403 Forbidden**
- Insufficient permissions - check user roles
- Account locked - wait for unlock or contact super admin

**429 Too Many Requests**
- Rate limit exceeded - wait and retry
- For login: account temporarily locked after 5 failed attempts

### Debug Mode

Set `DEBUG=true` in environment for verbose logging:
- All authentication attempts logged
- Permission checks logged
- Rate limit status logged

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] WebAuthn/FIDO2 support
- [ ] OAuth2/OpenID Connect integration
- [ ] IP whitelisting
- [ ] Geographic restrictions
- [ ] Advanced anomaly detection
- [ ] Real-time security dashboard
- [ ] Automated security reports

## Support

For security issues or questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Security Email: security@gxq.studio
- Documentation: https://github.com/SMSDAO/reimagined-jupiter/tree/main/docs

## License

This security implementation is part of the GXQ Studio project.
See LICENSE file for details.
