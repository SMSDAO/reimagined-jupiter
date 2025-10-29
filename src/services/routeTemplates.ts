import { PresetConfig } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

export interface RouteTemplate {
  id: string;
  name: string;
  description: string;
  tokenPath: string[]; // ['SOL', 'USDC', 'USDT', 'SOL']
  dexes: string[];
  minProfit: number;
  maxSlippage: number;
  autoExecute: boolean;
  executionConditions?: {
    minLiquidity?: number;
    maxPriceImpact?: number;
    timeWindow?: [number, number]; // [start hour, end hour]
  };
  createdAt: Date;
  lastUsed?: Date;
  successRate?: number;
  totalExecutions?: number;
}

export class RouteTemplateManager {
  private templatesPath: string;
  private templates: Map<string, RouteTemplate>;
  
  constructor(templatesPath: string = './route-templates') {
    this.templatesPath = templatesPath;
    this.templates = new Map();
  }
  
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.templatesPath, { recursive: true });
      await this.loadTemplates();
      
      if (this.templates.size === 0) {
        await this.createDefaultTemplates();
      }
    } catch (error) {
      console.error('Error initializing route template manager:', error);
    }
  }
  
  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templatesPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.templatesPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const template: RouteTemplate = JSON.parse(content);
          this.templates.set(template.id, template);
        }
      }
      
      console.log(`Loaded ${this.templates.size} route templates`);
    } catch (error) {
      console.error('Error loading route templates:', error);
    }
  }
  
  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates: RouteTemplate[] = [
      {
        id: 'sol-usdc-quick',
        name: 'SOL-USDC Quick Flip',
        description: 'Fast arbitrage between SOL and USDC',
        tokenPath: ['SOL', 'USDC', 'SOL'],
        dexes: ['Raydium', 'Orca'],
        minProfit: 0.005,
        maxSlippage: 0.01,
        autoExecute: true,
        createdAt: new Date(),
      },
      {
        id: 'stable-triangle',
        name: 'Stablecoin Triangle',
        description: 'Triangular arbitrage across stablecoins',
        tokenPath: ['USDC', 'USDT', 'USDH', 'USDC'],
        dexes: ['Raydium', 'Saber', 'Mercurial'],
        minProfit: 0.003,
        maxSlippage: 0.005,
        autoExecute: true,
        executionConditions: {
          minLiquidity: 100000,
          maxPriceImpact: 0.001,
        },
        createdAt: new Date(),
      },
      {
        id: 'lst-rotation',
        name: 'LST Rotation Strategy',
        description: 'Rotate between liquid staking tokens',
        tokenPath: ['SOL', 'mSOL', 'stSOL', 'SOL'],
        dexes: ['Raydium', 'Orca', 'Saber'],
        minProfit: 0.004,
        maxSlippage: 0.008,
        autoExecute: false,
        executionConditions: {
          timeWindow: [6, 18], // Execute during US hours
        },
        createdAt: new Date(),
      },
      {
        id: 'memecoin-scalp',
        name: 'Memecoin Scalping',
        description: 'High-frequency memecoin trading',
        tokenPath: ['SOL', 'BONK', 'SOL'],
        dexes: ['Raydium', 'Orca', 'Phoenix'],
        minProfit: 0.015,
        maxSlippage: 0.025,
        autoExecute: false,
        executionConditions: {
          maxPriceImpact: 0.02,
        },
        createdAt: new Date(),
      },
    ];
    
    for (const template of defaultTemplates) {
      await this.saveTemplate(template);
    }
  }
  
  private async saveTemplate(template: RouteTemplate): Promise<void> {
    const filePath = path.join(this.templatesPath, `${template.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(template, null, 2));
    this.templates.set(template.id, template);
  }
  
  async createTemplate(template: Omit<RouteTemplate, 'id' | 'createdAt'>): Promise<string> {
    const id = `custom-${Date.now()}`;
    const newTemplate: RouteTemplate = {
      ...template,
      id,
      createdAt: new Date(),
    };
    
    await this.saveTemplate(newTemplate);
    return id;
  }
  
  async updateTemplate(id: string, updates: Partial<RouteTemplate>): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }
    
    const updatedTemplate = { ...template, ...updates };
    await this.saveTemplate(updatedTemplate);
    return true;
  }
  
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.templatesPath, `${id}.json`);
      await fs.unlink(filePath);
      this.templates.delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      return false;
    }
  }
  
  getTemplate(id: string): RouteTemplate | undefined {
    return this.templates.get(id);
  }
  
  getAllTemplates(): RouteTemplate[] {
    return Array.from(this.templates.values());
  }
  
  getAutoExecuteTemplates(): RouteTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.autoExecute);
  }
  
  async recordExecution(id: string, success: boolean): Promise<void> {
    const template = this.templates.get(id);
    if (!template) return;
    
    const totalExecutions = (template.totalExecutions || 0) + 1;
    const successCount = success ? ((template.successRate || 0) * (template.totalExecutions || 0) + 1) : ((template.successRate || 0) * (template.totalExecutions || 0));
    const successRate = successCount / totalExecutions;
    
    await this.updateTemplate(id, {
      lastUsed: new Date(),
      totalExecutions,
      successRate,
    });
  }
  
  async exportTemplates(): Promise<string> {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      templates: Array.from(this.templates.values()),
    };
    return JSON.stringify(data, null, 2);
  }
  
  async importTemplates(jsonData: string): Promise<number> {
    try {
      const data = JSON.parse(jsonData);
      let imported = 0;
      
      for (const template of data.templates) {
        if (!this.templates.has(template.id)) {
          await this.saveTemplate(template);
          imported++;
        }
      }
      
      return imported;
    } catch (error) {
      console.error('Error importing templates:', error);
      throw error;
    }
  }
}
