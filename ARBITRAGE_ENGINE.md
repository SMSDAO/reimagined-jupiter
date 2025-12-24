# Comprehensive Mainnet Arbitrage Engine

This document provides a complete guide to the advanced Solana mainnet arbitrage engine implementation.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Flash Loan Providers](#flash-loan-providers)
4. [Multi-hop Arbitrage](#multi-hop-arbitrage)
5. [MEV Protection](#mev-protection)
6. [GXQ Wallet System](#gxq-wallet-system)
7. [Profit Distribution](#profit-distribution)
8. [Configuration](#configuration)
9. [Usage Examples](#usage-examples)
10. [Security Considerations](#security-considerations)

## Overview

The arbitrage engine provides a comprehensive solution for executing profitable arbitrage opportunities on Solana mainnet with:

- **8 Flash Loan Providers**: Marginfi, Solend, Kamino, Mango, Port Finance, Save Finance, Tulip, Drift, and Jet Protocol
- **Multi-hop Routes**: Support for 3-7 leg arbitrage paths
- **MEV Protection**: Atomic bundle execution via Jito
- **GXQ Wallet Constraint**: Optional requirement for wallets ending in 'GXQ'
- **Automatic Profit Distribution**: 70% reserve, 20% gas coverage, 10% DAO

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│            MainnetArbitrageOrchestrator                     │
│  Coordinates all arbitrage execution components             │
└─────────────────────────────────────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
      ▼                   ▼                   ▼
┌──────────┐    ┌──────────────────┐   ┌──────────────┐
│ Flash    │    │ Jupiter Enhanced │   │ Transaction  │
│ Loan     │    │ (Multi-hop)      │   │ Executor     │
│ Providers│    └──────────────────┘   │ (with Jito)  │
└──────────┘              │              └──────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
      ┌──────────────┐    ┌──────────────────┐
      │ Direct DEX   │    │ Profit           │
      │ Fallback     │    │ Distribution     │
      └──────────────┘    └──────────────────┘
```

### Key Files

- `src/providers/flashLoan.ts` - Flash loan provider implementations
- `src/integrations/jito.ts` - Jito MEV protection
- `src/integrations/jupiterEnhanced.ts` - Multi-hop routing
- `src/services/arbitrageOrchestrator.ts` - Main orchestration logic
- `src/services/walletGenerator.ts` - GXQ wallet generation
- `src/utils/profitDistribution.ts` - Profit distribution logic
- `src/utils/transactionExecutor.ts` - Transaction execution with priority fees

## Flash Loan Providers

### Supported Providers

All providers implement atomic `Borrow → Execute → Repay` sequences:

| Provider | Fee | Max Loan Estimate | Program ID Env Var |
|----------|-----|-------------------|-------------------|
| Marginfi | 0.09% | 1,000,000 | `MARGINFI_PROGRAM_ID` |
| Solend | 0.10% | 800,000 | `SOLEND_PROGRAM_ID` |
| Mango | 0.15% | 1,200,000 | `MANGO_PROGRAM_ID` |
| Kamino | 0.12% | 900,000 | `KAMINO_PROGRAM_ID` |
| Port Finance | 0.20% | 700,000 | `PORT_FINANCE_PROGRAM_ID` |
| Save Finance | 0.11% | 850,000 | `SAVE_FINANCE_PROGRAM_ID` |
| Tulip | 0.13% | 950,000 | `TULIP_PROGRAM_ID` |
| Drift | 0.14% | 1,100,000 | `DRIFT_PROGRAM_ID` |
| Jet Protocol | 0.16% | 750,000 | `JET_PROGRAM_ID` |

### Implementation Details

Each provider implements:

```typescript
interface BaseFlashLoanProvider {
  getName(): string;
  getMaxLoanAmount(tokenMint: PublicKey): Promise<number>;
  getAvailableLiquidity(tokenMint: PublicKey): Promise<number>;
  createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]>;
}
```

The `createFlashLoanInstruction` method returns an array of instructions that:
1. **Borrow** - Flash borrow from the protocol
2. **Execute** - User's arbitrage swap instructions
3. **Repay** - Repay loan + fee atomically

All instructions use `Buffer` for data encoding and are fully atomic - the transaction either succeeds entirely or fails entirely.

## Multi-hop Arbitrage

### Route Configuration

Configure multi-hop routes via environment variables:

```bash
# Minimum route legs (default: 3)
JUPITER_MIN_LEGS=3

# Maximum route legs (default: 7)
JUPITER_MAX_LEGS=7

# API timeout before fallback (ms, default: 5000)
JUPITER_API_TIMEOUT=5000

# Enable direct DEX fallback (default: true)
JUPITER_ENABLE_FALLBACK=true

# Number of route variations to explore (default: 5)
JUPITER_ROUTE_DEPTH=5
```

### Route Examples

**3-leg route (A → B → C → A)**:
```
SOL → USDC → RAY → SOL
```

**5-leg route (A → B → C → D → E → A)**:
```
SOL → USDC → BONK → RAY → JUP → SOL
```

**7-leg route (maximum)**:
```
SOL → USDC → USDT → BONK → WIF → RAY → JUP → SOL
```

### Fallback Mechanism

If Jupiter API fails or is too slow:
1. Timeout detection triggers after `JUPITER_API_TIMEOUT`
2. Falls back to direct DEX pool queries
3. Routes directly through Raydium, Orca, or other DEXs
4. Calculates estimates using pool reserves

## MEV Protection

### Jito Integration

The engine uses Jito Block Engine for MEV-protected execution:

```bash
# Enable Jito (default: true)
JITO_ENABLED=true

# Minimum tip (default: 10000 lamports = 0.00001 SOL)
JITO_MIN_TIP_LAMPORTS=10000

# Maximum tip (default: 1000000 lamports = 0.001 SOL)
JITO_MAX_TIP_LAMPORTS=1000000

# Tip as % of profit (default: 0.05 = 5%)
JITO_TIP_PERCENTAGE=0.05
```

### How It Works

1. **Bundle Creation**: Multiple transactions grouped into atomic bundle
2. **Tip Calculation**: Tip = `profit * JITO_TIP_PERCENTAGE`, clamped to [min, max]
3. **Bundle Submission**: Sent to Jito Block Engine endpoints
4. **Front-running Protection**: Atomic execution ensures no sandwich attacks
5. **Status Tracking**: Poll for bundle landing confirmation

### Jito Endpoints

The integration automatically rotates between official endpoints:
- `https://mainnet.block-engine.jito.wtf`
- `https://amsterdam.mainnet.block-engine.jito.wtf`
- `https://frankfurt.mainnet.block-engine.jito.wtf`
- `https://ny.mainnet.block-engine.jito.wtf`
- `https://tokyo.mainnet.block-engine.jito.wtf`

## GXQ Wallet System

### Purpose

Wallets ending in 'GXQ' serve as a branding and identification mechanism for arbitrage transactions.

### Wallet Generation

```typescript
import { generateGXQWallet } from './services/walletGenerator';

const wallet = await generateGXQWallet({
  suffix: 'GXQ',
  caseSensitive: false,
  maxAttempts: 1000000,
  onProgress: (attempts) => {
    console.log(`Attempts: ${attempts}`);
  },
});

console.log('Generated wallet:', wallet.publicKey);
```

### Validation

```typescript
import { validateGXQWallet } from './services/walletGenerator';

const isValid = validateGXQWallet('Your1PublicKey2Here3GXQ');
console.log('Is valid GXQ wallet:', isValid);
```

### Configuration

```bash
# Require GXQ wallet for arbitrage (default: false)
REQUIRE_GXQ_WALLET=false
```

When enabled, the orchestrator will:
1. Check if user wallet ends with 'GXQ'
2. Generate a GXQ wallet if needed
3. Use the GXQ wallet for arbitrage execution

**Note**: In production, you would need to implement fund transfer to the generated wallet before execution.

## Profit Distribution

### Distribution Model

Profits are automatically distributed according to:

| Recipient | Percentage | Purpose |
|-----------|------------|---------|
| Reserve Wallet (`monads.skr`) | 70% | Long-term protocol reserves |
| User Wallet | 20% | Gas fee and slippage coverage |
| DAO Wallet | 10% | Protocol development fund |

### Configuration

```bash
# Enable profit distribution (default: true)
PROFIT_DISTRIBUTION_ENABLED=true

# Reserve wallet domain (SNS or PublicKey)
RESERVE_WALLET_DOMAIN=monads.skr

# Distribution percentages
RESERVE_WALLET_PERCENTAGE=0.70  # 70%
USER_WALLET_PERCENTAGE=0.20     # 20%
DAO_WALLET_PERCENTAGE=0.10      # 10%

# DAO wallet address
DAO_WALLET_ADDRESS=DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW
```

### SNS Resolution

The system supports Solana Name Service (SNS) resolution for the reserve wallet.

**To enable SNS resolution:**

1. Install the package:
```bash
npm install @bonfida/spl-name-service
```

2. Follow the implementation guide in `src/utils/profitDistribution.ts`

3. The system will automatically resolve `monads.skr` to its PublicKey

## Configuration

### Environment Variables

Complete list of configuration options:

#### Core Settings
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_base58_private_key_here
```

#### Arbitrage Settings
```bash
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
GAS_BUFFER=1.5
```

#### Jito MEV Protection
```bash
JITO_ENABLED=true
JITO_MIN_TIP_LAMPORTS=10000
JITO_MAX_TIP_LAMPORTS=1000000
JITO_TIP_PERCENTAGE=0.05
```

#### Jupiter Multi-hop
```bash
JUPITER_MIN_LEGS=3
JUPITER_MAX_LEGS=7
JUPITER_API_TIMEOUT=5000
JUPITER_ENABLE_FALLBACK=true
JUPITER_ROUTE_DEPTH=5
```

#### Priority Fees
```bash
PRIORITY_FEE_URGENCY=high
MAX_PRIORITY_FEE_LAMPORTS=10000000
COMPUTE_UNIT_LIMIT=400000
```

#### Profit Distribution
```bash
PROFIT_DISTRIBUTION_ENABLED=true
RESERVE_WALLET_DOMAIN=monads.skr
RESERVE_WALLET_PERCENTAGE=0.70
USER_WALLET_PERCENTAGE=0.20
DAO_WALLET_PERCENTAGE=0.10
DAO_WALLET_ADDRESS=DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW
```

## Usage Examples

### Basic Arbitrage Scan

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { MainnetArbitrageOrchestrator } from './services/arbitrageOrchestrator';

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const orchestrator = new MainnetArbitrageOrchestrator(connection);

// Scan for opportunities
const tokens = [
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
];

const opportunities = await orchestrator.scanForOpportunities(tokens, 100_000_000); // 0.1 SOL

console.log(`Found ${opportunities.length} opportunities`);
```

### Execute Arbitrage

```typescript
// Execute the best opportunity
if (opportunities.length > 0) {
  const userKeypair = Keypair.fromSecretKey(/* your secret key */);
  
  const result = await orchestrator.executeOpportunity(
    opportunities[0],
    userKeypair
  );

  if (result.success) {
    console.log('Arbitrage executed successfully!');
    console.log('Signature:', result.signature);
    
    if (result.profitDistributed) {
      console.log('Profits distributed:', result.profitDistributionSignature);
    }
  } else {
    console.error('Execution failed:', result.error);
  }
}
```

### Custom Configuration

```typescript
const orchestrator = new MainnetArbitrageOrchestrator(connection, {
  minProfitThreshold: 0.005 * 1e9, // 0.005 SOL minimum
  maxSlippage: 0.02, // 2% max slippage
  priorityFeeUrgency: 'critical', // Highest priority
  useJito: true, // Enable MEV protection
  requireGXQWallet: false, // Don't require GXQ wallet
  routeLegs: { min: 3, max: 5 }, // 3-5 leg routes only
});
```

## Security Considerations

### Private Key Security

- **Never commit** private keys to version control
- Use environment variables for all sensitive data
- Rotate keys regularly
- Use hardware wallets for large amounts
- Keep arbitrage wallet separate from main funds

### Transaction Safety

- All flash loan transactions are **atomic** - they either succeed completely or fail completely
- Pre-flight simulation detects issues before sending
- Slippage protection prevents excessive losses
- MEV protection via Jito prevents front-running
- Priority fees ensure transaction inclusion

### Smart Contract Risk

- Flash loan protocols are audited but carry inherent risk
- Test thoroughly on devnet/testnet before mainnet
- Start with small amounts
- Monitor transactions closely
- Set conservative profit thresholds

### RPC Reliability

- Use premium RPC providers (Helius, QuickNode, Triton)
- Implement retry logic with exponential backoff
- Have fallback RPC endpoints
- Monitor rate limits
- Track RPC latency

### Profit Guarantees

- Estimated profits are **not guaranteed**
- Market conditions change rapidly
- Slippage can reduce actual profits
- Gas fees impact net profitability
- Competition affects execution success

### Operational Security

- Monitor wallet balances continuously
- Set up alerts for failed transactions
- Track profitability metrics
- Review logs regularly
- Keep software updated

## Troubleshooting

### Common Issues

**Issue**: Flash loan transactions failing
- **Solution**: Check liquidity availability, reduce loan amount, try different provider

**Issue**: Jupiter API timeouts
- **Solution**: Increase `JUPITER_API_TIMEOUT`, enable fallback, reduce route complexity

**Issue**: Jito bundles not landing
- **Solution**: Increase tip amount, rotate block engine endpoint, check bundle status

**Issue**: Insufficient balance errors
- **Solution**: Ensure wallet has enough SOL for gas fees and flash loan repayment

**Issue**: GXQ wallet generation taking too long
- **Solution**: This is expected - vanity addresses require many attempts. Be patient or reduce max attempts.

### Debug Logging

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug npm start
```

### Support

For issues and questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: Check repository README and code comments

---

**Last Updated**: 2025-12-24
**Version**: 1.0.0
