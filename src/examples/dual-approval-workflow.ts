/**
 * Example: Dual-Approval Deployment Workflow
 *
 * This example demonstrates the complete workflow for deploying a program
 * with dual-approval security enforcement.
 */

import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { TransactionBuilder } from "../../webapp/lib/solana/transaction-builder";
import { ResilientSolanaConnection } from "../../webapp/lib/solana/connection";
import { approvalService } from "../services/approvalService.js";

/**
 * Step 1: Admin prepares a critical transaction (e.g., program deployment)
 */
async function prepareDeploymentTransaction(): Promise<{
  serialized: string;
  simulation: any;
}> {
  console.log("📋 Step 1: Preparing deployment transaction...\n");

  // Initialize connection and builder
  const connection = new ResilientSolanaConnection([
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  ]);
  const builder = new TransactionBuilder(connection);

  // Create a sample deployment transaction
  // In production, this would be a real BPF Loader deployment
  const feePayer = Keypair.generate().publicKey;
  const targetProgram = Keypair.generate().publicKey;

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: feePayer,
      toPubkey: targetProgram,
      lamports: 2_500_000_000, // 2.5 SOL for program deployment
    }),
  ];

  // Build unsigned transaction
  const transaction = await builder.buildTransaction(
    instructions,
    feePayer,
    undefined,
    "high",
  );

  // Run advanced simulation to calculate Value at Risk
  console.log("🔍 Running simulation...");
  const simulation = await builder.simulateTransactionAdvanced(transaction);

  console.log(`✅ Simulation complete:`);
  console.log(`   Value at Risk: ${simulation.valueAtRisk.toFixed(4)} SOL`);
  console.log(`   Target Program: ${simulation.programId || "N/A"}`);
  console.log("");

  // Serialize for offline signing / approval workflow
  const serialized = builder.serializeUnsignedTransaction(transaction);

  console.log(`📦 Transaction serialized (${serialized.base64.length} bytes)`);
  console.log(`   Instructions: ${serialized.instructions.length}`);
  console.log(`   Fee Payer: ${serialized.feePayer}`);
  console.log("");

  return {
    serialized: serialized.base64,
    simulation,
  };
}

/**
 * Step 2: Create approval request (requires admin authentication)
 */
async function requestApproval(
  serializedTx: string,
  simulation: any,
  userId: string,
  username: string,
): Promise<string> {
  console.log("📝 Step 2: Creating approval request...\n");

  // Create approval request
  const approval = await approvalService.createApprovalRequest({
    serializedTransaction: serializedTx,
    transactionType: "PROGRAM_DEPLOYMENT",
    valueAtRisk: simulation.valueAtRisk,
    targetProgramId: simulation.programId,
    description: "Deploy trading program v2.0 to mainnet",
    instructionsCount: 3,
    requestedBy: userId,
    requestedByUsername: username,
    requestReason:
      "New trading algorithm implementation with improved efficiency",
    expiresInHours: 24,
  });

  console.log(`✅ Approval request created:`);
  console.log(`   Approval ID: ${approval.id}`);
  console.log(`   Status: ${approval.status}`);
  console.log(`   Expires: ${approval.expiresAt.toISOString()}`);
  console.log("");
  console.log(`⏳ Waiting for SUPER_ADMIN approval...`);
  console.log("");

  return approval.id;
}

/**
 * Step 3: SUPER_ADMIN reviews and approves (or rejects)
 */
async function processApprovalBySuperAdmin(
  approvalId: string,
  superAdminId: string,
  superAdminUsername: string,
  approve: boolean,
): Promise<void> {
  console.log("👤 Step 3: SUPER_ADMIN review...\n");

  // Process approval decision
  const decision = await approvalService.processApproval({
    approvalId,
    approvedBy: superAdminId,
    approvedByUsername: superAdminUsername,
    approved: approve,
    reason: approve
      ? "Code review completed, security audit passed, deployment approved"
      : "Insufficient testing, requires more validation",
    signature: "digital_signature_here", // In production, would be actual cryptographic signature
  });

  if (approve) {
    console.log(`✅ Transaction APPROVED by ${superAdminUsername}`);
    console.log(`   Status: ${decision.status}`);
    console.log(`   Approved At: ${decision.approvedAt?.toISOString()}`);
  } else {
    console.log(`❌ Transaction REJECTED by ${superAdminUsername}`);
    console.log(`   Reason: ${decision.approvalReason}`);
  }
  console.log("");
}

/**
 * Step 4: Execute approved transaction
 */
async function executeApprovedTransaction(
  approvalId: string,
  serializedTx: string,
): Promise<void> {
  console.log("🚀 Step 4: Executing approved transaction...\n");

  // Initialize connection and builder
  const connection = new ResilientSolanaConnection([
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  ]);
  const builder = new TransactionBuilder(connection);

  // Deserialize transaction
  const serializedData = {
    base64: serializedTx,
    blockhash: "",
    lastValidBlockHeight: 0,
    feePayer: "",
    instructions: [],
  };
  const transaction = builder.deserializeTransaction(serializedData);

  // Sign with appropriate keypairs
  const signers: Keypair[] = []; // In production, would have actual signers

  // Execute with approval enforcement
  console.log("🔒 Enforcing dual-approval at RPC layer...");
  const result = await builder.executeTransaction(
    transaction,
    signers,
    "confirmed",
    false,
    approvalId, // This enforces approval check
  );

  if (result.success) {
    console.log(`✅ Transaction executed successfully!`);
    console.log(`   Signature: ${result.signature}`);
    console.log(`   Compute Units: ${result.computeUnits?.toLocaleString()}`);
    console.log(`   Fee: ${(result.fee! / 1e9).toFixed(6)} SOL`);

    // Mark approval as executed
    await approvalService.markAsExecuted(approvalId, result.signature!);
  } else {
    console.log(`❌ Transaction failed: ${result.error}`);

    // Mark approval as failed
    await approvalService.markAsExecuted(approvalId, "", result.error);
  }
  console.log("");
}

/**
 * Complete workflow demonstration
 */
async function demonstrateWorkflow() {
  console.log("=".repeat(70));
  console.log("🔐 DUAL-APPROVAL DEPLOYMENT WORKFLOW DEMONSTRATION");
  console.log("=".repeat(70));
  console.log("");

  try {
    // Step 1: Prepare transaction
    const { serialized, simulation } = await prepareDeploymentTransaction();

    // Step 2: Request approval
    const approvalId = await requestApproval(
      serialized,
      simulation,
      "user-123",
      "admin_deployer",
    );

    // Step 3: SUPER_ADMIN approves
    await processApprovalBySuperAdmin(
      approvalId,
      "user-456",
      "super_admin_reviewer",
      true, // Set to false to reject
    );

    // Step 4: Execute (only if approved)
    await executeApprovedTransaction(approvalId, serialized);

    console.log("=".repeat(70));
    console.log("✅ WORKFLOW COMPLETE");
    console.log("=".repeat(70));
    console.log("");
    console.log("Security Features Demonstrated:");
    console.log("  ✓ Transaction serialization for offline signing");
    console.log("  ✓ Pre-flight simulation with Value at Risk calculation");
    console.log("  ✓ Dual-approval requirement (no self-approval)");
    console.log("  ✓ SUPER_ADMIN role enforcement");
    console.log("  ✓ Complete audit trail");
    console.log("  ✓ RPC-layer approval verification");
    console.log("");
  } catch (error) {
    console.error("❌ Workflow failed:", error);
  }
}

export {
  prepareDeploymentTransaction,
  requestApproval,
  processApprovalBySuperAdmin,
  executeApprovedTransaction,
  demonstrateWorkflow,
};
