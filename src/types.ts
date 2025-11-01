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
    raydiumV4: PublicKey;
    raydiumCP: PublicKey;
    orcaWhirlpool: PublicKey;
    orcaV2: PublicKey;
    meteoraPools: PublicKey;
    meteoraDLMM: PublicKey;
    phoenix: PublicKey;
    lifinity: PublicKey;
    openbook: PublicKey;
    fluxbeam: PublicKey;
    serum: PublicKey;
    saber: PublicKey;
    mercurial: PublicKey;
    aldrin: PublicKey;
    crema: PublicKey;
  };
  jupiter: {
    programId: PublicKey;
    apiUrl: string;
  };
  gxq: {
    tokenMint: PublicKey;
    ecosystemProgramId: PublicKey;
  };
  gxqEcosystem: {
    gxq: PublicKey;
    smsDao: PublicKey;
    smsSol: PublicKey;
    smsUsd: PublicKey;
    tos: PublicKey;
  };
  memePlatforms: {
    pumpFun: PublicKey;
    pumpkin: PublicKey;
    moonshot: PublicKey;
  };
  stakingProviders: {
    marinade: PublicKey;
    lido: PublicKey;
    jito: PublicKey;
    kamino: PublicKey;
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
