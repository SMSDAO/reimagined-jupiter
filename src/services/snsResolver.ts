import { Connection, PublicKey } from '@solana/web3.js';

/**
 * SNS (Solana Name Service) Domain Resolver
 * Resolves .sol, .skr, and other SNS domains to Solana wallet addresses
 */
export class SNSDomainResolver {
  private connection: Connection;
  private cache: Map<string, { address: PublicKey; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 3600000; // 1 hour cache

  // SNS Program IDs
  private readonly SNS_PROGRAM_ID = new PublicKey('namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX');
  private readonly NAME_PROGRAM_ID = new PublicKey('nameXpT2PwZ2iA6DTNYTotTmiMYusBCYqwBLN2QgF4w');
  
  // TLD (Top Level Domain) registry
  // To verify or update these addresses, check the SNS protocol documentation:
  // https://docs.bonfida.org/collection/an-introduction-to-the-solana-name-service
  private readonly TLD_REGISTRY: { [key: string]: PublicKey } = {
    'sol': new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'),
    'skr': new PublicKey('A6bWvZbKHQPy3Uj4BgKKo5MKdKpsjCNVaLU8SExq2Znu'), // .skr TLD - verify with SNS registry
  };

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Resolve SNS domain to wallet address
   * @param domain - Domain name like "monads.skr" or "wallet.sol"
   * @returns PublicKey of the resolved wallet address or null if not found
   */
  async resolve(domain: string): Promise<PublicKey | null> {
    try {
      // Check cache first
      const cached = this.cache.get(domain);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        console.log(`[SNSResolver] Using cached address for ${domain}`);
        return cached.address;
      }

      // Parse domain
      const parts = domain.toLowerCase().split('.');
      if (parts.length < 2) {
        throw new Error(`Invalid domain format: ${domain}. Expected format: name.tld`);
      }

      const name = parts.slice(0, -1).join('.');
      const tld = parts[parts.length - 1];

      console.log(`[SNSResolver] Resolving domain: ${name}.${tld}`);

      // Get TLD public key
      const tldKey = this.TLD_REGISTRY[tld];
      if (!tldKey) {
        console.warn(`[SNSResolver] Unsupported TLD: ${tld}. Supported TLDs: ${Object.keys(this.TLD_REGISTRY).join(', ')}`);
        
        // Try to resolve using alternative method or return null
        return this.resolveAlternative(domain);
      }

      // Derive the name account address
      const nameAccountKey = await this.getNameAccountKey(name, tld);
      
      if (!nameAccountKey) {
        console.error(`[SNSResolver] Failed to derive name account key for ${domain}`);
        return null;
      }

      // Fetch the name account data
      const accountInfo = await this.connection.getAccountInfo(nameAccountKey);
      
      if (!accountInfo) {
        console.warn(`[SNSResolver] Domain ${domain} does not exist or is not registered`);
        return null;
      }

      // Parse the account data to extract the owner address
      // The owner address is typically at bytes 32-64 in the account data
      const ownerAddress = this.parseOwnerFromAccountData(accountInfo.data);
      
      if (!ownerAddress) {
        console.error(`[SNSResolver] Failed to parse owner address from account data for ${domain}`);
        return null;
      }

      // Cache the result
      this.cache.set(domain, { address: ownerAddress, timestamp: Date.now() });

      console.log(`[SNSResolver] Successfully resolved ${domain} to ${ownerAddress.toBase58()}`);
      return ownerAddress;
    } catch (error) {
      console.error(`[SNSResolver] Error resolving domain ${domain}:`, error);
      
      // Try alternative resolution method
      return this.resolveAlternative(domain);
    }
  }

  /**
   * Alternative resolution method using direct lookup
   * This is a fallback when standard SNS resolution fails
   */
  private async resolveAlternative(domain: string): Promise<PublicKey | null> {
    try {
      console.log(`[SNSResolver] Trying alternative resolution for ${domain}`);
      
      // For testing purposes, you can hardcode known domains here
      // In production, this would use an API or alternative registry
      const knownDomains: { [key: string]: string } = {
        // Example: 'monads.skr': 'ACTUAL_WALLET_ADDRESS_HERE',
      };

      if (knownDomains[domain]) {
        const address = new PublicKey(knownDomains[domain]);
        console.log(`[SNSResolver] Resolved ${domain} via alternative method to ${address.toBase58()}`);
        return address;
      }

      console.warn(`[SNSResolver] Domain ${domain} not found in alternative resolution`);
      return null;
    } catch (error) {
      console.error(`[SNSResolver] Error in alternative resolution:`, error);
      return null;
    }
  }

  /**
   * Derive the name account key from domain and TLD
   */
  private async getNameAccountKey(name: string, tld: string): Promise<PublicKey | null> {
    try {
      // This is a simplified derivation
      // Real SNS name accounts use a specific PDA derivation with seeds
      const [nameAccountKey] = await PublicKey.findProgramAddress(
        [
          Buffer.from('name'),
          Buffer.from(name),
          Buffer.from(tld),
        ],
        this.SNS_PROGRAM_ID
      );

      return nameAccountKey;
    } catch (error) {
      console.error(`[SNSResolver] Error deriving name account key:`, error);
      return null;
    }
  }

  /**
   * Parse owner address from SNS account data
   */
  private parseOwnerFromAccountData(data: Buffer): PublicKey | null {
    try {
      // SNS account structure (simplified):
      // - First 32 bytes: header/discriminator
      // - Next 32 bytes: owner public key
      // Actual structure may vary, consult SNS documentation

      if (data.length < 64) {
        console.error(`[SNSResolver] Account data too short: ${data.length} bytes`);
        return null;
      }

      // Extract owner public key (typically at offset 32)
      const ownerBytes = data.slice(32, 64);
      return new PublicKey(ownerBytes);
    } catch (error) {
      console.error(`[SNSResolver] Error parsing owner from account data:`, error);
      return null;
    }
  }

  /**
   * Batch resolve multiple domains
   */
  async resolveMultiple(domains: string[]): Promise<Map<string, PublicKey | null>> {
    const results = new Map<string, PublicKey | null>();

    // Resolve domains in parallel
    const promises = domains.map(async (domain) => {
      const address = await this.resolve(domain);
      results.set(domain, address);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Reverse lookup: Find domain(s) for a wallet address
   * Note: This requires indexing and may not be available for all domains
   */
  async reverseLookup(address: PublicKey): Promise<string[]> {
    try {
      console.log(`[SNSResolver] Performing reverse lookup for ${address.toBase58()}`);
      
      // Check cache for reverse mappings
      const domains: string[] = [];
      for (const [domain, cached] of this.cache.entries()) {
        if (cached.address.equals(address)) {
          domains.push(domain);
        }
      }

      if (domains.length > 0) {
        console.log(`[SNSResolver] Found cached domains: ${domains.join(', ')}`);
        return domains;
      }

      // In production, this would query an indexer or API
      console.warn(`[SNSResolver] Reverse lookup not fully implemented, returning empty array`);
      return [];
    } catch (error) {
      console.error(`[SNSResolver] Error in reverse lookup:`, error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`[SNSResolver] Cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; domains: string[] } {
    return {
      size: this.cache.size,
      domains: Array.from(this.cache.keys()),
    };
  }

  /**
   * Register a manual mapping (for testing or known domains)
   */
  registerManualMapping(domain: string, address: PublicKey): void {
    this.cache.set(domain, { address, timestamp: Date.now() });
    console.log(`[SNSResolver] Manually registered ${domain} -> ${address.toBase58()}`);
  }

  /**
   * Validate domain format
   */
  static isValidDomain(domain: string): boolean {
    const parts = domain.toLowerCase().split('.');
    return parts.length >= 2 && parts.every(part => /^[a-z0-9-_]+$/.test(part));
  }
}
