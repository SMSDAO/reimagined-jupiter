# 🚀 GXQ Studio - Complete Deployment Guide

This guide covers all deployment options for the GXQ Studio Solana Trading Bot System.

## 📋 Prerequisites

- Node.js 18+ installed
- Solana wallet with SOL for trading
- RPC endpoint (Helius, QuickNode, or Triton recommended)
- Git installed

## 🔧 Initial Setup

### 1. Clone and Install

```bash
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter
npm install
```

### 2. Environment Configuration

Run the interactive setup script:

```bash
npm run setup-env
```

This will prompt you for:
- Solana RPC URL
- Wallet private key (base58 format)
- Minimum profit threshold
- Maximum slippage tolerance
- Admin credentials
- Dev fee configuration

**Security Note:** Your `.env` file contains sensitive data. Never commit it to version control.

### 3. Build the Project

```bash
npm run build
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Serverless)

Vercel provides serverless functions with cron job support for automated trading.

#### Features:
- ✅ Automatic cron-based monitoring (every 1 minute)
- ✅ Automated trade execution (every 5 minutes)
- ✅ Zero-downtime deployments
- ✅ Built-in HTTPS and CDN
- ✅ Free tier available

#### Deploy to Vercel:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
npm run deploy:vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add all variables from your `.env` file
   - Deploy again to apply changes

#### Vercel Configuration:

The `vercel.json` file configures:
- Cron jobs for monitoring and execution
- Serverless function settings
- API routes and rewrites

**Important:** Vercel cron jobs require a paid plan ($20/month).

#### Test Deployment:

```bash
# Health check
curl https://your-project.vercel.app/api/health

# Monitor endpoint (triggered by cron)
curl https://your-project.vercel.app/api/monitor

# Admin metrics (requires JWT token)
curl https://your-project.vercel.app/api/admin/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Option 2: Railway (Recommended for 24/7 Running)

Railway provides 24/7 continuous process hosting with automatic restarts.

#### Features:
- ✅ Continuous 24/7 monitoring
- ✅ Automatic restarts on failure
- ✅ Built-in metrics and logging
- ✅ PostgreSQL database support
- ✅ Free tier: $5 credit/month

#### Deploy to Railway:

1. Run deployment script:
```bash
npm run deploy:railway
```

2. Or manually:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init --name gxq-jupiter-bot

# Set environment variables
railway variables set SOLANA_RPC_URL=your_rpc_url
railway variables set WALLET_PRIVATE_KEY=your_key
# ... (set all variables from .env)

# Deploy
railway up
```

#### Railway Configuration:

The system automatically:
- Starts Express server on port 3000
- Runs continuous monitoring loop
- Scans for opportunities every 5 seconds
- Executes profitable trades automatically
- Provides health check endpoint

#### Monitor Your Bot:

```bash
# View logs
railway logs

# Check status
railway status

# Get domain
railway domain
```

#### API Endpoints:

```bash
# Health check
curl https://your-app.railway.app/api/health

# Bot metrics
curl https://your-app.railway.app/api/metrics

# Control bot
curl -X POST https://your-app.railway.app/api/control \
  -H "Content-Type: application/json" \
  -d '{"command":"stop"}'  # or "start", "pause", "resume"
```

---

### Option 3: Docker (Any Cloud Platform)

Docker provides portable deployment to any cloud platform.

#### Build Docker Image:

```bash
docker build -t gxq-bot .
```

#### Run Locally:

```bash
docker run -d \
  --name gxq-bot \
  -p 3000:3000 \
  --env-file .env \
  gxq-bot
```

#### Deploy to Cloud Platforms:

**AWS ECS:**
```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ECR_URL
docker tag gxq-bot:latest YOUR_ECR_URL/gxq-bot:latest
docker push YOUR_ECR_URL/gxq-bot:latest

# Create ECS task definition and service
aws ecs create-service ...
```

**Google Cloud Run:**
```bash
# Push to GCR
gcloud auth configure-docker
docker tag gxq-bot gcr.io/YOUR_PROJECT/gxq-bot
docker push gcr.io/YOUR_PROJECT/gxq-bot

# Deploy
gcloud run deploy gxq-bot \
  --image gcr.io/YOUR_PROJECT/gxq-bot \
  --platform managed \
  --set-env-vars="$(cat .env | xargs)"
```

**Azure Container Instances:**
```bash
# Push to ACR
az acr login --name YOUR_REGISTRY
docker tag gxq-bot YOUR_REGISTRY.azurecr.io/gxq-bot
docker push YOUR_REGISTRY.azurecr.io/gxq-bot

# Deploy
az container create \
  --resource-group YOUR_RG \
  --name gxq-bot \
  --image YOUR_REGISTRY.azurecr.io/gxq-bot \
  --environment-variables $(cat .env | xargs)
```

---

### Option 4: VPS / Dedicated Server

Deploy to any VPS (DigitalOcean, Linode, Vultr, etc.)

#### Setup:

1. SSH into your server:
```bash
ssh user@your-server-ip
```

2. Install Node.js 18+:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone and setup:
```bash
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter
npm install
npm run build
```

4. Copy your `.env` file to the server

5. Run with PM2 (process manager):
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start npm --name "gxq-bot" -- run start:railway

# Save PM2 configuration
pm2 save

# Setup auto-start on reboot
pm2 startup
```

6. Monitor with PM2:
```bash
pm2 status
pm2 logs gxq-bot
pm2 restart gxq-bot
```

---

## 🔐 Security Best Practices

### Environment Variables

Never expose these in public repositories:
- `WALLET_PRIVATE_KEY` - Your trading wallet private key
- `JWT_SECRET` - Admin authentication secret
- `ADMIN_PASSWORD` - Admin panel password

### Wallet Security

1. **Use a dedicated trading wallet** - Don't use your main wallet
2. **Fund with limited amount** - Only keep necessary trading capital
3. **Regular withdrawals** - Move profits to cold storage regularly
4. **Monitor activity** - Set up alerts for unusual transactions

### API Keys

1. **Rotate secrets regularly** - Change JWT_SECRET monthly
2. **Use strong passwords** - Minimum 12 characters, mixed case, numbers, symbols
3. **Enable 2FA** - If your RPC provider supports it
4. **Rate limiting** - Already configured (5 attempts per 15 minutes)

### Network Security

1. **Use HTTPS only** - All platforms default to HTTPS
2. **Restrict admin access** - Use VPN or IP whitelist if possible
3. **Monitor logs** - Check for suspicious authentication attempts
4. **Update regularly** - Keep dependencies up to date

---

## 📊 Monitoring & Maintenance

### Health Checks

All deployment options expose `/api/health`:

```bash
curl https://your-app/api/health
```

Response:
```json
{
  "status": "healthy",
  "rpcLatency": 150,
  "walletBalance": 1.5,
  "walletAddress": "...",
  "jupiterApiStatus": "online",
  "uptime": 86400,
  "errorRate": 0.5
}
```

### Metrics Endpoint

Monitor trading performance at `/api/metrics`:

```json
{
  "success": true,
  "metrics": {
    "profitToday": 0.1234,
    "profitWeek": 0.5678,
    "profitMonth": 2.3456,
    "tradesCount": 15,
    "successRate": 93.3,
    "avgProfit": 0.0156,
    "opportunities24h": 45,
    "avgExecutionTime": 1250
  }
}
```

### Logging

View logs based on deployment:

**Vercel:**
```bash
vercel logs
```

**Railway:**
```bash
railway logs --tail
```

**Docker:**
```bash
docker logs -f gxq-bot
```

**PM2:**
```bash
pm2 logs gxq-bot
```

### Alerts

Set up alerts for:
- Low wallet balance (< 0.1 SOL)
- High error rate (> 10%)
- RPC connection failures
- Failed trades

---

## 🎯 Admin Panel

Access the admin panel at:
```
https://your-app/admin
```

### Login

Use credentials from your `.env` file:
- Username: `ADMIN_USERNAME`
- Password: `ADMIN_PASSWORD`

### Features

- **Bot Control**: Start, stop, pause, resume
- **Live Opportunities**: Real-time arbitrage opportunities
- **Trade History**: All executed trades with details
- **Wallet Scoring**: Analyze wallet trading activity
- **Portfolio Analysis**: Track your token holdings
- **Configuration**: Adjust profit threshold, slippage, strategies

---

## 🔧 Troubleshooting

### Build Errors

**Problem:** TypeScript compilation errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### RPC Connection Issues

**Problem:** "RPC connection failed"

**Solution:**
1. Verify RPC URL is correct
2. Check RPC service status
3. Try alternative RPC endpoint
4. Verify API key (if required)

### Insufficient Balance

**Problem:** "Insufficient wallet balance"

**Solution:**
1. Check wallet balance: `solana balance YOUR_ADDRESS`
2. Minimum 0.01 SOL required
3. Add more SOL for trading and fees

### JWT Token Errors

**Problem:** "Invalid token" or "Token expired"

**Solution:**
1. Re-login to admin panel
2. Regenerate JWT_SECRET if compromised
3. Clear browser cookies

### Docker Issues

**Problem:** Container not starting

**Solution:**
```bash
# Check logs
docker logs gxq-bot

# Rebuild
docker build --no-cache -t gxq-bot .

# Verify environment variables
docker run --rm gxq-bot env | grep SOLANA
```

---

## 💰 Cost Estimates

### Vercel
- **Free Tier:** Limited (100 GB bandwidth, 100 GB build time)
- **Pro Plan:** $20/month (cron jobs included)
- **Recommended for:** Low-frequency trading, testing

### Railway
- **Free Tier:** $5 credit/month (~100 hours)
- **Paid:** $0.000231/min ($10/month for 24/7)
- **Recommended for:** 24/7 continuous trading

### Docker on Cloud
- **AWS ECS Fargate:** ~$15/month (0.25 vCPU, 0.5 GB)
- **Google Cloud Run:** ~$5/month (minimal usage)
- **Azure Container Instances:** ~$12/month
- **Recommended for:** Enterprise deployments

### VPS
- **DigitalOcean:** $6/month (1 vCPU, 1 GB)
- **Linode:** $5/month (1 vCPU, 1 GB)
- **Vultr:** $6/month (1 vCPU, 1 GB)
- **Recommended for:** Full control, multiple bots

### RPC Costs
- **Free (Public):** Limited, unreliable
- **Helius:** $50/month (250k credits)
- **QuickNode:** $49/month (enterprise features)
- **Triton:** Custom pricing

**Total Monthly Cost (Railway + Helius):** ~$60/month

---

## 📈 Performance Optimization

### RPC Selection
- Use premium RPC (Helius, QuickNode, Triton)
- Enable connection pooling
- Implement failover to backup RPC

### Profit Threshold
- Start conservative: 0.5-1% minimum profit
- Monitor success rate
- Adjust based on market conditions

### Slippage Tolerance
- Default: 1%
- High volatility: Increase to 2-3%
- Stable pairs: Decrease to 0.5%

### Scan Frequency
- Vercel: 1-5 minutes (cron limitation)
- Railway/VPS: 5-10 seconds (continuous)
- Balance speed vs. RPC costs

---

## 🆘 Support

### Resources
- [GitHub Issues](https://github.com/SMSDAO/reimagined-jupiter/issues)
- [Documentation](./README.md)
- [Security Guide](./SECURITY_GUIDE.md)

### Community
- Discord: [Join Server]
- Telegram: [@gxqstudio]
- Twitter: [@gxqstudio]

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details

---

**⚠️ Disclaimer:** Trading cryptocurrencies involves substantial risk of loss. This bot does not guarantee profits. Use at your own risk. Only invest what you can afford to lose. Not financial advice.
