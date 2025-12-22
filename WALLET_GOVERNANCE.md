# Wallet Governance & Execution System

## Overview

The GXQ Studio Wallet Governance system provides secure management of sub-wallets for arbitrage operations. It implements comprehensive security measures including encryption, audit logging, and access control.

## Key Features

### 1. Sub-Wallet Management
- **Limit**: Up to 3 sub-wallets per user
- **GXQ-Ending Keys**: All sub-wallet public keys end with "GXQ" for easy identification
- **Operations**: Create, import, export, and manage sub-wallets
- **Balance Tracking**: Real-time SOL balance monitoring

### 2. Security Features

#### Encryption at Rest
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Storage**: Master encryption key stored in environment variables
- **Private Keys**: Never stored in plain text
- **In-Memory Usage**: Keys only decrypted temporarily for transaction signing

#### Authentication
- **Wallet-Based**: Uses Solana signature verification
- **JWT Tokens**: Secure session management
- **Device Fingerprinting**: Tracks login sessions by hashed device fingerprint
- **IP Tracking**: Logs hashed IP addresses for audit

#### Audit Logging
- **Comprehensive**: All wallet operations logged
- **Event Types**: 
  - `wallet_created`: New sub-wallet generated
  - `wallet_imported`: Existing wallet imported
  - `wallet_exported`: Private key exported
  - `trade_executed`: Arbitrage trade completed
  - `trade_failed`: Trade execution failed
  - `user_login`: User authenticated
  - `balance_check`: Balance verification performed

### 3. Pre-Execution Checks
- **Minimum Balance**: 0.05 SOL required for operations
- **Warnings**: UI alerts when balance insufficient
- **Automatic Verification**: Balance checked before trade execution

## Architecture

### Database Schema

#### `users` Table
Tracks user logins and session information:
- `wallet_public_key`: User's main wallet
- `ip_hash`: SHA-256 hash of IP address
- `device_fingerprint_hash`: SHA-256 hash of device fingerprint
- `last_login`: Timestamp of last login
- `login_count`: Total number of logins

#### `sub_wallets` Table
Manages arbitrage sub-wallets:
- `user_id`: Foreign key to users
- `public_key`: Wallet public key (ends with "GXQ")
- `wallet_name`: User-defined name
- `wallet_index`: Index (1-3)
- `last_balance_sol`: Cached balance
- `total_trades`: Trade counter
- `total_profit_sol`: Cumulative profit

#### `wallet_keys` Table
Secure storage for encrypted private keys:
- `sub_wallet_id`: Foreign key to sub_wallets
- `encrypted_private_key`: AES-256-GCM encrypted key
- `encryption_iv`: Initialization vector
- `encryption_tag`: Authentication tag
- `last_used`: Usage timestamp

#### `wallet_audit_log` Table
Comprehensive audit trail:
- `user_id`: User performing action
- `sub_wallet_id`: Wallet involved
- `event_type`: Type of event
- `event_action`: Specific action
- `ip_hash`: Hashed IP address
- `device_fingerprint_hash`: Hashed device fingerprint
- `transaction_signature`: On-chain transaction (if applicable)
- `amount_sol`: Amount involved
- `profit_sol`: Profit generated
- `status`: success/failure/pending

### Services

#### `walletEncryption.ts`
Handles all encryption/decryption operations:
```typescript
// Generate master key (setup only)
generateMasterKey(): string

// Encrypt private key
encryptPrivateKey(privateKey: string): EncryptedKeyData

// Decrypt private key
decryptPrivateKey(encryptedKey, iv, authTag): string

// Validate encryption config
validateEncryptionConfig(): { valid: boolean; error?: string }
```

#### `walletManagement.ts`
Core wallet management functionality:
```typescript
// Generate wallet with GXQ-ending public key
generateGXQWallet(): Promise<{ publicKey, privateKey }>

// Create sub-wallet
createUserSubWallet(userWallet, name?, ipHash?, deviceHash): Promise<Result>

// Import existing wallet
importSubWallet(userWallet, privateKey, name?, ipHash?, deviceHash): Promise<Result>

// Export private key
exportSubWallet(userWallet, subWalletPublicKey, ipHash?, deviceHash): Promise<Result>

// Check balance
checkSubWalletBalance(connection, publicKey): Promise<Result>

// Get all sub-wallets
getUserSubWallets(userWallet, includeBalances?, connection?): Promise<Result>

// Get keypair for signing (internal use only)
getSubWalletKeypair(subWalletId): Promise<Keypair>
```

### API Endpoints

#### `/api/wallet/auth` (POST)
Authenticate user with wallet signature:
```typescript
Request:
{
  publicKey: string,
  signature: string,
  message: string,
  deviceFingerprint?: string
}

Response:
{
  success: boolean,
  token?: string,
  user?: {
    id: string,
    walletPublicKey: string,
    lastLogin: string,
    loginCount: number
  }
}
```

#### `/api/wallet/manage` (GET, POST)
Manage sub-wallets:

**GET** - List all sub-wallets:
```typescript
Query: ?includeBalances=true
Headers: Authorization: Bearer <token>

Response:
{
  success: boolean,
  wallets: SubWallet[]
}
```

**POST** - Create/Import/Export:
```typescript
Headers: 
  Authorization: Bearer <token>
  X-Device-Fingerprint: <fingerprint>

Body (Create):
{
  action: "create",
  walletName?: string
}

Body (Import):
{
  action: "import",
  privateKey: string,
  walletName?: string
}

Body (Export):
{
  action: "export",
  subWalletPublicKey: string
}

Body (Check Balance):
{
  action: "check_balance",
  subWalletPublicKey: string
}
```

#### `/api/admin/audit-logs` (GET)
View audit logs (admin only):
```typescript
Query Parameters:
  - userId?: string
  - subWalletId?: string
  - eventType?: string
  - status?: string
  - startDate?: ISO8601
  - endDate?: ISO8601
  - limit?: number (default: 100)
  - offset?: number (default: 0)

Headers: Authorization: Bearer <admin-token>

Response:
{
  success: boolean,
  logs: AuditLog[],
  pagination: {
    limit: number,
    offset: number,
    count: number
  }
}
```

### Frontend Pages

#### `/wallets`
User-facing wallet management:
- Connect wallet to authenticate
- View all sub-wallets with balances
- Create new sub-wallet (GXQ-ending)
- Import existing wallet
- Export private key (with warning)
- Check balance
- View trade statistics

#### `/admin/audit-logs`
Admin audit log viewer:
- Admin login required
- Filter by event type, status, date range
- Pagination controls
- Summary statistics
- Export capabilities (planned)

## Setup Instructions

### 1. Environment Variables

Add to `.env`:

```bash
# Master encryption key for wallet private keys
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WALLET_ENCRYPTION_KEY=<64-character-hex-string>

# JWT secret for authentication
JWT_SECRET=<your-secret>

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>

# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gxq_studio
DB_USER=postgres
DB_PASSWORD=<db-password>

# Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Minimum SOL balance for operations
MIN_SOL_BALANCE=0.05
```

### 2. Database Setup

Run the schema to create tables:

```bash
psql -U postgres -d gxq_studio -f db/schema.sql
```

### 3. Generate Master Encryption Key

```bash
# Generate a new master encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env as WALLET_ENCRYPTION_KEY
```

### 4. Verify Encryption

```typescript
import { validateEncryptionConfig } from './src/services/walletEncryption';

const result = validateEncryptionConfig();
if (result.valid) {
  console.log('✅ Encryption configured correctly');
} else {
  console.error('❌ Encryption error:', result.error);
}
```

## Usage Guide

### For Users

#### 1. Connect Wallet
- Visit `/wallets`
- Click "Connect Wallet"
- Sign authentication message
- JWT token issued for session

#### 2. Create Sub-Wallet
- Click "Create New Wallet"
- Enter optional wallet name
- System generates GXQ-ending wallet
- Private key encrypted and stored

#### 3. Import Existing Wallet
- Click "Import Wallet"
- Enter private key (base58)
- Public key must end with "GXQ"
- Enter optional wallet name

#### 4. Export Private Key
- Click "Export" on wallet card
- Confirm security warning
- Private key displayed
- Copy to secure location
- **NEVER share with anyone**

#### 5. Check Balance
- Click "Check Balance" on wallet card
- On-chain balance fetched
- Warning if below threshold

### For Admins

#### 1. Access Audit Logs
- Visit `/admin/audit-logs`
- Login with admin credentials
- View all wallet operations

#### 2. Filter Logs
- Select event type
- Select status
- Adjust pagination
- Click "Refresh"

#### 3. Monitor Activity
- View summary statistics
- Track success rates
- Monitor profit metrics
- Investigate failures

## Security Best Practices

### For Development

1. **Never Commit Secrets**
   - Use `.env.example` as template
   - Keep `.env` in `.gitignore`
   - Rotate keys regularly

2. **Test on Devnet First**
   - Test all features on devnet
   - Verify encryption/decryption
   - Test wallet generation

3. **Code Reviews**
   - Review all security-related PRs
   - Check for exposed secrets
   - Validate input sanitization

### For Production

1. **Environment Security**
   - Use secure environment variable storage
   - Implement secret rotation
   - Monitor access logs

2. **Database Security**
   - Use SSL connections
   - Implement row-level security
   - Regular backups
   - Test disaster recovery

3. **API Security**
   - Rate limiting on all endpoints
   - IP whitelisting for admin
   - Monitor for suspicious activity
   - Implement 2FA for admin

4. **Key Management**
   - Store master key in secure vault (AWS KMS, HashiCorp Vault)
   - Never log private keys
   - Wipe memory after use
   - Regular security audits

## Disaster Recovery

### Lost Master Encryption Key

⚠️ **CRITICAL**: If the master encryption key is lost, all encrypted private keys are permanently unrecoverable.

**Prevention**:
1. Backup master key to secure location
2. Use key management service (AWS KMS, HashiCorp Vault)
3. Test recovery procedures regularly
4. Document backup locations

**If Lost**:
1. Users must export wallets before key loss
2. Re-import wallets with new master key
3. Update all encrypted records
4. Notify affected users

### Database Failure

**Backups**:
- Daily automated backups
- Point-in-time recovery
- Geographic redundancy
- Test restoration monthly

**Recovery**:
1. Restore from latest backup
2. Verify data integrity
3. Check encryption consistency
4. Resume normal operations

## Monitoring & Alerts

### Metrics to Track

1. **Wallet Operations**
   - Creation rate
   - Import/export frequency
   - Balance check frequency
   - Trade execution rate

2. **Security Events**
   - Failed login attempts
   - Unusual access patterns
   - High-value exports
   - Encryption errors

3. **Performance**
   - API response times
   - Database query performance
   - Wallet generation time
   - Balance check latency

### Alert Conditions

- Multiple failed logins from same IP
- Unusual number of wallet exports
- Encryption validation failures
- Database connection issues
- API rate limit exceeded

## Troubleshooting

### Wallet Generation Slow

**Issue**: GXQ-ending key generation takes long time

**Solution**: 
- Generation is probabilistic (1 in ~58^3 ≈ 195,000 attempts)
- Average time: 30-60 seconds
- This is normal and expected
- Consider showing progress indicator

### Encryption Errors

**Issue**: Cannot encrypt/decrypt private keys

**Causes**:
- Missing `WALLET_ENCRYPTION_KEY`
- Invalid key format (must be 64-char hex)
- Key mismatch between encrypt/decrypt

**Solution**:
```bash
# Validate encryption config
npm run validate-encryption

# Regenerate master key if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Connection Issues

**Issue**: Cannot connect to database

**Solution**:
- Verify `DB_*` environment variables
- Check database is running
- Verify network connectivity
- Check PostgreSQL logs

### Balance Check Failures

**Issue**: Cannot fetch wallet balance

**Causes**:
- RPC rate limiting
- Invalid public key
- Network issues

**Solution**:
- Use premium RPC (Helius, QuickNode)
- Implement retry logic
- Validate public key format

## Future Enhancements

### Planned Features

1. **Multi-Signature Support**
   - Require multiple approvals for exports
   - Shared wallet management
   - Transaction limits

2. **Hardware Wallet Integration**
   - Support Ledger/Trezor
   - Secure key storage
   - Transaction signing

3. **Advanced Analytics**
   - Profit/loss tracking
   - Performance metrics
   - Trade history visualization

4. **Automated Trading**
   - Scheduled trades
   - Stop-loss orders
   - Take-profit targets

5. **Mobile App**
   - iOS/Android support
   - Push notifications
   - Biometric authentication

## Support

For issues or questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Discord: [GXQ Studio Community]
- Email: support@gxqstudio.com

## License

MIT License - see LICENSE file for details
