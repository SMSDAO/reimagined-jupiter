import { PublicKey } from '@solana/web3.js';
import { Config, TokenConfig } from '../types.js';
import dotenv from 'dotenv';

dotenv.config();

export const config: Config = {
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
  },
  quicknode: {
    rpcUrl: process.env.QUICKNODE_RPC_URL || '',
    apiKey: process.env.QUICKNODE_API_KEY || '',
    functionsUrl: process.env.QUICKNODE_FUNCTIONS_URL || '',
    kvUrl: process.env.QUICKNODE_KV_URL || '',
    streamsUrl: process.env.QUICKNODE_STREAMS_URL || '',
  },
  flashLoanProviders: {
    marginfi: new PublicKey(process.env.MARGINFI_PROGRAM_ID || 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'),
    solend: new PublicKey(process.env.SOLEND_PROGRAM_ID || 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
    mango: new PublicKey(process.env.MANGO_PROGRAM_ID || 'mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68'),
    kamino: new PublicKey(process.env.KAMINO_PROGRAM_ID || 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD'),
    portFinance: new PublicKey(process.env.PORT_FINANCE_PROGRAM_ID || 'Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR'),
    saveFinance: new PublicKey(process.env.SAVE_FINANCE_PROGRAM_ID || 'SAVEg4Je7HZcJk2X1FTr1vfLhQqrpXPTvAWmYnYY1Wy'),
  },
  dexPrograms: {
    raydium: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
    orca: new PublicKey('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'),
    serum: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
    saber: new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ'),
    mercurial: new PublicKey('MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky'),
    lifinity: new PublicKey('EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S'),
    aldrin: new PublicKey('AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6'),
    crema: new PublicKey('CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR'),
    // Additional mainnet-grade DEXs
    meteora: new PublicKey('Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'),
    phoenix: new PublicKey('PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY'),
    openbook: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
    fluxbeam: new PublicKey('FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X'),
    pumpfun: new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
  },
  jupiter: {
    programId: new PublicKey(process.env.JUPITER_V6_PROGRAM_ID || 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
    apiUrl: 'https://quote-api.jup.ag/v6',
  },
  gxq: {
    tokenMint: new PublicKey(process.env.GXQ_TOKEN_MINT || '11111111111111111111111111111111'),
    ecosystemProgramId: new PublicKey(process.env.GXQ_ECOSYSTEM_PROGRAM_ID || '11111111111111111111111111111111'),
  },
  arbitrage: {
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.005'),
    maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.01'),
    gasBuffer: parseFloat(process.env.GAS_BUFFER || '1.5'),
  },
  devFee: {
    enabled: process.env.DEV_FEE_ENABLED !== 'false',
    percentage: parseFloat(process.env.DEV_FEE_PERCENTAGE || '0.10'), // 10% default
    wallet: new PublicKey(process.env.DEV_FEE_WALLET || '11111111111111111111111111111111'), // Placeholder, use real wallet in production
  },
  profitDistribution: {
    reserveWallet: process.env.RESERVE_WALLET_ADDRESS || 'monads.skr', // SNS name
    reservePercentage: parseFloat(process.env.RESERVE_PERCENTAGE || '0.70'), // 70% to reserve
    gasSlippagePercentage: parseFloat(process.env.GAS_SLIPPAGE_PERCENTAGE || '0.20'), // 20% for gas/slippage
    daoWallet: new PublicKey(process.env.DAO_WALLET_ADDRESS || 'DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW'),
    daoPercentage: parseFloat(process.env.DAO_PERCENTAGE || '0.10'), // 10% to DAO
  },
};

// 30+ Token configurations
export const SUPPORTED_TOKENS: TokenConfig[] = [
  // Native
  { symbol: 'SOL', mint: new PublicKey('So11111111111111111111111111111111111111112'), decimals: 9, category: 'native' },
  { symbol: 'wSOL', mint: new PublicKey('So11111111111111111111111111111111111111112'), decimals: 9, category: 'native' },
  
  // Stablecoins
  { symbol: 'USDC', mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), decimals: 6, category: 'stable' },
  { symbol: 'USDT', mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), decimals: 6, category: 'stable' },
  { symbol: 'USDH', mint: new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'), decimals: 6, category: 'stable' },
  { symbol: 'UXD', mint: new PublicKey('7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT'), decimals: 6, category: 'stable' },
  { symbol: 'USDR', mint: new PublicKey('USDrbBQwQbQ2oWHUPfA8QBHcyVxKUq1xHyXsSLKdUq2'), decimals: 6, category: 'stable' },
  
  // Liquid Staking Tokens (LSTs)
  { symbol: 'mSOL', mint: new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'), decimals: 9, category: 'lst' },
  { symbol: 'stSOL', mint: new PublicKey('7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj'), decimals: 9, category: 'lst' },
  { symbol: 'jitoSOL', mint: new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'), decimals: 9, category: 'lst' },
  { symbol: 'bSOL', mint: new PublicKey('bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1'), decimals: 9, category: 'lst' },
  { symbol: 'scnSOL', mint: new PublicKey('5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm'), decimals: 9, category: 'lst' },
  
  // Memecoins
  { symbol: 'BONK', mint: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'), decimals: 5, category: 'memecoin' },
  { symbol: 'WIF', mint: new PublicKey('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'), decimals: 6, category: 'memecoin' },
  { symbol: 'SAMO', mint: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'), decimals: 9, category: 'memecoin' },
  { symbol: 'MYRO', mint: new PublicKey('HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4'), decimals: 9, category: 'memecoin' },
  { symbol: 'POPCAT', mint: new PublicKey('7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'), decimals: 9, category: 'memecoin' },
  
  // DeFi Tokens
  { symbol: 'RAY', mint: new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'), decimals: 6, category: 'native' },
  { symbol: 'SRM', mint: new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'), decimals: 6, category: 'native' },
  { symbol: 'ORCA', mint: new PublicKey('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'), decimals: 6, category: 'native' },
  { symbol: 'MNGO', mint: new PublicKey('MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'), decimals: 6, category: 'native' },
  { symbol: 'STEP', mint: new PublicKey('StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT'), decimals: 9, category: 'native' },
  
  // Additional tokens
  { symbol: 'JUP', mint: new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'), decimals: 6, category: 'native' },
  { symbol: 'RENDER', mint: new PublicKey('rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof'), decimals: 8, category: 'native' },
  { symbol: 'JTO', mint: new PublicKey('jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL'), decimals: 9, category: 'native' },
  { symbol: 'WEN', mint: new PublicKey('WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk'), decimals: 5, category: 'memecoin' },
  { symbol: 'PYTH', mint: new PublicKey('HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'), decimals: 6, category: 'native' },
  
  // GXQ Ecosystem
  { symbol: 'GXQ', mint: config.gxq.tokenMint, decimals: 9, category: 'gxq' },
  { symbol: 'sGXQ', mint: new PublicKey('11111111111111111111111111111111'), decimals: 9, category: 'gxq' },
  { symbol: 'xGXQ', mint: new PublicKey('11111111111111111111111111111111'), decimals: 9, category: 'gxq' },
];

export const FLASH_LOAN_FEES = {
  marginfi: 0.09,
  solend: 0.10,
  mango: 0.15,
  kamino: 0.12,
  portFinance: 0.20,
  saveFinance: 0.11,
};
