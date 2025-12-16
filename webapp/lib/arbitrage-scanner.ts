import { Connection } from '@solana/web3.js';

export interface ArbitrageOpportunity {
  id: string;
  type: 'flash' | 'triangular';
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
  private connection: Connection;
  private priceCache: PriceData = {};
  private scanInterval: NodeJS.Timeout | null = null;
  private onOpportunityCallback: ((opportunity: ArbitrageOpportunity) => void) | null = null;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async startScanning(minProfitPercent: number = 0.5): Promise<void> {
    console.log('[ArbitrageScanner] Starting scan with min profit:', minProfitPercent);
    
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
      console.log('[ArbitrageScanner] Scanning stopped');
    }
  }

  onOpportunity(callback: (opportunity: ArbitrageOpportunity) => void): void {
    this.onOpportunityCallback = callback;
  }

  private async updatePrices(): Promise<void> {
    try {
      const popularTokens = [
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
        '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
      ];

      const response = await fetch(`https://price.jup.ag/v6/price?ids=${popularTokens.join(',')}`);
      
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

      console.log('[ArbitrageScanner] Prices updated:', Object.keys(this.priceCache).length, 'tokens');
    } catch (error) {
      console.error('[ArbitrageScanner] Error updating prices:', error);
    }
  }

  private async scanOpportunities(minProfitPercent: number): Promise<void> {
    try {
      // Simulate scanning for arbitrage opportunities
      // In production, this would check actual DEX prices and compare with aggregated prices
      
      const flashProviders = [
        { name: 'Marginfi', fee: 0.09 },
        { name: 'Solend', fee: 0.10 },
        { name: 'Kamino', fee: 0.12 },
        { name: 'Mango', fee: 0.15 },
        { name: 'Save', fee: 0.18 },
      ];

      const tokenPairs = [
        { tokenA: 'SOL', tokenB: 'USDC', mintA: 'So11111111111111111111111111111111111111112', mintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
        { tokenA: 'SOL', tokenB: 'USDT', mintA: 'So11111111111111111111111111111111111111112', mintB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
        { tokenA: 'BONK', tokenB: 'USDC', mintA: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', mintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      ];

      for (const pair of tokenPairs) {
        const priceA = this.priceCache[pair.mintA]?.price;
        const priceB = this.priceCache[pair.mintB]?.price;

        if (!priceA || !priceB) continue;

        // Simulate price discrepancy between DEXs (random 0-3%)
        const priceDiff = Math.random() * 0.03;

        for (const provider of flashProviders) {
          const estimatedProfit = priceDiff - (provider.fee / 100);

          if (estimatedProfit > minProfitPercent / 100) {
            const opportunity: ArbitrageOpportunity = {
              id: `${Date.now()}-${pair.tokenA}-${pair.tokenB}-${provider.name}`,
              type: 'flash',
              tokens: [pair.tokenA, pair.tokenB],
              profitPercent: estimatedProfit * 100,
              profitUSD: estimatedProfit * 10000, // Assuming $10k trade size
              provider: provider.name,
              route: this.getRandomRoute(),
              confidence: Math.random() * 30 + 70, // 70-100% confidence
              timestamp: Date.now(),
            };

            if (this.onOpportunityCallback) {
              this.onOpportunityCallback(opportunity);
            }
          }
        }
      }

      // Triangular arbitrage opportunities
      if (Math.random() > 0.7) { // 30% chance per scan
        const triangularOpp: ArbitrageOpportunity = {
          id: `${Date.now()}-triangular`,
          type: 'triangular',
          tokens: ['SOL', 'USDC', 'USDT', 'SOL'],
          profitPercent: Math.random() * 1.5 + 0.3,
          profitUSD: Math.random() * 300 + 100,
          route: 'Jupiter v6',
          confidence: Math.random() * 20 + 60,
          timestamp: Date.now(),
        };

        if (this.onOpportunityCallback) {
          this.onOpportunityCallback(triangularOpp);
        }
      }

    } catch (error) {
      console.error('[ArbitrageScanner] Error scanning opportunities:', error);
    }
  }

  private getRandomRoute(): string {
    const routes = [
      'Raydium → Orca',
      'Orca → Meteora',
      'Meteora → Phoenix',
      'Raydium → Phoenix',
      'Orca → OpenBook',
    ];
    return routes[Math.floor(Math.random() * routes.length)];
  }

  getPrices(): PriceData {
    return this.priceCache;
  }
}
