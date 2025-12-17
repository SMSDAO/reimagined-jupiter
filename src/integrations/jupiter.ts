import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import { config } from '../config/index.js';

export interface JupiterRoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: JupiterRoutePlan[];
}

export class JupiterV6Integration {
  private connection: Connection;
  private apiUrl: string;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.apiUrl = config.jupiter.apiUrl;
  }
  
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<JupiterQuote | null> {
    // Null safety checks
    if (!inputMint || inputMint.trim() === '' || !outputMint || outputMint.trim() === '') {
      console.error('[Jupiter] Invalid parameters: inputMint and outputMint are required and must not be empty');
      return null;
    }
    
    if (!amount || amount <= 0) {
      console.error('[Jupiter] Invalid amount: must be greater than 0, received:', amount);
      return null;
    }

    try {
      console.log(`[Jupiter] Fetching quote: ${inputMint.slice(0, 8)}... -> ${outputMint.slice(0, 8)}..., amount: ${amount}`);
      
      const response = await axios.get(`${this.apiUrl}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
        },
      });
      
      if (!response.data) {
        console.error('[Jupiter] Empty response from quote API');
        return null;
      }
      
      console.log(`[Jupiter] Quote received: out amount ${response.data.outAmount}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Jupiter] Quote API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          data: error.response?.data,
        });
      } else {
        console.error('[Jupiter] Unexpected quote error:', error);
      }
      return null;
    }
  }
  
  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true
  ): Promise<VersionedTransaction | null> {
    // Null safety checks
    if (!quote) {
      console.error('[Jupiter] Invalid quote: quote object is required');
      return null;
    }
    
    if (!userPublicKey) {
      console.error('[Jupiter] Invalid userPublicKey: public key is required');
      return null;
    }

    try {
      console.log(`[Jupiter] Creating swap transaction for user: ${userPublicKey.slice(0, 8)}...`);
      
      const response = await axios.post(`${this.apiUrl}/swap`, {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: wrapUnwrapSOL,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      });
      
      if (!response.data || !response.data.swapTransaction) {
        console.error('[Jupiter] Invalid swap response: missing swapTransaction');
        return null;
      }
      
      const swapTransactionBuf = Buffer.from(response.data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      console.log('[Jupiter] Swap transaction created successfully');
      return transaction;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Jupiter] Swap API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          data: error.response?.data,
        });
      } else {
        console.error('[Jupiter] Unexpected swap error:', error);
      }
      return null;
    }
  }
  
  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    userPublicKey: PublicKey,
    slippageBps: number = 50
  ): Promise<string | null> {
    // Null safety checks
    if (!userPublicKey) {
      console.error('[Jupiter] Invalid userPublicKey: PublicKey is required');
      return null;
    }

    try {
      console.log(`[Jupiter] Executing swap for ${amount} of ${inputMint.slice(0, 8)}...`);
      
      const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);
      if (!quote) {
        console.error('[Jupiter] Failed to get quote, cannot execute swap');
        return null;
      }
      
      const swapTransaction = await this.getSwapTransaction(
        quote,
        userPublicKey.toString(),
        true
      );
      
      if (!swapTransaction) {
        console.error('[Jupiter] Failed to get swap transaction, cannot execute swap');
        return null;
      }
      
      console.log('[Jupiter] Swap transaction ready for signing and execution');
      // Transaction would be signed and sent here
      // const signature = await this.connection.sendTransaction(swapTransaction);
      // return signature;
      
      return 'mock_signature';
    } catch (error) {
      console.error('[Jupiter] Execute swap error:', error);
      return null;
    }
  }
  
  async findTriangularArbitrage(
    tokenA: string,
    tokenB: string,
    tokenC: string,
    amount: number
  ): Promise<{ profitable: boolean; profit: number; path: string[] } | null> {
    try {
      // A -> B
      const quoteAB = await this.getQuote(tokenA, tokenB, amount);
      if (!quoteAB) return null;
      
      const amountB = parseInt(quoteAB.outAmount);
      
      // B -> C
      const quoteBC = await this.getQuote(tokenB, tokenC, amountB);
      if (!quoteBC) return null;
      
      const amountC = parseInt(quoteBC.outAmount);
      
      // C -> A
      const quoteCA = await this.getQuote(tokenC, tokenA, amountC);
      if (!quoteCA) return null;
      
      const finalAmountA = parseInt(quoteCA.outAmount);
      const profit = finalAmountA - amount;
      const profitable = profit > 0;
      
      return {
        profitable,
        profit,
        path: [tokenA, tokenB, tokenC, tokenA],
      };
    } catch (error) {
      console.error('Triangular arbitrage search error:', error);
      return null;
    }
  }
  
  async getTokenList(): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    try {
      const response = await axios.get('https://token.jup.ag/all');
      return response.data;
    } catch (error) {
      console.error('Jupiter token list error:', error);
      return [];
    }
  }
  
  async getPriceInUSD(tokenMint: string): Promise<number | null> {
    // Null safety checks
    if (!tokenMint || tokenMint.trim() === '') {
      console.error('[Jupiter] Invalid tokenMint: token mint address is required and must not be empty');
      return null;
    }

    try {
      console.log(`[Jupiter] Fetching USD price for token: ${tokenMint.slice(0, 8)}...`);
      
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`);
      
      if (!response.data || !response.data.data) {
        console.error('[Jupiter] Invalid price response: missing data');
        return null;
      }
      
      const price = response.data.data[tokenMint]?.price;
      
      if (price === undefined || price === null) {
        console.warn(`[Jupiter] No price available for token: ${tokenMint.slice(0, 8)}...`);
        return null;
      }
      
      console.log(`[Jupiter] Price fetched: $${price}`);
      return price;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Jupiter] Price API error:', {
          status: error.response?.status,
          message: error.message,
        });
      } else {
        console.error('[Jupiter] Unexpected price fetch error:', error);
      }
      return null;
    }
  }
}
