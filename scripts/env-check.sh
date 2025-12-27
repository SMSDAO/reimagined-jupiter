#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Environment Variable Validation
# ==============================================================================
# Validates required and optional environment variables for GXQ Studio
# Exit 0 if all required vars present, exit 1 otherwise
# ==============================================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
MISSING_REQUIRED=0
MISSING_OPTIONAL=0
TOTAL_OK=0

# Helper functions
mark_ok() {
  echo -e "${GREEN}✅ [OK]${NC} $1"
  ((TOTAL_OK++)) || true
}

mark_missing() {
  echo -e "${RED}❌ [MISSING]${NC} $1"
  ((MISSING_REQUIRED++)) || true
}

mark_optional() {
  echo -e "${YELLOW}⚠️  [OPTIONAL]${NC} $1"
  ((MISSING_OPTIONAL++)) || true
}

echo "======================================================================"
echo "🔍 GXQ Smart Brain: Environment Variable Check"
echo "======================================================================"
echo ""

# Try to load .env or .env.local if present
if [ -f .env ]; then
  echo "📁 Loading .env file..."
  set -a
  source .env
  set +a
elif [ -f .env.local ]; then
  echo "📁 Loading .env.local file..."
  set -a
  source .env.local
  set +a
else
  echo "⚠️  No .env or .env.local file found. Checking system environment variables..."
fi

echo ""
echo "======================================================================"
echo "Required Variables"
echo "======================================================================"

# Required variables
if [ -n "${SOLANA_RPC_URL:-}" ]; then
  mark_ok "SOLANA_RPC_URL"
else
  mark_missing "SOLANA_RPC_URL (Solana RPC endpoint)"
fi

if [ -n "${WALLET_PRIVATE_KEY:-}" ]; then
  mark_ok "WALLET_PRIVATE_KEY"
else
  mark_missing "WALLET_PRIVATE_KEY (Base58 encoded private key)"
fi

if [ -n "${JWT_SECRET:-}" ]; then
  mark_ok "JWT_SECRET"
else
  mark_missing "JWT_SECRET (Secret for JWT token signing)"
fi

if [ -n "${ADMIN_USERNAME:-}" ]; then
  mark_ok "ADMIN_USERNAME"
else
  mark_missing "ADMIN_USERNAME (Admin username for authentication)"
fi

if [ -n "${ADMIN_PASSWORD:-}" ]; then
  mark_ok "ADMIN_PASSWORD"
else
  mark_missing "ADMIN_PASSWORD (Admin password for authentication)"
fi

echo ""
echo "======================================================================"
echo "Optional Variables (Warnings Only)"
echo "======================================================================"

# Optional variables
if [ -n "${GEMINI_API_KEY:-}" ]; then
  mark_ok "GEMINI_API_KEY"
else
  mark_optional "GEMINI_API_KEY (For AI features)"
fi

if [ -n "${NEYNAR_API_KEY:-}" ]; then
  mark_ok "NEYNAR_API_KEY"
else
  mark_optional "NEYNAR_API_KEY (For Farcaster integration)"
fi

if [ -n "${QUICKNODE_RPC_URL:-}" ]; then
  mark_ok "QUICKNODE_RPC_URL"
else
  mark_optional "QUICKNODE_RPC_URL (For enhanced RPC features)"
fi

if [ -n "${DB_HOST:-}" ]; then
  mark_ok "DB_HOST"
else
  mark_optional "DB_HOST (Database host for persistence)"
fi

if [ -n "${DB_PORT:-}" ]; then
  mark_ok "DB_PORT"
else
  mark_optional "DB_PORT (Database port)"
fi

if [ -n "${DB_USER:-}" ]; then
  mark_ok "DB_USER"
else
  mark_optional "DB_USER (Database user)"
fi

if [ -n "${DB_PASSWORD:-}" ]; then
  mark_ok "DB_PASSWORD"
else
  mark_optional "DB_PASSWORD (Database password)"
fi

if [ -n "${DB_NAME:-}" ]; then
  mark_ok "DB_NAME"
else
  mark_optional "DB_NAME (Database name)"
fi

echo ""
echo "======================================================================"
echo "Summary"
echo "======================================================================"
echo "✅ Variables OK: $TOTAL_OK"
echo "❌ Required Missing: $MISSING_REQUIRED"
echo "⚠️  Optional Missing: $MISSING_OPTIONAL"
echo ""

if [ $MISSING_REQUIRED -gt 0 ]; then
  echo "❌ Validation FAILED: $MISSING_REQUIRED required variable(s) missing"
  echo ""
  echo "💡 Next steps:"
  echo "   1. Copy .env.example to .env: cp .env.example .env"
  echo "   2. Fill in the required variables in .env"
  echo "   3. Run this check again: bash scripts/env-check.sh"
  echo ""
  exit 1
else
  echo "✅ All required environment variables are present!"
  if [ $MISSING_OPTIONAL -gt 0 ]; then
    echo "⚠️  Note: $MISSING_OPTIONAL optional variable(s) are missing (non-critical)"
  fi
  echo ""
  exit 0
fi
