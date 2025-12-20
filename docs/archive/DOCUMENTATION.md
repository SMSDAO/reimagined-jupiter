# GXQ STUDIO - System Documentation

## Overview
GXQ STUDIO is the most advanced Solana flash loan arbitrage system, featuring comprehensive integrations with QuickNode, multiple flash loan providers, DEXs, and the Jupiter v6 aggregator.

## Key Components

### 1. QuickNode Integration (`src/integrations/quicknode.ts`)
- **RPC**: High-performance Solana RPC endpoint
- **Functions**: Serverless compute for price monitoring
- **KV Store**: Caching arbitrage opportunities
- **Streams**: Real-time blockchain event monitoring

### 2. Flash Loan Providers (`src/providers/flashLoan.ts`)
Five flash loan providers with fees ranging from 0.09% to 0.20%:
- **Marginfi**: 0.09% (lowest fee)
- **Solend**: 0.10%
- **Kamino**: 0.12%
- **Mango**: 0.15%
- **Port Finance**: 0.20%

### 3. DEX Integrations (`src/dex/index.ts`)
Eight DEX programs for optimal routing:
- Raydium
- Orca
- Serum
- Saber (optimized for stablecoins)
- Mercurial (optimized for stablecoins)
- Lifinity
- Aldrin
- Crema

### 4. Jupiter v6 Integration (`src/integrations/jupiter.ts`)
- Quote API for best price discovery
- Swap execution with MEV protection
- Triangular arbitrage path finding
- Token price data

### 5. Arbitrage Strategies (`src/strategies/arbitrage.ts`)

#### Flash Loan Arbitrage
- Zero-capital required
- Borrows from flash loan providers
- Executes arbitrage swaps
- Repays loan + fee
- Keeps profit

#### Triangular Arbitrage
- Requires initial capital
- Uses Jupiter v6 for routing
- Executes A → B → C → A path
- Profits from price inefficiencies

### 6. Preset Management (`src/services/presetManager.ts`)
Six pre-configured strategies:
1. **Stablecoin Flash Loan** - Low risk, stablecoins only
2. **SOL Triangular** - Medium risk, SOL-based paths
3. **LST Arbitrage** - Liquid staking tokens
4. **Memecoin Flash** - High risk, high reward
5. **GXQ Ecosystem** - GXQ token arbitrage
6. **DeFi Tokens** - Major DeFi protocols

### 7. Airdrop Checker (`src/services/airdropChecker.ts`)
Automatic detection and claiming of airdrops from:
- Jupiter
- Jito
- Pyth
- Kamino
- Marginfi
- GXQ ecosystem

### 8. MEV Protection (`src/services/autoExecution.ts`)
- Jito bundle integration
- Private RPC routing
- Dynamic priority fees
- Slippage estimation
- Safety checks

### 9. Auto-Execution Engine
Continuous monitoring and execution:
- Scans all enabled presets
- Finds profitable opportunities
- Applies MEV protection
- Executes trades automatically
- Monitors success/failure

## Token Support (30+)

### Native Tokens
SOL, wSOL, RAY, ORCA, MNGO, SRM, JUP, RENDER, JTO, PYTH, STEP

### Stablecoins
USDC, USDT, USDH, UXD, USDR

### Liquid Staking Tokens (LSTs)
mSOL, stSOL, jitoSOL, bSOL, scnSOL

### Memecoins
BONK, WIF, SAMO, MYRO, POPCAT, WEN

### GXQ Ecosystem
GXQ, sGXQ, xGXQ

## CLI Commands

```bash
# Check for claimable airdrops
npm start airdrops

# Auto-claim all airdrops
npm start claim

# List available presets
npm start presets

# Scan for arbitrage opportunities
npm start scan

# Start auto-execution engine
npm start start

# Show flash loan providers
npm start providers
```

## Configuration

All configuration is done through environment variables in `.env`:

```env
# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_private_key_here

# QuickNode
QUICKNODE_RPC_URL=your_quicknode_rpc_url
QUICKNODE_API_KEY=your_quicknode_api_key
QUICKNODE_FUNCTIONS_URL=your_quicknode_functions_url
QUICKNODE_KV_URL=your_quicknode_kv_url
QUICKNODE_STREAMS_URL=your_quicknode_streams_url

# Arbitrage
MIN_PROFIT_THRESHOLD=0.005
MAX_SLIPPAGE=0.01
GAS_BUFFER=1.5
```

## Architecture

```
src/
├── config/              # Configuration and token definitions
│   └── index.ts        # Main config with 30+ token definitions
├── providers/          # Flash loan provider implementations
│   └── flashLoan.ts    # 5 flash loan providers
├── dex/                # DEX integrations
│   └── index.ts        # 8 DEX implementations
├── integrations/       # External service integrations
│   ├── quicknode.ts    # QuickNode RPC, Functions, KV, Streams
│   └── jupiter.ts      # Jupiter v6 aggregator
├── services/           # Core services
│   ├── airdropChecker.ts   # Airdrop detection and claiming
│   ├── presetManager.ts    # Preset configuration management
│   └── autoExecution.ts    # Auto-execution engine + MEV protection
├── strategies/         # Arbitrage strategies
│   └── arbitrage.ts    # Flash loan + Triangular arbitrage
├── utils/              # Helper utilities
│   └── helpers.ts      # Common utility functions
├── types.ts            # TypeScript type definitions
└── index.ts            # Main entry point and CLI
```

## Security Features

1. **MEV Protection**: Jito bundle integration prevents front-running
2. **Private RPC**: Hide transactions from public mempool
3. **Priority Fees**: Dynamic fee calculation for fast execution
4. **Slippage Protection**: Real-time slippage estimation
5. **Safety Checks**: Confidence scoring and opportunity validation

## Performance Optimizations

1. **QuickNode KV**: Cache opportunities for fast retrieval
2. **Parallel Scanning**: Check multiple presets simultaneously
3. **Efficient Routing**: Jupiter v6 for best execution paths
4. **Rate Limiting**: Prevent API throttling
5. **Connection Pooling**: Reuse RPC connections

## Future Enhancements

1. Advanced ML-based opportunity prediction
2. Cross-chain arbitrage support
3. More flash loan provider integrations
4. Enhanced MEV protection strategies
5. Real-time profitability dashboard
6. Historical performance analytics
7. Multi-wallet management
8. Telegram/Discord notifications

## Risk Management

- Minimum profit thresholds prevent unprofitable trades
- Maximum slippage limits protect against price impact
- Gas buffer ensures transactions don't fail
- Confidence scoring filters risky opportunities
- MEV protection prevents sandwich attacks

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
