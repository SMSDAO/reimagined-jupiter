#!/bin/bash
# ==============================================================================
# Coolify Deployment Script
# ==============================================================================

set -e

echo "🚀 GXQ Studio - Coolify Deployment"
echo "===================================="

# This script helps set up GXQ Studio on Coolify
# Coolify uses Docker Compose, so we'll use that configuration

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

echo "✅ docker-compose.yml found"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env from .env.example"
    cp .env.example .env
    echo "📝 Please edit .env with your configuration before starting"
fi

echo ""
echo "Coolify Setup Instructions:"
echo "============================"
echo ""
echo "1. In Coolify Dashboard:"
echo "   - Create new Service > Docker Compose"
echo "   - Paste docker-compose.yml content"
echo "   - Set up environment variables from .env"
echo ""
echo "2. Required Environment Variables:"
echo "   - SOLANA_RPC_URL"
echo "   - WALLET_PRIVATE_KEY"
echo "   - ADMIN_USERNAME"
echo "   - ADMIN_PASSWORD"
echo "   - JWT_SECRET"
echo ""
echo "3. Optional Services (use profiles):"
echo "   - Database: --profile with-db"
echo "   - Cache: --profile with-cache"
echo "   - Monitoring: --profile monitoring"
echo ""
echo "4. Port Configuration:"
echo "   - Backend: 3000"
echo "   - Webapp: 3001"
echo "   - Prometheus: 9090 (if monitoring enabled)"
echo "   - Grafana: 3002 (if monitoring enabled)"
echo ""
echo "5. Health Checks:"
echo "   - Backend: http://backend:3000/api/health"
echo "   - Webapp: http://webapp:3000/"
echo ""
echo "6. Start Services:"
echo "   docker-compose up -d"
echo ""
echo "7. View Logs:"
echo "   docker-compose logs -f"
echo ""
echo "✅ Configuration ready for Coolify"
