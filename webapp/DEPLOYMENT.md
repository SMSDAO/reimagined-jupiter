# GXQ Studio - Deployment Guide

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SMSDAO/reimagined-jupiter)

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git
- Vercel account (free tier works)

## 🛠️ Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter/webapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the webapp directory:

```env
# Solana RPC (Optional - uses public endpoint by default)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# QuickNode RPC (Optional - for better performance)
NEXT_PUBLIC_QUICKNODE_RPC_URL=your_quicknode_url_here

# Network (mainnet-beta, devnet, testnet)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# Developer Wallet for Fee Collection
NEXT_PUBLIC_DEV_WALLET=monads.solana
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `webapp` directory as root
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from webapp directory
cd webapp
vercel

# Deploy to production
vercel --prod
```

### Environment Variables on Vercel

Add the following environment variables in your Vercel project settings:

- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_QUICKNODE_RPC_URL` (optional)
- `NEXT_PUBLIC_SOLANA_NETWORK`
- `NEXT_PUBLIC_DEV_WALLET`

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🎨 Features

### Core Features
- ✅ Dark/Light mode with smooth transitions
- ✅ Neon glow effects (blue, purple, green, pink)
- ✅ 3D Solana-style animations
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Jupiter Swap integration
- ✅ Token Launchpad with airdrop spin game
- ✅ Flash loan arbitrage platform
- ✅ Sniper bot for new launches
- ✅ Comprehensive API documentation
- ✅ Terms of Service

### Advanced Features
- 🎰 Airdrop spin game with 12-hour cooldown
- ⚡ Progressive cooldown reduction (3-day streak system)
- 🌐 Multi-platform integration (Jupiter, Raydium, Pump.fun)
- 📊 Real-time price data and slippage calculation
- 🔐 Wallet adapter with multiple wallet support
- 💎 NFT staking integration

## 🔧 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Framer Motion
- **Styling**: Tailwind CSS 4
- **3D Graphics**: Three.js, @react-three/fiber
- **Solana**: @solana/web3.js, @solana/wallet-adapter
- **DeFi**: Jupiter Aggregator API v6

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🌍 Live Deployment

Production URL: [https://jup-nine.vercel.app/](https://jup-nine.vercel.app/)

## 🎯 SEO & Metadata

The platform includes comprehensive SEO optimization:
- Unique meta keywords
- Open Graph tags
- Twitter Card metadata
- Descriptive page titles
- Structured data ready

## 🔐 Security

- No private keys are stored or transmitted
- All transactions require wallet signature
- Smart contract interactions are transparent
- Terms of Service with risk disclosure
- Regular security audits recommended

## 💰 Fee Structure

- 10% platform fee on profitable trades
- 0.01 SOL token deployment fee
- Network fees apply to all transactions
- Developer wallet: `monads.solana`

## 📚 API Documentation

Full API documentation is available at `/api-docs` with schemas for:
- Swap API
- Ultra API (Advanced trading)
- Lend API
- Trigger API (Automated trading)
- Price API

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/SMSDAO/reimagined-jupiter/issues)
- Developer Wallet: monads.solana

## 🎉 Acknowledgments

- Jupiter Aggregator for swap integration
- Solana Foundation for blockchain infrastructure
- The DeFi community for inspiration and support

---

Built with ❤️ by GXQ Studio | Deployed on Vercel
