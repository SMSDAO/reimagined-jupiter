/**
 * Farcaster Frame API - Wallet Generation
 * One-click wallet generation for Farcaster users
 * Leverages Neynar integration for social intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { getCompleteProfile } from '../../../../../../src/integrations/farcaster';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, walletAddress } = body;
    
    if (!fid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Farcaster FID required',
        },
        { status: 400 }
      );
    }
    
    // Generate new ephemeral wallet
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);
    
    // Get Farcaster profile and social intelligence
    let socialProfile = null;
    if (walletAddress) {
      try {
        socialProfile = await getCompleteProfile(walletAddress);
      } catch (error) {
        console.warn('[Farcaster Frame] Could not fetch social profile:', error);
      }
    }
    
    // Build response with Frame metadata
    const response = {
      success: true,
      wallet: {
        publicKey,
        privateKey, // Client should encrypt and store securely
        type: 'ephemeral',
        generatedAt: new Date().toISOString(),
      },
      farcaster: {
        fid,
        profile: socialProfile,
      },
      frame: {
        version: 'vNext',
        image: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/farcaster/frame-image?address=${publicKey}`,
        buttons: [
          {
            label: '🎯 Start Trading',
            action: 'post',
            target: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/trading`,
          },
          {
            label: '💎 View Profile',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/wallet-analysis?address=${publicKey}`,
          },
        ],
      },
      message: 'Wallet generated successfully! Store your private key securely.',
      warning: 'NEVER share your private key with anyone. GXQ Studio will never ask for it.',
    };
    
    console.log('[Farcaster Frame] Generated wallet for FID:', fid, 'Address:', publicKey);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Farcaster Frame] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate wallet',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for Frame metadata
 */
export async function GET(request: NextRequest) {
  // Return Farcaster Frame HTML
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/farcaster/frame-image" />
        <meta property="fc:frame:button:1" content="🎯 Generate Wallet" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1:target" content="${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/farcaster/frame-wallet" />
        <meta property="fc:frame:button:2" content="📊 Learn More" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${process.env.NEXT_PUBLIC_BASE_URL || ''}" />
        <title>GXQ Studio - Solana Wallet Generator</title>
      </head>
      <body>
        <h1>GXQ Studio - One-Click Wallet Generation</h1>
        <p>Generate a secure Solana wallet powered by Farcaster social intelligence.</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
