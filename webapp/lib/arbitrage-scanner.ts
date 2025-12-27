import { Connection } from "@solana/web3.js";
import { getOptimalConnection } from "./rpc-rotator";
import { API } from "./config";

export interface ArbitrageOpportunity {
  id: string;
  type: "flash" | "triangular";
  tokens: string[];
  profitPercent: number;
  profitUSD: number;
  provider?: string;
  route?: string;
  confidence: number;
  timestamp: number;
}

interface PriceData {
  [mint: string]: {
    price: number;
    timestamp: number;
  };
}

export class ArbitrageScanner {
  private priceCache: PriceData = {};
  private scanInterval: NodeJS.Timeout | null = null;
  private onOpportunityCallback:
    | ((opportunity: ArbitrageOpportunity) => void)
    | null = null;

  /**
   * @deprecated The rpcUrl parameter is no longer used. Connection is obtained via getOptimalConnection().
   * This parameter will be removed in a future version.
   */
  constructor(_rpcUrl?: string) {
    // RPC URL parameter kept for backwards compatibility
    // Connection is now obtained via getOptimalConnection()
  }

  private async getConnection(): Promise<Connection> {
    return getOptimalConnection();
  }

  async startScanning(minProfitPercent: number = 0.5): Promise<void> {
    console.log(
      "[ArbitrageScanner] Starting scan with min profit:",
      minProfitPercent,
    );

    // Fetch prices immediately
    await this.updatePrices();

    // Then scan every 10 seconds
    this.scanInterval = setInterval(async () => {
      await this.updatePrices();
      await this.scanOpportunities(minProfitPercent);
    }, 10000);
  }

  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log("[ArbitrageScanner] Scanning stopped");
    }
  }

  onOpportunity(callback: (opportunity: ArbitrageOpportunity) => void): void {
    this.onOpportunityCallback = callback;
  }

  private async updatePrices(): Promise<void> {
    try {
      const popularTokens = [
        "So11111111111111111111111111111111111111112", // SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
        "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
        "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
        "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
      ];

      const response = await fetch(
        `${API.jupiterPrice()}/price?ids=${popularTokens.join(",")}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.statusText}`);
      }

      const data = await response.json();
      const timestamp = Date.now();

      for (const mint of popularTokens) {
        if (data.data[mint]) {
          this.priceCache[mint] = {
            price: data.data[mint].price,
            timestamp,
          };
        }
      }

      console.log(
        "[ArbitrageScanner] Prices updated:",
        Object.keys(this.priceCache).length,
        "tokens",
      );
    } catch (error) {
      console.error("[ArbitrageScanner] Error updating prices:", error);
    }
  }

  private async scanOpportunities(minProfitPercent: number): Promise<void> {
    try {
      // Real arbitrage scanning based on actual price data
      // Check flash loan opportunities across multiple providers

      const flashProviders = [
        { name: "Marginfi", fee: 0.09 },
        { name: "Solend", fee: 0.1 },
        { name: "Kamino", fee: 0.12 },
        { name: "Tulip", fee: 0.13 },
        { name: "Drift", fee: 0.14 },
        { name: "Mango", fee: 0.15 },
        { name: "Jet", fee: 0.16 },
        { name: "Save", fee: 0.18 },
      ];

      const tokenPairs = [
        {
          tokenA: "SOL",
          tokenB: "USDC",
          mintA: "So11111111111111111111111111111111111111112",
          mintB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        },
        {
          tokenA: "SOL",
          tokenB: "USDT",
          mintA: "So11111111111111111111111111111111111111112",
          mintB: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        },
        {
          tokenA: "BONK",
          tokenB: "USDC",
          mintA: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
          mintB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        },
      ];

      for (const pair of tokenPairs) {
        const priceA = this.priceCache[pair.mintA]?.price;
        const priceB = this.priceCache[pair.mintB]?.price;

        if (!priceA || !priceB) continue;

        // Calculate actual price ratio and potential arbitrage
        // Check if there's a meaningful spread between different DEX routes
        // In a real implementation, we would query multiple DEX APIs
        const jupiterQuote = await this.getJupiterQuote(pair.mintA, pair.mintB);

        if (!jupiterQuote) continue;

        for (const provider of flashProviders) {
          // Calculate profit considering:
          // 1. Price impact from Jupiter quote
          // 2. Flash loan fee
          // 3. DEX swap fees (typically 0.25%-0.3%)
          const priceImpact = parseFloat(jupiterQuote.priceImpactPct || "0");
          const swapFees = 0.003; // 0.3% typical DEX fee
          const flashLoanFee = provider.fee / 100;

          const grossSpread = Math.abs(priceImpact);
          const totalFees = flashLoanFee + swapFees;
          const netProfit = grossSpread - totalFees;

          if (netProfit > minProfitPercent / 100) {
            // Calculate confidence based on liquidity and price stability
            const routeCount = jupiterQuote.routePlan?.length || 1;
            const liquidityScore = Math.min(
              100,
              jupiterQuote.outAmount / 100000000,
            ); // Normalize
            const confidence = Math.max(
              60,
              Math.min(
                95,
                85 - priceImpact * 100 - routeCount * 2 + liquidityScore,
              ),
            );

            const opportunity: ArbitrageOpportunity = {
              id: `${Date.now()}-${pair.tokenA}-${pair.tokenB}-${provider.name}`,
              type: "flash",
              tokens: [pair.tokenA, pair.tokenB],
              profitPercent: netProfit * 100,
              profitUSD: netProfit * 10000, // Assuming $10k trade size
              provider: provider.name,
              route: this.getRouteFromQuote(jupiterQuote),
              confidence: Math.floor(confidence),
              timestamp: Date.now(),
            };

            if (this.onOpportunityCallback) {
              this.onOpportunityCallback(opportunity);
            }
          }
        }
      }

      // Check for triangular arbitrage with real price data
      await this.scanTriangularArbitrage(minProfitPercent);
    } catch (error) {
      console.error("[ArbitrageScanner] Error scanning opportunities:", error);
    }
  }

  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
  ): Promise<any> {
    try {
      const amount = 100000000; // 0.1 SOL or equivalent
      const url = `${API.jupiterQuote()}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("[ArbitrageScanner] Error fetching Jupiter quote:", error);
      return null;
    }
  }

  private async scanTriangularArbitrage(
    minProfitPercent: number,
  ): Promise<void> {
    // Check triangular arbitrage routes: A -> B -> C -> A
    // Example: SOL -> USDC -> USDT -> SOL
    const triangularRoutes = [
      [
        "So11111111111111111111111111111111111111112",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      ],
    ];

    for (const route of triangularRoutes) {
      try {
        // Get quotes for each leg of the triangle
        const quote1 = await this.getJupiterQuote(route[0], route[1]);
        if (!quote1) continue;

        const quote2 = await this.getJupiterQuote(route[1], route[2]);
        if (!quote2) continue;

        const quote3 = await this.getJupiterQuote(route[2], route[0]);
        if (!quote3) continue;

        // Calculate net profit after fees
        const startAmount = 100000000; // 0.1 SOL
        const leg1Out = parseInt(quote1.outAmount);
        const leg2Out = parseInt(quote2.outAmount);
        const finalOut = parseInt(quote3.outAmount);

        const profit = (finalOut - startAmount) / startAmount;
        const fees = 0.009; // 0.3% per swap * 3 swaps
        const netProfit = profit - fees;

        if (netProfit > minProfitPercent / 100) {
          // Calculate confidence based on route complexity and liquidity
          const avgPriceImpact =
            (parseFloat(quote1.priceImpactPct || "0") +
              parseFloat(quote2.priceImpactPct || "0") +
              parseFloat(quote3.priceImpactPct || "0")) /
            3;

          const confidence = Math.max(
            60,
            Math.min(85, 80 - avgPriceImpact * 50),
          );

          const triangularOpp: ArbitrageOpportunity = {
            id: `${Date.now()}-triangular`,
            type: "triangular",
            tokens: ["SOL", "USDC", "USDT", "SOL"],
            profitPercent: netProfit * 100,
            profitUSD: ((netProfit * startAmount) / 1e9) * 100, // Convert to USD assuming SOL = $100
            route: "Jupiter v6",
            confidence: Math.floor(confidence),
            timestamp: Date.now(),
          };

          if (this.onOpportunityCallback) {
            this.onOpportunityCallback(triangularOpp);
          }
        }
      } catch (error) {
        console.error(
          "[ArbitrageScanner] Error in triangular arbitrage scan:",
          error,
        );
      }
    }
  }

  private getRouteFromQuote(quote: any): string {
    if (!quote.routePlan || quote.routePlan.length === 0) {
      return "Direct";
    }

    const dexNames = quote.routePlan.map(
      (r: any) => r.swapInfo?.label || "Unknown",
    );
    return dexNames.join(" → ");
  }

  getPrices(): PriceData {
    return this.priceCache;
  }
}
