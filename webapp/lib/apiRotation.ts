import { Connection } from '@solana/web3.js';

export interface APIProvider {
  id: string;
  name: string;
  url: string;
  type: 'rpc' | 'pyth' | 'dex';
  enabled: boolean;
}

export class APIRotationService {
  private providers: APIProvider[];
  private currentIndex: number = 0;
  private rotationInterval: number;
  private rotationEnabled: boolean;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(providers: APIProvider[], rotationInterval: number = 300, rotationEnabled: boolean = true) {
    this.providers = providers.filter(p => p.enabled);
    this.rotationInterval = rotationInterval;
    this.rotationEnabled = rotationEnabled;
  }

  startRotation(callback?: (provider: APIProvider) => void) {
    if (!this.rotationEnabled || this.providers.length <= 1) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.providers.length;
      const currentProvider = this.providers[this.currentIndex];
      console.log(`🔄 Rotated to provider: ${currentProvider.name}`);
      
      if (callback) {
        callback(currentProvider);
      }
    }, this.rotationInterval * 1000);
  }

  stopRotation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getCurrentProvider(): APIProvider | null {
    if (this.providers.length === 0) {
      return null;
    }
    return this.providers[this.currentIndex];
  }

  getProvidersByType(type: 'rpc' | 'pyth' | 'dex'): APIProvider[] {
    return this.providers.filter(p => p.type === type);
  }

  getConnection(): Connection | null {
    const rpcProviders = this.getProvidersByType('rpc');
    if (rpcProviders.length === 0) {
      return null;
    }
    
    const provider = rpcProviders[this.currentIndex % rpcProviders.length];
    return new Connection(provider.url, 'confirmed');
  }

  async testProvider(provider: APIProvider): Promise<boolean> {
    try {
      if (provider.type === 'rpc') {
        const connection = new Connection(provider.url, 'confirmed');
        const slot = await connection.getSlot();
        return slot > 0;
      } else if (provider.type === 'pyth') {
        const response = await fetch(`${provider.url}/api/latest_price_feeds?ids[]=H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG`);
        return response.ok;
      } else if (provider.type === 'dex') {
        const response = await fetch(provider.url, { method: 'HEAD' });
        return response.ok;
      }
      return false;
    } catch (err) {
      console.error(`Failed to test provider ${provider.name}:`, err);
      return false;
    }
  }

  async testAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      this.providers.map(async (provider) => {
        results[provider.id] = await this.testProvider(provider);
      })
    );

    return results;
  }

  updateProviders(providers: APIProvider[]) {
    this.providers = providers.filter(p => p.enabled);
    this.currentIndex = 0;
  }

  updateRotationSettings(interval: number, enabled: boolean) {
    this.rotationInterval = interval;
    this.rotationEnabled = enabled;

    // Restart rotation if it was running
    if (this.intervalId) {
      this.stopRotation();
      this.startRotation();
    }
  }
}

// Load settings from localStorage
export function loadSettings(): { providers: APIProvider[]; rotationEnabled: boolean; rotationInterval: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const saved = localStorage.getItem('gxq-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        providers: parsed.apiProviders || [],
        rotationEnabled: parsed.rotationEnabled ?? true,
        rotationInterval: parsed.rotationInterval ?? 300,
      };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  return null;
}

// Get active API rotation service
let rotationServiceInstance: APIRotationService | null = null;

export function getAPIRotationService(): APIRotationService | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!rotationServiceInstance) {
    const settings = loadSettings();
    if (settings) {
      rotationServiceInstance = new APIRotationService(
        settings.providers,
        settings.rotationInterval,
        settings.rotationEnabled
      );
    }
  }

  return rotationServiceInstance;
}

export function updateAPIRotationService(providers: APIProvider[], interval: number, enabled: boolean) {
  if (rotationServiceInstance) {
    rotationServiceInstance.updateProviders(providers);
    rotationServiceInstance.updateRotationSettings(interval, enabled);
  } else {
    rotationServiceInstance = new APIRotationService(providers, interval, enabled);
  }
}
