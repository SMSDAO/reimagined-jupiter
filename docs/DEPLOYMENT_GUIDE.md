# Complete Production System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the complete production system for GXQ Studio, including risk controls, monitoring, auto-fix capabilities, and canary deployments.

## Prerequisites

### Required

- Node.js 20.x or higher
- npm 10.x or higher
- Git
- GitHub account with repository access
- Vercel account (for deployments)

### Optional

- Prometheus (for metrics collection)
- Grafana (for dashboards)
- Slack (for notifications)
- Snyk account (for security scanning)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter
npm install
cd webapp && npm install && cd ..
```

### 2. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required
SOLANA_RPC_URL=your_rpc_url
WALLET_PRIVATE_KEY=your_private_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret

# Production System (Optional)
AUTO_FIX_ENABLED=false
AUTO_REDEPLOY_ENABLED=false
METRICS_PORT=9090
STAGING_URL=https://gxq-staging.vercel.app
PRODUCTION_URL=https://gxq.vercel.app
```

### 3. Build and Test

```bash
npm run build
npm test
```

### 4. Setup Monitoring

```bash
npm run setup-monitoring
```

This creates:
- `monitoring/prometheus.yml`
- `monitoring/alerts.yml`
- `monitoring/grafana-dashboard.json`

## Deployment Strategies

### Strategy 1: Manual Deployment

#### Development

```bash
npm run dev  # Start development server
```

#### Staging

```bash
npm run deploy:staging
```

#### Production

```bash
npm run deploy:vercel
```

### Strategy 2: Canary Deployment

```bash
npm run canary-deploy
```

This will:
1. Deploy to staging
2. Run automated tests
3. Monitor for 5 minutes
4. Rollback or promote based on metrics

### Strategy 3: Automated Pipeline

Push to branches triggers automatic deployment:

- `staging` → Canary deployment
- `develop` → Staging deployment with tests
- `main` → Production deployment with full pipeline

## Component Setup

### Risk Controller

1. **Initialize in your code**:

```typescript
import { getRiskController } from './lib/risk-controller.js';

const riskController = getRiskController({
  maxSlippageBps: 100,
  maxDrawdownBps: 500,
  minProfitThresholdSol: 0.01,
});
```

2. **Integrate with trading logic**:

```typescript
// Before executing trade
const assessment = riskController.evaluateTrade(
  tradeSizeSol,
  expectedProfitSol,
  slippageBps
);

if (!assessment.approved) {
  console.log('Trade rejected:', assessment.reason);
  return;
}

// After trade execution
if (tradeSuccessful) {
  riskController.recordSuccess(actualProfitSol);
} else {
  riskController.recordFailure(actualLossSol);
}
```

### Monitoring System

1. **Start metrics server**:

```typescript
import { startMetricsServer } from './scripts/monitoring-setup.js';

startMetricsServer(9090);
```

2. **Install Prometheus**:

```bash
# macOS
brew install prometheus
prometheus --config.file=monitoring/prometheus.yml

# Docker
docker run -p 9091:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

3. **Install Grafana**:

```bash
# macOS
brew install grafana
brew services start grafana

# Docker
docker run -d -p 3001:3000 grafana/grafana
```

4. **Import Dashboard**:
   - Open Grafana at http://localhost:3001
   - Go to Dashboards → Import
   - Upload `monitoring/grafana-dashboard.json`

### Auto-Fix System

1. **Enable in environment**:

```bash
AUTO_FIX_ENABLED=true
AUTO_REDEPLOY_ENABLED=true
MIN_ERROR_THRESHOLD=5
```

2. **Configure GitHub token**:

```bash
GITHUB_TOKEN=your_github_personal_access_token
```

3. **Run analyzer**:

```bash
npm run analyze-deployment
```

### Canary Deployment

1. **Set up Vercel**:

```bash
vercel login
vercel link
```

2. **Configure secrets**:

```bash
gh secret set VERCEL_TOKEN --body "YOUR_TOKEN"
gh secret set VERCEL_PROJECT_ID --body "YOUR_PROJECT_ID"
gh secret set STAGING_URL --body "https://gxq-staging.vercel.app"
gh secret set PRODUCTION_URL --body "https://gxq.vercel.app"
```

3. **Run canary**:

```bash
npm run canary-deploy
```

## GitHub Actions Setup

### Required Secrets

Configure in GitHub repository settings (Settings → Secrets and variables → Actions):

```
ADMIN_PASSWORD
ADMIN_USERNAME
AUTO_FIX_ENABLED
AUTO_REDEPLOY_ENABLED
CODECOV_TOKEN (optional)
GITHUB_TOKEN (automatic)
GRAFANA_API_KEY (optional)
GRAFANA_URL (optional)
JWT_SECRET
NEXT_PUBLIC_RPC_URL
SLACK_WEBHOOK_URL (optional)
SNYK_TOKEN (optional)
SOLANA_RPC_URL
STAGING_URL
PRODUCTION_URL
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
WALLET_PRIVATE_KEY
```

### Workflow Configuration

The complete production pipeline (`complete-production-pipeline.yml`) includes:

1. **Security Scan**: npm audit + Snyk
2. **Build and Test**: With auto-retry (3 attempts)
3. **Canary Deployment**: To staging environment
4. **Post-Deployment Analysis**: With auto-fix
5. **Monitoring Setup**: Generate configs and deploy
6. **Auto-Ticketing**: Create issues on failure
7. **Pipeline Summary**: Report and notifications

## Monitoring and Alerting

### Metrics Endpoints

- Application metrics: `http://localhost:9090/metrics`
- Prometheus UI: `http://localhost:9091`
- Grafana dashboards: `http://localhost:3001`

### Key Metrics

- `arbitrage_trades_total`: Total trades by status
- `arbitrage_profit_sol`: Total profit in SOL
- `arbitrage_error_rate`: Error rate percentage
- `rpc_request_duration_seconds`: RPC latency
- `trade_slippage_percentage`: Slippage by DEX
- `risk_consecutive_losses`: Consecutive losses
- `risk_current_drawdown_bps`: Current drawdown
- `risk_emergency_stop`: Emergency stop status

### Alert Rules

Configured in `monitoring/alerts.yml`:

- High error rate (>10% for 5m)
- Low success rate (<80% for 10m)
- High RPC latency (P95 >2s for 5m)
- Excessive slippage (>2% for 5m)
- Emergency stop activated
- High drawdown (>400 bps for 5m)
- Consecutive losses (>=2)
- Negative daily P&L (<-0.5 SOL for 10m)

## Production Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Secrets added to GitHub
- [ ] Vercel project linked
- [ ] Monitoring configured
- [ ] Alert rules reviewed
- [ ] Documentation updated
- [ ] Team notified of deployment

### Deployment

- [ ] Deploy to staging first
- [ ] Run full test suite
- [ ] Monitor for 30 minutes
- [ ] Review metrics and logs
- [ ] Run canary deployment
- [ ] Monitor canary for configured duration
- [ ] Verify no error rate increase
- [ ] Promote to production
- [ ] Monitor production for 1 hour

### Post-Deployment

- [ ] Verify all endpoints healthy
- [ ] Check monitoring dashboards
- [ ] Review alert status
- [ ] Monitor error logs
- [ ] Test critical paths manually
- [ ] Update deployment log
- [ ] Notify team of completion

## Troubleshooting

### Build Failures

**Check**:
- Node.js version (should be 20.x)
- Dependencies installed: `npm ci`
- TypeScript compilation: `npm run type-check`
- Linting: `npm run lint`

**Solutions**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Test Failures

**Check**:
- Test environment configured
- Mock services available
- Database connections (if applicable)

**Solutions**:
```bash
npm test -- --verbose
npm test -- --testNamePattern="specific test"
```

### Deployment Failures

**Check**:
- Vercel token valid
- Project ID correct
- Environment variables set
- Build succeeds locally

**Solutions**:
```bash
vercel --debug
vercel logs
```

### Monitoring Issues

**Check**:
- Metrics server running (port 9090)
- Prometheus can scrape endpoint
- Grafana data source configured
- Time range appropriate

**Solutions**:
```bash
curl http://localhost:9090/metrics
prometheus --config.check
```

## Rollback Procedures

### Immediate Rollback

```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
# 1. Go to Deployments
# 2. Find previous deployment
# 3. Click "Promote to Production"
```

### Emergency Stop

```typescript
import { getRiskController } from './lib/risk-controller.js';

const riskController = getRiskController();
riskController.triggerEmergencyStop('Emergency: Critical issue detected');
```

### Disable Auto-Fix

```bash
# Set in environment or GitHub secrets
AUTO_FIX_ENABLED=false
AUTO_REDEPLOY_ENABLED=false
```

## Maintenance

### Daily

- [ ] Review monitoring dashboards
- [ ] Check error logs
- [ ] Monitor risk metrics
- [ ] Review auto-fix actions

### Weekly

- [ ] Review performance trends
- [ ] Analyze failed trades
- [ ] Update risk parameters if needed
- [ ] Check for security updates

### Monthly

- [ ] Review and update alert thresholds
- [ ] Analyze deployment success rate
- [ ] Review auto-fix patterns
- [ ] Update documentation

## Performance Tuning

### Risk Parameters

Start conservative, adjust based on performance:

```typescript
// Conservative (recommended for start)
{
  maxSlippageBps: 50,
  maxDrawdownBps: 300,
  maxTradeSizeSol: 5,
  maxConsecutiveLosses: 2,
}

// Moderate (after 1 week of stable operation)
{
  maxSlippageBps: 100,
  maxDrawdownBps: 500,
  maxTradeSizeSol: 10,
  maxConsecutiveLosses: 3,
}

// Aggressive (only with proven performance)
{
  maxSlippageBps: 150,
  maxDrawdownBps: 700,
  maxTradeSizeSol: 20,
  maxConsecutiveLosses: 4,
}
```

### Monitoring Intervals

```yaml
# High-frequency metrics (15s)
- arbitrage_trades_total
- arbitrage_error_rate
- risk_emergency_stop

# Medium-frequency metrics (1m)
- rpc_request_duration_seconds
- trade_slippage_percentage
- risk_metrics

# Low-frequency metrics (5m)
- arbitrage_profit_sol
- system_metrics
```

## Security Considerations

### Secrets Management

- Never commit secrets to repository
- Use environment variables
- Rotate secrets regularly
- Use separate keys for staging/production

### Access Control

- Limit GitHub repository access
- Use service accounts for CI/CD
- Enable 2FA on all accounts
- Review access logs regularly

### Network Security

- Use HTTPS for all endpoints
- Configure firewall rules
- Use VPN for production access
- Monitor for suspicious activity

## Support and Resources

### Documentation

- [Auto-Fix System](./AUTO_FIX_SYSTEM.md)
- [Risk Controls](./RISK_CONTROLS.md)
- [Monitoring](./MONITORING.md)
- [Canary Deployment](./CANARY_DEPLOYMENT.md)

### External Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Getting Help

1. Check documentation
2. Review GitHub issues
3. Check workflow logs
4. Contact team in Slack
5. Create new issue with appropriate labels

## Conclusion

The complete production system provides:

- ✅ Automated error detection and fixing
- ✅ Comprehensive risk management
- ✅ Real-time monitoring and alerting
- ✅ Safe canary deployments
- ✅ Self-healing capabilities
- ✅ Production-grade CI/CD pipeline

Follow this guide carefully and adjust based on your specific needs and performance observations.
