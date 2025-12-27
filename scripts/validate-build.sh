#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Build Validation
# ==============================================================================
# Pre-commit validation script that checks for required artifacts and files
# Exit 0 if all checks pass, exit 1 if any fail
# ==============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Helper functions
mark_ok() {
  echo -e "${GREEN}✅${NC} $1"
  ((CHECKS_PASSED++))
}

mark_issue() {
  echo -e "${RED}❌${NC} $1"
  ((CHECKS_FAILED++))
}

mark_warn() {
  echo -e "${YELLOW}⚠️${NC} $1"
  ((CHECKS_WARNING++))
}

echo "======================================================================"
echo "🔍 GXQ Smart Brain: Build Validation"
echo "======================================================================"
echo ""

# Backend build artifacts
echo "======================================================================"
echo "Backend Build Artifacts"
echo "======================================================================"

if [ -f "dist/src/index.js" ]; then
  mark_ok "dist/src/index.js exists"
else
  mark_issue "dist/src/index.js missing (main backend entry)"
fi

if [ -f "dist/src/server.js" ]; then
  mark_ok "dist/src/server.js exists"
else
  mark_issue "dist/src/server.js missing (server entry)"
fi

if [ -f "dist/src/index-railway.js" ]; then
  mark_ok "dist/src/index-railway.js exists"
else
  mark_issue "dist/src/index-railway.js missing (Railway entry)"
fi

if [ -d "dist/src" ]; then
  FILE_COUNT=$(find dist/src -name "*.js" | wc -l)
  if [ "$FILE_COUNT" -gt 10 ]; then
    mark_ok "dist/src/ has $FILE_COUNT compiled files"
  else
    mark_warn "dist/src/ has only $FILE_COUNT compiled files (expected more)"
  fi
else
  mark_issue "dist/src/ directory missing"
fi

echo ""

# Webapp build artifacts
echo "======================================================================"
echo "Webapp Build Artifacts"
echo "======================================================================"

if [ -d "webapp/.next" ]; then
  mark_ok "webapp/.next/ exists"
  
  if [ -d "webapp/.next/server" ]; then
    mark_ok "webapp/.next/server/ exists"
  else
    mark_warn "webapp/.next/server/ missing (may not be built yet)"
  fi
  
  if [ -d "webapp/.next/static" ]; then
    mark_ok "webapp/.next/static/ exists"
  else
    mark_warn "webapp/.next/static/ missing (may not be built yet)"
  fi
else
  mark_issue "webapp/.next/ missing (run 'npm run build:webapp')"
fi

echo ""

# Configuration files
echo "======================================================================"
echo "Configuration Files"
echo "======================================================================"

if [ -f "package.json" ]; then
  mark_ok "package.json exists"
else
  mark_issue "package.json missing"
fi

if [ -f "tsconfig.json" ]; then
  mark_ok "tsconfig.json exists"
else
  mark_issue "tsconfig.json missing"
fi

if [ -f "webapp/package.json" ]; then
  mark_ok "webapp/package.json exists"
else
  mark_issue "webapp/package.json missing"
fi

if [ -f "webapp/tsconfig.json" ]; then
  mark_ok "webapp/tsconfig.json exists"
else
  mark_issue "webapp/tsconfig.json missing"
fi

if [ -f "webapp/next.config.ts" ]; then
  mark_ok "webapp/next.config.ts exists"
else
  mark_warn "webapp/next.config.ts missing (Next.js config)"
fi

if [ -f ".env.example" ]; then
  mark_ok ".env.example exists"
else
  mark_warn ".env.example missing (environment template)"
fi

echo ""

# Core scripts
echo "======================================================================"
echo "Core Scripts"
echo "======================================================================"

if [ -f "scripts/master.sh" ]; then
  mark_ok "scripts/master.sh exists"
else
  mark_warn "scripts/master.sh missing (master orchestrator)"
fi

if [ -f "scripts/validate-build.sh" ]; then
  mark_ok "scripts/validate-build.sh exists (this script)"
else
  mark_warn "scripts/validate-build.sh missing"
fi

if [ -f "scripts/setup-env.sh" ]; then
  mark_ok "scripts/setup-env.sh exists"
else
  mark_warn "scripts/setup-env.sh missing"
fi

echo ""

# Database schemas
echo "======================================================================"
echo "Database Schemas"
echo "======================================================================"

if [ -d "db" ]; then
  mark_ok "db/ directory exists"
  
  SQL_FILES=$(find db -name "*.sql" 2>/dev/null | wc -l)
  if [ "$SQL_FILES" -gt 0 ]; then
    mark_ok "Found $SQL_FILES SQL schema file(s)"
  else
    mark_warn "No SQL schema files found in db/"
  fi
else
  mark_warn "db/ directory missing (database schemas)"
fi

echo ""

# Summary
echo "======================================================================"
echo "Validation Summary"
echo "======================================================================"
echo "✅ Checks passed: $CHECKS_PASSED"
echo "❌ Checks failed: $CHECKS_FAILED"
echo "⚠️  Warnings: $CHECKS_WARNING"
echo ""

if [ $CHECKS_FAILED -gt 0 ]; then
  echo "❌ Build validation FAILED: $CHECKS_FAILED issue(s) found"
  echo ""
  echo "💡 Next steps:"
  echo "   1. Run 'npm run build:backend' to build backend"
  echo "   2. Run 'npm run build:webapp' to build webapp"
  echo "   3. Run this validation again"
  echo ""
  exit 1
else
  echo "✅ Build validation PASSED!"
  if [ $CHECKS_WARNING -gt 0 ]; then
    echo "⚠️  Note: $CHECKS_WARNING warning(s) logged (non-critical)"
  fi
  echo ""
  exit 0
fi
