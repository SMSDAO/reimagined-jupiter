import fs from 'fs/promises';
import path from 'path';
import { OpportunityAlert } from './enhancedScanner.js';

export interface OpportunityRecord extends OpportunityAlert {
  id: string;
  executed: boolean;
  executionSignature?: string;
  executionTimestamp?: Date;
  actualProfit?: number;
}

export interface DatabaseStats {
  totalOpportunities: number;
  totalExecuted: number;
  totalProfit: number;
  averageProfit: number;
  successRate: number;
  byType: Record<string, number>;
  byProvider: Record<string, number>;
}

/**
 * Simple file-based database for storing arbitrage opportunities
 * Uses JSON for simplicity and no external dependencies
 */
export class ArbitrageDatabase {
  private dbPath: string;
  private opportunities: Map<string, OpportunityRecord>;
  private loaded: boolean = false;
  
  constructor(dbDirectory: string = './data') {
    this.dbPath = path.join(dbDirectory, 'opportunities.json');
    this.opportunities = new Map();
  }
  
  async initialize(): Promise<void> {
    console.log('[Database] Initializing arbitrage database...');
    
    // Ensure data directory exists
    const dbDir = path.dirname(this.dbPath);
    try {
      await fs.mkdir(dbDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Load existing data
    await this.load();
    
    console.log(`[Database] Loaded ${this.opportunities.size} historical opportunities`);
    this.loaded = true;
  }
  
  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      const records: OpportunityRecord[] = JSON.parse(data);
      
      for (const record of records) {
        // Convert date strings back to Date objects
        record.timestamp = new Date(record.timestamp);
        if (record.executionTimestamp) {
          record.executionTimestamp = new Date(record.executionTimestamp);
        }
        this.opportunities.set(record.id, record);
      }
    } catch (error) {
      // File doesn't exist yet or is invalid - start fresh
      console.log('[Database] No existing data found, starting fresh');
    }
  }
  
  private async save(): Promise<void> {
    try {
      const records = Array.from(this.opportunities.values());
      const data = JSON.stringify(records, null, 2);
      await fs.writeFile(this.dbPath, data, 'utf-8');
    } catch (error) {
      console.error('[Database] Error saving data:', error);
    }
  }
  
  async addOpportunity(opportunity: OpportunityAlert): Promise<string> {
    if (!this.loaded) {
      await this.initialize();
    }
    
    const id = this.generateId();
    const record: OpportunityRecord = {
      ...opportunity,
      id,
      executed: false,
    };
    
    this.opportunities.set(id, record);
    await this.save();
    
    return id;
  }
  
  async markExecuted(
    id: string,
    signature: string,
    actualProfit: number
  ): Promise<void> {
    const record = this.opportunities.get(id);
    if (!record) {
      console.error(`[Database] Opportunity ${id} not found`);
      return;
    }
    
    record.executed = true;
    record.executionSignature = signature;
    record.executionTimestamp = new Date();
    record.actualProfit = actualProfit;
    
    this.opportunities.set(id, record);
    await this.save();
  }
  
  getOpportunity(id: string): OpportunityRecord | undefined {
    return this.opportunities.get(id);
  }
  
  getRecentOpportunities(limit: number = 100): OpportunityRecord[] {
    const records = Array.from(this.opportunities.values());
    return records
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  getOpportunitiesByType(type: string): OpportunityRecord[] {
    return Array.from(this.opportunities.values())
      .filter(opp => opp.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  getExecutedOpportunities(): OpportunityRecord[] {
    return Array.from(this.opportunities.values())
      .filter(opp => opp.executed)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  getStatistics(): DatabaseStats {
    const allOpps = Array.from(this.opportunities.values());
    const executed = allOpps.filter(o => o.executed);
    
    const totalProfit = executed.reduce((sum, o) => sum + (o.actualProfit || 0), 0);
    const averageProfit = executed.length > 0 ? totalProfit / executed.length : 0;
    
    // Count by type
    const byType: Record<string, number> = {};
    for (const opp of allOpps) {
      byType[opp.type] = (byType[opp.type] || 0) + 1;
    }
    
    // Count by provider
    const byProvider: Record<string, number> = {};
    for (const opp of allOpps) {
      if (opp.provider) {
        byProvider[opp.provider] = (byProvider[opp.provider] || 0) + 1;
      }
    }
    
    return {
      totalOpportunities: allOpps.length,
      totalExecuted: executed.length,
      totalProfit,
      averageProfit,
      successRate: allOpps.length > 0 ? executed.length / allOpps.length : 0,
      byType,
      byProvider,
    };
  }
  
  async getHistoricalAnalysis(days: number = 7): Promise<{
    period: string;
    opportunities: number;
    executed: number;
    totalProfit: number;
    topTokens: { token: string; count: number }[];
    topProviders: { provider: string; count: number }[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentOpps = Array.from(this.opportunities.values())
      .filter(opp => opp.timestamp >= cutoffDate);
    
    const executed = recentOpps.filter(o => o.executed);
    const totalProfit = executed.reduce((sum, o) => sum + (o.actualProfit || 0), 0);
    
    // Count tokens
    const tokenCounts: Record<string, number> = {};
    for (const opp of recentOpps) {
      for (const token of opp.tokens) {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1;
      }
    }
    
    const topTokens = Object.entries(tokenCounts)
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Count providers
    const providerCounts: Record<string, number> = {};
    for (const opp of recentOpps) {
      if (opp.provider) {
        providerCounts[opp.provider] = (providerCounts[opp.provider] || 0) + 1;
      }
    }
    
    const topProviders = Object.entries(providerCounts)
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      period: `Last ${days} days`,
      opportunities: recentOpps.length,
      executed: executed.length,
      totalProfit,
      topTokens,
      topProviders,
    };
  }
  
  async exportToJSON(): Promise<string> {
    const records = Array.from(this.opportunities.values());
    return JSON.stringify(records, null, 2);
  }
  
  async clear(): Promise<void> {
    this.opportunities.clear();
    await this.save();
  }
  
  private generateId(): string {
    return `opp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
