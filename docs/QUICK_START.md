# Quick Start Guide: Endpoint Validation & Deployment

## For Developers

### Testing Locally

```bash
# 1. Clone and install
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 3. Build and test
npm run build
npm run lint
npm test

# 4. Validate endpoints
npm run validate-endpoints http://localhost:3000
```

### Adding Validation to Endpoints

```typescript
import { validateRequest, ValidationRule } from '../middleware/validation';
import { withErrorHandler } from '../middleware/errorHandler';
import { withCors, getCorsOptions } from '../middleware/cors';

const validationRules: ValidationRule[] = [
  { field: 'username', type: 'string', required: true, min: 3, max: 50 },
  { field: 'walletAddress', type: 'solana-address', required: true },
  { field: 'amount', type: 'number', required: true, min: 0 },
];

export default withCors(
  withErrorHandler(async (req, res) => {
    // Validate input
    const validation = validateRequest(req.body, validationRules);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    // Your logic here
    return res.status(200).json({ success: true });
  }),
  getCorsOptions()
);
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Auth endpoint
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Protected endpoint (use token from auth response)
curl http://localhost:3000/api/admin/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## For DevOps

### Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Configure secrets
vercel env add SOLANA_RPC_URL production
vercel env add WALLET_PRIVATE_KEY production
vercel env add ADMIN_USERNAME production
vercel env add ADMIN_PASSWORD production
vercel env add JWT_SECRET production

# 3. Deploy
vercel --prod
```

### Deploy to Railway

```bash
# 1. Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# 2. Login and link project
railway login
railway link

# 3. Set environment variables
railway variables set SOLANA_RPC_URL=your_value
railway variables set WALLET_PRIVATE_KEY=your_value
railway variables set ADMIN_USERNAME=admin
railway variables set ADMIN_PASSWORD=strong_password
railway variables set JWT_SECRET=your_secret

# 4. Deploy
railway up
```

### GitHub Actions Setup

```bash
# 1. Add secrets to GitHub
# Go to: Settings → Secrets and variables → Actions

# For Vercel:
# - VERCEL_TOKEN
# - VERCEL_ORG_ID
# - VERCEL_PROJECT_ID

# For Railway:
# - RAILWAY_TOKEN
# - RAILWAY_PROJECT_ID

# 2. Workflows will run automatically on push to main
```

## Common Tasks

### Enable Auto-Merge for PR

```bash
# Add label to PR
gh pr edit <pr-number> --add-label "auto-merge"

# Skip deployment checks (optional)
gh pr edit <pr-number> --add-label "skip-deployment"
```

### Manual Deployment

```bash
# Trigger Vercel deployment
gh workflow run deploy-vercel.yml -f environment=production

# Trigger Railway deployment
gh workflow run deploy-railway.yml
```

### Rollback Deployment

```bash
# Vercel
vercel rollback --token=$VERCEL_TOKEN

# Railway
railway rollback
```

### View Logs

```bash
# Vercel
vercel logs [deployment-url]

# Railway
railway logs

# GitHub Actions
gh run view --log
```

## Environment Variables

### Required for All Environments

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_base58_private_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password_here
JWT_SECRET=your_32_character_secret_key
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
```

### Optional

```env
CRON_SECRET=your_cron_secret
NEYNAR_API_KEY=your_neynar_api_key
LOG_LEVEL=info
NODE_ENV=production
```

## Validation Types

```typescript
// String validation
{ field: 'username', type: 'string', required: true, min: 3, max: 50 }

// Number validation
{ field: 'amount', type: 'number', required: true, min: 0, max: 1000000 }

// Boolean validation
{ field: 'enabled', type: 'boolean', required: true }

// Email validation
{ field: 'email', type: 'email', required: true }

// URL validation
{ field: 'website', type: 'url', required: false }

// Solana address validation
{ field: 'walletAddress', type: 'solana-address', required: true }

// Enum validation
{ field: 'status', type: 'string', enum: ['active', 'inactive', 'pending'] }

// Custom validation
{
  field: 'amount',
  type: 'number',
  custom: (value) => value > 0 || 'Amount must be positive'
}
```

## Error Types

```typescript
import {
  ValidationError,        // 400 - Input validation failed
  AuthenticationError,    // 401 - Not authenticated
  AuthorizationError,     // 403 - Not authorized
  NotFoundError,          // 404 - Resource not found
  RateLimitError,         // 429 - Rate limit exceeded
  ConfigurationError,     // 500 - Missing config
  ExternalServiceError,   // 503 - External service failed
} from '../middleware/errorHandler';

// Usage
throw new ValidationError('Username is required');
throw new AuthenticationError();
throw new RateLimitError('Too many requests', 3600000); // Reset in 1 hour
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/health` | 60 requests | 1 minute |
| `/api/admin/auth` | 5 requests | 15 minutes |
| `/api/monitor` | 10 requests | 1 minute |
| `/api/execute` | 5 requests | 1 minute |
| `/api/admin/*` | 30 requests | 1 minute |

## Troubleshooting

### Build Fails
```bash
# Check for errors
npm run lint
npm run build

# Check dependencies
npm ci
```

### Deployment Fails
```bash
# Check GitHub Actions logs
gh run list --limit 5
gh run view <run-id> --log

# Check deployment status
vercel ls  # For Vercel
railway status  # For Railway
```

### Health Check Fails
```bash
# Test RPC connection
curl -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Check environment variables
vercel env ls  # For Vercel
railway variables  # For Railway
```

### CORS Errors
```typescript
// Update allowed domains in api/middleware/cors.ts
export const productionCorsOptions: CorsOptions = {
  origin: (origin: string) => {
    const allowedDomains = [
      'https://your-domain.vercel.app',
      // Add your domain here
    ];
    return allowedDomains.some(domain => origin.startsWith(domain));
  },
};
```

## Documentation

- [API Validation Guide](./API_VALIDATION.md) - Comprehensive validation documentation
- [Deployment Automation](./DEPLOYMENT_AUTOMATION.md) - Deployment workflows and processes
- [Endpoint Configuration](./ENDPOINT_CONFIGURATION.md) - Endpoint configuration reference
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Complete implementation details

## Support

### Getting Help
1. Check documentation in `docs/` directory
2. Review GitHub Actions logs
3. Check platform-specific logs (Vercel/Railway)
4. Create GitHub issue with `help` label

### Useful Commands
```bash
# View all workflows
gh workflow list

# Trigger workflow manually
gh workflow run <workflow-name>

# View recent runs
gh run list --limit 10

# Watch logs live
gh run watch

# Validate endpoints
npm run validate-endpoints http://localhost:3000
```

## Best Practices

✅ Always validate input
✅ Use type-safe validation
✅ Handle errors gracefully
✅ Test locally before deploying
✅ Use preview deployments
✅ Monitor after deployment
✅ Keep secrets secure
✅ Rotate secrets regularly
✅ Document API changes
✅ Write tests for endpoints

## Next Steps

1. ✅ Configure environment variables
2. ✅ Test endpoints locally
3. ✅ Run automated validation
4. ✅ Deploy to staging
5. ✅ Test deployment
6. ✅ Deploy to production
7. ✅ Monitor and maintain

---

**Ready to deploy?** Follow the guides above and ensure all checks pass before deploying to production!
