#!/bin/bash
# Environment setup script for GXQ Studio

set -e

echo "🚀 GXQ Studio - Environment Setup"
echo "=================================="
echo ""

# Function to generate random string
generate_secret() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Prompt for RPC URL
echo "Enter Solana RPC URL (Helius/QuickNode/Triton recommended):"
echo "Examples:"
echo "  - https://api.mainnet-beta.solana.com (free, rate limited)"
echo "  - https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
echo "  - https://example.solana-mainnet.quiknode.pro/YOUR_KEY/"
read -p "RPC URL: " RPC_URL

# Validate RPC URL
if [ -z "$RPC_URL" ]; then
  echo "❌ RPC URL cannot be empty"
  exit 1
fi

# Prompt for wallet private key
echo ""
echo "⚠️  SECURITY WARNING: Never share your private key!"
echo "Enter wallet private key (base58 format):"
echo "You can export this from Phantom/Solflare wallet settings"
read -sp "Private Key: " WALLET_KEY
echo ""

# Validate key format (basic check)
if [ -z "$WALLET_KEY" ]; then
  echo "❌ Private key cannot be empty"
  exit 1
fi

if ! [[ $WALLET_KEY =~ ^[1-9A-HJ-NP-Za-km-z]{87,88}$ ]]; then
  echo "⚠️  Warning: Private key format may be invalid (expected base58, 87-88 chars)"
  read -p "Continue anyway? (y/n): " CONTINUE
  if [ "$CONTINUE" != "y" ]; then
    exit 1
  fi
fi

# Prompt for min profit
echo ""
read -p "Minimum profit threshold (SOL) [default: 0.01]: " MIN_PROFIT
MIN_PROFIT=${MIN_PROFIT:-0.01}

# Validate min profit
if ! [[ $MIN_PROFIT =~ ^[0-9]+\.?[0-9]*$ ]]; then
  echo "❌ Invalid profit threshold"
  exit 1
fi

# Prompt for max slippage
echo ""
read -p "Maximum slippage tolerance (0.01 = 1%) [default: 0.01]: " MAX_SLIPPAGE
MAX_SLIPPAGE=${MAX_SLIPPAGE:-0.01}

# Admin credentials
echo ""
echo "Setup Admin Panel Credentials"
read -p "Admin username: " ADMIN_USER
if [ -z "$ADMIN_USER" ]; then
  echo "❌ Admin username cannot be empty"
  exit 1
fi

read -sp "Admin password: " ADMIN_PASS
echo ""

if [ -z "$ADMIN_PASS" ]; then
  echo "❌ Admin password cannot be empty"
  exit 1
fi

if [ ${#ADMIN_PASS} -lt 8 ]; then
  echo "❌ Admin password must be at least 8 characters"
  exit 1
fi

# Generate JWT secret
echo ""
echo "Generating secure JWT secret..."
JWT_SECRET=$(generate_secret)

# Dev fee configuration
echo ""
read -p "Enable dev fee? (y/n) [default: y]: " DEV_FEE_CHOICE
DEV_FEE_CHOICE=${DEV_FEE_CHOICE:-y}

if [ "$DEV_FEE_CHOICE" == "y" ]; then
  DEV_FEE_ENABLED="true"
  read -p "Dev fee percentage (0.10 = 10%) [default: 0.10]: " DEV_FEE_PCT
  DEV_FEE_PCT=${DEV_FEE_PCT:-0.10}
else
  DEV_FEE_ENABLED="false"
  DEV_FEE_PCT="0.00"
fi

# Generate .env file
echo ""
echo "Generating .env file..."

cat > .env << EOF
# Solana Configuration
SOLANA_RPC_URL=${RPC_URL}
WALLET_PRIVATE_KEY=${WALLET_KEY}
MINIMUM_PROFIT_SOL=${MIN_PROFIT}
MAX_SLIPPAGE=${MAX_SLIPPAGE}

# Admin Panel
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASS}
JWT_SECRET=${JWT_SECRET}

# Optional: QuickNode Configuration
# QUICKNODE_RPC_URL=your_quicknode_rpc_url
# QUICKNODE_API_KEY=your_quicknode_api_key

# Flash Loan Providers (using mainnet defaults)
MARGINFI_PROGRAM_ID=MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA
SOLEND_PROGRAM_ID=So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo
MANGO_PROGRAM_ID=mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68
KAMINO_PROGRAM_ID=KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
PORT_FINANCE_PROGRAM_ID=Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR

# Jupiter Configuration
JUPITER_V6_PROGRAM_ID=JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4

# Dev Fee Configuration
DEV_FEE_ENABLED=${DEV_FEE_ENABLED}
DEV_FEE_PERCENTAGE=${DEV_FEE_PCT}
DEV_FEE_WALLET=11111111111111111111111111111111

# Log Level
LOG_LEVEL=info

# Node Environment
NODE_ENV=production
EOF

echo "✅ .env file created successfully!"

# Test RPC connection
echo ""
echo "Testing RPC connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  "${RPC_URL}" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ RPC connection successful!"
else
  echo "⚠️  RPC connection test failed (HTTP ${HTTP_CODE})"
  echo "   The RPC URL might be incorrect or require authentication"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Review your .env file"
echo "  2. Run 'npm install' to install dependencies"
echo "  3. Run 'npm run build' to build the project"
echo "  4. Choose deployment option:"
echo "     • Local: npm run dev"
echo "     • Vercel: npm run deploy:vercel"
echo "     • Railway: npm run deploy:railway"
echo "     • Docker: docker build -t gxq-bot . && docker run gxq-bot"
echo ""
echo "🔐 IMPORTANT: Keep your .env file secure!"
echo "   Never commit it to version control"
echo ""
