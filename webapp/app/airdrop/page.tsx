'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { 
  fetchWalletMetrics, 
  calculateWalletScore, 
  getTierColor,
  type WalletTier 
} from '@/lib/wallet-utils';
import { 
  JupiterAirdropAPI, 
  JitoAirdropAPI,
  JupiterPriceAPI,
  formatUSD 
} from '@/lib/api-client';

interface WalletScore {
  address: string;
  totalScore: number;
  tier: WalletTier;
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

  const checkAirdrops = useCallback(async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Fetch wallet metrics using utility function
      const metrics = await fetchWalletMetrics(connection, publicKey);
      
      // Calculate wallet score
      const scoreResult = calculateWalletScore(metrics);
      
      const score: WalletScore = {
        address: publicKey.toString(),
        totalScore: scoreResult.totalScore,
        tier: scoreResult.tier,
        balance: metrics.balance,
        txCount: metrics.txCount,
        nftCount: metrics.nftCount,
      };
      setWalletScore(score);

      // Fetch real airdrops from APIs using utility functions
      const fetchedAirdrops: Airdrop[] = [];
      
      // Check Jupiter airdrop
      const jupiterEligibility = await JupiterAirdropAPI.checkEligibility(publicKey.toString());
      if (jupiterEligibility.eligible && jupiterEligibility.amount) {
        const jupPrice = await JupiterPriceAPI.getPrice('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN');
        const amount = jupiterEligibility.amount / 1e6;
        
        fetchedAirdrops.push({
          protocol: 'Jupiter',
          amount: `${amount.toFixed(2)} JUP`,
          value: formatUSD(amount * jupPrice),
          claimable: true,
        });
      }
      
      // Check Jito airdrop
      const jitoEligibility = await JitoAirdropAPI.checkAllocation(publicKey.toString());
      if (jitoEligibility.eligible && jitoEligibility.allocation) {
        const jtoPrice = await JupiterPriceAPI.getPrice('jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL');
        const amount = jitoEligibility.allocation / 1e9;
        
        fetchedAirdrops.push({
          protocol: 'Jito',
          amount: `${amount.toFixed(2)} JTO`,
          value: formatUSD(amount * jtoPrice),
          claimable: true,
        });
      }
      
      // Add placeholder for other protocols
      const otherProtocols = [
        { protocol: 'Pyth', claimable: false },
        { protocol: 'Kamino', claimable: false },
        { protocol: 'Marginfi', claimable: false },
      ];
      
      for (const proto of otherProtocols) {
        fetchedAirdrops.push({
          protocol: proto.protocol,
          amount: 'N/A',
          value: '$0.00',
          claimable: proto.claimable,
        });
      }
      
      setAirdrops(fetchedAirdrops);
    } catch (error) {
      console.error('Error checking airdrops:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  const claimAirdrop = async (airdrop: Airdrop) => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!airdrop.claimable) {
      alert(`${airdrop.protocol} airdrop is not claimable for this wallet.`);
      return;
    }

    try {
      console.log('[Airdrop] Attempting to claim:', airdrop);
      
      // Real implementation would:
      // 1. Fetch claim proof from protocol API
      // 2. Create claim transaction
      // 3. Sign and send transaction
      // 4. Wait for confirmation
      
      alert(`Preparing to claim ${airdrop.amount} from ${airdrop.protocol}...\n\nNote: Actual claiming requires:\n- Valid claim proof from protocol\n- Transaction signing\n- Gas fees (~0.001 SOL)\n\nBackend integration needed for secure claim transactions.`);
      
      console.log('[Airdrop] Claim initiated for:', {
        protocol: airdrop.protocol,
        amount: airdrop.amount,
        wallet: publicKey.toString(),
      });
    } catch (error) {
      console.error('[Airdrop] Claim error:', error);
      alert(`Failed to claim ${airdrop.protocol} airdrop. Please try again.`);
    }
  };

  const claimAll = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    const claimable = airdrops.filter((a) => a.claimable);
    
    if (claimable.length === 0) {
      alert('No claimable airdrops available.');
      return;
    }

    try {
      console.log('[Airdrop] Batch claiming:', claimable);
      
      const totalValue = claimable.reduce(
        (sum, a) => sum + parseFloat(a.value.replace('$', '')),
        0
      );
      
      alert(`Preparing to claim ${claimable.length} airdrops...\n\nTotal Value: $${totalValue.toFixed(2)}\nProtocols: ${claimable.map(a => a.protocol).join(', ')}\n\nNote: Batch claiming would:\n- Process each airdrop sequentially\n- Handle claim proofs and signatures\n- Require ~${(claimable.length * 0.001).toFixed(3)} SOL for gas\n\nBackend integration needed for secure batch operations.`);
      
      console.log('[Airdrop] Batch claim prepared:', {
        count: claimable.length,
        totalValue,
        protocols: claimable.map(a => a.protocol),
      });
    } catch (error) {
      console.error('[Airdrop] Batch claim error:', error);
      alert('Failed to batch claim airdrops. Please try claiming individually.');
    }
  };

  useEffect(() => {
    if (publicKey) {
      checkAirdrops();
    }
  }, [publicKey, checkAirdrops]);



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
