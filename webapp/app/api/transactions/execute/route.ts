import { NextRequest, NextResponse } from 'next/server';
import { Transaction, VersionedTransaction, Keypair } from '@solana/web3.js';
import { createResilientConnection } from '@/lib/solana/connection';
import { TransactionBuilder } from '@/lib/solana/transaction-builder';

/**
 * POST /api/transactions/execute
 * 
 * Execute a Solana transaction with resilient connection handling
 * 
 * Request body:
 * - transaction: Base64 encoded transaction (legacy or versioned)
 * - isVersioned: boolean indicating if transaction is versioned
 * - urgency: 'low' | 'medium' | 'high' | 'critical' (optional, default: 'medium')
 * - commitment: Commitment level (optional, default: 'confirmed')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction: txBase64, isVersioned, urgency, commitment } = body;

    if (!txBase64) {
      return NextResponse.json(
        { success: false, error: 'Transaction is required' },
        { status: 400 }
      );
    }

    console.log('📥 Received transaction execution request');
    console.log(`   Urgency: ${urgency || 'medium'}`);
    console.log(`   Commitment: ${commitment || 'confirmed'}`);

    // Create resilient connection
    const resilientConnection = createResilientConnection();
    const builder = new TransactionBuilder(resilientConnection);

    let result;

    try {
      // Deserialize transaction
      const txBuffer = Buffer.from(txBase64, 'base64');

      if (isVersioned) {
        // Handle versioned transaction
        const transaction = VersionedTransaction.deserialize(txBuffer);
        
        console.log('🔄 Executing versioned transaction...');
        result = await builder.executeVersionedTransaction(
          transaction,
          commitment || 'confirmed',
          false // skipPreflight
        );
      } else {
        // Handle legacy transaction
        const transaction = Transaction.from(txBuffer);
        
        // Note: For server-side execution, we need the keypair to sign
        // In a real implementation, you'd retrieve this securely from environment or key management
        // For now, we'll return an error as client should sign before sending
        return NextResponse.json(
          { 
            success: false, 
            error: 'Legacy transactions must be signed client-side. Use versioned transactions for server-side execution.' 
          },
          { status: 400 }
        );
      }

      // Cleanup
      resilientConnection.destroy();

      if (result.success) {
        console.log(`✅ Transaction executed successfully: ${result.signature}`);
        return NextResponse.json({
          success: true,
          signature: result.signature,
          computeUnits: result.computeUnits,
          fee: result.fee,
        });
      } else {
        console.error(`❌ Transaction execution failed: ${result.error}`);
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
    } catch (error) {
      // Cleanup on error
      resilientConnection.destroy();
      throw error;
    }
  } catch (error) {
    console.error('❌ Transaction execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions/execute
 * 
 * Get information about the transaction execution endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/transactions/execute',
    method: 'POST',
    description: 'Execute Solana transactions with resilient connection handling',
    parameters: {
      transaction: 'Base64 encoded transaction (required)',
      isVersioned: 'boolean - Is this a versioned transaction? (required)',
      urgency: "'low' | 'medium' | 'high' | 'critical' (optional, default: 'medium')",
      commitment: "Commitment level (optional, default: 'confirmed')"
    },
    features: [
      'Multiple RPC endpoint support with automatic failover',
      'Dynamic priority fee calculation',
      'Exponential backoff retry logic',
      'Health checking and monitoring',
      'Support for versioned transactions'
    ]
  });
}
