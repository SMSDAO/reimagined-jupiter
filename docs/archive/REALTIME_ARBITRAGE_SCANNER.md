# Real-Time Arbitrage Scanner

The Real-Time Arbitrage Scanner is an advanced feature that continuously monitors Solana DEXs for triangular arbitrage opportunities using Jupiter's SDK.

## Features

- **Real-time Detection**: Continuous scanning at configurable intervals (default: 1 second)
- **Triangle Arbitrage**: Detects profitable 3-token arbitrage paths (A → B → C → A)
- **Jupiter Integration**: Uses Jupiter v6 API for optimal route finding and price quotes
- **Profitability Analysis**: Calculates profit after accounting for:
  - Price impact
  - Slippage
  - Gas fees
  - Confidence scoring
- **Smart Filtering**: Only shows opportunities meeting minimum thresholds
- **Real-time Notifications**: Callbacks notify when profitable opportunities are found

## Architecture

### Core Components

1. **RealTimeArbitrageScanner** (`src/services/realTimeArbitrageScanner.ts`)
   - Main scanner class
   - Manages token pairs and scanning logic
   - Integrates with Jupiter SDK

2. **ArbitrageOpportunity Interface** (`src/types.ts`)
   - Enhanced with real-time specific fields
   - Includes timestamp, price impact, slippage, gas fees

3. **CLI Integration** (`src/index.ts`)
   - Two commands for scanner usage
   - Integrated into main application

## Usage

### 1. Continuous Real-Time Scanning

Monitor all supported token pairs continuously:

```bash
npm start realtime-scan
```

Monitor specific tokens only:

```bash
npm start realtime-scan SOL USDC USDT BONK
```

The scanner will:
- Initialize token pair combinations
- Start continuous scanning at configured intervals
- Display opportunities as they're found in real-time
- Run until Ctrl+C is pressed

**Output Example:**
```
🔍 Starting Real-Time Arbitrage Scanner...

Monitoring SOL, USDC, USDT, BONK
Scanner Configuration:
  Polling Interval: 1000ms
  Min Profit: 0.50%
  Max Slippage: 1.00%
  Min Confidence: 70%

Press Ctrl+C to stop scanning

🎯 NEW OPPORTUNITY FOUND!
  Type: triangular
  Path: SOL -> USDC -> USDT -> SOL
  Estimated Profit: 0.005234 SOL
  Required Capital: 1.000000 SOL
  Confidence: 82.0%
  Price Impact: 0.2500%
  Est. Slippage: 0.75%
  Est. Gas Fee: 0.000010000 SOL
  DEXes: Raydium, Orca, Jupiter
```

### 2. One-Time Scan

Perform a single scan and display top opportunities:

```bash
npm start realtime-once
```

With specific tokens:

```bash
npm start realtime-once SOL USDC USDT RAY ORCA
```

**Output Example:**
```
🔍 One-time Real-Time Arbitrage Scan...

Found 3 profitable opportunities:

1. SOL -> USDC -> USDT -> SOL
   Profit: 0.005234 SOL
   Capital Required: 1.000000 SOL
   Confidence: 82.0%
   Price Impact: 0.2500%
   DEXes: Raydium, Orca

2. USDC -> USDT -> SOL -> USDC
   Profit: 0.124500 USDC
   Capital Required: 100.000000 USDC
   Confidence: 75.5%
   Price Impact: 0.3200%
   DEXes: Orca, Jupiter
```

## Configuration

The scanner can be configured via environment variables in `.env`:

```env
# Scanner Settings
SCANNER_POLLING_INTERVAL_MS=1000        # Polling interval in milliseconds
SCANNER_MIN_CONFIDENCE=0.70              # Minimum confidence (0-1)
SCANNER_ENABLE_NOTIFICATIONS=true        # Enable opportunity callbacks

# Arbitrage Settings
MIN_PROFIT_THRESHOLD=0.005               # Minimum profit (0.5%)
MAX_SLIPPAGE=0.01                        # Maximum slippage (1%)
GAS_BUFFER=1.5                           # Gas fee buffer multiplier

# Advanced Scanner Settings
DEBUG_SCANNER=false                      # Enable debug logging for scanner errors
```

Or programmatically when creating the scanner:

```typescript
const scanner = new RealTimeArbitrageScanner(connection, {
  pollingIntervalMs: 2000,              // Custom polling interval
  minProfitThreshold: 0.01,             // Custom profit threshold
  maxSlippage: 0.005,                   // Custom max slippage
  minConfidence: 0.80,                  // Custom min confidence
  batchSize: 15,                        // Custom batch size for API calls
  startAmount: 2000000,                 // Custom start amount (in lamports base)
  estimatedGasFeeLamports: 15000,       // Custom gas fee estimate
});
```

## Programmatic Usage

You can use the scanner programmatically in your code:

```typescript
import { Connection } from '@solana/web3.js';
import { RealTimeArbitrageScanner } from './services/realTimeArbitrageScanner.js';

// Initialize
const connection = new Connection('https://api.mainnet-beta.solana.com');
const scanner = new RealTimeArbitrageScanner(connection);

// Set up token pairs
scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT', 'BONK']);

// Register callback for opportunities
scanner.onOpportunityFound((opportunity) => {
  console.log('Found opportunity:', opportunity);
  // Your execution logic here
});

// Start scanning
await scanner.startScanning();

// Stop when needed
// scanner.stopScanning();
```

### One-Time Scan

```typescript
// Scan once and get all opportunities
const opportunities = await scanner.scanForOpportunities(['SOL', 'USDC', 'USDT']);

// Sort by profit
const sorted = opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);

// Execute best opportunity
if (sorted.length > 0) {
  const best = sorted[0];
  console.log(`Best opportunity: ${best.estimatedProfit} profit`);
  // Execute here
}
```

### Configuration Update

```typescript
// Update scanner configuration at runtime
scanner.updateConfig({
  pollingIntervalMs: 2000,      // Slower scanning
  minProfitThreshold: 0.01,     // Higher profit requirement
  maxSlippage: 0.005,           // Stricter slippage
  minConfidence: 0.80,          // Higher confidence
});
```

## Technical Details

### Triangle Arbitrage Detection

The scanner evaluates all possible 3-token paths where tokens are distinct:

1. **Path Generation**: For N tokens, generates N × (N-1) × (N-2) unique paths
2. **Quote Fetching**: Gets Jupiter quotes for each leg (A→B, B→C, C→A)
3. **Profit Calculation**: 
   - `profit = final_amount - start_amount - gas_fee`
   - Accounts for price impact on all three swaps
4. **Filtering**: Only returns opportunities meeting all criteria

### Profitability Metrics

```typescript
interface ArbitrageOpportunity {
  type: 'triangular';
  path: TokenConfig[];              // [A, B, C, A]
  estimatedProfit: number;          // In base token units
  requiredCapital: number;          // Initial amount needed
  confidence: number;               // 0-1 score based on factors
  timestamp: number;                // Unix timestamp
  priceImpact: number;              // Total % price impact
  estimatedSlippage: number;        // Estimated slippage
  estimatedGasFee: number;          // Gas cost in SOL
  routeDetails: {
    dexes: string[];                // DEX names used
    priceImpactPct: string;         // Formatted price impact
  };
}
```

### Confidence Scoring

The confidence score is calculated based on:

- **Price Impact** (20%): Lower impact = higher confidence
- **Profit Margin** (40%): Higher profit = higher confidence
  - 1% profit = +20%
  - 2% profit = +30%
- **Base Score** (50%): Starting baseline

Opportunities with confidence below `minConfidence` are filtered out.

## Performance Considerations

### Batch Processing

The scanner processes token pairs in batches (default: 10) to avoid overwhelming the Jupiter API:

```typescript
const batchSize = 10;
for (let i = 0; i < pairs.length; i += batchSize) {
  const batch = pairs.slice(i, i + batchSize);
  await Promise.allSettled(batch.map(pair => scan(pair)));
}
```

### Rate Limiting

- Default polling interval: 1000ms (1 second)
- Jupiter API has rate limits - adjust interval if needed
- Use QuickNode for better rate limits in production

### Resource Usage

- Each scan requires 3 API calls per token path
- With 6 tokens: 120 unique paths × 3 calls = 360 API calls per scan
- At 1s interval: ~360 req/s
- Consider increasing interval or reducing tokens for high-frequency scanning

## Best Practices

1. **Start Small**: Begin with 3-5 tokens to understand behavior
2. **Use Stablecoins**: Include stablecoins (USDC, USDT) in pairs for better opportunities
3. **Monitor Logs**: Watch for API errors or rate limiting
4. **Test on Devnet**: Test with devnet tokens before mainnet
5. **Set Realistic Thresholds**: Default 0.5% profit threshold accounts for execution slippage
6. **Use QuickNode**: Better rate limits and reliability than public RPCs

## Troubleshooting

### No Opportunities Found

- Lower `MIN_PROFIT_THRESHOLD` in config
- Increase `MAX_SLIPPAGE` tolerance
- Lower `SCANNER_MIN_CONFIDENCE`
- Try different token combinations
- Check if Jupiter API is responsive

### API Rate Limiting

- Increase `SCANNER_POLLING_INTERVAL_MS`
- Reduce number of tokens being scanned
- Use QuickNode or private RPC endpoint

### High CPU/Memory Usage

- Reduce scanning frequency
- Limit number of token pairs
- Use one-time scan instead of continuous

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit private keys** - Always use environment variables
2. **Test thoroughly** - Use devnet before mainnet
3. **Understand risks** - Arbitrage involves:
   - Smart contract risk
   - Price volatility
   - MEV competition
   - Slippage exceeding estimates
4. **Start small** - Test with minimal capital first
5. **Monitor transactions** - Always verify transaction results
6. **Use Jito bundles** - For MEV protection in production (not included in scanner)

## Future Enhancements

Potential improvements for the scanner:

- [ ] Multi-leg arbitrage (4+ tokens)
- [ ] Flash loan integration for scanner results
- [ ] MEV protection via Jito bundles
- [ ] Historical opportunity tracking
- [ ] Machine learning for confidence scoring
- [ ] Webhook notifications
- [ ] Telegram/Discord bot integration
- [ ] Web UI dashboard

## Related Components

- **Enhanced Scanner** (`enhancedScanner.ts`) - Alternative scanner with Pyth price feeds
- **Flash Loan Arbitrage** (`strategies/arbitrage.ts`) - Flash loan execution
- **Triangular Arbitrage** (`strategies/arbitrage.ts`) - Standard triangular arbitrage
- **Jupiter Integration** (`integrations/jupiter.ts`) - Jupiter SDK wrapper

## Support

For issues or questions:
- Check existing GitHub issues
- Review code documentation
- Test with minimal configuration first
- Enable debug logging for troubleshooting

---

**Built with:**
- Solana Web3.js
- Jupiter Aggregator v6 API
- TypeScript
- Node.js
