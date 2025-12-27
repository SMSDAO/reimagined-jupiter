#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Self-Heal System Regeneration
# ==============================================================================
# Full system regeneration: verify structure, clean, reinstall, orchestrate
# ==============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() {
  echo ""
  echo "======================================================================"
  echo -e "${BLUE}▶ $1${NC}"
  echo "======================================================================"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

abort() {
  echo ""
  log_error "SELF-HEAL FAILED: $1"
  exit 1
}

echo ""
echo "======================================================================"
echo "🔧 GXQ SMART BRAIN: SELF-HEAL SYSTEM REGENERATION"
echo "======================================================================"
echo "Full system cleanup and rebuild"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"

# Step 1: Verify repository structure
log_step "Step 1/4: Verify Repository Structure"

REQUIRED_DIRS=("src" "webapp" "api" "scripts" "db" "docs")
MISSING_DIRS=0

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    log_success "$dir/ exists"
  else
    log_error "$dir/ missing"
    ((MISSING_DIRS++))
  fi
done

if [ $MISSING_DIRS -gt 0 ]; then
  abort "$MISSING_DIRS required director(ies) missing. Are you in the correct directory?"
fi

# Step 2: Clean build artifacts
log_step "Step 2/4: Clean Build Artifacts"

log_info "Removing dist/..."
rm -rf dist/
log_success "dist/ removed"

log_info "Removing webapp/.next/..."
rm -rf webapp/.next/
log_success "webapp/.next/ removed"

log_info "Cleaning nested node_modules..."
find . -name "node_modules" -type d -prune -not -path "./node_modules/*" -not -path "./webapp/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
log_success "Nested node_modules cleaned"

log_info "Removing package-lock temporaries..."
rm -f package-lock.json.* webapp/package-lock.json.* 2>/dev/null || true
log_success "Lock file temporaries removed"

# Step 3: Reinstall dependencies
log_step "Step 3/4: Reinstall Dependencies"

log_info "Installing backend dependencies..."
if npm ci --prefer-offline 2>&1 | tail -20; then
  log_success "Backend dependencies installed"
else
  abort "Backend dependency installation failed"
fi

log_info "Installing webapp dependencies..."
if cd webapp && npm ci --prefer-offline 2>&1 | tail -20 && cd ..; then
  log_success "Webapp dependencies installed"
else
  abort "Webapp dependency installation failed"
fi

# Step 4: Run master orchestration
log_step "Step 4/4: Run Master Orchestration"

log_info "Running scripts/master.sh for full orchestration..."
if bash scripts/master.sh; then
  log_success "Master orchestration completed"
else
  abort "Master orchestration failed"
fi

# Final summary
echo ""
echo "======================================================================"
echo "🎉 SELF-HEAL COMPLETED SUCCESSFULLY"
echo "======================================================================"
echo ""
echo "✅ System has been fully regenerated and is production-ready"
echo "📊 All builds validated and artifacts generated"
echo ""
echo "💡 Next steps:"
echo "   - Review the changes: git status"
echo "   - Deploy to production: npm run deploy:vercel"
echo "   - Check health: bash scripts/health-check.sh"
echo ""
echo "======================================================================"

exit 0
