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
  claimed?: boolean;
  claimDeadline?: string;
  onChainVerified?: boolean;
  eligibilityReason?: string;
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
      // Fetch real wallet analysis and airdrop data from API
      const response = await fetch(`/api/wallet-analysis/${publicKey.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet analysis');
      }
      
      const analysis = await response.json();
      
      // Calculate basic metrics from Solana
      const balance = await connection.getBalance(publicKey);
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
      
      // Build wallet score from API data
      const score: WalletScore = {
        address: publicKey.toString(),
        totalScore: analysis.trust_score || 0,
        tier: getTierFromScore(analysis.trust_score || 0),
        balance: balance / 1e9,
        txCount: signatures.length,
        nftCount: analysis.nft_mint_count + analysis.nft_sale_count || 0,
      };
      
      // Add social intelligence if available
      if (analysis.farcaster_fid) {
        score.socialIntelligence = {
          farcasterScore: {
            totalScore: analysis.farcaster_score || 0,
            factors: {
              followers: analysis.farcaster_followers || 0,
              casts: analysis.farcaster_casts || 0,
              powerBadge: analysis.farcaster_power_badge ? 25 : 0,
              verified: analysis.farcaster_verified ? 10 : 0,
              influencer: analysis.farcaster_followers > 5000 ? 15 : 0,
            },
            profile: {
              username: analysis.farcaster_username || '',
              displayName: analysis.farcaster_display_name || '',
              followerCount: analysis.farcaster_followers || 0,
              powerBadge: analysis.farcaster_power_badge || false,
            },
          },
          gmScore: {
            totalScore: analysis.gm_score || 0,
            gmCastCount: analysis.gm_casts_count || 0,
            averageLikes: analysis.gm_total_likes / Math.max(analysis.gm_casts_count, 1) || 0,
            averageRecasts: analysis.gm_total_recasts / Math.max(analysis.gm_casts_count, 1) || 0,
            communityEngagement: analysis.gm_engagement_rate || 0,
            consistency: analysis.gm_consistency_days || 0,
          },
          trustScore: {
            totalScore: analysis.trust_score || 0,
            components: analysis.trust_breakdown || {
              inverseRisk: 0,
              farcasterScore: 0,
              gmScore: 0,
              ageBonus: 0,
            },
          },
          riskAdjustment: -analysis.risk_score || 0,
        };
      }
      
      setWalletScore(score);

      // Fetch real airdrop data using updated API
      const airdropResponse = await fetch(`/api/airdrops/check?walletAddress=${publicKey.toString()}`);
      
      if (airdropResponse.ok) {
        const airdropData = await airdropResponse.json();
        if (airdropData.success && airdropData.airdrops && Array.isArray(airdropData.airdrops)) {
          // Map API response to expected format
          const mappedAirdrops = airdropData.airdrops.map((a: any) => ({
            protocol: a.protocol,
            amount: `${a.amount.toLocaleString()} tokens`,
            value: `$${(a.amount * 0.5).toFixed(2)}`, // Placeholder value
            claimable: a.claimable && !a.claimed,
            claimed: a.claimed,
            claimDeadline: a.claimDeadline,
            onChainVerified: a.onChainVerified,
            eligibilityReason: a.eligibilityReason,
          }));
          setAirdrops(mappedAirdrops);
          console.log(`✅ Found ${mappedAirdrops.length} airdrops (${mappedAirdrops.filter((a: any) => a.claimable).length} claimable)`);
        }
      } else {
        // If API fails, show empty array instead of mock data
        console.warn('Airdrop API failed, showing empty list');
        setAirdrops([]);
      }
    } catch (error) {
      console.error('Error checking airdrops:', error);
      setAirdrops([]);
    } finally {
      setLoading(false);
    }
  };
  
  const getTierFromScore = (score: number): WalletScore['tier'] => {
    if (score >= 90) return 'WHALE';
    if (score >= 75) return 'DEGEN';
    if (score >= 60) return 'ACTIVE';
    if (score >= 40) return 'CASUAL';
    return 'NOVICE';
  };

  const claimAirdrop = async (airdrop: Airdrop) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Show donation acknowledgment
    const donationAmount = parseFloat(airdrop.amount.replace(/[^\d.]/g, '')) * 0.10;
    const confirmed = confirm(
      `🎁 Claim ${airdrop.protocol} Airdrop\n\n` +
      `Amount: ${airdrop.amount}\n` +
      `Value: ${airdrop.value}\n\n` +
      `📢 IMPORTANT: 10% Donation to Dev Wallet\n` +
      `Donation: ${donationAmount.toLocaleString()} tokens (~$${(donationAmount * 0.5).toFixed(2)})\n\n` +
      `Dev wallet: monads.solana\n\n` +
      `This helps support the development of GXQ Studio.\n\n` +
      `Do you want to proceed with the claim?`
    );
    
    if (!confirmed) {
      console.log('User cancelled claim');
      return;
    }
    
    try {
      setLoading(true);
      
      // Note: In production, this would:
      // 1. Build the claim transaction on client
      // 2. Sign it with wallet adapter
      // 3. Submit signed transaction to API
      // For now, we call the API to log the attempt
      
      const response = await fetch('/api/airdrops/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: airdrop.protocol,
          walletAddress: publicKey.toString(),
          signedTransaction: '', // Placeholder - would be actual signed tx
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(
          `✅ Successfully claimed ${airdrop.amount} from ${airdrop.protocol}!\n\n` +
          `Transaction: ${result.signature}\n` +
          `Donation: ${result.donationSignature}\n\n` +
          `Thank you for supporting GXQ Studio! 🎉`
        );
        // Refresh airdrops after claiming
        await checkAirdrops();
      } else {
        alert(
          `⚠️ Claim Status: ${result.message}\n\n` +
          `${result.note}\n\n` +
          `Error: ${result.error || 'See console for details'}`
        );
      }
    } catch (error) {
      console.error('Error claiming airdrop:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const claimAll = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    
    const claimable = airdrops.filter((a) => a.claimable);
    if (claimable.length === 0) {
      alert('No claimable airdrops available');
      return;
    }
    
    // Calculate total donation
    const totalAmount = claimable.reduce((sum, a) => {
      return sum + parseFloat(a.amount.replace(/[^\d.]/g, ''));
    }, 0);
    const totalDonation = totalAmount * 0.10;
    const totalValue = claimable.reduce((sum, a) => {
      return sum + parseFloat(a.value.replace(/[^\d.]/g, ''));
    }, 0);
    
    // Show comprehensive claim confirmation
    const confirmed = confirm(
      `🎁 Claim All Airdrops\n\n` +
      `Total Claims: ${claimable.length}\n` +
      `Protocols: ${claimable.map(a => a.protocol).join(', ')}\n` +
      `Total Tokens: ${totalAmount.toLocaleString()}\n` +
      `Total Value: $${totalValue.toFixed(2)}\n\n` +
      `📢 DONATION TO DEV WALLET\n` +
      `10% of all claims: ${totalDonation.toLocaleString()} tokens (~$${(totalDonation * 0.5).toFixed(2)})\n` +
      `Dev wallet: monads.solana\n\n` +
      `This supports the continued development of GXQ Studio.\n\n` +
      `Proceed with batch claim?`
    );
    
    if (!confirmed) {
      console.log('User cancelled batch claim');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/airdrops/claim-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          signedTransactions: [], // Placeholder
          protocols: claimable.map(a => a.protocol),
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(
          `✅ Successfully claimed ${result.claimed} out of ${claimable.length} airdrops!\n\n` +
          `Check your wallet for tokens.\n\n` +
          `Thank you for supporting GXQ Studio! 🎉`
        );
        // Refresh airdrops after claiming
        await checkAirdrops();
      } else {
        alert(
          `⚠️ Batch Claim Status: ${result.message}\n\n` +
          `${result.note}\n\n` +
          `Total Claims: ${result.totalClaims || claimable.length}`
        );
      }
    } catch (error) {
      console.error('Error claiming airdrops:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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
                  disabled={loading || !airdrops.some((a) => a.claimable && !a.claimed)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed neon-pulse-green"
                >
                  {loading ? 'Processing...' : 'Claim All'}
                </button>
              </div>

              <div className="space-y-4">
                {airdrops.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Airdrops Found</h3>
                    <p className="text-gray-400">
                      This wallet is not currently eligible for any active airdrops.
                      <br />
                      Check back later or increase your on-chain activity!
                    </p>
                  </div>
                ) : (
                  airdrops.map((airdrop, index) => (
                    <motion.div
                      key={airdrop.protocol}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={`metadata-card rounded-xl p-4 flex items-center justify-between ${
                        airdrop.claimable ? 'bg-green-900/20 border border-green-500/30' : 
                        airdrop.claimed ? 'bg-gray-900/20 border border-gray-500/30' : 
                        'bg-white/5'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">{airdrop.protocol}</h3>
                          {airdrop.claimed && (
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">✓ Claimed</span>
                          )}
                          {airdrop.claimable && !airdrop.claimed && (
                            <span className="text-xs bg-green-700 text-green-200 px-2 py-1 rounded animate-pulse">● Live</span>
                          )}
                          {airdrop.onChainVerified && (
                            <span className="text-xs bg-blue-700 text-blue-200 px-2 py-1 rounded" title="Verified on-chain">⛓️ Verified</span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1">
                          <span className="text-purple-400">💎 {airdrop.amount}</span>
                          <span className="text-green-400">💵 {airdrop.value}</span>
                        </div>
                        {airdrop.eligibilityReason && (
                          <div className="text-xs text-gray-400 mt-1">
                            {airdrop.eligibilityReason}
                          </div>
                        )}
                        {airdrop.claimDeadline && (
                          <div className="text-xs text-orange-400 mt-1">
                            ⏰ Deadline: {new Date(airdrop.claimDeadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {airdrop.claimable && !airdrop.claimed ? (
                        <button
                          onClick={() => claimAirdrop(airdrop)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Processing...' : 'Claim'}
                        </button>
                      ) : airdrop.claimed ? (
                        <span className="text-gray-500 px-6 py-3 font-bold">✓ Claimed</span>
                      ) : (
                        <span className="text-gray-400 px-6 py-3">Not Eligible</span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-300 mb-1">Claimable Airdrops</div>
                    <div className="text-2xl font-bold text-white">
                      {airdrops.filter((a) => a.claimable && !a.claimed).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300 mb-1">Total Value</div>
                    <div className="text-2xl font-bold text-green-400">
                      ${airdrops.filter((a) => a.claimable && !a.claimed).reduce((sum, a) => sum + parseFloat(a.value.replace(/[^\d.]/g, '') || '0'), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">💰 Dev Fee (10%):</span>
                    <span className="text-yellow-400 font-bold">
                      ${(airdrops.filter((a) => a.claimable && !a.claimed).reduce((sum, a) => sum + parseFloat(a.value.replace(/[^\d.]/g, '') || '0'), 0) * 0.10).toFixed(2)}
                    </span>
                  </div>
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
