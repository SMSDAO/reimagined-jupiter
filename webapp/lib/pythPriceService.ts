import { API } from "./config";

// Pyth price feed IDs for common tokens on Solana
export const PYTH_PRICE_FEEDS = {
  "SOL/USD":
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "BTC/USD":
    "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD":
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "USDC/USD":
    "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT/USD":
    "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "BONK/USD":
    "0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  "JUP/USD":
    "0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  "RAY/USD":
    "0x91568baa8beb53e681a2a9632b11cc9f6d94d222454435b6d54ab9b8b7be6c74",
  "ORCA/USD":
    "0x5867f5683c757393a0670ef0f701490950fe93fdb006d181c8265a831ac0c5c6",
};

export interface PythPrice {
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
  symbol: string;
}

export class PythPriceService {
  private hermesUrl: string;

  constructor(hermesUrl?: string) {
    this.hermesUrl = hermesUrl || API.pythHermes();
  }

  async getPrice(symbol: string): Promise<PythPrice | null> {
    try {
      const feedId = PYTH_PRICE_FEEDS[symbol as keyof typeof PYTH_PRICE_FEEDS];
      if (!feedId) {
        console.warn(`No Pyth feed found for ${symbol}`);
        return null;
      }

      const response = await fetch(
        `${this.hermesUrl}/api/latest_price_feeds?ids[]=${feedId}`,
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const priceData = data[0].price;
        return {
          price: parseFloat(priceData.price) * Math.pow(10, priceData.expo),
          confidence: parseFloat(priceData.conf) * Math.pow(10, priceData.expo),
          exponent: priceData.expo,
          publishTime: priceData.publish_time,
          symbol,
        };
      }

      return null;
    } catch (err) {
      console.error(`Error fetching price for ${symbol}:`, err);
      return null;
    }
  }

  async getPrices(
    symbols: string[],
  ): Promise<Record<string, PythPrice | null>> {
    const prices: Record<string, PythPrice | null> = {};

    await Promise.all(
      symbols.map(async (symbol) => {
        prices[symbol] = await this.getPrice(symbol);
      }),
    );

    return prices;
  }
}

// Singleton instance
let pythServiceInstance: PythPriceService | null = null;

export function getPythService(hermesUrl?: string): PythPriceService {
  if (!pythServiceInstance) {
    pythServiceInstance = new PythPriceService(hermesUrl);
  }
  return pythServiceInstance;
}

// Quick helper to get a single price
export async function getPriceFromHermes(
  symbol: string,
): Promise<number | null> {
  const service = getPythService();
  const priceData = await service.getPrice(symbol);
  return priceData ? priceData.price : null;
}
