/**
 * Risk Controller Tests
 */

import { RiskController, getRiskController } from '../lib/risk-controller';

describe('RiskController', () => {
  let riskController: RiskController;

  beforeEach(() => {
    riskController = new RiskController({
      maxSlippageBps: 100,
      maxDrawdownBps: 500,
      minProfitThresholdSol: 0.01,
      maxTradeSizeSol: 10,
      maxDailyLossSol: 1.0,
      maxConsecutiveLosses: 3,
      emergencyStopEnabled: false,
    });
  });

  describe('Trade Evaluation', () => {
    it('should approve trade with acceptable parameters', () => {
      const assessment = riskController.evaluateTrade(5.0, 0.05, 50);

      expect(assessment.approved).toBe(true);
      expect(assessment.riskScore).toBeLessThan(70);
      expect(assessment.checks.slippageCheck).toBe(true);
      expect(assessment.checks.tradeSizeCheck).toBe(true);
    });

    it('should reject trade with high slippage', () => {
      const assessment = riskController.evaluateTrade(5.0, 0.05, 150);

      expect(assessment.approved).toBe(false);
      expect(assessment.checks.slippageCheck).toBe(false);
      expect(assessment.reason).toContain('Slippage too high');
    });

    it('should reject trade with excessive size', () => {
      const assessment = riskController.evaluateTrade(15.0, 0.05, 50);

      expect(assessment.approved).toBe(false);
      expect(assessment.checks.tradeSizeCheck).toBe(false);
      expect(assessment.reason).toContain('Trade size too large');
    });
  });

  describe('Trade Recording', () => {
    it('should record successful trade', () => {
      riskController.recordSuccess(0.05);

      const metrics = riskController.getMetrics();
      expect(metrics.totalTrades).toBe(1);
      expect(metrics.successfulTrades).toBe(1);
      expect(metrics.totalProfitSol).toBe(0.05);
      expect(metrics.consecutiveLosses).toBe(0);
    });

    it('should record failed trade', () => {
      riskController.recordFailure(0.02);

      const metrics = riskController.getMetrics();
      expect(metrics.totalTrades).toBe(1);
      expect(metrics.failedTrades).toBe(1);
      expect(metrics.totalLossSol).toBe(0.02);
      expect(metrics.consecutiveLosses).toBe(1);
    });

    it('should reset consecutive losses on success', () => {
      riskController.recordFailure(0.01);
      riskController.recordFailure(0.01);
      expect(riskController.getMetrics().consecutiveLosses).toBe(2);

      riskController.recordSuccess(0.05);
      expect(riskController.getMetrics().consecutiveLosses).toBe(0);
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(() => {
      riskController.recordSuccess(0.05);
      riskController.recordSuccess(0.03);
      riskController.recordFailure(0.01);
      riskController.recordSuccess(0.04);
      riskController.recordFailure(0.02);
    });

    it('should calculate correct win rate', () => {
      const winRate = riskController.getWinRate();
      expect(winRate).toBe(60);
    });

    it('should calculate correct net profit/loss', () => {
      const netPnL = riskController.getNetProfitLoss();
      expect(netPnL).toBeCloseTo(0.09, 2);
    });
  });
});
