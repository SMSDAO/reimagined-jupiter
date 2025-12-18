# ⚡ Quick Start Guide

Get your GXQ Studio Solana Trading Bot running in 5 minutes.

## 🎯 Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Solana Wallet** with some SOL (minimum 0.1 SOL recommended)
- **RPC Endpoint** - Get free tier from [Helius](https://helius.xyz/) or [QuickNode](https://quicknode.com/)

## 📦 Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter

# Install dependencies
npm install
```

## ⚙️ Step 2: Configure Environment

### Option A: Interactive Setup (Recommended)

```bash
npm run setup-env
```

Follow the prompts to configure:
- Solana RPC URL
- Wallet private key
- Trading parameters
- Admin credentials

### Option B: Manual Setup

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
SOLANA_RPC_URL=https://your-rpc-url
WALLET_PRIVATE_KEY=your_base58_private_key

# Trading
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_32_char_secret

# Optional: Dev Fee (10% of profits)
DEV_FEE_ENABLED=true
DEV_FEE_PERCENTAGE=0.10
```

## 🔨 Step 3: Build

```bash
npm run build
```

## 🚀 Step 4: Deploy

Choose your deployment platform:

### 🌐 Vercel (Serverless, Cron-based)

```bash
npm run deploy:vercel
```

**Features:**
- Automated scans every 1 minute
- Trades executed every 5 minutes
- Free tier available ($20/month for cron jobs)

### 🚂 Railway (24/7 Continuous)

```bash
npm run deploy:railway
```

**Features:**
- Continuous monitoring (5-second scans)
- Immediate trade execution
- $5 free credit/month

### 🐳 Docker (Any Platform)

```bash
docker build -t gxq-bot .
docker run -p 3000:3000 --env-file .env gxq-bot
```

### 💻 Local Development

```bash
# Start backend
npm run dev

# Start webapp (separate terminal)
cd webapp
npm run dev
```

Access webapp at `http://localhost:3000`

## 🎛️ Step 5: Access Admin Panel

1. Open your deployment URL + `/admin`
2. Login with your admin credentials
3. Click "Start Bot" to begin trading

## 📊 Monitoring

### Health Check

```bash
curl https://your-app.vercel.app/api/health
```

### Metrics

```bash
curl https://your-app.vercel.app/api/metrics
```

### View Logs

**Vercel:**
```bash
vercel logs
```

**Railway:**
```bash
railway logs
```

**Docker:**
```bash
docker logs -f gxq-bot
```

## 🎯 Next Steps

1. **Fund Your Wallet** - Add SOL for trading (0.1 SOL minimum)
2. **Monitor Performance** - Check admin panel regularly
3. **Adjust Settings** - Fine-tune profit threshold and slippage
4. **Scale Up** - Increase trading capital as you gain confidence

## 📚 Full Documentation

- [Complete Deployment Guide](./DEPLOYMENT.md) - All deployment options
- [Security Guide](./SECURITY_GUIDE.md) - Best practices
- [API Documentation](./API_DOCS.md) - API reference
- [Troubleshooting](./DEPLOYMENT.md#-troubleshooting) - Common issues

## ⚠️ Important Notes

### Security
- **Never commit `.env` to Git**
- **Use a dedicated trading wallet**
- **Start with small amounts**
- **Enable 2FA on your RPC provider**

### Trading
- **Not financial advice** - DYOR (Do Your Own Research)
- **High risk** - Only invest what you can afford to lose
- **Monitor regularly** - Check for unusual activity
- **Withdraw profits** - Move to cold storage regularly

### Performance
- **Premium RPC recommended** - Free RPCs are slow and unreliable
- **Network congestion** - Affects execution speed and costs
- **Market volatility** - Adjust slippage tolerance accordingly
- **Gas fees** - Factor into profitability calculations

## 🆘 Need Help?

- **Issues:** [GitHub Issues](https://github.com/SMSDAO/reimagined-jupiter/issues)
- **Discord:** [Join Community]
- **Docs:** [Full Documentation](./README.md)

## 🎉 Success Checklist

- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Project built successfully
- [ ] Deployed to platform
- [ ] Health check passing
- [ ] Admin panel accessible
- [ ] Bot started and monitoring
- [ ] First opportunity detected
- [ ] First trade executed successfully

---

**Happy Trading! 🚀**
