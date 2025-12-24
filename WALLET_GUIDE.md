# Wallet Management & Security Guide

## For Developers

### Quick Start

This guide covers the enhanced wallet management features added to GXQ Studio.

---

## Table of Contents

1. [Wallet Generation](#wallet-generation)
2. [Wallet Import](#wallet-import)
3. [Encrypted Storage](#encrypted-storage)
4. [API Integration](#api-integration)
5. [UI Components](#ui-components)
6. [Security Best Practices](#security-best-practices)

---

## Wallet Generation

### Client-Side Generation (Recommended)

```typescript
import { generateWallet } from '@/lib/wallet-utils';

// Generate a new Solana wallet
const { keypair, privateKey, publicKey } = generateWallet();

console.log('Public Key:', publicKey);
// NEVER log private keys in production!
// console.log('Private Key:', privateKey); // ❌ DON'T DO THIS
```

**Security:** Keys are generated using `@solana/web3.js` Keypair.generate() which uses cryptographically secure random number generation.

---

## Wallet Import

### Import from Private Key

```typescript
import { importWalletFromPrivateKey, validatePrivateKeyFormat } from '@/lib/wallet-utils';

// Validate format first
const validation = validatePrivateKeyFormat(privateKeyString);
if (!validation.valid) {
  console.error('Invalid format:', validation.error);
  return;
}

// Import wallet
const { keypair, publicKey } = importWalletFromPrivateKey(privateKeyString);
```

**Supported Formats:**
- Base58 string: `5Ke7v...` (most common)
- Byte array: `[123, 45, 67, ...]`

---

## Encrypted Storage

### Save Wallet Securely

```typescript
import { saveEncryptedWallet } from '@/lib/storage';

await saveEncryptedWallet(
  privateKey,      // Private key to encrypt
  publicKey,       // Public key (not encrypted)
  password,        // User's password (min 8 chars)
  'ephemeral'      // or 'imported'
);
```

### Load Encrypted Wallet

```typescript
import { loadEncryptedWallet } from '@/lib/storage';

try {
  const wallet = await loadEncryptedWallet(password);
  if (wallet) {
    console.log('Loaded:', wallet.publicKey);
    // Use wallet.privateKey for signing
  }
} catch (error) {
  console.error('Failed to decrypt. Wrong password?');
}
```

### Check if Wallet Exists

```typescript
import { hasEncryptedWallet, getEncryptedWalletMetadata } from '@/lib/storage';

if (hasEncryptedWallet()) {
  const metadata = getEncryptedWalletMetadata();
  console.log('Wallet address:', metadata?.publicKey);
  console.log('Type:', metadata?.type);
}
```

**Encryption Details:**
- Algorithm: AES-256-GCM (Authenticated Encryption)
- Key Derivation: PBKDF2 with 100,000 iterations
- Hash: SHA-256
- Storage: Browser localStorage (encrypted)

---

## API Integration

### Wallet Permissions

```typescript
// Check wallet permissions
const response = await fetch('/api/wallet/permissions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    walletAddress: '...',
    action: 'trade', // or 'read', 'transfer', 'admin'
  }),
});

const { hasPermission, canPerformAction } = await response.json();
```

### Validate Wallet

```typescript
// Validate address or private key
const response = await fetch('/api/wallet/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: 'SomeAddress...',
    privateKey: 'SomePrivateKey...', // Optional
  }),
});

const result = await response.json();
console.log('Valid address:', result.addressValid);
console.log('Valid private key:', result.privateKeyValid);
```

### Farcaster Frame Integration

```typescript
// Generate wallet via Farcaster Frame
const response = await fetch('/api/farcaster/frame-wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fid: 12345, // Farcaster ID
    walletAddress: 'existing-wallet-if-any',
  }),
});

const { wallet, farcaster, frame } = await response.json();
```

---

## UI Components

### WalletManager Component

Add wallet management to any page:

```tsx
import WalletManager from '@/components/Wallet/WalletManager';

export default function MyPage() {
  return (
    <div>
      <WalletManager />
    </div>
  );
}
```

**Features:**
- ✅ Generate new wallet
- ✅ Import existing wallet
- ✅ Encrypt & save to localStorage
- ✅ Load encrypted wallet
- ✅ Delete wallet

### UnifiedTradingPanel

Enhanced trading controls:

```tsx
import UnifiedTradingPanel, { TradingSettings } from '@/components/Trading/UnifiedTradingPanel';

export default function TradingPage() {
  const [isRunning, setIsRunning] = useState(false);

  const handleSettingsChange = (settings: TradingSettings) => {
    console.log('Priority Fee:', settings.priorityFeeLamports);
    console.log('Jito Tip:', settings.jitoTip);
    console.log('Execution Speed:', settings.executionSpeed);
    console.log('Slippage:', settings.slippage);
  };

  return (
    <UnifiedTradingPanel
      onSettingsChange={handleSettingsChange}
      onStart={() => setIsRunning(true)}
      onStop={() => setIsRunning(false)}
      isRunning={isRunning}
      showAdvanced={true}
    />
  );
}
```

**New Controls:**
- **Gas Fee Slider:** 1,000 - 10,000,000 lamports
- **Jito Tip Slider:** 0 - 10,000,000 lamports (MEV protection)
- **Execution Speed:** Normal / Fast / Turbo / MEV-Protected
- **Slippage:** 0.1% - 20% with presets

---

## Security Best Practices

### ✅ DO:

1. **Generate wallets client-side:**
   ```typescript
   // ✅ Good
   const wallet = generateWallet();
   ```

2. **Encrypt before storing:**
   ```typescript
   // ✅ Good
   await saveEncryptedWallet(privateKey, publicKey, password, 'ephemeral');
   ```

3. **Validate user input:**
   ```typescript
   // ✅ Good
   const validation = validatePrivateKeyFormat(input);
   if (!validation.valid) {
     return;
   }
   ```

4. **Use HTTPS in production:**
   ```typescript
   // ✅ Good
   const baseUrl = process.env.NODE_ENV === 'production'
     ? 'https://...'
     : 'http://localhost:3000';
   ```

5. **Set strong JWT_SECRET:**
   ```bash
   # ✅ Good
   JWT_SECRET=your-cryptographically-secure-random-32-char-string
   ```

### ❌ DON'T:

1. **DON'T log private keys:**
   ```typescript
   // ❌ Bad
   console.log('Private Key:', privateKey);
   ```

2. **DON'T send private keys over network:**
   ```typescript
   // ❌ Bad
   await fetch('/api/save-wallet', {
     body: JSON.stringify({ privateKey }),
   });
   ```

3. **DON'T store unencrypted:**
   ```typescript
   // ❌ Bad
   localStorage.setItem('wallet', privateKey);
   ```

4. **DON'T use weak passwords:**
   ```typescript
   // ❌ Bad
   const password = '12345678';
   ```

5. **DON'T hardcode secrets:**
   ```typescript
   // ❌ Bad
   const JWT_SECRET = 'my-secret-key';
   ```

---

## Authentication & Authorization

### JWT Token Generation

```typescript
import { generateToken, UserRole } from '@/../../lib/auth';

const token = generateToken({
  userId: '123',
  walletAddress: 'SomeAddress...',
  role: UserRole.USER,
  permissions: ['trade', 'read'],
});
```

### Role-Based Access

```typescript
import { authorizeRequest, hasRole, UserRole } from '@/../../lib/auth';

// Authorize API request
const auth = authorizeRequest(
  req.headers.authorization,
  [UserRole.USER, UserRole.ADMIN]
);

if (!auth.authorized) {
  return res.status(401).json({ error: auth.error });
}

// Check specific role
if (hasRole(auth.payload, UserRole.ADMIN)) {
  // Admin-only logic
}
```

### Wallet Ownership Validation

```typescript
import { validateWalletOwnership } from '@/../../lib/auth';

const hasAccess = validateWalletOwnership(auth.payload, walletAddress);

if (!hasAccess) {
  return res.status(403).json({
    error: 'You do not have permission to access this wallet',
  });
}
```

---

## Hardware Wallet Support

The wallet adapter now supports multiple hardware wallets:

- ✅ Ledger
- ✅ Torus
- ✅ Slope
- ✅ Coinbase Wallet
- ✅ Phantom
- ✅ Solflare

**Usage:**

```tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ConnectWallet() {
  const { publicKey, connected } = useWallet();

  return (
    <div>
      <WalletMultiButton />
      {connected && <p>Connected: {publicKey?.toString()}</p>}
    </div>
  );
}
```

---

## Environment Variables

Required environment variables:

```bash
# JWT Authentication
JWT_SECRET=your-32-char-random-string

# Solana RPC (choose one)
NEXT_PUBLIC_HELIUS_RPC=https://...
NEXT_PUBLIC_QUICKNODE_RPC=https://...
NEXT_PUBLIC_SOLANA_RPC_PRIMARY=https://...
NEXT_PUBLIC_RPC_URL=https://...

# Optional: Farcaster Integration
NEYNAR_API_KEY=your-neynar-api-key

# Optional: Base URL for Frames
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Optional: Cron Authorization
CRON_SECRET=your-cron-secret
```

---

## Testing

### Manual Testing Checklist

#### Wallet Generation:
- [ ] Generate new wallet
- [ ] Save with password (min 8 chars)
- [ ] Verify encrypted storage
- [ ] Load with correct password
- [ ] Load with incorrect password (should fail)

#### Wallet Import:
- [ ] Import base58 private key
- [ ] Import byte array private key
- [ ] Validate format before import
- [ ] Save imported wallet encrypted
- [ ] Load imported wallet

#### API Endpoints:
- [ ] `/api/wallet/generate` - Generate wallet
- [ ] `/api/wallet/validate` - Validate address/key
- [ ] `/api/wallet/permissions` - Check permissions
- [ ] `/api/farcaster/frame-wallet` - Farcaster Frame

#### UI Controls:
- [ ] Gas fee slider (1K - 10M lamports)
- [ ] Jito tip slider (0 - 10M lamports)
- [ ] Execution speed selector
- [ ] Slippage slider and presets

---

## Troubleshooting

### "Failed to decrypt wallet"
- Check password is correct
- Ensure wallet was saved with same password
- Verify browser localStorage is accessible

### "Invalid private key format"
- Ensure base58 string or valid byte array
- Check for whitespace or special characters
- Try converting format using `convertPrivateKeyFormat()`

### "JWT_SECRET not configured"
- Add `JWT_SECRET` to `.env` file
- Restart server after adding

### "Insufficient permissions"
- Verify JWT token is valid
- Check user role in token payload
- Ensure wallet ownership matches

---

## Additional Resources

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Wallet Adapter Documentation](https://github.com/solana-labs/wallet-adapter)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [WALLET_SECURITY_AUDIT.md](./WALLET_SECURITY_AUDIT.md) - Full security audit

---

## Support

For security issues, please contact: security@gxqstudio.com (example)

For general support: [Create an issue](https://github.com/SMSDAO/reimagined-jupiter/issues)

---

**Last Updated:** December 24, 2025
**Version:** 1.0.0
