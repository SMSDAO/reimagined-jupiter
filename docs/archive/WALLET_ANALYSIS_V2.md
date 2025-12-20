# 🔍 Wallet Analysis V2 - Social Intelligence Integration

## Overview

Wallet Analysis V2 introduces comprehensive social intelligence features powered by Neynar's Farcaster API, enabling multi-dimensional trust and risk assessment for Solana wallets. This advanced system combines on-chain metrics with social proof to provide unprecedented insights into wallet credibility.

## 🌟 Key Features

### 1. **Farcaster Social Intelligence**
- **Profile Lookup by Wallet Address**: Automatically discovers Farcaster profiles linked to Solana wallets
- **Multi-Factor Scoring**: Analyzes followers, casts, verification status, and influence
- **Power Badge Recognition**: Identifies verified Farcaster power users
- **Real-Time Data**: Live integration with Neynar API for up-to-date social metrics

### 2. **Advanced Scoring Algorithms**

#### **Farcaster Score (0-100 Points)**
A comprehensive social credibility metric with five weighted components:

| Component | Weight | Max Points | Criteria |
|-----------|--------|------------|----------|
| **Followers** | 30% | 30 | Follower count with exponential scaling |
| **Casts** | 20% | 20 | Total number of posts/casts |
| **Power Badge** | 25% | 25 | Verified Farcaster power user status |
| **Verified Addresses** | 15% | 15 | Number of verified ETH/SOL addresses |
| **Influencer Status** | 10% | 10 | Average engagement rate on casts |

**Scoring Breakdown:**

**Followers (0-30 points):**
- 10,000+ followers: 30 points
- 5,000-9,999: 27 points
- 2,000-4,999: 24 points
- 1,000-1,999: 21 points
- 500-999: 18 points
- 250-499: 15 points
- 100-249: 12 points
- 50-99: 9 points
- 25-49: 6 points
- 10-24: 3 points
- <10: 0 points

**Casts (0-20 points):**
- 1,000+ casts: 20 points
- 500-999: 18 points
- 250-499: 16 points
- 100-249: 14 points
- 50-99: 12 points
- 25-49: 10 points
- 10-24: 8 points
- 5-9: 6 points
- 1-4: 4 points
- 0: 0 points

**Power Badge (0-25 points):**
- Has power badge: 25 points
- No power badge: 0 points

**Verified Addresses (0-15 points):**
- 3+ verified addresses: 15 points
- 2 verified addresses: 10 points
- 1 verified address: 5 points
- 0 verified addresses: 0 points

**Influencer Status (0-10 points):**
Based on average engagement (likes + recasts + replies) per cast:
- 50+ avg engagement: 10 points
- 25-49: 8 points
- 10-24: 6 points
- 5-9: 4 points
- 2-4: 2 points
- <2: 0 points

#### **GM Score (0-100 Points)**
Measures community engagement through "Good Morning" (GM) casts:

| Metric | Weight | Description |
|--------|--------|-------------|
| **GM Cast Count** | 30% | Number of GM casts (max 30 pts for 15+ casts) |
| **Average Likes** | 25% | Average likes on GM casts (max 25 pts) |
| **Average Recasts** | 20% | Average recasts on GM casts (max 20 pts) |
| **Consistency** | 25% | Unique days with GM casts (max 25 pts for 12.5+ days) |

**Formula:**
```
GM Score = (gmCastCount × 2) + (avgLikes × 2) + (avgRecasts × 3) + (uniqueDays × 2)
Maximum: 100 points
```

**Community Engagement Rating:**
```
Community Engagement = ((likesScore + recastsScore) / 45) × 100
```

#### **Trust Score (0-100 Points)**
Composite metric combining on-chain and social factors:

| Component | Weight | Description |
|-----------|--------|-------------|
| **Inverse Risk** | 40% | 100 - calculated risk score |
| **Farcaster Score** | 30% | Social credibility from Farcaster |
| **GM Score** | 20% | Community engagement level |
| **Age Bonus** | 10% | Wallet age bonus (max at 365+ days) |

**Formula:**
```
Trust Score = (inverseRisk × 0.4) + (farcasterScore × 0.3) + (gmScore × 0.2) + (ageBonus × 0.1)

Where:
- inverseRisk = (100 - riskScore) × 0.4
- farcasterScore = Farcaster Score × 0.3
- gmScore = GM Score × 0.2
- ageBonus = min(walletAgeInDays / 365, 1) × 10
```

### 3. **Enhanced Risk Assessment**

#### **Social Verification Bonus**
Wallets with strong Farcaster presence receive risk reduction:
- **Farcaster Score > 50**: -15 risk points
- **Farcaster Score ≤ 50**: 0 adjustment

#### **Multi-Factor Trust Evaluation**
Reduces false positives by considering:
1. **On-Chain Activity**: Transaction history, volume, protocols used
2. **Social Proof**: Farcaster profile strength and engagement
3. **Community Standing**: GM participation and consistency
4. **Time Factor**: Wallet age and activity duration

#### **Color-Coded Risk Levels**
Dynamic neon borders indicate trust levels:
- **🟢 High Trust (80-100)**: Green neon glow - Safe interaction
- **🔵 Medium Trust (60-79)**: Blue neon glow - Monitor closely
- **🟡 Low Trust (40-59)**: Orange neon glow - Exercise caution
- **🔴 Very Low Trust (0-39)**: Red neon glow - High risk

## 🎨 3D Neon Design System

### Color Scheme
- **Farcaster Blue**: `#009dff` - Represents social credibility
- **GM Green**: `#00ff9d` - Represents community engagement
- **Trust Purple**: Gradient blend of blue and green

### CSS Animations

```css
/* Neon Pulse - 3 second cycle */
@keyframes neon-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(0, 157, 255, 0.5); }
  50% { box-shadow: 0 0 25px rgba(0, 157, 255, 1), 0 0 50px rgba(0, 157, 255, 0.5); }
}

/* Neon Pulse Blue - Farcaster theme */
@keyframes neon-pulse-blue {
  0%, 100% { box-shadow: 0 0 15px #009dff; }
  50% { box-shadow: 0 0 30px #009dff, 0 0 60px #009dff; }
}

/* Float 3D - 4-6 second floating effect */
@keyframes float-3d {
  0%, 100% { transform: translateY(0px) rotateX(0deg); }
  50% { transform: translateY(-10px) rotateX(5deg); }
}

/* Glow Text - 2 second cycle */
@keyframes glow-text {
  0%, 100% { text-shadow: 0 0 10px rgba(255, 255, 255, 0.5); }
  50% { text-shadow: 0 0 20px rgba(255, 255, 255, 1), 0 0 30px rgba(0, 157, 255, 0.8); }
}
```

### Score Orbs
**Trust Score Orb (120px Circular Display):**
- Dual rotating rings with blue-green gradient
- 3D hover lift effect
- Glass morphism with backdrop-filter blur
- Dynamic glow intensity based on score

```css
.trust-orb {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #009dff, #00ff9d);
  backdrop-filter: blur(10px);
  animation: float-3d 4s ease-in-out infinite;
  position: relative;
}

.trust-orb::before,
.trust-orb::after {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: rotate 3s linear infinite;
}

.trust-orb::before {
  border-top-color: #009dff;
  border-right-color: #009dff;
}

.trust-orb::after {
  border-bottom-color: #00ff9d;
  border-left-color: #00ff9d;
  animation-direction: reverse;
}
```

## 📊 UI Components

### 1. **Hero Header**
```jsx
<div className="hero-header">
  <h1 className="animated-gradient-text glow-text">
    🔍 Advanced Wallet Analysis
  </h1>
  <p className="subtitle">Social Intelligence + On-Chain Metrics</p>
</div>
```

### 2. **Trust Score Orb**
```jsx
<div className="trust-orb-container">
  <div className="trust-orb" data-score={trustScore.totalScore}>
    <div className="score-display">
      <span className="score-value">{trustScore.totalScore}</span>
      <span className="score-label">Trust</span>
    </div>
  </div>
</div>
```

### 3. **Side-by-Side Social Cards**
```jsx
<div className="social-cards-grid">
  <div className="social-card farcaster-card">
    <div className="card-header" style={{borderColor: '#009dff'}}>
      <h3>🟦 Farcaster Score</h3>
    </div>
    <div className="score-display">{farcasterScore.totalScore}/100</div>
    <div className="factors-grid">
      <Factor label="Followers" value={farcasterScore.factors.followers} />
      <Factor label="Casts" value={farcasterScore.factors.casts} />
      <Factor label="Power Badge" value={farcasterScore.factors.powerBadge} />
      <Factor label="Verified" value={farcasterScore.factors.verified} />
      <Factor label="Influencer" value={farcasterScore.factors.influencer} />
    </div>
  </div>
  
  <div className="social-card gm-card">
    <div className="card-header" style={{borderColor: '#00ff9d'}}>
      <h3>🟩 GM Score</h3>
    </div>
    <div className="score-display">{gmScore.totalScore}/100</div>
    <div className="metrics-grid">
      <Metric label="GM Casts" value={gmScore.gmCastCount} />
      <Metric label="Avg Likes" value={gmScore.averageLikes.toFixed(1)} />
      <Metric label="Avg Recasts" value={gmScore.averageRecasts.toFixed(1)} />
      <Metric label="Consistency" value={`${gmScore.consistency} days`} />
    </div>
  </div>
</div>
```

### 4. **8-Card Metadata Grid**
```jsx
<div className="metadata-grid">
  <MetadataCard icon="💰" label="Balance" value={`${balance.toFixed(2)} SOL`} />
  <MetadataCard icon="📊" label="Transactions" value={txCount} />
  <MetadataCard icon="🎨" label="NFTs" value={nftCount} />
  <MetadataCard icon="🏦" label="DeFi Activity" value={defiScore} />
  <MetadataCard icon="📅" label="Age" value={`${ageInDays} days`} />
  <MetadataCard icon="🌐" label="Protocols" value={protocolCount} />
  <MetadataCard icon="💎" label="Token Types" value={tokenTypes} />
  <MetadataCard icon="🎯" label="Risk Level" value={riskLevel} />
</div>
```

### 5. **Activity Summary**
```jsx
<div className="activity-summary">
  <h3>📈 Recent Activity</h3>
  <div className="metrics-row">
    <Metric icon="💸" label="Total Volume" value={`$${totalVolume.toLocaleString()}`} />
    <Metric icon="🔄" label="Swaps" value={swapCount} />
    <Metric icon="🌊" label="LP Stakes" value={lpStakes} />
    <Metric icon="🎁" label="Airdrops" value={airdropsClaimed} />
    <Metric icon="🖼️" label="NFT Activity" value={nftActivity} />
  </div>
</div>
```

## 🔌 API Integration

### Neynar Farcaster API

#### Authentication
```typescript
const neynarApiKey = process.env.NEYNAR_API_KEY;
const headers = {
  'api_key': neynarApiKey,
};
```

#### Profile Lookup
```typescript
// Get Farcaster profile by Solana wallet address
const response = await axios.get(
  'https://api.neynar.com/v2/farcaster/user/bulk-by-address',
  {
    params: {
      addresses: walletAddress,
      address_types: 'verified_addresses',
    },
    headers,
  }
);
```

#### Get User Casts
```typescript
// Fetch recent casts from a user
const response = await axios.get(
  'https://api.neynar.com/v2/farcaster/feed/user/casts',
  {
    params: {
      fid: farcasterUserId,
      limit: 100,
    },
    headers,
  }
);
```

### Usage Example

```typescript
import { FarcasterScoring } from './services/farcasterScoring';
import { WalletScoring } from './services/walletScoring';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize
const connection = new Connection(rpcUrl);
const walletScoring = new WalletScoring(connection, neynarApiKey);

// Analyze wallet with social intelligence
const walletAddress = new PublicKey('YourWalletAddressHere');
const analysis = await walletScoring.analyzeWallet(walletAddress, true);

console.log('Trust Score:', analysis.socialIntelligence?.trustScore.totalScore);
console.log('Farcaster Score:', analysis.socialIntelligence?.farcasterScore.totalScore);
console.log('GM Score:', analysis.socialIntelligence?.gmScore.totalScore);
console.log('Risk Adjustment:', analysis.socialIntelligence?.riskAdjustment);
```

## 💾 Database Infrastructure

### PostgreSQL Schema

```sql
-- Wallet Analysis Table
CREATE TABLE wallet_analysis (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  total_score INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  balance_score INTEGER,
  transaction_score INTEGER,
  nft_score INTEGER,
  defi_score INTEGER,
  age_score INTEGER,
  diversification_score INTEGER,
  farcaster_score INTEGER,
  gm_score INTEGER,
  trust_score INTEGER,
  risk_adjustment INTEGER,
  airdrop_priority INTEGER,
  estimated_value DECIMAL(20, 2),
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farcaster Profiles Table
CREATE TABLE farcaster_profiles (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  fid INTEGER NOT NULL,
  username VARCHAR(100),
  display_name VARCHAR(200),
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  cast_count INTEGER DEFAULT 0,
  power_badge BOOLEAN DEFAULT FALSE,
  verified_eth_count INTEGER DEFAULT 0,
  verified_sol_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address)
);

-- GM Casts Tracking Table
CREATE TABLE gm_casts (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  cast_hash VARCHAR(100) NOT NULL,
  cast_text TEXT,
  likes INTEGER DEFAULT 0,
  recasts INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  cast_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address)
);

-- Trust Scores History Table
CREATE TABLE trust_scores_history (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  trust_score INTEGER NOT NULL,
  inverse_risk DECIMAL(5, 2),
  farcaster_contribution DECIMAL(5, 2),
  gm_contribution DECIMAL(5, 2),
  age_bonus DECIMAL(5, 2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_address) REFERENCES wallet_analysis(wallet_address)
);

-- Indexes for performance
CREATE INDEX idx_wallet_address ON wallet_analysis(wallet_address);
CREATE INDEX idx_tier ON wallet_analysis(tier);
CREATE INDEX idx_trust_score ON wallet_analysis(trust_score);
CREATE INDEX idx_analyzed_at ON wallet_analysis(analyzed_at);
CREATE INDEX idx_farcaster_fid ON farcaster_profiles(fid);
CREATE INDEX idx_gm_cast_date ON gm_casts(cast_date);
```

### Connection Pooling

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### API Endpoints

#### 1. Analyze Wallet
```typescript
POST /api/wallet/analyze
Body: { walletAddress: string, includeSocial: boolean }
Response: WalletScore
```

#### 2. Get Trust Score
```typescript
GET /api/wallet/:address/trust
Response: TrustScore
```

#### 3. Get Farcaster Profile
```typescript
GET /api/wallet/:address/farcaster
Response: FarcasterProfile
```

#### 4. Get GM Score
```typescript
GET /api/wallet/:address/gm
Response: GMScore
```

## 🎯 Use Cases

### 1. **Airdrop Eligibility**
- **High Trust Wallets (80-100)**: Priority airdrop recipients
- **Medium Trust (60-79)**: Standard eligibility
- **Low Trust (<60)**: Manual review required

### 2. **Risk Assessment for DeFi**
- Evaluate counterparties in P2P trades
- Assess borrower credibility for lending protocols
- Filter bot accounts from genuine users

### 3. **Community Building**
- Identify engaged community members (high GM score)
- Reward consistent participation
- Build trust networks based on social proof

### 4. **Anti-Sybil Protection**
- Cross-reference on-chain + social activity
- Detect coordinated fake accounts
- Validate genuine user participation

## 💡 Pro Tips

### Optimization Strategies

1. **Cache Social Data**: Store Farcaster data for 24 hours to reduce API calls
2. **Batch Processing**: Analyze multiple wallets in parallel with rate limiting
3. **Progressive Loading**: Load on-chain data first, social data second
4. **Lazy Evaluation**: Only fetch social intelligence when needed

### Best Practices

1. **API Key Management**: Store NEYNAR_API_KEY in environment variables
2. **Error Handling**: Gracefully degrade if Farcaster API is unavailable
3. **Rate Limiting**: Respect Neynar's rate limits (100 requests/minute)
4. **Data Privacy**: Only display public Farcaster information

### Performance Benchmarks

- Wallet analysis (on-chain only): ~2-3 seconds
- Wallet analysis (with social): ~5-7 seconds
- Batch analysis (10 wallets): ~30-40 seconds
- Database query: <100ms

## 🔐 Security Considerations

1. **API Key Protection**: Never expose NEYNAR_API_KEY in client-side code
2. **Input Validation**: Validate wallet addresses before API calls
3. **SQL Injection Prevention**: Use parameterized queries
4. **Rate Limiting**: Implement request throttling
5. **Data Sanitization**: Clean all user inputs and API responses

## 🚀 Getting Started

### 1. Get Neynar API Key
Sign up at [neynar.com](https://neynar.com) to get your API key.

### 2. Configure Environment
```bash
# Add to .env
NEYNAR_API_KEY=your_neynar_api_key_here
```

### 3. Initialize Services
```typescript
import { config } from './config';
import { FarcasterScoring } from './services/farcasterScoring';
import { WalletScoring } from './services/walletScoring';
import { Connection } from '@solana/web3.js';

const connection = new Connection(config.solana.rpcUrl);
const walletScoring = new WalletScoring(
  connection,
  config.neynar.apiKey
);
```

### 4. Analyze Wallets
```typescript
const analysis = await walletScoring.analyzeWallet(
  new PublicKey(walletAddress),
  true // Include social intelligence
);
```

## 📈 Roadmap

### Phase 1 ✅ (Current)
- Neynar Farcaster API integration
- Farcaster Score algorithm
- GM Score system
- Trust Score composite
- Basic UI components

### Phase 2 🔄 (In Progress)
- Database persistence
- Historical trend analysis
- Batch processing optimization
- API endpoint implementation

### Phase 3 📅 (Planned)
- Machine learning risk models
- Cross-chain identity verification
- Advanced fraud detection
- Community reputation graphs

## 📚 Additional Resources

- [Neynar API Documentation](https://docs.neynar.com)
- [Farcaster Protocol](https://www.farcaster.xyz)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style standards
- Testing requirements
- PR review process
- Documentation updates

---

**Built with ❤️ by GXQ STUDIO**

*Version: 2.0.0*
*Last Updated: November 2025*
