import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from './config/index.js';
import { QuickNodeIntegration } from './integrations/quicknode.js';
import { PresetManager } from './services/presetManager.js';
import { AirdropChecker } from './services/airdropChecker.js';
import { AutoExecutionEngine } from './services/autoExecution.js';
import { FlashLoanArbitrage, TriangularArbitrage } from './strategies/arbitrage.js';
import { AddressBook } from './services/addressBook.js';
import { WalletScoring } from './services/walletScoring.js';
import { RouteTemplateManager } from './services/routeTemplates.js';
import { EnhancedArbitrageScanner } from './services/enhancedScanner.js';
import { ArbitrageDatabase } from './services/database.js';
import { RealTimeArbitrageScanner } from './services/realTimeArbitrageScanner.js';
import { enforceProductionSafety } from './utils/productionGuardrails.js';

class GXQStudio {
  private connection: Connection;
  private userKeypair: Keypair | null = null;
  private quicknode: QuickNodeIntegration;
  private presetManager: PresetManager;
  private airdropChecker: AirdropChecker | null = null;
  private autoExecutionEngine: AutoExecutionEngine | null = null;
  private flashLoanArbitrage: FlashLoanArbitrage;
  private triangularArbitrage: TriangularArbitrage;
  private addressBook: AddressBook;
  private walletScoring: WalletScoring;
  private routeTemplates: RouteTemplateManager;
  private enhancedScanner: EnhancedArbitrageScanner;
  private database: ArbitrageDatabase;
  private realTimeScanner: RealTimeArbitrageScanner;
  
  constructor() {
    // Initialize QuickNode first
    this.quicknode = new QuickNodeIntegration();
    this.connection = this.quicknode.getRpcConnection();
    
    // Initialize services
    this.presetManager = new PresetManager('./presets');
    this.flashLoanArbitrage = new FlashLoanArbitrage(this.connection);
    this.triangularArbitrage = new TriangularArbitrage(this.connection);
    this.addressBook = new AddressBook('./address-book');
    this.walletScoring = new WalletScoring(this.connection);
    this.routeTemplates = new RouteTemplateManager('./route-templates');
    this.enhancedScanner = new EnhancedArbitrageScanner(this.connection);
    this.database = new ArbitrageDatabase('./data');
    this.realTimeScanner = new RealTimeArbitrageScanner(this.connection);
    
    // Initialize user keypair if available
    if (config.solana.walletPrivateKey) {
      try {
        const privateKeyBytes = bs58.decode(config.solana.walletPrivateKey);
        this.userKeypair = Keypair.fromSecretKey(privateKeyBytes);
        this.airdropChecker = new AirdropChecker(this.connection, this.userKeypair.publicKey);
        this.autoExecutionEngine = new AutoExecutionEngine(
          this.connection,
          this.userKeypair,
          this.presetManager,
          this.quicknode
        );
      } catch (error) {
        console.warn('Invalid wallet private key, running in read-only mode');
      }
    }
  }
  
  async initialize(): Promise<void> {
    console.log('🚀 Initializing GXQ STUDIO...');
    console.log('The most advanced Solana flash loan arbitrage system\n');
    
    // Run production safety checks
    await enforceProductionSafety(this.connection);
    
    await this.presetManager.initialize();
    await this.addressBook.initialize();
    await this.routeTemplates.initialize();
    await this.database.initialize();
    
    console.log('✅ Initialization complete\n');
    this.printSystemInfo();
  }
  
  private printSystemInfo(): void {
    console.log('📊 System Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 QuickNode Integration: ${config.quicknode.rpcUrl ? '✓' : '✗'}`);
    console.log(`💰 Flash Loan Providers: 6`);
    console.log(`   - Marginfi (${config.flashLoanProviders.marginfi.toBase58().slice(0, 8)}...) - 0.09% fee`);
    console.log(`   - Solend (${config.flashLoanProviders.solend.toBase58().slice(0, 8)}...) - 0.10% fee`);
    console.log(`   - Save Finance (${config.flashLoanProviders.saveFinance.toBase58().slice(0, 8)}...) - 0.11% fee`);
    console.log(`   - Kamino (${config.flashLoanProviders.kamino.toBase58().slice(0, 8)}...) - 0.12% fee`);
    console.log(`   - Mango (${config.flashLoanProviders.mango.toBase58().slice(0, 8)}...) - 0.15% fee`);
    console.log(`   - Port Finance (${config.flashLoanProviders.portFinance.toBase58().slice(0, 8)}...) - 0.20% fee`);
    console.log(`🔄 DEX Programs: 12`);
    console.log(`   - Raydium, Orca, Serum, Saber`);
    console.log(`   - Mercurial, Lifinity, Aldrin, Crema`);
    console.log(`   - Meteora, Phoenix, OpenBook, FluxBeam`);
    console.log(`📈 Jupiter v6: ${config.jupiter.programId.toBase58().slice(0, 8)}...`);
    console.log(`🪙 Supported Tokens: 30+`);
    console.log(`🎁 Airdrop Checker: ${this.airdropChecker ? '✓' : '✗'}`);
    console.log(`⚡ Auto-Execution: ${this.autoExecutionEngine ? '✓' : '✗'}`);
    console.log(`🛡️  MEV Protection: ✓`);
    console.log(`💎 GXQ Ecosystem: ${config.gxq.tokenMint.toBase58().slice(0, 8)}...`);
    console.log(`🔍 Enhanced Scanner: ✓ (1s polling, 20+ aggregators)`);
    console.log(`💾 Database: ✓ (Historical analysis enabled)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  async checkAirdrops(): Promise<void> {
    if (!this.airdropChecker) {
      console.error('Airdrop checker not available (wallet not configured)');
      return;
    }
    
    console.log('🎁 Checking for available airdrops...\n');
    const airdrops = await this.airdropChecker.checkAllAirdrops();
    
    if (airdrops.length === 0) {
      console.log('No claimable airdrops found.');
      return;
    }
    
    console.log(`Found ${airdrops.length} claimable airdrops:\n`);
    for (const airdrop of airdrops) {
      console.log(`  ${airdrop.protocol}: ${airdrop.amount} ${airdrop.tokenMint.slice(0, 8)}...`);
    }
  }
  
  async autoClaimAirdrops(): Promise<void> {
    if (!this.airdropChecker || !this.userKeypair) {
      console.error('Airdrop auto-claim not available (wallet not configured)');
      return;
    }
    
    console.log('🎁 Auto-claiming airdrops...\n');
    const results = await this.airdropChecker.autoClaimAll(this.userKeypair);
    
    console.log('\nClaim Results:');
    for (const [protocol, signature] of results.entries()) {
      const status = signature ? '✅' : '❌';
      console.log(`  ${status} ${protocol}: ${signature || 'Failed'}`);
    }
  }
  
  async listPresets(): Promise<void> {
    console.log('📋 Available Presets:\n');
    const presets = await this.presetManager.getAllPresets();
    
    for (const preset of presets) {
      const status = preset.enabled ? '✓' : '✗';
      console.log(`  [${status}] ${preset.name}`);
      console.log(`      Strategy: ${preset.strategy}`);
      console.log(`      Tokens: ${preset.tokens.join(', ')}`);
      console.log(`      Min Profit: ${(preset.minProfit * 100).toFixed(2)}%`);
      console.log(`      Max Slippage: ${(preset.maxSlippage * 100).toFixed(2)}%`);
      console.log('');
    }
  }
  
  async scanOpportunities(): Promise<void> {
    console.log('🔍 Scanning for arbitrage opportunities...\n');
    
    const presets = await this.presetManager.getEnabledPresets();
    
    for (const preset of presets) {
      console.log(`\n📊 ${preset.name}:`);
      
      // Flash loan opportunities
      if (preset.strategy === 'flash-loan' || preset.strategy === 'hybrid') {
        const flashOpps = await this.flashLoanArbitrage.findOpportunities(preset.tokens);
        const filtered = flashOpps.filter(o => o.estimatedProfit >= preset.minProfit);
        
        if (filtered.length > 0) {
          console.log(`  ⚡ Flash Loan: Found ${filtered.length} opportunities`);
          const best = filtered[0];
          console.log(`     Best: ${best.provider} - $${best.estimatedProfit.toFixed(4)} profit`);
        }
      }
      
      // Triangular opportunities
      if (preset.strategy === 'triangular' || preset.strategy === 'hybrid') {
        const triOpps = await this.triangularArbitrage.findOpportunities(preset.tokens);
        const filtered = triOpps.filter(o => o.estimatedProfit >= preset.minProfit);
        
        if (filtered.length > 0) {
          console.log(`  🔺 Triangular: Found ${filtered.length} opportunities`);
          const best = filtered[0];
          console.log(`     Best: ${best.path.map(t => t.symbol).join(' -> ')} - $${best.estimatedProfit.toFixed(4)}`);
        }
      }
    }
  }
  
  async startAutoExecution(): Promise<void> {
    if (!this.autoExecutionEngine) {
      console.error('Auto-execution not available (wallet not configured)');
      return;
    }
    
    console.log('⚡ Starting auto-execution engine...');
    console.log('Press Ctrl+C to stop\n');
    
    await this.autoExecutionEngine.start();
  }
  
  async manualExecution(): Promise<void> {
    if (!this.autoExecutionEngine) {
      console.error('Manual execution not available (wallet not configured)');
      return;
    }
    
    console.log('🔧 Manual Execution Mode\n');
    await this.autoExecutionEngine.manualExecute();
  }
  
  async showFlashLoanProviders(): Promise<void> {
    console.log('💰 Flash Loan Providers:\n');
    const providers = this.flashLoanArbitrage.getProviderInfo();
    
    for (const provider of providers) {
      console.log(`  ${provider.name}:`);
      console.log(`    Fee: ${provider.fee.toFixed(2)}%`);
      console.log(`    Program ID: ${provider.programId.toBase58().slice(0, 16)}...`);
      console.log('');
    }
  }
  
  async analyzeWallet(address?: string): Promise<void> {
    console.log('📊 Wallet Analysis\n');
    
    const walletAddress = address || this.userKeypair?.publicKey.toString();
    if (!walletAddress) {
      console.error('No wallet address provided or configured');
      return;
    }
    
    const publicKey = new PublicKey(walletAddress);
    const score = await this.walletScoring.analyzeWallet(publicKey);
    
    console.log(`Wallet: ${score.address.slice(0, 8)}...${score.address.slice(-8)}`);
    console.log(`\n🏆 Tier: ${score.tier}`);
    console.log(`📈 Total Score: ${score.totalScore}/100`);
    console.log(`\n💎 Factor Breakdown:`);
    console.log(`   Balance: ${score.factors.balance}/20`);
    console.log(`   Transactions: ${score.factors.transactionCount}/20`);
    console.log(`   NFT Holdings: ${score.factors.nftHoldings}/15`);
    console.log(`   DeFi Activity: ${score.factors.defiActivity}/15`);
    console.log(`   Age & Consistency: ${score.factors.ageAndConsistency}/15`);
    console.log(`   Diversification: ${score.factors.diversification}/15`);
    console.log(`\n🎁 Airdrop Priority: ${score.airdropPriority}/5`);
    console.log(`💰 Estimated Airdrop Value: $${score.estimatedAirdropValue.toLocaleString()}`);
  }
  
  async manageAddressBook(action?: string, ..._args: string[]): Promise<void> {
    console.log('📇 Address Book Management\n');
    
    if (!action) {
      const entries = this.addressBook.getAllEntries();
      console.log(`Total entries: ${entries.length}\n`);
      
      for (const entry of entries.slice(0, 10)) {
        console.log(`  [${entry.type}] ${entry.name}`);
        console.log(`     ${entry.address.slice(0, 16)}...`);
        if (entry.tags && entry.tags.length > 0) {
          console.log(`     Tags: ${entry.tags.join(', ')}`);
        }
        console.log('');
      }
      
      if (entries.length > 10) {
        console.log(`  ... and ${entries.length - 10} more entries`);
      }
      return;
    }
    
    if (action === 'export') {
      const json = await this.addressBook.exportToJSON();
      console.log('Address book exported:\n');
      console.log(json);
    }
  }
  
  async manageRouteTemplates(): Promise<void> {
    console.log('🔄 Route Templates\n');
    
    const templates = this.routeTemplates.getAllTemplates();
    console.log(`Total templates: ${templates.length}\n`);
    
    for (const template of templates) {
      const status = template.autoExecute ? '🤖 Auto' : '🔧 Manual';
      console.log(`  ${status} ${template.name}`);
      console.log(`     Path: ${template.tokenPath.join(' -> ')}`);
      console.log(`     Min Profit: ${(template.minProfit * 100).toFixed(2)}%`);
      if (template.successRate !== undefined) {
        console.log(`     Success Rate: ${(template.successRate * 100).toFixed(1)}%`);
      }
      console.log('');
    }
  }
  
  async exportConfig(type: string): Promise<void> {
    console.log(`📤 Exporting ${type} configuration...\n`);
    
    if (type === 'presets') {
      const json = await this.presetManager.exportPresets();
      console.log(json);
    } else if (type === 'templates') {
      const json = await this.routeTemplates.exportTemplates();
      console.log(json);
    } else if (type === 'addresses') {
      const json = await this.addressBook.exportToJSON();
      console.log(json);
    } else {
      console.log('Unknown export type. Use: presets, templates, or addresses');
    }
  }
  
  async syncToCloud(): Promise<void> {
    console.log('☁️  Syncing to QuickNode KV Store...\n');
    
    const success = await this.presetManager.syncToQuickNodeKV(this.quicknode);
    if (success) {
      console.log('✅ Presets synced successfully');
    } else {
      console.log('❌ Failed to sync presets');
    }
  }
  
  async startEnhancedScanner(pollingMs?: number): Promise<void> {
    console.log('🚀 Starting Enhanced Arbitrage Scanner...\n');
    
    // Set up scanner with custom polling if provided
    if (pollingMs) {
      console.log(`Custom polling interval: ${pollingMs}ms\n`);
    }
    
    // Set up database integration
    const scanner = this.enhancedScanner;
    
    // Start scanner in background and log opportunities to database
    const scannerPromise = scanner.startScanning();
    
    // Periodically save opportunities to database
    const saveInterval = setInterval(async () => {
      const opportunities = scanner.getOpportunities();
      for (const opp of opportunities) {
        await this.database.addOpportunity(opp);
      }
      scanner.clearHistory(); // Clear after saving to avoid duplicates
    }, 10000); // Save every 10 seconds
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down scanner...');
      scanner.stopScanning();
      clearInterval(saveInterval);
      process.exit(0);
    });
    
    await scannerPromise;
  }
  
  async showScannerStats(): Promise<void> {
    console.log('📊 Scanner Statistics\n');
    
    const stats = this.enhancedScanner.getStatistics();
    console.log(`Total Scans: ${stats.totalScans}`);
    console.log(`Opportunities Found: ${stats.opportunitiesFound}\n`);
    
    if (stats.recentOpportunities.length > 0) {
      console.log('Recent Opportunities:');
      for (const opp of stats.recentOpportunities) {
        console.log(`  ${opp.type} - ${opp.tokens.join(' -> ')} - ${(opp.estimatedProfit * 100).toFixed(3)}%`);
      }
    }
  }
  
  async showDatabaseStats(): Promise<void> {
    console.log('💾 Database Statistics\n');
    
    const stats = this.database.getStatistics();
    console.log(`Total Opportunities: ${stats.totalOpportunities}`);
    console.log(`Total Executed: ${stats.totalExecuted}`);
    console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`Total Profit: $${stats.totalProfit.toFixed(2)}`);
    console.log(`Average Profit: $${stats.averageProfit.toFixed(2)}\n`);
    
    console.log('By Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`  ${type}: ${count}`);
    }
    
    console.log('\nBy Provider:');
    for (const [provider, count] of Object.entries(stats.byProvider)) {
      console.log(`  ${provider}: ${count}`);
    }
  }
  
  async showHistoricalAnalysis(days?: number): Promise<void> {
    const period = days || 7;
    console.log(`📈 Historical Analysis (Last ${period} days)\n`);
    
    const analysis = await this.database.getHistoricalAnalysis(period);
    console.log(`Period: ${analysis.period}`);
    console.log(`Opportunities: ${analysis.opportunities}`);
    console.log(`Executed: ${analysis.executed}`);
    console.log(`Total Profit: $${analysis.totalProfit.toFixed(2)}\n`);
    
    console.log('Top Tokens:');
    for (const { token, count } of analysis.topTokens.slice(0, 5)) {
      console.log(`  ${token}: ${count}`);
    }
    
    console.log('\nTop Providers:');
    for (const { provider, count } of analysis.topProviders) {
      console.log(`  ${provider}: ${count}`);
    }
  }

  async startRealTimeScanner(tokens?: string[]): Promise<void> {
    console.log('🔍 Starting Real-Time Arbitrage Scanner...\n');
    
    // Initialize with specific tokens or use default
    if (tokens && tokens.length > 0) {
      this.realTimeScanner.initializeTokenPairs(tokens);
      console.log(`Monitoring ${tokens.join(', ')}`);
    } else {
      this.realTimeScanner.initializeTokenPairs();
      console.log('Monitoring all supported token pairs');
    }
    
    // Register callback for found opportunities
    this.realTimeScanner.onOpportunityFound((opportunity) => {
      console.log('\n🎯 NEW OPPORTUNITY FOUND!');
      console.log(`  Type: ${opportunity.type}`);
      console.log(`  Path: ${opportunity.path.map(t => t.symbol).join(' -> ')}`);
      console.log(`  Estimated Profit: ${opportunity.estimatedProfit.toFixed(6)} ${opportunity.path[0].symbol}`);
      console.log(`  Required Capital: ${opportunity.requiredCapital.toFixed(6)} ${opportunity.path[0].symbol}`);
      console.log(`  Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
      console.log(`  Price Impact: ${opportunity.priceImpact?.toFixed(4)}%`);
      console.log(`  Est. Slippage: ${(opportunity.estimatedSlippage! * 100).toFixed(2)}%`);
      console.log(`  Est. Gas Fee: ${opportunity.estimatedGasFee?.toFixed(9)} SOL`);
      if (opportunity.routeDetails) {
        console.log(`  DEXes: ${opportunity.routeDetails.dexes.join(', ')}`);
      }
      console.log('');
    });
    
    const config = this.realTimeScanner.getConfig();
    console.log(`\nScanner Configuration:`);
    console.log(`  Polling Interval: ${config.pollingIntervalMs}ms`);
    console.log(`  Min Profit: ${(config.minProfitThreshold * 100).toFixed(2)}%`);
    console.log(`  Max Slippage: ${(config.maxSlippage * 100).toFixed(2)}%`);
    console.log(`  Min Confidence: ${(config.minConfidence * 100).toFixed(0)}%`);
    console.log(`\nPress Ctrl+C to stop scanning\n`);
    
    await this.realTimeScanner.startScanning();
    
    // Keep the process running
    await new Promise(() => {
      // This will run indefinitely until Ctrl+C
    });
  }

  async scanRealTimeOnce(tokens?: string[]): Promise<void> {
    console.log('🔍 One-time Real-Time Arbitrage Scan...\n');
    
    const tokenList = tokens || ['SOL', 'USDC', 'USDT', 'BONK', 'RAY', 'ORCA'];
    const opportunities = await this.realTimeScanner.scanForOpportunities(tokenList);
    
    if (opportunities.length === 0) {
      console.log('No profitable opportunities found at this time.');
      return;
    }
    
    console.log(`Found ${opportunities.length} profitable opportunities:\n`);
    
    for (let i = 0; i < Math.min(opportunities.length, 10); i++) {
      const opp = opportunities[i];
      console.log(`${i + 1}. ${opp.path.map(t => t.symbol).join(' -> ')}`);
      console.log(`   Profit: ${opp.estimatedProfit.toFixed(6)} ${opp.path[0].symbol}`);
      console.log(`   Capital Required: ${opp.requiredCapital.toFixed(6)} ${opp.path[0].symbol}`);
      console.log(`   Confidence: ${(opp.confidence * 100).toFixed(1)}%`);
      console.log(`   Price Impact: ${opp.priceImpact?.toFixed(4)}%`);
      if (opp.routeDetails) {
        console.log(`   DEXes: ${opp.routeDetails.dexes.join(', ')}`);
      }
      console.log('');
    }
  }
}

// CLI Interface
async function main() {
  const studio = new GXQStudio();
  await studio.initialize();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'airdrops':
      await studio.checkAirdrops();
      break;
    case 'claim':
      await studio.autoClaimAirdrops();
      break;
    case 'presets':
      await studio.listPresets();
      break;
    case 'scan':
      await studio.scanOpportunities();
      break;
    case 'start':
      await studio.startAutoExecution();
      break;
    case 'manual':
      await studio.manualExecution();
      break;
    case 'providers':
      await studio.showFlashLoanProviders();
      break;
    case 'analyze':
      await studio.analyzeWallet(args[1]);
      break;
    case 'addresses':
      await studio.manageAddressBook(args[1], ...args.slice(2));
      break;
    case 'templates':
      await studio.manageRouteTemplates();
      break;
    case 'export':
      await studio.exportConfig(args[1] || 'presets');
      break;
    case 'sync':
      await studio.syncToCloud();
      break;
    case 'enhanced-scan':
      await studio.startEnhancedScanner(args[1] ? parseInt(args[1]) : undefined);
      break;
    case 'scanner-stats':
      await studio.showScannerStats();
      break;
    case 'db-stats':
      await studio.showDatabaseStats();
      break;
    case 'history':
      await studio.showHistoricalAnalysis(args[1] ? parseInt(args[1]) : undefined);
      break;
    case 'realtime-scan':
      await studio.startRealTimeScanner(args.slice(1));
      break;
    case 'realtime-once':
      await studio.scanRealTimeOnce(args.slice(1));
      break;
    default:
      console.log('Usage:');
      console.log('  npm start airdrops    - Check for claimable airdrops');
      console.log('  npm start claim       - Auto-claim all airdrops');
      console.log('  npm start presets     - List available presets');
      console.log('  npm start scan        - Scan for arbitrage opportunities');
      console.log('  npm start start       - Start auto-execution engine');
      console.log('  npm start manual      - Manual execution mode (review opportunities)');
      console.log('  npm start providers   - Show flash loan providers');
      console.log('');
      console.log('Enhanced Scanner:');
      console.log('  npm start enhanced-scan [interval]  - Start enhanced scanner (1s default)');
      console.log('  npm start scanner-stats             - Show scanner statistics');
      console.log('  npm start db-stats                  - Show database statistics');
      console.log('  npm start history [days]            - Historical analysis (7 days default)');
      console.log('');
      console.log('Real-Time Arbitrage Scanner (NEW):');
      console.log('  npm start realtime-scan [tokens...] - Start real-time scanner (all tokens default)');
      console.log('  npm start realtime-once [tokens...] - One-time scan for opportunities');
      console.log('  Example: npm start realtime-scan SOL USDC USDT');
      console.log('');
      console.log('Phase 2 Features:');
      console.log('  npm start analyze [address]  - Analyze wallet score and tier');
      console.log('  npm start addresses [action] - Manage address book');
      console.log('  npm start templates          - View route templates');
      console.log('  npm start export [type]      - Export config (presets/templates/addresses)');
      console.log('  npm start sync               - Sync presets to QuickNode KV');
      break;
  }
}

main().catch(console.error);
