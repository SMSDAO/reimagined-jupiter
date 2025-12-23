# Airdrop System Security Guide

## Critical Security Measures

### 1. Transaction Signing Security

**NEVER sign transactions server-side with user funds.** The airdrop system is designed with client-side transaction signing in mind.

#### Best Practices:
```typescript
// ✅ CORRECT: Build transaction, send to client for signing
const transaction = buildClaimTransaction(airdropInfo);
const serialized = transaction.serialize({ requireAllSignatures: false });
return { unsignedTransaction: serialized.toString('base64') };

// ❌ WRONG: Never do this on server
const signedTx = transaction.sign(serverKeypair); // SECURITY RISK!
```

#### Implementation Pattern:
1. Server builds unsigned transaction with proper instructions
2. Server returns base64-encoded unsigned transaction to client
3. Client signs with `@solana/wallet-adapter`
4. Client submits signed transaction back to server or directly to RPC
5. Server logs the transaction signature for audit

### 2. Private Key Management

#### Environment Variables
```bash
# Required for dev fee collection only
# Never use this key for user transactions
DEV_FEE_WALLET=monads.solana

# If needed for server operations (use with extreme caution)
# Preferably use a separate hot wallet with minimal funds
WALLET_PRIVATE_KEY=<base58_key_for_operational_tasks_only>
```

#### Key Storage Requirements:
- Use environment variables (never hard-code)
- Enable encryption at rest for .env files
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys quarterly
- Use separate keys for dev/staging/production
- Implement key access logging

### 3. Database Security

#### SQL Injection Prevention
All database queries use parameterized statements:

```typescript
// ✅ CORRECT: Parameterized query
await query('SELECT * FROM airdrop_claims WHERE wallet_address = $1', [walletAddress]);

// ❌ WRONG: String concatenation
await query(`SELECT * FROM airdrop_claims WHERE wallet_address = '${walletAddress}'`);
```

#### Connection Security:
```typescript
const dbConfig = {
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem').toString(),
  },
  // ... other config
};
```

#### Access Control:
- Use read-only database users for query operations
- Restrict admin endpoints to authenticated users only
- Implement row-level security for multi-tenant scenarios
- Regular security audits of database permissions

### 4. API Security

#### Authentication
```typescript
// Admin endpoints require Bearer token
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.substring(7);
  // Verify JWT or API key
  const isValid = await verifyToken(token);
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
  
  // Proceed with request
}
```

#### Rate Limiting
Implement rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 claims per window
  message: 'Too many claim attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to claim endpoints
app.use('/api/airdrops/claim', claimLimiter);
```

#### Input Validation
```typescript
import { PublicKey } from '@solana/web3.js';

function validateWalletAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Always validate before processing
if (!validateWalletAddress(walletAddress)) {
  return NextResponse.json(
    { success: false, error: 'Invalid wallet address' },
    { status: 400 }
  );
}
```

### 5. Merkle Proof Validation

When implementing actual claim transactions:

```typescript
import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'js-sha3';

async function validateMerkleProof(
  leaf: string,
  proof: string[],
  root: string
): Promise<boolean> {
  // Reconstruct merkle tree path
  let computedHash = keccak256(leaf);
  
  for (const proofElement of proof) {
    if (computedHash < proofElement) {
      computedHash = keccak256(computedHash + proofElement);
    } else {
      computedHash = keccak256(proofElement + computedHash);
    }
  }
  
  return computedHash === root;
}

// Validate before claim execution
const isValid = await validateMerkleProof(
  claimLeaf,
  airdrop.merkleProof,
  airdrop.merkleRoot
);

if (!isValid) {
  throw new Error('Invalid merkle proof');
}
```

### 6. Transaction Simulation

Always simulate transactions before execution:

```typescript
async function simulateClaimTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const simulation = await connection.simulateTransaction(transaction, signers);
    
    if (simulation.value.err) {
      return {
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
      };
    }
    
    // Check logs for errors
    if (simulation.value.logs) {
      const hasError = simulation.value.logs.some(log => 
        log.toLowerCase().includes('error') || 
        log.toLowerCase().includes('failed')
      );
      
      if (hasError) {
        return {
          success: false,
          error: 'Simulation logs indicate potential failure',
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Simulation exception: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}
```

### 7. Donation Security

The 10% dev fee is sent AFTER successful claim:

```typescript
async function claimWithDonation(
  connection: Connection,
  userKeypair: Keypair,
  claimTransaction: Transaction,
  airdropInfo: AirdropInfo
): Promise<ClaimResult> {
  // 1. Execute main claim first
  const claimSig = await connection.sendTransaction(claimTransaction, [userKeypair]);
  await connection.confirmTransaction(claimSig, 'confirmed');
  
  // 2. Only send donation if claim succeeded
  try {
    const donationSig = await sendDonation(connection, userKeypair, airdropInfo);
    return {
      success: true,
      signature: claimSig,
      donationSignature: donationSig,
    };
  } catch (donationError) {
    // Log but don't fail the entire claim
    console.error('Donation failed:', donationError);
    return {
      success: true,
      signature: claimSig,
      error: 'Claim succeeded but donation failed',
    };
  }
}
```

### 8. Audit Logging

Log all critical operations:

```typescript
async function logClaimAttempt(data: {
  walletAddress: string;
  protocol: string;
  amount: number;
  status: string;
  ipAddress: string;
  userAgent: string;
  signature?: string;
  errorMessage?: string;
}) {
  await db.insertAirdropClaim({
    ...data,
    timestamp: new Date(),
  });
  
  // Also log to external monitoring service
  await monitoringService.track('airdrop_claim', {
    wallet: data.walletAddress,
    protocol: data.protocol,
    status: data.status,
    amount: data.amount,
  });
}
```

### 9. Error Handling

Never expose sensitive information in error messages:

```typescript
try {
  await executeClaim(transaction);
} catch (error) {
  // ✅ CORRECT: Generic error to user
  const userMessage = 'Claim failed. Please try again later.';
  
  // ✅ CORRECT: Detailed error to logs
  console.error('Claim execution failed:', {
    error: error instanceof Error ? error.message : 'Unknown',
    stack: error instanceof Error ? error.stack : undefined,
    wallet: walletAddress,
    protocol: protocol,
    timestamp: new Date().toISOString(),
  });
  
  // ❌ WRONG: Exposing internal details
  // throw new Error(`Database query failed: ${dbError.message}`);
  
  return { success: false, error: userMessage };
}
```

### 10. Frontend Security

#### XSS Prevention
```typescript
// Always sanitize user input
import DOMPurify from 'dompurify';

function displayProtocolName(name: string) {
  return DOMPurify.sanitize(name);
}
```

#### CSRF Protection
```typescript
// Use Next.js built-in CSRF protection
export const config = {
  api: {
    bodyParser: true,
  },
};

// Verify origin header
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
  
  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  
  // Proceed with request
}
```

## Security Checklist for Production

### Pre-Deployment
- [ ] All private keys stored in secure environment variables
- [ ] Database uses SSL/TLS connections
- [ ] Rate limiting implemented on all API endpoints
- [ ] Authentication required for admin endpoints
- [ ] Input validation on all user-provided data
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention with proper sanitization
- [ ] CSRF protection enabled
- [ ] Error messages don't expose sensitive data
- [ ] Audit logging enabled for all claims
- [ ] Transaction simulation before execution
- [ ] Merkle proof validation (when applicable)

### Post-Deployment
- [ ] Monitor error logs daily
- [ ] Review audit logs weekly
- [ ] Rotate credentials monthly
- [ ] Security audit quarterly
- [ ] Dependency updates monthly
- [ ] Backup database daily
- [ ] Test disaster recovery quarterly
- [ ] Review access permissions monthly

### Incident Response
- [ ] Document security incident response plan
- [ ] Maintain contact list for security team
- [ ] Have rollback procedures ready
- [ ] Monitor for unusual claim patterns
- [ ] Set up alerts for failed authentication attempts
- [ ] Implement circuit breakers for cascading failures

## Common Vulnerabilities to Avoid

### 1. Replay Attacks
Use recent blockhash and proper nonce management:
```typescript
const { blockhash } = await connection.getRecentBlockhash('finalized');
transaction.recentBlockhash = blockhash;
transaction.feePayer = userPublicKey;
```

### 2. Front-Running
For high-value claims, consider:
- Using Jito bundles for MEV protection
- Setting appropriate priority fees
- Implementing claim randomization

### 3. Double-Claiming
Check claimed status before allowing claim:
```typescript
const eligibility = await db.getAirdropEligibility(walletAddress, protocol);
if (eligibility.claimed) {
  return { success: false, error: 'Already claimed' };
}
```

### 4. Time-Based Attacks
Always use server time, never trust client timestamps:
```typescript
const now = new Date(); // Server time
if (claimDeadline && now > claimDeadline) {
  return { success: false, error: 'Claim period ended' };
}
```

## Emergency Procedures

### Compromised Private Key
1. Immediately rotate the compromised key
2. Update environment variables on all servers
3. Audit recent transactions from the compromised key
4. Notify users if their funds may be affected
5. File incident report

### Database Breach
1. Isolate affected database
2. Restore from latest clean backup
3. Force password reset for all admin users
4. Audit access logs to identify breach vector
5. Implement additional security measures

### DDoS Attack
1. Enable rate limiting if not already active
2. Use Cloudflare or similar DDoS protection
3. Scale infrastructure if needed
4. Monitor for continued attacks
5. Contact hosting provider for additional protection

## Compliance Considerations

### GDPR/Privacy
- User IP addresses are logged for fraud prevention (legitimate interest)
- Provide data deletion endpoints for users
- Include privacy policy link in UI
- Implement data retention policies

### AML/KYC
- Maintain audit logs for minimum 5 years
- Implement wallet screening if required by jurisdiction
- Monitor for suspicious patterns (large amounts, rapid claims)
- Cooperate with law enforcement requests

### Financial Regulations
- Consult with legal counsel for your jurisdiction
- The 10% dev fee must be clearly disclosed
- Consider if your operations require licensing
- Maintain accurate financial records

## Resources

- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

## Contact

For security vulnerabilities, please report privately to:
- Email: security@yourdomain.com
- PGP Key: [Link to public key]

**DO NOT** open public GitHub issues for security vulnerabilities.
