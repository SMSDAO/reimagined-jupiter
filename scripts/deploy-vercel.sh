#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Vercel Deployment
# ==============================================================================
# Automated Vercel deployment with pre-checks and post-deployment validation
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
  log_error "VERCEL DEPLOYMENT FAILED: $1"
  exit 1
}

echo ""
echo "======================================================================"
echo "🚀 GXQ SMART BRAIN: VERCEL DEPLOYMENT"
echo "======================================================================"
echo "Deploying webapp to Vercel production"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"

# Step 1: Check for VERCEL_TOKEN
log_step "Step 1/5: Environment Check"

if [ -n "${VERCEL_TOKEN:-}" ]; then
  log_success "VERCEL_TOKEN is set"
else
  log_error "VERCEL_TOKEN not found"
  echo ""
  echo "💡 To deploy to Vercel, you need a VERCEL_TOKEN:"
  echo "   1. Get token: https://vercel.com/account/tokens"
  echo "   2. Set in environment: export VERCEL_TOKEN=your_token"
  echo "   3. Or add to .env: VERCEL_TOKEN=your_token"
  echo ""
  abort "Missing VERCEL_TOKEN environment variable"
fi

# Step 2: Pre-deployment validation
log_step "Step 2/5: Pre-Deployment Validation"

log_info "Running pre-deployment checks..."
if npm run pre-deploy 2>&1 | tail -20; then
  log_success "Pre-deployment validation passed"
else
  log_error "Pre-deployment validation failed (continuing...)"
fi

# Step 3: Check Vercel CLI
log_step "Step 3/5: Vercel CLI Check"

if command -v vercel &> /dev/null; then
  log_success "Vercel CLI is installed"
  vercel --version
elif npx vercel --version &> /dev/null; then
  log_success "Vercel CLI available via npx"
else
  log_info "Installing Vercel CLI..."
  npm install -g vercel
  log_success "Vercel CLI installed"
fi

# Step 4: Deploy to production
log_step "Step 4/5: Deploy to Vercel Production"

log_info "Deploying to Vercel..."
if vercel --prod --token="$VERCEL_TOKEN" 2>&1 | tee /tmp/vercel-deploy.log; then
  log_success "Deployment to Vercel completed"
else
  abort "Vercel deployment failed"
fi

# Extract deployment URL from logs
DEPLOY_URL=$(grep -oP 'https://[^\s]+\.vercel\.app' /tmp/vercel-deploy.log | head -1 || echo "")

if [ -n "$DEPLOY_URL" ]; then
  log_success "Deployment URL: $DEPLOY_URL"
else
  log_info "Deployment URL not extracted from logs"
fi

# Step 5: Post-deployment checklist
log_step "Step 5/5: Post-Deployment Checklist"

echo ""
echo "📋 Post-Deployment Checklist:"
echo "  □ Verify deployment: ${DEPLOY_URL:-https://your-app.vercel.app}"
echo "  □ Test critical user flows"
echo "  □ Check error logs in Vercel dashboard"
echo "  □ Verify environment variables in Vercel project settings"
echo "  □ Test API endpoints"
echo "  □ Verify wallet connections"
echo ""

# Update .env.production if it exists
if [ -f ".env.production" ] && [ -n "$DEPLOY_URL" ]; then
  log_info "Updating .env.production with deployment URL..."
  echo "NEXT_PUBLIC_APP_URL=$DEPLOY_URL" >> .env.production
  log_success ".env.production updated"
fi

# Summary
echo ""
echo "======================================================================"
echo "🎉 VERCEL DEPLOYMENT COMPLETED"
echo "======================================================================"
echo ""
echo "📊 Deployment Summary:"
echo "  • Platform: Vercel"
echo "  • Environment: Production"
if [ -n "$DEPLOY_URL" ]; then
  echo "  • URL: $DEPLOY_URL"
fi
echo "  • Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "💡 Next steps:"
echo "   - Monitor: https://vercel.com/dashboard"
echo "   - Check health: bash scripts/health-check.sh"
echo "   - View logs: npm run logs"
echo ""
echo "======================================================================"

exit 0
