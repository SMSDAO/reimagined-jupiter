# Profit Distribution System Guide

## Overview

The GXQ STUDIO platform now includes a comprehensive profit distribution system that automatically allocates profits from successful arbitrage trades according to a transparent 70/20/10 model.

## Distribution Model

### Allocation Breakdown

| Recipient | Percentage | Purpose |
|-----------|-----------|---------|
| **Reserve Wallet** | 70% | Long-term treasury and development fund |
| **Gas Wallet** | 20% | Transaction cost coverage for continuous operation |
| **DAO Community** | 10% | Community airdrops and ecosystem development |

## Configuration

### Environment Variables

```bash
# Enable profit distribution (default: true)
PROFIT_DISTRIBUTION_ENABLED=true

# Reserve Wallet (70%)
# Use a valid Solana PublicKey address (base58 format)
RESERVE_WALLET=YourReserveWalletPublicKey

# Gas Wallet (20%)
# Typically the bot's operational wallet
GAS_WALLET=YourGasWalletPublicKey

# DAO Community Wallet (10%)
DAO_WALLET=DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW
```

### Important Notes

1. **PublicKey Format**: All wallet addresses must be valid Solana PublicKey addresses in base58 format
2. **SNS Support**: Solana Name Service (SNS) resolution is planned but not yet implemented
3. **Validation**: Wallets are validated before each distribution to prevent errors
4. **Backwards Compatibility**: The legacy `DEV_FEE` system remains available but is deprecated

## Features

### Automated Distribution
- Executes automatically after each profitable trade
- No manual intervention required
- Atomic transactions ensure all-or-nothing execution

### Comprehensive Logging
- Every distribution is logged to `logs/profit-allocations.jsonl`
- Includes timestamp, amounts, signatures, and success status
- Detailed analytics available via CLI

### Analytics Dashboard
```bash
# View profit distribution statistics
npm start profit-stats

# View comprehensive analytics report
npm start analytics

# View recent distributions in detail
npm start profit-stats
```

### Testing
```bash
# Test the distribution system with 1 SOL
npm start test-distribution

# Test with custom amount (in SOL)
npm start test-distribution 0.5
```

## Architecture

### Services

#### ProfitDistributionService
- **Location**: `src/services/profitDistribution.ts`
- **Purpose**: Handles the actual distribution of profits
- **Key Methods**:
  - `distributeProfit()` - Execute a distribution
  - `getStats()` - Get distribution statistics
  - `getHistory()` - Get distribution history
  - `validateWallets()` - Validate wallet addresses

#### AnalyticsLogger
- **Location**: `src/services/analyticsLogger.ts`
- **Purpose**: Tracks all transactions and distributions
- **Features**:
  - Transaction logging
  - Profit allocation logging
  - Arbitrage execution tracking
  - Report generation

#### DAOAirdropService
- **Location**: `src/services/daoAirdrop.ts`
- **Purpose**: Manages community airdrops funded by DAO treasury
- **Features**:
  - Campaign creation
  - Distribution based on wallet scores
  - Campaign tracking and statistics

### Integration

The profit distribution system is integrated into the `AutoExecutionEngine`:

```typescript
// After successful arbitrage execution
if (signature) {
  // Distribute profits automatically
  await this.handleProfitDistribution(opportunity.estimatedProfit);
  
  // Log the transaction
  this.analyticsLogger.logTransaction({...});
}
```

## Usage Examples

### Viewing Statistics

```bash
$ npm start profit-stats

💰 Profit Distribution Statistics

Total Distributions: 42
Successful: 40
Failed: 2

Total Distributed: $5,432.15
  Reserve (70%): $3,802.51
  Gas (20%): $1,086.43
  DAO (10%): $543.21

📜 Recent Distributions:
  ✅ 2025-12-16T21:30:00.000Z
     Total: $125.000000
     Signature: 5KqFz...abc123
```

### Testing Distribution

```bash
$ npm start test-distribution 0.1

🧪 Testing Profit Distribution with 0.1 SOL

⚠️  This is a test. It will perform an actual transaction.

💰 Profit Distribution Started
   Total Profit: 0.100000
   Reserve (70%): 0.070000 → AaBbCc...
   Gas Coverage (20%): 0.020000 → DdEeFf...
   DAO Community (10%): 0.010000 → DmtAdU...

✅ Distribution Complete! Signature: 5KqFz...abc123

✅ Test successful!
Signature: 5KqFz...abc123
```

### Viewing Analytics

```bash
$ npm start analytics

═══════════════════════════════════════════
           ANALYTICS REPORT
═══════════════════════════════════════════

📊 Transaction Statistics:
   Total Transactions: 156
   Successful: 142 (91.0%)
   Failed: 14
   Total Profit: $8,765.43
   Total Cost: $234.56
   Total Net Profit: $8,530.87
   By Type:
     arbitrage: 142
     distribution: 40

💰 Profit Distribution:
   Total Distributions: 40
   Successful: 38
   Failed: 2
   Total Distributed: $5,432.15
   Reserve Wallet (70%): $3,802.51
   Gas Coverage (20%): $1,086.43
   DAO Community (10%): $543.21

⚡ Arbitrage Executions:
   Total Executions: 142
   Successful: 128 (90.1%)
   Failed: 14
   Est. Profit: $9,123.45
   Actual Profit: $8,765.43
   Gas Cost: $234.56
   Net Profit: $8,530.87
   Avg Slippage: 3.92%
   By Strategy:
     flash-loan: 89
     triangular: 53

═══════════════════════════════════════════
```

## DAO Community Airdrops

### Overview
The 10% allocated to the DAO community wallet can be used to fund airdrops to community members based on wallet scores and participation.

### Managing Campaigns

```bash
# View DAO airdrop campaigns
npm start dao-airdrops

═══════════════════════════════════════════
         DAO AIRDROP REPORT
═══════════════════════════════════════════

📊 Overall Statistics:
   Total Campaigns: 5
   Completed: 4
   Failed: 0
   Pending: 1
   Total Distributed: 54.321000
   Total Recipients: 234

🎁 Recent Campaigns:
   [COMPLETED] Profit Share Airdrop - 12/15/2025
     Amount: 12.345678
     Recipients: 45
     Signature: 5KqFz...abc123
```

## Security Considerations

### Transaction Safety
- All distributions are atomic (all-or-nothing)
- Wallet validation occurs before distribution
- Failed distributions are logged and can be retried
- Signatures are stored for audit trail

### Encryption
The system includes encryption support for sensitive data:

```bash
# Generate encryption key
npm start generate-key

# Encrypt private key
npm start encrypt-key <your_private_key>
```

### Best Practices
1. **Use dedicated wallets**: Create separate wallets for reserve, gas, and DAO
2. **Secure private keys**: Use encryption for private key storage
3. **Monitor distributions**: Regularly check distribution logs
4. **Test first**: Always test on devnet before mainnet deployment
5. **Backup wallets**: Ensure all wallet private keys are securely backed up

## Troubleshooting

### Common Issues

#### Distribution Fails
```
❌ Profit distribution failed: Insufficient balance
```
**Solution**: Ensure the payer wallet has sufficient balance for:
- The distribution amounts
- Transaction fees (~0.005 SOL per distribution)

#### Invalid Wallet Address
```
❌ Wallet validation failed
```
**Solution**: Verify all wallet addresses in `.env` are valid base58 PublicKey addresses

#### SNS Not Working
```
⚠️ SNS resolution not yet implemented
```
**Solution**: Use PublicKey addresses instead of SNS names. SNS support is planned for future release.

## Logs and Audit Trail

### Log Files
All logs are stored in the `logs/` directory:
- `transactions.jsonl` - All transactions
- `profit-allocations.jsonl` - Profit distributions
- `arbitrage-executions.jsonl` - Arbitrage trades

### Log Format
Each log entry is a JSON line (JSONL format):
```json
{
  "timestamp": "2025-12-16T21:30:00.000Z",
  "totalProfit": 125.5,
  "reserveAmount": 87.85,
  "gasAmount": 25.1,
  "daoAmount": 12.55,
  "signature": "5KqFz...abc123",
  "success": true
}
```

### Reading Logs
```bash
# View recent profit allocations
tail -n 10 logs/profit-allocations.jsonl | jq

# Count successful distributions
grep '"success":true' logs/profit-allocations.jsonl | wc -l

# Sum total distributed
jq -s 'map(select(.success == true) | .totalProfit) | add' logs/profit-allocations.jsonl
```

## API Reference

### ProfitDistributionService

```typescript
class ProfitDistributionService {
  // Distribute profits
  async distributeProfit(
    totalProfit: number,
    tokenMint: PublicKey | undefined,
    payerKeypair: Keypair
  ): Promise<DistributionResult>

  // Get statistics
  getStats(): DistributionStats

  // Get history
  getHistory(limit?: number): DistributionResult[]

  // Validate wallets
  async validateWallets(): Promise<boolean>

  // Update configuration
  updateConfig(newConfig: Partial<ProfitDistributionConfig>): void
}
```

### AnalyticsLogger

```typescript
class AnalyticsLogger {
  // Log transaction
  logTransaction(log: TransactionLog): void

  // Log profit allocation
  logProfitAllocation(log: ProfitAllocationLog): void

  // Log arbitrage execution
  logArbitrageExecution(log: ArbitrageExecutionLog): void

  // Generate report
  generateReport(): string

  // Export to JSON
  exportToJSON(): string

  // Clear logs
  clearLogs(): void
}
```

## Future Enhancements

- [ ] Solana Name Service (SNS) resolution
- [ ] Multi-signature support for reserve wallet
- [ ] Scheduled distributions (batch processing)
- [ ] Web dashboard for analytics
- [ ] On-chain profit distribution tracking
- [ ] Governance voting for distribution percentages
- [ ] Automatic DAO airdrop scheduling
- [ ] Integration with governance tokens

## Support

For questions or issues:
1. Check the troubleshooting section
2. Review the logs for error details
3. Open an issue on GitHub
4. Contact the development team

---

**Built with ❤️ by GXQ STUDIO**
