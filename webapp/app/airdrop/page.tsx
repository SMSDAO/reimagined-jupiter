'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';

interface WalletScore {
  address: string;
  totalScore: number;
  tier: 'WHALE' | 'DEGEN' | 'ACTIVE' | 'CASUAL' | 'NOVICE';
  balance: number;
  txCount: number;
  nftCount: number;
}

interface Airdrop {
  protocol: string;
  amount: string;
  value: string;
  claimable: boolean;
}

export default function AirdropPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [walletScore, setWalletScore] = useState<WalletScore | null>(null);
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(false);

  const checkAirdrops = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Fetch wallet score
      const balance = await connection.getBalance(publicKey);
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
      
      const mockScore: WalletScore = {
        address: publicKey.toString(),
        totalScore: 75,
        tier: 'ACTIVE',
        balance: balance / 1e9,
        txCount: signatures.length,
        nftCount: 12,
      };
      setWalletScore(mockScore);

      // Mock airdrops
      const mockAirdrops: Airdrop[] = [
        { protocol: 'Jupiter', amount: '100 JUP', value: '$125', claimable: true },
        { protocol: 'Jito', amount: '50 JTO', value: '$89', claimable: true },
        { protocol: 'Pyth', amount: '25 PYTH', value: '$45', claimable: false },
        { protocol: 'Kamino', amount: '75 KMNO', value: '$34', claimable: true },
        { protocol: 'Marginfi', amount: '200 MRGN', value: '$67', claimable: false },
      ];
      setAirdrops(mockAirdrops);
    } catch (error) {
      console.error('Error checking airdrops:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimAirdrop = async (airdrop: Airdrop) => {
    alert(`Claiming ${airdrop.amount} from ${airdrop.protocol}...`);
    // Implement actual claim logic
  };

  const claimAll = async () => {
    const claimable = airdrops.filter((a) => a.claimable);
    alert(`Claiming ${claimable.length} airdrops...`);
    // Implement batch claim logic
  };

  useEffect(() => {
    if (publicKey) {
      checkAirdrops();
    }
  }, [publicKey]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'WHALE': return 'from-yellow-400 to-orange-500';
      case 'DEGEN': return 'from-purple-400 to-pink-500';
      case 'ACTIVE': return 'from-blue-400 to-cyan-500';
      case 'CASUAL': return 'from-green-400 to-emerald-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2">🎁 Airdrop Checker</h1>
        <p className="text-gray-300 mb-8">
          Check eligibility and auto-claim airdrops with advanced wallet scoring
        </p>

        {!publicKey ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-300">Connect your wallet to check for claimable airdrops</p>
          </div>
        ) : loading ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white">Analyzing Wallet...</h2>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Wallet Score Card */}
            {walletScore && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">📊 Wallet Score</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <div className={`inline-block px-6 py-3 rounded-full bg-gradient-to-r ${getTierColor(walletScore.tier)} text-white font-bold text-2xl`}>
                        {walletScore.tier}
                      </div>
                    </div>
                    <div className="text-6xl font-bold text-white mb-2">
                      {walletScore.totalScore}/100
                    </div>
                    <div className="text-gray-300">Overall Score</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Balance:</span>
                      <span className="text-white font-bold">{walletScore.balance.toFixed(2)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Transactions:</span>
                      <span className="text-white font-bold">{walletScore.txCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">NFTs:</span>
                      <span className="text-white font-bold">{walletScore.nftCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Airdrop Priority:</span>
                      <span className="text-yellow-400 font-bold">⭐⭐⭐⭐</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Claimable Airdrops */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">💰 Claimable Airdrops</h2>
                <button
                  onClick={claimAll}
                  disabled={!airdrops.some((a) => a.claimable)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50"
                >
                  Claim All
                </button>
              </div>

              <div className="space-y-4">
                {airdrops.map((airdrop, index) => (
                  <motion.div
                    key={airdrop.protocol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">{airdrop.protocol}</h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-purple-400">{airdrop.amount}</span>
                        <span className="text-green-400">{airdrop.value}</span>
                      </div>
                    </div>
                    {airdrop.claimable ? (
                      <button
                        onClick={() => claimAirdrop(airdrop)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition"
                      >
                        Claim
                      </button>
                    ) : (
                      <span className="text-gray-400 px-6 py-3">Not Eligible</span>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-purple-900/30 rounded-lg">
                <div className="flex justify-between text-white">
                  <span className="font-bold">Total Claimable Value:</span>
                  <span className="text-2xl font-bold text-green-400">
                    ${airdrops.filter((a) => a.claimable).reduce((sum, a) => sum + parseFloat(a.value.replace('$', '')), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Supported Protocols */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">🌐 Supported Protocols</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['Jupiter', 'Jito', 'Pyth', 'Kamino', 'Marginfi', 'Solend', 'Mango', 'Marinade', 'Lido', 'GXQ'].map((protocol) => (
                  <div key={protocol} className="bg-white/5 rounded-lg p-3 text-center text-white">
                    {protocol}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          💰 10% of claimed airdrops go to dev wallet: monads.solana
        </div>
      </motion.div>
    </div>
  );
}
