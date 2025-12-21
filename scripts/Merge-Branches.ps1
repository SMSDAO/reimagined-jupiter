<#
.SYNOPSIS
    High-performance automated branch merge script with parallel processing.

.DESCRIPTION
    Optimized PowerShell script for merging multiple branches with:
    - True parallel job execution using git worktrees
    - Intelligent conflict resolution with caching
    - Comprehensive testing and validation
    - Performance monitoring and benchmarking
    - Self-healing mechanisms
    - Memory and I/O optimization

.PARAMETER SourceBranches
    Array of source branches to merge into target branches.

.PARAMETER TargetBranch
    Target branch to merge into. Defaults to 'main'.

.PARAMETER AutoSweep
    Automatically detect and merge all feature branches matching pattern.

.PARAMETER MaxParallelJobs
    Maximum number of parallel merge jobs. Default: 4, Max: 8.

.PARAMETER UseSparseCheckout
    Enable git sparse-checkout for large repositories.

.PARAMETER UseWorktrees
    Use git worktree for parallel safety (recommended).

.PARAMETER IncrementalMode
    Enable incremental builds and test caching.

.PARAMETER FastFail
    Abort on first critical failure.

.PARAMETER BenchmarkMode
    Enable detailed performance profiling and reporting.

.PARAMETER GitDepth
    Depth for shallow clones. Default: 1. Set to 0 for full history.

.PARAMETER SkipTests
    Skip test execution (not recommended for production).

.PARAMETER DryRun
    Simulate merge operations without making changes.

.EXAMPLE
    .\Merge-Branches.ps1 -SourceBranches @("feature/auth", "feature/api") -TargetBranch "develop"

.EXAMPLE
    .\Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 8 -BenchmarkMode

.EXAMPLE
    .\Merge-Branches.ps1 -SourceBranches @("feature/perf") -UseWorktrees -IncrementalMode -FastFail

.NOTES
    Version: 2.0.0
    Author: GXQ Studio
    Requires: PowerShell 7.0+, Git 2.30+
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string[]]$SourceBranches = @(),

    [Parameter(Mandatory = $false)]
    [string]$TargetBranch = "main",

    [Parameter(Mandatory = $false)]
    [switch]$AutoSweep,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 8)]
    [int]$MaxParallelJobs = 4,

    [Parameter(Mandatory = $false)]
    [switch]$UseSparseCheckout,

    [Parameter(Mandatory = $false)]
    [switch]$UseWorktrees = $true,

    [Parameter(Mandatory = $false)]
    [switch]$IncrementalMode,

    [Parameter(Mandatory = $false)]
    [switch]$FastFail,

    [Parameter(Mandatory = $false)]
    [switch]$BenchmarkMode,

    [Parameter(Mandatory = $false)]
    [ValidateRange(0, 100)]
    [int]$GitDepth = 1,

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

#Requires -Version 7.0

# Enable strict mode for better error detection
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# ============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# ============================================================================

$script:StartTime = Get-Date
$script:WorktreeDir = Join-Path $env:TEMP "merge-worktrees-$(Get-Random)"
$script:CacheDir = Join-Path $env:TEMP "merge-cache"
$script:LogFile = Join-Path $PSScriptRoot "merge-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$script:PerformanceMetrics = @{}
$script:ConflictCache = [System.Collections.Concurrent.ConcurrentDictionary[string, object]]::new()
$script:TestResultCache = [System.Collections.Concurrent.ConcurrentDictionary[string, object]]::new()
$script:GitStatusCache = [System.Collections.Concurrent.ConcurrentDictionary[string, object]]::new()

# Compiled regex patterns for performance
$script:MergeMarkerPattern = [regex]::new('<<<<<<< |=======$|>>>>>>> ', [System.Text.RegularExpressions.RegexOptions]::Compiled)
$script:BinaryFilePattern = [regex]::new('\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|exe|dll|so|dylib)$', [System.Text.RegularExpressions.RegexOptions]::Compiled -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

# Performance tracking
class PerformanceTimer {
    [string]$Name
    [datetime]$StartTime
    [System.Diagnostics.Stopwatch]$Stopwatch

    PerformanceTimer([string]$name) {
        $this.Name = $name
        $this.StartTime = Get-Date
        $this.Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    }

    [void]Stop() {
        $this.Stopwatch.Stop()
    }

    [double]GetElapsedSeconds() {
        return $this.Stopwatch.Elapsed.TotalSeconds
    }

    [string]ToString() {
        return "$($this.Name): $($this.Stopwatch.Elapsed.TotalSeconds.ToString('F2'))s"
    }
}

# ============================================================================
# LOGGING AND OUTPUT FUNCTIONS
# ============================================================================

function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [Parameter(Mandatory = $false)]
        [ValidateSet('Info', 'Success', 'Warning', 'Error', 'Debug')]
        [string]$Level = 'Info',

        [Parameter(Mandatory = $false)]
        [switch]$NoConsole
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $logMessage = "[$timestamp] [$Level] $Message"

    # Write to log file
    Add-Content -Path $script:LogFile -Value $logMessage -ErrorAction SilentlyContinue

    # Write to console with color
    if (-not $NoConsole) {
        $color = switch ($Level) {
            'Success' { 'Green' }
            'Warning' { 'Yellow' }
            'Error' { 'Red' }
            'Debug' { 'Gray' }
            default { 'White' }
        }

        $icon = switch ($Level) {
            'Success' { '✅' }
            'Warning' { '⚠️ ' }
            'Error' { '❌' }
            'Info' { 'ℹ️ ' }
            'Debug' { '🔍' }
        }

        Write-Host "$icon $Message" -ForegroundColor $color
    }
}

function Start-PerformanceTimer {
    [CmdletBinding()]
    param([string]$Name)

    $timer = [PerformanceTimer]::new($Name)
    if ($BenchmarkMode) {
        Write-Log "Started: $Name" -Level Debug
    }
    return $timer
}

function Stop-PerformanceTimer {
    [CmdletBinding()]
    param(
        [PerformanceTimer]$Timer,
        [switch]$Silent
    )

    $Timer.Stop()
    $script:PerformanceMetrics[$Timer.Name] = $Timer.GetElapsedSeconds()

    if ($BenchmarkMode -and -not $Silent) {
        Write-Log "Completed: $($Timer.ToString())" -Level Debug
    }

    return $Timer.GetElapsedSeconds()
}

# ============================================================================
# GIT UTILITY FUNCTIONS
# ============================================================================

function Initialize-GitEnvironment {
    [CmdletBinding()]
    param()

    $timer = Start-PerformanceTimer "Initialize-GitEnvironment"

    try {
        Write-Log "Initializing Git environment..." -Level Info

        # Ensure we're in a git repository
        $gitRoot = git rev-parse --show-toplevel 2>$null
        if (-not $gitRoot) {
            throw "Not in a git repository"
        }

        # Configure git for performance
        git config --local core.preloadindex true 2>$null
        git config --local core.fscache true 2>$null
        git config --local gc.auto 256 2>$null
        git config --local transfer.compression 9 2>$null

        # Create cache directory
        if (-not (Test-Path $script:CacheDir)) {
            New-Item -Path $script:CacheDir -ItemType Directory -Force | Out-Null
        }

        Write-Log "Git environment initialized at: $gitRoot" -Level Success
        return $gitRoot

    } finally {
        Stop-PerformanceTimer $timer -Silent
    }
}

function Invoke-OptimizedGitFetch {
    [CmdletBinding()]
    param(
        [string]$Remote = "origin",
        [switch]$Prune
    )

    $timer = Start-PerformanceTimer "Invoke-OptimizedGitFetch"

    try {
        Write-Log "Fetching from remote: $Remote" -Level Info

        $fetchArgs = @('fetch', $Remote, '--no-tags', '--quiet')

        if ($GitDepth -gt 0) {
            $fetchArgs += "--depth=$GitDepth"
        }

        if ($Prune) {
            $fetchArgs += '--prune'
        }

        # Use --atomic for safer multi-ref operations
        $fetchArgs += '--atomic'

        $result = & git @fetchArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Git fetch failed: $result"
        }

        Write-Log "Fetch completed successfully" -Level Success

    } finally {
        Stop-PerformanceTimer $timer -Silent
    }
}

function Get-BranchList {
    [CmdletBinding()]
    param(
        [switch]$Remote,
        [string]$Pattern = "*"
    )

    $timer = Start-PerformanceTimer "Get-BranchList"

    try {
        $branches = @()

        if ($Remote) {
            # Get remote branches
            $remoteBranches = git branch -r --list "origin/$Pattern" 2>$null |
                ForEach-Object { $_.Trim() -replace '^origin/', '' } |
                Where-Object { $_ -notmatch '^HEAD' }

            $branches = $remoteBranches
        } else {
            # Get local branches
            $localBranches = git branch --list $Pattern 2>$null |
                ForEach-Object { $_.Trim() -replace '^\*\s*', '' }

            $branches = $localBranches
        }

        Write-Log "Found $($branches.Count) branches matching pattern: $Pattern" -Level Info
        return $branches

    } finally {
        Stop-PerformanceTimer $timer -Silent
    }
}

function New-GitWorktree {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Branch,

        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $timer = Start-PerformanceTimer "New-GitWorktree-$Branch"

    try {
        Write-Log "Creating worktree for branch: $Branch" -Level Info

        # Ensure parent directory exists
        $parentDir = Split-Path $Path -Parent
        if (-not (Test-Path $parentDir)) {
            New-Item -Path $parentDir -ItemType Directory -Force | Out-Null
        }

        # Create worktree
        $result = git worktree add $Path $Branch 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create worktree: $result"
        }

        Write-Log "Worktree created at: $Path" -Level Success
        return $Path

    } finally {
        Stop-PerformanceTimer $timer -Silent
    }
}

function Remove-GitWorktree {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [switch]$Force
    )

    try {
        if (Test-Path $Path) {
            $args = @('worktree', 'remove', $Path)
            if ($Force) {
                $args += '--force'
            }

            git @args 2>&1 | Out-Null
            Write-Log "Removed worktree: $Path" -Level Info
        }
    } catch {
        Write-Log "Warning: Failed to remove worktree: $Path - $_" -Level Warning
    }
}

# ============================================================================
# CONFLICT DETECTION AND RESOLUTION
# ============================================================================

function Test-FileHasMergeConflicts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    # Check cache first
    $cacheKey = "$FilePath-$(Get-FileHash -Path $FilePath -Algorithm MD5 | Select-Object -ExpandProperty Hash)"
    $cached = $null
    if ($script:ConflictCache.TryGetValue($cacheKey, [ref]$cached)) {
        return $cached
    }

    # Skip binary files
    if ($script:BinaryFilePattern.IsMatch($FilePath)) {
        $script:ConflictCache.TryAdd($cacheKey, $false) | Out-Null
        return $false
    }

    try {
        # Stream file content for memory efficiency
        $hasConflict = $false
        $reader = [System.IO.File]::OpenText($FilePath)

        try {
            while ($null -ne ($line = $reader.ReadLine())) {
                if ($script:MergeMarkerPattern.IsMatch($line)) {
                    $hasConflict = $true
                    break
                }
            }
        } finally {
            $reader.Close()
        }

        # Cache result
        $script:ConflictCache.TryAdd($cacheKey, $hasConflict) | Out-Null
        return $hasConflict

    } catch {
        Write-Log "Error checking file for conflicts: $FilePath - $_" -Level Warning
        return $false
    }
}

function Resolve-MergeConflicts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorktreePath
    )

    $timer = Start-PerformanceTimer "Resolve-MergeConflicts"

    try {
        Write-Log "Checking for merge conflicts in: $WorktreePath" -Level Info

        Push-Location $WorktreePath

        try {
            # Get list of conflicted files
            $conflictedFiles = git diff --name-only --diff-filter=U 2>$null

            if (-not $conflictedFiles) {
                Write-Log "No merge conflicts detected" -Level Success
                return $true
            }

            $fileArray = $conflictedFiles -split "`n" | Where-Object { $_ }
            Write-Log "Found $($fileArray.Count) files with conflicts" -Level Warning

            # Resolve conflicts in parallel for independent files
            $resolvedCount = 0
            $fileArray | ForEach-Object -Parallel {
                $file = $_
                $filePath = Join-Path $using:WorktreePath $file

                if (Test-Path $filePath) {
                    # Attempt automatic resolution (prefer theirs for config files)
                    if ($file -match '\.(json|yml|yaml|config)$') {
                        git checkout --theirs $file 2>$null
                        git add $file 2>$null
                        return $true
                    }
                }
                return $false
            } -ThrottleLimit $MaxParallelJobs | ForEach-Object {
                if ($_) { $resolvedCount++ }
            }

            # Check if all conflicts resolved
            $remainingConflicts = git diff --name-only --diff-filter=U 2>$null
            if ($remainingConflicts) {
                Write-Log "Unable to automatically resolve all conflicts" -Level Error
                return $false
            }

            Write-Log "Resolved $resolvedCount conflicts automatically" -Level Success
            return $true

        } finally {
            Pop-Location
        }

    } finally {
        Stop-PerformanceTimer $timer
    }
}

# ============================================================================
# TEST AND VALIDATION FUNCTIONS
# ============================================================================

function Test-RepositoryHealth {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorktreePath,

        [Parameter(Mandatory = $true)]
        [string]$CommitSha
    )

    $timer = Start-PerformanceTimer "Test-RepositoryHealth"

    try {
        Write-Log "Running health checks for commit: $CommitSha" -Level Info

        # Check test result cache
        $cacheKey = "health-$CommitSha"
        $cached = $null
        if ($IncrementalMode -and $script:TestResultCache.TryGetValue($cacheKey, [ref]$cached)) {
            Write-Log "Using cached test results for: $CommitSha" -Level Info
            return $cached
        }

        Push-Location $WorktreePath

        try {
            $results = @{
                LintPassed = $false
                BuildPassed = $false
                TestsPassed = $false
            }

            # Run tests in parallel
            $jobs = @()

            # Lint job
            $lintJob = Start-Job -ScriptBlock {
                param($path)
                Set-Location $path
                $result = @{ Success = $false; Output = "" }

                if (Test-Path "package.json") {
                    $output = npm run lint 2>&1
                    $result.Success = $LASTEXITCODE -eq 0
                    $result.Output = $output -join "`n"
                }

                return $result
            } -ArgumentList $WorktreePath

            $jobs += @{ Name = "Lint"; Job = $lintJob }

            # Build job
            $buildJob = Start-Job -ScriptBlock {
                param($path, $incremental)
                Set-Location $path
                $result = @{ Success = $false; Output = "" }

                if (Test-Path "package.json") {
                    # Install dependencies if needed
                    if (-not (Test-Path "node_modules")) {
                        npm ci --quiet 2>&1 | Out-Null
                    }

                    $buildCmd = if ($incremental) { "npm run build -- --incremental" } else { "npm run build" }
                    $output = Invoke-Expression $buildCmd 2>&1
                    $result.Success = $LASTEXITCODE -eq 0
                    $result.Output = $output -join "`n"
                }

                return $result
            } -ArgumentList $WorktreePath, $IncrementalMode

            $jobs += @{ Name = "Build"; Job = $buildJob }

            # Test job (only if not skipped)
            if (-not $SkipTests) {
                $testJob = Start-Job -ScriptBlock {
                    param($path)
                    Set-Location $path
                    $result = @{ Success = $false; Output = "" }

                    if (Test-Path "package.json") {
                        $output = npm test 2>&1
                        $result.Success = $LASTEXITCODE -eq 0
                        $result.Output = $output -join "`n"
                    }

                    return $result
                } -ArgumentList $WorktreePath

                $jobs += @{ Name = "Test"; Job = $testJob }
            } else {
                $results.TestsPassed = $true
            }

            # Wait for jobs with timeout
            $timeout = 600 # 10 minutes
            $completed = Wait-Job -Job ($jobs | ForEach-Object { $_.Job }) -Timeout $timeout

            # Collect results
            foreach ($jobInfo in $jobs) {
                $jobResult = Receive-Job -Job $jobInfo.Job -ErrorAction SilentlyContinue

                if ($jobResult) {
                    switch ($jobInfo.Name) {
                        "Lint" { $results.LintPassed = $jobResult.Success }
                        "Build" { $results.BuildPassed = $jobResult.Success }
                        "Test" { $results.TestsPassed = $jobResult.Success }
                    }

                    if (-not $jobResult.Success) {
                        Write-Log "$($jobInfo.Name) failed: $($jobResult.Output)" -Level Error

                        if ($FastFail) {
                            throw "$($jobInfo.Name) failed - aborting due to FastFail mode"
                        }
                    } else {
                        Write-Log "$($jobInfo.Name) passed" -Level Success
                    }
                }

                Remove-Job -Job $jobInfo.Job -Force -ErrorAction SilentlyContinue
            }

            # Cache results
            if ($IncrementalMode) {
                $script:TestResultCache.TryAdd($cacheKey, $results) | Out-Null
            }

            $allPassed = $results.LintPassed -and $results.BuildPassed -and $results.TestsPassed
            return $allPassed

        } finally {
            Pop-Location
        }

    } finally {
        Stop-PerformanceTimer $timer
    }
}

# ============================================================================
# MERGE OPERATION FUNCTIONS
# ============================================================================

function Invoke-BranchMerge {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceBranch,

        [Parameter(Mandatory = $true)]
        [string]$TargetBranch,

        [Parameter(Mandatory = $true)]
        [string]$WorktreePath
    )

    $timer = Start-PerformanceTimer "Merge-$SourceBranch"

    $result = @{
        Success = $false
        SourceBranch = $SourceBranch
        TargetBranch = $TargetBranch
        Message = ""
        Skipped = $false
    }

    try {
        Write-Log "Starting merge: $SourceBranch -> $TargetBranch" -Level Info

        Push-Location $WorktreePath

        try {
            # Ensure we're on target branch
            git checkout $TargetBranch 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to checkout target branch: $TargetBranch"
            }

            # Check if branch exists
            $branchExists = git rev-parse --verify "origin/$SourceBranch" 2>$null
            if ($LASTEXITCODE -ne 0) {
                $result.Message = "Branch does not exist: $SourceBranch"
                $result.Skipped = $true
                Write-Log $result.Message -Level Warning
                return $result
            }

            # Check if already merged
            $mergeBase = git merge-base HEAD "origin/$SourceBranch" 2>$null
            $sourceSha = git rev-parse "origin/$SourceBranch" 2>$null

            if ($mergeBase -eq $sourceSha) {
                $result.Message = "Branch already merged: $SourceBranch"
                $result.Skipped = $true
                Write-Log $result.Message -Level Info
                return $result
            }

            # Perform merge
            if ($DryRun) {
                Write-Log "DRY RUN: Would merge $SourceBranch into $TargetBranch" -Level Info
                $result.Success = $true
                $result.Message = "Dry run completed"
                return $result
            }

            $mergeOutput = git merge --no-ff --no-edit "origin/$SourceBranch" 2>&1
            $mergeExitCode = $LASTEXITCODE

            if ($mergeExitCode -ne 0) {
                # Check for conflicts
                $hasConflicts = git diff --name-only --diff-filter=U 2>$null

                if ($hasConflicts) {
                    Write-Log "Merge conflicts detected, attempting resolution..." -Level Warning

                    if (Resolve-MergeConflicts -WorktreePath $WorktreePath) {
                        # Complete merge after conflict resolution
                        git commit --no-edit 2>&1 | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Log "Merge completed after conflict resolution" -Level Success
                        } else {
                            throw "Failed to commit after conflict resolution"
                        }
                    } else {
                        throw "Unable to resolve merge conflicts"
                    }
                } else {
                    throw "Merge failed: $mergeOutput"
                }
            }

            # Get commit SHA
            $commitSha = git rev-parse HEAD

            # Run health checks
            if (-not $SkipTests) {
                Write-Log "Running health checks..." -Level Info
                $healthPassed = Test-RepositoryHealth -WorktreePath $WorktreePath -CommitSha $commitSha

                if (-not $healthPassed) {
                    throw "Health checks failed"
                }
            }

            # Push changes
            if (-not $DryRun) {
                $pushSuccess = Invoke-GitPushWithRetry -Branch $TargetBranch -WorktreePath $WorktreePath

                if (-not $pushSuccess) {
                    throw "Failed to push changes"
                }
            }

            $result.Success = $true
            $result.Message = "Merge completed successfully"
            Write-Log "✅ Successfully merged: $SourceBranch -> $TargetBranch" -Level Success

        } finally {
            Pop-Location
        }

    } catch {
        $result.Message = "Merge failed: $_"
        Write-Log $result.Message -Level Error

        # Attempt rollback
        try {
            Push-Location $WorktreePath
            git merge --abort 2>&1 | Out-Null
            Write-Log "Rolled back failed merge" -Level Warning
            Pop-Location
        } catch {
            Write-Log "Warning: Could not rollback merge" -Level Warning
        }

    } finally {
        Stop-PerformanceTimer $timer
    }

    return $result
}

function Invoke-GitPushWithRetry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Branch,

        [Parameter(Mandatory = $true)]
        [string]$WorktreePath,

        [int]$MaxRetries = 3
    )

    $timer = Start-PerformanceTimer "Push-$Branch"

    try {
        Push-Location $WorktreePath

        try {
            $attempt = 0
            $backoffSeconds = 2

            while ($attempt -lt $MaxRetries) {
                $attempt++
                Write-Log "Pushing changes (attempt $attempt/$MaxRetries)..." -Level Info

                $pushOutput = git push --atomic origin $Branch 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Push successful" -Level Success
                    return $true
                }

                if ($attempt -lt $MaxRetries) {
                    Write-Log "Push failed, retrying in $backoffSeconds seconds..." -Level Warning
                    Start-Sleep -Seconds $backoffSeconds
                    $backoffSeconds *= 2  # Exponential backoff
                }
            }

            Write-Log "Push failed after $MaxRetries attempts" -Level Error
            return $false

        } finally {
            Pop-Location
        }

    } finally {
        Stop-PerformanceTimer $timer -Silent
    }
}

# ============================================================================
# PARALLEL PROCESSING FUNCTIONS
# ============================================================================

function Invoke-ParallelMerge {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Branches,

        [Parameter(Mandatory = $true)]
        [string]$TargetBranch
    )

    $timer = Start-PerformanceTimer "Parallel-Merge-All"

    try {
        Write-Log "Starting parallel merge of $($Branches.Count) branches" -Level Info
        Write-Log "Max parallel jobs: $MaxParallelJobs" -Level Info

        # Create worktree directory
        if (-not (Test-Path $script:WorktreeDir)) {
            New-Item -Path $script:WorktreeDir -ItemType Directory -Force | Out-Null
        }

        $results = @()

        # Process branches in parallel with throttling
        $results = $Branches | ForEach-Object -Parallel {
            $branch = $_
            $targetBranch = $using:TargetBranch
            $worktreeBase = $using:script:WorktreeDir
            $useWorktrees = $using:UseWorktrees
            $dryRun = $using:DryRun
            $skipTests = $using:SkipTests
            $incrementalMode = $using:IncrementalMode
            $fastFail = $using:FastFail

            # Create unique worktree path
            $sanitizedBranch = $branch -replace '[^a-zA-Z0-9-]', '-'
            $worktreePath = Join-Path $worktreeBase "worktree-$sanitizedBranch"

            try {
                # Create worktree if using worktrees
                if ($useWorktrees) {
                    $createResult = git worktree add $worktreePath $targetBranch 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        throw "Failed to create worktree: $createResult"
                    }
                }

                # Import functions needed in parallel scope
                $mergeFunctionDef = ${function:Invoke-BranchMerge}.ToString()
                $resolveFunctionDef = ${function:Resolve-MergeConflicts}.ToString()
                $testFunctionDef = ${function:Test-RepositoryHealth}.ToString()
                $pushFunctionDef = ${function:Invoke-GitPushWithRetry}.ToString()

                Invoke-Command -ScriptBlock ([scriptblock]::Create($mergeFunctionDef))
                Invoke-Command -ScriptBlock ([scriptblock]::Create($resolveFunctionDef))
                Invoke-Command -ScriptBlock ([scriptblock]::Create($testFunctionDef))
                Invoke-Command -ScriptBlock ([scriptblock]::Create($pushFunctionDef))

                # Perform merge
                $result = Invoke-BranchMerge -SourceBranch $branch -TargetBranch $targetBranch -WorktreePath $worktreePath

                return $result

            } finally {
                # Cleanup worktree
                if ($useWorktrees -and (Test-Path $worktreePath)) {
                    git worktree remove $worktreePath --force 2>&1 | Out-Null
                }
            }

        } -ThrottleLimit $MaxParallelJobs

        # Analyze results
        $successful = ($results | Where-Object { $_.Success }).Count
        $failed = ($results | Where-Object { -not $_.Success -and -not $_.Skipped }).Count
        $skipped = ($results | Where-Object { $_.Skipped }).Count

        Write-Log "" -Level Info
        Write-Log "═══════════════════════════════════════" -Level Info
        Write-Log "Merge Summary:" -Level Info
        Write-Log "  Total branches: $($Branches.Count)" -Level Info
        Write-Log "  ✅ Successful: $successful" -Level Success
        Write-Log "  ❌ Failed: $failed" -Level $(if ($failed -gt 0) { 'Error' } else { 'Info' })
        Write-Log "  ⏭️  Skipped: $skipped" -Level Info
        Write-Log "═══════════════════════════════════════" -Level Info
        Write-Log "" -Level Info

        # Show failed merges
        if ($failed -gt 0) {
            Write-Log "Failed merges:" -Level Error
            $results | Where-Object { -not $_.Success -and -not $_.Skipped } | ForEach-Object {
                Write-Log "  - $($_.SourceBranch): $($_.Message)" -Level Error
            }
        }

        return $results

    } finally {
        Stop-PerformanceTimer $timer
    }
}

# ============================================================================
# PERFORMANCE REPORTING
# ============================================================================

function Show-PerformanceReport {
    [CmdletBinding()]
    param()

    $totalTime = (Get-Date) - $script:StartTime

    Write-Log "" -Level Info
    Write-Log "═══════════════════════════════════════" -Level Info
    Write-Log "Performance Report" -Level Info
    Write-Log "═══════════════════════════════════════" -Level Info
    Write-Log "Total execution time: $($totalTime.TotalSeconds.ToString('F2'))s" -Level Info
    Write-Log "" -Level Info

    if ($BenchmarkMode -and $script:PerformanceMetrics.Count -gt 0) {
        Write-Log "Operation Timings:" -Level Info
        $script:PerformanceMetrics.GetEnumerator() |
            Sort-Object Value -Descending |
            ForEach-Object {
                $percentage = ($_.Value / $totalTime.TotalSeconds) * 100
                Write-Log "  $($_.Key): $($_.Value.ToString('F2'))s ($($percentage.ToString('F1'))%)" -Level Info
            }
    }

    # Memory usage
    $process = Get-Process -Id $PID
    $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
    $peakMemoryMB = [math]::Round($process.PeakWorkingSet64 / 1MB, 2)

    Write-Log "" -Level Info
    Write-Log "Memory Usage:" -Level Info
    Write-Log "  Current: ${memoryMB} MB" -Level Info
    Write-Log "  Peak: ${peakMemoryMB} MB" -Level Info

    Write-Log "═══════════════════════════════════════" -Level Info
    Write-Log "" -Level Info
}

# ============================================================================
# CLEANUP FUNCTIONS
# ============================================================================

function Invoke-Cleanup {
    [CmdletBinding()]
    param()

    Write-Log "Performing cleanup..." -Level Info

    try {
        # Remove all worktrees
        if (Test-Path $script:WorktreeDir) {
            Get-ChildItem $script:WorktreeDir -Directory | ForEach-Object {
                Remove-GitWorktree -Path $_.FullName -Force
            }

            Remove-Item $script:WorktreeDir -Recurse -Force -ErrorAction SilentlyContinue
        }

        # Prune worktrees
        git worktree prune 2>&1 | Out-Null

        Write-Log "Cleanup completed" -Level Success

    } catch {
        Write-Log "Warning during cleanup: $_" -Level Warning
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Main {
    try {
        Write-Log "═══════════════════════════════════════" -Level Info
        Write-Log "GXQ Studio - Automated Branch Merge" -Level Info
        Write-Log "Version 2.0.0 - High Performance Edition" -Level Info
        Write-Log "═══════════════════════════════════════" -Level Info
        Write-Log "" -Level Info

        # Validate PowerShell version
        if ($PSVersionTable.PSVersion.Major -lt 7) {
            throw "This script requires PowerShell 7.0 or higher"
        }

        # Validate git version
        $gitVersion = git --version 2>$null
        if (-not $gitVersion) {
            throw "Git is not installed or not in PATH"
        }
        Write-Log "Using $gitVersion" -Level Info

        # Initialize environment
        $gitRoot = Initialize-GitEnvironment

        # Fetch latest changes
        Invoke-OptimizedGitFetch -Remote "origin" -Prune

        # Determine branches to merge
        $branchesToMerge = @()

        if ($AutoSweep) {
            Write-Log "Auto-sweep mode: detecting feature branches" -Level Info
            $branchesToMerge = Get-BranchList -Remote -Pattern "feature/*"

            if ($branchesToMerge.Count -eq 0) {
                Write-Log "No feature branches found to merge" -Level Warning
                return
            }

            Write-Log "Found $($branchesToMerge.Count) feature branches" -Level Info
        } elseif ($SourceBranches.Count -eq 0) {
            Write-Log "No source branches specified. Use -SourceBranches or -AutoSweep" -Level Error
            return
        } else {
            $branchesToMerge = $SourceBranches
        }

        Write-Log "Branches to merge: $($branchesToMerge -join ', ')" -Level Info
        Write-Log "Target branch: $TargetBranch" -Level Info
        Write-Log "" -Level Info

        # Confirm if not in dry-run mode
        if (-not $DryRun -and -not $Confirm) {
            $response = Read-Host "Proceed with merge? (y/N)"
            if ($response -notmatch '^[Yy]') {
                Write-Log "Merge cancelled by user" -Level Warning
                return
            }
        }

        # Execute parallel merge
        $results = Invoke-ParallelMerge -Branches $branchesToMerge -TargetBranch $TargetBranch

        # Show performance report
        if ($BenchmarkMode) {
            Show-PerformanceReport
        }

        # Determine exit code
        $failedCount = ($results | Where-Object { -not $_.Success -and -not $_.Skipped }).Count
        if ($failedCount -gt 0) {
            Write-Log "Merge completed with $failedCount failures" -Level Error
            exit 1
        } else {
            Write-Log "All merges completed successfully! 🎉" -Level Success
            exit 0
        }

    } catch {
        Write-Log "Fatal error: $_" -Level Error
        Write-Log $_.ScriptStackTrace -Level Debug
        exit 1

    } finally {
        # Cleanup
        Invoke-Cleanup

        # Final log message
        Write-Log "Log file: $script:LogFile" -Level Info
    }
}

# Execute main function
Main
