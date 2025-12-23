# Dual-Approval Deployment Pipeline Security

This document describes the security enhancements implemented for the administrative deployment pipeline, ensuring that no single administrator can push critical changes to production without approval.

## Overview

The deployment pipeline now implements a comprehensive dual-approval workflow with the following key features:

1. **Transaction Serialization**: Transactions can be prepared and serialized without immediate signing
2. **Pre-flight Simulation**: Advanced simulation with Value at Risk calculation
3. **Dual-Approval Logic**: SUPER_ADMIN approval required for critical operations
4. **RPC-Layer Enforcement**: Approval verification enforced at transaction broadcast

## Architecture

### Components

#### 1. TransactionBuilder (`webapp/lib/solana/transaction-builder.ts`)

Enhanced with new methods:

- `serializeUnsignedTransaction()`: Converts a transaction to Base64 for offline signing
- `deserializeTransaction()`: Reconstructs a transaction from Base64
- `simulateTransactionAdvanced()`: Runs simulation and calculates Value at Risk
- `executeTransaction()`: Now accepts optional `approvalId` parameter for approval enforcement
- `verifyApproval()`: Private method to verify approval before execution

**Key Features**:
- Offline signing support
- No private key required for transaction preparation
- Automatic risk assessment
- Target program ID extraction for deployments

#### 2. ApprovalService (`src/services/approvalService.ts`)

Manages the approval workflow:

- `createApprovalRequest()`: Creates a new pending approval
- `processApproval()`: SUPER_ADMIN approves or rejects
- `markAsExecuted()`: Records execution result
- `requiresApproval()`: Determines if approval is needed based on risk

**Security Controls**:
- Prevents self-approval
- Enforces SUPER_ADMIN role via RBAC
- Records complete audit trail
- Automatic expiration of old requests

#### 3. Database Schema (`db/schema.sql`)

New `pending_approvals` table:

```sql
CREATE TABLE pending_approvals (
  id UUID PRIMARY KEY,
  transaction_hash VARCHAR(64) UNIQUE NOT NULL,
  serialized_transaction TEXT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  value_at_risk DECIMAL(20, 9) NOT NULL,
  target_program_id VARCHAR(44),
  description TEXT,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status VARCHAR(50) DEFAULT 'PENDING',
  -- ... additional fields
);
```

**Key Fields**:
- `value_at_risk`: Maximum potential loss (SOL)
- `target_program_id`: Deployment/upgrade target
- `status`: PENDING → APPROVED → EXECUTED
- Foreign keys enforce referential integrity

#### 4. UI Components

**SimulationSummary** (`webapp/components/SimulationSummary.tsx`):
- Displays Value at Risk prominently
- Shows target Program ID
- Color-coded risk levels (low/medium/high/critical)
- Approve/Reject actions

**PendingApprovals** (`webapp/components/PendingApprovals.tsx`):
- Lists all pending approvals
- Auto-refreshes every 30 seconds
- Detailed view modal
- Status tracking

#### 5. API Endpoints

**GET /api/admin/approvals**:
- Returns all pending approvals
- Requires authentication

**POST /api/admin/approvals**:
- Creates new approval request
- Validates input

**POST /api/admin/approvals/approve**:
- Processes approval decision
- Enforces SUPER_ADMIN role
- Prevents self-approval

## Workflow

### 1. Transaction Preparation

```typescript
// Admin prepares a deployment transaction
const builder = new TransactionBuilder(connection);
const transaction = await builder.buildTransaction(
  instructions,
  feePayer
);

// Run simulation
const simulation = await builder.simulateTransactionAdvanced(transaction);
console.log(`Value at Risk: ${simulation.valueAtRisk} SOL`);
console.log(`Target Program: ${simulation.programId}`);

// Serialize for approval workflow
const serialized = builder.serializeUnsignedTransaction(transaction);
```

### 2. Approval Request

```typescript
// Create approval request
const approval = await approvalService.createApprovalRequest({
  serializedTransaction: serialized.base64,
  transactionType: 'PROGRAM_DEPLOYMENT',
  valueAtRisk: simulation.valueAtRisk,
  targetProgramId: simulation.programId,
  description: 'Deploy trading program v2.0',
  instructionsCount: transaction.instructions.length,
  requestedBy: userId,
  requestedByUsername: username,
  expiresInHours: 24,
});
```

### 3. SUPER_ADMIN Approval

```typescript
// SUPER_ADMIN reviews and approves
const decision = await approvalService.processApproval({
  approvalId: approval.id,
  approvedBy: superAdminId,
  approvedByUsername: superAdminUsername,
  approved: true,
  reason: 'Security audit passed',
  signature: cryptoSignature,
});
```

### 4. Transaction Execution

```typescript
// Deserialize and execute with approval enforcement
const transaction = builder.deserializeTransaction(serialized);

const result = await builder.executeTransaction(
  transaction,
  signers,
  'confirmed',
  false,
  approvalId // Enforces approval check at RPC layer
);
```

## Security Features

### 1. No Single-Point Failure

- **Separation of Duties**: Requester ≠ Approver
- **Role Enforcement**: Only SUPER_ADMIN can approve
- **Self-Approval Prevention**: Cannot approve your own request

### 2. Value at Risk (VaR) Calculation

Automatic risk assessment based on:
- Balance changes in simulation
- Transaction type (deployments, transfers, etc.)
- Program interactions
- Historical patterns

Risk Levels:
- **Low**: < 1 SOL at risk
- **Medium**: 1-5 SOL at risk
- **High**: 5-10 SOL at risk
- **Critical**: > 10 SOL at risk

### 3. Complete Audit Trail

Every action is logged in `admin_audit_log`:
- Approval request creation
- Approval/rejection decision
- Transaction execution
- All include user ID, timestamp, and reason

### 4. Automatic Expiration

- Default: 24 hours
- Configurable per request
- Automatic cleanup via `expire_old_pending_approvals()` function

### 5. RPC-Layer Enforcement

Approval verification happens at the lowest level:
```typescript
// In executeTransaction()
if (approvalId) {
  const approvalValid = await this.verifyApproval(approvalId, transaction);
  if (!approvalValid) {
    return { success: false, error: 'Approval required' };
  }
}
```

This prevents bypassing via alternative code paths.

## RBAC Integration

### Permissions

New permission added:
```sql
INSERT INTO permissions (name, resource, action, description) VALUES
  ('admin.approve', 'ADMIN', 'APPROVE', 'Approve pending deployment transactions');
```

### Role Assignment

Only SUPER_ADMIN role has `admin.approve` permission:
```sql
-- Assigned in role_permissions table
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'SUPER_ADMIN'),
  id
FROM permissions
WHERE name = 'admin.approve';
```

## Database Views

### pending_approvals_view

Joins approval data with user and role information:
```sql
CREATE OR REPLACE VIEW pending_approvals_view AS
SELECT 
    pa.id,
    pa.transaction_type,
    pa.value_at_risk,
    pa.requested_by_username,
    pa.approved_by_username,
    pa.status,
    req_role.name as requester_role,
    appr_role.name as approver_role
FROM pending_approvals pa
LEFT JOIN user_roles ur_req ON pa.requested_by = ur_req.user_id
LEFT JOIN roles req_role ON ur_req.role_id = req_role.id
WHERE pa.status IN ('PENDING', 'APPROVED');
```

## UI Integration

### Admin Panel

The admin panel (`webapp/app/admin/page.tsx`) now includes:

1. **Pending Approvals Section**: 
   - Shown at the top of the page
   - Badge showing pending count
   - Auto-refresh every 30 seconds

2. **Simulation Modal**:
   - Triggered on "View Details" click
   - Full-screen overlay with simulation results
   - Approve/Reject buttons for SUPER_ADMINs

3. **Status Colors**:
   - Yellow: PENDING
   - Green: APPROVED
   - Red: REJECTED
   - Blue: EXECUTED
   - Gray: EXPIRED/FAILED

## Example Usage

See `src/examples/dual-approval-workflow.ts` for a complete working example.

### Quick Start

```bash
# Run the example workflow
npm run ts-node src/examples/dual-approval-workflow.ts
```

This demonstrates:
1. Transaction preparation
2. Approval request creation
3. SUPER_ADMIN approval
4. Transaction execution with enforcement

## API Reference

### TransactionBuilder

#### serializeUnsignedTransaction(transaction: Transaction): SerializedTransaction
Converts a transaction to Base64 format for offline signing.

**Returns**:
```typescript
{
  base64: string;           // Serialized transaction
  blockhash: string;        // Recent blockhash
  lastValidBlockHeight: number;
  feePayer: string;         // Fee payer public key
  instructions: Array<{     // Instruction details for audit
    programId: string;
    accounts: Array<...>;
    data: string;
  }>;
}
```

#### deserializeTransaction(serialized: SerializedTransaction): Transaction
Reconstructs a transaction from Base64.

#### simulateTransactionAdvanced(transaction: Transaction): Promise<SimulationResult>
Runs advanced simulation with risk calculation.

**Returns**:
```typescript
{
  success: boolean;
  valueAtRisk: number;      // SOL at risk
  programId?: string;       // Target program (deployments)
  logs?: string[];          // Simulation logs
  balanceChanges?: Array<{  // Expected balance changes
    account: string;
    before: number;
    after: number;
    delta: number;
  }>;
}
```

### ApprovalService

#### createApprovalRequest(request: CreateApprovalRequest): Promise<PendingApproval>
Creates a new approval request.

#### processApproval(decision: ApprovalDecision): Promise<PendingApproval>
Processes approval/rejection by SUPER_ADMIN.

#### markAsExecuted(approvalId: string, signature: string, error?: string): Promise<PendingApproval>
Records execution result.

## Production Deployment

### Prerequisites

1. PostgreSQL database with schema applied
2. RBAC configured with SUPER_ADMIN role
3. Environment variables set:
   - `DATABASE_URL`
   - `SOLANA_RPC_URL`
   - `JWT_SECRET`

### Configuration

```env
# Approval settings
APPROVAL_DEFAULT_EXPIRY_HOURS=24
APPROVAL_MIN_RISK_THRESHOLD=1.0  # SOL
APPROVAL_AUTO_EXPIRE_CRON=0 */6 * * *  # Every 6 hours
```

### Monitoring

Set up alerts for:
- Pending approvals > 24 hours old
- Failed executions
- Rejected approvals (review patterns)
- Self-approval attempts (should never happen)

### Backup Strategy

Always backup before critical deployments:
```bash
pg_dump -t pending_approvals > backup-$(date +%Y%m%d).sql
```

## Security Considerations

### What This Protects Against

✅ Rogue admin deploying malicious code
✅ Accidental deployment of untested code
✅ Single point of compromise
✅ Lack of audit trail
✅ Unclear risk assessment

### What This Doesn't Protect Against

❌ Collusion between requester and approver (requires additional controls)
❌ Compromised SUPER_ADMIN account (requires MFA, IP whitelisting)
❌ Database tampering (requires database-level security)
❌ Code vulnerabilities in the deployment itself (requires code review)

### Additional Recommendations

1. **Multi-Factor Authentication**: Require MFA for SUPER_ADMIN accounts
2. **IP Whitelisting**: Restrict approval actions to known IPs
3. **Time-Based Restrictions**: No approvals outside business hours
4. **Code Review**: Require code review before approval request
5. **Staged Rollout**: Deploy to testnet first, then mainnet
6. **Rollback Plan**: Always have a rollback strategy

## Troubleshooting

### Approval Not Found

**Cause**: Approval ID doesn't exist or has been deleted
**Solution**: Check database, verify approval was created

### Permission Denied

**Cause**: User doesn't have SUPER_ADMIN role
**Solution**: Verify role assignment in `user_roles` table

### Approval Expired

**Cause**: Request older than expiration time
**Solution**: Create new approval request

### Transaction Hash Mismatch

**Cause**: Transaction was modified after approval
**Solution**: Create new approval request with updated transaction

### Self-Approval Blocked

**Cause**: Requester and approver are the same user
**Solution**: Different SUPER_ADMIN must approve

## Future Enhancements

1. **Multi-Signature Support**: Require N of M approvals
2. **Time Locks**: Delay execution after approval
3. **Automated Testing**: Run automated tests before approval
4. **Simnet Testing**: Deploy to simnet before mainnet
5. **Notification System**: Email/Slack notifications for pending approvals
6. **Mobile Approval**: Mobile app for approval decisions
7. **Biometric Authentication**: Face ID / Touch ID for approvals

## Conclusion

This dual-approval system provides enterprise-grade security for critical deployment operations while maintaining operational efficiency. The combination of transaction serialization, advanced simulation, RBAC enforcement, and complete audit logging ensures that deployments are safe, traceable, and compliant with security best practices.
