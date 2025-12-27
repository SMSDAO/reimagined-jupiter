/**
 * Mainnet Token Launcher
 * Production-grade SPL token creation with mint/freeze authority management
 * and graduation milestone tracking
 *
 * Features:
 * - SPL token creation
 * - Mint authority management
 * - Freeze authority management
 * - Metadata integration
 * - Graduation milestones
 * - Authority revocation tracking
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMintLen,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  image?: string;
  externalUrl?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

export interface TokenLaunchConfig {
  metadata: TokenMetadata;
  initialSupply: number;
  maxSupply?: number;
  mintAuthority?: "CREATOR" | "REVOKED" | "CUSTOM";
  freezeAuthority?: "CREATOR" | "REVOKED" | "CUSTOM";
  customMintAuthority?: string;
  customFreezeAuthority?: string;
  enableMetadata?: boolean;
}

export interface LaunchedToken {
  id: string;
  userId: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  initialSupply: number;
  maxSupply?: number;
  mintAuthority?: string;
  freezeAuthority?: string;
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  tokenUri?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  graduatedAt?: Date;
}

export interface TokenMilestone {
  id: string;
  tokenId: string;
  milestoneType:
    | "MARKET_CAP"
    | "VOLUME"
    | "HOLDERS"
    | "LIQUIDITY"
    | "GRADUATION"
    | "LISTING";
  milestoneValue: number;
  description?: string;
  isAchieved: boolean;
  achievedAt?: Date;
  actionTaken?: string;
  actionSignature?: string;
  createdAt: Date;
}

/**
 * Token Launcher Service
 */
export class TokenLauncherService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Create new SPL token
   */
  async createToken(
    creator: Keypair,
    config: TokenLaunchConfig,
  ): Promise<{
    token: LaunchedToken;
    mintKeypair: Keypair;
    signature: string;
  }> {
    const { metadata, initialSupply } = config;

    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mintPublicKey = mintKeypair.publicKey;

    // Determine authorities
    let mintAuthority: PublicKey;
    let freezeAuthority: PublicKey | null;

    if (config.mintAuthority === "REVOKED") {
      mintAuthority = PublicKey.default; // Will be revoked immediately
    } else if (
      config.mintAuthority === "CUSTOM" &&
      config.customMintAuthority
    ) {
      mintAuthority = new PublicKey(config.customMintAuthority);
    } else {
      mintAuthority = creator.publicKey;
    }

    if (config.freezeAuthority === "REVOKED") {
      freezeAuthority = null;
    } else if (
      config.freezeAuthority === "CUSTOM" &&
      config.customFreezeAuthority
    ) {
      freezeAuthority = new PublicKey(config.customFreezeAuthority);
    } else {
      freezeAuthority = creator.publicKey;
    }

    // Get rent for mint account
    const mintLen = getMintLen([]);
    const rentExemption =
      await this.connection.getMinimumBalanceForRentExemption(mintLen);

    // Create transaction
    const transaction = new Transaction();

    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creator.publicKey,
        newAccountPubkey: mintPublicKey,
        space: mintLen,
        lamports: rentExemption,
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    // Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintPublicKey,
        metadata.decimals,
        mintAuthority,
        freezeAuthority,
        TOKEN_PROGRAM_ID,
      ),
    );

    // Mint initial supply if specified
    if (initialSupply > 0) {
      // Get associated token account for creator
      const creatorTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        creator.publicKey,
      );

      // Create ATA
      transaction.add(
        createAssociatedTokenAccountInstruction(
          creator.publicKey,
          creatorTokenAccount,
          creator.publicKey,
          mintPublicKey,
        ),
      );

      // Mint tokens
      transaction.add(
        createMintToInstruction(
          mintPublicKey,
          creatorTokenAccount,
          mintAuthority,
          initialSupply * Math.pow(10, metadata.decimals),
        ),
      );
    }

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [creator, mintKeypair],
      { commitment: "confirmed" },
    );

    console.log(`✅ Token created: ${mintPublicKey.toBase58()}`);
    console.log(`   Signature: ${signature}`);

    // Create token record
    const token: LaunchedToken = {
      id: crypto.randomUUID(),
      userId: creator.publicKey.toBase58(), // In production, use actual user ID
      tokenMint: mintPublicKey.toBase58(),
      tokenName: metadata.name,
      tokenSymbol: metadata.symbol,
      tokenDecimals: metadata.decimals,
      initialSupply,
      maxSupply: config.maxSupply,
      mintAuthority:
        config.mintAuthority === "REVOKED"
          ? undefined
          : mintAuthority.toBase58(),
      freezeAuthority: freezeAuthority ? freezeAuthority.toBase58() : undefined,
      mintAuthorityRevoked: config.mintAuthority === "REVOKED",
      freezeAuthorityRevoked: config.freezeAuthority === "REVOKED",
      tokenUri: metadata.externalUrl,
      description: metadata.description,
      isActive: true,
      createdAt: new Date(),
    };

    return {
      token,
      mintKeypair,
      signature,
    };
  }

  /**
   * Revoke mint authority (make token non-mintable)
   */
  async revokeMintAuthority(
    token: LaunchedToken,
    currentAuthority: Keypair,
  ): Promise<string> {
    if (token.mintAuthorityRevoked) {
      throw new Error("Mint authority already revoked");
    }

    const mintPublicKey = new PublicKey(token.tokenMint);

    const transaction = new Transaction().add(
      createSetAuthorityInstruction(
        mintPublicKey,
        currentAuthority.publicKey,
        AuthorityType.MintTokens,
        null, // Setting to null revokes authority
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [currentAuthority],
      { commitment: "confirmed" },
    );

    console.log(`✅ Mint authority revoked for ${token.tokenMint}`);
    console.log(`   Signature: ${signature}`);

    // Update token record
    token.mintAuthorityRevoked = true;
    token.mintAuthority = undefined;

    return signature;
  }

  /**
   * Revoke freeze authority
   */
  async revokeFreezeAuthority(
    token: LaunchedToken,
    currentAuthority: Keypair,
  ): Promise<string> {
    if (token.freezeAuthorityRevoked) {
      throw new Error("Freeze authority already revoked");
    }

    const mintPublicKey = new PublicKey(token.tokenMint);

    const transaction = new Transaction().add(
      createSetAuthorityInstruction(
        mintPublicKey,
        currentAuthority.publicKey,
        AuthorityType.FreezeAccount,
        null, // Setting to null revokes authority
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [currentAuthority],
      { commitment: "confirmed" },
    );

    console.log(`✅ Freeze authority revoked for ${token.tokenMint}`);
    console.log(`   Signature: ${signature}`);

    // Update token record
    token.freezeAuthorityRevoked = true;
    token.freezeAuthority = undefined;

    return signature;
  }

  /**
   * Transfer mint authority to new authority
   */
  async transferMintAuthority(
    token: LaunchedToken,
    currentAuthority: Keypair,
    newAuthority: PublicKey,
  ): Promise<string> {
    if (token.mintAuthorityRevoked) {
      throw new Error("Mint authority already revoked, cannot transfer");
    }

    const mintPublicKey = new PublicKey(token.tokenMint);

    const transaction = new Transaction().add(
      createSetAuthorityInstruction(
        mintPublicKey,
        currentAuthority.publicKey,
        AuthorityType.MintTokens,
        newAuthority,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [currentAuthority],
      { commitment: "confirmed" },
    );

    console.log(`✅ Mint authority transferred for ${token.tokenMint}`);
    console.log(`   New authority: ${newAuthority.toBase58()}`);
    console.log(`   Signature: ${signature}`);

    // Update token record
    token.mintAuthority = newAuthority.toBase58();

    return signature;
  }

  /**
   * Create graduation milestone
   */
  createMilestone(
    tokenId: string,
    milestoneType: TokenMilestone["milestoneType"],
    milestoneValue: number,
    description?: string,
  ): TokenMilestone {
    return {
      id: crypto.randomUUID(),
      tokenId,
      milestoneType,
      milestoneValue,
      description,
      isAchieved: false,
      createdAt: new Date(),
    };
  }

  /**
   * Check if milestone is achieved
   */
  async checkMilestone(
    token: LaunchedToken,
    milestone: TokenMilestone,
    currentValue: number,
  ): Promise<boolean> {
    if (milestone.isAchieved) {
      return true;
    }

    const achieved = currentValue >= milestone.milestoneValue;

    if (achieved && !milestone.isAchieved) {
      milestone.isAchieved = true;
      milestone.achievedAt = new Date();

      console.log(`🎯 Milestone achieved for ${token.tokenSymbol}`);
      console.log(`   Type: ${milestone.milestoneType}`);
      console.log(`   Target: ${milestone.milestoneValue}`);
      console.log(`   Actual: ${currentValue}`);

      // In production, save to database
      // UPDATE token_milestones SET is_achieved = TRUE, achieved_at = NOW()
      // WHERE id = milestone.id
    }

    return achieved;
  }

  /**
   * Graduate token (typically revoke authorities and mark as graduated)
   */
  async graduateToken(
    token: LaunchedToken,
    authority: Keypair,
    options: {
      revokeMintAuthority?: boolean;
      revokeFreezeAuthority?: boolean;
    } = {},
  ): Promise<{
    token: LaunchedToken;
    signatures: string[];
  }> {
    const signatures: string[] = [];

    // Revoke mint authority if requested
    if (options.revokeMintAuthority && !token.mintAuthorityRevoked) {
      const sig = await this.revokeMintAuthority(token, authority);
      signatures.push(sig);
    }

    // Revoke freeze authority if requested
    if (options.revokeFreezeAuthority && !token.freezeAuthorityRevoked) {
      const sig = await this.revokeFreezeAuthority(token, authority);
      signatures.push(sig);
    }

    // Mark as graduated
    token.graduatedAt = new Date();

    console.log(`🎓 Token graduated: ${token.tokenSymbol}`);
    console.log(`   Mint: ${token.tokenMint}`);
    console.log(`   Mint authority revoked: ${token.mintAuthorityRevoked}`);
    console.log(`   Freeze authority revoked: ${token.freezeAuthorityRevoked}`);

    // In production, save to database
    // UPDATE launched_tokens SET graduated_at = NOW() WHERE id = token.id

    return {
      token,
      signatures,
    };
  }

  /**
   * Get token supply
   */
  async getTokenSupply(tokenMint: string): Promise<number> {
    const mintPublicKey = new PublicKey(tokenMint);
    const supply = await this.connection.getTokenSupply(mintPublicKey);
    return (
      parseFloat(supply.value.amount) / Math.pow(10, supply.value.decimals)
    );
  }

  /**
   * Get token account info
   */
  async getTokenInfo(tokenMint: string): Promise<{
    supply: number;
    decimals: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
  }> {
    const mintPublicKey = new PublicKey(tokenMint);
    const accountInfo =
      await this.connection.getParsedAccountInfo(mintPublicKey);

    if (!accountInfo.value || !("parsed" in accountInfo.value.data)) {
      throw new Error("Invalid mint account");
    }

    const data = accountInfo.value.data.parsed.info;

    return {
      supply: parseFloat(data.supply) / Math.pow(10, data.decimals),
      decimals: data.decimals,
      mintAuthority: data.mintAuthority,
      freezeAuthority: data.freezeAuthority,
    };
  }

  /**
   * Verify token launch on-chain
   */
  async verifyTokenLaunch(
    tokenMint: string,
    expectedDecimals: number,
  ): Promise<{ verified: boolean; error?: string }> {
    try {
      const info = await this.getTokenInfo(tokenMint);

      if (info.decimals !== expectedDecimals) {
        return {
          verified: false,
          error: `Decimals mismatch: expected ${expectedDecimals}, got ${info.decimals}`,
        };
      }

      return { verified: true };
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Create default milestones for new token
   */
  createDefaultMilestones(tokenId: string): TokenMilestone[] {
    return [
      this.createMilestone(tokenId, "HOLDERS", 100, "Reach 100 unique holders"),
      this.createMilestone(
        tokenId,
        "HOLDERS",
        1000,
        "Reach 1,000 unique holders",
      ),
      this.createMilestone(
        tokenId,
        "MARKET_CAP",
        100000,
        "Reach $100,000 market cap",
      ),
      this.createMilestone(
        tokenId,
        "MARKET_CAP",
        1000000,
        "Reach $1,000,000 market cap",
      ),
      this.createMilestone(
        tokenId,
        "LIQUIDITY",
        50000,
        "Add $50,000 in liquidity",
      ),
      this.createMilestone(tokenId, "GRADUATION", 1, "Token graduation ready"),
    ];
  }
}

/**
 * Helper function to calculate token amount with decimals
 */
export function calculateTokenAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

/**
 * Helper function to format token amount
 */
export function formatTokenAmount(amount: bigint, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}

export default TokenLauncherService;
