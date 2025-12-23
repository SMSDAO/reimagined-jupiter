#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * 
 * Validates all critical environment variables and production configurations
 * before allowing the system to start.
 * 
 * Usage: npm run validate-production
 */

import { validateProductionEnvironment, enforceProductionSafety } from '../src/utils/productionGuardrails.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan('\n🔒 GXQ Studio - Production Environment Validation\n'));
console.log('='.repeat(80));

try {
  // Enforce production safety (will exit if errors found)
  enforceProductionSafety();
  
  console.log('\n' + '='.repeat(80));
  console.log(chalk.bold.green('\n✅ Production environment validation completed successfully!\n'));
  console.log(chalk.gray('The system is ready to start with production configuration.\n'));
  
  process.exit(0);
} catch (error) {
  console.error(chalk.bold.red('\n❌ Production validation failed!\n'));
  console.error(error instanceof Error ? error.message : 'Unknown error');
  console.log('\n' + '='.repeat(80));
  console.log(chalk.yellow('\nPlease fix the above issues before deploying to production.\n'));
  process.exit(1);
}
