'use client';

import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { motion } from 'framer-motion';

// Types
interface WalletAnalysis {
  address: string;
  age: number;
  creationDate: string;
  solBalance: number;
  solBalanceUSD: number;
  totalTransactions: number;
  totalSOLTransacted: number;
  uniqueProtocols: number;
  tokenAccounts: number;
  portfolioValue: number;
  walletType: WalletType;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFlags: string[];
  activity: {
    swaps: number;
    lpStakes: number;
    airdrops: number;
    nftMints: number;
    nftSales: number;
  };
  tokens: TokenHolding[];
}

interface TokenHolding {
  mint: string;
  symbol: string;
  balance: number;
  usdValue: number;
}

type WalletType = 'Founder/VC' | 'Scam' | 'Trader' | 'NFT Collector' | 'Regular';
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export default function WalletAnalysis() {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeWallet = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      console.log('🔍 Starting wallet analysis for:', walletAddress);

      // Validate address
      const publicKey = new PublicKey(walletAddress);
      
      // Get RPC connection
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');

      console.log('📊 Fetching wallet data...');

      // Get basic wallet info
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / 1e9;

      // Get token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      // Get transaction signatures (last 200)
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
      const totalTransactions = signatures.length;

      console.log(`📈 Found ${totalTransactions} transactions`);

      // Calculate wallet age
      const oldestSignature = signatures[signatures.length - 1];
      const walletAge = oldestSignature?.blockTime 
        ? Math.floor((Date.now() / 1000 - oldestSignature.blockTime) / 86400)
        : 0;
      
      const creationDate = oldestSignature?.blockTime
        ? new Date(oldestSignature.blockTime * 1000).toLocaleDateString()
        : 'Unknown';

      console.log(`📅 Wallet age: ${walletAge} days (created ${creationDate})`);

      // Analyze last 50 transactions for SOL volume
      const recentSigs = signatures.slice(0, Math.min(50, signatures.length));
      let totalSOLTransacted = 0;
      const uniquePrograms = new Set<string>();
      const activity = {
        swaps: 0,
        lpStakes: 0,
        airdrops: 0,
        nftMints: 0,
        nftSales: 0,
      };

      console.log('🔬 Analyzing transaction patterns...');

      for (const sig of recentSigs) {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.meta) {
            // Calculate SOL transacted
            const preBalance = tx.meta.preBalances[0] || 0;
            const postBalance = tx.meta.postBalances[0] || 0;
            const diff = Math.abs(preBalance - postBalance) / 1e9;
            totalSOLTransacted += diff;

            // Track unique programs
            tx.transaction.message.instructions.forEach((ix: { programId?: { toString: () => string } }) => {
              const programId = ix.programId?.toString() || '';
              if (programId) {
                uniquePrograms.add(programId);
                
                // Detect activity types
                if (programId.includes('Jupiter') || programId.includes('Raydium') || programId.includes('Orca')) {
                  activity.swaps++;
                }
                if (programId.includes('Marinade') || programId.includes('Lido') || programId.includes('Kamino')) {
                  activity.lpStakes++;
                }
                if (programId.includes('Metaplex') || programId.includes('Token Metadata')) {
                  activity.nftMints++;
                }
              }
            });
          }
        } catch (err) {
          // Skip failed transaction fetches
          console.log('Skipping transaction:', err);
        }
      }

      const uniqueProtocols = uniquePrograms.size;

      console.log(`💰 Total SOL transacted: ${totalSOLTransacted.toFixed(2)}`);
      console.log(`🔗 Unique protocols: ${uniqueProtocols}`);
      console.log(`📊 Activity:`, activity);

      // Risk Assessment Algorithm
      let riskScore = 0;
      const riskFlags: string[] = [];

      // New wallet detection
      if (walletAge < 7) {
        riskScore += 20;
        riskFlags.push('⚠️ Very new wallet (< 7 days)');
      } else if (walletAge < 30) {
        riskScore += 10;
        riskFlags.push('⚠️ New wallet (< 30 days)');
      }

      // Low activity flagging
      if (totalTransactions < 10) {
        riskScore += 15;
        riskFlags.push('⚠️ Very low transaction count');
      }

      // Honeypot detection
      if (solBalance > 10 && totalTransactions < 20) {
        riskScore += 30;
        riskFlags.push('🚨 Honeypot risk: High balance + low activity');
      }

      // Airdrop farmer pattern
      if (activity.swaps === 0 && totalTransactions > 10) {
        riskScore += 10;
        riskFlags.push('⚠️ No trading activity (airdrop farmer?)');
      }

      // Bot detection
      if (activity.nftMints > 20) {
        riskScore += 15;
        riskFlags.push('⚠️ High NFT minting activity (bot?)');
      }

      // Determine risk level
      let riskLevel: RiskLevel;
      if (riskScore <= 25) {
        riskLevel = 'Low';
      } else if (riskScore <= 50) {
        riskLevel = 'Medium';
      } else if (riskScore <= 60) {
        riskLevel = 'High';
      } else {
        riskLevel = 'Critical';
      }

      console.log(`🛡️ Risk Score: ${riskScore} (${riskLevel})`);

      // Wallet Type Classification
      let walletType: WalletType = 'Regular';

      if (riskScore > 60 || riskFlags.some(f => f.includes('Honeypot'))) {
        walletType = 'Scam';
        riskFlags.push('🚨 SCAM WALLET: Suspicious patterns detected');
      } else if (walletAge > 365 && totalTransactions > 500 && uniqueProtocols > 20 && totalSOLTransacted > 1000) {
        walletType = 'Founder/VC';
        riskFlags.push('👑 Likely Founder/VC wallet');
        riskScore = Math.max(0, riskScore - 20); // Reduce risk for established wallets
      } else if (activity.swaps > 50) {
        walletType = 'Trader';
      } else if (activity.nftMints > 20 || tokenAccounts.value.filter(acc => {
        const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
        const decimals = acc.account.data.parsed.info.tokenAmount.decimals;
        return amount === 1 && decimals === 0;
      }).length > 20) {
        walletType = 'NFT Collector';
      }

      console.log(`🎯 Wallet Type: ${walletType}`);

      // Calculate portfolio value (simplified)
      const portfolioValue = solBalance * 150; // Assume $150/SOL

      // Parse token holdings
      const tokens: TokenHolding[] = tokenAccounts.value
        .slice(0, 10) // Limit to top 10
        .map(acc => ({
          mint: acc.account.data.parsed.info.mint,
          symbol: 'TOKEN', // Would need token metadata API for real symbols
          balance: acc.account.data.parsed.info.tokenAmount.uiAmount || 0,
          usdValue: 0, // Would need price API
        }));

      const walletAnalysis: WalletAnalysis = {
        address: walletAddress,
        age: walletAge,
        creationDate,
        solBalance,
        solBalanceUSD: solBalance * 150,
        totalTransactions,
        totalSOLTransacted,
        uniqueProtocols,
        tokenAccounts: tokenAccounts.value.length,
        portfolioValue,
        walletType,
        riskScore,
        riskLevel,
        riskFlags,
        activity,
        tokens,
      };

      console.log('✅ Analysis complete:', walletAnalysis);
      setAnalysis(walletAnalysis);
    } catch (err) {
      console.error('❌ Error analyzing wallet:', err);
      setError((err as Error).message || 'Failed to analyze wallet');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'Low':
        return 'border-green-500 bg-green-500/10';
      case 'Medium':
        return 'border-orange-500 bg-orange-500/10';
      case 'High':
        return 'border-red-500 bg-red-500/10';
      case 'Critical':
        return 'border-red-700 bg-red-700/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getRiskTextColor = (level: RiskLevel) => {
    switch (level) {
      case 'Low':
        return 'text-green-400';
      case 'Medium':
        return 'text-orange-400';
      case 'High':
        return 'text-red-400';
      case 'Critical':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getWalletTypeIcon = (type: WalletType) => {
    switch (type) {
      case 'Founder/VC':
        return '👑';
      case 'Scam':
        return '🚨';
      case 'Trader':
        return '💹';
      case 'NFT Collector':
        return '🎨';
      default:
        return '👤';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          🔍 Enhanced Wallet Analysis
        </h1>
        <p className="text-xl text-gray-300">
          Professional-grade wallet forensics with risk assessment
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 backdrop-blur-md rounded-xl p-6"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter Solana wallet address..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={analyzeWallet}
            disabled={loading || !walletAddress}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '🔍 Analyzing...' : '🔍 Analyze Wallet'}
          </button>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500 rounded-xl p-4 text-red-400"
        >
          ❌ {error}
        </motion.div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Risk Assessment Card */}
          <div className={`border-2 rounded-xl p-6 ${getRiskColor(analysis.riskLevel)}`}>
            <h2 className="text-2xl font-bold text-white mb-4">
              🛡️ Risk Assessment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-400">Risk Score</div>
                <div className={`text-3xl font-bold ${getRiskTextColor(analysis.riskLevel)}`}>
                  {analysis.riskScore}/100
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Risk Level</div>
                <div className={`text-3xl font-bold ${getRiskTextColor(analysis.riskLevel)}`}>
                  {analysis.riskLevel}
                </div>
              </div>
            </div>
            {analysis.riskFlags.length > 0 && (
              <div>
                <div className="text-sm text-gray-400 mb-2">Risk Flags:</div>
                <ul className="space-y-1">
                  {analysis.riskFlags.map((flag, idx) => (
                    <li key={idx} className="text-white">
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Wallet Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Wallet Age</div>
              <div className="text-2xl font-bold text-white">
                {analysis.age} days
              </div>
              <div className="text-xs text-gray-500">
                Created: {analysis.creationDate}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">SOL Balance</div>
              <div className="text-2xl font-bold text-white">
                {analysis.solBalance.toFixed(4)} SOL
              </div>
              <div className="text-xs text-gray-500">
                ${analysis.solBalanceUSD.toFixed(2)}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Total Transactions</div>
              <div className="text-2xl font-bold text-white">
                {analysis.totalTransactions}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Total SOL Transacted</div>
              <div className="text-2xl font-bold text-white">
                {analysis.totalSOLTransacted.toFixed(2)}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Unique Protocols</div>
              <div className="text-2xl font-bold text-white">
                {analysis.uniqueProtocols}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Token Accounts</div>
              <div className="text-2xl font-bold text-white">
                {analysis.tokenAccounts}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Portfolio Value</div>
              <div className="text-2xl font-bold text-white">
                ${analysis.portfolioValue.toFixed(2)}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="text-sm text-gray-400">Wallet Type</div>
              <div className="text-2xl font-bold text-white">
                {getWalletTypeIcon(analysis.walletType)} {analysis.walletType}
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              📊 Activity Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-gray-400">🔄 Swaps</div>
                <div className="text-xl font-bold text-white">
                  {analysis.activity.swaps}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">💎 LP Stakes</div>
                <div className="text-xl font-bold text-white">
                  {analysis.activity.lpStakes}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">🎁 Airdrops</div>
                <div className="text-xl font-bold text-white">
                  {analysis.activity.airdrops}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">🎨 NFT Mints</div>
                <div className="text-xl font-bold text-white">
                  {analysis.activity.nftMints}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">💰 NFT Sales</div>
                <div className="text-xl font-bold text-white">
                  {analysis.activity.nftSales}
                </div>
              </div>
            </div>
          </div>

          {/* Token Holdings */}
          {analysis.tokens.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                💰 Token Holdings (Top 10)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-gray-400">Token</th>
                      <th className="text-right py-2 text-gray-400">Balance</th>
                      <th className="text-right py-2 text-gray-400">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.tokens.map((token, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="py-2 text-white">
                          {token.symbol}
                          <div className="text-xs text-gray-500 font-mono">
                            {token.mint.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="text-right py-2 text-white">
                          {token.balance.toFixed(4)}
                        </td>
                        <td className="text-right py-2 text-white">
                          ${token.usdValue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Solscan Link */}
          <div className="text-center">
            <a
              href={`https://solscan.io/account/${encodeURIComponent(analysis.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              🔗 View on Solscan
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
