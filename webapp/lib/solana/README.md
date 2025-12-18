# Resilient Solana Connection Library

This library provides production-ready Solana RPC connection handling with automatic failover, retry logic, and health monitoring.

## Features

- **Multiple RPC Endpoint Support**: Automatically switches between endpoints on failure
- **Health Monitoring**: Periodic health checks on all configured endpoints
- **Exponential Backoff**: Intelligent retry logic with increasing delays
- **Priority Fee Calculation**: Dynamic fee calculation based on network conditions
- **Connection Pooling**: Reuses connections for better performance
- **TypeScript Support**: Full type safety for all operations

## Quick Start

### 1. Configure Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
QUICKNODE_RPC_URL=your_quicknode_rpc_url_here

# Optional fallback endpoints
FALLBACK_RPC_URL_1=https://solana-api.projectserum.com
FALLBACK_RPC_URL_2=https://rpc.ankr.com/solana
```

### 2. Create a Resilient Connection

```typescript
import { createResilientConnection } from '@/lib/solana/connection';

// Use default configuration from environment variables
const resilientConnection = createResilientConnection();

// Or provide custom configuration
const customConnection = createResilientConnection({
  endpoints: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
  ],
  commitment: 'confirmed',
  maxRetries: 3,
  retryDelay: 1000,
  healthCheckInterval: 30000,
});
```

### 3. Use the Connection

```typescript
// Get slot
const slot = await resilientConnection.getSlot();

// Get balance
const balance = await resilientConnection.getBalance(publicKey);

// Get recent prioritization fees
const fees = await resilientConnection.getRecentPrioritizationFees();

// Send and confirm transaction
const signature = await resilientConnection.sendTransaction(
  transaction,
  [keypair],
  { skipPreflight: false }
);

// Don't forget to cleanup when done
resilientConnection.destroy();
```

## Transaction Builder

The `TransactionBuilder` class simplifies transaction creation and execution with automatic priority fee calculation.

### Basic Usage

```typescript
import { TransactionBuilder } from '@/lib/solana/transaction-builder';
import { createResilientConnection } from '@/lib/solana/connection';
import { SystemProgram, PublicKey, Keypair } from '@solana/web3.js';

// Create connection and builder
const connection = createResilientConnection();
const builder = new TransactionBuilder(connection);

// Build transaction with instructions
const instructions = [
  SystemProgram.transfer({
    fromPubkey: fromKeypair.publicKey,
    toPubkey: new PublicKey('recipient'),
    lamports: 1000000,
  }),
];

const transaction = await builder.buildTransaction(
  instructions,
  fromKeypair.publicKey,
  undefined, // Auto-calculate priority fee
  'medium'   // Urgency level
);

// Execute transaction
const result = await builder.executeTransaction(
  transaction,
  [fromKeypair],
  'confirmed'
);

if (result.success) {
  console.log('Transaction successful:', result.signature);
  console.log('Compute units used:', result.computeUnits);
  console.log('Fee paid:', result.fee);
} else {
  console.error('Transaction failed:', result.error);
}

// Cleanup
connection.destroy();
```

### Priority Fee Configuration

Choose the urgency level based on your needs:

- **low**: 25th percentile fee, 200k compute units
- **medium**: 50th percentile fee, 400k compute units (default)
- **high**: 75th percentile fee, 600k compute units
- **critical**: 95th percentile fee, 1M compute units

```typescript
// Calculate priority fee for high urgency
const priorityFee = await builder.calculateDynamicPriorityFee('high');

console.log('Fee:', priorityFee.microLamports);
console.log('Compute limit:', priorityFee.computeUnitLimit);
```

### Versioned Transactions

```typescript
import { VersionedTransaction } from '@solana/web3.js';

// Execute a pre-built versioned transaction
const versionedTx = // ... your versioned transaction
const result = await builder.executeVersionedTransaction(
  versionedTx,
  'confirmed',
  false // skipPreflight
);
```

## API Endpoints

The library includes ready-to-use API endpoints for common operations.

### Transaction Execution

```typescript
// POST /api/transactions/execute
const response = await fetch('/api/transactions/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transaction: base64EncodedTransaction,
    isVersioned: true,
    urgency: 'medium',
    commitment: 'confirmed',
  }),
});

const result = await response.json();
```

### Arbitrage Scanning

```typescript
// GET /api/arbitrage/scan?tokenMint=SOL&minProfit=0.5
const response = await fetch('/api/arbitrage/scan?minProfit=1.0');
const { opportunities } = await response.json();
```

### Airdrop Checking

```typescript
// GET /api/airdrops/check?walletAddress=YOUR_WALLET
const response = await fetch(`/api/airdrops/check?walletAddress=${wallet}`);
const { eligibleAirdrops, totalValue } = await response.json();
```

### System Status

```typescript
// GET /api/admin/status
const response = await fetch('/api/admin/status');
const { status, rpc, network } = await response.json();

console.log('RPC Health:', rpc.healthyCount, '/', rpc.totalCount);
console.log('Network Congestion:', network.networkCongestion);
```

## React Component

Use the `TransactionExecutor` component for a ready-made UI:

```typescript
import TransactionExecutor from '@/components/Trading/TransactionExecutor';

function MyPage() {
  const handleSuccess = (signature: string) => {
    console.log('Transaction successful:', signature);
  };

  const handleError = (error: string) => {
    console.error('Transaction failed:', error);
  };

  return (
    <TransactionExecutor
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

## Advanced Usage

### Custom Retry Logic

```typescript
// Execute any operation with automatic retry
const result = await resilientConnection.executeWithRetry(
  async (connection) => {
    // Your custom operation
    return await connection.getAccountInfo(publicKey);
  },
  'getAccountInfo' // Operation name for logging
);
```

### Health Monitoring

```typescript
// Get health status of all endpoints
const health = resilientConnection.getEndpointHealth();

health.forEach(endpoint => {
  console.log(`${endpoint.url}:`);
  console.log(`  Healthy: ${endpoint.isHealthy}`);
  console.log(`  Failures: ${endpoint.failureCount}`);
  console.log(`  Last checked: ${new Date(endpoint.lastChecked)}`);
});

// Manually trigger health check (POST /api/admin/status)
const response = await fetch('/api/admin/status', { method: 'POST' });
const results = await response.json();
```

### Endpoint Switching

The library automatically switches to the next healthy endpoint when:
- An RPC call fails
- A timeout occurs
- The endpoint is marked unhealthy by health checks

You can see which endpoint is currently active:

```typescript
const currentEndpoint = resilientConnection.getCurrentEndpoint();
console.log('Using RPC endpoint:', currentEndpoint);
```

## Best Practices

### 1. Always Clean Up

```typescript
const connection = createResilientConnection();
try {
  // Your operations
} finally {
  connection.destroy(); // Stop health checking and cleanup
}
```

### 2. Use Appropriate Urgency Levels

- Use `low` for background tasks, analytics
- Use `medium` for regular user transactions (default)
- Use `high` for time-sensitive operations
- Use `critical` only for MEV protection or critical operations

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await builder.executeTransaction(tx, signers);
  if (!result.success) {
    // Handle transaction failure
    console.error('Transaction failed:', result.error);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

### 4. Monitor Network Conditions

```typescript
const fees = await connection.getRecentPrioritizationFees();
const avgFee = fees.reduce((sum, f) => sum + f.prioritizationFee, 0) / fees.length;

if (avgFee > 100000) {
  console.warn('Network is congested, consider waiting');
}
```

## Troubleshooting

### Connection Failures

If all endpoints fail:
1. Check your RPC URLs in environment variables
2. Verify network connectivity
3. Check if Solana network is operational
4. Review endpoint health: `connection.getEndpointHealth()`

### Slow Transactions

If transactions are slow to confirm:
1. Increase urgency level
2. Add more healthy RPC endpoints
3. Check network congestion via `/api/admin/status`

### Type Errors

If you encounter TypeScript errors:
1. Ensure `@solana/web3.js` version matches (^1.98.4)
2. Check that all imports are from correct paths
3. Clear your build cache: `rm -rf .next`

## Migration Guide

### From Basic Connection

Before:
```typescript
import { Connection } from '@solana/web3.js';
const connection = new Connection('https://api.mainnet-beta.solana.com');
const balance = await connection.getBalance(pubkey);
```

After:
```typescript
import { createResilientConnection } from '@/lib/solana/connection';
const resilientConnection = createResilientConnection();
const balance = await resilientConnection.getBalance(pubkey);
resilientConnection.destroy();
```

### From Manual Transaction Execution

Before:
```typescript
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [signer]
);
```

After:
```typescript
import { TransactionBuilder } from '@/lib/solana/transaction-builder';
const builder = new TransactionBuilder(resilientConnection);
const result = await builder.executeTransaction(transaction, [signer]);
```

## Architecture

```
┌─────────────────────────────────────────┐
│   Application Layer                     │
│   (React Components, API Routes)        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│   TransactionBuilder                    │
│   - Build transactions                  │
│   - Calculate priority fees             │
│   - Execute with retry                  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│   ResilientSolanaConnection             │
│   - Endpoint management                 │
│   - Health checking                     │
│   - Automatic failover                  │
│   - Retry logic                         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│   Solana RPC Endpoints                  │
│   - QuickNode                           │
│   - Public RPCs                         │
│   - Custom endpoints                    │
└─────────────────────────────────────────┘
```

## Security Considerations

1. **Private Keys**: Never expose private keys in client-side code
2. **RPC URLs**: Keep premium RPC URLs in server-side environment variables
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Input Validation**: Always validate wallet addresses and amounts
5. **Error Messages**: Don't expose sensitive info in error messages

## Performance Tips

1. Reuse connections when possible
2. Use connection pooling for high-throughput applications
3. Set appropriate health check intervals (default: 30s)
4. Monitor and remove consistently failing endpoints
5. Use client-side execution for wallet-signed transactions

## License

Part of the GXQ Studio - Advanced Solana DeFi Platform
