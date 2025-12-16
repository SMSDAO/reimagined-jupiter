# Security Best Practices Guide

## Overview

This guide outlines security best practices for deploying and operating the GXQ STUDIO flash loan arbitrage system with profit distribution.

## Critical Security Rules

### 1. Private Key Management

**NEVER commit private keys to version control**

✅ **DO:**
```bash
# Use environment variables
WALLET_PRIVATE_KEY=your_private_key_here

# Or use hardware wallets for production
# Ledger, Trezor, etc.
```

❌ **DON'T:**
```typescript
// Never hardcode private keys
const privateKey = "5J4k3L2m..."; // NEVER DO THIS
```

### 2. Environment Variables

**All sensitive data must be in `.env` file (never committed)**

Required variables:
```bash
# Wallet Configuration
SOLANA_RPC_URL=https://your-rpc-endpoint.com
WALLET_PRIVATE_KEY=your_base58_private_key

# QuickNode (Optional but recommended for production)
QUICKNODE_RPC_URL=https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/
QUICKNODE_API_KEY=your_api_key

# Profit Distribution
RESERVE_WALLET_DOMAIN=monads.skr
DAO_WALLET_ADDRESS=DmtAdUSzFvcBymUmRFgPVawvoXbqdS2o18eZNpe5XcWW
```

### 3. RPC Endpoint Security

**Use private RPC endpoints for production**

✅ **Recommended:**
- QuickNode (paid, reliable, high performance)
- Helius (paid, MEV protection)
- Private self-hosted nodes

❌ **Not Recommended for Production:**
- Public free RPCs (rate limited, unreliable)
- Shared endpoints

### 4. Transaction Security

**Always validate before signing transactions**

```typescript
// Pre-flight checks
if (profitAmount <= 0) {
  throw new Error('Invalid profit amount');
}

if (!recipientAddress.isValid()) {
  throw new Error('Invalid recipient address');
}

// Check balance before transfer
const balance = await connection.getBalance(sourceWallet.publicKey);
if (balance < transferAmount) {
  throw new Error('Insufficient balance');
}

// Simulate transaction first
const simulation = await connection.simulateTransaction(transaction);
if (simulation.value.err) {
  throw new Error('Transaction simulation failed');
}
```

### 5. MEV Protection

**Protect against front-running and sandwich attacks**

```typescript
// Use Jito bundles for MEV protection
const bundleId = await mevProtection.applyJitoBundle(transactions);

// Or use private RPC
const signature = await mevProtection.usePrivateRPC(transaction);

// Set appropriate priority fees
const priorityFee = await mevProtection.calculatePriorityFee('high');
```

### 6. Wallet Encryption

**Encrypt wallet private keys at rest**

```bash
# Use encrypted environment variables
# Tools like AWS Secrets Manager, HashiCorp Vault, etc.

# Or encrypt locally
openssl enc -aes-256-cbc -in wallet.key -out wallet.key.enc
```

## Production Deployment Checklist

### Pre-Deployment

- [ ] All private keys stored securely (not in code)
- [ ] Environment variables configured
- [ ] RPC endpoint is production-grade (QuickNode, Helius, etc.)
- [ ] SNS domain resolution tested (`monads.skr`)
- [ ] Wallet addresses verified (reserve, DAO)
- [ ] Profit distribution percentages validated (sum to 1.0)
- [ ] Gas buffer configured appropriately
- [ ] Min profit threshold set conservatively

### Testing Phase

- [ ] Test on Solana devnet first
- [ ] Verify profit distribution with test amounts
- [ ] Test SNS domain resolution
- [ ] Verify transaction confirmations
- [ ] Test error handling and retry logic
- [ ] Monitor gas costs
- [ ] Test with small real amounts on testnet

### Monitoring

- [ ] Set up transaction monitoring
- [ ] Configure alerts for failed transactions
- [ ] Monitor RPC health
- [ ] Track profit distribution success rate
- [ ] Monitor gas expenditure
- [ ] Set up analytics dashboard
- [ ] Configure logging (centralized if possible)

### Operational Security

- [ ] Rate limiting configured
- [ ] Maximum transaction size limits
- [ ] Emergency stop mechanism
- [ ] Backup RPC endpoints configured
- [ ] Transaction confirmation timeouts set
- [ ] Error alerting configured

## Common Security Pitfalls

### 1. Insufficient Slippage Protection

❌ **Bad:**
```typescript
const slippage = 0.50; // 50% - Too high!
```

✅ **Good:**
```typescript
const slippage = 0.01; // 1% - Reasonable
const dynamicSlippage = await calculateDynamicSlippage(marketVolatility);
```

### 2. No Transaction Confirmation

❌ **Bad:**
```typescript
await connection.sendTransaction(transaction);
// Assuming success without confirmation
```

✅ **Good:**
```typescript
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [signer],
  { commitment: 'confirmed', maxRetries: 3 }
);
```

### 3. Hardcoded Addresses

❌ **Bad:**
```typescript
const daoWallet = new PublicKey('DmtAdUSzF...');
```

✅ **Good:**
```typescript
const daoWallet = new PublicKey(process.env.DAO_WALLET_ADDRESS);
if (!daoWallet.isValid()) {
  throw new Error('Invalid DAO wallet address');
}
```

### 4. No Error Recovery

❌ **Bad:**
```typescript
try {
  await distributeProfits();
} catch (error) {
  console.log('Failed'); // Lost transaction!
}
```

✅ **Good:**
```typescript
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    await distributeProfits();
    break; // Success
  } catch (error) {
    if (attempt === maxRetries - 1) throw error;
    await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
  }
}
```

## Incident Response Plan

### If Private Key Compromised

1. **Immediately stop all operations**
   ```bash
   # Kill all processes
   pkill -f "node dist/index.js"
   ```

2. **Transfer all funds to new secure wallet**
   - Create new wallet with hardware device
   - Transfer all SOL and tokens
   - Update environment variables

3. **Rotate all credentials**
   - RPC endpoints
   - API keys
   - Wallet addresses

4. **Review transaction history**
   - Check for unauthorized transactions
   - Document any losses
   - Report to relevant parties

### If Transaction Fails

1. **Check transaction signature**
   ```bash
   solana confirm <signature> -u mainnet-beta
   ```

2. **Review logs for error details**
   ```bash
   tail -f logs/application.log | grep ERROR
   ```

3. **Verify balances**
   ```bash
   solana balance <wallet_address>
   ```

4. **Retry with adjusted parameters**
   - Increase priority fee
   - Adjust slippage
   - Use different RPC endpoint

### If SNS Resolution Fails

1. **Use manual wallet mapping**
   ```typescript
   resolver.registerManualMapping('monads.skr', actualWalletAddress);
   ```

2. **Verify SNS registry**
   - Check Bonfida SNS documentation
   - Verify domain ownership
   - Check TLD configuration

3. **Fallback to direct address**
   ```typescript
   const reserveWallet = new PublicKey(process.env.RESERVE_WALLET_FALLBACK);
   ```

## Audit Recommendations

### Before Production Launch

1. **Code Audit**
   - Review all transaction signing code
   - Verify profit distribution logic
   - Check for potential exploits
   - Review error handling

2. **Security Audit**
   - Penetration testing
   - Smart contract audit (if applicable)
   - Infrastructure security review
   - Access control review

3. **Financial Audit**
   - Verify profit calculations
   - Test distribution percentages
   - Validate fee calculations
   - Check for rounding errors

## Compliance Considerations

### Know Your Risks

- **Regulatory**: Understand local cryptocurrency regulations
- **Tax**: Track all profits for tax reporting
- **AML/KYC**: Consider requirements for large transactions
- **Liability**: Understand smart contract risks

### Record Keeping

```typescript
// Log all distributions for audit trail
const distributionLog = {
  timestamp: Date.now(),
  profitAmount: amount,
  reserveShare: reserveAmount,
  userShare: userAmount,
  daoShare: daoAmount,
  signature: txSignature,
  reserveWallet: reserveAddress.toString(),
  userWallet: userAddress.toString(),
  daoWallet: daoAddress.toString(),
};

// Store in persistent storage
await logDistribution(distributionLog);
```

## Emergency Procedures

### Circuit Breaker

Implement automatic shutoff for suspicious activity:

```typescript
const DAILY_PROFIT_LIMIT = 100 * 1e9; // 100 SOL
const HOURLY_TRANSACTION_LIMIT = 50;

if (dailyProfit > DAILY_PROFIT_LIMIT) {
  console.error('Daily profit limit exceeded - shutting down');
  await emergencyShutdown();
}

if (hourlyTransactions > HOURLY_TRANSACTION_LIMIT) {
  console.error('Transaction rate limit exceeded - pausing');
  await pauseOperations(3600); // 1 hour pause
}
```

### Emergency Contacts

Maintain a list of emergency contacts:
- Dev team lead
- Security team
- RPC provider support
- Exchange contacts (if needed)

## Resources

### Security Tools
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [SPL Token CLI](https://spl.solana.com/token)
- [Anchor Security](https://book.anchor-lang.com/anchor_in_depth/security.html)

### Documentation
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/transactions#security)
- [Bonfida SNS Docs](https://docs.bonfida.org/)
- [QuickNode Security Guide](https://www.quicknode.com/guides/)

### Monitoring Services
- [Solana Beach](https://solanabeach.io/)
- [Solscan](https://solscan.io/)
- [SolanaFM](https://solana.fm/)

## Conclusion

Security is paramount when handling financial transactions. Always:
- Test thoroughly on devnet/testnet
- Start with small amounts
- Monitor continuously
- Have emergency procedures ready
- Keep private keys secure
- Use production-grade infrastructure

**Remember: Once a transaction is confirmed on Solana, it cannot be reversed. Always double-check before signing.**
