/**
 * Approval Service - Manages dual-approval workflow for critical operations
 *
 * Features:
 * - Create pending approval requests for critical transactions
 * - Enforce SUPER_ADMIN approval requirement
 * - Track approval status and audit trail
 * - Handle transaction execution after approval
 * - Automatic expiration of old pending approvals
 */

import crypto from "crypto";
import { rbacService, RBACService } from "./rbac.js";

export interface PendingApproval {
  id: string;
  transactionHash: string;
  serializedTransaction: string;
  transactionType:
    | "PROGRAM_DEPLOYMENT"
    | "PROGRAM_UPGRADE"
    | "AUTHORITY_TRANSFER"
    | "CONFIG_UPDATE"
    | "CRITICAL_OPERATION";
  valueAtRisk: number;
  targetProgramId?: string;
  description?: string;
  instructionsCount: number;
  requestedBy: string;
  requestedByUsername: string;
  requestReason?: string;
  approvedBy?: string;
  approvedByUsername?: string;
  approvalSignature?: string;
  approvalReason?: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTED"
    | "FAILED"
    | "EXPIRED";
  executed: boolean;
  executionSignature?: string;
  executionError?: string;
  createdAt: Date;
  approvedAt?: Date;
  executedAt?: Date;
  expiresAt: Date;
}

export interface CreateApprovalRequest {
  serializedTransaction: string;
  transactionType: PendingApproval["transactionType"];
  valueAtRisk: number;
  targetProgramId?: string;
  description?: string;
  instructionsCount: number;
  requestedBy: string;
  requestedByUsername: string;
  requestReason?: string;
  expiresInHours?: number; // Default 24 hours
}

export interface ApprovalDecision {
  approvalId: string;
  approvedBy: string;
  approvedByUsername: string;
  approved: boolean; // true = approved, false = rejected
  reason?: string;
  signature?: string; // Digital signature for approval
}

/**
 * Approval Service Class
 */
export class ApprovalService {
  private rbac: RBACService;

  constructor(rbacService: RBACService) {
    this.rbac = rbacService;
  }

  /**
   * Create a new pending approval request
   * This should be called before any critical transaction is executed
   */
  async createApprovalRequest(
    request: CreateApprovalRequest,
  ): Promise<PendingApproval> {
    // Generate transaction hash for deduplication
    const transactionHash = crypto
      .createHash("sha256")
      .update(request.serializedTransaction)
      .digest("hex");

    // Check for duplicate request
    const existing = await this.getApprovalByTransactionHash(transactionHash);
    if (existing && existing.status === "PENDING") {
      console.log(
        `⚠️  Duplicate approval request detected: ${transactionHash}`,
      );
      return existing;
    }

    // Calculate expiration time (default 24 hours)
    const expiresInHours = request.expiresInHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const approval: PendingApproval = {
      id: crypto.randomUUID(),
      transactionHash,
      serializedTransaction: request.serializedTransaction,
      transactionType: request.transactionType,
      valueAtRisk: request.valueAtRisk,
      targetProgramId: request.targetProgramId,
      description: request.description,
      instructionsCount: request.instructionsCount,
      requestedBy: request.requestedBy,
      requestedByUsername: request.requestedByUsername,
      requestReason: request.requestReason,
      status: "PENDING",
      executed: false,
      createdAt: new Date(),
      expiresAt,
    };

    // In production, insert into database
    // INSERT INTO pending_approvals (...) VALUES (...)

    console.log(`📝 Approval request created: ${approval.id}`);
    console.log(`   Transaction Type: ${approval.transactionType}`);
    console.log(`   Value at Risk: ${approval.valueAtRisk.toFixed(4)} SOL`);
    console.log(`   Requested By: ${approval.requestedByUsername}`);
    console.log(`   Expires At: ${approval.expiresAt.toISOString()}`);

    // Audit log
    await this.rbac.auditAction(
      request.requestedBy,
      request.requestedByUsername,
      "APPROVAL_REQUEST_CREATED",
      "PENDING_APPROVAL",
      {
        resourceId: approval.id,
        newValue: {
          transactionType: approval.transactionType,
          valueAtRisk: approval.valueAtRisk,
          targetProgramId: approval.targetProgramId,
        },
        success: true,
      },
    );

    return approval;
  }

  /**
   * Approve or reject a pending approval request
   * Requires SUPER_ADMIN permission
   */
  async processApproval(decision: ApprovalDecision): Promise<PendingApproval> {
    // Verify approver has SUPER_ADMIN role
    const hasPermission = await this.rbac.hasPermission(
      decision.approvedBy,
      "ADMIN",
      "APPROVE",
    );

    if (!hasPermission) {
      throw new Error(
        "Permission denied: SUPER_ADMIN role required to approve transactions",
      );
    }

    // Get pending approval
    const approval = await this.getApprovalById(decision.approvalId);
    if (!approval) {
      throw new Error(`Approval request not found: ${decision.approvalId}`);
    }

    // Validate status
    if (approval.status !== "PENDING") {
      throw new Error(`Approval request is not pending: ${approval.status}`);
    }

    // Check expiration
    if (approval.expiresAt < new Date()) {
      approval.status = "EXPIRED";
      await this.updateApproval(approval);
      throw new Error("Approval request has expired");
    }

    // Prevent self-approval
    if (approval.requestedBy === decision.approvedBy) {
      throw new Error("Cannot approve your own request");
    }

    // Update approval
    approval.approvedBy = decision.approvedBy;
    approval.approvedByUsername = decision.approvedByUsername;
    approval.approvalReason = decision.reason;
    approval.approvalSignature = decision.signature;
    approval.status = decision.approved ? "APPROVED" : "REJECTED";
    approval.approvedAt = new Date();

    // In production, update database
    // UPDATE pending_approvals SET ... WHERE id = $1
    await this.updateApproval(approval);

    console.log(
      `${decision.approved ? "✅" : "❌"} Approval ${decision.approved ? "granted" : "rejected"}: ${approval.id}`,
    );
    console.log(`   Approved By: ${approval.approvedByUsername}`);
    console.log(`   Transaction Type: ${approval.transactionType}`);
    console.log(`   Value at Risk: ${approval.valueAtRisk.toFixed(4)} SOL`);

    // Audit log
    await this.rbac.auditAction(
      decision.approvedBy,
      decision.approvedByUsername,
      decision.approved ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
      "PENDING_APPROVAL",
      {
        resourceId: approval.id,
        oldValue: { status: "PENDING" },
        newValue: {
          status: approval.status,
          approvedBy: approval.approvedByUsername,
          reason: decision.reason,
        },
        success: true,
      },
    );

    return approval;
  }

  /**
   * Mark an approval as executed
   * This should be called after the transaction has been broadcast
   */
  async markAsExecuted(
    approvalId: string,
    signature: string,
    error?: string,
  ): Promise<PendingApproval> {
    const approval = await this.getApprovalById(approvalId);
    if (!approval) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    if (approval.status !== "APPROVED") {
      throw new Error(
        `Cannot execute non-approved request: ${approval.status}`,
      );
    }

    approval.executed = true;
    approval.executionSignature = signature;
    approval.executedAt = new Date();
    approval.status = error ? "FAILED" : "EXECUTED";
    approval.executionError = error;

    // In production, update database
    await this.updateApproval(approval);

    console.log(`${error ? "❌" : "✅"} Approval executed: ${approval.id}`);
    console.log(`   Signature: ${signature}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }

    // Audit log
    await this.rbac.auditAction(
      approval.requestedBy,
      approval.requestedByUsername,
      "APPROVAL_EXECUTED",
      "PENDING_APPROVAL",
      {
        resourceId: approval.id,
        newValue: {
          status: approval.status,
          signature,
          error,
        },
        success: !error,
        errorMessage: error,
      },
    );

    return approval;
  }

  /**
   * Get pending approval by ID
   */
  async getApprovalById(id: string): Promise<PendingApproval | null> {
    // In production, query database
    // SELECT * FROM pending_approvals WHERE id = $1

    // Placeholder for now
    return null;
  }

  /**
   * Get pending approval by transaction hash
   */
  async getApprovalByTransactionHash(
    transactionHash: string,
  ): Promise<PendingApproval | null> {
    // In production, query database
    // SELECT * FROM pending_approvals WHERE transaction_hash = $1

    // Placeholder for now
    return null;
  }

  /**
   * Get all pending approvals
   */
  async getPendingApprovals(limit: number = 50): Promise<PendingApproval[]> {
    // In production, query database
    // SELECT * FROM pending_approvals WHERE status = 'PENDING' ORDER BY created_at DESC LIMIT $1

    // Placeholder for now
    return [];
  }

  /**
   * Get approvals for a specific user
   */
  async getApprovalsForUser(
    userId: string,
    statuses?: PendingApproval["status"][],
  ): Promise<PendingApproval[]> {
    // In production, query database with status filter
    // SELECT * FROM pending_approvals WHERE requested_by = $1 AND status = ANY($2) ORDER BY created_at DESC

    // Placeholder for now
    return [];
  }

  /**
   * Update approval in database
   */
  private async updateApproval(approval: PendingApproval): Promise<void> {
    // In production, update database
    // UPDATE pending_approvals SET ... WHERE id = $1
    console.log(`💾 Approval updated: ${approval.id}`);
  }

  /**
   * Expire old pending approvals
   * Should be run periodically (e.g., cron job)
   */
  async expireOldApprovals(): Promise<number> {
    // In production, update database
    // UPDATE pending_approvals SET status = 'EXPIRED' WHERE status = 'PENDING' AND expires_at < NOW()

    console.log("🧹 Expired old pending approvals");
    return 0; // Return count of expired approvals
  }

  /**
   * Check if a transaction requires approval
   * Based on transaction type and risk level
   */
  requiresApproval(
    transactionType: PendingApproval["transactionType"],
    valueAtRisk: number,
  ): boolean {
    // Critical operations always require approval
    const criticalTypes: PendingApproval["transactionType"][] = [
      "PROGRAM_DEPLOYMENT",
      "PROGRAM_UPGRADE",
      "AUTHORITY_TRANSFER",
      "CRITICAL_OPERATION",
    ];

    if (criticalTypes.includes(transactionType)) {
      return true;
    }

    // High-value operations require approval (> 1 SOL at risk)
    if (valueAtRisk > 1.0) {
      return true;
    }

    return false;
  }
}

/**
 * Global approval service instance
 */
export const approvalService = new ApprovalService(rbacService);

export default {
  ApprovalService,
  approvalService,
};
