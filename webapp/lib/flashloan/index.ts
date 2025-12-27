/**
 * Flashloan Aggregator Module
 *
 * This module provides functionality for executing flashloan-based arbitrage
 * across multiple lending protocols on Solana.
 *
 * Features:
 * - Multi-provider support (Marginfi, Solend, Kamino, Mango, Port Finance)
 * - Automatic provider selection based on fee and capacity
 * - Integration with Jupiter aggregator for optimal swap routing
 * - Atomic transaction execution (borrow -> swap -> repay)
 * - Dynamic priority fee calculation
 * - Profitability validation
 *
 * Usage:
 * ```typescript
 * import { FlashloanExecutor, FLASHLOAN_PROVIDERS } from '@/lib/flashloan';
 *
 * const executor = new FlashloanExecutor(connection);
 * const result = await executor.executeArbitrageWithFlashloan(opportunity, userPublicKey);
 * ```
 *
 * For more examples, see examples.ts or the README.md file.
 */

export {
  FlashloanExecutor,
  type ArbitrageOpportunity,
  type FlashloanExecutionResult,
} from "./executor";

export {
  FLASHLOAN_PROVIDERS,
  type FlashloanProvider,
  getProviderByName,
  getProvidersSortedByFee,
  getProvidersForAmount,
  selectBestProvider,
} from "./providers";

export { examples } from "./examples";
