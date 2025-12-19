#!/usr/bin/env ts-node-esm
/**
 * Pre-deployment validation script
 * Checks environment configuration and system health before deployment
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

const results: CheckResult[] = [];

/**
 * Add check result
 */
function addResult(
  name: string,
  passed: boolean,
  message: string,
  severity: 'error' | 'warning' | 'info' = 'error'
): void {
  results.push({ name, passed, message, severity });
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables(): void {
  const required = [
    'SOLANA_RPC_URL',
    'WALLET_PRIVATE_KEY',
    'ADMIN_PASSWORD',
    'JWT_SECRET',
  ];
  
  const optional = [
    'CRON_SECRET',
    'DISCORD_WEBHOOK_URL',
    'TELEGRAM_BOT_TOKEN',
    'QUICKNODE_RPC_URL',
  ];
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      addResult(
        `Environment: ${envVar}`,
        false,
        `Required environment variable ${envVar} is not set`,
        'error'
      );
    } else {
      addResult(
        `Environment: ${envVar}`,
        true,
        `${envVar} is set`,
        'info'
      );
    }
  }
  
  for (const envVar of optional) {
    if (!process.env[envVar]) {
      addResult(
        `Environment: ${envVar}`,
        true,
        `Optional variable ${envVar} is not set`,
        'warning'
      );
    }
  }
}

/**
 * Check if .env file is in .gitignore
 */
function checkGitignore(): void {
  try {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    
    if (gitignoreContent.includes('.env')) {
      addResult(
        'Security: .gitignore',
        true,
        '.env is properly ignored in .gitignore',
        'info'
      );
    } else {
      addResult(
        'Security: .gitignore',
        false,
        '.env is not in .gitignore - security risk!',
        'error'
      );
    }
  } catch (error) {
    addResult(
      'Security: .gitignore',
      false,
      '.gitignore file not found',
      'error'
    );
  }
}

/**
 * Check if .env file exists in repository
 */
function checkEnvFileNotCommitted(): void {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    addResult(
      'Security: .env file',
      false,
      '.env file exists in repository - should not be committed!',
      'error'
    );
  } else {
    addResult(
      'Security: .env file',
      true,
      '.env file not in repository (good)',
      'info'
    );
  }
}

/**
 * Check if required files exist
 */
function checkRequiredFiles(): void {
  const required = [
    'package.json',
    'tsconfig.json',
    'vercel.json',
    '.env.example',
  ];
  
  for (const file of required) {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      addResult(
        `File: ${file}`,
        true,
        `${file} exists`,
        'info'
      );
    } else {
      addResult(
        `File: ${file}`,
        false,
        `Required file ${file} not found`,
        'error'
      );
    }
  }
}

/**
 * Check password strength
 */
function checkPasswordStrength(): void {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return; // Already checked in environment variables
  }
  
  const weakPasswords = ['admin', 'password', '12345678', 'changeme', 'change_me_in_production'];
  
  if (weakPasswords.includes(adminPassword.toLowerCase())) {
    addResult(
      'Security: Admin Password',
      false,
      'Admin password is too weak - using common password',
      'error'
    );
  } else if (adminPassword.length < 12) {
    addResult(
      'Security: Admin Password',
      true,
      'Admin password is short - consider using 12+ characters',
      'warning'
    );
  } else {
    addResult(
      'Security: Admin Password',
      true,
      'Admin password meets strength requirements',
      'info'
    );
  }
}

/**
 * Check JWT secret strength
 */
function checkJwtSecret(): void {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    return; // Already checked in environment variables
  }
  
  if (jwtSecret.length < 32) {
    addResult(
      'Security: JWT Secret',
      false,
      'JWT secret should be at least 32 characters',
      'error'
    );
  } else {
    addResult(
      'Security: JWT Secret',
      true,
      'JWT secret meets length requirements',
      'info'
    );
  }
}

/**
 * Check trading parameters
 */
function checkTradingParameters(): void {
  const minProfit = parseFloat(process.env.MINIMUM_PROFIT_SOL || '0.01');
  const maxSlippage = parseFloat(process.env.MAX_SLIPPAGE || '0.01');
  
  if (minProfit < 0.001) {
    addResult(
      'Config: Minimum Profit',
      true,
      'Very low minimum profit threshold - may execute many unprofitable trades',
      'warning'
    );
  } else if (minProfit > 0.1) {
    addResult(
      'Config: Minimum Profit',
      true,
      'High minimum profit threshold - may miss opportunities',
      'warning'
    );
  } else {
    addResult(
      'Config: Minimum Profit',
      true,
      `Minimum profit: ${minProfit} SOL`,
      'info'
    );
  }
  
  if (maxSlippage > 0.05) {
    addResult(
      'Config: Max Slippage',
      true,
      'High max slippage - increased risk of losses',
      'warning'
    );
  } else {
    addResult(
      'Config: Max Slippage',
      true,
      `Max slippage: ${(maxSlippage * 100).toFixed(1)}%`,
      'info'
    );
  }
}

/**
 * Print results
 */
function printResults(): void {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PRE-DEPLOYMENT VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');
  
  const errors = results.filter(r => !r.passed && r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const passed = results.filter(r => r.passed && r.severity === 'info');
  
  // Print errors
  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log('');
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log('');
  }
  
  // Print passed checks
  if (passed.length > 0) {
    console.log('✅ PASSED:');
    passed.forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log('='.repeat(60) + '\n');
  
  if (errors.length > 0) {
    console.log('❌ DEPLOYMENT BLOCKED: Fix errors before deploying\n');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('⚠️  DEPLOYMENT ALLOWED: Review warnings\n');
    process.exit(0);
  } else {
    console.log('✅ DEPLOYMENT APPROVED: All checks passed\n');
    process.exit(0);
  }
}

/**
 * Run all checks
 */
function runChecks(): void {
  console.log('Running pre-deployment checks...\n');
  
  checkEnvironmentVariables();
  checkGitignore();
  checkEnvFileNotCommitted();
  checkRequiredFiles();
  checkPasswordStrength();
  checkJwtSecret();
  checkTradingParameters();
  
  printResults();
}

// Run checks
runChecks();
