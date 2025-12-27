import { AnalyticsLogger } from "../services/analyticsLogger.js";
import { existsSync, rmSync } from "fs";

describe("AnalyticsLogger", () => {
  let logger: AnalyticsLogger;
  const testLogsDir = "/tmp/test-logs";

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testLogsDir)) {
      rmSync(testLogsDir, { recursive: true });
    }
    logger = new AnalyticsLogger(testLogsDir);
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testLogsDir)) {
      rmSync(testLogsDir, { recursive: true });
    }
  });

  describe("logTransaction", () => {
    it("should log a successful transaction", () => {
      logger.logTransaction({
        type: "arbitrage",
        signature: "test-signature-123",
        success: true,
        profit: 100,
        cost: 5,
        netProfit: 95,
        details: {
          strategy: "flash-loan",
          tokens: ["SOL", "USDC"],
        },
      });

      const stats = logger.getTransactionStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.totalProfit).toBe(100);
      expect(stats.totalCost).toBe(5);
      expect(stats.totalNetProfit).toBe(95);
    });

    it("should log a failed transaction", () => {
      logger.logTransaction({
        type: "arbitrage",
        success: false,
        details: {
          error: "Transaction failed",
        },
      });

      const stats = logger.getTransactionStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it("should track transactions by type", () => {
      logger.logTransaction({
        type: "arbitrage",
        success: true,
        profit: 50,
        details: {},
      });

      logger.logTransaction({
        type: "distribution",
        success: true,
        profit: 30,
        details: {},
      });

      logger.logTransaction({
        type: "arbitrage",
        success: true,
        profit: 20,
        details: {},
      });

      const stats = logger.getTransactionStats();
      expect(stats.byType.arbitrage).toBe(2);
      expect(stats.byType.distribution).toBe(1);
    });
  });

  describe("logProfitAllocation", () => {
    it("should log profit allocation", () => {
      logger.logProfitAllocation({
        totalProfit: 100,
        reserveAmount: 70,
        gasAmount: 20,
        daoAmount: 10,
        signature: "allocation-sig-123",
        success: true,
      });

      const stats = logger.getProfitAllocationStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.totalDistributed).toBe(100);
      expect(stats.totalReserve).toBe(70);
      expect(stats.totalGas).toBe(20);
      expect(stats.totalDao).toBe(10);
    });

    it("should handle failed allocations", () => {
      logger.logProfitAllocation({
        totalProfit: 100,
        reserveAmount: 0,
        gasAmount: 0,
        daoAmount: 0,
        success: false,
      });

      const stats = logger.getProfitAllocationStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(1);
      expect(stats.totalDistributed).toBe(0);
    });
  });

  describe("logArbitrageExecution", () => {
    it("should log successful arbitrage execution", () => {
      logger.logArbitrageExecution({
        strategy: "flash-loan",
        tokens: ["SOL", "USDC", "SOL"],
        estimatedProfit: 100,
        actualProfit: 95,
        gasCost: 5,
        netProfit: 90,
        signature: "arb-sig-123",
        success: true,
      });

      const stats = logger.getArbitrageStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.totalEstimatedProfit).toBe(100);
      expect(stats.totalActualProfit).toBe(95);
      expect(stats.totalGasCost).toBe(5);
      expect(stats.totalNetProfit).toBe(90);
    });

    it("should calculate average slippage", () => {
      logger.logArbitrageExecution({
        strategy: "flash-loan",
        tokens: ["SOL", "USDC"],
        estimatedProfit: 100,
        actualProfit: 95,
        gasCost: 5,
        netProfit: 90,
        success: true,
      });

      logger.logArbitrageExecution({
        strategy: "triangular",
        tokens: ["USDC", "USDT", "USDC"],
        estimatedProfit: 50,
        actualProfit: 45,
        gasCost: 2,
        netProfit: 43,
        success: true,
      });

      const stats = logger.getArbitrageStats();
      // Expected slippage: ((150 - 140) / 150) * 100 = 6.67%
      expect(stats.averageSlippage).toBeCloseTo(6.67, 1);
    });

    it("should track by strategy", () => {
      logger.logArbitrageExecution({
        strategy: "flash-loan",
        tokens: ["SOL", "USDC"],
        estimatedProfit: 100,
        gasCost: 5,
        success: true,
      });

      logger.logArbitrageExecution({
        strategy: "triangular",
        tokens: ["USDC", "USDT"],
        estimatedProfit: 50,
        gasCost: 2,
        success: true,
      });

      logger.logArbitrageExecution({
        strategy: "flash-loan",
        tokens: ["SOL", "USDT"],
        estimatedProfit: 75,
        gasCost: 3,
        success: true,
      });

      const stats = logger.getArbitrageStats();
      expect(stats.byStrategy["flash-loan"]).toBe(2);
      expect(stats.byStrategy["triangular"]).toBe(1);
    });
  });

  describe("generateReport", () => {
    it("should generate comprehensive report", () => {
      // Log some transactions
      logger.logTransaction({
        type: "arbitrage",
        success: true,
        profit: 100,
        cost: 5,
        netProfit: 95,
        details: {},
      });

      logger.logProfitAllocation({
        totalProfit: 100,
        reserveAmount: 70,
        gasAmount: 20,
        daoAmount: 10,
        success: true,
      });

      logger.logArbitrageExecution({
        strategy: "flash-loan",
        tokens: ["SOL", "USDC"],
        estimatedProfit: 100,
        actualProfit: 95,
        gasCost: 5,
        netProfit: 90,
        success: true,
      });

      const report = logger.generateReport();
      expect(report).toContain("ANALYTICS REPORT");
      expect(report).toContain("Transaction Statistics");
      expect(report).toContain("Profit Distribution");
      expect(report).toContain("Arbitrage Executions");
      expect(report).toContain("Total Transactions: 1");
      expect(report).toContain("Total Distributions: 1");
      expect(report).toContain("Total Executions: 1");
    });
  });

  describe("exportToJSON", () => {
    it("should export all data as JSON", () => {
      logger.logTransaction({
        type: "arbitrage",
        success: true,
        profit: 100,
        details: {},
      });

      const json = logger.exportToJSON();
      const data = JSON.parse(json);

      expect(data).toHaveProperty("transactions");
      expect(data).toHaveProperty("profitAllocations");
      expect(data).toHaveProperty("arbitrageExecutions");
      expect(data).toHaveProperty("statistics");
      expect(data.transactions).toHaveLength(1);
    });
  });

  describe("clearLogs", () => {
    it("should clear all logs", () => {
      logger.logTransaction({
        type: "arbitrage",
        success: true,
        profit: 100,
        details: {},
      });

      let stats = logger.getTransactionStats();
      expect(stats.total).toBe(1);

      logger.clearLogs();

      stats = logger.getTransactionStats();
      expect(stats.total).toBe(0);
    });
  });
});
