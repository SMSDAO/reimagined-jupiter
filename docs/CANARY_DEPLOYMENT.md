# Canary Deployment Documentation

## Overview

The Canary Deployment System enables safe, gradual rollouts of new versions by deploying to a staging environment, running automated tests, monitoring error rates, and automatically rolling back if issues are detected. This minimizes risk and ensures production stability.

## What is Canary Deployment?

Canary deployment is a pattern for rolling out releases to a subset of users or servers. The idea is to:

1. Deploy the new version to a small subset (the "canary")
2. Monitor for errors or performance degradation
3. Gradually increase traffic if healthy
4. Roll back immediately if problems detected

Named after the "canary in a coal mine" practice, where canaries were used to detect dangerous gas levels.

## Architecture

```
┌──────────────┐
│   Developer  │
│    Push      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│      CI/CD Pipeline              │
│  (GitHub Actions)                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Deploy to Staging              │
│   (10% traffic)                  │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Run Automated Tests            │
│   - Health Check                 │
│   - Arbitrage Scanner            │
│   - Price Oracle                 │
│   - Wallet Analysis              │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Monitor for 5 Minutes          │
│   - Error Rate                   │
│   - Response Time                │
│   - Success Rate                 │
└──────┬───────────────────────────┘
       │
       ├─ Error rate > 5% ─┐
       │                   ▼
       │          ┌────────────────┐
       │          │   Rollback     │
       │          │   to Previous  │
       │          └────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Promote to Production          │
│   (100% traffic)                 │
└──────────────────────────────────┘
```

## Quick Start

### 1. Configuration

Set environment variables:

```bash
# Staging URL
STAGING_URL=https://gxq-staging.vercel.app

# Production URL
PRODUCTION_URL=https://gxq.vercel.app

# Optional: Vercel tokens for deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=your_project_id
```

### 2. Run Canary Deployment

```bash
npm run canary-deploy
```

### 3. Monitor Progress

The script will:
1. Deploy to staging
2. Run health checks
3. Execute test suite
4. Monitor for configured duration
5. Either rollback or promote

## Configuration Options

### Default Configuration

```typescript
{
  stagingUrl: 'https://gxq-staging.vercel.app',
  productionUrl: 'https://gxq.vercel.app',
  canaryPercentage: 10,              // Start with 10% traffic
  testDurationMinutes: 5,            // Monitor for 5 minutes
  rollbackThresholdPercent: 5,       // Rollback if error rate exceeds 5%
  minSuccessRate: 80,                // Require 80% test success rate
}
```

### Custom Configuration

```typescript
import { CanaryDeployment } from './scripts/canary-deployment.js';

const canary = new CanaryDeployment({
  canaryPercentage: 20,              // Increase to 20%
  testDurationMinutes: 10,           // Monitor for 10 minutes
  rollbackThresholdPercent: 3,       // More strict: rollback at 3%
  minSuccessRate: 90,                // Require 90% success rate
});

await canary.runCanaryDeployment();
```

## Automated Test Suite

### 1. Health Check Test

**Endpoint**: `/api/health`  
**Timeout**: 10 seconds  
**Success**: Status 200  
**Purpose**: Verify basic application health

### 2. Arbitrage Scanner Test

**Endpoint**: `/api/scan`  
**Timeout**: 30 seconds  
**Success**: Status 200 with arbitrage opportunities  
**Purpose**: Verify core arbitrage functionality

### 3. Price Oracle Test

**Endpoint**: `/api/prices`  
**Timeout**: 10 seconds  
**Success**: Status 200 with price data  
**Purpose**: Verify price feed integration

### 4. Wallet Analysis Test

**Endpoint**: `/api/wallet/{address}`  
**Timeout**: 15 seconds  
**Success**: Status 200 with wallet data  
**Purpose**: Verify wallet analysis functionality

### Test Success Criteria

- All 4 tests must complete
- At least 80% success rate (3 out of 4 passing)
- Response times within acceptable ranges
- No critical errors in responses

## Monitoring Metrics

### Error Rate

```typescript
errorRate = (failedRequests / totalRequests) * 100
```

**Threshold**: 5% (configurable)  
**Action**: Automatic rollback if exceeded

### Success Rate

```typescript
successRate = (successfulRequests / totalRequests) * 100
```

**Threshold**: 80% minimum (configurable)  
**Action**: Reject deployment if below threshold

### Average Response Time

```typescript
avgResponseTime = sum(responseTimes) / totalRequests
```

**Purpose**: Monitor for performance degradation  
**Alert**: If > 2x production average

### Error Rate Difference

```typescript
errorRateDiff = stagingErrorRate - productionErrorRate
```

**Threshold**: 5% difference triggers rollback  
**Purpose**: Detect relative degradation

## Rollback Procedures

### Automatic Rollback

Triggered when:
- Error rate exceeds threshold (5%)
- Test suite fails (< 80% success)
- Health check fails
- Error rate difference > threshold

### Manual Rollback

```bash
# Via Vercel CLI
vercel rollback

# Via API
curl -X POST "https://api.vercel.com/v13/deployments/{deployment_id}/rollback" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

### Rollback Process

1. **Detection**: System identifies issue
2. **Logging**: Record rollback reason
3. **Execution**: Revert to previous version
4. **Verification**: Confirm rollback successful
5. **Notification**: Alert team of rollback
6. **Investigation**: Analyze cause

## Progressive Rollout

### Standard Rollout Strategy

1. **10% Traffic** (Canary)
   - Duration: 5 minutes
   - Monitor: Error rate, response time
   - Action: Rollback or continue

2. **25% Traffic**
   - Duration: 5 minutes
   - Monitor: Same metrics
   - Action: Rollback or continue

3. **50% Traffic**
   - Duration: 10 minutes
   - Monitor: Same metrics + user feedback
   - Action: Rollback or continue

4. **100% Traffic** (Full Deployment)
   - Monitor: Continue monitoring for 30 minutes
   - Ready for next deployment

### Customizing Rollout

```typescript
// Quick rollout (for hotfixes)
const quickRollout = new CanaryDeployment({
  canaryPercentage: 5,
  testDurationMinutes: 2,
  rollbackThresholdPercent: 2,
});

// Conservative rollout (major changes)
const conservativeRollout = new CanaryDeployment({
  canaryPercentage: 5,
  testDurationMinutes: 15,
  rollbackThresholdPercent: 1,
  minSuccessRate: 95,
});
```

## GitHub Actions Integration

### Workflow Configuration

```yaml
canary-deployment:
  name: Canary Deployment
  runs-on: ubuntu-latest
  needs: build-and-test
  if: github.ref == 'refs/heads/staging'
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v6
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run canary deployment
      run: npm run canary-deploy
      env:
        STAGING_URL: ${{ secrets.STAGING_URL }}
        PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### Trigger Conditions

1. **Push to staging branch**
   - Automatic canary deployment
   - Full test suite execution
   - Monitoring for configured duration

2. **Manual trigger**
   - Via GitHub Actions UI
   - Select environment
   - Customize parameters

3. **Scheduled**
   - Daily deployment window
   - Off-peak hours preferred
   - Automated monitoring

## Vercel Integration

### Setup

1. **Create Vercel Token**
   ```bash
   vercel login
   vercel token create
   ```

2. **Get Project ID**
   ```bash
   vercel project ls
   ```

3. **Set Secrets**
   ```bash
   gh secret set VERCEL_TOKEN --body "YOUR_TOKEN"
   gh secret set VERCEL_PROJECT_ID --body "YOUR_PROJECT_ID"
   gh secret set VERCEL_ORG_ID --body "YOUR_ORG_ID"
   ```

### Deployment API

```typescript
// Trigger deployment
const response = await axios.post(
  'https://api.vercel.com/v13/deployments',
  {
    name: 'gxq-studio',
    gitSource: {
      type: 'github',
      repoId: projectId,
      ref: 'staging',
    },
  },
  {
    headers: {
      Authorization: `Bearer ${vercelToken}`,
    },
  }
);

console.log('Deployment URL:', response.data.url);
```

## Best Practices

### 1. Test Thoroughly in Staging

- Run full test suite before canary
- Verify all critical paths
- Check performance metrics
- Review logs for warnings

### 2. Start Small

- Begin with 5-10% traffic
- Monitor closely
- Increase gradually
- Have rollback plan ready

### 3. Monitor Continuously

- Watch error rates
- Track response times
- Review user feedback
- Check system resources

### 4. Define Clear Thresholds

- Error rate limits
- Response time limits
- Success rate requirements
- Resource utilization caps

### 5. Automate Everything

- Automated tests
- Automated monitoring
- Automated rollback
- Automated notifications

### 6. Document Incidents

- Record rollback reasons
- Document error patterns
- Share learnings
- Update runbooks

## Troubleshooting

### Canary Fails Immediately

**Symptoms**: Tests fail right after deployment

**Possible Causes**:
- Build issues
- Configuration errors
- Missing environment variables
- Database migrations failed

**Solutions**:
1. Check build logs
2. Verify environment configuration
3. Test locally first
4. Review deployment logs

### High Error Rate in Canary

**Symptoms**: Error rate exceeds threshold

**Possible Causes**:
- New bugs introduced
- Configuration mismatch
- API compatibility issues
- Resource constraints

**Solutions**:
1. Review recent changes
2. Check error logs
3. Compare with production config
4. Verify dependencies

### Tests Pass but Users Report Issues

**Symptoms**: Automated tests pass but real users experience problems

**Possible Causes**:
- Tests don't cover all scenarios
- Load-related issues
- Browser compatibility
- Network conditions

**Solutions**:
1. Expand test coverage
2. Add load testing
3. Monitor user feedback
4. Implement feature flags

### Rollback Not Working

**Symptoms**: Rollback command fails or incomplete

**Possible Causes**:
- API permissions
- Previous version unavailable
- DNS propagation delay
- Cache issues

**Solutions**:
1. Verify API credentials
2. Check deployment history
3. Wait for DNS propagation
4. Clear CDN cache

## Metrics to Monitor

### During Canary

- ✅ Error rate
- ✅ Response time (P50, P95, P99)
- ✅ Success rate
- ✅ Request volume
- ✅ CPU usage
- ✅ Memory usage
- ✅ Database query time

### After Promotion

- ✅ User engagement metrics
- ✅ Business metrics
- ✅ System performance
- ✅ Error patterns
- ✅ User feedback

## Emergency Procedures

### Immediate Rollback

```bash
# 1. Stop canary
npm run canary-deploy -- --abort

# 2. Manual rollback via Vercel
vercel rollback

# 3. Notify team
# Post in #incidents Slack channel

# 4. Document incident
# Create post-mortem document
```

### Communication

1. **Internal**
   - Notify engineering team
   - Update status page
   - Post in Slack

2. **External** (if needed)
   - Update status page
   - Send email to affected users
   - Post on social media

## Related Documentation

- [Auto-Fix System](./AUTO_FIX_SYSTEM.md)
- [Risk Controls](./RISK_CONTROLS.md)
- [Monitoring](./MONITORING.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Resources

- [Canary Deployments Explained](https://martinfowler.com/bliki/CanaryRelease.html)
- [Vercel Deployment API](https://vercel.com/docs/rest-api)
- [Progressive Delivery](https://www.split.io/glossary/progressive-delivery/)

## Support

For canary deployment issues:
1. Check deployment logs
2. Review test results
3. Verify configuration
4. Check Vercel status
5. Create issue with `canary-deployment` label
