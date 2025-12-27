# 🧠 GXQ Smart Brain Operator

## Overview

The **GXQ Smart Brain Operator** is a comprehensive orchestration system designed to enforce production-readiness, automate deployments, and maintain operational excellence for the GXQ Studio Solana arbitrage platform.

This system provides:
- **Automated validation** of code, builds, and environment
- **One-command orchestration** for production-ready releases
- **Deployment automation** for multiple platforms (Vercel, Railway, Docker)
- **Health monitoring** and performance reporting
- **CI/CD integration** with GitHub Actions

---

## Philosophy

The Smart Brain Operator follows these principles:

1. **Fail-Fast**: Detect and abort at the first sign of trouble
2. **Idempotent**: Safe to run multiple times without side effects
3. **Transparent**: Clear output and logging at every step
4. **Automated**: Minimize manual intervention and human error
5. **Production-Ready**: Every successful run guarantees deployability

---

## Architecture

### Core Scripts

All orchestration scripts are located in `scripts/` and follow consistent patterns:

```
scripts/
├── master.sh                    # Main orchestrator
├── validate-build.sh            # Build validation
├── auto-fix.sh                  # Automated code repair
├── env-check.sh                 # Environment validation
├── gxq-selfheal.sh              # System regeneration
├── deploy-vercel.sh             # Vercel deployment
├── deploy-railway.sh            # Railway deployment
├── deploy-docker.sh             # Docker deployment
├── health-check.sh              # Health monitoring
├── monitor-logs.sh              # Log aggregation
└── performance-report.sh        # Performance metrics
```

### Script Dependencies

```
master.sh
├── env-check.sh          (validates environment)
├── npm ci                (installs dependencies)
├── npm run type-check    (TypeScript validation)
├── npm run lint          (code linting)
├── auto-fix.sh           (automated repairs)
├── npm run build:backend (backend build)
├── npm run build:webapp  (webapp build)
├── validate-build.sh     (artifact validation)
└── git operations        (commit, tag, push)
```

---

## Quick Start

### Prerequisites

- **Node.js 20.x** or higher
- **npm** package manager
- **Git** for version control
- **Bash** shell (Linux, macOS, WSL on Windows)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SMSDAO/reimagined-jupiter.git
   cd reimagined-jupiter
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and fill in required variables
   npm run env-check
   ```

3. **Run the master orchestrator**
   ```bash
   npm run master
   ```

---

## Core Commands

### Master Orchestration

**Purpose**: Complete validation, build, and deployment preparation

```bash
npm run master
```

**What it does**:
1. Validates all environment variables
2. Clean-installs all dependencies (backend + webapp)
3. Runs TypeScript type-checking
4. Runs code linting
5. Executes auto-fix for common issues
6. Builds backend and webapp
7. Validates build artifacts
8. Commits changes with timestamp
9. Creates version tag
10. Pushes to origin with tags

**When to use**:
- Before deploying to production
- After major changes
- To ensure system is in deployable state

### Environment Validation

```bash
npm run env-check
```

**Validates**:
- Required: `SOLANA_RPC_URL`, `WALLET_PRIVATE_KEY`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- Optional: `GEMINI_API_KEY`, `NEYNAR_API_KEY`, `QUICKNODE_RPC_URL`, `DB_HOST`, etc.

**Output**: Color-coded status (✅ OK, ❌ MISSING, ⚠️ OPTIONAL)

### Build Validation

```bash
npm run validate-build
```

**Checks**:
- Backend artifacts: `dist/src/index.js`, `dist/src/server.js`, `dist/src/index-railway.js`
- Webapp artifacts: `webapp/.next/`
- Config files: `package.json`, `tsconfig.json`, `next.config.ts`
- Core scripts: `scripts/master.sh`, `scripts/validate-build.sh`
- Database schemas: `db/` directory

### System Self-Heal

```bash
npm run selfheal
```

**Actions**:
1. Verifies repository structure
2. Cleans build artifacts (`dist/`, `webapp/.next/`)
3. Removes nested `node_modules`
4. Reinstalls dependencies
5. Runs full master orchestration

**When to use**:
- After Git conflicts or merge issues
- When builds are failing mysteriously
- To reset to a clean state

---

## Deployment

### Vercel (Webapp)

```bash
npm run deploy:vercel
```

**Requirements**:
- `VERCEL_TOKEN` environment variable
- Vercel CLI (auto-installed if missing)

**Steps**:
1. Checks for VERCEL_TOKEN
2. Runs pre-deployment validation
3. Deploys to Vercel production
4. Displays deployment URL
5. Updates `.env.production` if exists

### Railway (Backend)

```bash
npm run deploy:railway
```

**Requirements**:
- Railway CLI installed: `npm install -g @railway/cli`
- `railway.json` configuration file

**Steps**:
1. Validates Railway CLI installation
2. Checks `railway.json` configuration
3. Builds backend
4. Deploys to Railway
5. Monitors deployment status
6. Runs health check on deployed service

### Docker

```bash
npm run deploy:docker
```

**Steps**:
1. Validates Docker installation
2. Checks `Dockerfile` and `docker-compose.yml`
3. Builds Docker image: `gxq-studio:latest`
4. Tests container locally
5. Optionally pushes to registry if `DOCKER_REGISTRY` is set

---

## Monitoring

### Health Check

```bash
npm run health
```

**Monitors**:
- Backend service (local and production)
- Webapp service (local and production)
- Database connection (if `DB_HOST` set)
- Solana RPC endpoint
- Critical environment variables
- System resources (memory, disk)

**Output**: ASCII art dashboard with component-by-component status

### Log Monitoring

```bash
npm run logs [backend|webapp|all] [ERROR|WARN|INFO|DEBUG|all]
```

**Examples**:
```bash
npm run logs all          # Monitor all logs
npm run logs backend      # Backend logs only
npm run logs webapp ERROR # Webapp errors only
```

**Features**:
- Real-time log tailing
- Color-coded by log level (ERROR=red, WARN=yellow, INFO=cyan, DEBUG=blue)
- Log level filtering
- Multi-source aggregation

### Performance Report

```bash
npm run perf
```

**Generates**:
- Build times (backend + webapp)
- Bundle sizes (`dist/` and `webapp/.next/`)
- Dependency counts
- TypeScript compilation time
- Test coverage percentage
- Memory usage

**Output**:
- Markdown report: `reports/performance-YYYY-MM-DD.md`
- JSON metrics: `reports/metrics.json`

---

## CI/CD Integration

### GitHub Actions Workflows

The system includes four CI/CD workflows:

#### 1. `gxq-master-ci.yml`

**Triggers**: Push to `master` or `main` branch

**Jobs**:
1. **validate-environment** - Mock env validation
2. **install-dependencies** - Clean install with caching
3. **lint-and-typecheck** - ESLint + TypeScript checks
4. **build-backend** - Backend compilation
5. **build-webapp** - Webapp build
6. **validate-build** - Artifact validation
7. **security-scan** - npm audit
8. **master-ci-summary** - Overall status

#### 2. `gxq-pr-check.yml`

**Triggers**: Pull requests to `master`/`main`

**Features**:
- Full validation pipeline
- Artifact size reporting
- Automated PR comments with results
- Security scanning

#### 3. `gxq-deploy-production.yml`

**Triggers**: 
- Manual workflow dispatch
- Push to tags matching `v*`

**Jobs**:
1. **prepare-deployment** - Build all artifacts
2. **deploy-vercel** - Deploy webapp to Vercel
3. **deploy-railway** - Deploy backend to Railway
4. **post-deployment-health** - Health checks
5. **notify-deployment** - Slack/Discord notifications (optional)

#### 4. `gxq-scheduled-health.yml`

**Triggers**: Every 6 hours (cron: `0 */6 * * *`)

**Features**:
- Automated health checks for all services
- Creates GitHub issue if services are down
- Auto-closes issues when services recover
- Health report in workflow summary

---

## Environment Variables

### Required Variables

These must be set for the system to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `WALLET_PRIVATE_KEY` | Base58 encoded wallet key | `5J7W8...` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `ADMIN_USERNAME` | Admin authentication | `admin` |
| `ADMIN_PASSWORD` | Admin password | `secure-password` |

### Optional Variables

Enhance functionality but not required:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | For AI features |
| `NEYNAR_API_KEY` | Farcaster integration |
| `QUICKNODE_RPC_URL` | Enhanced RPC features |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |

### Deployment Variables

| Variable | Description |
|----------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RAILWAY_TOKEN` | Railway API token |
| `DOCKER_REGISTRY` | Docker registry URL |

---

## Troubleshooting

### Common Issues

#### Issue: Environment validation fails

**Solution**:
```bash
cp .env.example .env
# Edit .env and fill in required variables
npm run env-check
```

#### Issue: Build fails with TypeScript errors

**Solution**:
```bash
npm run type-check        # See errors
npm run auto-fix          # Attempt fixes
npm run type-check        # Verify fixes
```

#### Issue: Linting errors

**Solution**:
```bash
npm run lint              # See errors
npm run auto-fix          # Attempt fixes
npm run lint              # Verify fixes
```

#### Issue: Master orchestration gets stuck

**Solution**:
```bash
npm run selfheal          # Full system reset
```

#### Issue: Deployment fails

**Solution**:
```bash
# For Vercel
echo $VERCEL_TOKEN        # Check token is set
npm run deploy:vercel     # Retry

# For Railway
railway login             # Authenticate
npm run deploy:railway    # Retry
```

#### Issue: Health checks fail

**Solution**:
```bash
npm run health            # Check status
# Review output and fix failed components
```

---

## GitHub Codespaces Integration

The Smart Brain Operator works seamlessly in GitHub Codespaces:

1. **Open in Codespaces**
   - Click "Code" → "Codespaces" → "Create codespace"

2. **Setup environment**
   ```bash
   npm run env-check     # Validate env vars
   npm run master        # Run full orchestration
   ```

3. **Deploy from Codespaces**
   ```bash
   export VERCEL_TOKEN=your_token
   npm run deploy:vercel
   ```

---

## Best Practices

### Before Deployment

1. Always run `npm run master` first
2. Fix any issues reported
3. Commit and push changes
4. Run `npm run health` to verify current state
5. Then deploy with `npm run deploy:vercel` or `npm run deploy:railway`

### During Development

1. Run `npm run env-check` after changing environment
2. Run `npm run validate-build` after builds
3. Use `npm run auto-fix` for quick repairs
4. Monitor with `npm run logs` during testing

### Maintenance

1. Run `npm run health` daily
2. Review `npm run perf` reports weekly
3. Use `npm run selfheal` if issues arise
4. Keep dependencies updated

---

## Integration Examples

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run validate-build || exit 1
```

### CI/CD Pipeline

```yaml
# Add to your workflow
- name: Run Smart Brain Validation
  run: npm run master
```

### Monitoring Cron Job

```bash
# Add to crontab
0 */6 * * * cd /path/to/repo && npm run health
```

---

## Support

- **Documentation**: See `docs/CI_CD_GUIDE.md` and `docs/DEPLOYMENT.md`
- **Issues**: Report at https://github.com/SMSDAO/reimagined-jupiter/issues
- **Health Checks**: Automated issues created by scheduled health workflow

---

## Version History

- **v1.0.0** (2025-01-01) - Initial Smart Brain Operator implementation
  - Core orchestration scripts
  - Deployment automation
  - Health monitoring
  - CI/CD workflows
  - Performance reporting

---

*This is a living document. Updates are made as the system evolves.*
