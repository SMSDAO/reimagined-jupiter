# Wallet Governance & Sub-Wallet Management

## Overview

The GXQ Studio Wallet Governance system provides enterprise-grade security for managing user wallets with AES-256-GCM encryption, GXQ suffix validation, and comprehensive audit logging.

## Key Features

- **Maximum 3 Wallets Per User** - Enforced at database and application level
- **AES-256-GCM Encryption** - Military-grade encryption for private keys
- **GXQ Suffix Validation** - Optional requirement for branded wallets
- **In-Memory Decryption** - Keys only decrypted temporarily for signing
- **Comprehensive Audit Logging** - Every wallet operation tracked
- **PBKDF2 Key Derivation** - 100,000 iterations for password-based encryption

## Wallet Creation

### Generate New Wallet

```typescript
import { createUserWallet } from './services/walletManagement.js';

// Create wallet with GXQ suffix
const { wallet, keypair } = await createUserWallet(
  userId,
  encryptionPassword,
  {
    label: 'Trading Wallet #1',
    isPrimary: true,
    requireGxqSuffix: true  // Will generate until GXQ suffix found
  }
);

console.log('Wallet created:', wallet.walletAddress);
// Example: 7xKq9...GXQ
```

**Generation Process:**
1. Generate random keypair
2. Check if public key ends with "GXQ"
3. If yes, use it. If no, generate new one
4. Repeat until GXQ wallet found (typically < 1000 attempts)
5. Encrypt private key with AES-256-GCM
6. Store encrypted key in database

### Import Existing Wallet

```typescript
import { importWallet } from './services/walletManagement.js';

// Import from base58 private key
const { wallet, keypair } = importWallet(
  userId,
  'base58-private-key-here',
  encryptionPassword,
  {
    label: 'Imported Wallet',
    requireGxqSuffix: false  // Set to true to reject non-GXQ wallets
  }
);
```

**Supported Formats:**
- Base58 (Phantom/Solflare export format)
- Hex string
- Uint8Array / Buffer

## GXQ Suffix Validation

### What is GXQ Suffix?

Wallets ending in "GXQ" are considered branded GXQ Studio wallets:
- **Example:** `7xKq9YtKm3dWnPE4hbV2NwsGXQ`
- **Purpose:** Brand identity, premium features, enhanced trust
- **Optional:** Users can choose regular or GXQ wallets

### Validation

```typescript
import { validateGxqSuffix } from './services/walletManagement.js';

const isGXQ = validateGxqSuffix('7xKq9YtKm3dWnPE4hbV2NwsGXQ');
// Returns: true

const notGXQ = validateGxqSuffix('7xKq9YtKm3dWnPE4hbV2Nwsabc');
// Returns: false
```

### Generation Statistics

Probability of generating GXQ suffix:
- Character set: 58 (base58)
- Last 3 chars must be specific: 1 / (58^3) ≈ 1 in 195,112
- Expected attempts: ~97,556
- Max attempts (default): 100,000
- Typical time: < 1 second on modern hardware

## Encryption & Security

### AES-256-GCM Encryption

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits
- **IV Size:** 128 bits (random per encryption)
- **Authentication Tag:** 128 bits
- **Key Derivation:** PBKDF2-SHA256

**Advantages:**
- Authenticated encryption (integrity + confidentiality)
- Resistant to tampering
- NIST approved
- No padding oracle attacks

### Encryption Process

```typescript
import { encryptPrivateKey } from './services/encryption.js';

const encrypted = encryptPrivateKey(
  privateKey,           // Uint8Array or base58 string
  password             // Min 8 characters
);

// Returns:
{
  encryptedData: 'base64...',
  iv: 'base64...',
  salt: 'base64...',
  authTag: 'base64...',
  iterations: 100000
}
```

**Steps:**
1. Generate random salt (32 bytes)
2. Derive encryption key from password using PBKDF2 (100,000 iterations)
3. Generate random IV (16 bytes)
4. Encrypt plaintext with AES-256-GCM
5. Generate authentication tag
6. Securely wipe derived key from memory
7. Return all components (all needed for decryption)

### Decryption Process

```typescript
import { decryptPrivateKey } from './services/encryption.js';

const privateKey = decryptPrivateKey(
  {
    encryptedData: wallet.encryptedPrivateKey,
    iv: wallet.encryptionIv,
    salt: wallet.encryptionSalt,
    authTag: wallet.encryptionTag,
    iterations: wallet.keyDerivationIterations
  },
  password
);

// Returns: Decrypted private key (in-memory only)
```

**Steps:**
1. Derive decryption key from password + salt (PBKDF2)
2. Initialize AES-256-GCM decipher with key + IV
3. Set authentication tag for verification
4. Decrypt ciphertext
5. Verify authentication tag (fails if tampered)
6. Securely wipe derived key from memory
7. Return plaintext (should be used immediately and wiped)

### Password Requirements

**Minimum Requirements:**
- 8 characters minimum
- Mix of uppercase and lowercase (recommended)
- Include numbers (recommended)
- Include special characters (recommended)

**Best Practices:**
- Use strong, unique passwords
- Store passwords securely (never in code or logs)
- Consider using password managers
- Rotate passwords periodically
- Never share passwords

### Key Rotation

Re-encrypt wallet with new password:

```typescript
import { rotateWalletEncryption } from './services/walletManagement.js';

const updatedWallet = rotateWalletEncryption(
  wallet,
  currentPassword,
  newPassword
);

// Old encryption discarded, new encryption applied
// Update database with new encrypted values
```

**When to Rotate:**
- Password compromise suspected
- Regular security policy (e.g., every 90 days)
- User request
- Security audit recommendation

## Wallet Operations

### Signing Transactions

**Secure Signing Process:**

```typescript
import { signWithWallet } from './services/walletManagement.js';

const { signedTransaction, auditEntry } = await signWithWallet(
  wallet,
  encryptionPassword,
  transaction,
  {
    userId: user.id,
    ipAddress: req.ip,
    fingerprint: req.headers['x-fingerprint']
  }
);

// Keys decrypted, used for signing, then immediately wiped
// Audit entry created for compliance
```

**Security Measures:**
1. Decrypt private key in-memory
2. Sign transaction
3. Wipe private key from memory (fill with zeros)
4. Log operation to audit trail
5. Return signed transaction

**Audit Entry Includes:**
- Wallet ID and address
- User ID
- Operation type (TRANSACTION_SIGN)
- IP address (hashed with SHA-256)
- Browser fingerprint (hashed with SHA-256)
- Timestamp
- Success/failure status

### Exporting Public Key

Safe to share publicly:

```typescript
import { exportPublicKey } from './services/walletManagement.js';

const publicKey = exportPublicKey(wallet);
// Returns: Wallet address as base58 string
// Safe to share, receive funds, check balance
```

**Public Key Uses:**
- Receiving payments
- Checking balance
- Verifying signatures
- Display in UI
- Share with others

## Sub-Wallet Management

### Maximum 3 Wallets

**Enforcement:**

Database constraint:
```sql
CONSTRAINT max_3_wallets_per_user CHECK (
  (SELECT COUNT(*) FROM user_wallets WHERE user_id = user_wallets.user_id) <= 3
)
```

Application check:
```typescript
import { canCreateWallet } from './services/walletManagement.js';

const currentCount = await getUserWalletCount(userId);

if (!canCreateWallet(currentCount)) {
  throw new Error('Maximum 3 wallets per user');
}
```

### Primary Wallet

Each user can designate one primary wallet:

```sql
UPDATE user_wallets 
SET is_primary = FALSE 
WHERE user_id = $1;

UPDATE user_wallets 
SET is_primary = TRUE 
WHERE id = $2 AND user_id = $1;
```

**Primary Wallet Uses:**
- Default for transactions
- Receives airdrop allocations
- Used for bot trading (if no specific wallet assigned)
- Displayed prominently in UI

### Wallet Labels

Organize wallets with custom labels:

```typescript
const wallet = await createUserWallet(
  userId,
  password,
  { label: 'Trading Wallet' }
);

// Later, update label
wallet.walletLabel = 'High-Risk Trading';
// Update in database
```

**Label Ideas:**
- "Main Wallet"
- "Trading Wallet"
- "Staking Wallet"
- "Cold Storage"
- "Airdrop Wallet"

## Audit Logging

### What Gets Logged

**Every Operation:**
- Wallet creation
- Wallet import
- Key decryption
- Transaction signing
- Transfers
- Swaps
- Stakes/Unstakes
- Airdrop claims
- Bot executions

**Metadata:**
- User ID
- Wallet ID
- Operation type
- Timestamp
- IP address (hashed)
- Browser fingerprint (hashed)
- Success/failure
- Error messages (if failed)

### Query Audit Logs

```sql
-- Recent operations for user
SELECT * FROM wallet_audit_log
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;

-- Specific wallet history
SELECT * FROM wallet_audit_log
WHERE wallet_id = 'wallet-uuid'
ORDER BY created_at DESC;

-- Failed operations (security incidents)
SELECT * FROM wallet_audit_log
WHERE success = FALSE
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Operations by type
SELECT 
  operation,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE success = TRUE) as successful,
  COUNT(*) FILTER (WHERE success = FALSE) as failed
FROM wallet_audit_log
WHERE user_id = 'user-uuid'
GROUP BY operation;
```

### Audit Compliance

**Retention:**
- Wallet audit logs: 2 years minimum
- User login logs: 90 days minimum
- Transaction logs: Permanent

**Privacy:**
- IP addresses hashed (SHA-256)
- Fingerprints hashed (SHA-256)
- No personally identifiable information in plaintext
- Compliance with GDPR, CCPA

**Access:**
- Only authorized admins
- Requires AUDIT_LOG.READ permission
- All access logged
- Regular audits

## Security Best Practices

### For Users

1. **Use Strong Passwords**
   - 12+ characters
   - Mix of types
   - Unique per wallet

2. **Protect Encryption Password**
   - Never share
   - Don't write down
   - Use password manager
   - Enable 2FA on accounts

3. **Monitor Activity**
   - Review audit logs regularly
   - Report suspicious activity
   - Set up alerts

4. **Backup Strategy**
   - Export and securely store public keys
   - Document wallet labels/purposes
   - Keep encrypted backups of passwords (using separate encryption)

5. **Use Appropriate Wallets**
   - High-value: Primary wallet with strong password
   - Trading: Sub-wallet with moderate funds
   - Experimental: Sub-wallet with minimal funds

### For Developers

1. **Never Log Sensitive Data**
   - No private keys
   - No encryption passwords
   - No decrypted data
   - Hash PII before logging

2. **Secure Key Handling**
   - Decrypt only when needed
   - Wipe from memory immediately
   - No disk caching
   - No swap to disk

3. **Validate All Inputs**
   - Password strength
   - Wallet addresses
   - Transaction parameters
   - User permissions

4. **Defense in Depth**
   - Encryption at rest (database)
   - Encryption in transit (HTTPS)
   - In-memory encryption
   - Access controls
   - Audit logging

5. **Regular Security Audits**
   - Review encryption implementation
   - Test decryption wiping
   - Penetration testing
   - Code reviews

## Troubleshooting

### Cannot Create Wallet

**Error:** "Maximum 3 wallets per user"

**Solution:**
- Delete unused wallet
- Contact admin for exception
- Use existing wallet

### Decryption Failed

**Error:** "Decryption failed: Invalid password or corrupted data"

**Causes:**
- Wrong password
- Corrupted encrypted data
- Tampering detected (auth tag mismatch)

**Solutions:**
- Verify password
- Try password reset
- Check database integrity
- Restore from backup

### GXQ Generation Timeout

**Error:** "Failed to generate GXQ wallet after 100,000 attempts"

**Solutions:**
- Retry (different random seed)
- Increase max attempts
- Use non-GXQ wallet
- Very rare occurrence (1 in 100,000 expected)

### Audit Log Gap

**Error:** Operations not appearing in audit log

**Causes:**
- Database connection issue
- Logging service down
- Permission issue

**Solutions:**
- Check database connectivity
- Verify logging service status
- Review application logs
- Contact support

## API Reference

### createUserWallet()

Create new encrypted wallet for user.

**Parameters:**
- `userId` (string) - User ID
- `encryptionPassword` (string) - Password for encryption
- `options` (object)
  - `label` (string, optional) - Wallet label
  - `isPrimary` (boolean, optional) - Set as primary wallet
  - `requireGxqSuffix` (boolean, optional) - Generate GXQ wallet

**Returns:** `{ wallet, keypair }`

### importWallet()

Import existing wallet with encryption.

**Parameters:**
- `userId` (string) - User ID
- `privateKey` (string | Uint8Array) - Private key to import
- `encryptionPassword` (string) - Password for encryption
- `options` (object) - Same as createUserWallet

**Returns:** `{ wallet, keypair }`

### decryptWallet()

Decrypt wallet to get keypair (use carefully!).

**Parameters:**
- `wallet` (EncryptedWallet) - Wallet to decrypt
- `encryptionPassword` (string) - Decryption password

**Returns:** `Keypair` - Solana keypair (wipe after use!)

### signWithWallet()

Sign transaction with wallet (secure).

**Parameters:**
- `wallet` (EncryptedWallet) - Wallet to use
- `encryptionPassword` (string) - Decryption password
- `transaction` (Transaction) - Transaction to sign
- `auditOptions` (object, optional) - Audit metadata

**Returns:** `{ signedTransaction, auditEntry }`

### validateGxqSuffix()

Check if wallet has GXQ suffix.

**Parameters:**
- `publicKey` (string) - Wallet address to check

**Returns:** `boolean` - True if ends with "GXQ"

### canCreateWallet()

Check if user can create more wallets.

**Parameters:**
- `currentWalletCount` (number) - User's current wallet count

**Returns:** `boolean` - True if < 3 wallets

## Support

For wallet security questions:
- **Security Email**: security@gxq.studio
- **Documentation**: https://docs.gxq.studio/wallet-governance
- **Issue Tracker**: https://github.com/SMSDAO/reimagined-jupiter/issues

**Lost Wallet Access:**
If you lose your encryption password, your wallet cannot be recovered. Always backup passwords securely.
