# Wallet Analysis V2 - Complete Documentation

## 🎯 Overview

The GXQ Studio Wallet Analysis V2 is a comprehensive blockchain intelligence system that combines on-chain data analysis, social verification through Farcaster, and advanced risk assessment algorithms to provide a complete 360-degree view of Solana wallet behavior and trustworthiness.

## ✨ Key Features

### 1. **Social Intelligence Integration**
- **Neynar Farcaster API** - Professional-grade Farcaster data provider
- **Profile Lookup by Wallet** - Automatic detection of Farcaster profiles linked to Solana wallets
- **Multi-Platform Support** - Supports both Solana and Ethereum addresses
- **Real-time Updates** - Live data from Farcaster network

### 2. **Advanced Scoring System**
- **Farcaster Score** (0-100) - Quantifies social reputation
- **GM Score** (0-100) - Measures community engagement
- **Trust Score** (0-100) - Composite metric combining multiple factors
- **Risk Score** (0-100) - Identifies potentially problematic wallets

### 3. **Comprehensive Wallet Metrics**
- Wallet age and transaction history
- Protocol diversity (DeFi, NFT, DEX interactions)
- Token holdings and portfolio value
- Activity patterns (swaps, stakes, airdrops, NFTs)
- Social verification bonus

### 4. **Database Infrastructure**
- **PostgreSQL** with connection pooling
- **5 Tables** for complete data tracking
- **4 Views** for common queries
- **Automatic indexing** for performance
- **ACID compliance** for data integrity

---

## 📊 Scoring Algorithms

### Farcaster Score (0-100 points)

The Farcaster Score evaluates a user's social reputation on the Farcaster network using a weighted algorithm:

#### **Component Breakdown:**

**1. Followers Score (30 points maximum)**
- Logarithmic scale based on follower count
- Formula: `min(30, log10(followers + 1) * 10)`
- Examples:
  - 0 followers = 0 points
  - 10 followers = 10 points
  - 100 followers = 20 points
  - 1,000 followers = 30 points
  - 10,000+ followers = 30 points (capped)

**2. Casts Score (20 points maximum)**
- Logarithmic scale based on cast count
- Formula: `min(20, log10(casts + 1) * 6.67)`
- Examples:
  - 0 casts = 0 points
  - 10 casts = 6.67 points
  - 100 casts = 13.34 points
  - 1,000 casts = 20 points
  - 5,000+ casts = 20 points (capped)

**3. Power Badge (25 points)**
- Binary: User has Farcaster Power Badge or not
- Power Badge indicates active, trusted community member
- Awarded by Farcaster protocol based on engagement and reputation

**4. Verified Addresses (15 points)**
- Binary: User has verified ETH or SOL address
- Verification proves ownership of on-chain assets
- Increases trust and authenticity

**5. Influencer Status (10 points)**
- Criteria:
  - Must have 1,000+ followers
  - Following/followers ratio < 0.5 (selective following)
- Indicates high-value content creator
- Examples:
  - 2,000 followers, 500 following = Influencer ✅
  - 1,500 followers, 1,000 following = Not an influencer ❌

#### **Calculation Example:**

```javascript
User Profile:
- Followers: 1,250
- Following: 450
- Casts: 2,340
- Power Badge: Yes
- Verified Addresses: 2 (ETH + SOL)

Score Calculation:
- Followers: log10(1251) * 10 = 30.97 → 30 points
- Casts: log10(2341) * 6.67 = 22.35 → 20 points (capped)
- Power Badge: 25 points
- Verified: 15 points
- Influencer: (450/1250 = 0.36 < 0.5) → 10 points

Total Farcaster Score: 30 + 20 + 25 + 15 + 10 = 100 points
```

---

### GM Score (0-100 points)

The GM Score measures a user's community engagement through "GM" (Good Morning) casts, a popular Farcaster ritual.

#### **Component Breakdown:**

**1. Frequency Score (40 points maximum)**
- Based on GMs per day over last 30 days
- Formula: `min(40, (gm_casts / period_days) * 30)`
- Examples:
  - 0.5 GM/day (15/month) = 15 points
  - 1 GM/day (30/month) = 30 points
  - 2 GM/day (60/month) = 40 points (capped)

**2. Engagement Score (35 points maximum)**
- Based on average engagement per GM cast
- Formula: `min(35, gm_engagement_rate * 2)`
- Engagement = (likes + recasts + replies) / gm_cast_count
- Examples:
  - 5 engagements/GM = 10 points
  - 10 engagements/GM = 20 points
  - 17.5+ engagements/GM = 35 points (capped)

**3. Consistency Score (25 points maximum)**
- Based on unique days with GM casts
- Formula: `(unique_days / period_days) * 25`
- Examples:
  - 15/30 days = 12.5 points
  - 25/30 days = 20.83 points
  - 30/30 days = 25 points

#### **Calculation Example:**

```javascript
GM Stats (last 30 days):
- Total GMs: 45
- Unique days: 28
- Total likes: 380
- Total recasts: 150
- Total replies: 95

Calculation:
- Frequency: (45/30) * 30 = 45 → 40 points (capped)
- Engagement: (380+150+95)/45 = 13.89 → 13.89 * 2 = 27.78 points
- Consistency: (28/30) * 25 = 23.33 points

Total GM Score: 40 + 27.78 + 23.33 = 91 points
```

---

### Trust Score (0-100 points)

The Trust Score is a composite metric that combines risk assessment, social verification, and wallet age into a single trustworthiness indicator.

#### **Formula:**
```
Trust Score = (40% Inverse Risk) + (30% Farcaster) + (20% GM) + (10% Age Bonus)
```

#### **Component Breakdown:**

**1. Inverse Risk Component (40% weight)**
- Formula: `(100 - risk_score) * 0.40`
- Low risk wallets contribute more to trust
- Examples:
  - Risk Score 20 → (100-20) * 0.40 = 32 points
  - Risk Score 50 → (100-50) * 0.40 = 20 points
  - Risk Score 80 → (100-80) * 0.40 = 8 points

**2. Farcaster Component (30% weight)**
- Formula: `farcaster_score * 0.30`
- Examples:
  - Farcaster Score 80 → 80 * 0.30 = 24 points
  - Farcaster Score 50 → 50 * 0.30 = 15 points
  - Farcaster Score 0 → 0 * 0.30 = 0 points

**3. GM Component (20% weight)**
- Formula: `gm_score * 0.20`
- Examples:
  - GM Score 75 → 75 * 0.20 = 15 points
  - GM Score 50 → 50 * 0.20 = 10 points
  - GM Score 0 → 0 * 0.20 = 0 points

**4. Age Bonus (10% weight maximum)**
- Logarithmic scale based on wallet age
- Formula: `min(10, log10(age_days + 1) * 4)`
- Examples:
  - 7 days old = 3.6 points
  - 30 days old = 6.0 points
  - 90 days old = 7.9 points
  - 365 days old = 10 points
  - 1000+ days old = 10 points (capped)

**5. Social Verification Bonus**
- Additional bonus if Farcaster Score > 50
- Reduces risk score by 15 points
- Applied separately to risk calculation

#### **Calculation Example:**

```javascript
Wallet Data:
- Risk Score: 22
- Farcaster Score: 87
- GM Score: 75
- Wallet Age: 365 days

Trust Score Calculation:
- Inverse Risk: (100-22) * 0.40 = 31.2 points
- Farcaster: 87 * 0.30 = 26.1 points
- GM: 75 * 0.20 = 15.0 points
- Age Bonus: min(10, log10(366) * 4) = 10.0 points

Total Trust Score: 31.2 + 26.1 + 15.0 + 10.0 = 82.3 ≈ 82 points

Trust Level: HIGH TRUST (70-85 range)
```

---

### Risk Score (0-100 points)

The Risk Score identifies potentially problematic wallets using pattern recognition and behavioral analysis.

#### **Risk Components:**

**1. Age Risk (0-25 points)**
- New wallets are higher risk
- < 7 days = 25 points
- 7-30 days = 15 points
- 30-90 days = 10 points
- 90+ days = 5 points

**2. Balance Risk (0-20 points)**
- Unusual balance patterns
- Very high balance with low activity = honeypot indicator
- Empty wallet = potential bot/spam

**3. Activity Risk (0-25 points)**
- Transaction patterns
- Too few transactions = suspicious
- Excessive transactions = bot-like behavior

**4. Diversity Risk (0-15 points)**
- Protocol interaction variety
- Single protocol = 15 points (specialized or bot)
- 2-5 protocols = 10 points
- 6-10 protocols = 5 points
- 10+ protocols = 0 points (good diversity)

**5. Pattern Risk (0-15 points)**
- Behavioral anomalies
- Honeypot patterns
- Bot-like behavior
- Scam indicators

#### **Risk Levels:**

| Score Range | Level | Color | Description |
|------------|-------|-------|-------------|
| 0-25 | LOW | 🟢 Green | Safe, trusted wallet |
| 26-50 | MEDIUM | 🟡 Orange | Monitor activity |
| 51-60 | HIGH | 🔴 Red | Exercise caution |
| 61-100 | CRITICAL | 🔴 Dark Red | Avoid interaction |

#### **Detection Flags:**

**Honeypot Detection:**
- High balance (>50 SOL) + low activity (<10 txns)
- Large incoming transfers with no outgoing
- Single large deposit with no subsequent activity

**Bot Detection:**
- Excessive NFT minting (>100 mints)
- Low protocol diversity (<3)
- Repetitive transaction patterns
- High frequency, low value transactions

**Scam Wallet:**
- Multiple incoming transfers from different sources
- Rapid conversion to stablecoins/SOL
- Quick withdrawal to new addresses
- Flagged by community reports

**Airdrop Farmer:**
- Many transactions but minimal trading
- Multiple small interactions with airdrop protocols
- Low actual portfolio value despite high activity

**Founder/VC Wallet:**
- Old wallet (>180 days)
- High activity + diverse protocols
- Large volume transactions
- Significant token holdings

---

## 🗄️ Database Schema

### Table 1: wallet_analysis

Primary table storing comprehensive wallet analysis data.

**Key Columns:**

```sql
-- Identity
wallet_address VARCHAR(44) PRIMARY KEY
first_transaction_date TIMESTAMP

-- Basic Metrics
age_days INTEGER
total_sol_transacted DECIMAL(20, 9)
total_transactions INTEGER
protocol_diversity INTEGER
token_count INTEGER
portfolio_value_usd DECIMAL(20, 2)
current_balance_sol DECIMAL(20, 9)

-- Activity Breakdown
swap_count INTEGER
lp_stake_count INTEGER
airdrop_count INTEGER
nft_mint_count INTEGER
nft_sale_count INTEGER

-- Risk Assessment
risk_score INTEGER (0-100)
risk_level VARCHAR(20)
wallet_type VARCHAR(50)
is_honeypot BOOLEAN
is_bot BOOLEAN
is_scam BOOLEAN

-- Farcaster Data
farcaster_fid INTEGER
farcaster_username VARCHAR(255)
farcaster_display_name VARCHAR(255)
farcaster_bio TEXT
farcaster_followers INTEGER
farcaster_following INTEGER
farcaster_casts INTEGER
farcaster_verified BOOLEAN
farcaster_power_badge BOOLEAN
farcaster_active_badge BOOLEAN
farcaster_score INTEGER (0-100)

-- GM Score System
gm_casts_count INTEGER
gm_total_likes INTEGER
gm_total_recasts INTEGER
gm_engagement_rate DECIMAL(5, 2)
gm_consistency_days INTEGER
gm_score INTEGER (0-100)

-- Trust Score
trust_score INTEGER (0-100)
trust_breakdown JSONB
social_verification_bonus INTEGER

-- Metadata
last_updated TIMESTAMP
analysis_version VARCHAR(10)
```

### Table 2: transactions

Individual transaction records for detailed analysis.

**Purpose:** Track every transaction for pattern recognition and historical analysis.

**Key Columns:**
- `signature` - Unique transaction identifier
- `block_time` - When transaction occurred
- `tx_type` - SWAP, TRANSFER, LP_STAKE, AIRDROP, NFT_MINT, etc.
- `programs` - Array of program IDs interacted
- `token_transfers` - JSONB array of token movements
- `sol_change` - Net SOL change (positive/negative)

### Table 3: arbitrage_opportunities

Tracks detected and executed arbitrage opportunities.

**Purpose:** Monitor profitable trading opportunities and execution success rate.

**Key Columns:**
- `opportunity_type` - FLASH_LOAN, TRIANGULAR, HYBRID
- `token_path` - Token sequence (e.g., SOL → USDC → RAY → SOL)
- `dex_path` - DEX sequence (e.g., Raydium → Orca → Jupiter)
- `expected_profit_sol` - Calculated profit
- `actual_profit_sol` - Real profit after execution
- `status` - DETECTED, EXECUTING, COMPLETED, FAILED, EXPIRED
- `confidence_score` - Trade confidence (0-100)

### Table 4: risk_assessments

Historical risk assessment data.

**Purpose:** Track how wallet risk profile changes over time.

**Key Columns:**
- `risk_score` - Overall risk (0-100)
- `age_risk`, `balance_risk`, `activity_risk`, `diversity_risk`, `pattern_risk`
- `honeypot_indicators`, `bot_indicators`, `scam_indicators` (JSONB)
- `assessment_reason` - Why assessment was triggered
- `assessed_at` - Timestamp

### Table 5: trading_history

Comprehensive trading activity.

**Purpose:** Performance tracking and strategy analysis.

**Key Columns:**
- `trade_type` - SWAP, ARBITRAGE, FLASH_LOAN, LIMIT_ORDER
- `token_in/out` - Token pair details
- `dex` - Which DEX was used
- `profit_loss_usd` - Trade performance
- `slippage` - Actual slippage encountered
- `strategy_used`, `preset_name` - Trading strategy metadata

---

## 📚 Database Views

### 1. high_risk_wallets

Pre-filtered view of wallets with risk_score > 60.

**Use Case:** Security monitoring, fraud detection

**Columns:** wallet_address, risk_score, risk_level, trust_score, farcaster_score, wallet_type

### 2. top_trusted_wallets

Wallets with trust_score >= 70.

**Use Case:** Finding reliable trading partners, community leaders

**Columns:** wallet_address, trust_score, farcaster_score, gm_score, portfolio_value_usd

### 3. active_social_wallets

Wallets with Farcaster or GM activity.

**Use Case:** Community engagement, social marketing

**Columns:** wallet_address, farcaster_username, followers, casts, gm_casts_count, trust_score

### 4. recent_profitable_trades

Last 100 successful trades with profit > 0.

**Use Case:** Strategy analysis, performance tracking

**Columns:** wallet_address, trade_type, tokens, profit_loss_usd, trust_score

### 5. arbitrage_summary

Aggregate statistics for arbitrage opportunities.

**Use Case:** Strategy effectiveness, opportunity analysis

**Columns:** opportunity_type, total_count, completed_count, avg_expected_profit, total_actual_profit

---

## 🔌 API Integration

### Neynar Farcaster API

**Base URL:** `https://api.neynar.com/v2`

**Authentication:** API Key in header

**Key Endpoints:**

1. **Get User by Verification**
   ```
   GET /farcaster/user/by-verification?address={wallet_address}
   ```
   Returns Farcaster profile linked to wallet address.

2. **Get User by FID**
   ```
   GET /farcaster/user?fid={fid}
   ```
   Returns full user profile by Farcaster ID.

3. **Get User Casts**
   ```
   GET /farcaster/casts?fid={fid}&limit=100
   ```
   Returns recent casts with engagement data.

**Rate Limits:**
- Free Tier: 100 requests/hour
- Pro Tier: 10,000 requests/hour
- Enterprise: Custom limits

---

## 💻 Usage Examples

### 1. Analyze a Wallet

```javascript
const { getCompleteProfile } = require('./src/integrations/farcaster');
const db = require('./db/database');

async function analyzeWallet(walletAddress) {
    // Get Farcaster profile and scores
    const profile = await getCompleteProfile(walletAddress);
    
    // Calculate trust score
    const riskScore = 22; // From risk assessment
    const trustData = calculateTrustScore(
        riskScore,
        profile.farcaster_score,
        profile.gm_score,
        365 // wallet age in days
    );
    
    // Store in database
    await db.walletAnalysis.upsert({
        wallet_address: walletAddress,
        ...profile,
        ...trustData,
        age_days: 365,
        risk_score: riskScore,
        risk_level: 'LOW'
    });
    
    console.log(`Trust Score: ${trustData.trust_score}`);
    console.log(`Farcaster Score: ${profile.farcaster_score}`);
    console.log(`GM Score: ${profile.gm_score}`);
}
```

### 2. Find High Trust Wallets

```javascript
async function findTrustedWallets() {
    const wallets = await db.walletAnalysis.getTopTrusted(50);
    
    wallets.forEach(wallet => {
        console.log(`${wallet.wallet_address}: Trust ${wallet.trust_score}`);
    });
}
```

### 3. Monitor High Risk Wallets

```javascript
async function monitorHighRisk() {
    const wallets = await db.walletAnalysis.getHighRisk(100);
    
    wallets.forEach(wallet => {
        console.log(`⚠️ ${wallet.wallet_address}: Risk ${wallet.risk_score} (${wallet.risk_level})`);
    });
}
```

---

## 🎨 UI Component Guidelines

### Color Scheme

**Farcaster Blue:** `#009dff`
- Used for Farcaster-related metrics
- Social verification badges
- Profile links

**GM Green:** `#00ff9d`
- Used for GM Score displays
- Community engagement metrics
- Social activity indicators

**Gradient Combinations:**
- Hero header: Purple → Blue → Green
- Score orbs: Dual rotating rings (blue/green)
- Text highlights: Cyan → Blue → Green

### Animations

**neon-pulse (3s duration):**
```css
@keyframes neon-pulse {
    0%, 100% { box-shadow: 0 0 20px #009dff; }
    50% { box-shadow: 0 0 40px #009dff, 0 0 60px #009dff; }
}
```

**float-3d (4-6s duration):**
```css
@keyframes float-3d {
    0%, 100% { transform: translateY(0) rotateX(0); }
    50% { transform: translateY(-10px) rotateX(5deg); }
}
```

**glow-text (2s duration):**
```css
@keyframes glow-text {
    0%, 100% { text-shadow: 0 0 10px #00ff9d; }
    50% { text-shadow: 0 0 20px #00ff9d, 0 0 30px #00ff9d; }
}
```

### Score Orb Design

```html
<div class="score-orb">
    <div class="orb-rings">
        <div class="ring ring-blue"></div>
        <div class="ring ring-green"></div>
    </div>
    <div class="orb-content">
        <div class="score-value">82</div>
        <div class="score-label">Trust Score</div>
    </div>
</div>
```

---

## 🚀 Pro Tips

### Optimization

1. **Database Indexes:** Already created on wallet_address, risk_score, trust_score
2. **Connection Pooling:** Configured for 2-20 connections
3. **Caching:** Store Farcaster profiles for 24 hours to reduce API calls
4. **Batch Processing:** Analyze multiple wallets in parallel

### Security

1. **Never expose API keys** in client-side code
2. **Validate wallet addresses** before database queries
3. **Sanitize inputs** to prevent SQL injection
4. **Rate limit** API endpoints to prevent abuse

### Best Practices

1. **Regular Updates:** Re-analyze wallets every 24-48 hours
2. **Social Verification:** Prioritize wallets with Farcaster profiles
3. **Trust Score Threshold:** Use 70+ for trusted interactions
4. **Risk Monitoring:** Alert on risk_score increases >20 points

---

## 📈 Performance Metrics

### Expected Query Times

- Single wallet lookup: <10ms
- Top trusted wallets (100): <50ms
- High risk wallets (100): <50ms
- Transaction history (50): <30ms
- Risk assessment insert: <20ms

### Database Size Estimates

- 10K wallets: ~50 MB
- 100K wallets: ~500 MB
- 1M wallets: ~5 GB
- 10M wallets: ~50 GB

### API Call Budget

- Initial analysis: 3 calls (profile + casts + GM stats)
- Update: 1 call (profile only)
- Recommended: Update high-activity wallets daily, others weekly

---

## 🔧 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Check PostgreSQL is running
- Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
- Test connection: `psql -h localhost -U postgres -d gxq_wallet_analysis`

**"Neynar API error 401"**
- Invalid NEYNAR_API_KEY
- Get key from https://neynar.com

**"Farcaster profile not found"**
- Wallet not linked to Farcaster account
- Try with known Farcaster wallet: `0x1234...` (ETH format)

**"Trust score is 0"**
- No Farcaster profile found
- GM Score requires recent activity (last 30 days)
- Age bonus requires wallet age > 7 days

---

## 📝 Future Enhancements

1. **Machine Learning:** Train model on historical data for better risk detection
2. **Multi-Chain:** Support Ethereum, Polygon, Arbitrum addresses
3. **Real-Time Alerts:** WebSocket notifications for risk score changes
4. **Social Graph:** Map connections between wallets via Farcaster network
5. **Reputation History:** Track trust score changes over time with visualizations
6. **Community Reports:** Allow users to flag suspicious wallets
7. **API Webhooks:** Push notifications for trust/risk threshold breaches

---

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Neynar** - Farcaster API provider
- **Farcaster** - Decentralized social protocol
- **Solana** - Blockchain infrastructure
- **PostgreSQL** - Database system

---

**Built with ❤️ by GXQ STUDIO**
