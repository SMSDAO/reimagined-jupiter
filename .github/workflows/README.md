# GitHub Actions Workflow Overview

This directory contains all GitHub Actions workflows for the reimagined-jupiter project.

## 📋 Active Workflows

### Core CI/CD Workflows

#### 1. **ci.yml** - Continuous Integration
**Trigger**: Pull requests and pushes to `main`/`develop` branches

**Jobs**:
- `backend-lint-and-test`: Runs on Node.js 18, 20, 22 (matrix)
  - ESLint with `--max-warnings=0`
  - TypeScript validation (`tsc --noEmit`)
  - Jest tests with coverage
  - Coverage upload to Codecov
  - Coverage threshold check (≥90%)

- `webapp-lint-and-test`: Runs on Node.js 18, 20, 22 (matrix)
  - ESLint with `--max-warnings=0`
  - TypeScript validation
  - Environment variable validation
  - Next.js production build

- `security-scan`: Vulnerability scanning
  - npm audit for backend
  - npm audit for webapp
  - Audit report artifacts

- `ci-summary`: Overall status and notifications
  - PR status comment with checklist
  - Slack/Discord notifications (if configured)
  - Overall pass/fail determination

**Concurrency**: Cancels previous runs on new pushes to same ref

#### 2. **preview-deployments.yml** - Preview Deployments
**Trigger**: Pull requests to `main`/`develop` branches

**Jobs**:
- `vercel-preview`: Deploy webapp to Vercel preview
  - Secret validation
  - Vercel CLI deployment
  - Health check
  - PR comment with preview URL

- `railway-preview`: Deploy backend to Railway preview
  - Secret validation
  - Railway CLI deployment
  - Health check
  - PR comment with preview URL

- `preview-summary`: Overall deployment status

**Concurrency**: Cancels previous preview deployments on new pushes

**Labels**:
- `skip-deployment`: Skip preview deployments for this PR

#### 3. **auto-merge.yml** - Auto-Merge PRs
**Trigger**: PR events, PR reviews, check suite completions, manual dispatch

**Requirements**:
- All backend tests pass (Node 18, 20, 22)
- All webapp builds pass (Node 18, 20, 22)
- Security scan completes
- CI summary passes
- Coverage ≥ 90%
- Preview deployments succeed (unless `skip-deployment`)
- At least 1 approval (except Dependabot)
- No changes requested
- Not in draft state

**Labels**:
- `auto-merge`: Enable auto-merge for this PR
- `skip-deployment`: Don't require preview deployments

#### 4. **deploy-vercel.yml** - Production Vercel Deployment
**Trigger**: Push to `main` branch, manual dispatch

**Jobs**:
- `deploy`: Deploy webapp to Vercel production
  - Build and deploy
  - Health check
  - Deployment record creation
  - PR comment (if applicable)
  - Failure notifications

- `rollback-on-failure`: Automatic rollback on failure

#### 5. **deploy-railway.yml** - Production Railway Deployment
**Trigger**: Push to `main` branch, manual dispatch

**Jobs**:
- `deploy`: Deploy backend to Railway production
  - Build and deploy
  - Health check with retries
  - Deployment record creation
  - Failure notifications

- `test-endpoints`: Test deployed API endpoints

### Supporting Workflows

#### 6. **stale.yml** - Stale Issues and PRs Management
**Trigger**: Daily at 00:00 UTC, manual dispatch

**Configuration**:
- Issues: Stale after 60 days, close after 14 days
- PRs: Stale after 30 days, close after 7 days
- Exempt labels: `pinned`, `security`, `high-priority`, `auto-merge`
- Removes stale label when updated

#### 7. **greet-contributors.yml** - Welcome New Contributors
**Trigger**: First-time issue or PR from contributor

**Actions**:
- Welcomes first-time contributors
- Provides helpful resources
- Explains what happens next
- Links to documentation

#### 8. **rename-vercel-hosts.yml** - Vercel Host Management
**Trigger**: Manual dispatch

**Purpose**: Manages Vercel domain configurations

#### 9. **failed-job-handler.yml** - Failed Job Recovery
**Trigger**: Workflow run completion (on failure)

**Purpose**: Handles failed workflow runs and notifications

#### 10. **performance-monitoring.yml** - Performance Tracking
**Trigger**: Scheduled, manual dispatch

**Purpose**: Monitors and tracks performance metrics

## 🔐 Required Secrets

### Vercel
- `VERCEL_TOKEN`: Vercel authentication token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID
- `NEXT_PUBLIC_RPC_URL`: Solana RPC URL (optional, defaults to public)

### Railway
- `RAILWAY_TOKEN`: Railway authentication token
- `RAILWAY_PROJECT_ID`: Railway project ID

### Code Coverage
- `CODECOV_TOKEN`: Codecov upload token (optional but recommended)

### Notifications (Optional)
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications

### GitHub (Automatically Available)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## 📊 Workflow Dependencies

```
Pull Request Created
       │
       ├─► ci.yml (all matrix jobs)
       │
       ├─► preview-deployments.yml
       │       │
       │       ├─► Vercel Preview
       │       └─► Railway Preview
       │
       └─► auto-merge.yml (waits for all checks)
               │
               └─► Merge if approved and checks pass

Push to main
       │
       ├─► deploy-vercel.yml
       └─► deploy-railway.yml
```

## 🏷️ Workflow Labels

### PR Labels
- `auto-merge`: Enable automatic merging when all checks pass
- `skip-deployment`: Skip preview deployments
- `high-priority`: Exempt from stale marking
- `pinned`: Never mark as stale
- `security`: Security-related, exempt from stale
- `stale`: Automatically added to inactive issues/PRs

## 🔧 Workflow Customization

### Adjusting Test Coverage Threshold

Edit `jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### Changing Node.js Versions

Edit matrix in `ci.yml` and `preview-deployments.yml`:
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

### Modifying Stale Timeouts

Edit `stale.yml`:
```yaml
days-before-issue-stale: 60
days-before-pr-stale: 30
```

## 🐛 Troubleshooting

See [CI_CD_TROUBLESHOOTING.md](../../CI_CD_TROUBLESHOOTING.md) for detailed troubleshooting guides.

### Quick Checks

1. **Workflow not running?**
   - Check if branch is protected
   - Verify workflow trigger conditions
   - Check workflow permissions

2. **Secrets not working?**
   - Verify secrets are set in repository settings
   - Check secret names match exactly
   - Ensure secrets are available to the repository

3. **Auto-merge not working?**
   - Verify `auto-merge` label is applied
   - Check that all required checks pass
   - Ensure PR has required approvals

4. **Preview deployment failing?**
   - Verify deployment secrets are configured
   - Check deployment logs
   - Try adding `skip-deployment` label if not needed

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Contributing Guide](../../CONTRIBUTING.md)
- [CI/CD Troubleshooting](../../CI_CD_TROUBLESHOOTING.md)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)

## 🚀 Usage Examples

### Running Workflows Manually

```bash
# Trigger CI workflow
gh workflow run ci.yml

# Trigger auto-merge for specific PR
gh workflow run auto-merge.yml -f pr_number=123

# Trigger Vercel deployment
gh workflow run deploy-vercel.yml -f environment=production

# Trigger Railway deployment
gh workflow run deploy-railway.yml
```

### Monitoring Workflows

```bash
# List recent workflow runs
gh run list

# View specific run details
gh run view <run-id>

# Watch live logs
gh run watch

# Check PR status
gh pr checks <pr-number>
```

### Managing PRs

```bash
# Add auto-merge label
gh pr edit <pr-number> --add-label "auto-merge"

# Skip deployments
gh pr edit <pr-number> --add-label "skip-deployment"

# View PR status
gh pr view <pr-number> --json labels,reviews,statusCheckRollup
```

## 🎯 Best Practices

### For Contributors

1. **Test locally before pushing**:
   ```bash
   npm run lint
   npm run build
   npm test
   npm run test:coverage
   ```

2. **Keep PRs focused** - One feature/fix per PR

3. **Use auto-merge** for straightforward changes

4. **Monitor CI status** in PR checks section

5. **Review troubleshooting guide** if CI fails

### For Maintainers

1. **Review CI failures promptly**
2. **Use workflow dispatch** for manual intervention
3. **Monitor auto-merge activity**
4. **Keep dependencies updated**
5. **Review security scan results**

## 📈 Metrics & Monitoring

### Coverage Reports

- Uploaded to Codecov after each backend test run
- Threshold enforced at 90% for all metrics
- Coverage badge displayed in README
- Reports available in Codecov dashboard

### Deployment Status

- Vercel: Check deployment status in Vercel dashboard
- Railway: Check deployment status in Railway dashboard
- Health checks run automatically after deployment
- Rollback triggered on health check failure

### Workflow Success Rate

Monitor workflow success rate in GitHub Actions insights:
- Repository → Actions → Insights
- View success/failure rates per workflow
- Identify problematic workflows
- Track trends over time

## 🔒 Security

### Security Scanning

- npm audit runs on every PR
- High-severity vulnerabilities reported
- Audit reports uploaded as artifacts
- Recommended to review and fix promptly

### Dependency Management

- Dependabot recommended for auto-updates
- Auto-merge works with Dependabot PRs
- Security updates prioritized
- Regular dependency audits

### Secret Management

- Use GitHub Secrets for sensitive data
- Never commit secrets to repository
- Rotate secrets regularly
- Use minimal required permissions
- Audit secret usage periodically

---

**Last Updated**: December 2024
**Maintained by**: GXQ STUDIO
