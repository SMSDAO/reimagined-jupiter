# Bot Framework Guide

## Overview

The GXQ Studio Bot Framework provides a professional, scriptable execution engine for automated trading strategies. It features offline transaction building, multiple signing modes, 4-layer replay protection, and per-user sandbox isolation.

## Architecture

### Core Components

1. **Bot Execution Engine** - Main orchestrator for bot operations
2. **Offline Transaction Builder** - Build and validate transactions without network access
3. **Replay Protection System** - 4-layer security to prevent duplicate executions
4. **Sandbox Isolation** - Per-user isolated execution environment
5. **Signing Modes** - Flexible key management (client-side, server-side, enclave-ready)

## Bot Types

### Supported Strategies

1. **ARBITRAGE** - Price difference exploitation across DEXes
2. **SNIPER** - New token launch sniping
3. **FLASH_LOAN** - Flash loan arbitrage
4. **TRIANGULAR** - Three-way arbitrage opportunities
5. **CUSTOM** - User-defined strategies

## Signing Modes

### CLIENT_SIDE (Default)

**Security:** Highest  
**Latency:** Medium  
**Use Case:** Maximum security, user retains full key control

```typescript
const bot: BotConfig = {
  signingMode: 'CLIENT_SIDE',
  // Keys never leave user's device
  // Transaction signed in browser/app
};
```

**Pros:**
- Private keys never exposed to server
- User has complete control
- No server-side key storage

**Cons:**
- Requires user interaction for each trade
- Slightly higher latency
- Limited to manual approval mode

### SERVER_SIDE

**Security:** Medium  
**Latency:** Low  
**Use Case:** Automated execution, faster response times

```typescript
const bot: BotConfig = {
  signingMode: 'SERVER_SIDE',
  walletId: 'encrypted-wallet-uuid',
  // Keys stored encrypted (AES-256-GCM)
  // Decrypted in-memory for signing only
};
```

**Pros:**
- Fully automated execution
- Fastest response times
- No user interaction needed

**Cons:**
- Keys stored on server (encrypted)
- Trust in server security required
- Server must be online

**Security Measures:**
- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- In-memory decryption only
- Keys wiped immediately after use
- Encrypted key never logged

### ENCLAVE (Future)

**Security:** Highest  
**Latency:** Low  
**Use Case:** Production systems requiring both security and automation

```typescript
const bot: BotConfig = {
  signingMode: 'ENCLAVE',
  // Keys stored in secure enclave (TEE)
  // Hardware-level security
};
```

**Features:**
- Hardware-backed key storage
- Trusted Execution Environment (TEE)
- Attestation and verification
- Immune to server compromises

**Status:** Coming soon with Intel SGX/AWS Nitro Enclaves support

## Offline Transaction Builder

### Purpose

Build and validate transactions without network access for:
- Security testing
- Dry runs
- Simulation
- Batching operations

### Usage

```typescript
import { OfflineTransactionBuilder } from './services/botFramework.js';

// Create builder
const builder = new OfflineTransactionBuilder(
  feePayer,      // PublicKey
  botId,         // string
  userId,        // string
  executionId    // string
);

// Add instructions
builder
  .addInstruction(swapInstruction)
  .addInstruction(transferInstruction)
  .addComputeBudget(200_000, 1000)  // units, microLamports
  .addPriorityFee(5_000_000);       // Capped at 10M lamports

// Validate offline (no network)
const validation = builder.validateOffline();
if (!validation.valid) {
  console.error('Invalid transaction:', validation.errors);
}

// Build for submission (requires connection)
const transaction = await builder.build(connection);
```

### Priority Fee Cap

**Maximum Priority Fee:** 10,000,000 lamports (10M)

This limit is enforced at the transaction builder level to prevent excessive gas costs:

```typescript
// Will be capped automatically
builder.addPriorityFee(15_000_000);  // Capped to 10M
// ⚠️ Priority fee capped at 10000000 microLamports
```

### Compute Budget

Set compute units and price:

```typescript
builder.addComputeBudget(
  200_000,  // Compute units (adjust based on complexity)
  1_000     // Micro-lamports per unit
);
```

**Recommended Values:**
- Simple swap: 100,000 units
- Flash loan: 300,000 units
- Complex arbitrage: 500,000 units

## 4-Layer Replay Protection

### Overview

Prevents duplicate transaction execution through multiple security layers:

1. **Unique Nonces** - One-time tokens
2. **SHA-256 Deduplication** - Transaction hash verification
3. **Timestamp Windows** - Time-based validation
4. **Rate Limiting** - Execution throttling

### Layer 1: Unique Nonces

```typescript
const nonce = replayProtection.generateNonce();
// 64-character hex string, cryptographically random

// Check if used
if (replayProtection.isNonceUsed(nonce)) {
  throw new Error('Nonce already used');
}

// Mark as used (cached for 1 hour)
replayProtection.markNonceUsed(nonce);
```

### Layer 2: Transaction Hash

```typescript
const txHash = replayProtection.computeTransactionHash(transaction);
// SHA-256 hash of transaction content

// Check if duplicate
if (replayProtection.isTransactionDuplicate(txHash)) {
  throw new Error('Duplicate transaction');
}

// Mark as processed
replayProtection.markTransactionProcessed(txHash);
```

### Layer 3: Timestamp Validation

```typescript
const timestamp = new Date();

// Must be within 10-minute window
if (!replayProtection.isTimestampValid(timestamp)) {
  throw new Error('Transaction too old or from future');
}
```

**Window:** 10 minutes (configurable)  
**Purpose:** Prevent replay of old transactions

### Layer 4: Rate Limiting

```typescript
const rateLimit = replayProtection.checkRateLimit(userId, 10);

if (!rateLimit.allowed) {
  throw new Error('Rate limit exceeded');
}

console.log(`Remaining: ${rateLimit.remaining}/10 per minute`);
```

**Limits:**
- 10 executions per minute per user
- 100 executions per hour per user
- Configurable per bot

### Complete Validation

```typescript
const validation = replayProtection.validateExecution(
  nonce,
  transaction,
  timestamp,
  userId,
  10  // max per minute
);

if (!validation.valid) {
  console.error('Replay protection failed:', validation.errors);
  return;
}

// After successful execution
replayProtection.markExecutionProcessed(nonce, transaction);
```

## Sandbox Isolation

### Per-User Context

Each bot runs in an isolated sandbox:

```typescript
const sandbox = new BotSandbox(
  userId,
  botId,
  walletAddress,
  ['bot.execute', 'wallet.sign']  // Permissions
);
```

### Permission Checks

```typescript
// Check permission before execution
if (!sandbox.hasPermission('bot.execute')) {
  throw new Error('Permission denied');
}

// Execute with permission check
const result = await sandbox.execute(
  async () => {
    // Bot logic here
    return await executeStrategy();
  },
  'bot.execute'  // Required permission
);
```

### Isolated State

Each sandbox has isolated state storage:

```typescript
// Set state (isolated per sandbox)
sandbox.setState('lastPrice', 150.5);
sandbox.setState('executionCount', 10);

// Get state
const lastPrice = sandbox.getState<number>('lastPrice');
const count = sandbox.getState<number>('executionCount');

// Clear state
sandbox.clearState();
```

**Use Cases:**
- Price tracking
- Execution counters
- Strategy state
- Temporary data

### Rate Limit Enforcement

Sandboxes enforce rate limits automatically:

```typescript
// Automatic rate limiting
try {
  await sandbox.execute(async () => {
    // Your bot logic
  }, 'bot.execute');
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // Handle rate limit
    console.log('Too many executions, waiting...');
  }
}
```

## Bot Execution Engine

### Initialization

```typescript
import { BotExecutionEngine } from './services/botFramework.js';

const engine = new BotExecutionEngine(connection);
```

### Creating Transaction

```typescript
const builder = engine.createTransactionBuilder(
  feePayer,
  botId,
  userId,
  executionId
);

// Build your transaction
builder
  .addInstruction(instruction1)
  .addInstruction(instruction2)
  .addPriorityFee(5_000_000);

const transaction = await builder.build(connection);
```

### Executing Transaction

```typescript
const execution = await engine.executeTransaction(
  botConfig,      // BotConfig
  transaction,    // Transaction
  signer,         // Keypair
  {
    skipPreflight: false,
    maxRetries: 3
  }
);

if (execution.status === 'CONFIRMED') {
  console.log('✅ Success:', execution.transactionSignature);
} else {
  console.error('❌ Failed:', execution.errorMessage);
}
```

### Simulation

Test transaction before execution:

```typescript
const simulation = await engine.simulateTransaction(
  transaction,
  signer
);

if (simulation.success) {
  console.log('Simulation passed');
  console.log('Logs:', simulation.logs);
} else {
  console.error('Simulation failed:', simulation.error);
}
```

## Bot Configuration

### Basic Configuration

```typescript
const bot: BotConfig = {
  id: crypto.randomUUID(),
  userId: 'user-uuid',
  name: 'Arbitrage Bot #1',
  botType: 'ARBITRAGE',
  signingMode: 'SERVER_SIDE',
  walletId: 'wallet-uuid',
  strategyConfig: {
    minProfitSol: 0.01,
    maxSlippage: 0.01,
    dexes: ['RAYDIUM', 'ORCA', 'JUPITER'],
    tokens: ['SOL', 'USDC', 'USDT']
  },
  isActive: true,
  isPaused: false
};
```

### Strategy Configuration

Each bot type has specific configuration:

**Arbitrage:**
```typescript
strategyConfig: {
  minProfitSol: 0.01,          // Minimum profit threshold
  maxSlippage: 0.01,           // 1% max slippage
  dexes: ['RAYDIUM', 'ORCA'],  // DEXes to monitor
  tokens: ['SOL', 'USDC'],     // Token pairs
  maxPositionSize: 10          // Max SOL per trade
}
```

**Sniper:**
```typescript
strategyConfig: {
  targetDex: 'RAYDIUM',
  maxPriceImpact: 0.01,        // 1% max impact
  maxPositionSizeSol: 5,       // Max SOL to use
  priorityFeeLamports: 5000000, // 5M lamports
  useJito: true,               // Jito MEV protection
  jitoTipLamports: 10000       // Jito tip
}
```

**Flash Loan:**
```typescript
strategyConfig: {
  provider: 'MARGINFI',         // Flash loan provider
  minProfitSol: 0.05,          // Higher threshold for flash loans
  maxSlippage: 0.005,          // Tighter slippage
  opportunityTypes: ['TRIANGULAR', 'CROSS_DEX']
}
```

## Best Practices

### Security

1. **Use CLIENT_SIDE for high-value operations**
   - Initial funding
   - Large transfers
   - Configuration changes

2. **Use SERVER_SIDE for automated trading**
   - Small position sizes
   - Low-risk strategies
   - High-frequency trading

3. **Always validate offline first**
   ```typescript
   const validation = builder.validateOffline();
   if (!validation.valid) {
     throw new Error('Invalid transaction');
   }
   ```

4. **Simulate before execution**
   ```typescript
   const sim = await engine.simulateTransaction(tx, signer);
   if (!sim.success) {
     throw new Error('Simulation failed');
   }
   ```

5. **Monitor replay protection logs**
   - Check for unusual nonce patterns
   - Investigate duplicate transaction attempts
   - Review rate limit violations

### Performance

1. **Set appropriate compute budgets**
   - Don't over-allocate (wastes fees)
   - Don't under-allocate (transaction fails)

2. **Use priority fees strategically**
   - High congestion: higher fees
   - Low congestion: lower fees
   - Monitor network conditions

3. **Batch operations when possible**
   - Multiple instructions in one transaction
   - Reduces total fees
   - Faster execution

4. **Cache sandbox instances**
   - Reuse sandbox per bot
   - Avoid recreation overhead

### Error Handling

```typescript
try {
  const execution = await engine.executeTransaction(
    bot,
    transaction,
    signer
  );
  
  if (execution.status === 'FAILED') {
    // Handle failure
    await logError(execution.errorMessage);
    await notifyUser(bot.userId, 'Bot execution failed');
  }
} catch (error) {
  // Handle exceptions
  if (error.message.includes('Rate limit')) {
    await pauseBot(bot.id);
  } else if (error.message.includes('Insufficient funds')) {
    await notifyUser(bot.userId, 'Insufficient funds');
  } else {
    await reportError(error);
  }
}
```

## Monitoring & Debugging

### Execution Logs

All executions are logged to `bot_executions` table:

```sql
SELECT 
  be.*,
  b.name as bot_name
FROM bot_executions be
JOIN bots b ON be.bot_id = b.id
WHERE be.user_id = 'user-uuid'
ORDER BY be.executed_at DESC
LIMIT 100;
```

### Audit Trail

Configuration changes logged to `bot_audit_log`:

```sql
SELECT * FROM bot_audit_log
WHERE bot_id = 'bot-uuid'
ORDER BY created_at DESC;
```

### Performance Metrics

```sql
SELECT 
  bot_id,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'CONFIRMED') as successful,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
  AVG(profit_sol) as avg_profit,
  SUM(profit_sol) as total_profit
FROM bot_executions
WHERE user_id = 'user-uuid'
AND executed_at > NOW() - INTERVAL '24 hours'
GROUP BY bot_id;
```

## Troubleshooting

### Bot Not Executing

1. **Check bot status**
   - Ensure `isActive = true`
   - Ensure `isPaused = false`

2. **Check permissions**
   - User has `bot.execute` permission
   - Sandbox allows execution

3. **Check rate limits**
   - Not exceeded per-minute limit
   - Not exceeded per-hour limit

4. **Check wallet balance**
   - Sufficient SOL for gas
   - Sufficient tokens for strategy

### Transaction Failures

1. **Simulation error**
   - Run simulation to identify issue
   - Check program logs

2. **Slippage exceeded**
   - Increase `maxSlippage` in config
   - Use lower position sizes

3. **Compute budget exceeded**
   - Increase compute units
   - Simplify transaction

4. **Priority fee too low**
   - Increase priority fee
   - Monitor network congestion

### Replay Protection Failures

1. **Nonce already used**
   - Check for duplicate submissions
   - Ensure proper nonce generation

2. **Timestamp out of window**
   - Check system clock
   - Ensure timely execution

3. **Rate limit exceeded**
   - Reduce execution frequency
   - Implement exponential backoff

## API Reference

### BotExecutionEngine

```typescript
class BotExecutionEngine {
  constructor(connection: Connection);
  
  getSandbox(userId, botId, walletAddress, permissions): BotSandbox;
  createTransactionBuilder(feePayer, botId, userId, executionId): OfflineTransactionBuilder;
  executeTransaction(bot, transaction, signer, options?): Promise<BotExecution>;
  simulateTransaction(transaction, signer): Promise<SimulationResult>;
}
```

### OfflineTransactionBuilder

```typescript
class OfflineTransactionBuilder {
  addInstruction(instruction): this;
  addInstructions(instructions): this;
  addComputeBudget(units, microLamports): this;
  addPriorityFee(microLamports): this;
  buildOffline(): OfflineTransaction;
  build(connection): Promise<Transaction>;
  validateOffline(): ValidationResult;
}
```

### ReplayProtection

```typescript
class ReplayProtection {
  generateNonce(): string;
  computeTransactionHash(transaction): string;
  isNonceUsed(nonce): boolean;
  markNonceUsed(nonce): void;
  isTransactionDuplicate(txHash): boolean;
  markTransactionProcessed(txHash): void;
  isTimestampValid(timestamp): boolean;
  checkRateLimit(userId, maxPerMinute): RateLimitResult;
  validateExecution(nonce, transaction, timestamp, userId, maxRate): ValidationResult;
  markExecutionProcessed(nonce, transaction): void;
}
```

### BotSandbox

```typescript
class BotSandbox {
  constructor(userId, botId, walletAddress, permissions);
  
  hasPermission(permission): boolean;
  execute<T>(operation, requiredPermission): Promise<T>;
  getState<T>(key): T | undefined;
  setState<T>(key, value): void;
  clearState(): void;
  getContext(): Readonly<SandboxContext>;
}
```

## Support

For bot framework questions or issues:
- **Documentation**: https://docs.gxq.studio/bot-framework
- **Examples**: https://github.com/SMSDAO/reimagined-jupiter/tree/main/examples
- **Issue Tracker**: https://github.com/SMSDAO/reimagined-jupiter/issues
