# Deployment Automation Guide

## Overview

This guide describes the automated deployment workflows for the GXQ Studio platform, including Vercel and Railway deployments with health checks and automatic rollback.

## Deployment Workflows

### 1. Vercel Deployment (`.github/workflows/deploy-vercel.yml`)

**Triggers:**
- Push to `main` branch (automatic)
- Manual workflow dispatch with environment selection

**Features:**
- ✅ Automatic build and deployment
- ✅ Health check after deployment
- ✅ Automatic rollback on failure
- ✅ Deployment status tracking
- ✅ PR comments with preview URLs

**Required Secrets:**
```yaml
VERCEL_TOKEN         # Vercel API token
VERCEL_ORG_ID        # Vercel organization ID
VERCEL_PROJECT_ID    # Vercel project ID
```

**Manual Deployment:**
```bash
# Trigger via GitHub CLI
gh workflow run deploy-vercel.yml -f environment=production

# Or via GitHub UI
# Actions → Deploy to Vercel → Run workflow
```

**Deployment Steps:**
1. Checkout code
2. Install Vercel CLI
3. Pull Vercel environment configuration
4. Build project artifacts
5. Deploy to Vercel
6. Create GitHub deployment record
7. Run health check
8. Comment on PR (if applicable)
9. Rollback on failure

### 2. Railway Deployment (`.github/workflows/deploy-railway.yml`)

**Triggers:**
- Push to `main` branch (automatic)
- Manual workflow dispatch

**Features:**
- ✅ Automatic build and deployment
- ✅ Health check with retries
- ✅ Endpoint validation tests
- ✅ Deployment status tracking
- ✅ Error reporting via GitHub issues

**Required Secrets:**
```yaml
RAILWAY_TOKEN        # Railway API token
RAILWAY_PROJECT_ID   # Railway project ID
```

**Manual Deployment:**
```bash
# Trigger via GitHub CLI
gh workflow run deploy-railway.yml

# Or via Railway CLI
railway up
```

**Deployment Steps:**
1. Checkout code
2. Install dependencies
3. Run tests
4. Build project
5. Install Railway CLI
6. Deploy to Railway
7. Wait for deployment to be ready
8. Run health check with retries
9. Test all endpoints
10. Create deployment record

## Health Check System

### Health Check Endpoint

**URL:** `/api/health`

**Response:**
```json
{
  "status": "healthy",
  "rpcLatency": 150,
  "walletBalance": 1.5,
  "walletAddress": "...",
  "jupiterApiStatus": "online",
  "uptime": 3600,
  "errorRate": 0.5,
  "timestamp": 1703001234567
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy (degraded)

### Health Check Process

1. **RPC Connection Check**
   - Connect to Solana RPC
   - Measure latency
   - Verify connectivity

2. **Wallet Check**
   - Load wallet from private key
   - Check balance
   - Warn if balance < 0.01 SOL

3. **Jupiter API Check**
   - Test Jupiter quote API
   - Verify availability
   - 5-second timeout

4. **Error Rate Check**
   - Calculate error rate
   - Status degraded if > 20%
   - Status unhealthy if > 50%

### Automatic Rollback

**Trigger Conditions:**
- Health check fails after deployment
- Deployment build fails
- Critical error detected

**Rollback Process:**
1. Detect failure via health check
2. Trigger rollback job
3. Revert to previous deployment
4. Notify via GitHub
5. Create incident issue

**Manual Rollback:**
```bash
# Vercel
vercel rollback --token=$VERCEL_TOKEN

# Railway
railway rollback
```

## Deployment Environments

### Production (Vercel)
- **URL:** `https://reimagined-jupiter.vercel.app`
- **Branch:** `main`
- **Auto-deploy:** Yes
- **Rollback:** Automatic on failure

### Production (Railway)
- **URL:** Auto-generated
- **Branch:** `main`
- **Auto-deploy:** Yes
- **Health checks:** 5 retries with 10s delay

### Preview (Vercel)
- **URL:** Auto-generated per PR
- **Branch:** Any PR branch
- **Auto-deploy:** On PR sync
- **Comments:** Automatic PR comments

## Required Environment Variables

### All Environments

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_base58_private_key

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password
JWT_SECRET=your_32_character_secret

# Trading Configuration
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01

# Optional: Cron security
CRON_SECRET=your_cron_secret
```

### Vercel-Specific

```env
# For webapp builds
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Setting Environment Variables

**Vercel:**
```bash
vercel env add SOLANA_RPC_URL production
vercel env add WALLET_PRIVATE_KEY production
```

**Railway:**
```bash
railway variables set SOLANA_RPC_URL=your_value
railway variables set WALLET_PRIVATE_KEY=your_value
```

**GitHub Actions (Secrets):**
1. Go to repository Settings
2. Click Secrets and variables → Actions
3. Click New repository secret
4. Add each secret

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] RPC endpoint accessible
- [ ] Wallet has sufficient balance
- [ ] Admin credentials set
- [ ] JWT secret configured
- [ ] Code reviewed and approved

### Deployment

- [ ] CI checks passed
- [ ] Deployment triggered
- [ ] Build completed successfully
- [ ] Health check passed
- [ ] Endpoints responding
- [ ] No errors in logs

### Post-Deployment

- [ ] Verify functionality
- [ ] Check health metrics
- [ ] Monitor error rates
- [ ] Test critical paths
- [ ] Verify wallet balance
- [ ] Check RPC connectivity

## Monitoring Deployments

### View Deployment Status

**GitHub:**
```bash
# List deployments
gh api repos/:owner/:repo/deployments

# View specific deployment
gh api repos/:owner/:repo/deployments/:id

# View deployment statuses
gh api repos/:owner/:repo/deployments/:id/statuses
```

**Vercel:**
```bash
# View deployments
vercel ls

# View logs
vercel logs [deployment-url]
```

**Railway:**
```bash
# View deployments
railway status

# View logs
railway logs
```

### Monitor Health

```bash
# Production health check
curl https://your-domain.vercel.app/api/health

# Watch health continuously
watch -n 5 'curl -s https://your-domain.vercel.app/api/health | jq'
```

### Alert Configuration

Set up alerts for:
- Deployment failures
- Health check failures
- High error rates
- Low wallet balance
- RPC connectivity issues

## Troubleshooting

### Deployment Fails to Build

**Check:**
1. Build logs in GitHub Actions
2. Dependencies installed correctly
3. TypeScript compilation errors
4. Environment variables set

**Solution:**
```bash
# Test build locally
npm run build

# Check for errors
npm run lint
```

### Health Check Fails

**Check:**
1. RPC URL accessible
2. Wallet private key valid
3. Environment variables set
4. Jupiter API accessible

**Solution:**
```bash
# Test RPC connection
curl -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Test health endpoint
curl https://your-domain.vercel.app/api/health
```

### Rollback Doesn't Work

**Check:**
1. Previous deployment exists
2. Deployment permissions
3. API tokens valid

**Solution:**
```bash
# List previous deployments
vercel ls

# Manual rollback to specific deployment
vercel rollback [deployment-url]
```

### Environment Variables Not Set

**Check:**
1. Variables configured in platform
2. Variable names match exactly
3. Deployment refreshed after changes

**Solution:**
```bash
# Vercel: List variables
vercel env ls

# Railway: List variables
railway variables
```

## Auto-Merge Integration

The auto-merge workflow now includes deployment checks:

**Requirements:**
1. ✅ All CI checks passed
2. ✅ At least 1 approval
3. ✅ No changes requested
4. ✅ Deployment successful (if triggered)
5. ✅ Health checks passing

**Labels:**
- `auto-merge` - Enable auto-merge for PR
- `skip-deployment` - Skip deployment checks

## Best Practices

### 1. Test Before Deploying

```bash
# Run full test suite
npm test

# Build locally
npm run build

# Lint code
npm run lint

# Validate endpoints
npm run validate-endpoints http://localhost:3000
```

### 2. Use Preview Deployments

- Create PR for all changes
- Review preview deployment
- Test thoroughly before merging
- Use preview URL for stakeholder review

### 3. Monitor After Deployment

- Check health immediately
- Monitor for 5-10 minutes
- Review error logs
- Test critical functionality

### 4. Gradual Rollout

1. Deploy to preview first
2. Test thoroughly
3. Deploy to production
4. Monitor closely
5. Rollback if issues detected

### 5. Keep Secrets Secure

- Never commit secrets
- Rotate regularly
- Use different secrets per environment
- Limit access to production secrets

## Deployment Metrics

Track these metrics:
- Deployment frequency
- Deployment success rate
- Mean time to deploy
- Rollback frequency
- Health check pass rate
- Error rate post-deployment

## Continuous Improvement

### Regular Tasks

- [ ] Review deployment logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review and optimize build time
- [ ] Update deployment documentation

### Optimization Opportunities

- Implement canary deployments
- Add performance benchmarks
- Set up load testing
- Implement blue-green deployment
- Add deployment notifications (Slack/Discord)

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review platform-specific logs (Vercel/Railway)
3. Test health endpoint
4. Create GitHub issue with `deployment` label
5. Contact platform support if needed

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Solana RPC Endpoints](https://docs.solana.com/cluster/rpc-endpoints)
