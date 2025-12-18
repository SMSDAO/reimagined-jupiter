#!/bin/bash
# Railway deployment script for GXQ Studio

set -e

echo "🚂 Deploying to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "Railway CLI not found. Installing..."
  npm install -g @railway/cli
  echo "✅ Railway CLI installed"
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "   Run 'npm run setup-env' first to create your environment configuration"
  exit 1
fi

# Login to Railway
echo "Logging in to Railway..."
railway login

# Check if already linked to a project
if railway status &> /dev/null; then
  echo "✅ Already linked to Railway project"
  read -p "Deploy to existing project? (y/n): " DEPLOY_EXISTING
  
  if [ "$DEPLOY_EXISTING" != "y" ]; then
    echo "Creating new Railway project..."
    railway init
  fi
else
  # Create new project
  echo "Creating new Railway project..."
  read -p "Project name [default: gxq-jupiter-bot]: " PROJECT_NAME
  PROJECT_NAME=${PROJECT_NAME:-gxq-jupiter-bot}
  
  railway init --name "$PROJECT_NAME"
fi

# Set environment variables from .env
echo ""
echo "Setting environment variables..."

if [ -f .env ]; then
  # Read .env file and set variables
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi
    
    # Extract key=value
    if [[ "$line" =~ ^[[:space:]]*([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
      KEY="${BASH_REMATCH[1]}"
      VALUE="${BASH_REMATCH[2]}"
      
      # Remove quotes if present
      VALUE="${VALUE%\"}"
      VALUE="${VALUE#\"}"
      
      # Set variable in Railway
      echo "  Setting $KEY..."
      railway variables set "$KEY=$VALUE" --silent || echo "  ⚠️ Failed to set $KEY"
    fi
  done < .env
  
  echo "✅ Environment variables set"
else
  echo "⚠️  No .env file found, skipping environment variables"
fi

# Build and deploy
echo ""
echo "Deploying application..."
railway up

# Wait for deployment
echo ""
echo "Waiting for deployment to complete..."
sleep 5

# Get deployment status
echo ""
echo "Deployment Status:"
railway status

# Get deployment URL
echo ""
echo "Getting deployment URL..."
RAILWAY_URL=$(railway domain 2>/dev/null || echo "")

if [ -n "$RAILWAY_URL" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Deployment Complete!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🌐 Application URL: https://${RAILWAY_URL}"
  echo "🏥 Health Check: https://${RAILWAY_URL}/api/health"
  echo "📊 Metrics: https://${RAILWAY_URL}/api/metrics"
  echo ""
  echo "To view logs:"
  echo "  railway logs"
  echo ""
  echo "To stop the bot:"
  echo "  curl -X POST https://${RAILWAY_URL}/api/control -H 'Content-Type: application/json' -d '{\"command\":\"stop\"}'"
  echo ""
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Deployment Complete!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Run 'railway domain' to get your application URL"
  echo "Run 'railway logs' to view application logs"
  echo ""
fi

echo "📖 For more info: https://railway.app/dashboard"
echo ""
