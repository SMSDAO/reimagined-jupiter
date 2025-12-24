# Oracle Intelligence System

## Overview

The Oracle Intelligence System is an advanced, AI-driven decision-making layer that provides comprehensive pre-execution analysis for the reimagined-jupiter bot framework. It utilizes specialized agents to evaluate arbitrage opportunities across multiple dimensions: strategy, risk, liquidity, execution, and profit optimization.

## Architecture

### Core Components

1. **Intelligence Agent Framework**
   - Base `IntelligenceAgent` interface with standardized `analyze()` method
   - Agent metadata system (id, name, version, type, author)
   - Hot-swappable plugin architecture via `AgentRegistry`

2. **Agent Registry**
   - Central management system for intelligence agents
   - Activation mechanism requiring admin approval via RBAC
   - Health monitoring and status tracking
   - Support for multiple agent types and versions

3. **Oracle Service**
   - Coordinates multiple agents for comprehensive analysis
   - Aggregates results from all active agents
   - Provides final PROCEED/ABORT/ADJUST recommendations
   - Supports parallel or sequential execution modes

4. **Backend Providers**
   - `GeminiBackend`: LLM-powered reasoning using Google Gemini API
   - Extensible architecture for additional AI providers

## Specialized Agents

### 1. Strategy Agent (`StrategyAgent`)

**Purpose**: Uses Gemini-powered reasoning to identify complex triangular or multi-hop routes beyond simple heuristics.

**Key Features**:
- LLM-based route analysis
- Complex multi-hop optimization
- Market condition evaluation
- Confidence scoring (HIGH/MEDIUM/LOW)

**Configuration**:
```typescript
{
  apiKey: string; // Gemini API key
}
```

**Analysis Output**:
- Route efficiency assessment
- DEX reputation evaluation
- Profit potential vs. gas cost analysis
- Recommended route adjustments

### 2. Risk Agent (`RiskAgent`)

**Purpose**: Implements DAO-safe heuristics to validate that any proposed execution follows strict safety bounds.

**Key Features**:
- Slippage validation (configurable max: 1.5% default)
- Price impact checks (configurable max: 2.5% default)
- Maximum loss protection (default: 0.1 SOL)
- Minimum profit thresholds (default: 0.005 SOL)
- Program safety validation (trusted/blacklisted programs)
- Liquidity depth analysis
- Volatility monitoring

**Configuration**:
```typescript
{
  maxSlippage: 0.015,        // 1.5%
  maxPriceImpact: 0.025,     // 2.5%
  maxLoss: 0.1,              // 0.1 SOL
  minProfit: 0.005,          // 0.005 SOL
  trustedPrograms: string[], // Trusted program IDs
  blacklistedPrograms: string[]
}
```

**Critical**: If Risk Agent recommends ABORT, execution is immediately halted.

### 3. Liquidity Agent (`LiquidityAgent`)

**Purpose**: Analyzes real-time pool depth and volatility using Pyth/Jupiter data to recommend optimal trade sizes.

**Key Features**:
- Minimum liquidity threshold validation (default: 100 SOL)
- Trade-to-liquidity ratio analysis (max: 5% default)
- Volatility threshold monitoring (max: 3% default)
- Pyth confidence interval validation
- Pool depth distribution analysis
- Trade splitting recommendations

**Configuration**:
```typescript
{
  minLiquidityThreshold: 100,    // 100 SOL
  maxTradeToLiquidityRatio: 0.05, // 5%
  volatilityThreshold: 0.03,      // 3%
  confidenceInterval: 0.01        // 1%
}
```

**Analysis Output**:
- Optimal trade size recommendations
- Execution strategy (single vs. split trades)
- Pool depth assessment
- Timing recommendations

### 4. Execution Agent (`ExecutionAgent`)

**Purpose**: Optimizes transaction submission (Jito tips, RPC selection, priority fees) based on network congestion.

**Key Features**:
- Dynamic priority fee optimization (respects 10M lamports hard cap)
- Jito tip calculation based on congestion
- RPC endpoint selection
- Compute unit optimization
- Network congestion estimation

**Configuration**:
```typescript
{
  baseJitoTip: 10_000,           // 0.00001 SOL
  maxJitoTip: 1_000_000,         // 0.001 SOL
  basePriorityFee: 1_000,        // 1000 microlamports
  maxPriorityFee: 10_000_000,    // 10M lamports (hard cap)
  congestionThreshold: 0.7,      // 70%
  preferredRpcEndpoints: string[]
}
```

**Analysis Output**:
- Optimal priority fee
- Recommended Jito tip
- Best RPC endpoint
- Compute unit allocation

### 5. Profit Optimization Agent (`ProfitOptimizationAgent`)

**Purpose**: Math-driven micro-profit optimization by adjusting parameters per-trade to capture maximum value after fees and DAO skims.

**Key Features**:
- Comprehensive fee breakdown (gas, DAO skim, dev fee)
- Net profit calculation
- Profit margin validation
- Optimal trade size calculation
- Break-even analysis
- Timing recommendations
- Three optimization strategies: AGGRESSIVE, BALANCED, CONSERVATIVE

**Configuration**:
```typescript
{
  minProfitMargin: 0.003,  // 0.3%
  feeStructure: {
    gasFee: 0.000005,      // ~5000 lamports
    daoSkimPercentage: 0.1, // 10%
    devFeePercentage: 0.1   // 10%
  },
  optimizationStrategy: 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE'
}
```

**Analysis Output**:
- Gross vs. net profit
- Fee breakdown
- Profit margin
- Optimal trade size
- Optimal slippage tolerance
- Break-even point
- Execution timing recommendation

## Agent Activation Workflow

### 1. Agent Registration

```typescript
const strategyAgent = new StrategyAgent({ apiKey: config.gemini.apiKey });
await registry.registerAgent(strategyAgent);
// Agent status: PENDING_APPROVAL
```

### 2. Request Activation

```typescript
const requestId = await registry.requestActivation(
  'strategy-agent-v1',
  'user-id',
  'Enable AI-powered route optimization',
  { /* optional config */ }
);
```

### 3. Admin Approval

Requires `ADMIN` resource with `APPROVE` action permission:

```typescript
await registry.approveActivation(
  requestId,
  'admin-user-id',
  true, // approved
  'Approved for production use'
);
// Agent status: ACTIVE
```

### 4. Automatic Initialization

Upon approval, the agent:
- Runs `initialize()` method
- Verifies backend connections (e.g., Gemini API)
- Updates status to ACTIVE
- Begins accepting analysis requests

## Integration with BotExecutionEngine

The Oracle Service is integrated into the bot execution flow:

```
1. Pre-flight Balance Check
2. Replay Protection Validation
3. Pre-execution Intelligence Analysis ← ORACLE SERVICE
   ├─ Strategy Agent
   ├─ Risk Agent (CRITICAL)
   ├─ Liquidity Agent
   ├─ Execution Agent
   └─ Profit Optimization Agent
4. Sandbox Isolation
5. Transaction Submission
6. Post-trade Analysis
7. DAO Skim
8. Telemetry Recording
```

### Usage Example

```typescript
import { Connection } from '@solana/web3.js';
import { BotExecutionEngine } from './services/botFramework.js';
import { OracleService } from './services/intelligence/OracleService.js';
import { rbacService } from './services/rbac.js';

// Initialize Oracle Service
const oracleService = new OracleService(rbacService, {
  enabledAgentTypes: ['STRATEGY', 'RISK', 'LIQUIDITY', 'EXECUTION', 'PROFIT_OPTIMIZATION'],
  requireAllAgents: false,
  parallelExecution: true,
});

// Register and activate agents
const strategyAgent = new StrategyAgent({ apiKey: process.env.GEMINI_API_KEY });
await oracleService.getRegistry().registerAgent(strategyAgent);

const requestId = await oracleService.getRegistry().requestActivation(
  'strategy-agent-v1',
  userId,
  'Enable AI route optimization'
);

await oracleService.getRegistry().approveActivation(requestId, adminId, true);

// Initialize bot engine with Oracle
const connection = new Connection(rpcUrl);
const botEngine = new BotExecutionEngine(connection, oracleService);

// Execute with intelligence analysis
await botEngine.executeTransaction(
  botConfig,
  transaction,
  signer,
  {
    analysisContext: {
      inputToken: 'SOL',
      outputToken: 'USDC',
      amountIn: 1.0,
      expectedAmountOut: 1.02,
      route: jupiterRoute,
      marketData: {
        liquidity: 10000,
        volatility: 0.02,
        priceImpact: 0.01,
        slippage: 0.005,
      },
      riskParams: {
        maxSlippage: 0.015,
        maxPriceImpact: 0.025,
        maxLoss: 0.1,
        minProfit: 0.005,
      },
    },
  }
);
```

## Oracle Decision Logic

### Aggregation Rules

1. **Risk Agent has veto power**: If Risk Agent recommends ABORT, execution stops immediately.

2. **Majority ABORT**: If >50% of agents recommend ABORT, execution stops.

3. **Any ADJUST**: If any agent recommends ADJUST, aggregated adjustments are returned with ADJUST recommendation.

4. **All PROCEED**: If all agents recommend PROCEED, execution proceeds with original parameters.

### Confidence Calculation

Overall confidence is calculated as the average of agent confidence scores:
- HIGH = 3 points
- MEDIUM = 2 points
- LOW = 1 point

Average ≥ 2.5 → HIGH confidence
Average ≥ 1.5 → MEDIUM confidence
Average < 1.5 → LOW confidence

## Configuration

### Environment Variables

```bash
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_ENABLED=true

# Existing config...
SOLANA_RPC_URL=...
WALLET_PRIVATE_KEY=...
```

### Config File

```typescript
// src/config/index.ts
export const config = {
  // ...
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    enabled: process.env.GEMINI_ENABLED !== 'false',
  },
  // ...
};
```

## Health Monitoring

The Oracle Service provides comprehensive health monitoring:

```typescript
// Check all active agents
const healthResults = await registry.healthCheckAll();

// Get registry statistics
const stats = registry.getStats();
console.log(`
  Total agents: ${stats.total}
  Active: ${stats.active}
  Inactive: ${stats.inactive}
  Pending approval: ${stats.pending}
  Error state: ${stats.error}
`);
```

## Security Considerations

1. **RBAC Integration**: Agent activation requires admin approval via the existing RBAC system.

2. **Fail-Safe Design**: If Oracle analysis fails, execution proceeds with default parameters (logged as warning).

3. **Sandbox Isolation**: Each agent operates within the sandbox isolation framework.

4. **API Key Security**: Gemini API keys are loaded from environment variables, never committed to source code.

5. **Rate Limiting**: Agent analysis is subject to per-user rate limiting.

## Performance Characteristics

- **Parallel Execution**: All agents run simultaneously for minimum latency
- **Sequential Execution**: Available for strict dependency ordering (Risk first)
- **Typical Analysis Time**: 100-500ms depending on agent count and LLM latency
- **Caching**: Agent health checks are cached to avoid repeated initialization

## Extending the System

### Adding a New Agent

1. Implement the `IntelligenceAgent` interface:

```typescript
export class CustomAgent implements IntelligenceAgent {
  readonly metadata: AgentMetadata = {
    id: 'custom-agent-v1',
    name: 'Custom Intelligence Agent',
    version: '1.0.0',
    type: 'CUSTOM_TYPE',
    author: 'Your Name',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  status: AgentStatus = 'INACTIVE';

  async initialize(): Promise<void> { /* ... */ }
  async cleanup(): Promise<void> { /* ... */ }
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> { /* ... */ }
  async analyze(context: AnalysisContext): Promise<AnalysisResult> { /* ... */ }
}
```

2. Register with the registry:

```typescript
const customAgent = new CustomAgent(config);
await registry.registerAgent(customAgent);
```

3. Request activation through admin approval workflow.

## Best Practices

1. **Always enable Risk Agent**: This is the most critical safety component.

2. **Test on devnet first**: Validate agent behavior before production use.

3. **Monitor health checks**: Regularly check agent health and deactivate failing agents.

4. **Configure conservatively**: Start with conservative thresholds and tune based on performance.

5. **Review Oracle logs**: Analyze why executions are aborted or adjusted.

6. **Use parallel execution**: For best performance unless strict ordering is required.

7. **Respect rate limits**: Oracle analysis adds latency; balance thoroughness with speed.

## Troubleshooting

### Agent Fails to Initialize

- Check API keys in environment variables
- Verify network connectivity to backend services
- Review agent health check logs

### Oracle Always Recommends ABORT

- Review Risk Agent thresholds (may be too strict)
- Check market conditions (high volatility, low liquidity)
- Examine agent reasoning in logs

### Analysis Takes Too Long

- Switch to parallel execution mode
- Reduce number of active agents
- Optimize agent implementations

### Adjustments Not Applied

- Ensure transaction is built after Oracle analysis
- Check if adjustments are compatible with transaction structure
- Review adjustment application logic

## Future Enhancements

1. **Machine Learning Integration**: Train custom models on historical trade data
2. **Multi-Model Consensus**: Support multiple LLM providers with voting
3. **Dynamic Threshold Learning**: Automatically tune agent parameters based on outcomes
4. **Advanced MEV Protection**: Integrate with Jito bundles and block builders
5. **Cross-Chain Intelligence**: Extend agents to analyze cross-chain opportunities
6. **Agent Marketplace**: Allow community-developed agents with reputation scoring

## References

- [Bot Framework Guide](./BOT_FRAMEWORK_GUIDE.md)
- [RBAC Documentation](./ADMIN_SECURITY.md)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pyth Network](https://pyth.network)
- [Jupiter Aggregator](https://jup.ag)
