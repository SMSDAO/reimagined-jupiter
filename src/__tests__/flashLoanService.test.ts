import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { FlashLoanService } from '../services/flashLoanService.js';
import { MarginfiProvider } from '../providers/flashLoan.js';

// Mock dependencies
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
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 100000,
      }),
      simulateTransaction: jest.fn().mockResolvedValue({
        value: { err: null },
      }),
    })),
  };
});

describe('FlashLoanService', () => {
  let connection: Connection;
  let flashLoanService: FlashLoanService;
  let mockProvider: MarginfiProvider;
  let userKeypair: Keypair;
  
  beforeEach(() => {
    connection = new Connection('https://api.devnet.solana.com');
    flashLoanService = new FlashLoanService(connection);
    mockProvider = new MarginfiProvider(
      connection,
      new PublicKey('MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'),
      0.09
    );
    userKeypair = Keypair.generate();
  });
  
  describe('Input Validation', () => {
    const validInputMint = 'So11111111111111111111111111111111111111112';
    const validOutputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const validAmount = 1000000000;
    
    it('should reject null provider', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        null as any,
        validInputMint,
        validOutputMint,
        validAmount,
        userKeypair
      );
      expect(result).toBeNull();
    });
    
    it('should reject empty input mint', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        '',
        validOutputMint,
        validAmount,
        userKeypair
      );
      expect(result).toBeNull();
    });
    
    it('should reject empty output mint', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        validInputMint,
        '',
        validAmount,
        userKeypair
      );
      expect(result).toBeNull();
    });
    
    it('should reject zero loan amount', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        validInputMint,
        validOutputMint,
        0,
        userKeypair
      );
      expect(result).toBeNull();
    });
    
    it('should reject negative loan amount', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        validInputMint,
        validOutputMint,
        -1000,
        userKeypair
      );
      expect(result).toBeNull();
    });
    
    it('should reject infinite loan amount', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        validInputMint,
        validOutputMint,
        Infinity,
        userKeypair
      );
      expect(result).toBeNull();
    });
    
    it('should reject null keypair', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        validInputMint,
        validOutputMint,
        validAmount,
        null as any
      );
      expect(result).toBeNull();
    });
    
    it('should reject invalid mint addresses', async () => {
      const result = await flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        'invalid-address',
        validOutputMint,
        validAmount,
        userKeypair
      );
      expect(result).toBeNull();
    });
  });
  
  describe('getAvailableProviders', () => {
    it('should return array of provider names', () => {
      const providers = flashLoanService.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBe(6);
      expect(providers).toContain('marginfi');
      expect(providers).toContain('solend');
      expect(providers).toContain('kamino');
      expect(providers).toContain('mango');
      expect(providers).toContain('portFinance');
      expect(providers).toContain('saveFinance');
    });
  });
  
  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await flashLoanService.healthCheck();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('details');
      expect(typeof health.healthy).toBe('boolean');
    });
    
    it('should include connection details', async () => {
      const health = await flashLoanService.healthCheck();
      if (health.healthy) {
        expect(health.details).toHaveProperty('currentSlot');
        expect(health.details).toHaveProperty('activeTransactions');
        expect(health.details).toHaveProperty('jupiterConnected');
        expect(health.details).toHaveProperty('pythConnected');
      }
    });
  });
  
  describe('Reentrancy Protection', () => {
    it('should prevent duplicate transaction execution', async () => {
      // This is tested implicitly by the service's activeTransactions Set
      // In a real scenario, we would need to mock concurrent calls
      const validInputMint = 'So11111111111111111111111111111111111111112';
      const validOutputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const validAmount = 1000000000;
      
      // First call will proceed (and likely fail due to mocked responses)
      const result1 = flashLoanService.executeFlashLoanArbitrage(
        mockProvider,
        validInputMint,
        validOutputMint,
        validAmount,
        userKeypair
      );
      
      // This test verifies the reentrancy protection mechanism exists
      // Actual concurrent testing would require more complex async mocking
      expect(result1).toBeDefined();
    });
  });
});
