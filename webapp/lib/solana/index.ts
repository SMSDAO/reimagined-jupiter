/**
 * Resilient Solana Connection Library
 *
 * Export all public APIs for easy importing
 */

// Connection utilities
export {
  ResilientSolanaConnection,
  createResilientConnection,
  type RpcEndpoint,
  type ResilientConnectionConfig,
} from "./connection";

// Transaction builder
export {
  TransactionBuilder,
  type PriorityFeeConfig,
  type TransactionExecutionResult,
  type TransactionUrgency,
} from "./transaction-builder";

// Examples (for reference/documentation)
export * as examples from "./examples";
