import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/approvals
 * Get all pending approvals
 */
export async function GET(request: NextRequest) {
  try {
    // In production, this would:
    // 1. Verify the user is authenticated
    // 2. Check they have ADMIN or SUPER_ADMIN role
    // 3. Query the pending_approvals table
    // 4. Return the results

    // Mock data for now
    const mockApprovals = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        transactionHash: "abc123def456...",
        transactionType: "PROGRAM_DEPLOYMENT",
        valueAtRisk: 2.5,
        targetProgramId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
        description: "Deploy new trading program v2.0",
        instructionsCount: 3,
        requestedBy: "123e4567-e89b-12d3-a456-426614174000",
        requestedByUsername: "admin_user",
        status: "PENDING",
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        expiresAt: new Date(Date.now() + 82800000).toISOString(), // 23 hours from now
      },
    ];

    return NextResponse.json({
      success: true,
      approvals: mockApprovals,
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/approvals
 * Create a new pending approval request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serializedTransaction,
      transactionType,
      valueAtRisk,
      targetProgramId,
      description,
      instructionsCount,
      requestReason,
    } = body;

    // Validate input
    if (
      !serializedTransaction ||
      !transactionType ||
      valueAtRisk === undefined ||
      !instructionsCount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    // In production, this would:
    // 1. Verify the user is authenticated
    // 2. Call approvalService.createApprovalRequest()
    // 3. Store in database
    // 4. Send notification to SUPER_ADMINs
    // 5. Return the created approval

    const approvalId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      approvalId,
      message: "Approval request created successfully",
    });
  } catch (error) {
    console.error("Error creating approval request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
