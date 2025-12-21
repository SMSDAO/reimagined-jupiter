# GXQS - Smart Merge Automation System

## Overview

GXQS is a production-ready bash script that safely automates the merging of multiple feature branches into a development branch with proper error handling, logging, and reporting capabilities.

## Features

### Core Capabilities

- **Parallel Merge Processing**: Support for concurrent branch merging with configurable parallelism (default: 4)
- **Retry Mechanism**: Exponential backoff with configurable retries (default: 3 attempts)
- **Timeout Handling**: Per-branch timeout protection (default: 900 seconds / 15 minutes)
- **Progress Tracking**: Visual progress bar and persistent state management
- **Worktree Isolation**: Uses Git worktrees for safe parallel operations without conflicts
- **Merge Scoring**: Intelligent merge quality assessment (0-100 scale)
- **State Persistence**: Resume capability after interruption
- **Comprehensive Logging**: Timestamped logs with multiple severity levels
- **Slack Integration**: Optional webhook notifications for merge events
- **JSON Reporting**: Machine-readable reports with detailed statistics

### Merge Scoring System

The script calculates a merge quality score (0-100) based on:

- **Conflicts**: -10 points per conflict (max -50 points)
- **File Changes**: -0.1 points per file changed (max -20 points)
- **Code Volume**: Penalty for massive changes >1000 lines (max -30 points)

Merges with scores below 60 (configurable) are automatically rejected.

## Installation

1. Copy the script to your repository:
   ```bash
   cp gxqs.sh /path/to/your/repo/
   chmod +x gxqs.sh
   ```

2. Ensure required dependencies are installed:
   - `git` (with worktree support)
   - `jq` (for JSON processing)
   - `curl` (for Slack notifications)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_PARALLEL` | 4 | Maximum concurrent merges |
| `MAX_RETRIES` | 3 | Retry attempts for failed operations |
| `TIMEOUT_SECONDS` | 900 | Timeout per branch (15 minutes) |
| `LOG_FILE` | smart-merge.log | Centralized logging file |
| `WORKTREE_ROOT` | .worktrees | Worktree directory |
| `STATE_FILE` | .merge-state | Persistence for resume capability |
| `REPORT_FILE` | merge-report.json | JSON report output |
| `SLACK_WEBHOOK` | (empty) | Optional Slack webhook URL |
| `TARGET_BRANCH` | dev | Target branch for merging |
| `MIN_MERGE_SCORE` | 60 | Minimum score to accept merge |

### Command-line Options

- `--dry-run`: Preview operations without executing merges
- `--auto-sweep`: Automatically detect and merge all feature branches (excluding main/dev)
- `--parallel N`: Override MAX_PARALLEL setting
- `--help, -h`: Show help message

## Usage Examples

### Basic Usage

Merge specific branches:
```bash
./gxqs.sh feature/branch1 feature/branch2 feature/branch3
```

### Auto-discovery Mode

Automatically detect and merge all feature branches:
```bash
./gxqs.sh --auto-sweep
```

### Dry-run Mode

Preview what would be merged without making changes:
```bash
./gxqs.sh --dry-run --auto-sweep
```

### Custom Parallelism

Merge with higher parallelism:
```bash
./gxqs.sh --parallel 8 feature/branch1 feature/branch2
```

### With Environment Variables

```bash
TARGET_BRANCH=main MIN_MERGE_SCORE=70 ./gxqs.sh --auto-sweep
```

### With Slack Notifications

```bash
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  ./gxqs.sh --auto-sweep
```

## Workflow

### Merge Process

For each branch, the script:

1. Creates an isolated Git worktree for the target branch
2. Calculates merge quality score (conflicts, file changes, code volume)
3. Rejects merge if score < MIN_MERGE_SCORE
4. Performs merge with `--no-ff --no-edit` flags
5. Validates merge within timeout period
6. Pushes successful merge to remote
7. Deletes remote branch after successful merge
8. Cleans up worktree
9. Updates state and report files

### Branch Discovery (--auto-sweep)

When using `--auto-sweep`, the script:

- Discovers all remote branches
- Excludes `main`, `dev`, `master`, and `HEAD`
- Processes discovered branches in parallel

### Error Handling

The script handles various error scenarios:

- **Timeout**: Kills merge process after TIMEOUT_SECONDS
- **Merge Conflicts**: Logs and reports failed merges
- **Network Errors**: Retries with exponential backoff
- **Low Score**: Skips merges below quality threshold

### State Persistence

The script maintains state in `.merge-state`:
- Allows resuming after interruption
- Tracks branch processing status
- Automatically cleared on successful completion

## Output Files

### Log File (smart-merge.log)

Timestamped log entries with severity levels:
- `INFO`: General information
- `DEBUG`: Detailed debugging information
- `WARN`: Warnings (non-fatal issues)
- `ERROR`: Errors (failed operations)
- `HEARTBEAT`: Branch status updates

### Report File (merge-report.json)

JSON-formatted report with:
```json
{
  "merges": [
    {
      "branch": "feature/example",
      "status": "success",
      "score": 85,
      "message": "Merged successfully",
      "conflicts": 0,
      "files_changed": 12,
      "timestamp": "2025-12-21T14:00:00Z"
    }
  ],
  "summary": {
    "total": 10,
    "success": 8,
    "failed": 1,
    "skipped": 1,
    "timeout": 0,
    "start_time": "2025-12-21T14:00:00Z",
    "end_time": "2025-12-21T14:15:30Z"
  }
}
```

## Safety Features

### Worktree Isolation

Each merge operates in its own Git worktree, ensuring:
- No interference between parallel merges
- Safe concurrent operations
- Easy cleanup on failure

### Graceful Cleanup

Trap handlers ensure cleanup on:
- Normal exit
- Interrupt (Ctrl+C)
- Termination signals

### Dry-run Mode

Test merge operations without making changes:
- Validates branch discovery
- Calculates merge scores
- Shows what would be merged

## Slack Notifications

When `SLACK_WEBHOOK` is configured, the script sends:

- 📊 Merge summaries (success/failure counts)
- ✅ Successful merge notifications
- ❌ Failed merge alerts
- ⚠️ Warnings (skipped branches)

Example Slack message:
```
✅ Successfully merged branch `feature/new-ui` (score: 85, duration: 45s)
```

## Troubleshooting

### "No branches to merge"

**Cause**: No branches found to merge
**Solution**: 
- Use `--auto-sweep` to discover branches
- Specify branch names explicitly
- Check if branches exist: `git branch -r`

### "Failed to create worktree"

**Cause**: Target branch doesn't exist or worktree conflicts
**Solution**:
- Verify TARGET_BRANCH exists
- Clean up stale worktrees: `git worktree prune`
- Check disk space

### "Required command not found"

**Cause**: Missing dependencies (git, jq, curl)
**Solution**: Install missing tools
```bash
# Ubuntu/Debian
sudo apt-get install git jq curl

# macOS
brew install git jq curl
```

### Merge timeout

**Cause**: Merge taking longer than TIMEOUT_SECONDS
**Solution**: Increase timeout
```bash
TIMEOUT_SECONDS=1800 ./gxqs.sh feature/large-branch
```

### Low merge score

**Cause**: Branch has many conflicts or changes
**Solution**: 
- Lower MIN_MERGE_SCORE threshold
- Manually resolve conflicts first
- Review and rebase branch

## Advanced Configuration

### Custom Target Branch

Merge into a different branch:
```bash
TARGET_BRANCH=staging ./gxqs.sh --auto-sweep
```

### Higher Quality Threshold

Require higher merge scores:
```bash
MIN_MERGE_SCORE=80 ./gxqs.sh feature/critical-fix
```

### Extended Timeout

For large merges:
```bash
TIMEOUT_SECONDS=3600 ./gxqs.sh feature/major-refactor
```

### Maximum Parallelism

Use all available resources:
```bash
MAX_PARALLEL=16 ./gxqs.sh --auto-sweep
```

## Best Practices

1. **Always test with --dry-run first**: Preview operations before execution
2. **Use appropriate parallelism**: Don't exceed your system's capacity
3. **Monitor logs**: Check `smart-merge.log` for detailed information
4. **Review merge reports**: Analyze `merge-report.json` for insights
5. **Set reasonable timeouts**: Adjust based on typical merge complexity
6. **Configure Slack notifications**: Stay informed of merge status
7. **Maintain clean branches**: Delete stale branches to avoid confusion
8. **Regular cleanup**: Prune worktrees periodically: `git worktree prune`

## Performance Considerations

- **Parallelism**: Higher values use more CPU/memory
- **Timeout**: Longer timeouts for complex merges
- **Network**: Multiple pushes can strain network
- **Disk Space**: Worktrees require additional disk space

## Security Considerations

- Script runs with user's Git credentials
- Automatically deletes remote branches after merge
- No credentials are logged or stored
- State files contain no sensitive information

## Contributing

To improve the script:

1. Test changes with `--dry-run`
2. Verify all features work as expected
3. Update documentation for new features
4. Add appropriate error handling
5. Follow existing code style

## License

This script is part of the reimagined-jupiter repository. See repository LICENSE for details.

## Support

For issues, questions, or contributions:
- Open an issue in the repository
- Check logs in `smart-merge.log`
- Review merge reports in `merge-report.json`
- Consult this documentation

## Version History

- **v1.0.0** (2025-12-21): Initial implementation
  - Parallel merge processing
  - Retry mechanism with exponential backoff
  - Timeout handling
  - Progress tracking
  - Worktree isolation
  - Merge scoring
  - State persistence
  - Command-line options
  - Slack notifications
  - JSON reporting
  - Graceful cleanup
