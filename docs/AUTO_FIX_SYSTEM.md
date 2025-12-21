# Auto-Fix System Documentation

## Overview

The Auto-Fix System is an intelligent error detection and automatic remediation system that analyzes deployment logs, identifies common error patterns, generates appropriate fixes, and optionally applies them automatically with redeployment.

## Features

- **Automatic Error Detection**: Parses log files to identify error patterns
- **Pattern Classification**: Categorizes errors by type (RPC, DEX, Slippage, Transaction, Network)
- **Severity Assessment**: Rates errors by severity (low, medium, high, critical)
- **Auto-Fix Generation**: Creates code fixes for common, auto-fixable patterns
- **Git Automation**: Commits and pushes fixes automatically
- **GitHub Integration**: Creates issues for non-auto-fixable errors
- **Vercel Integration**: Triggers automatic redeployment after fixes
- **Safety Mechanisms**: Only applies fixes when error threshold is met

## Error Patterns

### 1. RPC Rate Limiting
**Pattern**: `429|rate limit|too many requests`  
**Category**: RPC  
**Severity**: High  
**Auto-Fixable**: ✅ Yes

**Fixes Applied**:
- Increases RPC retry attempts from 3 to 5
- Increases retry delay from 1s to 2s

### 2. RPC Timeout
**Pattern**: `timeout|ETIMEDOUT|connection timed out`  
**Category**: RPC  
**Severity**: High  
**Auto-Fixable**: ✅ Yes

**Fixes Applied**:
- Increases RPC timeout from 30s to 60s
- Increases connection timeout in connection pool

### 3. DEX Swap Failure
**Pattern**: `swap failed|slippage tolerance exceeded|insufficient liquidity`  
**Category**: DEX  
**Severity**: Medium  
**Auto-Fixable**: ✅ Yes

**Fixes Applied**:
- Increases default slippage tolerance from 0.5% to 1%
- Increases DEX swap retry attempts

### 4. Blockhash Expired
**Pattern**: `blockhash not found|transaction expired`  
**Category**: Transaction  
**Severity**: High  
**Auto-Fixable**: ✅ Yes

**Fixes Applied**:
- Uses finalized blockhash commitment for better reliability

### 5. Network Connection Error
**Pattern**: `ECONNRESET|ECONNREFUSED|network error|socket hang up`  
**Category**: Network  
**Severity**: High  
**Auto-Fixable**: ✅ Yes

**Fixes Applied**:
- Increases connection pool size from 3 to 5
- Increases retry attempts for network errors

### 6. Slippage Too High
**Pattern**: `slippage.*exceeded|price impact too high`  
**Category**: Slippage  
**Severity**: Medium  
**Auto-Fixable**: ✅ Yes

**Fixes Applied**:
- Increases max slippage from 1% to 1.5%

## Configuration

### Environment Variables

```bash
# Enable auto-fix system
AUTO_FIX_ENABLED=false  # Set to 'true' to enable automatic fixes

# Enable auto-redeploy after fixes
AUTO_REDEPLOY_ENABLED=false  # Set to 'true' to trigger redeployment

# Analysis window in minutes
ANALYSIS_WINDOW=60

# Minimum error threshold to trigger analysis
MIN_ERROR_THRESHOLD=5

# GitHub token for creating issues
GITHUB_TOKEN=your_github_token_here

# Vercel integration for redeployment
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_vercel_org_id_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

## Usage

### Manual Execution

Run the post-deployment analyzer manually:

```bash
npm run analyze-deployment
```

### Automated Execution

The system runs automatically as part of the production pipeline when:
1. Push to `main` or `develop` branch
2. After deployment completes
3. On schedule (if configured)

### In GitHub Actions

```yaml
- name: Run post-deployment analysis
  run: npm run analyze-deployment
  env:
    AUTO_FIX_ENABLED: ${{ secrets.AUTO_FIX_ENABLED }}
    AUTO_REDEPLOY_ENABLED: ${{ secrets.AUTO_REDEPLOY_ENABLED }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Workflow

1. **Log Parsing**: Reads `combined.log` and `error.log` files
2. **Error Detection**: Identifies error patterns using regex
3. **Pattern Matching**: Categorizes and counts occurrences
4. **Threshold Check**: Only proceeds if errors exceed minimum threshold
5. **Fix Generation**: Creates code modifications for auto-fixable patterns
6. **Fix Application**: Applies fixes to source files (if enabled)
7. **Git Operations**: Commits and pushes changes with `[skip ci]` flag
8. **Redeployment**: Triggers Vercel deployment (if enabled)
9. **Issue Creation**: Creates GitHub issue with analysis results

## Safety Features

### Minimum Error Threshold
Only triggers when error count exceeds `MIN_ERROR_THRESHOLD` (default: 5). This prevents unnecessary fixes for occasional errors.

### Pattern Frequency Check
Auto-fixes only apply when a pattern appears at least 5 times, ensuring it's a persistent issue, not a transient error.

### Manual Approval Option
Set `AUTO_FIX_ENABLED=false` to review fixes manually before applying.

### Skip CI on Commits
Auto-fix commits include `[skip ci]` to prevent infinite CI loops.

### Dry Run Mode
By default, the system logs what changes would be made without actually modifying files. Enable fixes explicitly via environment variables.

## Disabling the System

### Completely Disable
```bash
AUTO_FIX_ENABLED=false
AUTO_REDEPLOY_ENABLED=false
```

### Disable Only Auto-Fixes (Keep Analysis)
```bash
AUTO_FIX_ENABLED=false
AUTO_REDEPLOY_ENABLED=false
# Analysis will still run and create issues
```

### Disable in Workflow
Comment out or remove the `post-deployment-analysis` job in `.github/workflows/complete-production-pipeline.yml`.

## Monitoring

### View Analysis Results

Check the GitHub Actions logs:
1. Go to Actions tab
2. Select "Complete Production Pipeline"
3. View "Post-Deployment Analysis" job logs

### Review Auto-Fix Commits

Look for commits with message: `Auto-fix: Applied fixes from post-deployment analysis [skip ci]`

### Check Created Issues

Auto-created issues have labels:
- `automated`
- `post-deployment`
- `monitoring`

## Extending the System

### Adding New Error Patterns

Edit `scripts/post-deployment-analyzer.ts` and add to `ERROR_PATTERNS` array:

```typescript
{
  name: 'Your Error Pattern',
  pattern: /your regex pattern/i,
  category: 'RPC' | 'DEX' | 'Slippage' | 'Transaction' | 'Network' | 'Other',
  severity: 'low' | 'medium' | 'high' | 'critical',
  autoFixable: true,
  fix: (matches) => [
    {
      file: 'path/to/file.ts',
      search: 'code to search',
      replace: 'code to replace with',
      description: 'What this fix does',
    },
  ],
}
```

### Custom Fix Logic

Implement custom fix functions that can:
- Analyze match context
- Generate dynamic replacements
- Apply conditional fixes based on error frequency
- Create multiple related fixes

## Best Practices

1. **Start Conservatively**: Begin with `AUTO_FIX_ENABLED=false` to review fixes manually
2. **Monitor Initially**: Watch auto-fixes closely for the first few days
3. **Tune Thresholds**: Adjust `MIN_ERROR_THRESHOLD` based on your error rates
4. **Review Issues**: Check auto-created issues regularly for patterns
5. **Update Patterns**: Add new patterns as you encounter recurring errors
6. **Test Locally**: Run analyzer locally before deploying changes
7. **Version Control**: Keep fix logic under version control
8. **Document Changes**: Document when you add new error patterns

## Troubleshooting

### Fixes Not Being Applied

**Check**:
- `AUTO_FIX_ENABLED` is set to `true`
- Error count exceeds `MIN_ERROR_THRESHOLD`
- Pattern appears at least 5 times
- Search strings match exactly in source files

### Redeployment Not Triggering

**Check**:
- `AUTO_REDEPLOY_ENABLED` is set to `true`
- `VERCEL_TOKEN` is configured correctly
- `VERCEL_PROJECT_ID` is correct
- API credentials have deployment permissions

### Issues Not Being Created

**Check**:
- `GITHUB_TOKEN` has `issues:write` permission
- Repository allows issue creation
- Token is not expired
- Network connectivity to GitHub API

### Infinite Loop Detection

Auto-fix commits use `[skip ci]` flag to prevent CI re-triggers. If you see loops:
- Verify `[skip ci]` is in commit message
- Check workflow triggers don't override skip
- Temporarily disable auto-fix

## Examples

### Example 1: High RPC Timeout Errors

**Before**:
```
Error: RPC timeout after 30s
Error: Connection timed out
Error: ETIMEDOUT
... (20 more similar errors)
```

**Analysis**:
- Pattern: RPC Timeout
- Count: 23 occurrences
- Severity: High
- Auto-fixable: Yes

**Fixes Applied**:
1. Increased RPC timeout: 30s → 60s
2. Increased connection timeout: 30s → 60s

**Result**: Error rate reduced by 90%

### Example 2: DEX Slippage Issues

**Before**:
```
Error: Slippage tolerance exceeded
Error: Swap failed due to slippage
Error: Price impact too high
... (15 more similar errors)
```

**Analysis**:
- Pattern: Slippage Too High
- Count: 18 occurrences
- Severity: Medium
- Auto-fixable: Yes

**Fixes Applied**:
1. Increased max slippage: 1% → 1.5%
2. Increased default slippage: 0.5% → 1%

**Result**: Swap success rate improved from 75% to 95%

## Related Documentation

- [Canary Deployment](./CANARY_DEPLOYMENT.md)
- [Risk Controls](./RISK_CONTROLS.md)
- [Monitoring](./MONITORING.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review workflow logs
3. Contact the DevOps team
4. Create a new issue with `auto-fix` label
