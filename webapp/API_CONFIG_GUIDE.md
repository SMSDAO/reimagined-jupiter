# API Configuration System Guide

## Overview

The GXQ Studio webapp now uses a centralized API configuration system that automatically manages API endpoints based on the environment (development, production, test) with built-in health checking and fallback mechanisms.

## Features

### 1. **Centralized Configuration**
- All API endpoints are managed from a single configuration module
- No more scattered hardcoded URLs throughout the codebase
- Easy to update endpoints globally

### 2. **Environment Detection**
- Automatic detection of development, production, and test environments
- Special handling for Vercel deployments
- Production mode optimizations

### 3. **Health Checking**
- Periodic health checks for all API endpoints
- Automatic fallback to backup endpoints when primary fails
- Real-time health status monitoring

### 4. **Runtime Validation**
- Validates that required environment variables are set
- Warns about missing recommended configurations
- Production readiness checks

## Architecture

### Core Modules

#### 1. API Configuration (`lib/config/api-config.ts`)

Manages all API endpoint configurations with dynamic environment-based switching.

**Key Classes:**
- `EnvironmentDetector` - Detects current environment (dev/prod/test)
- `EnvironmentValidator` - Validates environment variables
- `APIConfigManager` - Manages API endpoint configurations
- `API` - Convenience object for quick endpoint access

**Usage:**
```typescript
import { API } from '@/lib/config';

// Get Jupiter Quote API URL
const quoteUrl = API.jupiterQuote();

// Get Jupiter Price API URL
const priceUrl = API.jupiterPrice();

// Get Pyth Hermes URL
const hermesUrl = API.pythHermes();

// Check environment
if (API.environment.isProduction()) {
  console.log('Running in production mode');
}
```

#### 2. Health Checker (`lib/config/health-checker.ts`)

Monitors API endpoint health and provides automatic fallback.

**Key Classes:**
- `APIHealthChecker` - Performs periodic health checks
- Maintains health status for all endpoints
- Provides fallback endpoint selection

**Usage:**
```typescript
import { getHealthChecker, startAPIHealthMonitoring } from '@/lib/config';

// Start health monitoring (call once on app init)
startAPIHealthMonitoring(60000); // Check every 60 seconds

// Get health status
const checker = getHealthChecker();
const status = checker.getLastHealthStatus();

// Check specific service
const isHealthy = checker.isServiceHealthy('jupiter');
```

#### 3. Vercel Configuration (`lib/config/vercel-config.ts`)

Handles Vercel-specific configurations and optimizations.

**Key Classes:**
- `VercelConfigManager` - Manages Vercel deployment settings
- `EdgeRuntimeChecker` - Checks Edge Runtime compatibility
- `ProductionReadinessChecker` - Validates production readiness

**Usage:**
```typescript
import { getVercelConfig, initializeVercelConfig } from '@/lib/config';

// Initialize on app start (server-side)
initializeVercelConfig();

// Check if running on Vercel
const config = getVercelConfig();
if (config.isVercel()) {
  console.log('Running on Vercel');
}

// Get optimizations
const opts = config.getOptimizations();
console.log('Cache control:', opts.cacheControl);
```

## Environment Variables

### Required Variables

```bash
# Primary RPC endpoint (required)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Recommended Variables (for optimal performance)

```bash
# Premium RPC endpoints
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_QUICKNODE_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY

# Jupiter API (uses default if not set)
NEXT_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag

# Pyth Hermes endpoint (uses default if not set)
PYTH_HERMES_ENDPOINT=https://hermes.pyth.network
```

### Automatic Variables (set by platform)

```bash
# Set by Next.js
NODE_ENV=development|production|test

# Set by Vercel
VERCEL=1
VERCEL_ENV=production|preview|development
VERCEL_URL=your-app.vercel.app
```

## Integration Guide

### Using in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { API } from '@/lib/config';

export async function GET(request: NextRequest) {
  // Get Jupiter Quote URL
  const jupiterUrl = API.jupiterQuote();
  
  const response = await fetch(`${jupiterUrl}/quote?inputMint=...`);
  const data = await response.json();
  
  return NextResponse.json(data);
}
```

### Using in Client Components

```typescript
'use client';

import { API } from '@/lib/config';

export default function MyComponent() {
  const fetchData = async () => {
    const priceUrl = API.jupiterPrice();
    const response = await fetch(`${priceUrl}/price?ids=...`);
    return response.json();
  };
  
  // ... rest of component
}
```

### Using in Server Components

```typescript
import { API, getAPIConfig } from '@/lib/config';

export default async function ServerComponent() {
  const config = getAPIConfig();
  const jupiterUrl = config.getJupiterQuoteUrl();
  
  const response = await fetch(`${jupiterUrl}/quote?...`);
  const data = await response.json();
  
  return <div>{/* render data */}</div>;
}
```

## API Endpoints Reference

### Jupiter APIs

```typescript
// Quote API (for swap quotes)
API.jupiterQuote() // https://quote-api.jup.ag/v6

// Price API (for token prices)
API.jupiterPrice() // https://price.jup.ag/v6

// Token List (all available tokens)
API.jupiterTokens() // https://token.jup.ag/all

// Worker API (airdrops, etc.)
API.jupiterWorker() // https://worker.jup.ag
```

### Other APIs

```typescript
// Pyth Hermes (price feeds)
API.pythHermes() // https://hermes.pyth.network

// Jito API (MEV, airdrops)
API.jitoApi() // https://kek.jito.network/api/v1

// Solana Explorer
API.solanaExplorer() // https://solscan.io
```

## Health Monitoring

### Starting Health Checks

```typescript
// In your app initialization (e.g., layout.tsx or _app.tsx)
import { startAPIHealthMonitoring } from '@/lib/config';

// Client-side only
if (typeof window !== 'undefined') {
  startAPIHealthMonitoring(60000); // Check every 60 seconds
}
```

### Checking Health Status

```typescript
import { getHealthChecker } from '@/lib/config';

const checker = getHealthChecker();

// Get overall health status
const status = checker.getLastHealthStatus();
console.log('Overall health:', status.overall); // 'healthy' | 'degraded' | 'unhealthy'

// Check specific service
if (!checker.isServiceHealthy('jupiter')) {
  console.warn('Jupiter API is unhealthy');
}

// Get healthy endpoint for a service
const healthyEndpoint = checker.getHealthyEndpoint('jupiter-price');
```

## Environment Detection

### Checking Current Environment

```typescript
import { API } from '@/lib/config';

// Check environment
if (API.environment.isProduction()) {
  console.log('Running in production');
}

if (API.environment.isDevelopment()) {
  console.log('Running in development');
}

if (API.environment.isVercel()) {
  console.log('Running on Vercel');
}

// Get current environment
const env = API.environment.current(); // 'development' | 'production' | 'test'
```

## Production Deployment

### Pre-Deployment Checklist

1. **Set Required Environment Variables**
   ```bash
   NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
   ```

2. **Set Recommended Variables (for Vercel)**
   ```bash
   NEXT_PUBLIC_HELIUS_RPC=your_helius_endpoint
   NEXT_PUBLIC_QUICKNODE_RPC=your_quicknode_endpoint
   ```

3. **Verify Configuration**
   - Build the app locally: `npm run build`
   - Check console for environment validation messages
   - Ensure no errors about missing variables

### Vercel Deployment

1. **Configure in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add all required and recommended variables
   - Set for Production, Preview, and Development environments

2. **Deploy**
   ```bash
   git push origin main
   # Vercel will automatically deploy
   ```

3. **Verify Deployment**
   - Check `/api/health` endpoint for service status
   - Monitor browser console for health check messages
   - Verify no errors in Vercel function logs

## Troubleshooting

### Issue: "Missing required environment variable: NEXT_PUBLIC_RPC_URL"

**Solution:** Set the environment variable in your `.env.local` file or Vercel dashboard.

```bash
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Issue: Health checks showing all endpoints as unhealthy

**Causes:**
1. Network connectivity issues
2. CORS restrictions (in development)
3. API endpoints temporarily down

**Solutions:**
1. Check internet connection
2. Verify endpoints are accessible via curl:
   ```bash
   curl https://quote-api.jup.ag/v6/health
   ```
3. Check Vercel function logs for errors

### Issue: "Cannot read property of undefined" when using API

**Solution:** Ensure you're importing from the correct path:
```typescript
// Correct
import { API } from '@/lib/config';

// Incorrect
import { API } from '@/lib/api-client';
```

### Issue: Build fails with module not found errors

**Solution:**
1. Clear cache and reinstall:
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   npm run build
   ```

## Best Practices

1. **Always use the API configuration system**
   - Don't hardcode API URLs
   - Use `API.jupiterQuote()` instead of string literals

2. **Start health monitoring early**
   - Initialize in your root layout or app component
   - Monitor health status for critical operations

3. **Handle environment differences**
   - Use environment detection for conditional logic
   - Test in both development and production modes

4. **Monitor in production**
   - Check `/api/health` endpoint regularly
   - Set up alerts for degraded/unhealthy status
   - Review Vercel function logs

5. **Keep fallbacks configured**
   - Always have backup RPC endpoints
   - Configure multiple API endpoint options
   - Test failover scenarios

## Migration Guide

### Migrating Existing Code

**Before:**
```typescript
const response = await fetch('https://quote-api.jup.ag/v6/quote?...');
```

**After:**
```typescript
import { API } from '@/lib/config';

const response = await fetch(`${API.jupiterQuote()}/quote?...`);
```

### Common Replacements

| Old | New |
|-----|-----|
| `'https://quote-api.jup.ag/v6'` | `API.jupiterQuote()` |
| `'https://price.jup.ag/v6'` | `API.jupiterPrice()` |
| `'https://token.jup.ag/all'` | `API.jupiterTokens()` |
| `'https://worker.jup.ag'` | `API.jupiterWorker()` |
| `'https://hermes.pyth.network'` | `API.pythHermes()` |
| `'https://kek.jito.network/api/v1'` | `API.jitoApi()` |
| `'https://solscan.io'` | `API.solanaExplorer()` |

## Testing

### Unit Tests

```typescript
import { getAPIConfig, EnvironmentDetector } from '@/lib/config';

describe('API Configuration', () => {
  it('should return Jupiter Quote URL', () => {
    const config = getAPIConfig();
    const url = config.getJupiterQuoteUrl();
    expect(url).toBeDefined();
    expect(url).toContain('quote-api.jup.ag');
  });
  
  it('should detect production environment', () => {
    process.env.NODE_ENV = 'production';
    expect(EnvironmentDetector.isProduction()).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { getHealthChecker } from '@/lib/config';

describe('Health Checker', () => {
  it('should check endpoint health', async () => {
    const checker = getHealthChecker();
    await checker.runHealthChecks();
    const status = checker.getLastHealthStatus();
    expect(status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(status.overall);
  });
});
```

## Performance Considerations

### Caching

- Token lists are cached for 1 hour
- Price data is cached for 30 seconds (in Jupiter Price Service)
- Health checks run every 60 seconds by default

### Optimization Tips

1. **Batch API calls** - Use bulk endpoints when fetching multiple prices
2. **Implement request deduplication** - Avoid duplicate simultaneous requests
3. **Use appropriate cache durations** - Balance freshness vs. performance
4. **Monitor API usage** - Track rate limits and quotas

## Support

For issues or questions:
1. Check this guide first
2. Review the troubleshooting section
3. Check console logs for detailed error messages
4. Review Vercel function logs (in production)

## Changelog

### Version 1.0.0
- Initial release of centralized API configuration system
- Environment detection and validation
- Health checking with automatic fallback
- Vercel-specific optimizations
- Production readiness checks
