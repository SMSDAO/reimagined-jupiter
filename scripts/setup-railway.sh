#!/bin/bash

# Railway Setup Script
# Interactive wizard for setting up Railway deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Railway project ID (pre-configured)
RAILWAY_PROJECT_ID="2077acd9-f81f-47ba-b8c7-8bf6905f45fc"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}║      GXQ STUDIO - Railway Deployment Setup            ║${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print success message
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error message
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning message
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info message
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Railway CLI is installed
check_railway_cli() {
    print_info "Checking Railway CLI installation..."
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Installing..."
        
        # Install Railway CLI
        curl -fsSL https://railway.app/install.sh | sh
        
        # Add to PATH for current session
        export PATH="$HOME/.railway/bin:$PATH"
        
        # Verify installation
        if command -v railway &> /dev/null; then
            print_success "Railway CLI installed successfully"
        else
            print_error "Failed to install Railway CLI"
            exit 1
        fi
    else
        print_success "Railway CLI is already installed"
        railway --version
    fi
}

# Login to Railway
railway_login() {
    print_info "Checking Railway authentication..."
    
    # Try to list projects to check if authenticated
    if railway whoami &> /dev/null; then
        print_success "Already authenticated with Railway"
    else
        print_warning "Not authenticated with Railway"
        echo ""
        echo "Please authenticate with Railway..."
        railway login
        
        if railway whoami &> /dev/null; then
            print_success "Successfully authenticated with Railway"
        else
            print_error "Authentication failed"
            exit 1
        fi
    fi
}

# Link to Railway project
link_project() {
    print_info "Linking to Railway project..."
    print_info "Project ID: $RAILWAY_PROJECT_ID"
    
    railway link "$RAILWAY_PROJECT_ID"
    
    if [ $? -eq 0 ]; then
        print_success "Successfully linked to Railway project"
    else
        print_error "Failed to link to Railway project"
        exit 1
    fi
}

# Load environment variables from .env file
load_env_file() {
    if [ -f .env ]; then
        print_info "Loading environment variables from .env file..."
        set -a
        source .env
        set +a
        print_success "Environment variables loaded"
    else
        print_warning ".env file not found"
        echo "You can create one from .env.example:"
        echo "  cp .env.example .env"
    fi
}

# Set environment variables in Railway
set_railway_variables() {
    print_info "Setting environment variables in Railway..."
    echo ""
    
    # Ask if user wants to set variables from .env
    if [ -f .env ]; then
        read -p "Do you want to sync variables from .env file? (y/n): " sync_env
        if [[ $sync_env =~ ^[Yy]$ ]]; then
            load_env_file
        fi
    fi
    
    # Set required variables
    echo ""
    print_info "Setting required environment variables..."
    
    # SOLANA_RPC_URL
    if [ -z "$SOLANA_RPC_URL" ]; then
        read -p "Enter SOLANA_RPC_URL (QuickNode/Helius/Triton recommended): " SOLANA_RPC_URL
    fi
    railway variables --set "SOLANA_RPC_URL=$SOLANA_RPC_URL"
    print_success "SOLANA_RPC_URL set"
    
    # WALLET_PRIVATE_KEY
    if [ -z "$WALLET_PRIVATE_KEY" ]; then
        read -sp "Enter WALLET_PRIVATE_KEY (base58 format): " WALLET_PRIVATE_KEY
        echo ""
    fi
    railway variables --set "WALLET_PRIVATE_KEY=$WALLET_PRIVATE_KEY"
    print_success "WALLET_PRIVATE_KEY set"
    
    # ADMIN_USERNAME
    if [ -z "$ADMIN_USERNAME" ]; then
        read -p "Enter ADMIN_USERNAME: " ADMIN_USERNAME
    fi
    railway variables --set "ADMIN_USERNAME=$ADMIN_USERNAME"
    print_success "ADMIN_USERNAME set"
    
    # ADMIN_PASSWORD
    if [ -z "$ADMIN_PASSWORD" ]; then
        read -sp "Enter ADMIN_PASSWORD: " ADMIN_PASSWORD
        echo ""
    fi
    railway variables --set "ADMIN_PASSWORD=$ADMIN_PASSWORD"
    print_success "ADMIN_PASSWORD set"
    
    # JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        print_info "Generated JWT_SECRET automatically"
    fi
    railway variables --set "JWT_SECRET=$JWT_SECRET"
    print_success "JWT_SECRET set"
    
    # Set default configuration variables
    railway variables --set "NODE_ENV=production"
    railway variables --set "LOG_LEVEL=info"
    railway variables --set "MINIMUM_PROFIT_SOL=0.01"
    railway variables --set "MAX_SLIPPAGE=0.01"
    railway variables --set "DEV_FEE_ENABLED=true"
    railway variables --set "DEV_FEE_PERCENTAGE=0.10"
    
    print_success "All environment variables configured"
}

# Test deployment
test_deployment() {
    echo ""
    print_info "Testing deployment..."
    
    read -p "Do you want to deploy to Railway now? (y/n): " deploy_now
    
    if [[ $deploy_now =~ ^[Yy]$ ]]; then
        print_info "Deploying to Railway..."
        railway up --detach
        
        if [ $? -eq 0 ]; then
            print_success "Deployment initiated successfully"
            
            # Wait for deployment
            print_info "Waiting for deployment to complete (30 seconds)..."
            sleep 30
            
            # Get deployment URL
            DEPLOYMENT_URL=$(railway domain 2>&1 | grep -oP 'https://[^\s]+' | head -1)
            
            if [ -n "$DEPLOYMENT_URL" ]; then
                print_success "Deployment URL: $DEPLOYMENT_URL"
                
                # Test health endpoint
                print_info "Testing health endpoint..."
                HEALTH_URL="${DEPLOYMENT_URL}/api/health"
                
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
                
                if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "503" ]; then
                    print_success "Health check passed (HTTP $HTTP_CODE)"
                else
                    print_warning "Health check returned HTTP $HTTP_CODE"
                    echo "This might be normal if the app is still starting up."
                fi
            else
                print_warning "Could not retrieve deployment URL"
                print_info "Check Railway dashboard for deployment status"
            fi
        else
            print_error "Deployment failed"
            exit 1
        fi
    else
        print_info "Skipping deployment"
        echo "You can deploy later with: railway up"
    fi
}

# Display summary
display_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║      Setup Complete!                                   ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    print_success "Railway project configured successfully"
    print_info "Project ID: $RAILWAY_PROJECT_ID"
    echo ""
    echo "Next steps:"
    echo "  1. Review your configuration: railway variables"
    echo "  2. Deploy your application: railway up"
    echo "  3. View logs: railway logs"
    echo "  4. Open Railway dashboard: railway open"
    echo ""
    echo "Useful commands:"
    echo "  railway status    - Check deployment status"
    echo "  railway logs      - View application logs"
    echo "  railway domain    - Get deployment URL"
    echo "  railway variables - List environment variables"
    echo ""
    print_info "For more information, see docs/RAILWAY_DEPLOYMENT.md"
}

# Main setup flow
main() {
    # Step 1: Check Railway CLI
    check_railway_cli
    echo ""
    
    # Step 2: Login to Railway
    railway_login
    echo ""
    
    # Step 3: Link to project
    link_project
    echo ""
    
    # Step 4: Set environment variables
    set_railway_variables
    echo ""
    
    # Step 5: Test deployment
    test_deployment
    echo ""
    
    # Step 6: Display summary
    display_summary
}

# Run main function
main
