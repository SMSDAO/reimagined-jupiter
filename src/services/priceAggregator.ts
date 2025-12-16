import { Connection } from '@solana/web3.js';
import { JupiterV6Integration } from '../integrations/jupiter.js';
import { TokenPrice } from './tickerService.js';
import axios from 'axios';

export interface AggregatedPrice {
  symbol: string;
  mint: string;
  price: number;
  confidence: number;
  sources: {
    pyth?: number;
    jupiter?: number;
    raydium?: number;
    orca?: number;
    meteora?: number;
  };
  timestamp: number;
  volume24h?: number;
  priceChange24h?: number;
}

export interface PriceProvider {
  name: string;
  getPrice(mint: string): Promise<number | null>;
  isAvailable(): Promise<boolean>;
}

export class JupiterPriceProvider implements PriceProvider {
  name = 'jupiter';
  private jupiter: JupiterV6Integration;

  constructor(connection: Connection) {
    this.jupiter = new JupiterV6Integration(connection);
  }

  async getPrice(mint: string): Promise<number | null> {
    return await this.jupiter.getPriceInUSD(mint);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://price.jup.ag/v4/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export class RaydiumPriceProvider implements PriceProvider {
  name = 'raydium';

  async getPrice(mint: string): Promise<number | null> {
    try {
      // Raydium API for token prices
      const response = await axios.get(`https://api.raydium.io/v2/main/price`, {
        timeout: 5000,
      });
      
      if (response.data && response.data[mint]) {
        return parseFloat(response.data[mint]);
      }
      return null;
    } catch (error) {
      console.error('[Raydium] Price fetch error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://api.raydium.io/v2/main/price', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export class OrcaPriceProvider implements PriceProvider {
  name = 'orca';

  async getPrice(mint: string): Promise<number | null> {
    try {
      // Orca Whirlpool API for token prices
      const response = await axios.get('https://api.mainnet.orca.so/v1/token/list', {
        timeout: 5000,
      });
      
      if (response.data && response.data.tokens) {
        const token = response.data.tokens.find((t: any) => t.mint === mint);
        return token?.price || null;
      }
      return null;
    } catch (error) {
      console.error('[Orca] Price fetch error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://api.mainnet.orca.so/v1/token/list', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export class MeteoraPriceProvider implements PriceProvider {
  name = 'meteora';

  async getPrice(mint: string): Promise<number | null> {
    try {
      // Meteora API for token prices
      const response = await axios.get('https://dlmm-api.meteora.ag/pair/all', {
        timeout: 5000,
      });
      
      if (response.data && response.data.data) {
        // Find pairs containing this mint and calculate price
        const pairs = response.data.data.filter((p: any) => 
          p.mint_x === mint || p.mint_y === mint
        );
        
        if (pairs.length > 0) {
          // Use the most liquid pair
          const mainPair = pairs.sort((a: any, b: any) => 
            parseFloat(b.liquidity) - parseFloat(a.liquidity)
          )[0];
          
          return parseFloat(mainPair.price);
        }
      }
      return null;
    } catch (error) {
      console.error('[Meteora] Price fetch error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://dlmm-api.meteora.ag/pair/all', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export class PriceAggregatorService {
  private providers: PriceProvider[];
  private providerIndex: number;
  private connection: Connection;
  private rotationEnabled: boolean;

  constructor(connection: Connection, rotationEnabled: boolean = true) {
    this.connection = connection;
    this.rotationEnabled = rotationEnabled;
    this.providerIndex = 0;
    
    // Initialize all price providers
    this.providers = [
      new JupiterPriceProvider(connection),
      new RaydiumPriceProvider(),
      new OrcaPriceProvider(),
      new MeteoraPriceProvider(),
    ];
  }

  async aggregatePrice(
    mint: string,
    pythPrice?: TokenPrice
  ): Promise<AggregatedPrice | null> {
    try {
      const sources: AggregatedPrice['sources'] = {};
      const prices: number[] = [];

      // Add Pyth price if available
      if (pythPrice) {
        sources.pyth = pythPrice.price;
        prices.push(pythPrice.price);
      }

      // Fetch prices from all available providers
      const providerPromises = this.providers.map(async (provider) => {
        try {
          const price = await provider.getPrice(mint);
          if (price !== null && price > 0) {
            return { provider: provider.name, price };
          }
        } catch (error) {
          console.error(`[${provider.name}] Error fetching price:`, error);
        }
        return null;
      });

      const results = await Promise.all(providerPromises);

      // Add provider prices to sources
      for (const result of results) {
        if (result) {
          sources[result.provider as keyof AggregatedPrice['sources']] = result.price;
          prices.push(result.price);
        }
      }

      if (prices.length === 0) {
        return null;
      }

      // Calculate aggregated price (median)
      const sortedPrices = prices.sort((a, b) => a - b);
      const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

      // Calculate confidence interval (standard deviation)
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);

      return {
        symbol: pythPrice?.symbol || 'UNKNOWN',
        mint,
        price: medianPrice,
        confidence: stdDev,
        sources,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[PriceAggregator] Error aggregating price:', error);
      return null;
    }
  }

  async getProviderStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    const statusPromises = this.providers.map(async (provider) => {
      const available = await provider.isAvailable();
      return { name: provider.name, available };
    });

    const results = await Promise.all(statusPromises);
    
    for (const result of results) {
      status[result.name] = result.available;
    }

    return status;
  }

  getNextProvider(): PriceProvider {
    if (!this.rotationEnabled) {
      return this.providers[0];
    }

    const provider = this.providers[this.providerIndex];
    this.providerIndex = (this.providerIndex + 1) % this.providers.length;
    return provider;
  }

  async getPriceFromRotation(mint: string): Promise<number | null> {
    const provider = this.getNextProvider();
    console.log(`[PriceAggregator] Using provider: ${provider.name}`);
    return await provider.getPrice(mint);
  }
}
