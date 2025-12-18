/**
 * Simple test of Jupiter Price Service (uses fetch API)
 * Run with: node scripts/simple-test.mjs
 */

// Test by directly calling the Jupiter Price API
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function testDirectAPI() {
  console.log('🚀 Testing Jupiter Price API V6 directly\n');
  
  try {
    // Test 1: Single token
    console.log('=== Test 1: Single Token Price (SOL) ===');
    const response1 = await fetch(`https://price.jup.ag/v6/price?ids=${SOL_MINT}`);
    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    if (data1.data && data1.data[SOL_MINT]) {
      console.log('✅ Single token price fetch successful');
      console.log(`SOL Price: $${data1.data[SOL_MINT].price}\n`);
    } else {
      console.log('❌ Single token price fetch failed\n');
    }
    
    // Test 2: Multiple tokens
    console.log('=== Test 2: Bulk Token Prices ===');
    const response2 = await fetch(`https://price.jup.ag/v6/price?ids=${SOL_MINT},${USDC_MINT}`);
    const data2 = await response2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
    
    if (data2.data) {
      console.log('✅ Bulk price fetch successful');
      Object.entries(data2.data).forEach(([mint, info]) => {
        const symbol = info.mintSymbol || 'UNKNOWN';
        console.log(`${symbol}: $${info.price}`);
      });
    } else {
      console.log('❌ Bulk price fetch failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testDirectAPI();
