# Portfolio Analytics & Wallet Scoring Implementation

## Overview

This implementation provides comprehensive wallet scoring and portfolio analysis for the SMSDAO/reimagined-jupiter platform using live data from Jupiter APIs, on-chain queries, and deterministic scoring algorithms.

## Architecture

### Backend Services

#### 1. Portfolio Analytics Service (`src/services/portfolioAnalytics.ts`)

**Purpose**: Core service for comprehensive wallet portfolio analysis

**Key Features**:
- Live token holdings with real-time prices from Jupiter Price API
- NFT detection using on-chain token account analysis
- DeFi position tracking (lending, staking, LP tokens)
- Transaction statistics from Solana RPC
- Activity metrics (swaps, transfers, NFT activity)
- Deterministic scoring algorithms

**Main Methods**:
```typescript
analyzePortfolio(walletAddress: string): Promise<PortfolioAnalysis>
```
- Entry point for comprehensive wallet analysis
- Fetches data from multiple sources in parallel
- Returns complete portfolio snapshot with scoring

**Scoring Algorithm**:

1. **Balance Score (0-100)**: Based on total portfolio value in USD
   - $100,000+ = 100 points
   - $50,000+ = 90 points
   - $10,000+ = 80 points
   - Scales down to $0

2. **Transaction Score (0-100)**: Based on transaction count and success rate
   - 10,000+ transactions = 50 base points
   - Success rate bonus: up to 50 points
   - Combined max: 100 points

3. **NFT Score (0-100)**: Based on NFT holdings quantity
   - 100+ NFTs = 100 points
   - 50+ NFTs = 85 points
   - Scales down to 0

4. **DeFi Score (0-100)**: Based on DeFi positions and activity
   - Position value: up to 40 points
   - Activity count: up to 40 points
   - Protocol diversity: up to 20 points

5. **Consistency Score (0-100)**: Based on wallet age and activity frequency
   - Wallet age: up to 40 points
   - Activity frequency: up to 30 points
   - Activity streak: up to 30 points

6. **Diversification Score (0-100)**: Based on token variety and distribution
   - Token count: up to 50 points
   - Portfolio balance bonus: up to 50 points

**Total Score Weights**:
- Balance: 25%
- Transaction: 20%
- NFT: 10%
- DeFi: 20%
- Consistency: 15%
- Diversification: 10%

**Tier Classification**:
- WHALE: 80-100 points
- DEGEN: 65-79 points
- ACTIVE: 50-64 points
- CASUAL: 30-49 points
- NOVICE: 0-29 points

**Risk Assessment**:
- LOW: Score ≥70, success rate ≥90%, age ≥90 days
- MEDIUM: Score ≥50, success rate ≥80%, age ≥30 days
- HIGH: Score ≥30 or age ≥7 days
- CRITICAL: All other cases

### Frontend API Endpoints

#### 1. Wallet Analysis API (`webapp/app/api/wallet-analysis/[address]/route.ts`)

**Endpoint**: `GET /api/wallet-analysis/{address}`

**Purpose**: Live wallet analysis with on-chain data

**Data Sources**:
- Solana RPC for transaction history and balances
- Token account queries for holdings
- On-chain calculations for metrics

**Response Format**:
```typescript
{
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
  trust_score: number;
  last_updated: string;
  analysis_version: string;
}
```

**Caching**: 5-minute cache with 10-minute stale-while-revalidate

#### 2. Admin Portfolio Analytics API (`webapp/app/api/admin/portfolio-analytics/route.ts`)

**Endpoints**:
- `POST /api/admin/portfolio-analytics` - Batch analysis and export
- `GET /api/admin/portfolio-analytics` - Dashboard statistics

**Actions**:

1. **batch-score**: Analyze multiple wallets in parallel
   ```json
   {
     "wallets": ["address1", "address2", ...],
     "action": "batch-score"
   }
   ```
   Returns: Array of wallet scores with aggregate statistics

2. **export**: Export results as CSV
   ```json
   {
     "wallets": ["address1", "address2", ...],
     "action": "export"
   }
   ```
   Returns: CSV file download

### Frontend Components

#### 1. Wallet Analysis Page (`webapp/app/wallet-analysis/page.tsx`)

**Features**:
- Search by wallet address
- One-click analysis of connected wallet
- Trust Score visualization with animated orb
- Farcaster social integration display
- GM Score tracking
- Activity breakdown (swaps, LP stakes, airdrops, NFTs)
- Risk assessment with visual indicators
- External links to Solscan and Farcaster profiles

**UI Elements**:
- 3D animated trust score orb with rings
- Side-by-side social cards (Farcaster + GM Score)
- 8-card metadata grid
- 5-metric activity summary
- Risk assessment panel with color coding
- Responsive mobile-first design

#### 2. Portfolio Analytics Dashboard (`webapp/components/PortfolioAnalyticsDashboard.tsx`)

**Features**:
- Batch wallet analysis (multiple addresses)
- Live scoring with tier classification
- CSV export functionality
- Aggregate statistics display
- Sortable results table

**Use Cases**:
- Admin monitoring of user wallets
- Bulk airdrop eligibility checking
- Portfolio health tracking
- Export for external analysis

## Data Sources & APIs

### 1. Jupiter APIs

**Quote API**: `https://api.jup.ag/v6`
- Used for: Token prices, swap quotes
- Fallback: Direct on-chain queries

**Price API**: `https://price.jup.ag/v6`
- Used for: Real-time token prices
- Batch support: Up to 100 tokens per request
- Fallback: Default to $0 if unavailable

**Token List**: `https://token.jup.ag/all`
- Used for: Token metadata (symbol, name, decimals)
- Cached locally after first fetch

### 2. Solana RPC

**Methods Used**:
- `getBalance()` - SOL balance
- `getSignaturesForAddress()` - Transaction history
- `getParsedTokenAccountsByOwner()` - Token holdings
- `getParsedTransaction()` - Transaction details

**Rate Limiting**: Respects RPC provider limits with exponential backoff

### 3. SolanaScan API (Optional)

**Status**: Implemented with fallback
**Usage**: Enhanced transaction analysis when API key provided
**Fallback**: On-chain queries via Solana RPC

## Fallback Mechanisms

### API Rotation Strategy

1. **Primary**: Jupiter Price API
   - Real-time prices for all tokens
   - High reliability, no auth required

2. **Secondary**: Direct on-chain queries
   - Fetch account data directly
   - Calculate prices from DEX pools

3. **Tertiary**: Cached data
   - Use last known prices (with timestamp)
   - Display warning to users

### Error Handling

```typescript
try {
  // Primary API call
  const data = await jupiterClient.get('/price');
  return data;
} catch (error) {
  console.warn('Jupiter API error, falling back to on-chain');
  try {
    // Fallback to on-chain
    const onchainData = await fetchOnChainPrice();
    return onchainData;
  } catch (fallbackError) {
    console.error('All data sources failed');
    return defaultValue;
  }
}
```

### Rate Limiting

- Implements exponential backoff for failed requests
- Batch requests where possible to reduce API calls
- Client-side caching with configurable TTL

## Security Considerations

1. **No Private Keys**: All analysis is read-only using public keys
2. **Input Validation**: Wallet addresses validated before processing
3. **Rate Limiting**: Protects against abuse of batch operations
4. **CORS**: API endpoints properly configured for webapp domain
5. **Caching**: Reduces load on RPC providers and external APIs

## Performance Optimizations

1. **Parallel Queries**: Multiple data sources fetched concurrently
2. **Batch Requests**: Group multiple token price requests
3. **Pagination**: Transaction history fetched in chunks
4. **Caching**: API responses cached at edge with CDN
5. **Lazy Loading**: Heavy components loaded on-demand

## Testing Strategy

### Unit Tests
- Scoring algorithm correctness
- Data transformation functions
- Edge case handling

### Integration Tests
- API endpoint responses
- Fallback mechanisms
- Error handling

### End-to-End Tests
- Complete wallet analysis flow
- Batch processing
- CSV export functionality

## Usage Examples

### Single Wallet Analysis

```typescript
// Frontend
const response = await fetch(`/api/wallet-analysis/${walletAddress}`);
const analysis = await response.json();
console.log(`Score: ${analysis.trust_score}, Risk: ${analysis.risk_level}`);
```

### Batch Analysis (Admin)

```typescript
// Frontend
const response = await fetch('/api/admin/portfolio-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallets: ['addr1', 'addr2', 'addr3'],
    action: 'batch-score',
  }),
});
const { results, stats } = await response.json();
```

### Backend Service

```typescript
// Backend
import { PortfolioAnalyticsService } from './services/portfolioAnalytics';
import { Connection } from '@solana/web3.js';

const connection = new Connection(rpcUrl);
const service = new PortfolioAnalyticsService(connection);

const analysis = await service.analyzePortfolio(walletAddress);
console.log(`Total Score: ${analysis.scoringMetrics.totalScore}`);
console.log(`Tier: ${analysis.scoringMetrics.tier}`);
```

## Monitoring & Logging

### Audit Logging

All scoring operations are logged with:
- Wallet address (first 8 chars for privacy)
- Timestamp
- Score and tier
- Data sources used
- Errors encountered

### Performance Metrics

Track:
- Analysis duration
- API response times
- Cache hit rates
- Error rates by data source

## Future Enhancements

### Phase 2
- [ ] Real Farcaster API integration
- [ ] Enhanced NFT metadata (floor prices, collections)
- [ ] DeFi protocol-specific position tracking
- [ ] Historical score tracking and trends

### Phase 3
- [ ] Machine learning score optimization
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Advanced visualizations

## API Documentation

Complete API documentation available at `/api-docs` endpoint (Swagger/OpenAPI).

## Support

For issues or questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: See README.md and related docs

---

**Implementation Status**: ✅ Complete and Live on Mainnet
**Version**: 3.0
**Last Updated**: December 2024
