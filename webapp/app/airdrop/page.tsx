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
  socialIntelligence?: {
    farcasterScore: {
      totalScore: number;
      factors: {
        followers: number;
        casts: number;
        powerBadge: number;
        verified: number;
        influencer: number;
      };
      profile?: {
        username: string;
        displayName: string;
        followerCount: number;
        powerBadge: boolean;
      };
    };
    gmScore: {
      totalScore: number;
      gmCastCount: number;
      averageLikes: number;
      averageRecasts: number;
      communityEngagement: number;
      consistency: number;
    };
    trustScore: {
      totalScore: number;
      components: {
        inverseRisk: number;
        farcasterScore: number;
        gmScore: number;
        ageBonus: number;
      };
    };
    riskAdjustment: number;
  };
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
        socialIntelligence: {
          farcasterScore: {
            totalScore: 68,
            factors: {
              followers: 21,
              casts: 16,
              powerBadge: 0,
              verified: 10,
              influencer: 6,
            },
            profile: {
              username: 'cryptouser',
              displayName: 'Crypto User',
              followerCount: 1250,
              powerBadge: false,
            },
          },
          gmScore: {
            totalScore: 55,
            gmCastCount: 18,
            averageLikes: 8.5,
            averageRecasts: 3.2,
            communityEngagement: 65,
            consistency: 12,
          },
          trustScore: {
            totalScore: 73,
            components: {
              inverseRisk: 32,
              farcasterScore: 20.4,
              gmScore: 11,
              ageBonus: 7.5,
            },
          },
          riskAdjustment: -15,
        },
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
  };

  const claimAll = async () => {
    const claimable = airdrops.filter((a) => a.claimable);
    alert(`Claiming ${claimable.length} airdrops...`);
  };

  useEffect(() => {
    if (publicKey) {
      checkAirdrops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const getTrustRiskClass = (score: number) => {
    if (score >= 80) return 'risk-high-trust';
    if (score >= 60) return 'risk-medium-trust';
    if (score >= 40) return 'risk-low-trust';
    return 'risk-very-low-trust';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="hero-header mb-8">
          <h1 className="text-5xl font-bold mb-2 animated-gradient-text glow-text">
            🔍 Advanced Wallet Analysis
          </h1>
          <p className="text-gray-300 text-lg">
            Social Intelligence + On-Chain Metrics
          </p>
        </div>

        {!publicKey ? (
          <div className="glass-morphism rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-300">Connect your wallet to access advanced wallet analysis with social intelligence</p>
          </div>
        ) : loading ? (
          <div className="glass-morphism rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white">Analyzing Wallet...</h2>
            <p className="text-gray-400 mt-2">Fetching on-chain data and social intelligence</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Trust Score Orb + Basic Stats */}
            {walletScore && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`glass-morphism rounded-xl p-8 ${getTrustRiskClass(walletScore.socialIntelligence?.trustScore.totalScore || 0)}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                  {/* Trust Score Orb */}
                  <div className="flex justify-center">
                    <div className="trust-orb">
                      <div className="text-center relative z-10">
                        <div className="text-4xl font-bold text-white">
                          {walletScore.socialIntelligence?.trustScore.totalScore || walletScore.totalScore}
                        </div>
                        <div className="text-sm text-white/80">Trust Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Tier */}
                  <div className="text-center">
                    <div className={`inline-block px-8 py-4 rounded-full bg-gradient-to-r ${getTierColor(walletScore.tier)} text-white font-bold text-3xl mb-4`}>
                      {walletScore.tier}
                    </div>
                    <div className="text-6xl font-bold text-white mb-2">
                      {walletScore.totalScore}/100
                    </div>
                    <div className="text-gray-300">Overall Score</div>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">💰 Balance:</span>
                      <span className="text-white font-bold">{walletScore.balance.toFixed(2)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">📊 Transactions:</span>
                      <span className="text-white font-bold">{walletScore.txCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">🎨 NFTs:</span>
                      <span className="text-white font-bold">{walletScore.nftCount}</span>
                    </div>
                    {walletScore.socialIntelligence?.riskAdjustment && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">🛡️ Risk Bonus:</span>
                        <span className="text-green-400 font-bold">{walletScore.socialIntelligence.riskAdjustment} pts</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Social Intelligence Cards */}
            {walletScore?.socialIntelligence && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Farcaster Card */}
                <div className="social-card farcaster-card glass-morphism rounded-xl p-6 neon-pulse-blue">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      🟦 Farcaster Score
                    </h3>
                    {walletScore.socialIntelligence.farcasterScore.profile?.powerBadge && (
                      <span className="text-2xl">⚡</span>
                    )}
                  </div>
                  
                  <div className="text-5xl font-bold text-white mb-6">
                    {walletScore.socialIntelligence.farcasterScore.totalScore}/100
                  </div>

                  {walletScore.socialIntelligence.farcasterScore.profile && (
                    <div className="mb-6 pb-6 border-b border-white/10">
                      <div className="text-lg font-bold text-white">
                        @{walletScore.socialIntelligence.farcasterScore.profile.username}
                      </div>
                      <div className="text-sm text-gray-300">
                        {walletScore.socialIntelligence.farcasterScore.profile.followerCount.toLocaleString()} followers
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-300">Followers</div>
                      <div className="text-xl font-bold text-[#009dff]">
                        {walletScore.socialIntelligence.farcasterScore.factors.followers}/30
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300">Casts</div>
                      <div className="text-xl font-bold text-[#009dff]">
                        {walletScore.socialIntelligence.farcasterScore.factors.casts}/20
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300">Power Badge</div>
                      <div className="text-xl font-bold text-[#009dff]">
                        {walletScore.socialIntelligence.farcasterScore.factors.powerBadge}/25
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300">Verified</div>
                      <div className="text-xl font-bold text-[#009dff]">
                        {walletScore.socialIntelligence.farcasterScore.factors.verified}/15
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300">Influencer</div>
                      <div className="text-xl font-bold text-[#009dff]">
                        {walletScore.socialIntelligence.farcasterScore.factors.influencer}/10
                      </div>
                    </div>
                  </div>
                </div>

                {/* GM Score Card */}
                <div className="social-card gm-card glass-morphism rounded-xl p-6 neon-pulse-green">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    🟩 GM Score
                  </h3>
                  
                  <div className="text-5xl font-bold text-white mb-6">
                    {walletScore.socialIntelligence.gmScore.totalScore}/100
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">GM Casts</span>
                      <span className="text-xl font-bold text-[#00ff9d]">
                        {walletScore.socialIntelligence.gmScore.gmCastCount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Avg Likes</span>
                      <span className="text-xl font-bold text-[#00ff9d]">
                        {walletScore.socialIntelligence.gmScore.averageLikes.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Avg Recasts</span>
                      <span className="text-xl font-bold text-[#00ff9d]">
                        {walletScore.socialIntelligence.gmScore.averageRecasts.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Consistency</span>
                      <span className="text-xl font-bold text-[#00ff9d]">
                        {walletScore.socialIntelligence.gmScore.consistency} days
                      </span>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-sm text-gray-300 mb-2">Community Engagement</div>
                      <div className="w-full bg-white/10 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-[#00ff9d] to-[#00d4ff] h-3 rounded-full transition-all duration-500"
                          style={{ width: `${walletScore.socialIntelligence.gmScore.communityEngagement}%` }}
                        />
                      </div>
                      <div className="text-right text-sm text-[#00ff9d] mt-1">
                        {walletScore.socialIntelligence.gmScore.communityEngagement.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Trust Score Breakdown */}
            {walletScore?.socialIntelligence && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-morphism rounded-xl p-6"
              >
                <h3 className="text-2xl font-bold text-white mb-6">
                  🛡️ Trust Score Breakdown
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🔒</div>
                    <div className="text-sm text-gray-300">Inverse Risk</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {walletScore.socialIntelligence.trustScore.components.inverseRisk.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">40% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🟦</div>
                    <div className="text-sm text-gray-300">Farcaster</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {walletScore.socialIntelligence.trustScore.components.farcasterScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">30% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🟩</div>
                    <div className="text-sm text-gray-300">GM Score</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {walletScore.socialIntelligence.trustScore.components.gmScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">20% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <div className="text-sm text-gray-300">Age Bonus</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {walletScore.socialIntelligence.trustScore.components.ageBonus.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">10% weight</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Claimable Airdrops */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-morphism rounded-xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">💰 Claimable Airdrops</h2>
                <button
                  onClick={claimAll}
                  disabled={!airdrops.some((a) => a.claimable)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 neon-pulse-green"
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
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="metadata-card bg-white/5 rounded-xl p-4 flex items-center justify-between"
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
              transition={{ delay: 0.6 }}
              className="glass-morphism rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">🌐 Supported Protocols</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['Jupiter', 'Jito', 'Pyth', 'Kamino', 'Marginfi', 'Solend', 'Mango', 'Marinade', 'Lido', 'GXQ'].map((protocol) => (
                  <div key={protocol} className="metadata-card bg-white/5 rounded-lg p-3 text-center text-white">
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
