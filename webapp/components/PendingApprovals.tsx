'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SimulationSummary from './SimulationSummary';

interface PendingApproval {
  id: string;
  transactionHash: string;
  transactionType: string;
  valueAtRisk: number;
  targetProgramId?: string;
  description?: string;
  instructionsCount: number;
  requestedBy: string;
  requestedByUsername: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export default function PendingApprovals() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingApprovals();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPendingApprovals, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingApprovals = async () => {
    try {
      const response = await fetch('/api/admin/approvals');
      if (!response.ok) {
        throw new Error('Failed to load pending approvals');
      }
      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
  };

  const handleApprove = async (approvalId: string) => {
    if (!confirm('Are you sure you want to APPROVE this transaction? This action cannot be undone.')) {
      return;
    }

    setProcessingId(approvalId);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          approved: true,
          reason: 'Approved by SUPER_ADMIN',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve transaction');
      }

      const result = await response.json();
      
      alert(`✅ Transaction approved successfully!\n\nApproval ID: ${approvalId}\nStatus: ${result.status}`);
      
      // Reload approvals
      await loadPendingApprovals();
      setSelectedApproval(null);
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert(`❌ Failed to approve transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) {
      return;
    }

    setProcessingId(approvalId);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          approved: false,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject transaction');
      }

      alert(`❌ Transaction rejected successfully!\n\nReason: ${reason}`);
      
      // Reload approvals
      await loadPendingApprovals();
      setSelectedApproval(null);
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      alert(`❌ Failed to reject transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  const handleViewDetails = (approval: PendingApproval) => {
    setSelectedApproval(approval);
  };

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">🔐 Pending Approvals</h2>
          <p className="text-gray-300 text-sm mt-1">
            Dual-approval workflow for critical transactions
          </p>
        </div>
        <button
          onClick={loadPendingApprovals}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Pending Count Badge */}
      {pendingCount > 0 && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="text-yellow-400 font-bold">
                {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} awaiting approval
              </div>
              <div className="text-yellow-300 text-sm">
                These transactions require SUPER_ADMIN approval before execution
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Approval Detail View */}
      {selectedApproval && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedApproval(null)}
        >
          <div 
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SimulationSummary
              valueAtRisk={selectedApproval.valueAtRisk}
              programId={selectedApproval.targetProgramId}
              instructionCount={selectedApproval.instructionsCount}
              transactionType={selectedApproval.transactionType}
              description={selectedApproval.description}
              onApprove={selectedApproval.status === 'PENDING' ? () => handleApprove(selectedApproval.id) : undefined}
              onReject={selectedApproval.status === 'PENDING' ? () => handleReject(selectedApproval.id) : undefined}
              loading={loading && processingId === selectedApproval.id}
            />
            <button
              onClick={() => setSelectedApproval(null)}
              className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}

      {/* Approvals List */}
      {approvals.length === 0 ? (
        <div className="bg-white/5 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-gray-400">No pending approvals</div>
          <div className="text-gray-500 text-sm mt-2">
            All transactions have been processed
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6 border-2 border-white/10 hover:border-white/20 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      approval.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500' :
                      approval.status === 'APPROVED' ? 'bg-green-500/20 text-green-400 border border-green-500' :
                      approval.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500' :
                      approval.status === 'EXECUTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500'
                    }`}>
                      {approval.status}
                    </span>
                    <span className="text-white font-bold">{approval.transactionType}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    Requested by <span className="text-white font-bold">{approval.requestedByUsername}</span>
                  </div>
                  {approval.description && (
                    <div className="text-gray-300 text-sm mt-1">{approval.description}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    approval.valueAtRisk > 5 ? 'text-red-400' :
                    approval.valueAtRisk > 1 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {approval.valueAtRisk.toFixed(4)} SOL
                  </div>
                  <div className="text-xs text-gray-500">at risk</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Instructions</div>
                  <div className="text-white">{approval.instructionsCount}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Created</div>
                  <div className="text-white">{new Date(approval.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Expires</div>
                  <div className="text-white">{new Date(approval.expiresAt).toLocaleString()}</div>
                </div>
                {approval.targetProgramId && (
                  <div>
                    <div className="text-gray-500 text-xs">Target Program</div>
                    <div className="text-white font-mono text-xs">
                      {approval.targetProgramId.slice(0, 8)}...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleViewDetails(approval)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
                >
                  📋 View Details
                </button>
                {approval.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReject(approval.id)}
                      disabled={loading && processingId === approval.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
                    >
                      {loading && processingId === approval.id ? '⏳' : '❌'} Reject
                    </button>
                    <button
                      onClick={() => handleApprove(approval.id)}
                      disabled={loading && processingId === approval.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
                    >
                      {loading && processingId === approval.id ? '⏳' : '✅'} Approve
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
