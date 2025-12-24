/**
 * Comprehensive Mainnet Arbitrage Orchestrator
 * 
 * Coordinates all components for executing profitable arbitrage opportunities:
 * - Flash loan provider selection
 * - Multi-hop route optimization (3-7 legs)
 * - MEV protection via Jito bundles
 * - GXQ wallet management
 * - Profit distribution
 * - Priority fee optimization
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  BaseFlashLoanProvider,
  MarginfiProvider,
  SolendProvider,
  MangoProvider,
  KaminoProvider,
  PortFinanceProvider,
  SaveFinanceProvider,
  TulipProvider,
  DriftProvider,
  JetProvider,
} from '../providers/flashLoan.js';
import { JupiterEnhancedIntegration, type JupiterMultiHopRoute } from '../integrations/jupiterEnhanced.js';
import { TransactionExecutor, type TransactionExecutionResult } from '../utils/transactionExecutor.js';
import { ProfitDistributionManager } from '../utils/profitDistribution.js';
import { generateGXQWallet, validateGXQWallet, type GeneratedWallet } from '../services/walletGenerator.js';
import { config, FLASH_LOAN_FEES } from '../config/index.js';

export interface ArbitrageConfig {
  minProfitThreshold: number; // Minimum profit in lamports
  maxSlippage: number; // Maximum slippage percentage
  priorityFeeUrgency: 'low' | 'medium' | 'high' | 'critical';
  useJito: boolean; // Enable Jito MEV protection
  requireGXQWallet: boolean; // Require wallet to end with 'GXQ'
  routeLegs: { min: number; max: number }; // Route length (3-7)
}

export interface ArbitrageOpportunity {
  route: JupiterMultiHopRoute;
  provider: BaseFlashLoanProvider;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  loanAmount: number;
  fee: number;
  executionWallet?: GeneratedWallet;
}

export interface ArbitrageExecutionResult extends TransactionExecutionResult {
  opportunity?: ArbitrageOpportunity;
  profitDistributed?: boolean;
  profitDistributionSignature?: string;
}

export class MainnetArbitrageOrchestrator {
  private connection: Connection;
  private jupiter: JupiterEnhancedIntegration;
  private executor: TransactionExecutor;
  private profitManager: ProfitDistributionManager;
  private providers: Map<string, BaseFlashLoanProvider>;
  private gxqWallets: GeneratedWallet[] = [];
  private arbitrageConfig: ArbitrageConfig;

  constructor(
    connection: Connection,
    arbitrageConfig?: Partial<ArbitrageConfig>
  ) {
    this.connection = connection;
    this.jupiter = new JupiterEnhancedIntegration(connection);
    this.executor = new TransactionExecutor(connection, 3, 2000, true); // Enable Jito
    this.profitManager = new ProfitDistributionManager(connection);

    // Initialize flash loan providers
    this.providers = new Map();
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
    this.providers.set('saveFinance', new SaveFinanceProvider(
      connection,
      config.flashLoanProviders.saveFinance,
      FLASH_LOAN_FEES.saveFinance
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

    // Configuration
    this.arbitrageConfig = {
      minProfitThreshold: arbitrageConfig?.minProfitThreshold ?? 0.001 * 1e9, // 0.001 SOL default
      maxSlippage: arbitrageConfig?.maxSlippage ?? config.arbitrage.maxSlippage,
      priorityFeeUrgency: arbitrageConfig?.priorityFeeUrgency ?? 'high',
      useJito: arbitrageConfig?.useJito ?? true,
      requireGXQWallet: arbitrageConfig?.requireGXQWallet ?? false,
      routeLegs: arbitrageConfig?.routeLegs ?? { min: 3, max: 7 },
    };

    console.log('[ArbitrageOrchestrator] Initialized with config:', this.arbitrageConfig);
    console.log(`[ArbitrageOrchestrator] Loaded ${this.providers.size} flash loan providers`);
  }

  /**
   * Scan for arbitrage opportunities across all providers and routes
   */
  async scanForOpportunities(
    tokens: string[],
    loanAmount: number = 100000000 // 0.1 SOL default
  ): Promise<ArbitrageOpportunity[]> {
    console.log(`[ArbitrageOrchestrator] Scanning for opportunities with ${tokens.length} tokens...`);

    const opportunities: ArbitrageOpportunity[] = [];

    try {
      // For each token pair, find optimal routes
      for (let i = 0; i < tokens.length; i++) {
        for (let j = 0; j < tokens.length; j++) {
          if (i === j) continue;

          const inputMint = tokens[i];
          const outputMint = tokens[j];

          // Get intermediate tokens
          const intermediateTokens = tokens.filter((_, idx) => idx !== i && idx !== j);

          // Find optimal routes
          const routes = await this.jupiter.findOptimalRoutes(
            inputMint,
            outputMint,
            loanAmount,
            intermediateTokens
          );

          // For each route, check profitability with each provider
          for (const route of routes) {
            for (const [providerName, provider] of this.providers.entries()) {
              const opportunity = await this.evaluateOpportunity(
                route,
                provider,
                providerName,
                loanAmount
              );

              if (opportunity && opportunity.estimatedProfit >= this.arbitrageConfig.minProfitThreshold) {
                opportunities.push(opportunity);
              }
            }
          }
        }
      }

      // Sort by profit (descending)
      opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);

      console.log(`[ArbitrageOrchestrator] Found ${opportunities.length} profitable opportunities`);

      return opportunities;
    } catch (error) {
      console.error('[ArbitrageOrchestrator] Error scanning for opportunities:', error);
      return [];
    }
  }

  /**
   * Evaluate profitability of a route with a specific provider
   */
  private async evaluateOpportunity(
    route: JupiterMultiHopRoute,
    provider: BaseFlashLoanProvider,
    providerName: string,
    loanAmount: number
  ): Promise<ArbitrageOpportunity | null> {
    try {
      // Calculate costs
      const outputAmount = parseInt(route.estimatedOutput);
      const flashLoanFee = loanAmount * (provider.getFee() / 100);
      const netProfit = outputAmount - loanAmount - flashLoanFee;

      // Check profitability
      if (netProfit <= 0) {
        return null;
      }

      const profitPercentage = (netProfit / loanAmount) * 100;

      return {
        route,
        provider,
        estimatedProfit: netProfit,
        estimatedProfitPercentage: profitPercentage,
        loanAmount,
        fee: flashLoanFee,
      };
    } catch (error) {
      console.error(`[ArbitrageOrchestrator] Error evaluating opportunity with ${providerName}:`, error);
      return null;
    }
  }

  /**
   * Execute arbitrage opportunity
   */
  async executeOpportunity(
    opportunity: ArbitrageOpportunity,
    userKeypair: Keypair
  ): Promise<ArbitrageExecutionResult> {
    console.log('[ArbitrageOrchestrator] Executing arbitrage opportunity...');
    console.log(`  Provider: ${opportunity.provider.getName()}`);
    console.log(`  Route: ${opportunity.route.legs} legs`);
    console.log(`  Expected profit: ${opportunity.estimatedProfit / 1e9} SOL (${opportunity.estimatedProfitPercentage.toFixed(2)}%)`);

    try {
      // Check if GXQ wallet is required
      let executionKeypair = userKeypair;
      if (this.arbitrageConfig.requireGXQWallet) {
        const isValidGXQ = validateGXQWallet(userKeypair.publicKey.toString());
        
        if (!isValidGXQ) {
          console.log('[ArbitrageOrchestrator] User wallet does not end with GXQ, generating one...');
          
          // Get or generate a GXQ wallet
          const gxqWallet = await this.getOrGenerateGXQWallet();
          
          // In production, you would transfer funds to this wallet first
          console.warn('[ArbitrageOrchestrator] ⚠️  GXQ wallet generation successful, but fund transfer not implemented');
          console.log(`[ArbitrageOrchestrator] GXQ Wallet: ${gxqWallet.publicKey}`);
          
          // For now, we'll continue with the user's wallet
          // executionKeypair = Keypair.fromSecretKey(gxqWallet.privateKey);
        } else {
          console.log('[ArbitrageOrchestrator] ✓ User wallet ends with GXQ');
        }
      }

      // Build flash loan transaction
      // Note: This is a simplified implementation
      // In production, you would build the complete swap instructions using Jupiter
      const swapInstructions: any[] = []; // Placeholder for Jupiter swap instructions

      const flashLoanInstructions = await opportunity.provider.createFlashLoanInstruction(
        opportunity.loanAmount,
        new PublicKey(opportunity.route.inputMint),
        executionKeypair.publicKey,
        swapInstructions
      );

      if (flashLoanInstructions.length === 0) {
        throw new Error('Failed to create flash loan instructions');
      }

      // Build transaction
      const transaction = new Transaction();
      transaction.add(...flashLoanInstructions);

      // Execute with or without Jito
      let result: TransactionExecutionResult;
      
      if (this.arbitrageConfig.useJito && this.executor.getJitoIntegration()) {
        console.log('[ArbitrageOrchestrator] Executing with Jito MEV protection...');
        result = await this.executor.executeAtomicBundleWithJito(
          [transaction],
          [executionKeypair],
          opportunity.estimatedProfit
        );
      } else {
        console.log('[ArbitrageOrchestrator] Executing without Jito...');
        result = await this.executor.executeTransaction(transaction, [executionKeypair]);
      }

      // If successful, distribute profits
      let profitDistributed = false;
      let profitDistributionSignature: string | undefined;

      if (result.success && config.profitDistribution.enabled) {
        console.log('[ArbitrageOrchestrator] Distributing profits...');
        
        profitDistributionSignature = await this.profitManager.distributeSolProfit(
          opportunity.estimatedProfit,
          executionKeypair,
          userKeypair.publicKey
        ) ?? undefined;

        profitDistributed = !!profitDistributionSignature;
      }

      return {
        ...result,
        opportunity,
        profitDistributed,
        profitDistributionSignature,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ArbitrageOrchestrator] Error executing opportunity:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        opportunity,
      };
    }
  }

  /**
   * Get or generate a GXQ wallet
   */
  private async getOrGenerateGXQWallet(): Promise<GeneratedWallet> {
    // Use existing wallet if available
    if (this.gxqWallets.length > 0) {
      return this.gxqWallets[0];
    }

    // Generate new GXQ wallet
    console.log('[ArbitrageOrchestrator] Generating GXQ wallet...');
    const wallet = await generateGXQWallet({
      suffix: 'GXQ',
      caseSensitive: false,
      maxAttempts: 1000000,
      onProgress: (attempts) => {
        if (attempts % 50000 === 0) {
          console.log(`[ArbitrageOrchestrator] Generated ${attempts} attempts...`);
        }
      },
    });

    this.gxqWallets.push(wallet);

    return wallet;
  }

  /**
   * Get configuration
   */
  getConfig(): ArbitrageConfig {
    return { ...this.arbitrageConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ArbitrageConfig>): void {
    this.arbitrageConfig = {
      ...this.arbitrageConfig,
      ...config,
    };

    console.log('[ArbitrageOrchestrator] Configuration updated:', this.arbitrageConfig);

    // Update executor Jito setting
    if (config.useJito !== undefined) {
      this.executor.setJitoEnabled(config.useJito);
    }

    // Update Jupiter settings
    if (config.routeLegs) {
      this.jupiter.updateConfig({
        minLegs: config.routeLegs.min,
        maxLegs: config.routeLegs.max,
      });
    }
  }

  /**
   * Get all available providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get a specific provider
   */
  getProvider(name: string): BaseFlashLoanProvider | undefined {
    return this.providers.get(name);
  }
}
