#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Railway Deployment
# ==============================================================================
# Automated Railway deployment with health checks
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
  log_error "RAILWAY DEPLOYMENT FAILED: $1"
  exit 1
}

echo ""
echo "======================================================================"
echo "🚂 GXQ SMART BRAIN: RAILWAY DEPLOYMENT"
echo "======================================================================"
echo "Deploying backend to Railway"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"

# Step 1: Check for Railway CLI
log_step "Step 1/5: Railway CLI Check"

if command -v railway &> /dev/null; then
  log_success "Railway CLI is installed"
  railway --version
else
  log_error "Railway CLI not found"
  echo ""
  echo "💡 To install Railway CLI:"
  echo "   npm install -g @railway/cli"
  echo "   or: bash <(curl -fsSL cli.new)"
  echo ""
  abort "Railway CLI not installed"
fi

# Step 2: Validate railway.json configuration
log_step "Step 2/5: Configuration Validation"

if [ -f "railway.json" ]; then
  log_success "railway.json exists"
  log_info "Configuration:"
  cat railway.json | head -20
else
  log_error "railway.json missing"
  abort "Railway configuration file not found"
fi

# Step 3: Build backend
log_step "Step 3/5: Build Backend"

log_info "Building backend for Railway..."
if npm run build:backend 2>&1 | tail -20; then
  log_success "Backend build completed"
else
  abort "Backend build failed"
fi

# Step 4: Deploy to Railway
log_step "Step 4/5: Deploy to Railway"

log_info "Deploying to Railway..."
if railway up 2>&1 | tee /tmp/railway-deploy.log; then
  log_success "Deployment to Railway completed"
else
  log_error "Railway deployment command finished with warnings"
  log_info "Check logs for details"
fi

# Step 5: Monitor deployment and health check
log_step "Step 5/5: Health Check"

log_info "Waiting for deployment to stabilize..."
sleep 10

# Try to get Railway service URL
log_info "Fetching Railway service URL..."
if railway status &> /tmp/railway-status.log; then
  cat /tmp/railway-status.log
  log_success "Railway status retrieved"
else
  log_info "Could not retrieve Railway status automatically"
fi

# Attempt health check if URL is available
RAILWAY_URL="${RAILWAY_URL:-}"
if [ -n "$RAILWAY_URL" ]; then
  log_info "Checking health endpoint: $RAILWAY_URL/health"
  
  if curl -f -s -o /tmp/health-response.json "$RAILWAY_URL/health" 2>&1; then
    log_success "Health check passed"
    cat /tmp/health-response.json
  else
    log_error "Health check failed (service may still be starting)"
  fi
else
  log_info "RAILWAY_URL not set - skipping automatic health check"
  echo "💡 Get your URL: railway domain"
fi

# Summary
echo ""
echo "======================================================================"
echo "🎉 RAILWAY DEPLOYMENT COMPLETED"
echo "======================================================================"
echo ""
echo "📊 Deployment Summary:"
echo "  • Platform: Railway"
echo "  • Environment: Production"
if [ -n "$RAILWAY_URL" ]; then
  echo "  • URL: $RAILWAY_URL"
else
  echo "  • URL: Run 'railway domain' to get URL"
fi
echo "  • Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "💡 Useful commands:"
echo "   - Get URL: railway domain"
echo "   - Check logs: railway logs"
echo "   - Check status: railway status"
echo "   - Open dashboard: railway open"
echo ""
echo "💡 Next steps:"
echo "   - Verify health: curl https://your-app.railway.app/health"
echo "   - Check logs: railway logs"
echo "   - Monitor: railway open"
echo ""
echo "======================================================================"

exit 0
