/**
 * Manual test script for Jupiter Price Service
 * Run with: npx tsx scripts/test-price-service.ts
 */

import {
  getJupiterPriceService,
  getTokenPrice,
  getBulkTokenPrices,
} from "../lib/jupiter/price-service";

// Common Solana token addresses
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";

async function testSinglePrice() {
  console.log("\n=== Test 1: Single Token Price ===");
  const price = await getTokenPrice(SOL_MINT);
  console.log(`SOL Price: $${price}`);

  if (price && price > 0) {
    console.log("✅ Single price fetch successful");
  } else {
    console.log("❌ Single price fetch failed");
  }
}

async function testBulkPrices() {
  console.log("\n=== Test 2: Bulk Token Prices ===");
  const prices = await getBulkTokenPrices([
    SOL_MINT,
    USDC_MINT,
    BONK_MINT,
    JUP_MINT,
  ]);

  console.log("Bulk prices:");
  Object.entries(prices).forEach(([mint, price]) => {
    const symbol =
      mint === SOL_MINT
        ? "SOL"
        : mint === USDC_MINT
          ? "USDC"
          : mint === BONK_MINT
            ? "BONK"
            : mint === JUP_MINT
              ? "JUP"
              : "UNKNOWN";
    console.log(`  ${symbol}: $${price}`);
  });

  if (Object.keys(prices).length > 0) {
    console.log("✅ Bulk price fetch successful");
  } else {
    console.log("❌ Bulk price fetch failed");
  }
}

async function testCaching() {
  console.log("\n=== Test 3: Caching Mechanism ===");

  const service = getJupiterPriceService();

  // First fetch
  console.log("First fetch (should hit API)...");
  const start1 = Date.now();
  const price1 = await service.getTokenPrice(SOL_MINT);
  const time1 = Date.now() - start1;
  console.log(`Time: ${time1}ms, Price: $${price1?.price}`);

  // Second fetch (should be cached)
  console.log("Second fetch (should use cache)...");
  const start2 = Date.now();
  const price2 = await service.getTokenPrice(SOL_MINT);
  const time2 = Date.now() - start2;
  console.log(`Time: ${time2}ms, Price: $${price2?.price}`);

  if (time2 < time1 && price1?.price === price2?.price) {
    console.log("✅ Caching works correctly");
  } else {
    console.log("⚠️  Caching may not be working optimally");
  }
}

async function testPortfolioValue() {
  console.log("\n=== Test 4: Portfolio Valuation ===");

  const service = getJupiterPriceService();

  const portfolio = await service.calculatePortfolioValue([
    { mint: SOL_MINT, amount: 10 },
    { mint: USDC_MINT, amount: 100 },
    { mint: BONK_MINT, amount: 1000000 },
  ]);

  console.log("Portfolio value:");
  console.log(`  Total: $${portfolio.totalValue.toFixed(2)}`);
  portfolio.tokens.forEach((token) => {
    const symbol =
      token.mint === SOL_MINT
        ? "SOL"
        : token.mint === USDC_MINT
          ? "USDC"
          : token.mint === BONK_MINT
            ? "BONK"
            : "UNKNOWN";
    console.log(
      `  ${symbol}: ${token.amount} @ $${token.price.toFixed(6)} = $${token.value.toFixed(2)}`,
    );
  });

  if (portfolio.totalValue > 0) {
    console.log("✅ Portfolio valuation successful");
  } else {
    console.log("❌ Portfolio valuation failed");
  }
}

async function testSubscription() {
  console.log("\n=== Test 5: Real-time Price Subscription ===");

  const service = getJupiterPriceService();

  let updateCount = 0;
  const unsubscribe = service.subscribeToPrice(SOL_MINT, (price) => {
    updateCount++;
    console.log(`Update ${updateCount}: SOL price = $${price.price}`);
  });

  // Wait for a few updates
  console.log("Waiting for price updates (15 seconds)...");
  await new Promise((resolve) => setTimeout(resolve, 15000));

  unsubscribe();

  if (updateCount >= 2) {
    console.log("✅ Price subscription successful");
  } else {
    console.log("⚠️  Expected more price updates");
  }
}

async function runTests() {
  console.log("🚀 Starting Jupiter Price Service Tests\n");

  try {
    await testSinglePrice();
    await testBulkPrices();
    await testCaching();
    await testPortfolioValue();
    await testSubscription();

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("\n❌ Test error:", error);
  }

  // Cleanup
  const service = getJupiterPriceService();
  service.closeAllConnections();
}

runTests();
