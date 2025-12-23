# Admin Security & RBAC System

## Overview

The GXQ Studio admin panel is secured with enterprise-grade authentication, authorization, and audit logging. This document describes the security architecture and how to use the Role-Based Access Control (RBAC) system.

## Authentication

### JWT-Based Authentication

The system uses JSON Web Tokens (JWT) for stateless authentication:

- **Token Expiration**: 24 hours
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret Storage**: Environment variable `JWT_SECRET` (minimum 32 characters)

### Login Process

1. User submits credentials to `/api/admin/auth`
2. System validates username/password (supports both plain and bcrypt hashed passwords)
3. Rate limiting applied: 5 attempts per 15 minutes per IP
4. On success, JWT token issued with user claims
5. All login attempts logged with IP hash

### Password Requirements

For production deployments:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Use bcrypt hashing: `npm run hash-password`

### Rate Limiting

**Login Attempts:**
- 5 attempts per 15 minutes per IP address
- Automatic lockout after exceeding limit
- Reset after 15 minutes

**API Requests:**
- 10 executions per minute per user (configurable)
- 100 executions per hour per user (configurable)

## Authorization - RBAC System

### Role Hierarchy

The system includes 6 predefined roles:

1. **SUPER_ADMIN**
   - Full system access
   - All permissions granted
   - Can configure RPC endpoints and fee structures
   - Use sparingly, only for system administrators

2. **ADMIN**
   - Most administrative permissions
   - Cannot modify critical system configurations (RPC, fees)
   - Suitable for day-to-day admin operations

3. **MODERATOR**
   - User and content moderation
   - View analytics
   - No trading or configuration permissions

4. **BOT_MANAGER**
   - Create, configure, and manage bots
   - View bot analytics
   - Execute bot trades
   - Manage wallets

5. **TRADER**
   - Execute manual trades
   - View wallet information
   - Claim airdrops
   - Read-only bot access

6. **VIEWER**
   - Read-only access to all data
   - Cannot execute any actions
   - Useful for monitoring and auditing

### Permission Structure

Permissions follow the format: `resource.action`

**Resources:**
- `WALLET` - User wallets and sub-wallets
- `BOT` - Trading bots
- `ADMIN` - Admin panel access
- `AIRDROP` - Airdrop eligibility and claims
- `TOKEN_LAUNCHER` - Token creation
- `SNIPER` - Sniper bot operations
- `RPC_CONFIG` - RPC endpoint configuration
- `FEE_MANAGEMENT` - Fee structure configuration
- `ANALYTICS` - System analytics
- `AUDIT_LOG` - Audit trail access

**Actions:**
- `CREATE` - Create new resources
- `READ` - View resource data
- `UPDATE` - Modify existing resources
- `DELETE` - Remove resources
- `EXECUTE` - Execute operations (trades, claims, etc.)
- `CONFIGURE` - Change configuration settings
- `APPROVE` - Approve pending actions

### Permission Examples

```typescript
// Check if user can create bots
await rbacService.hasPermission(userId, 'BOT', 'CREATE');

// Check if user can configure RPC
await rbacService.hasPermission(userId, 'RPC_CONFIG', 'CONFIGURE');

// Check if user can execute trades
await rbacService.hasPermission(userId, 'BOT', 'EXECUTE');
```

### Assigning Roles

Roles are assigned by SUPER_ADMIN or ADMIN users:

```typescript
await rbacService.assignRole(
  userId,           // User receiving the role
  roleId,           // Role to assign
  grantedBy,        // Admin assigning the role
  expiresAt         // Optional: role expiration date
);
```

### Role Expiration

Roles can have expiration dates for temporary access:
- Useful for contractors or temporary staff
- Automatically revoked after expiration
- No manual cleanup required

## Audit Logging

### Admin Audit Log

Every admin action is logged with comprehensive metadata:

**Logged Information:**
- User ID and username
- Action performed
- Resource type and ID
- Old and new values (for updates)
- IP address (hashed with SHA-256)
- User agent
- Request ID for correlation
- Success/failure status
- Error messages (if applicable)
- Timestamp

**Example Audit Entry:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "username": "admin@gxq.com",
  "action": "UPDATE_FEE_CONFIG",
  "resourceType": "FEE_MANAGEMENT",
  "resourceId": "fee-uuid",
  "oldValue": { "feePercentage": 0.10 },
  "newValue": { "feePercentage": 0.15 },
  "ipAddressHash": "sha256-hash",
  "success": true,
  "createdAt": "2025-12-23T00:00:00.000Z"
}
```

### Wallet Audit Log

All wallet operations are tracked:

**Logged Operations:**
- `LOGIN` - User login with wallet
- `KEY_DECRYPT` - Private key decryption
- `TRANSACTION_SIGN` - Transaction signing
- `TRANSFER` - Token transfers
- `SWAP` - Token swaps
- `STAKE` - Staking operations
- `UNSTAKE` - Unstaking operations
- `CLAIM` - Airdrop claims
- `BOT_EXECUTION` - Bot trade executions

**Security Metadata:**
- IP address (hashed)
- Browser fingerprint (hashed)
- Transaction signature
- Success/failure status

### Bot Audit Log

Bot configuration changes are tracked:

**Actions:**
- `CREATED` - Bot created
- `UPDATED` - Bot configuration updated
- `ACTIVATED` - Bot activated
- `DEACTIVATED` - Bot deactivated
- `PAUSED` - Bot paused
- `RESUMED` - Bot resumed
- `DELETED` - Bot deleted
- `CONFIG_CHANGED` - Strategy configuration changed
- `WALLET_CHANGED` - Wallet assignment changed

## Server-Side Validation

### Input Validation

All admin endpoints validate inputs server-side:

**RPC Configuration:**
```typescript
{
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  rpcUrl: { required: true, type: 'string', pattern: '^https?://' },
  provider: { required: true, type: 'string', enum: [...] },
  rateLimit: { required: false, type: 'number', min: 1, max: 10000 }
}
```

**Fee Configuration:**
```typescript
{
  feeType: { required: true, type: 'string', enum: [...] },
  feePercentage: { required: true, type: 'number', min: 0, max: 1 },
  recipientWallet: { required: true, type: 'string', validate: isSolanaAddress }
}
```

**Bot Configuration:**
```typescript
{
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  botType: { required: true, type: 'string', enum: [...] },
  signingMode: { required: true, type: 'string', enum: [...] },
  strategyConfig: { required: true, type: 'object' }
}
```

### Validation Response

Validation errors return detailed information:

```json
{
  "success": false,
  "errors": [
    "rpcUrl format is invalid",
    "feePercentage must be between 0 and 1",
    "recipientWallet is invalid Solana address"
  ]
}
```

## Secure API Endpoints

### Admin Routes

All admin routes require authentication and authorization:

**Pattern:**
```typescript
// 1. Authenticate user
const auth = rbacService.requireAuth(req.headers.authorization);
if (!auth.authenticated) {
  return res.status(401).json({ error: auth.error });
}

// 2. Check permissions
const hasPermission = await rbacService.hasPermission(
  auth.user.id,
  'RESOURCE',
  'ACTION'
);
if (!hasPermission) {
  return res.status(403).json({ error: 'Permission denied' });
}

// 3. Validate input
const validation = rbacService.validateInput(req.body, schema);
if (!validation.valid) {
  return res.status(400).json({ errors: validation.errors });
}

// 4. Execute operation
// ...

// 5. Audit log
await rbacService.auditAction(
  auth.user.id,
  auth.user.username,
  'ACTION',
  'RESOURCE',
  { /* ... */ }
);
```

### Protected Endpoints

**RPC Configuration:**
- `GET /api/admin/rpc` - Read RPC config (requires: `RPC_CONFIG.READ`)
- `POST /api/admin/rpc` - Create RPC endpoint (requires: `RPC_CONFIG.CONFIGURE`)
- `PUT /api/admin/rpc/:id` - Update RPC endpoint (requires: `RPC_CONFIG.CONFIGURE`)
- `DELETE /api/admin/rpc/:id` - Delete RPC endpoint (requires: `RPC_CONFIG.CONFIGURE`)

**Fee Management:**
- `GET /api/admin/fees` - Read fee config (requires: `FEE_MANAGEMENT.READ`)
- `PUT /api/admin/fees/:id` - Update fees (requires: `FEE_MANAGEMENT.CONFIGURE`)

**Bot Control:**
- `GET /api/admin/bots` - List bots (requires: `BOT.READ`)
- `POST /api/admin/bots` - Create bot (requires: `BOT.CREATE`)
- `PUT /api/admin/bots/:id` - Update bot (requires: `BOT.UPDATE`)
- `DELETE /api/admin/bots/:id` - Delete bot (requires: `BOT.DELETE`)
- `POST /api/admin/bots/:id/execute` - Execute bot (requires: `BOT.EXECUTE`)

## Security Best Practices

### Environment Variables

**Required:**
```bash
JWT_SECRET=your_32_character_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me_in_production
```

**Generate Secure Secret:**
```bash
openssl rand -base64 32
```

**Hash Password:**
```bash
npm run hash-password
# Enter your password when prompted
# Copy the bcrypt hash to ADMIN_PASSWORD
```

### Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters, random)
- [ ] Use bcrypt hashed passwords
- [ ] Enable HTTPS only
- [ ] Configure proper CORS
- [ ] Set up rate limiting at load balancer
- [ ] Monitor audit logs regularly
- [ ] Rotate secrets every 90 days
- [ ] Use separate admin accounts (no shared credentials)
- [ ] Enable 2FA for RPC provider accounts
- [ ] Implement IP whitelisting for admin panel
- [ ] Set up alerts for failed login attempts
- [ ] Regular security audits
- [ ] Keep dependencies updated

### Common Threats & Mitigations

**Brute Force Attacks:**
- ✅ Rate limiting (5 attempts / 15 min)
- ✅ Account lockout
- ✅ IP-based tracking

**Session Hijacking:**
- ✅ Short token expiration (24h)
- ✅ Token verification on every request
- ✅ Secure token storage (client-side)

**Replay Attacks:**
- ✅ 4-layer protection system
- ✅ Unique nonces
- ✅ Transaction hash deduplication
- ✅ Timestamp validation
- ✅ Rate limiting

**Privilege Escalation:**
- ✅ Granular RBAC
- ✅ Server-side authorization
- ✅ Permission checks on every action
- ✅ Audit logging

**SQL Injection:**
- ✅ Parameterized queries
- ✅ Input validation
- ✅ Type safety with TypeScript

**XSS (Cross-Site Scripting):**
- ✅ Input sanitization
- ✅ Output encoding
- ✅ Content Security Policy

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Failed login attempts** - Alert on >10 per hour
2. **Permission denied errors** - Alert on suspicious patterns
3. **Unusual admin actions** - Review high-risk operations
4. **Audit log gaps** - Ensure logging is functional
5. **Token generation rate** - Detect token farming
6. **Rate limit hits** - Identify potential abuse

### Log Retention

- **Admin Audit Log**: 1 year minimum
- **Wallet Audit Log**: 2 years minimum
- **Bot Audit Log**: 1 year minimum
- **Authentication Logs**: 90 days minimum

## Troubleshooting

### Invalid Token Error

**Causes:**
- Token expired (24h limit)
- Invalid JWT_SECRET
- Token tampering

**Solution:**
- Re-login to get new token
- Verify JWT_SECRET is configured
- Check token format (Bearer <token>)

### Permission Denied

**Causes:**
- Insufficient role permissions
- Role expired
- User deactivated

**Solution:**
- Check user's assigned roles
- Verify role has required permission
- Check role expiration date
- Ensure user account is active

### Rate Limit Exceeded

**Causes:**
- Too many requests in time window
- Shared IP address (proxy/VPN)

**Solution:**
- Wait for rate limit reset
- Reduce request frequency
- Contact admin to adjust limits

## Support

For security concerns or questions:
- **Email**: security@gxq.studio
- **Issue Tracker**: https://github.com/SMSDAO/reimagined-jupiter/issues
- **Documentation**: https://docs.gxq.studio

**Security Vulnerability Reporting:**
Please report security vulnerabilities privately via email, not through public issue tracker.
