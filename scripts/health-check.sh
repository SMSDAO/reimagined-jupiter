#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Health Check
# ==============================================================================
# System health monitoring with component-by-component checks
# ==============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
HEALTHY=0
UNHEALTHY=0
WARNINGS=0

log_healthy() {
  echo -e "${GREEN}✅ HEALTHY${NC} - $1"
  ((HEALTHY++)) || true
}

log_unhealthy() {
  echo -e "${RED}❌ UNHEALTHY${NC} - $1"
  ((UNHEALTHY++)) || true
}

log_warning() {
  echo -e "${YELLOW}⚠️  WARNING${NC} - $1"
  ((WARNINGS++)) || true
}

log_info() {
  echo -e "${CYAN}ℹ️  $1${NC}"
}

# ASCII art header
echo ""
echo "======================================================================"
echo "  _____ _  __  ____    ____                       __  __            "
echo " / ____| |/ / / __ \  / __ \                     | |/ /             "
echo "| |  __| ' / | |  | || |  | |  ___ _ __ ___   __ |   /              "
echo "| | |_ |  <  | |  | || |  | | / __| '_ \` _ \ / _\` |  <               "
echo "| |__| | . \ | |__| || |__| || (__| | | | | | (_| | . \              "
echo " \_____|_|\_\ \___\_\ \___\_\ \___|_| |_| |_|\__,_|_|\_\             "
echo ""
echo "                  SMART BRAIN HEALTH CHECK                          "
echo "======================================================================"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"
echo ""

# Load environment variables if available
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Backend Health Check
echo "======================================================================"
echo "Backend Service"
echo "======================================================================"

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
BACKEND_PROD_URL="${BACKEND_PROD_URL:-https://your-app.railway.app}"

log_info "Checking local backend: $BACKEND_URL/health"
if curl -f -s -o /tmp/backend-health.json "$BACKEND_URL/health" 2>/dev/null; then
  log_healthy "Local backend is responding"
  cat /tmp/backend-health.json | head -5
else
  log_warning "Local backend not responding (may not be running locally)"
  
  log_info "Checking production backend: $BACKEND_PROD_URL/health"
  if curl -f -s -o /tmp/backend-prod-health.json "$BACKEND_PROD_URL/health" 2>/dev/null; then
    log_healthy "Production backend is responding"
    cat /tmp/backend-prod-health.json | head -5
  else
    log_unhealthy "Production backend not responding"
  fi
fi

echo ""

# Webapp Health Check
echo "======================================================================"
echo "Webapp Service"
echo "======================================================================"

WEBAPP_URL="${WEBAPP_URL:-http://localhost:3001}"
WEBAPP_PROD_URL="${WEBAPP_PROD_URL:-https://your-app.vercel.app}"

log_info "Checking local webapp: $WEBAPP_URL"
if curl -f -s -o /dev/null "$WEBAPP_URL" 2>/dev/null; then
  log_healthy "Local webapp is responding"
else
  log_warning "Local webapp not responding (may not be running locally)"
  
  log_info "Checking production webapp: $WEBAPP_PROD_URL"
  if curl -f -s -o /dev/null "$WEBAPP_PROD_URL" 2>/dev/null; then
    log_healthy "Production webapp is responding"
  else
    log_unhealthy "Production webapp not responding"
  fi
fi

echo ""

# Database Check
echo "======================================================================"
echo "Database Connection"
echo "======================================================================"

if [ -n "${DB_HOST:-}" ]; then
  log_info "Checking database connection: $DB_HOST"
  
  if command -v psql &> /dev/null; then
    if PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-gxq}" -c "SELECT 1" &> /dev/null; then
      log_healthy "Database is accessible"
    else
      log_unhealthy "Database connection failed"
    fi
  else
    log_warning "psql not installed - cannot check database"
  fi
else
  log_info "DB_HOST not set - skipping database check"
fi

echo ""

# Solana RPC Check
echo "======================================================================"
echo "Solana RPC Endpoint"
echo "======================================================================"

if [ -n "${SOLANA_RPC_URL:-}" ]; then
  log_info "Checking Solana RPC: $SOLANA_RPC_URL"
  
  RPC_RESPONSE=$(curl -s -X POST "$SOLANA_RPC_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null || echo "")
  
  if echo "$RPC_RESPONSE" | grep -q "ok\|result"; then
    log_healthy "Solana RPC endpoint is responding"
  else
    log_unhealthy "Solana RPC endpoint not responding properly"
  fi
else
  log_warning "SOLANA_RPC_URL not set"
fi

echo ""

# Environment Variables Check
echo "======================================================================"
echo "Critical Environment Variables"
echo "======================================================================"

REQUIRED_VARS=("SOLANA_RPC_URL" "WALLET_PRIVATE_KEY" "JWT_SECRET" "ADMIN_USERNAME" "ADMIN_PASSWORD")
ENV_OK=true

for var in "${REQUIRED_VARS[@]}"; do
  if [ -n "${!var:-}" ]; then
    log_healthy "$var is set"
  else
    log_unhealthy "$var is missing"
    ENV_OK=false
  fi
done

echo ""

# System Resources (if available)
echo "======================================================================"
echo "System Resources"
echo "======================================================================"

if command -v free &> /dev/null; then
  log_info "Memory usage:"
  free -h | grep -E "Mem|Swap"
fi

if command -v df &> /dev/null; then
  log_info "Disk usage:"
  df -h / | tail -1
fi

echo ""

# Summary
echo "======================================================================"
echo "HEALTH CHECK SUMMARY"
echo "======================================================================"
echo -e "${GREEN}✅ Healthy components: $HEALTHY${NC}"
echo -e "${RED}❌ Unhealthy components: $UNHEALTHY${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $UNHEALTHY -eq 0 ] && [ $HEALTHY -gt 0 ]; then
  echo -e "${GREEN}🎉 System is HEALTHY!${NC}"
  EXIT_CODE=0
elif [ $UNHEALTHY -gt 0 ]; then
  echo -e "${RED}⚠️  System has UNHEALTHY components!${NC}"
  echo ""
  echo "💡 Recommendations:"
  
  if [ "$ENV_OK" = false ]; then
    echo "   - Fix environment variables: bash scripts/env-check.sh"
  fi
  
  if grep -q "backend not responding" /tmp/health-check-output 2>/dev/null || true; then
    echo "   - Start backend: npm run start:server"
    echo "   - Or deploy: bash scripts/deploy-railway.sh"
  fi
  
  if grep -q "webapp not responding" /tmp/health-check-output 2>/dev/null || true; then
    echo "   - Start webapp: cd webapp && npm run dev"
    echo "   - Or deploy: bash scripts/deploy-vercel.sh"
  fi
  
  EXIT_CODE=1
else
  echo -e "${YELLOW}⚠️  No services checked (all may be down)${NC}"
  EXIT_CODE=1
fi

echo ""
echo "======================================================================"

exit $EXIT_CODE
