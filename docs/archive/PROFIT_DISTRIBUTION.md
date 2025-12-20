# Profit Distribution System

## Overview

The GXQ STUDIO platform now includes an advanced profit distribution system that automatically splits arbitrage profits among three parties:
- **70%** to Reserve Wallet (via SNS domain `monads.skr`)
- **20%** to User Wallet (to cover gas fees and operational costs)
- **10%** to DAO Community Wallet (for community incentives and airdrops)

## Features

### 1. Automated Three-Way Profit Split
Every successful arbitrage trade automatically triggers profit distribution:
```
Total Profit: 1.0 SOL
├─ Reserve Wallet (70%): 0.7 SOL
├─ User Wallet (20%): 0.2 SOL
└─ DAO Wallet (10%): 0.1 SOL
```

### 2. SNS Domain Resolution
The reserve wallet uses Solana Name Service (SNS) domains for easy configuration:
- Domain: `monads.skr`
- Automatically resolves to the correct wallet address
- Cached for performance (1 hour TTL)
- Supports `.sol` and `.skr` TLD

### 3. Transaction Security
- **Retry Logic**: Exponential backoff for failed transactions (3 attempts)
- **Atomic Transactions**: All distributions in a single transaction
- **Error Handling**: Comprehensive error handling with detailed logging
- **Validation**: Pre-flight checks for balance and account validity

### 4. Analytics & Tracking
Real-time monitoring of all trading activity:
- Total profits distributed
- Distribution count and averages
- Daily/weekly/monthly statistics
- Most profitable token pairs
- Success rate tracking

### 5. Community Airdrops
DAO profits automatically fund community airdrops:
- Tier-based distribution (Platinum, Gold, Silver, Bronze)
- Wallet scoring integration
- Automated scheduling (daily/weekly/monthly)
- Batch processing for efficiency

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Profit Distribution Configuration
PROFIT_DISTRIBUTION_ENABLED=true
RESERVE_WALLET_DOMAIN=monads.skr  # SNS domain
RESERVE_WALLET_PERCENTAGE=0.70    # 70%
USER_WALLET_PERCENTAGE=0.20       # 20%
DAO_WALLET_PERCENTAGE=0.10        # 10%
DAO_WALLET_ADDRESS=DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW
```

### Customization

You can adjust the distribution percentages, but they must sum to 1.0 (100%):

```typescript
// Example: 60% reserve, 30% user, 10% DAO
RESERVE_WALLET_PERCENTAGE=0.60
USER_WALLET_PERCENTAGE=0.30
DAO_WALLET_PERCENTAGE=0.10
```

## Usage

### CLI Commands

#### View Analytics
```bash
npm start analytics
```

Output:
```
📊 Analytics Dashboard:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Trades: 42
Total Profit: 15.2500 SOL
Total Gas Fees: 0.0210 SOL
Net Profit: 15.2290 SOL
Avg Profit/Trade: 0.3631 SOL
Success Rate: 97.6%

Profit by Type:
  Flash Loan: 10.5000 SOL
  Triangular: 4.7500 SOL
  Hybrid: 0.0000 SOL

Profit Distribution:
  Reserve (70%): 10.6750 SOL
  User (20%): 3.0500 SOL
  DAO (10%): 1.5250 SOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Run Arbitrage with Profit Distribution
```bash
npm start start  # Auto-execution mode
```

The system will automatically:
1. Find arbitrage opportunities
2. Execute profitable trades
3. Distribute profits to all three wallets
4. Log the distribution results
5. Update analytics

### Programmatic Usage

```typescript
import { ProfitDistributionService } from './services/profitDistribution';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

// Initialize service
const connection = new Connection('https://api.mainnet-beta.solana.com');
const profitDistribution = new ProfitDistributionService(connection, {
  reserveWalletDomain: 'monads.skr',
  userWalletPercentage: 0.20,
  reserveWalletPercentage: 0.70,
  daoWalletPercentage: 0.10,
  daoWalletAddress: new PublicKey('DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW'),
});

// Distribute profits
const result = await profitDistribution.distributeProfits(
  1_000_000_000, // 1 SOL in lamports
  userWallet.publicKey,
  userWallet
);

if (result.success) {
  console.log('Distribution successful!');
  console.log(`Reserve: ${result.reserveAmount / 1e9} SOL`);
  console.log(`User: ${result.userAmount / 1e9} SOL`);
  console.log(`DAO: ${result.daoAmount / 1e9} SOL`);
}
```

## SNS Domain Resolution

### Supported Domains
- `.sol` domains (e.g., `wallet.sol`)
- `.skr` domains (e.g., `monads.skr`)

### Manual Mapping (Testing)
For testing or custom setups, you can manually register domain mappings:

```typescript
import { SNSDomainResolver } from './services/snsResolver';

const resolver = new SNSDomainResolver(connection);

// Register a test domain
const testWallet = new PublicKey('YOUR_WALLET_ADDRESS');
resolver.registerManualMapping('test.skr', testWallet);

// Resolve
const address = await resolver.resolve('test.skr');
```

### Cache Management
```typescript
// Get cache statistics
const stats = resolver.getCacheStats();
console.log(`Cached domains: ${stats.size}`);
console.log(`Domains: ${stats.domains.join(', ')}`);

// Clear cache
resolver.clearCache();
```

## Community Airdrops

The DAO wallet accumulates 10% of all profits, which can be distributed to the community.

### Example Distribution
```typescript
import { CommunityAirdropService } from './services/communityAirdrops';

const airdropService = new CommunityAirdropService(connection, {
  daoWalletAddress: new PublicKey('DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW'),
  distributionPercentage: 0.10, // 10% of DAO balance
});

// Get eligible recipients (based on wallet scoring)
const recipients = await airdropService.getEligibleRecipients(walletAddresses, 50);

// Distribute
const result = await airdropService.distributeToCommunity(
  daoBalance,
  recipients,
  daoWallet
);
```

### Tier System
- **Platinum** (90-100 score): 4x weight
- **Gold** (75-89 score): 3x weight
- **Silver** (60-74 score): 2x weight
- **Bronze** (50-59 score): 1x weight

## Security Best Practices

### 1. Private Key Management
- Never commit private keys to version control
- Use environment variables for all sensitive data
- Consider hardware wallets for production

### 2. Transaction Validation
- Always verify transaction signatures
- Check balances before distribution
- Monitor for failed transactions

### 3. Gas Optimization
- Dynamic priority fees based on network conditions
- Batch transactions when possible
- Monitor gas expenditure

### 4. Error Handling
```typescript
const result = await profitDistribution.distributeProfits(...);

if (!result.success) {
  console.error('Distribution failed:', result.error);
  // Implement retry logic or alert
}
```

## Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- Configuration validation
- Profit calculation accuracy
- SNS domain resolution
- Error handling
- Statistics tracking

## Troubleshooting

### Issue: SNS domain not resolving
**Solution**: Register a manual mapping for testing:
```typescript
resolver.registerManualMapping('monads.skr', actualWalletAddress);
```

### Issue: Distribution transaction fails
**Solution**: Check:
1. Sufficient balance in source wallet
2. Valid recipient addresses
3. Network connectivity
4. RPC rate limits

### Issue: Percentages don't sum to 1.0
**Solution**: Ensure all three percentages add up to exactly 1.0:
```bash
0.70 + 0.20 + 0.10 = 1.00 ✓
```

## Performance Metrics

### Transaction Times
- SNS Resolution: ~100-500ms (cached: <10ms)
- SOL Distribution: ~1-2 seconds
- Token Distribution: ~2-3 seconds

### Gas Costs
- SOL Distribution: ~5,000 lamports (0.000005 SOL)
- Token Distribution: ~10,000 lamports per recipient

## Future Enhancements

1. **Multi-Token Support**: Distribute profits in multiple tokens
2. **Vesting Schedules**: Time-locked distributions
3. **Governance Integration**: DAO voting on distribution percentages
4. **Advanced Analytics**: ML-powered profit predictions
5. **Cross-Chain**: Support for other blockchain networks

## Support

For issues or questions:
- GitHub Issues: [SMSDAO/reimagined-jupiter](https://github.com/SMSDAO/reimagined-jupiter/issues)
- Documentation: See README.md and other docs in the repository

## License

MIT License - see LICENSE file for details.
