# CI/CD Pipeline Setup Guide

This document provides setup instructions and troubleshooting for the CI/CD pipeline implemented in PR #4.

## Quick Start

### 1. Configure GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions** and add:

#### Required for Preview Deployments
- `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
- `VERCEL_PROJECT_ID` - Find in Vercel project settings
- `VERCEL_ORG_ID` - Find in Vercel team settings
- `NEXT_PUBLIC_RPC_URL` - Your Solana RPC endpoint (e.g., Helius, QuickNode)

#### Optional for Coverage
- `CODECOV_TOKEN` - Get from https://codecov.io after linking repository

#### Optional for Notifications  
- `SLACK_WEBHOOK` - Slack webhook URL for CI notifications

### 2. Enable Branch Protection

1. Go to **Settings → Branches → Branch protection rules**
2. Add rule for `main` branch
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select required checks:
     - `Lint (Node 18)` and `Lint (Node 20)`
     - `Type Check (Node 18)` and `Type Check (Node 20)`
     - `Backend Tests (Node 18)` and `Backend Tests (Node 20)`
     - `Build (Node 18)` and `Build (Node 20)`
     - `CodeQL Analysis`

### 3. Test the Pipeline

1. Create a test PR with a small change
2. Verify all CI jobs run successfully
3. Check that preview deployment comment appears
4. Review any lint warnings (expected initially)

## CI Pipeline Overview

### Jobs

The CI pipeline runs on every PR and push to `main`/`develop`:

1. **Install** - Installs dependencies with caching (Node.js 18 & 20)
2. **Lint** - ESLint checks (currently reporting only, see [Known Issues](#known-issues))
3. **Type Check** - TypeScript strict compilation
4. **Backend Tests** - Jest tests with coverage
5. **Webapp Tests** - Next.js tests (optional, not yet configured)
6. **Coverage Merge** - Combines coverage reports
7. **Security Scan** - npm audit on both projects
8. **Build** - Compiles TypeScript and builds Next.js
9. **CI Summary** - Posts results to PR

### Workflows

- **ci.yml** - Main CI pipeline
- **deploy-preview.yml** - Vercel preview deployments  
- **codeql-analysis.yml** - Security code scanning
- **auto-merge.yml** - Automated PR merging (existing)

### Dependabot

Automatically creates PRs for dependency updates:
- **Weekly** npm updates for backend
- **Weekly** npm updates for webapp
- **Weekly** GitHub Actions updates

PRs are auto-labeled with `dependencies` and `auto-merge`.

## Local Testing

Before pushing changes, run these locally:

```bash
# Install dependencies
npm install

# Run all checks
npm run validate

# Individual checks
npm run lint              # Lint backend
npm run lint:webapp       # Lint webapp
npm run type-check        # Type check backend
npm run type-check:webapp # Type check webapp
npm test                  # Run backend tests
npm run test:webapp       # Run webapp tests (when configured)
npm run build             # Build everything
npm run build:backend     # Build backend only
npm run build:webapp      # Build webapp only
```

## Known Issues

### Linting Warnings

The codebase currently has **122 linting issues** (17 errors, 105 warnings).

**Current Behavior**: Lint jobs run with `continue-on-error: true`, so they report issues but don't fail CI.

**Remediation Plan**:
1. Create tracking issue for lint cleanup
2. Fix issues incrementally (one module at a time)
3. Once clean, remove `continue-on-error` from `.github/workflows/ci.yml`
4. Enforce strict `--max-warnings=0` going forward

**Types of Issues**:
- Unused variables and imports
- Use of `any` types (warning level)
- React best practices (webapp)

### Test Coverage

Current coverage is **19.14%**, below the 90% target.

**Current Behavior**: Coverage is collected and reported but doesn't fail CI.

**Remediation Plan**:
1. Add webapp Jest configuration
2. Write tests for critical modules:
   - Flash loan service
   - Arbitrage strategies
   - DEX integrations
   - API endpoints
3. Set initial coverage threshold at current level
4. Gradually increase to 90%

## Troubleshooting

### Preview Deployment Fails

**Problem**: Vercel deployment fails or preview URL not posted

**Solutions**:
1. Verify all Vercel secrets are configured correctly
2. Check Vercel project is linked to the repository
3. Ensure `VERCEL_ORG_ID` matches your team/organization
4. Review workflow logs in Actions tab

### CodeQL Analysis Warnings

**Problem**: CodeQL reports security alerts

**Solutions**:
1. Review alerts in **Security → Code scanning**
2. Fix high-severity issues before merging
3. For false positives, dismiss with explanation
4. Low-severity warnings can be addressed incrementally

### Build Failures

**Problem**: TypeScript compilation or Next.js build fails

**Solutions**:
1. Run `npm run type-check` locally to reproduce
2. Run `npm run build` locally
3. Check for missing environment variables
4. Verify all dependencies are installed

### Tests Failing

**Problem**: Jest tests fail in CI but pass locally

**Solutions**:
1. Check for environment-specific issues
2. Verify mock configurations are correct
3. Ensure no network calls in tests
4. Check for timing issues in async tests

### Dependabot PRs Not Auto-Merging

**Problem**: Dependabot PRs created but not auto-merged

**Solutions**:
1. Verify `auto-merge` label is added
2. Check that all CI checks pass
3. Ensure branch protection rules allow auto-merge
4. Review auto-merge workflow logs

## Maintenance

### Weekly Tasks

- Review Dependabot PRs and merge if CI passes
- Check CodeQL alerts and address any new issues
- Monitor test coverage trends

### Monthly Tasks

- Review and update workflow configurations
- Clean up old workflow runs (if storage is a concern)
- Update documentation as pipeline evolves

### Quarterly Tasks

- Review and update Node.js versions in matrix
- Evaluate new GitHub Actions features
- Assess test coverage goals and adjust thresholds

## Performance Optimization

### Current Run Times

- Install: ~2-3 minutes
- Lint: ~30 seconds
- Type Check: ~15 seconds
- Tests: ~25 seconds
- Build: ~45 seconds (backend) + ~60 seconds (webapp)
- **Total**: ~10-12 minutes for full pipeline

### Optimization Strategies

1. **Dependency Caching**: Already implemented with actions/cache
2. **Parallel Jobs**: Matrix strategy runs jobs in parallel
3. **Selective Runs**: Could add path filters to skip jobs when only docs change
4. **Workflow Optimization**: Combine related steps where possible

## Security Considerations

### Secrets Management

- Never commit secrets to repository
- Use GitHub Secrets for all sensitive data
- Rotate tokens periodically
- Limit secret access to required workflows only

### Dependabot Security

- Auto-merge only for minor/patch updates
- Manually review major updates
- Check release notes for breaking changes
- Test thoroughly before merging

### CodeQL Best Practices

- Review all high-severity alerts promptly
- Don't dismiss alerts without investigation
- Keep query packs up to date
- Run additional security scans for production deploys

## Support

For issues with the CI/CD pipeline:

1. Check workflow logs in **Actions** tab
2. Review this guide for common issues
3. Search existing issues for similar problems
4. Create new issue with:
   - Workflow run link
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
