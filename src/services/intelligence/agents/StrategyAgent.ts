/**
 * Strategy Agent
 *
 * Uses Gemini-powered reasoning to identify complex triangular or multi-hop routes
 * beyond simple heuristics.
 */

import {
  IntelligenceAgent,
  AgentMetadata,
  AgentStatus,
  AnalysisContext,
  AnalysisResult,
} from "../types.js";
import { GeminiBackend } from "../GeminiBackend.js";

export class StrategyAgent implements IntelligenceAgent {
  readonly metadata: AgentMetadata;
  status: AgentStatus = "INACTIVE";
  private geminiBackend: GeminiBackend | null = null;
  private config: { apiKey: string };

  constructor(config: { apiKey: string }) {
    this.config = config;
    this.metadata = {
      id: "strategy-agent-v1",
      name: "Strategy Intelligence Agent",
      version: "1.0.0",
      type: "STRATEGY",
      author: "GXQ STUDIO",
      description:
        "Uses Gemini-powered reasoning to identify optimal arbitrage routes with complex multi-hop analysis",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error("Gemini API key is required for Strategy Agent");
    }

    this.geminiBackend = new GeminiBackend({
      apiKey: this.config.apiKey,
      model: "gemini-pro",
      temperature: 0.3,
      maxTokens: 2048,
    });

    // Verify connection
    const health = await this.geminiBackend.healthCheck();
    if (!health.healthy) {
      throw new Error(`Failed to initialize Gemini backend: ${health.error}`);
    }

    this.status = "ACTIVE";
    console.log("✅ Strategy Agent initialized");
  }

  async cleanup(): Promise<void> {
    this.geminiBackend = null;
    this.status = "INACTIVE";
    console.log("🗑️ Strategy Agent cleaned up");
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.geminiBackend) {
      return { healthy: false, error: "Gemini backend not initialized" };
    }

    return await this.geminiBackend.healthCheck();
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    if (!this.geminiBackend) {
      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: false,
        confidence: "LOW",
        recommendation: "ABORT",
        reasoning: "Strategy agent not initialized",
        timestamp: new Date(),
      };
    }

    try {
      // Prepare analysis context for LLM
      const analysisData = {
        route: context.route || {},
        marketData: context.marketData || {},
        riskParams: context.riskParams || {},
        botType: context.botType,
        tokens: {
          input: context.inputToken,
          output: context.outputToken,
        },
        amounts: {
          input: context.amountIn,
          expectedOutput: context.expectedAmountOut,
        },
      };

      // Use Gemini to analyze the strategy
      const llmAnalysis =
        await this.geminiBackend.analyzeArbitrage(analysisData);

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: llmAnalysis.recommendation !== "ABORT",
        confidence: llmAnalysis.confidence,
        recommendation: llmAnalysis.recommendation,
        reasoning: llmAnalysis.reasoning,
        adjustments: llmAnalysis.adjustments,
        metadata: {
          llmModel: "gemini-pro",
          analysisTimestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Strategy Agent analysis failed:", error);

      return {
        agentId: this.metadata.id,
        agentType: this.metadata.type,
        success: false,
        confidence: "LOW",
        recommendation: "ABORT",
        reasoning: `Strategy analysis failed: ${errorMsg}`,
        timestamp: new Date(),
      };
    }
  }
}
