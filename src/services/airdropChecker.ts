import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import axios from 'axios';

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
      console.error('[AirdropChecker] Invalid userPublicKey: public key is required');
      return [];
    }

    console.log(`[AirdropChecker] Checking all airdrops for wallet: ${this.userPublicKey.toString().slice(0, 8)}...`);
    const airdrops: AirdropInfo[] = [];
    
    try {
      // Check Jupiter airdrop
      const jupiterAirdrop = await this.checkJupiterAirdrop();
      if (jupiterAirdrop) {
        console.log('[AirdropChecker] Found Jupiter airdrop');
        airdrops.push(jupiterAirdrop);
      }
      
      // Check Jito airdrop
      const jitoAirdrop = await this.checkJitoAirdrop();
      if (jitoAirdrop) {
        console.log('[AirdropChecker] Found Jito airdrop');
        airdrops.push(jitoAirdrop);
      }
      
      // Check Pyth airdrop
      const pythAirdrop = await this.checkPythAirdrop();
      if (pythAirdrop) {
        console.log('[AirdropChecker] Found Pyth airdrop');
        airdrops.push(pythAirdrop);
      }
      
      // Check Kamino airdrop
      const kaminoAirdrop = await this.checkKaminoAirdrop();
      if (kaminoAirdrop) {
        console.log('[AirdropChecker] Found Kamino airdrop');
        airdrops.push(kaminoAirdrop);
      }
      
      // Check Marginfi airdrop
      const marginfiAirdrop = await this.checkMarginfiAirdrop();
      if (marginfiAirdrop) {
        console.log('[AirdropChecker] Found Marginfi airdrop');
        airdrops.push(marginfiAirdrop);
      }
      
      // Check GXQ ecosystem airdrops
      const gxqAirdrops = await this.checkGXQEcosystemAirdrops();
      if (gxqAirdrops.length > 0) {
        console.log(`[AirdropChecker] Found ${gxqAirdrops.length} GXQ ecosystem airdrops`);
      }
      airdrops.push(...gxqAirdrops);
      
      console.log(`[AirdropChecker] Total airdrops found: ${airdrops.length}`);
      return airdrops;
    } catch (error) {
      console.error('[AirdropChecker] Error checking airdrops:', error);
      return airdrops; // Return partial results
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
    // Placeholder for Pyth airdrop check
    return null;
  }
  
  private async checkKaminoAirdrop(): Promise<AirdropInfo | null> {
    // Placeholder for Kamino airdrop check
    return null;
  }
  
  private async checkMarginfiAirdrop(): Promise<AirdropInfo | null> {
    // Placeholder for Marginfi airdrop check
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
  
  async claimAirdrop(airdrop: AirdropInfo, userKeypair: Keypair): Promise<string | null> {
    try {
      console.log(`Claiming ${airdrop.protocol} airdrop...`);
      
      switch (airdrop.protocol) {
        case 'Jupiter':
          return await this.claimJupiterAirdrop(userKeypair);
        case 'Jito':
          return await this.claimJitoAirdrop(userKeypair);
        case 'Pyth':
          return await this.claimPythAirdrop(userKeypair);
        case 'Kamino':
          return await this.claimKaminoAirdrop(userKeypair);
        case 'Marginfi':
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
  
  private async claimJupiterAirdrop(_userKeypair: Keypair): Promise<string | null> {
    // Implementation would create and send claim transaction
    console.log('Claiming Jupiter airdrop...');
    return null;
  }
  
  private async claimJitoAirdrop(_userKeypair: Keypair): Promise<string | null> {
    // Implementation would create and send claim transaction
    console.log('Claiming Jito airdrop...');
    return null;
  }
  
  private async claimPythAirdrop(_userKeypair: Keypair): Promise<string | null> {
    console.log('Claiming Pyth airdrop...');
    return null;
  }
  
  private async claimKaminoAirdrop(_userKeypair: Keypair): Promise<string | null> {
    console.log('Claiming Kamino airdrop...');
    return null;
  }
  
  private async claimMarginfiAirdrop(_userKeypair: Keypair): Promise<string | null> {
    console.log('Claiming Marginfi airdrop...');
    return null;
  }
  
  async autoClaimAll(userKeypair: Keypair): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    const airdrops = await this.checkAllAirdrops();
    
    for (const airdrop of airdrops) {
      if (airdrop.claimable && !airdrop.claimed) {
        const signature = await this.claimAirdrop(airdrop, userKeypair);
        results.set(airdrop.protocol, signature);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}
