# Merge Automation Quick Reference

## Command Cheat Sheet

### Basic Commands

```powershell
# Merge single branch
./scripts/Merge-Branches.ps1 -SourceBranches @("feature/auth")

# Merge multiple branches
./scripts/Merge-Branches.ps1 -SourceBranches @("feature/auth", "feature/api", "feature/ui")

# Auto-sweep all feature branches
./scripts/Merge-Branches.ps1 -AutoSweep

# Change target branch
./scripts/Merge-Branches.ps1 -AutoSweep -TargetBranch "develop"
```

### Performance Tuning

```powershell
# Fast mode (8 parallel jobs)
./scripts/Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 8

# Incremental builds
./scripts/Merge-Branches.ps1 -AutoSweep -IncrementalMode

# Full optimization
./scripts/Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 8 -IncrementalMode -UseWorktrees
```

### Safety & Testing

```powershell
# Dry run (no changes)
./scripts/Merge-Branches.ps1 -AutoSweep -DryRun

# Fast-fail (abort on first error)
./scripts/Merge-Branches.ps1 -AutoSweep -FastFail

# Skip tests (not recommended)
./scripts/Merge-Branches.ps1 -AutoSweep -SkipTests
```

### Monitoring

```powershell
# Benchmark mode (detailed metrics)
./scripts/Merge-Branches.ps1 -AutoSweep -BenchmarkMode

# Verbose output
./scripts/Merge-Branches.ps1 -AutoSweep -Verbose
```

## Parameter Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-SourceBranches` | string[] | `@()` | Branches to merge |
| `-TargetBranch` | string | `"main"` | Target branch |
| `-AutoSweep` | switch | `false` | Auto-detect feature/* branches |
| `-MaxParallelJobs` | int | `4` | Parallel jobs (1-8) |
| `-UseWorktrees` | switch | `true` | Use git worktrees |
| `-IncrementalMode` | switch | `false` | Enable caching |
| `-FastFail` | switch | `false` | Abort on first error |
| `-BenchmarkMode` | switch | `false` | Show detailed metrics |
| `-SkipTests` | switch | `false` | Skip test execution |
| `-DryRun` | switch | `false` | Test without changes |
| `-GitDepth` | int | `1` | Clone depth (0=full) |
| `-UseSparseCheckout` | switch | `false` | Sparse checkout |

## Common Scenarios

### Daily Maintenance
```powershell
./scripts/Merge-Branches.ps1 `
  -AutoSweep `
  -TargetBranch "develop" `
  -MaxParallelJobs 4 `
  -IncrementalMode `
  -BenchmarkMode
```

### Emergency Hotfix
```powershell
./scripts/Merge-Branches.ps1 `
  -SourceBranches @("hotfix/critical") `
  -TargetBranch "main" `
  -MaxParallelJobs 1 `
  -FastFail
```

### Large Batch Merge
```powershell
./scripts/Merge-Branches.ps1 `
  -AutoSweep `
  -MaxParallelJobs 8 `
  -UseWorktrees `
  -IncrementalMode
```

### Testing Before Production
```powershell
# 1. Test with dry run
./scripts/Merge-Branches.ps1 -AutoSweep -DryRun

# 2. Run with 1 job for safety
./scripts/Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 1

# 3. Scale up if successful
./scripts/Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 4 -IncrementalMode
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success - all merges completed |
| `1` | Failure - one or more merges failed |

## Output Files

- **Log File**: `scripts/merge-log-YYYYMMDD-HHmmss.txt`
- **Location**: Same directory as script
- **Retention**: Manual cleanup (or use workflow automation)

## Performance Tips

### Small Repos (< 100MB)
```powershell
-MaxParallelJobs 4 -GitDepth 1
```

### Large Repos (> 500MB)
```powershell
-MaxParallelJobs 8 -UseSparseCheckout -IncrementalMode -GitDepth 1
```

### Slow Network
```powershell
-MaxParallelJobs 2 -GitDepth 1
```

### Fast Network + Powerful Hardware
```powershell
-MaxParallelJobs 8 -IncrementalMode -GitDepth 0
```

## Troubleshooting

### "Permission denied"
```powershell
# Make script executable (Unix/Mac)
chmod +x scripts/Merge-Branches.ps1

# Windows: Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Not in a git repository"
```powershell
# Run from repository root
cd /path/to/reimagined-jupiter
./scripts/Merge-Branches.ps1 -AutoSweep
```

### Out of Memory
```powershell
# Reduce parallel jobs
./scripts/Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 2
```

### Tests Timeout
```powershell
# Skip tests (emergency only)
./scripts/Merge-Branches.ps1 -AutoSweep -SkipTests

# Or increase job timeout in workflow
```

### Worktree Errors
```powershell
# Clean up stale worktrees
git worktree prune

# Remove temp directory
rm -rf $env:TEMP/merge-worktrees-*
```

## Test Suite

```powershell
# Run validation tests
./scripts/Test-MergeBranches.ps1

# Expected output: 34 tests passed
```

## GitHub Actions

### Manual Trigger
1. Go to Actions tab
2. Select "PowerShell Merge Automation"
3. Click "Run workflow"
4. Fill in parameters
5. Click "Run workflow"

### Scheduled Run
- Disabled by default
- Remove `if: false` from workflow to enable
- Runs daily at 2 AM UTC

## Getting Help

```powershell
# Show help
Get-Help ./scripts/Merge-Branches.ps1

# Show examples
Get-Help ./scripts/Merge-Branches.ps1 -Examples

# Show full help
Get-Help ./scripts/Merge-Branches.ps1 -Full
```

## Best Practices

1. ✅ Always dry run first: `-DryRun`
2. ✅ Use worktrees: `-UseWorktrees` (default)
3. ✅ Enable incremental mode: `-IncrementalMode`
4. ✅ Set appropriate parallelism: `-MaxParallelJobs 4-8`
5. ✅ Monitor with benchmark: `-BenchmarkMode`
6. ✅ Use fast-fail for critical merges: `-FastFail`
7. ✅ Keep git updated: `git --version` (2.30+)
8. ✅ Review logs after each run
9. ✅ Test on dev/staging first
10. ✅ Run during off-peak hours

## Links

- [Full Documentation](./MERGE_AUTOMATION.md)
- [GitHub Actions Integration](./GITHUB_ACTIONS_INTEGRATION.md)
- [Performance Analysis](./PERFORMANCE_RESULTS.md)
- [Scripts Directory](../scripts/README.md)

---

**Quick Access**: Save this file as bookmark for fast reference during operations.
