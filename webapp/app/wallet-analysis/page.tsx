'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import './styles.css';

// Solana address length constants
const SOLANA_ADDRESS_LENGTH_LONG = 44;
const SOLANA_ADDRESS_LENGTH_SHORT = 43;

// Wallet analysis response interface
interface WalletAnalysis {
  wallet_address: string;
  age_days: number;
  first_transaction_date: string;
  total_sol_transacted: number;
  total_transactions: number;
  protocol_diversity: number;
  token_count: number;
  portfolio_value_usd: number;
  current_balance_sol: number;
  swap_count: number;
  lp_stake_count: number;
  airdrop_count: number;
  nft_mint_count: number;
  nft_sale_count: number;
  risk_score: number;
  risk_level: string;
  wallet_type: string;
  is_honeypot: boolean;
  is_bot: boolean;
  is_scam: boolean;
  farcaster_fid?: number;
  farcaster_username?: string;
  farcaster_display_name?: string;
  farcaster_bio?: string;
  farcaster_followers?: number;
  farcaster_following?: number;
  farcaster_casts?: number;
  farcaster_verified?: boolean;
  farcaster_power_badge?: boolean;
  farcaster_active_badge?: boolean;
  farcaster_score?: number;
  gm_casts_count?: number;
  gm_total_likes?: number;
  gm_total_recasts?: number;
  gm_engagement_rate?: number;
  gm_consistency_days?: number;
  gm_score?: number;
  trust_score: number;
  trust_breakdown?: {
    inverse_risk: number;
    farcaster: number;
    gm: number;
    age_bonus: number;
  };
  social_verification_bonus?: number;
  last_updated: string;
  analysis_version: string;
}

export default function WalletAnalysis() {
  const { publicKey } = useWallet();
  const [walletAddress, setWalletAddress] = useState('');
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeWallet = async (address: string) => {
    if (!address || (address.length !== SOLANA_ADDRESS_LENGTH_LONG && address.length !== SOLANA_ADDRESS_LENGTH_SHORT)) {
      setError('Invalid Solana wallet address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch wallet analysis data
      const response = await fetch(`/api/wallet-analysis/${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze wallet');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeWallet(walletAddress);
  };

  const handleConnectedWallet = () => {
    if (publicKey) {
      const address = publicKey.toBase58();
      setWalletAddress(address);
      analyzeWallet(address);
    }
  };

  return (
    <div className="wallet-analysis-container">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-header"
      >
        <h1 className="hero-title gradient-text glow-text">
          🔍 Wallet Intelligence V2
        </h1>
        <p className="hero-subtitle">
          Advanced Social Intelligence • Risk Assessment • Trust Scoring
        </p>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="search-section"
      >
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter Solana wallet address..."
            className="search-input"
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '🔄 Analyzing...' : '🔍 Analyze'}
          </button>
        </form>

        {publicKey && (
          <button onClick={handleConnectedWallet} className="btn-secondary">
            📱 Analyze Connected Wallet
          </button>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
      </motion.div>

      {/* Analysis Results */}
      {analysis && (
        <div className="analysis-results">
          {/* Trust Score Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="trust-score-orb-container"
          >
            <div className="trust-score-orb float-3d">
              <div className="orb-rings">
                <div className="ring ring-blue neon-pulse-blue"></div>
                <div className="ring ring-green neon-pulse"></div>
              </div>
              <div className="orb-content">
                <div className="score-value gradient-text">{analysis.trust_score || 0}</div>
                <div className="score-label">Trust Score</div>
                <div className="score-breakdown">
                  {analysis.trust_breakdown && (
                    <>
                      <span>Risk: {analysis.trust_breakdown.inverse_risk}%</span>
                      <span>Social: {analysis.trust_breakdown.farcaster}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Social Cards Side by Side */}
          <div className="social-cards-container">
            {/* Farcaster Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="social-card farcaster-card"
            >
              <div className="card-header">
                <h3 className="card-title">🌐 Farcaster Score</h3>
                <div className="score-badge farcaster-badge">
                  {analysis.farcaster_score || 0}
                </div>
              </div>
              
              {analysis.farcaster_username ? (
                <div className="card-content">
                  <div className="profile-info">
                    <div className="profile-name">{analysis.farcaster_display_name}</div>
                    <div className="profile-username">@{analysis.farcaster_username}</div>
                    {analysis.farcaster_bio && (
                      <div className="profile-bio">{analysis.farcaster_bio}</div>
                    )}
                  </div>
                  
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">{analysis.farcaster_followers || 0}</div>
                      <div className="stat-label">Followers</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{analysis.farcaster_casts || 0}</div>
                      <div className="stat-label">Casts</div>
                    </div>
                  </div>

                  <div className="badges-row">
                    {analysis.farcaster_power_badge && (
                      <span className="badge badge-power">⚡ Power</span>
                    )}
                    {analysis.farcaster_verified && (
                      <span className="badge badge-verified">✓ Verified</span>
                    )}
                    {analysis.farcaster_active_badge && (
                      <span className="badge badge-active">🟢 Active</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card-content-empty">
                  <p>No Farcaster profile linked to this wallet</p>
                </div>
              )}
            </motion.div>

            {/* GM Score Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="social-card gm-card"
            >
              <div className="card-header">
                <h3 className="card-title">☀️ GM Score</h3>
                <div className="score-badge gm-badge">
                  {analysis.gm_score || 0}
                </div>
              </div>
              
              <div className="card-content">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{analysis.gm_casts_count || 0}</div>
                    <div className="stat-label">GM Casts</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{analysis.gm_total_likes || 0}</div>
                    <div className="stat-label">Total Likes</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{analysis.gm_total_recasts || 0}</div>
                    <div className="stat-label">Recasts</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{analysis.gm_engagement_rate || 0}%</div>
                    <div className="stat-label">Engagement</div>
                  </div>
                </div>

                <div className="consistency-bar">
                  <div className="consistency-label">
                    🔥 {analysis.gm_consistency_days || 0} Day Streak
                  </div>
                  <div className="consistency-progress">
                    <div 
                      className="consistency-fill" 
                      style={{ width: `${Math.min(100, (analysis.gm_consistency_days || 0) / 30 * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 8-Card Metadata Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="metadata-grid"
          >
            <div className="meta-card">
              <div className="meta-icon">📅</div>
              <div className="meta-value">{analysis.age_days || 0} days</div>
              <div className="meta-label">Wallet Age</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">💰</div>
              <div className="meta-value">{analysis.current_balance_sol?.toFixed(2) || 0} SOL</div>
              <div className="meta-label">Balance</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">📊</div>
              <div className="meta-value">{analysis.total_transactions || 0}</div>
              <div className="meta-label">Transactions</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">💎</div>
              <div className="meta-value">{analysis.total_sol_transacted?.toFixed(2) || 0}</div>
              <div className="meta-label">SOL Volume</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">🎯</div>
              <div className="meta-value">{analysis.protocol_diversity || 0}</div>
              <div className="meta-label">Protocols</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">🪙</div>
              <div className="meta-value">{analysis.token_count || 0}</div>
              <div className="meta-label">Tokens</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">💵</div>
              <div className="meta-value">${analysis.portfolio_value_usd?.toFixed(2) || 0}</div>
              <div className="meta-label">Portfolio</div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">🏷️</div>
              <div className="meta-value">{analysis.wallet_type || 'Unknown'}</div>
              <div className="meta-label">Type</div>
            </div>
          </motion.div>

          {/* Activity Summary (5 metrics) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="activity-summary"
          >
            <h3 className="section-title">📈 Activity Breakdown</h3>
            <div className="activity-grid">
              <div className="activity-item">
                <div className="activity-icon">🔄</div>
                <div className="activity-count">{analysis.swap_count || 0}</div>
                <div className="activity-label">Swaps</div>
              </div>

              <div className="activity-item">
                <div className="activity-icon">💧</div>
                <div className="activity-count">{analysis.lp_stake_count || 0}</div>
                <div className="activity-label">LP Stakes</div>
              </div>

              <div className="activity-item">
                <div className="activity-icon">🎁</div>
                <div className="activity-count">{analysis.airdrop_count || 0}</div>
                <div className="activity-label">Airdrops</div>
              </div>

              <div className="activity-item">
                <div className="activity-icon">🎨</div>
                <div className="activity-count">{analysis.nft_mint_count || 0}</div>
                <div className="activity-label">NFT Mints</div>
              </div>

              <div className="activity-item">
                <div className="activity-icon">💸</div>
                <div className="activity-count">{analysis.nft_sale_count || 0}</div>
                <div className="activity-label">NFT Sales</div>
              </div>
            </div>
          </motion.div>

          {/* Risk Assessment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`risk-assessment risk-level-${analysis.risk_level?.toLowerCase() || 'unknown'}`}
          >
            <h3 className="section-title">🛡️ Risk Assessment</h3>
            <div className="risk-content">
              <div className="risk-score-display">
                <div className="risk-score-value">{analysis.risk_score || 0}</div>
                <div className="risk-score-label">{analysis.risk_level || 'UNKNOWN'} RISK</div>
              </div>

              <div className="risk-indicators">
                {analysis.is_honeypot && <span className="risk-badge">⚠️ Honeypot Pattern</span>}
                {analysis.is_bot && <span className="risk-badge">🤖 Bot-like Behavior</span>}
                {analysis.is_scam && <span className="risk-badge">🚨 Scam Indicators</span>}
                {(analysis.social_verification_bonus ?? 0) > 0 && (
                  <span className="risk-badge bonus">✓ Social Verified (-{analysis.social_verification_bonus})</span>
                )}
              </div>

              <div className="risk-description">
                {analysis.risk_level === 'LOW' && '🟢 Low risk - Safe for interaction'}
                {analysis.risk_level === 'MEDIUM' && '🟡 Medium risk - Monitor activity'}
                {analysis.risk_level === 'HIGH' && '🔴 High risk - Exercise caution'}
                {analysis.risk_level === 'CRITICAL' && '🔴 Critical risk - Avoid interaction'}
              </div>
            </div>
          </motion.div>

          {/* External Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="external-links"
          >
            <a
              href={`https://solscan.io/account/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              🔗 View on Solscan
            </a>

            {analysis.farcaster_username && (
              <a
                href={`https://warpcast.com/${analysis.farcaster_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link farcaster-link"
              >
                🌐 View Farcaster Profile
              </a>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
