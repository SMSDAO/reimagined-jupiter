# Admin Panel Security Documentation

## Overview

The GXQ Studio admin panel (`gxq.vercel.app/administration`) has been hardened with comprehensive security controls including:

- **Authentication**: JWT-based with bcrypt password hashing
- **Authorization**: Role-Based Access Control (RBAC)
- **Audit Logging**: All admin actions logged with IP tracking
- **Input Validation**: Server-side validation on all endpoints
- **Rate Limiting**: Protection against brute force attacks
- **Session Management**: Secure token storage and expiration

## Security Architecture

### 1. Authentication Flow

```
User Login → Input Validation → Rate Limit Check → Password Verification
    ↓
JWT Token Generation → Session Creation → Token Storage → Redirect to Admin
    ↓
Periodic Session Verification → Token Refresh → Session Renewal
    ↓
User Logout → Session Invalidation → Token Cleanup
```

### 2. Database Schema

**Admin Users Table** (`admin_users`)
- Stores user credentials with bcrypt hashed passwords
- Role field: `admin`, `operator`, `viewer`
- Permission flags for granular access control
- Account locking after 5 failed login attempts
- MFA support (ready for implementation)

**Admin Sessions Table** (`admin_sessions`)
- Tracks active sessions with token hashes
- IP address and user agent logging
- Session expiration and revocation support
- Last activity tracking

**Admin Audit Logs Table** (`admin_audit_logs`)
- Complete audit trail of all admin actions
- Request/response data (sanitized)
- Success/failure status tracking
- IP and user agent recording

**Admin Configuration Table** (`admin_config`)
- Versioned configuration storage
- Category-based organization (rpc, fees, dao, bot, security)
- Previous value tracking for rollback
- Sensitive data flag for extra protection

## Authentication & Authorization

### JWT Token Structure

**Access Token Payload:**
```json
{
  "userId": "admin-1",
  "username": "admin",
  "role": "admin",
  "sessionId": "uuid",
  "canControlBot": true,
  "canModifyConfig": true,
  "canExecuteTrades": true,
  "canViewLogs": true,
  "canViewMetrics": true,
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Token Expiration:**
- Access Token: 24 hours
- Refresh Token: 7 days (ready for implementation)

### Role-Based Access Control (RBAC)

**Admin Role:**
- Full system access
- All permissions enabled
- Can create/modify other admin users
- Can change system configuration

**Operator Role:**
- Bot control permissions
- Trade execution permissions
- View metrics and logs
- Cannot modify system configuration

**Viewer Role:**
- Read-only access
- View metrics and logs only
- Cannot control bot or modify settings

### Permission Matrix

| Action | Admin | Operator | Viewer |
|--------|-------|----------|--------|
| View Metrics | ✓ | ✓ | ✓ |
| View Logs | ✓ | ✓ | ✓ |
| Control Bot | ✓ | ✓ | ✗ |
| Execute Trades | ✓ | ✓ | ✗ |
| Modify Config | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ |

## API Endpoints

### Authentication Endpoints

**POST /api/admin/auth/login**
- Rate limit: 5 attempts per 15 minutes per IP
- Input validation: username (3-100 chars), password (8+ chars)
- Returns: JWT access token, refresh token, user info
- Logs: Login attempts (success/failure)

**POST /api/admin/auth/logout**
- Requires: Valid JWT token
- Action: Invalidates session
- Logs: Logout action

**GET /api/admin/auth/verify**
- Requires: Valid JWT token
- Returns: User info and session status
- Used for: Session validation

### Configuration Endpoints

**GET/POST /api/admin/config/rpc**
- Permission: `canModifyConfig` (POST), `canViewMetrics` (GET)
- Manages: RPC endpoint configuration
- Validation: URL format validation
- Logs: All configuration changes

**GET/POST /api/admin/config/fees**
- Permission: `canModifyConfig` (POST), `canViewMetrics` (GET)
- Manages: Transaction fees and priority fees
- **Security**: Hard cap of 10M lamports (0.01 SOL) enforced
- Validation: Numeric ranges, max fee cap
- Logs: All fee changes

**GET/POST /api/admin/config/dao**
- Permission: `canModifyConfig` (POST), `canViewMetrics` (GET)
- Manages: DAO skimming percentage and wallets
- Validation: Percentage (0-100), Solana address format
- Logs: All DAO config changes

### Bot Control Endpoints

**POST /api/admin/bot/control**
- Permission: `canControlBot`
- Commands: start, stop, pause, resume, emergency-stop
- Validation: Command type validation
- Logs: All bot control actions

**GET /api/admin/bot/status**
- Permission: `canViewMetrics`
- Returns: Bot status, SDK health, performance metrics
- Includes: RPC latency, Jupiter status, Pyth status

## Security Features

### 1. Input Validation

All API endpoints validate:
- Required fields presence
- Data type correctness
- String length constraints
- Format validation (URLs, addresses)
- Numeric ranges

### 2. Rate Limiting

**Authentication Rate Limit:**
- 5 login attempts per 15 minutes per IP
- Automatic lockout after exceeding limit
- Clear error messages

**API Rate Limit:**
- 100 requests per minute per session
- Applies to all authenticated endpoints

### 3. Audit Logging

All admin actions are logged with:
- User ID and username
- Action type and resource
- Request and response data (sanitized)
- IP address and user agent
- Timestamp
- Success/failure status

**Sensitive Data Handling:**
Passwords, private keys, and secrets are:
- Never logged in plaintext
- Replaced with `[REDACTED]` in logs
- Stored as bcrypt hashes in database

### 4. Session Management

**Session Security:**
- JWT tokens stored in localStorage (HTTPS only)
- Session validation on every request
- Automatic session expiration
- Manual session revocation on logout
- IP tracking for security monitoring

**Token Security:**
- HMAC SHA256 signing
- Secret key from environment variable
- Token rotation on refresh (ready for implementation)

### 5. HTTPS Requirements

**Production Deployment:**
- HTTPS mandatory for admin panel
- Secure cookie flags (when using cookies)
- HSTS headers recommended
- TLS 1.2+ required

## Configuration

### Environment Variables

```bash
# Admin authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$2b$10$... # bcrypt hash recommended
JWT_SECRET=<32+ character secret>

# Session configuration
ADMIN_SESSION_TIMEOUT=24  # hours
ADMIN_REFRESH_TOKEN_DAYS=7  # days

# Fee limits (security)
MAX_PRIORITY_FEE=10000000  # 10M lamports = 0.01 SOL

# DAO configuration
DEV_FEE_PERCENTAGE=0.10  # 10%
DAO_SKIMMING_PERCENTAGE=5  # 5%
DAO_WALLET_ADDRESS=<Solana public key>
DEV_FEE_WALLET=<Solana public key>
```

### Password Hashing

**Generate bcrypt hash:**
```javascript
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash('your_password', 10);
```

Or use the provided utility:
```bash
npm run hash-password
```

### JWT Secret Generation

**Generate secure secret:**
```bash
openssl rand -base64 32
```

Or:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Production Deployment Checklist

- [ ] Change default admin password
- [ ] Use bcrypt hashed password
- [ ] Generate strong JWT secret (32+ chars)
- [ ] Enable HTTPS on deployment
- [ ] Configure database for session storage
- [ ] Set up database backups
- [ ] Enable audit log retention
- [ ] Configure rate limiting
- [ ] Set up monitoring alerts
- [ ] Review and test all permissions
- [ ] Test emergency stop functionality
- [ ] Verify 10M lamport fee cap
- [ ] Test session expiration
- [ ] Verify logout clears all tokens

## Database Setup

**Initialize database:**
```bash
psql -U postgres -d gxq_studio -f db/schema.sql
```

**Create admin user:**
```sql
INSERT INTO admin_users (
  username, email, password_hash, role,
  can_control_bot, can_modify_config, can_execute_trades,
  can_view_logs, can_view_metrics
) VALUES (
  'admin',
  'admin@gxqstudio.com',
  '$2b$10$rKVqQ5J8c.XN1C2qVb.jjO4xP7J6qh4XY8TgS9Y1j2xYpQ9Z3w4jm',
  'admin',
  TRUE, TRUE, TRUE, TRUE, TRUE
);
```

**Clean expired sessions (run periodically):**
```sql
SELECT clean_expired_sessions();
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Failed Login Attempts**
   - Alert on >10 failed attempts per hour
   - Investigate source IP

2. **Bot Control Actions**
   - Log all start/stop commands
   - Alert on emergency stops

3. **Configuration Changes**
   - Notify on all config modifications
   - Track who made changes

4. **Session Activity**
   - Monitor active sessions
   - Alert on suspicious patterns

5. **API Rate Limiting**
   - Track rate limit hits
   - Investigate repeat offenders

### Audit Log Queries

**Recent failed logins:**
```sql
SELECT * FROM admin_audit_logs
WHERE action = 'login_attempt'
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Recent config changes:**
```sql
SELECT * FROM admin_audit_logs
WHERE action LIKE '%_config'
  AND status = 'success'
ORDER BY created_at DESC
LIMIT 10;
```

**Active sessions:**
```sql
SELECT 
  s.id,
  u.username,
  s.ip_address,
  s.created_at,
  s.last_activity
FROM admin_sessions s
JOIN admin_users u ON s.user_id = u.id
WHERE s.is_valid = TRUE
  AND s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

## Security Best Practices

1. **Change Default Credentials**
   - Never use default admin/password
   - Use strong, unique passwords

2. **Rotate Secrets Regularly**
   - JWT secrets every 90 days
   - API keys every 180 days

3. **Monitor Audit Logs**
   - Review logs daily
   - Set up automated alerts

4. **Limit Admin Access**
   - Follow principle of least privilege
   - Use viewer role when possible

5. **Keep Software Updated**
   - Regular dependency updates
   - Security patch monitoring

6. **Backup Strategy**
   - Daily database backups
   - Secure backup storage
   - Test restore procedures

7. **Incident Response**
   - Have emergency contact list
   - Document incident procedures
   - Practice emergency stops

## Troubleshooting

### Cannot Login

1. Check credentials in `.env`
2. Verify JWT_SECRET is set
3. Check rate limiting (wait 15 minutes)
4. Review audit logs for errors

### Session Expired

1. Sessions expire after 24 hours
2. Re-login required
3. Refresh token implementation can extend this

### Permission Denied

1. Verify user role and permissions
2. Check JWT token payload
3. Review permission matrix

### Bot Control Not Working

1. Verify `canControlBot` permission
2. Check bot status API endpoint
3. Review server logs for errors

## Support

For security issues or questions:
- Email: security@gxqstudio.com
- GitHub Issues: SMSDAO/reimagined-jupiter
- Documentation: See SECURITY_GUIDE.md

**For security vulnerabilities:**
- DO NOT open public issues
- Email security@gxqstudio.com directly
- Include detailed reproduction steps
