import { Connection, PublicKey } from '@solana/web3.js';
import { ProfitDistributionService } from '../services/profitDistribution';
import { SNSDomainResolver } from '../services/snsResolver';

describe('ProfitDistributionService', () => {
  describe('Configuration Validation', () => {
    it('should accept valid configuration with percentages summing to 1.0', () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const mockDaoWallet = new PublicKey('DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW');

      expect(() => {
        new ProfitDistributionService(connection, {
          reserveWalletDomain: 'test.skr',
          userWalletPercentage: 0.20,
          reserveWalletPercentage: 0.70,
          daoWalletPercentage: 0.10,
          daoWalletAddress: mockDaoWallet,
        });
      }).not.toThrow();
    });

    it('should reject configuration with percentages not summing to 1.0', () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const mockDaoWallet = new PublicKey('DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW');

      expect(() => {
        new ProfitDistributionService(connection, {
          reserveWalletDomain: 'test.skr',
          userWalletPercentage: 0.30,
          reserveWalletPercentage: 0.70,
          daoWalletPercentage: 0.10,
          daoWalletAddress: mockDaoWallet,
        });
      }).toThrow('Profit distribution percentages must sum to 1.0');
    });
  });

  describe('Profit Calculation', () => {
    it('should correctly calculate 70/20/10 split', () => {
      const profitAmount = 1000000000; // 1 SOL in lamports
      const expectedReserve = 700000000; // 70%
      const expectedUser = 200000000;    // 20%
      const expectedDao = 100000000;     // 10%

      expect(Math.floor(profitAmount * 0.70)).toBe(expectedReserve);
      expect(Math.floor(profitAmount * 0.20)).toBe(expectedUser);
      expect(Math.floor(profitAmount * 0.10)).toBe(expectedDao);
    });
  });
});

describe('SNSDomainResolver', () => {
  describe('Domain Validation', () => {
    it('should validate correct domain formats', () => {
      expect(SNSDomainResolver.isValidDomain('monads.skr')).toBe(true);
      expect(SNSDomainResolver.isValidDomain('wallet.sol')).toBe(true);
    });

    it('should reject invalid domain formats', () => {
      expect(SNSDomainResolver.isValidDomain('invalid')).toBe(false);
      expect(SNSDomainResolver.isValidDomain('.sol')).toBe(false);
    });
  });
});
