import fs from 'fs/promises';
import path from 'path';

// Address Presets: Wallets, programs, tokens with labels/tags/notes
export interface AddressPreset {
  id: string;
  address: string;
  label: string;
  type: 'wallet' | 'program' | 'token';
  tags: string[];
  notes: string;
  category?: string;
  lastUsed?: Date;
  useCount: number;
  createdAt: Date;
}

// Route Presets: Triangular arb configs with auto-execute flag
export interface RoutePreset {
  id: string;
  name: string;
  description: string;
  route: string[]; // Token symbols in order
  dexes: string[]; // DEX programs to use
  autoExecute: boolean;
  minProfitThreshold: number;
  maxSlippage: number;
  enabled: boolean;
  lastUsed?: Date;
  useCount: number;
  totalProfit: number;
  createdAt: Date;
}

// Config Presets: Bot settings with apply functionality
export interface ConfigPreset {
  id: string;
  name: string;
  description: string;
  settings: {
    minProfitThreshold: number;
    maxSlippage: number;
    gasBuffer: number;
    maxTradeSize: number;
    enableFlashLoans: boolean;
    flashLoanProvider?: string;
    priorityFee: number;
    computeUnitLimit: number;
    enableMEVProtection: boolean;
    enableAutoExecution: boolean;
  };
  lastUsed?: Date;
  useCount: number;
  createdAt: Date;
}

export interface PresetManagerConfig {
  presetsPath: string;
  quicknodeClient?: any;
  enableKVSync: boolean;
  syncInterval: number; // minutes
}

export class PresetManagerAdvanced {
  private presetsPath: string;
  private quicknodeClient: any;
  private enableKVSync: boolean;
  private syncInterval: number;
  
  // Storage
  private addressPresets: Map<string, AddressPreset> = new Map();
  private routePresets: Map<string, RoutePreset> = new Map();
  private configPresets: Map<string, ConfigPreset> = new Map();
  
  // Sync timer
  private syncTimer?: NodeJS.Timeout;
  
  constructor(config: PresetManagerConfig) {
    this.presetsPath = config.presetsPath;
    this.quicknodeClient = config.quicknodeClient;
    this.enableKVSync = config.enableKVSync;
    this.syncInterval = config.syncInterval;
  }
  
  async initialize(): Promise<void> {
    try {
      // Create presets directories
      await fs.mkdir(this.presetsPath, { recursive: true });
      await fs.mkdir(path.join(this.presetsPath, 'addresses'), { recursive: true });
      await fs.mkdir(path.join(this.presetsPath, 'routes'), { recursive: true });
      await fs.mkdir(path.join(this.presetsPath, 'configs'), { recursive: true });
      
      // Load all presets
      await this.loadAllPresets();
      
      // Create defaults if empty
      if (this.addressPresets.size === 0) await this.createDefaultAddressPresets();
      if (this.routePresets.size === 0) await this.createDefaultRoutePresets();
      if (this.configPresets.size === 0) await this.createDefaultConfigPresets();
      
      // Setup auto-sync if enabled
      if (this.enableKVSync && this.quicknodeClient) {
        this.startAutoSync();
      }
      
      console.log('Preset Manager initialized');
      console.log(`- Address presets: ${this.addressPresets.size}`);
      console.log(`- Route presets: ${this.routePresets.size}`);
      console.log(`- Config presets: ${this.configPresets.size}`);
    } catch (error) {
      console.error('Error initializing preset manager:', error);
    }
  }
  
  // Address Presets Management
  async createAddressPreset(preset: Omit<AddressPreset, 'id' | 'createdAt' | 'useCount'>): Promise<string> {
    const id = `addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPreset: AddressPreset = {
      ...preset,
      id,
      createdAt: new Date(),
      useCount: 0,
    };
    
    await this.saveAddressPreset(newPreset);
    return id;
  }
  
  async getAddressPreset(id: string): Promise<AddressPreset | undefined> {
    return this.addressPresets.get(id);
  }
  
  async getAllAddressPresets(): Promise<AddressPreset[]> {
    return Array.from(this.addressPresets.values());
  }
  
  async getAddressPresetsByType(type: 'wallet' | 'program' | 'token'): Promise<AddressPreset[]> {
    return Array.from(this.addressPresets.values()).filter(p => p.type === type);
  }
  
  async getAddressPresetsByTag(tag: string): Promise<AddressPreset[]> {
    return Array.from(this.addressPresets.values()).filter(p => p.tags.includes(tag));
  }
  
  async updateAddressPreset(id: string, updates: Partial<AddressPreset>): Promise<boolean> {
    const preset = this.addressPresets.get(id);
    if (!preset) return false;
    
    const updated = { ...preset, ...updates, id: preset.id, createdAt: preset.createdAt };
    await this.saveAddressPreset(updated);
    return true;
  }
  
  async deleteAddressPreset(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.presetsPath, 'addresses', `${id}.json`);
      await fs.unlink(filePath);
      this.addressPresets.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Quick Copy: Copy any address to clipboard
  async copyAddressToClipboard(id: string): Promise<boolean> {
    const preset = this.addressPresets.get(id);
    if (!preset) return false;
    
    // In a Node.js environment, we can't directly access clipboard
    // This would be handled by the UI layer
    console.log(`Address copied: ${preset.address}`);
    
    // Update usage tracking
    preset.lastUsed = new Date();
    preset.useCount++;
    await this.saveAddressPreset(preset);
    
    return true;
  }
  
  // Route Presets Management
  async createRoutePreset(preset: Omit<RoutePreset, 'id' | 'createdAt' | 'useCount' | 'totalProfit'>): Promise<string> {
    const id = `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPreset: RoutePreset = {
      ...preset,
      id,
      createdAt: new Date(),
      useCount: 0,
      totalProfit: 0,
    };
    
    await this.saveRoutePreset(newPreset);
    return id;
  }
  
  async getRoutePreset(id: string): Promise<RoutePreset | undefined> {
    return this.routePresets.get(id);
  }
  
  async getAllRoutePresets(): Promise<RoutePreset[]> {
    return Array.from(this.routePresets.values());
  }
  
  async getEnabledRoutePresets(): Promise<RoutePreset[]> {
    return Array.from(this.routePresets.values()).filter(p => p.enabled);
  }
  
  async getAutoExecuteRoutePresets(): Promise<RoutePreset[]> {
    return Array.from(this.routePresets.values()).filter(p => p.enabled && p.autoExecute);
  }
  
  async updateRoutePreset(id: string, updates: Partial<RoutePreset>): Promise<boolean> {
    const preset = this.routePresets.get(id);
    if (!preset) return false;
    
    const updated = { ...preset, ...updates, id: preset.id, createdAt: preset.createdAt };
    await this.saveRoutePreset(updated);
    return true;
  }
  
  async deleteRoutePreset(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.presetsPath, 'routes', `${id}.json`);
      await fs.unlink(filePath);
      this.routePresets.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Usage Tracking: last used, use count, total profit per preset
  async recordRouteUsage(id: string, profit: number): Promise<void> {
    const preset = this.routePresets.get(id);
    if (!preset) return;
    
    preset.lastUsed = new Date();
    preset.useCount++;
    preset.totalProfit += profit;
    
    await this.saveRoutePreset(preset);
  }
  
  // Config Presets Management
  async createConfigPreset(preset: Omit<ConfigPreset, 'id' | 'createdAt' | 'useCount'>): Promise<string> {
    const id = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPreset: ConfigPreset = {
      ...preset,
      id,
      createdAt: new Date(),
      useCount: 0,
    };
    
    await this.saveConfigPreset(newPreset);
    return id;
  }
  
  async getConfigPreset(id: string): Promise<ConfigPreset | undefined> {
    return this.configPresets.get(id);
  }
  
  async getAllConfigPresets(): Promise<ConfigPreset[]> {
    return Array.from(this.configPresets.values());
  }
  
  async updateConfigPreset(id: string, updates: Partial<ConfigPreset>): Promise<boolean> {
    const preset = this.configPresets.get(id);
    if (!preset) return false;
    
    const updated = { ...preset, ...updates, id: preset.id, createdAt: preset.createdAt };
    await this.saveConfigPreset(updated);
    return true;
  }
  
  async deleteConfigPreset(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.presetsPath, 'configs', `${id}.json`);
      await fs.unlink(filePath);
      this.configPresets.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Apply Config Preset
  async applyConfigPreset(id: string): Promise<ConfigPreset | null> {
    const preset = this.configPresets.get(id);
    if (!preset) return null;
    
    // Update usage tracking
    preset.lastUsed = new Date();
    preset.useCount++;
    await this.saveConfigPreset(preset);
    
    return preset;
  }
  
  // Export/Import: JSON format for backup/sharing
  async exportAllPresets(): Promise<string> {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      addresses: Array.from(this.addressPresets.values()),
      routes: Array.from(this.routePresets.values()),
      configs: Array.from(this.configPresets.values()),
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  async exportAddressPresets(): Promise<string> {
    return JSON.stringify(Array.from(this.addressPresets.values()), null, 2);
  }
  
  async exportRoutePresets(): Promise<string> {
    return JSON.stringify(Array.from(this.routePresets.values()), null, 2);
  }
  
  async exportConfigPresets(): Promise<string> {
    return JSON.stringify(Array.from(this.configPresets.values()), null, 2);
  }
  
  async importPresets(jsonData: string): Promise<{ addresses: number; routes: number; configs: number }> {
    try {
      const data = JSON.parse(jsonData);
      let addressCount = 0;
      let routeCount = 0;
      let configCount = 0;
      
      // Import address presets
      if (data.addresses) {
        for (const preset of data.addresses) {
          if (!this.addressPresets.has(preset.id)) {
            await this.saveAddressPreset(preset);
            addressCount++;
          }
        }
      }
      
      // Import route presets
      if (data.routes) {
        for (const preset of data.routes) {
          if (!this.routePresets.has(preset.id)) {
            await this.saveRoutePreset(preset);
            routeCount++;
          }
        }
      }
      
      // Import config presets
      if (data.configs) {
        for (const preset of data.configs) {
          if (!this.configPresets.has(preset.id)) {
            await this.saveConfigPreset(preset);
            configCount++;
          }
        }
      }
      
      console.log(`Imported ${addressCount} addresses, ${routeCount} routes, ${configCount} configs`);
      return { addresses: addressCount, routes: routeCount, configs: configCount };
    } catch (error) {
      console.error('Error importing presets:', error);
      throw error;
    }
  }
  
  // QuickNode KV Sync: Cloud storage + localStorage fallback
  async syncToQuickNodeKV(): Promise<boolean> {
    if (!this.quicknodeClient) {
      console.warn('QuickNode client not configured');
      return false;
    }
    
    try {
      const data = await this.exportAllPresets();
      const success = await this.quicknodeClient.kvSet('presets-backup-v2', data, 86400 * 30); // 30 days TTL
      
      if (success) {
        console.log('✓ Synced presets to QuickNode KV');
      }
      
      return success;
    } catch (error) {
      console.error('Error syncing to QuickNode KV:', error);
      return false;
    }
  }
  
  async restoreFromQuickNodeKV(): Promise<{ addresses: number; routes: number; configs: number }> {
    if (!this.quicknodeClient) {
      throw new Error('QuickNode client not configured');
    }
    
    try {
      const data = await this.quicknodeClient.kvGet('presets-backup-v2');
      if (data) {
        const result = await this.importPresets(data);
        console.log('✓ Restored presets from QuickNode KV');
        return result;
      }
      return { addresses: 0, routes: 0, configs: 0 };
    } catch (error) {
      console.error('Error restoring from QuickNode KV:', error);
      throw error;
    }
  }
  
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(async () => {
      await this.syncToQuickNodeKV();
    }, this.syncInterval * 60 * 1000);
    
    console.log(`Auto-sync enabled (interval: ${this.syncInterval} minutes)`);
  }
  
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      console.log('Auto-sync disabled');
    }
  }
  
  // Private helper methods
  private async saveAddressPreset(preset: AddressPreset): Promise<void> {
    try {
      const filePath = path.join(this.presetsPath, 'addresses', `${preset.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(preset, null, 2));
      this.addressPresets.set(preset.id, preset);
    } catch (error) {
      console.error(`Error saving address preset ${preset.id}:`, error);
    }
  }
  
  private async saveRoutePreset(preset: RoutePreset): Promise<void> {
    try {
      const filePath = path.join(this.presetsPath, 'routes', `${preset.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(preset, null, 2));
      this.routePresets.set(preset.id, preset);
    } catch (error) {
      console.error(`Error saving route preset ${preset.id}:`, error);
    }
  }
  
  private async saveConfigPreset(preset: ConfigPreset): Promise<void> {
    try {
      const filePath = path.join(this.presetsPath, 'configs', `${preset.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(preset, null, 2));
      this.configPresets.set(preset.id, preset);
    } catch (error) {
      console.error(`Error saving config preset ${preset.id}:`, error);
    }
  }
  
  private async loadAllPresets(): Promise<void> {
    await this.loadAddressPresets();
    await this.loadRoutePresets();
    await this.loadConfigPresets();
  }
  
  private async loadAddressPresets(): Promise<void> {
    try {
      const addressDir = path.join(this.presetsPath, 'addresses');
      const files = await fs.readdir(addressDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(addressDir, file), 'utf-8');
          const preset: AddressPreset = JSON.parse(content);
          this.addressPresets.set(preset.id, preset);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
  
  private async loadRoutePresets(): Promise<void> {
    try {
      const routeDir = path.join(this.presetsPath, 'routes');
      const files = await fs.readdir(routeDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(routeDir, file), 'utf-8');
          const preset: RoutePreset = JSON.parse(content);
          this.routePresets.set(preset.id, preset);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
  
  private async loadConfigPresets(): Promise<void> {
    try {
      const configDir = path.join(this.presetsPath, 'configs');
      const files = await fs.readdir(configDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(configDir, file), 'utf-8');
          const preset: ConfigPreset = JSON.parse(content);
          this.configPresets.set(preset.id, preset);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
  
  // Create default presets
  private async createDefaultAddressPresets(): Promise<void> {
    const defaults: Omit<AddressPreset, 'id' | 'createdAt' | 'useCount'>[] = [
      {
        address: 'D4JvG7eGEvyGY9jx2SF4HCBztLxdYihRzGqu3jNTpkin',
        label: 'GXQ Token',
        type: 'token',
        tags: ['gxq', 'ecosystem'],
        notes: 'Main GXQ token',
        category: 'GXQ Ecosystem',
      },
      {
        address: 'DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW',
        label: 'SMS DAO',
        type: 'token',
        tags: ['gxq', 'dao'],
        notes: 'SMS DAO governance token',
        category: 'GXQ Ecosystem',
      },
      {
        address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        label: 'Raydium V4',
        type: 'program',
        tags: ['dex', 'raydium'],
        notes: 'Raydium V4 AMM program',
        category: 'DEX',
      },
      {
        address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
        label: 'Orca Whirlpool',
        type: 'program',
        tags: ['dex', 'orca'],
        notes: 'Orca Whirlpool CLMM program',
        category: 'DEX',
      },
    ];
    
    for (const preset of defaults) {
      await this.createAddressPreset(preset);
    }
  }
  
  private async createDefaultRoutePresets(): Promise<void> {
    const defaults: Omit<RoutePreset, 'id' | 'createdAt' | 'useCount' | 'totalProfit'>[] = [
      {
        name: 'SOL-USDC-USDT Triangle',
        description: 'Classic stablecoin arbitrage triangle',
        route: ['SOL', 'USDC', 'USDT', 'SOL'],
        dexes: ['raydiumV4', 'orcaWhirlpool', 'meteoraPools'],
        autoExecute: false,
        minProfitThreshold: 0.005,
        maxSlippage: 0.01,
        enabled: true,
      },
      {
        name: 'GXQ Ecosystem Loop',
        description: 'GXQ ecosystem arbitrage',
        route: ['GXQ', 'smsUSD', 'SOL', 'GXQ'],
        dexes: ['raydiumV4', 'orcaV2'],
        autoExecute: false,
        minProfitThreshold: 0.008,
        maxSlippage: 0.015,
        enabled: true,
      },
    ];
    
    for (const preset of defaults) {
      await this.createRoutePreset(preset);
    }
  }
  
  private async createDefaultConfigPresets(): Promise<void> {
    const defaults: Omit<ConfigPreset, 'id' | 'createdAt' | 'useCount'>[] = [
      {
        name: 'Conservative',
        description: 'Low risk, stable profit configuration',
        settings: {
          minProfitThreshold: 0.005,
          maxSlippage: 0.008,
          gasBuffer: 1.5,
          maxTradeSize: 100,
          enableFlashLoans: false,
          priorityFee: 10000,
          computeUnitLimit: 200000,
          enableMEVProtection: true,
          enableAutoExecution: false,
        },
      },
      {
        name: 'Aggressive',
        description: 'High risk, high reward configuration',
        settings: {
          minProfitThreshold: 0.015,
          maxSlippage: 0.025,
          gasBuffer: 2.0,
          maxTradeSize: 1000,
          enableFlashLoans: true,
          flashLoanProvider: 'solend',
          priorityFee: 50000,
          computeUnitLimit: 400000,
          enableMEVProtection: true,
          enableAutoExecution: true,
        },
      },
    ];
    
    for (const preset of defaults) {
      await this.createConfigPreset(preset);
    }
  }
  
  // Statistics
  async getStatistics() {
    const routePresets = Array.from(this.routePresets.values());
    
    return {
      totalAddressPresets: this.addressPresets.size,
      totalRoutePresets: this.routePresets.size,
      totalConfigPresets: this.configPresets.size,
      enabledRoutes: routePresets.filter(p => p.enabled).length,
      autoExecuteRoutes: routePresets.filter(p => p.autoExecute).length,
      totalProfit: routePresets.reduce((sum, p) => sum + p.totalProfit, 0),
      mostUsedRoute: routePresets.sort((a, b) => b.useCount - a.useCount)[0],
      mostProfitableRoute: routePresets.sort((a, b) => b.totalProfit - a.totalProfit)[0],
    };
  }
}
