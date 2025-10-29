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
    
    await this.presetManager.initialize();
    await this.addressBook.initialize();
    await this.routeTemplates.initialize();
    
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
