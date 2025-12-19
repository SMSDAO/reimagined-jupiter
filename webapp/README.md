# GXQ Studio WebApp 🚀

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SMSDAO/reimagined-jupiter)

The most advanced Solana DeFi platform with comprehensive trading, staking, and token launch capabilities.

## ✨ Features

### 🎨 UI/UX Enhancements
- 🌓 **Dark/Light Mode** - Smooth theme switching with persistent preferences
- 💫 **Neon Glow Effects** - Blue, purple, green, pink aura effects
- 🎭 **3D Animations** - Solana-style digital FX with smooth transitions
- 📱 **Fully Responsive** - Optimized for mobile, tablet, and desktop
- ⚡ **Modern Design** - Card hover effects, smooth animations, glass morphism

### 💰 DeFi Features
- 🔄 **Jupiter Swap Integration** - Best rates across all Solana DEXs with dynamic slippage
- ⚡ **Flash Loan Arbitrage** - 5-10 providers with 0.09%-0.20% fees, MEV protection
- 🎯 **Advanced Sniper Bot** - Monitor Pump.fun + 8-22 DEX programs with auto-execution
- 🚀 **Token Launchpad Studio** - Deploy tokens on Jupiter, Raydium, Pump.fun
- 🎰 **Airdrop Spin Game** - 12-hour cooldown system with progressive rewards
- 🎁 **Airdrop Checker** - Auto-claim with advanced wallet scoring (WHALE, DEGEN, ACTIVE tiers)
- 💎 **Multi-Protocol Staking** - Marinade, Lido, Jito, Kamino integration

### 🎰 Airdrop Game Features
- 12-hour cooldown between spins
- Strike system tracking (reduce wait time after 3 days)
- 5 prize tiers with weighted probability
- Progressive cooldown reduction (up to 50% faster)
- Local storage for persistent game state

### 📚 Developer Tools
- 📖 **API Documentation** - Comprehensive docs for Swap, Ultra, Lend, Trigger, Price APIs
- 🛠️ **Visual SDK** - Accurate pricing, smart slippage, low fees
- 🔗 **15+ Protocol Integration** - Jupiter, Raydium, Orca, Kamino, Solend, and more
- 📊 **Real-time Data** - Live market prices and accurate fee calculations

### 🔐 Security & Compliance
- ⚖️ **Terms of Service** - Complete legal terms and risk disclosure
- 🔒 **Wallet Security** - Multi-wallet support with secure transactions
- 📝 **Risk Warnings** - Clear disclosure of trading risks
- ✅ **No Private Keys** - Never stores or transmits private keys

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter/webapp

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🌐 Live Deployment

Production: [https://jup-nine.vercel.app/](https://jup-nine.vercel.app/)

## 📦 Environment Variables

The webapp uses a **centralized configuration system** for all API endpoints. See [CENTRALIZED_CONFIG_GUIDE.md](./CENTRALIZED_CONFIG_GUIDE.md) for detailed documentation.

### Quick Setup

Create a `.env.local` file:

```env
# === RPC ENDPOINTS (Choose at least one) ===

# Option 1: Helius (Recommended for production)
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Option 2: QuickNode (Recommended for production)
NEXT_PUBLIC_QUICKNODE_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY

# Option 3: Public RPC (Free, rate-limited)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com

# === WALLET CONNECTION (Required) ===
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# === OPTIONAL API ENDPOINTS (Have defaults) ===
# Jupiter APIs (defaults to official endpoints)
NEXT_PUBLIC_JUPITER_QUOTE_API=https://quote-api.jup.ag/v6
NEXT_PUBLIC_JUPITER_PRICE_API=https://price.jup.ag/v6

# Pyth Network (defaults to official Hermes)
NEXT_PUBLIC_PYTH_HERMES_ENDPOINT=https://hermes.pyth.network
```

### Features

✅ **Automatic Configuration** - All API endpoints managed centrally  
✅ **Environment Detection** - Adapts to production/development automatically  
✅ **Multiple RPC Fallback** - Automatic failover between providers  
✅ **Validation** - Checks configuration on startup  
✅ **Settings UI** - View and validate configuration at `/settings`  

See `.env.example` for all available options.

## 🎯 SEO & Discoverability

The platform includes comprehensive SEO optimization:
- ✅ Unique meta keywords for Solana DeFi, Flash Loan, Jupiter Swap, etc.
- ✅ Open Graph tags for social sharing
- ✅ Twitter Card metadata
- ✅ Descriptive page titles and meta descriptions
- ✅ Optimized for search engines

## 🔧 Tech Stack

- **Framework**: Next.js 16.0.1 (App Router with Turbopack)
- **UI Libraries**: React 19.2.0, Framer Motion 12.23.24
- **Styling**: Tailwind CSS 4 with custom neon effects
- **3D Graphics**: Three.js 0.180.0, @react-three/fiber 9.4.0
- **Solana**: @solana/web3.js 1.98.4, @solana/wallet-adapter
- **DeFi**: Jupiter Aggregator API v6.0.45
- **TypeScript**: Full type safety

## 📱 Pages & Routes

- `/` - Home with animated feature cards
- `/swap` - Jupiter-powered token swaps
- `/arbitrage` - Flash loan arbitrage dashboard
- `/sniper` - Token launch sniper bot
- `/launchpad` - Token deployment with airdrop game
- `/airdrop` - Airdrop checker with wallet scoring
- `/staking` - Multi-protocol staking
- `/api-docs` - Comprehensive API documentation
- `/terms` - Terms of Service and legal information

## 🎨 Design System

### Color Palette
- **Purple**: Primary brand color (#9333ea, #a855f7)
- **Blue**: Secondary accent (#3b82f6, #60a5fa)
- **Green**: Success & positive (#10b981, #22c55e)
- **Pink**: Highlights & CTAs (#ec4899, #f472b6)

### Effects
- Neon glow with CSS box-shadow
- Aura border animations
- 3D card transforms
- Pulse animations
- Smooth color transitions

## 💰 Fee Structure

- 10% platform fee on profitable arbitrage trades
- 0.01 SOL token deployment fee for launchpad
- Standard network fees apply to all transactions
- Developer wallet: `monads.solana`

## 🤝 Wallet Support

- Phantom
- Solflare
- Backpack
- Ledger
- Trezor
- Coinbase Wallet
- Trust Wallet
- And more via Solana Wallet Adapter

## 📚 API Documentation

Full API documentation available at `/api-docs` with:
- **Swap API** - Token swap execution
- **Ultra API** - Advanced trading with MEV protection
- **Lend API** - Lending/borrowing across protocols
- **Trigger API** - Automated trading triggers
- **Price API** - Real-time price data

## 🛠️ Development Scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Create production build
npm start        # Start production server
npm run lint     # Run ESLint for code quality
```

## 📊 Platform Statistics

- **30+** Tokens Supported
- **8+** DEXs Integrated
- **5** Flash Loan Providers
- **15+** Protocol Integrations
- **10%** Dev Fee Structure

## 🎯 Affiliate Program

Earn GXQ tokens through the affiliate program:
- Share platform with your network
- Earn on referred trading volume
- Get exclusive perks and benefits

## 🔒 Security Best Practices

- ✅ Never share your private keys
- ✅ Always verify transaction details
- ✅ Use hardware wallets for large amounts
- ✅ Enable all wallet security features
- ✅ Review smart contract interactions

## 📖 Documentation

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🆘 Support & Issues

- **GitHub Issues**: [Create an issue](https://github.com/SMSDAO/reimagined-jupiter/issues)
- **Developer Wallet**: monads.solana

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Acknowledgments

- Jupiter Aggregator for swap integration
- Solana Foundation for blockchain infrastructure
- The DeFi community for support and feedback
- All protocol partners (Raydium, Orca, Kamino, etc.)

---

**Built with ❤️ by GXQ Studio** | **Deployed on Vercel** | **Powered by Solana**

*The most advanced Solana DeFi platform - Join the future of decentralized finance!*
