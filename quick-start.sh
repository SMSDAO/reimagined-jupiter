#!/bin/bash
# ==============================================================================
# GXQ Studio - Quick Start Script
# ==============================================================================
# This script helps you get started quickly with GXQ Studio
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                    GXQ Studio - Quick Start                         ║"
echo "║         Solana Flash Loan Arbitrage & DeFi Platform                ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${YELLOW}Select your deployment option:${NC}"
echo ""
echo "  1) Local Development (Node.js)"
echo "  2) Docker Compose (Production-like)"
echo "  3) Docker Compose (Development mode)"
echo "  4) VPS Deployment"
echo "  5) View all options"
echo "  6) Exit"
echo ""

read -p "Enter your choice [1-6]: " choice

case $choice in
  1)
    echo ""
    echo -e "${BLUE}Setting up Local Development Environment...${NC}"
    echo ""
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js 20+ first.${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${RED}Node.js 20+ is required. Current version: $(node --version)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node.js $(node --version) detected${NC}"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
        echo ""
        read -p "Press Enter to open .env in editor (or Ctrl+C to exit and edit manually)..."
        ${EDITOR:-nano} .env
    fi
    
    # Install dependencies
    echo ""
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
    
    # Build backend
    echo ""
    echo -e "${BLUE}Building backend...${NC}"
    npm run build:backend
    
    echo ""
    echo -e "${GREEN}✓ Setup complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Ensure your .env is configured correctly"
    echo "  2. Start the server: npm run start:server"
    echo "  3. Or use development mode: npm run dev:server"
    echo ""
    echo -e "${YELLOW}For webapp:${NC}"
    echo "  1. cd webapp"
    echo "  2. npm install"
    echo "  3. cp .env.example .env.local"
    echo "  4. npm run dev"
    echo ""
    ;;
    
  2)
    echo ""
    echo -e "${BLUE}Setting up Docker Compose (Production)...${NC}"
    echo ""
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker detected${NC}"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
        echo ""
        read -p "Press Enter to open .env in editor (or Ctrl+C to exit and edit manually)..."
        ${EDITOR:-nano} .env
    fi
    
    echo ""
    echo -e "${BLUE}Starting Docker containers...${NC}"
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✓ Docker containers started!${NC}"
    echo ""
    echo -e "${YELLOW}Access your services:${NC}"
    echo "  Backend: http://localhost:3000"
    echo "  Webapp: http://localhost:3001"
    echo "  Health: http://localhost:3000/api/health"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop: docker-compose down"
    echo "  Restart: docker-compose restart"
    echo ""
    ;;
    
  3)
    echo ""
    echo -e "${BLUE}Setting up Docker Compose (Development)...${NC}"
    echo ""
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker detected${NC}"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
        echo ""
        read -p "Press Enter to open .env in editor (or Ctrl+C to exit and edit manually)..."
        ${EDITOR:-nano} .env
    fi
    
    echo ""
    echo -e "${BLUE}Starting development containers with hot-reload...${NC}"
    docker-compose -f docker-compose.dev.yml up -d
    
    echo ""
    echo -e "${GREEN}✓ Development containers started!${NC}"
    echo ""
    echo -e "${YELLOW}Access your services:${NC}"
    echo "  Backend: http://localhost:3000"
    echo "  Webapp: http://localhost:3001"
    echo ""
    echo -e "${YELLOW}Features:${NC}"
    echo "  - Hot reload enabled"
    echo "  - Source code mounted as volumes"
    echo "  - Debug logging enabled"
    echo ""
    ;;
    
  4)
    echo ""
    echo -e "${BLUE}VPS Deployment${NC}"
    echo ""
    echo -e "${YELLOW}This will deploy GXQ Studio on a VPS server.${NC}"
    echo ""
    
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}This script must be run as root for VPS deployment.${NC}"
        echo "Please run: sudo $0"
        exit 1
    fi
    
    read -p "Continue with VPS deployment? [y/N]: " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        chmod +x deployment/scripts/deploy-vps.sh
        ./deployment/scripts/deploy-vps.sh
    else
        echo "Deployment cancelled."
    fi
    ;;
    
  5)
    echo ""
    echo -e "${BLUE}All Deployment Options:${NC}"
    echo ""
    echo -e "${YELLOW}Cloud Platforms:${NC}"
    echo "  • Vercel (Serverless) - Best for webapp"
    echo "  • Railway (Container) - Best for backend"
    echo "  • AWS Amplify/ECS - Enterprise scale"
    echo "  • Azure App Service - Microsoft cloud"
    echo "  • Alibaba Cloud - Asia/China deployments"
    echo ""
    echo -e "${YELLOW}Self-Hosted:${NC}"
    echo "  • Docker Compose - Simplest container setup"
    echo "  • Coolify - Self-hosted PaaS"
    echo "  • aaPanel - Control panel"
    echo "  • VPS - Full control with PM2 or systemd"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo "  • See DEPLOYMENT.md for detailed guides"
    echo "  • See deployment/README.md for quick reference"
    echo "  • Use 'make help' to see all available commands"
    echo ""
    echo -e "${YELLOW}Quick Commands:${NC}"
    echo "  make dev          - Start local development"
    echo "  make docker-up    - Start Docker containers"
    echo "  make deploy-vps   - Deploy to VPS"
    echo "  make help         - Show all commands"
    echo ""
    ;;
    
  6)
    echo ""
    echo -e "${BLUE}Exiting...${NC}"
    echo ""
    exit 0
    ;;
    
  *)
    echo ""
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                   Thank you for using GXQ Studio!                   ║"
echo "║                                                                      ║"
echo "║  Documentation: https://github.com/SMSDAO/reimagined-jupiter       ║"
echo "║  Issues: https://github.com/SMSDAO/reimagined-jupiter/issues       ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
