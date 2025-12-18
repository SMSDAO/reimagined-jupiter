import { PublicKey } from '@solana/web3.js';

/**
 * Common Solana token mint addresses
 */
export const NATIVE_MINTS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  WSOL: new PublicKey('So11111111111111111111111111111111111111112'),
} as const;

export const STABLECOIN_MINTS = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  USDH: new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'),
  UXD: new PublicKey('7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT'),
  USDR: new PublicKey('USDrbBQwQbQ2oWHUPfA8QBHcyVxKUq1xHyXsSLKdUq2'),
} as const;

export const MEMECOIN_MINTS = {
  BONK: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
  WIF: new PublicKey('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'),
  SAMO: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
  MYRO: new PublicKey('HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4'),
  POPCAT: new PublicKey('7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'),
  WEN: new PublicKey('WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk'),
} as const;

export const DEFI_TOKEN_MINTS = {
  JUP: new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),
  RAY: new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'),
  ORCA: new PublicKey('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'),
  MNGO: new PublicKey('MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'),
  SRM: new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'),
  PYTH: new PublicKey('HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'),
  RENDER: new PublicKey('rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof'),
  JTO: new PublicKey('jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL'),
  STEP: new PublicKey('StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT'),
} as const;

export const LST_MINTS = {
  MSOL: new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'),
  STSOL: new PublicKey('7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj'),
  JITOSOL: new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'),
  BSOL: new PublicKey('bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1'),
  SCNSOL: new PublicKey('5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm'),
} as const;

/**
 * All token mints in a single object
 */
export const ALL_MINTS = {
  ...NATIVE_MINTS,
  ...STABLECOIN_MINTS,
  ...MEMECOIN_MINTS,
  ...DEFI_TOKEN_MINTS,
  ...LST_MINTS,
} as const;

/**
 * Map mint addresses to symbols for easy lookup
 */
export const MINT_TO_SYMBOL: Record<string, string> = {
  [NATIVE_MINTS.SOL.toString()]: 'SOL',
  [STABLECOIN_MINTS.USDC.toString()]: 'USDC',
  [STABLECOIN_MINTS.USDT.toString()]: 'USDT',
  [STABLECOIN_MINTS.USDH.toString()]: 'USDH',
  [STABLECOIN_MINTS.UXD.toString()]: 'UXD',
  [STABLECOIN_MINTS.USDR.toString()]: 'USDR',
  [MEMECOIN_MINTS.BONK.toString()]: 'BONK',
  [MEMECOIN_MINTS.WIF.toString()]: 'WIF',
  [MEMECOIN_MINTS.SAMO.toString()]: 'SAMO',
  [MEMECOIN_MINTS.MYRO.toString()]: 'MYRO',
  [MEMECOIN_MINTS.POPCAT.toString()]: 'POPCAT',
  [MEMECOIN_MINTS.WEN.toString()]: 'WEN',
  [DEFI_TOKEN_MINTS.JUP.toString()]: 'JUP',
  [DEFI_TOKEN_MINTS.RAY.toString()]: 'RAY',
  [DEFI_TOKEN_MINTS.ORCA.toString()]: 'ORCA',
  [DEFI_TOKEN_MINTS.MNGO.toString()]: 'MNGO',
  [DEFI_TOKEN_MINTS.SRM.toString()]: 'SRM',
  [DEFI_TOKEN_MINTS.PYTH.toString()]: 'PYTH',
  [DEFI_TOKEN_MINTS.RENDER.toString()]: 'RENDER',
  [DEFI_TOKEN_MINTS.JTO.toString()]: 'JTO',
  [DEFI_TOKEN_MINTS.STEP.toString()]: 'STEP',
  [LST_MINTS.MSOL.toString()]: 'mSOL',
  [LST_MINTS.STSOL.toString()]: 'stSOL',
  [LST_MINTS.JITOSOL.toString()]: 'jitoSOL',
  [LST_MINTS.BSOL.toString()]: 'bSOL',
  [LST_MINTS.SCNSOL.toString()]: 'scnSOL',
};

/**
 * Default token for liquidity checks
 */
export const DEFAULT_LIQUIDITY_CHECK_MINT = NATIVE_MINTS.SOL;

/**
 * Time constants
 */
export const TIME_CONSTANTS = {
  PRICE_FRESHNESS_SECONDS: 60,
  HEALTH_CHECK_INTERVAL_MS: 30000,
  EXECUTION_CYCLE_INTERVAL_MS: 5000,
  ERROR_RETRY_INTERVAL_MS: 10000,
} as const;

/**
 * Fee constants
 */
export const FEE_CONSTANTS = {
  DEFAULT_PRIORITY_FEE_MICROLAMPORTS: 10000,
  MAX_PRIORITY_FEE_MICROLAMPORTS: 500000,
  DEFAULT_COMPUTE_UNITS: 400000,
  MAX_CONFIDENCE_PERCENT: 1.0,
} as const;

/**
 * Slippage constants
 */
export const SLIPPAGE_CONSTANTS = {
  DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
  MIN_SLIPPAGE_BPS: 10, // 0.1%
  MAX_SLIPPAGE_BPS: 500, // 5%
} as const;
