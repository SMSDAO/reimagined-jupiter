# Testing Guide

## Overview
This document outlines the testing procedures for the GXQ Studio platform, including both existing and new features.

## Prerequisites
- Node.js 18+ installed
- Solana wallet with devnet SOL
- Web browser (Chrome/Firefox/Safari)
- RPC endpoint access

## Setup

### Backend Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Required: SOLANA_RPC_URL, WALLET_PRIVATE_KEY

# Build
npm run build

# Test commands
npm start providers    # List flash loan providers
npm start scan         # Test arbitrage scanning
npm start airdrops     # Check airdrops
```

### Frontend Setup
```bash
# Navigate to webapp
cd webapp

# Install dependencies
npm install

# Set environment variables
echo "NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com" > .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## Testing Checklist

### ✅ Existing Features

#### 1. Home Page (/)
- [ ] Page loads successfully
- [ ] All feature cards display correctly
- [ ] Navigation links work
- [ ] Stats section displays
- [ ] Profitability section shows

#### 2. Jupiter Swap (/swap)
- [ ] Input fields render
- [ ] Token selection works
- [ ] Quote fetching displays
- [ ] Swap button enabled with wallet
- [ ] Error handling for invalid inputs

#### 3. Arbitrage (/arbitrage)
- [ ] Flash loan providers display
- [ ] Settings controls work
- [ ] Scan button functions
- [ ] Opportunities list populates
- [ ] Execute button shows for each opportunity
- [ ] MEV protection status indicators

#### 4. Sniper Bot (/sniper)
- [ ] Configuration panel loads
- [ ] DEX selection works
- [ ] Token monitoring starts
- [ ] Alerts display properly
- [ ] Auto-snipe toggle functions

#### 5. Token Launchpad (/launchpad)
- [ ] Token creation form renders
- [ ] 3D roulette animation works
- [ ] Airdrop configuration options
- [ ] Launch button functions
- [ ] Transaction feedback

#### 6. Airdrop Checker (/airdrop)
- [ ] Wallet connection check
- [ ] Airdrop list displays
- [ ] Claim buttons work
- [ ] Status updates correctly
- [ ] Transaction confirmations

#### 7. Staking (/staking)
- [ ] Protocol cards display
- [ ] APY information shows
- [ ] Stake/unstake forms work
- [ ] Balance updates
- [ ] Transaction execution

#### 8. Wallet Analysis (/wallet-analysis)
- [ ] Address input field works
- [ ] Analysis button functions
- [ ] Risk assessment displays
- [ ] Activity summary shows
- [ ] Token holdings table
- [ ] Wallet type classification

### ✅ New Features

#### 9. Settings (/settings)
- [ ] Page loads successfully
- [ ] Default providers display
- [ ] API rotation toggle works
- [ ] Rotation interval slider functions
- [ ] Add provider form validates input
- [ ] Provider type dropdown works
- [ ] Remove provider button functions
- [ ] Enable/disable toggle works
- [ ] Save locally button works
- [ ] Save on-chain button requires wallet
- [ ] Last saved timestamp displays
- [ ] Settings persist in localStorage
- [ ] Settings load on page refresh

**Test Cases:**
1. Add new RPC provider
2. Add Pyth feed provider
3. Add DEX provider
4. Toggle API rotation on/off
5. Adjust rotation interval
6. Save settings locally
7. Connect wallet and save on-chain
8. Verify transaction cost (0.000022 SOL)
9. Reload page and check persistence

#### 10. Admin Panel (/admin)
- [ ] Page loads successfully
- [ ] Bot status section displays
- [ ] Start/Stop bot button works (requires wallet)
- [ ] Uptime counter increments when running
- [ ] Profit tracking updates
- [ ] Trades executed counter
- [ ] Success rate displays
- [ ] Opportunity finder scanners listed
- [ ] DEX monitoring status shows
- [ ] Scan button triggers opportunity search
- [ ] Opportunities display with details
- [ ] Execute button works for opportunities
- [ ] Wallet scoring input field
- [ ] Score wallet button functions
- [ ] Scoring results display correctly
- [ ] Portfolio analysis button (requires wallet)
- [ ] Holdings table displays
- [ ] Total value calculation
- [ ] Timestamp shows

**Test Cases:**
1. Connect wallet
2. Start bot and verify status
3. Check uptime counter
4. Stop bot
5. Scan for opportunities
6. Execute an opportunity
7. Score a wallet address
8. Analyze portfolio
9. Verify price data from Pyth
10. Check transaction history integration

### 🔧 Integration Testing

#### Pyth Price Service
```bash
# Test in browser console on any page
import { getPythService } from '@/lib/pythPriceService';
const service = getPythService();
const price = await service.getPrice('SOL/USD');
console.log('SOL Price:', price);
```

**Test Cases:**
- [ ] Service initializes correctly
- [ ] Fetches SOL/USD price
- [ ] Fetches multiple prices in batch
- [ ] Handles invalid symbols gracefully
- [ ] Returns proper data structure

#### API Rotation Service
```bash
# Test in browser console
import { loadSettings } from '@/lib/apiRotation';
const settings = loadSettings();
console.log('Loaded settings:', settings);
```

**Test Cases:**
- [ ] Loads settings from localStorage
- [ ] Returns null when no settings exist
- [ ] Handles corrupted localStorage data
- [ ] Updates settings correctly
- [ ] Rotation interval works

### 🛡️ Security Testing

#### Wallet Connection
- [ ] Wallet adapter loads correctly
- [ ] Multiple wallet types supported
- [ ] Connection/disconnection works
- [ ] No private key exposure in logs
- [ ] Proper transaction signing flow

#### Transaction Validation
- [ ] All transactions show before signing
- [ ] Transaction costs display correctly
- [ ] Slippage protection works
- [ ] Failed transactions handled gracefully
- [ ] Success confirmations display

#### API Security
- [ ] No API keys in frontend code
- [ ] RPC endpoints configurable
- [ ] Rate limiting considerations
- [ ] Error messages don't leak sensitive info

### 📱 Responsive Testing

Test on multiple screen sizes:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Check:**
- [ ] Navigation menu responsive
- [ ] All forms usable on mobile
- [ ] Tables scroll horizontally
- [ ] Buttons are touch-friendly
- [ ] Text is readable

### 🎨 UI/UX Testing

- [ ] Consistent color scheme (purple, pink, blue gradients)
- [ ] Loading states display
- [ ] Error messages are clear
- [ ] Success feedback is visible
- [ ] Animations are smooth
- [ ] Tooltips are helpful
- [ ] Icons are meaningful

### ⚡ Performance Testing

- [ ] Initial page load < 3s
- [ ] Navigation transitions smooth
- [ ] No memory leaks
- [ ] API calls are optimized
- [ ] Images are optimized
- [ ] Build size is reasonable

### 🐛 Known Issues

Document any issues found during testing:

1. **Minor lint warnings** (non-blocking):
   - React Hook useEffect dependencies
   - Unused imports in swap page

2. **Backend build errors** (pre-existing):
   - Missing node_modules
   - TypeScript lib configuration

3. **Potential improvements**:
   - Add loading spinners for async operations
   - Implement error boundaries
   - Add retry logic for failed API calls

## Automated Testing

### Build Test
```bash
cd webapp
npm run build
```
Expected: No errors, all pages render

### Lint Test
```bash
cd webapp
npm run lint
```
Expected: 0 errors (warnings acceptable)

### Type Check
```bash
cd webapp
npx tsc --noEmit
```
Expected: No type errors

## Manual Testing Scripts

### Test All Routes
```javascript
// Run in browser console
const routes = [
  '/',
  '/swap',
  '/arbitrage',
  '/sniper',
  '/launchpad',
  '/airdrop',
  '/staking',
  '/wallet-analysis',
  '/settings',
  '/admin'
];

routes.forEach(route => {
  console.log(`Testing ${route}...`);
  window.location.href = route;
});
```

### Test Wallet Connection
```javascript
// Run on any page
const wallet = window.solana;
if (wallet) {
  await wallet.connect();
  console.log('Connected:', wallet.publicKey.toString());
} else {
  console.log('No wallet detected');
}
```

### Test localStorage
```javascript
// Check settings storage
const settings = localStorage.getItem('gxq-settings');
console.log('Settings:', JSON.parse(settings));
```

## Deployment Testing

### Vercel Deployment
1. Ensure `webapp` is set as root directory
2. Add environment variables in Vercel
3. Deploy and test all routes
4. Check build logs for errors
5. Test on production URL

### Environment Variables
Required for production:
- `NEXT_PUBLIC_RPC_URL`: Solana RPC endpoint

Optional:
- Custom Pyth endpoints
- Custom DEX APIs

## Reporting Issues

When reporting bugs, include:
1. Browser and version
2. Wallet type (if applicable)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Screenshots

## Success Criteria

All features pass testing when:
- ✅ No build errors
- ✅ All pages load successfully
- ✅ Wallet connection works
- ✅ Transactions execute properly
- ✅ Settings persist correctly
- ✅ Admin panel functions as expected
- ✅ No console errors during normal use
- ✅ Responsive design works on all devices
- ✅ Performance is acceptable

---

**Last Updated**: 2025-12-16

**Tested By**: Development Team

**Next Review**: Before production deployment
