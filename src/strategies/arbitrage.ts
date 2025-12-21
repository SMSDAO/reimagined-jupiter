import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { ArbitrageOpportunity, TokenConfig } from '../types.js';
import { JupiterV6Integration } from '../integrations/jupiter.js';
import { 
  BaseFlashLoanProvider,
  MarginfiProvider, 
  SolendProvider, 
  MangoProvider, 
  KaminoProvider, 
  PortFinanceProvider,
  TulipProvider,
  DriftProvider,
  JetProvider,
} from '../providers/flashLoan.js';
import { config, FLASH_LOAN_FEES, SUPPORTED_TOKENS } from '../config/index.js';

export class FlashLoanArbitrage {
  private connection: Connection;
  private providers: Map<string, BaseFlashLoanProvider>;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.providers = new Map();
    
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
    this.providers.set('tulip', new TulipProvider(
      connection,
      config.flashLoanProviders.tulip,
      FLASH_LOAN_FEES.tulip
    ));
    this.providers.set('drift', new DriftProvider(
      connection,
      config.flashLoanProviders.drift,
      FLASH_LOAN_FEES.drift
    ));
    this.providers.set('jet', new JetProvider(
      connection,
      config.flashLoanProviders.jet,
      FLASH_LOAN_FEES.jet
    ));
  }
  
  async findOpportunities(tokens: string[]): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    for (const providerName of this.providers.keys()) {
      const provider = this.providers.get(providerName);
      
      // Check each token pair for arbitrage
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = SUPPORTED_TOKENS.find(t => t.symbol === tokens[i]);
          const tokenB = SUPPORTED_TOKENS.find(t => t.symbol === tokens[j]);
          
          if (!tokenA || !tokenB) continue;
          
          if (!provider) continue;
          
          const opportunity = await this.checkArbitrage(
            tokenA,
            tokenB,
            providerName,
            provider
          );
          
          if (opportunity && opportunity.estimatedProfit > config.arbitrage.minProfitThreshold) {
            opportunities.push(opportunity);
          }
        }
      }
    }
    
    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }
  
  private async checkArbitrage(
    tokenA: TokenConfig,
    tokenB: TokenConfig,
    providerName: string,
    provider: BaseFlashLoanProvider
  ): Promise<ArbitrageOpportunity | null> {
    try {
      const loanAmount = 100000; // Base amount in smallest unit
      const fee = provider.getFee() / 100;
      
      // Get real price quotes using Jupiter aggregator
      const jupiter = new JupiterV6Integration(this.connection);
      
      // Check price on DEX path A->B->A
      const quoteAB = await jupiter.getQuote(
        tokenA.mint.toString(),
        tokenB.mint.toString(),
        loanAmount
      );
      
      if (!quoteAB) return null;
      
      const amountB = parseInt(quoteAB.outAmount);
      
      // Check return path B->A
      const quoteBA = await jupiter.getQuote(
        tokenB.mint.toString(),
        tokenA.mint.toString(),
        amountB
      );
      
      if (!quoteBA) return null;
      
      const finalAmountA = parseInt(quoteBA.outAmount);
      const profit = finalAmountA - loanAmount - (loanAmount * fee);
      
      if (profit > 0) {
        return {
          type: 'flash-loan',
          provider: providerName,
          path: [tokenA, tokenB, tokenA],
          estimatedProfit: profit / Math.pow(10, tokenA.decimals),
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
      console.log(`Executing flash loan arbitrage via ${opportunity.provider}...`);
      console.log(`Expected profit: $${opportunity.estimatedProfit.toFixed(2)}`);
      
      const provider = this.providers.get(opportunity.provider!);
      if (!provider) {
        console.error('Provider not found');
        return null;
      }
      
      // Get Jupiter integration for swap execution
      const jupiter = new JupiterV6Integration(this.connection);
      const path = opportunity.path;
      
      if (path.length < 2) {
        console.error('Invalid path: at least 2 tokens required');
        return null;
      }
      
      // Calculate loan amount based on first token
      const loanAmount = Math.floor(100000); // Amount in smallest unit
      
      // Check if provider has sufficient liquidity
      const availableLiquidity = await provider.getAvailableLiquidity(path[0].mint);
      if (availableLiquidity < loanAmount) {
        console.error(`Insufficient liquidity: need ${loanAmount}, available ${availableLiquidity}`);
        return null;
      }
      
      // Build transaction instructions for flash loan arbitrage
      // Flash loan transaction structure:
      // 1. Begin flash loan (borrow)
      // 2. Execute arbitrage swaps (middle instructions)
      // 3. End flash loan (repay + fee)
      
      const swapInstructions: TransactionInstruction[] = [];
      
      // Get swap instructions for each leg of arbitrage
      let currentAmount = loanAmount;
      for (let i = 0; i < path.length - 1; i++) {
        const quote = await jupiter.getQuote(
          path[i].mint.toString(),
          path[i + 1].mint.toString(),
          currentAmount
        );
        
        if (!quote) {
          console.error(`Failed to get quote for swap ${i + 1}`);
          return null;
        }
        
        currentAmount = parseInt(quote.outAmount);
        
        // In production, get swap instruction from Jupiter and add to swapInstructions
        // const swapTx = await jupiter.getSwapTransaction(quote, userKeypair.publicKey.toString());
        // swapInstructions.push(...swapTx.instructions);
      }
      
      // Validate profitability after all swaps
      const repayAmount = loanAmount + Math.floor(loanAmount * (provider.getFee() / 100));
      if (currentAmount < repayAmount) {
        console.error('Insufficient funds to repay loan after swaps');
        return null;
      }
      
      // Create flash loan instruction with nested swap instructions
      const flashLoanInstructions = await provider.createFlashLoanInstruction(
        loanAmount,
        path[0].mint,
        userKeypair.publicKey,
        swapInstructions
      );
      
      const profit = currentAmount - repayAmount;
      console.log(`Flash loan arbitrage prepared. Expected profit: ${profit / Math.pow(10, path[0].decimals)}`);
      
      // Note: In production, these instructions would be built into a transaction,
      // signed with userKeypair, and submitted to the network
      console.warn('Transaction execution requires proper instruction building and wallet signing');
      console.log(`Transaction would contain ${flashLoanInstructions.length} instructions`);
      return null;
    } catch (error) {
      console.error('Error executing arbitrage:', error);
      return null;
    }
  }
  
  getProviderInfo(): Array<{ name: string; fee: number; programId: PublicKey }> {
    const info: Array<{ name: string; fee: number; programId: PublicKey }> = [];
    for (const provider of this.providers.values()) {
      const providerInfo = provider.getInfo();
      info.push({
        name: providerInfo.name,
        fee: providerInfo.fee,
        programId: providerInfo.programId,
      });
    }
    return info;
  }
}

export class TriangularArbitrage {
  private connection: Connection;
  private jupiter: JupiterV6Integration;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.jupiter = new JupiterV6Integration(connection);
  }
  
  async findOpportunities(tokens: string[]): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Check all possible triangular paths
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        for (let k = 0; k < tokens.length; k++) {
          if (i !== j && j !== k && i !== k) {
            const tokenA = SUPPORTED_TOKENS.find(t => t.symbol === tokens[i]);
            const tokenB = SUPPORTED_TOKENS.find(t => t.symbol === tokens[j]);
            const tokenC = SUPPORTED_TOKENS.find(t => t.symbol === tokens[k]);
            
            if (!tokenA || !tokenB || !tokenC) continue;
            
            const opportunity = await this.checkTriangularPath(tokenA, tokenB, tokenC);
            
            if (opportunity && opportunity.estimatedProfit > config.arbitrage.minProfitThreshold) {
              opportunities.push(opportunity);
            }
          }
        }
      }
    }
    
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
      console.log('Executing triangular arbitrage via Jupiter v6...');
      console.log(`Path: ${opportunity.path.map(t => t.symbol).join(' -> ')}`);
      console.log(`Expected profit: $${opportunity.estimatedProfit.toFixed(2)}`);
      
      const path = opportunity.path;
      if (path.length < 3) {
        console.error('Invalid triangular path: at least 3 tokens required');
        return null;
      }
      
      // Execute the three swaps in sequence: A -> B -> C -> A
      let currentAmount = Math.floor(opportunity.requiredCapital * Math.pow(10, path[0].decimals));
      
      for (let i = 0; i < path.length - 1; i++) {
        const fromToken = path[i];
        const toToken = path[i + 1];
        
        console.log(`Swap ${i + 1}: ${fromToken.symbol} -> ${toToken.symbol}, amount: ${currentAmount}`);
        
        const signature = await this.jupiter.executeSwap(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          currentAmount,
          userKeypair.publicKey
        );
        
        if (!signature) {
          console.error(`Failed to execute swap ${i + 1}`);
          return null;
        }
        
        // Get the output amount for next swap
        const quote = await this.jupiter.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          currentAmount
        );
        
        if (!quote) {
          console.error(`Failed to get quote for next swap`);
          return null;
        }
        
        currentAmount = parseInt(quote.outAmount);
      }
      
      const finalAmount = currentAmount / Math.pow(10, path[0].decimals);
      const profit = finalAmount - opportunity.requiredCapital;
      
      console.log(`Triangular arbitrage executed successfully. Final profit: ${profit}`);
      
      // Note: This is a simplified version. Production implementation should:
      // 1. Bundle all swaps into a single transaction for atomicity
      // 2. Include proper slippage protection
      // 3. Use Jito bundles for MEV protection
      console.warn('Transaction execution requires wallet signing and proper bundling');
      return null;
    } catch (error) {
      console.error('Error executing triangular arbitrage:', error);
      return null;
    }
  }
}
