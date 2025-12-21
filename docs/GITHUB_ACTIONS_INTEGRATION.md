# GitHub Actions Integration for Merge-Branches.ps1

This document explains how to integrate the PowerShell merge automation script with GitHub Actions.

## Overview

The `Merge-Branches.ps1` script can be integrated into GitHub Actions workflows to automate branch merging on a schedule or trigger basis.

## Workflow Examples

### 1. Scheduled Daily Merge

Automatically merge feature branches every day at 2 AM UTC.

```yaml
name: Automated Branch Merge

on:
  schedule:
    # Run at 2 AM UTC daily
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      source_branches:
        description: 'Comma-separated list of branches to merge'
        required: false
        type: string
      target_branch:
        description: 'Target branch'
        required: false
        default: 'main'
        type: string
      max_parallel_jobs:
        description: 'Maximum parallel jobs (1-8)'
        required: false
        default: '4'
        type: string
      dry_run:
        description: 'Dry run mode'
        required: false
        default: false
        type: boolean

permissions:
  contents: write
  pull-requests: write

jobs:
  merge-branches:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for merge operations
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"

      - name: Run Merge Script (Auto-Sweep)
        if: github.event_name == 'schedule'
        shell: pwsh
        run: |
          ./scripts/Merge-Branches.ps1 `
            -AutoSweep `
            -TargetBranch "develop" `
            -MaxParallelJobs 4 `
            -UseWorktrees `
            -IncrementalMode `
            -BenchmarkMode

      - name: Run Merge Script (Manual)
        if: github.event_name == 'workflow_dispatch'
        shell: pwsh
        run: |
          $branches = "${{ inputs.source_branches }}" -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
          
          $params = @{
            TargetBranch = "${{ inputs.target_branch }}"
            MaxParallelJobs = [int]"${{ inputs.max_parallel_jobs }}"
            UseWorktrees = $true
            IncrementalMode = $true
            BenchmarkMode = $true
          }
          
          if ($branches.Count -gt 0) {
            $params.SourceBranches = $branches
          } else {
            $params.AutoSweep = $true
          }
          
          if ("${{ inputs.dry_run }}" -eq "true") {
            $params.DryRun = $true
          }
          
          ./scripts/Merge-Branches.ps1 @params

      - name: Upload Merge Logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: merge-logs-${{ github.run_number }}
          path: scripts/merge-log-*.txt
          retention-days: 30

      - name: Comment on Failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            
            // Find latest log file
            const scriptsDir = path.join(process.env.GITHUB_WORKSPACE, 'scripts');
            const logFiles = fs.readdirSync(scriptsDir)
              .filter(f => f.startsWith('merge-log-'))
              .sort()
              .reverse();
            
            if (logFiles.length > 0) {
              const logPath = path.join(scriptsDir, logFiles[0]);
              const logContent = fs.readFileSync(logPath, 'utf8');
              const errors = logContent.split('\n')
                .filter(line => line.includes('[Error]'))
                .slice(-10)  // Last 10 errors
                .join('\n');
              
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Automated Merge Failed - ${new Date().toISOString().split('T')[0]}`,
                body: `## Merge Automation Failure\n\n` +
                      `**Workflow Run:** [#${context.runNumber}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})\n\n` +
                      `**Recent Errors:**\n\`\`\`\n${errors}\n\`\`\`\n\n` +
                      `Please review the [full logs](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}) for details.`,
                labels: ['automation', 'merge-failure']
              });
            }
```

### 2. Pull Request Auto-Merge

Automatically merge approved PRs from feature branches.

```yaml
name: PR Auto-Merge

on:
  pull_request_review:
    types: [submitted]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to merge'
        required: true
        type: number

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge-pr:
    runs-on: ubuntu-latest
    if: github.event.review.state == 'approved' || github.event_name == 'workflow_dispatch'
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"

      - name: Get PR Details
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request?.number || ${{ inputs.pr_number }};
            const { data: pr } = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: prNumber
            });
            
            core.setOutput('source_branch', pr.head.ref);
            core.setOutput('target_branch', pr.base.ref);
            return pr;

      - name: Merge Branch
        shell: pwsh
        run: |
          ./scripts/Merge-Branches.ps1 `
            -SourceBranches @("${{ steps.pr.outputs.source_branch }}") `
            -TargetBranch "${{ steps.pr.outputs.target_branch }}" `
            -UseWorktrees `
            -IncrementalMode `
            -FastFail

      - name: Close PR
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request?.number || ${{ inputs.pr_number }};
            await github.rest.pulls.update({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: prNumber,
              state: 'closed'
            });
            
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
              body: '✅ Branch automatically merged by PowerShell automation script.'
            });
```

### 3. Weekly Maintenance Sweep

Weekly maintenance job to clean up and merge stale feature branches.

```yaml
name: Weekly Branch Maintenance

on:
  schedule:
    # Run every Sunday at 1 AM UTC
    - cron: '0 1 * * 0'
  workflow_dispatch:

permissions:
  contents: write
  issues: write

jobs:
  maintenance:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"

      - name: Identify Stale Branches
        id: stale
        shell: pwsh
        run: |
          # Find branches not updated in 30 days
          $staleBranches = git for-each-ref --format='%(refname:short) %(committerdate:iso8601)' refs/remotes/origin/feature/ |
            ForEach-Object {
              $parts = $_ -split ' ', 2
              $branch = $parts[0] -replace '^origin/', ''
              $date = [DateTime]::Parse($parts[1])
              $days = (Get-Date) - $date
              
              if ($days.TotalDays -gt 30) {
                return $branch
              }
            } |
            Where-Object { $_ }
          
          if ($staleBranches) {
            $branchList = $staleBranches -join ','
            Write-Output "branches=$branchList" >> $env:GITHUB_OUTPUT
            Write-Host "Found stale branches: $branchList"
          } else {
            Write-Output "branches=" >> $env:GITHUB_OUTPUT
            Write-Host "No stale branches found"
          }

      - name: Merge Stale Branches
        if: steps.stale.outputs.branches != ''
        shell: pwsh
        run: |
          $branches = "${{ steps.stale.outputs.branches }}" -split ',' | ForEach-Object { $_.Trim() }
          
          ./scripts/Merge-Branches.ps1 `
            -SourceBranches $branches `
            -TargetBranch "develop" `
            -MaxParallelJobs 8 `
            -UseWorktrees `
            -IncrementalMode `
            -BenchmarkMode

      - name: Create Summary Issue
        if: steps.stale.outputs.branches != ''
        uses: actions/github-script@v7
        with:
          script: |
            const branches = "${{ steps.stale.outputs.branches }}".split(',');
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Weekly Maintenance - ${branches.length} Stale Branches Merged`,
              body: `## Weekly Branch Maintenance Summary\n\n` +
                    `**Date:** ${new Date().toISOString().split('T')[0]}\n` +
                    `**Branches Merged:** ${branches.length}\n\n` +
                    `### Merged Branches:\n${branches.map(b => `- \`${b}\``).join('\n')}\n\n` +
                    `**Workflow Run:** [#${context.runNumber}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`,
              labels: ['maintenance', 'automated']
            });

      - name: Upload Logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maintenance-logs-${{ github.run_number }}
          path: scripts/merge-log-*.txt
          retention-days: 90
```

### 4. Emergency Hotfix Merge

Fast-track merge for critical hotfixes.

```yaml
name: Emergency Hotfix Merge

on:
  workflow_dispatch:
    inputs:
      hotfix_branch:
        description: 'Hotfix branch name'
        required: true
        type: string
      skip_tests:
        description: 'Skip tests (emergency only)'
        required: false
        default: false
        type: boolean

permissions:
  contents: write
  issues: write

jobs:
  hotfix-merge:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"

      - name: Merge Hotfix
        shell: pwsh
        run: |
          $params = @{
            SourceBranches = @("${{ inputs.hotfix_branch }}")
            TargetBranch = "main"
            MaxParallelJobs = 1
            FastFail = $true
            BenchmarkMode = $true
          }
          
          if ("${{ inputs.skip_tests }}" -eq "true") {
            $params.SkipTests = $true
          }
          
          ./scripts/Merge-Branches.ps1 @params

      - name: Create Notification Issue
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🚨 Hotfix Merged: ${{ inputs.hotfix_branch }}`,
              body: `## Emergency Hotfix Deployed\n\n` +
                    `**Branch:** \`${{ inputs.hotfix_branch }}\`\n` +
                    `**Target:** \`main\`\n` +
                    `**Tests Skipped:** ${{ inputs.skip_tests }}\n\n` +
                    `**Workflow Run:** [#${context.runNumber}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})\n\n` +
                    `⚠️ Please verify deployment and monitor for issues.`,
              labels: ['hotfix', 'critical', 'deployed']
            });

      - name: Upload Logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: hotfix-logs-${{ github.run_number }}
          path: scripts/merge-log-*.txt
          retention-days: 365  # Keep hotfix logs for 1 year
```

## Best Practices

### 1. Use Dedicated Service Account

Create a dedicated GitHub App or personal access token with limited permissions:

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.MERGE_BOT_TOKEN }}  # Use dedicated token
```

### 2. Enable Branch Protection

Configure branch protection rules:
- Require pull request reviews
- Require status checks to pass
- Enable auto-merge only for approved PRs

### 3. Monitor and Alert

Set up notifications for failures:

```yaml
- name: Notify on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Merge automation failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Dry Run First

Always test with dry run before enabling automatic merges:

```yaml
- name: Test Merge (Dry Run)
  shell: pwsh
  run: |
    ./scripts/Merge-Branches.ps1 -AutoSweep -DryRun
```

### 5. Limit Parallelism

Adjust based on GitHub Actions runner capacity:
- Free tier: 2-4 parallel jobs
- Paid tier: 4-8 parallel jobs

## Troubleshooting

### Issue: "Permission denied" errors

**Solution:** Ensure GITHUB_TOKEN has `contents: write` permission.

### Issue: Git authentication fails

**Solution:** Use checkout action with proper token:
```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    persist-credentials: true
```

### Issue: Tests timeout

**Solution:** Increase job timeout:
```yaml
jobs:
  merge-branches:
    timeout-minutes: 60  # Increase from default 30
```

### Issue: Out of memory

**Solution:** Reduce parallel jobs:
```yaml
-MaxParallelJobs 2  # Reduce from 4 or 8
```

## Security Considerations

1. **Use secrets for sensitive data**: Never hardcode credentials
2. **Limit workflow permissions**: Use minimal required permissions
3. **Audit logs regularly**: Review workflow execution logs
4. **Enable two-factor auth**: For all accounts with write access
5. **Use branch protection**: Prevent force pushes and deletions

## Performance Tips

1. **Use self-hosted runners**: For better performance and parallelism
2. **Enable caching**: Cache npm/yarn dependencies
3. **Run during off-peak hours**: Reduce conflicts
4. **Increase runner resources**: Use larger runners for big repos
5. **Optimize test suite**: Use incremental testing

## Examples in This Repository

See `.github/workflows/` directory for:
- `auto-merge.yml` - Existing auto-merge workflow
- Add more workflow examples as needed

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PowerShell in GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell)
- [Merge Automation Docs](./MERGE_AUTOMATION.md)

---

**Last Updated:** December 2025  
**Maintained By:** GXQ Studio
