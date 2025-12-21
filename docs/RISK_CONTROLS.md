# Risk Controls Documentation

## Overview

The Risk Control System provides comprehensive risk management for arbitrage trading operations. It implements trade risk evaluation, slippage control, drawdown tracking, circuit breakers, and emergency stop mechanisms to protect capital and ensure safe trading operations.

## Risk Parameters

### Default Configuration

```typescript
{
  maxSlippageBps: 100,          // Max slippage: 1%
  maxDrawdownBps: 500,          // Max drawdown: 5%
  minProfitThresholdSol: 0.01,  // Min profit: 0.01 SOL
  maxTradeSizeSol: 10,          // Max trade size: 10 SOL
  maxDailyLossSol: 1.0,         // Max daily loss: 1.0 SOL
  maxConsecutiveLosses: 3,      // Max consecutive losses
  emergencyStopEnabled: false   // Emergency stop status
}
```

### Parameter Descriptions

#### maxSlippageBps
Maximum acceptable slippage in basis points (bps).
- Default: 100 bps (1%)
- Range: 50-200 bps (0.5%-2%)
- Higher values allow more price movement but increase risk

#### maxDrawdownBps
Maximum allowed drawdown from peak equity.
- Default: 500 bps (5%)
- Range: 300-1000 bps (3%-10%)
- Triggers emergency stop when exceeded

#### minProfitThresholdSol
Minimum expected profit for a trade to be worthwhile.
- Default: 0.01 SOL
- Range: 0.005-0.1 SOL
- Filters out low-profit opportunities

#### maxTradeSizeSol
Maximum size for a single trade.
- Default: 10 SOL
- Range: 1-50 SOL
- Limits exposure per trade

#### maxDailyLossSol
Maximum acceptable loss in a single day.
- Default: 1.0 SOL
- Range: 0.5-5.0 SOL
- Resets at midnight UTC

#### maxConsecutiveLosses
Maximum consecutive losing trades before circuit breaker.
- Default: 3
- Range: 2-5
- Triggers emergency stop when reached

## Usage

### Initialization

```typescript
import { getRiskController } from './lib/risk-controller.js';

// Use default parameters
const riskController = getRiskController();

// Or customize parameters
const riskController = getRiskController({
  maxSlippageBps: 150,
  maxDrawdownBps: 400,
  maxConsecutiveLosses: 5,
});
```

### Trade Evaluation

```typescript
// Evaluate if trade should proceed
const assessment = riskController.evaluateTrade(
  tradeSizeSol: 5.0,
  expectedProfitSol: 0.05,
  slippageBps: 80
);

if (assessment.approved) {
  // Execute trade
  console.log('Trade approved:', assessment.reason);
} else {
  // Skip trade
  console.log('Trade rejected:', assessment.reason);
}
```

### Recording Results

```typescript
// Record successful trade
riskController.recordSuccess(profitSol: 0.05);

// Record failed trade
riskController.recordFailure(lossSol: 0.02);
```

### Monitoring Metrics

```typescript
// Get current metrics
const metrics = riskController.getMetrics();
console.log('Win Rate:', riskController.getWinRate(), '%');
console.log('Net P&L:', riskController.getNetProfitLoss(), 'SOL');
console.log('Sharpe Ratio:', riskController.calculateSharpeRatio());

// Get risk parameters
const params = riskController.getParameters();
console.log('Current parameters:', params);
```

## Circuit Breakers

### Automatic Triggers

The system automatically triggers emergency stop when:

1. **Consecutive Losses**: Reaches `maxConsecutiveLosses`
2. **Daily Loss Limit**: Exceeds `maxDailyLossSol`
3. **Drawdown Limit**: Exceeds `maxDrawdownBps`

### Emergency Stop Behavior

When emergency stop is triggered:
- All new trades are rejected
- Reason is logged with error level
- Manual intervention required to resume
- System continues to monitor existing positions

### Disabling Emergency Stop

```typescript
// Only do this after reviewing the situation
riskController.disableEmergencyStop();
```

⚠️ **Warning**: Only disable emergency stop after:
1. Identifying the root cause
2. Implementing corrective measures
3. Confirming system stability
4. Getting approval from risk management

## Risk Assessment

### Risk Score Calculation

Each trade receives a risk score (0-100):

```
Risk Score = 
  (slippage / maxSlippage) * 30 +
  (tradeSize / maxTradeSize) * 20 +
  (consecutiveLosses / maxConsecutiveLosses) * 20 +
  (drawdown / maxDrawdown) * 20 +
  (dailyLoss / maxDailyLoss) * 10
```

- **0-40**: Low risk (green light)
- **40-70**: Medium risk (caution)
- **70-100**: High risk (reject)

### Trade Approval Criteria

All checks must pass:
- ✅ Emergency stop is disabled
- ✅ Slippage within limits
- ✅ Trade size within limits
- ✅ Drawdown within limits
- ✅ Consecutive losses within limits
- ✅ Daily loss within limits
- ✅ Risk score < 70

## Performance Metrics

### Win Rate
```typescript
const winRate = riskController.getWinRate();
// Returns: percentage of successful trades
```

### Net Profit/Loss
```typescript
const netPnL = riskController.getNetProfitLoss();
// Returns: total profit - total loss in SOL
```

### Average Profit/Loss
```typescript
const avgProfit = riskController.getAverageProfit();
const avgLoss = riskController.getAverageLoss();
```

### Sharpe Ratio
```typescript
const sharpeRatio = riskController.calculateSharpeRatio(riskFreeRate: 0.02);
// Returns: risk-adjusted return metric
// > 1.0 = good, > 2.0 = excellent, > 3.0 = exceptional
```

### Current Drawdown
```typescript
const metrics = riskController.getMetrics();
const drawdownPercent = metrics.currentDrawdownBps / 100;
```

## Integration with Trading System

### Pre-Trade Check

```typescript
async function executeTrade(trade) {
  // Evaluate risk before executing
  const assessment = riskController.evaluateTrade(
    trade.size,
    trade.expectedProfit,
    trade.slippage
  );
  
  if (!assessment.approved) {
    logger.warn('Trade rejected by risk controller', {
      reason: assessment.reason,
      riskScore: assessment.riskScore,
      checks: assessment.checks,
    });
    return null;
  }
  
  try {
    const result = await performTrade(trade);
    riskController.recordSuccess(result.profit);
    return result;
  } catch (error) {
    riskController.recordFailure(trade.potentialLoss);
    throw error;
  }
}
```

### Real-Time Monitoring

```typescript
setInterval(() => {
  const metrics = riskController.getMetrics();
  const params = riskController.getParameters();
  
  // Log to monitoring system
  logger.info('Risk metrics update', {
    winRate: riskController.getWinRate(),
    netPnL: riskController.getNetProfitLoss(),
    consecutiveLosses: metrics.consecutiveLosses,
    currentDrawdown: metrics.currentDrawdownBps,
    emergencyStop: params.emergencyStopEnabled,
  });
  
  // Alert if approaching limits
  if (metrics.consecutiveLosses >= params.maxConsecutiveLosses - 1) {
    logger.warn('Approaching consecutive loss limit!');
  }
  
  if (metrics.currentDrawdownBps >= params.maxDrawdownBps * 0.8) {
    logger.warn('Approaching drawdown limit!');
  }
}, 60000); // Every minute
```

## Best Practices

### 1. Conservative Start
Begin with conservative parameters:
```typescript
{
  maxSlippageBps: 50,
  maxDrawdownBps: 300,
  maxTradeSizeSol: 5,
  maxConsecutiveLosses: 2,
}
```

### 2. Gradual Adjustment
Increase limits gradually based on:
- Historical performance
- Market conditions
- Risk tolerance
- Capital available

### 3. Regular Review
Review risk metrics daily:
- Win rate trends
- Drawdown patterns
- Emergency stop frequency
- Profit consistency

### 4. Parameter Tuning
Adjust parameters based on:
- Market volatility
- Trading performance
- Capital growth
- Risk appetite changes

### 5. Emergency Procedures
Have clear procedures for:
- Emergency stop events
- Parameter adjustments
- System resumption
- Incident review

## Monitoring Dashboard

### Key Metrics to Display

1. **Current Status**
   - Emergency stop status
   - Active trades count
   - Current drawdown

2. **Performance**
   - Total trades (24h, 7d, 30d)
   - Win rate %
   - Net P&L
   - Sharpe ratio

3. **Risk Indicators**
   - Consecutive losses
   - Daily loss remaining
   - Risk score trend
   - Circuit breaker proximity

4. **Historical**
   - P&L chart
   - Win rate trend
   - Drawdown history
   - Trade volume

## Alert Configuration

### Critical Alerts
- Emergency stop triggered
- Daily loss limit reached
- Drawdown > 80% of limit

### Warning Alerts
- 2 consecutive losses
- Drawdown > 60% of limit
- Win rate < 70%

### Info Alerts
- Parameter changes
- Daily reset
- Milestone achievements

## Troubleshooting

### High Rejection Rate

**Symptoms**: Most trades rejected by risk controller

**Possible Causes**:
- Parameters too strict
- Market volatility increased
- Slippage estimates inaccurate

**Solutions**:
1. Review recent market conditions
2. Adjust slippage tolerance if appropriate
3. Check trade size calculations
4. Review error patterns

### Frequent Emergency Stops

**Symptoms**: Emergency stop triggered often

**Possible Causes**:
- Strategy not profitable
- Market conditions changed
- Parameters too aggressive
- Execution issues

**Solutions**:
1. Analyze losing trades
2. Review strategy logic
3. Tighten parameters temporarily
4. Investigate execution quality

### Low Win Rate

**Symptoms**: Win rate < 60%

**Possible Causes**:
- Poor opportunity selection
- High slippage
- Timing issues
- Fee impact underestimated

**Solutions**:
1. Increase profit threshold
2. Improve opportunity filtering
3. Optimize execution timing
4. Review fee calculations

## Related Documentation

- [Auto-Fix System](./AUTO_FIX_SYSTEM.md)
- [Monitoring](./MONITORING.md)
- [Canary Deployment](./CANARY_DEPLOYMENT.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Support

For risk control issues:
1. Check emergency stop status
2. Review recent metrics
3. Analyze trade rejection reasons
4. Contact risk management team
5. Create issue with `risk-control` label
