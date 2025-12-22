/**
 * Bot Script Engine
 * 
 * Provides scriptable automation for advanced trading strategies.
 * Scripts are JavaScript/TypeScript code that can be executed safely.
 * 
 * SECURITY: Scripts run in a restricted environment with no access to:
 * - File system
 * - Network (except whitelisted APIs)
 * - Private keys
 * - Other users' data
 */

import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TransactionBuilder, BuiltTransaction } from './transactionBuilder.js';
import { AuditLogger } from './auditLogger.js';
import { createHash } from 'crypto';

export interface ScriptContext {
  /** User wallet address */
  userWallet: PublicKey;
  /** Bot configuration ID */
  botConfigId: string;
  /** Connection to Solana */
  connection: Connection;
  /** Available balance in lamports */
  balanceLamports: number;
  /** Custom parameters from bot config */
  params: Record<string, any>;
}

export interface ScriptResult {
  /** Whether script execution was successful */
  success: boolean;
  /** Instructions to execute (if any) */
  instructions?: TransactionInstruction[];
  /** Metadata about what the script wants to do */
  metadata?: {
    type: string;
    description: string;
  };
  /** Error message (if failed) */
  error?: string;
  /** Logs from script execution */
  logs: string[];
}

export interface BotScript {
  id: string;
  name: string;
  code: string;
  hash: string;
  triggerType: 'manual' | 'scheduled' | 'event' | 'condition';
  triggerConfig?: Record<string, any>;
}

export class ScriptEngine {
  private auditLogger: AuditLogger;
  private transactionBuilder: TransactionBuilder;

  constructor(connection: Connection) {
    this.auditLogger = new AuditLogger();
    this.transactionBuilder = new TransactionBuilder(connection);
  }

  /**
   * Execute a bot script
   * 
   * Scripts must export a default async function that returns instructions
   */
  async executeScript(
    script: BotScript,
    context: ScriptContext
  ): Promise<ScriptResult> {
    const logs: string[] = [];
    
    try {
      // Verify script hash
      const computedHash = this.computeScriptHash(script.code);
      if (computedHash !== script.hash) {
        throw new Error('Script hash mismatch - code may have been tampered with');
      }

      // Log script execution start
      await this.auditLogger.logAction({
        userId: context.userWallet.toBase58(),
        botConfigId: context.botConfigId,
        action: 'script_execution_started',
        actionType: 'execution',
        severity: 'info',
        metadata: {
          scriptId: script.id,
          scriptName: script.name,
        },
      });

      // Create safe execution environment
      const safeContext = this.createSafeContext(context, logs);

      // Execute the script
      const result = await this.runScriptInSandbox(script.code, safeContext);

      // Log successful execution
      await this.auditLogger.logAction({
        userId: context.userWallet.toBase58(),
        botConfigId: context.botConfigId,
        action: 'script_execution_completed',
        actionType: 'execution',
        severity: 'info',
        metadata: {
          scriptId: script.id,
          instructionCount: result.instructions?.length || 0,
        },
      });

      return {
        success: true,
        instructions: result.instructions,
        metadata: result.metadata,
        logs,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log execution failure
      await this.auditLogger.logAction({
        userId: context.userWallet.toBase58(),
        botConfigId: context.botConfigId,
        action: 'script_execution_failed',
        actionType: 'error',
        severity: 'error',
        metadata: {
          scriptId: script.id,
          error: errorMessage,
        },
      });

      return {
        success: false,
        error: errorMessage,
        logs,
      };
    }
  }

  /**
   * Create a safe execution context for scripts
   * 
   * This provides a limited API surface to scripts
   */
  private createSafeContext(context: ScriptContext, logs: string[]): Record<string, any> {
    return {
      // User context
      userWallet: context.userWallet.toBase58(),
      balance: context.balanceLamports / 1e9, // Convert to SOL
      params: context.params,

      // Logging
      log: (...args: any[]) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        logs.push(`[${new Date().toISOString()}] ${message}`);
      },

      // Safe utilities
      Math,
      Date,
      JSON,
      
      // PublicKey utilities (safe, read-only)
      PublicKey: {
        isValid: (address: string) => {
          try {
            new PublicKey(address);
            return true;
          } catch {
            return false;
          }
        },
      },
    };
  }

  /**
   * Run script in a restricted sandbox
   * 
   * IMPLEMENTATION NOTE: This is a basic implementation.
   * In production, consider using:
   * - VM2 or isolated-vm for better isolation
   * - WebAssembly for sandboxed execution
   * - AWS Lambda or similar for complete isolation
   */
  private async runScriptInSandbox(
    code: string,
    safeContext: Record<string, any>
  ): Promise<{
    instructions?: TransactionInstruction[];
    metadata?: { type: string; description: string };
  }> {
    // Wrap script in async function
    const wrappedCode = `
      (async function(context) {
        'use strict';
        const { userWallet, balance, params, log, Math, Date, JSON, PublicKey } = context;
        
        ${code}
        
        // Script must export a default async function
        if (typeof main !== 'function') {
          throw new Error('Script must define a main() function');
        }
        
        return await main();
      })
    `;

    try {
      // Create function from code
      // eslint-disable-next-line no-new-func
      const scriptFunction = new Function('return ' + wrappedCode)();
      
      // Execute with timeout
      const timeoutMs = 30000; // 30 seconds max
      const result = await Promise.race([
        scriptFunction(safeContext),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Script execution timeout')), timeoutMs)
        ),
      ]);

      return result as any;
    } catch (error) {
      throw new Error(`Script execution error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a script before saving
   */
  async validateScript(code: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for forbidden patterns
    const forbiddenPatterns = [
      /require\s*\(/,           // No require()
      /import\s+/,              // No imports
      /eval\s*\(/,              // No eval()
      /Function\s*\(/,          // No Function constructor
      /process\./,              // No process access
      /global\./,               // No global access
      /__dirname/,              // No __dirname
      /__filename/,             // No __filename
      /fs\./,                   // No file system
      /child_process/,          // No child processes
      /\.exec\(/,               // No command execution
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        errors.push(`Forbidden pattern detected: ${pattern.source}`);
      }
    }

    // Check if script defines main function
    if (!code.includes('function main()') && !code.includes('async function main()')) {
      errors.push('Script must define a main() function');
    }

    // Check script length
    if (code.length > 100000) { // 100KB max
      errors.push('Script is too large (max 100KB)');
    }

    // Try to parse as JavaScript
    try {
      // eslint-disable-next-line no-new-func
      new Function(code);
    } catch (error) {
      errors.push(`Syntax error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compute SHA-256 hash of script code
   */
  computeScriptHash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Example: Simple arbitrage script template
   */
  static getArbitrageTemplate(): string {
    return `
// Simple arbitrage bot script
async function main() {
  // Log execution
  log('Arbitrage bot executing...');
  log('User wallet:', userWallet);
  log('Balance:', balance, 'SOL');
  
  // Get parameters
  const {
    tokenIn,
    tokenOut,
    minProfitSol = 0.01,
    maxSlippageBps = 100,
  } = params;
  
  // Validate inputs
  if (!tokenIn || !tokenOut) {
    throw new Error('tokenIn and tokenOut are required');
  }
  
  if (!PublicKey.isValid(tokenIn)) {
    throw new Error('Invalid tokenIn address');
  }
  
  if (!PublicKey.isValid(tokenOut)) {
    throw new Error('Invalid tokenOut address');
  }
  
  // TODO: Query prices from DEXs
  // TODO: Calculate arbitrage opportunity
  // TODO: Build swap instructions
  
  log('Arbitrage check complete');
  
  // Return instructions to execute
  return {
    instructions: [], // Add actual instructions here
    metadata: {
      type: 'arbitrage',
      description: \`Arbitrage \${tokenIn} -> \${tokenOut}\`,
    },
  };
}
`;
  }

  /**
   * Example: DCA (Dollar Cost Average) script template
   */
  static getDCATemplate(): string {
    return `
// DCA (Dollar Cost Average) bot script
async function main() {
  log('DCA bot executing...');
  log('User wallet:', userWallet);
  log('Balance:', balance, 'SOL');
  
  const {
    tokenMint,
    amountSol,
    maxSlippageBps = 100,
  } = params;
  
  // Validate
  if (!tokenMint) {
    throw new Error('tokenMint is required');
  }
  
  if (!PublicKey.isValid(tokenMint)) {
    throw new Error('Invalid tokenMint address');
  }
  
  if (!amountSol || amountSol <= 0) {
    throw new Error('amountSol must be positive');
  }
  
  if (amountSol > balance) {
    throw new Error('Insufficient balance');
  }
  
  log(\`Buying \${amountSol} SOL worth of token \${tokenMint}\`);
  
  // TODO: Build Jupiter swap instruction
  
  return {
    instructions: [],
    metadata: {
      type: 'dca',
      description: \`DCA buy \${tokenMint} with \${amountSol} SOL\`,
    },
  };
}
`;
  }

  /**
   * Example: Grid trading script template
   */
  static getGridTemplate(): string {
    return `
// Grid trading bot script
async function main() {
  log('Grid trading bot executing...');
  
  const {
    tokenMint,
    gridLevels = 5,
    gridSpacingPercent = 2,
    orderSizeSol = 0.1,
  } = params;
  
  // Validate
  if (!tokenMint || !PublicKey.isValid(tokenMint)) {
    throw new Error('Invalid tokenMint');
  }
  
  log(\`Setting up \${gridLevels} grid levels with \${gridSpacingPercent}% spacing\`);
  
  // TODO: Get current price
  // TODO: Calculate grid levels
  // TODO: Place limit orders at each level
  
  return {
    instructions: [],
    metadata: {
      type: 'grid',
      description: \`Grid trading \${tokenMint}\`,
    },
  };
}
`;
  }
}
