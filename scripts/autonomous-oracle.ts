#!/usr/bin/env ts-node
/**
 * GXQ Autonomous Oracle - Advanced Code Analysis & Auto-Evolution System
 * 
 * This is the "brain" of the repository's continuous evolution strategy.
 * It performs comprehensive analysis across multiple dimensions:
 * 
 * 1. Architecture Re-Analysis: Detects circular dependencies, redundant patterns, modularity issues
 * 2. Security Re-Scoring: Scans for vulnerabilities, validates RBAC/encryption usage
 * 3. Math & Gas Optimization: Analyzes arbitrage math, compute unit efficiency
 * 4. Solana Mainnet Compatibility: Validates best practices, versioned transactions, priority fees
 * 5. Autonomous Evolution: Identifies improvable patterns and generates fixes
 * 6. Auto-Ticketing: Creates GitHub issues for critical findings
 * 
 * @author GXQ STUDIO
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';

// ==================== Types & Interfaces ====================

interface AnalysisResult {
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  fix?: CodeFix;
  recommendation: string;
}

interface CodeFix {
  file: string;
  oldCode: string;
  newCode: string;
  description: string;
}

interface OracleReport {
  timestamp: Date;
  overallScore: number; // 0-100
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  infoIssues: number;
  autoFixesApplied: number;
  results: AnalysisResult[];
  safelyRedeploy: boolean;
  summary: string;
}

interface FileInfo {
  path: string;
  content: string;
  lines: string[];
}

interface DependencyNode {
  file: string;
  imports: string[];
}

// ==================== Configuration ====================

const CONFIG = {
  rootDir: process.cwd(),
  scanDirs: ['src', 'api', 'webapp/app', 'webapp/lib', 'webapp/components'],
  excludeDirs: ['node_modules', 'dist', '.next', '.vercel', '__tests__'],
  maxFileSize: 500000, // 500KB
  criticalPatterns: {
    privateKeyExposure: /private.*key|secret.*key|mnemonic/i,
    missingSignerCheck: /\.isSigner\s*=\s*false|without.*signer.*check/i,
    unvalidatedAccount: /AccountInfo.*without.*validation|unvalidated.*account/i,
    sqlInjection: /query.*\+|raw.*sql|execute.*\(/i,
    unsafeEval: /eval\(|new Function\(/,
    hardcodedSecrets: /['\"]sk_|['\"]pk_|['\"]secret_/,
  },
  architecturePatterns: {
    circularDep: /circular.*dependency|mutual.*import/i,
    duplicateInit: /new\s+(\w+Service|Manager|Provider).*new\s+\1/s,
    godClass: /(class|function)\s+\w+.*{[\s\S]{3000,}}/,
    tooManyDeps: /^import.*\n(?:import.*\n){15,}/m,
  },
  solanaPatterns: {
    missingVersionedTx: /Transaction\(|new Transaction\(/,
    missingLookupTable: /AddressLookupTableProgram/,
    staticPriorityFee: /priorityFee.*=.*\d+[;\s]/,
    missingComputeBudget: /ComputeBudgetProgram/,
    unsafeMath: /amount\s*[\+\-\*\/]\s*amount|balance\s*[\+\-\*\/]/,
  },
  gasOptimization: {
    maxComputeUnits: 1400000,
    maxPriorityFeeLamports: 10000000,
    inefficientLoops: /for.*in.*Object\.keys|forEach/,
    unnecessaryClone: /JSON\.parse\(JSON\.stringify/,
  },
};

// ==================== Oracle Class ====================

class AutonomousOracle {
  private results: AnalysisResult[] = [];
  private octokit: Octokit | null = null;
  private autoFixesApplied = 0;
  private filesCache: Map<string, FileInfo> = new Map();

  constructor() {
    if (process.env.GITHUB_TOKEN) {
      this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    }
  }

  // ==================== Main Execution ====================

  async run(): Promise<OracleReport> {
    console.log('🧠 GXQ Autonomous Oracle Starting...\n');

    try {
      // Load all relevant files
      await this.loadFiles();

      // Run all analysis modules
      await this.analyzeArchitecture();
      await this.analyzeSecurity();
      await this.analyzeMathAndGas();
      await this.analyzeSolanaCompatibility();
      await this.analyzeEvolutionOpportunities();

      // Generate report
      const report = this.generateReport();

      // Apply auto-fixes if safe
      if (report.safelyRedeploy && report.autoFixesApplied > 0) {
        console.log(`\n✅ Applied ${report.autoFixesApplied} automatic fixes`);
      }

      // Create GitHub issues for critical findings
      await this.autoTicketCriticalIssues();

      // Output report
      this.outputReport(report);

      return report;
    } catch (error) {
      console.error('❌ Oracle execution failed:', error);
      throw error;
    }
  }

  // ==================== File Loading ====================

  private async loadFiles(): Promise<void> {
    console.log('📂 Loading project files...');

    for (const dir of CONFIG.scanDirs) {
      const fullPath = path.join(CONFIG.rootDir, dir);
      if (fs.existsSync(fullPath)) {
        this.loadFilesRecursive(fullPath);
      }
    }

    console.log(`   Loaded ${this.filesCache.size} files\n`);
  }

  private loadFilesRecursive(dirPath: string): void {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(CONFIG.rootDir, fullPath);

      // Skip excluded directories
      if (CONFIG.excludeDirs.some(exclude => relativePath.includes(exclude))) {
        continue;
      }

      if (entry.isDirectory()) {
        this.loadFilesRecursive(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > CONFIG.maxFileSize) continue;

          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          this.filesCache.set(relativePath, {
            path: relativePath,
            content,
            lines,
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  // ==================== Architecture Analysis ====================

  private async analyzeArchitecture(): Promise<void> {
    console.log('🏗️  Analyzing Architecture...');

    // 1. Detect circular dependencies
    this.detectCircularDependencies();

    // 2. Find redundant service initializations
    this.detectRedundantInitializations();

    // 3. Identify god classes/files
    this.detectGodClasses();

    // 4. Check import complexity
    this.detectComplexImports();

    console.log(`   Found ${this.countByCategory('architecture')} architecture issues\n`);
  }

  private detectCircularDependencies(): void {
    const graph = this.buildDependencyGraph();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (node: string, path: string[]): boolean => {
      if (!visited.has(node)) {
        visited.add(node);
        recursionStack.add(node);

        const deps = graph.get(node) || [];
        for (const dep of deps) {
          if (!visited.has(dep) && detectCycle(dep, [...path, dep])) {
            return true;
          } else if (recursionStack.has(dep)) {
            this.addResult({
              category: 'architecture',
              severity: 'high',
              title: 'Circular Dependency Detected',
              description: `Circular import chain: ${[...path, dep, node].join(' → ')}`,
              file: node,
              autoFixable: false,
              recommendation: 'Refactor to break circular dependency. Consider extracting shared interfaces or using dependency injection.',
            });
            return true;
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      detectCycle(node, [node]);
    }
  }

  private buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [filePath, fileInfo] of this.filesCache) {
      const imports: string[] = [];
      const importRegex = /import.*from\s+['"](\..*)['"]/g;
      let match;

      while ((match = importRegex.exec(fileInfo.content)) !== null) {
        const importPath = match[1];
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        if (resolvedPath) {
          imports.push(resolvedPath);
        }
      }

      graph.set(filePath, imports);
    }

    return graph;
  }

  private resolveImportPath(fromFile: string, importPath: string): string | null {
    const fromDir = path.dirname(fromFile);
    let resolved = path.join(fromDir, importPath);

    // Add .ts/.tsx extension if not present
    if (!resolved.match(/\.(ts|tsx|js|jsx)$/)) {
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        if (this.filesCache.has(resolved + ext)) {
          return resolved + ext;
        }
      }
      // Try index files
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const indexPath = path.join(resolved, 'index' + ext);
        if (this.filesCache.has(indexPath)) {
          return indexPath;
        }
      }
    }

    return this.filesCache.has(resolved) ? resolved : null;
  }

  private detectRedundantInitializations(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Look for multiple instantiations of the same service
      const servicePattern = /new\s+(\w+(?:Service|Manager|Provider|Integration))\(/g;
      const services = new Map<string, number>();

      let match;
      while ((match = servicePattern.exec(fileInfo.content)) !== null) {
        const serviceName = match[1];
        services.set(serviceName, (services.get(serviceName) || 0) + 1);
      }

      for (const [serviceName, count] of services) {
        if (count > 2) {
          this.addResult({
            category: 'architecture',
            severity: 'medium',
            title: 'Redundant Service Initialization',
            description: `${serviceName} is instantiated ${count} times in this file. Consider using singleton pattern or dependency injection.`,
            file: filePath,
            autoFixable: false,
            recommendation: 'Refactor to use a single instance via singleton pattern or dependency injection container.',
          });
        }
      }
    }
  }

  private detectGodClasses(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      const lineCount = fileInfo.lines.length;
      const methodCount = (fileInfo.content.match(/^\s*(async\s+)?\w+\s*\(/gm) || []).length;

      if (lineCount > 1000 || methodCount > 30) {
        this.addResult({
          category: 'architecture',
          severity: 'medium',
          title: 'God Class/File Detected',
          description: `File has ${lineCount} lines and ${methodCount} methods. Consider breaking into smaller, focused modules.`,
          file: filePath,
          autoFixable: false,
          recommendation: 'Apply Single Responsibility Principle. Extract related functionality into separate service classes.',
        });
      }
    }
  }

  private detectComplexImports(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      const importLines = fileInfo.lines.filter(line => line.trim().startsWith('import'));
      
      if (importLines.length > 20) {
        this.addResult({
          category: 'architecture',
          severity: 'low',
          title: 'Too Many Imports',
          description: `File has ${importLines.length} import statements. This may indicate high coupling.`,
          file: filePath,
          autoFixable: false,
          recommendation: 'Review if all imports are necessary. Consider creating facade/barrel exports.',
        });
      }
    }
  }

  // ==================== Security Analysis ====================

  private async analyzeSecurity(): Promise<void> {
    console.log('🔒 Analyzing Security...');

    // 1. Check for private key exposure
    this.detectPrivateKeyExposure();

    // 2. Validate RBAC usage
    this.validateRBACUsage();

    // 3. Check encryption service usage
    this.validateEncryptionUsage();

    // 4. Solana-specific security checks
    this.detectSolanaSecurityIssues();

    // 5. Check for common vulnerabilities
    this.detectCommonVulnerabilities();

    console.log(`   Found ${this.countByCategory('security')} security issues\n`);
  }

  private detectPrivateKeyExposure(): void {
    const dangerousPatterns = [
      /console\.log.*privateKey/i,
      /console\.log.*secret/i,
      /privateKey\s*=\s*['"`]/, // Hardcoded private keys
      /process\.env\.\w+.*console\.log/i, // Logging env vars
    ];

    for (const [filePath, fileInfo] of this.filesCache) {
      for (let i = 0; i < fileInfo.lines.length; i++) {
        const line = fileInfo.lines[i];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(line)) {
            this.addResult({
              category: 'security',
              severity: 'critical',
              title: 'Potential Private Key Exposure',
              description: 'Code may expose sensitive keys or secrets in logs or hardcode them.',
              file: filePath,
              line: i + 1,
              autoFixable: false,
              recommendation: 'Never log private keys, secrets, or sensitive environment variables. Use proper secret management.',
            });
          }
        }
      }
    }
  }

  private validateRBACUsage(): void {
    const sensitiveOperations = [
      'executeFlashLoanArbitrage',
      'transferFunds',
      'approveTransaction',
      'adminAction',
      'updateConfig',
    ];

    for (const [filePath, fileInfo] of this.filesCache) {
      // Skip RBAC service itself
      if (filePath.includes('rbac.ts')) continue;

      for (const operation of sensitiveOperations) {
        const operationRegex = new RegExp(`(async\\s+)?${operation}\\s*\\(`, 'g');
        const rbacCheckRegex = /rbac\.checkPermission|hasPermission|requiresRole/i;

        if (operationRegex.test(fileInfo.content) && !rbacCheckRegex.test(fileInfo.content)) {
          this.addResult({
            category: 'security',
            severity: 'high',
            title: 'Missing RBAC Check',
            description: `Sensitive operation '${operation}' may not be protected by RBAC.`,
            file: filePath,
            autoFixable: false,
            recommendation: 'Add RBAC permission check before executing sensitive operations.',
          });
        }
      }
    }
  }

  private validateEncryptionUsage(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check if file handles private keys but doesn't use encryption service
      if (/privateKey|wallet.*seed|mnemonic/i.test(fileInfo.content)) {
        if (!fileInfo.content.includes('encrypt(') && 
            !fileInfo.content.includes('decrypt(') &&
            !filePath.includes('encryption.ts') &&
            !filePath.includes('test')) {
          
          this.addResult({
            category: 'security',
            severity: 'high',
            title: 'Missing Encryption for Sensitive Data',
            description: 'File handles sensitive data (private keys/mnemonics) but does not use encryption service.',
            file: filePath,
            autoFixable: false,
            recommendation: 'Use the encryption service to protect sensitive data at rest.',
          });
        }
      }
    }
  }

  private detectSolanaSecurityIssues(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check for missing signer validation
      if (/TransactionInstruction|Transaction/.test(fileInfo.content)) {
        const lines = fileInfo.lines;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Look for account meta without proper signer check
          if (/AccountMeta|accounts.*push/i.test(line) && !/isSigner.*true/i.test(line)) {
            const contextLines = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 5)).join('\n');
            if (!/isSigner|requiresSignature/i.test(contextLines)) {
              this.addResult({
                category: 'security',
                severity: 'high',
                title: 'Missing Signer Validation',
                description: 'Transaction account may not have proper signer validation.',
                file: filePath,
                line: i + 1,
                autoFixable: false,
                recommendation: 'Ensure all transaction signers are properly validated. Set isSigner: true for accounts that must sign.',
              });
            }
          }
        }
      }

      // Check for unvalidated account data
      if (/AccountInfo.*data|account\.data/i.test(fileInfo.content) && 
          !/validate|verify|check.*owner/i.test(fileInfo.content)) {
        this.addResult({
          category: 'security',
          severity: 'medium',
          title: 'Unvalidated Account Data',
          description: 'Account data is accessed without validation checks.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Always validate account ownership and data structure before accessing account data.',
        });
      }
    }
  }

  private detectCommonVulnerabilities(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // SQL Injection
      if (/query.*\+|execute.*\+/.test(fileInfo.content)) {
        this.addResult({
          category: 'security',
          severity: 'critical',
          title: 'Potential SQL Injection',
          description: 'SQL query uses string concatenation which is vulnerable to injection.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Use parameterized queries or prepared statements.',
        });
      }

      // eval() usage
      if (/eval\(|new Function\(/.test(fileInfo.content)) {
        this.addResult({
          category: 'security',
          severity: 'high',
          title: 'Unsafe eval() Usage',
          description: 'Using eval() or Function constructor can lead to code injection vulnerabilities.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Avoid eval(). Use safer alternatives like JSON.parse() or specific parsers.',
        });
      }
    }
  }

  // ==================== Math & Gas Optimization ====================

  private async analyzeMathAndGas(): Promise<void> {
    console.log('⚡ Analyzing Math & Gas Optimization...');

    // 1. Check arbitrage math safety
    this.analyzeMathSafety();

    // 2. Compute unit optimization
    this.analyzeComputeUnits();

    // 3. Priority fee optimization
    this.analyzePriorityFees();

    // 4. General optimization opportunities
    this.analyzeOptimizationOpportunities();

    console.log(`   Found ${this.countByCategory('optimization')} optimization opportunities\n`);
  }

  private analyzeMathSafety(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Skip if not dealing with financial calculations
      if (!/(arbitrage|profit|balance|amount|price)/i.test(fileInfo.content)) continue;

      // Check for unsafe arithmetic operations
      const unsafeOps = fileInfo.content.match(/\b(amount|balance|profit|price)\s*[\+\-\*\/]\s*\w+/gi);
      
      if (unsafeOps && unsafeOps.length > 0) {
        // Check if BN.js or safe math is used
        const usesSafeMath = /import.*BN|BigNumber|SafeMath/i.test(fileInfo.content);
        
        if (!usesSafeMath && !filePath.includes('test')) {
          this.addResult({
            category: 'optimization',
            severity: 'high',
            title: 'Unsafe Math Operations',
            description: `Found ${unsafeOps.length} potentially unsafe arithmetic operations on financial values.`,
            file: filePath,
            autoFixable: false,
            recommendation: 'Use BN.js for all financial calculations to prevent overflow/underflow and maintain precision.',
          });
        }
      }

      // Check for floating point in financial calculations
      if (/\b(amount|balance|profit)\s*[\*\/]\s*[\d\.]+/i.test(fileInfo.content)) {
        const hasDecimals = fileInfo.content.match(/[\d]+\.[\d]+/);
        if (hasDecimals) {
          this.addResult({
            category: 'optimization',
            severity: 'medium',
            title: 'Floating Point in Financial Calculations',
            description: 'Using floating point numbers for financial calculations can lead to precision loss.',
            file: filePath,
            autoFixable: false,
            recommendation: 'Convert to integer arithmetic using smallest unit (lamports for SOL). Use BN.js for safe calculations.',
          });
        }
      }
    }
  }

  private analyzeComputeUnits(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check for compute budget instructions
      if (/ComputeBudgetProgram\.setComputeUnitLimit/i.test(fileInfo.content)) {
        const cuLimitMatch = fileInfo.content.match(/setComputeUnitLimit.*?(\d+)/);
        if (cuLimitMatch) {
          const limit = parseInt(cuLimitMatch[1]);
          if (limit > CONFIG.gasOptimization.maxComputeUnits) {
            this.addResult({
              category: 'optimization',
              severity: 'medium',
              title: 'Excessive Compute Unit Limit',
              description: `Compute unit limit of ${limit} exceeds recommended maximum of ${CONFIG.gasOptimization.maxComputeUnits}.`,
              file: filePath,
              autoFixable: true,
              fix: {
                file: filePath,
                oldCode: `setComputeUnitLimit({ units: ${limit} })`,
                newCode: `setComputeUnitLimit({ units: ${CONFIG.gasOptimization.maxComputeUnits} })`,
                description: 'Reduce compute unit limit to recommended maximum',
              },
              recommendation: 'Optimize transaction logic to require fewer compute units or use recommended limits.',
            });
          }
        }
      }

      // Look for missing compute budget in complex transactions
      if (/Transaction|sendAndConfirm/i.test(fileInfo.content) && 
          !/ComputeBudgetProgram/i.test(fileInfo.content) &&
          filePath.includes('arbitrage')) {
        this.addResult({
          category: 'optimization',
          severity: 'low',
          title: 'Missing Compute Budget Instruction',
          description: 'Complex transaction may benefit from explicit compute budget instructions.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Add ComputeBudgetProgram instructions to optimize transaction execution.',
        });
      }
    }
  }

  private analyzePriorityFees(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check for static priority fees
      const staticFeePattern = /priorityFee.*=.*\d{6,}/g;
      let match;

      while ((match = staticFeePattern.exec(fileInfo.content)) !== null) {
        const feeMatch = match[0].match(/(\d+)/);
        if (feeMatch) {
          const fee = parseInt(feeMatch[1]);
          
          if (fee > CONFIG.gasOptimization.maxPriorityFeeLamports) {
            this.addResult({
              category: 'optimization',
              severity: 'high',
              title: 'Priority Fee Exceeds Maximum',
              description: `Priority fee of ${fee} lamports exceeds maximum of ${CONFIG.gasOptimization.maxPriorityFeeLamports}.`,
              file: filePath,
              autoFixable: true,
              fix: {
                file: filePath,
                oldCode: match[0],
                newCode: match[0].replace(fee.toString(), CONFIG.gasOptimization.maxPriorityFeeLamports.toString()),
                description: 'Cap priority fee at 10M lamports',
              },
              recommendation: 'Enforce maximum priority fee of 10M lamports as per project guidelines.',
            });
          }

          // Check if fee is truly static (not in config)
          if (!filePath.includes('config')) {
            this.addResult({
              category: 'optimization',
              severity: 'medium',
              title: 'Static Priority Fee',
              description: 'Priority fee is hardcoded instead of being dynamic based on network conditions.',
              file: filePath,
              autoFixable: false,
              recommendation: 'Implement dynamic priority fee calculation based on network congestion using getPriorityFeeEstimate or similar.',
            });
          }
        }
      }
    }
  }

  private analyzeOptimizationOpportunities(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Inefficient loops
      if (/for\s*\(\s*\w+\s+in\s+Object\.keys/.test(fileInfo.content)) {
        this.addResult({
          category: 'optimization',
          severity: 'low',
          title: 'Inefficient Loop Pattern',
          description: 'Using for...in with Object.keys() is less efficient than for...of or forEach.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Use for...of with Object.entries() or Object.values() for better performance.',
        });
      }

      // Unnecessary deep cloning
      if (/JSON\.parse\(JSON\.stringify/.test(fileInfo.content)) {
        this.addResult({
          category: 'optimization',
          severity: 'low',
          title: 'Inefficient Deep Clone',
          description: 'Using JSON.parse(JSON.stringify()) for cloning is slow and loses non-JSON types.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Use structuredClone() or a proper cloning library like lodash.cloneDeep().',
        });
      }
    }
  }

  // ==================== Solana Mainnet Compatibility ====================

  private async analyzeSolanaCompatibility(): Promise<void> {
    console.log('⚙️  Analyzing Solana Mainnet Compatibility...');

    // 1. Check for versioned transactions
    this.checkVersionedTransactions();

    // 2. Check for address lookup tables
    this.checkAddressLookupTables();

    // 3. Validate transaction best practices
    this.validateTransactionBestPractices();

    console.log(`   Found ${this.countByCategory('solana')} Solana compatibility issues\n`);
  }

  private checkVersionedTransactions(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Look for old Transaction usage in arbitrage/trading files
      if (/arbitrage|trade|swap|execute/i.test(filePath)) {
        const oldTxPattern = /new Transaction\(\)/g;
        const versionedTxPattern = /VersionedTransaction|TransactionMessage/;

        if (oldTxPattern.test(fileInfo.content) && !versionedTxPattern.test(fileInfo.content)) {
          this.addResult({
            category: 'solana',
            severity: 'medium',
            title: 'Using Legacy Transaction Format',
            description: 'Code uses legacy Transaction instead of VersionedTransaction for better efficiency.',
            file: filePath,
            autoFixable: false,
            recommendation: 'Migrate to VersionedTransaction with TransactionMessage for better performance and lower fees.',
          });
        }
      }
    }
  }

  private checkAddressLookupTables(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check if file does complex multi-account transactions without lookup tables
      const accountCount = (fileInfo.content.match(/AccountMeta/g) || []).length;
      const usesLookupTable = /AddressLookupTable|lookupTableAddress/i.test(fileInfo.content);

      if (accountCount > 10 && !usesLookupTable && filePath.includes('arbitrage')) {
        this.addResult({
          category: 'solana',
          severity: 'low',
          title: 'Could Benefit from Address Lookup Tables',
          description: `File has ${accountCount} account references. Address Lookup Tables could reduce transaction size.`,
          file: filePath,
          autoFixable: false,
          recommendation: 'Consider using Address Lookup Tables (ALTs) for frequently used accounts to reduce transaction size and costs.',
        });
      }
    }
  }

  private validateTransactionBestPractices(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check for transaction simulation before sending
      if (/sendAndConfirm|sendTransaction/.test(fileInfo.content)) {
        const hasSimulation = /simulate|simulateTransaction/.test(fileInfo.content);
        
        if (!hasSimulation && !filePath.includes('test')) {
          this.addResult({
            category: 'solana',
            severity: 'medium',
            title: 'Missing Transaction Simulation',
            description: 'Transactions should be simulated before sending to catch errors early.',
            file: filePath,
            autoFixable: false,
            recommendation: 'Always simulate transactions before sending to validate they will succeed and estimate compute units.',
          });
        }
      }

      // Check for proper confirmation strategy
      if (/sendTransaction/.test(fileInfo.content)) {
        const hasConfirmation = /confirmTransaction|getSignatureStatus/.test(fileInfo.content);
        
        if (!hasConfirmation && !filePath.includes('test')) {
          this.addResult({
            category: 'solana',
            severity: 'high',
            title: 'Missing Transaction Confirmation',
            description: 'Transactions should be confirmed before assuming success.',
            file: filePath,
            autoFixable: false,
            recommendation: 'Always confirm transactions using confirmTransaction() or monitor signature status.',
          });
        }
      }
    }
  }

  // ==================== Autonomous Evolution ====================

  private async analyzeEvolutionOpportunities(): Promise<void> {
    console.log('🧬 Analyzing Evolution Opportunities...');

    // 1. Find improvable patterns
    this.findImprovablePatterns();

    // 2. Detect technical debt
    this.detectTechnicalDebt();

    // 3. Suggest modern patterns
    this.suggestModernPatterns();

    console.log(`   Found ${this.countByCategory('evolution')} evolution opportunities\n`);
  }

  private findImprovablePatterns(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Look for TODO/FIXME comments
      const lines = fileInfo.lines;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line)) {
          this.addResult({
            category: 'evolution',
            severity: 'low',
            title: 'Technical Debt Marker Found',
            description: line.trim(),
            file: filePath,
            line: i + 1,
            autoFixable: false,
            recommendation: 'Address technical debt markers to improve code quality.',
          });
        }
      }

      // Look for error swallowing (empty catch blocks)
      const emptyCatchPattern = /catch\s*\(\w*\)\s*\{\s*\}/g;
      if (emptyCatchPattern.test(fileInfo.content)) {
        this.addResult({
          category: 'evolution',
          severity: 'medium',
          title: 'Empty Catch Block',
          description: 'Error is caught but not handled or logged.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Always log errors or handle them appropriately. Empty catch blocks hide issues.',
        });
      }
    }
  }

  private detectTechnicalDebt(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Check for console.log in non-test production code
      if (!filePath.includes('test') && !filePath.includes('example')) {
        const consoleLogCount = (fileInfo.content.match(/console\.log/g) || []).length;
        
        if (consoleLogCount > 10) {
          this.addResult({
            category: 'evolution',
            severity: 'low',
            title: 'Excessive Console Logging',
            description: `File has ${consoleLogCount} console.log statements. Consider using proper logging service.`,
            file: filePath,
            autoFixable: false,
            recommendation: 'Replace console.log with winston or other structured logging for production code.',
          });
        }
      }

      // Look for commented out code
      const commentedCodeLines = fileInfo.lines.filter(line => 
        /^[\s]*\/\/\s*\w+\s*[=\(]/.test(line)
      ).length;

      if (commentedCodeLines > 20) {
        this.addResult({
          category: 'evolution',
          severity: 'low',
          title: 'Excessive Commented Code',
          description: `File has ${commentedCodeLines} lines of commented code.`,
          file: filePath,
          autoFixable: false,
          recommendation: 'Remove commented code. Use version control to track history instead.',
        });
      }
    }
  }

  private suggestModernPatterns(): void {
    for (const [filePath, fileInfo] of this.filesCache) {
      // Suggest async/await over callbacks
      if (/\.then\(/.test(fileInfo.content) && !/async/.test(fileInfo.content)) {
        const thenCount = (fileInfo.content.match(/\.then\(/g) || []).length;
        if (thenCount > 5) {
          this.addResult({
            category: 'evolution',
            severity: 'low',
            title: 'Consider Async/Await',
            description: 'File uses promise chains (.then) which could be simplified with async/await.',
            file: filePath,
            autoFixable: false,
            recommendation: 'Refactor promise chains to use async/await for better readability.',
          });
        }
      }

      // Suggest const over let when variable isn't reassigned
      const letDeclarations = fileInfo.content.match(/let\s+(\w+)\s*=/g);
      if (letDeclarations && letDeclarations.length > 0) {
        // This is a simplified check - real implementation would need data flow analysis
        this.addResult({
          category: 'evolution',
          severity: 'info',
          title: 'Review Let Declarations',
          description: 'Consider using const instead of let for variables that are not reassigned.',
          file: filePath,
          autoFixable: false,
          recommendation: 'Use const by default, let only when reassignment is needed. This prevents accidental mutations.',
        });
      }
    }
  }

  // ==================== Auto-Fix Application ====================

  private applyAutoFixes(): void {
    const fixableResults = this.results.filter(r => r.autoFixable && r.fix);

    for (const result of fixableResults) {
      if (!result.fix) continue;

      try {
        const filePath = path.join(CONFIG.rootDir, result.fix.file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // Apply the fix
        content = content.replace(result.fix.oldCode, result.fix.newCode);

        fs.writeFileSync(filePath, content, 'utf-8');
        this.autoFixesApplied++;

        console.log(`   ✓ Auto-fixed: ${result.title} in ${result.fix.file}`);
      } catch (error) {
        console.error(`   ✗ Failed to apply fix for ${result.title}:`, error);
      }
    }
  }

  // ==================== GitHub Issue Creation ====================

  private async autoTicketCriticalIssues(): Promise<void> {
    if (!this.octokit) {
      console.log('⚠️  GitHub token not available, skipping auto-ticketing');
      return;
    }

    const criticalIssues = this.results.filter(r => r.severity === 'critical');
    const highIssues = this.results.filter(r => r.severity === 'high');

    if (criticalIssues.length === 0 && highIssues.length === 0) {
      console.log('✅ No critical issues requiring auto-ticketing');
      return;
    }

    console.log(`\n🎫 Creating GitHub issues for ${criticalIssues.length} critical and ${highIssues.length} high severity issues...`);

    const [owner, repo] = this.getRepoInfo();

    for (const issue of [...criticalIssues, ...highIssues]) {
      try {
        const issueBody = this.formatIssueBody(issue);
        const labels = ['oracle-detected', issue.severity, issue.category];

        await this.octokit.issues.create({
          owner,
          repo,
          title: `[Oracle] ${issue.title}`,
          body: issueBody,
          labels,
        });

        console.log(`   ✓ Created issue: ${issue.title}`);
      } catch (error) {
        console.error(`   ✗ Failed to create issue: ${issue.title}`, error);
      }
    }
  }

  private formatIssueBody(issue: AnalysisResult): string {
    return `## ${issue.title}

**Category:** ${issue.category}
**Severity:** ${issue.severity.toUpperCase()}
**Auto-Fixable:** ${issue.autoFixable ? 'Yes' : 'No'}

### Description
${issue.description}

${issue.file ? `**File:** \`${issue.file}\`${issue.line ? ` (line ${issue.line})` : ''}` : ''}

### Recommendation
${issue.recommendation}

${issue.fix ? `
### Suggested Fix
\`\`\`typescript
// Old code:
${issue.fix.oldCode}

// New code:
${issue.fix.newCode}
\`\`\`
` : ''}

---
*This issue was automatically detected by the GXQ Autonomous Oracle*
*Generated at: ${new Date().toISOString()}*
`;
  }

  private getRepoInfo(): [string, string] {
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
      const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
      if (match) {
        return [match[1], match[2]];
      }
    } catch (error) {
      // Fallback for CI environment
    }
    
    // Default fallback
    return ['SMSDAO', 'reimagined-jupiter'];
  }

  // ==================== Report Generation ====================

  private generateReport(): OracleReport {
    const criticalIssues = this.results.filter(r => r.severity === 'critical').length;
    const highIssues = this.results.filter(r => r.severity === 'high').length;
    const mediumIssues = this.results.filter(r => r.severity === 'medium').length;
    const lowIssues = this.results.filter(r => r.severity === 'low').length;
    const infoIssues = this.results.filter(r => r.severity === 'info').length;

    // Calculate overall score (0-100)
    const score = this.calculateScore(criticalIssues, highIssues, mediumIssues, lowIssues);

    // Determine if safe to redeploy (no critical issues, limited high issues)
    const safelyRedeploy = criticalIssues === 0 && highIssues <= 2;

    // Apply auto-fixes if safe
    if (safelyRedeploy) {
      this.applyAutoFixes();
    }

    const summary = this.generateSummary(score, criticalIssues, highIssues, safelyRedeploy);

    return {
      timestamp: new Date(),
      overallScore: score,
      totalIssues: this.results.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      infoIssues,
      autoFixesApplied: this.autoFixesApplied,
      results: this.results,
      safelyRedeploy,
      summary,
    };
  }

  private calculateScore(critical: number, high: number, medium: number, low: number): number {
    // Start with perfect score
    let score = 100;

    // Deduct points based on severity
    score -= critical * 20; // Critical: -20 points each
    score -= high * 10;     // High: -10 points each
    score -= medium * 5;    // Medium: -5 points each
    score -= low * 2;       // Low: -2 points each

    return Math.max(0, score);
  }

  private generateSummary(score: number, critical: number, high: number, safelyRedeploy: boolean): string {
    let summary = `Overall Health Score: ${score}/100\n\n`;

    if (score >= 90) {
      summary += '🎉 Excellent! The codebase is in great shape.\n';
    } else if (score >= 70) {
      summary += '✅ Good. Some improvements recommended but overall solid.\n';
    } else if (score >= 50) {
      summary += '⚠️  Fair. Several issues need attention.\n';
    } else {
      summary += '❌ Poor. Critical issues require immediate attention.\n';
    }

    if (critical > 0) {
      summary += `\n🚨 ${critical} CRITICAL issue(s) found - immediate action required!\n`;
    }

    if (high > 0) {
      summary += `\n⚠️  ${high} HIGH severity issue(s) found - should be addressed soon.\n`;
    }

    if (safelyRedeploy) {
      summary += '\n✅ Safe to deploy - no blocking issues detected.\n';
    } else {
      summary += '\n⛔ NOT SAFE to deploy - resolve critical/high issues first.\n';
    }

    if (this.autoFixesApplied > 0) {
      summary += `\n🔧 Applied ${this.autoFixesApplied} automatic fix(es).\n`;
    }

    return summary;
  }

  private outputReport(report: OracleReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTONOMOUS ORACLE REPORT');
    console.log('='.repeat(80));
    console.log(report.summary);
    console.log('\n' + '-'.repeat(80));
    console.log('ISSUE BREAKDOWN BY CATEGORY:');
    console.log('-'.repeat(80));

    const categories = [...new Set(this.results.map(r => r.category))];
    for (const category of categories) {
      const count = this.countByCategory(category);
      console.log(`${category.toUpperCase()}: ${count} issue(s)`);
    }

    console.log('\n' + '-'.repeat(80));
    console.log('ISSUE BREAKDOWN BY SEVERITY:');
    console.log('-'.repeat(80));
    console.log(`CRITICAL: ${report.criticalIssues}`);
    console.log(`HIGH: ${report.highIssues}`);
    console.log(`MEDIUM: ${report.mediumIssues}`);
    console.log(`LOW: ${report.lowIssues}`);
    console.log(`INFO: ${report.infoIssues}`);

    console.log('\n' + '='.repeat(80));

    // Write detailed report to file
    const reportPath = path.join(CONFIG.rootDir, 'oracle-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Detailed report saved to: oracle-report.json`);

    // Set exit code based on safety
    if (!report.safelyRedeploy) {
      process.exitCode = 1;
    }
  }

  // ==================== Helper Methods ====================

  private addResult(result: AnalysisResult): void {
    this.results.push(result);
  }

  private countByCategory(category: string): number {
    return this.results.filter(r => r.category === category).length;
  }
}

// ==================== Main Execution ====================

async function main() {
  try {
    const oracle = new AutonomousOracle();
    const report = await oracle.run();

    console.log('\n✅ Oracle analysis complete!');
    
    // Exit with appropriate code
    process.exit(report.safelyRedeploy ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error during oracle execution:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { AutonomousOracle, OracleReport };
