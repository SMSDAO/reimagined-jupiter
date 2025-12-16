# Deployment Guide - GXQ Studio

## Overview

This guide covers deploying both the backend CLI and the Next.js webapp to production environments.

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Git
- Solana wallet with SOL for transactions
- RPC endpoint (QuickNode recommended)

## Backend Deployment

### 1. Environment Setup

Create a `.env` file with your production configuration:

```env
# Solana Configuration
SOLANA_RPC_URL=https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/
WALLET_PRIVATE_KEY=your_base58_encoded_private_key

# QuickNode Configuration (Optional)
QUICKNODE_RPC_URL=https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/
QUICKNODE_API_KEY=your_api_key
QUICKNODE_FUNCTIONS_URL=your_functions_url
QUICKNODE_KV_URL=your_kv_url

# Flash Loan Provider Program IDs (Mainnet)
MARGINFI_PROGRAM_ID=MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA
SOLEND_PROGRAM_ID=So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo
MANGO_PROGRAM_ID=mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68
KAMINO_PROGRAM_ID=KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
PORT_FINANCE_PROGRAM_ID=Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR

# Jupiter Configuration
JUPITER_V6_PROGRAM_ID=JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4

# Arbitrage Configuration
MIN_PROFIT_THRESHOLD=0.003
MAX_SLIPPAGE=0.01
GAS_BUFFER=1.5

# Dev Fee Configuration
DEV_FEE_ENABLED=true
DEV_FEE_PERCENTAGE=0.10
DEV_FEE_WALLET=your_dev_fee_wallet_address
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Test Configuration

```bash
# Check system info
npm start

# Test price streaming
npm start prices

# Test enhanced scanner
npm start enhanced-scan
```

### 5. Production Execution

#### Option A: Direct Execution
```bash
# Start auto-execution
npm start start

# Or use enhanced scanner
npm start enhanced-scan
```

#### Option B: Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name "gxq-studio" -- start

# View logs
pm2 logs gxq-studio

# Monitor
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

#### Option C: Docker
```bash
# Build Docker image
docker build -t gxq-studio .

# Run container
docker run -d \
  --name gxq-studio \
  --env-file .env \
  --restart unless-stopped \
  gxq-studio
```

### 6. Monitoring

```bash
# Check status
pm2 status

# View real-time logs
pm2 logs gxq-studio --lines 100

# Monitor performance
pm2 monit
```

## Webapp Deployment to Vercel

### 1. Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository access
- RPC endpoint URL

### 2. Vercel Dashboard Deployment

1. Go to https://vercel.com/new
2. Import your GitHub repository: `SMSDAO/reimagined-jupiter`
3. **CRITICAL**: Set Root Directory to `webapp`
4. Configure environment variables:
   - `NEXT_PUBLIC_RPC_URL`: Your Solana RPC endpoint
5. Click "Deploy"

### 3. Vercel CLI Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from webapp directory
cd webapp
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_RPC_URL production
```

### 4. Environment Variables (Vercel)

Go to Project Settings → Environment Variables and add:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_RPC_URL` | Your Solana RPC endpoint | Production |

### 5. Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

## Security Best Practices

### Backend Security

1. **Never commit private keys**
   - Use `.env` file (excluded by `.gitignore`)
   - Rotate keys regularly
   - Use hardware wallets for high-value operations

2. **RPC Security**
   - Use private RPC endpoints (QuickNode)
   - Enable rate limiting
   - Monitor for unusual activity

3. **Access Control**
   - Restrict SSH access to production servers
   - Use firewall rules
   - Enable 2FA on all accounts

4. **Monitoring**
   - Set up alerts for failed transactions
   - Monitor wallet balance
   - Track arbitrage performance

### Webapp Security

1. **Environment Variables**
   - Never expose private keys in frontend
   - Use `NEXT_PUBLIC_` prefix only for safe variables
   - Keep RPC URLs in environment variables

2. **Wallet Security**
   - Users maintain custody of their keys
   - No server-side wallet storage
   - Use reputable wallet adapters only

3. **API Security**
   - Rate limit API endpoints
   - Validate all user inputs
   - Implement CORS properly

## Performance Optimization

### Backend

1. **RPC Optimization**
   - Use connection pooling
   - Implement request caching
   - Load balance across multiple RPCs

2. **Arbitrage Optimization**
   - Tune scan intervals (default: 1s)
   - Adjust minimum profit thresholds
   - Optimize gas parameters

3. **Memory Management**
   - Clear old opportunities from cache
   - Limit log file sizes
   - Monitor memory usage

### Webapp

1. **Build Optimization**
   - Already configured with Next.js 16
   - Static page generation enabled
   - Image optimization automatic

2. **Caching**
   - Use Vercel Edge caching
   - Implement service workers
   - Cache static assets

3. **Performance Monitoring**
   - Use Vercel Analytics
   - Monitor Core Web Vitals
   - Track user interactions

## Troubleshooting

### Backend Issues

**Issue: "Invalid wallet private key"**
- Ensure private key is base58 encoded
- Check for whitespace in `.env` file
- Verify key format matches Solana standard

**Issue: "Insufficient balance"**
- Check wallet has enough SOL for gas
- Verify token balances for trades
- Consider adding buffer to calculations

**Issue: "RPC connection failed"**
- Check RPC URL is correct
- Verify API key is valid
- Test network connectivity
- Try alternate RPC endpoint

**Issue: "No opportunities found"**
- Adjust minimum profit threshold
- Check market conditions
- Verify DEX integrations
- Review token list

### Webapp Issues

**Issue: "Wallet won't connect"**
- Check browser wallet extension is installed
- Verify network is set to mainnet
- Clear browser cache
- Try different wallet adapter

**Issue: "Build failed"**
- Check Node.js version (20+)
- Clear `.next` directory
- Delete `node_modules` and reinstall
- Verify environment variables

**Issue: "Slow load times"**
- Check Vercel deployment region
- Verify RPC endpoint latency
- Review bundle size
- Enable caching headers

## Maintenance

### Regular Tasks

1. **Daily**
   - Monitor transaction success rate
   - Check profit metrics
   - Review error logs
   - Verify wallet balance

2. **Weekly**
   - Update dependencies
   - Review security advisories
   - Backup configuration files
   - Analyze performance metrics

3. **Monthly**
   - Rotate API keys
   - Update documentation
   - Review and adjust strategies
   - Conduct security audit

### Updates

```bash
# Backend
cd /path/to/reimagined-jupiter
git pull origin main
npm install
npm run build
pm2 restart gxq-studio

# Webapp (Vercel auto-deploys from main)
git push origin main
# Monitor deployment at vercel.com
```

## Rollback Procedures

### Backend Rollback
```bash
# Stop current process
pm2 stop gxq-studio

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart gxq-studio
```

### Webapp Rollback
1. Go to Vercel Dashboard
2. Navigate to Deployments
3. Find previous successful deployment
4. Click "Promote to Production"

## Support

For issues and questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: README.md and feature-specific docs
- Community: Check project Discord/Telegram

## Monitoring Dashboard (Optional)

### Grafana Setup
```bash
# Install Grafana
docker run -d --name=grafana -p 3000:3000 grafana/grafana

# Configure data sources
# - Prometheus for metrics
# - Loki for logs
```

### Metrics to Monitor
- Transaction success rate
- Arbitrage profit/loss
- Gas costs
- RPC response times
- Wallet balance
- Opportunity frequency

## Conclusion

This deployment guide covers the essential steps for running GXQ Studio in production. Always test thoroughly on devnet/testnet before deploying to mainnet with real funds.

**Remember**: DeFi involves financial risk. Start with small amounts, monitor closely, and never invest more than you can afford to lose.
