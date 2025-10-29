import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import { config } from '../config/index.js';

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
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
    try {
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
      return response.data;
    } catch (error) {
      console.error('Jupiter quote error:', error);
      return null;
    }
  }
  
  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true
  ): Promise<VersionedTransaction | null> {
    try {
      const response = await axios.post(`${this.apiUrl}/swap`, {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: wrapUnwrapSOL,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      });
      
      const swapTransactionBuf = Buffer.from(response.data.swapTransaction, 'base64');
      return VersionedTransaction.deserialize(swapTransactionBuf);
    } catch (error) {
      console.error('Jupiter swap transaction error:', error);
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
    try {
      const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);
      if (!quote) {
        console.error('Failed to get quote');
        return null;
      }
      
      const swapTransaction = await this.getSwapTransaction(
        quote,
        userPublicKey.toString(),
        true
      );
      
      if (!swapTransaction) {
        console.error('Failed to get swap transaction');
        return null;
      }
      
      // Transaction would be signed and sent here
      // const signature = await this.connection.sendTransaction(swapTransaction);
      // return signature;
      
      return 'mock_signature';
    } catch (error) {
      console.error('Jupiter execute swap error:', error);
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
  
  async getTokenList(): Promise<any[]> {
    try {
      const response = await axios.get('https://token.jup.ag/all');
      return response.data;
    } catch (error) {
      console.error('Jupiter token list error:', error);
      return [];
    }
  }
  
  async getPriceInUSD(tokenMint: string): Promise<number | null> {
    try {
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`);
      return response.data.data[tokenMint]?.price || null;
    } catch (error) {
      console.error('Jupiter price error:', error);
      return null;
    }
  }
}
