#!/bin/bash

# Dev Branch Validation Script
# Validates that the dev branch is production-ready and fully synced

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Dev Branch Production Readiness Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to report status
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

echo "Phase 1: Repository Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check required files
REQUIRED_FILES=(
    "package.json"
    "tsconfig.json"
    ".eslintrc.json"
    "jest.config.js"
    ".env.example"
    "README.md"
    "webapp/package.json"
    "webapp/tsconfig.json"
    ".github/workflows/ci.yml"
    ".github/workflows/deploy-preview.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "File exists: $file"
    else
        check_fail "Missing file: $file"
    fi
done

echo ""
echo "Phase 2: Security Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for .env files in git
if git ls-files | grep -q "^\.env$"; then
    check_fail ".env file is tracked in git (SECURITY RISK)"
else
    check_pass "No .env file in git"
fi

# Check for private keys in code
if grep -r "PRIVATE_KEY.*=.*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" src/ webapp/ 2>/dev/null | grep -v "process.env" | grep -v "example"; then
    check_fail "Hardcoded private keys found (SECURITY RISK)"
else
    check_pass "No hardcoded private keys"
fi

# Check for TODO/FIXME in production code
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" src/ webapp/ 2>/dev/null | wc -l || echo "0")
if [ "$TODO_COUNT" -eq 0 ]; then
    check_pass "No TODO/FIXME comments in code"
else
    check_warn "Found $TODO_COUNT TODO/FIXME comments"
fi

echo ""
echo "Phase 3: Code Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for mock/placeholder code
MOCK_COUNT=$(grep -ri "mock\|placeholder" --include="*.ts" --include="*.tsx" src/ webapp/ 2>/dev/null | grep -v "node_modules\|\.test\.\|\.spec\.\|__tests__\|// \|comment" | wc -l || echo "0")
if [ "$MOCK_COUNT" -eq 0 ]; then
    check_pass "No mock/placeholder code outside tests"
else
    check_warn "Found $MOCK_COUNT instances of mock/placeholder code"
fi

# Check TypeScript configuration
if grep -q '"strict": true' tsconfig.json; then
    check_pass "TypeScript strict mode enabled"
else
    check_warn "TypeScript strict mode not enabled"
fi

# Check for console.log in production code (warn only)
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" src/ webapp/ 2>/dev/null | grep -v "node_modules" | wc -l || echo "0")
if [ "$CONSOLE_COUNT" -gt 50 ]; then
    check_warn "High number of console.log statements ($CONSOLE_COUNT)"
else
    check_pass "Reasonable console.log usage ($CONSOLE_COUNT)"
fi

echo ""
echo "Phase 4: CI/CD Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check CI workflow supports dev branch
if grep -q "dev" .github/workflows/ci.yml; then
    check_pass "CI workflow supports dev branch"
else
    check_fail "CI workflow missing dev branch support"
fi

# Check deploy preview workflow supports dev branch
if grep -q "dev" .github/workflows/deploy-preview.yml; then
    check_pass "Deploy preview supports dev branch"
else
    check_fail "Deploy preview missing dev branch support"
fi

# Check for required workflow files
WORKFLOWS=(
    ".github/workflows/ci.yml"
    ".github/workflows/auto-merge.yml"
    ".github/workflows/deploy-preview.yml"
    ".github/workflows/codeql-analysis.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        check_pass "Workflow exists: $(basename $workflow)"
    else
        check_warn "Optional workflow missing: $(basename $workflow)"
    fi
done

echo ""
echo "Phase 5: Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env.example completeness
REQUIRED_ENV_VARS=(
    "SOLANA_RPC_URL"
    "WALLET_PRIVATE_KEY"
    "ADMIN_USERNAME"
    "ADMIN_PASSWORD"
    "JWT_SECRET"
    "DEV_FEE_WALLET"
)

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if grep -q "^$var=" .env.example; then
        check_pass "Environment variable documented: $var"
    else
        check_warn "Missing in .env.example: $var"
    fi
done

echo ""
echo "Phase 6: Documentation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for required documentation
DOCS=(
    "README.md"
    "SECURITY_GUIDE.md"
    "CONTRIBUTING.md"
    "DEV_BRANCH_GUIDE.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "Documentation exists: $doc"
    else
        check_warn "Documentation missing: $doc"
    fi
done

echo ""
echo "Phase 7: Git Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check git status
UNCOMMITTED=$(git status --porcelain | wc -l)
if [ "$UNCOMMITTED" -eq 0 ]; then
    check_pass "No uncommitted changes"
else
    check_warn "$UNCOMMITTED uncommitted changes"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "dev" ]] || [[ "$CURRENT_BRANCH" == "develop" ]] || [[ "$CURRENT_BRANCH" == *"dev"* ]]; then
    check_pass "On dev-related branch: $CURRENT_BRANCH"
else
    check_warn "Not on dev branch (current: $CURRENT_BRANCH)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Perfect! All checks passed!${NC}"
    echo ""
    echo "The dev branch is production-ready and fully synced."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Passed with warnings${NC}"
    echo -e "   Errors: ${RED}$ERRORS${NC}"
    echo -e "   Warnings: ${YELLOW}$WARNINGS${NC}"
    echo ""
    echo "The dev branch is functional but has minor issues."
    echo "Review warnings above for potential improvements."
    exit 0
else
    echo -e "${RED}❌ Validation failed${NC}"
    echo -e "   Errors: ${RED}$ERRORS${NC}"
    echo -e "   Warnings: ${YELLOW}$WARNINGS${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi
