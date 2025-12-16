# UI Integration Guide for Flash Loan Module

## Overview
The flash loan module has been enhanced with UI-ready features in the webapp's arbitrage page (`/webapp/app/arbitrage/page.tsx`).

## Enhanced Features in UI

### 1. Real-Time Price Feeds Section
The UI now displays live price feeds powered by Pyth Network:
- SOL/USD
- USDC/USD
- BONK/USD
- JUP/USD

Each price feed shows:
- Current price
- Confidence interval (±%)
- Real-time updates

**Integration Point:**
```typescript
// Connect to backend Pyth service
import { PythNetworkIntegration } from '@/lib/pyth';

const pyth = new PythNetworkIntegration(connection);
const price = await pyth.getPrice('SOL');
```

### 2. Enhanced Flash Loan Provider Display
Updated provider cards now show:
- Provider name
- Fee percentage
- Available liquidity
- Health status indicator (green/red dot)

**6 Providers Displayed:**
1. Marginfi - 0.09% fee
2. Solend - 0.10% fee
3. Kamino - 0.12% fee
4. Mango - 0.15% fee
5. Port Finance - 0.20% fee
6. Save Finance - 0.11% fee

**Integration Point:**
```typescript
// Get provider info from backend
import { ProviderManager } from '@/lib/providerManager';

const providerManager = new ProviderManager(connection);
const providersInfo = await providerManager.getAllProvidersInfo();
```

### 3. Updated Security Features Panel
Now displays 5 key security features:
- ✅ Pyth Price Validation
- ✅ Dynamic Gas Fees
- ✅ Transaction Simulation
- ✅ Reentrancy Protection
- ✅ Safe Math Operations

### 4. User-Configurable Settings
The settings panel allows users to adjust:
- **Min Profit**: 0.1% - 5% range
- **Auto-Execute**: ON/OFF toggle
- **Slippage**: Configurable in transaction execution

## Backend Integration Points

### For Scanning Opportunities
```typescript
const startScanning = async () => {
  setScanning(true);
  
  try {
    // Initialize services
    const connection = new Connection(rpcUrl);
    const providerManager = new ProviderManager(connection);
    const flashLoanService = new FlashLoanService(connection);
    
    // Get best provider
    const provider = await providerManager.getBestProvider(
      tokenMint,
      loanAmount
    );
    
    if (provider) {
      // Execute scan logic
      const opportunities = await scanForOpportunities(provider);
      setOpportunities(opportunities);
    }
  } catch (error) {
    console.error('Scanning error:', error);
  } finally {
    setScanning(false);
  }
};
```

### For Executing Arbitrage
```typescript
const executeArbitrage = async (opp: ArbitrageOpportunity) => {
  if (!publicKey || !wallet) {
    alert('Connect wallet first!');
    return;
  }

  try {
    const connection = new Connection(rpcUrl);
    const flashLoanService = new FlashLoanService(connection);
    const providerManager = new ProviderManager(connection);
    
    // Get provider
    const provider = await providerManager.getProvider(opp.provider);
    if (!provider) throw new Error('Provider not available');
    
    // Get user keypair (in production, use wallet adapter)
    const userKeypair = await getUserKeypair(wallet);
    
    // Execute flash loan arbitrage
    const signature = await flashLoanService.executeFlashLoanArbitrage(
      provider.provider,
      opp.inputMint,
      opp.outputMint,
      opp.loanAmount,
      userKeypair,
      50 // 0.5% slippage
    );
    
    if (signature) {
      alert(`Success! Transaction: ${signature}`);
      // Update UI with transaction details
    } else {
      alert('Execution failed');
    }
  } catch (error) {
    console.error('Execution error:', error);
    alert(`Error: ${error.message}`);
  }
};
```

## Admin Monitoring Dashboard

### Health Status Display
```typescript
const HealthDashboard = () => {
  const [health, setHealth] = useState<any>(null);
  
  useEffect(() => {
    const checkHealth = async () => {
      const connection = new Connection(rpcUrl);
      const flashLoanService = new FlashLoanService(connection);
      const providerManager = new ProviderManager(connection);
      
      const serviceHealth = await flashLoanService.healthCheck();
      const providerStats = providerManager.getStatistics();
      
      setHealth({ serviceHealth, providerStats });
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      <h2>System Health</h2>
      {health && (
        <>
          <div>Service: {health.serviceHealth.healthy ? '✅' : '❌'}</div>
          <div>Providers: {health.providerStats.healthyProviders}/{health.providerStats.totalProviders}</div>
          <div>Active Transactions: {health.serviceHealth.details.activeTransactions}</div>
        </>
      )}
    </div>
  );
};
```

## Next.js API Routes (Recommended)

### Create API Route for Provider Info
**File**: `webapp/app/api/providers/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { ProviderManager } from '@/../../src/services/providerManager';

export async function GET() {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || '');
    const providerManager = new ProviderManager(connection);
    
    const providersInfo = await providerManager.getAllProvidersInfo();
    
    return NextResponse.json({
      success: true,
      providers: providersInfo,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

### Create API Route for Health Check
**File**: `webapp/app/api/health/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { FlashLoanService } from '@/../../src/services/flashLoanService';
import { ProviderManager } from '@/../../src/services/providerManager';

export async function GET() {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || '');
    const flashLoanService = new FlashLoanService(connection);
    const providerManager = new ProviderManager(connection);
    
    const serviceHealth = await flashLoanService.healthCheck();
    const providerStats = providerManager.getStatistics();
    const providerHealth = await providerManager.healthCheckAll();
    
    return NextResponse.json({
      success: true,
      health: {
        service: serviceHealth,
        providers: {
          stats: providerStats,
          health: Array.from(providerHealth.entries()).map(([name, healthy]) => ({
            name,
            healthy,
          })),
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

### Create API Route for Pyth Prices
**File**: `webapp/app/api/prices/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PythNetworkIntegration } from '@/../../src/integrations/pyth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokens = searchParams.get('tokens')?.split(',') || ['SOL', 'USDC', 'BONK', 'JUP'];
    
    const connection = new Connection(process.env.SOLANA_RPC_URL || '');
    const pyth = new PythNetworkIntegration(connection);
    
    const prices = await pyth.getPrices(tokens);
    
    return NextResponse.json({
      success: true,
      prices: Array.from(prices.entries()).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        confidence: data.confidence,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

## Real-Time Updates with Server-Sent Events (Optional)

For live updates without polling, implement SSE:

**File**: `webapp/app/api/opportunities/stream/route.ts`
```typescript
export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Set up opportunity monitoring
      const interval = setInterval(async () => {
        try {
          // Scan for opportunities
          const opportunities = await scanOpportunities();
          
          const data = `data: ${JSON.stringify(opportunities)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('Stream error:', error);
        }
      }, 5000); // Every 5 seconds
      
      // Clean up on connection close
      return () => {
        clearInterval(interval);
      };
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Environment Variables for Webapp

Add to `webapp/.env.local`:
```env
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PYTH_ENABLED=true
NEXT_PUBLIC_AUTO_EXECUTE_ENABLED=true
```

## Testing the UI Integration

### 1. Development Mode
```bash
cd webapp
npm run dev
```

### 2. Navigate to Arbitrage Page
Visit: `http://localhost:3000/arbitrage`

### 3. Connect Wallet
Use Phantom, Solflare, or any Solana wallet adapter

### 4. Test Features
- Click "Start Scanning" to search for opportunities
- View real-time price feeds
- Check provider health status
- Review security features
- Toggle auto-execute
- Adjust min profit threshold
- Execute arbitrage opportunities

## Production Deployment

### Vercel Configuration
1. Set Root Directory to `webapp`
2. Add environment variables:
   - `NEXT_PUBLIC_RPC_URL`
   - `SOLANA_RPC_URL` (server-side)
   - `WALLET_PRIVATE_KEY` (server-side, for backend operations)
3. Deploy

### Security Considerations for Production
- ⚠️ Never expose private keys in client-side code
- ✅ Use wallet adapter for signing (client-side)
- ✅ Keep sensitive operations server-side (API routes)
- ✅ Implement rate limiting on API routes
- ✅ Validate all user inputs
- ✅ Use HTTPS only
- ✅ Implement proper CORS policies

## Future UI Enhancements

Potential improvements:
- [ ] Real-time price chart integration
- [ ] Transaction history dashboard
- [ ] Advanced filtering and sorting for opportunities
- [ ] Customizable alerts and notifications
- [ ] Mobile-responsive optimizations
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Advanced analytics and reporting
- [ ] Risk calculator and simulator
- [ ] Portfolio tracking integration

## Support

For UI integration issues:
1. Check browser console for errors
2. Verify wallet connection
3. Ensure RPC URL is correct
4. Check network (mainnet/devnet)
5. Review API route responses
6. Check component props and state

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Pyth Network](https://pyth.network/)
- [Jupiter Aggregator](https://jup.ag/)
- [Vercel Deployment](https://vercel.com/docs)
