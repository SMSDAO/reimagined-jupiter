import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AirdropChecker } from '../services/airdropChecker.js';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AirdropChecker', () => {
  let connection: Connection;
  let airdropChecker: AirdropChecker;
  const mockRpcUrl = 'https://api.devnet.solana.com';
  const mockPublicKey = new PublicKey('FcZHnLSkXqDhpRzZZ2KmqZ5EtyKCmLMLnU9FNmXKKEYY');

  beforeEach(() => {
    jest.clearAllMocks();
    connection = new Connection(mockRpcUrl, 'confirmed');
    airdropChecker = new AirdropChecker(connection, mockPublicKey);
  });

  describe('checkAllAirdrops', () => {
    it('should check all airdrops and return available ones', async () => {
      // Mock Jupiter airdrop
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('jup.ag')) {
          return Promise.resolve({
            data: { amount: 1000 },
          });
        }
        // Mock Jito airdrop
        if (url.includes('jito.network')) {
          return Promise.resolve({
            data: { allocation: 500 },
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      const airdrops = await airdropChecker.checkAllAirdrops();

      expect(airdrops).toHaveLength(2);
      expect(airdrops[0]).toMatchObject({
        protocol: 'Jupiter',
        amount: 1000,
        claimable: true,
        claimed: false,
      });
      expect(airdrops[1]).toMatchObject({
        protocol: 'Jito',
        amount: 500,
        claimable: true,
        claimed: false,
      });
    });

    it('should handle when no airdrops are available', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      const airdrops = await airdropChecker.checkAllAirdrops();

      expect(airdrops).toEqual([]);
    });

    it('should handle errors gracefully and return partial results', async () => {
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('jup.ag')) {
          return Promise.resolve({
            data: { amount: 1000 },
          });
        }
        // Other airdrops fail
        return Promise.reject(new Error('Network error'));
      });

      const airdrops = await airdropChecker.checkAllAirdrops();

      expect(airdrops.length).toBeGreaterThanOrEqual(1);
      const jupiterAirdrop = airdrops.find(a => a.protocol === 'Jupiter');
      expect(jupiterAirdrop).toBeDefined();
    });

    it('should return empty array for invalid publicKey', async () => {
      const invalidChecker = new AirdropChecker(connection, null as any);
      const airdrops = await invalidChecker.checkAllAirdrops();

      expect(airdrops).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('checkJupiterAirdrop', () => {
    it('should find Jupiter airdrop when available', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { amount: 1000 },
      });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jupiterAirdrop = airdrops.find(a => a.protocol === 'Jupiter');

      expect(jupiterAirdrop).toBeDefined();
      expect(jupiterAirdrop?.tokenMint).toBe('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN');
      expect(jupiterAirdrop?.amount).toBe(1000);
      expect(jupiterAirdrop?.claimable).toBe(true);
      expect(jupiterAirdrop?.claimed).toBe(false);
    });

    it('should handle 404 response (no airdrop)', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jupiterAirdrop = airdrops.find(a => a.protocol === 'Jupiter');

      expect(jupiterAirdrop).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' },
        message: 'Server error',
      });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jupiterAirdrop = airdrops.find(a => a.protocol === 'Jupiter');

      expect(jupiterAirdrop).toBeUndefined();
    });

    it('should handle empty response data', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jupiterAirdrop = airdrops.find(a => a.protocol === 'Jupiter');

      expect(jupiterAirdrop).toBeUndefined();
    });

    it('should handle non-axios errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Unexpected error'));

      const airdrops = await airdropChecker.checkAllAirdrops();

      // Should not throw, but continue
      expect(Array.isArray(airdrops)).toBe(true);
    });
  });

  describe('checkJitoAirdrop', () => {
    it('should find Jito airdrop when available', async () => {
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('jito.network')) {
          return Promise.resolve({
            data: { allocation: 500 },
          });
        }
        return Promise.reject({ isAxiosError: true, response: { status: 404 } });
      });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jitoAirdrop = airdrops.find(a => a.protocol === 'Jito');

      expect(jitoAirdrop).toBeDefined();
      expect(jitoAirdrop?.tokenMint).toBe('jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL');
      expect(jitoAirdrop?.amount).toBe(500);
      expect(jitoAirdrop?.claimable).toBe(true);
      expect(jitoAirdrop?.claimed).toBe(false);
    });

    it('should handle 404 response (no airdrop)', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jitoAirdrop = airdrops.find(a => a.protocol === 'Jito');

      expect(jitoAirdrop).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 503 },
        message: 'Service unavailable',
      });

      const airdrops = await airdropChecker.checkAllAirdrops();
      const jitoAirdrop = airdrops.find(a => a.protocol === 'Jito');

      expect(jitoAirdrop).toBeUndefined();
    });
  });

  describe('claimAirdrop', () => {
    const mockKeypair = Keypair.generate();
    const mockAirdrop = {
      protocol: 'Jupiter',
      tokenMint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      amount: 1000,
      claimable: true,
      claimed: false,
    };

    it('should attempt to claim Jupiter airdrop', async () => {
      const result = await airdropChecker.claimAirdrop(mockAirdrop, mockKeypair);

      // Current implementation returns null (placeholder)
      expect(result).toBeNull();
    });

    it('should attempt to claim Jito airdrop', async () => {
      const jitoAirdrop = {
        ...mockAirdrop,
        protocol: 'Jito',
        tokenMint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
      };

      const result = await airdropChecker.claimAirdrop(jitoAirdrop, mockKeypair);

      // Current implementation returns null (placeholder)
      expect(result).toBeNull();
    });

    it('should handle unknown protocol gracefully', async () => {
      const unknownAirdrop = {
        ...mockAirdrop,
        protocol: 'Unknown',
      };

      const result = await airdropChecker.claimAirdrop(unknownAirdrop, mockKeypair);

      expect(result).toBeNull();
    });

    it('should handle errors during claim', async () => {
      const mockAirdropWithError = {
        ...mockAirdrop,
        protocol: 'Pyth',
      };

      const result = await airdropChecker.claimAirdrop(mockAirdropWithError, mockKeypair);

      // Should not throw, returns null
      expect(result).toBeNull();
    });
  });

  describe('autoClaimAll', () => {
    const mockKeypair = Keypair.generate();

    it('should attempt to claim all available airdrops', async () => {
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('jup.ag')) {
          return Promise.resolve({ data: { amount: 1000 } });
        }
        if (url.includes('jito.network')) {
          return Promise.resolve({ data: { allocation: 500 } });
        }
        return Promise.reject({ isAxiosError: true, response: { status: 404 } });
      });

      const results = await airdropChecker.autoClaimAll(mockKeypair);

      expect(results.size).toBeGreaterThanOrEqual(2);
      expect(results.has('Jupiter')).toBe(true);
      expect(results.has('Jito')).toBe(true);
    });

    it('should handle no available airdrops', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
      });

      const results = await airdropChecker.autoClaimAll(mockKeypair);

      expect(results.size).toBe(0);
    });

    it('should skip already claimed airdrops', async () => {
      // Mock response with no airdrop available (404) to simulate "already claimed"
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
      });

      const results = await airdropChecker.autoClaimAll(mockKeypair);

      // Should not attempt to claim when no airdrops are found
      expect(results.size).toBe(0);
    });
  });
});
