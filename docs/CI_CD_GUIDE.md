# CI/CD Guide - GXQ Studio

## Overview

This guide covers the CI/CD infrastructure for GXQ Studio, including GitHub Actions workflows, automated deployments, and operational procedures.

---

## CI/CD Architecture

### Pipeline Overview

```
Push to master/main
    ↓
GXQ Master CI Pipeline
    ↓
[validate-environment] → [install-dependencies]
    ↓
[lint-and-typecheck] → [build-backend] + [build-webapp]
    ↓
[validate-build] + [security-scan]
    ↓
[master-ci-summary]
    ↓
Manual trigger or tag push
    ↓
GXQ Deploy Production
    ↓
[prepare-deployment] → [deploy-vercel] + [deploy-railway]
    ↓
[post-deployment-health]
```

---

## GitHub Actions Workflows

### 1. GXQ Master CI Pipeline

**File**: `.github/workflows/gxq-master-ci.yml`

**Triggers**:
- Push to `master` or `main` branch
- Manual workflow dispatch

**Purpose**: Comprehensive validation and build verification for master branch

**Jobs**:

#### validate-environment
- Sets up Node.js 20.x
- Creates mock environment file for CI
- Runs `scripts/env-check.sh`

#### install-dependencies
- Installs backend dependencies with `npm ci`
- Installs webapp dependencies
- Caches `node_modules` for speed

#### lint-and-typecheck
- Runs ESLint on backend and webapp (non-blocking)
- Runs TypeScript type-checking (blocking)

#### build-backend
- Compiles TypeScript backend
- Uploads `dist/` artifacts

#### build-webapp
- Builds Next.js webapp
- Uploads `webapp/.next/` artifacts

#### validate-build
- Downloads artifacts
- Runs `scripts/validate-build.sh`
- Verifies all required files exist

#### security-scan
- Runs `npm audit --production --audit-level=high`
- Non-blocking but logged

#### master-ci-summary
- Aggregates all job results
- Creates GitHub step summary
- Fails if critical jobs failed

**Timeout**: 10-15 minutes per job

---

### 2. GXQ PR Check

**File**: `.github/workflows/gxq-pr-check.yml`

**Triggers**:
- Pull requests to `master` or `main`
- Only runs if PR is not draft

**Purpose**: Validate PR changes before merge

**Features**:
- Full validation pipeline (env, lint, typecheck, build)
- Calculates and reports artifact sizes
- Posts automated comment to PR with results
- Security scanning

**PR Comment Format**:
```markdown
## 🔍 GXQ PR Check Results

✅ **All validation checks passed!**

### Build Artifacts

| Component | Size |
|-----------|------|
| Backend (dist/) | 15MB |
| Webapp (.next/) | 42MB |

### Checks Performed

- ✅ Environment validation
- ✅ Dependency installation
- ✅ Linting (warnings allowed)
- ✅ Type checking
- ✅ Backend build
- ✅ Webapp build
- ✅ Build artifact validation

---

*Ready for review and merge* 🚀
```

---

### 3. GXQ Deploy Production

**File**: `.github/workflows/gxq-deploy-production.yml`

**Triggers**:
- Manual workflow dispatch with `deploy_target` choice (all/vercel/railway)
- Push to tags matching `v*` pattern

**Purpose**: Deploy to production environments

**Jobs**:

#### prepare-deployment
- Installs all dependencies
- Builds backend and webapp
- Validates artifacts
- Uploads for deployment jobs

#### deploy-vercel
- Runs `scripts/deploy-vercel.sh`
- Requires `VERCEL_TOKEN` secret
- Sets environment: `production-vercel`

#### deploy-railway
- Downloads backend artifacts
- Installs Railway CLI
- Deploys with `railway up`
- Requires `RAILWAY_TOKEN` secret
- Sets environment: `production-railway`

#### post-deployment-health
- Waits 30 seconds for stabilization
- Checks Vercel health endpoint
- Checks Railway health endpoint
- Reports status

#### notify-deployment
- Sends Slack notification (if `SLACK_WEBHOOK_URL` configured)
- Creates deployment summary

**Required Secrets**:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID` (optional)
- `VERCEL_PROJECT_ID` (optional)
- `RAILWAY_TOKEN`
- `VERCEL_PRODUCTION_URL` (optional)
- `RAILWAY_PRODUCTION_URL` (optional)
- `SLACK_WEBHOOK_URL` (optional)

---

### 4. GXQ Scheduled Health Check

**File**: `.github/workflows/gxq-scheduled-health.yml`

**Triggers**:
- Cron schedule: Every 6 hours (`0 */6 * * *`)
- Manual workflow dispatch

**Purpose**: Monitor production services and alert on issues

**Features**:
1. Checks Vercel (webapp) health
2. Checks Railway (backend) health endpoint
3. Checks Solana RPC endpoint
4. Generates health report
5. Creates GitHub issue if any service is unhealthy
6. Auto-closes issues when services recover

**Issue Management**:
- Creates new issue with label `health-check,automated,priority-high` if services down
- Comments on existing issue if already open
- Closes issue and comments when all services healthy

---

## Configuring Secrets

### GitHub Repository Secrets

Navigate to: **Settings** → **Secrets and variables** → **Actions**

#### Required for Deployment

| Secret | Description | How to Get |
|--------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | https://vercel.com/account/tokens |
| `RAILWAY_TOKEN` | Railway API token | `railway login` then `railway whoami --token` |

#### Optional for Enhanced Features

| Secret | Description |
|--------|-------------|
| `VERCEL_ORG_ID` | Vercel organization ID (from project settings) |
| `VERCEL_PROJECT_ID` | Vercel project ID (from project settings) |
| `VERCEL_PRODUCTION_URL` | Your production Vercel URL |
| `RAILWAY_PRODUCTION_URL` | Your production Railway URL |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications |
| `NEXT_PUBLIC_RPC_URL` | Public Solana RPC URL for builds |

### Setting Up Vercel

1. **Get Vercel Token**
   ```bash
   # Visit https://vercel.com/account/tokens
   # Create new token with appropriate scopes
   ```

2. **Add to GitHub Secrets**
   - Name: `VERCEL_TOKEN`
   - Value: Your token from step 1

3. **Optional: Link Project**
   - Run `vercel link` in your repo
   - Add org and project IDs to secrets

### Setting Up Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Get Token**
   ```bash
   railway login
   railway whoami --token
   ```

3. **Add to GitHub Secrets**
   - Name: `RAILWAY_TOKEN`
   - Value: Token from step 2

4. **Configure railway.json**
   - Ensure `railway.json` exists in repo root
   - Configure services and environment

---

## Manual Deployment Procedures

### Deploy to Vercel

**Option 1: Via GitHub Actions**
1. Go to **Actions** tab
2. Select **GXQ Deploy Production**
3. Click **Run workflow**
4. Choose `deploy_target: vercel`
5. Click **Run workflow**

**Option 2: Via Command Line**
```bash
npm run deploy:vercel
```

**Option 3: Via Git Tag**
```bash
git tag v2025.01.15-1200
git push origin v2025.01.15-1200
```

### Deploy to Railway

**Option 1: Via GitHub Actions**
1. Go to **Actions** tab
2. Select **GXQ Deploy Production**
3. Click **Run workflow**
4. Choose `deploy_target: railway`
5. Click **Run workflow**

**Option 2: Via Command Line**
```bash
npm run deploy:railway
```

### Deploy Both (Full Production)

**Option 1: Via GitHub Actions**
1. Go to **Actions** tab
2. Select **GXQ Deploy Production**
3. Click **Run workflow**
4. Choose `deploy_target: all`
5. Click **Run workflow**

**Option 2: Via Master Orchestrator**
```bash
npm run master          # Prepare everything
npm run deploy:vercel   # Deploy webapp
npm run deploy:railway  # Deploy backend
npm run health          # Verify
```

---

## Rollback Strategies

### Vercel Rollback

**Via Dashboard**:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Deployments** tab
4. Find previous working deployment
5. Click **⋮** → **Promote to Production**

**Via CLI**:
```bash
vercel rollback [deployment-url]
```

### Railway Rollback

**Via Dashboard**:
1. Go to Railway dashboard
2. Select your project
3. Go to **Deployments**
4. Click on previous working deployment
5. Click **Redeploy**

**Via CLI**:
```bash
railway rollback [deployment-id]
```

### Git Rollback

If both services need rollback:
```bash
# Find last working commit
git log --oneline

# Create rollback commit
git revert [bad-commit-hash]

# Or reset (destructive)
git reset --hard [last-good-commit]
git push --force origin master
```

---

## Monitoring and Alerting

### Automated Health Checks

The system automatically:
- Checks service health every 6 hours
- Creates GitHub issues for failures
- Auto-closes issues when recovered

### Manual Health Check

```bash
npm run health
```

### View Logs

**Vercel**:
```bash
vercel logs --follow
# Or via dashboard: https://vercel.com/dashboard
```

**Railway**:
```bash
railway logs --follow
# Or via dashboard: railway.app
```

**Local Aggregation**:
```bash
npm run logs all        # All logs
npm run logs backend    # Backend only
npm run logs webapp     # Webapp only
```

### Performance Monitoring

Generate performance report:
```bash
npm run perf
```

View reports in `reports/` directory:
- `performance-YYYY-MM-DD.md`
- `metrics.json`

---

## Troubleshooting CI/CD

### Issue: Workflow Fails on Dependencies

**Symptoms**: `install-dependencies` job fails

**Solution**:
1. Check `package-lock.json` is committed
2. Clear npm cache:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   git commit -m "fix: Update package-lock.json"
   ```

### Issue: Build Fails in CI but Works Locally

**Symptoms**: `build-backend` or `build-webapp` fails in CI

**Solution**:
1. Check Node.js version matches (20.x)
2. Verify TypeScript errors:
   ```bash
   npm run type-check
   npm run type-check:webapp
   ```
3. Check for missing environment variables in workflow

### Issue: Deployment Fails with "Token Invalid"

**Symptoms**: Deploy jobs fail with authentication error

**Solution**:
1. Verify secret is set in GitHub: **Settings** → **Secrets**
2. Check token hasn't expired
3. Regenerate token and update secret

### Issue: Health Check Creates False Alarms

**Symptoms**: Health check workflow reports services down when they're actually up

**Solution**:
1. Verify URLs in secrets are correct
2. Check services are actually accessible
3. Adjust timeout in workflow if services are slow to respond

### Issue: PR Check Doesn't Run

**Symptoms**: PR opened but no check runs

**Solution**:
1. Ensure PR is not in draft state
2. Check workflow file is in `.github/workflows/`
3. Verify workflow has correct trigger configuration

---

## Best Practices

### Commit Messages

Use conventional commits for clarity:
```
feat: Add new feature
fix: Bug fix
docs: Documentation update
chore: Maintenance task
ci: CI/CD changes
```

### Branch Strategy

- `master`/`main`: Production-ready code only
- `develop`: Integration branch
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fixes

### PR Process

1. Create feature branch
2. Make changes
3. Open PR to `master`
4. Wait for **GXQ PR Check** to pass
5. Request review
6. Merge when approved
7. **GXQ Master CI** runs automatically
8. Deploy via workflow dispatch or tag

### Deployment Cadence

- **Development**: Continuous (every merge to develop)
- **Staging**: Daily or per feature completion
- **Production**: Weekly or on-demand via workflow dispatch

### Monitoring Schedule

- **Automated**: Every 6 hours via scheduled workflow
- **Manual**: Daily via `npm run health`
- **Performance**: Weekly via `npm run perf`

---

## Integration with External Tools

### Slack Notifications

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add `SLACK_WEBHOOK_URL` to GitHub secrets
3. Notifications sent automatically on deployments

### Discord Notifications

Similar to Slack:
1. Create Discord webhook in server settings
2. Add `DISCORD_WEBHOOK_URL` to GitHub secrets
3. Modify workflow to use Discord action

### Status Page Integration

To integrate with statuspage.io or similar:
1. Add API key to secrets
2. Modify health check workflow to post updates
3. Use their API to update component status

---

## Maintenance

### Updating Workflows

1. Edit workflow files in `.github/workflows/`
2. Test in feature branch first
3. Monitor first few runs after merge
4. Rollback if issues arise

### Updating Scripts

1. Edit scripts in `scripts/`
2. Test locally first: `bash scripts/script-name.sh`
3. Update documentation if behavior changes
4. Commit and push

### Dependency Updates

Use Dependabot or Renovate:
1. Enable in repository settings
2. Review and merge dependency PRs
3. Monitor CI after merges

---

## Security Considerations

1. **Never commit secrets** to repository
2. **Use GitHub Secrets** for sensitive data
3. **Rotate tokens** regularly (quarterly)
4. **Review npm audit** results in CI
5. **Enable branch protection** on master/main
6. **Require PR reviews** before merge
7. **Enable signed commits** for added security

---

## Support

- **Documentation**: See `SMART_BRAIN_OPERATOR.md` for script details
- **Issues**: Report at https://github.com/SMSDAO/reimagined-jupiter/issues
- **Discussions**: Use GitHub Discussions for questions

---

## Changelog

### v1.0.0 (2025-01-01)
- Initial CI/CD infrastructure
- Four GitHub Actions workflows
- Automated health monitoring
- Deployment automation
- Performance reporting

---

*Last updated: 2025-01-01*
