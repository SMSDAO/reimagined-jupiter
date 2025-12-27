import { PublicKey } from "@solana/web3.js";

export interface Config {
  solana: {
    rpcUrl: string;
    walletPrivateKey: string;
  };
  quicknode: {
    rpcUrl: string;
    apiKey: string;
    functionsUrl: string;
    kvUrl: string;
    streamsUrl: string;
  };
  neynar: {
    apiKey: string;
  };
  gemini: {
    apiKey: string;
    enabled: boolean;
  };
  flashLoanProviders: {
    marginfi: PublicKey;
    solend: PublicKey;
    mango: PublicKey;
    kamino: PublicKey;
    portFinance: PublicKey;
    saveFinance: PublicKey;
    tulip: PublicKey;
    drift: PublicKey;
    jet: PublicKey;
  };
  dexPrograms: {
    raydium: PublicKey;
    orca: PublicKey;
    serum: PublicKey;
    saber: PublicKey;
    mercurial: PublicKey;
    lifinity: PublicKey;
    aldrin: PublicKey;
    crema: PublicKey;
    meteora: PublicKey;
    phoenix: PublicKey;
    openbook: PublicKey;
    fluxbeam: PublicKey;
    pumpfun: PublicKey;
  };
  jupiter: {
    programId: PublicKey;
    apiUrl: string;
    priceApiUrl: string;
  };
  gxq: {
    tokenMint: PublicKey;
    ecosystemProgramId: PublicKey;
  };
  arbitrage: {
    minProfitThreshold: number;
    maxSlippage: number;
    gasBuffer: number;
  };
  scanner: {
    pollingIntervalMs: number;
    enableLiveUpdates: boolean;
    enableNotifications: boolean;
    minConfidence: number;
  };
  devFee: {
    enabled: boolean;
    percentage: number;
    wallet: PublicKey;
  };
  profitDistribution: {
    enabled: boolean;
    reserveWalletDomain: string;
    reserveWalletPercentage: number;
    userWalletPercentage: number;
    daoWalletPercentage: number;
    daoWalletAddress: PublicKey;
  };
}

export interface TokenConfig {
  symbol: string;
  mint: PublicKey;
  decimals: number;
  category: "stable" | "native" | "memecoin" | "lst" | "gxq";
}

export interface FlashLoanProvider {
  name: string;
  programId: PublicKey;
  fee: number; // Percentage (0.09 - 0.20)
  maxLoanAmount: number;
  availableLiquidity: number;
}

export interface DEXInfo {
  name: string;
  programId: PublicKey;
  supportedTokens: PublicKey[];
}

export interface ArbitrageOpportunity {
  type: "flash-loan" | "triangular";
  provider?: string;
  path: TokenConfig[];
  estimatedProfit: number;
  requiredCapital: number;
  confidence: number;
  timestamp?: number | Date;
  priceImpact?: number;
  estimatedSlippage?: number;
  estimatedGasFee?: number;
  routeDetails?: {
    dexes: string[];
    priceImpactPct: string;
  };
}

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  strategy: "flash-loan" | "triangular" | "hybrid";
  tokens: string[];
  dexes: string[];
  minProfit: number;
  maxSlippage: number;
  enabled: boolean;
}
