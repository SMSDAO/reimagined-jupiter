/**
 * Oracle Intelligence System - Usage Example
 *
 * This example demonstrates how to set up and use the Oracle Intelligence Layer
 * for enhanced bot execution with AI-driven decision making.
 */

import { Connection, Keypair } from "@solana/web3.js";
import { BotExecutionEngine, BotConfig } from "../services/botFramework.js";
import { OracleService } from "../services/intelligence/index.js";
import {
  StrategyAgent,
  RiskAgent,
  LiquidityAgent,
  ExecutionAgent,
  ProfitOptimizationAgent,
} from "../services/intelligence/index.js";
import { rbacService } from "../services/rbac.js";
import { config } from "../config/index.js";

/**
 * Initialize and configure the Oracle Intelligence System
 */
async function setupOracleSystem(): Promise<OracleService> {
  // 1. Create Oracle Service
  const oracleService = new OracleService(rbacService, {
    enabledAgentTypes: [
      "STRATEGY",
      "RISK",
      "LIQUIDITY",
      "EXECUTION",
      "PROFIT_OPTIMIZATION",
    ],
    requireAllAgents: false, // Don't require all agents to pass (except Risk)
    parallelExecution: true, // Execute agents in parallel for speed
  });

  const registry = oracleService.getRegistry();

  // 2. Register Strategy Agent (requires Gemini API key)
  if (config.gemini.enabled && config.gemini.apiKey) {
    const strategyAgent = new StrategyAgent({
      apiKey: config.gemini.apiKey,
    });
    await registry.registerAgent(strategyAgent);
    console.log("✅ Strategy Agent registered");
  }

  // 3. Register Risk Agent (critical for safety)
  const riskAgent = new RiskAgent({
    maxSlippage: 0.015, // 1.5%
    maxPriceImpact: 0.025, // 2.5%
    maxLoss: 0.1, // 0.1 SOL
    minProfit: 0.005, // 0.005 SOL
    trustedPrograms: [
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter v6
      "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM
    ],
  });
  await registry.registerAgent(riskAgent);
  console.log("✅ Risk Agent registered");

  // 4. Register Liquidity Agent
  const liquidityAgent = new LiquidityAgent({
    minLiquidityThreshold: 100, // 100 SOL minimum
    maxTradeToLiquidityRatio: 0.05, // 5% max
    volatilityThreshold: 0.03, // 3% max
  });
  await registry.registerAgent(liquidityAgent);
  console.log("✅ Liquidity Agent registered");

  // 5. Register Execution Agent
  const executionAgent = new ExecutionAgent({
    baseJitoTip: 10_000,
    maxJitoTip: 1_000_000,
    basePriorityFee: 1_000,
    maxPriorityFee: 10_000_000, // 10M lamports hard cap
  });
  await registry.registerAgent(executionAgent);
  console.log("✅ Execution Agent registered");

  // 6. Register Profit Optimization Agent
  const profitAgent = new ProfitOptimizationAgent({
    minProfitMargin: 0.003, // 0.3%
    optimizationStrategy: "BALANCED",
    feeStructure: {
      gasFee: 0.000005,
      daoSkimPercentage: config.profitDistribution.daoWalletPercentage,
      devFeePercentage: config.devFee.percentage,
    },
  });
  await registry.registerAgent(profitAgent);
  console.log("✅ Profit Optimization Agent registered");

  // 7. Activate all agents (requires admin approval in production)
  // For demo purposes, we'll mock the admin approval
  const userId = "demo-user";
  const adminId = "admin-user";

  const agents = [
    "risk-agent-v1",
    "liquidity-agent-v1",
    "execution-agent-v1",
    "profit-optimization-agent-v1",
  ];

  if (config.gemini.enabled) {
    agents.push("strategy-agent-v1");
  }

  for (const agentId of agents) {
    const requestId = await registry.requestActivation(
      agentId,
      userId,
      "Enable Oracle intelligence for enhanced arbitrage execution",
    );

    // In production, this would require actual admin approval via RBAC
    // For this example, we'll assume approval
    try {
      await registry.approveActivation(
        requestId,
        adminId,
        true,
        "Approved for production use",
      );
      console.log(`✅ ${agentId} activated`);
    } catch (error) {
      console.warn(`⚠️ Failed to activate ${agentId}:`, error);
    }
  }

  // 8. Verify agent status
  const stats = registry.getStats();
  console.log(`\n📊 Oracle System Status:`);
  console.log(`   Total Agents: ${stats.total}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Error: ${stats.error}`);

  return oracleService;
}

/**
 * Execute a bot transaction with Oracle intelligence
 */
async function executeWithOracle() {
  // 1. Setup Oracle System
  const oracleService = await setupOracleSystem();

  // 2. Initialize Bot Execution Engine with Oracle
  const connection = new Connection(config.solana.rpcUrl);
  const botEngine = new BotExecutionEngine(connection, oracleService);

  // 3. Configure bot
  const botConfig: BotConfig = {
    id: "arbitrage-bot-1",
    userId: "demo-user",
    name: "SOL-USDC Arbitrage Bot",
    botType: "ARBITRAGE",
    signingMode: "SERVER_SIDE",
    strategyConfig: {
      minProfitThreshold: 0.005,
      maxSlippage: 0.015,
    },
    isActive: true,
    isPaused: false,
  };

  // 4. Load wallet (in production, use secure key management)
  const signer = Keypair.fromSecretKey(
    // This should come from secure storage, not hardcoded
    Buffer.from([
      /* private key bytes */
    ]),
  );

  // 5. Build transaction (simplified for example)
  // In production, this would be built from Jupiter route, flash loan setup, etc.
  const transaction = /* ... build transaction ... */ null as any;

  // 6. Execute with Oracle analysis
  console.log("\n🔮 Executing transaction with Oracle intelligence...\n");

  const result = await botEngine.executeTransaction(
    botConfig,
    transaction,
    signer,
    {
      skipPreflight: false,
      maxRetries: 3,
      analysisContext: {
        // Provide context for Oracle analysis
        inputToken: "SOL",
        outputToken: "USDC",
        amountIn: 1.0, // 1 SOL
        expectedAmountOut: 150.5, // Expected $150.50 USDC

        // Route information
        route: {
          hops: 2,
          dexes: ["Raydium", "Orca"],
          programIds: [
            "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
            "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
          ],
        },

        // Market data
        marketData: {
          liquidity: 5000, // 5000 SOL total liquidity
          volatility: 0.015, // 1.5% volatility
          priceImpact: 0.008, // 0.8% price impact
          slippage: 0.01, // 1% slippage
        },

        // Risk parameters
        riskParams: {
          maxSlippage: 0.015,
          maxPriceImpact: 0.025,
          maxLoss: 0.1,
          minProfit: 0.005,
        },

        // Execution parameters (will be optimized by agents)
        executionParams: {
          priorityFee: 5_000,
          jitoTipLamports: 50_000,
        },
      },
    },
  );

  // 7. Handle result
  if (result.status === "CONFIRMED") {
    console.log("\n✅ Transaction executed successfully!");
    console.log(`   Signature: ${result.transactionSignature}`);
    console.log(`   Profit: ${result.profitSol?.toFixed(6)} SOL`);
    console.log(`   Gas: ${result.gasFeeSol?.toFixed(6)} SOL`);
  } else {
    console.log("\n❌ Transaction failed:");
    console.log(`   Reason: ${result.errorMessage}`);
  }

  return result;
}

/**
 * Monitor Oracle health
 */
async function monitorOracleHealth(oracleService: OracleService) {
  const registry = oracleService.getRegistry();

  // Run health checks
  console.log("\n🏥 Running health checks...\n");
  const healthResults = await registry.healthCheckAll();

  for (const [agentId, health] of healthResults) {
    if (health.healthy) {
      console.log(`✅ ${agentId}: Healthy`);
    } else {
      console.log(`❌ ${agentId}: Unhealthy - ${health.error}`);
    }
  }

  // Get statistics
  const stats = registry.getStats();
  console.log(`\n📊 Oracle Statistics:`);
  console.log(`   Total: ${stats.total}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Inactive: ${stats.inactive}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Error: ${stats.error}`);
  console.log(`\n   By Type:`);
  console.log(`   - Strategy: ${stats.byType.STRATEGY}`);
  console.log(`   - Risk: ${stats.byType.RISK}`);
  console.log(`   - Liquidity: ${stats.byType.LIQUIDITY}`);
  console.log(`   - Execution: ${stats.byType.EXECUTION}`);
  console.log(`   - Profit Optimization: ${stats.byType.PROFIT_OPTIMIZATION}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log("🚀 Oracle Intelligence System - Demo\n");
    console.log("═".repeat(60));

    // Setup and execute
    await executeWithOracle();

    // Monitor health (in production, this would run periodically)
    // const oracleService = await setupOracleSystem();
    // await monitorOracleHealth(oracleService);

    console.log("\n" + "═".repeat(60));
    console.log("✅ Demo completed successfully\n");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupOracleSystem, executeWithOracle, monitorOracleHealth };
