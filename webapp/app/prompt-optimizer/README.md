# PromptOptimizer

AI-Powered Prompt Engineering for Solana DeFi Arbitrage

## Overview

PromptOptimizer is a comprehensive tool that combines AI prompt engineering with Solana DeFi arbitrage strategies. It helps users create, optimize, and test prompts for analyzing arbitrage opportunities, generating trading strategies, and maximizing profitability in the Solana ecosystem.

## Features

### 1. Prompt Editor
- **Real-time Analysis**: Get instant feedback on prompt quality with metrics for clarity, specificity, and effectiveness
- **Smart Suggestions**: Receive AI-powered recommendations to improve your prompts
- **Cost Estimation**: See estimated token usage and API costs before execution
- **Validation**: Built-in validation to catch common prompt issues

### 2. Template Library
- **Pre-built Templates**: 4 professionally crafted templates for different DeFi scenarios
- **Categories**: 
  - Arbitrage Opportunity Analyzer
  - Flash Loan Strategy Generator
  - Token Analysis Prompt
  - Triangular Arbitrage Optimizer
- **Variable Substitution**: Easy-to-use variable system for customizing templates
- **Live Preview**: See how your template will look with your variables

### 3. Strategy Dashboard
- **5 Default Strategies**: Ready-to-use arbitrage strategies with different risk profiles
  - Flash Loan Stablecoin Arbitrage (Low Risk)
  - SOL Triangular Arbitrage (Medium Risk)
  - Liquid Staking Token Arbitrage (Low-Medium Risk)
  - Memecoin Flash Arbitrage (High Risk)
  - Cross-DEX Opportunity Scanner (Medium Risk)
- **Profit Calculator**: Estimate potential profits based on trade parameters
- **Strategy Scoring**: AI-powered scoring system to evaluate strategy viability
- **Risk Assessment**: Clear risk level indicators for each strategy

## Project Structure

```
prompt-optimizer/
├── components/           # React components
│   ├── PromptEditor.tsx         # Prompt editing and analysis
│   ├── TemplateLibrary.tsx      # Template browser and selector
│   └── StrategyDashboard.tsx    # Strategy management and optimization
├── lib/                 # Utility libraries
│   ├── optimizer.ts             # Prompt optimization algorithms
│   ├── promptTemplates.ts       # Template definitions and management
│   └── strategyOptimizer.ts     # Strategy optimization logic
├── types/               # TypeScript type definitions
│   └── index.ts                 # Core types and interfaces
├── page.tsx            # Main page component
└── README.md           # This file
```

## Usage

### Accessing PromptOptimizer

Navigate to `/prompt-optimizer` in your browser to access the tool.

### Using the Prompt Editor

1. Click on the "Prompt Editor" tab
2. Type or paste your prompt in the text area
3. Click "Analyze" to get metrics and suggestions
4. Make improvements based on the feedback
5. Click "Save" to store your prompt

### Using Templates

1. Click on the "Templates" tab
2. Browse available templates by category
3. Click on a template to view details
4. Fill in the required variables
5. Preview the filled template
6. Click "Use This Template" to load it into the editor

### Managing Strategies

1. Click on the "Strategies" tab
2. Browse available arbitrage strategies
3. Click on a strategy to view details
4. Use the profit calculator to estimate returns
5. Review the AI prompt template used by the strategy
6. Check supported tokens and DEXs

## Integration with Solana DeFi

PromptOptimizer integrates with the existing Solana DeFi infrastructure:

- **11+ DEX Integrations**: Raydium, Orca, Jupiter, Serum, and more
- **5 Flash Loan Providers**: Marginfi, Solend, Kamino, Mango, Port Finance
- **30+ Supported Tokens**: Including SOL, stablecoins, LSTs, and memecoins
- **Real-time Data**: Connects to QuickNode RPC for live market data

## Metrics and Scoring

### Prompt Metrics

- **Clarity** (0-100): How clear and well-structured the prompt is
- **Specificity** (0-100): How specific and detailed the prompt is
- **Effectiveness** (0-100): Overall quality score (average of clarity and specificity)
- **Token Count**: Estimated number of tokens in the prompt
- **Estimated Cost**: Approximate cost in USD for processing the prompt

### Strategy Metrics

- **Risk Level**: Low, Medium, or High
- **Expected Profit**: Target profit percentage
- **Strategy Score** (0-100): Viability score based on market conditions
- **Min Profit Threshold**: Minimum profit required to execute
- **Max Slippage**: Maximum acceptable slippage percentage

## Best Practices

### For Prompts

1. **Be Specific**: Include concrete numbers, token symbols, and DEX names
2. **Add Structure**: Use numbered lists or bullet points for clarity
3. **Define Context**: Provide background information about the market conditions
4. **Set Constraints**: Specify minimum/maximum values and success criteria
5. **Use Action Verbs**: Start with words like "analyze," "calculate," "evaluate"

### For Strategies

1. **Match Risk Tolerance**: Choose strategies that align with your risk appetite
2. **Consider Market Conditions**: Use low-risk strategies in volatile markets
3. **Monitor Liquidity**: Ensure sufficient liquidity for your trade size
4. **Factor in Fees**: Account for swap fees, flash loan fees, and network costs
5. **Enable MEV Protection**: Use Jito bundles for large trades

## Development

### Adding New Templates

1. Open `lib/promptTemplates.ts`
2. Add a new `PromptTemplate` object to the `defaultPromptTemplates` array
3. Define variables with types and descriptions
4. Set the category, tags, and metadata

### Adding New Strategies

1. Open `lib/strategyOptimizer.ts`
2. Add a new `ArbitrageStrategy` object to the `defaultStrategies` array
3. Define parameters, expected profit, and risk level
4. Create an AI prompt template for the strategy

### Customizing Optimization

The optimization algorithms in `lib/optimizer.ts` can be customized:

- Adjust scoring weights in `calculateClarity()` and `calculateSpecificity()`
- Modify token cost estimates in `calculateCost()`
- Add new validation rules in `validatePrompt()`

## API Integration (Future)

PromptOptimizer is designed to integrate with AI APIs:

- **OpenAI GPT-4**: For advanced prompt optimization
- **Anthropic Claude**: For detailed analysis
- **Local Models**: For cost-effective solutions

Configuration is available in `lib/optimizer.ts`:

```typescript
export const defaultOptimizationConfig: PromptOptimizationConfig = {
  aiModel: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0
};
```

## Contributing

To contribute to PromptOptimizer:

1. Follow the existing code structure
2. Add TypeScript types for new features
3. Include comments for complex logic
4. Test with real Solana DeFi scenarios
5. Update this README with new features

## Security Considerations

- Never include private keys or mnemonics in prompts
- Validate all user inputs before processing
- Use proper error handling for API calls
- Implement rate limiting for AI API requests
- Sanitize prompts before sending to external APIs

## License

MIT License - Part of the GXQ STUDIO project

## Support

For issues or questions about PromptOptimizer:
- Open an issue on GitHub
- Check the main project documentation
- Review example prompts in the template library

---

**Built with ❤️ by GXQ STUDIO**
