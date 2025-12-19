/**
 * Shared Solana type definitions
 */

/**
 * Represents a prioritization fee returned by Connection.getRecentPrioritizationFees()
 */
export interface PrioritizationFee {
  /** The slot in which the fee was observed */
  slot: number;
  /** The prioritization fee in microlamports */
  prioritizationFee: number;
}
