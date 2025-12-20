# 🧹 Automated Cleanup Workflow

## Overview

The automated cleanup workflow continuously optimizes the repository by removing unused code, dependencies, and configurations with **zero regressions**. It runs automatically on every Pull Request targeting the `main` branch.

## Features

### 🔍 Multi-Layer Analysis

1. **Static Analysis**
   - TypeScript/JavaScript unused exports detection (`ts-unused-exports`)
   - Unused dependency detection (`depcheck`)
   - Dependency graph analysis (`madge`)
   - Python dead code detection (`vulture`)
   - Code complexity analysis (`radon`)

2. **Dynamic Analysis**
   - Test coverage analysis (Jest)
   - Runtime execution path tracing
   - Import usage pattern detection

3. **Intelligent Heuristics**
   - Never executed code: +40 points
   - Unused exports: +30 points
   - Stale code (180+ days): +20 points
   - High complexity + low usage: +25 points
   - Unused config files: +35 points

### 🛡️ Security-Critical Preservation

The workflow **NEVER** removes code matching these patterns:

- `admin` - Administration logic
- `auth` / `authentication` - Authentication systems
- `dao` / `governance` - DAO governance
- `security` / `crypto` / `signature` - Security primitives
- `wallet` / `transaction` / `token` - Blockchain operations
- `solana` / `jupiter` / `arbitrage` - Core platform logic
- `flash.*loan` - Flash loan functionality

Any match receives a score of **-1000** (blocked from removal).

### ✅ Zero Regression Guarantee

1. **Test-Aware Pruning** - Only removes code with 0% test coverage
2. **Security Preservation** - Never touches security-critical paths
3. **Full Validation Pipeline**:
   ```
   Cleanup → Rebuild → Test → Type-Check → Lint → Commit
   ```
4. **Auto-Rollback** - Reverts changes on any validation failure
5. **Audit Trail** - Complete analysis artifacts (30-day retention)

## Workflow Triggers

```yaml
on:
  pull_request:
    branches:
      - main
    types: [opened, synchronize, reopened]
```

The workflow runs automatically when:
- A new PR is opened targeting `main`
- A PR is synchronized (new commits pushed)
- A PR is reopened

## Removal Thresholds

Based on heuristic scoring:

- **Dependencies**: Score > 70 → Uninstall
- **Files**: Score > 85 → Delete
- **Exports**: Score > 75 → Comment out

## Workflow Steps

### 1. Analysis Phase (Steps 1-12)

```bash
# Static Analysis
- Detect unused TypeScript exports
- Detect unused npm dependencies (backend + webapp)
- Build dependency graphs
- Detect Python dead code
- Analyze code complexity

# Dynamic Analysis
- Run tests with coverage
- Merge coverage reports
- Analyze import usage patterns
```

### 2. Intelligent Analysis (Steps 13-14)

```bash
# Apply Heuristic Scoring
- Load all analysis results
- Score each candidate (0-100 or -1000 for security-critical)
- Sort by score
- Generate removal candidates list

# Execute Cleanup
- Remove unused dependencies (score >70)
- Delete unused files (score >85)
- Comment out unused exports (score >75)
```

### 3. Validation Pipeline (Steps 15-22)

```bash
# Comprehensive Validation
- Reinstall dependencies if changed
- Rebuild backend (TypeScript compilation)
- Rebuild webapp (Next.js build)
- Run all tests (backend + webapp)
- Type check (backend + webapp)
- Lint (backend + webapp)
```

### 4. Commit & Report (Steps 23-25)

```bash
# Auto-Commit Changes
- Commit with formatted message
- Push to PR branch

# Generate Reports
- Comment on PR with analysis summary
- Upload artifacts (30-day retention)
- Update GitHub Actions summary
```

### 5. Rollback (Step 26)

```bash
# Auto-Rollback on Failure
- Reset to previous commit
- Force push to revert changes
- Fail the workflow
```

## Artifacts Generated

All analysis results are uploaded as artifacts:

- `unused-exports.txt` - Unused TypeScript/JavaScript exports
- `unused-deps.json` - Unused npm dependencies
- `circular-deps.txt` - Circular dependency warnings
- `python-dead-code.txt` - Python dead code
- `complexity.json` - Code complexity metrics
- `dep-graph.json` - Dependency graph structure
- `import-usage.json` - Import usage patterns
- `removal-candidates.json` - Scored removal candidates
- `cleanup-summary.md` - Human-readable summary

Retention: **30 days**

## PR Comment Format

The workflow comments on the PR with:

```markdown
## 🧹 Automated Cleanup Analysis

# 🧹 Automated Cleanup Summary

**Generated**: 2024-12-20T20:00:00.000Z

---

## 📊 Analysis Metrics

- **Total Removal Candidates**: 15
- **Protected Items**: 8
- **Cleanup Impact Score**: 450

## 📦 Dependencies Removed

- `unused-package-1` from package.json
- `unused-package-2` from webapp/package.json

## 📁 Files Removed

- `src/unused-module.ts`

## 📤 Exports Disabled

- `unusedFunction` in src/utils.ts

## 🛡️ Security-Critical Items Preserved

- **file**: `src/services/flashLoanService.ts` - Security-critical file
- **dependency**: `@solana/web3.js` - Security-critical dependency

---

*🤖 Automated by cleanup workflow with heuristic scoring*
*⏰ Analysis completed at 2024-12-20T20:00:00.000Z*
```

## Commit Message Format

```
🧹 Automated cleanup: Remove unused code and dependencies

- Removed unused dependencies via depcheck analysis
- Eliminated dead code identified through coverage analysis
- Preserved all security-critical paths (admin, DAO, auth)
- Zero regressions - all tests passing

Generated by automated cleanup workflow
Heuristic scoring system applied
Test-aware pruning completed
```

## Integration with Existing CI

The automated cleanup workflow is **independent** from the main CI workflow (`.github/workflows/ci.yml`) but follows similar patterns:

### Similarities
- Uses same Node.js (v20) and testing infrastructure
- Runs linting and type checking
- Builds backend and webapp
- Uploads artifacts

### Differences
- **Trigger**: Only on PRs to `main` (not on push)
- **Purpose**: Code optimization (not validation)
- **Permissions**: Has `contents: write` to commit changes
- **Auto-commit**: Commits cleanup changes back to PR
- **Rollback**: Reverts on validation failure

### Workflow Coordination

```
PR Opened/Updated
       ↓
   ┌───┴───┐
   ↓       ↓
CI.yml  auto-cleanup.yml
   ↓       ↓
Tests   Analysis
Build   Cleanup
Lint    Validate
   ↓       ↓
Pass    Commit
```

Both workflows must pass for PR to be mergeable.

## Local Development

### Prerequisites

```bash
# Install Node.js analysis tools
npm install -g depcheck@1.4.7
npm install -g madge@6.1.0
npm install -g ts-unused-exports@10.0.1

# Install Python analysis tools
pip install vulture==2.11
pip install radon==6.0.1
pip install coverage==7.4.0
```

### Run Analysis Locally

```bash
# Create analysis directory
mkdir -p .cleanup-analysis

# Run tests with coverage
npm test -- --coverage

# Run intelligent analysis
node .cleanup-analysis/intelligent-analyzer.js .cleanup-analysis

# Review removal candidates
cat .cleanup-analysis/removal-candidates.json

# Execute cleanup (CAUTION: Makes changes!)
node .cleanup-analysis/execute-cleanup.js .cleanup-analysis

# Validate changes
npm run build
npm test
npm run type-check
npm run lint
```

## Customization

### Modify Scoring Weights

Edit `.cleanup-analysis/intelligent-analyzer.js`:

```javascript
const SCORES = {
  NEVER_EXECUTED: 40,    // Increase to be more aggressive
  UNUSED_EXPORTS: 30,
  STALE_CODE: 20,
  HIGH_COMPLEXITY: 25,
  UNUSED_CONFIG: 35,
  SECURITY_BLOCK: -1000,
};
```

### Modify Removal Thresholds

Edit `.cleanup-analysis/intelligent-analyzer.js`:

```javascript
const THRESHOLDS = {
  DEPENDENCIES: 70,  // Increase to be more conservative
  FILES: 85,
  EXPORTS: 75,
};
```

### Add Security Patterns

Edit `.cleanup-analysis/intelligent-analyzer.js`:

```javascript
const SECURITY_CRITICAL_PATTERNS = [
  /admin/i,
  /auth/i,
  // Add your patterns here
  /my-critical-module/i,
];
```

## Troubleshooting

### Workflow fails on validation

**Cause**: Cleanup removed code that was actually used.

**Solution**:
1. Check the artifacts for details
2. Review the removal candidates
3. Add patterns to security-critical list
4. Adjust scoring thresholds

### Changes are rolled back

**Cause**: Validation pipeline detected failures.

**Solution**:
1. Check the workflow logs
2. Review which validation step failed
3. Fix the scoring or add security patterns
4. Re-run the workflow

### No changes detected

**Cause**: No removal candidates exceed thresholds.

**Solution**: This is normal! The codebase is already optimized.

## Best Practices

1. **Review Artifacts**: Always check uploaded artifacts before merging
2. **Monitor PR Comments**: Review the analysis summary in PR comments
3. **Incremental Changes**: Workflow makes small, safe changes over time
4. **Trust the Process**: Zero-regression guarantee ensures safety
5. **Manual Override**: Can always revert commits if needed

## Performance Impact

Expected improvements:

- **Bundle Size**: 5-15% reduction in unused dependencies
- **Code Coverage**: Improved by removing untested code
- **Maintainability**: Cleaner codebase with less dead code
- **Build Time**: Faster builds with fewer dependencies

## Security Considerations

1. **Permissions**: Workflow runs with `contents: write` and `pull-requests: write`
2. **Bot Commits**: Uses `github-actions[bot]` for all commits
3. **Audit Trail**: Complete analysis history in artifacts
4. **Rollback Safety**: Automatic reversion on any failure
5. **Pattern Matching**: Preserves all security-critical code

## Future Enhancements

Potential improvements:

- [ ] Machine learning-based scoring
- [ ] Dependency vulnerability integration
- [ ] Bundle size analysis
- [ ] Performance regression detection
- [ ] Auto-merge approved cleanups
- [ ] Scheduled cleanup runs
- [ ] Custom cleanup rules per directory

## Support

For issues or questions:

1. Check workflow logs in GitHub Actions
2. Review artifacts for detailed analysis
3. Open an issue with the `cleanup-workflow` label
4. Tag `@SMSDAO` for urgent matters

---

**🤖 Automated Cleanup Workflow v1.0**
*Continuous optimization with zero regressions*
*Part of the GXQ STUDIO Advanced Solana DeFi Platform*
