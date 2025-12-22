/**
 * Portfolio Analytics Service Tests
 * 
 * Tests for wallet scoring and portfolio analysis functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Connection, PublicKey } from '@solana/web3.js';
import { PortfolioAnalyticsService } from '../portfolioAnalytics';

// Mock Solana Connection
jest.mock('@solana/web3.js');

describe('PortfolioAnalyticsService', () => {
  let service: PortfolioAnalyticsService;
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    mockConnection = {
      getBalance: jest.fn(),
      getSignaturesForAddress: jest.fn(),
      getParsedTokenAccountsByOwner: jest.fn(),
    } as unknown as jest.Mocked<Connection>;

    service = new PortfolioAnalyticsService(mockConnection);
  });

  describe('Scoring Algorithm', () => {
    it('should calculate balance score correctly for high-value wallet', async () => {
      // Mock high balance (100 SOL = 10,000 USD at $100/SOL)
      mockConnection.getBalance.mockResolvedValue(100 * 1e9);
      mockConnection.getSignaturesForAddress.mockResolvedValue([]);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [],
        context: { slot: 0 },
      });

      const testAddress = 'TestAddress111111111111111111111111111111111';
      const analysis = await service.analyzePortfolio(testAddress);

      expect(analysis.scoringMetrics.balanceScore).toBeGreaterThanOrEqual(50);
    });

    it('should calculate transaction score based on count and success rate', async () => {
      mockConnection.getBalance.mockResolvedValue(1e9);
      
      // Mock 100 transactions with 95% success rate
      const mockSignatures = Array(100).fill(null).map((_, i) => ({
        signature: `sig${i}`,
        slot: 1000 + i,
        err: i < 95 ? null : { error: 'failed' },
        memo: null,
        blockTime: Date.now() / 1000 - (100 - i) * 86400,
      }));
      
      mockConnection.getSignaturesForAddress.mockResolvedValue(mockSignatures);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [],
        context: { slot: 0 },
      });

      const testAddress = 'TestAddress111111111111111111111111111111111';
      const analysis = await service.analyzePortfolio(testAddress);

      expect(analysis.scoringMetrics.transactionScore).toBeGreaterThanOrEqual(30);
      expect(analysis.transactionStats.successRate).toBeCloseTo(95, 1);
    });

    it('should detect NFTs correctly', async () => {
      mockConnection.getBalance.mockResolvedValue(1e9);
      mockConnection.getSignaturesForAddress.mockResolvedValue([]);
      
      // Mock token accounts with NFTs (decimals=0, amount=1)
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'NFT1',
                    tokenAmount: { uiAmount: 1, decimals: 0, amount: '1' },
                  },
                },
              },
            },
          },
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'NFT2',
                    tokenAmount: { uiAmount: 1, decimals: 0, amount: '1' },
                  },
                },
              },
            },
          },
        ],
        context: { slot: 0 },
      } as never);

      const testAddress = 'TestAddress111111111111111111111111111111111';
      const analysis = await service.analyzePortfolio(testAddress);

      expect(analysis.nftCount).toBe(2);
      expect(analysis.scoringMetrics.nftScore).toBeGreaterThan(0);
    });

    it('should classify wallet tier correctly', async () => {
      mockConnection.getBalance.mockResolvedValue(100 * 1e9); // 100 SOL
      
      const mockSignatures = Array(1000).fill(null).map((_, i) => ({
        signature: `sig${i}`,
        slot: 1000 + i,
        err: null,
        memo: null,
        blockTime: Date.now() / 1000 - 365 * 86400 + i * 86400 / 1000,
      }));
      
      mockConnection.getSignaturesForAddress.mockResolvedValue(mockSignatures);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: Array(50).fill(null).map((_, i) => ({
          account: {
            data: {
              parsed: {
                info: {
                  mint: `Token${i}`,
                  tokenAmount: { uiAmount: 100, decimals: 6, amount: '100000000' },
                },
              },
            },
          },
        })),
        context: { slot: 0 },
      } as never);

      const testAddress = 'TestAddress111111111111111111111111111111111';
      const analysis = await service.analyzePortfolio(testAddress);

      expect(['WHALE', 'DEGEN', 'ACTIVE']).toContain(analysis.scoringMetrics.tier);
      expect(analysis.scoringMetrics.totalScore).toBeGreaterThanOrEqual(50);
    });

    it('should assess risk level correctly for new wallet', async () => {
      mockConnection.getBalance.mockResolvedValue(0.1 * 1e9); // 0.1 SOL
      
      // New wallet with few transactions
      const mockSignatures = Array(5).fill(null).map((_, i) => ({
        signature: `sig${i}`,
        slot: 1000 + i,
        err: i < 3 ? null : { error: 'failed' },
        memo: null,
        blockTime: Date.now() / 1000 - i * 86400,
      }));
      
      mockConnection.getSignaturesForAddress.mockResolvedValue(mockSignatures);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [],
        context: { slot: 0 },
      });

      const testAddress = 'TestAddress111111111111111111111111111111111';
      const analysis = await service.analyzePortfolio(testAddress);

      expect(['HIGH', 'CRITICAL']).toContain(analysis.scoringMetrics.riskLevel);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      mockConnection.getBalance.mockRejectedValue(new Error('Connection failed'));

      const testAddress = 'TestAddress111111111111111111111111111111111';
      
      await expect(service.analyzePortfolio(testAddress)).rejects.toThrow();
    });

    it('should handle invalid addresses', async () => {
      const invalidAddress = 'invalid';
      
      await expect(service.analyzePortfolio(invalidAddress)).rejects.toThrow();
    });
  });

  describe('Data Source Tracking', () => {
    it('should track data sources used', async () => {
      mockConnection.getBalance.mockResolvedValue(1e9);
      mockConnection.getSignaturesForAddress.mockResolvedValue([]);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [],
        context: { slot: 0 },
      });

      const testAddress = 'TestAddress111111111111111111111111111111111';
      const analysis = await service.analyzePortfolio(testAddress);

      expect(analysis.dataSource).toBeDefined();
      expect(analysis.dataSource.jupiter).toBeDefined();
      expect(analysis.dataSource.onchain).toBeDefined();
    });
  });
});

describe('Audit Logger', () => {
  it('should log wallet analysis operations', () => {
    const { auditLog } = require('../auditLogger');
    
    auditLog.walletAnalysis({
      walletAddress: 'TestAddress111111111111111111111111111111111',
      score: 75,
      tier: 'ACTIVE',
      riskLevel: 'MEDIUM',
      dataSource: { jupiter: true, solanascan: false, onchain: true },
      duration: 1500,
      success: true,
    });

    const stats = auditLog.getStatistics();
    expect(stats.totalOperations).toBeGreaterThan(0);
  });

  it('should calculate statistics correctly', () => {
    const { auditLog } = require('../auditLogger');
    
    // Log multiple operations
    for (let i = 0; i < 10; i++) {
      auditLog.walletAnalysis({
        walletAddress: `Address${i}`,
        score: 50 + i * 5,
        tier: 'ACTIVE',
        riskLevel: 'MEDIUM',
        dataSource: { jupiter: true, solanascan: false, onchain: true },
        duration: 1000 + i * 100,
        success: i < 9, // 90% success rate
      });
    }

    const stats = auditLog.getStatistics();
    expect(stats.successRate).toBeCloseTo(90, 0);
    expect(stats.totalOperations).toBeGreaterThanOrEqual(10);
  });
});
