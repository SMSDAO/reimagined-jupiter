# Flashloan Aggregator

A comprehensive flashloan aggregator service for executing arbitrage opportunities across multiple lending protocols on Solana.

## ⚠️ IMPORTANT: Production Status

**This implementation is a framework/proof-of-concept that requires provider-specific SDK integration for production use.**

The current implementation provides:
- ✅ Complete provider selection logic
- ✅ Profitability calculations
- ✅ Transaction structure and validation
- ✅ Jupiter integration for swap routing
- ✅ Comprehensive error handling and testing

**What's NOT implemented (requires additional work):**
- ❌ Actual borrow/repay instructions for each provider
- ❌ Provider-specific program interface implementations
- ❌ Real transaction signing and execution

Each flashloan provider (Marginfi, Solend, Kamino, Mango, Port Finance) has unique program interfaces that require integration with their respective SDKs. The transaction building logic is ready to accept these instructions once implemented.

See the [Production Considerations](#production-considerations) section for details.

## Features

- **Multi-Provider Support**: Integrates with 5 major flashloan providers (Marginfi, Solend, Kamino, Mango Markets, Port Finance)
- **Automatic Provider Selection**: Selects the best provider based on fees and loan capacity
- **Jupiter Integration**: Uses Jupiter aggregator for optimal swap routing
- **Atomic Transactions**: Ensures all operations (borrow → swap → repay) succeed or fail together
- **Dynamic Priority Fees**: Calculates optimal transaction fees based on network conditions
- **Profitability Validation**: Validates trades are profitable after fees before execution
- **Comprehensive Error Handling**: Robust error handling with detailed error messages

## Architecture

```
/webapp/lib/flashloan/
├── providers.ts    # Provider definitions and selection logic
├── executor.ts     # Flashloan execution and transaction building
├── index.ts        # Module exports
└── README.md       # This file
```

## Provider Details

| Provider | Max Loan | Fee (bps) | Fee (%) |
|----------|----------|-----------|---------|
| Marginfi | 1,000,000 | 9 | 0.09% |
| Solend | 800,000 | 9 | 0.09% |
| Kamino | 900,000 | 10 | 0.10% |
| Mango Markets | 1,200,000 | 15 | 0.15% |
| Port Finance | 700,000 | 20 | 0.20% |

## Usage

### Basic Example

```typescript
import { FlashloanExecutor, ArbitrageOpportunity } from '@/lib/flashloan';
import { createResilientConnection } from '@/lib/solana/connection';

// Create connection
const connection = createResilientConnection();

// Create executor
const executor = new FlashloanExecutor(connection.getConnection());

// Define opportunity
const opportunity: ArbitrageOpportunity = {
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: 1000000000, // 1 SOL
  estimatedProfit: 50000,
  slippageBps: 50, // 0.5%
};

// Execute arbitrage
const result = await executor.executeArbitrageWithFlashloan(
  opportunity,
  userPublicKey
);

if (result.success) {
  console.log('Success!');
  console.log('Signature:', result.signature);
  console.log('Profit:', result.profit);
  console.log('Provider:', result.provider);
} else {
  console.error('Failed:', result.error);
}
```

### API Endpoint

#### POST `/api/arbitrage/execute-flashloan`

Execute a flashloan arbitrage opportunity.

**Request Body:**
```json
{
  "opportunity": {
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1000000000,
    "estimatedProfit": 50000,
    "slippageBps": 50
  },
  "walletAddress": "YOUR_WALLET_ADDRESS",
  "provider": "Marginfi" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "signature": "...",
  "profit": 50000,
  "provider": "Marginfi",
  "rpcEndpoint": "...",
  "timestamp": 1234567890
}
```

#### GET `/api/arbitrage/execute-flashloan`

Get available flashloan providers.

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "name": "Marginfi",
      "programId": "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
      "maxLoan": 1000000,
      "fee": 9,
      "feePercentage": "0.09%"
    },
    // ... other providers
  ],
  "timestamp": 1234567890
}
```

## Provider Selection Logic

The aggregator automatically selects the best provider using the following algorithm:

1. Filter providers that can handle the requested loan amount
2. Sort filtered providers by fee (lowest first)
3. Return the provider with the lowest fee

If no provider can handle the amount, the execution will fail with an appropriate error message.

## Profitability Calculation

Before executing a trade, the system validates profitability:

1. Calculate flashloan fee: `feeAmount = loanAmount × feeBps / 10000`
2. Calculate repayment: `repayAmount = loanAmount + feeAmount`
3. Check output: `profit = outputAmount - repayAmount`
4. Validate minimum threshold: `profit >= loanAmount × 0.001` (0.1%)

## Transaction Structure

Each flashloan arbitrage consists of an atomic transaction with the following instructions:

1. **Compute Budget Instructions**
   - Set compute unit price (priority fee)
   - Set compute unit limit (400,000 units)

2. **Flash Loan Borrow** (Provider-specific)
   - Borrow tokens from the selected provider

3. **Jupiter Swap** (1-3 instructions)
   - Execute the arbitrage swap through Jupiter

4. **Flash Loan Repay** (Provider-specific)
   - Repay borrowed tokens + fee

All instructions must succeed for the transaction to be confirmed.

## Error Handling

The executor handles various error scenarios:

- **Invalid Input**: Missing or invalid mint addresses, amounts
- **Insufficient Capacity**: No provider can handle the loan amount
- **Unprofitable Trade**: Output doesn't cover loan + fees
- **Simulation Failure**: Transaction would fail on-chain
- **Network Errors**: RPC or Jupiter API failures

Each error returns a descriptive message for debugging.

## Security Features

- **Input Validation**: All inputs are validated before processing
- **Profitability Checks**: Trades must be profitable before execution
- **Transaction Simulation**: Transactions are simulated before sending
- **Atomic Execution**: All-or-nothing transaction execution
- **No Hardcoded Keys**: All sensitive data from environment variables

## Testing

Comprehensive test suite covers:

- Provider selection logic
- Profitability calculations
- Input validation
- Edge cases (capacity limits, zero fees, etc.)
- Fee calculations

Run tests:
```bash
npm test -- flashloanAggregator.test.ts
```

## Future Improvements

1. **Provider SDK Integration**: Implement actual borrow/repay instructions for each provider
2. **MEV Protection**: Integrate with Jito bundles for frontrunning protection
3. **Multi-Hop Arbitrage**: Support triangular arbitrage (A → B → C → A)
4. **Gas Optimization**: Optimize compute units and transaction size
5. **Real-Time Monitoring**: Track provider liquidity and availability
6. **Retry Logic**: Implement exponential backoff for failed transactions

## Production Considerations

⚠️ **Important Notes:**

1. **Provider Integration**: The current implementation provides transaction structure but requires provider-specific SDK integration for actual borrow/repay instructions. Each provider has unique program interfaces.

2. **Wallet Signing**: The API endpoint simulates transactions but doesn't actually sign them. In production, transactions should be signed by the user's wallet in the browser.

3. **Liquidity Checks**: The `maxLoan` values are static. Production systems should query real-time liquidity from each provider.

4. **Rate Limiting**: Implement rate limiting on the API endpoint to prevent abuse.

5. **Monitoring**: Set up monitoring for transaction success rates, profitability, and provider health.

## Dependencies

- `@solana/web3.js` - Solana blockchain interaction
- `@jup-ag/api` - Jupiter aggregator integration
- Next.js - API endpoints and routing

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact the team.
