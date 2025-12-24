# Autonomous Oracle - CI/CD Code Analysis & Evolution System

## Overview

The **Autonomous Oracle** (`scripts/autonomous-oracle.ts`) is the "brain" of the repository's continuous evolution strategy. It performs comprehensive, automated analysis of the codebase during CI/CD pipeline execution to ensure code quality, security, and performance optimization.

## Key Features

### 🏗️ Architecture Re-Analysis
- **Circular Dependency Detection**: Identifies import cycles that create tight coupling
- **Redundant Service Initialization**: Finds multiple instantiations of the same service
- **God Class Detection**: Flags oversized classes/files (>1000 lines or >30 methods)
- **Import Complexity Analysis**: Detects files with excessive dependencies (>20 imports)

### 🔒 Security Re-Scoring
- **Private Key Exposure Detection**: Scans for hardcoded keys or leaked secrets in logs
- **RBAC Validation**: Ensures sensitive operations are protected by role-based access control
- **Encryption Service Usage**: Validates that sensitive data uses encryption service
- **Solana-Specific Security**: 
  - Missing signer validation checks
  - Unvalidated account data access
  - SQL injection and eval() vulnerabilities

### ⚡ Math & Gas Optimization
- **Safe Math Analysis**: Detects unsafe arithmetic operations on financial values
- **BN.js Usage**: Ensures BigNumber library is used for all financial calculations
- **Compute Unit Optimization**: Validates compute budget instructions (max 1.4M CU)
- **Priority Fee Compliance**: Enforces maximum priority fee of 10M lamports
- **Dynamic Fee Detection**: Identifies hardcoded fees that should be dynamic
- **Code Efficiency**: Finds inefficient loops and unnecessary cloning patterns

### ⚙️ Solana Mainnet Compatibility
- **Versioned Transaction Detection**: Suggests migration from legacy Transaction format
- **Address Lookup Tables**: Identifies opportunities to use ALTs for transaction size reduction
- **Transaction Simulation**: Ensures transactions are simulated before sending
- **Confirmation Strategy**: Validates proper transaction confirmation patterns

### 🧬 Autonomous Evolution
- **Technical Debt Tracking**: Identifies TODO/FIXME/HACK comments
- **Empty Catch Block Detection**: Finds error swallowing patterns
- **Console.log Cleanup**: Suggests migration to structured logging (winston)
- **Commented Code Removal**: Detects excessive commented-out code
- **Modern Pattern Suggestions**: Recommends async/await over promise chains

### 🎫 Auto-Ticketing
- **GitHub Issue Creation**: Automatically creates issues for critical/high severity findings
- **Smart Labeling**: Tags issues with `oracle-detected`, severity, and category labels
- **Detailed Reports**: Provides actionable recommendations and suggested fixes

## CI/CD Integration

### Workflow Configuration

The oracle is integrated into the CI/CD pipeline via `.github/workflows/autonomous-oracle-pipeline.yml`:

```yaml
- name: Run GXQ Autonomous Oracle
  id: oracle
  env:
    ADMIN_TOKEN: ${{ secrets.GXQ_ADMIN_TOKEN }}
    ADMIN_API_URL: ${{ secrets.GXQ_ADMIN_API_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npx ts-node scripts/autonomous-oracle.ts
```

### Execution Flow

1. **File Loading**: Scans `src/`, `api/`, `webapp/` directories for TypeScript/JavaScript files
2. **Multi-Dimensional Analysis**: Runs architecture, security, math, Solana, and evolution checks
3. **Score Calculation**: Generates overall health score (0-100)
4. **Auto-Fix Application**: Applies safe, automatic fixes when appropriate
5. **Report Generation**: Creates detailed JSON report and console summary
6. **GitHub Issue Creation**: Auto-tickets critical/high severity issues
7. **Deployment Gate**: Sets exit code to block deployment if critical issues found

## Health Score Algorithm

```typescript
score = 100
score -= critical_issues × 20  // -20 points each
score -= high_issues × 10       // -10 points each
score -= medium_issues × 5      // -5 points each
score -= low_issues × 2         // -2 points each
score = max(0, score)
```

### Deployment Safety

- **Safe to Deploy**: Score ≥ 50, no critical issues, ≤ 2 high issues
- **Blocked Deployment**: Any critical issues or > 2 high issues

## Usage

### Manual Execution

```bash
# Run the oracle locally
npx ts-node scripts/autonomous-oracle.ts

# With GitHub token for auto-ticketing
GITHUB_TOKEN=your_token npx ts-node scripts/autonomous-oracle.ts
```

### Output

The oracle generates:

1. **Console Report**: Summary with score, issue counts, and recommendations
2. **oracle-report.json**: Detailed findings with file paths, line numbers, and fixes
3. **GitHub Issues**: Automatic tickets for critical/high severity findings (if GITHUB_TOKEN provided)

### Example Output

```
🧠 GXQ Autonomous Oracle Starting...

📂 Loading project files...
   Loaded 187 files

🏗️  Analyzing Architecture...
   Found 2 architecture issues

🔒 Analyzing Security...
   Found 1 security issues

⚡ Analyzing Math & Gas Optimization...
   Found 3 optimization opportunities

⚙️  Analyzing Solana Mainnet Compatibility...
   Found 2 Solana compatibility issues

🧬 Analyzing Evolution Opportunities...
   Found 5 evolution opportunities

================================================================================
📊 AUTONOMOUS ORACLE REPORT
================================================================================
Overall Health Score: 82/100

✅ Good. Some improvements recommended but overall solid.

⚠️  1 HIGH severity issue(s) found - should be addressed soon.

✅ Safe to deploy - no blocking issues detected.

🔧 Applied 2 automatic fix(es).

--------------------------------------------------------------------------------
ISSUE BREAKDOWN BY CATEGORY:
--------------------------------------------------------------------------------
ARCHITECTURE: 2 issue(s)
SECURITY: 1 issue(s)
OPTIMIZATION: 3 issue(s)
SOLANA: 2 issue(s)
EVOLUTION: 5 issue(s)

--------------------------------------------------------------------------------
ISSUE BREAKDOWN BY SEVERITY:
--------------------------------------------------------------------------------
CRITICAL: 0
HIGH: 1
MEDIUM: 5
LOW: 7
INFO: 0

================================================================================

📝 Detailed report saved to: oracle-report.json

✅ Oracle analysis complete!
```

## Configuration

### Scan Directories

```typescript
scanDirs: ['src', 'api', 'webapp/app', 'webapp/lib', 'webapp/components']
excludeDirs: ['node_modules', 'dist', '.next', '.vercel', '__tests__']
```

### Thresholds

- **Max Compute Units**: 1,400,000 CU
- **Max Priority Fee**: 10,000,000 lamports (10M)
- **God Class Line Threshold**: 1,000 lines
- **God Class Method Threshold**: 30 methods
- **Import Complexity Threshold**: 20 imports

### Security Patterns

The oracle checks for:
- Private key exposure in logs
- Missing RBAC checks on sensitive operations
- Unencrypted sensitive data
- Solana transaction security issues
- SQL injection vulnerabilities
- Unsafe eval() usage

## Auto-Fix Capabilities

The oracle can automatically fix:

1. **Excessive Compute Unit Limits**: Reduces to recommended maximum (1.4M CU)
2. **Priority Fee Violations**: Caps at 10M lamports maximum
3. Other safe, non-breaking optimizations

Auto-fixes are only applied when the overall health score allows safe deployment.

## Issue Categories

### Architecture
- Circular dependencies
- Redundant initializations
- God classes/files
- Complex imports

### Security
- Private key exposure
- Missing RBAC checks
- Missing encryption
- Solana-specific vulnerabilities
- SQL injection
- Unsafe eval()

### Optimization
- Unsafe math operations
- Floating point in financial calculations
- Excessive compute units
- Static priority fees
- Inefficient loops
- Unnecessary cloning

### Solana
- Legacy transaction format
- Missing address lookup tables
- Missing transaction simulation
- Missing confirmation checks

### Evolution
- Technical debt markers (TODO/FIXME)
- Empty catch blocks
- Excessive console.log
- Commented code
- Promise chains (suggest async/await)
- Let vs const usage

## Best Practices

### For Developers

1. **Run Locally First**: Test the oracle on your branch before pushing
2. **Address High/Critical Issues**: Don't merge PRs with critical issues
3. **Review Auto-Fixes**: Check that automatic fixes are appropriate
4. **Use Structured Logging**: Replace console.log with winston
5. **Follow Security Guidelines**: Always validate, encrypt, and check permissions

### For CI/CD

1. **Required Check**: Make oracle analysis a required status check
2. **Block on Critical**: Configure branch protection to block merges with critical issues
3. **Review Reports**: Check `oracle-report.json` in CI artifacts
4. **Monitor Trends**: Track health scores over time

## Troubleshooting

### Oracle Fails to Run

```bash
# Check Node.js version (requires 20+)
node --version

# Install dependencies
npm ci

# Run with verbose logging
DEBUG=* npx ts-node scripts/autonomous-oracle.ts
```

### False Positives

The oracle may occasionally report false positives. When this occurs:

1. Review the specific finding in `oracle-report.json`
2. If it's a false positive, add a comment explaining why (oracle will learn patterns)
3. Critical false positives can be ignored but should be documented

### Auto-Ticketing Issues

If GitHub issue creation fails:

- Ensure `GITHUB_TOKEN` has `issues:write` permission
- Check repository settings allow issue creation
- Verify the token hasn't expired

## Metrics & KPIs

Track these metrics over time:

- **Overall Health Score**: Target ≥ 85
- **Critical Issues**: Target = 0
- **High Issues**: Target ≤ 2
- **Auto-Fixes Applied**: Monitor trends
- **Time to Resolution**: Track issue closure time

## Future Enhancements

Planned improvements:

- [ ] Machine learning for pattern recognition
- [ ] Custom rule configuration via `.oracle.config.js`
- [ ] Integration with code review tools
- [ ] Automated PR comments with findings
- [ ] Historical trend analysis and dashboards
- [ ] Performance regression detection
- [ ] Dependency vulnerability scanning
- [ ] Code duplication detection
- [ ] Test coverage analysis
- [ ] Documentation completeness checks

## Contributing

To add new analysis patterns:

1. Add pattern to `CONFIG` object in `autonomous-oracle.ts`
2. Create analysis method in appropriate section
3. Add test cases
4. Update this documentation
5. Submit PR with examples

## Support

For issues or questions:

- Create a GitHub issue with label `oracle`
- Contact the GXQ STUDIO team
- Check existing oracle-detected issues for similar problems

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintained by**: GXQ STUDIO
