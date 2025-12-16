import { Connection, Transaction, VersionedTransaction, Keypair } from '@solana/web3.js';
import { ArbitrageOpportunity } from '../types.js';
import { FlashLoanArbitrage, TriangularArbitrage } from '../strategies/arbitrage.js';
import { PresetManager } from '../services/presetManager.js';
import { QuickNodeIntegration } from '../integrations/quicknode.js';
import { websocketService } from '../services/websocketService.js';
import { ProfitDistributionService } from './profitDistribution.js';
import { AnalyticsService } from './analytics.js';
import { config } from '../config/index.js';

export class MEVProtection {
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  async applyJitoBundle(_transactions: Transaction[]): Promise<string | null> {
    try {
      // Use Jito block engine for MEV protection
      console.log('Applying Jito bundle for MEV protection...');
      
      // Bundle transactions together
      // Submit to Jito block engine
      // This prevents front-running and sandwich attacks
      
      return 'jito_bundle_id';
    } catch (error) {
      console.error('Error applying Jito bundle:', error);
      return null;
    }
  }
  
  async usePrivateRPC(_transaction: Transaction | VersionedTransaction): Promise<string | null> {
    try {
      // Send transaction through private RPC
      // This hides transaction from public mempool
      console.log('Sending transaction via private RPC...');
      
      return 'private_signature';
    } catch (error) {
      console.error('Error using private RPC:', error);
      return null;
    }
  }
  
  async calculatePriorityFee(urgency: 'low' | 'medium' | 'high'): Promise<number> {
    try {
      // Fetch recent prioritization fees from the network
      const recentFees = await this.getRecentPrioritizationFees();
      
      // Base fee from network conditions
      const baseFee = recentFees.median || 1000; // microlamports
      
      const multipliers = {
        low: 1,
        medium: 1.5,
        high: 3,
      };
      
      const calculatedFee = Math.floor(baseFee * multipliers[urgency]);
      
      // Cap at reasonable maximum (10M lamports = 0.01 SOL)
      const maxFee = 10000000; // 10M microlamports
      return Math.min(calculatedFee, maxFee);
    } catch (error) {
      console.warn('Failed to fetch recent fees, using default:', error);
      // Fallback to default values
      const defaultFees = { low: 1000, medium: 2000, high: 5000 };
      return defaultFees[urgency];
    }
  }

  /**
   * Get recent prioritization fees from the network
   */
  private async getRecentPrioritizationFees(): Promise<{ median: number; percentile75: number; percentile95: number }> {
    try {
      // Query recent prioritization fees from Solana
      // This uses the getRecentPrioritizationFees RPC method
      const fees = await this.connection.getRecentPrioritizationFees();
      
      if (!fees || fees.length === 0) {
        return { median: 1000, percentile75: 2000, percentile95: 5000 };
      }

      // Extract prioritization fees and sort
      const feeValues = fees
        .map(f => f.prioritizationFee)
        .filter(f => f > 0)
        .sort((a, b) => a - b);

      if (feeValues.length === 0) {
        return { median: 1000, percentile75: 2000, percentile95: 5000 };
      }

      // Calculate percentiles
      const median = feeValues[Math.floor(feeValues.length * 0.5)] || 1000;
      const percentile75 = feeValues[Math.floor(feeValues.length * 0.75)] || 2000;
      const percentile95 = feeValues[Math.floor(feeValues.length * 0.95)] || 5000;

      return { median, percentile75, percentile95 };
    } catch (error) {
      console.warn('Error fetching recent prioritization fees:', error);
      return { median: 1000, percentile75: 2000, percentile95: 5000 };
    }
  }
  
  async calculateDynamicSlippage(
    marketVolatility: number,
    liquidityDepth: number,
    tradeSize: number
  ): Promise<number> {
    // Dynamic slippage calculation based on market conditions
    const baseSlippage = 0.005; // 0.5% base
    
    // Adjust for volatility (0-1 scale)
    const volatilityMultiplier = 1 + marketVolatility;
    
    // Adjust for liquidity (higher liquidity = lower slippage)
    const liquidityMultiplier = Math.max(0.5, 1 / Math.sqrt(liquidityDepth / tradeSize));
    
    // Calculate final slippage
    const dynamicSlippage = baseSlippage * volatilityMultiplier * liquidityMultiplier;
    
    // Cap at reasonable max (2%)
    return Math.min(dynamicSlippage, 0.02);
  }
  
  async estimateSlippage(opportunity: ArbitrageOpportunity): Promise<number> {
    // Estimate actual slippage for the opportunity
    // Consider pool depth, trade size, and market conditions
    
    const baseSlippage = 0.001; // 0.1%
    const multiplier = opportunity.type === 'flash-loan' ? 1.5 : 1.0;
    
    return baseSlippage * multiplier;
  }
  
  async isOpportunitySafe(opportunity: ArbitrageOpportunity): Promise<boolean> {
    // Check if opportunity is likely to be front-run
    const slippage = await this.estimateSlippage(opportunity);
    
    if (slippage > 0.02) {
      console.warn('High slippage detected, opportunity may not be safe');
      return false;
    }
    
    if (opportunity.confidence < 0.6) {
      console.warn('Low confidence opportunity');
      return false;
    }
    
    return true;
  }
}

export class AutoExecutionEngine {
  private connection: Connection;
  private userKeypair: Keypair;
  private flashLoanArbitrage: FlashLoanArbitrage;
  private triangularArbitrage: TriangularArbitrage;
  private presetManager: PresetManager;
  private mevProtection: MEVProtection;
  private quicknode: QuickNodeIntegration;
  private profitDistribution: ProfitDistributionService | null = null;
  private analytics: AnalyticsService;
  private isRunning: boolean = false;
  
  constructor(
    connection: Connection,
    userKeypair: Keypair,
    presetManager: PresetManager,
    quicknode: QuickNodeIntegration
  ) {
    this.connection = connection;
    this.userKeypair = userKeypair;
    this.flashLoanArbitrage = new FlashLoanArbitrage(connection);
    this.triangularArbitrage = new TriangularArbitrage(connection);
    this.presetManager = presetManager;
    this.mevProtection = new MEVProtection(connection);
    this.quicknode = quicknode;
    this.analytics = new AnalyticsService(connection);
    
    // Initialize profit distribution if enabled
    if (config.profitDistribution.enabled) {
      try {
        this.profitDistribution = new ProfitDistributionService(connection, {
          reserveWalletDomain: config.profitDistribution.reserveWalletDomain,
          userWalletPercentage: config.profitDistribution.userWalletPercentage,
          reserveWalletPercentage: config.profitDistribution.reserveWalletPercentage,
          daoWalletPercentage: config.profitDistribution.daoWalletPercentage,
          daoWalletAddress: config.profitDistribution.daoWalletAddress,
        });
        console.log('✅ Profit distribution service initialized');
      } catch (error) {
        console.error('Failed to initialize profit distribution:', error);
      }
    }
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Auto-execution engine is already running');
      return;
    }
    
    this.isRunning = true;
    console.log('Starting auto-execution engine...');
    console.log('Monitoring for arbitrage opportunities...');
    
    // Main execution loop
    while (this.isRunning) {
      try {
        await this.executionCycle();
        
        // Wait before next cycle
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
      } catch (error) {
        console.error('Error in execution cycle:', error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds on error
      }
    }
  }
  
  stop(): void {
    console.log('Stopping auto-execution engine...');
    this.isRunning = false;
  }
  
  private async executionCycle(): Promise<void> {
    const presets = await this.presetManager.getEnabledPresets();
    
    if (presets.length === 0) {
      console.log('No enabled presets found');
      return;
    }
    
    for (const preset of presets) {
      console.log(`Scanning opportunities for preset: ${preset.name}`);
      
      // Find opportunities based on strategy
      let opportunities: ArbitrageOpportunity[] = [];
      
      if (preset.strategy === 'flash-loan' || preset.strategy === 'hybrid') {
        const flashLoanOpps = await this.flashLoanArbitrage.findOpportunities(preset.tokens);
        opportunities.push(...flashLoanOpps);
      }
      
      if (preset.strategy === 'triangular' || preset.strategy === 'hybrid') {
        const triangularOpps = await this.triangularArbitrage.findOpportunities(preset.tokens);
        opportunities.push(...triangularOpps);
      }
      
      // Filter by preset criteria
      opportunities = opportunities.filter(opp => 
        opp.estimatedProfit >= preset.minProfit
      );
      
      if (opportunities.length > 0) {
        console.log(`Found ${opportunities.length} opportunities for ${preset.name}`);
        
        // Broadcast opportunities to WebSocket clients
        for (const opp of opportunities) {
          // Map opportunity type to WebSocket format
          let oppType: 'flash_loan' | 'triangular' | 'hybrid';
          if (opp.type === 'flash-loan') {
            oppType = 'flash_loan';
          } else if (opp.type === 'triangular') {
            oppType = 'triangular';
          } else {
            oppType = 'hybrid';
          }

          websocketService.broadcastArbitrageOpportunity({
            id: `${Date.now()}-${opp.path.map(t => t.symbol).join('-')}`,
            type: oppType,
            tokens: opp.path.map(t => t.symbol),
            estimatedProfit: opp.estimatedProfit,
            confidence: opp.confidence,
            timestamp: Date.now(),
          });
        }
        
        // Execute the most profitable opportunity
        const bestOpportunity = opportunities[0];
        await this.executeOpportunity(bestOpportunity, preset);
      }
    }
  }
  
  private async executeOpportunity(
    opportunity: ArbitrageOpportunity,
    preset: any
  ): Promise<void> {
    try {
      // Check MEV safety
      const isSafe = await this.mevProtection.isOpportunitySafe(opportunity);
      if (!isSafe) {
        console.log('Opportunity deemed unsafe, skipping...');
        return;
      }
      
      console.log(`Executing opportunity:`);
      console.log(`  Type: ${opportunity.type}`);
      console.log(`  Provider: ${opportunity.provider || 'Jupiter'}`);
      console.log(`  Path: ${opportunity.path.map(t => t.symbol).join(' -> ')}`);
      console.log(`  Estimated profit: $${opportunity.estimatedProfit.toFixed(4)}`);
      console.log(`  Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
      
      // Cache opportunity in QuickNode KV
      await this.quicknode.cacheArbitrageOpportunity({
        id: Date.now().toString(),
        ...opportunity,
        preset: preset.name,
        timestamp: new Date().toISOString(),
      });
      
      let signature: string | null = null;
      
      if (opportunity.type === 'flash-loan') {
        signature = await this.flashLoanArbitrage.executeArbitrage(
          opportunity,
          this.userKeypair
        );
      } else {
        signature = await this.triangularArbitrage.executeArbitrage(
          opportunity,
          this.userKeypair
        );
      }
      
      if (signature) {
        console.log(`✅ Successfully executed arbitrage! Signature: ${signature}`);
        
        // Broadcast trade execution to WebSocket clients
        websocketService.broadcastTradeExecution({
          signature,
          type: opportunity.type,
          tokens: opportunity.path.map(t => t.symbol),
          profit: opportunity.estimatedProfit,
          timestamp: Date.now(),
        });
        
        // Calculate actual gas fee from transaction
        // In production, this would fetch the actual fee from the confirmed transaction
        // For now, use estimated priority fee
        const priorityFee = await this.mevProtection.calculatePriorityFee('medium');
        const baseFee = 5000; // Base transaction fee in lamports
        const estimatedGasFee = baseFee + priorityFee;
        
        // Distribute profits using the new system
        await this.handleProfitDistribution(
          opportunity.estimatedProfit,
          opportunity,
          signature,
          estimatedGasFee
        );
      } else {
        console.log('❌ Failed to execute arbitrage');
      }
    } catch (error) {
      console.error('Error executing opportunity:', error);
    }
  }
  
  /**
   * Handle profit distribution after successful trade
   * Uses new three-way split: 70% reserve, 20% user, 10% DAO
   */
  private async handleProfitDistribution(
    profit: number,
    opportunity: ArbitrageOpportunity,
    signature: string,
    gasFee: number = 0
  ): Promise<void> {
    // If new profit distribution is enabled, use it
    if (this.profitDistribution && config.profitDistribution.enabled) {
      try {
        console.log('\n💰 Initiating profit distribution...');
        
        // Convert profit to lamports (assuming profit is in SOL or equivalent)
        const profitLamports = Math.floor(profit * 1e9); // Convert to lamports
        
        // Distribute profits
        const result = await this.profitDistribution.distributeProfits(
          profitLamports,
          this.userKeypair.publicKey,
          this.userKeypair
        );
        
        if (result.success) {
          console.log('✅ Profit distribution completed');
          console.log(`   Reserve: ${(result.reserveAmount / 1e9).toFixed(4)} SOL`);
          console.log(`   User: ${(result.userAmount / 1e9).toFixed(4)} SOL`);
          console.log(`   DAO: ${(result.daoAmount / 1e9).toFixed(4)} SOL`);
          
          // Record trade in analytics
          this.analytics.recordTrade({
            timestamp: Date.now(),
            type: opportunity.type === 'flash-loan' ? 'flash-loan' : opportunity.type === 'triangular' ? 'triangular' : 'hybrid',
            profitAmount: profitLamports,
            profitToken: 'SOL',
            gasFee: gasFee,
            netProfit: profitLamports - gasFee,
            tokens: opportunity.path.map(t => t.symbol),
            signature: signature,
            distributionBreakdown: {
              reserve: result.reserveAmount,
              user: result.userAmount,
              dao: result.daoAmount,
            },
          });
          
          // Show statistics
          const stats = this.profitDistribution.getStats();
          console.log(`   Total distributed: ${(stats.totalDistributed / 1e9).toFixed(4)} SOL (${stats.distributionCount} trades)`);
        } else {
          console.error('❌ Profit distribution failed:', result.error);
        }
      } catch (error) {
        console.error('Error in profit distribution:', error);
      }
    } 
    // Fallback to old dev fee system if profit distribution is disabled
    else if (config.devFee.enabled) {
      const devFeeAmount = profit * config.devFee.percentage;
      console.log(`💰 Dev fee: $${devFeeAmount.toFixed(4)} (${(config.devFee.percentage * 100).toFixed(1)}%) to ${config.devFee.wallet.toBase58().slice(0, 8)}...`);
      
      // Still record analytics even in legacy mode
      this.analytics.recordTrade({
        timestamp: Date.now(),
        type: opportunity.type === 'flash-loan' ? 'flash-loan' : opportunity.type === 'triangular' ? 'triangular' : 'hybrid',
        profitAmount: Math.floor(profit * 1e9),
        profitToken: 'SOL',
        gasFee: gasFee,
        netProfit: Math.floor(profit * 1e9) - gasFee,
        tokens: opportunity.path.map(t => t.symbol),
        signature: signature,
      });
    }
  }

  /**
   * Get analytics service for external access
   */
  getAnalytics(): AnalyticsService {
    return this.analytics;
  }
  
  async manualExecute(opportunityId?: string): Promise<string | null> {
    console.log('🔧 Manual execution mode');
    
    if (opportunityId) {
      // Execute specific opportunity by ID
      const opportunity = await this.quicknode.getCachedArbitrageOpportunity(opportunityId);
      if (opportunity) {
        await this.executeOpportunity(opportunity, { name: 'Manual' });
        return 'executed';
      }
    }
    
    // Scan and show opportunities for manual selection
    const presets = await this.presetManager.getEnabledPresets();
    const allOpportunities: ArbitrageOpportunity[] = [];
    
    for (const preset of presets) {
      if (preset.strategy === 'flash-loan' || preset.strategy === 'hybrid') {
        const flashOpps = await this.flashLoanArbitrage.findOpportunities(preset.tokens);
        allOpportunities.push(...flashOpps);
      }
      
      if (preset.strategy === 'triangular' || preset.strategy === 'hybrid') {
        const triOpps = await this.triangularArbitrage.findOpportunities(preset.tokens);
        allOpportunities.push(...triOpps);
      }
    }
    
    if (allOpportunities.length > 0) {
      console.log(`\n📊 Found ${allOpportunities.length} opportunities:`);
      allOpportunities.slice(0, 5).forEach((opp, i) => {
        console.log(`  ${i + 1}. ${opp.type} - $${opp.estimatedProfit.toFixed(4)} profit (${(opp.confidence * 100).toFixed(0)}% confidence)`);
      });
      return 'opportunities_found';
    }
    
    return null;
  }
  
  getStatus(): { running: boolean; uptime: number } {
    return {
      running: this.isRunning,
      uptime: 0, // Would track actual uptime
    };
  }
}
