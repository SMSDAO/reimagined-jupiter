# Railway Deployment Guide

Complete guide for deploying GXQ Studio Advanced Solana DeFi Platform to Railway with automated CI/CD workflows.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Required Secrets](#required-secrets)
- [Automated Deployment](#automated-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)
- [Cost Optimization](#cost-optimization)

---

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the interactive setup script:

```bash
bash scripts/setup-railway.sh
```

This script will:
1. Install Railway CLI (if not already installed)
2. Authenticate with Railway
3. Link to the pre-configured project
4. Configure environment variables
5. Deploy the application
6. Run health checks

### Option 2: One-Click Deploy

Deploy directly from GitHub using the automated workflow:

1. Go to **Actions** → **Deploy to Railway**
2. Click **Run workflow**
3. The deployment will automatically:
   - Validate secrets
   - Build the project
   - Deploy to Railway
   - Run health checks
   - Create deployment record

---

## Prerequisites

### 1. Railway Account

- Sign up at [railway.app](https://railway.app/)
- Create or access project ID: `2077acd9-f81f-47ba-b8c7-8bf6905f45fc`

### 2. Railway CLI (for manual deployment)

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex
```

### 3. Node.js 20

```bash
node --version  # Should be v20.x.x
```

### 4. Solana Wallet

- Private key in base58 format
- Recommended: Funded with at least 0.5 SOL for operations

### 5. RPC Provider

Recommended providers (in order of preference):
1. **QuickNode** - Best reliability and features
2. **Helius** - Excellent for DeFi
3. **Triton One** - High-performance RPC
4. **Alchemy** - Good alternative

**⚠️ Do NOT use free public RPCs in production** - they have rate limits and poor reliability.

---

## Required Secrets

Configure these secrets in your GitHub repository settings (**Settings** → **Secrets and variables** → **Actions**):

### Core Secrets

| Secret Name | Description | Example | Required |
|------------|-------------|---------|----------|
| `RAILWAY_TOKEN` | Railway API authentication token | `*****` | ✅ Yes |
| `RAILWAY_PROJECT_ID` | Railway project ID | `2077acd9-f81f-47ba-b8c7-8bf6905f45fc` | ✅ Yes |
| `SOLANA_RPC_URL` | Solana RPC endpoint URL | `https://your-node.quiknode.pro/abc123/` | ✅ Yes |
| `WALLET_PRIVATE_KEY` | Wallet private key (base58) | `5J7...xyz` | ✅ Yes |
| `ADMIN_USERNAME` | Admin panel username | `admin` | ✅ Yes |
| `ADMIN_PASSWORD` | Admin panel password | `strong_password_123` | ✅ Yes |
| `JWT_SECRET` | JWT authentication secret | `random_secret_key_here` | ✅ Yes |

### How to Get Railway Token

1. Go to [railway.app/account/tokens](https://railway.app/account/tokens)
2. Click **Create Token**
3. Name it (e.g., "GitHub Actions")
4. Copy the token
5. Add it as `RAILWAY_TOKEN` secret in GitHub

### How to Get Project ID

The project ID is pre-configured: **`2077acd9-f81f-47ba-b8c7-8bf6905f45fc`**

Alternatively, you can find it:
1. Open your Railway project
2. Go to **Settings**
3. Copy the **Project ID**

---

## Automated Deployment

### Production Deployment

Automatic deployment to production occurs:
- On every push to `main` branch
- Manual trigger via GitHub Actions

**Workflow:** `.github/workflows/deploy-railway.yml`

**Features:**
- ✅ Secret validation
- ✅ Dependency caching
- ✅ Build verification
- ✅ Automated deployment
- ✅ Health check validation
- ✅ Auto-rollback on failure
- ✅ Issue creation on failure

### Preview Deployment (PR)

Automatic preview deployment on:
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

**Workflow:** `.github/workflows/deploy-railway-preview.yml`

**Features:**
- ✅ Ephemeral preview environment per PR
- ✅ Automatic PR comments with preview URL
- ✅ Health check validation
- ✅ Auto-cleanup when PR is closed
- ✅ Skip deployment with `skip-deployment` label

### Secret Synchronization

Manually sync secrets from GitHub to Railway:

1. Go to **Actions** → **Sync Railway Secrets**
2. Click **Run workflow**
3. Select environment:
   - `production` - Production environment only
   - `preview` - Preview environment only
   - `all` - Both environments
4. Enable **dry_run** to preview changes without applying

**Workflow:** `.github/workflows/sync-railway-secrets.yml`

---

## Manual Deployment

### Using Railway CLI

#### 1. Install and Login

```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# Login to Railway
railway login
```

#### 2. Link to Project

```bash
# Link to pre-configured project
railway link 2077acd9-f81f-47ba-b8c7-8bf6905f45fc

# Verify link
railway status
```

#### 3. Set Environment Variables

```bash
# From .env file
railway variables --set $(cat .env | xargs)

# Or individually
railway variables --set SOLANA_RPC_URL="your-rpc-url"
railway variables --set WALLET_PRIVATE_KEY="your-private-key"
railway variables --set ADMIN_USERNAME="admin"
railway variables --set ADMIN_PASSWORD="your-password"
railway variables --set JWT_SECRET="your-jwt-secret"
```

#### 4. Deploy

```bash
# Deploy and follow logs
railway up

# Deploy in background
railway up --detach

# Deploy specific service
railway up --service backend
```

#### 5. Verify Deployment

```bash
# Get deployment URL
railway domain

# View logs
railway logs

# Check status
railway status
```

---

## Environment Variables

### Required Variables

These **must** be configured for the application to work:

```env
# Solana Configuration
SOLANA_RPC_URL=https://your-node.quiknode.pro/abc123/

# Wallet Configuration
WALLET_PRIVATE_KEY=5J7...xyz  # base58 format

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password_123

# Authentication
JWT_SECRET=random_secret_key_here
```

### Optional Variables

These have sensible defaults but can be customized:

```env
# Environment
NODE_ENV=production  # production, preview, development
LOG_LEVEL=info       # debug, info, warn, error

# Trading Parameters
MINIMUM_PROFIT_SOL=0.01      # Minimum profit threshold (0.01 = 0.01 SOL)
MAX_SLIPPAGE=0.01            # Maximum slippage (0.01 = 1%)

# Dev Fee Configuration
DEV_FEE_ENABLED=true         # Enable dev fee (true/false)
DEV_FEE_PERCENTAGE=0.10      # Dev fee percentage (0.10 = 10%)

# Performance
MAX_RETRIES=3                # Maximum retry attempts
TIMEOUT=30000                # Request timeout in milliseconds

# Railway Configuration
PORT=3000                    # Application port (auto-set by Railway)
```

### Environment-Specific Defaults

**Production:**
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `MINIMUM_PROFIT_SOL=0.01`
- `MAX_SLIPPAGE=0.01`
- `DEV_FEE_ENABLED=true`

**Preview:**
- `NODE_ENV=preview`
- `LOG_LEVEL=debug`
- `MINIMUM_PROFIT_SOL=0.05` (more conservative)
- `MAX_SLIPPAGE=0.005` (tighter slippage)
- `DEV_FEE_ENABLED=false`

---

## Health Checks

### Health Check Endpoint

**Path:** `/api/health`

**Returns:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "heapUsed": 150,
    "heapTotal": 256,
    "rss": 300
  },
  "bot": {
    "running": true,
    "paused": false,
    "scanCount": 120,
    "opportunitiesFound": 5,
    "tradesExecuted": 2,
    "totalProfit": 0.05,
    "lastScanTime": 1703001234567,
    "lastTradeTime": 1703001230000
  },
  "timestamp": 1703001234567
}
```

**Status Codes:**
- `200` - Healthy (all systems operational)
- `503` - Unhealthy (service degraded or stopped)

### Railway Health Check Configuration

Configured in `railway.json`:

```json
{
  "healthcheckPath": "/api/health",
  "healthcheckTimeout": 30,
  "healthcheckInterval": 60,
  "healthcheckMaxRetries": 5
}
```

**Behavior:**
- Railway checks `/api/health` every 60 seconds
- Wait up to 30 seconds for response
- Retry up to 5 times on failure
- Auto-restart if health checks consistently fail

### Manual Health Check

```bash
# Get deployment URL
DEPLOY_URL=$(railway domain)

# Check health
curl "$DEPLOY_URL/api/health"

# Check metrics
curl "$DEPLOY_URL/api/metrics"
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Missing Secrets"

**Problem:** Required secrets are not configured.

**Solution:**
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add all required secrets (see [Required Secrets](#required-secrets))
3. Re-run the workflow

#### 2. Health Check Fails

**Problem:** `/api/health` returns 503 or times out.

**Possible Causes:**
- RPC connection failed
- Wallet private key invalid
- Insufficient SOL balance
- Application crashed

**Solution:**
```bash
# Check logs
railway logs

# Verify environment variables
railway variables

# Test RPC connection
curl -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Check wallet balance
# (see logs for wallet address)
```

#### 3. Build Fails

**Problem:** `npm run build` fails during deployment.

**Solution:**
1. Check build logs: `railway logs`
2. Verify `package.json` scripts are correct
3. Ensure all dependencies are in `package.json`
4. Test locally: `npm ci && npm run build`

#### 4. Application Crashes on Start

**Problem:** Application starts but immediately crashes.

**Solution:**
```bash
# View crash logs
railway logs --tail 100

# Common issues:
# - Missing environment variables
# - Invalid RPC URL
# - Invalid private key format
# - Port binding issues (Railway sets PORT automatically)
```

#### 5. RPC Rate Limiting

**Problem:** "429 Too Many Requests" errors in logs.

**Solution:**
1. Upgrade to paid RPC provider
2. Increase polling intervals in `.env`:
   ```env
   SCAN_INTERVAL=10000  # 10 seconds instead of 5
   ```
3. Use QuickNode, Helius, or Triton for production

#### 6. Low Wallet Balance

**Problem:** "Insufficient balance" errors.

**Solution:**
1. Check balance: See health endpoint or logs
2. Fund wallet with at least 0.5 SOL
3. Application requires SOL for:
   - Transaction fees
   - Flash loan deposits
   - DEX swaps

---

## Rollback Procedures

### Automatic Rollback

The deployment workflow automatically rolls back on failure:
- Health check fails
- Build fails
- Deployment fails

**No manual intervention needed** - previous version restored automatically.

### Manual Rollback

#### Using Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/)
2. Open your project
3. Go to **Deployments**
4. Find the previous successful deployment
5. Click **Redeploy**

#### Using Railway CLI

```bash
# List recent deployments
railway status

# Rollback to previous deployment
railway rollback

# Rollback to specific deployment ID
railway rollback <deployment-id>
```

### Emergency Rollback

If the application is completely broken:

```bash
# Stop current deployment
railway down

# Deploy from a specific commit
git checkout <working-commit-sha>
railway up
```

---

## Cost Optimization

### Railway Pricing

Railway uses usage-based pricing:
- **Hobby Plan:** $5/month for resources
- **Pro Plan:** Pay-as-you-go based on usage

**Key Metrics:**
- CPU usage
- RAM usage
- Network egress
- Build minutes

### Optimization Tips

#### 1. Use Sleep Mode

For non-critical environments:

```json
{
  "deploy": {
    "sleepApplication": true
  }
}
```

Application sleeps after 1 hour of inactivity, wakes on request.

#### 2. Optimize Polling Intervals

```env
# Production: Balance between responsiveness and cost
SCAN_INTERVAL=5000  # 5 seconds

# Development: Less frequent
SCAN_INTERVAL=30000  # 30 seconds
```

#### 3. Use Preview Environments Sparingly

Preview deployments cost money:
- Add `skip-deployment` label to PRs that don't need preview
- Clean up old preview deployments
- Limit preview duration

#### 4. Monitor Resource Usage

```bash
# Check resource usage
railway status

# View metrics
curl "$DEPLOY_URL/api/metrics"
```

#### 5. Optimize Build Times

Railway charges for build minutes:
- Use dependency caching (already configured)
- Keep dependencies minimal
- Use `.dockerignore` to exclude unnecessary files

#### 6. Use Spot Instances (Advanced)

For non-critical workloads, consider spot instances (if available).

### Cost Estimates

**Typical Usage (Hobby Plan):**
- Backend application: ~$3-5/month
- Preview environments: ~$1-2/month per active PR
- **Total:** ~$5-10/month

**Production Usage (Pro Plan):**
- High-traffic application: ~$20-50/month
- Multiple environments: +$5-10/month per environment
- **Total:** ~$30-70/month

**Tips to Stay Within Hobby Plan:**
- Run only production environment
- Disable preview deployments
- Use sleep mode for development
- Monitor usage regularly

---

## Additional Resources

### Documentation

- [Railway Docs](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [GXQ Studio API Documentation](./API_VALIDATION.md)

### Related Guides

- [Quick Start Guide](./QUICK_START.md)
- [Deployment Automation](./DEPLOYMENT_AUTOMATION.md)
- [API Validation](./API_VALIDATION.md)
- [Vercel Deployment](../VERCEL_DEPLOY.md)

### Support

- **GitHub Issues:** [github.com/SMSDAO/reimagined-jupiter/issues](https://github.com/SMSDAO/reimagined-jupiter/issues)
- **Railway Support:** [help.railway.app](https://help.railway.app/)

---

## Summary Checklist

Before deploying to Railway, ensure:

- [ ] Railway account created
- [ ] Railway CLI installed (for manual deployment)
- [ ] All required secrets configured in GitHub
- [ ] RPC provider selected (QuickNode/Helius/Triton recommended)
- [ ] Wallet funded with at least 0.5 SOL
- [ ] Environment variables reviewed and customized
- [ ] Health check endpoint tested locally
- [ ] Build succeeds locally: `npm run build`
- [ ] Tests pass: `npm test`

**Ready to deploy?** Run:

```bash
# Automated setup
bash scripts/setup-railway.sh

# Or manual deployment
railway up
```

---

**Need help?** See [Troubleshooting](#troubleshooting) or open an issue on GitHub.
