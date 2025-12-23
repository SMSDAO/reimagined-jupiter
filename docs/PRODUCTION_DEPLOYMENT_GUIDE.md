# Production Deployment Guide

## Overview

This guide covers the complete production deployment process for GXQ Studio, integrating all production-ready features including wallet governance, multi-sig admin controls, bot framework, token launcher, sniper bot, and flash loan arbitrage.

## Prerequisites

### Required Accounts & Services

1. **Solana Wallet**
   - Mainnet wallet with sufficient SOL for operations
   - Export private key (base58 format)
   - Recommended: Dedicated trading wallet (not your main funds)

2. **Premium RPC Provider** (Recommended)
   - **Helius**: https://helius.dev
   - **QuickNode**: https://quicknode.com
   - **Triton**: https://triton.one
   - Free public RPC works but has rate limits

3. **Deployment Platform** (Choose one or both)
   - **Vercel**: For webapp frontend (https://vercel.com)
   - **Railway**: For 24/7 backend (https://railway.app)

4. **Optional Services**
   - PostgreSQL database (for persistent storage)
   - GitHub account (for CI/CD)

### Security Setup

1. **Generate Strong Secrets**

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate cron secret
openssl rand -base64 24

# Hash admin password with bcrypt
npm run hash-password
```

2. **Create Production Wallet**

```bash
# Generate new wallet for trading (recommended)
solana-keygen new --outfile ~/gxq-trading-wallet.json

# Or export from Phantom/Solflare
# Settings → Export Private Key → Copy as base58
```

## Environment Configuration

### Core Variables (Required)

Create `.env` file with these critical variables:

```env
# === CRITICAL: SOLANA CONFIGURATION ===
SOLANA_RPC_URL=https://your-premium-rpc-url.com/YOUR_KEY
WALLET_PRIVATE_KEY=your_base58_private_key_here

# === CRITICAL: ADMIN SECURITY ===
ADMIN_USERNAME=your_unique_admin_username
ADMIN_PASSWORD=$2b$10$your_bcrypt_hashed_password
JWT_SECRET=your_32_character_jwt_secret_here
CRON_SECRET=your_cron_secret_here

# === TRADING CONFIGURATION ===
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
GAS_BUFFER=1.5

# === DEV FEE (10% of profits) ===
DEV_FEE_ENABLED=true
DEV_FEE_PERCENTAGE=0.10
DEV_FEE_WALLET=GXQDevWallet1111111111111111111111111
```

### Optional Variables (Recommended)

```env
# === DATABASE (for persistent storage) ===
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=gxq_studio
DB_USER=postgres
DB_PASSWORD=your_secure_db_password

# === QUICKNODE (enhanced features) ===
QUICKNODE_RPC_URL=https://your-quicknode-endpoint.com
QUICKNODE_API_KEY=your_quicknode_api_key

# === MONITORING ===
LOG_LEVEL=info
NODE_ENV=production
METRICS_PORT=9090
```

## Process Flow Diagrams

### 1. System Initialization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM STARTUP                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Load Environment Variables   │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Validate Production Config  │◄──── productionGuardrails.ts
        │  - Check all required vars   │
        │  - Validate wallet address   │
        │  - Verify JWT secret         │
        │  - Check admin credentials   │
        └──────────────┬────────────────┘
                       │
                  ┌────┴────┐
                  │ Valid?   │
                  └────┬────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    [ERRORS]      [WARNINGS]      [SUCCESS]
        │              │              │
        │              │              │
        ▼              │              ▼
    EXIT(1)           │      ┌────────────────────┐
                      │      │  Initialize RPC    │
                      │      │  Connection Pool   │
                      │      └────────┬───────────┘
                      │               │
                      │               ▼
                      │      ┌────────────────────┐
                      │      │  Load Wallet       │
                      │      │  from Private Key  │
                      │      └────────┬───────────┘
                      │               │
                      │               ▼
                      │      ┌────────────────────┐
                      │      │  Initialize RBAC   │
                      │      │  & Auth System     │
                      │      └────────┬───────────┘
                      │               │
                      │               ▼
                      │      ┌────────────────────┐
                      │      │  Start Services:   │
                      │      │  - Bot Framework   │
                      │      │  - Flash Loans     │
                      │      │  - Arbitrage       │
                      │      │  - Sniper Bot      │
                      │      │  - Token Launcher  │
                      └─────►└────────┬───────────┘
                                      │
                                      ▼
                             ┌────────────────────┐
                             │   SYSTEM READY     │
                             └────────────────────┘
```

### 2. Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  USER LOGIN REQUEST                          │
│  POST /api/admin/auth                                        │
│  { username, password }                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Rate Limit Check            │◄──── 5 attempts/15 min
        │  (per IP address)            │
        └──────────────┬────────────────┘
                       │
                  ┌────┴────┐
                  │ Allowed? │
                  └────┬────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              │
    [DENIED]      [ALLOWED]          │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Validate Username   │ │
        │   │  (check ADMIN_       │ │
        │   │   USERNAME env)      │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Validate Password   │ │
        │   │  - Bcrypt compare    │ │
        │   │  - Plain text (dev)  │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │         ┌────┴────┐         │
        │         │ Valid?  │         │
        │         └────┬────┘         │
        │              │              │
        │   ┌──────────┼──────────┐  │
        │   │          │          │  │
        ▼   ▼          ▼          ▼  │
    [INVALID]     [VALID]       [OK] │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Generate JWT Token  │ │
        │   │  - 24h expiration    │ │
        │   │  - User claims       │ │
        │   │  - Sign with secret  │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Log Auth Event      │ │
        │   │  to Audit Trail      │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        └──►│  Return Token        │◄┘
            │  or Error            │
            └──────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  SUBSEQUENT REQUESTS          │
        │  Authorization: Bearer <token>│
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Extract & Verify JWT        │
        │  - Check signature           │
        │  - Verify expiration         │
        │  - Extract user claims       │
        └──────────────┬────────────────┘
                       │
                  ┌────┴────┐
                  │ Valid?   │
                  └────┬────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    [EXPIRED]     [INVALID]     [VALID]
        │              │              │
        │              │              ▼
        │              │   ┌──────────────────────┐
        │              │   │  Check RBAC          │
        │              │   │  Permissions         │
        │              │   └──────────┬───────────┘
        │              │              │
        │              │         ┌────┴────┐
        │              │         │Allowed? │
        │              │         └────┬────┘
        │              │              │
        ▼              │   ┌──────────┼──────────┐
    401 Unauthorized   │   │          │          │
                       │   ▼          ▼          ▼
                       │  [DENIED]  [ALLOWED]  [OK]
                       │   │          │
                       │   ▼          ▼
                       └►403         Execute
                         Forbidden   Request
```

### 3. Bot Execution Flow with Sandboxing

```
┌─────────────────────────────────────────────────────────────┐
│              BOT TRIGGER (Manual/Auto)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Load Bot Configuration      │
        │  - Bot type (arbitrage,      │
        │    sniper, flash loan)       │
        │  - Strategy params           │
        │  - Wallet assignment         │
        │  - Risk limits               │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Create Isolated Sandbox     │◄──── Per-user isolation
        │  - User ID                   │
        │  - Bot ID                    │
        │  - Permissions               │
        │  - Separate state            │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Check Permissions           │
        │  - bot.execute               │
        │  - wallet.sign               │
        └──────────────┬────────────────┘
                       │
                  ┌────┴────┐
                  │ Allowed? │
                  └────┬────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              │
    [DENIED]      [ALLOWED]          │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Generate Nonce      │ │
        │   │  (replay protection) │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Check Rate Limits   │ │
        │   │  - 10 per minute     │ │
        │   │  - 100 per hour      │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │         ┌────┴────┐         │
        │         │Within?  │         │
        │         └────┬────┘         │
        │              │              │
        │   ┌──────────┼──────────┐  │
        │   │          │          │  │
        ▼   ▼          ▼          ▼  │
    [EXCEEDED]    [OK]         [PASS]│
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Execute Strategy    │ │
        │   │  - Scan opportunity  │ │
        │   │  - Calculate profit  │ │
        │   │  - Check risk        │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Build Transaction   │ │
        │   │  (offline builder)   │ │
        │   │  - Add instructions  │ │
        │   │  - Set compute       │ │
        │   │  - Add priority fee  │ │
        │   │    (max 10M cap)     │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Validate Offline    │ │
        │   │  - Check structure   │ │
        │   │  - Verify limits     │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │         ┌────┴────┐         │
        │         │ Valid?  │         │
        │         └────┬────┘         │
        │              │              │
        │   ┌──────────┼──────────┐  │
        │   │          │          │  │
        ▼   ▼          ▼          ▼  │
    [INVALID]     [VALID]    [CONTINUE]
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Simulate on RPC     │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │         ┌────┴────┐         │
        │         │Success? │         │
        │         └────┬────┘         │
        │              │              │
        │   ┌──────────┼──────────┐  │
        │   │          │          │  │
        ▼   ▼          ▼          ▼  │
    [FAILED]      [SUCCESS]  [PROCEED]
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Sign with Wallet    │ │
        │   │  (based on mode):    │ │
        │   │  - CLIENT_SIDE       │ │
        │   │  - SERVER_SIDE       │ │
        │   │  - ENCLAVE (future)  │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Submit Transaction  │ │
        │   │  - Send to RPC       │ │
        │   │  - Get signature     │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Confirm Transaction │ │
        │   │  - Wait for finality │ │
        │   │  - Verify on-chain   │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Mark Nonce Used     │ │
        │   │  (prevent replay)    │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Log Execution       │ │
        │   │  - Status            │ │
        │   │  - Signature         │ │
        │   │  - Profit/Loss       │ │
        │   │  - Gas used          │ │
        │   └──────────┬───────────┘ │
        │              │              │
        └─────────────►▼              │
            ┌──────────────────────┐ │
            │  Return Result       │◄┘
            │  to Caller           │
            └──────────────────────┘
```

### 4. Wallet Governance Flow

```
┌─────────────────────────────────────────────────────────────┐
│           USER CREATES/IMPORTS WALLET                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Check Wallet Count          │
        │  (max 3 per user)            │
        └──────────────┬────────────────┘
                       │
                  ┌────┴────┐
                  │ < 3?    │
                  └────┬────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              │
    [DENIED]      [ALLOWED]          │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Generate/Import     │ │
        │   │  Keypair             │ │
        │   │  - New: Random gen   │ │
        │   │  - Import: Validate  │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  GXQ Suffix Check    │ │
        │   │  (optional)          │ │
        │   │  - Ends with "GXQ"?  │ │
        │   │  - Regenerate if no  │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Encrypt Private Key │ │
        │   │  - AES-256-GCM       │ │
        │   │  - PBKDF2 (100k)     │ │
        │   │  - Random IV & salt  │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Store in Database   │ │
        │   │  - Encrypted data    │ │
        │   │  - IV, salt, tag     │ │
        │   │  - Public key only   │ │
        │   └──────────┬───────────┘ │
        │              │              │
        │              ▼              │
        │   ┌──────────────────────┐ │
        │   │  Audit Log Entry     │ │
        │   │  - WALLET_CREATED    │ │
        │   │  - User ID           │ │
        │   │  - IP hash           │ │
        │   │  - Timestamp         │ │
        │   └──────────┬───────────┘ │
        │              │              │
        └─────────────►▼              │
            ┌──────────────────────┐ │
            │  Return Wallet Info  │◄┘
            │  (public key only)   │
            └──────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  TRANSACTION SIGNING          │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Decrypt Private Key         │
        │  (in-memory only)            │
        │  - User password             │
        │  - PBKDF2 derive key         │
        │  - AES-256-GCM decrypt       │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Sign Transaction            │
        │  - Use keypair               │
        │  - Generate signature        │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Wipe Private Key            │
        │  from Memory                 │
        │  - Fill with zeros           │
        │  - Immediate disposal        │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Audit Log Entry             │
        │  - TRANSACTION_SIGN          │
        │  - Signature                 │
        │  - IP hash                   │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Return Signed Transaction   │
        └──────────────────────────────┘
```

## Deployment Steps

### Step 1: Prepare Environment

1. **Clone Repository**

```bash
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter
```

2. **Install Dependencies**

```bash
# Backend
npm install

# Frontend
cd webapp
npm install
cd ..
```

3. **Configure Environment**

```bash
cp .env.example .env
nano .env  # Edit with your values
```

### Step 2: Validate Configuration

```bash
# Run production validation
npm run validate-production

# Expected output:
# ✅ Production environment validation passed
# ⚠️  Production Environment Warnings: (if any)
```

### Step 3: Build & Test

```bash
# Build backend
npm run build:backend

# Build webapp
npm run build:webapp

# Run tests
npm test
npm run test:webapp

# Lint check
npm run lint
npm run lint:webapp
```

### Step 4: Deploy to Vercel (Webapp)

```bash
cd webapp

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables (one-time)
vercel env add NEXT_PUBLIC_RPC_URL production
vercel env add ADMIN_USERNAME production
vercel env add ADMIN_PASSWORD production
vercel env add JWT_SECRET production
```

### Step 5: Deploy to Railway (Backend)

```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# Login
railway login

# Link project
railway link YOUR_PROJECT_ID

# Set environment variables
railway variables set SOLANA_RPC_URL="your-rpc-url"
railway variables set WALLET_PRIVATE_KEY="your-private-key"
railway variables set ADMIN_USERNAME="your-username"
railway variables set ADMIN_PASSWORD="your-bcrypt-hash"
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set CRON_SECRET="your-cron-secret"

# Deploy
railway up
```

### Step 6: Verify Deployment

1. **Check Health Endpoints**

```bash
# Vercel webapp
curl https://your-app.vercel.app/api/health

# Railway backend
curl https://your-app.railway.app/api/health
```

2. **Test Authentication**

```bash
# Login to admin panel
curl -X POST https://your-app.vercel.app/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# Should return JWT token
```

3. **Monitor Logs**

```bash
# Vercel
vercel logs

# Railway
railway logs
```

## Post-Deployment

### Security Checklist

- [ ] All environment variables set correctly
- [ ] Secrets rotated from defaults
- [ ] HTTPS enforced on all endpoints
- [ ] Admin panel access tested
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured

### Monitoring Setup

1. **Set up Health Checks**
   - Configure uptime monitoring (UptimeRobot, Pingdom)
   - Alert on failures

2. **Configure Log Aggregation**
   - Railway: Built-in logs
   - Vercel: View in dashboard
   - Optional: Send to external service (Datadog, LogDNA)

3. **Set up Metrics**
   - Track execution success rate
   - Monitor profit/loss
   - Track gas costs

### Maintenance

1. **Regular Tasks**
   - Review audit logs weekly
   - Check wallet balances daily
   - Monitor for failed transactions
   - Review and adjust trading parameters

2. **Updates**
   - Keep dependencies updated
   - Apply security patches promptly
   - Test updates in staging first

## Troubleshooting

### Common Issues

1. **Environment Validation Fails**
   - Check all required variables are set
   - Verify JWT_SECRET is 32+ characters
   - Ensure wallet private key is valid base58

2. **Authentication Errors**
   - Verify bcrypt hash is correct
   - Check JWT_SECRET matches
   - Ensure ADMIN_USERNAME/PASSWORD are set

3. **Transaction Failures**
   - Check wallet has sufficient SOL
   - Verify RPC endpoint is responsive
   - Review slippage settings

4. **Rate Limit Errors**
   - Premium RPC may be needed
   - Adjust rate limits if using QuickNode
   - Check for network congestion

## Support

- **Documentation**: https://github.com/SMSDAO/reimagined-jupiter/tree/main/docs
- **Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues
- **Security**: security@gxq.studio

---

**Built with ❤️ by GXQ STUDIO**

*Last Updated: December 2024*
