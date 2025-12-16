import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { config } from '../config/index.js';

export interface ProfitSplit {
  reserveAmount: number;
  gasSlippageAmount: number;
  daoAmount: number;
  total: number;
}

export class ProfitDistributionManager {
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Calculate profit distribution based on configured percentages
   * 70% to reserve wallet, 20% for gas/slippage, 10% to DAO
   */
  calculateProfitSplit(totalProfit: number): ProfitSplit {
    const { profitDistribution } = config;
    
    const reserveAmount = totalProfit * profitDistribution.reservePercentage;
    const gasSlippageAmount = totalProfit * profitDistribution.gasSlippagePercentage;
    const daoAmount = totalProfit * profitDistribution.daoPercentage;
    
    // Validate splits add up to 100%
    const sum = profitDistribution.reservePercentage + 
                profitDistribution.gasSlippagePercentage + 
                profitDistribution.daoPercentage;
    
    if (Math.abs(sum - 1.0) > 0.001) {
      console.warn(`⚠️  Profit split percentages sum to ${(sum * 100).toFixed(2)}%, not 100%`);
    }
    
    return {
      reserveAmount,
      gasSlippageAmount,
      daoAmount,
      total: totalProfit
    };
  }
  
  /**
   * Resolve SNS name to a PublicKey
   * For now, this is a placeholder. In production, integrate with Solana Name Service
   */
  async resolveWalletAddress(addressOrSNS: string): Promise<PublicKey> {
    // Check if it's already a valid public key
    try {
      return new PublicKey(addressOrSNS);
    } catch {
      // It's likely an SNS name like "monads.skr"
      console.log(`🔍 Resolving SNS name: ${addressOrSNS}`);
      
      // TODO: Integrate with Solana Name Service to resolve
      // For now, throw an error to indicate SNS resolution is needed
      throw new Error(`SNS resolution not yet implemented for: ${addressOrSNS}. Please provide a valid PublicKey address.`);
    }
  }
  
  /**
   * Distribute SOL profits to reserve, gas coverage, and DAO wallets
   */
  async distributeSolProfit(
    profitLamports: number,
    fromKeypair: Keypair,
    callingWallet: PublicKey
  ): Promise<string | null> {
    try {
      const profitSol = profitLamports / LAMPORTS_PER_SOL;
      console.log(`💰 Distributing ${profitSol.toFixed(6)} SOL profit...`);
      
      const split = this.calculateProfitSplit(profitLamports);
      
      console.log(`   Reserve (70%): ${(split.reserveAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      console.log(`   Gas/Slippage (20%): ${(split.gasSlippageAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      console.log(`   DAO (10%): ${(split.daoAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      
      // Resolve reserve wallet address
      const reserveWallet = await this.resolveWalletAddress(config.profitDistribution.reserveWallet);
      const daoWallet = config.profitDistribution.daoWallet;
      
      const transaction = new Transaction();
      
      // Transfer to reserve wallet
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: reserveWallet,
          lamports: Math.floor(split.reserveAmount),
        })
      );
      
      // Transfer to calling wallet (gas/slippage coverage)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: callingWallet,
          lamports: Math.floor(split.gasSlippageAmount),
        })
      );
      
      // Transfer to DAO wallet
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: daoWallet,
          lamports: Math.floor(split.daoAmount),
        })
      );
      
      // Get recent blockhash and fee
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.publicKey;
      
      // Sign and send transaction
      console.log('📤 Sending profit distribution transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
      
      console.log(`✅ Profit distributed! Signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error('❌ Error distributing SOL profit:', error);
      return null;
    }
  }
  
  /**
   * Distribute SPL token profits to reserve, gas coverage, and DAO wallets
   */
  async distributeTokenProfit(
    tokenMint: PublicKey,
    profitAmount: number,
    fromKeypair: Keypair,
    callingWallet: PublicKey
  ): Promise<string | null> {
    try {
      console.log(`💰 Distributing ${profitAmount} token profit...`);
      console.log(`   Token mint: ${tokenMint.toString()}`);
      
      const split = this.calculateProfitSplit(profitAmount);
      
      console.log(`   Reserve (70%): ${split.reserveAmount.toFixed(6)}`);
      console.log(`   Gas/Slippage (20%): ${split.gasSlippageAmount.toFixed(6)}`);
      console.log(`   DAO (10%): ${split.daoAmount.toFixed(6)}`);
      
      // Resolve reserve wallet address
      const reserveWallet = await this.resolveWalletAddress(config.profitDistribution.reserveWallet);
      const daoWallet = config.profitDistribution.daoWallet;
      
      // Get associated token accounts
      const fromAta = await getAssociatedTokenAddress(tokenMint, fromKeypair.publicKey);
      const reserveAta = await getAssociatedTokenAddress(tokenMint, reserveWallet);
      const callingAta = await getAssociatedTokenAddress(tokenMint, callingWallet);
      const daoAta = await getAssociatedTokenAddress(tokenMint, daoWallet);
      
      const transaction = new Transaction();
      
      // Transfer to reserve wallet
      transaction.add(
        createTransferInstruction(
          fromAta,
          reserveAta,
          fromKeypair.publicKey,
          Math.floor(split.reserveAmount),
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      // Transfer to calling wallet (gas/slippage coverage)
      transaction.add(
        createTransferInstruction(
          fromAta,
          callingAta,
          fromKeypair.publicKey,
          Math.floor(split.gasSlippageAmount),
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      // Transfer to DAO wallet
      transaction.add(
        createTransferInstruction(
          fromAta,
          daoAta,
          fromKeypair.publicKey,
          Math.floor(split.daoAmount),
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.publicKey;
      
      // Sign and send transaction
      console.log('📤 Sending token profit distribution transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
      
      console.log(`✅ Token profit distributed! Signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error('❌ Error distributing token profit:', error);
      return null;
    }
  }
  
  /**
   * Log detailed profit distribution breakdown
   */
  logProfitDistribution(profit: number, tokenSymbol: string = 'SOL'): void {
    const split = this.calculateProfitSplit(profit);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 PROFIT DISTRIBUTION BREAKDOWN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Profit: ${profit.toFixed(6)} ${tokenSymbol}`);
    console.log('');
    console.log('Distribution:');
    console.log(`  🏦 Reserve Wallet (monads.skr):`);
    console.log(`     ${split.reserveAmount.toFixed(6)} ${tokenSymbol} (70%)`);
    console.log('');
    console.log(`  ⛽ Gas/Slippage Coverage (Calling Wallet):`);
    console.log(`     ${split.gasSlippageAmount.toFixed(6)} ${tokenSymbol} (20%)`);
    console.log('');
    console.log(`  🏛️  DAO Wallet:`);
    console.log(`     ${split.daoAmount.toFixed(6)} ${tokenSymbol} (10%)`);
    console.log(`     ${config.profitDistribution.daoWallet.toBase58().slice(0, 8)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}
