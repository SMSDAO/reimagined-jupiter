# New Features Documentation

## Overview
This document describes the new features added to enhance both user and admin panels in the GXQ Studio platform.

## 1. Settings Panel (User Panel Enhancement)

### Location
`/settings` route in the webapp

### Features

#### Multi-API Provider Configuration
- **Add Multiple Providers**: Users can add unlimited API providers/nodes
- **Provider Types**:
  - **RPC**: Solana RPC endpoints for blockchain interactions
  - **Pyth**: Pyth Network price feed endpoints
  - **DEX**: DEX aggregator APIs (Meteora, Pump.fun, etc.)

#### API Rotation
- **Automatic Rotation**: Toggle to enable/disable automatic provider rotation
- **Rotation Interval**: Configurable interval (60s - 3600s) for provider switching
- **Redundancy**: Ensures high availability by rotating between healthy providers

#### Storage Options
- **Local Storage** (Free):
  - Saves settings in browser localStorage
  - Instant access across sessions
  - No transaction cost
  
- **On-Chain Storage** (0.000022 SOL):
  - Permanently stores settings on Solana blockchain
  - Accessible from any device
  - Uses self-transfer transaction for data persistence
  - Cost: ~$0.003 USD at current SOL prices

#### Default Providers
Pre-configured providers include:
- Solana Mainnet RPC
- Pyth Price Feed (Hermes API)
- Meteora DEX
- Pump.fun API

### Usage
1. Navigate to `/settings`
2. Add/remove/toggle API providers
3. Configure rotation settings
4. Save locally or on-chain
5. Settings are automatically loaded on next visit

---

## 2. Admin Panel

### Location
`/admin` route in the webapp

### Features

#### Live Mainnet Bot Runner
- **Real-time Bot Control**: Start/stop bot with single click
- **Status Monitoring**:
  - Running/Stopped status
  - Uptime counter
  - Daily profit tracking
  - Trades executed counter
  - Success rate percentage
- **Requirements**: Wallet must be connected to control bot

#### Multi-Angle Opportunity Finder
- **Active Scanners**:
  - Arbitrage Scanner
  - Flash Loan Detector
  - Triangular Routes
  - Sniper Monitor
  - Pyth Price Oracle
- **DEX Coverage**: Monitors 7+ DEXs simultaneously
  - Raydium, Orca, Jupiter
  - Meteora, Phoenix, Pump.fun
  - OpenBook
- **Live Opportunities**: Displays real-time trading opportunities with:
  - Opportunity type (Arbitrage, Snipe, Flash Loan, Triangular)
  - Token pair
  - Entry/target prices
  - Expected profit percentage
  - Confidence score
  - DEX route

#### Trade Swap Executor
- **One-Click Execution**: Execute opportunities with single button click
- **Auto-Update**: Bot status updates automatically after execution
- **Profit Tracking**: Real-time profit accumulation
- **Safety Features**: Requires wallet connection and validates transactions

#### Wallet Scoring System
- **Real Transaction Analysis**: Analyzes actual on-chain data
- **Data Sources**:
  - Jupiter API for swap history
  - Raydium API for transaction data
  - Solana RPC for blockchain queries
- **Scoring Metrics**:
  - Swap count (Jupiter + Raydium)
  - Total volume transacted
  - Last activity timestamp
  - Overall score (0-100)
- **Usage**: Enter any Solana wallet address and click "Score Wallet"

#### Portfolio Analysis
- **Live Price Integration**: Uses Pyth Network for real-time prices
- **Token Holdings**: Displays all SPL tokens in wallet
- **Portfolio Metrics**:
  - Total portfolio value (USD)
  - Individual token balances
  - Current prices from Pyth
  - USD value per token
- **Multi-Aggregator Cross-Check**: Validates prices across multiple sources
- **Auto-Refresh**: Updates with latest timestamp

---

## 3. Enhanced Wallet Analysis

### Location
`/wallet-analysis` route (existing page with enhancements)

### Improvements
- **Integration with Jupiter API**: Analyzes swap history
- **Integration with Raydium API**: Tracks DEX transactions
- **Enhanced Risk Scoring**: Based on real transaction data
- **Pyth Price Integration**: Real-time token valuations

---

## 4. Pyth Price Service

### Location
`webapp/lib/pythPriceService.ts`

### Features
- **Pyth Network Integration**: Uses Hermes API for price feeds
- **Supported Tokens**:
  - SOL/USD, BTC/USD, ETH/USD
  - USDC/USD, USDT/USD
  - BONK/USD, JUP/USD
  - RAY/USD, ORCA/USD
- **Price Data**:
  - Current price
  - Confidence interval
  - Exponent
  - Publish timestamp
- **Batch Queries**: Fetch multiple token prices simultaneously

### Usage Example
```typescript
import { getPythService } from '@/lib/pythPriceService';

const pythService = getPythService();
const solPrice = await pythService.getPrice('SOL/USD');
console.log(`SOL price: $${solPrice?.price}`);

// Batch query
const prices = await pythService.getPrices(['SOL/USD', 'BTC/USD', 'ETH/USD']);
```

---

## 5. API Rotation Service

### Location
`webapp/lib/apiRotation.ts`

### Features
- **Provider Management**: Add, remove, enable/disable providers
- **Automatic Rotation**: Time-based rotation with configurable interval
- **Provider Testing**: Test connectivity of all providers
- **Type-Based Filtering**: Get providers by type (RPC, Pyth, DEX)
- **Connection Management**: Get Solana Connection from active RPC provider

### Usage Example
```typescript
import { APIRotationService } from '@/lib/apiRotation';

const providers = [
  { id: '1', name: 'Mainnet', url: 'https://api.mainnet-beta.solana.com', type: 'rpc', enabled: true },
];

const rotationService = new APIRotationService(providers, 300, true);
rotationService.startRotation((provider) => {
  console.log(`Switched to: ${provider.name}`);
});

// Test all providers
const results = await rotationService.testAllProviders();
console.log('Provider health:', results);
```

---

## Technical Details

### Dependencies Added
- `@pythnetwork/client`: Pyth Network SDK for price feeds
- All existing dependencies retained

### State Management
- **localStorage**: User settings persistence
- **React State**: Component-level state management
- **Solana Blockchain**: Optional on-chain settings storage

### Security Considerations
- **Wallet Connection Required**: Admin features require wallet connection
- **Transaction Validation**: All blockchain transactions validated before execution
- **Private Key Safety**: Never exposes or logs private keys
- **RPC Rotation**: Reduces single point of failure

### Performance Optimizations
- **Lazy Loading**: Components load only when needed
- **Batch Queries**: Multiple API calls batched where possible
- **Caching**: Settings cached in localStorage
- **Connection Pooling**: Reuses Solana connections

---

## Future Enhancements

### Potential Additions
1. **Multi-Wallet Support**: Manage multiple wallets from admin panel
2. **Advanced Notifications**: Push notifications for opportunities
3. **Historical Analytics**: Track bot performance over time
4. **Custom Strategies**: User-defined trading strategies
5. **API Key Management**: Secure storage of API keys
6. **WebSocket Integration**: Real-time price updates
7. **Advanced Filtering**: Filter opportunities by criteria

### Community Contributions
We welcome contributions! Areas for improvement:
- Additional DEX integrations
- More token price feeds
- UI/UX enhancements
- Performance optimizations
- Documentation improvements

---

## Support

For issues, questions, or feature requests:
1. Open an issue on GitHub
2. Check existing documentation
3. Review code comments
4. Test on devnet first

---

## License
MIT License - see LICENSE file for details

---

**Built with ❤️ by GXQ STUDIO**
