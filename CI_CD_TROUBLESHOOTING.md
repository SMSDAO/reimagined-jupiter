# CI/CD Troubleshooting Guide

This guide helps you diagnose and fix common CI/CD pipeline issues in the reimagined-jupiter project.

## 📋 Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Backend Test Failures](#backend-test-failures)
- [Webapp Build Failures](#webapp-build-failures)
- [Linting Errors](#linting-errors)
- [TypeScript Validation Errors](#typescript-validation-errors)
- [Coverage Issues](#coverage-issues)
- [Security Scan Issues](#security-scan-issues)
- [Deployment Preview Failures](#deployment-preview-failures)
- [Auto-Merge Not Triggering](#auto-merge-not-triggering)

## 🚦 Quick Diagnosis

### Step 1: Check the CI Summary

Look for the CI status comment on your PR. It shows which jobs passed/failed:

```
🤖 CI/CD Pipeline Status

| Job | Status | Result |
|-----|--------|--------|
| Backend (Lint, Test, Build) | ✅ | Passed |
| Webapp (Lint, Build) | ❌ | Failed |
| Security Scan | ✅ | Passed |
```

### Step 2: View Workflow Logs

Click "View Workflow Run" link in the CI comment to see detailed logs.

### Step 3: Reproduce Locally

Run the failing step locally to debug:

```bash
# Backend tests
npm test

# Webapp build
cd webapp && npm run build

# Linting
npm run lint

# TypeScript validation
npx tsc --noEmit
```

## 🔧 Backend Test Failures

### Symptom

```
Backend - Lint & Test (Node 20) ❌ Failed
```

### Diagnosis

1. **Check test logs**:
   - Navigate to failed job in GitHub Actions
   - Look for the specific test that failed
   - Review error messages and stack traces

2. **Common causes**:
   - Environment variables missing in test environment
   - Mocked dependencies not configured correctly
   - Timing issues in async tests
   - Solana RPC connection issues

### Solutions

#### Missing Environment Variables

```typescript
// In test file, set up environment
beforeAll(() => {
  process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
  process.env.NODE_ENV = 'test';
});
```

#### Mock External Dependencies

```typescript
// Mock Solana web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn(),
}));
```

#### Increase Test Timeouts

```typescript
// In jest.config.js
export default {
  testTimeout: 30000, // 30 seconds
};

// Or per test
test('slow test', async () => {
  // ...
}, 30000);
```

#### Fix Async Issues

```typescript
// Use async/await properly
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Ensure all promises are awaited
await Promise.all([promise1, promise2]);
```

### Local Verification

```bash
# Run tests
npm test

# Run specific test file
npm test -- src/__tests__/specific.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for debugging
npm test -- --watch
```

## 🌐 Webapp Build Failures

### Symptom

```
Webapp - Lint & Build (Node 20) ❌ Failed
```

### Diagnosis

1. **Check build logs** for:
   - TypeScript compilation errors
   - Module resolution issues
   - Environment variable problems
   - Next.js build errors

### Solutions

#### Missing Dependencies

```bash
cd webapp
npm install
```

#### Environment Variable Issues

```typescript
// In next.config.js or component
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
```

Ensure environment variables are prefixed with `NEXT_PUBLIC_` for client-side access.

#### Module Resolution

```json
// In webapp/tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### Next.js Build Cache Issues

```bash
cd webapp
rm -rf .next node_modules
npm install
npm run build
```

### Local Verification

```bash
cd webapp

# Build
npm run build

# Development mode
npm run dev

# Production mode
npm start
```

## 🎨 Linting Errors

### Symptom

```
Run ESLint (strict) ❌ Failed
✖ 5 problems (3 errors, 2 warnings)
```

### Diagnosis

```bash
# Check all linting issues
npm run lint

# Webapp linting
cd webapp && npm run lint
```

### Common Issues

#### 1. Unused Variables

**Error**:
```
'variable' is defined but never used
```

**Solution**:
```typescript
// Prefix with underscore if intentionally unused
function handler(_unusedParam: string, data: Data) {
  return data;
}
```

#### 2. Console Statements

**Error**:
```
Unexpected console statement
```

**Solution**:
```typescript
// Use proper logging
import logger from './logger';
logger.info('Message');

// Or disable for specific lines
// eslint-disable-next-line no-console
console.log('Debug info');
```

#### 3. Missing Types

**Error**:
```
Missing return type on function
```

**Solution**:
```typescript
// Add explicit return type
function calculate(): number {
  return 42;
}

// For async functions
async function fetchData(): Promise<Data> {
  return await getData();
}
```

#### 4. Import Order

**Error**:
```
Import should be before other statements
```

**Solution**:
```typescript
// Group imports: external, then internal
import { Connection } from '@solana/web3.js';
import axios from 'axios';

import { config } from './config';
import { utils } from './utils';
```

### Auto-Fix

```bash
# Backend
npm run lint -- --fix

# Webapp
cd webapp && npm run lint -- --fix
```

**Note**: CI uses `--max-warnings=0`, so all warnings must be fixed.

## 📘 TypeScript Validation Errors

### Symptom

```
TypeScript Build Validation ❌ Failed
src/file.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'
```

### Diagnosis

```bash
# Check all TypeScript errors
npx tsc --noEmit

# Webapp
cd webapp && npx tsc --noEmit
```

### Common Issues

#### 1. Implicit `any` Type

**Error**:
```
Parameter 'param' implicitly has an 'any' type
```

**Solution**:
```typescript
// Add explicit type
function process(param: string): void {
  console.log(param);
}
```

#### 2. Missing Null Checks

**Error**:
```
Object is possibly 'undefined'
```

**Solution**:
```typescript
// Use optional chaining and nullish coalescing
const value = data?.property ?? 'default';

// Or explicit check
if (data && data.property) {
  console.log(data.property);
}
```

#### 3. Type Mismatch

**Error**:
```
Type 'X' is not assignable to type 'Y'
```

**Solution**:
```typescript
// Use type assertion (if safe)
const value = unknownValue as KnownType;

// Or type guard
if (typeof value === 'string') {
  // TypeScript knows value is string here
}
```

#### 4. Module Resolution

**Error**:
```
Cannot find module './module' or its corresponding type declarations
```

**Solution**:
```typescript
// Use correct file extension
import { utils } from './utils.js'; // For ES modules

// Or check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node"
  }
}
```

### Local Verification

```bash
# Validate types
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

## 📊 Coverage Issues

### Symptom

```
Check coverage threshold ❌ Failed
Coverage 85% is below 90% threshold
```

### Diagnosis

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Solutions

#### 1. Add Missing Tests

Identify uncovered lines in the HTML report and add tests:

```typescript
describe('UncoveredFunction', () => {
  test('should handle success case', () => {
    const result = uncoveredFunction('input');
    expect(result).toBe('output');
  });
  
  test('should handle error case', () => {
    expect(() => uncoveredFunction('')).toThrow();
  });
});
```

#### 2. Test Edge Cases

```typescript
test('edge cases', () => {
  // Test null/undefined
  expect(func(null)).toBe(null);
  
  // Test empty arrays
  expect(func([])).toEqual([]);
  
  // Test boundary values
  expect(func(0)).toBe(0);
  expect(func(-1)).toBe(-1);
});
```

#### 3. Mock External Dependencies

```typescript
// Mock Solana connection
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn().mockResolvedValue(1000000),
  })),
}));
```

#### 4. Exclude Files from Coverage

If certain files don't need coverage (e.g., types, configs):

```javascript
// In jest.config.js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/__tests__/**',
  '!src/types.ts',
  '!src/config/**',
],
```

### Adjust Threshold (if necessary)

**Note**: Only lower threshold if absolutely necessary and with justification.

```javascript
// In jest.config.js
coverageThreshold: {
  global: {
    branches: 85, // Temporarily lowered
    functions: 90,
    lines: 90,
    statements: 90,
  },
},
```

## 🔒 Security Scan Issues

### Symptom

```
Security Scan ⚠️ Warning
Security vulnerabilities found in dependencies
```

### Diagnosis

```bash
# Check vulnerabilities
npm audit

# Detailed report
npm audit --json > audit.json
```

### Solutions

#### 1. Update Dependencies

```bash
# Update specific package
npm update package-name

# Update all (careful!)
npm update
```

#### 2. Fix Vulnerabilities Automatically

```bash
# Fix without breaking changes
npm audit fix

# Fix including breaking changes (review carefully)
npm audit fix --force
```

#### 3. Review Vulnerabilities

Check if vulnerabilities affect your code:
- Review package usage in your code
- Check if vulnerable functions are called
- Evaluate severity (high/critical vs low)

#### 4. Override Dependency

If a sub-dependency has issues:

```json
// In package.json
{
  "overrides": {
    "vulnerable-package": "^safe-version"
  }
}
```

#### 5. Ignore False Positives

**Use with caution** and document why:

```bash
# Create .npmrc
echo "audit-level=high" >> .npmrc
```

### Best Practices

- Regularly update dependencies
- Use `npm ci` in CI for reproducible builds
- Monitor security advisories
- Test thoroughly after updates

## 🚀 Deployment Preview Failures

### Symptom

```
Vercel Preview Deployment ❌ Failed
Railway Preview Deployment ❌ Failed
```

### Diagnosis

#### Vercel Issues

1. **Check secrets**:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

2. **Check build logs** in GitHub Actions

3. **Verify Vercel project configuration**:
   - Root Directory: `webapp`
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

#### Railway Issues

1. **Check secrets**:
   - `RAILWAY_TOKEN`
   - `RAILWAY_PROJECT_ID`

2. **Verify Railway service configuration**:
   - Start Command: `npm start`
   - Build Command: `npm run build`

### Solutions

#### Missing Secrets

Add secrets in GitHub repository settings:
1. Go to Settings → Secrets and variables → Actions
2. Add required secrets
3. Re-run workflow

#### Environment Variable Issues

Ensure required environment variables are set:

```yaml
# In workflow file
env:
  NEXT_PUBLIC_RPC_URL: ${{ secrets.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com' }}
```

#### Build Configuration

Vercel:
```json
// vercel.json
{
  "buildCommand": "cd webapp && npm install && npm run build",
  "devCommand": "cd webapp && npm run dev",
  "installCommand": "cd webapp && npm install",
  "framework": "nextjs",
  "outputDirectory": "webapp/.next"
}
```

Railway:
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### Skip Deployment

If deployment is not needed for your PR:

```bash
# Add skip-deployment label
gh pr edit PR_NUMBER --add-label "skip-deployment"
```

### Health Check Failures

If deployment succeeds but health check fails:

1. **Check health endpoint**:
   ```typescript
   // Ensure /api/health exists and responds
   export default function handler(req, res) {
     res.status(200).json({ status: 'ok' });
   }
   ```

2. **Wait longer for startup**:
   ```yaml
   - name: Wait for deployment
     run: sleep 30
   ```

3. **Check application logs** in Vercel/Railway dashboard

## 🤖 Auto-Merge Not Triggering

### Symptom

PR has all checks passed but doesn't auto-merge.

### Diagnosis

1. **Check label**: PR must have `auto-merge` label
2. **Check draft status**: PR must not be in draft
3. **Check reviews**: Non-Dependabot PRs need ≥1 approval
4. **Check required checks**: All must pass

### Solutions

#### Add auto-merge Label

```bash
gh pr edit PR_NUMBER --add-label "auto-merge"
```

#### Mark PR as Ready

If PR is in draft:
```bash
gh pr ready PR_NUMBER
```

#### Request Review

Ensure you have at least 1 approval:
```bash
gh pr review PR_NUMBER --approve
```

#### Verify All Checks Pass

Required checks:
- Backend - Lint & Test (Node 18, 20, 22)
- Webapp - Lint & Build (Node 18, 20, 22)
- Security Scan
- CI Summary & PR Comment
- Vercel Preview Deployment (unless skip-deployment)
- Railway Preview Deployment (unless skip-deployment)

#### Manual Trigger

You can manually trigger auto-merge workflow:
```bash
gh workflow run auto-merge.yml -f pr_number=PR_NUMBER
```

## 🆘 Getting Additional Help

If issues persist:

1. **Check workflow logs** carefully
2. **Search existing issues** on GitHub
3. **Create a new issue** with:
   - Description of the problem
   - Workflow run link
   - Error messages
   - Steps to reproduce

4. **Ask in discussions** for general questions

## 📚 Additional Resources

- [GitHub Actions Debugging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
- [Vercel Build Troubleshooting](https://vercel.com/docs/concepts/deployments/troubleshoot-a-build)
- [Railway Deployment Guide](https://docs.railway.app/deploy/deployments)
- [Jest Troubleshooting](https://jestjs.io/docs/troubleshooting)

---

**Last Updated**: December 2024
