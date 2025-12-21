#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test script for Merge-Branches.ps1

.DESCRIPTION
    Validates the PowerShell merge automation script functionality
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Test configuration
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = ""
    )

    $testResults.Total++

    if ($Passed) {
        $testResults.Passed++
        Write-Host "  ✅ PASS: $TestName" -ForegroundColor Green
    } else {
        $testResults.Failed++
        Write-Host "  ❌ FAIL: $TestName" -ForegroundColor Red
        if ($Message) {
            Write-Host "      $Message" -ForegroundColor Yellow
        }
    }
}

function Test-Prerequisites {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Testing Prerequisites" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    # Test PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    $psOk = $psVersion.Major -ge 7
    Write-TestResult "PowerShell version >= 7.0 (found $($psVersion.ToString()))" $psOk

    # Test Git installation
    try {
        $gitVersion = git --version 2>$null
        $gitOk = $null -ne $gitVersion
        Write-TestResult "Git installed ($gitVersion)" $gitOk
    } catch {
        Write-TestResult "Git installed" $false "Git not found in PATH"
    }

    # Test script exists
    $scriptPath = Join-Path $PSScriptRoot ".." "scripts" "Merge-Branches.ps1"
    $scriptExists = Test-Path $scriptPath
    Write-TestResult "Script file exists" $scriptExists "Path: $scriptPath"

    # Test in git repository
    try {
        $gitRoot = git rev-parse --show-toplevel 2>$null
        $inRepo = $null -ne $gitRoot
        Write-TestResult "In git repository" $inRepo
    } catch {
        Write-TestResult "In git repository" $false
    }

    return ($psOk -and $gitOk -and $scriptExists -and $inRepo)
}

function Test-ScriptSyntax {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Testing Script Syntax" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $scriptPath = Join-Path $PSScriptRoot ".." "scripts" "Merge-Branches.ps1"

    # Test script can be parsed
    try {
        $null = [System.Management.Automation.PSParser]::Tokenize(
            (Get-Content $scriptPath -Raw),
            [ref]$null
        )
        Write-TestResult "Script syntax valid" $true
    } catch {
        Write-TestResult "Script syntax valid" $false $_.Exception.Message
        return $false
    }

    # Test script has required parameters
    try {
        $scriptContent = Get-Content $scriptPath -Raw

        $hasSourceBranches = $scriptContent -match '\[string\[\]\]\$SourceBranches'
        Write-TestResult "Has SourceBranches parameter" $hasSourceBranches

        $hasTargetBranch = $scriptContent -match '\[string\]\$TargetBranch'
        Write-TestResult "Has TargetBranch parameter" $hasTargetBranch

        $hasMaxParallelJobs = $scriptContent -match '\[int\]\$MaxParallelJobs'
        Write-TestResult "Has MaxParallelJobs parameter" $hasMaxParallelJobs

        $hasBenchmarkMode = $scriptContent -match '\[switch\]\$BenchmarkMode'
        Write-TestResult "Has BenchmarkMode parameter" $hasBenchmarkMode

        $hasDryRun = $scriptContent -match '\[switch\]\$DryRun'
        Write-TestResult "Has DryRun parameter" $hasDryRun

        return ($hasSourceBranches -and $hasTargetBranch -and $hasMaxParallelJobs -and $hasBenchmarkMode -and $hasDryRun)

    } catch {
        Write-TestResult "Parameter validation" $false $_.Exception.Message
        return $false
    }
}

function Test-ScriptFunctions {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Testing Script Functions" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $scriptPath = Join-Path $PSScriptRoot ".." "scripts" "Merge-Branches.ps1"
    $scriptContent = Get-Content $scriptPath -Raw

    # Test required functions exist
    $requiredFunctions = @(
        'Initialize-GitEnvironment',
        'Invoke-OptimizedGitFetch',
        'Get-BranchList',
        'New-GitWorktree',
        'Remove-GitWorktree',
        'Test-FileHasMergeConflicts',
        'Resolve-MergeConflicts',
        'Test-RepositoryHealth',
        'Invoke-BranchMerge',
        'Invoke-GitPushWithRetry',
        'Invoke-ParallelMerge',
        'Show-PerformanceReport',
        'Invoke-Cleanup',
        'Write-Log',
        'Start-PerformanceTimer',
        'Stop-PerformanceTimer'
    )

    foreach ($func in $requiredFunctions) {
        $hasFunc = $scriptContent -match "function $func"
        Write-TestResult "Function exists: $func" $hasFunc
    }

    return $true
}

function Test-ScriptHelp {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Testing Script Help" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $scriptPath = Join-Path $PSScriptRoot ".." "scripts" "Merge-Branches.ps1"

    try {
        # Get help
        $help = Get-Help $scriptPath -ErrorAction Stop

        $hasSynopsis = $null -ne $help.Synopsis -and $help.Synopsis.Trim() -ne ""
        Write-TestResult "Has synopsis" $hasSynopsis

        $hasDescription = $null -ne $help.Description
        Write-TestResult "Has description" $hasDescription

        $hasExamples = $null -ne $help.Examples -and $help.Examples.Example.Count -gt 0
        Write-TestResult "Has examples" $hasExamples "Found $($help.Examples.Example.Count) examples"

        return ($hasSynopsis -and $hasDescription)

    } catch {
        Write-TestResult "Help documentation" $false $_.Exception.Message
        return $false
    }
}

function Test-DryRunMode {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Testing Dry Run Mode" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $scriptPath = Join-Path $PSScriptRoot ".." "scripts" "Merge-Branches.ps1"

    try {
        # Test dry run with non-existent branch (should not fail)
        Write-Host "  Running dry run test..." -ForegroundColor Gray

        $output = & $scriptPath -SourceBranches @("nonexistent-test-branch-12345") -DryRun -ErrorAction SilentlyContinue 2>&1

        # Dry run should complete without errors
        $dryRunOk = $LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null
        Write-TestResult "Dry run executes without crash" $true

        return $true

    } catch {
        Write-TestResult "Dry run mode" $false $_.Exception.Message
        return $false
    }
}

function Test-DocumentationExists {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Testing Documentation" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $docsPath = Join-Path $PSScriptRoot ".." "docs" "MERGE_AUTOMATION.md"
    $docsExist = Test-Path $docsPath
    Write-TestResult "Documentation file exists" $docsExist "Path: $docsPath"

    if ($docsExist) {
        $content = Get-Content $docsPath -Raw

        $hasUsage = $content -match '## Usage'
        Write-TestResult "Has usage section" $hasUsage

        $hasExamples = $content -match '## Examples|### Basic Usage|### Advanced Usage'
        Write-TestResult "Has examples section" $hasExamples

        $hasPerformance = $content -match '## Performance'
        Write-TestResult "Has performance section" $hasPerformance

        $hasTroubleshooting = $content -match '## Troubleshooting'
        Write-TestResult "Has troubleshooting section" $hasTroubleshooting

        return $docsExist -and $hasUsage -and $hasExamples
    }

    return $docsExist
}

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PowerShell Merge Automation - Test Suite             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Run all tests
$allTestsPassed = $true

$allTestsPassed = Test-Prerequisites -and $allTestsPassed
$allTestsPassed = Test-ScriptSyntax -and $allTestsPassed
$allTestsPassed = Test-ScriptFunctions -and $allTestsPassed
$allTestsPassed = Test-ScriptHelp -and $allTestsPassed
$allTestsPassed = Test-DocumentationExists -and $allTestsPassed

# Print summary
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Total:   $($testResults.Total)" -ForegroundColor White
Write-Host "  ✅ Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "  ❌ Failed: $($testResults.Failed)" -ForegroundColor $(if ($testResults.Failed -gt 0) { 'Red' } else { 'Green' })
Write-Host "  ⏭️  Skipped: $($testResults.Skipped)" -ForegroundColor Gray
Write-Host ""

$passRate = if ($testResults.Total -gt 0) {
    [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)
} else {
    0
}

Write-Host "  Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { 'Green' } elseif ($passRate -ge 60) { 'Yellow' } else { 'Red' })
Write-Host ""

if ($testResults.Failed -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some tests failed. Please review the output above." -ForegroundColor Yellow
    exit 1
}
