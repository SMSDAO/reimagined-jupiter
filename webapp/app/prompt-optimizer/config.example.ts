/**
 * Example configuration for PromptOptimizer
 * Copy this file to config.ts and customize for your needs
 */

export const promptOptimizerConfig = {
  // AI Model Configuration
  ai: {
    provider: "openai", // 'openai' | 'anthropic' | 'local'
    model: "gpt-4",
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
    maxTokens: 2000,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  },

  // Optimization Settings
  optimization: {
    minPromptLength: 20,
    maxPromptLength: 4000,
    targetClarityScore: 80,
    targetSpecificityScore: 80,
    enableAutoOptimization: true,
  },

  // DeFi Integration Settings
  defi: {
    defaultRpcUrl:
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com",
    supportedDexes: [
      "Raydium",
      "Orca",
      "Jupiter",
      "Serum",
      "Lifinity",
      "Meteora",
      "Phoenix",
      "OpenBook",
    ],
    supportedFlashLoanProviders: [
      { name: "Marginfi", fee: 0.0009 },
      { name: "Solend", fee: 0.001 },
      { name: "Kamino", fee: 0.0012 },
      { name: "Mango", fee: 0.0015 },
      { name: "Port Finance", fee: 0.002 },
    ],
    defaultMinProfitThreshold: 0.005, // 0.5%
    defaultMaxSlippage: 0.015, // 1.5%
    defaultGasBuffer: 1.5,
  },

  // Strategy Settings
  strategies: {
    enableHighRiskStrategies: false,
    autoEnableRecommendedStrategies: false,
    minStrategyScore: 50,
    maxActiveStrategies: 5,
  },

  // UI Settings
  ui: {
    defaultTab: "dashboard" as
      | "dashboard"
      | "editor"
      | "templates"
      | "strategies",
    enableAnimations: true,
    showAdvancedMetrics: true,
    autoSavePrompts: true,
    autoSaveInterval: 30000, // 30 seconds
  },

  // Feature Flags
  features: {
    enableTemplateCreation: true,
    enableStrategyCustomization: true,
    enableRealTimeOptimization: true,
    enableCostEstimation: true,
    enableHistoricalAnalysis: false, // Coming soon
  },
};

export type PromptOptimizerConfig = typeof promptOptimizerConfig;
