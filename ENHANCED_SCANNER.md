# Enhanced Arbitrage Scanner

## Overview

The Enhanced Arbitrage Scanner is a powerful real-time monitoring system that continuously scans for arbitrage opportunities across all Solana DEXes. It features 1-second polling, multi-angle opportunity detection, and comprehensive historical analysis.

## Features

### 🔍 Multi-Angle Scanning
- **Flash Loan Arbitrage**: Detects opportunities across 6 flash loan providers (Marginfi, Solend, Mango, Kamino, Port Finance, Save Finance)
- **Triangular Arbitrage**: Identifies profitable 3-token cycles using Jupiter v6 aggregator
- **Cross-DEX Arbitrage**: Finds price discrepancies between different DEXes
- **20+ Aggregators**: Leverages Jupiter's routing across all major Solana DEXes plus 12 direct DEX integrations

### ⚡ Real-Time Performance
- **1-Second Polling**: Configurable polling interval (default 1000ms)
- **Live Updates**: Real-time console notifications of opportunities
- **Dynamic Gas Estimation**: Automatic compute unit estimation via Solana RPC
- **User-Configurable Slippage**: Set maximum slippage tolerance per your risk profile

### 💾 Historical Analysis
- **Database Integration**: All opportunities automatically logged to JSON database
- **Performance Tracking**: Track executed trades and actual profits
- **Statistical Analysis**: Comprehensive metrics by type, provider, and token
- **Historical Reports**: Analyze opportunities over customizable time periods

### 🛡️ Security & Reliability
- **Mainnet-Ready**: Secure validation for all transactions
- **Error Handling**: Graceful failure recovery
- **Rate Limiting**: Prevents RPC throttling
- **MEV Protection**: Integration with Jito bundles

## Quick Start

### 1. Start Enhanced Scanner

```bash
# Start with default 1-second polling
npm start enhanced-scan

# Start with custom polling interval (2 seconds)
npm start enhanced-scan 2000
```

The scanner will continuously monitor for opportunities and display:
- Flash loan arbitrage opportunities
- Triangular arbitrage paths
- Cross-DEX price discrepancies
- Real-time gas estimates
- Confidence scores

### 2. View Scanner Statistics

```bash
npm start scanner-stats
```

Shows:
- Total scans performed
- Opportunities found
- Recent opportunities list

### 3. View Database Statistics

```bash
npm start db-stats
```

Displays:
- Total opportunities detected
- Total executed trades
- Success rate
- Total and average profit
- Breakdown by type and provider

### 4. View Historical Analysis

```bash
# Last 7 days (default)
npm start history

# Last 30 days
npm start history 30
```

Provides:
- Period summary
- Opportunity count
- Execution statistics
- Top tokens
- Top providers

## Configuration

Add to your `.env` file:

```env
# Enhanced Scanner Configuration
SCANNER_POLLING_INTERVAL_MS=1000          # Polling frequency in milliseconds
SCANNER_ENABLE_LIVE_UPDATES=true          # Enable real-time console updates
SCANNER_ENABLE_NOTIFICATIONS=true         # Enable opportunity notifications
SCANNER_MIN_CONFIDENCE=0.70               # Minimum confidence threshold (0-1)

# Arbitrage Configuration
MIN_PROFIT_THRESHOLD=0.005                # 0.5% minimum profit
MAX_SLIPPAGE=0.01                         # 1% maximum slippage
GAS_BUFFER=1.5                            # 1.5x gas estimate buffer
```

## Supported Opportunities

### Flash Loan Arbitrage
- Borrow funds with no collateral
- Execute arbitrage across DEXes
- Repay loan + fee in same transaction
- Providers: Marginfi (0.09%), Solend (0.10%), Save Finance (0.11%), Kamino (0.12%), Mango (0.15%), Port Finance (0.20%)

### Triangular Arbitrage
- Three-token cycles (A → B → C → A)
- Jupiter v6 routing for optimal paths
- Common paths: SOL/USDC/RAY, SOL/USDC/ORCA, etc.

### Cross-DEX Arbitrage
- Price discrepancies between different DEXes
- Buy low on one DEX, sell high on another
- Instant execution via Jupiter aggregator

## DEX Coverage

The scanner monitors prices across:

### Direct Integrations (12 DEXes)
- Raydium
- Orca
- Serum
- Saber
- Mercurial
- Lifinity
- Aldrin
- Crema
- Meteora
- Phoenix
- OpenBook
- FluxBeam

### Jupiter Aggregator Routes (20+ DEXes)
Jupiter automatically routes through all available DEXes including:
- All direct integrations above
- Pump.fun
- Goosefx
- Cropper
- Penguin
- Cykura
- Invariant
- Dradex
- And more...

**Total Coverage: 20+ aggregators/DEXes**

## Architecture

```
Enhanced Scanner
├── Flash Loan Scanner
│   ├── Marginfi Provider
│   ├── Solend Provider
│   ├── Mango Provider
│   ├── Kamino Provider
│   ├── Port Finance Provider
│   └── Save Finance Provider
├── Triangular Arbitrage Scanner
│   └── Jupiter v6 Integration
├── Cross-DEX Scanner
│   ├── 12 Direct DEX Integrations
│   └── Jupiter Aggregator
└── Database Layer
    ├── Opportunity Logging
    ├── Execution Tracking
    └── Historical Analysis
```

## Gas Estimation

The scanner uses Solana RPC's `getRecentPrioritizationFees` to:
1. Fetch recent priority fees from validators
2. Calculate median fee for reliability
3. Estimate compute units for transaction type
4. Apply configurable gas buffer (default 1.5x)
5. Return total cost in lamports

This ensures accurate gas cost estimation for profitability calculations.

## Database Schema

Opportunities are stored with the following structure:

```typescript
{
  id: string;                    // Unique identifier
  timestamp: Date;               // When detected
  type: 'flash-loan' | 'triangular' | 'cross-dex';
  tokens: string[];              // Token symbols involved
  estimatedProfit: number;       // Profit percentage
  confidence: number;            // Confidence score (0-1)
  provider?: string;             // Flash loan provider (if applicable)
  dexes: string[];              // DEXes involved
  gasEstimate: number;          // Gas cost in lamports
  details: string;              // Human-readable description
  executed: boolean;            // Whether it was executed
  executionSignature?: string;  // Transaction signature
  executionTimestamp?: Date;    // When executed
  actualProfit?: number;        // Actual profit achieved
}
```

## Performance Tips

### Optimal Configuration
- **High-Frequency**: Set `SCANNER_POLLING_INTERVAL_MS=500` for 0.5s polling
- **Standard**: Use default 1000ms (1 second) for balanced performance
- **Conservative**: Set to 2000ms (2 seconds) to reduce RPC load

### RPC Considerations
- Use QuickNode or other premium RPC for best performance
- Public RPCs may have rate limits
- Consider running your own validator for maximum speed

### Profitability Thresholds
- Set `MIN_PROFIT_THRESHOLD` based on your capital and gas costs
- Larger capital allows for lower percentage thresholds
- Account for network congestion during peak times

## Example Output

```
🚀 Starting Enhanced Arbitrage Scanner...
Polling interval: 1000ms
Min profit threshold: 0.50%
Max slippage: 1.00%
Flash loan providers: 6
DEX integrations: 12
Jupiter aggregator: enabled (20+ routes)

🔍 Scan #10 | Opportunities found: 3

🎯 [OPPORTUNITY DETECTED]
   Type: flash-loan
   Tokens: SOL -> USDC -> SOL
   Profit: 0.523%
   Confidence: 85%
   DEXes: jupiter
   Gas Estimate: 0.003245 SOL
   Flash Loan Provider: marginfi
   Details: SOL -> USDC -> SOL via marginfi
   Timestamp: 2025-12-16T04:30:15.234Z

🎯 [OPPORTUNITY DETECTED]
   Type: triangular
   Tokens: SOL -> USDC -> RAY
   Profit: 0.687%
   Confidence: 75%
   DEXes: jupiter
   Gas Estimate: 0.004521 SOL
   Details: SOL -> USDC -> RAY -> SOL
   Timestamp: 2025-12-16T04:30:15.891Z
```

## Troubleshooting

### No Opportunities Found
- Market may be efficient at the moment
- Try lowering `MIN_PROFIT_THRESHOLD`
- Check RPC connection is working
- Ensure sufficient liquidity on DEXes

### High Gas Estimates
- Network congestion increases priority fees
- Consider waiting for lower congestion periods
- Adjust `GAS_BUFFER` if estimates are too conservative

### RPC Errors
- Switch to premium RPC provider (QuickNode)
- Check rate limits on current RPC
- Verify `SOLANA_RPC_URL` is correct

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit private keys** to source control
2. **Test on devnet first** before using mainnet
3. **Start with small amounts** to verify functionality
4. **Monitor gas costs** to ensure profitability
5. **Use MEV protection** via Jito bundles for sensitive trades
6. **Validate all opportunities** before execution
7. **Keep RPC endpoints secure** and private when possible

## Future Enhancements

Planned features for future releases:

- [ ] WebSocket integration for sub-second updates
- [ ] Machine learning for opportunity prediction
- [ ] Telegram/Discord notification integration
- [ ] Web dashboard for monitoring
- [ ] Auto-execution with risk management
- [ ] Advanced filtering and routing strategies
- [ ] Integration with more flash loan providers
- [ ] Support for concentrated liquidity pools

## Support

For issues or questions:
- Open an issue on GitHub
- Check the main README.md
- Review DEPLOYMENT_READY.md for production setup

---

**Built with ❤️ by GXQ STUDIO**
