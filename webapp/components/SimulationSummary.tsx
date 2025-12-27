"use client";

import { motion } from "framer-motion";

interface SimulationSummaryProps {
  valueAtRisk: number; // SOL
  programId?: string;
  instructionCount: number;
  transactionType: string;
  description?: string;
  logs?: string[];
  balanceChanges?: Array<{
    account: string;
    before: number;
    after: number;
    delta: number;
  }>;
  onApprove?: () => void;
  onReject?: () => void;
  loading?: boolean;
}

/**
 * SimulationSummary - Pre-flight simulation view component
 *
 * Displays:
 * - Value at Risk (maximum potential loss)
 * - Target Program ID (for deployments/upgrades)
 * - Transaction details and simulation logs
 * - Approval/Rejection actions for dual-approval workflow
 */
export default function SimulationSummary({
  valueAtRisk,
  programId,
  instructionCount,
  transactionType,
  description,
  logs,
  balanceChanges,
  onApprove,
  onReject,
  loading = false,
}: SimulationSummaryProps) {
  const riskLevel =
    valueAtRisk > 10
      ? "critical"
      : valueAtRisk > 5
        ? "high"
        : valueAtRisk > 1
          ? "medium"
          : "low";

  const riskColors = {
    critical: "text-red-500 bg-red-500/10 border-red-500",
    high: "text-orange-500 bg-orange-500/10 border-orange-500",
    medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500",
    low: "text-green-500 bg-green-500/10 border-green-500",
  };

  const riskColor = riskColors[riskLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-6 border-2 border-white/20"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          🔍 Pre-flight Simulation
        </h2>
        <span
          className={`px-4 py-2 rounded-full text-sm font-bold ${riskColor} border-2`}
        >
          {riskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Critical Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Value at Risk */}
        <div className="bg-white/5 rounded-lg p-4 border-2 border-white/10">
          <div className="text-sm text-gray-400 mb-1">⚠️ Value at Risk</div>
          <div
            className={`text-3xl font-bold ${riskLevel === "critical" || riskLevel === "high" ? "text-red-400" : "text-yellow-400"}`}
          >
            {valueAtRisk.toFixed(4)} SOL
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Maximum potential loss from this transaction
          </div>
        </div>

        {/* Target Program ID */}
        {programId && (
          <div className="bg-white/5 rounded-lg p-4 border-2 border-white/10">
            <div className="text-sm text-gray-400 mb-1">
              🎯 Target Program ID
            </div>
            <div className="text-white font-mono text-sm break-all">
              {programId}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Deployment/upgrade target address
            </div>
          </div>
        )}

        {/* Transaction Type */}
        <div className="bg-white/5 rounded-lg p-4 border-2 border-white/10">
          <div className="text-sm text-gray-400 mb-1">📋 Transaction Type</div>
          <div className="text-white font-bold">{transactionType}</div>
          <div className="text-xs text-gray-500 mt-1">
            {instructionCount} instruction{instructionCount !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="bg-white/5 rounded-lg p-4 border-2 border-white/10">
            <div className="text-sm text-gray-400 mb-1">📝 Description</div>
            <div className="text-white text-sm">{description}</div>
          </div>
        )}
      </div>

      {/* Balance Changes */}
      {balanceChanges && balanceChanges.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border-2 border-white/10 mb-6">
          <div className="text-sm text-gray-400 mb-3">
            💰 Expected Balance Changes
          </div>
          <div className="space-y-2">
            {balanceChanges.map((change, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <div className="text-gray-300 font-mono text-xs">
                  {change.account.slice(0, 8)}...{change.account.slice(-8)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {change.before.toFixed(4)} SOL
                  </span>
                  <span className="text-gray-500">→</span>
                  <span
                    className={
                      change.delta < 0 ? "text-red-400" : "text-green-400"
                    }
                  >
                    {change.after.toFixed(4)} SOL
                  </span>
                  <span
                    className={`font-bold ${change.delta < 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    ({change.delta > 0 ? "+" : ""}
                    {change.delta.toFixed(4)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Logs */}
      {logs && logs.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border-2 border-white/10 mb-6">
          <div className="text-sm text-gray-400 mb-2">📊 Simulation Logs</div>
          <div className="max-h-48 overflow-y-auto">
            {logs.slice(0, 10).map((log, idx) => (
              <div key={idx} className="text-xs text-gray-300 font-mono mb-1">
                {log}
              </div>
            ))}
            {logs.length > 10 && (
              <div className="text-xs text-gray-500 mt-2">
                ... and {logs.length - 10} more logs
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {(riskLevel === "critical" || riskLevel === "high") && (
        <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="text-red-400 font-bold mb-1">
                High Risk Operation
              </div>
              <div className="text-red-300 text-sm">
                This transaction involves significant value at risk. Please
                carefully review all details before approval. Dual approval from
                a SUPER_ADMIN is required before execution.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(onApprove || onReject) && (
        <div className="flex gap-4">
          {onReject && (
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "⏳ Processing..." : "❌ Reject"}
            </button>
          )}
          {onApprove && (
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "⏳ Processing..." : "✅ Approve"}
            </button>
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-400">🔒</div>
          <div className="text-blue-300 text-sm">
            <span className="font-bold">Dual-Approval Security:</span> This
            transaction requires approval from a second admin with SUPER_ADMIN
            privileges before it can be broadcast to the network.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
