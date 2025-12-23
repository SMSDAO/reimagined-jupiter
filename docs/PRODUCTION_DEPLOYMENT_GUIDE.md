# Production Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Configuration](#environment-configuration)
5. [Security Best Practices](#security-best-practices)
6. [Deployment Steps](#deployment-steps)
7. [Production Guardrails](#production-guardrails)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

## Overview

GXQ Studio is a production-grade Solana DeFi platform featuring flash loan arbitrage, airdrop claiming, token operations, and real-time market analysis. This guide provides comprehensive instructions for deploying to production.

### Architecture Components

- **Backend**: TypeScript Node.js application handling core trading logic
- **Frontend**: Next.js 16 web application with React 19
- **Database**: PostgreSQL for arbitrage history and analytics
- **Real-time**: WebSocket server for live price updates
- **APIs**: RESTful endpoints and Solana RPC integrations

## Prerequisites

### Required Software
- Node.js 20.x or higher
- npm 9.x or higher
- PostgreSQL 15+ (optional, for database features)
- Git for version control

### Required Accounts
- QuickNode account with RPC endpoint (recommended) or alternative production RPC
- Solana mainnet wallet with sufficient SOL for operations
- (Optional) Additional API keys for enhanced features

### Minimum System Requirements
- **Production Server**: 2 CPU cores, 4GB RAM, 20GB storage
- **Development**: 1 CPU core, 2GB RAM, 10GB storage

## Pre-Deployment Checklist

### Security ✅
- [ ] Private keys stored securely in environment variables
- [ ] No secrets committed to source control
- [ ] All API keys configured in environment
- [ ] Production RPC endpoint configured (not public endpoint)
- [ ] Wallet has sufficient balance (minimum 0.1 SOL recommended)
- [ ] Reviewed `SECURITY.md` and implemented recommendations

### Code Quality ✅
- [ ] All tests passing (`npm test`)
- [ ] Linting passes with 0 warnings (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] No console errors in production build
- [ ] Code reviewed by at least one other developer

### Configuration ✅
- [ ] Environment variables configured for production
- [ ] Profit distribution percentages sum to 100%
- [ ] Flash loan providers configured correctly
- [ ] DEX integrations tested
- [ ] Slippage and profit thresholds appropriate for mainnet

### Infrastructure ✅
- [ ] Production server provisioned
- [ ] Domain name configured (if applicable)
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring and alerting set up

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# === SOLANA CONFIGURATION ===
SOLANA_RPC_URL=https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
WALLET_PRIVATE_KEY=your_base58_encoded_private_key_here

# === QUICKNODE CONFIGURATION (Recommended) ===
QUICKNODE_RPC_URL=https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
QUICKNODE_API_KEY=your_quicknode_api_key
QUICKNODE_FUNCTIONS_URL=https://your-quicknode-functions-url
QUICKNODE_KV_URL=https://your-quicknode-kv-url
QUICKNODE_STREAMS_URL=wss://your-quicknode-streams-url

# === FLASH LOAN PROVIDERS ===
MARGINFI_PROGRAM_ID=MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA
SOLEND_PROGRAM_ID=So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo
MANGO_PROGRAM_ID=mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68
KAMINO_PROGRAM_ID=KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
PORT_FINANCE_PROGRAM_ID=Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR
SAVE_FINANCE_PROGRAM_ID=SAVEg4Je7HZcJk2X1FTr1vfLhQqrpXPTvAWmYnYY1Wy

# === JUPITER CONFIGURATION ===
JUPITER_V6_PROGRAM_ID=JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4
JUPITER_API_URL=https://api.jup.ag/v6
JUPITER_PRICE_API_URL=https://price.jup.ag/v6

# === ARBITRAGE SETTINGS ===
MIN_PROFIT_THRESHOLD=0.005  # 0.5% minimum profit
MAX_SLIPPAGE=0.01           # 1% maximum slippage
GAS_BUFFER=1.5              # 1.5x gas buffer for safety

# === SCANNER SETTINGS ===
SCANNER_POLLING_INTERVAL_MS=1000  # 1 second polling
SCANNER_ENABLE_LIVE_UPDATES=true
SCANNER_ENABLE_NOTIFICATIONS=true
SCANNER_MIN_CONFIDENCE=0.70       # 70% minimum confidence

# === DEV FEE CONFIGURATION ===
DEV_FEE_ENABLED=true
DEV_FEE_PERCENTAGE=0.10     # 10% of profits
DEV_FEE_WALLET=YourDevFeeWalletPublicKeyHere

# === PROFIT DISTRIBUTION ===
PROFIT_DISTRIBUTION_ENABLED=true
RESERVE_WALLET_DOMAIN=monads.skr  # Or use direct PublicKey address
RESERVE_WALLET_PERCENTAGE=0.70    # 70% to reserve
USER_WALLET_PERCENTAGE=0.20       # 20% to user (gas coverage)
DAO_WALLET_PERCENTAGE=0.10        # 10% to DAO
DAO_WALLET_ADDRESS=YourDAOWalletPublicKeyHere

# === GXQ ECOSYSTEM (Optional) ===
GXQ_TOKEN_MINT=YourGXQTokenMintHere
GXQ_ECOSYSTEM_PROGRAM_ID=YourGXQProgramIdHere

# === ADDITIONAL INTEGRATIONS (Optional) ===
NEYNAR_API_KEY=your_neynar_api_key_for_farcaster
```

### Environment-Specific Configurations

#### Development
```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
MIN_PROFIT_THRESHOLD=0.001  # Lower threshold for testing
```

#### Staging
```bash
SOLANA_RPC_URL=https://your-quicknode-devnet-endpoint
MIN_PROFIT_THRESHOLD=0.003
```

#### Production
```bash
SOLANA_RPC_URL=https://your-quicknode-mainnet-endpoint
MIN_PROFIT_THRESHOLD=0.005
```

## Security Best Practices

### Private Key Management

1. **Never commit private keys to source control**
   ```bash
   # .gitignore should include:
   .env
   .env.local
   .env.production
   ```

2. **Use environment variables exclusively**
   ```typescript
   // ✅ Good
   const privateKey = process.env.WALLET_PRIVATE_KEY;
   
   // ❌ Bad
   const privateKey = "your_private_key_here";
   ```

3. **Rotate keys regularly**
   - Use different wallets for dev/staging/production
   - Rotate production keys quarterly
   - Monitor wallet activity for unauthorized transactions

### RPC Endpoint Security

1. **Use production-grade RPC providers**
   - ✅ QuickNode, Helius, Triton
   - ❌ Public endpoints (api.mainnet-beta.solana.com)

2. **Implement rate limiting**
   - Configure appropriate request limits
   - Handle rate limit errors gracefully
   - Use exponential backoff for retries

3. **Monitor RPC health**
   - Track response times
   - Monitor error rates
   - Have fallback endpoints ready

### Transaction Security

1. **Always simulate before sending**
   ```typescript
   const simulation = await connection.simulateTransaction(transaction);
   if (!simulation.value.err) {
     // Proceed with transaction
   }
   ```

2. **Implement slippage protection**
   - Set maximum acceptable slippage
   - Calculate minimum output amounts
   - Reject transactions exceeding limits

3. **Use MEV protection**
   - Utilize Jito bundles for arbitrage
   - Private transaction mempools
   - Front-running prevention

## Deployment Steps

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm ci

# Install frontend dependencies
cd webapp
npm ci
cd ..
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with production values
nano .env  # or use your preferred editor

# Validate environment configuration
npm run validate
```

### Step 3: Build Application

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:webapp

# Or build both
npm run build
```

### Step 4: Run Production Checks

The application includes built-in production guardrails that run automatically on startup. These checks validate:

- RPC endpoint is production-grade
- Wallet private key format and security
- Minimum balance requirements
- Network connectivity
- Profit distribution configuration
- Flash loan provider configuration

```bash
# The checks run automatically in:
npm start

# Or run manually:
node dist/src/index.js
```

### Step 5: Start Services

#### Backend Service

```bash
# Start the backend
npm start

# Or with PM2 for production
pm2 start dist/src/index.js --name gxq-studio

# Monitor logs
pm2 logs gxq-studio
```

#### Frontend Service

```bash
cd webapp
npm start

# Or with PM2
pm2 start npm --name gxq-webapp -- start
```

### Step 6: Verify Deployment

1. **Check application startup**
   ```bash
   # Look for production safety checks passing
   ✅ RPC endpoint is production-grade: quicknode
   ✅ Wallet private key format is valid (88 chars)
   ✅ Wallet balance: 1.2500 SOL (sufficient for operations)
   ✅ Network connectivity OK (version: 1.17.x, slot: xxxxx)
   ```

2. **Test basic functionality**
   - Check airdrop eligibility
   - Scan for arbitrage opportunities
   - Verify profit calculations

3. **Monitor initial transactions**
   - Watch first few transactions closely
   - Verify slippage protection working
   - Check profit distribution executing correctly

## Production Guardrails

The system includes automatic production safety checks that run on startup:

### Validation Checks

1. **RPC Endpoint Validation**
   - Ensures not using public/rate-limited endpoints
   - Verifies production-grade provider
   - Level: ERROR if public, WARNING if unknown provider

2. **Private Key Validation**
   - Checks key format (base58)
   - Validates minimum length
   - Detects placeholder values
   - Level: ERROR on any validation failure

3. **Balance Check**
   - Verifies minimum SOL balance (0.1 SOL)
   - Ensures funds for gas fees
   - Level: WARNING if below threshold

4. **Network Connectivity**
   - Tests RPC connection
   - Validates Solana version
   - Confirms current slot
   - Level: ERROR on connection failure

5. **Profit Distribution**
   - Validates percentages sum to 100%
   - Checks for placeholder addresses
   - Verifies DAO wallet configuration
   - Level: ERROR on invalid configuration

6. **Flash Loan Providers**
   - Checks provider configuration
   - Detects placeholder program IDs
   - Validates at least one provider available
   - Level: WARNING on placeholders

### Error Handling

- **ERROR level**: Application will not start
- **WARNING level**: Application starts with warnings logged
- **INFO level**: Informational messages only

## Monitoring & Maintenance

### Health Checks

Implement health check endpoints:

```typescript
// api/health.ts
export default async function handler(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    // Add more metrics
  };
  res.status(200).json(health);
}
```

### Logging

Use structured logging for production:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics to Monitor

1. **Transaction Metrics**
   - Success rate
   - Average execution time
   - Gas fees consumed
   - Profit per transaction

2. **System Metrics**
   - CPU usage
   - Memory consumption
   - Network latency
   - RPC response times

3. **Business Metrics**
   - Total profit generated
   - Number of opportunities found
   - Arbitrage success rate
   - Flash loan utilization

### Alerting

Set up alerts for:
- Transaction failures exceeding threshold
- Low wallet balance (< 0.05 SOL)
- RPC endpoint errors
- High slippage events
- Unusual profit distribution patterns

## Troubleshooting

### Common Issues

#### 1. RPC Endpoint Issues

**Symptom**: Connection errors, timeouts
**Solution**:
```bash
# Test RPC endpoint
curl -X POST https://your-rpc-endpoint \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Check rate limits
# Verify API key is correct
# Try fallback endpoint
```

#### 2. Insufficient Balance

**Symptom**: Transactions failing due to low balance
**Solution**:
```bash
# Check balance
solana balance <your-wallet-address>

# Fund wallet with more SOL
# Adjust gas buffer settings
```

#### 3. Slippage Exceeded

**Symptom**: Transactions failing with slippage errors
**Solution**:
- Increase `MAX_SLIPPAGE` setting
- Use smaller trade sizes
- Trade during less volatile periods
- Implement dynamic slippage calculation

#### 4. Flash Loan Failures

**Symptom**: Flash loan transactions reverting
**Solution**:
- Verify provider liquidity available
- Check profit calculations include fees
- Ensure atomic transaction structure
- Validate all swap instructions

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment variable
export DEBUG=gxq:*

# Run with verbose logging
npm start
```

### Log Analysis

```bash
# View recent errors
tail -f error.log

# Search for specific issues
grep "ERROR" combined.log | tail -20

# Analyze transaction patterns
grep "signature" combined.log | cut -d':' -f2
```

## Rollback Procedures

### Emergency Rollback

If critical issues arise in production:

1. **Stop services immediately**
   ```bash
   pm2 stop gxq-studio
   pm2 stop gxq-webapp
   ```

2. **Revert to previous version**
   ```bash
   git log --oneline -5  # Find last good commit
   git checkout <commit-hash>
   npm ci
   npm run build
   ```

3. **Restart services**
   ```bash
   pm2 restart gxq-studio
   pm2 restart gxq-webapp
   ```

### Gradual Rollback

For non-critical issues:

1. **Reduce traffic** gradually
2. **Monitor metrics** closely
3. **Investigate root cause**
4. **Apply hotfix** if possible
5. **Schedule maintenance window** for full fix

### Database Rollback

If database schema changes need reverting:

```bash
# Run down migrations
npm run migrate:down

# Restore from backup
pg_restore -d gxq_studio backup.sql
```

## Performance Optimization

### Backend Optimization

1. **Connection pooling**
   - Reuse RPC connections
   - Implement connection limits
   - Handle connection failures gracefully

2. **Caching**
   - Cache token prices (1-5 seconds)
   - Cache account data
   - Invalidate on updates

3. **Parallel processing**
   - Scan multiple DEXs simultaneously
   - Batch account fetches
   - Use Promise.all for independent operations

### Frontend Optimization

1. **Code splitting**
   - Lazy load routes
   - Dynamic imports for heavy components
   - Optimize bundle size

2. **API optimization**
   - Implement request debouncing
   - Use WebSockets for real-time data
   - Cache API responses

3. **Rendering optimization**
   - Use React.memo for expensive components
   - Implement virtual scrolling for long lists
   - Optimize re-renders with useCallback/useMemo

## Disaster Recovery

### Backup Strategy

1. **Daily automated backups**
   - Database snapshots
   - Configuration files
   - Transaction logs

2. **Weekly full backups**
   - Complete system state
   - Store off-site
   - Test restore procedures

3. **Real-time replication**
   - Database replication
   - Log streaming
   - Geographic redundancy

### Recovery Procedures

1. **Service failure**: Restart from backup
2. **Data corruption**: Restore from last good backup
3. **Security breach**: Rotate all keys, review logs
4. **Infrastructure failure**: Failover to backup region

## Support & Resources

### Documentation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [SECURITY.md](../SECURITY.md) - Security policies
- [TESTING.md](../TESTING.md) - Testing guide
- [README.md](../README.md) - Quick start guide

### Community
- GitHub Issues: Report bugs and feature requests
- Discord: Join community discussions
- Email: info@gxqstudio.com

### Emergency Contacts
- Security issues: security@gxqstudio.com
- Critical bugs: Use GitHub issues with `critical` label
- General inquiries: info@gxqstudio.com

---

**Last Updated**: 2025-12-23

**Version**: 1.0.0

**Maintainer**: GXQ Studio Team
