/**
 * Shared Solana type definitions
 */

/**
 * Represents a prioritization fee returned by Connection.getRecentPrioritizationFees()
 */
export interface PrioritizationFee {
  slot: number;
  prioritizationFee: number;
}
