# Scripts Directory

This directory contains automation scripts for the GXQ Studio DeFi Platform.

## Available Scripts

### PowerShell Scripts

#### Merge-Branches.ps1

High-performance automated branch merge script with parallel processing.

**Key Features:**
- Parallel job execution (up to 8 branches simultaneously)
- Git worktree support for true parallel safety
- Intelligent conflict resolution with caching
- Comprehensive testing and validation
- Performance monitoring and benchmarking
- Self-healing mechanisms

**Quick Start:**
```powershell
# Merge specific branches
./scripts/Merge-Branches.ps1 -SourceBranches @("feature/auth", "feature/api")

# Auto-sweep all feature branches
./scripts/Merge-Branches.ps1 -AutoSweep -MaxParallelJobs 8

# Dry run (test without changes)
./scripts/Merge-Branches.ps1 -SourceBranches @("feature/test") -DryRun
```

**Documentation:** See [docs/MERGE_AUTOMATION.md](../docs/MERGE_AUTOMATION.md) for full documentation.

#### Test-MergeBranches.ps1

Test suite for validating the Merge-Branches.ps1 script.

**Usage:**
```powershell
./scripts/Test-MergeBranches.ps1
```

### Shell Scripts

#### merge-coverage.sh

Merges code coverage reports from backend and webapp.

**Usage:**
```bash
./scripts/merge-coverage.sh
```

#### migrate-to-railway.sh

Migration script for Railway deployment.

**Usage:**
```bash
./scripts/migrate-to-railway.sh
```

#### setup-env.sh

Sets up environment variables and configuration.

**Usage:**
```bash
./scripts/setup-env.sh
```

### TypeScript Scripts

#### pre-deploy-check.ts

Pre-deployment validation checks.

**Usage:**
```bash
npx ts-node scripts/pre-deploy-check.ts
```

#### testFarcaster.ts

Farcaster integration testing.

**Usage:**
```bash
npx ts-node scripts/testFarcaster.ts
```

#### validate-endpoints.ts

API endpoint validation.

**Usage:**
```bash
npx ts-node scripts/validate-endpoints.ts
```

## Requirements

### PowerShell Scripts
- PowerShell 7.0 or higher
- Git 2.30 or higher
- Node.js 18+ (for testing)

### Shell Scripts
- Bash 4.0 or higher
- Git
- Standard Unix utilities

### TypeScript Scripts
- Node.js 18+
- ts-node
- TypeScript 5.0+

## Installation

### PowerShell (if not installed)

**macOS:**
```bash
brew install powershell
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y powershell
```

**Windows:**
```powershell
winget install Microsoft.PowerShell
```

## Contributing

When adding new scripts:

1. Add proper documentation header
2. Include usage examples
3. Add error handling
4. Update this README
5. Add tests if applicable
6. Follow existing code style

## Script Naming Conventions

- **PowerShell**: `Verb-Noun.ps1` (e.g., `Merge-Branches.ps1`)
- **Shell**: `kebab-case.sh` (e.g., `merge-coverage.sh`)
- **TypeScript**: `camelCase.ts` (e.g., `testFarcaster.ts`)

## Security

- Never commit secrets or API keys in scripts
- Use environment variables for sensitive data
- Validate all user inputs
- Use `.gitignore` for generated files

## Support

For issues or questions:
- GitHub Issues: [SMSDAO/reimagined-jupiter/issues](https://github.com/SMSDAO/reimagined-jupiter/issues)
- Documentation: [GitHub Wiki](https://github.com/SMSDAO/reimagined-jupiter/wiki)
