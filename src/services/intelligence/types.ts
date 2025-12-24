/**
 * Intelligence Agent Framework Types
 * 
 * Defines the core interfaces and types for the Oracle-driven intelligence layer.
 */

export type AgentType = 
  | 'STRATEGY' 
  | 'RISK' 
  | 'LIQUIDITY' 
  | 'EXECUTION' 
  | 'PROFIT_OPTIMIZATION';

export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'ERROR';

export type AnalysisConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Agent metadata for identification and management
 */
export interface AgentMetadata {
  id: string;
  name: string;
  version: string;
  type: AgentType;
  author: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Analysis result from an intelligence agent
 */
export interface AnalysisResult {
  agentId: string;
  agentType: AgentType;
  success: boolean;
  confidence: AnalysisConfidence;
  recommendation: 'PROCEED' | 'ABORT' | 'ADJUST';
  reasoning: string;
  adjustments?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Context passed to intelligence agents for analysis
 */
export interface AnalysisContext {
  // Bot execution context
  botId: string;
  userId: string;
  executionId: string;
  botType: string;
  
  // Transaction details
  inputToken?: string;
  outputToken?: string;
  amountIn?: number;
  expectedAmountOut?: number;
  
  // Route information
  route?: any;
  pools?: any[];
  
  // Market conditions
  marketData?: {
    volatility?: number;
    liquidity?: number;
    priceImpact?: number;
    slippage?: number;
  };
  
  // Risk parameters
  riskParams?: {
    maxSlippage: number;
    maxPriceImpact: number;
    maxLoss: number;
    minProfit: number;
  };
  
  // Execution parameters
  executionParams?: {
    priorityFee?: number;
    computeUnits?: number;
    jitoTipLamports?: number;
    rpcEndpoint?: string;
  };
  
  // Additional context
  [key: string]: any;
}

/**
 * Base interface for all intelligence agents
 */
export interface IntelligenceAgent {
  /**
   * Agent metadata
   */
  readonly metadata: AgentMetadata;
  
  /**
   * Current status of the agent
   */
  status: AgentStatus;
  
  /**
   * Analyze the given context and return recommendations
   */
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
  
  /**
   * Initialize the agent (setup connections, load models, etc.)
   */
  initialize(): Promise<void>;
  
  /**
   * Cleanup resources when agent is disabled
   */
  cleanup(): Promise<void>;
  
  /**
   * Health check for the agent
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
}

/**
 * Agent activation request
 */
export interface AgentActivationRequest {
  agentId: string;
  requestedBy: string;
  reason: string;
  configuration?: Record<string, any>;
  timestamp: Date;
}

/**
 * Agent activation approval
 */
export interface AgentActivationApproval {
  requestId: string;
  agentId: string;
  approvedBy: string;
  approved: boolean;
  reason?: string;
  timestamp: Date;
}
