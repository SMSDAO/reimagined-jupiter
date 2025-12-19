# Ticker Service Documentation

## Overview

The Ticker Service provides real-time Solana token price updates using Pyth Network's Hermes API, along with price aggregation from multiple DEX sources including Jupiter, Raydium, Orca, and Meteora. The service includes both backend and frontend components for comprehensive price tracking.

## Features

### Backend Features

1. **Real-Time Price Updates**
   - Fetches prices every second from Pyth Network Hermes API
   - Uses `@pythnetwork/hermes-client` for reliable data access
   - Automatic reconnection with exponential backoff (up to 10 attempts)
   - Error handling for rate limits and API failures

2. **Price Storage**
   - In-memory caching of latest prices for quick access
   - Historical price storage (configurable, default 1000 entries per token)
   - Efficient Map-based data structures for O(1) lookups

3. **Price Aggregation**
   - Combines prices from multiple sources:
     - Pyth Network (primary source)
     - Jupiter aggregator
     - Raydium DEX
     - Orca DEX
     - Meteora DEX
   - Calculates median price for accuracy
   - Provides confidence intervals based on standard deviation
   - Provider rotation support for load balancing

4. **API Endpoint (`/api/tickers`)**
   - Returns current token prices with metadata
   - Supports filtering by token symbols
   - Includes confidence intervals
   - Provider status information
   - RESTful JSON response format

### Frontend Features

1. **React Hook (`useTicker`)**
   - Automatic price updates every second
   - Support for filtering by token symbols
   - Configurable refresh intervals
   - Error handling and loading states
   - Helper hook `useTokenPrice` for single token tracking

2. **Ticker UI Component**
   - Real-time price display with low latency
   - Visual indicators for price changes (up/down arrows)
   - Color-coded price movements (green for up, red for down)
   - Connection status indicator
   - Provider status display on errors
   - Compact mode for minimal UI
   - Confidence interval display (optional)

3. **Ticker Page**
   - Full-featured demo of ticker functionality
   - Multiple views (all tokens, featured, memecoins)
   - API documentation and examples
   - Information about features

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ticker Component (React)                            │  │
│  │  - Visual price display                              │  │
│  │  - Status indicators                                 │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │ useTicker hook                          │
│                   │ (1 second polling)                      │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    │ HTTP GET /api/tickers
                    │
┌───────────────────┼─────────────────────────────────────────┐
│                   │          Backend (Next.js API)          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │  /api/tickers Route                                  │  │
│  │  - Fetches from Pyth Hermes                         │  │
│  │  - Aggregates from multiple DEXs                    │  │
│  │  - Returns JSON with prices & status                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │  Price Aggregation Service                           │  │
│  │  - JupiterPriceProvider                              │  │
│  │  - RaydiumPriceProvider                              │  │
│  │  - OrcaPriceProvider                                 │  │
│  │  - MeteoraPriceProvider                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ External APIs
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  External Services                                          │
│  - Pyth Network Hermes (https://hermes.pyth.network)      │
│  - Jupiter Price API (https://price.jup.ag)               │
│  - Raydium API (https://api.raydium.io)                   │
│  - Orca API (https://api.mainnet.orca.so)                 │
│  - Meteora API (https://dlmm-api.meteora.ag)              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Dependencies

Backend (root):
```bash
npm install @pythnetwork/hermes-client ws @types/ws
```

Frontend (webapp):
```bash
cd webapp
npm install @pythnetwork/hermes-client
```

## Configuration

### Environment Variables

Add to `.env.example` and `.env`:

```bash
# Pyth Network Configuration
PYTH_HERMES_ENDPOINT=https://hermes.pyth.network

# Solana RPC (required for price providers)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Supported Tokens

The following tokens are currently configured with Pyth price feeds:

- **SOL/USD** - Solana native token
- **BTC/USD** - Bitcoin
- **ETH/USD** - Ethereum
- **USDC/USD** - USD Coin
- **USDT/USD** - Tether
- **RAY/USD** - Raydium
- **BONK/USD** - Bonk
- **JUP/USD** - Jupiter
- **WIF/USD** - Dogwifhat

Additional tokens can be added by updating `PYTH_PRICE_FEEDS` in:
- `src/services/tickerService.ts` (backend)
- `webapp/app/api/tickers/route.ts` (API)

## Usage

### Backend Usage

```typescript
import { TickerService } from './services/tickerService';
import { Connection } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL);
const tickerService = new TickerService(connection);

// Start the service
await tickerService.start();

// Listen for price updates
tickerService.on('priceUpdate', (update) => {
  console.log('Price update:', update);
});

// Listen for errors
tickerService.on('error', (error) => {
  console.error('Ticker error:', error);
});

// Get current prices
const prices = tickerService.getCurrentPrices();

// Get specific token price
const solPrice = tickerService.getPrice('SOL');

// Get price history
const history = tickerService.getPriceHistory('SOL', 100);

// Get service status
const status = tickerService.getStatus();

// Stop the service
await tickerService.stop();
```

### Price Aggregation

```typescript
import { PriceAggregatorService } from './services/priceAggregator';
import { Connection } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL);
const aggregator = new PriceAggregatorService(connection, true);

// Aggregate price from multiple sources
const aggregatedPrice = await aggregator.aggregatePrice(
  'So11111111111111111111111111111111111111112', // SOL mint
  pythPrice // Optional Pyth price
);

// Check provider status
const status = await aggregator.getProviderStatus();
console.log('Provider status:', status);

// Get price with rotation
const price = await aggregator.getPriceFromRotation(mint);
```

### Frontend Usage

#### Using the React Hook

```typescript
import { useTicker, useTokenPrice } from '@/hooks/useTicker';

function MyComponent() {
  // Get all token prices
  const { data, status, error, loading, refetch } = useTicker({
    symbols: ['SOL', 'BTC', 'ETH'],
    refreshInterval: 1000, // 1 second
    enabled: true,
  });

  // Or get a single token price
  const { price, status, error, loading } = useTokenPrice('SOL', 1000);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {data && (
        <div>
          {data.prices.map(p => (
            <div key={p.symbol}>
              {p.symbol}: ${p.price.toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Using the Ticker Component

```typescript
import Ticker from '@/components/Ticker';

function MyPage() {
  return (
    <div>
      {/* Show all tokens */}
      <Ticker showConfidence={true} />

      {/* Show specific tokens in compact mode */}
      <Ticker 
        symbols={['SOL', 'BTC', 'ETH']} 
        compact={true}
      />

      {/* Show memecoins */}
      <Ticker 
        symbols={['BONK', 'WIF', 'JUP']}
        showConfidence={true}
      />
    </div>
  );
}
```

### API Usage

#### Get All Prices

```bash
curl http://localhost:3000/api/tickers
```

Response:
```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "symbol": "SOL",
        "price": 98.45,
        "confidence": 0.05,
        "exponent": -8,
        "publishTime": 1702934567,
        "source": "pyth"
      },
      ...
    ],
    "timestamp": 1702934567890,
    "count": 9
  },
  "status": {
    "connected": true,
    "providerStatus": {
      "pyth": true,
      "jupiter": true,
      "raydium": false,
      "orca": true,
      "meteora": true
    }
  }
}
```

#### Get Specific Token Prices

```bash
curl http://localhost:3000/api/tickers?symbols=SOL,BTC,ETH
```

## Testing

### Backend Testing

```bash
# Build the backend
npm run build

# Run linter
npm run lint

# Test ticker service
npm run dev
```

### Frontend Testing

```bash
cd webapp

# Build the frontend
npm run build

# Run development server
npm run dev

# Visit http://localhost:3000/ticker
```

### Test Scenarios

1. **Normal Operation**
   - Prices update every second
   - All providers show active
   - Price changes are reflected with arrows

2. **API Failure**
   - Service shows disconnected status
   - Provider status indicates which providers are down
   - Error message displayed in UI

3. **Rate Limiting**
   - Service automatically retries with exponential backoff
   - Graceful degradation if some providers fail
   - Falls back to available providers

4. **High Traffic**
   - In-memory caching reduces API load
   - Efficient data structures (Map) for fast lookups
   - Provider rotation distributes load

## Performance Considerations

### Backend

- **Caching**: All prices cached in-memory for instant access
- **Batch Requests**: Fetches all price feeds in single API call
- **Provider Rotation**: Distributes load across multiple APIs
- **History Limit**: Configurable limit prevents memory bloat (default 1000)

### Frontend

- **Polling Interval**: Configurable (default 1 second)
- **React Optimization**: Uses `useCallback` and `useEffect` cleanup
- **Conditional Rendering**: Only renders when data changes
- **Error Boundaries**: Isolates failures to ticker component

## Error Handling

### Backend Errors

1. **Connection Failures**
   - Automatic reconnection with exponential backoff
   - Max 10 reconnection attempts
   - Emits `error` and `maxReconnectAttemptsReached` events

2. **API Errors**
   - Logs detailed error information
   - Returns null for failed price fetches
   - Continues operation with available providers

3. **Rate Limiting**
   - Respects API rate limits
   - Exponential backoff on retry
   - Provider rotation helps avoid limits

### Frontend Errors

1. **API Failures**
   - Displays error message in UI
   - Shows disconnected status
   - Provides manual refetch option

2. **Network Errors**
   - Graceful degradation
   - Shows last known prices
   - Visual indication of stale data

## Monitoring

### Status Indicators

- **Connection Status**: Green (connected) / Red (disconnected)
- **Provider Count**: Number of active price providers
- **Last Update**: Timestamp of most recent update
- **Reconnect Attempts**: Number of reconnection attempts

### Logs

- **Backend**: Console logs with `[TickerService]` prefix
- **Frontend**: Browser console with `[useTicker]` prefix
- **API**: Next.js logs with `[API]` prefix

## Security Considerations

1. **No Authentication Required** (Public API)
   - Consider adding rate limiting for production
   - Use API keys for internal services

2. **CORS Headers**
   - API route includes proper cache control headers
   - Prevents caching of stale price data

3. **Input Validation**
   - Symbol parameter validated and sanitized
   - Timeout limits on external API calls

4. **Error Messages**
   - Generic error messages to avoid information leakage
   - Detailed errors logged server-side only

## Future Enhancements

1. **WebSocket Support**
   - Replace polling with WebSocket for lower latency
   - Pyth Network provides WebSocket endpoints

2. **Price Alerts**
   - User-configurable price alerts
   - Email/push notifications

3. **Historical Charts**
   - Candlestick charts from historical data
   - Technical indicators

4. **Advanced Analytics**
   - Volume tracking
   - 24h price change percentage
   - Market cap calculations

5. **Database Integration**
   - Persistent price history storage
   - PostgreSQL or MongoDB for analytics

6. **Caching Layer**
   - Redis for distributed caching
   - Reduces API calls in multi-instance deployments

## Troubleshooting

### Issue: Prices Not Updating

**Symptoms**: Ticker shows "Loading..." indefinitely

**Solutions**:
1. Check RPC URL is configured correctly
2. Verify Pyth Network is accessible
3. Check browser console for errors
4. Ensure `/api/tickers` endpoint is accessible

### Issue: High Error Rate

**Symptoms**: Frequent disconnections and reconnections

**Solutions**:
1. Check network connectivity
2. Verify API rate limits not exceeded
3. Consider increasing retry intervals
4. Use dedicated RPC endpoint (QuickNode)

### Issue: Stale Prices

**Symptoms**: Prices not changing despite market movement

**Solutions**:
1. Check Pyth Network status
2. Verify timestamp is recent
3. Clear browser cache
4. Check provider status in UI

## Support

For issues or questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: See DOCUMENTATION.md
- Community: Discord/Telegram (if available)

## License

MIT License - See LICENSE file for details
