/**
 * Monitoring Setup - Prometheus metrics and Grafana dashboard configuration
 */

import { createServer } from 'http';
import { register, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../lib/logger.js';

// Initialize default metrics collection
collectDefaultMetrics({ prefix: 'gxq_' });

// Custom metrics for arbitrage operations
export const arbitrageMetrics = {
  // Trade counters
  tradesTotal: new Counter({
    name: 'arbitrage_trades_total',
    help: 'Total number of arbitrage trades',
    labelNames: ['status', 'type'],
  }),

  // Profit tracking
  profitUsd: new Gauge({
    name: 'arbitrage_profit_usd',
    help: 'Total profit in USD',
  }),

  profitSol: new Gauge({
    name: 'arbitrage_profit_sol',
    help: 'Total profit in SOL',
  }),

  // Error rate
  errorRate: new Gauge({
    name: 'arbitrage_error_rate',
    help: 'Error rate percentage',
  }),

  // RPC latency
  rpcDuration: new Histogram({
    name: 'rpc_request_duration_seconds',
    help: 'RPC request duration in seconds',
    labelNames: ['endpoint', 'method'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  // Trade slippage
  tradeSlippage: new Gauge({
    name: 'trade_slippage_percentage',
    help: 'Trade slippage percentage by DEX',
    labelNames: ['dex'],
  }),

  // Risk metrics
  consecutiveLosses: new Gauge({
    name: 'risk_consecutive_losses',
    help: 'Number of consecutive losses',
  }),

  currentDrawdown: new Gauge({
    name: 'risk_current_drawdown_bps',
    help: 'Current drawdown in basis points',
  }),

  dailyPnL: new Gauge({
    name: 'risk_daily_pnl_sol',
    help: 'Daily profit and loss in SOL',
  }),

  winRate: new Gauge({
    name: 'arbitrage_win_rate',
    help: 'Win rate percentage',
  }),

  // System health
  emergencyStop: new Gauge({
    name: 'risk_emergency_stop',
    help: 'Emergency stop status (1 = enabled, 0 = disabled)',
  }),
};

/**
 * Start Prometheus metrics server
 */
export function startMetricsServer(port = 9090): void {
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        res.setHeader('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.end(metrics);
      } catch (error) {
        res.statusCode = 500;
        res.end(`Error collecting metrics: ${error}`);
        logger.error('Error collecting metrics', { error });
      }
    } else if (req.url === '/health') {
      res.statusCode = 200;
      res.end('OK');
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    logger.info(`Metrics server started on port ${port}`, {
      metricsEndpoint: `http://localhost:${port}/metrics`,
      healthEndpoint: `http://localhost:${port}/health`,
    });
  });
}

/**
 * Generate Prometheus configuration
 */
export function generatePrometheusConfig(scrapeInterval = '15s'): string {
  return `# Prometheus Configuration for GXQ Studio
global:
  scrape_interval: ${scrapeInterval}
  evaluation_interval: ${scrapeInterval}
  external_labels:
    cluster: 'gxq-studio'
    environment: '${process.env.NODE_ENV || 'production'}'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            # - 'alertmanager:9093'

# Rule files
rule_files:
  - 'alerts.yml'

# Scrape configurations
scrape_configs:
  # GXQ Studio arbitrage metrics
  - job_name: 'gxq-arbitrage'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'arbitrage'
          
  # Node.js default metrics
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'nodejs'
`;
}

/**
 * Generate Prometheus alert rules
 */
export function generateAlertRules(): string {
  return `# Alert Rules for GXQ Studio
groups:
  - name: arbitrage_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: arbitrage_error_rate > 10
        for: 5m
        labels:
          severity: warning
          service: arbitrage
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%, above 10% threshold for 5 minutes"

      # Low success rate
      - alert: LowSuccessRate
        expr: arbitrage_win_rate < 80
        for: 10m
        labels:
          severity: warning
          service: arbitrage
        annotations:
          summary: "Low success rate detected"
          description: "Win rate is {{ $value }}%, below 80% threshold for 10 minutes"

      # High RPC latency
      - alert: HighRPCLatency
        expr: histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
          service: rpc
        annotations:
          summary: "High RPC latency detected"
          description: "P95 RPC latency is {{ $value }}s, above 2s threshold for 5 minutes"

      # Excessive slippage
      - alert: ExcessiveSlippage
        expr: trade_slippage_percentage > 2
        for: 5m
        labels:
          severity: warning
          service: arbitrage
        annotations:
          summary: "Excessive trade slippage detected"
          description: "Slippage is {{ $value }}%, above 2% threshold for 5 minutes on {{ $labels.dex }}"

      # Emergency stop activated
      - alert: EmergencyStopActivated
        expr: risk_emergency_stop == 1
        for: 1m
        labels:
          severity: critical
          service: risk-control
        annotations:
          summary: "Emergency stop activated"
          description: "Risk controller emergency stop has been triggered"

      # High drawdown
      - alert: HighDrawdown
        expr: risk_current_drawdown_bps > 400
        for: 5m
        labels:
          severity: warning
          service: risk-control
        annotations:
          summary: "High drawdown detected"
          description: "Current drawdown is {{ $value }} bps ({{ div $value 100 }}%), approaching 500 bps limit"

      # Many consecutive losses
      - alert: ConsecutiveLosses
        expr: risk_consecutive_losses >= 2
        for: 1m
        labels:
          severity: warning
          service: risk-control
        annotations:
          summary: "Consecutive losses detected"
          description: "{{ $value }} consecutive losses recorded, approaching limit of 3"

      # Negative daily P&L
      - alert: NegativeDailyPnL
        expr: risk_daily_pnl_sol < -0.5
        for: 10m
        labels:
          severity: warning
          service: risk-control
        annotations:
          summary: "Significant daily loss"
          description: "Daily P&L is {{ $value }} SOL, approaching -1.0 SOL limit"
`;
}

/**
 * Generate Grafana dashboard JSON
 */
export function generateGrafanaDashboard(): Record<string, unknown> {
  return {
    dashboard: {
      title: 'GXQ Studio - Arbitrage Monitoring',
      tags: ['arbitrage', 'solana', 'defi'],
      timezone: 'browser',
      schemaVersion: 16,
      version: 1,
      refresh: '10s',
      panels: [
        {
          id: 1,
          title: 'Total Trades',
          type: 'stat',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
          targets: [
            {
              expr: 'sum(arbitrage_trades_total)',
              legendFormat: 'Total',
            },
          ],
        },
        {
          id: 2,
          title: 'Success Rate',
          type: 'gauge',
          gridPos: { x: 6, y: 0, w: 6, h: 4 },
          targets: [
            {
              expr: 'arbitrage_win_rate',
              legendFormat: 'Win Rate',
            },
          ],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 70, color: 'yellow' },
                  { value: 85, color: 'green' },
                ],
              },
            },
          },
        },
        {
          id: 3,
          title: 'Total Profit (SOL)',
          type: 'stat',
          gridPos: { x: 12, y: 0, w: 6, h: 4 },
          targets: [
            {
              expr: 'arbitrage_profit_sol',
              legendFormat: 'Profit',
            },
          ],
          fieldConfig: {
            defaults: {
              unit: 'short',
              decimals: 4,
            },
          },
        },
        {
          id: 4,
          title: 'Error Rate',
          type: 'gauge',
          gridPos: { x: 18, y: 0, w: 6, h: 4 },
          targets: [
            {
              expr: 'arbitrage_error_rate',
              legendFormat: 'Errors',
            },
          ],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'green' },
                  { value: 10, color: 'yellow' },
                  { value: 20, color: 'red' },
                ],
              },
            },
          },
        },
        {
          id: 5,
          title: 'Trades Over Time',
          type: 'graph',
          gridPos: { x: 0, y: 4, w: 12, h: 8 },
          targets: [
            {
              expr: 'rate(arbitrage_trades_total{status="success"}[5m]) * 60',
              legendFormat: 'Successful (per min)',
            },
            {
              expr: 'rate(arbitrage_trades_total{status="failure"}[5m]) * 60',
              legendFormat: 'Failed (per min)',
            },
          ],
        },
        {
          id: 6,
          title: 'RPC Latency (P95)',
          type: 'graph',
          gridPos: { x: 12, y: 4, w: 12, h: 8 },
          targets: [
            {
              expr: 'histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m]))',
              legendFormat: '{{ endpoint }} - {{ method }}',
            },
          ],
          fieldConfig: {
            defaults: {
              unit: 's',
            },
          },
        },
        {
          id: 7,
          title: 'Slippage by DEX',
          type: 'graph',
          gridPos: { x: 0, y: 12, w: 12, h: 8 },
          targets: [
            {
              expr: 'trade_slippage_percentage',
              legendFormat: '{{ dex }}',
            },
          ],
          fieldConfig: {
            defaults: {
              unit: 'percent',
            },
          },
        },
        {
          id: 8,
          title: 'Profit Distribution',
          type: 'bargauge',
          gridPos: { x: 12, y: 12, w: 12, h: 8 },
          targets: [
            {
              expr: 'arbitrage_profit_sol',
              legendFormat: 'Total Profit',
            },
            {
              expr: 'risk_daily_pnl_sol',
              legendFormat: 'Daily P&L',
            },
          ],
          fieldConfig: {
            defaults: {
              unit: 'short',
              decimals: 4,
            },
          },
        },
        {
          id: 9,
          title: 'Risk Metrics',
          type: 'stat',
          gridPos: { x: 0, y: 20, w: 24, h: 4 },
          targets: [
            {
              expr: 'risk_consecutive_losses',
              legendFormat: 'Consecutive Losses',
            },
            {
              expr: 'risk_current_drawdown_bps / 100',
              legendFormat: 'Drawdown %',
            },
            {
              expr: 'risk_emergency_stop',
              legendFormat: 'Emergency Stop',
            },
          ],
        },
      ],
    },
  };
}

/**
 * Save monitoring configurations to files
 */
export function saveMonitoringConfigs(): void {
  const monitoringDir = resolve(process.cwd(), 'monitoring');

  try {
    // Create monitoring directory if it doesn't exist
    if (!existsSync(monitoringDir)) {
      mkdirSync(monitoringDir, { recursive: true });
    }

    // Save Prometheus config
    writeFileSync(
      resolve(monitoringDir, 'prometheus.yml'),
      generatePrometheusConfig(),
    );
    logger.info('Saved prometheus.yml');

    // Save alert rules
    writeFileSync(
      resolve(monitoringDir, 'alerts.yml'),
      generateAlertRules(),
    );
    logger.info('Saved alerts.yml');

    // Save Grafana dashboard
    writeFileSync(
      resolve(monitoringDir, 'grafana-dashboard.json'),
      JSON.stringify(generateGrafanaDashboard(), null, 2),
    );
    logger.info('Saved grafana-dashboard.json');

    logger.info('All monitoring configurations saved', { directory: monitoringDir });
  } catch (error) {
    logger.error('Failed to save monitoring configurations', { error });
    throw error;
  }
}

// Main execution - check if script is run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  logger.info('Setting up monitoring system...');
  
  try {
    // Save configuration files
    saveMonitoringConfigs();
    
    // Start metrics server
    const port = parseInt(process.env.METRICS_PORT || '9090');
    startMetricsServer(port);
    
    logger.info('Monitoring setup complete! 🎉');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Install Prometheus: https://prometheus.io/download/');
    logger.info('2. Run: prometheus --config.file=monitoring/prometheus.yml');
    logger.info('3. Install Grafana: https://grafana.com/grafana/download');
    logger.info('4. Import dashboard from monitoring/grafana-dashboard.json');
    logger.info('5. View metrics at http://localhost:9090/metrics');
  } catch (error) {
    logger.error('Failed to setup monitoring', { error });
    process.exit(1);
  }
}
