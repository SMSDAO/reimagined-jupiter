# Vercel Production Deployment Guide

## Overview

This guide covers deploying the GXQ Studio webapp to Vercel in production mode with automatic API endpoint updates and environment-based configuration.

## Key Features

✅ **Centralized API Configuration** - All API endpoints managed in one place  
✅ **Environment-Based Setup** - Automatic detection of production vs development  
✅ **Dynamic Endpoint Updates** - API URLs update automatically based on environment variables  
✅ **Multiple RPC Fallback** - Automatic failover between RPC providers  
✅ **Production Optimizations** - Security headers, compression, and caching  
✅ **Zero Hardcoded URLs** - All external services configured via environment variables  

## Architecture Changes

### Centralized API Configuration

All API endpoints are now managed through `/webapp/lib/config/api-endpoints.ts`:

```typescript
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';

// Use throughout your app
const price = await fetch(`${API_ENDPOINTS.JUPITER_PRICE}/price?ids=${mints}`);
const quote = await fetch(`${API_ENDPOINTS.JUPITER_QUOTE}/quote?...`);
```

### Environment Detection

The system automatically detects:
- `NODE_ENV` (production/development)
- `VERCEL` environment (Vercel deployment)
- RPC endpoint priorities

### Supported Environment Variables

#### Required for Production

```bash
# At minimum, set ONE of these RPC endpoints:
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
# OR
NEXT_PUBLIC_QUICKNODE_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY
# OR
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

#### Optional but Recommended

```bash
# Jupiter API endpoints (defaults are provided)
NEXT_PUBLIC_JUPITER_QUOTE_API=https://quote-api.jup.ag/v6
NEXT_PUBLIC_JUPITER_PRICE_API=https://price.jup.ag/v6
NEXT_PUBLIC_JUPITER_WORKER_API=https://worker.jup.ag

# WalletConnect (required for wallet connections)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Pyth Network (for price feeds)
NEXT_PUBLIC_PYTH_HERMES_ENDPOINT=https://hermes.pyth.network

# Jito (for MEV protection)
NEXT_PUBLIC_JITO_API_URL=https://kek.jito.network/api/v1
```

## Deployment Steps

### 1. Prepare Repository

Ensure you have the latest code with the centralized configuration:

```bash
git pull origin main
cd webapp
npm install
npm run build  # Verify build succeeds
```

### 2. Deploy to Vercel (Dashboard Method)

1. **Go to** [Vercel Dashboard](https://vercel.com/new)

2. **Import Repository**: `SMSDAO/reimagined-jupiter`

3. **Configure Project Settings**:
   - **Root Directory**: `webapp` ⚠️ **CRITICAL**
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

4. **Environment Variables** (Settings → Environment Variables):

   **Production Environment:**
   ```bash
   # RPC Configuration (choose one or more for fallback)
   NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   NEXT_PUBLIC_QUICKNODE_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY
   NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
   
   # WalletConnect (REQUIRED)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   
   # Optional: Custom API endpoints (uses defaults if not set)
   NEXT_PUBLIC_JUPITER_QUOTE_API=https://quote-api.jup.ag/v6
   NEXT_PUBLIC_JUPITER_PRICE_API=https://price.jup.ag/v6
   NEXT_PUBLIC_PYTH_HERMES_ENDPOINT=https://hermes.pyth.network
   ```

5. **Deploy**: Click "Deploy" and wait for build to complete

### 3. Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Navigate to webapp directory
cd webapp

# Deploy to production
vercel --prod

# Follow prompts to configure environment variables
```

### 4. Verify Deployment

After deployment completes:

1. **Check Health Endpoint**: 
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "rpcLatency": 150,
     "jupiterApiStatus": "online",
     "timestamp": 1703001234567,
     "rpcEndpoint": "your-configured-rpc"
   }
   ```

2. **Test Pages**:
   - Home: `https://your-app.vercel.app/`
   - Swap: `https://your-app.vercel.app/swap`
   - Settings: `https://your-app.vercel.app/settings`
   - Admin: `https://your-app.vercel.app/admin`

3. **Check Console Logs**:
   Open browser console, you should see:
   ```
   🔧 API Configuration: {
     environment: "production",
     platform: "Vercel",
     endpoints: { ... }
   }
   ```

## Production Features

### 1. Automatic RPC Failover

The system automatically rotates between configured RPC endpoints:
- Health checks every 30 seconds
- Automatic failover on errors
- Prioritizes by latency (fastest first)

### 2. API Endpoint Management

All external API calls use centralized configuration:
- Jupiter Quote API
- Jupiter Price API
- Jupiter Worker API (airdrops)
- Pyth Hermes (price feeds)
- Jito API (MEV protection)
- Solana RPC endpoints

### 3. Security Headers

Automatically applied to all API routes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Cache-Control: no-store, must-revalidate`

### 4. Environment Validation

On app startup, the system validates:
- Required environment variables are set
- RPC endpoints are accessible
- API endpoints respond correctly

Access validation info at: `/settings` page

## Troubleshooting

### Issue: "Missing environment variables" warning

**Solution**: Add required environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_RPC_URL` at minimum
3. Redeploy

### Issue: "All endpoints unhealthy"

**Symptoms**: RPC rotator can't connect to any endpoint

**Solution**:
1. Verify RPC URLs are correct in environment variables
2. Check if you have a premium RPC configured (Helius/QuickNode)
3. Test RPC manually: `curl -X POST your-rpc-url -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`
4. Consider adding multiple fallback RPCs

### Issue: "Jupiter API unavailable"

**Symptoms**: `/api/health` shows `jupiterApiStatus: "offline"`

**Solution**:
1. Check if Jupiter API is down: https://status.jup.ag/
2. Verify `NEXT_PUBLIC_JUPITER_QUOTE_API` is correct
3. Try default endpoint: `https://quote-api.jup.ag/v6`

### Issue: Wallet connection fails

**Symptoms**: "WalletConnect error" or wallet doesn't connect

**Solution**:
1. Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set
2. Get free project ID at https://cloud.walletconnect.com/
3. Verify domain is whitelisted in WalletConnect dashboard
4. Redeploy after adding environment variable

### Issue: Rate limiting errors

**Symptoms**: "Too many requests" errors from public RPC

**Solution**:
1. Upgrade to premium RPC (Helius or QuickNode)
2. Add multiple RPC endpoints for automatic rotation
3. Consider caching strategies for frequently accessed data

### Issue: Build fails in Vercel

**Symptoms**: Deployment fails during build step

**Solution**:
1. Check build logs in Vercel dashboard
2. Verify `package.json` has correct dependencies
3. Ensure TypeScript has no errors: `npm run build` locally
4. Check if Node.js version is compatible (18.x recommended)

## Performance Optimization

### 1. Use Premium RPC Providers

**Recommended for production:**
- **Helius**: Best performance, generous free tier
- **QuickNode**: Reliable, good for high-volume
- **Triton**: Cost-effective, good speed

### 2. Configure Multiple Endpoints

Set up failover for 99.9% uptime:

```bash
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=KEY1
NEXT_PUBLIC_QUICKNODE_RPC=https://endpoint.quiknode.pro/KEY2
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### 3. Monitor Health

Set up monitoring alerts:
- Health check endpoint: `/api/health`
- Monitor RPC latency (should be <500ms)
- Track Jupiter API availability

### 4. Optimize Caching

The system automatically caches:
- Token prices (30 second TTL)
- RPC responses (where appropriate)
- Static assets (via Vercel CDN)

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com  # Use devnet for testing
```

Features:
- Console logging enabled
- RPC endpoint shown in responses
- Detailed error messages

### Production

```bash
NODE_ENV=production
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=KEY
NEXT_PUBLIC_QUICKNODE_RPC=https://endpoint.quiknode.pro/KEY
```

Features:
- Optimized builds
- Minimal logging
- Security headers enabled
- RPC endpoint hidden in responses

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

1. **Production**: Push to `main` branch
   ```bash
   git push origin main
   ```

2. **Preview**: Push to any other branch
   ```bash
   git push origin feature-branch
   ```

### Environment Variables Per Branch

Configure different variables for preview vs production:
- Production: Set on "Production" environment
- Preview: Set on "Preview" environment
- Development: Use `.env.local` file locally

## Monitoring

### Built-in Health Check

Monitor your deployment:

```bash
# Check health
curl https://your-app.vercel.app/api/health

# Sample response
{
  "status": "healthy",
  "rpcLatency": 150,
  "jupiterApiStatus": "online",
  "timestamp": 1703001234567,
  "rpcEndpoint": "https://mainnet.helius-rpc.com"
}
```

### Vercel Analytics

Enable in Vercel dashboard:
- Real User Monitoring (RUM)
- Web Vitals
- API route performance
- Error tracking

### Custom Monitoring

Add your own monitoring service:
- Set up Sentry for error tracking
- Use Datadog for metrics
- Configure alerts for health check failures

## Cost Estimation

### Vercel (Hobby - Free)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ❌ No commercial use

### Vercel (Pro - $20/month)
- ✅ Commercial use
- ✅ 1TB bandwidth/month
- ✅ Password protection
- ✅ Advanced analytics

### RPC Providers (Monthly)
- **Public RPC**: Free (rate limited, slower)
- **Helius Free**: Free up to 100k requests
- **QuickNode Starter**: $49/month
- **Helius Developer**: $99/month

**Recommended Stack**: Vercel Pro + Helius Developer = $119/month

## Security Best Practices

### 1. Environment Variables
- ✅ Use `NEXT_PUBLIC_` prefix only for client-safe variables
- ✅ Never commit `.env` files to Git
- ✅ Rotate API keys regularly
- ✅ Use different keys for preview vs production

### 2. API Keys
- ✅ Store sensitive keys server-side only
- ✅ Use Vercel environment variables
- ✅ Enable API key restrictions (IP allowlist)
- ✅ Monitor API usage for anomalies

### 3. RPC Endpoints
- ✅ Use authenticated endpoints in production
- ✅ Don't expose endpoints in client-side code
- ✅ Implement rate limiting if needed
- ✅ Monitor for unusual traffic patterns

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Solana Documentation**: https://docs.solana.com/
- **Jupiter Documentation**: https://station.jup.ag/docs
- **GitHub Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues

## Checklist

Before going live:

- [ ] All environment variables configured in Vercel
- [ ] Premium RPC provider set up (Helius/QuickNode)
- [ ] WalletConnect project ID configured
- [ ] Health check endpoint responds successfully
- [ ] All pages load without errors
- [ ] Wallet connection works
- [ ] Swap functionality tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring/alerts set up
- [ ] Backup RPC endpoints configured
- [ ] Security headers verified
- [ ] Performance tested under load

---

**Deployment Status**: Production Ready ✅  
**Last Updated**: December 19, 2025  
**Version**: 2.0.0 (Centralized Configuration)
