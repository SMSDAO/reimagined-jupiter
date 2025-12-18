# Wallet and Real API Integration Guide

## Overview

This document describes the integration of real wallet functionality and API endpoints into the GXQ Studio DeFi platform UI. All mock data has been replaced with real API calls and wallet interactions.

## Changes Summary

### 1. Admin Panel (`webapp/app/admin/page.tsx`)

#### Mock Data Removed
- ✅ Hardcoded mock opportunities
- ✅ Fake Pyth price data
- ✅ Generic "TOKEN" symbols

#### Real Integrations Added
- **ArbitrageScanner**: Real-time opportunity detection across multiple DEXs
- **Jupiter Price API**: Live token price fetching for portfolio analysis
- **Token Symbol Resolution**: Proper token identification using centralized mapping

#### Key Features
```typescript
// Real-time opportunity scanning
const scannerRef = useRef<ArbitrageScanner | null>(null);
scannerRef.current = new ArbitrageScanner(rpcUrl);
scannerRef.current.onOpportunity((opportunity) => {
  // Handle real opportunities as they're detected
});

// Real portfolio analysis with Jupiter prices
const priceResponse = await JupiterPriceAPI.getPrices(mints);
const holdings = tokenAccounts.value.map(acc => ({
  symbol: getTokenSymbol(mint),
  price: priceData[mint] || 0,
  value: balance * price,
}));
```

### 2. Arbitrage Page (`webapp/app/arbitrage/page.tsx`)

#### Updates Made
- Enhanced execution function with detailed implementation requirements
- Added console logging for debugging
- Clarified simulation vs real execution

#### Real Execution Requirements
For actual arbitrage execution, the following components are needed:

1. **Flash Loan Initiation**
   - Integration with Marginfi/Solend/Kamino protocols
   - Flash loan amount calculation based on opportunity
   - Flash loan fee consideration (0.09%-0.20%)

2. **DEX Swap Execution**
   - Jupiter aggregator integration for best routes
   - Transaction building with proper slippage
   - Priority fee calculation for faster execution

3. **Atomic Transaction**
   - Bundle flash loan borrow, swap, and repay in single transaction
   - Ensure atomicity to prevent partial execution
   - Handle transaction simulation and validation

4. **MEV Protection**
   - Jito bundle integration for front-running prevention
   - Private transaction submission
   - Bundle tip calculation

## API Integrations

### Jupiter Price API v6

**Endpoint**: `https://price.jup.ag/v6/price`

**Usage**:
```typescript
import { JupiterPriceAPI } from '@/lib/api-client';

// Get multiple token prices
const prices = await JupiterPriceAPI.getPrices([
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
]);

// Get single token price
const solPrice = await JupiterPriceAPI.getSOLPrice();
```

**Features**:
- Real-time price updates
- Support for 100+ Solana tokens
- Accurate USD valuations
- No API key required

### ArbitrageScanner

**Location**: `webapp/lib/arbitrage-scanner.ts`

**Usage**:
```typescript
import { ArbitrageScanner } from '@/lib/arbitrage-scanner';

const scanner = new ArbitrageScanner(rpcUrl);

// Set up opportunity callback
scanner.onOpportunity((opportunity) => {
  console.log('Opportunity found:', opportunity);
  // profitPercent, profitUSD, tokens, provider, route, confidence
});

// Start scanning with minimum profit threshold
await scanner.startScanning(0.5); // 0.5% minimum profit

// Stop scanning
scanner.stopScanning();
```

**Features**:
- Multi-DEX price comparison
- Flash loan opportunity detection
- Triangular arbitrage identification
- Real-time monitoring (10-second intervals)
- Confidence scoring (0-100%)

### Solana RPC Integration

**Usage via Connection**:
```typescript
import { useConnection } from '@solana/wallet-adapter-react';

const { connection } = useConnection();

// Get balance
const balance = await connection.getBalance(publicKey);

// Get token accounts
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
  publicKey,
  { programId: TOKEN_PROGRAM_ID }
);

// Get transaction history
const signatures = await connection.getSignaturesForAddress(
  publicKey,
  { limit: 1000 }
);
```

## Wallet Integration

### Wallet Adapter Setup

The app uses `@solana/wallet-adapter-react` for wallet connectivity:

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

function Component() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  // Check if wallet is connected
  if (!publicKey) {
    alert('Please connect your wallet');
    return;
  }
  
  // Use wallet for transactions
}
```

### Supported Wallets
- Phantom
- Solflare
- Backpack
- Ledger
- And 15+ more via wallet adapter

## Testing Guide

### Prerequisites
1. Install dependencies: `cd webapp && npm install`
2. Set environment variables:
   ```bash
   NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
   # Or use QuickNode/Alchemy for better performance
   ```

### Build and Lint Tests
```bash
cd webapp

# Build for production
npm run build
# Should output: ✓ Compiled successfully

# Run linter
npm run lint
# Should output: No errors or warnings

# Start development server
npm run dev
# Navigate to http://localhost:3000
```

### Manual Testing Checklist

#### Admin Panel Testing
1. **Start the dev server**: `npm run dev`
2. **Navigate to Admin Panel**: http://localhost:3000/admin
3. **Connect Wallet**: Click wallet button in navbar
4. **Test Bot Control**:
   - Click "Start Bot" button
   - Verify bot status changes to "RUNNING"
   - Check console for scanner initialization
   - Wait for opportunities to appear (may take 10-30 seconds)
5. **Test Opportunity Detection**:
   - Opportunities should populate with real data
   - Verify profit percentages and USD values
   - Check confidence scores (70-100%)
6. **Test Portfolio Analysis**:
   - Click "Analyze My Portfolio" button
   - Verify real token prices from Jupiter API
   - Check token symbols are correctly resolved
   - Verify total portfolio value calculation

#### Arbitrage Page Testing
1. **Navigate to Arbitrage Page**: http://localhost:3000/arbitrage
2. **Connect Wallet**
3. **Start Scanner**:
   - Click "Start Scanning" button
   - Adjust min profit slider (0.1% - 5%)
   - Enable/disable auto-execute toggle
4. **Monitor Opportunities**:
   - Wait for opportunities to appear
   - Verify flash loan providers (Marginfi, Solend, etc.)
   - Check profit calculations
5. **Test Execution**:
   - Click "Execute" on an opportunity
   - Verify console logs show opportunity details
   - Check trade history updates

#### Expected Behaviors

**Successful Scenarios**:
- Bot starts and begins scanning within 5 seconds
- Opportunities appear within 30 seconds (market dependent)
- Portfolio analysis shows real token prices
- Token symbols display correctly (SOL, USDC, JUP, etc.)
- No JavaScript errors in console

**Error Scenarios**:
- Wallet not connected: Should show "Connect wallet" alert
- RPC failure: Should show user-friendly error message
- API timeout: Should display warning and suggest retry
- Invalid token mint: Should fallback to first 4 chars display

### Performance Testing

**Expected Performance**:
- Scanner initialization: < 2 seconds
- Price API response: < 500ms
- Portfolio analysis: < 3 seconds (depends on token count)
- Opportunity detection: 10-second intervals

**Monitor For**:
- Memory leaks (scanner cleanup on unmount)
- API rate limiting (Jupiter has generous limits)
- RPC connection issues (use paid RPC for production)

## Environment Variables

### Required Variables
```bash
# RPC endpoint (required)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Optional Variables
```bash
# For better performance and reliability
NEXT_PUBLIC_RPC_URL=https://your-quicknode-endpoint.com
NEXT_PUBLIC_RPC_URL=https://your-alchemy-endpoint.com
```

## Deployment Considerations

### Vercel Deployment
1. Set Root Directory to `webapp` in project settings
2. Add environment variable: `NEXT_PUBLIC_RPC_URL`
3. Deploy

### RPC Provider Selection
- **Free (api.mainnet-beta.solana.com)**: Good for testing, may have rate limits
- **QuickNode**: Recommended for production, high performance
- **Alchemy**: Alternative, good for analytics
- **Helius**: Excellent for DeFi, includes enhanced APIs

### Rate Limiting
- Jupiter Price API: No explicit limit (respect fair use)
- Solana RPC: Depends on provider (free RPCs have stricter limits)
- Recommended: Use paid RPC for production to avoid rate limiting

## Known Limitations

### Current Implementation
1. **Simulated Execution**: Arbitrage execution is simulated
   - Real execution requires backend transaction signing
   - Flash loan integration needs smart contract deployment
   - MEV protection needs Jito bundle integration

2. **Scanner Limitations**:
   - Opportunities are detected but not validated against actual liquidity
   - Price slippage not calculated in real-time
   - Gas fees not included in profit calculations

3. **Portfolio Analysis**:
   - 24h price changes not available from Jupiter API
   - Historical data requires additional API (Birdeye, CoinGecko)

### Future Improvements
1. **Backend Integration**:
   - WebSocket for real-time updates
   - Transaction signing service
   - Flash loan execution engine

2. **Enhanced Scanning**:
   - Liquidity depth analysis
   - Real-time slippage calculation
   - Gas fee estimation

3. **Advanced Features**:
   - Historical price charts
   - P&L tracking
   - Risk assessment scoring

## Security Considerations

### Implemented Safeguards
✅ No private keys in frontend code
✅ All API calls use public endpoints
✅ Input validation before RPC calls
✅ Type-safe TypeScript throughout
✅ Error message safety (no sensitive data exposure)

### Security Best Practices
1. **Wallet Security**:
   - Never share private keys
   - Use hardware wallets for large amounts
   - Verify transaction details before signing

2. **Transaction Safety**:
   - Always simulate transactions first
   - Check slippage settings
   - Use appropriate priority fees
   - Enable MEV protection for large trades

3. **API Security**:
   - Use HTTPS for all API calls
   - Validate API responses
   - Handle errors gracefully
   - Implement retry logic with backoff

## Troubleshooting

### Common Issues

**Issue**: "Scanner failed to start"
- **Cause**: RPC connection failure
- **Solution**: Check `NEXT_PUBLIC_RPC_URL` is set correctly
- **Workaround**: Try a different RPC endpoint

**Issue**: "No opportunities found"
- **Cause**: Market conditions or high min profit threshold
- **Solution**: Lower min profit slider to 0.3% or wait longer
- **Note**: Opportunities are market-dependent

**Issue**: "Failed to fetch prices"
- **Cause**: Jupiter API timeout or network issue
- **Solution**: Retry after a few seconds
- **Workaround**: Check internet connection

**Issue**: "Portfolio value shows $0"
- **Cause**: Tokens not recognized or price API failure
- **Solution**: Check wallet has SPL tokens, verify RPC connection
- **Note**: Some tokens may not have price data

### Debug Mode

Enable detailed logging in browser console:
```javascript
// Check scanner logs
console.log('[ArbitrageScanner] ...');
console.log('[AdminPage] ...');
console.log('[ArbitragePage] ...');
```

## Code References

### Key Files
- `webapp/app/admin/page.tsx` - Admin panel with bot control
- `webapp/app/arbitrage/page.tsx` - Arbitrage scanner page
- `webapp/lib/arbitrage-scanner.ts` - Opportunity scanner
- `webapp/lib/api-client.ts` - Jupiter API integration
- `webapp/lib/wallet-utils.ts` - Wallet utilities

### Utility Functions
- `JupiterPriceAPI.getPrices()` - Fetch token prices
- `JupiterPriceAPI.getSOLPrice()` - Get SOL price
- `getTokenSymbol()` - Resolve token symbols
- `ArbitrageScanner.startScanning()` - Begin scanning
- `ArbitrageScanner.onOpportunity()` - Set callback

## Support

For issues or questions:
1. Check this documentation first
2. Review code comments in source files
3. Check browser console for errors
4. Open GitHub issue with details

## Contributing

When adding new API integrations:
1. Add to `webapp/lib/api-client.ts` if external API
2. Document usage in this file
3. Add error handling
4. Update types in TypeScript
5. Test with real wallet and data
6. Update this documentation

---

**Last Updated**: December 2025
**Status**: Production Ready (with noted limitations)
**Tested**: ✅ Build | ✅ Lint | ⏳ Manual Testing Required
