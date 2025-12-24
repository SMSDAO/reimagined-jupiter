#!/bin/bash
# ==============================================================================
# Azure Deployment Script
# ==============================================================================

set -e

echo "🚀 GXQ Studio - Azure Deployment"
echo "=================================="

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

echo "✅ Azure CLI found"

# Variables
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-gxq-studio-rg}"
LOCATION="${AZURE_LOCATION:-eastus}"
APP_NAME="${AZURE_APP_NAME:-gxq-studio}"
APP_SERVICE_PLAN="${AZURE_APP_SERVICE_PLAN:-gxq-studio-plan}"
SKU="${AZURE_SKU:-B1}"

echo ""
echo "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  App Name: $APP_NAME"
echo "  Service Plan: $APP_SERVICE_PLAN"
echo "  SKU: $SKU"
echo ""

# Login to Azure
echo "Logging into Azure..."
az login

# Create resource group
echo "Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Create App Service Plan
echo "Creating App Service Plan..."
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --sku "$SKU" \
  --is-linux

# Create Web App
echo "Creating Web App..."
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --runtime "NODE:20-lts"

# Configure deployment
echo "Configuring deployment..."
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    NODE_ENV=production \
    DEPLOYMENT_PLATFORM=azure \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true

# Set startup command
echo "Setting startup command..."
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "node dist/src/server.js"

# Configure health check
echo "Configuring health check..."
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --health-check-path "/api/health"

# Enable logging
echo "Enabling application logging..."
az webapp log config \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --application-logging filesystem \
  --level information

# Deploy from GitHub (optional)
echo ""
echo "To deploy from GitHub:"
echo "  az webapp deployment source config \\"
echo "    --name $APP_NAME \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --repo-url https://github.com/SMSDAO/reimagined-jupiter \\"
echo "    --branch main \\"
echo "    --manual-integration"
echo ""

# Get app URL
APP_URL=$(az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query defaultHostName -o tsv)

echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "App URL: https://$APP_URL"
echo "Health Check: https://$APP_URL/api/health"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Azure Portal"
echo "2. Deploy code (GitHub Actions or manual)"
echo "3. Monitor logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
