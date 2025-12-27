/**
 * Jito MEV-Aware Transaction Execution
 *
 * Provides atomic bundle execution with tip mechanism to protect against front-running
 * and ensure transaction inclusion with MEV protection.
 *
 * Features:
 * - Atomic bundle creation and execution
 * - Configurable Jito tip amounts
 * - Priority fee integration
 * - Front-running protection
 * - Bundle status tracking
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import axios from "axios";

export interface JitoTipConfig {
  enabled: boolean;
  minTipLamports: number;
  maxTipLamports: number;
  tipPercentage: number; // Percentage of expected profit to tip
}

export interface JitoBundleResult {
  bundleId: string;
  success: boolean;
  signatures: string[];
  error?: string;
  landedSlot?: number;
}

export interface JitoBundleStatus {
  bundleId: string;
  status: "pending" | "landed" | "failed" | "dropped";
  landedSlot?: number;
  transactions: {
    signature: string;
    status: string;
    err: string | null;
  }[];
}

/**
 * Jito Block Engine endpoints for mainnet
 * These are the official Jito Block Engine RPC endpoints
 */
const JITO_BLOCK_ENGINE_URLS = [
  "https://mainnet.block-engine.jito.wtf",
  "https://amsterdam.mainnet.block-engine.jito.wtf",
  "https://frankfurt.mainnet.block-engine.jito.wtf",
  "https://ny.mainnet.block-engine.jito.wtf",
  "https://tokyo.mainnet.block-engine.jito.wtf",
];

/**
 * Jito tip accounts for mainnet
 * Send tips to one of these accounts to incentivize bundle inclusion
 */
const JITO_TIP_ACCOUNTS = [
  new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"),
  new PublicKey("HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe"),
  new PublicKey("Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY"),
  new PublicKey("ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49"),
  new PublicKey("DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh"),
  new PublicKey("ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt"),
  new PublicKey("DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL"),
  new PublicKey("3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"),
];

export class JitoIntegration {
  private connection: Connection;
  private blockEngineUrl: string;
  private tipConfig: JitoTipConfig;

  constructor(connection: Connection, tipConfig?: Partial<JitoTipConfig>) {
    this.connection = connection;
    this.blockEngineUrl = JITO_BLOCK_ENGINE_URLS[0]; // Default to first endpoint
    this.tipConfig = {
      enabled: tipConfig?.enabled ?? true,
      minTipLamports:
        tipConfig?.minTipLamports ??
        parseInt(process.env.JITO_MIN_TIP_LAMPORTS || "10000"), // 0.00001 SOL default
      maxTipLamports:
        tipConfig?.maxTipLamports ??
        parseInt(process.env.JITO_MAX_TIP_LAMPORTS || "1000000"), // 0.001 SOL default
      tipPercentage:
        tipConfig?.tipPercentage ??
        parseFloat(process.env.JITO_TIP_PERCENTAGE || "0.05"), // 5% of profit default
    };

    console.log("[Jito] Initialized with config:", {
      enabled: this.tipConfig.enabled,
      minTip: `${this.tipConfig.minTipLamports / 1e9} SOL`,
      maxTip: `${this.tipConfig.maxTipLamports / 1e9} SOL`,
      tipPercentage: `${this.tipConfig.tipPercentage * 100}%`,
    });
  }

  /**
   * Calculate tip amount based on expected profit
   */
  calculateTipAmount(expectedProfitLamports: number): number {
    if (!this.tipConfig.enabled) {
      return 0;
    }

    // Calculate percentage-based tip
    const percentageTip = Math.floor(
      expectedProfitLamports * this.tipConfig.tipPercentage,
    );

    // Clamp between min and max
    const tipAmount = Math.max(
      this.tipConfig.minTipLamports,
      Math.min(percentageTip, this.tipConfig.maxTipLamports),
    );

    console.log(
      `[Jito] Calculated tip: ${tipAmount / 1e9} SOL (${(this.tipConfig.tipPercentage * 100).toFixed(2)}% of ${expectedProfitLamports / 1e9} SOL profit)`,
    );

    return tipAmount;
  }

  /**
   * Create a tip instruction to a Jito tip account
   */
  createTipInstruction(
    from: PublicKey,
    tipLamports: number,
    tipAccountIndex: number = 0,
  ): TransactionInstruction {
    const tipAccount =
      JITO_TIP_ACCOUNTS[tipAccountIndex % JITO_TIP_ACCOUNTS.length];

    console.log(
      `[Jito] Creating tip instruction: ${tipLamports / 1e9} SOL to ${tipAccount.toString()}`,
    );

    return SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: tipAccount,
      lamports: tipLamports,
    });
  }

  /**
   * Build an atomic bundle with tip for MEV protection
   */
  async buildAtomicBundle(
    transactions: Transaction[],
    signers: Keypair[],
    expectedProfitLamports: number = 0,
  ): Promise<VersionedTransaction[]> {
    try {
      console.log(
        `[Jito] Building atomic bundle with ${transactions.length} transactions...`,
      );

      if (transactions.length === 0) {
        throw new Error("Cannot build bundle with zero transactions");
      }

      // Calculate tip amount
      const tipAmount = this.calculateTipAmount(expectedProfitLamports);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("finalized");

      // Convert transactions to versioned transactions and add tip to the last one
      const versionedTxs: VersionedTransaction[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const isLastTx = i === transactions.length - 1;

        // Add tip instruction to the last transaction if enabled
        if (isLastTx && tipAmount > 0) {
          const tipIx = this.createTipInstruction(
            signers[0].publicKey,
            tipAmount,
            Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length),
          );
          tx.add(tipIx);
        }

        // Set blockhash and fee payer
        tx.recentBlockhash = blockhash;
        tx.feePayer = signers[0].publicKey;

        // Convert to versioned transaction
        const messageV0 = new TransactionMessage({
          payerKey: signers[0].publicKey,
          recentBlockhash: blockhash,
          instructions: tx.instructions,
        }).compileToV0Message();

        const versionedTx = new VersionedTransaction(messageV0);

        // Sign the transaction
        versionedTx.sign(signers);

        versionedTxs.push(versionedTx);
      }

      console.log(
        `[Jito] Atomic bundle built with ${versionedTxs.length} transactions (tip: ${tipAmount / 1e9} SOL)`,
      );

      return versionedTxs;
    } catch (error) {
      console.error("[Jito] Error building atomic bundle:", error);
      throw error;
    }
  }

  /**
   * Send a bundle to Jito Block Engine
   */
  async sendBundle(bundle: VersionedTransaction[]): Promise<JitoBundleResult> {
    try {
      console.log(
        `[Jito] Sending bundle with ${bundle.length} transactions to ${this.blockEngineUrl}...`,
      );

      // Serialize transactions
      const serializedTransactions = bundle.map((tx) =>
        Buffer.from(tx.serialize()).toString("base64"),
      );

      // Send bundle to Jito Block Engine
      const response = await axios.post(
        `${this.blockEngineUrl}/api/v1/bundles`,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "sendBundle",
          params: [serializedTransactions],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
        },
      );

      if (response.data.error) {
        throw new Error(
          `Jito bundle error: ${JSON.stringify(response.data.error)}`,
        );
      }

      const bundleId = response.data.result;
      const signatures = bundle.map((tx) => {
        const sig = tx.signatures[0];
        return Buffer.from(sig).toString("base64");
      });

      console.log(`[Jito] Bundle sent successfully!`);
      console.log(`[Jito] Bundle ID: ${bundleId}`);

      return {
        bundleId,
        success: true,
        signatures,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Jito] Error sending bundle:", errorMessage);

      return {
        bundleId: "",
        success: false,
        signatures: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Check bundle status
   */
  async getBundleStatus(bundleId: string): Promise<JitoBundleStatus | null> {
    try {
      console.log(`[Jito] Checking bundle status: ${bundleId}...`);

      const response = await axios.post(
        `${this.blockEngineUrl}/api/v1/bundles`,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "getBundleStatuses",
          params: [[bundleId]],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      if (response.data.error) {
        throw new Error(
          `Jito status error: ${JSON.stringify(response.data.error)}`,
        );
      }

      const statuses = response.data.result?.value || [];
      if (statuses.length === 0) {
        console.log("[Jito] Bundle status not found");
        return null;
      }

      const status = statuses[0];

      console.log(`[Jito] Bundle status: ${status.confirmation_status}`);

      return {
        bundleId,
        status: status.confirmation_status as
          | "pending"
          | "landed"
          | "failed"
          | "dropped",
        landedSlot: status.slot,
        transactions: status.transactions || [],
      };
    } catch (error) {
      console.error("[Jito] Error checking bundle status:", error);
      return null;
    }
  }

  /**
   * Execute atomic bundle with MEV protection
   * This is the main entry point for executing arbitrage with Jito
   */
  async executeAtomicBundle(
    transactions: Transaction[],
    signers: Keypair[],
    expectedProfitLamports: number = 0,
    pollForConfirmation: boolean = true,
  ): Promise<JitoBundleResult> {
    try {
      console.log("[Jito] Executing atomic bundle with MEV protection...");

      // Build the bundle
      const bundle = await this.buildAtomicBundle(
        transactions,
        signers,
        expectedProfitLamports,
      );

      // Send the bundle
      const result = await this.sendBundle(bundle);

      if (!result.success) {
        return result;
      }

      // Poll for confirmation if requested
      if (pollForConfirmation && result.bundleId) {
        console.log("[Jito] Polling for bundle confirmation...");

        const maxAttempts = 30; // Poll for up to 30 seconds
        const pollInterval = 1000; // 1 second between polls

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          const status = await this.getBundleStatus(result.bundleId);

          if (status) {
            if (status.status === "landed") {
              console.log(`[Jito] Bundle landed in slot ${status.landedSlot}!`);
              return {
                ...result,
                landedSlot: status.landedSlot,
              };
            } else if (
              status.status === "failed" ||
              status.status === "dropped"
            ) {
              console.log(`[Jito] Bundle ${status.status}`);
              return {
                ...result,
                success: false,
                error: `Bundle ${status.status}`,
              };
            }
          }
        }

        console.log("[Jito] Bundle confirmation timeout");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Jito] Error executing atomic bundle:", errorMessage);

      return {
        bundleId: "",
        success: false,
        signatures: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Rotate to a different block engine endpoint
   */
  rotateBlockEngine(): void {
    const currentIndex = JITO_BLOCK_ENGINE_URLS.indexOf(this.blockEngineUrl);
    const nextIndex = (currentIndex + 1) % JITO_BLOCK_ENGINE_URLS.length;
    this.blockEngineUrl = JITO_BLOCK_ENGINE_URLS[nextIndex];

    console.log(`[Jito] Rotated to block engine: ${this.blockEngineUrl}`);
  }

  /**
   * Get current tip configuration
   */
  getTipConfig(): JitoTipConfig {
    return { ...this.tipConfig };
  }

  /**
   * Update tip configuration
   */
  updateTipConfig(config: Partial<JitoTipConfig>): void {
    this.tipConfig = {
      ...this.tipConfig,
      ...config,
    };

    console.log("[Jito] Tip configuration updated:", this.tipConfig);
  }
}
