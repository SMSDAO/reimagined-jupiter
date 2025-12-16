# Mainnet Deployment Guide

## ⚠️ CRITICAL: Read This Before Deploying

This bot is now configured for **REAL MAINNET TRANSACTIONS** with actual cryptocurrency. Improper configuration or testing can result in **permanent financial loss**. Follow this guide carefully.

## Pre-Deployment Checklist

### 1. Security Review ✅
- [ ] All private keys stored in environment variables (NEVER in code)
- [ ] `.env` file added to `.gitignore`
- [ ] Production RPC endpoint configured (QuickNode recommended)
- [ ] Wallet has sufficient SOL for transactions (minimum 0.1 SOL)
- [ ] Profit distribution wallets verified and accessible
- [ ] Security checks pass: `npm start` (will run automatically)

### 2. Configuration Review ✅
- [ ] `WALLET_PRIVATE_KEY` set to base58-encoded private key
- [ ] `SOLANA_RPC_URL` set to reliable mainnet endpoint
- [ ] `RESERVE_WALLET_ADDRESS` set (currently `monads.skr` - SNS not yet implemented)
- [ ] `DAO_WALLET_ADDRESS` verified: `DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW`
- [ ] Profit percentages sum to 100% (70% + 20% + 10%)
- [ ] `MIN_PROFIT_THRESHOLD` set appropriately (recommend ≥ 0.005 or 0.5%)
- [ ] `MAX_SLIPPAGE` set appropriately (recommend ≤ 0.01 or 1%)

### 3. Devnet Testing ✅
- [ ] Tested on devnet with test SOL
- [ ] Verified transaction execution
- [ ] Verified profit distribution
- [ ] Checked all error handling
- [ ] Monitored logs for issues

### 4. Mainnet Testing (Small Amounts) ⚠️
- [ ] Start with minimum profit threshold: 0.01 SOL
- [ ] Run manual execution first: `npm start manual`
- [ ] Monitor first 5-10 transactions closely
- [ ] Verify profit distribution is working
- [ ] Check compute units and fees

## Step-by-Step Deployment

### Step 1: Environment Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/SMSDAO/reimagined-jupiter.git
   cd reimagined-jupiter
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** from template:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```bash
   # REQUIRED: Your wallet private key (base58 encoded)
   WALLET_PRIVATE_KEY=your_actual_private_key_here
   
   # REQUIRED: Mainnet RPC (use QuickNode for production)
   SOLANA_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/
   
   # Profit Distribution (verify these!)
   RESERVE_WALLET_ADDRESS=monads.skr  # ⚠️ SNS not yet implemented - use PublicKey
   RESERVE_PERCENTAGE=0.70
   
   GAS_SLIPPAGE_PERCENTAGE=0.20
   
   DAO_WALLET_ADDRESS=DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW
   DAO_PERCENTAGE=0.10
   
   # Arbitrage Settings (start conservative)
   MIN_PROFIT_THRESHOLD=0.01  # 1% minimum profit
   MAX_SLIPPAGE=0.01          # 1% max slippage
   GAS_BUFFER=1.5
   ```

### Step 2: Build and Validate

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Run security check** (happens automatically on start):
   ```bash
   npm start
   ```
   
   Review security warnings. Fix any critical issues before proceeding.

3. **Validate wallet**:
   ```bash
   npm start analyze
   ```
   
   Verify wallet has sufficient balance.

### Step 3: Test on Devnet First

1. **Configure for devnet**:
   ```bash
   # In .env, temporarily change:
   SOLANA_RPC_URL=https://api.devnet.solana.com
   ```

2. **Get devnet SOL**:
   ```bash
   solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
   ```

3. **Run test scan**:
   ```bash
   npm start scan
   ```

4. **Try manual execution**:
   ```bash
   npm start manual
   ```

5. **Monitor logs**:
   ```bash
   cat logs/arbitrage-executions.jsonl | jq .
   ```

### Step 4: Mainnet Deployment (Gradual)

⚠️ **Start SMALL and monitor CLOSELY**

1. **Switch back to mainnet**:
   ```bash
   # In .env:
   SOLANA_RPC_URL=https://your-quicknode-endpoint
   ```

2. **Phase 1: Scan Only (1 hour)**
   ```bash
   npm start scan
   ```
   
   - Monitor for opportunities
   - Verify price feeds working
   - Check DEX integrations
   - No transactions executed

3. **Phase 2: Manual Execution (2-4 hours)**
   ```bash
   npm start manual
   ```
   
   - Review each opportunity manually
   - Execute 5-10 small transactions
   - Verify profit distribution
   - Check logs after each execution
   - Monitor wallet balances

4. **Phase 3: Auto-Execution (Monitored)**
   ```bash
   npm start start
   ```
   
   - Run during hours you can actively monitor
   - Check logs every 15-30 minutes
   - Keep profit threshold high initially (≥ 1%)
   - Monitor for failed transactions
   - Watch compute unit usage

5. **Phase 4: Production (24/7)**
   ```bash
   # Consider running in screen or tmux
   screen -S arbitrage
   npm start start
   # Ctrl+A, D to detach
   ```
   
   - Lower profit threshold gradually (0.5% → 0.3%)
   - Set up automated monitoring/alerts
   - Review statistics daily
   - Keep logs backed up

## Monitoring and Maintenance

### View Statistics

```bash
# View all-time statistics
npm start stats

# View today's statistics
npm start stats today

# View this week's statistics
npm start stats week

# View this month's statistics
npm start stats month
```

### Check Logs

```bash
# View execution logs
tail -f logs/arbitrage-executions.jsonl

# Parse with jq for pretty output
cat logs/arbitrage-executions.jsonl | jq .

# Count successful trades
cat logs/arbitrage-executions.jsonl | jq 'select(.status=="success")' | wc -l

# Calculate total profit
cat logs/arbitrage-executions.jsonl | jq -s 'map(.actualProfit // 0) | add'
```

### System Health Checks

```bash
# Check wallet balance
solana balance YOUR_WALLET_ADDRESS

# Check RPC health
solana cluster-version --url YOUR_RPC_URL

# View recent transactions
solana transaction-history YOUR_WALLET_ADDRESS --limit 10
```

## Important Wallet Addresses

### Profit Distribution

1. **Reserve Wallet (70%)**:
   - Address: `monads.skr` (SNS name - not yet resolved)
   - ⚠️ **TODO**: Implement SNS resolution or use direct PublicKey
   - Purpose: Main profit accumulation

2. **Gas/Slippage Coverage (20%)**:
   - Address: Your calling wallet (the one executing trades)
   - Purpose: Cover transaction fees and slippage costs

3. **DAO Wallet (10%)**:
   - Address: `DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW`
   - Purpose: DAO treasury allocation

### Verification

Before deployment, verify you have access to:
- [ ] Reserve wallet (or its private key)
- [ ] DAO wallet (verify address is correct)
- [ ] Calling wallet (your bot wallet)

## Risk Management

### Set Appropriate Limits

```bash
# In .env:
MIN_PROFIT_THRESHOLD=0.01  # Start high (1%)
MAX_SLIPPAGE=0.01          # Keep low (1%)
GAS_BUFFER=1.5             # 50% buffer on gas estimates
```

### Monitor Key Metrics

- **Success Rate**: Should be > 80%
- **Average Profit**: Should exceed fees by 2-3x
- **Failed Transactions**: Should be < 20%
- **Compute Units**: Should stay under 1M per transaction

### Emergency Procedures

**If something goes wrong:**

1. **Stop the bot immediately**:
   ```bash
   # Press Ctrl+C if running in foreground
   # Or kill the process:
   pkill -f "node dist/index.js"
   ```

2. **Review recent logs**:
   ```bash
   tail -100 logs/arbitrage-executions.jsonl
   ```

3. **Check wallet balance**:
   ```bash
   solana balance YOUR_WALLET_ADDRESS
   ```

4. **Review failed transactions**:
   ```bash
   cat logs/arbitrage-executions.jsonl | jq 'select(.status=="failed")'
   ```

5. **Fix the issue** before restarting

## Known Limitations & TODOs

### Current Limitations

1. **SNS Resolution**: `monads.skr` is referenced but SNS resolution not implemented
   - **Workaround**: Use a direct PublicKey address for `RESERVE_WALLET_ADDRESS`

2. **Flash Loan SDK Integration**: Framework is in place but needs actual SDK integration
   - Marginfi: Requires `@mrgnlabs/marginfi-client-v2`
   - Solend: Requires `@solendprotocol/solend-sdk`
   - Mango: Requires `@blockworks-foundation/mango-v4`
   - Others: Require respective SDKs

3. **MEV Protection**: Jito bundle integration is placeholder only
   - Consider using Jito API for MEV protection

### Recommended Enhancements

1. **Implement SNS Resolution**:
   ```bash
   npm install @bonfida/spl-name-service
   ```

2. **Add Flash Loan SDKs**:
   ```bash
   npm install @mrgnlabs/marginfi-client-v2
   npm install @solendprotocol/solend-sdk
   ```

3. **Set Up Monitoring Dashboard**:
   - Grafana + Prometheus
   - Custom webhook alerts
   - Telegram/Discord notifications

4. **Implement Jito Bundles**:
   ```bash
   npm install jito-js-rpc
   ```

## Troubleshooting

### Common Issues

**Issue**: `Transaction simulation failed`
- **Cause**: Insufficient balance, bad slippage, or stale data
- **Fix**: Check wallet balance, increase slippage, or restart bot

**Issue**: `SNS resolution not yet implemented`
- **Cause**: Trying to use `monads.skr` SNS name
- **Fix**: Use a direct PublicKey address instead

**Issue**: `Rate limit exceeded`
- **Cause**: Too many RPC calls
- **Fix**: Use QuickNode or reduce scan frequency

**Issue**: `Profit distribution failed`
- **Cause**: Insufficient balance for fees or invalid addresses
- **Fix**: Check wallet balance and verify addresses

### Getting Help

1. **Check logs first**: `tail -100 logs/arbitrage-executions.jsonl`
2. **Review documentation**: `IMPLEMENTATION_GUIDE.md`
3. **Check GitHub issues**: https://github.com/SMSDAO/reimagined-jupiter/issues
4. **Security issues**: Report privately to maintainers

## Legal Disclaimer

This software is provided "as is" without warranty of any kind. Cryptocurrency trading involves substantial risk of loss. You are solely responsible for:

- Securing your private keys
- Monitoring bot operations
- Complying with applicable laws and regulations
- Any financial losses incurred

The developers are not responsible for any losses, damages, or issues arising from use of this software.

## Support

For questions or issues:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: See `IMPLEMENTATION_GUIDE.md`
- Security: Report vulnerabilities privately

---

**Remember**: Start small, monitor closely, and scale gradually. Never risk more than you can afford to lose.
