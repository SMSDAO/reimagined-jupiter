# Dev Branch Deployment & Sync Guide

## Overview

The `dev` branch is now fully configured for automated testing, deployment previews, and continuous integration. This guide explains how to work with the dev branch and keep it in sync with main.

## Branch Strategy

```
main (production)
  ↓
develop/dev (staging/testing)
  ↓
feature/* (development)
```

## CI/CD Automation

### Workflows Supporting Dev Branch

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Triggers: Push/PR to main, develop, or dev
   - Actions: Lint, type-check, test, build
   - Matrix: Node 18 & 20

2. **Deploy Preview** (`.github/workflows/deploy-preview.yml`)
   - Triggers: PR to main, develop, or dev
   - Actions: Deploy to Vercel preview environment
   - Provides preview URL in PR comments

3. **Auto-merge** (`.github/workflows/auto-merge.yml`)
   - Automatic PR merging when all checks pass
   - Requires: 1+ approval, no changes requested
   - Label: `auto-merge` or Dependabot PRs

## Environment Setup

### Required Environment Variables

For dev branch deployments, configure these in your CI/CD environment:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_private_key_here

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password
JWT_SECRET=your_jwt_secret

# Trading Configuration
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
GAS_BUFFER=1.5

# Dev Fee (configure before enabling)
DEV_FEE_ENABLED=true
DEV_FEE_PERCENTAGE=0.10
DEV_FEE_WALLET=your_wallet_address

# Vercel Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_ORG_ID=your_org_id

# Optional: Enhanced Features
QUICKNODE_RPC_URL=your_quicknode_url
NEYNAR_API_KEY=your_neynar_key
```

### GitHub Secrets Configuration

Navigate to: `Settings` → `Secrets and variables` → `Actions`

Add these secrets:
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`
- `NEXT_PUBLIC_RPC_URL` (optional)
- `CODECOV_TOKEN` (optional)

## Syncing Dev with Main

### Method 1: Merge from Main (Recommended)

```bash
# Update local branches
git checkout main
git pull origin main

git checkout dev
git pull origin dev

# Merge main into dev
git merge main

# Resolve any conflicts
# Then push
git push origin dev
```

### Method 2: Rebase (For cleaner history)

```bash
git checkout dev
git pull origin dev

# Rebase dev on top of main
git rebase origin/main

# Force push (use with caution)
git push origin dev --force-with-lease
```

### Method 3: Create Sync PR

```bash
# Create a sync branch
git checkout -b sync-main-to-dev main
git merge origin/dev

# Push and create PR
git push origin sync-main-to-dev
# Open PR: sync-main-to-dev → dev
```

## Testing on Dev Branch

### Local Testing

```bash
# Install dependencies
npm ci
cd webapp && npm ci

# Run linting
npm run lint
npm run lint:webapp

# Run type checking
npm run type-check
npm run type-check:webapp

# Run tests
npm test
npm run test:webapp

# Build
npm run build:backend
npm run build:webapp
```

### Automated Testing

Push to dev branch triggers:
- ✅ ESLint validation (backend & webapp)
- ✅ TypeScript type checking
- ✅ Unit tests (39 tests)
- ✅ Security audits
- ✅ Build verification (Node 18 & 20)

## Deployment Preview

### Preview Deployments

Every PR to dev automatically:
1. Builds the webapp
2. Deploys to Vercel preview
3. Comments preview URL on PR
4. Updates preview on new commits

Example preview URL:
```
https://reimagined-jupiter-xxx.vercel.app
```

### Health Checks

Preview deployments include:
- `/api/health` - API health status
- Root page - Full webapp functionality

## Production Readiness Checklist

### Code Quality ✅
- [x] All mock/placeholder code replaced or documented
- [x] No TODO/FIXME comments remain
- [x] ESLint configuration enforces quality
- [x] TypeScript strict mode enabled

### Security ✅
- [x] No secrets in code
- [x] All sensitive data from environment variables
- [x] Input validation on all endpoints
- [x] Transaction security validated
- [x] MEV protection documented

### Testing ✅
- [x] 39 unit tests passing
- [x] Integration test framework ready
- [x] CI runs tests automatically
- [x] Type safety enforced

### Documentation ✅
- [x] Environment variables documented
- [x] Security guide complete
- [x] CI/CD setup documented
- [x] Architecture clearly explained

## Pending Integrations

These features are scaffolded and ready for production SDK integration:

### 1. Marginfi V2 Flash Loans
**Status:** Validated framework, awaiting SDK

**To Enable:**
```bash
npm install @mrgnlabs/marginfi-client-v2
```

Update `src/integrations/marginfiV2.ts`:
- Replace placeholder instructions with SDK calls
- Test on devnet first
- Deploy to mainnet

### 2. Solana Name Service (SNS)
**Status:** Error handling ready, needs package

**To Enable:**
```bash
npm install @bonfida/spl-name-service
```

Update `src/utils/profitDistribution.ts`:
- Implement SNS resolution logic
- Test with known .sol domains

### 3. Specific Airdrop Programs
**Status:** Wallet validation working, program integration needed

**To Enable:**
Integrate with specific airdrop program instructions:
- Jupiter airdrop program
- Jito airdrop program
- Pyth airdrop program

## Monitoring & Debugging

### View CI Logs

1. Go to repository → Actions tab
2. Select workflow run
3. View job logs for details

### View Deployment Logs

```bash
# If using Vercel CLI
vercel logs --project=reimagined-jupiter

# Or check Vercel dashboard
# https://vercel.com/dashboard
```

### Common Issues

**Issue:** CI fails with dependency errors
```bash
# Solution: Update package-lock.json
npm ci
npm run build
git add package-lock.json
git commit -m "Update dependencies"
```

**Issue:** Preview deployment fails
```bash
# Solution: Check Vercel secrets are configured
# Verify VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID
```

**Issue:** Tests fail on CI but pass locally
```bash
# Solution: Ensure Node version matches (use 20)
nvm use 20
npm test
```

## Best Practices

### 1. Always Test Before Pushing

```bash
npm run validate  # Runs lint, type-check, and tests
```

### 2. Use Descriptive Commit Messages

```bash
git commit -m "feat: Add new feature X"
git commit -m "fix: Resolve issue with Y"
git commit -m "docs: Update README"
```

### 3. Keep Dev Branch Updated

Sync with main at least weekly to avoid merge conflicts.

### 4. Review Preview Deployments

Always check the preview URL before merging to ensure:
- UI renders correctly
- API endpoints work
- No console errors

### 5. Monitor CI Checks

Don't merge until all CI checks pass:
- ✅ Lint
- ✅ Type check
- ✅ Tests
- ✅ Build

## Emergency Rollback

If dev deployment has issues:

```bash
# Revert to last known good commit
git revert HEAD
git push origin dev

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin dev --force-with-lease
```

## Support & Resources

- **CI/CD Documentation:** `.github/CI_CD_SETUP_GUIDE.md`
- **Security Guide:** `SECURITY_GUIDE.md`
- **Architecture:** `ARCHITECTURE.md`
- **Contributing:** `CONTRIBUTING.md`

## Verification Commands

Run these before considering dev branch production-ready:

```bash
# 1. Clean install
rm -rf node_modules webapp/node_modules
npm ci
cd webapp && npm ci && cd ..

# 2. Lint everything
npm run lint && npm run lint:webapp

# 3. Type check
npm run type-check && npm run type-check:webapp

# 4. Test
npm test

# 5. Build
npm run build

# 6. Security audit
npm audit --audit-level=high
cd webapp && npm audit --audit-level=high
```

All commands should pass with zero errors.

---

**Last Updated:** 2025-12-21
**Branch Status:** ✅ Fully Automated & Sync-Ready
**Next Steps:** Continue Phase 4 - Build & Test Validation
