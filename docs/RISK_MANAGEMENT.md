# Risk Management & Trading Guardrails

## Overview

GXQ Studio implements multiple layers of risk management to protect user funds and ensure safe trading operations. This document outlines all risk controls, safety mechanisms, and best practices for production deployment.

## Trading Risk Controls

### 1. Priority Fee Cap

**Maximum**: 10,000,000 lamports (0.01 SOL)

```typescript
// Enforced in productionGuardrails.ts
export function validatePriorityFee(feeLamports: number): number {
  const MAX_PRIORITY_FEE = 10_000_000; // 10M lamports
  
  if (feeLamports > MAX_PRIORITY_FEE) {
    console.warn(`⚠️  Priority fee capped at ${MAX_PRIORITY_FEE} lamports`);
    return MAX_PRIORITY_FEE;
  }
  
  return feeLamports;
}
```

**Purpose**: Prevents excessive gas costs that could erode profits

**Impact**: 
- Protects against misconfigured transactions
- Ensures profitable trades after fees
- Typical priority fee: 1-5M lamports

### 2. Slippage Limits

**Default**: 1% (0.01)  
**Range**: 0.1% - 10% (0.001 - 0.10)  
**Recommended Production**: 0.5% - 2%

```typescript
export function validateSlippage(slippage: number): void {
  if (slippage < 0 || slippage > 1) {
    throw new Error(`Invalid slippage: ${slippage}. Must be between 0 and 1`);
  }
  
  if (slippage > 0.1) {
    console.warn(`⚠️  High slippage tolerance: ${(slippage * 100).toFixed(1)}%`);
  }
}
```

**Configuration**:
- Stable pairs: 0.5% - 1%
- Volatile pairs: 1% - 3%
- Memecoins: 2% - 5%
- Emergency mode: Up to 10%

**Risks**:
- Too low: Trades fail frequently
- Too high: Poor execution prices, sandwich attacks

### 3. Minimum Profit Threshold

**Default**: 0.01 SOL  
**Recommended Range**: 0.005 - 0.05 SOL

```typescript
export function validateMinProfit(profitSol: number): void {
  if (profitSol < 0) {
    throw new Error(`Invalid minimum profit: ${profitSol}. Must be positive`);
  }
  
  if (profitSol < 0.001) {
    console.warn('⚠️  Very low profit threshold - trades may be unprofitable after fees');
  }
}
```

**Considerations**:
- Gas costs: ~0.001-0.005 SOL per transaction
- Flash loan fees: 0.09%-0.20%
- Network congestion: Variable gas costs
- Dev fee: 10% of profits (if enabled)

**Formula**:
```
Net Profit = Gross Profit - Gas Cost - Flash Loan Fee - Dev Fee

Minimum Profitable Trade:
Gross Profit > (Gas Cost + Flash Loan Fee) / (1 - Dev Fee %)
```

**Example** (0.09% flash loan fee, 0.005 SOL gas, 10% dev fee):
```
Gross Profit > (0.005 + (Amount * 0.0009)) / 0.90

For 1 SOL trade:
Gross Profit > (0.005 + 0.0009) / 0.90 = 0.0065 SOL

Recommended Minimum: 0.01 SOL (50% safety margin)
```

### 4. Risk Assessment System

Automated risk scoring for every trade:

```typescript
export interface RiskAssessment {
  safe: boolean;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
}

export function assessTradeRisk(params: {
  profitSol: number;
  slippage: number;
  priorityFeeLamports: number;
  tradeAmountSol: number;
}): RiskAssessment {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check profit vs fees
  const priorityFeeSol = params.priorityFeeLamports / 1e9;
  if (params.profitSol < priorityFeeSol * 2) {
    reasons.push('Profit is less than 2x priority fee');
    riskScore += 2;
  }

  // Check slippage
  if (params.slippage > 0.03) {
    reasons.push(`High slippage: ${(params.slippage * 100).toFixed(1)}%`);
    riskScore += 1;
  }

  // Check trade size
  if (params.tradeAmountSol > 100) {
    reasons.push('Very large trade size (>100 SOL)');
    riskScore += 2;
  }

  // Check profit margin
  const profitMargin = params.profitSol / params.tradeAmountSol;
  if (profitMargin < 0.003) {
    reasons.push('Low profit margin (<0.3%)');
    riskScore += 1;
  }

  // Determine risk level
  let risk: RiskAssessment['risk'];
  if (riskScore === 0) {
    risk = 'LOW';
  } else if (riskScore <= 2) {
    risk = 'MEDIUM';
  } else if (riskScore <= 4) {
    risk = 'HIGH';
  } else {
    risk = 'CRITICAL';
  }

  return {
    safe: riskScore <= 2,
    risk,
    reasons,
  };
}
```

**Risk Levels**:

| Level | Score | Action | Description |
|-------|-------|--------|-------------|
| LOW | 0 | ✅ Execute | Safe to proceed |
| MEDIUM | 1-2 | ⚠️ Review | Acceptable with monitoring |
| HIGH | 3-4 | 🔶 Caution | Manual approval recommended |
| CRITICAL | 5+ | 🛑 Block | Do not execute |

### 5. Position Size Limits

**Recommended Limits**:

| Strategy | Max Position | Risk Level |
|----------|--------------|------------|
| Stablecoin Arbitrage | 50 SOL | Low |
| SOL Triangular | 10 SOL | Medium |
| Flash Loan Arbitrage | 100 SOL | Medium |
| Memecoin Flash | 5 SOL | High |
| Sniper Bot | 2 SOL | High |

**Implementation**:
```typescript
interface StrategyLimits {
  maxPositionSol: number;
  maxSlippage: number;
  minProfitSol: number;
}

const strategyLimits: Record<string, StrategyLimits> = {
  'STABLECOIN_ARBITRAGE': {
    maxPositionSol: 50,
    maxSlippage: 0.005,
    minProfitSol: 0.005,
  },
  'SOL_TRIANGULAR': {
    maxPositionSol: 10,
    maxSlippage: 0.01,
    minProfitSol: 0.01,
  },
  'FLASH_LOAN_ARBITRAGE': {
    maxPositionSol: 100,
    maxSlippage: 0.01,
    minProfitSol: 0.05,
  },
  'MEMECOIN_FLASH': {
    maxPositionSol: 5,
    maxSlippage: 0.03,
    minProfitSol: 0.01,
  },
  'SNIPER_BOT': {
    maxPositionSol: 2,
    maxSlippage: 0.05,
    minProfitSol: 0.005,
  },
};
```

## Wallet Security

### 1. Dedicated Trading Wallet

**Best Practice**: Use separate wallet for trading

**Why**:
- Limits exposure to hacks
- Simplifies accounting
- Easier to manage permissions
- Contains blast radius if compromised

**Recommended Setup**:
```
Main Wallet (Cold Storage)
    └─> Trading Wallet (Hot, Automated)
        ├─> Max Balance: 10-50 SOL
        ├─> Auto-withdraw profits: Daily
        └─> Alert on balance < 1 SOL
```

### 2. Balance Monitoring

```typescript
async function checkWalletBalance(connection: Connection, wallet: PublicKey) {
  const balance = await connection.getBalance(wallet);
  const balanceSol = balance / 1e9;
  
  // Alert thresholds
  if (balanceSol < 0.5) {
    console.error('🚨 CRITICAL: Wallet balance below 0.5 SOL');
    // Send alert
  } else if (balanceSol < 2) {
    console.warn('⚠️  WARNING: Wallet balance below 2 SOL');
  }
  
  // Auto-pause if insufficient
  if (balanceSol < 0.1) {
    console.error('🛑 Insufficient balance - pausing all bots');
    // Pause all automated trading
  }
  
  return balanceSol;
}
```

### 3. Withdrawal Limits

**Daily Limits**:
- Manual withdrawals: Unlimited (with 2FA)
- Auto-profit withdrawal: 80% of profits
- Emergency withdrawal: Requires admin approval

**Implementation**:
```typescript
interface WithdrawalLimit {
  dailyLimitSol: number;
  withdrawnTodaySol: number;
  requiresApproval: boolean;
}

function checkWithdrawalLimit(amountSol: number, userId: string): boolean {
  const limit = getUserDailyLimit(userId);
  
  if (limit.withdrawnTodaySol + amountSol > limit.dailyLimitSol) {
    if (limit.requiresApproval) {
      // Request admin approval
      return false;
    }
    throw new Error('Daily withdrawal limit exceeded');
  }
  
  return true;
}
```

## Bot Isolation & Sandboxing

### 1. Per-User Sandboxes

Each bot runs in isolated environment:

```typescript
class BotSandbox {
  constructor(
    public userId: string,
    public botId: string,
    public walletAddress: string,
    public permissions: string[]
  ) {}
  
  // Isolated state storage
  private state: Map<string, any> = new Map();
  
  // Rate limit tracking
  private executions: number[] = [];
  
  // Permission checking
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }
  
  // Rate limit enforcement
  checkRateLimit(maxPerMinute: number): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old executions
    this.executions = this.executions.filter(t => t > oneMinuteAgo);
    
    return this.executions.length < maxPerMinute;
  }
}
```

**Benefits**:
- User A's bot cannot affect User B's bot
- Separate rate limits per user
- Isolated state prevents data leakage
- Granular permission control

### 2. Replay Protection

4-layer protection against duplicate executions:

**Layer 1: Unique Nonces**
```typescript
generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

**Layer 2: Transaction Hash**
```typescript
computeTransactionHash(tx: Transaction): string {
  return crypto.createHash('sha256')
    .update(tx.serialize())
    .digest('hex');
}
```

**Layer 3: Timestamp Validation**
```typescript
isTimestampValid(timestamp: Date): boolean {
  const now = Date.now();
  const txTime = timestamp.getTime();
  const window = 10 * 60 * 1000; // 10 minutes
  
  return Math.abs(now - txTime) < window;
}
```

**Layer 4: Rate Limiting**
```typescript
checkRateLimit(userId: string, maxPerMinute: number): RateLimitResult {
  // Track executions per user
  // Block if exceeded
}
```

## Flash Loan Safety

### 1. Provider Selection

Risk assessment per provider:

| Provider | Fee | Liquidity | Risk | Use Case |
|----------|-----|-----------|------|----------|
| Marginfi | 0.09% | High | Low | General arbitrage |
| Solend | 0.10% | Very High | Low | Large trades |
| Kamino | 0.12% | High | Low | Stable trades |
| Mango | 0.15% | Medium | Medium | Leverage |
| Port Finance | 0.20% | Medium | Medium | Niche opportunities |

**Selection Algorithm**:
```typescript
function selectBestProvider(
  amount: number,
  requiredLiquidity: number
): FlashLoanProvider {
  const providers = [
    { name: 'MARGINFI', fee: 0.0009, liquidity: 10000 },
    { name: 'SOLEND', fee: 0.0010, liquidity: 50000 },
    { name: 'KAMINO', fee: 0.0012, liquidity: 8000 },
    { name: 'MANGO', fee: 0.0015, liquidity: 5000 },
    { name: 'PORT', fee: 0.0020, liquidity: 3000 },
  ];
  
  // Filter by liquidity
  const eligible = providers.filter(p => p.liquidity >= requiredLiquidity);
  
  if (eligible.length === 0) {
    throw new Error('Insufficient liquidity available');
  }
  
  // Sort by fee (lowest first)
  eligible.sort((a, b) => a.fee - b.fee);
  
  return eligible[0];
}
```

### 2. Atomic Execution

All flash loan operations are atomic:

```
1. Borrow funds
2. Execute arbitrage
3. Repay loan + fee
4. Keep profit
```

If any step fails, entire transaction reverts (no loss).

### 3. Profitability Check

Before executing flash loan:

```typescript
function isFlashLoanProfitable(
  arbProfit: number,
  loanAmount: number,
  provider: FlashLoanProvider
): boolean {
  const flashLoanFee = loanAmount * provider.feeRate;
  const gasCost = 0.005; // Estimated
  const devFee = (arbProfit - flashLoanFee - gasCost) * 0.10;
  
  const netProfit = arbProfit - flashLoanFee - gasCost - devFee;
  
  return netProfit > 0.01; // Minimum threshold
}
```

## MEV Protection

### 1. Jito Bundles

Protection against front-running:

```typescript
async function submitViaJito(
  transaction: Transaction,
  priorityTip: number = 10000 // lamports
): Promise<string> {
  const bundle = {
    transactions: [transaction],
    priorityTip,
  };
  
  // Submit to Jito block engine
  const response = await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  });
  
  return response.json();
}
```

**Benefits**:
- Transactions bundled together
- Cannot be front-run
- Fair execution order
- MEV rewards shared

### 2. Private RPC

Use private mempool to hide transactions:

```typescript
const privateRpcUrls = [
  'https://private-rpc.jito.wtf',
  'https://private.helius-rpc.com',
];
```

## Monitoring & Alerts

### 1. Health Metrics

Monitor continuously:

```typescript
interface SystemHealth {
  walletBalance: number;
  rpcLatency: number;
  successRate: number;
  profitLast24h: number;
  failedTxCount: number;
}

function checkSystemHealth(): SystemHealth {
  // Collect metrics
  const health = {
    walletBalance: getCurrentBalance(),
    rpcLatency: getRpcLatency(),
    successRate: getSuccessRate(24 * 60 * 60 * 1000),
    profitLast24h: getProfitLast24h(),
    failedTxCount: getFailedTxCount(24 * 60 * 60 * 1000),
  };
  
  // Alert on issues
  if (health.walletBalance < 1) {
    sendAlert('CRITICAL', 'Low wallet balance');
  }
  
  if (health.successRate < 0.5) {
    sendAlert('WARNING', 'Low success rate');
  }
  
  if (health.rpcLatency > 2000) {
    sendAlert('WARNING', 'High RPC latency');
  }
  
  return health;
}
```

### 2. Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Wallet Balance | < 2 SOL | < 0.5 SOL | Auto-pause if < 0.1 SOL |
| Success Rate | < 70% | < 50% | Review strategy |
| RPC Latency | > 1s | > 3s | Switch RPC |
| Failed TX (1h) | > 10 | > 25 | Pause and investigate |
| Gas Cost | > 0.01 SOL | > 0.05 SOL | Reduce activity |

### 3. Auto-Pause Conditions

System automatically pauses when:

- Wallet balance < 0.1 SOL
- Success rate < 30% (last 100 trades)
- RPC errors > 50% (last 10 minutes)
- Consecutive failures > 5
- Critical error detected

## Emergency Procedures

### 1. Emergency Shutdown

```typescript
async function emergencyShutdown(reason: string): Promise<void> {
  console.error(`🚨 EMERGENCY SHUTDOWN: ${reason}`);
  
  // 1. Pause all bots
  await pauseAllBots();
  
  // 2. Cancel pending transactions
  await cancelPendingTransactions();
  
  // 3. Log event
  await logEmergencyEvent('SHUTDOWN', reason);
  
  // 4. Send alerts
  await sendAlert('CRITICAL', `Emergency shutdown: ${reason}`);
  
  // 5. Lock system
  await lockSystem();
}
```

**Triggers**:
- Wallet compromise suspected
- Repeated transaction failures
- Unusual trading patterns
- External security threat
- Admin command

### 2. Recovery Process

1. **Investigation**
   - Review audit logs
   - Check wallet activity
   - Analyze failed transactions
   - Identify root cause

2. **Remediation**
   - Fix identified issues
   - Rotate compromised secrets
   - Update configurations
   - Test in staging

3. **Restart**
   - Validate environment
   - Run health checks
   - Resume gradually
   - Monitor closely

## Best Practices Summary

### Development
- [ ] Use devnet for testing
- [ ] Test with small amounts first
- [ ] Validate all configurations
- [ ] Review audit logs regularly

### Production
- [ ] Use premium RPC
- [ ] Set conservative limits
- [ ] Monitor continuously
- [ ] Regular security audits
- [ ] Keep secrets rotated
- [ ] Maintain separate trading wallet
- [ ] Document all incidents

### Risk Management
- [ ] Start with low position sizes
- [ ] Gradually increase limits
- [ ] Review risk assessment daily
- [ ] Adjust based on market conditions
- [ ] Maintain adequate reserves
- [ ] Have emergency procedures ready

## Support

For risk management questions:
- **Documentation**: https://github.com/SMSDAO/reimagined-jupiter/tree/main/docs
- **Security**: security@gxq.studio
- **Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues

---

**Last Updated**: December 2024
