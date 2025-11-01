import { Connection, PublicKey, Logs } from '@solana/web3.js';
import { config } from '../config/index.js';

export interface PoolCreationEvent {
  dex: string;
  poolAddress: string;
  tokenMint: string;
  baseTokenMint: string;
  timestamp: number;
  initialLiquidity?: number;
}

export interface SniperConfig {
  buyAmount: number; // in SOL
  slippageBps: number;
  autoSnipe: boolean;
  monitoredDEXs: string[];
}

export class SniperBot {
  private connection: Connection;
  private config: SniperConfig;
  private subscriptionIds: Map<string, number> = new Map();
  private monitoring: boolean = false;

  constructor(connection: Connection, sniperConfig: SniperConfig) {
    this.connection = connection;
    this.config = sniperConfig;
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoring) {
      console.warn('[SniperBot] Already monitoring');
      return;
    }

    console.log('[SniperBot] Starting pool creation monitoring...');
    this.monitoring = true;

    // Monitor Raydium pool creation
    if (this.config.monitoredDEXs.includes('raydium')) {
      await this.monitorRaydiumPools();
    }

    // Monitor Pump.fun pool creation
    if (this.config.monitoredDEXs.includes('pumpfun')) {
      await this.monitorPumpFunPools();
    }

    // Monitor Orca pool creation
    if (this.config.monitoredDEXs.includes('orca')) {
      await this.monitorOrcaPools();
    }

    // Monitor Meteora pool creation
    if (this.config.monitoredDEXs.includes('meteora')) {
      await this.monitorMeteoraPools();
    }

    // Monitor Phoenix pool creation
    if (this.config.monitoredDEXs.includes('phoenix')) {
      await this.monitorPhoenixPools();
    }

    console.log(`[SniperBot] Monitoring ${this.config.monitoredDEXs.length} DEXs`);
  }

  async stopMonitoring(): Promise<void> {
    if (!this.monitoring) {
      console.warn('[SniperBot] Not currently monitoring');
      return;
    }

    console.log('[SniperBot] Stopping pool creation monitoring...');

    // Unsubscribe from all log listeners
    for (const [dex, subscriptionId] of this.subscriptionIds.entries()) {
      try {
        await this.connection.removeOnLogsListener(subscriptionId);
        console.log(`[SniperBot] Unsubscribed from ${dex} logs`);
      } catch (error) {
        console.error(`[SniperBot] Error unsubscribing from ${dex}:`, error);
      }
    }

    this.subscriptionIds.clear();
    this.monitoring = false;
    console.log('[SniperBot] Monitoring stopped');
  }

  private async monitorRaydiumPools(): Promise<void> {
    try {
      const raydiumProgramId = config.dexPrograms.raydium;
      console.log(`[SniperBot] Monitoring Raydium pools: ${raydiumProgramId.toString().slice(0, 8)}...`);

      const subscriptionId = this.connection.onLogs(
        raydiumProgramId,
        (logs: Logs) => this.handleRaydiumLog(logs),
        'confirmed'
      );

      this.subscriptionIds.set('raydium', subscriptionId);
      console.log('[SniperBot] Raydium monitoring started');
    } catch (error) {
      console.error('[SniperBot] Error monitoring Raydium pools:', error);
    }
  }

  private async monitorPumpFunPools(): Promise<void> {
    try {
      // Pump.fun program ID (mainnet)
      const pumpFunProgramId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
      console.log(`[SniperBot] Monitoring Pump.fun pools: ${pumpFunProgramId.toString().slice(0, 8)}...`);

      const subscriptionId = this.connection.onLogs(
        pumpFunProgramId,
        (logs: Logs) => this.handlePumpFunLog(logs),
        'confirmed'
      );

      this.subscriptionIds.set('pumpfun', subscriptionId);
      console.log('[SniperBot] Pump.fun monitoring started');
    } catch (error) {
      console.error('[SniperBot] Error monitoring Pump.fun pools:', error);
    }
  }

  private async monitorOrcaPools(): Promise<void> {
    try {
      const orcaProgramId = config.dexPrograms.orca;
      console.log(`[SniperBot] Monitoring Orca pools: ${orcaProgramId.toString().slice(0, 8)}...`);

      const subscriptionId = this.connection.onLogs(
        orcaProgramId,
        (logs: Logs) => this.handleOrcaLog(logs),
        'confirmed'
      );

      this.subscriptionIds.set('orca', subscriptionId);
      console.log('[SniperBot] Orca monitoring started');
    } catch (error) {
      console.error('[SniperBot] Error monitoring Orca pools:', error);
    }
  }

  private async monitorMeteoraPools(): Promise<void> {
    try {
      const meteoraProgramId = config.dexPrograms.meteora;
      console.log(`[SniperBot] Monitoring Meteora pools: ${meteoraProgramId.toString().slice(0, 8)}...`);

      const subscriptionId = this.connection.onLogs(
        meteoraProgramId,
        (logs: Logs) => this.handleMeteoraLog(logs),
        'confirmed'
      );

      this.subscriptionIds.set('meteora', subscriptionId);
      console.log('[SniperBot] Meteora monitoring started');
    } catch (error) {
      console.error('[SniperBot] Error monitoring Meteora pools:', error);
    }
  }

  private async monitorPhoenixPools(): Promise<void> {
    try {
      const phoenixProgramId = config.dexPrograms.phoenix;
      console.log(`[SniperBot] Monitoring Phoenix pools: ${phoenixProgramId.toString().slice(0, 8)}...`);

      const subscriptionId = this.connection.onLogs(
        phoenixProgramId,
        (logs: Logs) => this.handlePhoenixLog(logs),
        'confirmed'
      );

      this.subscriptionIds.set('phoenix', subscriptionId);
      console.log('[SniperBot] Phoenix monitoring started');
    } catch (error) {
      console.error('[SniperBot] Error monitoring Phoenix pools:', error);
    }
  }

  private handleRaydiumLog(logs: Logs): void {
    try {
      // Check for pool initialization in logs
      const hasPoolInit = logs.logs.some(log => 
        log.includes('initialize') || log.includes('InitializePool') || log.includes('init_pool')
      );

      if (hasPoolInit) {
        console.log('[SniperBot] 🎯 Raydium pool creation detected!');
        console.log('[SniperBot] Signature:', logs.signature);
        
        const event: PoolCreationEvent = {
          dex: 'Raydium',
          poolAddress: logs.signature, // Would parse actual pool address
          tokenMint: '', // Would parse from transaction
          baseTokenMint: '', // Would parse from transaction
          timestamp: Date.now(),
        };

        this.handlePoolCreationEvent(event);
      }
    } catch (error) {
      console.error('[SniperBot] Error handling Raydium log:', error);
    }
  }

  private handlePumpFunLog(logs: Logs): void {
    try {
      // Check for token creation/launch in logs
      const hasTokenLaunch = logs.logs.some(log => 
        log.includes('create') || log.includes('launch') || log.includes('initialize')
      );

      if (hasTokenLaunch) {
        console.log('[SniperBot] 🚀 Pump.fun token launch detected!');
        console.log('[SniperBot] Signature:', logs.signature);
        
        const event: PoolCreationEvent = {
          dex: 'Pump.fun',
          poolAddress: logs.signature,
          tokenMint: '', // Would parse from transaction
          baseTokenMint: 'So11111111111111111111111111111111111111112', // SOL
          timestamp: Date.now(),
        };

        this.handlePoolCreationEvent(event);
      }
    } catch (error) {
      console.error('[SniperBot] Error handling Pump.fun log:', error);
    }
  }

  private handleOrcaLog(logs: Logs): void {
    try {
      const hasPoolInit = logs.logs.some(log => 
        log.includes('initialize') || log.includes('InitializePool')
      );

      if (hasPoolInit) {
        console.log('[SniperBot] 🐋 Orca pool creation detected!');
        console.log('[SniperBot] Signature:', logs.signature);
        
        const event: PoolCreationEvent = {
          dex: 'Orca',
          poolAddress: logs.signature,
          tokenMint: '',
          baseTokenMint: '',
          timestamp: Date.now(),
        };

        this.handlePoolCreationEvent(event);
      }
    } catch (error) {
      console.error('[SniperBot] Error handling Orca log:', error);
    }
  }

  private handleMeteoraLog(logs: Logs): void {
    try {
      const hasPoolInit = logs.logs.some(log => 
        log.includes('initialize') || log.includes('create_pool')
      );

      if (hasPoolInit) {
        console.log('[SniperBot] ☄️ Meteora pool creation detected!');
        console.log('[SniperBot] Signature:', logs.signature);
        
        const event: PoolCreationEvent = {
          dex: 'Meteora',
          poolAddress: logs.signature,
          tokenMint: '',
          baseTokenMint: '',
          timestamp: Date.now(),
        };

        this.handlePoolCreationEvent(event);
      }
    } catch (error) {
      console.error('[SniperBot] Error handling Meteora log:', error);
    }
  }

  private handlePhoenixLog(logs: Logs): void {
    try {
      const hasMarketInit = logs.logs.some(log => 
        log.includes('initialize') || log.includes('create_market')
      );

      if (hasMarketInit) {
        console.log('[SniperBot] 🔥 Phoenix market creation detected!');
        console.log('[SniperBot] Signature:', logs.signature);
        
        const event: PoolCreationEvent = {
          dex: 'Phoenix',
          poolAddress: logs.signature,
          tokenMint: '',
          baseTokenMint: '',
          timestamp: Date.now(),
        };

        this.handlePoolCreationEvent(event);
      }
    } catch (error) {
      console.error('[SniperBot] Error handling Phoenix log:', error);
    }
  }

  private handlePoolCreationEvent(event: PoolCreationEvent): void {
    console.log('[SniperBot] Pool creation event:', {
      dex: event.dex,
      poolAddress: event.poolAddress.slice(0, 8) + '...',
      timestamp: new Date(event.timestamp).toISOString(),
    });

    // Dispatch custom event for UI (only in browser environment)
    if (typeof globalThis !== 'undefined' && 'dispatchEvent' in globalThis) {
      const customEvent = new CustomEvent('pool-creation-detected', {
        detail: event,
      });
      (globalThis as any).dispatchEvent(customEvent);
    }

    // Auto-snipe if enabled
    if (this.config.autoSnipe) {
      this.executeSnipe(event);
    }
  }

  private async executeSnipe(event: PoolCreationEvent): Promise<void> {
    try {
      console.log(`[SniperBot] 🎯 Auto-sniping ${event.dex} pool...`);
      console.log(`[SniperBot] Buy amount: ${this.config.buyAmount} SOL`);
      console.log(`[SniperBot] Slippage: ${this.config.slippageBps / 100}%`);
      
      // In production, this would:
      // 1. Parse token details from the transaction
      // 2. Create a swap transaction
      // 3. Submit the transaction with high priority fee
      // 4. Monitor for confirmation
      
      console.log('[SniperBot] ⚠️ Snipe execution not implemented (production mode)');
    } catch (error) {
      console.error('[SniperBot] Error executing snipe:', error);
    }
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }

  getConfig(): SniperConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SniperConfig>): void {
    console.log('[SniperBot] Updating configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }
}
