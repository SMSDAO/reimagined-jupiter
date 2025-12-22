/**
 * Wallet Management API Endpoints
 * Handles creation, import, export, and management of sub-wallets
 * 
 * SECURITY:
 * - All endpoints require JWT authentication
 * - Private keys are never sent to client (except on export with explicit user action)
 * - All operations are audit logged
 * - Rate limiting applied to sensitive operations
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection } from '@solana/web3.js';
import { verifyToken } from '../../lib/auth.js';
import { hashString } from '../../src/services/walletManagement.js';
import {
  createUserSubWallet,
  importSubWallet,
  exportSubWallet,
  getUserSubWallets,
  checkSubWalletBalance,
} from '../../src/services/walletManagement.js';
import { insertAuditLog } from '../../db/database.js';

/**
 * Get client IP and device fingerprint
 */
function getClientInfo(req: VercelRequest): {
  ipHash: string;
  deviceFingerprintHash: string;
  userAgent: string;
} {
  // Get IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             (req.headers['x-real-ip'] as string) || 
             'unknown';
  
  // Get device fingerprint from header
  const deviceFingerprint = (req.headers['x-device-fingerprint'] as string) || 'unknown';
  
  // Get user agent
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  
  return {
    ipHash: hashString(ip),
    deviceFingerprintHash: hashString(deviceFingerprint),
    userAgent,
  };
}

/**
 * Verify JWT and get wallet public key
 */
function verifyAuth(req: VercelRequest): {
  valid: boolean;
  walletPublicKey?: string;
  error?: string;
} {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Missing or invalid authorization header',
    };
  }
  
  const token = authHeader.substring(7);
  const verification = verifyToken(token);
  
  if (!verification.valid) {
    return {
      valid: false,
      error: verification.error || 'Invalid token',
    };
  }
  
  return {
    valid: true,
    walletPublicKey: verification.payload?.walletPublicKey,
  };
}

/**
 * Main handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Device-Fingerprint'
  );
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verify authentication
  const auth = verifyAuth(req);
  
  if (!auth.valid) {
    return res.status(401).json({
      success: false,
      error: auth.error || 'Unauthorized',
    });
  }
  
  const walletPublicKey = auth.walletPublicKey!;
  const clientInfo = getClientInfo(req);
  
  try {
    // Route based on method and action
    if (req.method === 'GET') {
      return await handleGetWallets(walletPublicKey, req, res);
    } else if (req.method === 'POST') {
      const action = (req.body as any)?.action || (req.query.action as string);
      
      switch (action) {
        case 'create':
          return await handleCreateWallet(walletPublicKey, clientInfo, req, res);
        case 'import':
          return await handleImportWallet(walletPublicKey, clientInfo, req, res);
        case 'export':
          return await handleExportWallet(walletPublicKey, clientInfo, req, res);
        case 'check_balance':
          return await handleCheckBalance(walletPublicKey, clientInfo, req, res);
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: create, import, export, check_balance',
          });
      }
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error) {
    console.error('❌ Wallet management error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get all sub-wallets for authenticated user
 */
async function handleGetWallets(
  walletPublicKey: string,
  req: VercelRequest,
  res: VercelResponse
) {
  const includeBalances = req.query.includeBalances === 'true';
  
  let connection: Connection | undefined;
  if (includeBalances) {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    connection = new Connection(rpcUrl);
  }
  
  const result = await getUserSubWallets(
    walletPublicKey,
    includeBalances,
    connection
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.status(200).json({
    success: true,
    wallets: result.wallets,
  });
}

/**
 * Create a new sub-wallet
 */
async function handleCreateWallet(
  walletPublicKey: string,
  clientInfo: any,
  req: VercelRequest,
  res: VercelResponse
) {
  const { walletName } = req.body as { walletName?: string };
  
  console.log(`🔑 Creating sub-wallet for user: ${walletPublicKey}`);
  
  const result = await createUserSubWallet(
    walletPublicKey,
    walletName,
    clientInfo.ipHash,
    clientInfo.deviceFingerprintHash
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.status(201).json({
    success: true,
    message: 'Sub-wallet created successfully',
    subWallet: result.subWallet,
  });
}

/**
 * Import an existing wallet
 */
async function handleImportWallet(
  walletPublicKey: string,
  clientInfo: any,
  req: VercelRequest,
  res: VercelResponse
) {
  const { privateKey, walletName } = req.body as {
    privateKey: string;
    walletName?: string;
  };
  
  if (!privateKey) {
    return res.status(400).json({
      success: false,
      error: 'Private key is required',
    });
  }
  
  console.log(`📥 Importing sub-wallet for user: ${walletPublicKey}`);
  
  const result = await importSubWallet(
    walletPublicKey,
    privateKey,
    walletName,
    clientInfo.ipHash,
    clientInfo.deviceFingerprintHash
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.status(201).json({
    success: true,
    message: 'Sub-wallet imported successfully',
    subWallet: result.subWallet,
  });
}

/**
 * Export a sub-wallet's private key
 */
async function handleExportWallet(
  walletPublicKey: string,
  clientInfo: any,
  req: VercelRequest,
  res: VercelResponse
) {
  const { subWalletPublicKey } = req.body as {
    subWalletPublicKey: string;
  };
  
  if (!subWalletPublicKey) {
    return res.status(400).json({
      success: false,
      error: 'Sub-wallet public key is required',
    });
  }
  
  console.log(`📤 Exporting sub-wallet: ${subWalletPublicKey}`);
  
  const result = await exportSubWallet(
    walletPublicKey,
    subWalletPublicKey,
    clientInfo.ipHash,
    clientInfo.deviceFingerprintHash
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.status(200).json({
    success: true,
    message: 'Sub-wallet exported successfully',
    privateKey: result.privateKey,
  });
}

/**
 * Check balance of a sub-wallet
 */
async function handleCheckBalance(
  walletPublicKey: string,
  clientInfo: any,
  req: VercelRequest,
  res: VercelResponse
) {
  const { subWalletPublicKey } = req.body as {
    subWalletPublicKey: string;
  };
  
  if (!subWalletPublicKey) {
    return res.status(400).json({
      success: false,
      error: 'Sub-wallet public key is required',
    });
  }
  
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl);
  
  const result = await checkSubWalletBalance(
    connection,
    subWalletPublicKey
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  // Log balance check
  await insertAuditLog({
    walletPublicKey: subWalletPublicKey,
    eventType: 'balance_check',
    eventAction: 'check_sub_wallet_balance',
    eventDescription: `Checked balance: ${result.balance} SOL`,
    ipHash: clientInfo.ipHash,
    deviceFingerprintHash: clientInfo.deviceFingerprintHash,
    amountSol: result.balance,
    status: 'success',
  });
  
  return res.status(200).json({
    success: true,
    balance: result.balance,
    sufficientBalance: result.sufficientBalance,
  });
}
