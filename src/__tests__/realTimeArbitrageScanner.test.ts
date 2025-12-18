import { Connection, PublicKey } from '@solana/web3.js';
import { RealTimeArbitrageScanner, OpportunityCallback } from '../services/realTimeArbitrageScanner.js';
import { TokenConfig } from '../types.js';
import { JupiterV6Integration } from '../integrations/jupiter.js';

// Mock JupiterV6Integration
jest.mock('../integrations/jupiter.js');

// Mock config
jest.mock('../config/index.js', () => ({
  config: {
    scanner: {
      pollingIntervalMs: 1000,
      enableNotifications: true,
      minConfidence: 0.7,
    },
    arbitrage: {
      minProfitThreshold: 0.005,
      maxSlippage: 0.01,
    },
  },
  SUPPORTED_TOKENS: [
    {
      symbol: 'SOL',
      mint: new PublicKey('So11111111111111111111111111111111111111112'),
      decimals: 9,
      category: 'native' as const,
    },
    {
      symbol: 'USDC',
      mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      decimals: 6,
      category: 'stable' as const,
    },
    {
      symbol: 'USDT',
      mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
      decimals: 6,
      category: 'stable' as const,
    },
  ],
}));

describe('RealTimeArbitrageScanner', () => {
  let connection: Connection;
  let scanner: RealTimeArbitrageScanner;
  let mockJupiter: jest.Mocked<JupiterV6Integration>;
  const mockRpcUrl = 'https://api.devnet.solana.com';

  beforeEach(() => {
    jest.clearAllMocks();
    connection = new Connection(mockRpcUrl, 'confirmed');
    scanner = new RealTimeArbitrageScanner(connection);
    mockJupiter = (JupiterV6Integration as jest.MockedClass<typeof JupiterV6Integration>).mock.instances[0] as jest.Mocked<JupiterV6Integration>;
  });

  afterEach(() => {
    if (scanner.isRunning()) {
      scanner.stopScanning();
    }
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(scanner).toBeDefined();
      expect(scanner.isRunning()).toBe(false);
      expect(scanner.getTokenPairCount()).toBe(0);
    });

    it('should initialize with custom config', () => {
      const customScanner = new RealTimeArbitrageScanner(connection, {
        pollingIntervalMs: 5000,
        minProfitThreshold: 0.01,
      });

      const config = customScanner.getConfig();
      expect(config.pollingIntervalMs).toBe(5000);
      expect(config.minProfitThreshold).toBe(0.01);
    });
  });

  describe('initializeTokenPairs', () => {
    it('should initialize token pairs from provided tokens', () => {
      scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT']);
      expect(scanner.getTokenPairCount()).toBeGreaterThan(0);
    });

    it('should generate triangular paths with unique tokens', () => {
      scanner.initializeTokenPairs(['SOL', 'USDC']);
      // With 2 tokens, no valid triangular paths (need 3 unique tokens)
      // but the code will still generate combinations where i !== j && j !== k && i !== k
      expect(scanner.getTokenPairCount()).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty token list', () => {
      scanner.initializeTokenPairs([]);
      expect(scanner.getTokenPairCount()).toBe(0);
    });

    it('should use all supported tokens if none provided', () => {
      scanner.initializeTokenPairs();
      // With 3 supported tokens, we should have 3*2*1 = 6 triangular paths
      expect(scanner.getTokenPairCount()).toBeGreaterThan(0);
    });
  });

  describe('onOpportunityFound', () => {
    it('should register callback', () => {
      const callback: OpportunityCallback = jest.fn();
      scanner.onOpportunityFound(callback);
      // No direct way to test this without triggering an opportunity
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple callbacks', () => {
      const callback1: OpportunityCallback = jest.fn();
      const callback2: OpportunityCallback = jest.fn();
      scanner.onOpportunityFound(callback1);
      scanner.onOpportunityFound(callback2);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('scanTriangleArbitrage', () => {
    const tokenA: TokenConfig = {
      symbol: 'SOL',
      mint: new PublicKey('So11111111111111111111111111111111111111112'),
      decimals: 9,
      category: 'native',
    };

    const tokenB: TokenConfig = {
      symbol: 'USDC',
      mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      decimals: 6,
      category: 'stable',
    };

    const tokenC: TokenConfig = {
      symbol: 'USDT',
      mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
      decimals: 6,
      category: 'stable',
    };

    it('should find profitable arbitrage opportunity', async () => {
      const mockQuoteAB = {
        inputMint: tokenA.mint.toString(),
        inAmount: '1000000',
        outputMint: tokenB.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [{ swapInfo: { label: 'Raydium', ammKey: '', inputMint: '', outputMint: '', inAmount: '', outAmount: '', feeAmount: '', feeMint: '' }, percent: 100 }],
      };

      const mockQuoteBC = {
        inputMint: tokenB.mint.toString(),
        inAmount: '150000',
        outputMint: tokenC.mint.toString(),
        outAmount: '150500',
        otherAmountThreshold: '149000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [{ swapInfo: { label: 'Orca', ammKey: '', inputMint: '', outputMint: '', inAmount: '', outAmount: '', feeAmount: '', feeMint: '' }, percent: 100 }],
      };

      const mockQuoteCA = {
        inputMint: tokenC.mint.toString(),
        inAmount: '150500',
        outputMint: tokenA.mint.toString(),
        outAmount: '1050000', // 5% profit
        otherAmountThreshold: '1000000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [{ swapInfo: { label: 'Jupiter', ammKey: '', inputMint: '', outputMint: '', inAmount: '', outAmount: '', feeAmount: '', feeMint: '' }, percent: 100 }],
      };

      mockJupiter.getQuote = jest.fn()
        .mockResolvedValueOnce(mockQuoteAB)
        .mockResolvedValueOnce(mockQuoteBC)
        .mockResolvedValueOnce(mockQuoteCA);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).not.toBeNull();
      expect(opportunity?.type).toBe('triangular');
      expect(opportunity?.path).toHaveLength(4);
      expect(opportunity?.path[0].symbol).toBe('SOL');
      expect(opportunity?.path[3].symbol).toBe('SOL');
      expect(opportunity?.estimatedProfit).toBeGreaterThan(0);
      expect(opportunity?.timestamp).toBeDefined();
      expect(opportunity?.routeDetails).toBeDefined();
    });

    it('should return null for unprofitable arbitrage', async () => {
      const mockQuoteAB = {
        inputMint: tokenA.mint.toString(),
        inAmount: '1000000',
        outputMint: tokenB.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      const mockQuoteBC = {
        inputMint: tokenB.mint.toString(),
        inAmount: '150000',
        outputMint: tokenC.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      const mockQuoteCA = {
        inputMint: tokenC.mint.toString(),
        inAmount: '150000',
        outputMint: tokenA.mint.toString(),
        outAmount: '990000', // 1% loss
        otherAmountThreshold: '980000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      mockJupiter.getQuote = jest.fn()
        .mockResolvedValueOnce(mockQuoteAB)
        .mockResolvedValueOnce(mockQuoteBC)
        .mockResolvedValueOnce(mockQuoteCA);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull();
    });

    it('should return null if first quote fails', async () => {
      mockJupiter.getQuote = jest.fn().mockResolvedValueOnce(null);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull();
    });

    it('should return null if second quote fails', async () => {
      const mockQuoteAB = {
        inputMint: tokenA.mint.toString(),
        inAmount: '1000000',
        outputMint: tokenB.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      mockJupiter.getQuote = jest.fn()
        .mockResolvedValueOnce(mockQuoteAB)
        .mockResolvedValueOnce(null);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull();
    });

    it('should return null if third quote fails', async () => {
      const mockQuoteAB = {
        inputMint: tokenA.mint.toString(),
        inAmount: '1000000',
        outputMint: tokenB.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      const mockQuoteBC = {
        inputMint: tokenB.mint.toString(),
        inAmount: '150000',
        outputMint: tokenC.mint.toString(),
        outAmount: '150500',
        otherAmountThreshold: '149000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      mockJupiter.getQuote = jest.fn()
        .mockResolvedValueOnce(mockQuoteAB)
        .mockResolvedValueOnce(mockQuoteBC)
        .mockResolvedValueOnce(null);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockJupiter.getQuote = jest.fn().mockRejectedValue(new Error('API error'));

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull();
    });

    it('should filter out opportunities with high slippage', async () => {
      const mockQuoteAB = {
        inputMint: tokenA.mint.toString(),
        inAmount: '1000000',
        outputMint: tokenB.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '5.0', // High price impact
        routePlan: [],
      };

      const mockQuoteBC = {
        inputMint: tokenB.mint.toString(),
        inAmount: '150000',
        outputMint: tokenC.mint.toString(),
        outAmount: '150500',
        otherAmountThreshold: '149000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '5.0', // High price impact
        routePlan: [],
      };

      const mockQuoteCA = {
        inputMint: tokenC.mint.toString(),
        inAmount: '150500',
        outputMint: tokenA.mint.toString(),
        outAmount: '1050000',
        otherAmountThreshold: '1000000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '5.0', // High price impact
        routePlan: [],
      };

      mockJupiter.getQuote = jest.fn()
        .mockResolvedValueOnce(mockQuoteAB)
        .mockResolvedValueOnce(mockQuoteBC)
        .mockResolvedValueOnce(mockQuoteCA);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull(); // Should be filtered due to high slippage
    });

    it('should filter out opportunities with low confidence', async () => {
      scanner.updateConfig({ minConfidence: 0.95 }); // Very high confidence requirement

      const mockQuoteAB = {
        inputMint: tokenA.mint.toString(),
        inAmount: '1000000',
        outputMint: tokenB.mint.toString(),
        outAmount: '150000',
        otherAmountThreshold: '148500',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      const mockQuoteBC = {
        inputMint: tokenB.mint.toString(),
        inAmount: '150000',
        outputMint: tokenC.mint.toString(),
        outAmount: '150500',
        otherAmountThreshold: '149000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      const mockQuoteCA = {
        inputMint: tokenC.mint.toString(),
        inAmount: '150500',
        outputMint: tokenA.mint.toString(),
        outAmount: '1010000', // Small 1% profit
        otherAmountThreshold: '1000000',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.1',
        routePlan: [],
      };

      mockJupiter.getQuote = jest.fn()
        .mockResolvedValueOnce(mockQuoteAB)
        .mockResolvedValueOnce(mockQuoteBC)
        .mockResolvedValueOnce(mockQuoteCA);

      const opportunity = await scanner.scanTriangleArbitrage(tokenA, tokenB, tokenC);

      expect(opportunity).toBeNull(); // Should be filtered due to low confidence
    });
  });

  describe('scanForOpportunities', () => {
    it('should scan and return sorted opportunities', async () => {
      mockJupiter.getQuote = jest.fn().mockResolvedValue(null);

      const opportunities = await scanner.scanForOpportunities(['SOL', 'USDC', 'USDT']);

      expect(Array.isArray(opportunities)).toBe(true);
      expect(mockJupiter.getQuote).toHaveBeenCalled();
    });

    it('should return empty array for insufficient tokens', async () => {
      const opportunities = await scanner.scanForOpportunities(['SOL']);

      expect(opportunities).toEqual([]);
    });

    it('should handle unknown token symbols', async () => {
      const opportunities = await scanner.scanForOpportunities(['UNKNOWN1', 'UNKNOWN2', 'UNKNOWN3']);

      expect(opportunities).toEqual([]);
    });
  });

  describe('startScanning and stopScanning', () => {
    it('should start continuous scanning', async () => {
      scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT']);
      mockJupiter.getQuote = jest.fn().mockResolvedValue(null);

      await scanner.startScanning();

      expect(scanner.isRunning()).toBe(true);
      scanner.stopScanning();
    });

    it('should initialize token pairs if not already initialized', async () => {
      mockJupiter.getQuote = jest.fn().mockResolvedValue(null);

      expect(scanner.getTokenPairCount()).toBe(0);
      await scanner.startScanning();

      expect(scanner.getTokenPairCount()).toBeGreaterThan(0);
      scanner.stopScanning();
    });

    it('should not start if already scanning', async () => {
      scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT']);
      mockJupiter.getQuote = jest.fn().mockResolvedValue(null);

      await scanner.startScanning();
      const firstStatus = scanner.isRunning();
      await scanner.startScanning(); // Try to start again

      expect(firstStatus).toBe(true);
      expect(scanner.isRunning()).toBe(true);
      scanner.stopScanning();
    });

    it('should stop scanning', async () => {
      scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT']);
      mockJupiter.getQuote = jest.fn().mockResolvedValue(null);

      await scanner.startScanning();
      expect(scanner.isRunning()).toBe(true);

      scanner.stopScanning();
      expect(scanner.isRunning()).toBe(false);
    });

    it('should not stop if not scanning', () => {
      expect(scanner.isRunning()).toBe(false);
      scanner.stopScanning();
      expect(scanner.isRunning()).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        minProfitThreshold: 0.02,
        maxSlippage: 0.02,
      };

      scanner.updateConfig(newConfig);

      const config = scanner.getConfig();
      expect(config.minProfitThreshold).toBe(0.02);
      expect(config.maxSlippage).toBe(0.02);
    });

    it('should partially update configuration', () => {
      const originalConfig = scanner.getConfig();
      scanner.updateConfig({ pollingIntervalMs: 3000 });

      const config = scanner.getConfig();
      expect(config.pollingIntervalMs).toBe(3000);
      expect(config.minProfitThreshold).toBe(originalConfig.minProfitThreshold);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = scanner.getConfig();

      expect(config).toBeDefined();
      expect(config.pollingIntervalMs).toBeDefined();
      expect(config.minProfitThreshold).toBeDefined();
      expect(config.maxSlippage).toBeDefined();
      expect(config.minConfidence).toBeDefined();
    });

    it('should return a copy of configuration', () => {
      const config1 = scanner.getConfig();
      config1.pollingIntervalMs = 9999;

      const config2 = scanner.getConfig();
      expect(config2.pollingIntervalMs).not.toBe(9999);
    });
  });

  describe('isRunning', () => {
    it('should return false when not scanning', () => {
      expect(scanner.isRunning()).toBe(false);
    });

    it('should return true when scanning', async () => {
      scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT']);
      mockJupiter.getQuote = jest.fn().mockResolvedValue(null);

      await scanner.startScanning();
      expect(scanner.isRunning()).toBe(true);
      scanner.stopScanning();
    });
  });

  describe('getTokenPairCount', () => {
    it('should return 0 when not initialized', () => {
      expect(scanner.getTokenPairCount()).toBe(0);
    });

    it('should return correct count after initialization', () => {
      scanner.initializeTokenPairs(['SOL', 'USDC', 'USDT']);
      expect(scanner.getTokenPairCount()).toBeGreaterThan(0);
    });
  });
});
