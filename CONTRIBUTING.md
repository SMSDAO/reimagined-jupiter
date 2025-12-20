# Contributing to GXQ Studio

Thank you for your interest in contributing to GXQ Studio! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Security](#security)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/reimagined-jupiter.git
   cd reimagined-jupiter
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/SMSDAO/reimagined-jupiter.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Backend Setup

```bash
# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Edit .env with your configuration
# Add your Solana RPC URL, wallet private key, etc.

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run all validation checks
npm run validate
```

### Webapp Setup

```bash
cd webapp

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Add your configuration
# Set NEXT_PUBLIC_RPC_URL and other required variables

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
cd .. && npm run type-check:webapp
```

### Running CI Checks Locally

Before submitting a PR, run these checks locally to ensure they will pass in CI:

```bash
# Run all validation checks (recommended)
npm run validate

# Or run individual checks:
npm run lint              # Lint backend code
npm run lint:webapp       # Lint webapp code  
npm run type-check        # Type check backend
npm run type-check:webapp # Type check webapp
npm test                  # Run backend tests with coverage
npm run test:webapp       # Run webapp tests with coverage
npm run build             # Build both backend and webapp
```

All these checks must pass for your PR to be merged. The CI pipeline runs on Node.js 18 and 20.

## Coding Standards

### TypeScript

**Strict Mode:** This project enforces TypeScript strict mode. All code must compile without errors.

```typescript
// ✅ Good - Explicit types
function processAmount(amount: number, currency: string): string {
  return `${amount} ${currency}`;
}

// ❌ Bad - Implicit any
function processAmount(amount, currency) {
  return `${amount} ${currency}`;
}
```

**Type Safety Rules:**
- Always provide explicit types for function parameters
- Avoid using `any` type (ESLint warning level, but should be minimized)
- Use proper interfaces and types from `src/types.ts`
- Prefix unused parameters with underscore: `_param`

### Logging

**Use Centralized Logger:** Replace `console.log` with the centralized Winston logger.

```typescript
import { Logger } from './utils/logger';

const logger = new Logger('MyService', requestId);

// ✅ Good - Structured logging
logger.info('Processing transaction', { 
  signature, 
  amount, 
  token 
});

logger.error('Transaction failed', error, { 
  signature, 
  reason: 'Insufficient funds' 
});

// ❌ Bad - console.log
console.log('Processing transaction', signature);
```

**Specialized Logging Methods:**
```typescript
// For RPC operations
logger.rpcError('getBalance', error, { address });

// For transactions
logger.transactionError(signature, error, { amount });

// For authentication
logger.authEvent('login', success, { username });

// For arbitrage
logger.opportunity(profit, route, { dexes, slippage });

// For trades
logger.trade('execute', success, { profit, signature });
```

### Code Style

- **Indentation**: 2 spaces
- **Semicolons**: Use semicolons
- **Imports**: Group by external libraries first, then internal modules
- **Async/Await**: Prefer async/await over promises
- **Variable Names**: camelCase for variables, PascalCase for types/classes
- **Constants**: UPPER_SNAKE_CASE for true constants

### Security

**Critical Security Rules:**
- Never commit private keys, mnemonics, or secrets
- All sensitive data must be loaded from environment variables
- Use `.env.example` as a template; never commit actual `.env` files
- Validate all user input before processing
- Use proper slippage protection for DEX trades

### Solana Best Practices

- Always use proper type-safe transaction builders
- Validate all Solana addresses before transactions
- Implement MEV protection via Jito bundles when executing arbitrage
- Always check transaction confirmations
- Use proper priority fees to ensure transaction inclusion

## Testing

### Running Tests

```bash
# Backend tests
npm test                    # Run all tests with coverage
npm run test:coverage       # Generate coverage report
npm run test:integration    # Run integration tests only

# Webapp tests
npm run test:webapp         # Run webapp tests with coverage

# Run specific test file
npm test -- walletScoring.test.ts
```

### Writing Tests

- Write unit tests for new utility functions
- Write integration tests for Solana transaction logic
- Use Jest as the testing framework
- Test files should be in `src/__tests__/` directory
- Test error handling paths
- Test edge cases (e.g., insufficient balance, failed transactions)
- Use devnet/testnet addresses, never mainnet in tests
- All tests must pass before submitting a PR
- Maintain or improve code coverage (target: 90%)
- Tests should use mocks for external APIs (no network calls)

```typescript
// Example test structure
describe('MyService', () => {
  beforeEach(() => {
    // Setup
  });

  it('should process valid transaction', async () => {
    const result = await service.process(validInput);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle invalid input', async () => {
    await expect(service.process(invalidInput))
      .rejects
      .toThrow('Invalid input');
  });
});
```

### Coverage Requirements

- **Line Coverage**: 90% minimum
- **Branch Coverage**: 85% minimum  
- **Function Coverage**: 90% minimum

Coverage reports are automatically generated and uploaded to Codecov on every PR.

## CI/CD Pipeline

### Continuous Integration

All PRs trigger our comprehensive CI pipeline which includes:

1. **Install**: Dependencies installation on Node.js 18 and 20
2. **Lint**: ESLint checks with --max-warnings=0
3. **Type Check**: TypeScript strict type checking
4. **Unit Tests**: Backend and webapp tests with coverage
5. **Coverage**: Merged coverage report uploaded to Codecov
6. **Security Scan**: npm audit and CodeQL analysis
7. **Build**: TypeScript compilation and Next.js build

### Pipeline Requirements

Your PR must pass all of these checks:

- ✅ Lint (zero warnings)
- ✅ Type check (strict mode)
- ✅ Backend tests (all passing)
- ✅ Build (successful compilation)

Optional but recommended:
- ⚠️ Webapp tests (if webapp is modified)
- ⚠️ Coverage threshold (90% target)
- ⚠️ Security scan (no high-severity issues)

### Preview Deployments

When you create a PR, a preview deployment will be automatically created on Vercel (if secrets are configured). The preview URL will be posted as a comment on your PR.

### Viewing CI Results

1. Go to your PR on GitHub
2. Scroll to the bottom to see CI check status
3. Click "Details" on any check to view logs
4. Review any failures and fix them
5. Push new commits to re-run CI

### Local CI Simulation

Before pushing, simulate the CI pipeline locally:

```bash
# This runs the same checks as CI
npm run validate

# Or step by step:
npm run lint && \
npm run type-check && \
npm test && \
npm run build
```

### CodeQL Security Scanning

CodeQL automatically scans the codebase for security vulnerabilities:

- Runs on every push to main/develop
- Runs on every PR
- Runs weekly on Monday at 02:00 UTC
- Results viewable in Security → Code scanning alerts

High-severity alerts should be addressed before merging.

## Submitting Changes

### Pull Request Process

1. **Update your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Make your changes** following the coding standards above

3. **Test your changes**:
   ```bash
   npm run build
   npm run lint
   npm test
   ```

4. **Commit your changes** with a clear message:
   ```bash
   git add .
   git commit -m "feat: Add new arbitrage strategy"
   ```

   Use conventional commit format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub:
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - Wait for code review

### Code Review

- All submissions require code review
- Reviewers may request changes
- Address feedback promptly
- Once approved, a maintainer will merge your PR

### Pull Request Checklist

Before submitting your PR, ensure:
- [ ] Code follows TypeScript strict mode requirements
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No security vulnerabilities introduced
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventional format
- [ ] PR description is clear and complete

## Security

### Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** open a public issue
2. Email the maintainers directly (see SECURITY_ADVISORY.md)
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure

### Security Review

All PRs that touch:
- Authentication/authorization
- Transaction handling
- Private key management
- API endpoints
- Input validation

Will receive additional security scrutiny before merging.

## Documentation

When adding new features:
- Update relevant markdown files in `docs/`
- Add JSDoc comments to public functions
- Update the README if the feature affects usage
- Include code examples where helpful

## Questions?

If you have questions:
- Check existing documentation (README, ARCHITECTURE.md, etc.)
- Look for similar issues or PRs
- Open a GitHub discussion
- Join the community Discord (if available)

## License

By contributing to GXQ Studio, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to GXQ Studio! 🚀
