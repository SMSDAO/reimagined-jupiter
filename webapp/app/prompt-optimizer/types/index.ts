/**
 * Type definitions for PromptOptimizer
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: "arbitrage" | "defi" | "trading" | "analysis" | "general";
  template: string;
  variables: PromptVariable[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface PromptVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface OptimizationResult {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  score: number;
  improvements: string[];
  timestamp: Date;
  metrics: OptimizationMetrics;
}

export interface OptimizationMetrics {
  clarity: number;
  specificity: number;
  effectiveness: number;
  tokenCount: number;
  estimatedCost: number;
}

export interface ArbitrageStrategy {
  id: string;
  name: string;
  description: string;
  prompt: string;
  parameters: StrategyParameters;
  expectedProfit: number;
  riskLevel: "low" | "medium" | "high";
  enabled: boolean;
}

export interface StrategyParameters {
  minProfitThreshold: number;
  maxSlippage: number;
  tokens: string[];
  dexes: string[];
  flashLoanProvider?: string;
}

export interface PromptOptimizationConfig {
  aiModel: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface OptimizationHistory {
  id: string;
  promptId: string;
  results: OptimizationResult[];
  createdAt: Date;
}
