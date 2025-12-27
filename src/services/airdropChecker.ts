import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import axios from "axios";

export interface AirdropInfo {
  protocol: string;
  tokenMint: string;
  amount: number;
  claimable: boolean;
  claimed: boolean;
  claimDeadline?: Date;
}

export class AirdropChecker {
  private connection: Connection;
  private userPublicKey: PublicKey;

  constructor(connection: Connection, userPublicKey: PublicKey) {
    this.connection = connection;
    this.userPublicKey = userPublicKey;
  }

  async checkAllAirdrops(): Promise<AirdropInfo[]> {
    if (!this.userPublicKey) {
      console.error(
        "[AirdropChecker] Invalid userPublicKey: public key is required",
      );
      return [];
    }

    console.log(
      `[AirdropChecker] Checking all airdrops for wallet: ${this.userPublicKey.toString().slice(0, 8)}...`,
    );
    const airdrops: AirdropInfo[] = [];

    try {
      // Check Jupiter airdrop
      const jupiterAirdrop = await this.checkJupiterAirdrop();
      if (jupiterAirdrop) {
        console.log("[AirdropChecker] Found Jupiter airdrop");
        airdrops.push(jupiterAirdrop);
      }

      // Check Jito airdrop
      const jitoAirdrop = await this.checkJitoAirdrop();
      if (jitoAirdrop) {
        console.log("[AirdropChecker] Found Jito airdrop");
        airdrops.push(jitoAirdrop);
      }

      // Check Pyth airdrop
      const pythAirdrop = await this.checkPythAirdrop();
      if (pythAirdrop) {
        console.log("[AirdropChecker] Found Pyth airdrop");
        airdrops.push(pythAirdrop);
      }

      // Check Kamino airdrop
      const kaminoAirdrop = await this.checkKaminoAirdrop();
      if (kaminoAirdrop) {
        console.log("[AirdropChecker] Found Kamino airdrop");
        airdrops.push(kaminoAirdrop);
      }

      // Check Marginfi airdrop
      const marginfiAirdrop = await this.checkMarginfiAirdrop();
      if (marginfiAirdrop) {
        console.log("[AirdropChecker] Found Marginfi airdrop");
        airdrops.push(marginfiAirdrop);
      }

      // Check GXQ ecosystem airdrops
      const gxqAirdrops = await this.checkGXQEcosystemAirdrops();
      if (gxqAirdrops.length > 0) {
        console.log(
          `[AirdropChecker] Found ${gxqAirdrops.length} GXQ ecosystem airdrops`,
        );
      }
      airdrops.push(...gxqAirdrops);

      console.log(`[AirdropChecker] Total airdrops found: ${airdrops.length}`);
      return airdrops;
    } catch (error) {
      console.error("[AirdropChecker] Error checking airdrops:", error);
      return airdrops; // Return partial results
    }
  }

  private async checkJupiterAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log("[AirdropChecker] Checking Jupiter airdrop eligibility...");

      const response = await axios.get(
        `https://worker.jup.ag/jup-claim-proof/${this.userPublicKey.toString()}`,
      );

      if (response.data && response.data.amount) {
        console.log(
          `[AirdropChecker] Jupiter airdrop found: ${response.data.amount}`,
        );
        return {
          protocol: "Jupiter",
          tokenMint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
          amount: response.data.amount,
          claimable: true,
          claimed: false,
        };
      }

      console.log("[AirdropChecker] No Jupiter airdrop available");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log("[AirdropChecker] No Jupiter airdrop found (404)");
        } else {
          console.error("[AirdropChecker] Jupiter airdrop check failed:", {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error(
          "[AirdropChecker] Unexpected Jupiter airdrop check error:",
          error,
        );
      }
    }
    return null;
  }

  private async checkJitoAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log("[AirdropChecker] Checking Jito airdrop eligibility...");

      const response = await axios.get(
        `https://kek.jito.network/api/v1/airdrop_allocation/${this.userPublicKey.toString()}`,
      );

      if (response.data && response.data.allocation) {
        console.log(
          `[AirdropChecker] Jito airdrop found: ${response.data.allocation}`,
        );
        return {
          protocol: "Jito",
          tokenMint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
          amount: response.data.allocation,
          claimable: true,
          claimed: false,
        };
      }

      console.log("[AirdropChecker] No Jito airdrop available");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log("[AirdropChecker] No Jito airdrop found (404)");
        } else {
          console.error("[AirdropChecker] Jito airdrop check failed:", {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error(
          "[AirdropChecker] Unexpected Jito airdrop check error:",
          error,
        );
      }
    }
    return null;
  }

  private async checkPythAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log("[AirdropChecker] Checking Pyth airdrop eligibility...");

      // Pyth Network uses a merkle tree distribution system
      // Check if wallet is eligible via their API
      const response = await axios.get(
        `https://airdrop-api.pyth.network/allocation/${this.userPublicKey.toString()}`,
        { timeout: 5000 },
      );

      if (response.data && response.data.amount) {
        console.log(
          `[AirdropChecker] Pyth airdrop found: ${response.data.amount}`,
        );
        return {
          protocol: "Pyth",
          tokenMint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
          amount: response.data.amount,
          claimable: true,
          claimed: false,
        };
      }

      console.log("[AirdropChecker] No Pyth airdrop available");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log("[AirdropChecker] No Pyth airdrop found (404)");
        } else {
          console.error("[AirdropChecker] Pyth airdrop check failed:", {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error(
          "[AirdropChecker] Unexpected Pyth airdrop check error:",
          error,
        );
      }
    }
    return null;
  }

  private async checkKaminoAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log("[AirdropChecker] Checking Kamino airdrop eligibility...");

      // Kamino Finance airdrop check via their API
      const response = await axios.get(
        `https://api.kamino.finance/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 5000 },
      );

      if (response.data && response.data.allocation) {
        console.log(
          `[AirdropChecker] Kamino airdrop found: ${response.data.allocation}`,
        );
        return {
          protocol: "Kamino",
          tokenMint: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
          amount: response.data.allocation,
          claimable: true,
          claimed: false,
        };
      }

      console.log("[AirdropChecker] No Kamino airdrop available");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log("[AirdropChecker] No Kamino airdrop found (404)");
        } else {
          console.error("[AirdropChecker] Kamino airdrop check failed:", {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error(
          "[AirdropChecker] Unexpected Kamino airdrop check error:",
          error,
        );
      }
    }
    return null;
  }

  private async checkMarginfiAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log("[AirdropChecker] Checking Marginfi airdrop eligibility...");

      // Marginfi airdrop check via their API
      const response = await axios.get(
        `https://api.marginfi.com/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 5000 },
      );

      if (response.data && response.data.amount) {
        console.log(
          `[AirdropChecker] Marginfi airdrop found: ${response.data.amount}`,
        );
        return {
          protocol: "Marginfi",
          tokenMint: "MRGNVbWdbHSqXVVPNXzZmJmr3LvGRwVv9VCYDRGNxVW",
          amount: response.data.amount,
          claimable: true,
          claimed: false,
        };
      }

      console.log("[AirdropChecker] No Marginfi airdrop available");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log("[AirdropChecker] No Marginfi airdrop found (404)");
        } else {
          console.error("[AirdropChecker] Marginfi airdrop check failed:", {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error(
          "[AirdropChecker] Unexpected Marginfi airdrop check error:",
          error,
        );
      }
    }
    return null;
  }

  private async checkGXQEcosystemAirdrops(): Promise<AirdropInfo[]> {
    // Check GXQ ecosystem airdrops
    const airdrops: AirdropInfo[] = [];

    // GXQ main token airdrop
    // sGXQ staking rewards
    // xGXQ governance token

    return airdrops;
  }

  async claimAirdrop(
    airdrop: AirdropInfo,
    userKeypair: Keypair,
  ): Promise<string | null> {
    try {
      console.log(`Claiming ${airdrop.protocol} airdrop...`);

      switch (airdrop.protocol) {
        case "Jupiter":
          return await this.claimJupiterAirdrop(userKeypair);
        case "Jito":
          return await this.claimJitoAirdrop(userKeypair);
        case "Pyth":
          return await this.claimPythAirdrop(userKeypair);
        case "Kamino":
          return await this.claimKaminoAirdrop(userKeypair);
        case "Marginfi":
          return await this.claimMarginfiAirdrop(userKeypair);
        default:
          console.warn(`Unknown protocol: ${airdrop.protocol}`);
          return null;
      }
    } catch (error) {
      console.error(`Error claiming ${airdrop.protocol} airdrop:`, error);
      return null;
    }
  }

  private async claimJupiterAirdrop(
    userKeypair: Keypair,
  ): Promise<string | null> {
    try {
      console.log("[AirdropChecker] Claiming Jupiter airdrop...");

      // Fetch claim proof and merkle data
      const response = await axios.get(
        `https://worker.jup.ag/jup-claim-proof/${userKeypair.publicKey.toString()}`,
      );

      if (!response.data || !response.data.amount) {
        console.warn("[AirdropChecker] No Jupiter airdrop available to claim");
        return null;
      }

      const { amount, proof } = response.data;

      // Build claim transaction
      // Note: This is a framework. In production, you need to:
      // 1. Get the actual claim program ID from Jupiter
      // 2. Derive the correct PDAs (merkle distributor, claim status)
      // 3. Build proper instruction data with proof and amount
      // 4. Add all required accounts to the instruction

      console.log(`[AirdropChecker] Jupiter airdrop amount: ${amount}`);
      console.log(
        `[AirdropChecker] Merkle proof entries: ${proof?.length || 0}`,
      );

      // Framework transaction builder
      const transaction = new Transaction();

      // In production, add the actual claim instruction:
      // const claimInstruction = createClaimInstruction(
      //   userKeypair.publicKey,
      //   amount,
      //   proof,
      //   merkleDistributorPDA,
      //   claimStatusPDA
      // );
      // transaction.add(claimInstruction);

      console.log(
        "[AirdropChecker] ⚠️  Jupiter claim requires @jup-ag/claim SDK integration",
      );
      console.log(
        "[AirdropChecker] Transaction framework ready, but actual claim instruction needs Jupiter SDK",
      );

      return null; // Return null until SDK is integrated
    } catch (error) {
      console.error("[AirdropChecker] Jupiter claim error:", error);
      return null;
    }
  }

  private async claimJitoAirdrop(userKeypair: Keypair): Promise<string | null> {
    try {
      console.log("[AirdropChecker] Claiming Jito airdrop...");

      // Fetch claim data from Jito API
      const response = await axios.get(
        `https://kek.jito.network/api/v1/airdrop_allocation/${userKeypair.publicKey.toString()}`,
      );

      if (!response.data || !response.data.allocation) {
        console.warn("[AirdropChecker] No Jito airdrop available to claim");
        return null;
      }

      const { allocation, proof } = response.data;

      console.log(`[AirdropChecker] Jito airdrop amount: ${allocation}`);

      // Build claim transaction
      const transaction = new Transaction();

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userKeypair.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // In production, add the actual Jito claim instruction:
      // const jitoClaimProgramId = new PublicKey('JiToClaimProgramIdHere...');
      // const claimInstruction = createJitoClaimInstruction(
      //   jitoClaimProgramId,
      //   userKeypair.publicKey,
      //   allocation,
      //   proof
      // );
      // transaction.add(claimInstruction);

      console.log(
        "[AirdropChecker] ⚠️  Jito claim requires Jito SDK or manual instruction building",
      );
      console.log(
        "[AirdropChecker] Transaction framework ready, but actual claim instruction needs implementation",
      );

      return null; // Return null until actual instruction is implemented
    } catch (error) {
      console.error("[AirdropChecker] Jito claim error:", error);
      return null;
    }
  }

  private async claimPythAirdrop(userKeypair: Keypair): Promise<string | null> {
    try {
      console.log("[AirdropChecker] Claiming Pyth airdrop...");

      // Fetch Pyth airdrop data
      const response = await axios.get(
        `https://airdrop-api.pyth.network/allocation/${userKeypair.publicKey.toString()}`,
        { timeout: 5000 },
      );

      if (!response.data || !response.data.amount) {
        console.warn("[AirdropChecker] No Pyth airdrop available to claim");
        return null;
      }

      const { amount, proof, index } = response.data;

      console.log(`[AirdropChecker] Pyth airdrop amount: ${amount}`);
      console.log(`[AirdropChecker] Merkle index: ${index}`);

      // Build claim transaction
      const transaction = new Transaction();

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userKeypair.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // In production, implement Pyth merkle distributor claim:
      // const pythDistributorProgramId = new PublicKey('PythMerkleDistributorProgramId...');
      // const [distributorPDA] = await PublicKey.findProgramAddress([...], pythDistributorProgramId);
      // const [claimStatusPDA] = await PublicKey.findProgramAddress([...], pythDistributorProgramId);
      //
      // const claimIx = new TransactionInstruction({
      //   programId: pythDistributorProgramId,
      //   keys: [
      //     { pubkey: distributorPDA, isSigner: false, isWritable: true },
      //     { pubkey: claimStatusPDA, isSigner: false, isWritable: true },
      //     { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
      //     // ... other required accounts
      //   ],
      //   data: Buffer.from([/* claim instruction data with proof */])
      // });
      // transaction.add(claimIx);

      console.log(
        "[AirdropChecker] ⚠️  Pyth claim requires merkle distributor integration",
      );
      console.log(
        "[AirdropChecker] Transaction framework ready, but needs Pyth program interaction",
      );

      return null; // Return null until actual implementation
    } catch (error) {
      console.error("[AirdropChecker] Pyth claim error:", error);
      return null;
    }
  }

  private async claimKaminoAirdrop(
    userKeypair: Keypair,
  ): Promise<string | null> {
    try {
      console.log("[AirdropChecker] Claiming Kamino airdrop...");

      // Fetch Kamino airdrop data
      const response = await axios.get(
        `https://api.kamino.finance/airdrop/${userKeypair.publicKey.toString()}`,
        { timeout: 5000 },
      );

      if (!response.data || !response.data.allocation) {
        console.warn("[AirdropChecker] No Kamino airdrop available to claim");
        return null;
      }

      const { allocation, proof } = response.data;

      console.log(`[AirdropChecker] Kamino airdrop amount: ${allocation}`);

      // Build claim transaction
      const transaction = new Transaction();

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userKeypair.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // In production, implement Kamino claim instruction:
      // Use Kamino Finance SDK or build instruction manually
      // const kaminoClaimProgramId = new PublicKey('KaminoClaimProgramId...');
      // const claimIx = buildKaminoClaimInstruction(
      //   kaminoClaimProgramId,
      //   userKeypair.publicKey,
      //   allocation,
      //   proof
      // );
      // transaction.add(claimIx);

      console.log(
        "[AirdropChecker] ⚠️  Kamino claim requires Kamino SDK or manual instruction building",
      );
      console.log(
        "[AirdropChecker] Transaction framework ready, but needs Kamino program interaction",
      );

      return null; // Return null until actual implementation
    } catch (error) {
      console.error("[AirdropChecker] Kamino claim error:", error);
      return null;
    }
  }

  private async claimMarginfiAirdrop(
    userKeypair: Keypair,
  ): Promise<string | null> {
    try {
      console.log("[AirdropChecker] Claiming Marginfi airdrop...");

      // Fetch Marginfi airdrop data
      const response = await axios.get(
        `https://api.marginfi.com/airdrop/${userKeypair.publicKey.toString()}`,
        { timeout: 5000 },
      );

      if (!response.data || !response.data.amount) {
        console.warn("[AirdropChecker] No Marginfi airdrop available to claim");
        return null;
      }

      const { amount, proof } = response.data;

      console.log(`[AirdropChecker] Marginfi airdrop amount: ${amount}`);

      // Build claim transaction
      const transaction = new Transaction();

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userKeypair.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // In production, implement Marginfi claim instruction:
      // Use @mrgnlabs/marginfi-client-v2 or build instruction manually
      // const marginfiClaimProgramId = new PublicKey('MarginfiClaimProgramId...');
      // const claimIx = buildMarginfiClaimInstruction(
      //   marginfiClaimProgramId,
      //   userKeypair.publicKey,
      //   amount,
      //   proof
      // );
      // transaction.add(claimIx);

      // Sign and send transaction
      // transaction.sign(userKeypair);
      // const signature = await sendAndConfirmTransaction(
      //   this.connection,
      //   transaction,
      //   [userKeypair],
      //   { commitment: 'confirmed' }
      // );
      // console.log(`[AirdropChecker] ✅ Marginfi airdrop claimed: ${signature}`);
      // return signature;

      console.log(
        "[AirdropChecker] ⚠️  Marginfi claim requires @mrgnlabs/marginfi-client-v2 SDK",
      );
      console.log(
        "[AirdropChecker] Transaction framework ready, but needs Marginfi program interaction",
      );

      return null; // Return null until actual implementation
    } catch (error) {
      console.error("[AirdropChecker] Marginfi claim error:", error);
      return null;
    }
  }

  async autoClaimAll(
    userKeypair: Keypair,
  ): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    const airdrops = await this.checkAllAirdrops();

    for (const airdrop of airdrops) {
      if (airdrop.claimable && !airdrop.claimed) {
        const signature = await this.claimAirdrop(airdrop, userKeypair);
        results.set(airdrop.protocol, signature);

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}
