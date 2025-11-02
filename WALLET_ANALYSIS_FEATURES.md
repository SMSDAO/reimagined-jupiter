# Enhanced Wallet Analysis - Feature Documentation

## Overview

The Enhanced Wallet Analysis tool provides professional-grade wallet forensics with comprehensive risk assessment capabilities for the GXQ Studio Solana DeFi platform.

## 🎯 Core Features

### 1. Wallet Age & History
- **Wallet Age Calculation**: Computes days since first transaction from blockchain data
- **Creation Date Display**: Shows wallet creation in human-readable format
- **Transaction History**: Analyzes up to 1000 transaction signatures
- **SOL Volume Tracking**: Calculates total SOL transacted from last 50 transactions
- **Protocol Interactions**: Counts unique program IDs for diversity assessment

### 2. Risk Assessment Algorithm (0-100 Score)

The risk scoring system uses multiple detection rules:

#### Risk Factors:
| Factor | Condition | Score Impact |
|--------|-----------|--------------|
| Very New Wallet | < 7 days old | +20 points |
| New Wallet | < 30 days old | +10 points |
| Low Activity | < 10 transactions | +15 points |
| Honeypot Pattern | Balance > 10 SOL + < 20 transactions | +30 points |
| Airdrop Farmer | 0 swaps + > 10 transactions | +10 points |
| Bot Detection | > 20 NFT mints | +15 points |

#### Risk Levels:
- **Low Risk (0-25)**: Green border/background - Safe wallets
- **Medium Risk (26-50)**: Orange border/background - Monitor closely
- **High Risk (51-60)**: Red border/background - Exercise caution
- **Critical Risk (61+)**: Dark red border/background - Avoid interaction

### 3. Advanced Pattern Detection

#### Wallet Type Classification:

**👑 Founder/VC Wallet**
- Requirements:
  - Age > 365 days
  - Total transactions > 500
  - Unique protocols > 20
  - Total SOL transacted > 1000
- Characteristics: Established, high-volume, diverse protocol usage
- Risk Impact: Reduces risk score by 20 points

**🚨 Scam Wallet**
- Triggers:
  - Risk score > 60
  - Honeypot pattern detected
- Characteristics: Suspicious patterns, high risk indicators
- Risk Impact: Adds critical warning flag

**💹 Trader Wallet**
- Requirements:
  - Swap count > 50
- Characteristics: Active trading activity
- Risk Impact: Neutral

**🎨 NFT Collector Wallet**
- Requirements:
  - NFT mints > 20
  - OR NFT holdings (decimals=0, amount=1) > 20
- Characteristics: High NFT activity
- Risk Impact: Neutral

**👤 Regular Wallet**
- Default classification for wallets not matching above patterns

### 4. Activity Tracking

Monitors 5 key activity types:
- **🔄 Swaps**: Jupiter, Raydium, Orca interactions
- **💎 LP Stakes**: Marinade, Lido, Kamino interactions
- **🎁 Airdrops**: Token distribution events
- **🎨 NFT Mints**: Metaplex, Token Metadata program calls
- **💰 NFT Sales**: NFT marketplace transactions

### 5. Comprehensive Metrics Display

8-metric stats grid:
1. **Wallet Age**: Days + creation date
2. **SOL Balance**: Amount + USD value
3. **Total Transactions**: Historical count
4. **Total SOL Transacted**: Volume from last 50 txns
5. **Unique Protocols**: Protocol diversity score
6. **Token Accounts**: SPL token count
7. **Portfolio Value**: Estimated total value
8. **Wallet Type**: Classification with icon

## 🎨 UI/UX Features

### Color-Coded Risk Assessment Card
- Dynamic border and background colors based on risk level
- Risk score prominently displayed (0-100)
- Risk level label with matching color
- Risk flags listed with emoji indicators

### Professional Design Elements
- Gradient backgrounds (purple/pink/blue Solana theme)
- Smooth animations with Framer Motion
- Responsive grid layouts for all screen sizes
- Glass morphism effects with backdrop blur
- Hover effects on interactive elements

### Token Holdings Table
- Top 10 tokens displayed
- Shows mint address, symbol, balance, USD value
- Truncated addresses for readability
- Styled with alternating row colors

### External Integration
- Solscan link for detailed exploration
- Opens in new tab with security attributes
- URL-encoded to prevent XSS attacks

## 🔧 Technical Implementation

### Technology Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict type checking
- **Blockchain**: @solana/web3.js v1.98.4
- **UI Library**: React 19
- **Animations**: Framer Motion v12
- **Styling**: Tailwind CSS v4

### Data Sources
- **RPC Connection**: Configurable via NEXT_PUBLIC_RPC_URL
- **Transaction Data**: Solana blockchain via getSignaturesForAddress
- **Token Data**: SPL Token program via getParsedTokenAccountsByOwner
- **Balance Data**: Native SOL balance via getBalance

### Performance Optimizations
- Batch transaction processing
- Efficient signature fetching (limit: 1000)
- Error handling for failed transaction fetches
- Async/await for non-blocking operations

### Security Measures
- URL encoding for external links (prevents XSS)
- Input validation for wallet addresses
- Error message sanitization
- Secure external link attributes (noopener, noreferrer)

## 📊 Use Cases

### 1. Counterparty Risk Assessment
Before engaging in P2P trades or transactions:
- Check wallet age and history
- Review risk score and flags
- Verify wallet type classification
- Assess activity patterns

### 2. Airdrop Eligibility Verification
Determine if a wallet is farming airdrops:
- Look for airdrop farmer flag
- Check swap vs transaction ratio
- Review protocol diversity

### 3. Scam Detection
Identify potentially malicious wallets:
- High risk score (>60)
- Honeypot pattern detection
- Low activity with high balance
- Suspicious transaction patterns

### 4. Investment Research
Analyze Founder/VC wallets:
- Verify wallet age and legitimacy
- Check transaction volume
- Review protocol interactions
- Assess portfolio diversity

## 🚀 Future Enhancements

Potential improvements:
- Helius API integration for enhanced transaction parsing
- Real-time price feeds for accurate USD values
- Token metadata lookup for proper symbols
- Historical risk score tracking
- Wallet comparison feature
- Export analysis as PDF/CSV
- Bookmark favorite wallets
- Alert system for risk changes

## 📝 Notes

- Analysis accuracy depends on RPC endpoint reliability
- USD values are estimates based on fixed SOL price ($150)
- Token symbols default to "TOKEN" without metadata API
- Transaction parsing may skip failed fetches
- Risk scoring is heuristic-based and not definitive

## 🔗 Related Files

- **Main Component**: `/webapp/app/wallet-analysis/page.tsx`
- **Navigation**: `/webapp/components/Navigation.tsx`
- **Home Page**: `/webapp/app/page.tsx`

## 📚 API Reference

### analyzeWallet Function

Performs comprehensive wallet analysis:

```typescript
async analyzeWallet(): Promise<void>
```

Steps:
1. Validate wallet address (PublicKey)
2. Connect to RPC endpoint
3. Fetch balance, token accounts, signatures
4. Calculate wallet age from oldest signature
5. Process last 50 transactions for volume
6. Track unique program IDs
7. Detect activity patterns (swaps, stakes, NFTs)
8. Calculate risk score with multiple factors
9. Determine risk level and wallet type
10. Return comprehensive analysis object

### Risk Calculation

```typescript
riskScore = 
  newWalletPenalty +
  lowActivityPenalty +
  honeypotPenalty +
  airdropFarmerPenalty +
  botPenalty
```

Adjusted for Founder/VC wallets: `riskScore = max(0, riskScore - 20)`

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Status**: Production Ready
