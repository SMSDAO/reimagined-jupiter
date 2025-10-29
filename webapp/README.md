# GXQ Studio WebApp

This is the Next.js web application for GXQ Studio - The most advanced Solana DeFi platform.

## Features

- 🔄 **Jupiter Swap Integration** - Best rates across all Solana DEXs
- 🎯 **Sniper Bot** - Monitor and snipe new token launches from Pump.fun + 8-22 DEX programs
- 🚀 **Token Launchpad** - Launch tokens with 3D airdrop roulette game
- 🎁 **Airdrop Checker** - Check eligibility and auto-claim with wallet scoring
- 💎 **Staking** - Stake SOL across Marinade, Lido, Jito, and Kamino
- ⚡ **Flash Loan Arbitrage** - 5-10 providers with 0.09%-0.20% fees

## Getting Started

```bash
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

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_RPC_URL=your_solana_rpc_url
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Solana Wallet Adapter** - Wallet connection
- **Jupiter API** - Swap aggregation
- **Framer Motion** - Animations

## Features Details

### Multi-Wallet Support
- Phantom
- Solflare
- Backpack
- Auto-detection of multiple wallets

### Responsive Design
- Mobile-optimized
- Tablet-optimized
- Desktop-optimized
- Modern 3D effects with Solana purple, blue, green theme

### Dev Fee System
10% of all profits automatically sent to: `monads.solana`

## License

MIT
