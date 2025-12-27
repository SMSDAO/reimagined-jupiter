import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config/index.js";

export interface ProductionSafetyCheck {
  passed: boolean;
  message: string;
  level: "error" | "warning" | "info";
}

export class ProductionGuardrails {
  private static checks: ProductionSafetyCheck[] = [];

  /**
   * Validate that the RPC endpoint is production-grade (not public/rate-limited)
   */
  static validateRpcEndpoint(): ProductionSafetyCheck {
    const rpcUrl = config.solana.rpcUrl;

    // Public endpoints that should not be used in production
    const publicEndpoints = [
      "https://api.mainnet-beta.solana.com",
      "https://api.devnet.solana.com",
      "https://api.testnet.solana.com",
      "http://localhost",
      "127.0.0.1",
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      rpcUrl.toLowerCase().includes(endpoint.toLowerCase()),
    );

    if (isPublicEndpoint) {
      return {
        passed: false,
        message:
          `⚠️  Production Alert: Using public RPC endpoint (${rpcUrl}). ` +
          `Public endpoints are rate-limited and unreliable for production. ` +
          `Use a dedicated RPC provider like QuickNode, Helius, or Triton.`,
        level: "error",
      };
    }

    // Check for QuickNode or other known production providers
    const productionProviders = [
      "quicknode",
      "helius",
      "triton",
      "alchemy",
      "rpcpool",
      "genesysgo",
    ];

    const hasProductionProvider = productionProviders.some((provider) =>
      rpcUrl.toLowerCase().includes(provider),
    );

    if (!hasProductionProvider) {
      return {
        passed: true,
        message:
          `⚠️  Warning: RPC endpoint may not be production-grade. ` +
          `Consider using QuickNode, Helius, or Triton for best performance.`,
        level: "warning",
      };
    }

    return {
      passed: true,
      message: `✅ RPC endpoint is production-grade: ${rpcUrl.split("//")[1]?.split(".")[0]}`,
      level: "info",
    };
  }

  /**
   * Validate wallet private key format and security
   */
  static validateWalletPrivateKey(): ProductionSafetyCheck {
    const privateKey = config.solana.walletPrivateKey;

    // Check if private key is set
    if (!privateKey || privateKey.trim() === "") {
      return {
        passed: false,
        message: `❌ WALLET_PRIVATE_KEY is not set. Set it in environment variables.`,
        level: "error",
      };
    }

    // Check minimum length (base58 encoded private keys are typically 88 characters)
    if (privateKey.length < 32) {
      return {
        passed: false,
        message:
          `❌ WALLET_PRIVATE_KEY is too short (${privateKey.length} chars). ` +
          `Expected at least 32 characters for a valid private key. ` +
          `Valid formats: base58 (87-88 chars) or hex (128 chars).`,
        level: "error",
      };
    }

    // Check for common placeholder values
    const placeholders = [
      "your-private-key",
      "replace-me",
      "change-this",
      "placeholder",
      "11111111",
      "00000000",
    ];

    const isPlaceholder = placeholders.some((placeholder) =>
      privateKey.toLowerCase().includes(placeholder.toLowerCase()),
    );

    if (isPlaceholder) {
      return {
        passed: false,
        message:
          `❌ WALLET_PRIVATE_KEY appears to be a placeholder. ` +
          `Set a real private key in environment variables.`,
        level: "error",
      };
    }

    // Check if it's a valid base58 string (basic validation)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(privateKey)) {
      return {
        passed: false,
        message:
          `❌ WALLET_PRIVATE_KEY does not appear to be valid base58. ` +
          `Expected format: base58-encoded 64-byte secret key.`,
        level: "error",
      };
    }

    // Check for appropriate length (base58: 87-88 chars, hex: 128 chars)
    if (
      privateKey.length < 80 &&
      privateKey.length !== 64 &&
      privateKey.length !== 128
    ) {
      return {
        passed: false,
        message:
          `⚠️  WALLET_PRIVATE_KEY length (${privateKey.length}) is unusual. ` +
          `Expected: 87-88 chars (base58) or 128 chars (hex).`,
        level: "warning",
      };
    }

    return {
      passed: true,
      message: `✅ Wallet private key format is valid (${privateKey.length} chars)`,
      level: "info",
    };
  }

  /**
   * Validate minimum balance requirements for trading
   */
  static async validateMinimumBalance(
    connection: Connection,
  ): Promise<ProductionSafetyCheck> {
    try {
      const privateKey = config.solana.walletPrivateKey;
      if (!privateKey || privateKey.trim() === "") {
        return {
          passed: false,
          message: `❌ Cannot check balance: wallet private key not set`,
          level: "error",
        };
      }

      // Import dynamically to avoid circular dependencies
      const bs58 = await import("bs58");
      const { Keypair } = await import("@solana/web3.js");

      const keypair = Keypair.fromSecretKey(bs58.default.decode(privateKey));
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceSOL = balance / 1e9;

      // Minimum recommended balance: 0.1 SOL (for gas fees, rent, etc.)
      const minBalanceSOL = 0.1;

      if (balanceSOL < minBalanceSOL) {
        return {
          passed: false,
          message:
            `⚠️  Low wallet balance: ${balanceSOL.toFixed(4)} SOL. ` +
            `Recommended minimum: ${minBalanceSOL} SOL for gas fees and operations.`,
          level: "warning",
        };
      }

      return {
        passed: true,
        message: `✅ Wallet balance: ${balanceSOL.toFixed(4)} SOL (sufficient for operations)`,
        level: "info",
      };
    } catch (error) {
      return {
        passed: false,
        message: `❌ Failed to check wallet balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        level: "error",
      };
    }
  }

  /**
   * Validate network connectivity
   */
  static async validateNetworkConnectivity(
    connection: Connection,
  ): Promise<ProductionSafetyCheck> {
    try {
      const version = await connection.getVersion();
      const slot = await connection.getSlot();

      return {
        passed: true,
        message: `✅ Network connectivity OK (version: ${version["solana-core"]}, slot: ${slot})`,
        level: "info",
      };
    } catch (error) {
      return {
        passed: false,
        message:
          `❌ Network connectivity failed: ${error instanceof Error ? error.message : "Unknown error"}. ` +
          `Check your RPC endpoint and internet connection.`,
        level: "error",
      };
    }
  }

  /**
   * Validate profit distribution configuration
   */
  static validateProfitDistribution(): ProductionSafetyCheck {
    const { profitDistribution } = config;

    if (!profitDistribution.enabled) {
      return {
        passed: true,
        message: `ℹ️  Profit distribution is disabled`,
        level: "info",
      };
    }

    // Validate percentages add up to 100%
    const total =
      profitDistribution.reserveWalletPercentage +
      profitDistribution.userWalletPercentage +
      profitDistribution.daoWalletPercentage;

    if (Math.abs(total - 1.0) > 0.001) {
      return {
        passed: false,
        message: `❌ Profit distribution percentages must sum to 100%, currently ${(total * 100).toFixed(2)}%`,
        level: "error",
      };
    }

    // Validate DAO wallet address
    const daoWallet = profitDistribution.daoWalletAddress;
    if (daoWallet.equals(new PublicKey("11111111111111111111111111111111"))) {
      return {
        passed: false,
        message: `❌ DAO wallet address is a placeholder. Set DAO_WALLET_ADDRESS in environment variables.`,
        level: "error",
      };
    }

    return {
      passed: true,
      message:
        `✅ Profit distribution configured: ${profitDistribution.reserveWalletPercentage * 100}% reserve, ` +
        `${profitDistribution.userWalletPercentage * 100}% user, ` +
        `${profitDistribution.daoWalletPercentage * 100}% DAO`,
      level: "info",
    };
  }

  /**
   * Validate flash loan provider configuration
   */
  static validateFlashLoanProviders(): ProductionSafetyCheck {
    const providers = config.flashLoanProviders;
    const providerNames = Object.keys(providers);

    // Check that at least one provider is configured
    if (providerNames.length === 0) {
      return {
        passed: false,
        message: `❌ No flash loan providers configured`,
        level: "error",
      };
    }

    // Check for placeholder addresses
    const defaultKey = new PublicKey("11111111111111111111111111111111");
    const placeholderProviders = providerNames.filter((name) =>
      providers[name as keyof typeof providers].equals(defaultKey),
    );

    if (placeholderProviders.length > 0) {
      return {
        passed: false,
        message:
          `⚠️  Flash loan providers with placeholder addresses: ${placeholderProviders.join(", ")}. ` +
          `These will not work in production.`,
        level: "warning",
      };
    }

    return {
      passed: true,
      message: `✅ Flash loan providers configured: ${providerNames.length} providers`,
      level: "info",
    };
  }

  /**
   * Run all production safety checks
   */
  static async enforceProductionSafety(connection: Connection): Promise<void> {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🛡️  PRODUCTION SAFETY CHECKS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    this.checks = [];

    // Run all checks
    this.checks.push(this.validateRpcEndpoint());
    this.checks.push(this.validateWalletPrivateKey());
    this.checks.push(await this.validateMinimumBalance(connection));
    this.checks.push(await this.validateNetworkConnectivity(connection));
    this.checks.push(this.validateProfitDistribution());
    this.checks.push(this.validateFlashLoanProviders());

    // Display results
    let hasErrors = false;
    let hasWarnings = false;

    for (const check of this.checks) {
      if (check.level === "error") {
        console.log(check.message);
        hasErrors = true;
      } else if (check.level === "warning") {
        console.log(check.message);
        hasWarnings = true;
      } else {
        console.log(check.message);
      }
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Handle errors
    if (hasErrors) {
      console.log("❌ CRITICAL: Production safety checks failed");
      console.log("");
      console.log(
        "Application cannot start due to critical configuration errors.",
      );
      console.log("Please fix the errors above and restart.");
      console.log("");
      process.exit(1);
    }

    if (hasWarnings) {
      console.log("⚠️  WARNING: Some production safety checks have warnings");
      console.log("Application will continue, but review warnings above.");
    } else {
      console.log("✅ All production safety checks passed");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
  }

  /**
   * Get all check results
   */
  static getCheckResults(): ProductionSafetyCheck[] {
    return this.checks;
  }
}

/**
 * Convenience function to enforce production safety
 */
export async function enforceProductionSafety(
  connection: Connection,
): Promise<void> {
  await ProductionGuardrails.enforceProductionSafety(connection);
}
