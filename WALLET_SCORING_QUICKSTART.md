# Wallet Scoring & Portfolio Analytics - Quick Start Guide

## For End Users

### Analyze a Single Wallet

1. **Navigate to Wallet Analysis Page**: Go to `/wallet-analysis`
2. **Enter Address**: Paste a Solana wallet address
3. **Click Analyze**: View comprehensive portfolio analysis
4. **Review Results**:
   - Trust Score with visual orb
   - Portfolio value and holdings
   - Transaction statistics
   - Activity breakdown
   - Risk assessment
   - NFT count

### Connect Your Wallet

1. **Connect Wallet**: Use wallet adapter (top right)
2. **Click "Analyze Connected Wallet"**: One-click analysis
3. **View Your Portfolio**: See your complete profile

## For Admins

### Access Admin Panel

1. **Navigate**: Go to `/admin`
2. **Connect Wallet**: Required for some features

### Batch Wallet Analysis

1. **Find "Portfolio Analytics" Section**
2. **Enter Wallet Addresses**: One per line in textarea
3. **Click "Analyze Wallets"**: Wait for results
4. **Review Statistics**:
   - Total wallets analyzed
   - Average score
   - Tier distribution
   - Individual results table
5. **Export**: Click "Export CSV" to download results

### View Audit Logs

1. **Scroll to "Audit Logs" Section**
2. **View Recent Operations**: Last 50 entries by default
3. **Enable Auto-Refresh**: Toggle for live updates (5s)
4. **Review Statistics**:
   - Total operations
   - Success rate
   - Average duration
   - Operation type breakdown
5. **Export Logs**:
   - Click "Export JSON" for full log data
   - Click "Export CSV" for spreadsheet format

## For Developers

### Run the Application

```bash
# Backend
cd /path/to/reimagined-jupiter
npm install
npm run build
npm start

# Frontend (separate terminal)
cd webapp
npm install
npm run dev
```

### Test the Portfolio Analytics

```bash
# Run test suite
npm test src/__tests__/portfolioAnalytics.test.ts

# Run all tests
npm test
```

### API Usage Examples

#### Single Wallet Analysis
```bash
curl https://your-domain.com/api/wallet-analysis/YOUR_WALLET_ADDRESS
```

#### Batch Analysis (requires authentication in production)
```bash
curl -X POST https://your-domain.com/api/admin/portfolio-analytics \
  -H "Content-Type: application/json" \
  -d '{
    "wallets": ["address1", "address2", "address3"],
    "action": "batch-score"
  }'
```

#### View Audit Logs
```bash
# Get recent logs with statistics
curl https://your-domain.com/api/admin/audit-logs?action=recent&limit=50

# Get statistics only
curl https://your-domain.com/api/admin/audit-logs?action=stats

# Export as JSON
curl https://your-domain.com/api/admin/audit-logs?action=export-json > audit-logs.json

# Export as CSV
curl https://your-domain.com/api/admin/audit-logs?action=export-csv > audit-logs.csv
```

### Environment Variables

Required:
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

Optional (for enhanced features):
```bash
# SolanaScan API (for enhanced transaction analysis)
SOLANASCAN_API_KEY=your_api_key_here

# QuickNode (for better RPC performance)
QUICKNODE_RPC_URL=your_quicknode_url_here
```

## Common Use Cases

### 1. Airdrop Eligibility Check

**Goal**: Find wallets eligible for airdrop based on criteria

**Steps**:
1. Go to Admin Panel → Portfolio Analytics
2. Paste list of wallet addresses
3. Click "Analyze Wallets"
4. Filter results by score/tier
5. Export qualified wallets to CSV

**Criteria Example**:
- Score > 50 (ACTIVE tier or higher)
- Risk level: LOW or MEDIUM
- Transaction count > 100

### 2. User Tier Assignment

**Goal**: Assign user tiers for feature access

**Steps**:
1. Analyze user wallet via API or UI
2. Get tier from `scoringMetrics.tier`
3. Map tier to feature access:
   - WHALE: Premium features + special access
   - DEGEN: Advanced features
   - ACTIVE: Standard features
   - CASUAL: Basic features
   - NOVICE: Limited features

### 3. Risk Assessment for Trading

**Goal**: Assess counterparty risk before large trades

**Steps**:
1. Analyze counterparty wallet
2. Check risk level (`scoringMetrics.riskLevel`)
3. Review transaction success rate
4. Check wallet age and consistency
5. Make informed decision:
   - LOW risk: Proceed with confidence
   - MEDIUM risk: Normal due diligence
   - HIGH risk: Enhanced verification
   - CRITICAL risk: Avoid or use escrow

### 4. Portfolio Health Monitoring

**Goal**: Track portfolio health over time

**Steps**:
1. Analyze wallet periodically (daily/weekly)
2. Record scores and metrics
3. Compare over time:
   - Is diversification improving?
   - Are NFT holdings growing?
   - Is activity consistent?
4. Make adjustments based on trends

### 5. Bulk User Analysis

**Goal**: Analyze all platform users at once

**Steps**:
1. Export user wallet addresses from database
2. Use Admin Panel batch analysis
3. Review aggregate statistics
4. Identify high-value users (WHALE/DEGEN tier)
5. Flag risky users (HIGH/CRITICAL risk)
6. Export results for further analysis

## Troubleshooting

### "Invalid wallet address" error
- Ensure address is valid Solana address (43-44 characters)
- Check for extra spaces or special characters

### "Failed to analyze wallet" error
- Check RPC connection (SOLANA_RPC_URL)
- Verify RPC endpoint is responsive
- Try again (may be temporary rate limit)

### Slow analysis performance
- Use premium RPC endpoint (QuickNode, Helius)
- Reduce batch size for bulk analysis
- Check network connectivity

### Missing price data
- Jupiter Price API may be rate-limited
- Fallback to cached prices (check timestamp)
- Some tokens may not have price data

### Audit logs not showing
- Ensure you're on the admin page (`/admin`)
- Check browser console for errors
- Try manual refresh

## Best Practices

### For Users
- ✅ Analyze your wallet to see your score
- ✅ Check risk assessment before large transactions
- ✅ Monitor portfolio value regularly
- ✅ Review activity metrics for insights

### For Admins
- ✅ Use batch analysis for efficiency
- ✅ Export results for external processing
- ✅ Monitor audit logs for issues
- ✅ Check statistics regularly
- ✅ Review failed operations

### For Developers
- ✅ Use TypeScript types for safety
- ✅ Handle errors gracefully
- ✅ Implement caching where appropriate
- ✅ Test with mock data first
- ✅ Monitor API rate limits
- ✅ Log important operations

## Security Notes

- 🔒 All analysis is **read-only** (no private keys required)
- 🔒 Wallet addresses are **masked** in audit logs
- 🔒 **No sensitive data** is stored permanently
- 🔒 API endpoints should be **authenticated** in production
- 🔒 Rate limiting should be **enabled** for public APIs

## Performance Tips

- ⚡ Use batch analysis for multiple wallets (parallel processing)
- ⚡ Enable caching (5-minute default)
- ⚡ Use premium RPC for faster queries
- ⚡ Limit transaction history fetch (default 1000)
- ⚡ Export large datasets instead of viewing in UI

## Support

- 📖 **Full Documentation**: See `PORTFOLIO_ANALYTICS_GUIDE.md`
- 📖 **Implementation Details**: See `WALLET_SCORING_IMPLEMENTATION.md`
- 🐛 **Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues
- 💬 **Discussions**: GitHub Discussions

## Next Steps

1. **Test the features** with your own wallet
2. **Try batch analysis** with multiple addresses
3. **Review audit logs** to see operations
4. **Export some data** to understand format
5. **Integrate into your workflow**

---

**Ready to start?** Head to `/wallet-analysis` or `/admin`!
