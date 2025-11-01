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
    raydiumV4: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
    raydiumCP: new PublicKey('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'),
    orcaWhirlpool: new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
    orcaV2: new PublicKey('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'),
    meteoraPools: new PublicKey('Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'),
    meteoraDLMM: new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'),
    phoenix: new PublicKey('PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY'),
    lifinity: new PublicKey('EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S'),
    openbook: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
    fluxbeam: new PublicKey('FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X'),
    // Legacy DEXs (kept for compatibility)
    serum: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
    saber: new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ'),
    mercurial: new PublicKey('MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky'),
    aldrin: new PublicKey('AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6'),
    crema: new PublicKey('CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR'),
  },
  jupiter: {
    programId: new PublicKey(process.env.JUPITER_V6_PROGRAM_ID || 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
    apiUrl: 'https://quote-api.jup.ag/v6',
  },
  gxq: {
    tokenMint: new PublicKey(process.env.GXQ_TOKEN_MINT || '11111111111111111111111111111111'),
    ecosystemProgramId: new PublicKey(process.env.GXQ_ECOSYSTEM_PROGRAM_ID || '11111111111111111111111111111111'),
  },
  gxqEcosystem: {
    gxq: new PublicKey('D4JvG7eGEvyGY9jx2SF4HCBztLxdYihRzGqu3jNTpkin'),
    smsDao: new PublicKey('DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW'),
    smsSol: new PublicKey('5kCDPvH6BH6mQxWj3JBeYyEEfvpu84dyMCS18EM6jCNf'),
    smsUsd: new PublicKey('4NhTmQhAPHrrh7c5iFEwXtdnc6SiVmUk9GJM4o9MobTd'),
    tos: new PublicKey('9PLBhxczwH8ExKJjTSg1GmPpP2aUu9nZ85VxQjJZpkin'),
  },
  memePlatforms: {
    pumpFun: new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
    pumpkin: new PublicKey('PUMPKiNu8jSWz6vJ1XyhfzLYkwbdnvSfRGrJt11q8HM'),
    moonshot: new PublicKey('MoonShoT1qfFQMLT4s5Wg8S4D8V1gLw5m8pXy2z6pzP'),
  },
  stakingProviders: {
    marinade: new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD'),
    lido: new PublicKey('CgntPoLka5pD5fesJYhGmUCF8KU1QS1ZmZiuAuMZr2az'),
    jito: new PublicKey('Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb'),
    kamino: new PublicKey('KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD'),
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
  
  // GXQ Ecosystem (5 tokens)
  { symbol: 'GXQ', mint: new PublicKey('D4JvG7eGEvyGY9jx2SF4HCBztLxdYihRzGqu3jNTpkin'), decimals: 9, category: 'gxq' },
  { symbol: 'SMS DAO', mint: new PublicKey('DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW'), decimals: 9, category: 'gxq' },
  { symbol: 'smsSOL', mint: new PublicKey('5kCDPvH6BH6mQxWj3JBeYyEEfvpu84dyMCS18EM6jCNf'), decimals: 9, category: 'gxq' },
  { symbol: 'smsUSD', mint: new PublicKey('4NhTmQhAPHrrh7c5iFEwXtdnc6SiVmUk9GJM4o9MobTd'), decimals: 6, category: 'gxq' },
  { symbol: 'TOS', mint: new PublicKey('9PLBhxczwH8ExKJjTSg1GmPpP2aUu9nZ85VxQjJZpkin'), decimals: 9, category: 'gxq' },
];

export const FLASH_LOAN_FEES = {
  marginfi: 0.09,
  solend: 0.10,
  mango: 0.15,
  kamino: 0.12,
  portFinance: 0.20,
  saveFinance: 0.11,
};
