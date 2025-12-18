/**
 * Flashloan Aggregator Examples
 * 
 * This file contains example code showing how to use the flashloan aggregator
 * in different scenarios. These examples are for documentation purposes.
 */

import { PublicKey } from '@solana/web3.js';
import { FlashloanExecutor, ArbitrageOpportunity } from './executor';
import { 
  FLASHLOAN_PROVIDERS,
  selectBestProvider,
  getProviderByName,
  getProvidersForAmount,
} from './providers';

/**
 * Example 1: List all available providers
 */
export function exampleListProviders() {
  console.log('Available Flashloan Providers:');
  console.log('================================');
  
  FLASHLOAN_PROVIDERS.forEach(provider => {
    console.log(`${provider.name}:`);
    console.log(`  Program ID: ${provider.programId.toString()}`);
    console.log(`  Max Loan: ${provider.maxLoan.toLocaleString()}`);
    console.log(`  Fee: ${provider.fee} bps (${provider.fee / 100}%)`);
    console.log('');
  });
}

/**
 * Example 2: Select best provider for a loan amount
 */
export function exampleSelectProvider() {
  const loanAmount = 500000;
  
  console.log(`Finding best provider for loan amount: ${loanAmount}`);
  
  const bestProvider = selectBestProvider(loanAmount);
  
  if (bestProvider) {
    console.log(`Best provider: ${bestProvider.name}`);
    console.log(`  Fee: ${bestProvider.fee} bps`);
    console.log(`  Max Loan: ${bestProvider.maxLoan}`);
  } else {
    console.log('No provider available for this amount');
  }
}

/**
 * Example 3: Get providers that can handle a specific amount
 */
export function exampleGetViableProviders() {
  const loanAmount = 850000;
  
  console.log(`Providers that can handle ${loanAmount}:`);
  
  const providers = getProvidersForAmount(loanAmount);
  
  providers.forEach(provider => {
    console.log(`  - ${provider.name} (fee: ${provider.fee} bps)`);
  });
}

/**
 * Example 4: Get a specific provider by name
 */
export function exampleGetProviderByName() {
  const providerName = 'Marginfi';
  
  const provider = getProviderByName(providerName);
  
  if (provider) {
    console.log(`Found ${providerName}:`);
    console.log(`  Program ID: ${provider.programId.toString()}`);
    console.log(`  Max Loan: ${provider.maxLoan}`);
    console.log(`  Fee: ${provider.fee} bps`);
  } else {
    console.log(`Provider ${providerName} not found`);
  }
}

/**
 * Example 5: Calculate profitability
 */
export function exampleCalculateProfitability() {
  const loanAmount = 1000000;
  const outputAmount = 1020000;
  const feeBps = 9; // 0.09%
  
  // Calculate fee
  const feeAmount = Math.floor((loanAmount * feeBps) / 10000);
  console.log(`Fee amount: ${feeAmount}`);
  
  // Calculate repayment
  const repayAmount = loanAmount + feeAmount;
  console.log(`Repayment amount: ${repayAmount}`);
  
  // Calculate profit
  const profit = outputAmount - repayAmount;
  console.log(`Profit: ${profit}`);
  
  // Check minimum threshold
  const minProfit = Math.floor(loanAmount * 0.001);
  const isProfitable = profit >= minProfit;
  console.log(`Is profitable: ${isProfitable}`);
}

/**
 * Example 6: Execute flashloan arbitrage (conceptual)
 * 
 * Note: This is a conceptual example. In production, you would:
 * 1. Get a real Connection instance
 * 2. Have the user's wallet sign the transaction
 * 3. Handle the result appropriately
 */
export async function exampleExecuteArbitrage(
  // These would be real instances in production
  connection: any,
  userPublicKey: PublicKey
) {
  // Create executor
  const executor = new FlashloanExecutor(connection);
  
  // Define opportunity
  const opportunity: ArbitrageOpportunity = {
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: 1000000000, // 1 SOL (in lamports)
    estimatedProfit: 50000,
    slippageBps: 50, // 0.5%
  };
  
  console.log('Executing flashloan arbitrage...');
  console.log('Opportunity:', opportunity);
  
  // Execute
  const result = await executor.executeArbitrageWithFlashloan(
    opportunity,
    userPublicKey
  );
  
  if (result.success) {
    console.log('✅ Success!');
    console.log('Signature:', result.signature);
    console.log('Profit:', result.profit);
    console.log('Provider:', result.provider);
  } else {
    console.log('❌ Failed:', result.error);
  }
  
  return result;
}

/**
 * Example 7: Execute with specific provider
 */
export async function exampleExecuteWithSpecificProvider(
  connection: any,
  userPublicKey: PublicKey
) {
  const executor = new FlashloanExecutor(connection);
  
  const opportunity: ArbitrageOpportunity = {
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: 500000000,
    estimatedProfit: 25000,
  };
  
  // Execute with specific provider
  const result = await executor.executeArbitrageWithFlashloan(
    opportunity,
    userPublicKey,
    'Solend' // Specify provider name
  );
  
  console.log('Result:', result);
  return result;
}

/**
 * Example 8: Handle different error scenarios
 */
export async function exampleErrorHandling(
  connection: any,
  userPublicKey: PublicKey
) {
  const executor = new FlashloanExecutor(connection);
  
  // Invalid opportunity (missing fields)
  const invalidOpportunity1: any = {
    inputMint: 'So11111111111111111111111111111111111111112',
    // outputMint is missing
    amount: 1000000,
  };
  
  let result = await executor.executeArbitrageWithFlashloan(
    invalidOpportunity1,
    userPublicKey
  );
  console.log('Invalid opportunity result:', result.error);
  
  // Amount too large for any provider
  const invalidOpportunity2: ArbitrageOpportunity = {
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: 99999999999, // Way too large
    estimatedProfit: 0,
  };
  
  result = await executor.executeArbitrageWithFlashloan(
    invalidOpportunity2,
    userPublicKey
  );
  console.log('Amount too large result:', result.error);
  
  // Non-existent provider
  result = await executor.executeArbitrageWithFlashloan(
    {
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 1000000,
      estimatedProfit: 5000,
    },
    userPublicKey,
    'NonExistentProvider'
  );
  console.log('Non-existent provider result:', result.error);
}

/**
 * Example 9: Fetch providers via API
 */
export async function exampleFetchProvidersAPI() {
  try {
    const response = await fetch('/api/arbitrage/execute-flashloan');
    const data = await response.json();
    
    if (data.success) {
      console.log('Available providers from API:');
      data.providers.forEach((provider: any) => {
        console.log(`  ${provider.name}: ${provider.feePercentage} fee`);
      });
    }
  } catch (error) {
    console.error('API error:', error);
  }
}

/**
 * Example 10: Execute via API
 */
export async function exampleExecuteViaAPI() {
  try {
    const response = await fetch('/api/arbitrage/execute-flashloan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opportunity: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          amount: 1000000000,
          estimatedProfit: 50000,
          slippageBps: 50,
        },
        walletAddress: 'YOUR_WALLET_ADDRESS',
        provider: 'Marginfi', // Optional
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Arbitrage executed successfully');
      console.log('Signature:', data.signature);
      console.log('Profit:', data.profit);
      console.log('Provider:', data.provider);
    } else {
      console.log('❌ Execution failed:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('API error:', error);
    return { success: false, error: String(error) };
  }
}

// Export all examples for easy access
export const examples = {
  listProviders: exampleListProviders,
  selectProvider: exampleSelectProvider,
  getViableProviders: exampleGetViableProviders,
  getProviderByName: exampleGetProviderByName,
  calculateProfitability: exampleCalculateProfitability,
  executeArbitrage: exampleExecuteArbitrage,
  executeWithSpecificProvider: exampleExecuteWithSpecificProvider,
  errorHandling: exampleErrorHandling,
  fetchProvidersAPI: exampleFetchProvidersAPI,
  executeViaAPI: exampleExecuteViaAPI,
};
