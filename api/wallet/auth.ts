/**
 * Wallet Authentication Endpoint
 * Handles wallet-based authentication with Solana signatures
 * Records user login with hashed IP and device fingerprint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { generateToken } from '../../lib/auth.js';
import { upsertUser, insertAuditLog } from '../../db/database.js';
import { hashString } from '../../src/services/walletManagement.js';

interface WalletAuthRequest {
  publicKey: string;
  signature: string;
  message: string;
  deviceFingerprint?: string;
}

/**
 * Get client info for audit logging
 */
function getClientInfo(req: VercelRequest, deviceFingerprint?: string): {
  ipHash: string;
  deviceFingerprintHash: string;
  userAgent: string;
} {
  // Get IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             (req.headers['x-real-ip'] as string) || 
             'unknown';
  
  // Get device fingerprint
  const fingerprint = deviceFingerprint || 
                     (req.headers['x-device-fingerprint'] as string) || 
                     'unknown';
  
  // Get user agent
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  
  return {
    ipHash: hashString(ip),
    deviceFingerprintHash: hashString(fingerprint),
    userAgent,
  };
}

/**
 * Verify Solana wallet signature
 */
function verifySignature(
  publicKey: string,
  signature: string,
  message: string
): boolean {
  try {
    // Decode public key
    const pubKey = new PublicKey(publicKey);
    
    // Decode signature
    const signatureBytes = bs58.decode(signature);
    
    // Encode message as bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify signature
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubKey.toBytes()
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Device-Fingerprint'
  );
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
  
  try {
    // Parse request body
    const body = req.body as WalletAuthRequest;
    const { publicKey, signature, message, deviceFingerprint } = body;
    
    // Validate required fields
    if (!publicKey || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: publicKey, signature, message',
      });
    }
    
    // Validate public key format
    try {
      new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key format',
      });
    }
    
    // Verify signature
    const isValid = verifySignature(publicKey, signature, message);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
    }
    
    // Get client info
    const clientInfo = getClientInfo(req, deviceFingerprint);
    
    // Upsert user in database
    const userResult = await upsertUser({
      walletPublicKey: publicKey,
      ipHash: clientInfo.ipHash,
      deviceFingerprintHash: clientInfo.deviceFingerprintHash,
    });
    
    const user = userResult.rows[0];
    
    // Log authentication event
    await insertAuditLog({
      userId: user.id,
      walletPublicKey: publicKey,
      eventType: 'user_login',
      eventAction: 'wallet_authentication',
      eventDescription: 'User authenticated with wallet signature',
      ipHash: clientInfo.ipHash,
      deviceFingerprintHash: clientInfo.deviceFingerprintHash,
      userAgent: clientInfo.userAgent,
      status: 'success',
    });
    
    // Generate JWT token
    const token = generateToken({
      walletPublicKey: publicKey,
      userId: user.id,
      loginCount: user.login_count,
    });
    
    console.log(`✅ Wallet authentication successful: ${publicKey}`);
    
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        walletPublicKey: user.wallet_public_key,
        lastLogin: user.last_login,
        loginCount: user.login_count,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error('❌ Wallet auth error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}
