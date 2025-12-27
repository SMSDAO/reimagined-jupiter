import { Connection, PublicKey } from "@solana/web3.js";
import { PythNetworkIntegration } from "../integrations/pyth.js";

// Mock Connection and Pyth client
jest.mock("@solana/web3.js", () => {
  const actual = jest.requireActual("@solana/web3.js");
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock("@pythnetwork/client", () => ({
  PythHttpClient: jest.fn().mockImplementation(() => ({
    getData: jest.fn().mockResolvedValue({
      productPrice: new Map([
        [
          "test-price-id",
          {
            price: 100.5,
            confidence: 0.1,
            status: "trading",
          },
        ],
      ]),
    }),
  })),
  getPythProgramKeyForCluster: jest
    .fn()
    .mockReturnValue(new PublicKey("11111111111111111111111111111111")),
}));

describe("PythNetworkIntegration", () => {
  let connection: Connection;
  let pyth: PythNetworkIntegration;

  beforeEach(() => {
    connection = new Connection("https://api.devnet.solana.com");
    pyth = new PythNetworkIntegration(connection);
  });

  describe("Input Validation", () => {
    it("should reject empty token symbol", async () => {
      const result = await pyth.getPrice("");
      expect(result).toBeNull();
    });

    it("should reject null token symbol", async () => {
      const result = await pyth.getPrice(null as any);
      expect(result).toBeNull();
    });

    it("should reject undefined token symbol", async () => {
      const result = await pyth.getPrice(undefined as any);
      expect(result).toBeNull();
    });
  });

  describe("isPriceFresh", () => {
    it("should return true for fresh price", () => {
      const now = Date.now();
      const isFresh = pyth.isPriceFresh(now, 60);
      expect(isFresh).toBe(true);
    });

    it("should return false for stale price", () => {
      const oldTimestamp = Date.now() - 120000; // 2 minutes ago
      const isFresh = pyth.isPriceFresh(oldTimestamp, 60);
      expect(isFresh).toBe(false);
    });

    it("should accept custom max age", () => {
      const timestamp = Date.now() - 90000; // 90 seconds ago
      const isFresh = pyth.isPriceFresh(timestamp, 120); // 120 seconds max
      expect(isFresh).toBe(true);
    });
  });

  describe("isConfidenceAcceptable", () => {
    it("should return true for acceptable confidence", () => {
      const isAcceptable = pyth.isConfidenceAcceptable(100, 0.5, 1.0);
      expect(isAcceptable).toBe(true);
    });

    it("should return false for high confidence interval", () => {
      const isAcceptable = pyth.isConfidenceAcceptable(100, 2, 1.0);
      expect(isAcceptable).toBe(false);
    });

    it("should return false for zero or negative price", () => {
      expect(pyth.isConfidenceAcceptable(0, 0.5, 1.0)).toBe(false);
      expect(pyth.isConfidenceAcceptable(-100, 0.5, 1.0)).toBe(false);
    });

    it("should accept custom max confidence percentage", () => {
      const isAcceptable = pyth.isConfidenceAcceptable(100, 3, 5.0);
      expect(isAcceptable).toBe(true);
    });
  });

  describe("calculateDynamicSlippage", () => {
    it("should return at least base slippage", async () => {
      const baseSlippage = 0.01;
      const dynamicSlippage = await pyth.calculateDynamicSlippage(
        "SOL",
        baseSlippage,
      );
      expect(dynamicSlippage).toBeGreaterThanOrEqual(baseSlippage);
    });

    it("should cap at maximum 5%", async () => {
      const baseSlippage = 0.01;
      const dynamicSlippage = await pyth.calculateDynamicSlippage(
        "SOL",
        baseSlippage,
      );
      expect(dynamicSlippage).toBeLessThanOrEqual(0.05);
    });

    it("should return base slippage on error", async () => {
      const baseSlippage = 0.01;
      const dynamicSlippage = await pyth.calculateDynamicSlippage(
        "INVALID_TOKEN",
        baseSlippage,
      );
      expect(dynamicSlippage).toBe(baseSlippage);
    });
  });

  describe("getPrices", () => {
    it("should return empty map for empty array", async () => {
      const prices = await pyth.getPrices([]);
      expect(prices.size).toBe(0);
    });

    it("should return empty map for invalid input", async () => {
      const prices = await pyth.getPrices(null as any);
      expect(prices.size).toBe(0);
    });

    it("should handle array of token symbols", async () => {
      const prices = await pyth.getPrices(["SOL", "USDC"]);
      expect(prices).toBeInstanceOf(Map);
    });
  });
});
