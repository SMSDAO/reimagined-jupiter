# Dev Branch Automation - Manual Review Required

## Overview

This document flags items that require manual review or action before the dev branch can be considered fully production-ready. These items have been automated or documented where possible, but require human decision or external resources.

---

## 🔴 Critical - Requires Immediate Action

### 1. Environment Variables Configuration

**Status:** ⚠️ REQUIRES CONFIGURATION

**What:** The following environment variables must be set before production use:

```bash
# Critical - Must be set
DEV_FEE_WALLET=11111111111111111111111111111111  # Currently placeholder

# Recommended for production
QUICKNODE_RPC_URL=<your-premium-rpc>
NEYNAR_API_KEY=<for-social-features>
```

**Action Required:**
1. Set `DEV_FEE_WALLET` to an actual wallet address before enabling `DEV_FEE_ENABLED=true`
2. Configure premium RPC endpoint for production (QuickNode recommended)
3. Optionally add Neynar API key for Farcaster social features

**Impact if not done:** Dev fee distribution will fail, free RPC may be rate limited

**Priority:** 🔴 HIGH

---

### 2. Vercel Deployment Secrets

**Status:** ⚠️ MUST BE CONFIGURED IN GITHUB

**What:** Preview deployments require Vercel secrets in GitHub repository settings

**Action Required:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VERCEL_TOKEN` - Your Vercel authentication token
   - `VERCEL_PROJECT_ID` - Vercel project ID
   - `VERCEL_ORG_ID` - Vercel organization ID

**How to get values:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (run in webapp directory)
cd webapp && vercel link

# Get values from .vercel/project.json
cat .vercel/project.json
```

**Impact if not done:** Preview deployments will be skipped, PR previews won't work

**Priority:** 🔴 HIGH (for preview deployments)

---

## 🟡 Important - Review Before Production

### 3. Flash Loan Provider SDK Integration

**Status:** 🏗️ FRAMEWORK READY - SDK REQUIRED

**What:** Marginfi V2 flash loan integration is scaffolded but requires SDK

**Current State:**
- ✅ Transaction structure validated
- ✅ Parameter validation working
- ✅ Error handling in place
- ❌ Actual SDK instructions needed

**Action Required:**
1. Install SDK: `npm install @mrgnlabs/marginfi-client-v2`
2. Update `src/integrations/marginfiV2.ts`:
   - Replace `createBorrowInstruction()` placeholder
   - Replace `createRepayInstruction()` placeholder
   - Test on devnet first
3. Review and test before mainnet deployment

**Documentation:** See comments in `src/integrations/marginfiV2.ts`

**Impact if not done:** Flash loan arbitrage will not execute (validation only mode)

**Priority:** 🟡 MEDIUM (depends on business needs)

---

### 4. Solana Name Service (SNS) Resolution

**Status:** 🏗️ FRAMEWORK READY - SDK REQUIRED

**What:** SNS domain resolution (e.g., "monads.skr") is scaffolded but requires SDK

**Current State:**
- ✅ Error handling in place
- ✅ Public key validation working
- ❌ SNS resolution needs implementation

**Action Required:**
1. Install SDK: `npm install @bonfida/spl-name-service`
2. Update `src/utils/profitDistribution.ts`:
   - Implement SNS resolution logic
   - Test with known .sol/.skr domains
3. Add error handling for invalid/expired domains

**Documentation:** See comments in `src/utils/profitDistribution.ts` line ~85

**Impact if not done:** Cannot use SNS domains, must use direct addresses

**Priority:** 🟡 MEDIUM (convenience feature)

---

### 5. Specific Airdrop Program Integration

**Status:** 🏗️ FRAMEWORK READY - PROGRAM INTEGRATION NEEDED

**What:** Airdrop checking has wallet validation but needs program-specific integration

**Current State:**
- ✅ Wallet activity analysis working
- ✅ RPC resilience implemented
- ✅ API structure ready
- ❌ Specific airdrop program checks needed

**Action Required:**
1. Identify target airdrop programs (Jupiter, Jito, Pyth, etc.)
2. Add program-specific checking logic
3. Implement claim transaction building
4. Test with test wallets

**Files to update:**
- `webapp/app/api/airdrops/check/route.ts` (GET handler)
- `webapp/app/api/airdrops/check/route.ts` (POST handler)

**Impact if not done:** Airdrop checker shows empty results

**Priority:** 🟡 MEDIUM (depends on business needs)

---

## 🟢 Optional - Nice to Have

### 6. Individual DEX SDK Integration

**Status:** ℹ️ OPTIONAL - JUPITER AGGREGATOR PREFERRED

**What:** Individual DEX classes use fee-based estimates, not real-time quotes

**Current State:**
- ✅ Jupiter aggregator integrated (recommended for production)
- ✅ Fee-based fallbacks working
- ⚠️ Individual DEX SDKs optional

**Action Required (Optional):**
For each DEX in `src/dex/index.ts`, can optionally integrate real SDK:
- Raydium SDK for real-time Raydium quotes
- Orca SDK for real-time Orca quotes
- etc.

**Documentation:** Header comment in `src/dex/index.ts` explains architecture

**Impact if not done:** Jupiter aggregator handles routing (recommended approach)

**Priority:** 🟢 LOW (Jupiter is sufficient)

---

### 7. Dependency Installation & Build Verification

**Status:** ⏳ PENDING - REQUIRES MANUAL EXECUTION

**What:** Dependencies need to be installed and build verified

**Action Required:**
```bash
# Backend
npm ci
npm run build:backend

# Frontend
cd webapp
npm ci
npm run build:webapp

# Run tests
cd ..
npm test

# Run linting
npm run lint
npm run lint:webapp
```

**Expected Results:**
- ✅ Zero build errors
- ✅ 39 tests passing
- ⚠️ Some linting warnings acceptable (documented in CI config)

**Impact if not done:** Cannot verify TypeScript compilation

**Priority:** 🟢 RECOMMENDED before merging

---

### 8. CodeQL Security Scanning

**Status:** ✅ CONFIGURED - RUNS AUTOMATICALLY

**What:** GitHub CodeQL analyzes code for security vulnerabilities

**Current State:**
- ✅ Workflow configured (`.github/workflows/codeql-analysis.yml`)
- ✅ Runs automatically on push/PR
- ✅ Scans JavaScript/TypeScript

**Action Required:**
Review CodeQL results in repository Security tab after first run

**Impact if not done:** Security issues may go unnoticed

**Priority:** 🟢 AUTOMATED (review results)

---

## 📋 Summary Checklist

Before considering dev branch production-ready:

### Critical (Must Do)
- [ ] Configure `DEV_FEE_WALLET` environment variable
- [ ] Add Vercel secrets to GitHub (for preview deployments)
- [ ] Set up premium RPC endpoint (recommended)

### Important (Should Do)
- [ ] Decide on flash loan integration timeline
- [ ] Decide on SNS resolution integration timeline
- [ ] Decide on airdrop program integration timeline

### Optional (Nice to Have)
- [ ] Install dependencies and verify build
- [ ] Run test suite
- [ ] Review CodeQL security results
- [ ] Consider individual DEX SDK integration

---

## 🎯 Recommended Action Plan

### Phase A: Immediate (Before First Deployment)
1. Configure `DEV_FEE_WALLET` in environment
2. Set up Vercel secrets for preview deployments
3. Configure premium RPC endpoint
4. Run validation script: `bash scripts/validate-dev-branch.sh`

### Phase B: Short Term (1-2 Weeks)
1. Install dependencies and verify builds
2. Run full test suite
3. Deploy to preview environment
4. Conduct QA testing

### Phase C: Medium Term (1 Month)
1. Integrate Marginfi SDK (if flash loans needed)
2. Integrate SNS resolution (if domains needed)
3. Integrate airdrop programs (if checking needed)
4. Performance testing and optimization

### Phase D: Long Term (Ongoing)
1. Monitor CodeQL security alerts
2. Keep dependencies updated
3. Review and improve based on usage
4. Add more features as needed

---

## 🔍 Validation Status

Run the automated validation script anytime:

```bash
bash scripts/validate-dev-branch.sh
```

**Current Status:** ✅ PASSED (0 errors, 3 acceptable warnings)

**Acceptable Warnings:**
1. Mock/placeholder code in test files (OK)
2. Console.log for logging in DeFi app (OK)
3. Uncommitted changes for this document (OK)

---

## 📞 Support

For questions or issues with any of these items:

1. Review the comprehensive guides:
   - `DEV_BRANCH_GUIDE.md` - Deployment and sync
   - `SECURITY_GUIDE.md` - Security best practices
   - `.github/CI_CD_SETUP_GUIDE.md` - CI/CD configuration

2. Check inline code comments for specific integration instructions

3. Consult SDK documentation:
   - [Marginfi SDK](https://github.com/mrgnlabs/marginfi-v2)
   - [Bonfida SNS](https://github.com/Bonfida/spl-name-service)
   - [Jupiter API](https://station.jup.ag/docs/apis/swap-api)

---

**Last Updated:** 2025-12-21
**Review Status:** 🟢 Ready for manual review
**Automation Status:** ✅ Fully automated where possible
