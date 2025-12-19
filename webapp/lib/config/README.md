# Centralized API Configuration System

A comprehensive, production-ready API configuration system for managing external service endpoints with automatic environment detection, health checking, and fallback mechanisms.

## Quick Start

### Basic Usage

```typescript
import { API } from '@/lib/config';

// Get API endpoints
const jupiterQuoteUrl = API.jupiterQuote();
const jupiterPriceUrl = API.jupiterPrice();
const pythHermesUrl = API.pythHermes();

// Use in API calls
const response = await fetch(`${jupiterQuoteUrl}/quote?...`);
```

### Environment Detection

```typescript
import { API } from '@/lib/config';

if (API.environment.isProduction()) {
  console.log('Running in production mode');
}

if (API.environment.isVercel()) {
  console.log('Deployed on Vercel');
}
```

### Health Monitoring

```typescript
import { startAPIHealthMonitoring, getHealthChecker } from '@/lib/config';

// Start monitoring (in root layout or app initialization)
startAPIHealthMonitoring(60000); // Check every 60 seconds

// Check health status
const checker = getHealthChecker();
const status = checker.getLastHealthStatus();
console.log('Health:', status.overall); // 'healthy' | 'degraded' | 'unhealthy'
```

## Architecture

### Modules

#### 1. `api-config.ts`
Core configuration management with environment detection and validation.

**Classes:**
- `EnvironmentDetector` - Detects current environment
- `EnvironmentValidator` - Validates environment variables
- `APIConfigManager` - Manages API configurations
- `API` - Convenience object for endpoint access

#### 2. `health-checker.ts`
Monitors API endpoint health with automatic fallback.

**Classes:**
- `APIHealthChecker` - Performs health checks and tracks status

#### 3. `vercel-config.ts`
Vercel-specific configuration and optimizations.

**Classes:**
- `VercelConfigManager` - Manages Vercel settings
- `EdgeRuntimeChecker` - Checks Edge Runtime compatibility
- `ProductionReadinessChecker` - Validates production readiness

#### 4. `index.ts`
Central export point for all modules.

## API Reference

### API Object

Convenience object for quick endpoint access:

```typescript
API.jupiterQuote()      // Jupiter Quote API v6
API.jupiterPrice()      // Jupiter Price API v6
API.jupiterTokens()     // Jupiter Token List
API.jupiterWorker()     // Jupiter Worker API
API.pythHermes()        // Pyth Hermes endpoint
API.jitoApi()           // Jito API v1
API.solanaExplorer()    // Solana Explorer
```

### Environment Detection

```typescript
API.environment.current()       // Get current environment
API.environment.isProduction()  // Check if production
API.environment.isDevelopment() // Check if development
API.environment.isVercel()      // Check if on Vercel
```

### Configuration Manager

```typescript
import { getAPIConfig } from '@/lib/config';

const config = getAPIConfig();

// Get URLs
config.getJupiterQuoteUrl()
config.getJupiterPriceUrl()
config.getPythHermesUrl()

// Get health status
config.getHealthStatus()

// Mark endpoint unhealthy
config.markEndpointUnhealthy(url)

// Check all endpoints
await config.checkAllEndpointsHealth()
```

### Health Checker

```typescript
import { getHealthChecker } from '@/lib/config';

const checker = getHealthChecker();

// Start/stop monitoring
checker.startHealthChecks(60000)
checker.stopHealthChecks()

// Get health status
const status = checker.getLastHealthStatus()
const isHealthy = checker.isServiceHealthy('jupiter')
const endpoint = checker.getHealthyEndpoint('jupiter-price')

// Run checks manually
await checker.runHealthChecks()
```

### Vercel Configuration

```typescript
import { getVercelConfig } from '@/lib/config';

const config = getVercelConfig();

// Check Vercel status
config.isVercel()
config.isVercelProduction()
config.isVercelPreview()

// Get deployment info
config.getDeploymentUrl()

// Get optimizations
const opts = config.getOptimizations()
// Returns: { cacheControl, revalidate, edgeRuntime }
```

## Environment Variables

### Required

```bash
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Recommended (Production)

```bash
# Premium RPC endpoints
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_QUICKNODE_RPC=https://your-endpoint.quiknode.pro/YOUR_KEY

# API endpoints (optional, uses defaults)
NEXT_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag
PYTH_HERMES_ENDPOINT=https://hermes.pyth.network
```

### Automatic (Set by Platform)

```bash
# Set by Next.js
NODE_ENV=development|production|test

# Set by Vercel
VERCEL=1
VERCEL_ENV=production|preview|development
VERCEL_URL=your-app.vercel.app
```

## Features

### 1. Environment Detection
- Automatic detection of development/production/test
- Vercel-specific environment detection
- Platform detection (Vercel, other)

### 2. Configuration Management
- Centralized endpoint configuration
- Multiple endpoint support per service
- Fallback endpoint selection
- Runtime validation

### 3. Health Monitoring
- Periodic health checks (configurable interval)
- Overall health status tracking
- Service-specific health queries
- Automatic failover to backup endpoints

### 4. Production Optimizations
- Environment-based cache control
- Vercel-specific optimizations
- Edge Runtime compatibility
- Production readiness validation

### 5. Type Safety
- Full TypeScript support
- Type-safe endpoint access
- Compile-time validation

## Integration Examples

### API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { API } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const jupiterUrl = API.jupiterQuote();
    const response = await fetch(`${jupiterUrl}/quote?...`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Client Component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { API } from '@/lib/config';

export default function PriceDisplay() {
  const [price, setPrice] = useState(0);
  
  useEffect(() => {
    const fetchPrice = async () => {
      const priceUrl = API.jupiterPrice();
      const response = await fetch(`${priceUrl}/price?ids=...`);
      const data = await response.json();
      setPrice(data.data['...'].price);
    };
    
    fetchPrice();
  }, []);
  
  return <div>Price: ${price}</div>;
}
```

### Server Component

```typescript
import { API, getAPIConfig } from '@/lib/config';

export default async function DataPage() {
  const config = getAPIConfig();
  const tokensUrl = config.getJupiterTokensUrl();
  
  const response = await fetch(tokensUrl);
  const tokens = await response.json();
  
  return <div>{/* render tokens */}</div>;
}
```

## Error Handling

### Configuration Errors

The system logs warnings for:
- Missing required environment variables
- Missing recommended variables (production)
- Invalid configurations
- Health check failures

Example output:
```
=== Environment Validation ===
Environment: production
Running on Vercel: true
❌ Environment Errors:
  - Missing required environment variable: NEXT_PUBLIC_RPC_URL
⚠️  Environment Warnings:
  - Recommended environment variable not set: NEXT_PUBLIC_HELIUS_RPC
```

### Health Check Errors

Health check failures are logged but don't break the application:
```
🏥 Health check complete: degraded (5/6 healthy)
⚠️  Health check failed for Jupiter Worker API: timeout
```

## Best Practices

1. **Always use the configuration system**
   ```typescript
   // ✅ Good
   const url = API.jupiterQuote();
   
   // ❌ Bad
   const url = 'https://quote-api.jup.ag/v6';
   ```

2. **Start health monitoring early**
   ```typescript
   // In root layout or app component
   useEffect(() => {
     startAPIHealthMonitoring(60000);
   }, []);
   ```

3. **Handle environment differences**
   ```typescript
   if (API.environment.isProduction()) {
     // Production-specific logic
   }
   ```

4. **Check health before critical operations**
   ```typescript
   const checker = getHealthChecker();
   if (!checker.isServiceHealthy('jupiter')) {
     // Handle degraded state
   }
   ```

5. **Use proper error handling**
   ```typescript
   try {
     const url = API.jupiterQuote();
     const response = await fetch(`${url}/quote?...`);
     // ...
   } catch (error) {
     // Handle error with fallback
   }
   ```

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

## Troubleshooting

### Issue: Environment variables not working

**Check:**
1. Variable names are correct (with `NEXT_PUBLIC_` prefix if needed)
2. `.env.local` file exists in webapp directory
3. Restart dev server after adding variables
4. Vercel dashboard has variables set for production

### Issue: Health checks not running

**Check:**
1. `startAPIHealthMonitoring()` is called
2. Called on client-side (inside `useEffect`)
3. No JavaScript errors in console
4. Network access is available

### Issue: Build fails with import errors

**Solution:**
```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

## Documentation

- **Complete Guide**: `../../API_CONFIG_GUIDE.md`
- **Implementation Summary**: `../../IMPLEMENTATION_SUMMARY.md`
- **Testing Checklist**: `../../TESTING_CHECKLIST.md`
- **Deployment Guide**: `../../../VERCEL_DEPLOY.md`

## Support

For issues or questions:
1. Check the documentation files listed above
2. Review troubleshooting section
3. Check console logs for detailed errors
4. Review environment variable configuration

## License

Part of the GXQ Studio project. See main repository for license information.
