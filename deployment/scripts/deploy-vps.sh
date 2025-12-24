#!/bin/bash
# ==============================================================================
# VPS Deployment Script
# Supports: Ubuntu 20.04+, Debian 11+, CentOS 8+
# ==============================================================================

set -e

echo "🚀 GXQ Studio - VPS Deployment"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo -e "${RED}Cannot detect OS${NC}"
    exit 1
fi

echo -e "${GREEN}Detected OS: $OS $VERSION${NC}"

# Step 1: Update system
echo -e "\n${YELLOW}Step 1: Updating system...${NC}"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update
    apt-get upgrade -y
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum update -y
fi

# Step 2: Install Node.js 20
echo -e "\n${YELLOW}Step 2: Installing Node.js 20...${NC}"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
fi

# Verify Node.js installation
node --version
npm --version

# Step 3: Install PM2
echo -e "\n${YELLOW}Step 3: Installing PM2...${NC}"
npm install -g pm2

# Step 4: Create application user
echo -e "\n${YELLOW}Step 4: Creating application user...${NC}"
if ! id "gxq" &>/dev/null; then
    useradd -m -s /bin/bash gxq
    echo -e "${GREEN}User 'gxq' created${NC}"
else
    echo -e "${YELLOW}User 'gxq' already exists${NC}"
fi

# Step 5: Clone repository
echo -e "\n${YELLOW}Step 5: Setting up application...${NC}"
APP_DIR="/home/gxq/reimagined-jupiter"

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Application directory exists, updating...${NC}"
    cd "$APP_DIR"
    sudo -u gxq git pull
else
    echo -e "${GREEN}Cloning repository...${NC}"
    sudo -u gxq git clone https://github.com/SMSDAO/reimagined-jupiter.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Step 6: Install dependencies
echo -e "\n${YELLOW}Step 6: Installing dependencies...${NC}"
sudo -u gxq npm ci
sudo -u gxq npm run build:backend

# Step 7: Setup environment
echo -e "\n${YELLOW}Step 7: Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    sudo -u gxq cp .env.example .env
    echo -e "${RED}⚠️  IMPORTANT: Edit /home/gxq/reimagined-jupiter/.env with your configuration${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Step 8: Setup PM2 process
echo -e "\n${YELLOW}Step 8: Setting up PM2 process...${NC}"
sudo -u gxq pm2 delete gxq-studio 2>/dev/null || true
sudo -u gxq pm2 start dist/src/server.js --name gxq-studio --time
sudo -u gxq pm2 save
pm2 startup systemd -u gxq --hp /home/gxq

# Step 9: Setup firewall (UFW)
echo -e "\n${YELLOW}Step 9: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 3000/tcp
    ufw --force enable
    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}UFW not found, skipping firewall configuration${NC}"
fi

# Step 10: Setup log rotation
echo -e "\n${YELLOW}Step 10: Setting up log rotation...${NC}"
cat > /etc/logrotate.d/gxq-studio <<EOF
/home/gxq/.pm2/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
EOF
echo -e "${GREEN}Log rotation configured${NC}"

# Print summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Edit environment: sudo nano /home/gxq/reimagined-jupiter/.env"
echo -e "2. Restart service: sudo -u gxq pm2 restart gxq-studio"
echo -e "3. View logs: sudo -u gxq pm2 logs gxq-studio"
echo -e "4. Monitor status: sudo -u gxq pm2 status"
echo -e "\n${YELLOW}Service management:${NC}"
echo -e "- Start: sudo -u gxq pm2 start gxq-studio"
echo -e "- Stop: sudo -u gxq pm2 stop gxq-studio"
echo -e "- Restart: sudo -u gxq pm2 restart gxq-studio"
echo -e "- Logs: sudo -u gxq pm2 logs gxq-studio"
echo -e "\n${YELLOW}Access your application at:${NC}"
echo -e "http://$(hostname -I | awk '{print $1}'):3000"
echo ""
