import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';
import * as db from '../../db/database.js';

export interface AirdropInfo {
  protocol: string;
  tokenMint: string;
  amount: number;
  claimable: boolean;
  claimed: boolean;
  claimDeadline?: Date;
  claimStartTime?: Date;
  merkleProof?: string[];
  claimIndex?: number;
  onChainVerified?: boolean;
  eligibilityReason?: string;
}

interface ClaimResult {
  success: boolean;
  signature?: string;
  donationSignature?: string;
  error?: string;
  claimId?: string;
}

export class AirdropChecker {
  private connection: Connection;
  private userPublicKey: PublicKey;
  private devWallet: PublicKey;
  private devFeePercentage: number;
  
  constructor(connection: Connection, userPublicKey: PublicKey) {
    this.connection = connection;
    this.userPublicKey = userPublicKey;
    
    // Dev wallet from env - REQUIRED for production donations
    const devWalletAddress = process.env.DEV_FEE_WALLET;
    if (!devWalletAddress) {
      const errorMsg = 'DEV_FEE_WALLET environment variable is required for airdrop donations. Set it to a valid Solana public key address.';
      console.error(`[AirdropChecker] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    try {
      this.devWallet = new PublicKey(devWalletAddress);
      console.log(`[AirdropChecker] Dev wallet configured: ${this.devWallet.toString().slice(0, 8)}...`);
    } catch (error) {
      const errorMsg = `Invalid DEV_FEE_WALLET format: ${devWalletAddress}. Must be a valid Solana public key (44 characters, base58 encoded).`;
      console.error(`[AirdropChecker] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    this.devFeePercentage = parseFloat(process.env.DEV_FEE_PERCENTAGE || '0.10');
    if (this.devFeePercentage < 0 || this.devFeePercentage > 1) {
      console.warn('[AirdropChecker] Invalid DEV_FEE_PERCENTAGE, using default 10%');
      this.devFeePercentage = 0.10;
    }
  }
  
  async checkAllAirdrops(): Promise<AirdropInfo[]> {
    if (!this.userPublicKey) {
      console.error('[AirdropChecker] Invalid userPublicKey: public key is required');
      return [];
    }

    console.log(`[AirdropChecker] Checking all airdrops for wallet: ${this.userPublicKey.toString().slice(0, 8)}...`);
    const airdrops: AirdropInfo[] = [];
    
    try {
      // Load cached eligibility from database first
      const cachedEligibility = await db.getAirdropEligibility(this.userPublicKey.toString());
      
      // Check if cache is still valid (less than 1 hour old)
      const cacheValidityHours = 1;
      const validCached = cachedEligibility.filter(entry => {
        const hoursSinceCheck = (Date.now() - new Date(entry.checked_at).getTime()) / (1000 * 60 * 60);
        return hoursSinceCheck < cacheValidityHours;
      });
      
      // If we have valid cached data, use it and mark as verified
      if (validCached.length > 0) {
        console.log(`[AirdropChecker] Using ${validCached.length} cached eligibility entries`);
        for (const cached of validCached) {
          if (cached.is_eligible && !cached.claimed) {
            airdrops.push({
              protocol: cached.protocol,
              tokenMint: cached.token_mint,
              amount: parseFloat(cached.amount),
              claimable: this.isWithinClaimWindow(cached.claim_start_time, cached.claim_deadline),
              claimed: cached.claimed,
              claimDeadline: cached.claim_deadline ? new Date(cached.claim_deadline) : undefined,
              claimStartTime: cached.claim_start_time ? new Date(cached.claim_start_time) : undefined,
              merkleProof: cached.merkle_proof ? JSON.parse(cached.merkle_proof) : undefined,
              claimIndex: cached.claim_index,
              onChainVerified: true,
              eligibilityReason: 'Cached from database',
            });
          }
        }
      }
      
      // Check Jupiter airdrop
      const jupiterAirdrop = await this.checkJupiterAirdrop();
      if (jupiterAirdrop) {
        console.log('[AirdropChecker] Found Jupiter airdrop');
        airdrops.push(jupiterAirdrop);
        // Cache in database
        await this.cacheEligibility(jupiterAirdrop);
      }
      
      // Check Jito airdrop
      const jitoAirdrop = await this.checkJitoAirdrop();
      if (jitoAirdrop) {
        console.log('[AirdropChecker] Found Jito airdrop');
        airdrops.push(jitoAirdrop);
        await this.cacheEligibility(jitoAirdrop);
      }
      
      // Check Pyth airdrop
      const pythAirdrop = await this.checkPythAirdrop();
      if (pythAirdrop) {
        console.log('[AirdropChecker] Found Pyth airdrop');
        airdrops.push(pythAirdrop);
        await this.cacheEligibility(pythAirdrop);
      }
      
      // Check Kamino airdrop
      const kaminoAirdrop = await this.checkKaminoAirdrop();
      if (kaminoAirdrop) {
        console.log('[AirdropChecker] Found Kamino airdrop');
        airdrops.push(kaminoAirdrop);
        await this.cacheEligibility(kaminoAirdrop);
      }
      
      // Check Marginfi airdrop
      const marginfiAirdrop = await this.checkMarginfiAirdrop();
      if (marginfiAirdrop) {
        console.log('[AirdropChecker] Found Marginfi airdrop');
        airdrops.push(marginfiAirdrop);
        await this.cacheEligibility(marginfiAirdrop);
      }
      
      // Check GXQ ecosystem airdrops
      const gxqAirdrops = await this.checkGXQEcosystemAirdrops();
      if (gxqAirdrops.length > 0) {
        console.log(`[AirdropChecker] Found ${gxqAirdrops.length} GXQ ecosystem airdrops`);
      }
      airdrops.push(...gxqAirdrops);
      
      // Verify on-chain for all unclaimed airdrops
      for (const airdrop of airdrops) {
        if (!airdrop.claimed && !airdrop.onChainVerified) {
          await this.verifyOnChain(airdrop);
        }
      }
      
      console.log(`[AirdropChecker] Total airdrops found: ${airdrops.length}`);
      return airdrops;
    } catch (error) {
      console.error('[AirdropChecker] Error checking airdrops:', error);
      return airdrops; // Return partial results
    }
  }
  
  /**
   * Check if current time is within claim window
   */
  private isWithinClaimWindow(startTime?: Date, endTime?: Date): boolean {
    const now = new Date();
    
    if (startTime && now < startTime) {
      return false; // Claim period hasn't started
    }
    
    if (endTime && now > endTime) {
      return false; // Claim period has ended
    }
    
    return true;
  }
  
  /**
   * Cache eligibility in database
   */
  private async cacheEligibility(airdrop: AirdropInfo): Promise<void> {
    try {
      await db.upsertAirdropEligibility({
        walletAddress: this.userPublicKey.toString(),
        protocol: airdrop.protocol,
        isEligible: airdrop.claimable,
        amount: airdrop.amount,
        tokenMint: airdrop.tokenMint,
        claimed: airdrop.claimed,
        claimDeadline: airdrop.claimDeadline,
        claimStartTime: airdrop.claimStartTime,
        merkleProof: airdrop.merkleProof ? JSON.stringify(airdrop.merkleProof) : undefined,
        claimIndex: airdrop.claimIndex,
      });
    } catch (error) {
      console.error(`[AirdropChecker] Failed to cache eligibility for ${airdrop.protocol}:`, error);
    }
  }
  
  /**
   * Verify airdrop eligibility on-chain
   */
  private async verifyOnChain(airdrop: AirdropInfo): Promise<void> {
    try {
      // Check if user has already claimed by checking token balance
      const tokenMintPubkey = new PublicKey(airdrop.tokenMint);
      const ata = await getAssociatedTokenAddress(
        tokenMintPubkey,
        this.userPublicKey
      );
      
      const accountInfo = await this.connection.getAccountInfo(ata);
      
      if (accountInfo) {
        // Account exists, check if it has balance (might be claimed)
        const tokenBalance = await this.connection.getTokenAccountBalance(ata);
        if (tokenBalance.value.uiAmount && tokenBalance.value.uiAmount > 0) {
          console.log(`[AirdropChecker] ${airdrop.protocol} might be claimed - wallet has ${tokenBalance.value.uiAmount} tokens`);
          airdrop.claimed = true;
        }
      }
      
      airdrop.onChainVerified = true;
    } catch (error) {
      console.error(`[AirdropChecker] On-chain verification failed for ${airdrop.protocol}:`, error);
      airdrop.onChainVerified = false;
    }
  }
  
  private async checkJupiterAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log('[AirdropChecker] Checking Jupiter airdrop eligibility...');
      
      const response = await axios.get(
        `https://worker.jup.ag/jup-claim-proof/${this.userPublicKey.toString()}`
      );
      
      if (response.data && response.data.amount) {
        console.log(`[AirdropChecker] Jupiter airdrop found: ${response.data.amount}`);
        return {
          protocol: 'Jupiter',
          tokenMint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
          amount: response.data.amount,
          claimable: true,
          claimed: false,
        };
      }
      
      console.log('[AirdropChecker] No Jupiter airdrop available');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log('[AirdropChecker] No Jupiter airdrop found (404)');
        } else {
          console.error('[AirdropChecker] Jupiter airdrop check failed:', {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error('[AirdropChecker] Unexpected Jupiter airdrop check error:', error);
      }
    }
    return null;
  }
  
  private async checkJitoAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log('[AirdropChecker] Checking Jito airdrop eligibility...');
      
      const response = await axios.get(
        `https://kek.jito.network/api/v1/airdrop_allocation/${this.userPublicKey.toString()}`
      );
      
      if (response.data && response.data.allocation) {
        console.log(`[AirdropChecker] Jito airdrop found: ${response.data.allocation}`);
        return {
          protocol: 'Jito',
          tokenMint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
          amount: response.data.allocation,
          claimable: true,
          claimed: false,
        };
      }
      
      console.log('[AirdropChecker] No Jito airdrop available');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log('[AirdropChecker] No Jito airdrop found (404)');
        } else {
          console.error('[AirdropChecker] Jito airdrop check failed:', {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error('[AirdropChecker] Unexpected Jito airdrop check error:', error);
      }
    }
    return null;
  }
  
  private async checkPythAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log('[AirdropChecker] Checking Pyth airdrop eligibility...');
      
      // Pyth Network uses a merkle tree distribution system
      // Check if wallet is eligible via their API
      const response = await axios.get(
        `https://airdrop-api.pyth.network/allocation/${this.userPublicKey.toString()}`,
        { timeout: 5000 }
      );
      
      if (response.data && response.data.amount) {
        console.log(`[AirdropChecker] Pyth airdrop found: ${response.data.amount}`);
        return {
          protocol: 'Pyth',
          tokenMint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
          amount: response.data.amount,
          claimable: true,
          claimed: false,
        };
      }
      
      console.log('[AirdropChecker] No Pyth airdrop available');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log('[AirdropChecker] No Pyth airdrop found (404)');
        } else {
          console.error('[AirdropChecker] Pyth airdrop check failed:', {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error('[AirdropChecker] Unexpected Pyth airdrop check error:', error);
      }
    }
    return null;
  }
  
  private async checkKaminoAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log('[AirdropChecker] Checking Kamino airdrop eligibility...');
      
      // Kamino Finance airdrop check via their API
      const response = await axios.get(
        `https://api.kamino.finance/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 5000 }
      );
      
      if (response.data && response.data.allocation) {
        console.log(`[AirdropChecker] Kamino airdrop found: ${response.data.allocation}`);
        return {
          protocol: 'Kamino',
          tokenMint: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
          amount: response.data.allocation,
          claimable: true,
          claimed: false,
        };
      }
      
      console.log('[AirdropChecker] No Kamino airdrop available');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log('[AirdropChecker] No Kamino airdrop found (404)');
        } else {
          console.error('[AirdropChecker] Kamino airdrop check failed:', {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error('[AirdropChecker] Unexpected Kamino airdrop check error:', error);
      }
    }
    return null;
  }
  
  private async checkMarginfiAirdrop(): Promise<AirdropInfo | null> {
    try {
      console.log('[AirdropChecker] Checking Marginfi airdrop eligibility...');
      
      // Marginfi airdrop check via their API
      const response = await axios.get(
        `https://api.marginfi.com/airdrop/${this.userPublicKey.toString()}`,
        { timeout: 5000 }
      );
      
      if (response.data && response.data.amount) {
        console.log(`[AirdropChecker] Marginfi airdrop found: ${response.data.amount}`);
        return {
          protocol: 'Marginfi',
          tokenMint: 'MRGNVbWdbHSqXVVPNXzZmJmr3LvGRwVv9VCYDRGNxVW',
          amount: response.data.amount,
          claimable: true,
          claimed: false,
        };
      }
      
      console.log('[AirdropChecker] No Marginfi airdrop available');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log('[AirdropChecker] No Marginfi airdrop found (404)');
        } else {
          console.error('[AirdropChecker] Marginfi airdrop check failed:', {
            status: error.response?.status,
            message: error.message,
          });
        }
      } else {
        console.error('[AirdropChecker] Unexpected Marginfi airdrop check error:', error);
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
  
  async claimAirdrop(airdrop: AirdropInfo, userKeypair: Keypair): Promise<ClaimResult> {
    try {
      console.log(`[AirdropChecker] Claiming ${airdrop.protocol} airdrop...`);
      
      // Check claim window
      if (!this.isWithinClaimWindow(airdrop.claimStartTime, airdrop.claimDeadline)) {
        return {
          success: false,
          error: 'Claim window is not active',
        };
      }
      
      // Log claim attempt in database
      const claimRecord = await db.insertAirdropClaim({
        walletAddress: this.userPublicKey.toString(),
        protocol: airdrop.protocol,
        amount: airdrop.amount,
        tokenMint: airdrop.tokenMint,
        status: 'pending',
        donationAmount: airdrop.amount * this.devFeePercentage,
        devWallet: this.devWallet.toString(),
      });
      
      const claimId = claimRecord.rows[0].id;
      
      let result: ClaimResult;
      
      switch (airdrop.protocol) {
        case 'Jupiter':
          result = await this.claimJupiterAirdrop(userKeypair, airdrop, claimId);
          break;
        case 'Jito':
          result = await this.claimJitoAirdrop(userKeypair, airdrop, claimId);
          break;
        case 'Pyth':
          result = await this.claimPythAirdrop(userKeypair, airdrop, claimId);
          break;
        case 'Kamino':
          result = await this.claimKaminoAirdrop(userKeypair, airdrop, claimId);
          break;
        case 'Marginfi':
          result = await this.claimMarginfiAirdrop(userKeypair, airdrop, claimId);
          break;
        default:
          result = {
            success: false,
            error: `Unknown protocol: ${airdrop.protocol}`,
          };
      }
      
      // Update claim status in database
      await db.updateAirdropClaimStatus(claimId, {
        status: result.success ? 'success' : 'failed',
        transactionSignature: result.signature,
        errorMessage: result.error,
      });
      
      // If successful, handle donation
      if (result.success && result.signature) {
        try {
          const donationSig = await this.sendDonation(userKeypair, airdrop);
          result.donationSignature = donationSig;
          console.log(`[AirdropChecker] Donation sent: ${donationSig}`);
        } catch (donationError) {
          console.error('[AirdropChecker] Donation failed:', donationError);
          // Don't fail the whole claim if donation fails
        }
        
        // Update eligibility to mark as claimed
        await db.upsertAirdropEligibility({
          walletAddress: this.userPublicKey.toString(),
          protocol: airdrop.protocol,
          isEligible: true,
          amount: airdrop.amount,
          tokenMint: airdrop.tokenMint,
          claimed: true,
        });
      }
      
      result.claimId = claimId;
      return result;
    } catch (error) {
      console.error(`[AirdropChecker] Error claiming ${airdrop.protocol} airdrop:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Send donation to dev wallet (10% of claimed amount)
   */
  private async sendDonation(userKeypair: Keypair, airdrop: AirdropInfo): Promise<string> {
    const donationAmount = Math.floor(airdrop.amount * this.devFeePercentage);
    
    if (donationAmount === 0) {
      console.log('[AirdropChecker] Donation amount too small, skipping');
      return '';
    }
    
    const tokenMintPubkey = new PublicKey(airdrop.tokenMint);
    
    // Get source and destination token accounts
    const sourceAta = await getAssociatedTokenAddress(
      tokenMintPubkey,
      this.userPublicKey
    );
    
    const destAta = await getAssociatedTokenAddress(
      tokenMintPubkey,
      this.devWallet
    );
    
    // Check if destination account exists
    const destAccountInfo = await this.connection.getAccountInfo(destAta);
    
    const transaction = new Transaction();
    
    // Create destination account if it doesn't exist
    if (!destAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.userPublicKey,
          destAta,
          this.devWallet,
          tokenMintPubkey
        )
      );
    }
    
    // Add transfer instruction
    const { createTransferInstruction } = await import('@solana/spl-token');
    transaction.add(
      createTransferInstruction(
        sourceAta,
        destAta,
        this.userPublicKey,
        donationAmount
      )
    );
    
    // Send transaction
    const signature = await this.connection.sendTransaction(transaction, [userKeypair]);
    await this.connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`[AirdropChecker] Donated ${donationAmount} tokens to ${this.devWallet.toString()}`);
    
    return signature;
  }
  
  private async claimJupiterAirdrop(userKeypair: Keypair, airdrop: AirdropInfo, claimId: string): Promise<ClaimResult> {
    try {
      console.log('[AirdropChecker] Claiming Jupiter airdrop...');
      
      // Jupiter uses a merkle distributor program
      // This is a placeholder - actual implementation would need Jupiter's SDK
      // For now, simulate the claim
      
      if (!airdrop.merkleProof || airdrop.claimIndex === undefined) {
        return {
          success: false,
          error: 'Missing merkle proof or claim index',
        };
      }
      
      // In production, this would:
      // 1. Create claim instruction using Jupiter's merkle distributor
      // 2. Build transaction with proper accounts
      // 3. Sign and send transaction
      // 4. Wait for confirmation
      
      console.log('[AirdropChecker] Jupiter claim would execute here with merkle proof');
      console.log(`[AirdropChecker] Claim index: ${airdrop.claimIndex}`);
      
      // Return placeholder for now - actual implementation needed
      return {
        success: false,
        error: 'Jupiter claim implementation pending - requires Jupiter SDK integration',
      };
    } catch (error) {
      console.error('[AirdropChecker] Jupiter claim error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async claimJitoAirdrop(userKeypair: Keypair, airdrop: AirdropInfo, claimId: string): Promise<ClaimResult> {
    try {
      console.log('[AirdropChecker] Claiming Jito airdrop...');
      
      // Jito uses a merkle distributor similar to Jupiter
      if (!airdrop.merkleProof || airdrop.claimIndex === undefined) {
        return {
          success: false,
          error: 'Missing merkle proof or claim index',
        };
      }
      
      console.log('[AirdropChecker] Jito claim would execute here with merkle proof');
      
      return {
        success: false,
        error: 'Jito claim implementation pending - requires Jito SDK integration',
      };
    } catch (error) {
      console.error('[AirdropChecker] Jito claim error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async claimPythAirdrop(userKeypair: Keypair, airdrop: AirdropInfo, claimId: string): Promise<ClaimResult> {
    try {
      console.log('[AirdropChecker] Claiming Pyth airdrop...');
      
      if (!airdrop.merkleProof || airdrop.claimIndex === undefined) {
        return {
          success: false,
          error: 'Missing merkle proof or claim index',
        };
      }
      
      console.log('[AirdropChecker] Pyth claim would execute here with merkle proof');
      
      return {
        success: false,
        error: 'Pyth claim implementation pending - requires Pyth SDK integration',
      };
    } catch (error) {
      console.error('[AirdropChecker] Pyth claim error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async claimKaminoAirdrop(userKeypair: Keypair, airdrop: AirdropInfo, claimId: string): Promise<ClaimResult> {
    try {
      console.log('[AirdropChecker] Claiming Kamino airdrop...');
      
      if (!airdrop.merkleProof || airdrop.claimIndex === undefined) {
        return {
          success: false,
          error: 'Missing merkle proof or claim index',
        };
      }
      
      console.log('[AirdropChecker] Kamino claim would execute here with merkle proof');
      
      return {
        success: false,
        error: 'Kamino claim implementation pending - requires Kamino SDK integration',
      };
    } catch (error) {
      console.error('[AirdropChecker] Kamino claim error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async claimMarginfiAirdrop(userKeypair: Keypair, airdrop: AirdropInfo, claimId: string): Promise<ClaimResult> {
    try {
      console.log('[AirdropChecker] Claiming Marginfi airdrop...');
      
      if (!airdrop.merkleProof || airdrop.claimIndex === undefined) {
        return {
          success: false,
          error: 'Missing merkle proof or claim index',
        };
      }
      
      console.log('[AirdropChecker] Marginfi claim would execute here with merkle proof');
      
      return {
        success: false,
        error: 'Marginfi claim implementation pending - requires Marginfi SDK integration',
      };
    } catch (error) {
      console.error('[AirdropChecker] Marginfi claim error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async autoClaimAll(userKeypair: Keypair): Promise<Map<string, ClaimResult>> {
    const results = new Map<string, ClaimResult>();
    const airdrops = await this.checkAllAirdrops();
    
    for (const airdrop of airdrops) {
      if (airdrop.claimable && !airdrop.claimed) {
        console.log(`[AirdropChecker] Auto-claiming ${airdrop.protocol}...`);
        const result = await this.claimAirdrop(airdrop, userKeypair);
        results.set(airdrop.protocol, result);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`[AirdropChecker] Skipping ${airdrop.protocol} - not claimable or already claimed`);
      }
    }
    
    return results;
  }
}
