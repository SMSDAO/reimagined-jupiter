# CI/CD Automation Guide

Complete guide for the automated CI/CD pipeline, including setup, usage, and troubleshooting.

## 📋 Overview

The repository includes comprehensive CI/CD automation:

1. **Continuous Integration**: Automated testing and building
2. **Auto-Merge**: Intelligent PR merging with conditions
3. **Failed Job Recovery**: Automatic retry and issue creation
4. **Performance Monitoring**: Regular performance and security checks

## 🚀 Quick Start

### Prerequisites

- Repository with proper permissions
- GitHub Actions enabled
- Node.js 20+ for local development

### Enable Workflows

Workflows are automatically enabled when committed to the repository. First push will trigger CI:

```bash
git add .github/workflows/
git commit -m "Add CI/CD workflows"
git push origin main
```

## 🔧 Workflow Configuration

### 1. CI Workflow (`ci.yml`)

**Runs on:**
- Pull requests to `main` or `develop`
- Direct pushes to `main` or `develop`
- Manual trigger

**What it does:**
- Lints backend TypeScript code
- Builds backend and webapp
- Runs tests (when configured)
- Performs security audit
- Uploads artifacts

**Configuration:**

No additional configuration needed. Optionally add secrets:

```yaml
# .github/workflows/ci.yml
env:
  NEXT_PUBLIC_RPC_URL: ${{ secrets.NEXT_PUBLIC_RPC_URL }}
```

Add secret in repository settings:
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NEXT_PUBLIC_RPC_URL`
4. Value: Your Solana RPC URL

### 2. Auto-Merge Workflow (`auto-merge.yml`)

**Runs on:**
- PR events (opened, synchronized, ready for review)
- PR review submitted
- Check suite completed
- Manual trigger

**Requirements for merge:**
1. All CI checks pass
2. At least 1 approval (except Dependabot)
3. No changes requested
4. Not in draft state
5. Has `auto-merge` label OR from Dependabot

**Usage:**

```bash
# Add auto-merge label to PR
gh pr edit 123 --add-label "auto-merge"

# Or trigger manually
gh workflow run auto-merge.yml -f pr_number=123
```

**Configuration:**

Edit required checks in workflow:

```yaml
const requiredChecks = ['Backend - Lint & Test', 'Webapp - Lint & Build'];
```

### 3. Failed Job Handler (`failed-job-handler.yml`)

**Runs on:**
- CI workflow completion with failure
- Manual trigger with run ID

**Features:**
- Analyzes failure logs
- Retries transient failures (up to 3 times)
- Creates GitHub issues for persistent failures
- Provides detailed failure reports

**Transient Failures (Auto-retry):**
- Network timeouts (ECONNRESET, ETIMEDOUT)
- Rate limiting (429)
- Service unavailable (503, 502)

**Persistent Failures (Create issue):**
- Code errors
- Test failures
- Build failures
- Configuration issues

**Manual trigger:**

```bash
gh workflow run failed-job-handler.yml -f run_id=<run-id>
```

### 4. Performance Monitoring (`performance-monitoring.yml`)

**Runs on:**
- Schedule: Every 6 hours
- Manual trigger

**Monitors:**
- Outdated dependencies
- Security vulnerabilities
- Build size analysis
- Code quality metrics
- Git activity

**View results:**

```bash
gh run list --workflow=performance-monitoring.yml
gh run view <run-id>
```

## 📊 Branch Protection

### Recommended Settings

For `main` and `develop` branches:

1. **Require pull request reviews before merging**
   - Required approvals: 1
   - Dismiss stale reviews: Yes

2. **Require status checks to pass before merging**
   - Required checks:
     - `Backend - Lint & Test`
     - `Webapp - Lint & Build`
   - Require branches to be up to date: Yes

3. **Require conversation resolution before merging**: Yes

4. **Do not allow bypassing the above settings**: Yes

5. **Allow auto-merge**: Yes

### Setup via GitHub CLI

```bash
# Enable branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=Backend - Lint & Test \
  --field required_status_checks[contexts][]=Webapp - Lint & Build \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=true \
  --field allow_auto_merge=true
```

## 🔍 Monitoring & Debugging

### View Workflow Runs

```bash
# List all runs
gh run list

# List runs for specific workflow
gh run list --workflow=ci.yml

# View specific run details
gh run view <run-id>

# Watch live logs
gh run watch
```

### Check PR Status

```bash
# View all checks for a PR
gh pr checks 123

# Watch checks in real-time
gh pr checks 123 --watch

# View detailed PR info
gh pr view 123
```

### Download Artifacts

```bash
# List artifacts for a run
gh run view <run-id> --json artifacts

# Download all artifacts
gh run download <run-id>

# Download specific artifact
gh run download <run-id> -n backend-test-results
```

### View Failed Job Logs

```bash
# View logs for failed run
gh run view <run-id> --log-failed

# View logs for specific job
gh run view <run-id> --job=<job-id> --log
```

## 🐛 Troubleshooting

### Issue: CI Fails with "No tests configured"

**Symptom:** Test job completes with warning but doesn't fail.

**Cause:** Jest tests not configured yet.

**Solution:**

Option 1: Add tests
```bash
# Create test file
touch src/__tests__/example.test.ts
```

Option 2: Remove test step from CI
```yaml
# Comment out in .github/workflows/ci.yml
# - name: Run tests
#   run: npm test
```

### Issue: Auto-Merge Not Working

**Symptom:** PR with `auto-merge` label doesn't merge.

**Debug:**

```bash
# Check PR status
gh pr view 123 --json labels,reviews,statusCheckRollup,isDraft

# Check workflow runs
gh run list --workflow=auto-merge.yml --limit 5
```

**Common causes:**

1. **Missing label**: Add `auto-merge` label
   ```bash
   gh pr edit 123 --add-label "auto-merge"
   ```

2. **CI not passed**: Wait for CI to complete
   ```bash
   gh pr checks 123 --watch
   ```

3. **No approval**: Request review
   ```bash
   gh pr review 123 --approve
   ```

4. **Changes requested**: Address feedback and push updates

5. **Draft PR**: Mark as ready for review
   ```bash
   gh pr ready 123
   ```

### Issue: Failed Job Handler Not Creating Issues

**Symptom:** CI fails but no issue is created.

**Common causes:**

1. **Transient failure**: Being retried automatically
   - Check if failure is temporary (network, timeout)
   - Wait for retry attempts (max 3)

2. **Issue already exists**: Check existing issues
   ```bash
   gh issue list --label ci-failure
   ```

3. **Permissions**: Verify workflow has `issues: write`
   ```yaml
   permissions:
     issues: write
   ```

### Issue: Build Fails Locally But Passes in CI

**Symptom:** CI passes but local build fails (or vice versa).

**Common causes:**

1. **Different Node.js version**
   ```bash
   # Check your version
   node --version
   
   # CI uses Node.js 20
   nvm install 20
   nvm use 20
   ```

2. **Dependencies not synced**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment variables**
   ```bash
   # Check required env vars
   cat .env.example
   
   # Copy and configure
   cp .env.example .env
   ```

### Issue: Webapp Build Fails

**Symptom:** Webapp build fails in CI.

**Debug locally:**

```bash
cd webapp
npm ci
npm run lint
npm run build
```

**Common causes:**

1. **Missing RPC URL**: Add secret in GitHub
   - Settings → Secrets → `NEXT_PUBLIC_RPC_URL`

2. **TypeScript errors**: Check with lint
   ```bash
   npm run lint
   ```

3. **Dependencies**: Update package-lock.json
   ```bash
   npm install
   git add package-lock.json
   git commit -m "Update dependencies"
   ```

### Issue: Security Audit Fails

**Symptom:** High-severity vulnerabilities found.

**Fix vulnerabilities:**

```bash
# Backend
npm audit fix

# Webapp
cd webapp
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

**Review and commit:**
```bash
git add package-lock.json
git commit -m "Fix security vulnerabilities"
```

### Issue: Performance Monitoring Shows Outdated Dependencies

**Symptom:** Dependencies flagged as outdated.

**Update dependencies:**

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update <package-name>

# Update all packages (be careful)
npm update

# Major version updates
npm install <package-name>@latest
```

**Test after updates:**
```bash
npm run lint
npm run build
npm test
```

## 🎯 Best Practices

### For Contributors

1. **Test locally before pushing**
   ```bash
   npm run lint && npm run build && npm test
   ```

2. **Keep PRs small**: Easier to review and merge

3. **Write descriptive commit messages**
   ```
   feat: Add WebSocket service for real-time updates
   fix: Handle network timeouts in price feed
   docs: Update CI/CD configuration guide
   ```

4. **Add `auto-merge` label** for routine changes

5. **Monitor CI status**: Fix failures promptly

### For Maintainers

1. **Review auto-merge PRs regularly**
   ```bash
   gh pr list --label auto-merge
   ```

2. **Monitor CI failures**
   ```bash
   gh issue list --label ci-failure
   ```

3. **Keep dependencies updated**
   - Enable Dependabot
   - Review security advisories
   - Test updates in feature branches

4. **Document changes**: Update README and guides

5. **Use workflow dispatch** for manual intervention
   ```bash
   gh workflow run ci.yml
   gh workflow run auto-merge.yml -f pr_number=123
   ```

## 🔐 Security

### Secret Management

**Required secrets:**
- `NEXT_PUBLIC_RPC_URL`: Solana RPC endpoint

**Optional secrets:**
- `SLACK_WEBHOOK`: For notifications
- `DISCORD_WEBHOOK`: For notifications

**Add secret:**
```bash
gh secret set NEXT_PUBLIC_RPC_URL
# Paste value and press Ctrl+D
```

**List secrets:**
```bash
gh secret list
```

### Permissions

Workflows use minimal required permissions:

```yaml
permissions:
  contents: read        # Read repo
  pull-requests: write  # Comment on PRs
  checks: read         # Read check status
  issues: write        # Create issues (failed-job-handler only)
  actions: write       # Retry workflows (failed-job-handler only)
```

### Audit Logs

Review workflow activity:
1. Go to Actions tab
2. Select workflow
3. View run history
4. Check for suspicious activity

## 📈 Performance Optimization

### Reduce CI Time

1. **Use caching**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

2. **Run jobs in parallel**
   - Backend and webapp build simultaneously
   - Security scan independent

3. **Skip unnecessary steps**
   ```yaml
   if: github.event_name == 'pull_request'
   ```

4. **Use concurrency**
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```

### Reduce Costs

1. **Limit workflow runs**: Use `concurrency` to cancel old runs

2. **Set timeouts**: Prevent hung jobs
   ```yaml
   timeout-minutes: 15
   ```

3. **Cache dependencies**: Faster installs

4. **Use matrix builds** only when necessary

## 📚 Additional Resources

### Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub CLI](https://cli.github.com/manual/)
- [Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

### Monitoring Tools

- **GitHub Actions Dashboard**: Actions tab in repository
- **GitHub CLI**: `gh run` commands
- **GitHub API**: For custom integrations

### Community

- [GitHub Community Forum](https://github.community/)
- [GitHub Actions Discussions](https://github.com/orgs/community/discussions/categories/actions-and-packages)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/github-actions)

## 🔄 Migration & Upgrade

### From Manual to Automated

1. **Backup current process**: Document manual steps

2. **Enable workflows gradually**:
   - Week 1: CI only
   - Week 2: Add auto-merge for safe PRs
   - Week 3: Enable failed job handler
   - Week 4: Add performance monitoring

3. **Monitor closely**: Check all notifications

4. **Adjust thresholds**: Fine-tune based on experience

### Upgrading Workflows

```bash
# Pull latest workflow changes
git pull origin main

# Review changes
git diff main~1 .github/workflows/

# Test in feature branch
git checkout -b test-workflow-update
git push origin test-workflow-update
# Open PR and verify
```

## 🎓 Learning Resources

### Beginner

- Start with CI workflow
- Understand job structure
- Learn YAML syntax

### Intermediate

- Customize workflows
- Add custom jobs
- Integrate with external services

### Advanced

- Create reusable workflows
- Build custom actions
- Implement complex automation

## 📞 Support

### Getting Help

1. **Check documentation**: README and this guide
2. **Review issues**: `gh issue list --label ci-failure`
3. **Check workflow logs**: `gh run view <run-id> --log`
4. **Ask in discussions**: GitHub Discussions
5. **Open issue**: `gh issue create`

### Reporting Problems

Include:
- Workflow name and run ID
- Error messages
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if UI issue)

```bash
gh issue create --title "CI: Build fails on webapp" \
  --body "Workflow run: https://github.com/.../actions/runs/12345
  Error: [paste error]
  Steps to reproduce: [describe]"
```

## 🏆 Success Metrics

Track these metrics to measure CI/CD effectiveness:

- **Build Success Rate**: Target >95%
- **Average Build Time**: Target <10 minutes
- **PR Merge Time**: Target <24 hours
- **Security Vulnerabilities**: Target 0 high/critical
- **Test Coverage**: Target >80% (when tests added)
- **Auto-Merge Rate**: Target >50% of eligible PRs

Monitor in GitHub Actions dashboard and workflow summaries.
