# Environment Variables Reference

This document provides a complete reference for all environment variables used in GXQ Studio.

## Critical Production Variables

These variables **must** be set for production deployment:

### Solana Configuration

| Variable | Required | Description | Example | Notes |
|----------|----------|-------------|---------|-------|
| `SOLANA_RPC_URL` | ✅ Yes | Solana RPC endpoint URL | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` | Use premium RPC for production (Helius, QuickNode, Triton) |
| `WALLET_PRIVATE_KEY` | ✅ Yes | Trading wallet private key (base58) | `5Kd3...` | **Never commit to version control!** Use dedicated trading wallet |

### Admin Panel Security

| Variable | Required | Description | Example | Notes |
|----------|----------|-------------|---------|-------|
| `ADMIN_USERNAME` | ✅ Yes | Admin panel username | `your_unique_admin` | Change from default `admin` |
| `ADMIN_PASSWORD` | ✅ Yes | Admin panel password | `$2b$10$...` | Use bcrypt hash: `npm run hash-password` |
| `JWT_SECRET` | ✅ Yes | JWT signing secret (32+ chars) | `openssl rand -base64 32` | Generate: `openssl rand -base64 32` |
| `CRON_SECRET` | ⚠️ Recommended | Cron endpoint authorization | `openssl rand -base64 24` | Protects cron endpoints |

### Trading Configuration

| Variable | Required | Description | Default | Notes |
|----------|----------|-------------|---------|-------|
| `MINIMUM_PROFIT_SOL` | ❌ No | Minimum profit threshold (SOL) | `0.01` | Adjust based on market conditions |
| `MAX_SLIPPAGE` | ❌ No | Maximum slippage tolerance (0.01 = 1%) | `0.01` | Higher for volatile markets |
| `GAS_BUFFER` | ❌ No | Gas fee multiplier | `1.5` | Buffer for gas estimation |

### Dev Fee Configuration

| Variable | Required | Description | Default | Notes |
|----------|----------|-------------|---------|-------|
| `DEV_FEE_ENABLED` | ❌ No | Enable dev fee | `true` | Set to `false` to disable |
| `DEV_FEE_PERCENTAGE` | ❌ No | Dev fee percentage (0.10 = 10%) | `0.10` | Must be <= 0.5 (50%) |
| `DEV_FEE_WALLET` | ✅ Yes (if enabled) | Dev fee recipient wallet | `GXQ...` | Valid Solana address required |

## Optional Production Variables

### Database (PostgreSQL)

Enable persistent storage for wallets, bots, and audit logs:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DB_HOST` | ❌ No | Database host | `localhost` or `db.example.com` |
| `DB_PORT` | ❌ No | Database port | `5432` |
| `DB_NAME` | ❌ No | Database name | `gxq_studio` |
| `DB_USER` | ❌ No | Database username | `postgres` |
| `DB_PASSWORD` | ❌ No | Database password | `secure_password` |
| `DB_SSL` | ❌ No | Enable SSL for database | `true` |

**Note:** If `DB_HOST` is set, then `DB_USER`, `DB_PASSWORD`, and `DB_NAME` are required.

### QuickNode Integration

Enhanced features with QuickNode infrastructure:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `QUICKNODE_RPC_URL` | ❌ No | QuickNode RPC endpoint | `https://example.solana-mainnet.quiknode.pro/YOUR_KEY/` |
| `QUICKNODE_API_KEY` | ❌ No | QuickNode API key | `your_api_key` |
| `QUICKNODE_FUNCTIONS_URL` | ❌ No | QuickNode Functions endpoint | `https://functions.quicknode.com/...` |
| `QUICKNODE_KV_URL` | ❌ No | QuickNode KV Store endpoint | `https://kv.quicknode.com/...` |
| `QUICKNODE_STREAMS_URL` | ❌ No | QuickNode Streams endpoint | `wss://streams.quicknode.com/...` |

### Flash Loan Providers

Mainnet program IDs for flash loan providers:

| Variable | Required | Description | Default Value |
|----------|----------|-------------|---------------|
| `MARGINFI_PROGRAM_ID` | ❌ No | Marginfi program ID | `MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA` |
| `SOLEND_PROGRAM_ID` | ❌ No | Solend program ID | `So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo` |
| `MANGO_PROGRAM_ID` | ❌ No | Mango program ID | `mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68` |
| `KAMINO_PROGRAM_ID` | ❌ No | Kamino program ID | `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD` |
| `PORT_FINANCE_PROGRAM_ID` | ❌ No | Port Finance program ID | `Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR` |
| `SAVE_FINANCE_PROGRAM_ID` | ❌ No | Save Finance program ID | `SAVEg4Je7HZcJk2X1FTr1vfLhQqrpXPTvAWmYnYY1Wy` |

### DEX Program IDs

| Variable | Required | Description | Default Value |
|----------|----------|-------------|---------------|
| `JUPITER_V6_PROGRAM_ID` | ❌ No | Jupiter v6 program ID | `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` |

### GXQ Ecosystem

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GXQ_TOKEN_MINT` | ❌ No | GXQ token mint address | `GXQ...` |
| `GXQ_ECOSYSTEM_PROGRAM_ID` | ❌ No | GXQ ecosystem program ID | `GXQ...` |

### Farcaster Integration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEYNAR_API_KEY` | ❌ No | Neynar API key for Farcaster | `your_neynar_api_key` |

## Application Settings

### Logging & Monitoring

| Variable | Required | Description | Default | Options |
|----------|----------|-------------|---------|---------|
| `LOG_LEVEL` | ❌ No | Logging verbosity | `info` | `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | ❌ No | Node environment | `production` | `development`, `production` |
| `PORT` | ❌ No | Server port | `3000` | Any valid port number |
| `METRICS_PORT` | ❌ No | Prometheus metrics port | `9090` | Any valid port number |

### Production System Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `AUTO_FIX_ENABLED` | ❌ No | Enable auto-fix system | `false` |
| `AUTO_REDEPLOY_ENABLED` | ❌ No | Enable auto-redeploy | `false` |
| `ANALYSIS_WINDOW` | ❌ No | Analysis window (minutes) | `60` |
| `MIN_ERROR_THRESHOLD` | ❌ No | Minimum error threshold | `5` |

### Deployment URLs

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `STAGING_URL` | ❌ No | Staging environment URL | `https://gxq-staging.vercel.app` |
| `PRODUCTION_URL` | ❌ No | Production environment URL | `https://gxq.vercel.app` |

## CI/CD & Integration Variables

### GitHub Integration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_TOKEN` | ❌ No | GitHub API token | `ghp_...` |

### Vercel Integration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VERCEL_TOKEN` | ❌ No | Vercel API token | `your_vercel_token` |
| `VERCEL_ORG_ID` | ❌ No | Vercel organization ID | `team_...` |
| `VERCEL_PROJECT_ID` | ❌ No | Vercel project ID | `prj_...` |

### Railway Integration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RAILWAY_TOKEN` | ❌ No | Railway API token | `your_railway_token` |
| `RAILWAY_PROJECT_ID` | ❌ No | Railway project ID | `2077acd9-f81f-47ba-b8c7-8bf6905f45fc` |

### Monitoring & Alerting

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GRAFANA_API_KEY` | ❌ No | Grafana API key | `your_grafana_key` |
| `GRAFANA_URL` | ❌ No | Grafana instance URL | `https://your-grafana-instance.com` |
| `SLACK_WEBHOOK` | ❌ No | Slack webhook for notifications | `https://hooks.slack.com/services/...` |

## Webapp-Specific Variables

For Next.js webapp deployment (prefix with `NEXT_PUBLIC_` for client-side access):

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_RPC_URL` | ✅ Yes | Public RPC URL for webapp | `https://api.mainnet-beta.solana.com` |
| `NEXT_PUBLIC_API_URL` | ❌ No | Backend API URL | `https://api.gxq.studio` |

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
   - Use `.env` file locally (git ignored)
   - Use platform-specific secret management (Vercel/Railway env vars)

2. **Generate strong secrets**
   ```bash
   # JWT Secret (32+ characters)
   openssl rand -base64 32
   
   # Cron Secret
   openssl rand -base64 24
   
   # Admin Password (bcrypt)
   npm run hash-password
   ```

3. **Rotate secrets regularly**
   - JWT_SECRET: Every 90 days
   - ADMIN_PASSWORD: Every 90 days
   - API keys: When provider recommends

### Environment-Specific Configuration

#### Development (.env.local)
```env
NODE_ENV=development
LOG_LEVEL=debug
SOLANA_RPC_URL=https://api.devnet.solana.com
```

#### Staging (.env.staging)
```env
NODE_ENV=production
LOG_LEVEL=info
SOLANA_RPC_URL=https://api.devnet.solana.com
STAGING_URL=https://gxq-staging.vercel.app
```

#### Production (.env.production)
```env
NODE_ENV=production
LOG_LEVEL=info
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
PRODUCTION_URL=https://gxq.studio
```

## Validation

Run production environment validation:

```bash
npm run validate-production
```

This checks:
- ✅ All required variables are set
- ✅ Values are not default/placeholder
- ✅ Secrets meet minimum security requirements
- ✅ Wallet addresses are valid Solana addresses
- ✅ Numeric values are within acceptable ranges

## Troubleshooting

### Common Issues

**Error: "SOLANA_RPC_URL is required"**
- Solution: Set `SOLANA_RPC_URL` in `.env` file

**Error: "JWT_SECRET must be at least 32 characters"**
- Solution: Generate new secret: `openssl rand -base64 32`

**Error: "ADMIN_PASSWORD must be changed from default value"**
- Solution: Set custom password or use bcrypt hash: `npm run hash-password`

**Error: "DEV_FEE_WALLET is not a valid Solana address"**
- Solution: Provide valid Solana public key (base58 format)

**Warning: "Using public RPC endpoint"**
- Impact: Rate limits may cause issues in production
- Solution: Use premium RPC (Helius, QuickNode, Triton)

## Support

For questions about environment configuration:
- **Documentation**: https://github.com/SMSDAO/reimagined-jupiter/tree/main/docs
- **Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues
- **Security**: security@gxq.studio

---

**Last Updated**: December 2024
