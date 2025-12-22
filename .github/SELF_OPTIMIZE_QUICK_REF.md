# Self-Optimizing Workflow - Quick Reference

## 🚀 Quick Commands

```bash
# Run optimization locally
npm run optimize

# Apply auto-fixes only
npm run optimize:fix

# View local reports
ls local-optimization-reports/
```

## 📊 What It Does

| Feature | Description | Auto? |
|---------|-------------|-------|
| **ESLint Fix** | Fixes code style issues | ✅ Yes |
| **Remove Dead Code** | Finds unused exports | ⚠️ Flagged |
| **Test Coverage** | Generates test stubs | ✅ Yes |
| **Security Scan** | Finds vulnerabilities | ⚠️ Flagged |
| **Code Quality** | Checks complexity | ⚠️ Flagged |

## 🎯 Triggers

- **Automatic**: Every PR to `dev`, `develop`, `main`
- **Manual**: Actions → Self-Optimizing Workflow → Run

## 📝 PR Comments

### Summary Comment
```markdown
# 🔍 Automated Code Optimization Report

✅ Applied safe auto-fixes to 5 files
⚠️ 3 issues need manual review
📊 Coverage: 78% → 82%
🔒 Security: 1 medium issue
```

### Inline Comments
```markdown
⚠️ **no-eval**: Use of eval() is dangerous
**Severity**: Error
**Action**: Use JSON.parse() instead
```

## 🔧 Configuration

Edit `.github/self-optimize-config.yml`:

```yaml
auto_fix:
  enabled: true              # Auto-fix on/off

coverage:
  thresholds:
    lines: 80                # Min % coverage

security:
  block_on: [critical, high] # Block PR if found
```

## ✅ Safety Checklist

- [x] Only safe fixes applied automatically
- [x] All changes are reversible
- [x] No breaking changes
- [x] No logic changes
- [x] Type-safe

## 🔄 Workflow

```
1. Open PR
   ↓
2. Workflow runs (5-10 min)
   ↓
3. Auto-fixes committed (if any)
   ↓
4. Review PR comments
   ↓
5. Address flagged issues
   ↓
6. Approve & merge
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Too many comments | Adjust `max_comments_per_file` in config |
| Workflow timeout | Increase `timeout-minutes` in workflow |
| Wrong fixes | Revert commit, adjust ESLint rules |
| No changes | Nothing to fix (good!) |

## 📚 Documentation

- **Full Docs**: `.github/SELF_OPTIMIZE_WORKFLOW.md`
- **Integration**: `.github/SELF_OPTIMIZE_INTEGRATION.md`
- **Config**: `.github/self-optimize-config.yml`

## 🆘 Help

```bash
# View workflow status
gh run list --workflow=self-optimize.yml

# View specific run
gh run view <run-id>

# Download reports
gh run download <run-id>
```

## 💡 Tips

1. **Run locally first**: `npm run optimize`
2. **Review auto-fixes**: Check the commit
3. **Address comments**: Fix flagged issues
4. **Keep PRs small**: Easier to optimize
5. **Update config**: Tune to your needs

## 🎨 Severity Icons

- 🔴 **Critical** - Immediate action required
- 🟠 **High** - Should fix before merge
- 🟡 **Medium** - Fix when possible
- 🔵 **Low** - Nice to fix
- ℹ️ **Info** - FYI only

## 📈 Metrics

Track improvements:
- ✅ Auto-fixes applied
- 🧪 Test coverage increase
- 🔒 Security issues found
- ⏱️ Time saved

---

**Need Help?** Open an issue or ask in PR comments!
