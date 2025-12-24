#!/usr/bin/env ts-node-esm
/**
 * Example: Mainnet Arbitrage Engine Usage
 * 
 * This script demonstrates how to use the comprehensive arbitrage engine
 * to scan for and execute profitable arbitrage opportunities on Solana mainnet.
 * 
 * Prerequisites:
 * - Set SOLANA_RPC_URL in .env
 * - Set WALLET_PRIVATE_KEY in .env
 * - Configure Jito, Jupiter, and profit distribution settings
 * 
 * Usage:
 *   npm run example:arbitrage
 *   or
 *   ts-node-esm examples/arbitrage-engine-demo.ts
 */

import { Connection, Keypair } from '@solana/web3.js';
import { MainnetArbitrageOrchestrator } from '../src/services/arbitrageOrchestrator.js';
import { config } from '../src/config/index.js';
import bs58 from 'bs58';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   GXQ STUDIO - Mainnet Arbitrage Engine Demo');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Initialize connection
  console.log('🔌 Connecting to Solana RPC...');
  const connection = new Connection(config.solana.rpcUrl, 'confirmed');
  
  try {
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana ${version['solana-core']}\n`);
  } catch (error) {
    console.error('❌ Failed to connect to Solana RPC');
    console.error('   Please check your SOLANA_RPC_URL in .env');
    process.exit(1);
  }

  // Load wallet
  console.log('🔑 Loading wallet...');
  if (!config.solana.walletPrivateKey) {
    console.error('❌ WALLET_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  let userKeypair: Keypair;
  try {
    const secretKey = bs58.decode(config.solana.walletPrivateKey);
    userKeypair = Keypair.fromSecretKey(secretKey);
    console.log(`✅ Wallet loaded: ${userKeypair.publicKey.toString()}\n`);
  } catch (error) {
    console.error('❌ Invalid WALLET_PRIVATE_KEY format');
    console.error('   Expected: Base58-encoded private key');
    process.exit(1);
  }

  // Check wallet balance
  console.log('💰 Checking wallet balance...');
  const balance = await connection.getBalance(userKeypair.publicKey);
  const balanceSol = balance / 1e9;
  console.log(`   Balance: ${balanceSol.toFixed(6)} SOL`);
  
  if (balanceSol < 0.01) {
    console.warn('⚠️  Warning: Low balance. Consider adding more SOL for gas fees.\n');
  } else {
    console.log('✅ Sufficient balance for arbitrage execution\n');
  }

  // Initialize orchestrator
  console.log('🎯 Initializing Arbitrage Orchestrator...');
  const orchestrator = new MainnetArbitrageOrchestrator(connection, {
    minProfitThreshold: 0.001 * 1e9, // 0.001 SOL minimum profit
    maxSlippage: 0.02, // 2% max slippage
    priorityFeeUrgency: 'high', // High priority for faster inclusion
    useJito: true, // Enable MEV protection
    requireGXQWallet: false, // Don't require GXQ wallet for demo
    routeLegs: { min: 3, max: 5 }, // 3-5 leg routes
  });

  console.log('✅ Orchestrator initialized\n');
  console.log('   Configuration:');
  console.log(`   - Min Profit: 0.001 SOL`);
  console.log(`   - Max Slippage: 2%`);
  console.log(`   - Priority Fee: high`);
  console.log(`   - Jito MEV Protection: enabled`);
  console.log(`   - Route Legs: 3-5`);
  console.log(`   - Flash Loan Providers: ${orchestrator.getProviders().join(', ')}\n`);

  // Define tokens to scan
  const tokens = [
    'So11111111111111111111111111111111111111112', // SOL (Native)
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY (Raydium)
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP (Jupiter)
  ];

  console.log('🔍 Scanning for arbitrage opportunities...');
  console.log(`   Tokens: SOL, USDC, USDT, RAY, JUP`);
  console.log(`   Loan Amount: 0.1 SOL\n`);

  // Scan for opportunities
  const opportunities = await orchestrator.scanForOpportunities(
    tokens,
    100_000_000 // 0.1 SOL
  );

  if (opportunities.length === 0) {
    console.log('❌ No profitable opportunities found at this time.');
    console.log('\n💡 Tips:');
    console.log('   - Try different token combinations');
    console.log('   - Adjust min profit threshold');
    console.log('   - Increase max slippage');
    console.log('   - Wait for more volatile market conditions');
    process.exit(0);
  }

  // Display opportunities
  console.log(`✅ Found ${opportunities.length} profitable opportunities!\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  opportunities.slice(0, 5).forEach((opp, idx) => {
    console.log(`\n📊 Opportunity #${idx + 1}`);
    console.log(`   Provider: ${opp.provider.getName()}`);
    console.log(`   Route: ${opp.route.legs} legs`);
    console.log(`   Loan Amount: ${opp.loanAmount / 1e9} SOL`);
    console.log(`   Fee: ${opp.fee / 1e9} SOL (${opp.provider.getFee()}%)`);
    console.log(`   Estimated Profit: ${opp.estimatedProfit / 1e9} SOL`);
    console.log(`   Profit %: ${opp.estimatedProfitPercentage.toFixed(2)}%`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Ask user if they want to execute
  console.log('\n⚠️  EXECUTION DISABLED IN DEMO MODE');
  console.log('   To execute arbitrage, uncomment the execution code below.\n');

  // UNCOMMENT TO ENABLE EXECUTION:
  /*
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\n🚀 Execute best opportunity? (yes/no): ', async (answer: string) => {
    if (answer.toLowerCase() === 'yes') {
      console.log('\n⚡ Executing arbitrage...');
      
      const result = await orchestrator.executeOpportunity(
        opportunities[0],
        userKeypair
      );

      if (result.success) {
        console.log('✅ Arbitrage executed successfully!');
        console.log(`   Signature: ${result.signature}`);
        
        if (result.usedJito) {
          console.log(`   Bundle ID: ${result.bundleId}`);
        }
        
        if (result.profitDistributed) {
          console.log(`   Profit distributed: ${result.profitDistributionSignature}`);
        }
      } else {
        console.error('❌ Arbitrage execution failed:');
        console.error(`   ${result.error}`);
      }
    } else {
      console.log('❌ Execution cancelled by user.');
    }
    
    readline.close();
  });
  */

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Demo completed successfully!');
  console.log('\n📚 Next steps:');
  console.log('   1. Review ARBITRAGE_ENGINE.md for full documentation');
  console.log('   2. Configure environment variables in .env');
  console.log('   3. Test on devnet/testnet before mainnet');
  console.log('   4. Uncomment execution code to enable real trading');
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});
