import { PublicKey } from "@solana/web3.js";

/**
 * Flashloan Provider Interface
 * Defines the structure for each flashloan provider
 */
export interface FlashloanProvider {
  name: string;
  programId: PublicKey;
  maxLoan: number; // Maximum loan amount in tokens
  fee: number; // Fee in basis points (e.g., 9 = 0.09%)
}

/**
 * FLASHLOAN_PROVIDERS
 * List of all available flashloan providers with their details
 * Providers are listed in order of preference (lowest fee first)
 */
export const FLASHLOAN_PROVIDERS: FlashloanProvider[] = [
  {
    name: "Marginfi",
    programId: new PublicKey("MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA"),
    maxLoan: 1000000,
    fee: 9, // 0.09%
  },
  {
    name: "Solend",
    programId: new PublicKey("So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo"),
    maxLoan: 800000,
    fee: 9, // 0.09%
  },
  {
    name: "Kamino",
    programId: new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"),
    maxLoan: 900000,
    fee: 10, // 0.10%
  },
  {
    name: "Mango Markets",
    programId: new PublicKey("mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68"),
    maxLoan: 1200000,
    fee: 15, // 0.15%
  },
  {
    name: "Port Finance",
    programId: new PublicKey("Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR"),
    maxLoan: 700000,
    fee: 20, // 0.20%
  },
];

/**
 * Get provider by name
 * @param name Provider name
 * @returns FlashloanProvider or undefined if not found
 */
export function getProviderByName(name: string): FlashloanProvider | undefined {
  return FLASHLOAN_PROVIDERS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
}

/**
 * Get all providers sorted by fee (lowest first)
 * @returns Array of providers sorted by fee
 */
export function getProvidersSortedByFee(): FlashloanProvider[] {
  return [...FLASHLOAN_PROVIDERS].sort((a, b) => a.fee - b.fee);
}

/**
 * Get providers that can handle a specific loan amount
 * @param amount Loan amount required
 * @returns Array of providers that can handle the loan amount
 */
export function getProvidersForAmount(amount: number): FlashloanProvider[] {
  return FLASHLOAN_PROVIDERS.filter((p) => p.maxLoan >= amount);
}

/**
 * Select best provider for a given loan amount
 * Returns the provider with lowest fee that can handle the amount
 * @param amount Loan amount required
 * @returns Best provider or undefined if none can handle the amount
 */
export function selectBestProvider(
  amount: number,
): FlashloanProvider | undefined {
  const viableProviders = getProvidersForAmount(amount);
  if (viableProviders.length === 0) {
    return undefined;
  }

  // Return provider with lowest fee
  return viableProviders.sort((a, b) => a.fee - b.fee)[0];
}
