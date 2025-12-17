# Webapp Library Documentation

This directory contains shared utilities and clients for the webapp.

## Files

### `api-client.ts`
Centralized API client for external service integrations.

**Classes:**
- `JupiterPriceAPI` - Jupiter Price API v6 integration
- `JupiterQuoteAPI` - Jupiter Quote API v6 integration  
- `JupiterAirdropAPI` - Jupiter airdrop eligibility checking
- `JitoAirdropAPI` - Jito airdrop allocation checking

**Utilities:**
- `KNOWN_TOKENS` - Map of token mints to symbols
- `getTokenSymbol()` - Get symbol from mint address
- `formatTokenAmount()` - Format token amounts with proper decimals
- `formatUSD()` - Format USD values with K/M suffixes

**Usage:**
```typescript
import { JupiterPriceAPI, formatUSD } from '@/lib/api-client';

// Get SOL price
const solPrice = await JupiterPriceAPI.getSOLPrice();

// Get multiple token prices
const prices = await JupiterPriceAPI.getPrices([mint1, mint2]);

// Check airdrop eligibility
const eligible = await JupiterAirdropAPI.checkEligibility(walletAddress);
```

### `wallet-utils.ts`
Utilities for wallet operations, scoring, and analysis.

**Functions:**
- `calculateWalletScore()` - Calculate wallet score from metrics
- `fetchWalletMetrics()` - Fetch on-chain wallet data
- `getTierColor()` - Get Tailwind gradient class for tier
- `getTierEmoji()` - Get emoji for tier
- `calculateAirdropPriority()` - Calculate priority (1-5)
- `estimateAirdropValue()` - Estimate potential airdrop value
- `isValidSolanaAddress()` - Validate Solana address
- `shortenAddress()` - Shorten address for display

**Types:**
- `WalletTier` - WHALE | DEGEN | ACTIVE | CASUAL | NOVICE
- `WalletMetrics` - balance, txCount, nftCount, tokenCount, age
- `WalletScore` - totalScore, tier, metrics

**Usage:**
```typescript
import { 
  fetchWalletMetrics, 
  calculateWalletScore,
  getTierColor 
} from '@/lib/wallet-utils';

// Fetch and score wallet
const metrics = await fetchWalletMetrics(connection, publicKey);
const score = calculateWalletScore(metrics);

// Use in UI
<div className={`bg-gradient-to-r ${getTierColor(score.tier)}`}>
  {score.tier} - Score: {score.totalScore}/100
</div>
```

### `wallet-context-provider.tsx`
Solana wallet adapter context provider with event dispatching.

**Features:**
- Phantom and Solflare wallet support
- Auto-connect on page load
- Custom event dispatching for wallet connection/disconnection
- RPC endpoint configuration via `NEXT_PUBLIC_RPC_URL`

**Events:**
- `wallet-connected` - Dispatched when wallet connects
- `wallet-disconnected` - Dispatched when wallet disconnects

**Usage:**
```typescript
// In layout.tsx
import { WalletContextProvider } from '@/lib/wallet-context-provider';

<WalletContextProvider>
  {children}
</WalletContextProvider>

// Listen for events
useEffect(() => {
  const handleConnect = (e: CustomEvent) => {
    console.log('Wallet connected:', e.detail.publicKey);
  };
  
  window.addEventListener('wallet-connected', handleConnect);
  return () => window.removeEventListener('wallet-connected', handleConnect);
}, []);
```

## Best Practices

### Error Handling
All API calls should be wrapped in try-catch blocks with appropriate user feedback:

```typescript
try {
  const price = await JupiterPriceAPI.getSOLPrice();
  // Use price
} catch (error) {
  console.error('Failed to fetch price:', error);
  // Show user-friendly error message
}
```

### Loading States
Always implement loading states for async operations:

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    // Fetch data
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### Rate Limiting
Be mindful of API rate limits. Consider implementing:
- Request caching
- Debouncing for user input
- Exponential backoff for retries

### Type Safety
Always use TypeScript types for better DX:
```typescript
import { type WalletTier, type WalletScore } from '@/lib/wallet-utils';

const [score, setScore] = useState<WalletScore | null>(null);
```

## Environment Variables

### Required
- `NEXT_PUBLIC_RPC_URL` - Solana RPC endpoint (default: mainnet-beta)

### Optional
None currently, but future additions may include:
- API keys for third-party services
- Feature flags
- Analytics tokens

## Testing

When adding new utilities:
1. Test with various input values (edge cases)
2. Test error conditions
3. Verify TypeScript types
4. Test in actual components

## Contributing

When adding new utilities:
1. Add TypeScript types
2. Add JSDoc comments
3. Update this README
4. Follow existing code style
5. Test thoroughly
