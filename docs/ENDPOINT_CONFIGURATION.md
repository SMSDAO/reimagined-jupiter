# API Endpoint Configuration Guide

## Overview

This guide provides comprehensive configuration instructions for all API endpoints in the GXQ Studio platform.

## Endpoint Directory Structure

```
api/
├── middleware/
│   ├── validation.ts      # Input validation
│   ├── errorHandler.ts    # Error handling
│   ├── cors.ts            # CORS configuration
│   └── index.ts           # Middleware exports
├── admin/
│   ├── auth.ts            # Authentication
│   ├── metrics.ts         # Performance metrics
│   ├── control.ts         # Bot control
│   └── logs.ts            # Log access
├── health.ts              # Health checks
├── monitor.ts             # Opportunity monitoring
├── execute.ts             # Trade execution
└── walletAnalysisEndpoints.ts  # Wallet analysis
```

## Endpoint Configuration

### 1. Health Check (`/api/health`)

**Purpose:** Monitor system health and status

**Method:** `GET`

**Authentication:** None

**Configuration:**
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_base58_private_key
```

**Response:**
```json
{
  "status": "healthy",
  "rpcLatency": 150,
  "walletBalance": 1.5,
  "walletAddress": "...",
  "jupiterApiStatus": "online",
  "uptime": 3600,
  "errorRate": 0.5,
  "timestamp": 1703001234567
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Degraded/Unhealthy

**Rate Limit:** 60 requests/minute

### 2. Monitor (`/api/monitor`)

**Purpose:** Scan for arbitrage opportunities

**Method:** `GET`

**Authentication:** Cron secret (optional)

**Configuration:**
```env
SOLANA_RPC_URL=required
MINIMUM_PROFIT_SOL=0.01
CRON_SECRET=optional_secret
```

**Headers:**
```
Authorization: Bearer ${CRON_SECRET}  # Optional
```

**Response:**
```json
{
  "success": true,
  "opportunitiesFound": 5,
  "topOpportunity": {
    "id": "opp_123",
    "type": "arbitrage",
    "estimatedProfit": 0.025,
    "confidence": 85
  },
  "scanDuration": 1234,
  "timestamp": 1703001234567
}
```

**Rate Limit:** 10 requests/minute

**Cron Schedule:** Every 1 minute

### 3. Execute (`/api/execute`)

**Purpose:** Execute pending arbitrage trades

**Method:** `POST`

**Authentication:** Cron secret (optional)

**Configuration:**
```env
SOLANA_RPC_URL=required
WALLET_PRIVATE_KEY=required
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
CRON_SECRET=optional_secret
```

**Response:**
```json
{
  "success": true,
  "tradesExecuted": 3,
  "successCount": 2,
  "failCount": 1,
  "totalProfit": 0.045,
  "transactions": [...],
  "timestamp": 1703001234567
}
```

**Rate Limit:** 5 requests/minute

**Cron Schedule:** Every 5 minutes

### 4. Admin Authentication (`/api/admin/auth`)

**Purpose:** Admin panel login

**Method:** `POST`

**Authentication:** None (creates JWT)

**Configuration:**
```env
ADMIN_USERNAME=required
ADMIN_PASSWORD=required (plain or bcrypt hash)
JWT_SECRET=required (32+ characters)
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "expiresIn": 86400
}
```

**Rate Limit:** 5 requests/15 minutes

**Security:**
- Use bcrypt hashed passwords in production
- Rotate JWT_SECRET regularly
- Monitor failed login attempts

### 5. Admin Metrics (`/api/admin/metrics`)

**Purpose:** View trading metrics and statistics

**Method:** `GET`

**Authentication:** JWT Bearer token

**Headers:**
```
Authorization: Bearer ${JWT_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "profitToday": 0.5,
    "profitWeek": 2.5,
    "profitMonth": 10.0,
    "tradesCount": 150,
    "successRate": 85.5,
    "avgProfit": 0.035,
    "opportunities24h": 45,
    "rpcHealth": {...},
    "activeStrategies": ["arbitrage"],
    "liveOpportunities": [...]
  },
  "timestamp": 1703001234567
}
```

**Rate Limit:** 30 requests/minute

### 6. Admin Control (`/api/admin/control`)

**Purpose:** Control bot operations

**Method:** `POST`

**Authentication:** JWT Bearer token

**Configuration:**
```env
MINIMUM_PROFIT_SOL=configurable
MAX_SLIPPAGE=configurable
```

**Request Body:**
```json
{
  "command": "start|stop|pause|resume|emergency-stop|get-status|update-config",
  "config": {
    "minProfit": 0.01,
    "slippage": 0.01,
    "enabledStrategies": ["arbitrage"],
    "maxGasPrice": 10000
  }
}
```

**Commands:**
- `start` - Start the bot
- `stop` - Stop the bot
- `pause` - Pause execution
- `resume` - Resume from pause
- `emergency-stop` - Immediate stop
- `get-status` - Get current status
- `update-config` - Update configuration

**Response:**
```json
{
  "success": true,
  "message": "Bot started successfully",
  "currentStatus": {
    "running": true,
    "paused": false,
    "uptime": 3600,
    "currentStrategy": "arbitrage"
  }
}
```

**Rate Limit:** 30 requests/minute

### 7. Wallet Analysis (`/api/walletAnalysisEndpoints`)

**Purpose:** Analyze Solana wallets

**Method:** `POST`

**Authentication:** Optional

**Configuration:**
```env
SOLANA_RPC_URL=required
NEYNAR_API_KEY=optional (for Farcaster integration)
```

**Request Body:**
```json
{
  "walletAddress": "...",
  "includeSocial": true,
  "saveToDatabase": false
}
```

**Rate Limit:** 20 requests/minute

## Global Configuration

### Required Environment Variables

```env
# Solana (Required for all endpoints)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_base58_private_key

# Admin Panel (Required for admin endpoints)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password
JWT_SECRET=your_32_character_secret

# Trading Configuration (Required for execute/monitor)
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
GAS_BUFFER=1.5

# Security (Optional but recommended)
CRON_SECRET=your_cron_secret

# Features (Optional)
NEYNAR_API_KEY=your_neynar_key
```

### CORS Configuration

**Development:**
- Allows all origins
- All methods enabled
- No credentials required

**Production:**
- Whitelist specific domains
- Limited methods (GET, POST, OPTIONS)
- Credentials enabled

**Configure in:** `api/middleware/cors.ts`

```typescript
export const productionCorsOptions: CorsOptions = {
  origin: (origin: string) => {
    const allowedDomains = [
      'https://reimagined-jupiter.vercel.app',
      'https://gxq-studio.vercel.app',
    ];
    return allowedDomains.some(domain => origin.startsWith(domain));
  },
};
```

### Rate Limiting

Configure per endpoint or globally:

```typescript
import { checkRateLimit } from './middleware/validation';

const rateLimit = checkRateLimit(
  getClientIp(req),
  60,  // max requests
  60000  // window in ms (1 minute)
);

if (!rateLimit.allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    resetIn: rateLimit.resetIn,
  });
}
```

## Security Best Practices

### 1. Environment Variables

✅ Never commit `.env` files
✅ Use different secrets per environment
✅ Rotate secrets regularly
✅ Use strong, random values
✅ Minimum 32 characters for JWT_SECRET

### 2. Authentication

✅ Use bcrypt for password hashing
✅ Implement rate limiting on auth endpoints
✅ Use JWT with expiration
✅ Validate tokens on every request
✅ Never log passwords or tokens

### 3. Input Validation

✅ Validate all user input
✅ Use type-safe validation
✅ Sanitize HTML and scripts
✅ Validate Solana addresses
✅ Check array/object sizes

### 4. Error Handling

✅ Never expose stack traces
✅ Use consistent error format
✅ Log errors with context
✅ Return generic messages to users
✅ Monitor error rates

### 5. API Security

✅ Enable CORS with whitelist
✅ Implement rate limiting
✅ Use HTTPS in production
✅ Add request logging
✅ Monitor for abuse

## Testing Endpoints

### Local Testing

```bash
# Start local server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health

# Test auth endpoint
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Test protected endpoint
curl http://localhost:3000/api/admin/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Automated Testing

```bash
# Run endpoint validation
npm run validate-endpoints http://localhost:3000

# Run with custom base URL
npm run validate-endpoints https://your-domain.vercel.app
```

### Production Testing

```bash
# Test production health
curl https://your-domain.vercel.app/api/health

# Monitor continuously
watch -n 5 'curl -s https://your-domain.vercel.app/api/health | jq'
```

## Monitoring & Logging

### Enable Request Logging

Add to each endpoint:

```typescript
console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
console.log('IP:', getClientIp(req));
console.log('Body:', req.body);
```

### Monitor Metrics

Track these metrics:
- Request rate per endpoint
- Response times
- Error rates
- Rate limit hits
- Authentication failures
- RPC latency

### Alert Configuration

Set up alerts for:
- Error rate > 5%
- Response time > 2 seconds
- Rate limit hits > 100/hour
- Failed auth attempts > 10/hour
- Low wallet balance < 0.01 SOL

## Troubleshooting

### Common Issues

**Issue:** 401 Unauthorized
**Solution:** Check JWT token validity and ADMIN_USERNAME/PASSWORD

**Issue:** 429 Rate Limit Exceeded
**Solution:** Wait for reset time or adjust rate limits

**Issue:** 503 Service Unavailable
**Solution:** Check RPC connection and wallet balance

**Issue:** CORS Errors
**Solution:** Add your domain to allowed origins in cors.ts

**Issue:** Slow Responses
**Solution:** Check RPC latency and consider using premium RPC

### Debug Mode

Enable verbose logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Health Check Failures

Check these in order:
1. RPC URL accessible
2. Wallet private key valid
3. Environment variables set
4. Jupiter API accessible
5. Sufficient wallet balance

## Deployment Configuration

### Vercel Configuration

**File:** `vercel.json`

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "crons": [
    {
      "path": "/api/monitor",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/execute",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Railway Configuration

**File:** `railway.json`

```json
{
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

## Next Steps

1. ✅ Configure environment variables
2. ✅ Test all endpoints locally
3. ✅ Deploy to staging
4. ✅ Run automated validation
5. ✅ Monitor for errors
6. ✅ Deploy to production
7. ✅ Set up monitoring alerts

## Resources

- [API Validation Guide](./API_VALIDATION.md)
- [Deployment Automation Guide](./DEPLOYMENT_AUTOMATION.md)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Railway Deployment](https://docs.railway.app)
