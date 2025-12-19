# Centralized API Configuration Guide

## Overview

The GXQ Studio webapp now uses a centralized API configuration system that automatically manages all external API endpoints based on environment variables. This ensures consistent behavior across development and production environments.

## Key Benefits

✅ **Single Source of Truth** - All API endpoints defined in one place  
✅ **Environment-Aware** - Automatically adapts to production/development  
✅ **No Hardcoded URLs** - All URLs configurable via environment variables  
✅ **Automatic Fallbacks** - Multiple RPC endpoints with automatic rotation  
✅ **Type Safety** - Full TypeScript support for all configurations  
✅ **Easy Testing** - Switch between environments without code changes  

## Architecture

### Configuration Module Location

```
webapp/lib/config/
├── api-endpoints.ts    # Main configuration module
└── index.ts           # Re-exports for easy imports
```

### How It Works

1. **Environment Detection**: Automatically detects `NODE_ENV` and `VERCEL` environment
2. **Priority Fallback**: Reads environment variables in priority order
3. **Default Values**: Provides sensible defaults for all endpoints
4. **Validation**: Validates configuration on startup
5. **Logging**: Safe logging (no secrets) for debugging

## Usage in Code

### Basic Import

```typescript
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';

// Use any endpoint
const response = await fetch(`${API_ENDPOINTS.JUPITER_QUOTE}/quote?...`);
```

### Available Endpoints

```typescript
// Jupiter APIs
API_ENDPOINTS.JUPITER_QUOTE    // Quote API v6
API_ENDPOINTS.JUPITER_PRICE    // Price API v6
API_ENDPOINTS.JUPITER_WORKER   // Worker API (airdrops)
API_ENDPOINTS.JUPITER_TOKENS   // Token list API

// Solana RPC
API_ENDPOINTS.SOLANA_RPC_PRIMARY   // Primary RPC
API_ENDPOINTS.SOLANA_RPC_SECONDARY // Secondary RPC
API_ENDPOINTS.SOLANA_RPC_FALLBACK  // Fallback RPC

// Other Services
API_ENDPOINTS.PYTH_HERMES      // Pyth price feeds
API_ENDPOINTS.JITO_API         // Jito MEV/airdrops
```

### Environment Info

```typescript
import { getEnvironmentInfo } from '@/lib/config/api-endpoints';

const info = getEnvironmentInfo();
console.log(info);
// {
//   nodeEnv: 'production',
//   isProduction: true,
//   isDevelopment: false,
//   isVercel: true,
//   jupiterQuoteApi: 'https://quote-api.jup.ag/v6',
//   ...
// }
```

### RPC Endpoints

```typescript
import { getRPCEndpoints } from '@/lib/config/api-endpoints';

const rpcUrls = getRPCEndpoints();
// Returns array of RPC URLs in priority order
// ['https://mainnet.helius-rpc.com/...', 'https://api.mainnet-beta.solana.com', ...]
```

### Validation

```typescript
import { validateEnvironment } from '@/lib/config/api-endpoints';

const validation = validateEnvironment();
if (!validation.valid) {
  console.error('Missing environment variables:', validation.missing);
}
```

## Environment Variables

### Required (Choose at least one RPC)

```bash
# Option 1: Helius (Recommended)
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Option 2: QuickNode (Recommended)
NEXT_PUBLIC_QUICKNODE_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY

# Option 3: Public RPC (Free, rate-limited)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Optional (Have defaults)

```bash
# Jupiter APIs (defaults to official endpoints)
NEXT_PUBLIC_JUPITER_QUOTE_API=https://quote-api.jup.ag/v6
NEXT_PUBLIC_JUPITER_PRICE_API=https://price.jup.ag/v6
NEXT_PUBLIC_JUPITER_WORKER_API=https://worker.jup.ag

# Pyth Network (defaults to official Hermes)
NEXT_PUBLIC_PYTH_HERMES_ENDPOINT=https://hermes.pyth.network

# Jito (defaults to official API)
NEXT_PUBLIC_JITO_API_URL=https://kek.jito.network/api/v1
```

### WalletConnect (Required for wallet connections)

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Environment Priority

### RPC Endpoint Selection Priority

1. `NEXT_PUBLIC_HELIUS_RPC` (if set)
2. `NEXT_PUBLIC_QUICKNODE_RPC` (if set)
3. `NEXT_PUBLIC_SOLANA_RPC_PRIMARY` (if set)
4. `NEXT_PUBLIC_RPC_URL` (if set)
5. `https://api.mainnet-beta.solana.com` (fallback)

Plus additional fallbacks:
- `https://solana-api.projectserum.com`
- `https://rpc.ankr.com/solana`

### Jupiter API Selection

1. Custom endpoint (if `NEXT_PUBLIC_JUPITER_QUOTE_API` set)
2. Legacy endpoint (if `NEXT_PUBLIC_JUPITER_API_URL` set)
3. Official endpoint: `https://quote-api.jup.ag/v6` (default)

## Migration Guide

### Before (Hardcoded URLs)

```typescript
// Old way - hardcoded URLs scattered throughout codebase
const response = await fetch('https://quote-api.jup.ag/v6/quote?...');
const prices = await fetch('https://price.jup.ag/v6/price?...');
```

### After (Centralized Config)

```typescript
// New way - centralized configuration
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';

const response = await fetch(`${API_ENDPOINTS.JUPITER_QUOTE}/quote?...`);
const prices = await fetch(`${API_ENDPOINTS.JUPITER_PRICE}/price?...`);
```

### Files Updated

The following files have been updated to use centralized configuration:

- ✅ `webapp/lib/api-client.ts`
- ✅ `webapp/lib/jupiter/price-service.ts`
- ✅ `webapp/lib/arbitrage-scanner.ts`
- ✅ `webapp/lib/flashloan/executor.ts`
- ✅ `webapp/lib/rpc-rotator.ts`
- ✅ `webapp/lib/solana/connection.ts`
- ✅ `webapp/app/api/health/route.ts`
- ✅ `webapp/app/api/arbitrage/scan/route.ts`
- ✅ `webapp/app/api/arbitrage/execute-flashloan/route.ts`

## Features

### 1. Environment Detection

Automatically detects:
- Production vs Development mode
- Vercel deployment environment
- Available RPC providers

### 2. Automatic Validation

On app startup, validates:
- Required environment variables are set
- Configuration is complete
- Provides helpful warnings for missing variables

### 3. RPC Failover

The system automatically:
- Maintains a list of available RPC endpoints
- Removes duplicates
- Provides fallback options
- Integrates with RPCRotator for health checks

### 4. Safe Logging

Configuration logging:
- Never logs secrets or API keys
- Safe for production debugging
- Shows endpoint URLs without sensitive data

```typescript
import { logEnvironmentConfig } from '@/lib/config/api-endpoints';

logEnvironmentConfig();
// Outputs safe configuration info to console
```

## UI Integration

### Settings Page

The `/settings` page now includes an **Environment Configuration** section that displays:

- ✅ Configuration validation status
- ✅ Current environment (production/development)
- ✅ Platform detection (Vercel/other)
- ✅ Active RPC endpoint
- ✅ Jupiter API endpoints
- ✅ Pyth Network configuration
- ✅ Configuration recommendations
- ✅ Performance warnings

Users can:
- View all active endpoints
- Check configuration status
- Get recommendations for optimization
- Debug connection issues

## Testing

### Development Environment

```bash
# Use devnet for testing
export NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
npm run dev
```

### Production Environment

```bash
# Use premium RPC
export NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=KEY
export NEXT_PUBLIC_QUICKNODE_RPC=https://endpoint.quiknode.pro/KEY
npm run build
npm start
```

### Verify Configuration

```typescript
// In browser console
import { getEnvironmentInfo } from '@/lib/config/api-endpoints';
console.log(getEnvironmentInfo());
```

Or visit `/settings` page and click "Show Details" in Environment Configuration section.

## Troubleshooting

### Issue: "Missing environment variables" warning

**Solution**: Set at least one RPC endpoint:
```bash
export NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Issue: Using public RPC in production

**Symptoms**: Warning about public RPC on settings page

**Solution**: Upgrade to premium RPC:
```bash
export NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=KEY
```

### Issue: Configuration not updating

**Solution**: 
1. Clear `.env.local` file
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Different config in preview vs production

**Solution**: Set environment-specific variables in Vercel:
- Production environment: Use production RPC
- Preview environment: Use different RPC or devnet

## Best Practices

### 1. Environment Variables

✅ **DO**:
- Use premium RPC providers in production
- Set multiple RPC endpoints for redundancy
- Use environment-specific configuration
- Keep sensitive keys in Vercel dashboard

❌ **DON'T**:
- Hardcode API URLs in components
- Commit `.env` files to Git
- Use the same API keys for preview and production
- Expose RPC URLs in client-side logs

### 2. Configuration

✅ **DO**:
- Import from centralized config module
- Use provided validation functions
- Check configuration status on startup
- Monitor RPC health in production

❌ **DON'T**:
- Create duplicate endpoint definitions
- Skip environment validation
- Ignore configuration warnings
- Use untested RPC providers

### 3. Development

✅ **DO**:
- Test with different environment configurations
- Verify builds succeed with minimal config
- Check console logs for configuration info
- Use devnet for testing when possible

❌ **DON'T**:
- Assume defaults work for all cases
- Skip testing environment variable changes
- Deploy without verifying configuration
- Mix development and production configs

## Support

For issues or questions:
- Check `/settings` page for configuration status
- Review browser console for detailed logs
- Verify environment variables are set correctly
- See [VERCEL_PRODUCTION_DEPLOYMENT.md](../VERCEL_PRODUCTION_DEPLOYMENT.md) for deployment guide

## Future Enhancements

Planned improvements:
- [ ] Dynamic endpoint addition via UI
- [ ] Real-time RPC performance monitoring
- [ ] Automatic endpoint quality scoring
- [ ] Cost tracking per RPC provider
- [ ] Configuration templates (mainnet/devnet/testnet)
- [ ] API usage analytics

---

**Version**: 2.0.0  
**Last Updated**: December 19, 2025  
**Status**: Production Ready ✅
