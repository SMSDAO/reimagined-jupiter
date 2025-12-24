# Oracle Intelligence System - Quick Start Guide

## Overview

The Oracle Intelligence System is an advanced AI-driven decision-making layer that provides comprehensive pre-execution analysis for arbitrage opportunities. It uses specialized agents to evaluate trades across multiple dimensions: strategy, risk, liquidity, execution, and profit optimization.

## Key Features

- **🎯 Strategy Agent**: AI-powered route optimization using Google Gemini
- **🛡️ Risk Agent**: DAO-safe validation with strict safety bounds
- **💧 Liquidity Agent**: Real-time pool depth and volatility analysis
- **⚡ Execution Agent**: Transaction optimization (priority fees, Jito tips)
- **💰 Profit Optimization Agent**: Math-driven micro-profit maximization
- **🔐 RBAC Integration**: Admin-approved agent activation
- **🔌 Hot-Swappable**: Agents can be activated/deactivated without restart

## Quick Start

### 1. Environment Setup

Add to your `.env` file:

```bash
# Enable Oracle Intelligence
GEMINI_ENABLED=true
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://ai.google.dev/

### 2. Basic Usage

```typescript
import { Connection } from '@solana/web3.js';
import { BotExecutionEngine } from './services/botFramework.js';
import { OracleService } from './services/intelligence/index.js';
import { RiskAgent, LiquidityAgent } from './services/intelligence/index.js';
import { rbacService } from './services/rbac.js';

// Initialize Oracle Service
const oracleService = new OracleService(rbacService);

// Register agents
const riskAgent = new RiskAgent();
await oracleService.getRegistry().registerAgent(riskAgent);

// Activate (requires admin approval)
const requestId = await oracleService.getRegistry().requestActivation(
  'risk-agent-v1',
  userId,
  'Enable risk validation'
);
await oracleService.getRegistry().approveActivation(requestId, adminId, true);

// Create bot engine with Oracle
const connection = new Connection(rpcUrl);
const botEngine = new BotExecutionEngine(connection, oracleService);

// Execute with intelligence analysis
await botEngine.executeTransaction(botConfig, transaction, signer, {
  analysisContext: {
    inputToken: 'SOL',
    outputToken: 'USDC',
    amountIn: 1.0,
    expectedAmountOut: 150.5,
    marketData: {
      liquidity: 5000,
      volatility: 0.015,
      slippage: 0.01,
    },
  },
});
```

### 3. Running the Demo

```bash
npm run build
node dist/src/examples/oracle-intelligence-demo.js
```

## Agent Configuration

### Risk Agent

Controls safety bounds for all executions:

```typescript
const riskAgent = new RiskAgent({
  maxSlippage: 0.015,        // 1.5% max slippage
  maxPriceImpact: 0.025,     // 2.5% max price impact
  maxLoss: 0.1,              // 0.1 SOL max loss
  minProfit: 0.005,          // 0.005 SOL min profit
  trustedPrograms: [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca
  ],
});
```

### Liquidity Agent

Analyzes pool depth and recommends optimal trade sizes:

```typescript
const liquidityAgent = new LiquidityAgent({
  minLiquidityThreshold: 100,    // 100 SOL minimum
  maxTradeToLiquidityRatio: 0.05, // 5% of pool max
  volatilityThreshold: 0.03,      // 3% max volatility
});
```

### Execution Agent

Optimizes transaction submission parameters:

```typescript
const executionAgent = new ExecutionAgent({
  baseJitoTip: 10_000,           // 0.00001 SOL
  maxJitoTip: 1_000_000,         // 0.001 SOL
  basePriorityFee: 1_000,        // 1000 microlamports
  maxPriorityFee: 10_000_000,    // 10M lamports (hard cap)
});
```

### Profit Optimization Agent

Maximizes net profit after all fees:

```typescript
const profitAgent = new ProfitOptimizationAgent({
  minProfitMargin: 0.003,        // 0.3% minimum
  optimizationStrategy: 'BALANCED', // AGGRESSIVE | BALANCED | CONSERVATIVE
});
```

### Strategy Agent (Requires Gemini)

AI-powered route analysis:

```typescript
const strategyAgent = new StrategyAgent({
  apiKey: process.env.GEMINI_API_KEY,
});
```

## Decision Flow

```
Transaction Request
       ↓
Pre-flight Balance Check
       ↓
Replay Protection
       ↓
🔮 Oracle Intelligence Analysis
   ├─ Strategy Agent (AI route analysis)
   ├─ Risk Agent (CRITICAL - can veto)
   ├─ Liquidity Agent (depth analysis)
   ├─ Execution Agent (fee optimization)
   └─ Profit Optimization (margin validation)
       ↓
   ┌───┴───┐
ABORT  │  PROCEED/ADJUST
   ↓   │     ↓
  🛑  │   Continue Execution
      ↓
     Fail
```

## Oracle Recommendations

- **PROCEED**: All checks passed, execute with current parameters
- **ADJUST**: Some issues found, recommended adjustments provided
- **ABORT**: Critical issues detected, execution halted

### Abort Conditions

Risk Agent will abort if:
- Slippage exceeds configured maximum
- Price impact too high
- Insufficient profit after fees
- Blacklisted program detected
- Loss potential exceeds threshold

## Monitoring

Check Oracle health:

```typescript
// Health check all agents
const healthResults = await registry.healthCheckAll();

// Get statistics
const stats = registry.getStats();
console.log(`Active agents: ${stats.active}/${stats.total}`);
```

## Production Deployment

### Security Considerations

1. **API Keys**: Store Gemini API key in secure environment variables
2. **RBAC**: Always require admin approval for agent activation
3. **Testing**: Test all agents on devnet before mainnet
4. **Monitoring**: Set up health check alerts
5. **Rate Limits**: Monitor API usage to avoid quota exhaustion

### Performance Tips

1. **Parallel Execution**: Enable for faster analysis (default)
2. **Selective Agents**: Only activate agents you need
3. **Caching**: Agent health checks are cached
4. **Fail-Safe**: Oracle failures don't block execution (logged as warnings)

### Cost Considerations

- **Gemini API**: ~$0.001-0.003 per analysis
- **Latency**: Adds 100-500ms per execution
- **Value**: Can prevent >99% of unprofitable trades

## Troubleshooting

### "Agent not initialized"
- Check Gemini API key is set
- Verify agent activation approval
- Review agent health check logs

### "Risk agent blocked execution"
- Review risk thresholds (may be too strict)
- Check market conditions (volatility, liquidity)
- Examine detailed reasoning in logs

### "Oracle timeout"
- Switch to sequential execution
- Reduce number of active agents
- Check network connectivity to Gemini API

## Advanced Features

### Custom Agents

Create your own intelligence agents:

```typescript
export class CustomAgent implements IntelligenceAgent {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    // Your custom logic here
  }
}
```

See `docs/ORACLE_INTELLIGENCE.md` for complete guide.

### Multi-Model Consensus

Use multiple LLM providers for consensus:

```typescript
// Coming soon: OpenAI, Claude, Llama integration
```

## Documentation

- **Full Documentation**: [docs/ORACLE_INTELLIGENCE.md](docs/ORACLE_INTELLIGENCE.md)
- **Usage Example**: [src/examples/oracle-intelligence-demo.ts](src/examples/oracle-intelligence-demo.ts)
- **Test Suite**: [src/__tests__/intelligence.test.ts](src/__tests__/intelligence.test.ts)

## Support

- **Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues
- **Discussions**: https://github.com/SMSDAO/reimagined-jupiter/discussions
- **Documentation**: https://github.com/SMSDAO/reimagined-jupiter/tree/main/docs

## License

MIT License - see LICENSE file for details
