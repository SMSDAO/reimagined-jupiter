import { Connection, PublicKey } from '@solana/web3.js';
import { ProviderManager } from '../services/providerManager.js';

// Mock Connection to avoid actual network calls in tests
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getSlot: jest.fn().mockResolvedValue(100000),
      getRecentPrioritizationFees: jest.fn().mockResolvedValue([
        { prioritizationFee: 10000 },
        { prioritizationFee: 15000 },
        { prioritizationFee: 12000 },
      ]),
    })),
  };
});

describe('ProviderManager', () => {
  let connection: Connection;
  let providerManager: ProviderManager;
  
  beforeEach(() => {
    connection = new Connection('https://api.devnet.solana.com');
    providerManager = new ProviderManager(connection);
  });
  
  describe('Initialization', () => {
    it('should initialize with default providers', () => {
      const stats = providerManager.getStatistics();
      expect(stats.totalProviders).toBe(6);
      expect(stats.preferredOrder).toEqual([
        'marginfi',
        'solend',
        'kamino',
        'mango',
        'portFinance',
        'saveFinance',
      ]);
    });
  });
  
  describe('getProvider', () => {
    it('should return a provider by name', () => {
      const provider = providerManager.getProvider('marginfi');
      expect(provider).not.toBeNull();
      expect(provider?.getName()).toBe('Marginfi');
    });
    
    it('should return null for invalid provider name', () => {
      const provider = providerManager.getProvider('invalid');
      expect(provider).toBeNull();
    });
    
    it('should return null for empty provider name', () => {
      const provider = providerManager.getProvider('');
      expect(provider).toBeNull();
    });
  });
  
  describe('setPreferredProviders', () => {
    it('should update preferred providers order', () => {
      providerManager.setPreferredProviders(['solend', 'marginfi', 'kamino']);
      const stats = providerManager.getStatistics();
      expect(stats.preferredOrder).toEqual(['solend', 'marginfi', 'kamino']);
    });
    
    it('should filter out invalid providers', () => {
      providerManager.setPreferredProviders(['solend', 'invalid', 'marginfi']);
      const stats = providerManager.getStatistics();
      expect(stats.preferredOrder).toEqual(['solend', 'marginfi']);
    });
    
    it('should handle empty array', () => {
      providerManager.setPreferredProviders([]);
      const stats = providerManager.getStatistics();
      // Should keep previous order
      expect(stats.preferredOrder.length).toBeGreaterThan(0);
    });
  });
  
  describe('markProviderHealthy/Unhealthy', () => {
    it('should mark provider as unhealthy', () => {
      providerManager.markProviderUnhealthy('marginfi');
      const stats = providerManager.getStatistics();
      expect(stats.healthyProviders).toBeLessThan(stats.totalProviders);
    });
    
    it('should mark provider as healthy', () => {
      providerManager.markProviderUnhealthy('marginfi');
      providerManager.markProviderHealthy('marginfi');
      const stats = providerManager.getStatistics();
      expect(stats.healthyProviders).toBe(stats.totalProviders);
    });
    
    it('should handle invalid provider names gracefully', () => {
      expect(() => {
        providerManager.markProviderUnhealthy('invalid');
      }).not.toThrow();
    });
  });
  
  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const stats = providerManager.getStatistics();
      expect(stats).toHaveProperty('totalProviders');
      expect(stats).toHaveProperty('healthyProviders');
      expect(stats).toHaveProperty('preferredOrder');
      expect(typeof stats.totalProviders).toBe('number');
      expect(typeof stats.healthyProviders).toBe('number');
      expect(Array.isArray(stats.preferredOrder)).toBe(true);
    });
  });
});
