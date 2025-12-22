#!/bin/bash

# ============================================================================
# Vercel to GitHub Actions Secret Sync Script
# ============================================================================
# Syncs all environment variables from Vercel to GitHub Actions secrets
# Prerequisites:
#   - Vercel CLI installed (npm i -g vercel)
#   - GitHub CLI installed (brew install gh)
#   - Authenticated to both services
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
VERCEL_PROJECT_NAME="gxq"
VERCEL_ORG_NAME="tradeos"
GITHUB_REPO="SMSDAO/reimagined-jupiter"
ENVIRONMENT="preview"  # preview, production, development

# Counters
SYNCED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                ║${NC}"
    echo -e "${CYAN}║     Vercel → GitHub Actions Secret Sync                       ║${NC}"
    echo -e "${CYAN}║                                                                ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo -e "${MAGENTA}▶${NC} $1"
}

# ============================================================================
# Prerequisite Checks
# ============================================================================

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Install with: npm i -g vercel"
        exit 1
    fi
    print_success "Vercel CLI found"
    
    # Check GitHub CLI
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI not found. Install with: brew install gh (macOS) or see https://cli.github.com"
        exit 1
    fi
    print_success "GitHub CLI found"
    
    # Check Vercel authentication
    if ! vercel whoami &> /dev/null; then
        print_error "Not authenticated to Vercel. Run: vercel login"
        exit 1
    fi
    print_success "Authenticated to Vercel as $(vercel whoami)"
    
    # Check GitHub authentication
    if ! gh auth status &> /dev/null; then
        print_error "Not authenticated to GitHub. Run: gh auth login"
        exit 1
    fi
    print_success "Authenticated to GitHub"
    
    echo ""
}

# ============================================================================
# Fetch Vercel Environment Variables
# ============================================================================

fetch_vercel_env() {
    print_step "Fetching environment variables from Vercel..."
    print_info "Project: $VERCEL_PROJECT_NAME (${VERCEL_ORG_NAME})"
    print_info "Environment: $ENVIRONMENT"
    echo ""
    
    # Pull Vercel environment
    if ! vercel env pull .env.vercel --environment="$ENVIRONMENT" --yes &> /dev/null; then
        print_error "Failed to pull Vercel environment variables"
        print_info "Make sure you're linked to the correct project"
        print_info "Run: vercel link"
        exit 1
    fi
    
    if [ ! -f .env.vercel ]; then
        print_error ".env.vercel file not created"
        exit 1
    fi
    
    print_success "Downloaded Vercel environment variables to .env.vercel"
    
    # Count variables
    local count=$(grep -c "^[A-Z]" .env.vercel || echo "0")
    print_info "Found $count environment variables"
    echo ""
}

# ============================================================================
# Sync to GitHub Secrets
# ============================================================================

sync_to_github() {
    print_step "Syncing to GitHub Actions secrets..."
    echo ""
    
    # Read .env.vercel file
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Parse KEY=VALUE
        if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
            KEY="${BASH_REMATCH[1]}"
            VALUE="${BASH_REMATCH[2]}"
            
            # Remove surrounding quotes
            VALUE="${VALUE%\"}"
            VALUE="${VALUE#\"}"
            VALUE="${VALUE%\'}"
            VALUE="${VALUE#\'}"
            
            # Skip if empty value
            if [ -z "$VALUE" ]; then
                print_warning "Skipping $KEY (empty value)"
                ((SKIPPED_COUNT++))
                continue
            fi
            
            # Skip Vercel internal variables
            if [[ "$KEY" =~ ^VERCEL_ ]]; then
                print_info "Skipping $KEY (Vercel internal)"
                ((SKIPPED_COUNT++))
                continue
            fi
            
            # Sync to GitHub
            echo -n "  Syncing $KEY... "
            if echo "$VALUE" | gh secret set "$KEY" --repo="$GITHUB_REPO" 2>/dev/null; then
                echo -e "${GREEN}✓${NC}"
                ((SYNCED_COUNT++))
            else
                echo -e "${RED}✗${NC}"
                print_error "Failed to set secret: $KEY"
                ((ERROR_COUNT++))
            fi
        fi
    done < .env.vercel
    
    echo ""
}

# ============================================================================
# Verify Critical Secrets
# ============================================================================

verify_critical_secrets() {
    print_step "Verifying critical secrets..."
    echo ""
    
    CRITICAL_SECRETS=(
        "VERCEL_TOKEN"
        "VERCEL_ORG_ID"
        "VERCEL_PROJECT_ID"
        "NEXT_PUBLIC_HELIUS_RPC"
        "NEXT_PUBLIC_QUICKNODE_RPC"
        "JWT_SECRET"
        "ADMIN_PASSWORD"
        "CRON_SECRET"
    )
    
    for SECRET in "${CRITICAL_SECRETS[@]}"; do
        if gh secret list --repo="$GITHUB_REPO" | grep -q "^$SECRET"; then
            print_success "$SECRET is set"
        else
            print_warning "$SECRET is NOT set (you may need to add this manually)"
        fi
    done
    
    echo ""
}

# ============================================================================
# Cleanup
# ============================================================================

cleanup() {
    print_step "Cleaning up..."
    
    if [ -f .env.vercel ]; then
        rm .env.vercel
        print_success "Removed temporary .env.vercel file"
    fi
    
    echo ""
}

# ============================================================================
# Summary
# ============================================================================

print_summary() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                         SYNC SUMMARY                           ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}Synced:${NC}  $SYNCED_COUNT secrets"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED_COUNT secrets"
    echo -e "  ${RED}Errors:${NC}  $ERROR_COUNT secrets"
    echo ""
    
    if [ $ERROR_COUNT -eq 0 ]; then
        print_success "All secrets synced successfully!"
        echo ""
        print_info "Next steps:"
        echo "  1. Verify secrets at: https://github.com/$GITHUB_REPO/settings/secrets/actions"
        echo "  2. Add any missing critical secrets manually"
        echo "  3. Test your GitHub Actions workflows"
    else
        print_error "Some secrets failed to sync"
        print_info "Please check the errors above and sync manually if needed"
    fi
    
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    print_header
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment|-e)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --project|-p)
                VERCEL_PROJECT_NAME="$2"
                shift 2
                ;;
            --org|-o)
                VERCEL_ORG_NAME="$2"
                shift 2
                ;;
            --repo|-r)
                GITHUB_REPO="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -e, --environment ENV    Vercel environment (preview, production, development)"
                echo "  -p, --project PROJECT    Vercel project name"
                echo "  -o, --org ORG           Vercel organization name"
                echo "  -r, --repo REPO         GitHub repository (owner/name)"
                echo "  -h, --help              Show this help message"
                echo ""
                echo "Example:"
                echo "  $0 --environment preview --project gxq --org tradeos"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Run '$0 --help' for usage information"
                exit 1
                ;;
        esac
    done
    
    # Confirm with user
    echo -e "${YELLOW}This will sync environment variables from:${NC}"
    echo "  Vercel: $VERCEL_ORG_NAME/$VERCEL_PROJECT_NAME ($ENVIRONMENT)"
    echo "  To GitHub: $GITHUB_REPO"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Cancelled by user"
        exit 0
    fi
    
    echo ""
    
    # Execute sync
    check_prerequisites
    fetch_vercel_env
    sync_to_github
    verify_critical_secrets
    cleanup
    print_summary
}

# Trap errors
trap 'print_error "Script failed on line $LINENO"; cleanup; exit 1' ERR

# Run main function
main "$@"
