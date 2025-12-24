# Wallet Governance Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     USER LOGIN & AUTHENTICATION                              │
│                        (api/admin/auth.ts)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  User Login Request                                                           │
│  ├─ Username/Password ───────────────┐                                       │
│  ├─ Wallet Address ──────────────────┤                                       │
│  ├─ IP Address ─────────────────┐    │                                       │
│  └─ Device Fingerprint ────────┐│    │                                       │
│                                 ││    │                                       │
│  Privacy Protection             ││    │                                       │
│  ├─ SHA-256 Hash(IP) ──────────┘│    │                                       │
│  └─ SHA-256 Hash(Fingerprint) ──┘    │                                       │
│                                       │                                       │
│  Rate Limiting: 5 attempts/15min      │                                       │
│                                       ▼                                       │
│                          ┌────────────────────┐                              │
│                          │  wallet_audit_log  │                              │
│                          │  ─────────────────│                              │
│                          │  operation: LOGIN  │                              │
│                          │  ip_hash: SHA256  │                              │
│                          │  fp_hash: SHA256  │                              │
│                          │  wallet_address   │                              │
│                          │  timestamp        │                              │
│                          └────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   WALLET MANAGEMENT & CREATION                               │
│                  (src/services/walletManagement.ts)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Create Wallet Request                                                        │
│  ├─ User ID                                                                   │
│  ├─ Encryption Password                                                       │
│  ├─ Options (label, signingMode, permissions)                                │
│  │                                                                             │
│  ▼                                                                             │
│  ┌──────────────────────────────────────┐                                    │
│  │  STEP 1: Validate 3-Wallet Limit    │                                    │
│  │  ─────────────────────────────────  │                                    │
│  │  Query: countUserWallets(userId)    │                                    │
│  │  Check: count < 3? ───────────────┐ │                                    │
│  └──────────────────────────────────┘ │ │                                    │
│                                        │ │                                    │
│  ┌──────────────────────────────────┐ │ │                                    │
│  │  STEP 2: Generate Keypair        │◄┘ │                                    │
│  │  ─────────────────────────────── │   │                                    │
│  │  Solana.Keypair.generate()       │   │                                    │
│  │  Optional: Validate GXQ suffix   │   │                                    │
│  └──────────────────────────────────┘   │                                    │
│                                          │                                    │
│  ┌──────────────────────────────────┐   │                                    │
│  │  STEP 3: Encrypt Private Key    │◄──┘                                    │
│  │  ─────────────────────────────── │                                       │
│  │  AES-256-GCM Encryption          │                                       │
│  │  ├─ PBKDF2 (100k iterations)     │                                       │
│  │  ├─ Random IV (16 bytes)         │                                       │
│  │  ├─ Random Salt (32 bytes)       │                                       │
│  │  └─ Auth Tag (16 bytes)          │                                       │
│  └──────────────────────────────────┘                                       │
│                                                                               │
│  ┌─────────────────────────────────────────┐                                │
│  │  STEP 4: Create Wallet Object          │                                │
│  │  ────────────────────────────────────  │                                │
│  │  ├─ userId (foreign key to users)      │                                │
│  │  ├─ walletAddress                      │                                │
│  │  ├─ encryptedPrivateKey                │                                │
│  │  ├─ encryptionIv, salt, tag            │                                │
│  │  ├─ signingMode: CLIENT_SIDE (default) │                                │
│  │  └─ permissions: [...] (inherited)     │                                │
│  └─────────────────────────────────────────┘                                │
│                  ▼                                                            │
│  ┌─────────────────────────────────────────┐                                │
│  │  STEP 5: Persist to Database           │                                │
│  │  ────────────────────────────────────  │                                │
│  │  insertUserWallet() ──► user_wallets   │                                │
│  │  ├─ Enforces 3-wallet constraint       │                                │
│  │  └─ Stores all encryption metadata     │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                               │
│  Sub-Wallet Features:                                                         │
│  ✓ Maximum 3 per user (strictly enforced)                                    │
│  ✓ Inherit user RBAC permissions                                             │
│  ✓ AES-256-GCM encrypted                                                      │
│  ✓ Keys never stored in plaintext                                            │
│  ✓ Keys wiped from memory after use                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   BOT EXECUTION FRAMEWORK                                    │
│                   (src/services/botFramework.ts)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Bot Execution Request                                                        │
│  ├─ Bot Config (userId, botId, walletId, strategy)                          │
│  ├─ Transaction                                                               │
│  ├─ Signer (Keypair - user's wallet)                                        │
│  │                                                                             │
│  ▼                                                                             │
│  ┌────────────────────────────────────────────────────────┐                 │
│  │  PRE-FLIGHT: Validate Minimum Balance (0.05 SOL)      │                 │
│  │  ─────────────────────────────────────────────────────│                 │
│  │  getBalance(signer.publicKey)                          │                 │
│  │  ├─ Pass: balance >= 0.05 SOL ────────────────────┐   │                 │
│  │  └─ Fail: Return error, log to database ──────────┼───┐                 │
│  └────────────────────────────────────────────────────┘   │ │                 │
│                                                            │ │                 │
│  ┌────────────────────────────────────────────────────┐   │ │                 │
│  │  VALIDATION: 4-Layer Replay Protection             │◄──┘ │                 │
│  │  ──────────────────────────────────────────────────│     │                 │
│  │  Layer 1: Nonce (unique ID)                         │     │                 │
│  │  Layer 2: Transaction Hash (SHA-256)                │     │                 │
│  │  Layer 3: Timestamp Window (10 min)                 │     │                 │
│  │  Layer 4: Rate Limiting (10/min per user)           │     │                 │
│  │  ├─ Pass: All layers valid ─────────────────────┐   │     │                 │
│  │  └─ Fail: Return error ─────────────────────────┼───┼────┐                │
│  └────────────────────────────────────────────────┘   │   │ │                │
│                                                        │   │ │                │
│  ┌────────────────────────────────────────────────┐   │   │ │                │
│  │  INTELLIGENCE: Oracle Analysis (Optional)      │◄──┘   │ │                │
│  │  ──────────────────────────────────────────────│       │ │                │
│  │  Pre-execution risk analysis                    │       │ │                │
│  │  ├─ PROCEED: Continue execution                 │       │ │                │
│  │  ├─ ADJUST: Apply recommendations               │       │ │                │
│  │  └─ ABORT: Block execution ─────────────────────┼───────┘ │                │
│  └────────────────────────────────────────────────┘         │                │
│                                                              │                │
│  ┌─────────────────────────────────────────────────────┐    │                │
│  │  ISOLATION: Create Per-User Sandbox                │◄───┘                │
│  │  ────────────────────────────────────────────────── │                     │
│  │  Key: ${userId}:${botId}:${walletAddress}          │                     │
│  │  ├─ Isolated state (Map)                            │                     │
│  │  ├─ RBAC permissions                                │                     │
│  │  ├─ Rate limiting (per-user)                        │                     │
│  │  └─ NO SHARED SIGNERS                               │                     │
│  └─────────────────────────────────────────────────────┘                     │
│                  ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │  EXECUTION: Submit Transaction in Sandbox          │                     │
│  │  ────────────────────────────────────────────────── │                     │
│  │  sandbox.execute(async () => {                      │                     │
│  │    sendAndConfirmTransaction(                       │                     │
│  │      connection, transaction, [signer]              │                     │
│  │    )                                                │                     │
│  │  }, 'bot.execute')                                  │                     │
│  └─────────────────────────────────────────────────────┘                     │
│                  ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │  POST-EXECUTION: Profit Calculation & Distribution │                     │
│  │  ────────────────────────────────────────────────── │                     │
│  │  ├─ Pre-trade balance snapshot                      │                     │
│  │  ├─ Post-trade balance snapshot                     │                     │
│  │  ├─ Calculate profit/loss                           │                     │
│  │  └─ DAO skim distribution (if profit > 0)           │                     │
│  └─────────────────────────────────────────────────────┘                     │
│                  ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │  AUDIT: Log Execution to Database                  │                     │
│  │  ────────────────────────────────────────────────── │                     │
│  │  insertWalletAuditLog({                             │                     │
│  │    operation: 'BOT_EXECUTION',                      │                     │
│  │    profit, gas, signature, status                   │                     │
│  │  })                                                 │                     │
│  └─────────────────────────────────────────────────────┘                     │
│                  ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │  CLEANUP: Wipe Keys & Clear Sandbox (FINALLY)      │                     │
│  │  ────────────────────────────────────────────────── │                     │
│  │  try {                                              │                     │
│  │    // execution                                     │                     │
│  │  } finally {                                        │                     │
│  │    sandbox.clearState()                             │                     │
│  │    signer.secretKey.fill(0) ◄── CRITICAL            │                     │
│  │  }                                                  │                     │
│  └─────────────────────────────────────────────────────┘                     │
│                                                                               │
│  Security Guarantees:                                                         │
│  ✓ 0.05 SOL minimum balance enforced                                         │
│  ✓ Per-user sandbox isolation                                                │
│  ✓ No shared signers between users                                           │
│  ✓ No global execution context                                               │
│  ✓ Private keys wiped after use                                              │
│  ✓ Comprehensive audit logging                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                                       │
│                         (db/schema.sql)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────┐       ┌──────────────────┐       ┌────────────────────┐│
│  │     users      │       │   user_wallets   │       │ wallet_audit_log   ││
│  │ ────────────── │       │ ──────────────── │       │ ────────────────── ││
│  │ id (PK)        │◄──┐   │ id (PK)          │◄──┐   │ id (PK)            ││
│  │ username       │   │   │ user_id (FK) ────┘   │   │ wallet_id (FK) ────┘│
│  │ password_hash  │   │   │ wallet_address   │   │   │ user_id (FK)       ││
│  │ primary_wallet │   │   │ encrypted_key    │   │   │ operation          ││
│  │ is_active      │   │   │ encryption_iv    │   │   │ ip_address_hash    ││
│  │ last_login     │   │   │ encryption_salt  │   │   │ fingerprint_hash   ││
│  │ login_count    │   │   │ encryption_tag   │   │   │ tx_signature       ││
│  └────────────────┘   │   │ iterations       │   │   │ success            ││
│                       │   │ is_primary       │   │   │ error_message      ││
│                       │   │ is_active        │   │   │ created_at         ││
│                       │   │ has_gxq_suffix   │   └───┤ operation_data     ││
│                       │   └──────────────────┘       └────────────────────┘│
│                       │   CONSTRAINT:                                        │
│                       │   max_3_wallets_per_user                             │
│                       │   CHECK (COUNT(*) <= 3)                              │
│                       │                                                      │
│  ┌────────────────┐  │                                                      │
│  │     bots       │  │                                                      │
│  │ ────────────── │  │                                                      │
│  │ id (PK)        │  │                                                      │
│  │ user_id (FK) ──┘                                                        │
│  │ name           │                                                         │
│  │ bot_type       │                                                         │
│  │ signing_mode   │                                                         │
│  │ wallet_id (FK) │                                                         │
│  │ is_active      │                                                         │
│  │ strategy_config│                                                         │
│  └────────────────┘                                                         │
│                                                                               │
│  Key Features:                                                                │
│  ✓ 3-wallet limit enforced at database level                                 │
│  ✓ All encryption metadata stored securely                                   │
│  ✓ Comprehensive audit trail with hashed metadata                            │
│  ✓ Foreign key relationships maintain referential integrity                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                     SECURITY ARCHITECTURE SUMMARY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Privacy Protection                     Encryption Standards                 │
│  ├─ SHA-256 hashed IP addresses        ├─ AES-256-GCM                       │
│  ├─ SHA-256 hashed fingerprints        ├─ PBKDF2 (100k iterations)          │
│  └─ No plaintext metadata storage      ├─ Random IV per encryption          │
│                                         └─ Authentication tag verification    │
│                                                                               │
│  Access Control                         Execution Safety                     │
│  ├─ RBAC permission inheritance        ├─ 0.05 SOL minimum balance          │
│  ├─ Per-user sandbox isolation         ├─ 4-layer replay protection         │
│  ├─ No shared execution contexts       ├─ Oracle intelligence               │
│  └─ Rate limiting per user             └─ Comprehensive audit logging       │
│                                                                               │
│  Memory Safety                          Governance                           │
│  ├─ Private keys wiped (.fill(0))      ├─ Strict 3-wallet limit             │
│  ├─ Keys decrypted only in-memory      ├─ Sub-wallet designation            │
│  ├─ Immediate cleanup (finally)        ├─ Database-level constraints        │
│  └─ No plaintext key persistence       └─ Full audit trail                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
User Login
    │
    ├─► Hash IP & Fingerprint (SHA-256)
    │
    ├─► Authenticate
    │
    └─► Log to wallet_audit_log
            │
            └─► Record: LOGIN operation with hashed metadata

Wallet Creation
    │
    ├─► Validate 3-wallet limit (database query)
    │
    ├─► Generate Keypair
    │
    ├─► Encrypt with AES-256-GCM
    │       ├─ PBKDF2 key derivation
    │       ├─ Random IV & Salt
    │       └─ Authentication Tag
    │
    ├─► Create wallet object with inherited permissions
    │
    └─► Save to user_wallets table
            │
            └─► Database constraint enforces 3-wallet max

Bot Execution
    │
    ├─► Pre-flight: Check 0.05 SOL minimum
    │
    ├─► Validate: 4-layer replay protection
    │
    ├─► Analyze: Oracle intelligence (optional)
    │
    ├─► Isolate: Create per-user sandbox
    │       └─ Key: ${userId}:${botId}:${walletAddress}
    │
    ├─► Execute: Send transaction in sandbox
    │
    ├─► Calculate: Post-trade profit/loss
    │
    ├─► Distribute: DAO skim (if profitable)
    │
    ├─► Audit: Log to wallet_audit_log
    │
    └─► Cleanup: Wipe keys & clear sandbox
            └─ signer.secretKey.fill(0)
```

## Security Layers

```
Layer 1: Privacy Protection
    ├─ SHA-256 hashing for IP and fingerprints
    └─ No plaintext sensitive metadata

Layer 2: Encryption
    ├─ AES-256-GCM authenticated encryption
    ├─ PBKDF2 key derivation (100k iterations)
    └─ Random IV and Salt per encryption

Layer 3: Access Control
    ├─ RBAC permission inheritance
    ├─ Per-user sandbox isolation
    └─ Rate limiting per user

Layer 4: Execution Isolation
    ├─ No shared signers between users
    ├─ No global execution context
    └─ Unique sandbox per user+bot+wallet

Layer 5: Memory Safety
    ├─ Keys wiped immediately after use
    ├─ Cleanup in finally blocks
    └─ No plaintext key persistence

Layer 6: Audit & Compliance
    ├─ Comprehensive audit trail
    ├─ All operations logged to database
    └─ Hashed metadata for privacy
```
