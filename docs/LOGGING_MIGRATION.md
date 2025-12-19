# Migration Guide: Centralized Logging System

This guide explains how to migrate from `console.log` statements to the new centralized Winston logger.

## Overview

The codebase now uses a centralized logging system built on Winston that provides:
- Structured logging with metadata
- Request ID tracking
- Context-aware logging
- Log rotation and file management
- Different log levels (error, warn, info, debug, verbose)
- Specialized methods for common operations

## Quick Start

### Basic Usage

**Before (console.log):**
```typescript
console.log('Processing transaction', signature);
console.error('Transaction failed:', error);
```

**After (Logger):**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('TransactionService');

logger.info('Processing transaction', { signature });
logger.error('Transaction failed', error, { signature });
```

## Migration Examples

### 1. Simple Logging

**Before:**
```typescript
console.log('Starting arbitrage scan...');
console.log('Found opportunity:', opportunity);
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('ArbitrageScanner');

logger.info('Starting arbitrage scan...');
logger.info('Found opportunity', { opportunity });
```

### 2. Error Logging

**Before:**
```typescript
try {
  await executeTransaction();
} catch (error) {
  console.error('Error executing transaction:', error);
}
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('Executor');

try {
  await executeTransaction();
} catch (error) {
  logger.error('Error executing transaction', error);
}
```

### 3. Debug Information

**Before:**
```typescript
if (DEBUG) {
  console.log('Route details:', route);
  console.log('Slippage:', slippage);
}
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('Router');

logger.debug('Route details', { route, slippage });
// Note: This will only log if LOG_LEVEL=debug or verbose
```

### 4. RPC Operations

**Before:**
```typescript
try {
  const balance = await connection.getBalance(address);
  console.log('Balance:', balance);
} catch (error) {
  console.error('Failed to get balance:', error);
}
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('RPC');

try {
  const balance = await connection.getBalance(address);
  logger.info('Retrieved balance', { address, balance });
} catch (error) {
  logger.rpcError('getBalance', error, { address });
}
```

### 5. Transaction Execution

**Before:**
```typescript
try {
  const signature = await sendTransaction(tx);
  console.log('Transaction sent:', signature);
} catch (error) {
  console.error('Transaction failed:', error);
}
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('Transactions');

try {
  const signature = await sendTransaction(tx);
  logger.trade('send', true, { signature, amount, token });
} catch (error) {
  logger.transactionError(signature, error, { amount, token });
}
```

### 6. Authentication

**Before:**
```typescript
if (authenticated) {
  console.log('User logged in:', username);
} else {
  console.error('Authentication failed for:', username);
}
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('Auth');

logger.authEvent('login', authenticated, { username });
```

### 7. Arbitrage Opportunities

**Before:**
```typescript
console.log('Arbitrage opportunity found!');
console.log('Profit:', profit);
console.log('Route:', route);
```

**After:**
```typescript
import { Logger } from './utils/logger';

const logger = new Logger('Arbitrage');

logger.opportunity(profit, route, { dexes, slippage });
```

## Advanced Features

### Request ID Tracking

For tracking requests across multiple operations:

```typescript
import { Logger, generateRequestId } from './utils/logger';

const requestId = generateRequestId();
const logger = new Logger('API', requestId);

logger.info('Request received', { endpoint, method });
// ... more operations with same requestId ...
logger.info('Request completed', { duration });
```

### Child Loggers

Create child loggers with additional context:

```typescript
import { Logger } from './utils/logger';

const mainLogger = new Logger('Service');
const childLogger = mainLogger.child('SubComponent');

mainLogger.info('Main operation');
childLogger.info('Sub-operation'); // Logs with SubComponent context
```

### Structured Metadata

Include rich metadata in your logs:

```typescript
logger.info('Trade executed', {
  signature,
  amount: trade.amount,
  token: trade.token,
  dex: trade.dex,
  profit: trade.profit,
  gasUsed: trade.gasUsed,
  timestamp: Date.now(),
});
```

## Log Levels

Choose the appropriate log level:

- **error**: Critical errors that need immediate attention
  ```typescript
  logger.error('Database connection failed', error);
  ```

- **warn**: Warning conditions that should be reviewed
  ```typescript
  logger.warn('High slippage detected', { slippage: 5.2 });
  ```

- **info**: Normal operational messages (default)
  ```typescript
  logger.info('Service started', { port: 3000 });
  ```

- **debug**: Detailed debugging information
  ```typescript
  logger.debug('Route calculation', { routes, bestRoute });
  ```

- **verbose**: Very detailed trace information
  ```typescript
  logger.verbose('Token price fetched', { token, price, source });
  ```

## Configuration

### Environment Variable

Set the log level via environment variable:
```bash
# .env
LOG_LEVEL=debug  # Options: error, warn, info, debug, verbose
```

### Log Files

Logs are written to:
- `logs/error.log` - Error-level messages only
- `logs/combined.log` - All log levels

Both files auto-rotate at 5MB:
- Error logs: 5 files kept
- Combined logs: 10 files kept

## Migration Checklist

When migrating a file:

- [ ] Import the Logger at the top of the file
- [ ] Create a Logger instance with appropriate context name
- [ ] Replace all `console.log` with `logger.info` or appropriate level
- [ ] Replace all `console.error` with `logger.error`
- [ ] Replace all `console.warn` with `logger.warn`
- [ ] Replace all `console.debug` with `logger.debug`
- [ ] Add structured metadata instead of string concatenation
- [ ] Use specialized methods where appropriate (rpcError, transactionError, etc.)
- [ ] Test that logs appear correctly in console and files

## Common Patterns

### Pattern 1: Service Initialization

```typescript
import { Logger } from './utils/logger';

export class MyService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MyService');
    this.logger.info('Service initialized');
  }

  async process(data: any) {
    this.logger.info('Processing started', { dataId: data.id });
    // ... processing ...
    this.logger.info('Processing completed', { result });
  }
}
```

### Pattern 2: API Endpoint

```typescript
import { Logger, generateRequestId } from './utils/logger';

export default async function handler(req, res) {
  const requestId = generateRequestId();
  const logger = new Logger('API', requestId);

  logger.info('Request received', {
    method: req.method,
    path: req.url,
  });

  try {
    // ... handle request ...
    logger.info('Request completed', { status: 200 });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Request failed', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Pattern 3: Long-Running Process

```typescript
import { Logger } from './utils/logger';

const logger = new Logger('Monitor');

async function monitorLoop() {
  logger.info('Monitor loop started');

  while (true) {
    try {
      const result = await scanMarket();
      logger.debug('Scan completed', { opportunities: result.length });

      if (result.length > 0) {
        logger.info('Opportunities found', { count: result.length });
      }
    } catch (error) {
      logger.error('Scan failed', error);
    }

    await sleep(60000);
  }
}
```

## Performance Considerations

- Logger is lightweight and adds minimal overhead
- File writes are asynchronous and non-blocking
- Log rotation happens automatically
- No need to manually manage log files

## Troubleshooting

### Logs not appearing in files?

Check that the `logs/` directory exists and is writable:
```bash
mkdir -p logs
chmod 755 logs
```

### Too much or too little logging?

Adjust the LOG_LEVEL environment variable:
```bash
# Production: Less verbose
LOG_LEVEL=warn

# Development: More verbose
LOG_LEVEL=debug

# Debugging issues: Maximum verbosity
LOG_LEVEL=verbose
```

### Need to temporarily see all logs?

Change LOG_LEVEL to `verbose` and restart:
```bash
export LOG_LEVEL=verbose
npm start
```

## Best Practices

1. **Use appropriate log levels** - Don't log everything as `info`
2. **Include context** - Add relevant metadata to help debugging
3. **Don't log sensitive data** - Never log private keys, passwords, tokens
4. **Use structured data** - Pass objects instead of string concatenation
5. **Be consistent** - Use the same context names throughout a module
6. **Log meaningful events** - Not every line needs a log
7. **Use specialized methods** - They provide better structure and filtering

## Questions?

For more information, see:
- `src/utils/logger.ts` - Logger implementation
- `ARCHITECTURE.md` - Logging section
- Winston documentation: https://github.com/winstonjs/winston

---

Happy logging! 📝
