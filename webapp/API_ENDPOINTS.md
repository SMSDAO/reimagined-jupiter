# GXQ Studio - New API Endpoints Documentation

This document describes the newly implemented API endpoints for mainnet functionality.

## Sniper Bot APIs

### POST /api/sniper/execute
Execute a sniper buy order using Jupiter with high priority fee.

**Request Body:**
```json
{
  "tokenMint": "string (required) - Target token mint address",
  "buyAmountSol": "number (required) - Amount of SOL to spend",
  "slippageBps": "number (required) - Slippage tolerance in basis points",
  "userPublicKey": "string (required) - User's wallet public key"
}
```

**Response:**
```json
{
  "success": true,
  "quote": { ... },
  "transaction": "base64 encoded transaction",
  "estimatedOutput": 1234.5678,
  "priceImpact": 0.5
}
```

### GET /api/sniper/detect-pools
Detect newly created liquidity pools across multiple DEXs.

**Query Parameters:**
- `dex` (optional): Filter for specific DEX (raydium, orca, meteora, phoenix, pumpfun)
- `limit` (optional, default: 10): Maximum number of pools to return

**Response:**
```json
{
  "detected": true,
  "pools": [
    {
      "poolAddress": "...",
      "tokenMint": "...",
      "dex": "raydium",
      "timestamp": 1234567890,
      "initialLiquidity": 50000
    }
  ],
  "timestamp": 1234567890
}
```

### POST /api/sniper/detect-pools
Start monitoring for new pools.

**Request Body:**
```json
{
  "platforms": ["raydium", "orca", "meteora", "phoenix", "pumpfun"]
}
```

## Jupiter Integration APIs

### GET /api/jupiter/tokens
Fetch token list from Jupiter with caching.

**Query Parameters:**
- `search` (optional): Search term to filter tokens
- `limit` (optional, default: 100): Maximum number of tokens to return

**Response:**
```json
{
  "success": true,
  "tokens": [
    {
      "address": "...",
      "symbol": "SOL",
      "name": "Solana",
      "decimals": 9,
      "logoURI": "..."
    }
  ],
  "count": 100,
  "timestamp": 1234567890
}
```

### POST /api/jupiter/tokens
Get details for a specific token by address.

**Request Body:**
```json
{
  "address": "So11111111111111111111111111111111111111112"
}
```

## Gas & Fee Management APIs

### GET /api/gas/calculate
Calculate dynamic gas fees based on current network conditions.

**Query Parameters:**
- `txType` (optional): Transaction type (swap, transfer, snipe, flashloan)

**Response:**
```json
{
  "success": true,
  "priorityFee": 5000,
  "computeUnits": 200000,
  "totalFee": 1000000,
  "networkCongestion": "medium",
  "recommendedSlippage": 1,
  "timestamp": 1234567890
}
```

### POST /api/gas/calculate
Calculate gas for a specific transaction.

**Request Body:**
```json
{
  "transaction": "base64 encoded transaction",
  "txType": "swap"
}
```

## Slippage Management APIs

### GET /api/slippage/calculate
Calculate recommended slippage based on market conditions.

**Query Parameters:**
- `tokenAddress` (required): Token mint address
- `amountIn` (required): Amount to trade
- `networkCongestion` (optional): Network congestion level (low, medium, high)
- `priceImpact` (optional): Expected price impact percentage
- `txType` (optional): Transaction type for quick recommendation (swap, snipe, flashloan)

**Response:**
```json
{
  "success": true,
  "slippage": 1.5,
  "slippageBps": 150,
  "reason": "High price impact detected - increased slippage",
  "confidence": "high",
  "timestamp": 1234567890
}
```

### POST /api/slippage/calculate
Calculate slippage with detailed parameters.

**Request Body:**
```json
{
  "tokenAddress": "...",
  "amountIn": 100,
  "networkCongestion": "medium",
  "priceImpact": 2.5,
  "volatility": 1.5
}
```

## Wallet Analysis APIs

### GET /api/wallet/score
Calculate and return wallet score based on trading history.

**Query Parameters:**
- `address` (required): Wallet address to analyze

**Response:**
```json
{
  "success": true,
  "score": 75,
  "rank": "expert",
  "metrics": {
    "totalTransactions": 150,
    "successRate": 92.5,
    "profitability": 78.3,
    "activityLevel": 85.0,
    "riskScore": 15.2
  },
  "timestamp": 1234567890
}
```

**Rank Levels:**
- `whale`: Score >= 90
- `expert`: Score >= 75
- `advanced`: Score >= 60
- `intermediate`: Score >= 40
- `beginner`: Score < 40

## Pool Information APIs

### GET /api/pools/info
Get detailed information about a liquidity pool.

**Query Parameters:**
- `address` (required): Pool address
- `dex` (optional): DEX name for optimized parsing

**Response:**
```json
{
  "success": true,
  "pool": {
    "address": "...",
    "dex": "raydium",
    "tokenA": "...",
    "tokenB": "...",
    "liquidity": 50000,
    "volume24h": 100000,
    "fee": 0.003,
    "isActive": true,
    "timestamp": 1234567890
  }
}
```

### POST /api/pools/info
Same as GET, but accepts body instead of query parameters.

## Health Check API

### GET /api/health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "rpcLatency": 250,
  "jupiterApiStatus": "online",
  "timestamp": 1234567890,
  "rpcEndpoint": "https://..."
}
```

**Status Codes:**
- `200`: Healthy or degraded
- `503`: Unhealthy

## Price Feed API

### GET /api/prices
Fetch token prices from Jupiter Price API.

**Query Parameters:**
- `ids` (required): Comma-separated list of token mint addresses
- `vsToken` (optional, default: USDC): Quote token address

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": {
      "So11111111111111111111111111111111111111112": {
        "id": "...",
        "mintSymbol": "SOL",
        "vsToken": "...",
        "vsTokenSymbol": "USDC",
        "price": 100.5,
        "timeTaken": 50
      }
    },
    "timestamp": 1234567890
  }
}
```

## Environment Configuration

All endpoints use the following environment variables:

### RPC Endpoints (Priority Order)
1. `NEXT_PUBLIC_HELIUS_RPC` - Helius mainnet RPC
2. `NEXT_PUBLIC_QUICKNODE_RPC` - QuickNode mainnet RPC
3. `NEXT_PUBLIC_SOLANA_RPC_PRIMARY` - Primary Solana RPC
4. `NEXT_PUBLIC_RPC_URL` - Legacy RPC URL
5. Fallback: `https://api.mainnet-beta.solana.com`

### Jupiter Configuration
- `NEXT_PUBLIC_JUPITER_API_URL` - Jupiter API endpoint (default: https://quote-api.jup.ag)
- `NEXT_PUBLIC_JUPITER_V6_PROGRAM_ID` - Jupiter V6 program ID

### Trading Configuration
- `NEXT_PUBLIC_MINIMUM_PROFIT_SOL` - Minimum profit threshold
- `NEXT_PUBLIC_MAX_SLIPPAGE` - Maximum slippage tolerance
- `NEXT_PUBLIC_GAS_BUFFER` - Gas buffer multiplier

### Program IDs (Mainnet)
- `NEXT_PUBLIC_MARGINFI_PROGRAM_ID` - MarginFi program
- `NEXT_PUBLIC_SOLEND_PROGRAM_ID` - Solend program
- `NEXT_PUBLIC_MANGO_PROGRAM_ID` - Mango program
- `NEXT_PUBLIC_KAMINO_PROGRAM_ID` - Kamino program

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "timestamp": 1234567890
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (missing or invalid parameters)
- `404`: Resource not found
- `500`: Internal server error
- `502`: External API error (Jupiter, RPC, etc.)
- `503`: Service unavailable (health check)

## Rate Limiting

- Most endpoints use caching to reduce load
- Cache durations vary by endpoint (5s to 1 hour)
- No explicit rate limiting currently implemented
- Consider implementing rate limiting for production use

## Security Considerations

1. **Never expose private keys**: All transaction signing happens client-side
2. **Validate inputs**: All public keys and amounts are validated
3. **Use HTTPS**: Always use HTTPS in production
4. **Monitor for abuse**: Implement rate limiting and monitoring
5. **Audit smart contracts**: Review all program IDs before use

## Support

For issues or questions:
- GitHub: https://github.com/SMSDAO/reimagined-jupiter
- Documentation: Check webapp/README.md
