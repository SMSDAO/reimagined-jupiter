'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { motion } from 'framer-motion';

interface TransactionExecutorProps {
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

interface ExecutionStatus {
  isExecuting: boolean;
  message: string;
  signature?: string;
  error?: string;
}

/**
 * TransactionExecutor - Component for executing Solana transactions
 * 
 * Features:
 * - Integrates with resilient transaction execution API
 * - Supports both legacy and versioned transactions
 * - Real-time execution status
 * - Automatic retry handling
 * - Priority fee configuration
 */
export default function TransactionExecutor({ onSuccess, onError }: TransactionExecutorProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [status, setStatus] = useState<ExecutionStatus>({
    isExecuting: false,
    message: '',
  });
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  /**
   * Execute a transaction using the resilient API endpoint
   */
  const executeTransaction = async (
    transaction: Transaction | VersionedTransaction,
    useServerExecution: boolean = false
  ) => {
    if (!publicKey) {
      const error = 'Please connect your wallet';
      setStatus({ isExecuting: false, message: '', error });
      onError?.(error);
      return;
    }

    setStatus({ isExecuting: true, message: 'Preparing transaction...', error: undefined });

    try {
      const isVersioned = transaction instanceof VersionedTransaction;

      if (useServerExecution && isVersioned) {
        // Server-side execution with resilient connection
        setStatus({ isExecuting: true, message: 'Executing transaction via server...' });

        // Serialize transaction
        const serialized = transaction.serialize();
        const base64 = Buffer.from(serialized).toString('base64');

        // Call API endpoint
        const response = await fetch('/api/transactions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction: base64,
            isVersioned: true,
            urgency,
            commitment: 'confirmed',
          }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus({
            isExecuting: false,
            message: `Transaction successful! Signature: ${result.signature}`,
            signature: result.signature,
          });
          onSuccess?.(result.signature);
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } else {
        // Client-side execution with wallet adapter
        setStatus({ isExecuting: true, message: 'Sending transaction...' });

        const signature = await sendTransaction(transaction, connection);

        setStatus({ isExecuting: true, message: 'Confirming transaction...' });

        await connection.confirmTransaction(signature, 'confirmed');

        setStatus({
          isExecuting: false,
          message: `Transaction confirmed! Signature: ${signature}`,
          signature,
        });
        onSuccess?.(signature);
      }
    } catch (error) {
      console.error('Transaction execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      setStatus({
        isExecuting: false,
        message: '',
        error: errorMessage,
      });
      onError?.(errorMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30"
    >
      <h3 className="text-xl font-bold text-white mb-4">Transaction Executor</h3>

      {/* Priority Configuration */}
      <div className="mb-6">
        <label className="text-white text-sm mb-2 block">Transaction Priority</label>
        <div className="flex gap-2">
          {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
            <motion.button
              key={level}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setUrgency(level)}
              disabled={status.isExecuting}
              className={`px-4 py-2 rounded-lg transition-all capitalize ${
                urgency === level
                  ? 'bg-purple-600 text-white glow-purple'
                  : 'bg-white/10 dark:bg-black/20 text-gray-300 hover:bg-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {level}
            </motion.button>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-2">
          Higher priority = faster confirmation but higher fees
        </p>
      </div>

      {/* Status Display */}
      {status.isExecuting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
            />
            <span className="text-blue-300">{status.message}</span>
          </div>
        </motion.div>
      )}

      {status.signature && !status.isExecuting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg"
        >
          <div className="text-green-300 mb-2">✅ {status.message}</div>
          <a
            href={`https://solscan.io/tx/${status.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 text-sm break-all underline"
          >
            View on Solscan
          </a>
        </motion.div>
      )}

      {status.error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg"
        >
          <div className="text-red-300">❌ {status.error}</div>
        </motion.div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 dark:bg-black/20 rounded-lg p-3 border border-blue-500/30">
          <div className="text-xs text-gray-400 mb-1">Features</div>
          <div className="text-white text-sm">
            ✓ Resilient RPC<br />
            ✓ Auto Retry<br />
            ✓ Priority Fees
          </div>
        </div>
        <div className="bg-white/5 dark:bg-black/20 rounded-lg p-3 border border-purple-500/30">
          <div className="text-xs text-gray-400 mb-1">Status</div>
          <div className="text-white text-sm">
            {publicKey ? '✓ Wallet Connected' : '⚠ Connect Wallet'}
          </div>
        </div>
      </div>

      {/* Usage Info */}
      <div className="mt-4 p-3 bg-white/5 dark:bg-black/20 rounded-lg border border-gray-500/30">
        <div className="text-xs text-gray-400 mb-1">💡 Usage</div>
        <div className="text-white text-xs">
          This component can be integrated into any transaction flow. Pass your transaction
          to the <code className="text-purple-400">executeTransaction</code> method.
        </div>
      </div>
    </motion.div>
  );
}
