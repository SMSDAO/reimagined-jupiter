# Airdrop System Documentation

## Overview

The GXQ Studio Airdrop System provides live on-chain eligibility checking and secure claim processing with integrated 10% donation flow to support continued development.

## Supported Protocols

- **Jupiter** - JUP token airdrop
- **Jito** - JTO token airdrop
- **Pyth** - PYTH token airdrop
- **Kamino** - KMNO token airdrop
- **Marginfi** - MFI token airdrop
- **Orca** - ORCA token airdrop (support)
- **Raydium** - RAY token airdrop (support)
- **Solend** - SLND token airdrop (support)

## Eligibility Checking

### Check All Airdrops

```typescript
import { AirdropService } from './services/airdropSystem.js';

const service = new AirdropService(
  connection,
  'DevWalletAddressHere',  // Dev wallet for donations
  0.10                      // 10% donation percentage
);

const eligibilities = await service.checkAllEligibility(walletAddress);

for (const airdrop of eligibilities) {
  if (airdrop.isEligible) {
    console.log(`✅ Eligible for ${airdrop.airdropName}`);
    console.log(`   Allocation: ${airdrop.allocationAmount} tokens`);
  }
}
```

### Check Specific Protocol

```typescript
const jupiterAirdrop = await service.checkEligibility(
  walletAddress,
  'JUPITER'
);

if (jupiterAirdrop?.isEligible) {
  console.log('JUP allocation:', jupiterAirdrop.allocationAmount);
  console.log('Requirements:', jupiterAirdrop.requirementsMet);
}
```

### Eligibility Criteria

**Jupiter:**
- Has swapped on Jupiter aggregator
- Minimum swap volume: $100+
- Active for 5+ unique days

**Jito:**
- Has staked SOL with Jito
- Has given MEV tips
- Active Jito user

**Pyth:**
- Participated in Pyth governance
- Has staked PYTH tokens
- Active Pyth consumer

**Kamino:**
- Has lent/borrowed on Kamino
- Minimum TVL: $100+
- Active position holder

**Marginfi:**
- Has deposited on Marginfi
- Minimum deposit: $100+
- Active lending participant

## Claim Process

### Check Eligibility

1. User connects wallet
2. System checks all protocols
3. Display eligible airdrops
4. Show allocation amounts

### Create Claim Transaction

```typescript
const { claimTransaction, donationTransaction, donationAmount } = 
  await service.createClaimTransaction(
    eligibility,
    userWallet.publicKey,
    { includeDonation: true }  // Default: true
  );

console.log(`Claiming ${eligibility.allocationAmount} tokens`);
console.log(`Donation: ${donationAmount} tokens (10%)`);
```

### Execute Claim

```typescript
// Sign and send claim transaction
const claimSignature = await sendAndConfirmTransaction(
  connection,
  claimTransaction,
  [userWallet]
);

// Process claim in database
const claim = await service.processClaim(
  eligibility,
  claimSignature,
  eligibility.allocationAmount!,
  userId
);

console.log(`✅ Claimed: ${claim.transactionSignature}`);
```

### Send Donation

```typescript
// Sign and send donation transaction
const donationSignature = await sendAndConfirmTransaction(
  connection,
  donationTransaction!,
  [userWallet]
);

// Mark donation as sent
await service.markDonationSent(claim.id, donationSignature);

// Track donation
await service.trackDonation(
  'AIRDROP_CLAIM',
  userWallet.publicKey.toBase58(),
  donationAmount!,
  eligibility.allocationToken!,
  donationSignature,
  claim.id
);

console.log(`✅ Donation sent: ${donationSignature}`);
```

## Donation System

### Purpose

10% of all claimed airdrops are donated to the GXQ Studio development wallet to:
- Support continued development
- Fund infrastructure costs
- Enable new features
- Maintain security audits
- Provide user support

### Donation Flow

1. **Claim Initiated**
   - User claims eligible airdrop
   - System calculates 10% donation amount

2. **Dual Transactions**
   - Transaction 1: Claim tokens from protocol
   - Transaction 2: Send 10% to dev wallet

3. **Verification**
   - Verify claim transaction confirmed
   - Verify donation transaction confirmed
   - Update database records

4. **Tracking**
   - Record in `donation_tracking` table
   - Include source type, amount, token
   - Link to original claim

### Donation Percentage

Default: 10% (configurable)

```typescript
const service = new AirdropService(
  connection,
  devWallet,
  0.10  // 10%
);

// Calculate donation
const donation = service.calculateDonation(1000);
// Returns: 100 (10% of 1000)
```

### Opt-Out Policy

Users can claim without donation by setting:

```typescript
const { claimTransaction } = await service.createClaimTransaction(
  eligibility,
  userWallet.publicKey,
  { includeDonation: false }  // No donation
);
```

However, **donations are encouraged** to support the platform.

## Database Schema

### airdrop_eligibility

Stores eligibility checks:

```sql
CREATE TABLE airdrop_eligibility (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  airdrop_name VARCHAR(100) NOT NULL,
  protocol VARCHAR(50) NOT NULL,
  is_eligible BOOLEAN NOT NULL,
  allocation_amount DECIMAL(20, 9),
  allocation_token VARCHAR(44),
  requirements_met JSONB,
  claim_status VARCHAR(50) DEFAULT 'UNCLAIMED',
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Claim Status:**
- `UNCLAIMED` - Eligible but not claimed
- `PENDING` - Claim transaction submitted
- `CLAIMED` - Successfully claimed
- `DONATED` - Donation also sent
- `FAILED` - Claim failed

### airdrop_claims

Stores completed claims:

```sql
CREATE TABLE airdrop_claims (
  id UUID PRIMARY KEY,
  eligibility_id UUID NOT NULL,
  wallet_address VARCHAR(44) NOT NULL,
  user_id UUID,
  claimed_amount DECIMAL(20, 9) NOT NULL,
  claimed_token VARCHAR(44) NOT NULL,
  transaction_signature VARCHAR(88) NOT NULL,
  donation_amount DECIMAL(20, 9) NOT NULL,
  donation_signature VARCHAR(88),
  donation_sent BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  donation_sent_at TIMESTAMP
);
```

### donation_tracking

Tracks all donations:

```sql
CREATE TABLE donation_tracking (
  id UUID PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,  -- AIRDROP_CLAIM, BOT_PROFIT, etc.
  source_id UUID,
  donor_wallet VARCHAR(44) NOT NULL,
  donation_amount DECIMAL(20, 9) NOT NULL,
  donation_token VARCHAR(44) NOT NULL,
  dev_wallet VARCHAR(44) NOT NULL,
  transaction_signature VARCHAR(88) NOT NULL,
  donation_percentage DECIMAL(5, 2) NOT NULL,
  donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Query Examples

### Check User's Eligible Airdrops

```sql
SELECT 
  ae.*,
  wa.tier,
  wa.trust_score
FROM airdrop_eligibility ae
JOIN wallet_analysis wa ON ae.wallet_address = wa.wallet_address
WHERE ae.wallet_address = 'WalletAddressHere'
AND ae.is_eligible = TRUE
AND ae.claim_status = 'UNCLAIMED'
ORDER BY ae.allocation_amount DESC;
```

### Get Claim History

```sql
SELECT 
  ac.*,
  ae.airdrop_name,
  ae.protocol
FROM airdrop_claims ac
JOIN airdrop_eligibility ae ON ac.eligibility_id = ae.id
WHERE ac.wallet_address = 'WalletAddressHere'
ORDER BY ac.claimed_at DESC;
```

### Total Donations Received

```sql
SELECT 
  donation_token,
  SUM(donation_amount) as total_amount,
  COUNT(*) as donation_count
FROM donation_tracking
WHERE dev_wallet = 'DevWalletHere'
GROUP BY donation_token
ORDER BY total_amount DESC;
```

### Donation Rate by Source

```sql
SELECT 
  source_type,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE donation_amount > 0) as with_donation,
  AVG(donation_percentage) as avg_percentage,
  SUM(donation_amount) as total_donated
FROM donation_tracking
GROUP BY source_type;
```

## API Endpoints

### GET /api/airdrops/eligibility/:wallet

Check airdrop eligibility for wallet.

**Response:**
```json
{
  "wallet": "WalletAddress",
  "eligibilities": [
    {
      "protocol": "JUPITER",
      "isEligible": true,
      "allocationAmount": 100,
      "allocationToken": "JUPyiwrYJFskUPiHa...",
      "requirementsMet": {
        "hasSwapped": true,
        "minVolume": true,
        "minDays": true
      },
      "claimStatus": "UNCLAIMED"
    }
  ],
  "totalEligible": 5,
  "estimatedValue": 1500.00
}
```

### POST /api/airdrops/claim

Claim eligible airdrop.

**Request:**
```json
{
  "eligibilityId": "uuid",
  "walletAddress": "WalletAddress",
  "includeDonation": true
}
```

**Response:**
```json
{
  "success": true,
  "claimId": "uuid",
  "claimedAmount": 100,
  "donationAmount": 10,
  "transactionSignature": "sig...",
  "donationSignature": "sig..."
}
```

### GET /api/airdrops/stats

Get airdrop and donation statistics.

**Response:**
```json
{
  "totalClaims": 1234,
  "totalDonations": 123.4,
  "donationsByProtocol": {
    "JUPITER": 50.5,
    "JITO": 30.2,
    "PYTH": 43.7
  },
  "topDonors": [
    {
      "wallet": "WalletAddress",
      "totalDonated": 15.5,
      "claimCount": 5
    }
  ]
}
```

## User Interface

### Airdrop Dashboard

Display eligible airdrops:

```tsx
<div className="airdrop-dashboard">
  <h2>Available Airdrops</h2>
  
  {eligibilities.map(airdrop => (
    <div key={airdrop.id} className="airdrop-card">
      <img src={protocolLogo[airdrop.protocol]} />
      <h3>{airdrop.airdropName}</h3>
      
      {airdrop.isEligible ? (
        <>
          <p>Allocation: {airdrop.allocationAmount} tokens</p>
          <p>Value: ${calculateValue(airdrop)}</p>
          
          <button onClick={() => handleClaim(airdrop)}>
            Claim Now
          </button>
          
          <small>
            10% donation to GXQ Studio
            ({airdrop.allocationAmount * 0.1} tokens)
          </small>
        </>
      ) : (
        <p>Not eligible</p>
      )}
    </div>
  ))}
</div>
```

### Claim Confirmation

```tsx
<Modal>
  <h3>Confirm Airdrop Claim</h3>
  
  <div>
    <p>Protocol: {airdrop.protocol}</p>
    <p>Amount: {airdrop.allocationAmount} tokens</p>
    <p>Donation: {donationAmount} tokens (10%)</p>
    <p>You receive: {netAmount} tokens</p>
  </div>
  
  <Checkbox checked={includeDonation} onChange={setIncludeDonation}>
    Include 10% donation to support GXQ Studio
  </Checkbox>
  
  <button onClick={executeClaim}>
    Confirm Claim
  </button>
</Modal>
```

## Security Considerations

### On-Chain Verification

Always verify claims on-chain:

```typescript
const verification = await service.verifyClaimOnChain(
  claimSignature
);

if (!verification.verified) {
  throw new Error(`Claim verification failed: ${verification.error}`);
}
```

### Rate Limiting

Prevent spam checking:
- Max 10 eligibility checks per minute per wallet
- Max 1 claim per protocol per wallet
- Exponential backoff on failures

### Duplicate Prevention

Ensure single claim per airdrop:

```sql
-- Database constraint
CREATE UNIQUE INDEX idx_unique_claim 
ON airdrop_claims(eligibility_id, wallet_address);
```

### Transaction Monitoring

Monitor claim transactions:
- Track confirmation status
- Detect failed transactions
- Alert on anomalies
- Automatic retries (optional)

## Best Practices

### For Users

1. **Check Eligibility Early**
   - Check as soon as airdrop announced
   - Requirements may change
   - Allocations may be time-limited

2. **Claim Promptly**
   - Don't wait too long
   - Claim windows may close
   - Earlier claims may get bonus

3. **Support Development**
   - Include 10% donation
   - Helps maintain platform
   - Enables new features

4. **Verify Transactions**
   - Check both claim and donation signatures
   - Confirm tokens received
   - Review on Solana Explorer

### For Developers

1. **Regular Updates**
   - Monitor protocol announcements
   - Update eligibility criteria
   - Test with new airdrop launches

2. **Error Handling**
   - Handle network failures
   - Retry failed transactions
   - Log all errors

3. **User Experience**
   - Clear eligibility requirements
   - Transparent donation info
   - Simple claim process
   - Progress indicators

4. **Security**
   - Validate all inputs
   - Verify signatures
   - Rate limit checks
   - Monitor for abuse

## Troubleshooting

### Not Eligible

**Causes:**
- Requirements not met
- Wallet not active during snapshot
- Protocol-specific criteria

**Solutions:**
- Review requirements
- Check transaction history
- Wait for next airdrop
- Contact protocol support

### Claim Failed

**Causes:**
- Insufficient SOL for gas
- Network congestion
- Transaction timeout
- Already claimed

**Solutions:**
- Add SOL for gas fees
- Increase priority fee
- Retry transaction
- Verify claim status

### Donation Not Sent

**Causes:**
- Insufficient token balance
- Transaction failed
- Network error

**Solutions:**
- Verify claim succeeded
- Check token balance
- Retry donation manually
- Contact support

### Eligibility Check Slow

**Causes:**
- Network congestion
- RPC rate limits
- Protocol API down

**Solutions:**
- Wait and retry
- Use different RPC
- Check protocol status
- Try during off-peak

## Analytics & Reporting

### Donation Dashboard

Track donation impact:

```typescript
const stats = await service.getTotalDonations({
  fromDate: new Date('2024-01-01'),
  toDate: new Date()
});

console.log('Total donations:', stats.totalDonations);
console.log('By token:', stats.donationsByToken);
console.log('By source:', stats.donationsBySource);
```

### User Statistics

Show user's contribution:

```sql
SELECT 
  COUNT(*) as claims_count,
  SUM(claimed_amount) as total_claimed,
  SUM(donation_amount) as total_donated,
  AVG(donation_amount / claimed_amount) as avg_donation_rate
FROM airdrop_claims
WHERE wallet_address = 'WalletAddress'
AND donation_sent = TRUE;
```

## Future Enhancements

### Planned Features

1. **Automatic Claim**
   - Auto-claim when eligible
   - Configurable preferences
   - Safe mode with confirmations

2. **Multi-Wallet Support**
   - Check all user wallets
   - Aggregate allocations
   - Batch claiming

3. **Airdrop Alerts**
   - Email notifications
   - Push notifications
   - Discord/Telegram bots

4. **Historical Tracking**
   - Missed airdrops
   - Could-have-earned amounts
   - Optimization suggestions

5. **Donation Rewards**
   - Bonus for donors
   - Loyalty tiers
   - Special features access

## Support

For airdrop system questions:
- **Documentation**: https://docs.gxq.studio/airdrops
- **Telegram**: https://t.me/gxqstudio
- **Discord**: https://discord.gg/gxqstudio
- **Email**: support@gxq.studio

**Donation Inquiries:**
If you have questions about the donation system or want to discuss custom arrangements, please contact us directly.
