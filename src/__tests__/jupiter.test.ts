import { Connection } from "@solana/web3.js";
import { JupiterV6Integration } from "../integrations/jupiter.js";

// Mock axios
jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("JupiterV6Integration", () => {
  let connection: Connection;
  let jupiter: JupiterV6Integration;
  const mockRpcUrl = "https://api.devnet.solana.com";

  beforeEach(() => {
    jest.clearAllMocks();
    connection = new Connection(mockRpcUrl, "confirmed");
    jupiter = new JupiterV6Integration(connection);
  });

  describe("getQuote", () => {
    const inputMint = "So11111111111111111111111111111111111111112"; // SOL
    const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
    const amount = 1000000000; // 1 SOL

    it("should fetch a valid quote successfully", async () => {
      const mockQuote = {
        inputMint,
        inAmount: "1000000000",
        outputMint,
        outAmount: "150000000",
        otherAmountThreshold: "148500000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      mockedAxios.get.mockResolvedValue({ data: mockQuote });

      const quote = await jupiter.getQuote(inputMint, outputMint, amount, 50);

      expect(quote).toEqual(mockQuote);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/quote"),
        expect.objectContaining({
          params: expect.objectContaining({
            inputMint,
            outputMint,
            amount,
            slippageBps: 50,
          }),
        }),
      );
    });

    it("should return null for empty inputMint", async () => {
      const quote = await jupiter.getQuote("", outputMint, amount);
      expect(quote).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should return null for empty outputMint", async () => {
      const quote = await jupiter.getQuote(inputMint, "", amount);
      expect(quote).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should return null for invalid amount (zero)", async () => {
      const quote = await jupiter.getQuote(inputMint, outputMint, 0);
      expect(quote).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should return null for invalid amount (negative)", async () => {
      const quote = await jupiter.getQuote(inputMint, outputMint, -100);
      expect(quote).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should handle API error gracefully", async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, statusText: "Internal Server Error" },
        message: "Request failed",
      });

      const quote = await jupiter.getQuote(inputMint, outputMint, amount);
      expect(quote).toBeNull();
    });

    it("should handle empty response data", async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      const quote = await jupiter.getQuote(inputMint, outputMint, amount);
      expect(quote).toBeNull();
    });

    it("should handle network errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));

      const quote = await jupiter.getQuote(inputMint, outputMint, amount);
      expect(quote).toBeNull();
    });
  });

  describe("getSwapTransaction", () => {
    const mockQuote = {
      inputMint: "So11111111111111111111111111111111111111112",
      inAmount: "1000000000",
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      outAmount: "150000000",
      otherAmountThreshold: "148500000",
      swapMode: "ExactIn",
      slippageBps: 50,
      priceImpactPct: "0.1",
      routePlan: [],
    };
    const userPublicKey = "FcZHnLSkXqDhpRzZZ2KmqZ5EtyKCmLMLnU9FNmXKKEYY";

    it("should create a swap transaction successfully", async () => {
      const mockSwapTransaction = "base64encodedtransaction";
      mockedAxios.post.mockResolvedValue({
        data: { swapTransaction: mockSwapTransaction },
      });

      const transaction = await jupiter.getSwapTransaction(
        mockQuote,
        userPublicKey,
      );

      expect(transaction).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/swap"),
        expect.objectContaining({
          quoteResponse: mockQuote,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto",
        }),
      );
    });

    it("should return null for null quote", async () => {
      const transaction = await jupiter.getSwapTransaction(
        null as any,
        userPublicKey,
      );
      expect(transaction).toBeNull();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("should return null for empty userPublicKey", async () => {
      const transaction = await jupiter.getSwapTransaction(mockQuote, "");
      expect(transaction).toBeNull();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("should handle API error gracefully", async () => {
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: { error: "Invalid quote" } },
        message: "Bad request",
      });

      const transaction = await jupiter.getSwapTransaction(
        mockQuote,
        userPublicKey,
      );
      expect(transaction).toBeNull();
    });

    it("should return null for missing swapTransaction in response", async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      const transaction = await jupiter.getSwapTransaction(
        mockQuote,
        userPublicKey,
      );
      expect(transaction).toBeNull();
    });
  });

  describe("getPriceInUSD", () => {
    const tokenMint = "So11111111111111111111111111111111111111112";

    it("should fetch token price successfully", async () => {
      const mockPrice = 150.25;
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            [tokenMint]: { price: mockPrice },
          },
        },
      });

      const price = await jupiter.getPriceInUSD(tokenMint);

      expect(price).toBe(mockPrice);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/price?ids=${tokenMint}`),
      );
    });

    it("should return null for empty tokenMint", async () => {
      const price = await jupiter.getPriceInUSD("");
      expect(price).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should return null when price is not available", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {},
        },
      });

      const price = await jupiter.getPriceInUSD(tokenMint);
      expect(price).toBeNull();
    });

    it("should return null for invalid response structure", async () => {
      mockedAxios.get.mockResolvedValue({
        data: null,
      });

      const price = await jupiter.getPriceInUSD(tokenMint);
      expect(price).toBeNull();
    });

    it("should handle API error gracefully", async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: "Not found",
      });

      const price = await jupiter.getPriceInUSD(tokenMint);
      expect(price).toBeNull();
    });

    it("should handle network errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network timeout"));

      const price = await jupiter.getPriceInUSD(tokenMint);
      expect(price).toBeNull();
    });
  });

  describe("findTriangularArbitrage", () => {
    const tokenA = "So11111111111111111111111111111111111111112"; // SOL
    const tokenB = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
    const tokenC = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"; // USDT
    const amount = 1000000000;

    it("should find profitable arbitrage opportunity", async () => {
      const mockQuoteAB = {
        inputMint: tokenA,
        inAmount: "1000000000",
        outputMint: tokenB,
        outAmount: "150000000",
        otherAmountThreshold: "148500000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      const mockQuoteBC = {
        inputMint: tokenB,
        inAmount: "150000000",
        outputMint: tokenC,
        outAmount: "150500000",
        otherAmountThreshold: "149000000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      const mockQuoteCA = {
        inputMint: tokenC,
        inAmount: "150500000",
        outputMint: tokenA,
        outAmount: "1005000000", // 0.5% profit
        otherAmountThreshold: "995000000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockQuoteAB })
        .mockResolvedValueOnce({ data: mockQuoteBC })
        .mockResolvedValueOnce({ data: mockQuoteCA });

      const result = await jupiter.findTriangularArbitrage(
        tokenA,
        tokenB,
        tokenC,
        amount,
      );

      expect(result).toBeDefined();
      expect(result?.profitable).toBe(true);
      expect(result?.profit).toBe(5000000);
      expect(result?.path).toEqual([tokenA, tokenB, tokenC, tokenA]);
    });

    it("should identify unprofitable arbitrage", async () => {
      const mockQuoteAB = {
        inputMint: tokenA,
        inAmount: "1000000000",
        outputMint: tokenB,
        outAmount: "150000000",
        otherAmountThreshold: "148500000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      const mockQuoteBC = {
        inputMint: tokenB,
        inAmount: "150000000",
        outputMint: tokenC,
        outAmount: "150000000",
        otherAmountThreshold: "148500000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      const mockQuoteCA = {
        inputMint: tokenC,
        inAmount: "150000000",
        outputMint: tokenA,
        outAmount: "990000000", // 1% loss
        otherAmountThreshold: "980000000",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0.1",
        routePlan: [],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockQuoteAB })
        .mockResolvedValueOnce({ data: mockQuoteBC })
        .mockResolvedValueOnce({ data: mockQuoteCA });

      const result = await jupiter.findTriangularArbitrage(
        tokenA,
        tokenB,
        tokenC,
        amount,
      );

      expect(result).toBeDefined();
      expect(result?.profitable).toBe(false);
      expect(result?.profit).toBeLessThan(0);
    });

    it("should return null if any quote fails", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: null });

      const result = await jupiter.findTriangularArbitrage(
        tokenA,
        tokenB,
        tokenC,
        amount,
      );
      expect(result).toBeNull();
    });
  });

  describe("getTokenList", () => {
    it("should fetch token list successfully", async () => {
      const mockTokens = [
        {
          address: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Solana",
        },
        {
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          symbol: "USDC",
          name: "USD Coin",
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockTokens });

      const tokens = await jupiter.getTokenList();

      expect(tokens).toEqual(mockTokens);
      expect(mockedAxios.get).toHaveBeenCalledWith("https://token.jup.ag/all");
    });

    it("should return empty array on error", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));

      const tokens = await jupiter.getTokenList();

      expect(tokens).toEqual([]);
    });
  });
});
