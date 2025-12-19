import { 
  Connection, 
  ConnectionConfig, 
  Commitment,
  Transaction,
  VersionedTransaction,
  PublicKey,
  Keypair,
  SendOptions,
  TransactionSignature,
  SimulateTransactionConfig,
} from '@solana/web3.js';
import { getRPCEndpoints } from '../config/api-endpoints';

export interface RpcEndpoint {
  url: string;
  weight: number;
  isHealthy: boolean;
  lastChecked: number;
  failureCount: number;
}

export interface ResilientConnectionConfig {
  endpoints: string[];
  commitment?: Commitment;
  confirmTransactionInitialTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
}

/**
 * ResilientSolanaConnection - A production-ready Solana connection with automatic failover
 * 
 * Features:
 * - Multiple RPC endpoint support with automatic fallback
 * - Health checking and monitoring
 * - Exponential backoff retry logic
 * - Priority fee calculation
 * - Connection pooling
 */
export class ResilientSolanaConnection {
  private endpoints: RpcEndpoint[];
  private currentEndpointIndex: number = 0;
  private commitment: Commitment;
  private confirmTransactionInitialTimeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private healthCheckInterval: number;
  private connection: Connection;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: ResilientConnectionConfig) {
    this.endpoints = config.endpoints.map((url, index) => ({
      url,
      weight: 1,
      isHealthy: true,
      lastChecked: 0,
      failureCount: 0,
    }));

    this.commitment = config.commitment || 'confirmed';
    this.confirmTransactionInitialTimeout = config.confirmTransactionInitialTimeout || 60000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.healthCheckInterval = config.healthCheckInterval || 30000;

    // Initialize connection with first endpoint
    this.connection = this.createConnection(this.endpoints[0].url);

    // Start health checking
    this.startHealthChecking();
  }

  /**
   * Create a new Connection instance
   */
  private createConnection(url: string): Connection {
    const connectionConfig: ConnectionConfig = {
      commitment: this.commitment,
      confirmTransactionInitialTimeout: this.confirmTransactionInitialTimeout,
    };

    return new Connection(url, connectionConfig);
  }

  /**
   * Get the current active connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get current RPC endpoint URL
   */
  getCurrentEndpoint(): string {
    return this.endpoints[this.currentEndpointIndex].url;
  }

  /**
   * Switch to next healthy endpoint
   */
  private switchToNextEndpoint(): boolean {
    const startIndex = this.currentEndpointIndex;
    let attempts = 0;

    while (attempts < this.endpoints.length) {
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
      const endpoint = this.endpoints[this.currentEndpointIndex];

      if (endpoint.isHealthy && endpoint.failureCount < 3) {
        console.log(`🔄 Switching to RPC endpoint: ${endpoint.url}`);
        this.connection = this.createConnection(endpoint.url);
        return true;
      }

      attempts++;
      if (this.currentEndpointIndex === startIndex) {
        break;
      }
    }

    console.error('❌ No healthy RPC endpoints available');
    return false;
  }

  /**
   * Mark current endpoint as failed and switch to next
   */
  private handleEndpointFailure(): void {
    const endpoint = this.endpoints[this.currentEndpointIndex];
    endpoint.failureCount++;
    endpoint.isHealthy = endpoint.failureCount < 3;

    console.warn(`⚠️  RPC endpoint failure count: ${endpoint.failureCount} for ${endpoint.url}`);

    this.switchToNextEndpoint();
  }

  /**
   * Execute a function with automatic retry and failover
   */
  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Executing ${operationName} (attempt ${attempt}/${this.maxRetries})`);
        const result = await operation(this.connection);
        
        // Reset failure count on success
        this.endpoints[this.currentEndpointIndex].failureCount = 0;
        this.endpoints[this.currentEndpointIndex].isHealthy = true;
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${this.maxRetries}):`, lastError.message);

        // Handle endpoint failure
        this.handleEndpointFailure();

        // Wait before retry with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Check health of an endpoint
   */
  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<boolean> {
    try {
      const connection = this.createConnection(endpoint.url);
      const slot = await Promise.race([
        connection.getSlot(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);

      endpoint.isHealthy = slot > 0;
      endpoint.lastChecked = Date.now();
      
      if (endpoint.isHealthy && endpoint.failureCount > 0) {
        endpoint.failureCount = Math.max(0, endpoint.failureCount - 1);
      }

      return endpoint.isHealthy;
    } catch (error) {
      endpoint.isHealthy = false;
      endpoint.lastChecked = Date.now();
      return false;
    }
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      console.log('🏥 Running RPC endpoint health checks...');
      
      await Promise.all(
        this.endpoints.map(endpoint => this.checkEndpointHealth(endpoint))
      );

      const healthyCount = this.endpoints.filter(e => e.isHealthy).length;
      console.log(`✅ Healthy endpoints: ${healthyCount}/${this.endpoints.length}`);
    }, this.healthCheckInterval);
  }

  /**
   * Stop health checking
   */
  stopHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get recent prioritization fees with retry
   */
  async getRecentPrioritizationFees() {
    return this.executeWithRetry(
      (connection) => connection.getRecentPrioritizationFees(),
      'getRecentPrioritizationFees'
    );
  }

  /**
   * Get latest blockhash with retry
   */
  async getLatestBlockhash(commitment?: Commitment) {
    return this.executeWithRetry(
      (connection) => connection.getLatestBlockhash(commitment || this.commitment),
      'getLatestBlockhash'
    );
  }

  /**
   * Get slot with retry
   */
  async getSlot(commitment?: Commitment) {
    return this.executeWithRetry(
      (connection) => connection.getSlot(commitment || this.commitment),
      'getSlot'
    );
  }

  /**
   * Send transaction with retry
   * Supports both legacy Transaction and VersionedTransaction
   */
  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: Keypair[],
    options?: SendOptions
  ): Promise<TransactionSignature> {
    return this.executeWithRetry(
      async (connection) => {
        if (transaction instanceof VersionedTransaction) {
          // VersionedTransaction - no signers array needed
          return await connection.sendTransaction(transaction, options);
        } else {
          // Legacy Transaction - requires signers array
          return await connection.sendTransaction(transaction, signers || [], options);
        }
      },
      'sendTransaction'
    );
  }

  /**
   * Confirm transaction with retry
   */
  async confirmTransaction(
    signature: TransactionSignature | { signature: TransactionSignature; blockhash: string; lastValidBlockHeight: number },
    commitment?: Commitment
  ) {
    return this.executeWithRetry(
      (connection) => {
        if (typeof signature === 'string') {
          return connection.confirmTransaction(signature, commitment || this.commitment);
        } else {
          return connection.confirmTransaction(signature, commitment || this.commitment);
        }
      },
      'confirmTransaction'
    );
  }

  /**
   * Get transaction with retry
   */
  async getTransaction(
    signature: TransactionSignature,
    options?: { commitment?: Commitment; maxSupportedTransactionVersion?: number }
  ) {
    return this.executeWithRetry(
      (connection) => connection.getTransaction(signature, options as any),
      'getTransaction'
    );
  }

  /**
   * Get balance with retry
   */
  async getBalance(publicKey: PublicKey, commitment?: Commitment) {
    return this.executeWithRetry(
      (connection) => connection.getBalance(publicKey, commitment || this.commitment),
      'getBalance'
    );
  }

  /**
   * Simulate transaction with retry
   */
  async simulateTransaction(
    transaction: Transaction | VersionedTransaction,
    options?: SimulateTransactionConfig
  ) {
    return this.executeWithRetry(
      (connection) => {
        if (transaction instanceof VersionedTransaction) {
          return connection.simulateTransaction(transaction, options);
        } else {
          return connection.simulateTransaction(transaction as Transaction);
        }
      },
      'simulateTransaction'
    );
  }

  /**
   * Get endpoint health status
   */
  getEndpointHealth(): RpcEndpoint[] {
    return this.endpoints.map(e => ({ ...e }));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthChecking();
  }
}

/**
 * Create a resilient connection from environment variables
 */
export function createResilientConnection(config?: Partial<ResilientConnectionConfig>): ResilientSolanaConnection {
  const defaultEndpoints = getRPCEndpoints();

  return new ResilientSolanaConnection({
    endpoints: defaultEndpoints,
    commitment: 'confirmed',
    maxRetries: 3,
    retryDelay: 1000,
    healthCheckInterval: 30000,
    ...config,
  });
}
