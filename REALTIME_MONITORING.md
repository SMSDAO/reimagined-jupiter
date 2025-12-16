# Real-Time Monitoring & Live Data Streaming

This document describes the real-time monitoring features, including WebSocket integration and Pyth Network price feeds.

## 🌐 WebSocket Service

The WebSocket service provides real-time data streaming for price updates, arbitrage opportunities, and trade executions.

### Features

- **Price Updates**: Live price feeds from Pyth Network
- **Arbitrage Opportunities**: Real-time notification of profitable opportunities
- **Trade Executions**: Live updates when trades are executed
- **Heartbeat**: Connection health monitoring
- **Multi-Channel Subscriptions**: Subscribe to specific data types

### Starting the WebSocket Server

```typescript
import { websocketService } from './src/services/websocketService.js';

// Start WebSocket server on port 8080
websocketService.start(8080);

// Or custom port
websocketService.start(3001);
```

### Client Connection

Connect to the WebSocket server from your client application:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to GXQ Studio WebSocket');
  
  // Subscribe to price updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      channel: 'prices',
      symbols: ['SOL', 'USDC', 'RAY', 'ORCA']
    }
  }));
  
  // Subscribe to arbitrage opportunities
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      channel: 'arbitrage'
    }
  }));
  
  // Subscribe to trade executions
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      channel: 'trades'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'price_update':
      console.log('Price update:', message.data);
      // { SOL: { price: 100.5, confidence: 0.05, ... }, ... }
      break;
      
    case 'arbitrage_opportunity':
      console.log('Arbitrage opportunity:', message.data);
      // { id: '...', type: 'flash_loan', tokens: [...], estimatedProfit: 10.5, ... }
      break;
      
    case 'trade_executed':
      console.log('Trade executed:', message.data);
      // { signature: '...', type: 'flash-loan', profit: 12.3, ... }
      break;
      
    case 'heartbeat':
      console.log('Heartbeat:', message.data);
      break;
      
    case 'subscription_ack':
      console.log('Subscription confirmed:', message.data);
      break;
      
    case 'error':
      console.error('Error:', message.data.error);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};
```

### Unsubscribing

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  data: {
    channel: 'prices'
  }
}));
```

### Ping/Pong

```javascript
// Send ping to check connection
ws.send(JSON.stringify({
  type: 'ping'
}));

// Receive pong response
// { type: 'heartbeat', data: { pong: true }, timestamp: ... }
```

## 📡 Pyth Network Price Feeds

The Pyth Network integration provides high-frequency, low-latency price data for tokens.

### Supported Tokens

- SOL, BTC, ETH
- USDC, USDT
- RAY, ORCA, MNGO
- JUP, BONK

### Using Pyth Price Feeds

```typescript
import { pythPriceFeed } from './src/services/pythPriceFeed.js';

// Get current price for a single token
const solPrice = await pythPriceFeed.getPrice('SOL');
console.log('SOL Price:', solPrice);
// {
//   symbol: 'SOL',
//   price: 100.5,
//   confidence: 0.05,
//   timestamp: 1234567890,
//   expo: -8,
//   status: 'trading'
// }

// Get prices for multiple tokens
const prices = await pythPriceFeed.getPrices(['SOL', 'USDC', 'RAY']);
console.log('Prices:', prices);
// Map { 'SOL' => {...}, 'USDC' => {...}, 'RAY' => {...} }

// Subscribe to real-time price updates
const unsubscribe = pythPriceFeed.subscribe('SOL', (priceData) => {
  console.log('SOL price update:', priceData);
});

// Later: unsubscribe
unsubscribe();

// Subscribe to multiple tokens
const unsubscribeAll = pythPriceFeed.subscribeMultiple(
  ['SOL', 'USDC', 'RAY'],
  (prices) => {
    console.log('Price updates:', prices);
  }
);

// Later: unsubscribe from all
unsubscribeAll();
```

### Configuration

Set the update interval (default: 2000ms):

```typescript
// Minimum 500ms, recommended 1000-5000ms
pythPriceFeed.setUpdateInterval(1000);
```

### Cleanup

```typescript
// Stop all subscriptions and clear cache
pythPriceFeed.cleanup();
```

## 🔄 Integration with Auto-Execution

The auto-execution engine automatically broadcasts opportunities and trades via WebSocket:

```typescript
import { AutoExecutionEngine } from './src/services/autoExecution.js';

// When opportunities are found, they're automatically broadcast to WebSocket subscribers
// When trades are executed, notifications are automatically sent
```

### Opportunity Broadcast Format

```typescript
{
  type: 'arbitrage_opportunity',
  data: {
    id: '1234567890-0.123',
    type: 'flash_loan' | 'triangular' | 'hybrid',
    tokens: ['SOL', 'USDC', 'RAY'],
    estimatedProfit: 10.5,
    confidence: 0.85,
    timestamp: 1234567890
  },
  timestamp: 1234567890
}
```

### Trade Execution Broadcast Format

```typescript
{
  type: 'trade_executed',
  data: {
    signature: '5j7s8...',
    type: 'flash-loan',
    tokens: ['SOL', 'USDC'],
    profit: 12.3,
    timestamp: 1234567890
  },
  timestamp: 1234567890
}
```

## 🚀 Example: Full Stack Integration

### Backend Setup

```typescript
import { websocketService } from './src/services/websocketService.js';
import { AutoExecutionEngine } from './src/services/autoExecution.js';

// Start WebSocket server
websocketService.start(8080);

// Start auto-execution (will broadcast opportunities and trades)
const engine = new AutoExecutionEngine(/* ... */);
engine.start();

// Cleanup on shutdown
process.on('SIGINT', () => {
  engine.stop();
  websocketService.stop();
  process.exit(0);
});
```

### Frontend Dashboard

```typescript
// React component example
import { useEffect, useState } from 'react';

export function LiveDashboard() {
  const [prices, setPrices] = useState({});
  const [opportunities, setOpportunities] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      // Subscribe to all channels
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { channel: 'prices', symbols: ['SOL', 'USDC', 'RAY'] }
      }));
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { channel: 'arbitrage' }
      }));
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { channel: 'trades' }
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'price_update':
          setPrices(message.data);
          break;
        case 'arbitrage_opportunity':
          setOpportunities(prev => [message.data, ...prev].slice(0, 10));
          break;
        case 'trade_executed':
          setTrades(prev => [message.data, ...prev].slice(0, 10));
          break;
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <h2>Live Prices</h2>
      {Object.entries(prices).map(([symbol, data]) => (
        <div key={symbol}>
          {symbol}: ${data.price.toFixed(2)}
        </div>
      ))}

      <h2>Recent Opportunities</h2>
      {opportunities.map(opp => (
        <div key={opp.id}>
          {opp.type}: ${opp.estimatedProfit.toFixed(2)}
        </div>
      ))}

      <h2>Recent Trades</h2>
      {trades.map(trade => (
        <div key={trade.signature}>
          Profit: ${trade.profit.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

## 📊 Monitoring & Health Checks

### WebSocket Service Status

```typescript
const status = websocketService.getStatus();
console.log(status);
// {
//   running: true,
//   clients: 5,
//   subscriptions: {
//     prices: 3,
//     arbitrage: 5,
//     trades: 2
//   }
// }
```

### Connection Health

- **Heartbeat**: Automatic ping every 30 seconds
- **Auto-Reconnect**: Implement client-side reconnection logic
- **Timeout Detection**: Close stale connections

## 🔒 Security Considerations

### Production Deployment

1. **Use WSS (Secure WebSocket)**:
   ```typescript
   // Add SSL/TLS certificates
   import https from 'https';
   import fs from 'fs';
   
   const server = https.createServer({
     cert: fs.readFileSync('cert.pem'),
     key: fs.readFileSync('key.pem')
   });
   
   const wss = new WebSocket.Server({ server });
   ```

2. **Authentication**: Add token-based authentication
   ```typescript
   ws.onopen = () => {
     ws.send(JSON.stringify({
       type: 'auth',
       data: { token: 'your-auth-token' }
     }));
   };
   ```

3. **Rate Limiting**: Prevent abuse with rate limits

4. **CORS**: Configure allowed origins

5. **Data Validation**: Validate all incoming messages

## 🎯 Performance Optimization

### Backend

- **Throttling**: Limit update frequency per client
- **Batching**: Batch multiple updates into single messages
- **Compression**: Use WebSocket message compression
- **Connection Pooling**: Manage connection limits

### Frontend

- **Debouncing**: Debounce rapid updates
- **Virtualization**: Use virtual scrolling for large lists
- **Memoization**: Cache computed values
- **Web Workers**: Process data in background threads

## 📝 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to WebSocket server

**Solutions**:
- Check server is running: `websocketService.getStatus()`
- Verify port is not blocked by firewall
- Check for CORS issues in browser console
- Ensure correct protocol (ws:// or wss://)

### Missing Updates

**Problem**: Not receiving price updates

**Solutions**:
- Verify subscription was acknowledged
- Check token symbol is supported: `pythPriceFeed.hasPriceFeed('SOL')`
- Ensure Solana RPC endpoint is healthy
- Check console for errors

### High Latency

**Problem**: Delayed price updates

**Solutions**:
- Reduce update interval if too frequent
- Use QuickNode or premium RPC endpoint
- Check network bandwidth
- Monitor server load

## 🔄 Migration from Polling to WebSocket

If you're currently using polling for price updates:

```typescript
// Before (polling)
setInterval(async () => {
  const price = await fetchPrice('SOL');
  updateUI(price);
}, 5000);

// After (WebSocket)
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: { channel: 'prices', symbols: ['SOL'] }
  }));
};
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'price_update') {
    updateUI(message.data.SOL);
  }
};
```

**Benefits**:
- Lower latency (push vs pull)
- Reduced server load
- Real-time updates
- Better scalability

## 📚 Additional Resources

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Pyth Network Documentation](https://docs.pyth.network/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Next.js Real-time Updates](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)
