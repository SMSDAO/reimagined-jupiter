# Bot Framework Implementation Guide

## Overview

The GXQ Studio Bot Framework provides a production-ready, secure system for executing automated trading strategies on Solana. This guide covers the complete implementation, security considerations, and usage patterns.

## Architecture

### Core Components

1. **Transaction Builder** (`src/bot/transactionBuilder.ts`)
   - Offline transaction construction
   - Automatic priority fee calculation
   - Support for versioned and legacy transactions
   - Transaction validation before signing

2. **Signing Service** (`src/bot/signingService.ts`)
   - Multiple signing modes: client, server, enclave
   - Encrypted key storage for server-side signing
   - Complete audit trail for all signing operations
   - Zero key exposure guarantee

3. **Replay Protection** (`src/bot/replayProtection.ts`)
   - Nonce-based transaction tracking
   - Transaction hash deduplication
   - Timestamp validation
   - Automatic cleanup of expired nonces

4. **Sandbox Execution** (`src/bot/sandbox.ts`)
   - Isolated per-user execution environments
   - Rate limiting (executions per hour)
   - Spending limits (daily lamports cap)
   - Resource quotas enforcement

5. **Audit Logger** (`src/bot/auditLogger.ts`)
   - Comprehensive logging of all operations
   - Security event tracking
   - Performance metrics collection
   - Immutable audit trail

6. **Script Engine** (`src/bot/scriptEngine.ts`)
   - Safe JavaScript execution sandbox
   - Script validation and security checks
   - Template library for common strategies
   - Runtime timeout protection

## Database Schema

The framework uses 6 main tables:

- `bot_configurations`: Bot settings and parameters
- `bot_scripts`: User-defined automation scripts
- `bot_executions`: Execution history and results
- `bot_audit_logs`: Security and operational logs
- `bot_telemetry`: Aggregated metrics per hour
- `transaction_nonces`: Replay protection state

All tables include proper indexes for performance and foreign key constraints for data integrity.

## Security Features

### 1. User Isolation

Each user's bots run in completely isolated sandboxes:

```typescript
const sandbox = await sandboxManager.getSandbox({
  userId: userWallet.toBase58(),
  botConfigId: '...',
  maxExecutionsPerHour: 100,
  maxDailySpendLamports: 1_000_000_000, // 1 SOL
  maxGasFeeLamports: 10_000_000, // 0.01 SOL
  connection,
});
```

**Guarantees:**
- No shared state between users
- No shared signing keys
- Independent rate limits
- Independent spending limits

### 2. Signing Modes

Three signing modes with different security tradeoffs:

#### Client-Side Signing (Recommended)
```typescript
const result = await sandbox.execute(
  builtTx,
  {
    mode: 'client',
    userWallet,
  },
  walletAdapter.signTransaction // Wallet adapter function
);
```

**Security:** ✅ Highest - Private key never leaves user's device

#### Server-Side Signing (Use with caution)
```typescript
const result = await sandbox.execute(
  builtTx,
  {
    mode: 'server',
    userWallet,
  },
  undefined,
  encryptedPrivateKey // Encrypted with AES-256
);
```

**Security:** ⚠️ Medium - Key stored encrypted on server
**Use case:** Automated strategies without user interaction

#### Enclave Signing (Enterprise)
```typescript
const result = await sandbox.execute(
  builtTx,
  {
    mode: 'enclave',
    userWallet,
  }
);
```

**Security:** ✅ High - Key stored in secure enclave (AWS KMS, Azure Key Vault, etc.)
**Use case:** High-value automated strategies

### 3. Replay Protection

Every transaction is protected against replay attacks:

```typescript
const replayCheck = await replayProtection.checkTransaction({
  userId: userWallet.toBase58(),
  transactionHash: builtTx.transactionHash,
  nonce: builtTx.nonce,
  timestamp: builtTx.timestamp,
});

if (!replayCheck.safe) {
  throw new Error(`Replay protection failed: ${replayCheck.reason}`);
}
```

**Protection layers:**
1. Unique nonce per transaction
2. Transaction hash deduplication
3. Timestamp validation (5-minute window)
4. Rate limiting

### 4. Audit Logging

All operations are logged immutably:

```typescript
await auditLogger.logAction({
  userId: userWallet.toBase58(),
  action: 'bot_execution_started',
  actionType: 'execution',
  severity: 'info',
  metadata: {
    botConfigId,
    transactionType,
  },
});
```

**Logged events:**
- Bot creation/modification/deletion
- Script creation/modification
- Execution start/completion/failure
- Signing operations
- Security events (unauthorized access, rate limit violations)

## API Endpoints

### Bot Management

**Create Bot**
```http
POST /api/bot/manage/create
Content-Type: application/json

{
  "userId": "wallet_address",
  "botName": "My Arbitrage Bot",
  "botType": "arbitrage",
  "config": {
    "minProfitSol": 0.01,
    "maxSlippageBps": 100
  },
  "signingMode": "client",
  "maxExecutionsPerHour": 100,
  "maxDailySpendLamports": 1000000000
}
```

**List Bots**
```http
GET /api/bot/manage/list?userId=wallet_address
```

**Update Bot**
```http
PUT /api/bot/manage/:botId
Content-Type: application/json

{
  "userId": "wallet_address",
  "enabled": true,
  "maxGasFee": 5000000
}
```

**Delete Bot**
```http
DELETE /api/bot/manage/:botId?userId=wallet_address
```

### Bot Execution

**Execute Bot**
```http
POST /api/bot/execute
Content-Type: application/json

{
  "userId": "wallet_address",
  "botConfigId": "bot_id",
  "instructions": [...], // Transaction instructions
  "transactionType": "arbitrage"
}
```

**Execute Script**
```http
POST /api/bot/execute/script
Content-Type: application/json

{
  "userId": "wallet_address",
  "botConfigId": "bot_id",
  "scriptId": "script_id"
}
```

**Stop Bot**
```http
POST /api/bot/execute/stop
Content-Type: application/json

{
  "userId": "wallet_address",
  "botConfigId": "bot_id"
}
```

### Telemetry

**Get Status**
```http
GET /api/bot/telemetry/status?userId=wallet_address&botConfigId=bot_id
```

**Get Performance**
```http
GET /api/bot/telemetry/performance?userId=wallet_address&botConfigId=bot_id&hours=24
```

**Get Dashboard Data**
```http
GET /api/bot/telemetry/dashboard?userId=wallet_address
```

### Script Management

**Create Script**
```http
POST /api/bot/scripts/create
Content-Type: application/json

{
  "userId": "wallet_address",
  "botConfigId": "bot_id",
  "scriptName": "My Strategy",
  "scriptCode": "async function main() { ... }",
  "triggerType": "manual"
}
```

**Get Templates**
```http
GET /api/bot/scripts/templates
```

## Script Development

### Script Structure

All scripts must follow this structure:

```javascript
async function main() {
  // Your strategy logic here
  
  return {
    instructions: [], // Array of TransactionInstruction
    metadata: {
      type: 'arbitrage',
      description: 'My strategy execution',
    },
  };
}
```

### Available Context

Scripts have access to:

```javascript
// User context
userWallet // User's wallet address (string)
balance    // User's SOL balance (number, in SOL not lamports)
params     // Bot configuration parameters (object)

// Utilities
log(...)       // Logging function
Math           // JavaScript Math object
Date           // JavaScript Date object
JSON           // JavaScript JSON object
PublicKey      // PublicKey utilities
```

### Example: Simple Arbitrage Script

```javascript
async function main() {
  log('Arbitrage bot executing...');
  log('User wallet:', userWallet);
  log('Balance:', balance, 'SOL');
  
  const { tokenIn, tokenOut, minProfitSol } = params;
  
  // Validate inputs
  if (!PublicKey.isValid(tokenIn)) {
    throw new Error('Invalid tokenIn address');
  }
  
  // Query prices (placeholder - integrate with Jupiter API)
  const priceA = 100; // Token price on DEX A
  const priceB = 102; // Token price on DEX B
  const spread = priceB - priceA;
  const profitPercent = (spread / priceA) * 100;
  
  log(`Spread: ${spread}, Profit: ${profitPercent}%`);
  
  if (spread * balance < minProfitSol) {
    log('Profit below threshold, skipping');
    return { instructions: [] };
  }
  
  // Build swap instructions
  // TODO: Integrate with Jupiter API to build actual swap instructions
  
  return {
    instructions: [], // Your swap instructions here
    metadata: {
      type: 'arbitrage',
      description: `Arbitrage ${tokenIn} -> ${tokenOut}`,
    },
  };
}
```

### Security Restrictions

Scripts CANNOT:
- Access file system
- Make network requests (except whitelisted APIs)
- Import external modules
- Access process or global objects
- Execute shell commands
- Access other users' data

Scripts CAN:
- Use Math, Date, JSON utilities
- Validate PublicKey addresses
- Build transaction instructions
- Log messages for debugging

## Rate Limiting

The framework enforces multiple rate limits:

### Per-User Limits

```typescript
{
  maxExecutionsPerHour: 100,        // Max 100 executions per hour
  maxDailySpendLamports: 1e9,       // Max 1 SOL spent per day
  maxGasFeeLamports: 10_000_000,    // Max 0.01 SOL per transaction
}
```

### Transaction Limits

- Maximum transaction size: 1232 bytes
- Maximum compute units: 200,000 (configurable)
- Maximum priority fee: 10M lamports (0.01 SOL)
- Transaction staleness: 60 seconds

### Nonce Limits

- Maximum pending nonces per user: 100
- Nonce expiration: 60 seconds
- Automatic cleanup of expired nonces

## Monitoring & Telemetry

### Real-Time Metrics

The framework collects and exposes:

1. **Execution Metrics**
   - Total executions (today, last hour, all-time)
   - Success rate
   - Average execution time
   - Gas spent
   - Profit/loss

2. **Security Metrics**
   - Failed authentication attempts
   - Rate limit violations
   - Replay protection blocks
   - Security events

3. **Performance Metrics**
   - Min/max/avg execution time
   - Transaction confirmation time
   - RPC latency

### Dashboard Features

The admin dashboard (`/admin/bots`) provides:

- Live bot status (active/inactive)
- Real-time execution metrics
- Recent execution history
- Error logs and alerts
- Profit/loss tracking
- Gas usage analytics

## Deployment

### Environment Variables

Required:
```bash
SOLANA_RPC_URL=https://your-rpc-endpoint
SIGNING_ENCRYPTION_KEY=your-secret-key-256-bits
DB_HOST=your-postgres-host
DB_NAME=gxq_studio
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

Optional:
```bash
ENCLAVE_KEY_wallet_address=base64-encoded-private-key
```

### Database Setup

1. Run base schema:
```bash
psql -U postgres -d gxq_studio -f db/schema.sql
```

2. Run bot framework schema:
```bash
psql -U postgres -d gxq_studio -f db/bot-schema.sql
```

### API Routes

Register bot API routes in your Express app:

```typescript
import express from 'express';
import * as botManage from './api/bot/manage.js';
import * as botExecute from './api/bot/execute.js';
import * as botTelemetry from './api/bot/telemetry.js';
import * as botScripts from './api/bot/scripts.js';

const app = express();

// Bot management
app.post('/api/bot/manage/create', botManage.createBot);
app.get('/api/bot/manage/list', botManage.listBots);
app.get('/api/bot/manage/:botId', botManage.getBot);
app.put('/api/bot/manage/:botId', botManage.updateBot);
app.delete('/api/bot/manage/:botId', botManage.deleteBot);

// Bot execution
app.post('/api/bot/execute', botExecute.executeBot);
app.post('/api/bot/execute/script', botExecute.executeScript);
app.post('/api/bot/execute/stop', botExecute.stopBot);
app.get('/api/bot/execute/history', botExecute.getExecutionHistory);

// Telemetry
app.get('/api/bot/telemetry/status', botTelemetry.getBotStatus);
app.get('/api/bot/telemetry/performance', botTelemetry.getBotPerformance);
app.get('/api/bot/telemetry/errors', botTelemetry.getBotErrors);
app.get('/api/bot/telemetry/dashboard', botTelemetry.getDashboardData);

// Scripts
app.post('/api/bot/scripts/create', botScripts.createScript);
app.get('/api/bot/scripts/:scriptId', botScripts.getScript);
app.get('/api/bot/scripts/list', botScripts.listScripts);
app.put('/api/bot/scripts/:scriptId', botScripts.updateScript);
app.delete('/api/bot/scripts/:scriptId', botScripts.deleteScript);
app.post('/api/bot/scripts/validate', botScripts.validateScript);
app.get('/api/bot/scripts/templates', botScripts.getScriptTemplates);
```

## Best Practices

### 1. Always Use Client-Side Signing

When possible, use client-side signing to keep private keys secure:

```typescript
const result = await sandbox.execute(
  builtTx,
  { mode: 'client', userWallet },
  walletAdapter.signTransaction
);
```

### 2. Set Conservative Limits

Start with conservative rate and spending limits:

```typescript
{
  maxExecutionsPerHour: 10,         // Start low
  maxDailySpendLamports: 100_000_000, // 0.1 SOL
  maxGasFeeLamports: 5_000_000,     // 0.005 SOL
}
```

### 3. Test on Devnet First

Always test bots on devnet before mainnet:

```typescript
const connection = new Connection(
  process.env.NODE_ENV === 'production'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com',
  'confirmed'
);
```

### 4. Monitor Execution Logs

Regularly check execution logs and audit trail:

```typescript
const logs = await auditLogger.getRecentLogs(userId, 100);
const errors = await auditLogger.getSecurityEvents(userId, 'error');
```

### 5. Clean Up Expired Nonces

Run nonce cleanup periodically (e.g., hourly cron job):

```typescript
await replayProtection.cleanupExpiredNonces();
```

## Troubleshooting

### Bot Won't Execute

1. Check if bot is enabled
2. Verify rate limits not exceeded
3. Check daily spending limit
4. Review audit logs for errors

### Transactions Failing

1. Check RPC connectivity
2. Verify wallet has sufficient SOL
3. Review transaction priority fees
4. Check transaction size < 1232 bytes

### Script Validation Errors

1. Ensure script defines `main()` function
2. Check for forbidden patterns (require, import, etc.)
3. Verify script size < 100KB
4. Test script locally first

### Replay Protection Blocking

1. Check transaction timestamp (must be < 5 minutes old)
2. Verify nonce hasn't been used
3. Check transaction hash is unique
4. Clean up expired nonces

## Support

For issues or questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: See inline code comments
- Security Issues: Contact team directly

## License

MIT License - See LICENSE file for details.
