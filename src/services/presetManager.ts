import { PresetConfig } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

export class PresetManager {
  private presetsPath: string;
  private presets: Map<string, PresetConfig>;
  
  constructor(presetsPath: string = './presets') {
    this.presetsPath = presetsPath;
    this.presets = new Map();
  }
  
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.presetsPath, { recursive: true });
      await this.loadPresets();
      
      // Create default presets if none exist
      if (this.presets.size === 0) {
        await this.createDefaultPresets();
      }
    } catch (error) {
      console.error('Error initializing preset manager:', error);
    }
  }
  
  private async loadPresets(): Promise<void> {
    try {
      const files = await fs.readdir(this.presetsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.presetsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const preset: PresetConfig = JSON.parse(content);
          this.presets.set(preset.id, preset);
        }
      }
      
      console.log(`Loaded ${this.presets.size} presets`);
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  }
  
  private async createDefaultPresets(): Promise<void> {
    const defaultPresets: PresetConfig[] = [
      {
        id: 'stable-flash-loan',
        name: 'Stablecoin Flash Loan Arbitrage',
        description: 'Low-risk arbitrage using stablecoins and flash loans',
        strategy: 'flash-loan',
        tokens: ['USDC', 'USDT', 'USDH', 'UXD'],
        dexes: ['Raydium', 'Orca', 'Saber', 'Mercurial'],
        minProfit: 0.003,
        maxSlippage: 0.005,
        enabled: true,
      },
      {
        id: 'sol-triangular',
        name: 'SOL Triangular Arbitrage',
        description: 'Triangular arbitrage with SOL as base token',
        strategy: 'triangular',
        tokens: ['SOL', 'USDC', 'USDT', 'RAY', 'ORCA'],
        dexes: ['Raydium', 'Orca', 'Serum', 'Lifinity'],
        minProfit: 0.005,
        maxSlippage: 0.01,
        enabled: true,
      },
      {
        id: 'lst-arbitrage',
        name: 'Liquid Staking Token Arbitrage',
        description: 'Arbitrage opportunities in LST ecosystem',
        strategy: 'hybrid',
        tokens: ['SOL', 'mSOL', 'stSOL', 'jitoSOL', 'bSOL'],
        dexes: ['Raydium', 'Orca', 'Saber'],
        minProfit: 0.004,
        maxSlippage: 0.008,
        enabled: true,
      },
      {
        id: 'memecoin-flash',
        name: 'Memecoin Flash Arbitrage',
        description: 'High-risk, high-reward memecoin arbitrage',
        strategy: 'flash-loan',
        tokens: ['BONK', 'WIF', 'SAMO', 'MYRO', 'POPCAT'],
        dexes: ['Raydium', 'Orca', 'Lifinity'],
        minProfit: 0.01,
        maxSlippage: 0.02,
        enabled: false,
      },
      {
        id: 'gxq-ecosystem',
        name: 'GXQ Ecosystem Arbitrage',
        description: 'Arbitrage within GXQ token ecosystem',
        strategy: 'hybrid',
        tokens: ['GXQ', 'sGXQ', 'xGXQ', 'SOL', 'USDC'],
        dexes: ['Raydium', 'Orca'],
        minProfit: 0.005,
        maxSlippage: 0.01,
        enabled: true,
      },
      {
        id: 'defi-tokens',
        name: 'DeFi Token Arbitrage',
        description: 'Arbitrage across major DeFi tokens',
        strategy: 'triangular',
        tokens: ['JUP', 'RAY', 'ORCA', 'MNGO', 'SRM'],
        dexes: ['Raydium', 'Orca', 'Serum', 'Aldrin'],
        minProfit: 0.006,
        maxSlippage: 0.012,
        enabled: true,
      },
    ];
    
    for (const preset of defaultPresets) {
      await this.savePreset(preset);
    }
  }
  
  async savePreset(preset: PresetConfig): Promise<void> {
    try {
      const filePath = path.join(this.presetsPath, `${preset.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(preset, null, 2));
      this.presets.set(preset.id, preset);
      console.log(`Saved preset: ${preset.name}`);
    } catch (error) {
      console.error(`Error saving preset ${preset.id}:`, error);
    }
  }
  
  async getPreset(id: string): Promise<PresetConfig | undefined> {
    return this.presets.get(id);
  }
  
  async getAllPresets(): Promise<PresetConfig[]> {
    return Array.from(this.presets.values());
  }
  
  async getEnabledPresets(): Promise<PresetConfig[]> {
    return Array.from(this.presets.values()).filter(p => p.enabled);
  }
  
  async updatePreset(id: string, updates: Partial<PresetConfig>): Promise<boolean> {
    const preset = this.presets.get(id);
    if (!preset) {
      console.error(`Preset ${id} not found`);
      return false;
    }
    
    const updatedPreset = { ...preset, ...updates, id: preset.id };
    await this.savePreset(updatedPreset);
    return true;
  }
  
  async deletePreset(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.presetsPath, `${id}.json`);
      await fs.unlink(filePath);
      this.presets.delete(id);
      console.log(`Deleted preset: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting preset ${id}:`, error);
      return false;
    }
  }
  
  async enablePreset(id: string): Promise<boolean> {
    return await this.updatePreset(id, { enabled: true });
  }
  
  async disablePreset(id: string): Promise<boolean> {
    return await this.updatePreset(id, { enabled: false });
  }
  
  async createCustomPreset(preset: Omit<PresetConfig, 'id'>): Promise<string> {
    const id = `custom-${Date.now()}`;
    const newPreset: PresetConfig = { ...preset, id };
    await this.savePreset(newPreset);
    return id;
  }
  
  async exportPresets(): Promise<string> {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      presets: Array.from(this.presets.values()),
    };
    return JSON.stringify(data, null, 2);
  }
  
  async importPresets(jsonData: string): Promise<number> {
    try {
      const data = JSON.parse(jsonData);
      let imported = 0;
      
      for (const preset of data.presets) {
        // Skip if already exists
        if (!this.presets.has(preset.id)) {
          await this.savePreset(preset);
          imported++;
        }
      }
      
      console.log(`Imported ${imported} presets`);
      return imported;
    } catch (error) {
      console.error('Error importing presets:', error);
      throw error;
    }
  }
  
  async syncToQuickNodeKV(quicknode: any): Promise<boolean> {
    try {
      const presetsData = await this.exportPresets();
      const success = await quicknode.kvSet('presets-backup', presetsData, 86400 * 7); // 7 days TTL
      console.log('Synced presets to QuickNode KV');
      return success;
    } catch (error) {
      console.error('Error syncing to QuickNode KV:', error);
      return false;
    }
  }
  
  async restoreFromQuickNodeKV(quicknode: any): Promise<number> {
    try {
      const presetsData = await quicknode.kvGet('presets-backup');
      if (presetsData) {
        const imported = await this.importPresets(presetsData);
        console.log(`Restored ${imported} presets from QuickNode KV`);
        return imported;
      }
      return 0;
    } catch (error) {
      console.error('Error restoring from QuickNode KV:', error);
      return 0;
    }
  }
}
