---
name: CI/CD Pipeline Issue
about: Report a problem with GitHub Actions workflows, builds, tests, or deployments
title: '[CI/CD] '
labels: 'ci-cd, bug'
assignees: ''
---

## 🚨 CI/CD Issue Description

<!-- Provide a clear and concise description of the CI/CD issue -->

## 🔍 Workflow Information

**Workflow**: <!-- e.g., CI - Continuous Integration, Preview Deployments, etc. -->
**Job**: <!-- e.g., Backend - Lint & Test, Vercel Preview Deployment, etc. -->
**Node.js Version**: <!-- e.g., 18, 20, 22 -->

**Workflow Run Link**: <!-- Paste the link to the failed workflow run -->
https://github.com/SMSDAO/reimagined-jupiter/actions/runs/...

## 📋 Issue Type

<!-- Mark the relevant option with an "x" -->

- [ ] 🧪 Test failure
- [ ] 🏗️ Build failure
- [ ] 🎨 Linting issue
- [ ] 📘 TypeScript validation error
- [ ] 📊 Coverage threshold not met
- [ ] 🔒 Security scan issue
- [ ] 🚀 Deployment preview failure
- [ ] 🤖 Auto-merge not working
- [ ] 🔔 Notification not sent
- [ ] ⚙️ Other workflow issue

## 📝 Error Message

<!-- Paste the relevant error message or logs -->

```
Paste error message here
```

## 🔄 Steps to Reproduce

1. 
2. 
3. 

## ✅ Expected Behavior

<!-- Describe what you expected to happen -->

## ❌ Actual Behavior

<!-- Describe what actually happened -->

## 💻 Local Environment

<!-- Fill in the following information -->

- **Node.js Version**: <!-- Run `node --version` -->
- **npm Version**: <!-- Run `npm --version` -->
- **Operating System**: <!-- e.g., macOS 13.0, Ubuntu 22.04, Windows 11 -->

## 🧪 Local Test Results

<!-- What happens when you run the same command locally? -->

```bash
# Commands run
npm test
npm run lint
npm run build

# Results
```

## 🔍 Additional Context

<!-- Add any other context about the problem here -->

## 🛠️ Attempted Fixes

<!-- What have you tried to fix this issue? -->

- [ ] Cleared cache and reinstalled dependencies
- [ ] Ran the same command locally
- [ ] Checked [CI/CD Troubleshooting Guide](../../CI_CD_TROUBLESHOOTING.md)
- [ ] Reviewed [Contributing Guide](../../CONTRIBUTING.md)
- [ ] Searched for similar issues

## 📸 Screenshots

<!-- If applicable, add screenshots to help explain the issue -->

## 🏷️ Labels

<!-- Suggested labels (maintainers will add them) -->

- `ci-cd` (already added)
- `bug` (already added)
- `high-priority` (if blocking)
- `help-wanted` (if you need assistance)

---

**Note**: Please check the [CI/CD Troubleshooting Guide](../../CI_CD_TROUBLESHOOTING.md) before creating an issue. Many common problems have documented solutions.
