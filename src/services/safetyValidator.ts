/**
 * Comprehensive Safety Validator for Arbitrage Execution
 * Features:
 * - Pre-execution safety checks
 * - Slippage validation
 * - Profitability verification
 * - Gas cost analysis
 * - Liquidity checks
 * - Account validation
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { TokenConfig } from '../types.js';
import BN from 'bn.js';

export interface SafetyCheckResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  canProceed: boolean;
}

export interface ArbitrageParams {
  inputAmount: number;
  expectedOutput: number;
  flashLoanFee: number;
  gasCost: number;
  slippageTolerance: number;
  priceImpact: number;
  minimumProfit: number;
}

export interface LiquidityCheck {
  token: TokenConfig;
  requiredAmount: number;
  availableAmount: number;
  sufficient: boolean;
}

/**
 * Safety Validator Service
 */
export class SafetyValidator {
  private connection: Connection;
  private readonly MAX_SLIPPAGE = 0.05; // 5%
  private readonly MAX_PRICE_IMPACT = 0.03; // 3%
  private readonly MIN_PROFIT_MARGIN = 1.003; // 0.3% minimum profit
  private readonly MAX_GAS_TO_PROFIT_RATIO = 0.2; // Gas should be max 20% of profit
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Run comprehensive safety checks on arbitrage opportunity
   * @param params - Arbitrage parameters
   * @returns Safety check result
   */
  async runSafetyChecks(params: ArbitrageParams): Promise<SafetyCheckResult> {
    console.log('[Safety] Running comprehensive safety checks...');
    
    const checks: SafetyCheckResult['checks'] = [];
    
    // Check 1: Profitability validation
    const profitCheck = this.checkProfitability(params);
    checks.push(profitCheck);
    
    // Check 2: Slippage validation
    const slippageCheck = this.checkSlippage(params);
    checks.push(slippageCheck);
    
    // Check 3: Price impact validation
    const priceImpactCheck = this.checkPriceImpact(params);
    checks.push(priceImpactCheck);
    
    // Check 4: Gas cost validation
    const gasCheck = this.checkGasCost(params);
    checks.push(gasCheck);
    
    // Check 5: Flash loan fee validation
    const feeCheck = this.checkFlashLoanFee(params);
    checks.push(feeCheck);
    
    // Check 6: Minimum profit threshold
    const minProfitCheck = this.checkMinimumProfit(params);
    checks.push(minProfitCheck);
    
    // Determine overall risk level
    const overallRisk = this.calculateOverallRisk(checks);
    
    // Determine if can proceed (no errors)
    const canProceed = !checks.some(check => check.severity === 'error' && !check.passed);
    
    // Overall pass status (all checks passed or only warnings)
    const passed = checks.every(check => check.passed || check.severity !== 'error');
    
    console.log(`[Safety] Safety check complete: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`[Safety] Overall risk: ${overallRisk.toUpperCase()}`);
    console.log(`[Safety] Can proceed: ${canProceed ? 'YES' : 'NO'}`);
    
    return {
      passed,
      checks,
      overallRisk,
      canProceed,
    };
  }
  
  /**
   * Check profitability
   */
  private checkProfitability(params: ArbitrageParams): SafetyCheckResult['checks'][0] {
    const inputBN = new BN(params.inputAmount);
    const outputBN = new BN(params.expectedOutput);
    const feeBN = new BN(Math.floor(params.inputAmount * params.flashLoanFee));
    const gasBN = new BN(params.gasCost);
    
    // Calculate total cost
    const totalCostBN = inputBN.add(feeBN).add(gasBN);
    
    // Check if output exceeds total cost
    const profitable = outputBN.gt(totalCostBN);
    const profitBN = outputBN.sub(totalCostBN);
    const profit = profitBN.toNumber();
    
    const profitPercent = (profit / params.inputAmount) * 100;
    
    return {
      name: 'Profitability Check',
      passed: profitable && profit >= params.minimumProfit,
      message: profitable
        ? `Profitable: ${profit} units (${profitPercent.toFixed(3)}%)`
        : `Not profitable: loss of ${Math.abs(profit)} units`,
      severity: profitable ? 'info' : 'error',
    };
  }
  
  /**
   * Check slippage tolerance
   */
  private checkSlippage(params: ArbitrageParams): SafetyCheckResult['checks'][0] {
    const withinTolerance = params.slippageTolerance <= this.MAX_SLIPPAGE;
    
    return {
      name: 'Slippage Tolerance Check',
      passed: withinTolerance,
      message: `Slippage: ${(params.slippageTolerance * 100).toFixed(2)}% (max: ${(this.MAX_SLIPPAGE * 100).toFixed(2)}%)`,
      severity: withinTolerance ? 'info' : 'error',
    };
  }
  
  /**
   * Check price impact
   */
  private checkPriceImpact(params: ArbitrageParams): SafetyCheckResult['checks'][0] {
    const acceptable = params.priceImpact <= this.MAX_PRICE_IMPACT;
    const severity: 'error' | 'warning' | 'info' = 
      params.priceImpact > this.MAX_PRICE_IMPACT ? 'error' :
      params.priceImpact > this.MAX_PRICE_IMPACT * 0.5 ? 'warning' : 'info';
    
    return {
      name: 'Price Impact Check',
      passed: acceptable,
      message: `Price impact: ${(params.priceImpact * 100).toFixed(3)}% (max: ${(this.MAX_PRICE_IMPACT * 100).toFixed(2)}%)`,
      severity,
    };
  }
  
  /**
   * Check gas cost relative to profit
   */
  private checkGasCost(params: ArbitrageParams): SafetyCheckResult['checks'][0] {
    const profit = params.expectedOutput - params.inputAmount - (params.inputAmount * params.flashLoanFee);
    const gasRatio = profit > 0 ? params.gasCost / profit : 1;
    
    const acceptable = gasRatio <= this.MAX_GAS_TO_PROFIT_RATIO;
    
    return {
      name: 'Gas Cost Check',
      passed: acceptable,
      message: `Gas cost: ${params.gasCost} (${(gasRatio * 100).toFixed(1)}% of profit, max: ${(this.MAX_GAS_TO_PROFIT_RATIO * 100).toFixed(0)}%)`,
      severity: acceptable ? 'info' : 'warning',
    };
  }
  
  /**
   * Check flash loan fee reasonableness
   */
  private checkFlashLoanFee(params: ArbitrageParams): SafetyCheckResult['checks'][0] {
    const feePercent = params.flashLoanFee * 100;
    const reasonable = params.flashLoanFee <= 0.005; // Max 0.5% is reasonable
    
    return {
      name: 'Flash Loan Fee Check',
      passed: reasonable,
      message: `Flash loan fee: ${feePercent.toFixed(2)}%`,
      severity: reasonable ? 'info' : 'warning',
    };
  }
  
  /**
   * Check minimum profit threshold
   */
  private checkMinimumProfit(params: ArbitrageParams): SafetyCheckResult['checks'][0] {
    const profit = params.expectedOutput - params.inputAmount - (params.inputAmount * params.flashLoanFee) - params.gasCost;
    const meetsThreshold = profit >= params.minimumProfit;
    
    return {
      name: 'Minimum Profit Threshold',
      passed: meetsThreshold,
      message: `Net profit: ${profit} (minimum: ${params.minimumProfit})`,
      severity: meetsThreshold ? 'info' : 'error',
    };
  }
  
  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(checks: SafetyCheckResult['checks'][]): 'low' | 'medium' | 'high' | 'critical' {
    const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;
    const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;
    
    if (errorCount > 0) {
      return 'critical';
    }
    
    if (warningCount >= 3) {
      return 'high';
    }
    
    if (warningCount >= 1) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Validate account addresses
   * @param accounts - Array of account public keys to validate
   * @returns Validation result
   */
  async validateAccounts(accounts: PublicKey[]): Promise<{
    valid: boolean;
    invalidAccounts: PublicKey[];
    errors: string[];
  }> {
    console.log(`[Safety] Validating ${accounts.length} account(s)...`);
    
    const invalidAccounts: PublicKey[] = [];
    const errors: string[] = [];
    
    for (const account of accounts) {
      try {
        // Check if account is valid public key
        if (!PublicKey.isOnCurve(account.toBytes())) {
          invalidAccounts.push(account);
          errors.push(`Account ${account.toString()} is not on curve`);
          continue;
        }
        
        // Check if account exists on chain (optional, commented out for performance)
        // const accountInfo = await this.connection.getAccountInfo(account);
        // if (!accountInfo) {
        //   errors.push(`Account ${account.toString()} does not exist`);
        // }
      } catch (error) {
        invalidAccounts.push(account);
        errors.push(`Invalid account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const valid = invalidAccounts.length === 0;
    console.log(`[Safety] Account validation: ${valid ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      valid,
      invalidAccounts,
      errors,
    };
  }
  
  /**
   * Validate transaction before sending
   * @param transaction - Transaction to validate
   * @returns Validation result
   */
  async validateTransaction(
    transaction: Transaction | VersionedTransaction
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log('[Safety] Validating transaction...');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (transaction instanceof Transaction) {
      // Check feePayer is set
      if (!transaction.feePayer) {
        errors.push('Transaction feePayer not set');
      }
      
      // Check has instructions
      if (transaction.instructions.length === 0) {
        errors.push('Transaction has no instructions');
      }
      
      // Check instruction limit
      if (transaction.instructions.length > 20) {
        warnings.push('Transaction has many instructions, may fail due to compute limit');
      }
      
      // Check signatures
      if (transaction.signatures.length === 0) {
        warnings.push('Transaction not signed yet');
      }
    } else {
      // VersionedTransaction checks
      const message = transaction.message;
      
      if (message.compiledInstructions.length === 0) {
        errors.push('Transaction has no instructions');
      }
      
      if (message.compiledInstructions.length > 20) {
        warnings.push('Transaction has many instructions, may fail due to compute limit');
      }
    }
    
    const valid = errors.length === 0;
    console.log(`[Safety] Transaction validation: ${valid ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      valid,
      errors,
      warnings,
    };
  }
  
  /**
   * Check liquidity availability
   * @param checks - Array of liquidity checks
   * @returns Overall liquidity status
   */
  async checkLiquidity(checks: LiquidityCheck[]): Promise<{
    sufficient: boolean;
    checks: LiquidityCheck[];
    warnings: string[];
  }> {
    console.log(`[Safety] Checking liquidity for ${checks.length} token(s)...`);
    
    const warnings: string[] = [];
    
    for (const check of checks) {
      if (!check.sufficient) {
        warnings.push(
          `Insufficient liquidity for ${check.token.symbol}: need ${check.requiredAmount}, available ${check.availableAmount}`
        );
      }
    }
    
    const sufficient = checks.every(c => c.sufficient);
    console.log(`[Safety] Liquidity check: ${sufficient ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      sufficient,
      checks,
      warnings,
    };
  }
  
  /**
   * Print safety check report
   */
  printSafetyReport(result: SafetyCheckResult): void {
    console.log('\n=== SAFETY CHECK REPORT ===');
    console.log(`Overall Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Risk Level: ${result.overallRisk.toUpperCase()}`);
    console.log(`Can Proceed: ${result.canProceed ? 'YES' : 'NO'}`);
    console.log('\nDetailed Checks:');
    
    for (const check of result.checks) {
      const icon = check.passed ? '✅' : '❌';
      const severity = check.severity.toUpperCase();
      console.log(`  ${icon} [${severity}] ${check.name}`);
      console.log(`     ${check.message}`);
    }
    
    console.log('===========================\n');
  }
}
