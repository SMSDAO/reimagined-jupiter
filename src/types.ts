import { PublicKey } from '@solana/web3.js';

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
  flashLoanProviders: {
    marginfi: PublicKey;
    solend: PublicKey;
    mango: PublicKey;
    kamino: PublicKey;
    portFinance: PublicKey;
    saveFinance: PublicKey;
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
  devFee: {
    enabled: boolean;
    percentage: number;
    wallet: PublicKey;
  };
  profitDistribution: {
    enabled: boolean;
    reserveWallet: string; // SNS address or PublicKey - 70%
    reservePercentage: number;
    gasWallet: string; // User wallet for gas coverage - 20%
    gasSlippagePercentage: number;
    daoWallet: PublicKey; // DAO community wallet - 10%
    daoPercentage: number;
  };
  encryption: {
    enabled: boolean;
    masterKey: string;
  };
}

export interface TokenConfig {
  symbol: string;
  mint: PublicKey;
  decimals: number;
  category: 'stable' | 'native' | 'memecoin' | 'lst' | 'gxq';
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
  type: 'flash-loan' | 'triangular';
  provider?: string;
  path: TokenConfig[];
  estimatedProfit: number;
  requiredCapital: number;
  confidence: number;
}

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  strategy: 'flash-loan' | 'triangular' | 'hybrid';
  tokens: string[];
  dexes: string[];
  minProfit: number;
  maxSlippage: number;
  enabled: boolean;
}
