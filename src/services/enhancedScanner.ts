import { Connection } from '@solana/web3.js';
import { JupiterV6Integration } from '../integrations/jupiter.js';
import { SUPPORTED_TOKENS, config } from '../config/index.js';
import { SecurityValidator } from '../utils/security.js';
import { 
  MarginfiProvider, 
  SolendProvider, 
  MangoProvider, 
  KaminoProvider, 
  PortFinanceProvider,
  SaveFinanceProvider 
} from '../providers/flashLoan.js';
import {
  RaydiumDEX,
  OrcaDEX,
  SerumDEX,
  SaberDEX,
  MercurialDEX,
  LifinityDEX,
  AldrinDEX,
  CremaDEX,
  MeteoraDEX,
  PhoenixDEX,
  OpenBookDEX,
  FluxBeamDEX
} from '../dex/index.js';

export interface ScannerConfig {
  pollingIntervalMs: number;
  minProfitThreshold: number;
  maxSlippage: number;
  enableLiveUpdates: boolean;
  enableNotifications: boolean;
}

export interface OpportunityAlert {
  timestamp: Date;
  type: 'flash-loan' | 'triangular' | 'cross-dex';
  tokens: string[];
  estimatedProfit: number;
  confidence: number;
  provider?: string;
  dexes: string[];
  gasEstimate: number;
  details: string;
}

export class EnhancedArbitrageScanner {
  private connection: Connection;
  private jupiter: JupiterV6Integration;
  private flashLoanProviders: Map<string, any>;
  private dexes: Map<string, any>;
  private config: ScannerConfig;
  private isScanning: boolean = false;
  private scanCount: number = 0;
  private opportunitiesFound: OpportunityAlert[] = [];
  
  constructor(connection: Connection, scannerConfig?: Partial<ScannerConfig>) {
    this.connection = connection;
    this.jupiter = new JupiterV6Integration(connection);
    
    // Default configuration
    this.config = {
      pollingIntervalMs: scannerConfig?.pollingIntervalMs || 1000, // 1 second default
      minProfitThreshold: scannerConfig?.minProfitThreshold || config.arbitrage.minProfitThreshold,
      maxSlippage: scannerConfig?.maxSlippage || config.arbitrage.maxSlippage,
      enableLiveUpdates: scannerConfig?.enableLiveUpdates ?? true,
      enableNotifications: scannerConfig?.enableNotifications ?? true,
    };
    
    // Initialize flash loan providers
    this.flashLoanProviders = new Map();
    this.flashLoanProviders.set('marginfi', new MarginfiProvider(
      connection,
      config.flashLoanProviders.marginfi,
      0.09
    ));
    this.flashLoanProviders.set('solend', new SolendProvider(
      connection,
      config.flashLoanProviders.solend,
      0.10
    ));
    this.flashLoanProviders.set('mango', new MangoProvider(
      connection,
      config.flashLoanProviders.mango,
      0.15
    ));
    this.flashLoanProviders.set('kamino', new KaminoProvider(
      connection,
      config.flashLoanProviders.kamino,
      0.12
    ));
    this.flashLoanProviders.set('portFinance', new PortFinanceProvider(
      connection,
      config.flashLoanProviders.portFinance,
      0.20
    ));
    this.flashLoanProviders.set('saveFinance', new SaveFinanceProvider(
      connection,
      config.flashLoanProviders.saveFinance,
      0.11
    ));
    
    // Initialize DEXes (12 native + Jupiter as aggregator = 20+ effective aggregators)
    this.dexes = new Map();
    this.dexes.set('raydium', new RaydiumDEX(connection, config.dexPrograms.raydium));
    this.dexes.set('orca', new OrcaDEX(connection, config.dexPrograms.orca));
    this.dexes.set('serum', new SerumDEX(connection, config.dexPrograms.serum));
    this.dexes.set('saber', new SaberDEX(connection, config.dexPrograms.saber));
    this.dexes.set('mercurial', new MercurialDEX(connection, config.dexPrograms.mercurial));
    this.dexes.set('lifinity', new LifinityDEX(connection, config.dexPrograms.lifinity));
    this.dexes.set('aldrin', new AldrinDEX(connection, config.dexPrograms.aldrin));
    this.dexes.set('crema', new CremaDEX(connection, config.dexPrograms.crema));
    this.dexes.set('meteora', new MeteoraDEX(connection, config.dexPrograms.meteora));
    this.dexes.set('phoenix', new PhoenixDEX(connection, config.dexPrograms.phoenix));
    this.dexes.set('openbook', new OpenBookDEX(connection, config.dexPrograms.openbook));
    this.dexes.set('fluxbeam', new FluxBeamDEX(connection, config.dexPrograms.fluxbeam));
  }
  
  async startScanning(): Promise<void> {
    if (this.isScanning) {
      console.log('[Scanner] Already scanning...');
      return;
    }
    
    // Validate configuration and security
    const rpcUrl = config.solana.rpcUrl;
    const securityCheck = SecurityValidator.validateMainnetConfig(rpcUrl);
    
    if (securityCheck.warnings.length > 0) {
      console.log('[Scanner] ⚠️  Security warnings:');
      for (const warning of securityCheck.warnings) {
        console.log(`  - ${warning}`);
      }
      console.log('');
    }
    
    if (!SecurityValidator.validateSlippage(this.config.maxSlippage)) {
      console.error('[Scanner] Invalid slippage configuration');
      return;
    }
    
    this.isScanning = true;
    console.log('[Scanner] 🚀 Starting enhanced arbitrage scanner...');
    console.log(`[Scanner] Polling interval: ${this.config.pollingIntervalMs}ms`);
    console.log(`[Scanner] Min profit threshold: ${(this.config.minProfitThreshold * 100).toFixed(2)}%`);
    console.log(`[Scanner] Max slippage: ${(this.config.maxSlippage * 100).toFixed(2)}%`);
    console.log(`[Scanner] Flash loan providers: ${this.flashLoanProviders.size}`);
    console.log(`[Scanner] DEX integrations: ${this.dexes.size}`);
    console.log(`[Scanner] Jupiter aggregator: enabled (20+ routes)`);
    console.log(`[Scanner] Security validations: enabled\n`);
    
    SecurityValidator.logSecurityEvent('info', 'Scanner started', {
      pollingMs: this.config.pollingIntervalMs,
      minProfit: this.config.minProfitThreshold,
    });
    
    while (this.isScanning) {
      const startTime = Date.now();
      
      try {
        await this.performScan();
      } catch (error) {
        console.error('[Scanner] Error during scan:', error);
      }
      
      const scanDuration = Date.now() - startTime;
      const waitTime = Math.max(0, this.config.pollingIntervalMs - scanDuration);
      
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
  }
  
  stopScanning(): void {
    console.log('[Scanner] 🛑 Stopping scanner...');
    this.isScanning = false;
  }
  
  private async performScan(): Promise<void> {
    this.scanCount++;
    
    if (this.config.enableLiveUpdates && this.scanCount % 10 === 0) {
      console.log(`[Scanner] 🔍 Scan #${this.scanCount} | Opportunities found: ${this.opportunitiesFound.length}`);
    }
    
    // Scan for different types of opportunities in parallel
    const [flashLoanOpps, triangularOpps, crossDexOpps] = await Promise.all([
      this.scanFlashLoanOpportunities(),
      this.scanTriangularOpportunities(),
      this.scanCrossDexOpportunities(),
    ]);
    
    // Process and notify about opportunities with security validation
    const allOpportunities = [...flashLoanOpps, ...triangularOpps, ...crossDexOpps];
    for (const opp of allOpportunities) {
      if (opp.estimatedProfit >= this.config.minProfitThreshold) {
        // Security validation
        const validation = SecurityValidator.validateOpportunity(
          opp.estimatedProfit,
          opp.gasEstimate,
          opp.confidence,
          config.scanner.minConfidence
        );
        
        if (!validation.valid) {
          SecurityValidator.logSecurityEvent('warn', 'Opportunity rejected', {
            reason: validation.reason,
            profit: opp.estimatedProfit,
          });
          continue;
        }
        
        this.opportunitiesFound.push(opp);
        if (this.config.enableNotifications) {
          this.notifyOpportunity(opp);
        }
      }
    }
  }
  
  private async scanFlashLoanOpportunities(): Promise<OpportunityAlert[]> {
    const opportunities: OpportunityAlert[] = [];
    
    // Scan top token pairs using Jupiter quotes
    const topTokens = SUPPORTED_TOKENS.filter(t => 
      ['SOL', 'USDC', 'USDT', 'RAY', 'ORCA', 'mSOL', 'jitoSOL'].includes(t.symbol)
    );
    
    for (const tokenA of topTokens) {
      for (const tokenB of topTokens) {
        if (tokenA.symbol === tokenB.symbol) continue;
        
        // Get quotes from Jupiter for both directions
        const amount = 1000 * Math.pow(10, tokenA.decimals); // 1000 tokens
        
        const [quoteAB, quoteBA] = await Promise.all([
          this.jupiter.getQuote(
            tokenA.mint.toString(),
            tokenB.mint.toString(),
            amount,
            this.config.maxSlippage * 10000
          ),
          this.jupiter.getQuote(
            tokenB.mint.toString(),
            tokenA.mint.toString(),
            amount,
            this.config.maxSlippage * 10000
          ),
        ]);
        
        if (!quoteAB || !quoteBA) continue;
        
        // Calculate arbitrage opportunity with flash loan
        for (const [providerName, provider] of this.flashLoanProviders.entries()) {
          const PERCENTAGE_DIVISOR = 100;
          const fee = provider.getFee() / PERCENTAGE_DIVISOR;
          const backToA = parseInt(quoteBA.outAmount);
          
          // Simple arbitrage check: borrow A, swap to B, swap back to A
          // Profit = final A amount - borrowed A amount - flash loan fee
          const profit = (backToA - amount) - (amount * fee);
          const profitPercent = profit / amount;
          
          if (profitPercent > this.config.minProfitThreshold) {
            const gasEstimate = await this.estimateGasCost();
            
            opportunities.push({
              timestamp: new Date(),
              type: 'flash-loan',
              tokens: [tokenA.symbol, tokenB.symbol],
              estimatedProfit: profitPercent,
              confidence: 0.85,
              provider: providerName,
              dexes: ['jupiter'],
              gasEstimate,
              details: `${tokenA.symbol} -> ${tokenB.symbol} -> ${tokenA.symbol} via ${providerName}`,
            });
          }
        }
      }
    }
    
    return opportunities;
  }
  
  private async scanTriangularOpportunities(): Promise<OpportunityAlert[]> {
    const opportunities: OpportunityAlert[] = [];
    
    // Focus on common triangular paths
    const commonPaths = [
      ['SOL', 'USDC', 'RAY'],
      ['SOL', 'USDC', 'ORCA'],
      ['USDC', 'USDT', 'SOL'],
      ['mSOL', 'SOL', 'USDC'],
    ];
    
    for (const path of commonPaths) {
      const tokens = path.map(sym => SUPPORTED_TOKENS.find(t => t.symbol === sym)).filter((t): t is typeof SUPPORTED_TOKENS[0] => t !== undefined);
      if (tokens.length !== 3) continue;
      
      const [tokenA, tokenB, tokenC] = tokens;
      const amount = 1000 * Math.pow(10, tokenA.decimals);
      
      try {
        // A -> B -> C -> A
        const result = await this.jupiter.findTriangularArbitrage(
          tokenA.mint.toString(),
          tokenB.mint.toString(),
          tokenC.mint.toString(),
          amount
        );
        
        if (result && result.profitable) {
          const profitPercent = result.profit / amount;
          
          if (profitPercent > this.config.minProfitThreshold) {
            const gasEstimate = await this.estimateGasCost();
            
            opportunities.push({
              timestamp: new Date(),
              type: 'triangular',
              tokens: [tokenA.symbol, tokenB.symbol, tokenC.symbol],
              estimatedProfit: profitPercent,
              confidence: 0.75,
              dexes: ['jupiter'],
              gasEstimate,
              details: `${tokenA.symbol} -> ${tokenB.symbol} -> ${tokenC.symbol} -> ${tokenA.symbol}`,
            });
          }
        }
      } catch (error) {
        // Silently continue - many paths may not have liquidity
      }
    }
    
    return opportunities;
  }
  
  private async scanCrossDexOpportunities(): Promise<OpportunityAlert[]> {
    const opportunities: OpportunityAlert[] = [];
    
    // Scan for price discrepancies across different DEXes
    const tokenPairs = [
      ['SOL', 'USDC'],
      ['SOL', 'USDT'],
      ['USDC', 'USDT'],
    ];
    
    for (const [symbolA, symbolB] of tokenPairs) {
      const tokenA = SUPPORTED_TOKENS.find(t => t.symbol === symbolA);
      const tokenB = SUPPORTED_TOKENS.find(t => t.symbol === symbolB);
      
      if (!tokenA || !tokenB) continue;
      
      // Validate token mints
      if (!SecurityValidator.validateTokenMint(tokenA.mint) || 
          !SecurityValidator.validateTokenMint(tokenB.mint)) {
        continue;
      }
      
      const amount = 1000 * Math.pow(10, tokenA.decimals);
      
      // Validate amount
      if (!SecurityValidator.validateAmount(amount, tokenA.decimals)) {
        continue;
      }
      
      // Get Jupiter quote (aggregates multiple DEXes)
      const jupiterQuote = await this.jupiter.getQuote(
        tokenA.mint.toString(),
        tokenB.mint.toString(),
        amount,
        this.config.maxSlippage * 10000
      );
      
      if (!jupiterQuote) continue;
      
      const jupiterRate = parseInt(jupiterQuote.outAmount) / amount;
      
      // Compare with individual DEX quotes
      for (const [dexName, dex] of this.dexes.entries()) {
        try {
          const dexQuote = await dex.getQuote(tokenA.mint, tokenB.mint, amount);
          
          if (dexQuote > 0) {
            const dexRate = dexQuote / amount;
            const priceDiff = Math.abs(jupiterRate - dexRate) / jupiterRate;
            
            if (priceDiff > this.config.minProfitThreshold) {
              const gasEstimate = await this.estimateGasCost();
              
              opportunities.push({
                timestamp: new Date(),
                type: 'cross-dex',
                tokens: [symbolA, symbolB],
                estimatedProfit: priceDiff,
                confidence: 0.70,
                dexes: ['jupiter', dexName],
                gasEstimate,
                details: `Price discrepancy between Jupiter and ${dexName}`,
              });
            }
          }
        } catch (error) {
          // Continue to next DEX
        }
      }
    }
    
    return opportunities;
  }
  
  private async estimateGasCost(): Promise<number> {
    try {
      // Get recent prioritization fees
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (recentFees && recentFees.length > 0) {
        // Use median fee
        const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b);
        const medianFee = fees[Math.floor(fees.length / 2)];
        
        // Estimate compute units for arbitrage transaction
        const estimatedComputeUnits = 200000; // Typical for swap transactions
        
        // Total cost in lamports
        const totalCost = (medianFee * estimatedComputeUnits) / 1000000;
        
        // Apply gas buffer
        return totalCost * config.arbitrage.gasBuffer;
      }
    } catch (error) {
      console.error('[Scanner] Error estimating gas:', error);
    }
    
    // Fallback to conservative estimate (5000 lamports)
    return 5000 * config.arbitrage.gasBuffer;
  }
  
  private notifyOpportunity(opportunity: OpportunityAlert): void {
    const profitPercent = (opportunity.estimatedProfit * 100).toFixed(3);
    const gasInSol = (opportunity.gasEstimate / 1e9).toFixed(6);
    
    console.log('\n🎯 [OPPORTUNITY DETECTED]');
    console.log(`   Type: ${opportunity.type}`);
    console.log(`   Tokens: ${opportunity.tokens.join(' -> ')}`);
    console.log(`   Profit: ${profitPercent}%`);
    console.log(`   Confidence: ${(opportunity.confidence * 100).toFixed(0)}%`);
    console.log(`   DEXes: ${opportunity.dexes.join(', ')}`);
    console.log(`   Gas Estimate: ${gasInSol} SOL`);
    if (opportunity.provider) {
      console.log(`   Flash Loan Provider: ${opportunity.provider}`);
    }
    console.log(`   Details: ${opportunity.details}`);
    console.log(`   Timestamp: ${opportunity.timestamp.toISOString()}\n`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getStatistics(): {
    totalScans: number;
    opportunitiesFound: number;
    recentOpportunities: OpportunityAlert[];
  } {
    return {
      totalScans: this.scanCount,
      opportunitiesFound: this.opportunitiesFound.length,
      recentOpportunities: this.opportunitiesFound.slice(-10),
    };
  }
  
  getOpportunities(): OpportunityAlert[] {
    return [...this.opportunitiesFound];
  }
  
  clearHistory(): void {
    this.opportunitiesFound = [];
    this.scanCount = 0;
  }
}
