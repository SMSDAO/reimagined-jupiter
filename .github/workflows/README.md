# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration, testing, and deployment.

## 📋 Workflows Overview

### 1. CI - Continuous Integration (`ci.yml`)

**Purpose**: Automated testing and build verification for every pull request and push.

**Triggers**:
- Pull requests to `main` or `develop` branches
- Direct pushes to `main` or `develop` branches
- Manual workflow dispatch

**Jobs**:
- **Backend Lint & Test**: 
  - Installs dependencies
  - Runs ESLint on TypeScript code
  - Builds the backend
  - Runs tests (if configured)
  - Uploads test results as artifacts

- **Webapp Lint & Build**:
  - Installs webapp dependencies
  - Runs ESLint on Next.js code
  - Builds the webapp for production
  - Uploads build artifacts

- **Security Scan**:
  - Runs `npm audit` on both backend and webapp
  - Reports high-severity vulnerabilities

- **CI Summary**:
  - Aggregates all job results
  - Fails if any critical jobs failed
  - Provides clear status summary

**Usage**:
```bash
# Automatically runs on PR creation or push
# Or trigger manually:
gh workflow run ci.yml
```

### 2. Auto-Merge PR (`auto-merge.yml`)

**Purpose**: Automatically merge pull requests that meet all requirements.

**Triggers**:
- PR opened, synchronized, or reopened
- PR review submitted
- Check suite completed
- Manual workflow dispatch with PR number

**Requirements for Auto-Merge**:
1. ✅ All required CI checks must pass
   - Backend - Lint & Test
   - Webapp - Lint & Build
2. ✅ At least 1 approval (except Dependabot PRs)
3. ✅ No changes requested
4. ✅ PR must not be in draft state
5. ✅ PR must have `auto-merge` label OR be from Dependabot

**Usage**:
```bash
# Add label to PR:
gh pr edit <pr-number> --add-label "auto-merge"

# Or trigger manually:
gh workflow run auto-merge.yml -f pr_number=<pr-number>
```

**Features**:
- Squash merge by default
- Automatic comments on failure explaining requirements
- Safe checks before merging
- Supports Dependabot auto-merge

### 3. Auto-label PRs (`auto-label.yml`)

**Purpose**: Automatically apply standard labels to all pull requests for consistent workflow automation.

**Triggers**:
- PR opened, synchronized, or reopened
- Manual workflow dispatch with option to backfill all open PRs

**Labels Applied**:
- `auto-merge` - Enable auto-merge when checks pass (color: #2ecc71)
- `skip-deployment` - Skip deployment checks (color: #b31f45)

**Features**:
- **Automatic Labeling**: New and updated PRs automatically receive both labels
- **Label Creation**: Creates labels if they don't exist in the repository
- **Backfill Support**: Manual dispatch can apply labels to all existing open PRs
- **Pagination**: Handles repositories with large numbers of open PRs

**Usage**:
```bash
# Labels are applied automatically to new/updated PRs
# Or trigger manually to backfill all open PRs:
gh workflow run auto-label.yml -f apply_to_all_open_prs=true
```

### 4. Failed Job Handler (`failed-job-handler.yml`)

**Purpose**: Automatically detect, retry, and report CI failures.

**Triggers**:
- When CI workflow completes with failure
- Manual workflow dispatch with run ID

**Features**:
- **Automatic Retry**: Retries transient failures up to 3 times
- **Failure Analysis**: Analyzes logs to detect transient vs. persistent failures
- **Issue Creation**: Creates detailed GitHub issues for persistent failures
- **Smart Detection**: Identifies common transient errors:
  - Network timeouts (ECONNRESET, ETIMEDOUT)
  - Rate limiting (429)
  - Service unavailable (503, 502)

**Transient Failures** (Auto-retry):
- Connection resets
- Network timeouts
- API rate limits
- Temporary service unavailability

**Persistent Failures** (Create issue):
- Code errors
- Test failures
- Build failures
- Configuration issues

**Usage**:
```bash
# Automatically runs when CI fails
# Or analyze specific run:
gh workflow run failed-job-handler.yml -f run_id=<run-id>
```

## 🔧 Configuration

### Required Secrets

Configure these in repository settings → Secrets and variables → Actions:

```
NEXT_PUBLIC_RPC_URL (optional)
  - Solana RPC URL for webapp builds
  - Default: https://api.mainnet-beta.solana.com
```

### Branch Protection Rules

Recommended settings for `main` and `develop` branches:

1. **Require pull request reviews**: 1 approval
2. **Require status checks to pass**:
   - Backend - Lint & Test
   - Webapp - Lint & Build
3. **Require branches to be up to date**: ✅
4. **Do not allow bypassing**: ✅

### Workflow Permissions

All workflows use minimal required permissions:
- `contents: read` - Read repository contents
- `pull-requests: write` - Comment on PRs
- `checks: read` - Read check status
- `issues: write` - Create failure issues (failed-job-handler only)
- `actions: write` - Retry workflows (failed-job-handler only)

## 🚀 Best Practices

### For Contributors

1. **Ensure tests pass locally** before pushing:
   ```bash
   npm run lint
   npm run build
   npm test
   ```

2. **Keep PRs small and focused** for faster reviews

3. **Add `auto-merge` label** for automatic merging (optional)

4. **Monitor CI status** in the PR checks section

### For Maintainers

1. **Review CI failures promptly** - automated issues will be created

2. **Use workflow dispatch** for manual intervention when needed

3. **Monitor auto-merge activity** to ensure quality

4. **Update dependencies regularly** - Dependabot auto-merge helps

## 📊 Monitoring & Logs

### View Workflow Runs
```bash
# List recent runs
gh run list

# View specific run
gh run view <run-id>

# Watch live logs
gh run watch
```

### Download Artifacts
```bash
# Download test results or build artifacts
gh run download <run-id>
```

### Check CI Status
```bash
# Check PR status
gh pr checks <pr-number>

# View detailed check output
gh pr checks <pr-number> --watch
```

## 🐛 Troubleshooting

### CI Fails with "No tests configured"

This is expected if Jest tests haven't been set up yet. The workflow continues with a warning.

**Solution**: Add tests or update workflow to remove test step.

### Auto-Merge Not Working

**Common issues**:
1. PR doesn't have `auto-merge` label
2. Not all CI checks passed
3. No approval on PR
4. Changes requested on PR
5. PR is in draft state

**Debug**:
```bash
gh pr view <pr-number> --json labels,reviews,statusCheckRollup,isDraft
```

### Failed Job Handler Not Creating Issues

**Common issues**:
1. Issue already exists for this run
2. Workflow doesn't have `issues: write` permission
3. Failure is transient and being retried

**Debug**:
```bash
gh run view <run-id> --log
```

### Build Failures

**Backend build fails**:
```bash
cd /path/to/repo
npm ci
npm run lint
npm run build
```

**Webapp build fails**:
```bash
cd /path/to/repo/webapp
npm ci
npm run lint
npm run build
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## 🔐 Security

### Security Scanning

The `security-scan` job runs `npm audit` to detect vulnerabilities:
- Checks both backend and webapp
- Reports high-severity issues
- Continues on error (warns but doesn't block)

### Dependency Updates

Dependabot is recommended for automatic dependency updates:
1. Enable Dependabot in repository settings
2. PRs from Dependabot can auto-merge if CI passes
3. Security updates are prioritized

### Secret Management

- Never commit secrets to the repository
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use minimal required permissions

## 📈 Future Enhancements

Potential improvements for future iterations:

- [ ] Add test coverage reporting
- [ ] Implement deployment workflows
- [ ] Add performance benchmarking
- [ ] Set up Slack/Discord notifications
- [ ] Add code quality metrics (SonarQube, CodeClimate)
- [ ] Implement canary deployments
- [ ] Add E2E testing for webapp
- [ ] Create release automation workflow
