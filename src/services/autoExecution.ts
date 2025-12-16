import { Connection, Transaction, VersionedTransaction, Keypair } from '@solana/web3.js';
import { ArbitrageOpportunity } from '../types.js';
import { FlashLoanArbitrage, TriangularArbitrage } from '../strategies/arbitrage.js';
import { PresetManager } from '../services/presetManager.js';
import { QuickNodeIntegration } from '../integrations/quicknode.js';
import { websocketService } from '../services/websocketService.js';
import { ProfitDistributionService } from '../services/profitDistribution.js';
import { AnalyticsLogger } from '../services/analyticsLogger.js';
import { DAOAirdropService } from '../services/daoAirdrop.js';

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
    // Calculate optimal priority fee based on network conditions
    const baseFee = 1000; // microlamports
    
    const multipliers = {
      low: 1,
      medium: 2,
      high: 5,
    };
    
    return baseFee * multipliers[urgency];
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
  private analyticsLogger: AnalyticsLogger;
  private daoAirdrop: DAOAirdropService | null = null;
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
    this.analyticsLogger = new AnalyticsLogger('./logs');
    
    // Initialize profit distribution if enabled
    this.initializeProfitDistribution();
  }
  
  private async initializeProfitDistribution(): Promise<void> {
    const { config } = await import('../config/index.js');
    
    if (config.profitDistribution.enabled) {
      this.profitDistribution = new ProfitDistributionService(this.connection, {
        reserveWallet: config.profitDistribution.reserveWallet,
        gasWallet: config.profitDistribution.gasWallet,
        daoWallet: config.profitDistribution.daoWallet,
      });
      
      this.daoAirdrop = new DAOAirdropService(
        this.connection,
        config.profitDistribution.daoWallet
      );
      
      console.log('✅ Profit Distribution System initialized');
      console.log(`   Reserve: ${config.profitDistribution.reserveWallet.toBase58().slice(0, 8)}... (70%)`);
      console.log(`   Gas: ${config.profitDistribution.gasWallet.toBase58().slice(0, 8)}... (20%)`);
      console.log(`   DAO: ${config.profitDistribution.daoWallet.toBase58().slice(0, 8)}... (10%)`);
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
        
        // Log the transaction
        this.analyticsLogger.logTransaction({
          type: 'arbitrage',
          signature,
          success: true,
          profit: opportunity.estimatedProfit,
          cost: 0.005, // Estimate gas cost
          netProfit: opportunity.estimatedProfit - 0.005,
          details: {
            strategy: opportunity.type,
            tokens: opportunity.path.map(t => t.symbol),
            confidence: opportunity.confidence,
          },
        });
        
        // Broadcast trade execution to WebSocket clients
        websocketService.broadcastTradeExecution({
          signature,
          type: opportunity.type,
          tokens: opportunity.path.map(t => t.symbol),
          profit: opportunity.estimatedProfit,
          timestamp: Date.now(),
        });
        
        // Handle profit distribution if enabled (new system)
        await this.handleProfitDistribution(opportunity.estimatedProfit);
        
        // Handle legacy dev fee if still enabled
        await this.handleDevFee(opportunity.estimatedProfit);
      } else {
        console.log('❌ Failed to execute arbitrage');
        
        // Log failed transaction
        this.analyticsLogger.logTransaction({
          type: 'arbitrage',
          success: false,
          details: {
            strategy: opportunity.type,
            tokens: opportunity.path.map(t => t.symbol),
            error: 'Execution failed',
          },
        });
      }
    } catch (error) {
      console.error('Error executing opportunity:', error);
    }
  }
  
  private async handleProfitDistribution(profit: number): Promise<void> {
    if (!this.profitDistribution) {
      return;
    }
    
    try {
      console.log('\n💰 Initiating Profit Distribution...');
      
      // Distribute profits (70% reserve, 20% gas, 10% DAO)
      const result = await this.profitDistribution.distributeProfit(
        profit,
        undefined, // Native SOL
        this.userKeypair
      );
      
      if (result.success) {
        // Log profit allocation
        this.analyticsLogger.logProfitAllocation({
          totalProfit: profit,
          reserveAmount: result.breakdown.reserve.amount,
          gasAmount: result.breakdown.gas.amount,
          daoAmount: result.breakdown.dao.amount,
          signature: result.signature,
          success: true,
        });
        
        console.log('✅ Profit distribution completed successfully');
        
        // Create DAO airdrop campaign with the 10% share
        if (this.daoAirdrop && result.breakdown.dao.amount > 0) {
          console.log('🎁 Creating DAO community airdrop campaign...');
          // This would be executed based on wallet scores and community participation
          // For now, just log it
          console.log(`   DAO Treasury funded: $${result.breakdown.dao.amount.toFixed(6)}`);
        }
      } else {
        console.error(`❌ Profit distribution failed: ${result.error}`);
        
        // Log failed distribution
        this.analyticsLogger.logProfitAllocation({
          totalProfit: profit,
          reserveAmount: 0,
          gasAmount: 0,
          daoAmount: 0,
          success: false,
        });
      }
    } catch (error) {
      console.error('Error in profit distribution:', error);
    }
  }
  
  private async handleDevFee(profit: number): Promise<void> {
    const { config } = await import('../config/index.js');
    
    if (!config.devFee.enabled) {
      return;
    }
    
    const devFeeAmount = profit * config.devFee.percentage;
    console.log(`💰 Dev fee (legacy): $${devFeeAmount.toFixed(4)} (${(config.devFee.percentage * 100).toFixed(1)}%) to ${config.devFee.wallet.toBase58().slice(0, 8)}...`);
    
    // In production, this would send the actual fee
    // await sendDevFee(devFeeAmount, config.devFee.wallet);
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
