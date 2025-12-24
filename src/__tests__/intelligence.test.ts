/**
 * Intelligence System Tests
 */

import { RBACService } from '../services/rbac.js';
import { AgentRegistry } from '../services/intelligence/AgentRegistry.js';
import { OracleService } from '../services/intelligence/OracleService.js';
import { RiskAgent } from '../services/intelligence/agents/RiskAgent.js';
import { LiquidityAgent } from '../services/intelligence/agents/LiquidityAgent.js';
import { ExecutionAgent } from '../services/intelligence/agents/ExecutionAgent.js';
import { ProfitOptimizationAgent } from '../services/intelligence/agents/ProfitOptimizationAgent.js';
import { AnalysisContext } from '../services/intelligence/types.js';

describe('Intelligence System', () => {
  let rbacService: RBACService;
  let registry: AgentRegistry;
  let oracleService: OracleService;

  beforeEach(() => {
    rbacService = new RBACService();
    registry = new AgentRegistry(rbacService);
    oracleService = new OracleService(rbacService);
  });

  describe('AgentRegistry', () => {
    it('should register an agent successfully', async () => {
      const riskAgent = new RiskAgent();
      await registry.registerAgent(riskAgent);

      const agent = registry.getAgent('risk-agent-v1');
      expect(agent).toBeDefined();
      expect(agent?.metadata.name).toBe('Risk Management Agent');
      expect(agent?.status).toBe('PENDING_APPROVAL');
    });

    it('should prevent duplicate agent registration', async () => {
      const riskAgent = new RiskAgent();
      await registry.registerAgent(riskAgent);

      await expect(registry.registerAgent(riskAgent)).rejects.toThrow(
        'Agent with id risk-agent-v1 is already registered'
      );
    });

    it('should activate agent after approval', async () => {
      const riskAgent = new RiskAgent();
      await registry.registerAgent(riskAgent);

      // Mock RBAC permission
      jest.spyOn(rbacService, 'hasPermission').mockResolvedValue(true);

      const requestId = await registry.requestActivation(
        'risk-agent-v1',
        'test-user',
        'Testing activation'
      );

      await registry.approveActivation(requestId, 'admin-user', true);

      const agent = registry.getAgent('risk-agent-v1');
      expect(agent?.status).toBe('ACTIVE');
    });

    it('should reject activation without admin permission', async () => {
      const riskAgent = new RiskAgent();
      await registry.registerAgent(riskAgent);

      // Mock RBAC permission as false
      jest.spyOn(rbacService, 'hasPermission').mockResolvedValue(false);

      const requestId = await registry.requestActivation(
        'risk-agent-v1',
        'test-user',
        'Testing activation'
      );

      await expect(
        registry.approveActivation(requestId, 'non-admin-user', true)
      ).rejects.toThrow('does not have permission to approve');
    });

    it('should deactivate an active agent', async () => {
      const riskAgent = new RiskAgent();
      await registry.registerAgent(riskAgent);

      // Mock activation
      jest.spyOn(rbacService, 'hasPermission').mockResolvedValue(true);
      const requestId = await registry.requestActivation(
        'risk-agent-v1',
        'test-user',
        'Testing'
      );
      await registry.approveActivation(requestId, 'admin-user', true);

      await registry.deactivateAgent('risk-agent-v1');

      const agent = registry.getAgent('risk-agent-v1');
      expect(agent?.status).toBe('INACTIVE');
    });

    it('should get agents by type', async () => {
      const riskAgent = new RiskAgent();
      const liquidityAgent = new LiquidityAgent();

      await registry.registerAgent(riskAgent);
      await registry.registerAgent(liquidityAgent);

      const riskAgents = registry.getAgentsByType('RISK');
      const liquidityAgents = registry.getAgentsByType('LIQUIDITY');

      expect(riskAgents).toHaveLength(1);
      expect(liquidityAgents).toHaveLength(1);
      expect(riskAgents[0].metadata.type).toBe('RISK');
      expect(liquidityAgents[0].metadata.type).toBe('LIQUIDITY');
    });

    it('should return correct statistics', async () => {
      const riskAgent = new RiskAgent();
      const liquidityAgent = new LiquidityAgent();

      await registry.registerAgent(riskAgent);
      await registry.registerAgent(liquidityAgent);

      const stats = registry.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.active).toBe(0);
      expect(stats.byType.RISK).toBe(1);
      expect(stats.byType.LIQUIDITY).toBe(1);
    });
  });

  describe('RiskAgent', () => {
    let riskAgent: RiskAgent;

    beforeEach(async () => {
      riskAgent = new RiskAgent();
      await riskAgent.initialize();
    });

    it('should pass analysis with valid parameters', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 1.0,
        expectedAmountOut: 1.01,
        marketData: {
          slippage: 0.01,
          priceImpact: 0.015,
          liquidity: 1000,
          volatility: 0.02,
        },
        riskParams: {
          maxSlippage: 0.015,
          maxPriceImpact: 0.025,
          maxLoss: 0.1,
          minProfit: 0.005,
        },
      };

      const result = await riskAgent.analyze(context);

      expect(result.success).toBe(true);
      expect(result.recommendation).toBe('PROCEED');
      expect(result.confidence).toBe('HIGH');
    });

    it('should abort on excessive slippage', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        marketData: {
          slippage: 0.03, // 3% slippage, exceeds default 1.5%
        },
      };

      const result = await riskAgent.analyze(context);

      expect(result.success).toBe(false);
      expect(result.recommendation).toBe('ABORT');
      expect(result.reasoning).toContain('Slippage');
    });

    it('should abort on insufficient profit', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 1.0,
        expectedAmountOut: 1.002, // Only 0.002 SOL profit, below 0.005 threshold
      };

      const result = await riskAgent.analyze(context);

      expect(result.success).toBe(false);
      expect(result.recommendation).toBe('ABORT');
      expect(result.reasoning).toContain('profit');
    });
  });

  describe('LiquidityAgent', () => {
    let liquidityAgent: LiquidityAgent;

    beforeEach(async () => {
      liquidityAgent = new LiquidityAgent();
      await liquidityAgent.initialize();
    });

    it('should recommend adjustments for large trade size', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 10, // 10 SOL
        marketData: {
          liquidity: 100, // 100 SOL pool, trade is 10% of pool
        },
      };

      const result = await liquidityAgent.analyze(context);

      expect(result.recommendation).toBe('ADJUST');
      expect(result.adjustments).toBeDefined();
      expect(result.adjustments?.suggestedTradeSize).toBeLessThan(10);
    });

    it('should proceed with appropriate trade size', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 1, // 1 SOL
        marketData: {
          liquidity: 1000, // 1000 SOL pool, trade is 0.1% of pool
          volatility: 0.01,
        },
      };

      const result = await liquidityAgent.analyze(context);

      expect(result.success).toBe(true);
      expect(result.recommendation).toBe('PROCEED');
    });
  });

  describe('ExecutionAgent', () => {
    let executionAgent: ExecutionAgent;

    beforeEach(async () => {
      executionAgent = new ExecutionAgent();
      await executionAgent.initialize();
    });

    it('should provide execution optimizations', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'FLASH_LOAN',
      };

      const result = await executionAgent.analyze(context);

      expect(result.success).toBe(true);
      expect(result.metadata?.optimalPriorityFee).toBeDefined();
      expect(result.metadata?.optimalJitoTip).toBeDefined();
    });

    it('should respect priority fee hard cap', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
      };

      const result = await executionAgent.analyze(context);

      expect(result.metadata?.optimalPriorityFee).toBeLessThanOrEqual(10_000_000);
    });
  });

  describe('ProfitOptimizationAgent', () => {
    let profitAgent: ProfitOptimizationAgent;

    beforeEach(async () => {
      profitAgent = new ProfitOptimizationAgent();
      await profitAgent.initialize();
    });

    it('should calculate net profit correctly', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 1.0,
        expectedAmountOut: 1.1, // 0.1 SOL gross profit
      };

      const result = await profitAgent.analyze(context);

      expect(result.success).toBe(true);
      expect(result.metadata?.netProfit).toBeDefined();
      expect(result.metadata?.feeBreakdown).toBeDefined();
    });

    it('should abort on insufficient profit margin', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 1.0,
        expectedAmountOut: 1.001, // Only 0.1% profit, below 0.3% threshold
      };

      const result = await profitAgent.analyze(context);

      expect(result.success).toBe(false);
      expect(result.recommendation).toBe('ABORT');
      expect(result.reasoning).toContain('Profit margin below threshold');
    });
  });

  describe('OracleService', () => {
    it('should coordinate multiple agents', async () => {
      const riskAgent = new RiskAgent();
      const liquidityAgent = new LiquidityAgent();

      await oracleService.getRegistry().registerAgent(riskAgent);
      await oracleService.getRegistry().registerAgent(liquidityAgent);

      // Mock activation
      jest.spyOn(rbacService, 'hasPermission').mockResolvedValue(true);

      const request1 = await oracleService
        .getRegistry()
        .requestActivation('risk-agent-v1', 'test-user', 'Test');
      await oracleService
        .getRegistry()
        .approveActivation(request1, 'admin', true);

      const request2 = await oracleService
        .getRegistry()
        .requestActivation('liquidity-agent-v1', 'test-user', 'Test');
      await oracleService
        .getRegistry()
        .approveActivation(request2, 'admin', true);

      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        amountIn: 1.0,
        expectedAmountOut: 1.01,
        marketData: {
          liquidity: 1000,
          slippage: 0.01,
        },
      };

      const result = await oracleService.analyzeExecution(context);

      expect(result.agentResults).toHaveLength(2);
      expect(result.overallRecommendation).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should abort if risk agent recommends abort', async () => {
      const riskAgent = new RiskAgent();

      await oracleService.getRegistry().registerAgent(riskAgent);

      jest.spyOn(rbacService, 'hasPermission').mockResolvedValue(true);
      const request = await oracleService
        .getRegistry()
        .requestActivation('risk-agent-v1', 'test-user', 'Test');
      await oracleService.getRegistry().approveActivation(request, 'admin', true);

      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
        marketData: {
          slippage: 0.05, // Excessive slippage
        },
      };

      const result = await oracleService.analyzeExecution(context);

      expect(result.overallRecommendation).toBe('ABORT');
      expect(result.abortReasons).toBeDefined();
    });

    it('should proceed when no agents are active', async () => {
      const context: AnalysisContext = {
        botId: 'test-bot',
        userId: 'test-user',
        executionId: 'test-exec',
        botType: 'ARBITRAGE',
      };

      const result = await oracleService.analyzeExecution(context);

      expect(result.overallRecommendation).toBe('PROCEED');
      expect(result.confidence).toBe('LOW');
      expect(result.agentResults).toHaveLength(0);
    });
  });
});
