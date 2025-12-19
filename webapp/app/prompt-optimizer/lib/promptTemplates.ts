/**
 * Pre-defined prompt templates for DeFi operations
 */

import { PromptTemplate } from '../types';

export const defaultPromptTemplates: PromptTemplate[] = [
  {
    id: 'arbitrage-opportunity-analyzer',
    name: 'Arbitrage Opportunity Analyzer',
    description: 'Analyzes potential arbitrage opportunities across multiple DEXs',
    category: 'arbitrage',
    template: `Analyze the following arbitrage opportunity on Solana:

Token Pair: {{tokenA}} / {{tokenB}}
DEX 1 ({{dex1}}): Price = {{price1}} {{tokenB}}
DEX 2 ({{dex2}}): Price = {{price2}} {{tokenB}}
Price Difference: {{priceDiff}}%
Available Liquidity: {{liquidity}} {{tokenA}}

Parameters:
- Minimum Profit Threshold: {{minProfit}}%
- Maximum Slippage: {{maxSlippage}}%
- Gas Estimate: {{gasEstimate}} SOL

Evaluate:
1. Profit potential after fees and slippage
2. Execution risk assessment
3. Optimal trade size
4. Recommended flash loan provider
5. MEV protection requirements

Provide a detailed analysis with actionable recommendations.`,
    variables: [
      { name: 'tokenA', type: 'string', description: 'First token symbol', required: true },
      { name: 'tokenB', type: 'string', description: 'Second token symbol', required: true },
      { name: 'dex1', type: 'string', description: 'First DEX name', required: true },
      { name: 'dex2', type: 'string', description: 'Second DEX name', required: true },
      { name: 'price1', type: 'number', description: 'Price on first DEX', required: true },
      { name: 'price2', type: 'number', description: 'Price on second DEX', required: true },
      { name: 'priceDiff', type: 'number', description: 'Price difference percentage', required: true },
      { name: 'liquidity', type: 'number', description: 'Available liquidity', required: true },
      { name: 'minProfit', type: 'number', description: 'Minimum profit threshold', required: true, defaultValue: 0.5 },
      { name: 'maxSlippage', type: 'number', description: 'Maximum allowed slippage', required: true, defaultValue: 1.0 },
      { name: 'gasEstimate', type: 'number', description: 'Estimated gas cost in SOL', required: true }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['arbitrage', 'dex', 'analysis', 'profit']
  },
  {
    id: 'flash-loan-strategy-generator',
    name: 'Flash Loan Strategy Generator',
    description: 'Generates optimal flash loan arbitrage strategies',
    category: 'defi',
    template: `Generate an optimal flash loan arbitrage strategy for Solana DeFi:

Market Conditions:
- Target Tokens: {{tokens}}
- Available Flash Loan Providers: {{providers}}
- Current Market Volatility: {{volatility}}
- Network Congestion: {{congestion}}

Requirements:
- Minimum Expected Profit: {{minProfit}}%
- Maximum Risk Level: {{riskLevel}}
- Preferred DEXs: {{dexes}}

Create a strategy that includes:
1. Optimal flash loan provider selection with fee comparison
2. Multi-hop trade routing across DEXs
3. Slippage protection mechanisms
4. MEV protection using Jito bundles
5. Risk mitigation strategies
6. Expected profit calculation
7. Step-by-step execution plan

Focus on maximizing profit while minimizing risk.`,
    variables: [
      { name: 'tokens', type: 'array', description: 'List of target tokens', required: true },
      { name: 'providers', type: 'array', description: 'Available flash loan providers', required: true },
      { name: 'volatility', type: 'string', description: 'Market volatility level', required: true },
      { name: 'congestion', type: 'string', description: 'Network congestion level', required: true },
      { name: 'minProfit', type: 'number', description: 'Minimum expected profit', required: true, defaultValue: 0.5 },
      { name: 'riskLevel', type: 'string', description: 'Maximum risk level', required: true, defaultValue: 'medium' },
      { name: 'dexes', type: 'array', description: 'Preferred DEX list', required: true }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['flash-loan', 'strategy', 'defi', 'arbitrage']
  },
  {
    id: 'token-analysis',
    name: 'Token Analysis Prompt',
    description: 'Comprehensive token analysis for trading decisions',
    category: 'analysis',
    template: `Perform a comprehensive analysis of the following Solana token:

Token: {{tokenSymbol}} ({{tokenAddress}})
Current Price: {{currentPrice}} USD
24h Volume: {{volume24h}} USD
Market Cap: {{marketCap}} USD
Holders: {{holderCount}}
Liquidity: {{liquidityUSD}} USD

On-chain Metrics:
- Total Supply: {{totalSupply}}
- Circulating Supply: {{circulatingSupply}}
- Burn Rate: {{burnRate}}%
- Top 10 Holders: {{top10Percentage}}%

Analyze:
1. Token fundamentals and utility
2. Liquidity and trading volume trends
3. Holder distribution and concentration risk
4. Price action and technical indicators
5. Risk assessment (rug pull indicators, liquidity locks)
6. Trading recommendations (entry/exit points)
7. Arbitrage opportunities

Provide a detailed report with risk ratings and actionable insights.`,
    variables: [
      { name: 'tokenSymbol', type: 'string', description: 'Token symbol', required: true },
      { name: 'tokenAddress', type: 'string', description: 'Token contract address', required: true },
      { name: 'currentPrice', type: 'number', description: 'Current token price', required: true },
      { name: 'volume24h', type: 'number', description: '24h trading volume', required: true },
      { name: 'marketCap', type: 'number', description: 'Market capitalization', required: true },
      { name: 'holderCount', type: 'number', description: 'Number of token holders', required: true },
      { name: 'liquidityUSD', type: 'number', description: 'Total liquidity in USD', required: true },
      { name: 'totalSupply', type: 'number', description: 'Total token supply', required: true },
      { name: 'circulatingSupply', type: 'number', description: 'Circulating supply', required: true },
      { name: 'burnRate', type: 'number', description: 'Token burn rate', required: false, defaultValue: 0 },
      { name: 'top10Percentage', type: 'number', description: 'Percentage held by top 10', required: true }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['analysis', 'token', 'trading', 'risk-assessment']
  },
  {
    id: 'triangular-arbitrage',
    name: 'Triangular Arbitrage Optimizer',
    description: 'Optimizes triangular arbitrage opportunities',
    category: 'trading',
    template: `Optimize triangular arbitrage opportunity:

Trading Cycle: {{tokenA}} → {{tokenB}} → {{tokenC}} → {{tokenA}}

Exchange Rates:
- {{tokenA}}/{{tokenB}}: {{rate1}}
- {{tokenB}}/{{tokenC}}: {{rate2}}
- {{tokenC}}/{{tokenA}}: {{rate3}}

Liquidity Pools:
- Pool 1: {{liquidity1}} {{tokenA}}
- Pool 2: {{liquidity2}} {{tokenB}}
- Pool 3: {{liquidity3}} {{tokenC}}

Transaction Costs:
- Swap Fees: {{swapFees}}%
- Network Fees: {{networkFees}} SOL

Calculate:
1. Optimal entry amount
2. Expected profit after all fees
3. Slippage impact at different trade sizes
4. Best execution path through DEXs
5. Risk factors and mitigation
6. MEV protection strategy

Recommend whether to execute and optimal parameters.`,
    variables: [
      { name: 'tokenA', type: 'string', description: 'First token in cycle', required: true },
      { name: 'tokenB', type: 'string', description: 'Second token in cycle', required: true },
      { name: 'tokenC', type: 'string', description: 'Third token in cycle', required: true },
      { name: 'rate1', type: 'number', description: 'Exchange rate A to B', required: true },
      { name: 'rate2', type: 'number', description: 'Exchange rate B to C', required: true },
      { name: 'rate3', type: 'number', description: 'Exchange rate C to A', required: true },
      { name: 'liquidity1', type: 'number', description: 'Liquidity in pool 1', required: true },
      { name: 'liquidity2', type: 'number', description: 'Liquidity in pool 2', required: true },
      { name: 'liquidity3', type: 'number', description: 'Liquidity in pool 3', required: true },
      { name: 'swapFees', type: 'number', description: 'Total swap fees', required: true },
      { name: 'networkFees', type: 'number', description: 'Network transaction fees', required: true }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['triangular', 'arbitrage', 'optimization', 'trading']
  }
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return defaultPromptTemplates.find(template => template.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return defaultPromptTemplates.filter(template => template.category === category);
}

/**
 * Fill template with variables
 */
export function fillTemplate(template: string, variables: Record<string, string | number>): string {
  let filled = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    filled = filled.replace(regex, String(value));
  });
  return filled;
}
