# Self-Optimizing Workflow Documentation

## Overview

The Self-Optimizing Workflow is an advanced CI/CD pipeline that automatically analyzes, fixes, and improves code quality on every pull request to the `dev` branch. It applies safe, non-breaking fixes, removes dead code, generates tests, and flags risky patterns for manual review.

## Features

### 🔍 Automated Code Analysis

The workflow performs comprehensive analysis including:

- **ESLint Analysis**: Detects code quality issues, style violations, and potential bugs
- **TypeScript Type Checking**: Validates type safety across the codebase
- **Dead Code Detection**: Identifies unused exports, functions, and imports using `ts-prune`
- **Dependency Analysis**: Finds unused dependencies with `depcheck`
- **Security Scanning**: Detects hardcoded secrets, unsafe patterns, and vulnerabilities
- **CodeQL Integration**: Deep security and quality analysis from GitHub's CodeQL

### ✅ Automatic Fixes

The workflow automatically applies safe fixes:

- **ESLint Auto-Fix**: Fixes all auto-fixable ESLint issues (problems, suggestions, layout)
- **Code Formatting**: Applies consistent code style (if Prettier is configured)
- **Import Optimization**: Removes unused imports and organizes them
- **Safe Refactors**: Applies safe refactoring patterns

**Safety Guarantees:**
- Only fixes marked as "safe" by ESLint are applied
- No behavioral changes to the code
- All changes are non-breaking
- Changes are committed with clear messages

### 🗑️ Dead Code Removal

Intelligently removes unused code:

- **Unused Exports**: Detects and flags exports not used anywhere
- **Unused Imports**: Removes imports that aren't referenced
- **Safe Removal**: Only removes code that meets strict safety criteria:
  - Not in index files (which are often re-exports)
  - Not in test files
  - Not part of public API
  - Not imported by external packages
  - Unused for at least 30 days

**Manual Review**: Potential dead code is flagged in PR comments for review before removal.

### 🧪 Test Coverage Analysis & Generation

Improves test coverage:

- **Coverage Analysis**: Generates detailed coverage reports
- **Identifies Gaps**: Highlights files with < 80% coverage
- **Test Stub Generation**: Automatically creates test stubs for uncovered files
- **Test Suggestions**: Adds TODO items for comprehensive tests

**Generated Test Stubs Include:**
- Basic "should be defined" tests
- TODO items for valid inputs
- TODO items for edge cases
- TODO items for error handling

### 🔒 Security & Quality Checks

Comprehensive security analysis:

- **Secret Detection**: Flags potential hardcoded secrets (passwords, API keys, tokens)
- **Unsafe Patterns**: Detects use of `eval()`, `Function()`, `innerHTML`, etc.
- **Dependency Vulnerabilities**: Runs `npm audit` on backend and frontend
- **CodeQL Analysis**: GitHub's advanced security scanning
- **Severity Classification**: Critical, High, Medium, Low

### 💬 Inline PR Comments

Provides detailed feedback:

- **Auto-Fix Explanations**: Comments on what was fixed and why
- **Risky Code Flags**: Inline comments on security risks with suggestions
- **Test Results**: Reports test outcomes for each changed file
- **Coverage Gaps**: Highlights areas needing more tests
- **Manual Review Items**: Clear action items for developers

**Comment Features:**
- Emoji-based severity indicators (🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Low)
- Suggested actions for each issue
- Links to relevant documentation
- Rate-limited to avoid spam (max 5 per file, 50 total)

## Workflow Stages

### Stage 1: Code Analysis
```yaml
- ESLint analysis (backend & frontend)
- TypeScript unused exports (ts-prune)
- Dependency analysis (depcheck)
- Generates JSON reports for processing
```

### Stage 2: Auto-Fix
```yaml
- Apply ESLint auto-fixes
- Apply code formatting
- Fix layout and style issues
- Track number of files modified
```

### Stage 3: Dead Code Detection
```yaml
- Parse ts-prune results
- Filter safe-to-remove candidates
- Generate dead code report
- Flag for manual review
```

### Stage 4: Test Coverage
```yaml
- Run tests with coverage
- Generate coverage summary
- Identify low-coverage files (< 80%)
- Create coverage report
```

### Stage 5: Security Analysis
```yaml
- Scan for hardcoded secrets
- Check for unsafe patterns
- Run npm audit
- Generate security report
```

### Stage 6: CodeQL Analysis
```yaml
- Initialize CodeQL
- Analyze JavaScript/TypeScript
- Upload results to Security tab
- Flag high-severity issues
```

### Stage 7: Report Generation
```yaml
- Combine all analysis reports
- Add automated actions summary
- List manual review items
- Generate recommendations
```

### Stage 8: Commit Changes
```yaml
- Commit auto-fixes if any
- Push to PR branch
- Use meaningful commit message
```

### Stage 9: PR Comments
```yaml
- Create inline comments for issues
- Post comprehensive summary
- Link to detailed reports
```

### Stage 10: Test Generation
```yaml
- Generate test stubs for low-coverage files
- Add TODO items for comprehensive tests
- Commit and push test stubs
```

## Configuration

The workflow is configured via `.github/self-optimize-config.yml`:

### Key Settings

```yaml
auto_fix:
  enabled: true
  fix_types: [problem, suggestion, layout]
  safe_rules: [no-unused-vars, semi, quotes, indent, ...]

dead_code:
  enabled: true
  safe_removal:
    not_in_index: true
    not_in_tests: true
    unused_for_days: 30

coverage:
  enabled: true
  thresholds:
    lines: 80
    statements: 80
    functions: 75
    branches: 70

security:
  enabled: true
  vulnerability_thresholds:
    block_on: [critical, high]
    warn_on: [medium]
```

### Branch-Specific Settings

```yaml
branches:
  dev:
    auto_commit: true        # Auto-commit changes
    auto_merge: false        # Don't auto-merge
    generate_tests: true     # Generate test stubs
    
  main:
    auto_commit: false       # No auto-commit on main
    require_review: true     # Always require manual review
```

## Triggering the Workflow

### Automatic Triggers

The workflow runs automatically on:
- Pull requests to `dev`, `develop`, or `main` branches
- When PR is opened, synchronized (new commits), or reopened

### Manual Trigger

You can manually trigger the workflow:

```bash
# Via GitHub UI: Actions → Self-Optimizing Workflow → Run workflow

# Or via API:
gh workflow run self-optimize.yml -f pr_number=123
```

## Reading the Reports

### PR Comment Structure

```markdown
# 🔍 Automated Code Optimization Report

## Code Analysis
- ESLint issues found and fixed
- TypeScript issues

## Automated Actions Taken
✅ Applied safe auto-fixes to X files

## ⚠️ Manual Review Required
- Unfixable ESLint issues
- Unused code to remove
- Security concerns

## 📋 Recommendations
1. Review auto-fixes
2. Address ESLint issues
3. Improve test coverage
4. Remove dead code
5. Security review
```

### Inline Comments

Example inline comment on risky code:

```markdown
⚠️ **no-eval**: Use of eval() is dangerous

**Severity**: Error
**Suggested Action**: Refactor to avoid eval(), use safer alternatives

*This comment was automatically generated by the Self-Optimizing Workflow.*
```

## Artifacts

The workflow uploads the following artifacts (available for 30 days):

- `optimization-report.md`: Full optimization report
- `eslint-report.json`: Detailed ESLint findings
- `ts-prune-report.json`: Unused exports report
- `depcheck-report.json`: Unused dependencies
- `npm-audit.json`: Security vulnerabilities
- `coverage-report.md`: Test coverage details
- `security-report.md`: Security analysis
- `unused-exports.txt`: List of safe-to-remove exports

## Best Practices

### For Developers

1. **Review Auto-Fixes**: Always review the auto-fix commit before merging
2. **Address Comments**: Respond to inline comments on your PR
3. **Improve Coverage**: Add tests for files flagged as low-coverage
4. **Remove Dead Code**: Review and remove unused code when flagged
5. **Fix Security Issues**: Prioritize security concerns

### For Reviewers

1. **Check Auto-Fix Commit**: Verify automated changes are correct
2. **Review Flagged Items**: Pay attention to manually flagged issues
3. **Validate Tests**: Ensure generated test stubs are meaningful
4. **Security Review**: Don't ignore security warnings

## Safety & Guarantees

### What Changes Are Made Automatically?

✅ **Safe to Auto-Fix:**
- Code formatting (spaces, indentation, semicolons)
- Unused variable removal (when safe)
- Import organization
- Simple refactors marked as safe by ESLint

❌ **Never Auto-Fixed (Manual Review Required):**
- Logic changes
- API changes
- Breaking changes
- Complex refactors
- Security-sensitive code

### Production Safety

All automatic changes are:
- ✅ Non-breaking
- ✅ Behavior-preserving
- ✅ Type-safe
- ✅ Test-verified
- ✅ Reversible

### Rollback

If an auto-fix causes issues:

```bash
# Revert the auto-fix commit
git revert <commit-hash>

# Or reset to before the workflow
git reset --hard HEAD~1  # (not recommended if already pushed)
```

## Troubleshooting

### Workflow Failed

Check the workflow logs:
1. Go to Actions tab
2. Find the failed workflow run
3. Click on the failed job
4. Review the error message

Common issues:
- **Dependency install failed**: Check package-lock.json
- **ESLint errors**: Fix ESLint configuration
- **TypeScript errors**: Fix TypeScript compilation
- **Test failures**: Fix failing tests

### No Auto-Fixes Applied

Possible reasons:
- No auto-fixable issues found (good!)
- All issues require manual review
- Auto-fix is disabled in config

### Too Many PR Comments

If the workflow creates too many comments:
1. Adjust `max_comments_per_file` in config
2. Fix the most critical issues first
3. Re-run the workflow

### Changes Not Committed

Possible reasons:
- No changes detected
- Git push failed (check permissions)
- Auto-commit disabled for branch

## Performance

### Typical Run Times

- Small PR (< 10 files): 5-10 minutes
- Medium PR (10-50 files): 10-20 minutes
- Large PR (> 50 files): 20-30 minutes

### Resource Usage

- **Compute**: 1 GitHub Actions runner
- **Storage**: ~100MB artifacts per run (30 day retention)
- **API Calls**: ~50-100 GitHub API calls per run

### Optimization Tips

To speed up the workflow:
1. Fix ESLint issues locally before pushing
2. Run `npm test` locally
3. Keep PRs small and focused
4. Use caching effectively

## Integration with Existing Workflows

### Runs Alongside CI

The self-optimizing workflow complements the existing CI workflow:

- **CI Workflow** (`ci.yml`): Tests, builds, type checks
- **Self-Optimize** (`self-optimize.yml`): Analysis, fixes, optimization
- **Auto-Merge** (`auto-merge.yml`): Merges when all checks pass
- **CodeQL** (`codeql-analysis.yml`): Security scanning

### Order of Operations

1. CI workflow runs (tests, build)
2. Self-optimize runs (analysis, fixes)
3. Auto-fix commit is pushed
4. CI re-runs on new commit
5. Auto-merge runs when all pass

## Future Enhancements

Planned improvements:

- [ ] AI-powered code suggestions
- [ ] Automatic refactoring of complex code
- [ ] Performance optimization suggestions
- [ ] Dependency upgrade automation
- [ ] Visual regression testing
- [ ] Architecture pattern enforcement
- [ ] Documentation generation
- [ ] Changelog automation

## Support

### Getting Help

- **GitHub Issues**: Report bugs or request features
- **PR Comments**: Ask questions in your PR
- **Documentation**: Check this doc and config comments

### Contributing

To improve the workflow:
1. Fork the repository
2. Modify `.github/workflows/self-optimize.yml`
3. Test on a feature branch
4. Submit a PR with improvements

## License

This workflow is part of the GXQ Studio Solana DeFi Platform.
See the main repository LICENSE for details.

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-22  
**Maintainer**: GXQ Studio DevOps Team
