# Contributing to GXQ STUDIO - reimagined-jupiter

Thank you for your interest in contributing! This guide will help you understand our development workflow, CI/CD pipeline, and contribution requirements.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Pull Request Process](#pull-request-process)
- [Code Quality Standards](#code-quality-standards)
- [Testing Requirements](#testing-requirements)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: Version 18 or higher (18, 20, 22 LTS recommended)
- **npm**: Latest version
- **Git**: Latest version

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SMSDAO/reimagined-jupiter.git
   cd reimagined-jupiter
   ```

2. **Install backend dependencies**:
   ```bash
   npm install
   ```

3. **Install webapp dependencies**:
   ```bash
   cd webapp
   npm install
   cd ..
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

## 🔄 CI/CD Pipeline

Our CI/CD pipeline ensures code quality, security, and reliable deployments.

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Pull Request Created                     │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                    ┌────▼────┐
    │ Backend │                    │ Webapp  │
    │  Tests  │                    │  Build  │
    └────┬────┘                    └────┬────┘
         │                               │
         │    ┌─────────────┐           │
         └────►   Security  ◄───────────┘
              │    Scan     │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Preview   │
              │ Deployments │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ Auto-Merge  │
              │  (if ready) │
              └─────────────┘
```

### CI Jobs

#### 1. Backend Lint & Test (Matrix)
- **Node.js versions**: 18, 20, 22
- **Steps**:
  - ESLint with `--max-warnings=0` (strict mode)
  - TypeScript validation (`tsc --noEmit`)
  - Unit tests with Jest
  - Coverage collection (Node 20 only)
  - Coverage threshold check (≥90%)

#### 2. Webapp Lint & Build (Matrix)
- **Node.js versions**: 18, 20, 22
- **Steps**:
  - ESLint with `--max-warnings=0`
  - TypeScript validation
  - Environment variable validation
  - Next.js production build

#### 3. Security Scan
- npm audit for backend and webapp
- Audit reports uploaded as artifacts
- Runs on Node.js 20

#### 4. Preview Deployments
- **Vercel**: Webapp preview deployment
- **Railway**: Backend API preview deployment
- Automatic PR comments with preview URLs
- Environment validation before deploy

#### 5. CI Summary & Notifications
- Comprehensive PR status comment
- Pass/fail summary with checklist
- Slack/Discord notifications (if configured)
- Artifacts uploaded for review

## 🔀 Pull Request Process

### Before Creating a PR

1. **Ensure all tests pass locally**:
   ```bash
   npm test
   ```

2. **Check code coverage**:
   ```bash
   npm run test:coverage
   ```
   Ensure coverage is ≥90% for new code.

3. **Lint your code**:
   ```bash
   npm run lint
   ```
   Fix all warnings and errors.

4. **Build the project**:
   ```bash
   npm run build
   cd webapp && npm run build
   ```

5. **Validate TypeScript**:
   ```bash
   npx tsc --noEmit
   cd webapp && npx tsc --noEmit
   ```

### Creating a PR

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format.

3. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Fill out the PR template** with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

### PR Requirements for Merge

✅ **All checks must pass**:
- Backend tests (Node 18, 20, 22)
- Webapp builds (Node 18, 20, 22)
- Security scan completed
- Linting with no warnings
- TypeScript validation
- Coverage ≥90%
- Preview deployments (unless `skip-deployment` label)

✅ **Code review**:
- At least 1 approval (except Dependabot PRs)
- No changes requested

✅ **PR state**:
- Not in draft mode
- No merge conflicts

### Auto-Merge

PRs with the `auto-merge` label will be automatically merged when all requirements are met.

To enable auto-merge:
```bash
# Add label via GitHub UI or CLI
gh pr edit <PR_NUMBER> --add-label "auto-merge"
```

To skip deployment previews:
```bash
gh pr edit <PR_NUMBER> --add-label "skip-deployment"
```

## ✅ Code Quality Standards

### Linting

We use ESLint with strict configurations:

- **Backend**: `.eslintrc.json`
- **Webapp**: `eslint.config.mjs`

Run linting:
```bash
# Backend
npm run lint

# Webapp
cd webapp && npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

**Note**: CI enforces zero warnings (`--max-warnings=0`).

### TypeScript

All code must be strictly typed:

```bash
# Validate types
npx tsc --noEmit

# Webapp
cd webapp && npx tsc --noEmit
```

- Use explicit types
- Avoid `any` (triggers warnings)
- Use proper type imports

### Code Style

- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Line length**: 100 characters max
- **Functions**: Use async/await for async operations
- **Naming**: camelCase for variables, PascalCase for types/classes

## 🧪 Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Watch mode
npm test -- --watch
```

### Coverage Requirements

- **Minimum threshold**: 90% for all metrics
  - Lines: 90%
  - Branches: 90%
  - Functions: 90%
  - Statements: 90%

### Writing Tests

```typescript
// Example test structure
import { describe, test, expect } from '@jest/globals';

describe('FeatureName', () => {
  test('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = processInput(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

Place tests in:
- `src/__tests__/` for unit tests
- `src/**/*.test.ts` for co-located tests

## 🚀 Deployment

### Preview Deployments (Automatic)

Every PR automatically triggers:
- **Vercel Preview**: Webapp deployment
- **Railway Preview**: Backend API deployment

Preview URLs are posted as PR comments.

### Production Deployments

Production deploys automatically on merge to `main`:

- **Vercel**: Webapp production deployment
- **Railway**: Backend API production deployment

Both include:
- Health checks
- Rollback on failure
- Deployment status updates

### Manual Deployment

#### Vercel (Webapp)
```bash
cd webapp
vercel --prod
```

#### Railway (Backend)
```bash
railway up
```

## 🔧 Troubleshooting

### CI Failures

#### ESLint Warnings/Errors

```bash
# View specific issues
npm run lint

# Auto-fix
npm run lint -- --fix
```

Common issues:
- Unused variables (prefix with `_`)
- Missing types (add explicit types)
- Console.log statements (use proper logging)

#### TypeScript Errors

```bash
# Check errors
npx tsc --noEmit
```

Common issues:
- Missing type imports
- Implicit `any` types
- Missing null checks

#### Test Failures

```bash
# Run specific test
npm test -- --testNamePattern="test name"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

Common issues:
- Environment variables not set in tests
- Mocked dependencies not configured
- Async timing issues (increase timeouts)

#### Coverage Below Threshold

```bash
# View coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

Solutions:
- Add tests for uncovered lines
- Test error paths and edge cases
- Mock external dependencies

#### Build Failures

```bash
# Backend
npm run build

# Webapp
cd webapp && npm run build
```

Common issues:
- TypeScript compilation errors
- Missing dependencies
- Environment variables required at build time

### Deployment Issues

#### Preview Not Generated

1. Check if `skip-deployment` label is applied
2. Verify secrets are configured:
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`
3. Check workflow logs for errors

#### Health Check Failures

- Ensure API endpoints are responding
- Verify environment variables in deployment
- Check database connectivity
- Review application logs

### Local Development Issues

#### Dependencies Installation Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Port Already in Use

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🆘 Getting Help

- **Issues**: [GitHub Issues](https://github.com/SMSDAO/reimagined-jupiter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SMSDAO/reimagined-jupiter/discussions)
- **Security**: Report vulnerabilities to security@gxqstudio.io

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to GXQ STUDIO!** 🚀
