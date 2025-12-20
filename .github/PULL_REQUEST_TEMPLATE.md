---
name: Pull Request
about: Create a pull request to contribute to the project
title: ''
labels: ''
assignees: ''
---

## 📝 Description

<!-- Provide a clear and concise description of what this PR does -->

## 🔗 Related Issues

<!-- Link to related issues using "Fixes #123" or "Relates to #456" -->

Fixes #
Relates to #

## 🎯 Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/refactoring (no functional changes)
- [ ] 🧪 Test updates
- [ ] 🔧 Build/CI configuration changes

## 🧪 Testing

<!-- Describe the tests you ran and how to reproduce them -->

### Tests Performed

- [ ] Unit tests pass (`npm test`)
- [ ] Test coverage ≥ 90% (`npm run test:coverage`)
- [ ] Integration tests pass (if applicable)
- [ ] Manual testing performed

### Test Coverage

```bash
# Paste test coverage summary here
```

### Manual Testing Steps

1. 
2. 
3. 

## ✅ Checklist

<!-- Mark completed items with an "x" -->

### Code Quality
- [ ] Code follows the project's code style guidelines
- [ ] Linting passes with no warnings (`npm run lint`)
- [ ] TypeScript validation passes (`npx tsc --noEmit`)
- [ ] No console.log statements (use proper logging)
- [ ] All variables are properly typed (no `any` unless absolutely necessary)

### Testing
- [ ] Added tests for new features or bug fixes
- [ ] All tests pass locally (`npm test`)
- [ ] Test coverage meets or exceeds 90% threshold
- [ ] Edge cases and error paths are tested

### Documentation
- [ ] Updated README.md if needed
- [ ] Added/updated code comments for complex logic
- [ ] Updated API documentation if endpoints changed
- [ ] Updated CONTRIBUTING.md if workflow changed

### Security
- [ ] No sensitive data (API keys, private keys) in code
- [ ] Environment variables used for configuration
- [ ] Input validation added for new endpoints
- [ ] Security scan passes (`npm audit`)

### Deployment
- [ ] Changes are backward compatible
- [ ] Environment variables documented in `.env.example`
- [ ] Database migrations included (if applicable)
- [ ] Tested in preview deployment

## 📸 Screenshots

<!-- If applicable, add screenshots to help explain your changes -->

## 🔍 Additional Context

<!-- Add any other context about the PR here -->

## 🏷️ Labels

<!-- You can request specific labels by mentioning them -->

Suggested labels:
- Add `auto-merge` if this should be auto-merged when all checks pass
- Add `skip-deployment` if deployment previews are not needed
- Add `breaking-change` if this includes breaking changes
- Add `high-priority` if this is urgent

---

## 📋 CI/CD Status

<!-- This section will be automatically updated by CI/CD workflows -->

**Status**: Waiting for CI checks...

### Required Checks
- [ ] Backend tests (Node 18, 20, 22)
- [ ] Webapp builds (Node 18, 20, 22)
- [ ] Security scan
- [ ] Coverage ≥ 90%
- [ ] Preview deployments (Vercel + Railway)

**Note**: All checks must pass before this PR can be merged. See [CI/CD Troubleshooting](../CI_CD_TROUBLESHOOTING.md) if you encounter issues.
