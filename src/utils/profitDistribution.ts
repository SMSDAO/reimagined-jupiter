import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { config } from "../config/index.js";

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

    const reserveAmount =
      totalProfit * profitDistribution.reserveWalletPercentage;
    const gasSlippageAmount =
      totalProfit * profitDistribution.userWalletPercentage;
    const daoAmount = totalProfit * profitDistribution.daoWalletPercentage;

    // Validate splits add up to 100%
    const sum =
      profitDistribution.reserveWalletPercentage +
      profitDistribution.userWalletPercentage +
      profitDistribution.daoWalletPercentage;

    if (Math.abs(sum - 1.0) > 0.001) {
      console.warn(
        `⚠️  Profit split percentages sum to ${(sum * 100).toFixed(2)}%, not 100%`,
      );
    }

    return {
      reserveAmount,
      gasSlippageAmount,
      daoAmount,
      total: totalProfit,
    };
  }

  /**
   * Resolve SNS name to a PublicKey
   *
   * ⚠️ SNS RESOLUTION IMPLEMENTATION NOTE
   *
   * Current behavior:
   * - If input is a valid PublicKey, returns it directly
   * - If input is an SNS name (like "monads.skr"), throws error with instructions
   *
   * To enable SNS resolution in production:
   * 1. Install: npm install @bonfida/spl-name-service
   * 2. Import required functions from the package
   * 3. Implement the resolution logic in the catch block below
   *
   * Example implementation:
   * ```typescript
   * import { getHashedName, getNameAccountKey, NameRegistryState } from '@bonfida/spl-name-service';
   *
   * const hashedName = await getHashedName(addressOrSNS.replace('.sol', ''));
   * const nameAccountKey = await getNameAccountKey(hashedName);
   * const owner = await NameRegistryState.retrieve(this.connection, nameAccountKey);
   * return owner.registry.owner;
   * ```
   *
   * Workaround: Use a direct PublicKey address in RESERVE_WALLET_ADDRESS env var
   */
  async resolveWalletAddress(addressOrSNS: string): Promise<PublicKey> {
    // Check if it's already a valid public key
    try {
      const publicKey = new PublicKey(addressOrSNS);
      // Additional validation: ensure it's not a default/system address
      if (publicKey.equals(PublicKey.default)) {
        throw new Error(
          "Invalid wallet address: default PublicKey not allowed",
        );
      }
      return publicKey;
    } catch (publicKeyError) {
      // It's likely an SNS name like "monads.skr"
      console.log(`🔍 Attempting to resolve SNS name: ${addressOrSNS}`);

      // SNS RESOLUTION IMPLEMENTATION GUIDE
      // To integrate with Solana Name Service for resolving domains like "monads.skr":
      //
      // Step 1: Install the package
      //   npm install @bonfida/spl-name-service
      //
      // Step 2: Import required functions
      //   import { getHashedName, getNameAccountKey, NameRegistryState } from '@bonfida/spl-name-service';
      //
      // Step 3: Implement resolution (replace throw below with this):
      //   const hashedName = await getHashedName(addressOrSNS.replace('.sol', ''));
      //   const nameAccountKey = await getNameAccountKey(hashedName);
      //   const owner = await NameRegistryState.retrieve(this.connection, nameAccountKey);
      //   return owner.registry.owner;

      throw new Error(
        `❌ SNS resolution not yet implemented for: ${addressOrSNS}\n` +
          `Please either:\n` +
          `  1. Set RESERVE_WALLET_ADDRESS to a valid PublicKey address, OR\n` +
          `  2. Implement SNS resolution (see code comments in profitDistribution.ts for detailed guide)\n` +
          `Original error: ${publicKeyError instanceof Error ? publicKeyError.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Distribute SOL profits to reserve, gas coverage, and DAO wallets
   */
  async distributeSolProfit(
    profitLamports: number,
    fromKeypair: Keypair,
    callingWallet: PublicKey,
  ): Promise<string | null> {
    try {
      const profitSol = profitLamports / LAMPORTS_PER_SOL;
      console.log(`💰 Distributing ${profitSol.toFixed(6)} SOL profit...`);

      const split = this.calculateProfitSplit(profitLamports);

      console.log(
        `   Reserve (70%): ${(split.reserveAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
      );
      console.log(
        `   Gas/Slippage (20%): ${(split.gasSlippageAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
      );
      console.log(
        `   DAO (10%): ${(split.daoAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
      );

      // Resolve reserve wallet address
      const reserveWallet = await this.resolveWalletAddress(
        config.profitDistribution.reserveWalletDomain,
      );
      const daoWallet = config.profitDistribution.daoWalletAddress;

      const transaction = new Transaction();

      // Transfer to reserve wallet
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: reserveWallet,
          lamports: Math.floor(split.reserveAmount),
        }),
      );

      // Transfer to calling wallet (gas/slippage coverage)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: callingWallet,
          lamports: Math.floor(split.gasSlippageAmount),
        }),
      );

      // Transfer to DAO wallet
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: daoWallet,
          lamports: Math.floor(split.daoAmount),
        }),
      );

      // Get recent blockhash and fee
      const { blockhash } =
        await this.connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.publicKey;

      // Sign and send transaction
      console.log("📤 Sending profit distribution transaction...");
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
        {
          commitment: "confirmed",
          preflightCommitment: "confirmed",
        },
      );

      console.log(`✅ Profit distributed! Signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error("❌ Error distributing SOL profit:", error);
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
    callingWallet: PublicKey,
  ): Promise<string | null> {
    try {
      console.log(`💰 Distributing ${profitAmount} token profit...`);
      console.log(`   Token mint: ${tokenMint.toString()}`);

      const split = this.calculateProfitSplit(profitAmount);

      console.log(`   Reserve (70%): ${split.reserveAmount.toFixed(6)}`);
      console.log(
        `   Gas/Slippage (20%): ${split.gasSlippageAmount.toFixed(6)}`,
      );
      console.log(`   DAO (10%): ${split.daoAmount.toFixed(6)}`);

      // Resolve reserve wallet address
      const reserveWallet = await this.resolveWalletAddress(
        config.profitDistribution.reserveWalletDomain,
      );
      const daoWallet = config.profitDistribution.daoWalletAddress;

      // Get associated token accounts
      const fromAta = await getAssociatedTokenAddress(
        tokenMint,
        fromKeypair.publicKey,
      );
      const reserveAta = await getAssociatedTokenAddress(
        tokenMint,
        reserveWallet,
      );
      const callingAta = await getAssociatedTokenAddress(
        tokenMint,
        callingWallet,
      );
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
          TOKEN_PROGRAM_ID,
        ),
      );

      // Transfer to calling wallet (gas/slippage coverage)
      transaction.add(
        createTransferInstruction(
          fromAta,
          callingAta,
          fromKeypair.publicKey,
          Math.floor(split.gasSlippageAmount),
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      // Transfer to DAO wallet
      transaction.add(
        createTransferInstruction(
          fromAta,
          daoAta,
          fromKeypair.publicKey,
          Math.floor(split.daoAmount),
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      // Get recent blockhash
      const { blockhash } =
        await this.connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.publicKey;

      // Sign and send transaction
      console.log("📤 Sending token profit distribution transaction...");
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
        {
          commitment: "confirmed",
          preflightCommitment: "confirmed",
        },
      );

      console.log(`✅ Token profit distributed! Signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error("❌ Error distributing token profit:", error);
      return null;
    }
  }

  /**
   * Log detailed profit distribution breakdown
   */
  logProfitDistribution(profit: number, tokenSymbol: string = "SOL"): void {
    const split = this.calculateProfitSplit(profit);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💰 PROFIT DISTRIBUTION BREAKDOWN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Profit: ${profit.toFixed(6)} ${tokenSymbol}`);
    console.log("");
    console.log("Distribution:");
    console.log(`  🏦 Reserve Wallet (monads.skr):`);
    console.log(`     ${split.reserveAmount.toFixed(6)} ${tokenSymbol} (70%)`);
    console.log("");
    console.log(`  ⛽ Gas/Slippage Coverage (Calling Wallet):`);
    console.log(
      `     ${split.gasSlippageAmount.toFixed(6)} ${tokenSymbol} (20%)`,
    );
    console.log("");
    console.log(`  🏛️  DAO Wallet:`);
    console.log(`     ${split.daoAmount.toFixed(6)} ${tokenSymbol} (10%)`);
    console.log(
      `     ${config.profitDistribution.daoWalletAddress.toBase58().slice(0, 8)}...`,
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
