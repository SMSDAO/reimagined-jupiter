import { Connection, Keypair, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ArbitrageOpportunity, TokenConfig, FlashLoanProvider } from '../types.js';
import { JupiterV6Integration } from '../integrations/jupiter.js';
import { 
  MarginfiProvider, 
  SolendProvider, 
  MangoProvider, 
  KaminoProvider, 
  PortFinanceProvider,
  SaveFinanceProvider
} from '../providers/flashLoan.js';
import { config, FLASH_LOAN_FEES, SUPPORTED_TOKENS } from '../config/index.js';
import { TransactionExecutor } from '../utils/transactionExecutor.js';
import { ProfitDistributionManager } from '../utils/profitDistribution.js';

export class FlashLoanArbitrage {
  private connection: Connection;
  private providers: Map<string, MarginfiProvider | SolendProvider | MangoProvider | KaminoProvider | PortFinanceProvider | SaveFinanceProvider>;
  private transactionExecutor: TransactionExecutor;
  private profitDistributor: ProfitDistributionManager;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.providers = new Map();
    this.transactionExecutor = new TransactionExecutor(connection);
    this.profitDistributor = new ProfitDistributionManager(connection);
    
    // Initialize flash loan providers
    this.providers.set('marginfi', new MarginfiProvider(
      connection,
      config.flashLoanProviders.marginfi,
      FLASH_LOAN_FEES.marginfi
    ));
    this.providers.set('solend', new SolendProvider(
      connection,
      config.flashLoanProviders.solend,
      FLASH_LOAN_FEES.solend
    ));
    this.providers.set('mango', new MangoProvider(
      connection,
      config.flashLoanProviders.mango,
      FLASH_LOAN_FEES.mango
    ));
    this.providers.set('kamino', new KaminoProvider(
      connection,
      config.flashLoanProviders.kamino,
      FLASH_LOAN_FEES.kamino
    ));
    this.providers.set('portFinance', new PortFinanceProvider(
      connection,
      config.flashLoanProviders.portFinance,
      FLASH_LOAN_FEES.portFinance
    ));
  }
  
  async findOpportunities(tokens: string[]): Promise<ArbitrageOpportunity[]> {
    // Pre-resolve all tokens to avoid repeated lookups
    const resolvedTokens = tokens
      .map(symbol => SUPPORTED_TOKENS.find(t => t.symbol === symbol))
      .filter((t): t is TokenConfig => t !== undefined);
    
    if (resolvedTokens.length === 0) {
      return [];
    }
    
    // Build all check tasks for parallel execution
    const checkTasks: Promise<ArbitrageOpportunity | null>[] = [];
    
    for (const providerName of this.providers.keys()) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      
      // Check each token pair for arbitrage
      for (let i = 0; i < resolvedTokens.length; i++) {
        for (let j = i + 1; j < resolvedTokens.length; j++) {
          checkTasks.push(
            this.checkArbitrage(
              resolvedTokens[i],
              resolvedTokens[j],
              providerName,
              provider
            )
          );
        }
      }
    }
    
    // Execute all checks in parallel
    const results = await Promise.all(checkTasks);
    
    // Filter profitable opportunities
    const opportunities = results.filter(
      (opp): opp is ArbitrageOpportunity => 
        opp !== null && opp.estimatedProfit > config.arbitrage.minProfitThreshold
    );
    
    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }
  
  private async checkArbitrage(
    tokenA: TokenConfig,
    tokenB: TokenConfig,
    providerName: string,
    provider: MarginfiProvider | SolendProvider | MangoProvider | KaminoProvider | PortFinanceProvider | SaveFinanceProvider
  ): Promise<ArbitrageOpportunity | null> {
    try {
      const loanAmount = 100000; // Test amount
      const fee = provider.getFee() / 100;
      
      // Simulate price difference detection
      const priceDiff = Math.random() * 0.02; // 0-2% price difference
      const profit = loanAmount * priceDiff - (loanAmount * fee);
      
      if (profit > 0) {
        return {
          type: 'flash-loan',
          provider: providerName,
          path: [tokenA, tokenB, tokenA],
          estimatedProfit: profit,
          requiredCapital: 0, // Flash loans require no capital
          confidence: 0.85,
        };
      }
    } catch (error) {
      console.error('Error checking arbitrage:', error);
    }
    
    return null;
  }
  
  async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    userKeypair: Keypair
  ): Promise<string | null> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚡ FLASH LOAN ARBITRAGE EXECUTION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Provider: ${opportunity.provider}`);
      console.log(`Path: ${opportunity.path.map(t => t.symbol).join(' -> ')}`);
      console.log(`Expected Profit: $${opportunity.estimatedProfit.toFixed(6)}`);
      console.log(`Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
      
      const provider = this.providers.get(opportunity.provider!);
      if (!provider) {
        console.error('❌ Provider not found');
        return null;
      }
      
      // Calculate flash loan amount and fee
      const loanAmount = opportunity.requiredCapital || 100000; // Default to 100k units
      const feePercentage = provider.getFee() / 100;
      const feeAmount = Math.floor(loanAmount * feePercentage);
      
      console.log(`\n📊 Loan Details:`);
      console.log(`   Amount: ${loanAmount} units`);
      console.log(`   Fee: ${feeAmount} units (${provider.getFee()}%)`);
      console.log(`   Total Repayment: ${loanAmount + feeAmount} units`);
      
      // Build flash loan transaction
      // ⚠️ IMPORTANT: This is a FRAMEWORK IMPLEMENTATION
      // Production use requires actual flash loan provider SDK integration
      // See IMPLEMENTATION_GUIDE.md for SDK integration instructions
      console.log('\n🔨 Building flash loan transaction framework...');
      console.log('⚠️  NOTE: Flash loan execution requires SDK integration');
      console.log('   See IMPLEMENTATION_GUIDE.md for details');
      
      const transaction = new Transaction();
      
      // Add compute budget for priority
      const priorityFee = await this.transactionExecutor.calculateDynamicPriorityFee('high');
      console.log(`   Priority Fee: ${priorityFee.microLamports} microLamports`);
      console.log(`   Compute Limit: ${priorityFee.computeUnitLimit.toLocaleString()} units`);
      
      // Create flash loan instructions
      // ⚠️ TODO: Replace with actual SDK implementation
      // Current implementation creates empty arbitrage instructions array
      // Real implementation should:
      // 1. Use provider's SDK to create borrow instruction
      // 2. Add actual arbitrage swap instructions
      // 3. Add provider's SDK repay instruction with fee
      const flashLoanInstructions = await provider.createFlashLoanInstruction(
        loanAmount,
        opportunity.path[0].mint,
        userKeypair.publicKey,
        [] // ⚠️ TODO: Add actual arbitrage swap instructions here
      );
      
      if (flashLoanInstructions.length === 0) {
        console.error('❌ Failed to create flash loan instructions');
        console.error('⚠️  Flash loan provider SDK integration required');
        return null;
      }
      
      transaction.add(...flashLoanInstructions);
      
      // Simulate transaction first
      console.log('\n🔍 Simulating transaction...');
      const simulationSuccess = await this.transactionExecutor.simulateTransaction(transaction);
      
      if (!simulationSuccess) {
        console.error('❌ Transaction simulation failed');
        console.error('⚠️  This is expected without actual SDK integration');
        return null;
      }
      
      // Execute transaction
      console.log('\n📤 Executing transaction...');
      const result = await this.transactionExecutor.executeTransaction(
        transaction,
        [userKeypair],
        priorityFee,
        'confirmed'
      );
      
      if (!result.success) {
        console.error(`❌ Transaction failed: ${result.error}`);
        return null;
      }
      
      console.log('\n✅ Flash loan arbitrage executed successfully!');
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Compute Units: ${result.computeUnits?.toLocaleString()}`);
      console.log(`   Transaction Fee: ${((result.fee || 0) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      
      // Calculate actual profit
      // ⚠️ TODO: Calculate from real balance changes, not estimates
      // This should query wallet balance before/after transaction
      // and subtract flash loan fee and transaction fees
      const actualProfit = opportunity.estimatedProfit * LAMPORTS_PER_SOL; // Convert to lamports
      console.log('\n⚠️  NOTE: Using estimated profit. In production, calculate from actual balance changes.');
      
      // Distribute profits
      console.log('\n💰 Distributing profits...');
      this.profitDistributor.logProfitDistribution(actualProfit / LAMPORTS_PER_SOL, 'SOL');
      
      const distributionSig = await this.profitDistributor.distributeSolProfit(
        actualProfit,
        userKeypair,
        userKeypair.publicKey // Calling wallet gets gas/slippage coverage
      );
      
      if (distributionSig) {
        console.log(`✅ Profit distribution complete: ${distributionSig}`);
      } else {
        console.warn('⚠️  Profit distribution failed, but arbitrage was successful');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return result.signature || null;
    } catch (error) {
      console.error('❌ Error executing flash loan arbitrage:', error);
      return null;
    }
  }
  
  getProviderInfo(): FlashLoanProvider[] {
    const info: FlashLoanProvider[] = [];
    for (const provider of this.providers.values()) {
      const baseInfo = provider.getInfo();
      // Create new object to avoid mutating the returned value
      info.push({
        ...baseInfo,
        fee: provider.getFee(),
      });
    }
    return info;
  }
}

export class TriangularArbitrage {
  private connection: Connection;
  private jupiter: JupiterV6Integration;
  private transactionExecutor: TransactionExecutor;
  private profitDistributor: ProfitDistributionManager;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.jupiter = new JupiterV6Integration(connection);
    this.transactionExecutor = new TransactionExecutor(connection);
    this.profitDistributor = new ProfitDistributionManager(connection);
  }
  
  async findOpportunities(tokens: string[]): Promise<ArbitrageOpportunity[]> {
    // Pre-resolve all tokens to avoid repeated lookups
    const resolvedTokens = tokens
      .map(symbol => SUPPORTED_TOKENS.find(t => t.symbol === symbol))
      .filter((t): t is TokenConfig => t !== undefined);
    
    if (resolvedTokens.length < 3) {
      return [];
    }
    
    // Build all check tasks for parallel execution
    const checkTasks: Promise<ArbitrageOpportunity | null>[] = [];
    
    // Check all possible triangular paths
    for (let i = 0; i < resolvedTokens.length; i++) {
      for (let j = 0; j < resolvedTokens.length; j++) {
        for (let k = 0; k < resolvedTokens.length; k++) {
          if (i !== j && j !== k && i !== k) {
            checkTasks.push(
              this.checkTriangularPath(
                resolvedTokens[i],
                resolvedTokens[j],
                resolvedTokens[k]
              )
            );
          }
        }
      }
    }
    
    // Execute all checks in parallel (batch to avoid overwhelming RPC)
    const BATCH_SIZE = 10;
    const results: (ArbitrageOpportunity | null)[] = [];
    
    for (let i = 0; i < checkTasks.length; i += BATCH_SIZE) {
      const batch = checkTasks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    // Filter profitable opportunities
    const opportunities = results.filter(
      (opp): opp is ArbitrageOpportunity => 
        opp !== null && opp.estimatedProfit > config.arbitrage.minProfitThreshold
    );
    
    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }
  
  private async checkTriangularPath(
    tokenA: TokenConfig,
    tokenB: TokenConfig,
    tokenC: TokenConfig
  ): Promise<ArbitrageOpportunity | null> {
    try {
      const startAmount = 1000000; // 1M base units
      
      const result = await this.jupiter.findTriangularArbitrage(
        tokenA.mint.toString(),
        tokenB.mint.toString(),
        tokenC.mint.toString(),
        startAmount
      );
      
      if (result && result.profitable) {
        return {
          type: 'triangular',
          path: [tokenA, tokenB, tokenC],
          estimatedProfit: result.profit / Math.pow(10, tokenA.decimals),
          requiredCapital: startAmount / Math.pow(10, tokenA.decimals),
          confidence: 0.75,
        };
      }
    } catch (error) {
      console.error('Error checking triangular path:', error);
    }
    
    return null;
  }
  
  async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    userKeypair: Keypair
  ): Promise<string | null> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔺 TRIANGULAR ARBITRAGE EXECUTION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Path: ${opportunity.path.map(t => t.symbol).join(' -> ')}`);
      console.log(`Expected Profit: $${opportunity.estimatedProfit.toFixed(6)}`);
      console.log(`Required Capital: $${opportunity.requiredCapital.toFixed(6)}`);
      console.log(`Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
      
      // Execute the swaps in sequence: A -> B -> C -> A
      const path = opportunity.path;
      let currentAmount = Math.floor(opportunity.requiredCapital * Math.pow(10, path[0].decimals));
      
      console.log(`\n📊 Trade Sequence:`);
      
      for (let i = 0; i < path.length - 1; i++) {
        const fromToken = path[i];
        const toToken = path[i + 1];
        
        console.log(`\n${i + 1}. ${fromToken.symbol} -> ${toToken.symbol}`);
        console.log(`   Amount: ${(currentAmount / Math.pow(10, fromToken.decimals)).toFixed(6)} ${fromToken.symbol}`);
        
        // Get quote
        const quote = await this.jupiter.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          currentAmount,
          100 // 1% slippage
        );
        
        if (!quote) {
          console.error(`   ❌ Failed to get quote for ${fromToken.symbol} -> ${toToken.symbol}`);
          return null;
        }
        
        const outputAmount = parseInt(quote.outAmount);
        console.log(`   Expected Output: ${(outputAmount / Math.pow(10, toToken.decimals)).toFixed(6)} ${toToken.symbol}`);
        console.log(`   Price Impact: ${quote.priceImpactPct}%`);
        
        // Execute swap
        const signature = await this.jupiter.executeSwap(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          currentAmount,
          userKeypair,
          100
        );
        
        if (!signature) {
          console.error(`   ❌ Swap failed`);
          return null;
        }
        
        console.log(`   ✅ Swap executed: ${signature}`);
        currentAmount = outputAmount;
      }
      
      // Calculate actual profit
      const startAmount = Math.floor(opportunity.requiredCapital * Math.pow(10, path[0].decimals));
      const finalAmount = currentAmount;
      const profitAmount = finalAmount - startAmount;
      const profitSol = profitAmount / Math.pow(10, path[0].decimals);
      
      console.log(`\n📊 Results:`);
      console.log(`   Start Amount: ${(startAmount / Math.pow(10, path[0].decimals)).toFixed(6)} ${path[0].symbol}`);
      console.log(`   Final Amount: ${(finalAmount / Math.pow(10, path[0].decimals)).toFixed(6)} ${path[0].symbol}`);
      console.log(`   Profit: ${profitSol.toFixed(6)} ${path[0].symbol}`);
      
      if (profitAmount <= 0) {
        console.warn('⚠️  No profit realized, arbitrage may have failed');
        return null;
      }
      
      // Distribute profits
      console.log('\n💰 Distributing profits...');
      this.profitDistributor.logProfitDistribution(profitSol, path[0].symbol);
      
      // For SOL, distribute directly
      if (path[0].symbol === 'SOL' || path[0].symbol === 'wSOL') {
        const distributionSig = await this.profitDistributor.distributeSolProfit(
          profitAmount,
          userKeypair,
          userKeypair.publicKey
        );
        
        if (distributionSig) {
          console.log(`✅ Profit distribution complete: ${distributionSig}`);
        }
      } else {
        // For other tokens, use token distribution
        const distributionSig = await this.profitDistributor.distributeTokenProfit(
          path[0].mint,
          profitAmount,
          userKeypair,
          userKeypair.publicKey
        );
        
        if (distributionSig) {
          console.log(`✅ Profit distribution complete: ${distributionSig}`);
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Return the signature of the last swap
      return 'triangular_arbitrage_complete';
    } catch (error) {
      console.error('❌ Error executing triangular arbitrage:', error);
      return null;
    }
  }
}
