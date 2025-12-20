# CI/CD Quick Reference

Quick reference for developers working with the CI/CD pipeline.

## 🚀 Quick Start

### Before Creating a PR

```bash
# 1. Run tests
npm test

# 2. Check coverage
npm run test:coverage

# 3. Lint your code
npm run lint

# 4. Fix linting issues
npm run lint -- --fix

# 5. Validate TypeScript
npx tsc --noEmit

# 6. Build
npm run build

# Webapp
cd webapp
npm run lint
npx tsc --noEmit
npm run build
```

## 📋 PR Requirements

| Requirement | Command | Passing |
|-------------|---------|---------|
| Backend tests (18, 20, 22) | `npm test` | ✅ Required |
| Webapp builds (18, 20, 22) | `cd webapp && npm run build` | ✅ Required |
| ESLint (no warnings) | `npm run lint -- --max-warnings=0` | ✅ Required |
| TypeScript validation | `npx tsc --noEmit` | ✅ Required |
| Test coverage ≥ 90% | `npm run test:coverage` | ✅ Required |
| Security scan | `npm audit` | ⚠️ Warning |
| Preview deployments | Automatic | ✅ Required* |
| Code review | Manual | ✅ Required** |

\* Unless `skip-deployment` label
\** Except Dependabot PRs

## 🏷️ Labels

### Auto-Merge Labels
```bash
# Enable auto-merge
gh pr edit <PR> --add-label "auto-merge"

# Skip deployments
gh pr edit <PR> --add-label "skip-deployment"
```

### Important Labels
- `auto-merge` - Automatic merge when checks pass
- `skip-deployment` - Don't require preview deployments
- `high-priority` - Exempt from stale marking
- `security` - Security-related, exempt from stale
- `pinned` - Never mark as stale

## 🔄 Common Commands

### Check CI Status
```bash
# View PR checks
gh pr checks <PR>

# Watch checks live
gh pr checks <PR> --watch

# View workflow runs
gh run list

# View specific run
gh run view <RUN_ID>

# Watch live run
gh run watch
```

### Trigger Workflows
```bash
# Trigger CI
gh workflow run ci.yml

# Trigger auto-merge
gh workflow run auto-merge.yml -f pr_number=<PR>

# Trigger Vercel deploy
gh workflow run deploy-vercel.yml

# Trigger Railway deploy
gh workflow run deploy-railway.yml
```

### View Logs
```bash
# Download artifacts
gh run download <RUN_ID>

# View run logs
gh run view <RUN_ID> --log

# View specific job logs
gh run view <RUN_ID> --log --job=<JOB_ID>
```

## 🐛 Troubleshooting

### Linting Fails
```bash
# Check issues
npm run lint

# Auto-fix
npm run lint -- --fix

# Check specific file
npm run lint path/to/file.ts
```

### TypeScript Errors
```bash
# Check errors
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Tests Fail
```bash
# Run all tests
npm test

# Run specific test
npm test -- path/to/test.ts

# Watch mode
npm test -- --watch

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Coverage Too Low
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check specific file
npm test -- path/to/file.test.ts --coverage
```

### Build Fails
```bash
# Backend
npm run build

# Webapp
cd webapp && npm run build

# Clear cache and retry
rm -rf node_modules dist .next
npm install
npm run build
```

### Deployment Preview Fails
```bash
# Check if secrets configured
gh secret list

# Check logs
gh run view <RUN_ID> --log

# Skip deployment
gh pr edit <PR> --add-label "skip-deployment"
```

## 📊 Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | 90% |
| Branches | 90% |
| Functions | 90% |
| Statements | 90% |

## 🔐 Required Secrets

### Vercel
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Railway
- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`

### Optional
- `CODECOV_TOKEN`
- `SLACK_WEBHOOK_URL`
- `DISCORD_WEBHOOK_URL`

## 🎯 Node.js Versions

All tests and builds run on:
- Node.js 18 (LTS)
- Node.js 20 (LTS)
- Node.js 22 (LTS)

## ⏱️ Typical CI Times

| Job | Duration |
|-----|----------|
| Backend tests | 2-5 min |
| Webapp build | 3-7 min |
| Security scan | 1-2 min |
| Vercel preview | 2-4 min |
| Railway preview | 3-5 min |
| **Total** | ~10-15 min |

## 📚 Documentation Links

- [Contributing Guide](CONTRIBUTING.md)
- [Troubleshooting Guide](CI_CD_TROUBLESHOOTING.md)
- [Implementation Details](CI_CD_IMPLEMENTATION.md)
- [Workflow Documentation](.github/workflows/README.md)

## 💡 Pro Tips

1. **Run checks locally** before pushing to save CI time
2. **Use auto-merge** for straightforward changes
3. **Check troubleshooting guide** for common issues
4. **Monitor CI actively** to catch issues early
5. **Keep PRs small** for faster review and CI
6. **Write tests first** to meet coverage requirements
7. **Fix linting issues** with `--fix` flag
8. **Use TypeScript strictly** to avoid validation errors

## 🆘 Getting Help

1. Check [CI_CD_TROUBLESHOOTING.md](CI_CD_TROUBLESHOOTING.md)
2. Search existing issues
3. Create issue with CI/CD template
4. Ask in GitHub Discussions

---

**Quick Links:**
- 📖 [Full Contributing Guide](CONTRIBUTING.md)
- 🔧 [Detailed Troubleshooting](CI_CD_TROUBLESHOOTING.md)
- 📊 [Implementation Summary](CI_CD_IMPLEMENTATION.md)
