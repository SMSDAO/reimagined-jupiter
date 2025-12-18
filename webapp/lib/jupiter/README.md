# Jupiter Price Service

A comprehensive TypeScript library for fetching real-time and historical token prices from the Jupiter V6 Price API.

## Features

- **Single Token Prices**: Fetch price for individual tokens
- **Bulk Price Fetching**: Retrieve prices for multiple tokens in one request
- **Caching**: Automatic 30-second cache to reduce API calls
- **Real-time Updates**: WebSocket-based price subscriptions (polling implementation)
- **Portfolio Valuation**: Calculate total portfolio value from token holdings
- **Type Safety**: Full TypeScript support with explicit types

## Installation

The library is part of the webapp and can be imported directly:

```typescript
import { getJupiterPriceService, getTokenPrice, getBulkTokenPrices } from '@/lib/jupiter/price-service';
```

## Usage

### Single Token Price

```typescript
import { getTokenPrice } from '@/lib/jupiter/price-service';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const price = await getTokenPrice(SOL_MINT);
console.log(`SOL Price: $${price}`);
```

### Bulk Token Prices

```typescript
import { getBulkTokenPrices } from '@/lib/jupiter/price-service';

const tokenMints = [
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
];

const prices = await getBulkTokenPrices(tokenMints);
Object.entries(prices).forEach(([mint, price]) => {
  console.log(`${mint}: $${price}`);
});
```

### Service Instance

```typescript
import { getJupiterPriceService } from '@/lib/jupiter/price-service';

const service = getJupiterPriceService();

// Get single price with full metadata
const priceData = await service.getTokenPrice(
  'So11111111111111111111111111111111111111112'
);
console.log(priceData);
// {
//   id: 'So11111111111111111111111111111111111111112',
//   mintSymbol: 'SOL',
//   vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
//   vsTokenSymbol: 'USDC',
//   price: 150.25,
//   timeTaken: 45
// }

// Get bulk prices
const bulkPrices = await service.getBulkPrices(tokenMints);

// Calculate portfolio value
const portfolio = await service.calculatePortfolioValue([
  { mint: 'So11111111111111111111111111111111111111112', amount: 10 },
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100 },
]);
console.log(`Total Value: $${portfolio.totalValue}`);
```

### Real-time Price Subscriptions

```typescript
import { getJupiterPriceService } from '@/lib/jupiter/price-service';

const service = getJupiterPriceService();

const unsubscribe = service.subscribeToPrice(
  'So11111111111111111111111111111111111111112',
  (price) => {
    console.log(`New SOL price: $${price.price}`);
  }
);

// Later: unsubscribe when done
unsubscribe();
```

### Portfolio Valuation

```typescript
import { getJupiterPriceService } from '@/lib/jupiter/price-service';

const service = getJupiterPriceService();

const portfolio = await service.calculatePortfolioValue([
  { mint: 'So11111111111111111111111111111111111111112', amount: 10 },
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100 },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', amount: 1000000 },
]);

console.log(`Total Portfolio Value: $${portfolio.totalValue.toFixed(2)}`);
portfolio.tokens.forEach(token => {
  console.log(`${token.mint}: ${token.amount} @ $${token.price} = $${token.value}`);
});
```

## API Route

The service is also exposed via an API route at `/api/prices`.

### Endpoint

```
GET /api/prices?ids=<token_mints>&vsToken=<quote_token>
```

### Parameters

- `ids` (required): Comma-separated list of token mint addresses
- `vsToken` (optional): Quote token address (defaults to USDC)

### Example Request

```bash
curl "http://localhost:3000/api/prices?ids=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
```

### Response

```json
{
  "success": true,
  "data": {
    "prices": {
      "So11111111111111111111111111111111111111112": {
        "id": "So11111111111111111111111111111111111111112",
        "mintSymbol": "SOL",
        "vsToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "vsTokenSymbol": "USDC",
        "price": 150.25,
        "timeTaken": 45
      },
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
        "id": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "mintSymbol": "USDC",
        "vsToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "vsTokenSymbol": "USDC",
        "price": 1.0,
        "timeTaken": 45
      }
    },
    "timestamp": 1702908123456
  }
}
```

## Type Definitions

### JupiterPriceData

```typescript
interface JupiterPriceData {
  id: string;              // Token mint address
  mintSymbol: string;      // Token symbol (e.g., "SOL")
  vsToken: string;         // Quote token mint address
  vsTokenSymbol: string;   // Quote token symbol (e.g., "USDC")
  price: number;           // Token price in quote token
  timeTaken: number;       // Time taken to fetch price (ms)
}
```

### PortfolioValue

```typescript
interface PortfolioValue {
  totalValue: number;      // Total portfolio value in USD
  tokens: Array<{
    mint: string;          // Token mint address
    amount: number;        // Token amount
    price: number;         // Token price
    value: number;         // Token value (amount * price)
  }>;
  timestamp: number;       // Timestamp of valuation
}
```

## Caching

The service automatically caches price data for 30 seconds to reduce API calls and improve performance.

- Cache is per-token
- Cached data is automatically invalidated after 30 seconds
- Manual cache clearing: `service.clearCache()`

## WebSocket Implementation

The current WebSocket implementation uses polling (5-second intervals) as Jupiter Price API v6 doesn't expose a public WebSocket endpoint. For production use with actual WebSocket support, replace the polling implementation in `initializeWebSocket()`.

## Error Handling

All methods handle errors gracefully:
- Returns `null` for single price failures
- Returns empty Map/Record for bulk price failures
- Logs errors to console for debugging
- Subscription callbacks wrapped in try-catch

## Testing

Run the test scripts to verify functionality:

```bash
# Test API directly (requires running dev server)
./scripts/test-price-api.sh

# Test service implementation
node scripts/simple-test.mjs
```

## Performance Considerations

1. **Caching**: 30-second cache significantly reduces API calls
2. **Bulk Fetching**: Always prefer `getBulkPrices()` over multiple `getTokenPrice()` calls
3. **Connection Pooling**: Singleton service instance reuses connections
4. **Subscription Cleanup**: Always call unsubscribe() to prevent memory leaks

## Common Token Addresses

```typescript
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};
```

## License

Part of the GXQ STUDIO - Advanced Solana DeFi Platform
