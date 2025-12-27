/**
 * Oracle Service
 *
 * Coordinates multiple intelligence agents to provide comprehensive
 * pre-execution analysis for bot transactions.
 */

import { AgentRegistry } from "./AgentRegistry.js";
import { RBACService } from "../rbac.js";
import {
  AnalysisContext,
  AnalysisResult,
  AgentType,
  IntelligenceAgent,
} from "./types.js";

export interface OracleAnalysisResult {
  overallRecommendation: "PROCEED" | "ABORT" | "ADJUST";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  agentResults: AnalysisResult[];
  reasoning: string;
  adjustments?: Record<string, any>;
  abortReasons?: string[];
  timestamp: Date;
}

export interface OracleServiceConfig {
  enabledAgentTypes: AgentType[];
  requireAllAgents: boolean; // If true, all enabled agents must pass for PROCEED
  parallelExecution: boolean; // Execute agents in parallel vs sequential
}

/**
 * Oracle Service for coordinating intelligence agents
 */
export class OracleService {
  private registry: AgentRegistry;
  private config: OracleServiceConfig;

  constructor(rbacService: RBACService, config?: Partial<OracleServiceConfig>) {
    this.registry = new AgentRegistry(rbacService);
    this.config = {
      enabledAgentTypes: config?.enabledAgentTypes ?? [
        "STRATEGY",
        "RISK",
        "LIQUIDITY",
        "EXECUTION",
        "PROFIT_OPTIMIZATION",
      ],
      requireAllAgents: config?.requireAllAgents ?? false,
      parallelExecution: config?.parallelExecution ?? true,
    };

    console.log("✅ Oracle Service initialized with config:", this.config);
  }

  /**
   * Get the agent registry
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  /**
   * Perform comprehensive pre-execution analysis
   */
  async analyzeExecution(
    context: AnalysisContext,
  ): Promise<OracleAnalysisResult> {
    const startTime = Date.now();

    try {
      // Get active agents of enabled types
      const activeAgents = this.getActiveEnabledAgents();

      if (activeAgents.length === 0) {
        console.warn("⚠️ No active intelligence agents available for analysis");
        return {
          overallRecommendation: "PROCEED",
          confidence: "LOW",
          agentResults: [],
          reasoning:
            "No intelligence agents active - proceeding with default parameters",
          timestamp: new Date(),
        };
      }

      console.log(
        `🔍 Starting intelligence analysis with ${activeAgents.length} agents...`,
      );

      // Execute agent analyses
      const agentResults = this.config.parallelExecution
        ? await this.executeAgentsParallel(activeAgents, context)
        : await this.executeAgentsSequential(activeAgents, context);

      // Aggregate results
      const aggregated = this.aggregateResults(agentResults);

      const duration = Date.now() - startTime;
      console.log(
        `✅ Intelligence analysis completed in ${duration}ms - Recommendation: ${aggregated.overallRecommendation}`,
      );

      return aggregated;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Oracle Service analysis failed:", error);

      return {
        overallRecommendation: "ABORT",
        confidence: "HIGH",
        agentResults: [],
        reasoning: `Intelligence analysis failed: ${errorMsg}`,
        abortReasons: [errorMsg],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get active agents of enabled types
   */
  private getActiveEnabledAgents(): IntelligenceAgent[] {
    const activeAgents = this.registry.getActiveAgents();
    return activeAgents.filter((agent) =>
      this.config.enabledAgentTypes.includes(agent.metadata.type),
    );
  }

  /**
   * Execute agents in parallel
   */
  private async executeAgentsParallel(
    agents: IntelligenceAgent[],
    context: AnalysisContext,
  ): Promise<AnalysisResult[]> {
    const promises = agents.map((agent) => {
      return agent.analyze(context).catch((error) => {
        console.error(`❌ Agent ${agent.metadata.name} failed:`, error);
        return {
          agentId: agent.metadata.id,
          agentType: agent.metadata.type,
          success: false,
          confidence: "LOW" as const,
          recommendation: "ABORT" as const,
          reasoning: `Agent failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
      });
    });

    return await Promise.all(promises);
  }

  /**
   * Execute agents sequentially
   */
  private async executeAgentsSequential(
    agents: IntelligenceAgent[],
    context: AnalysisContext,
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const agent of agents) {
      try {
        const result = await agent.analyze(context);
        results.push(result);

        // If any critical agent (RISK) says ABORT, stop early
        if (
          agent.metadata.type === "RISK" &&
          result.recommendation === "ABORT"
        ) {
          console.log(
            `⚠️ Risk agent aborted execution - stopping analysis early`,
          );
          break;
        }
      } catch (error) {
        console.error(`❌ Agent ${agent.metadata.name} failed:`, error);
        results.push({
          agentId: agent.metadata.id,
          agentType: agent.metadata.type,
          success: false,
          confidence: "LOW",
          recommendation: "ABORT",
          reasoning: `Agent failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Aggregate results from all agents
   */
  private aggregateResults(results: AnalysisResult[]): OracleAnalysisResult {
    const abortResults = results.filter((r) => r.recommendation === "ABORT");
    const adjustResults = results.filter((r) => r.recommendation === "ADJUST");
    const proceedResults = results.filter(
      (r) => r.recommendation === "PROCEED",
    );

    // Critical: If Risk agent says ABORT, we must abort
    const riskAgent = results.find((r) => r.agentType === "RISK");
    if (riskAgent && riskAgent.recommendation === "ABORT") {
      return {
        overallRecommendation: "ABORT",
        confidence: "HIGH",
        agentResults: results,
        reasoning: `Risk agent blocked execution: ${riskAgent.reasoning}`,
        abortReasons: [riskAgent.reasoning],
        timestamp: new Date(),
      };
    }

    // If any agent says ABORT and we require all agents, abort
    if (abortResults.length > 0 && this.config.requireAllAgents) {
      return {
        overallRecommendation: "ABORT",
        confidence: "HIGH",
        agentResults: results,
        reasoning: `${abortResults.length} agent(s) recommend ABORT`,
        abortReasons: abortResults.map((r) => `${r.agentType}: ${r.reasoning}`),
        timestamp: new Date(),
      };
    }

    // If multiple agents say ABORT (>50%), abort
    if (abortResults.length > results.length / 2) {
      return {
        overallRecommendation: "ABORT",
        confidence: "HIGH",
        agentResults: results,
        reasoning: `Majority of agents (${abortResults.length}/${results.length}) recommend ABORT`,
        abortReasons: abortResults.map((r) => `${r.agentType}: ${r.reasoning}`),
        timestamp: new Date(),
      };
    }

    // If any agent suggests adjustments, aggregate them
    if (adjustResults.length > 0) {
      const aggregatedAdjustments = this.mergeAdjustments(adjustResults);

      return {
        overallRecommendation: "ADJUST",
        confidence: this.calculateOverallConfidence(results),
        agentResults: results,
        reasoning: this.buildReasoningText(results, "ADJUST"),
        adjustments: aggregatedAdjustments,
        timestamp: new Date(),
      };
    }

    // All agents say proceed
    return {
      overallRecommendation: "PROCEED",
      confidence: this.calculateOverallConfidence(results),
      agentResults: results,
      reasoning: this.buildReasoningText(results, "PROCEED"),
      timestamp: new Date(),
    };
  }

  /**
   * Merge adjustments from multiple agents
   */
  private mergeAdjustments(results: AnalysisResult[]): Record<string, any> {
    const merged: Record<string, any> = {};

    for (const result of results) {
      if (result.adjustments) {
        Object.assign(merged, result.adjustments);
      }
    }

    return merged;
  }

  /**
   * Calculate overall confidence from agent results
   */
  private calculateOverallConfidence(
    results: AnalysisResult[],
  ): "HIGH" | "MEDIUM" | "LOW" {
    const confidenceScores = results.map((r) => {
      switch (r.confidence) {
        case "HIGH":
          return 3;
        case "MEDIUM":
          return 2;
        case "LOW":
          return 1;
        default:
          return 0;
      }
    });

    const avgScore =
      confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

    if (avgScore >= 2.5) return "HIGH";
    if (avgScore >= 1.5) return "MEDIUM";
    return "LOW";
  }

  /**
   * Build reasoning text from agent results
   */
  private buildReasoningText(
    results: AnalysisResult[],
    recommendation: "PROCEED" | "ABORT" | "ADJUST",
  ): string {
    const lines = [
      `Overall recommendation: ${recommendation}`,
      `Analyzed by ${results.length} intelligence agent(s):`,
      "",
    ];

    for (const result of results) {
      lines.push(
        `${result.agentType} (${result.confidence} confidence): ${result.recommendation}`,
      );
      lines.push(`  ${result.reasoning.split("\n")[0]}`);
    }

    return lines.join("\n");
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<OracleServiceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("✅ Oracle Service configuration updated:", config);
  }

  /**
   * Get current configuration
   */
  getConfig(): OracleServiceConfig {
    return { ...this.config };
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return this.registry.getStats();
  }
}
