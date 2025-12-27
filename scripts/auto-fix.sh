#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Auto-Fix Script
# ==============================================================================
# Automated code repair: formatting, trailing whitespace, common issues
# Non-fatal: logs warnings but doesn't abort if formatting fails
# ==============================================================================

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================================================"
echo "🔧 GXQ Smart Brain: Auto-Fix"
echo "======================================================================"
echo ""

# Track issues found and fixed
ISSUES_FIXED=0
WARNINGS=0

# Function to log steps
log_step() {
  echo -e "${GREEN}▶${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS++))
}

log_fixed() {
  echo -e "${GREEN}✅ $1${NC}"
  ((ISSUES_FIXED++))
}

# Remove trailing whitespace from TypeScript files
log_step "Removing trailing whitespace from .ts and .tsx files..."
if find src api webapp -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 2>/dev/null | xargs -0 sed -i 's/[[:space:]]*$//' 2>/dev/null; then
  log_fixed "Trailing whitespace removed"
else
  log_warning "Could not process some files for trailing whitespace removal"
fi

echo ""

# Run Prettier if available
log_step "Running Prettier code formatter..."
if command -v npx &> /dev/null; then
  # Check if prettier is available
  if npx prettier --version &> /dev/null; then
    echo "  Formatting backend TypeScript files..."
    if npx prettier --write "src/**/*.ts" "api/**/*.ts" --log-level warn 2>&1 | grep -v "unchanged" || true; then
      log_fixed "Backend files formatted"
    else
      log_warning "Some backend files could not be formatted"
    fi
    
    echo "  Formatting webapp TypeScript files..."
    if npx prettier --write "webapp/**/*.{ts,tsx}" --log-level warn 2>&1 | grep -v "unchanged" || true; then
      log_fixed "Webapp files formatted"
    else
      log_warning "Some webapp files could not be formatted"
    fi
  else
    log_warning "Prettier not available (not installed)"
  fi
else
  log_warning "npx not available - skipping Prettier"
fi

echo ""

# Fix common import issues
log_step "Scanning for common import issues..."
IMPORT_ISSUES=0

# Check for .js extensions in imports (should not have them in TypeScript)
if grep -r "from ['\"].*\.js['\"]" src/ api/ webapp/ 2>/dev/null | grep -v node_modules | grep -v ".next" || true; then
  log_warning "Found .js extensions in TypeScript imports (should be removed)"
  ((IMPORT_ISSUES++))
else
  echo "  No .js extension issues found"
fi

# Check for missing file extensions in relative imports
if grep -r "from ['\"]\.\.*/[^'\"]*[^/]['\"]" src/ api/ 2>/dev/null | grep -v node_modules | grep -v "\.js" | head -5 || true; then
  log_warning "Some relative imports may be missing proper paths"
  ((IMPORT_ISSUES++))
fi

if [ $IMPORT_ISSUES -eq 0 ]; then
  log_fixed "No import issues detected"
fi

echo ""
echo "======================================================================"
echo "Summary"
echo "======================================================================"
echo "✅ Issues fixed: $ISSUES_FIXED"
echo "⚠️  Warnings: $WARNINGS"
echo ""

if [ $WARNINGS -gt 0 ]; then
  echo "⚠️  Some warnings were logged but auto-fix completed"
  echo "💡 Review warnings above and fix manually if needed"
fi

echo "✅ Auto-fix completed successfully"
exit 0
