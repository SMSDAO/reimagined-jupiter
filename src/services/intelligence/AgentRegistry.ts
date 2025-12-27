/**
 * Agent Registry
 *
 * Manages intelligence agents as hot-swappable plugins with admin approval requirements.
 */

import crypto from "crypto";
import { RBACService } from "../rbac.js";
import {
  IntelligenceAgent,
  AgentMetadata,
  AgentStatus,
  AgentType,
  AgentActivationRequest,
  AgentActivationApproval,
} from "./types.js";

/**
 * Agent Registry for managing intelligence agents
 */
export class AgentRegistry {
  private agents = new Map<string, IntelligenceAgent>();
  private activationRequests = new Map<string, AgentActivationRequest>();
  private activationApprovals = new Map<string, AgentActivationApproval>();
  private rbacService: RBACService;

  constructor(rbacService: RBACService) {
    this.rbacService = rbacService;
  }

  /**
   * Register a new intelligence agent
   */
  async registerAgent(agent: IntelligenceAgent): Promise<void> {
    const agentId = agent.metadata.id;

    if (this.agents.has(agentId)) {
      throw new Error(`Agent with id ${agentId} is already registered`);
    }

    // Set initial status to pending approval
    agent.status = "PENDING_APPROVAL";
    this.agents.set(agentId, agent);

    console.log(
      `📝 Agent registered: ${agent.metadata.name} (${agentId}) - Status: PENDING_APPROVAL`,
    );
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    // Cleanup agent resources
    await agent.cleanup();

    this.agents.delete(agentId);
    this.activationRequests.delete(agentId);
    this.activationApprovals.delete(agentId);

    console.log(`🗑️ Agent unregistered: ${agentId}`);
  }

  /**
   * Request activation of an agent (requires admin approval)
   */
  async requestActivation(
    agentId: string,
    requestedBy: string,
    reason: string,
    configuration?: Record<string, any>,
  ): Promise<string> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const requestId = crypto.randomUUID();
    const request: AgentActivationRequest = {
      agentId,
      requestedBy,
      reason,
      configuration,
      timestamp: new Date(),
    };

    this.activationRequests.set(requestId, request);

    console.log(
      `📋 Activation request created: ${requestId} for agent ${agent.metadata.name} by ${requestedBy}`,
    );

    return requestId;
  }

  /**
   * Approve or reject agent activation (admin only)
   */
  async approveActivation(
    requestId: string,
    approvedBy: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    // Check if approver has admin permissions
    const hasPermission = await this.rbacService.hasPermission(
      approvedBy,
      "ADMIN",
      "APPROVE",
    );

    if (!hasPermission) {
      throw new Error(
        `User ${approvedBy} does not have permission to approve agent activation`,
      );
    }

    const request = this.activationRequests.get(requestId);

    if (!request) {
      throw new Error(`Activation request ${requestId} not found`);
    }

    const agent = this.agents.get(request.agentId);

    if (!agent) {
      throw new Error(`Agent ${request.agentId} not found`);
    }

    const approval: AgentActivationApproval = {
      requestId,
      agentId: request.agentId,
      approvedBy,
      approved,
      reason,
      timestamp: new Date(),
    };

    this.activationApprovals.set(requestId, approval);

    if (approved) {
      // Initialize and activate the agent
      try {
        await agent.initialize();
        agent.status = "ACTIVE";
        console.log(
          `✅ Agent activated: ${agent.metadata.name} (${request.agentId})`,
        );
      } catch (error) {
        agent.status = "ERROR";
        console.error(`❌ Failed to activate agent ${request.agentId}:`, error);
        throw error;
      }
    } else {
      agent.status = "INACTIVE";
      console.log(
        `❌ Agent activation rejected: ${agent.metadata.name} (${request.agentId})`,
      );
    }

    // Remove the request after processing
    this.activationRequests.delete(requestId);
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): IntelligenceAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentType): IntelligenceAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.metadata.type === type,
    );
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): IntelligenceAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.status === "ACTIVE",
    );
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): IntelligenceAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get pending activation requests
   */
  getPendingRequests(): AgentActivationRequest[] {
    return Array.from(this.activationRequests.values());
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    if (agent.status === "ACTIVE") {
      await agent.cleanup();
      agent.status = "INACTIVE";
      console.log(`⏸️ Agent deactivated: ${agent.metadata.name} (${agentId})`);
    }
  }

  /**
   * Perform health check on all active agents
   */
  async healthCheckAll(): Promise<
    Map<string, { healthy: boolean; error?: string }>
  > {
    const results = new Map<string, { healthy: boolean; error?: string }>();
    const activeAgents = this.getActiveAgents();

    for (const agent of activeAgents) {
      try {
        const health = await agent.healthCheck();
        results.set(agent.metadata.id, health);

        // Update agent status if unhealthy
        if (!health.healthy) {
          agent.status = "ERROR";
          console.warn(
            `⚠️ Agent health check failed: ${agent.metadata.name} - ${health.error}`,
          );
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.set(agent.metadata.id, { healthy: false, error: errorMsg });
        agent.status = "ERROR";
        console.error(
          `❌ Agent health check error: ${agent.metadata.name}`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    error: number;
    byType: Record<AgentType, number>;
  } {
    const agents = this.getAllAgents();
    const stats = {
      total: agents.length,
      active: 0,
      inactive: 0,
      pending: 0,
      error: 0,
      byType: {
        STRATEGY: 0,
        RISK: 0,
        LIQUIDITY: 0,
        EXECUTION: 0,
        PROFIT_OPTIMIZATION: 0,
      } as Record<AgentType, number>,
    };

    for (const agent of agents) {
      switch (agent.status) {
        case "ACTIVE":
          stats.active++;
          break;
        case "INACTIVE":
          stats.inactive++;
          break;
        case "PENDING_APPROVAL":
          stats.pending++;
          break;
        case "ERROR":
          stats.error++;
          break;
      }

      stats.byType[agent.metadata.type]++;
    }

    return stats;
  }
}
