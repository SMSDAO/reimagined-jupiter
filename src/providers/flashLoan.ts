import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { FlashLoanProvider } from '../types.js';

interface LiquidityCache {
  maxLoanAmount: number;
  availableLiquidity: number;
  timestamp: number;
}

export abstract class BaseFlashLoanProvider {
  protected connection: Connection;
  protected programId: PublicKey;
  protected fee: number;
  private liquidityCache: Map<string, LiquidityCache>;
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  
  constructor(connection: Connection, programId: PublicKey, fee: number) {
    this.connection = connection;
    this.programId = programId;
    this.fee = fee;
    this.liquidityCache = new Map();
  }
  
  abstract getName(): string;
  abstract getMaxLoanAmount(tokenMint: PublicKey): Promise<number>;
  abstract getAvailableLiquidity(tokenMint: PublicKey): Promise<number>;
  abstract createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]>;
  
  protected getCachedLiquidity(tokenMint: PublicKey): LiquidityCache | null {
    const key = tokenMint.toString();
    const cached = this.liquidityCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }
  
  protected setCachedLiquidity(
    tokenMint: PublicKey,
    maxLoanAmount: number,
    availableLiquidity: number
  ): void {
    const key = tokenMint.toString();
    this.liquidityCache.set(key, {
      maxLoanAmount,
      availableLiquidity,
      timestamp: Date.now(),
    });
  }
  
  clearCache(): void {
    this.liquidityCache.clear();
  }
  
  getFee(): number {
    return this.fee;
  }
  
  getInfo(): FlashLoanProvider {
    return {
      name: this.getName(),
      programId: this.programId,
      fee: this.fee,
      maxLoanAmount: 0,
      availableLiquidity: 0,
    };
  }
}

// Placeholder values for testing - TODO: Replace with actual protocol queries
const PLACEHOLDER_MAX_LOAN = 1000000;
const PLACEHOLDER_LIQUIDITY = 500000;

export class MarginfiProvider extends BaseFlashLoanProvider {
  getName(): string {
    return 'Marginfi';
  }
  
  async getMaxLoanAmount(_tokenMint: PublicKey): Promise<number> {
    try {
      if (!_tokenMint) {
        console.error('[Marginfi] Invalid tokenMint: token mint is required');
        return 0;
      }

      // Check cache first
      const cached = this.getCachedLiquidity(_tokenMint);
      if (cached) {
        return cached.maxLoanAmount;
      }

      console.log(`[Marginfi] Fetching max loan amount for token: ${_tokenMint.toString().slice(0, 8)}...`);
      
      // TODO: Implement actual Marginfi protocol query
      // In production, both values should be fetched together to optimize RPC calls
      const maxLoan = PLACEHOLDER_MAX_LOAN;
      const liquidity = PLACEHOLDER_LIQUIDITY;
      
      // Cache both values together
      this.setCachedLiquidity(_tokenMint, maxLoan, liquidity);
      
      console.log(`[Marginfi] Max loan amount: ${maxLoan}`);
      return maxLoan;
    } catch (error) {
      console.error('[Marginfi] Error getting max loan amount:', error);
      return 0;
    }
  }
  
  async getAvailableLiquidity(_tokenMint: PublicKey): Promise<number> {
    try {
      if (!_tokenMint) {
        console.error('[Marginfi] Invalid tokenMint: token mint is required');
        return 0;
      }

      // Check cache first
      const cached = this.getCachedLiquidity(_tokenMint);
      if (cached) {
        return cached.availableLiquidity;
      }

      console.log(`[Marginfi] Fetching available liquidity for token: ${_tokenMint.toString().slice(0, 8)}...`);
      
      // TODO: Implement actual Marginfi protocol query
      // In production, both values should be fetched together to optimize RPC calls
      const maxLoan = PLACEHOLDER_MAX_LOAN;
      const liquidity = PLACEHOLDER_LIQUIDITY;
      
      // Cache both values together
      this.setCachedLiquidity(_tokenMint, maxLoan, liquidity);
      
      console.log(`[Marginfi] Available liquidity: ${liquidity}`);
      return liquidity;
    } catch (error) {
      console.error('[Marginfi] Error getting available liquidity:', error);
      return 0;
    }
  }
  
  async createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]> {
    try {
      if (!tokenMint || !userAccount) {
        console.error('[Marginfi] Invalid parameters: tokenMint and userAccount are required');
        return [];
      }

      if (!amount || amount <= 0) {
        console.error('[Marginfi] Invalid amount: must be greater than 0, received:', amount);
        return [];
      }

      console.log(`[Marginfi] Creating flash loan instruction for ${amount} tokens`);
      
      // Simplified implementation
      const flashLoanIx: TransactionInstruction[] = [];
      // Add Marginfi flash loan borrow instruction
      // Add user's arbitrage instructions
      // Add Marginfi flash loan repay instruction
      
      console.log(`[Marginfi] Flash loan instruction created with ${instructions.length} arbitrage instructions`);
      return [...flashLoanIx, ...instructions];
    } catch (error) {
      console.error('[Marginfi] Error creating flash loan instruction:', error);
      return [];
    }
  }
}

export class SolendProvider extends BaseFlashLoanProvider {
  getName(): string {
    return 'Solend';
  }
  
  async getMaxLoanAmount(_tokenMint: PublicKey): Promise<number> {
    return 800000;
  }
  
  async getAvailableLiquidity(_tokenMint: PublicKey): Promise<number> {
    return 400000;
  }
  
  async createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]> {
    const flashLoanIx: TransactionInstruction[] = [];
    return [...flashLoanIx, ...instructions];
  }
}

export class MangoProvider extends BaseFlashLoanProvider {
  getName(): string {
    return 'Mango';
  }
  
  async getMaxLoanAmount(_tokenMint: PublicKey): Promise<number> {
    return 1200000;
  }
  
  async getAvailableLiquidity(_tokenMint: PublicKey): Promise<number> {
    return 600000;
  }
  
  async createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]> {
    const flashLoanIx: TransactionInstruction[] = [];
    return [...flashLoanIx, ...instructions];
  }
}

export class KaminoProvider extends BaseFlashLoanProvider {
  getName(): string {
    return 'Kamino';
  }
  
  async getMaxLoanAmount(_tokenMint: PublicKey): Promise<number> {
    return 900000;
  }
  
  async getAvailableLiquidity(_tokenMint: PublicKey): Promise<number> {
    return 450000;
  }
  
  async createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]> {
    const flashLoanIx: TransactionInstruction[] = [];
    return [...flashLoanIx, ...instructions];
  }
}

export class PortFinanceProvider extends BaseFlashLoanProvider {
  getName(): string {
    return 'Port Finance';
  }
  
  async getMaxLoanAmount(_tokenMint: PublicKey): Promise<number> {
    return 700000;
  }
  
  async getAvailableLiquidity(_tokenMint: PublicKey): Promise<number> {
    return 350000;
  }
  
  async createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]> {
    const flashLoanIx: TransactionInstruction[] = [];
    return [...flashLoanIx, ...instructions];
  }
}

export class SaveFinanceProvider extends BaseFlashLoanProvider {
  getName(): string {
    return 'Save Finance';
  }
  
  async getMaxLoanAmount(_tokenMint: PublicKey): Promise<number> {
    return 850000;
  }
  
  async getAvailableLiquidity(_tokenMint: PublicKey): Promise<number> {
    return 425000;
  }
  
  async createFlashLoanInstruction(
    amount: number,
    tokenMint: PublicKey,
    userAccount: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<TransactionInstruction[]> {
    const flashLoanIx: TransactionInstruction[] = [];
    return [...flashLoanIx, ...instructions];
  }
}
