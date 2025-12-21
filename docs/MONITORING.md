# Monitoring System Documentation

## Overview

The Monitoring System provides comprehensive observability for the GXQ Studio arbitrage platform using Prometheus for metrics collection and Grafana for visualization. It tracks trades, profitability, errors, RPC performance, and risk metrics in real-time.

## Architecture

```
┌─────────────────┐
│  GXQ Application│
│  (Metrics SDK)  │
└────────┬────────┘
         │ Push metrics
         ▼
┌─────────────────┐
│ Metrics Server  │
│   (Port 9090)   │
└────────┬────────┘
         │ Scrape
         ▼
┌─────────────────┐
│   Prometheus    │
│  (Time-series)  │
└────────┬────────┘
         │ Query
         ▼
┌─────────────────┐
│    Grafana      │
│  (Dashboards)   │
└─────────────────┘
```

## Quick Start

### 1. Setup Monitoring

Generate configuration files:

```bash
npm run setup-monitoring
```

This creates:
- `monitoring/prometheus.yml` - Prometheus configuration
- `monitoring/alerts.yml` - Alert rules
- `monitoring/grafana-dashboard.json` - Grafana dashboard

### 2. Start Metrics Server

The metrics server starts automatically with the application and exposes metrics at:

```
http://localhost:9090/metrics
```

### 3. Install Prometheus

**macOS**:
```bash
brew install prometheus
```

**Linux**:
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

**Docker**:
```bash
docker run -p 9091:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 4. Start Prometheus

```bash
prometheus --config.file=monitoring/prometheus.yml
```

Access Prometheus UI at: `http://localhost:9091`

### 5. Install Grafana

**macOS**:
```bash
brew install grafana
brew services start grafana
```

**Linux**:
```bash
sudo apt-get install -y grafana
sudo systemctl start grafana-server
```

**Docker**:
```bash
docker run -d -p 3001:3000 grafana/grafana
```

Access Grafana at: `http://localhost:3001` (default: admin/admin)

### 6. Import Dashboard

1. Open Grafana
2. Go to Dashboards → Import
3. Upload `monitoring/grafana-dashboard.json`
4. Select Prometheus data source
5. Click Import

## Metrics Reference

### Trade Metrics

#### `arbitrage_trades_total`
**Type**: Counter  
**Labels**: `status` (success/failure), `type` (flash-loan/triangular)  
**Description**: Total number of arbitrage trades executed

**Example Query**:
```promql
# Success rate
rate(arbitrage_trades_total{status="success"}[5m]) / rate(arbitrage_trades_total[5m]) * 100
```

#### `arbitrage_profit_sol`
**Type**: Gauge  
**Description**: Total profit in SOL

**Example Query**:
```promql
# Profit trend
arbitrage_profit_sol
```

#### `arbitrage_profit_usd`
**Type**: Gauge  
**Description**: Total profit in USD

#### `arbitrage_error_rate`
**Type**: Gauge  
**Description**: Error rate percentage

**Example Query**:
```promql
# High error rate alert
arbitrage_error_rate > 10
```

#### `arbitrage_win_rate`
**Type**: Gauge  
**Description**: Win rate percentage (successful trades / total trades * 100)

### RPC Metrics

#### `rpc_request_duration_seconds`
**Type**: Histogram  
**Labels**: `endpoint`, `method`  
**Buckets**: [0.1, 0.5, 1, 2, 5, 10]  
**Description**: RPC request duration in seconds

**Example Queries**:
```promql
# P95 latency
histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m]))

# P99 latency
histogram_quantile(0.99, rate(rpc_request_duration_seconds_bucket[5m]))

# Average latency
rate(rpc_request_duration_seconds_sum[5m]) / rate(rpc_request_duration_seconds_count[5m])
```

### Trading Metrics

#### `trade_slippage_percentage`
**Type**: Gauge  
**Labels**: `dex` (raydium/orca/jupiter/etc)  
**Description**: Trade slippage percentage by DEX

**Example Query**:
```promql
# Average slippage by DEX
avg(trade_slippage_percentage) by (dex)
```

### Risk Metrics

#### `risk_consecutive_losses`
**Type**: Gauge  
**Description**: Number of consecutive losses

#### `risk_current_drawdown_bps`
**Type**: Gauge  
**Description**: Current drawdown in basis points

**Example Query**:
```promql
# Drawdown percentage
risk_current_drawdown_bps / 100
```

#### `risk_daily_pnl_sol`
**Type**: Gauge  
**Description**: Daily profit and loss in SOL

#### `risk_emergency_stop`
**Type**: Gauge  
**Description**: Emergency stop status (1 = enabled, 0 = disabled)

**Example Query**:
```promql
# Alert when emergency stop is enabled
risk_emergency_stop == 1
```

## Dashboard Panels

### 1. Total Trades
**Type**: Stat panel  
**Query**: `sum(arbitrage_trades_total)`  
**Purpose**: Display total number of trades

### 2. Success Rate
**Type**: Gauge panel  
**Query**: `arbitrage_win_rate`  
**Thresholds**:
- Red: 0-70%
- Yellow: 70-85%
- Green: 85-100%

### 3. Total Profit
**Type**: Stat panel  
**Query**: `arbitrage_profit_sol`  
**Unit**: SOL (4 decimals)

### 4. Error Rate
**Type**: Gauge panel  
**Query**: `arbitrage_error_rate`  
**Thresholds**:
- Green: 0-10%
- Yellow: 10-20%
- Red: 20-100%

### 5. Trades Over Time
**Type**: Graph panel  
**Queries**:
- Success: `rate(arbitrage_trades_total{status="success"}[5m]) * 60`
- Failure: `rate(arbitrage_trades_total{status="failure"}[5m]) * 60`  
**Unit**: Trades per minute

### 6. RPC Latency (P95)
**Type**: Graph panel  
**Query**: `histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m]))`  
**Unit**: Seconds

### 7. Slippage by DEX
**Type**: Graph panel  
**Query**: `trade_slippage_percentage`  
**Group by**: dex label

### 8. Profit Distribution
**Type**: Bar gauge panel  
**Queries**:
- Total: `arbitrage_profit_sol`
- Daily: `risk_daily_pnl_sol`

### 9. Risk Metrics
**Type**: Stat panel  
**Queries**:
- Consecutive Losses: `risk_consecutive_losses`
- Drawdown: `risk_current_drawdown_bps / 100`
- Emergency Stop: `risk_emergency_stop`

## Alert Rules

### 1. High Error Rate
**Condition**: Error rate > 10% for 5 minutes  
**Severity**: Warning  
**Actions**: Send notification, investigate logs

### 2. Low Success Rate
**Condition**: Win rate < 80% for 10 minutes  
**Severity**: Warning  
**Actions**: Check market conditions, review strategy

### 3. High RPC Latency
**Condition**: P95 latency > 2s for 5 minutes  
**Severity**: Warning  
**Actions**: Check RPC provider, switch endpoint if needed

### 4. Excessive Slippage
**Condition**: Slippage > 2% for 5 minutes  
**Severity**: Warning  
**Actions**: Review slippage parameters, check DEX liquidity

### 5. Emergency Stop Activated
**Condition**: `risk_emergency_stop == 1` for 1 minute  
**Severity**: Critical  
**Actions**: Immediate investigation, manual intervention required

### 6. High Drawdown
**Condition**: Drawdown > 400 bps (4%) for 5 minutes  
**Severity**: Warning  
**Actions**: Review risk parameters, consider reducing position sizes

### 7. Consecutive Losses
**Condition**: `risk_consecutive_losses >= 2` for 1 minute  
**Severity**: Warning  
**Actions**: Monitor closely, prepare for circuit breaker

### 8. Negative Daily P&L
**Condition**: Daily P&L < -0.5 SOL for 10 minutes  
**Severity**: Warning  
**Actions**: Review trades, check for systematic issues

## Integration

### Recording Metrics in Code

```typescript
import { arbitrageMetrics } from '../scripts/monitoring-setup.js';

// Record a successful trade
arbitrageMetrics.tradesTotal.inc({ status: 'success', type: 'flash-loan' });
arbitrageMetrics.profitSol.inc(0.05);

// Record a failed trade
arbitrageMetrics.tradesTotal.inc({ status: 'failure', type: 'flash-loan' });
arbitrageMetrics.errorRate.set(errorPercentage);

// Record RPC latency
const end = arbitrageMetrics.rpcDuration.startTimer({ 
  endpoint: 'mainnet', 
  method: 'getBalance' 
});
// ... make RPC call ...
end();

// Record slippage
arbitrageMetrics.tradeSlippage.set({ dex: 'raydium' }, 0.8);

// Update risk metrics
arbitrageMetrics.consecutiveLosses.set(3);
arbitrageMetrics.currentDrawdown.set(250);
arbitrageMetrics.dailyPnL.set(-0.3);
arbitrageMetrics.winRate.set(85);
arbitrageMetrics.emergencyStop.set(0);
```

### Using with Risk Controller

```typescript
import { getRiskController } from './lib/risk-controller.js';
import { arbitrageMetrics } from './scripts/monitoring-setup.js';

const riskController = getRiskController();

// Update metrics from risk controller
function updateRiskMetrics() {
  const metrics = riskController.getMetrics();
  const params = riskController.getParameters();
  
  arbitrageMetrics.consecutiveLosses.set(metrics.consecutiveLosses);
  arbitrageMetrics.currentDrawdown.set(metrics.currentDrawdownBps);
  arbitrageMetrics.dailyPnL.set(metrics.dailyProfitLossSol);
  arbitrageMetrics.winRate.set(riskController.getWinRate());
  arbitrageMetrics.emergencyStop.set(params.emergencyStopEnabled ? 1 : 0);
}

// Update every minute
setInterval(updateRiskMetrics, 60000);
```

## Advanced Queries

### Trade Performance

```promql
# Trades per hour
sum(increase(arbitrage_trades_total[1h]))

# Success rate over 24 hours
sum(increase(arbitrage_trades_total{status="success"}[24h])) / 
sum(increase(arbitrage_trades_total[24h])) * 100

# Profit per trade
arbitrage_profit_sol / sum(arbitrage_trades_total)
```

### RPC Performance

```promql
# Requests per second by endpoint
rate(rpc_request_duration_seconds_count[5m])

# Slowest endpoints (P99)
topk(5, histogram_quantile(0.99, rate(rpc_request_duration_seconds_bucket[5m])))

# Error rate by endpoint
rate(rpc_request_duration_seconds_count{status="error"}[5m]) / 
rate(rpc_request_duration_seconds_count[5m])
```

### Risk Analysis

```promql
# Maximum drawdown today
max_over_time(risk_current_drawdown_bps[24h])

# Average daily P&L over 7 days
avg_over_time(risk_daily_pnl_sol[7d])

# Time in emergency stop
changes(risk_emergency_stop[24h])
```

## Alerting Configuration

### Alertmanager Setup

Create `monitoring/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'team-notifications'

receivers:
  - name: 'team-notifications'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    email_configs:
      - to: 'team@gxq.studio'
        from: 'alerts@gxq.studio'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@gxq.studio'
        auth_password: 'YOUR_PASSWORD'
```

### Slack Notifications

Set up webhook in Slack:
1. Go to Slack Apps → Incoming Webhooks
2. Create webhook for #alerts channel
3. Add webhook URL to alertmanager.yml

### Email Notifications

Configure SMTP settings in alertmanager.yml for email alerts.

## Troubleshooting

### Metrics Not Appearing

**Check**:
1. Metrics server is running (port 9090)
2. Prometheus can reach metrics endpoint
3. Scrape interval hasn't expired
4. No firewall blocking connections

### High Cardinality Issues

**Problem**: Too many unique label combinations

**Solution**:
- Limit DEX labels to major exchanges
- Aggregate by time windows
- Use recording rules for expensive queries

### Dashboard Not Loading

**Check**:
1. Grafana has Prometheus data source configured
2. Data source URL is correct
3. Queries are valid PromQL
4. Time range is appropriate

### Missing Historical Data

**Problem**: Prometheus retention period expired

**Solution**:
```bash
# Increase retention in prometheus.yml
prometheus --storage.tsdb.retention.time=30d
```

## Best Practices

### 1. Metric Naming
- Use descriptive names
- Follow naming convention: `component_metric_unit`
- Examples: `arbitrage_trades_total`, `rpc_request_duration_seconds`

### 2. Label Usage
- Keep cardinality low
- Use for dimensions you need to query
- Avoid high-cardinality labels (user IDs, timestamps)

### 3. Scrape Intervals
- Default: 15s for most metrics
- 1m for less critical metrics
- 5s for critical, high-frequency metrics

### 4. Dashboard Design
- Group related metrics
- Use appropriate visualization types
- Set meaningful thresholds
- Add annotations for deployments

### 5. Alert Tuning
- Start with conservative thresholds
- Adjust based on false positives
- Use `for` clause to avoid flapping
- Document alert response procedures

## Performance Optimization

### Recording Rules

Create pre-computed metrics for expensive queries:

```yaml
# monitoring/recording-rules.yml
groups:
  - name: arbitrage_recording_rules
    interval: 15s
    rules:
      - record: job:arbitrage_success_rate:5m
        expr: |
          sum(rate(arbitrage_trades_total{status="success"}[5m])) /
          sum(rate(arbitrage_trades_total[5m])) * 100
          
      - record: job:rpc_latency_p95:5m
        expr: |
          histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m]))
```

### Query Optimization

```promql
# Bad: High cardinality
sum(arbitrage_trades_total) by (trade_id)

# Good: Aggregate appropriately
sum(arbitrage_trades_total) by (status, type)

# Bad: Wide time range with high resolution
rate(arbitrage_trades_total[24h])

# Good: Use recording rules or increase interval
rate(arbitrage_trades_total[5m])
```

## Related Documentation

- [Auto-Fix System](./AUTO_FIX_SYSTEM.md)
- [Risk Controls](./RISK_CONTROLS.md)
- [Canary Deployment](./CANARY_DEPLOYMENT.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Best Practices](https://prometheus.io/docs/practices/)

## Support

For monitoring issues:
1. Check Prometheus targets status
2. Verify metrics endpoint is accessible
3. Review Grafana data source configuration
4. Check alert rule syntax
5. Create issue with `monitoring` label
