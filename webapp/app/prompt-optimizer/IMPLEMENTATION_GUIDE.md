# PromptOptimizer Implementation Guide

## Quick Start

### Accessing PromptOptimizer

1. Navigate to your browser: `http://localhost:3000/prompt-optimizer` (development)
2. Or visit: `https://your-domain.vercel.app/prompt-optimizer` (production)

### First Time Usage

1. **Start with Dashboard**: Get an overview of all features
2. **Try Templates**: Browse pre-built templates in the Templates tab
3. **Create Prompts**: Use the Prompt Editor to create and analyze custom prompts
4. **Explore Strategies**: View arbitrage strategies and calculate potential profits

## File Structure

```
webapp/app/prompt-optimizer/
├── components/                    # React UI Components
│   ├── PromptEditor.tsx          # Main prompt editing interface
│   │   - Real-time analysis
│   │   - Metrics display (clarity, specificity, effectiveness)
│   │   - Suggestions panel
│   │   - Validation feedback
│   │
│   ├── TemplateLibrary.tsx       # Template browser and selector
│   │   - Category filtering
│   │   - Template preview
│   │   - Variable input forms
│   │   - Live template rendering
│   │
│   └── StrategyDashboard.tsx     # Strategy management
│       - Strategy cards
│       - Profit calculator
│       - Risk indicators
│       - Recommended strategies
│
├── lib/                          # Business Logic & Utilities
│   ├── optimizer.ts              # Prompt optimization algorithms
│   │   - analyzePrompt()        → OptimizationMetrics
│   │   - optimizePrompt()       → OptimizationResult
│   │   - getSuggestions()       → string[]
│   │   - validatePrompt()       → ValidationResult
│   │
│   ├── promptTemplates.ts        # Template management
│   │   - defaultPromptTemplates → PromptTemplate[]
│   │   - getTemplateById()      → PromptTemplate
│   │   - fillTemplate()         → string
│   │
│   └── strategyOptimizer.ts      # Strategy optimization
│       - defaultStrategies      → ArbitrageStrategy[]
│       - calculateExpectedProfit() → number
│       - scoreStrategy()        → number
│       - recommendStrategy()    → ArbitrageStrategy
│
├── hooks/                        # Custom React Hooks
│   ├── usePromptOptimizer.ts    # Prompt optimization hook
│   │   - optimize()             → Promise<OptimizationResult>
│   │   - analyze()              → OptimizationMetrics
│   │   - suggest()              → string[]
│   │
│   └── useStrategies.ts         # Strategy management hook
│       - strategies             → ArbitrageStrategy[]
│       - toggleStrategy()       → void
│       - calculateProfit()      → number
│       - getRecommendation()    → ArbitrageStrategy
│
├── types/                        # TypeScript Definitions
│   └── index.ts                 # All type definitions
│       - PromptTemplate
│       - OptimizationResult
│       - ArbitrageStrategy
│       - StrategyParameters
│
├── templates/                    # User Templates (Extensible)
├── strategies/                   # Custom Strategies (Extensible)
│
├── page.tsx                      # Main Application Page
├── config.example.ts             # Configuration Template
└── README.md                     # Documentation
```

## Component Architecture

### PromptEditor Component

**Purpose**: Create and analyze prompts with real-time feedback

**Key Features**:
- Textarea for prompt input (font-mono for code-like formatting)
- Real-time metrics calculation
- Color-coded score indicators (green >80, yellow 60-80, red <60)
- Suggestions list with improvement recommendations
- Validation with errors and warnings
- Save/Clear functionality

**State Management**:
```typescript
const [prompt, setPrompt] = useState<string>('');
const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
const [suggestions, setSuggestions] = useState<string[]>([]);
const [validation, setValidation] = useState<ValidationResult | null>(null);
```

**Usage**:
```tsx
<PromptEditor
  initialPrompt="Your initial prompt"
  onSave={(prompt) => console.log('Saved:', prompt)}
/>
```

### TemplateLibrary Component

**Purpose**: Browse and use pre-built templates

**Key Features**:
- Category filtering (all, arbitrage, defi, trading, analysis, general)
- Template cards with descriptions and tags
- Variable input forms with type validation
- Live preview of filled templates
- One-click template usage

**State Management**:
```typescript
const [selectedCategory, setSelectedCategory] = useState<string>('all');
const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
const [variables, setVariables] = useState<Record<string, string>>({});
```

**Available Templates**:
1. **Arbitrage Opportunity Analyzer** - Analyzes price differences across DEXs
2. **Flash Loan Strategy Generator** - Creates flash loan strategies
3. **Token Analysis Prompt** - Comprehensive token analysis
4. **Triangular Arbitrage Optimizer** - Optimizes triangular arbitrage cycles

### StrategyDashboard Component

**Purpose**: Manage and optimize arbitrage strategies

**Key Features**:
- Strategy cards with risk indicators
- Recommended strategy highlighting
- Detailed strategy view with parameters
- Profit calculator with real-time updates
- Token and DEX lists
- AI prompt template display

**State Management**:
```typescript
const [selectedStrategy, setSelectedStrategy] = useState<ArbitrageStrategy | null>(null);
const [tradeAmount, setTradeAmount] = useState<number>(1000);
const [priceDifference, setPriceDifference] = useState<number>(0.01);
```

**Available Strategies**:
1. **Flash Loan Stablecoin** (Low Risk, 0.5% profit)
2. **SOL Triangular** (Medium Risk, 0.8% profit)
3. **LST Arbitrage** (Low-Medium Risk, 0.6% profit)
4. **Memecoin Flash** (High Risk, 2% profit) - Disabled by default
5. **Cross-DEX Scanner** (Medium Risk, 0.7% profit)

## Algorithms & Scoring

### Clarity Score Algorithm

**Range**: 0-100

**Calculation**:
```
Base Score: 50

Adjustments:
+ 10 if structured (has numbered lists or bullets)
+ 10 if has action verbs (analyze, calculate, evaluate)
+ 5  if has questions (contains ?)
+ 10 if has context (contains context/background keywords)
- 20 if too short (< 50 characters)
- 10 if too long (> 2000 characters)

Final Score = clamp(Base + Adjustments, 0, 100)
```

### Specificity Score Algorithm

**Range**: 0-100

**Calculation**:
```
Base Score: 50

Adjustments:
+ 10 if has numbers/metrics
+ 5  for each domain-specific term (max 6 terms)
     Terms: token, dex, arbitrage, liquidity, slippage, profit
+ 10 if has constraints (minimum/maximum)
+ 5  if has examples (example, e.g.)

Final Score = clamp(Base + Adjustments, 0, 100)
```

### Effectiveness Score

```
Effectiveness = (Clarity + Specificity) / 2
```

### Token Count Estimation

```
Token Count ≈ Text Length / 4 characters
```

### Cost Estimation

```
Cost = (Token Count / 1000) × $0.03  (GPT-4 pricing)
```

### Profit Calculation

```
Net Profit = Gross Profit - Slippage Cost - Flash Loan Fee - Network Fees

Where:
- Gross Profit = Trade Amount × Price Difference
- Slippage Cost = Trade Amount × Max Slippage
- Flash Loan Fee = Trade Amount × Provider Fee (0.09%-0.20%)
- Network Fees = 0.000005 SOL × 5 transactions
```

### Strategy Scoring

**Range**: 0-100

**Calculation**:
```
Base Score: 50

Risk Adjustments:
+ 20 if low risk
+ 10 if medium risk
- 10 if high risk

Liquidity Adjustments:
+ 15 if liquidity > $1M
+ 10 if liquidity > $100K
- 20 if liquidity < $10K

Volume Adjustments:
+ 10 if volume > $10M/day
- 15 if volume < $100K/day

Volatility Match:
+ 15 if high-risk strategy in high volatility
+ 10 if low-risk strategy in low volatility

Final Score = clamp(Base + Adjustments, 0, 100)
```

## Integration Points

### Solana DeFi Integration

**DEXs Supported** (11+):
- Raydium, Orca, Jupiter, Serum
- Lifinity, Meteora, Phoenix, OpenBook
- Saber, Mercurial, Aldrin, Crema

**Flash Loan Providers** (5):
| Provider      | Fee   | Liquidity | Speed  |
|--------------|-------|-----------|--------|
| Marginfi     | 0.09% | High      | Fast   |
| Solend       | 0.10% | Very High | Fast   |
| Kamino       | 0.12% | High      | Medium |
| Mango        | 0.15% | Medium    | Fast   |
| Port Finance | 0.20% | Medium    | Medium |

**Token Categories**:
- Native: SOL, wSOL, RAY, ORCA, MNGO, SRM, JUP
- Stablecoins: USDC, USDT, USDH, UXD, USDR
- LSTs: mSOL, stSOL, jitoSOL, bSOL, scnSOL
- Memecoins: BONK, WIF, SAMO, MYRO, POPCAT
- GXQ: GXQ, sGXQ, xGXQ

### API Integration (Future)

**OpenAI GPT-4**:
```typescript
const response = await openai.createCompletion({
  model: 'gpt-4',
  prompt: optimizedPrompt,
  max_tokens: 2000,
  temperature: 0.7
});
```

**Configuration**:
```typescript
export const defaultOptimizationConfig = {
  aiModel: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0
};
```

## Custom Hooks Usage

### usePromptOptimizer Hook

```typescript
import { usePromptOptimizer } from './hooks/usePromptOptimizer';

function MyComponent() {
  const { optimize, analyze, suggest, isOptimizing, lastResult, error } = usePromptOptimizer();
  
  const handleOptimize = async () => {
    try {
      const result = await optimize(prompt);
      console.log('Optimization score:', result.score);
    } catch (err) {
      console.error('Optimization failed:', error);
    }
  };
  
  const metrics = analyze(prompt);
  const suggestions = suggest(prompt);
}
```

### useStrategies Hook

```typescript
import { useStrategies } from './hooks/useStrategies';

function MyComponent() {
  const {
    strategies,
    selectedStrategy,
    setSelectedStrategy,
    toggleStrategy,
    calculateProfit,
    getRecommendation
  } = useStrategies();
  
  const profit = calculateProfit('flash-loan-stablecoin', 1000, 0.01);
  const recommended = getRecommendation({
    volatility: 'medium',
    liquidity: 500000,
    trendingTokens: ['SOL', 'USDC']
  });
}
```

## Styling & Theming

### Color Palette

```css
/* Primary Colors */
Purple: #9333EA (purple-600), #A855F7 (purple-500)
Blue: #2563EB (blue-600), #3B82F6 (blue-500)
Green: #16A34A (green-600), #22C55E (green-500)

/* Background Colors */
Dark: #111827 (gray-900)
Medium: #1F2937 (gray-800)
Light: #374151 (gray-700)

/* Text Colors */
White: #FFFFFF
Light Gray: #D1D5DB (gray-300)
Medium Gray: #9CA3AF (gray-400)

/* Status Colors */
Success: #22C55E (green-400)
Warning: #FACC15 (yellow-400)
Error: #EF4444 (red-400)
Info: #3B82F6 (blue-400)
```

### Gradients

```css
/* Background Gradient */
background: linear-gradient(to bottom, #111827, rgba(147, 51, 234, 0.2), #111827);

/* Card Gradients */
Purple: linear-gradient(to bottom right, #581C87, #6B21A8);
Blue: linear-gradient(to bottom right, #1E3A8A, #1E40AF);
Green: linear-gradient(to bottom right, #065F46, #047857);

/* Button Gradient */
Primary: linear-gradient(to right, #9333EA, #3B82F6);
```

### Component Styling Patterns

**Card**:
```tsx
className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20"
```

**Button (Primary)**:
```tsx
className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
```

**Input**:
```tsx
className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
```

**Tab (Active)**:
```tsx
className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50"
```

## Best Practices

### Prompt Engineering

1. **Be Specific**: Include concrete numbers and token symbols
2. **Add Structure**: Use numbered lists or bullet points
3. **Define Context**: Provide market conditions and background
4. **Set Constraints**: Specify min/max values and thresholds
5. **Use Action Verbs**: Start with analyze, calculate, evaluate

### Strategy Selection

1. **Match Risk Tolerance**: Choose strategies aligned with your risk appetite
2. **Consider Market Conditions**: Use low-risk in volatile markets
3. **Check Liquidity**: Ensure sufficient liquidity for your trade size
4. **Factor in Fees**: Account for all costs (swap, flash loan, network)
5. **Enable MEV Protection**: Use Jito bundles for large trades

### Code Contributions

1. **Follow TypeScript Strict Mode**: All code uses strict typing
2. **Use Existing Patterns**: Follow the established component structure
3. **Add JSDoc Comments**: Document complex functions
4. **Test Before Committing**: Ensure builds pass without errors
5. **Update Documentation**: Keep README files current

## Troubleshooting

### Build Errors

**Error**: "Cannot find module"
```bash
# Solution: Reinstall dependencies
cd webapp
npm install
```

**Error**: "Type error in PromptOptimizer"
```bash
# Solution: Check type definitions in types/index.ts
# Ensure all imports are correct
```

### Runtime Issues

**Issue**: Metrics not updating
- Check if `analyzePrompt()` is being called
- Verify state is updating in component
- Check browser console for errors

**Issue**: Templates not loading
- Verify `defaultPromptTemplates` array is defined
- Check if imports are correct
- Ensure template structure matches `PromptTemplate` interface

**Issue**: Strategy calculator shows wrong values
- Verify input values are numbers, not strings
- Check if strategy exists in `defaultStrategies`
- Ensure fee calculations are correct

## Performance Tips

1. **Memoize Expensive Calculations**: Use `useMemo` for complex computations
2. **Debounce Input**: Use debounce for real-time analysis
3. **Lazy Load Components**: Split large components if needed
4. **Optimize Re-renders**: Use `React.memo` for pure components
5. **Cache Results**: Store analysis results to avoid recalculation

## Security Considerations

1. **Never Store API Keys in Code**: Use environment variables
2. **Validate All Inputs**: Check prompts before sending to APIs
3. **Sanitize Outputs**: Clean AI responses before displaying
4. **Rate Limit Requests**: Prevent API abuse
5. **Use HTTPS**: Always use secure connections

## Future Enhancements Roadmap

### Phase 1: API Integration
- [ ] Connect to OpenAI GPT-4
- [ ] Add Anthropic Claude support
- [ ] Implement local LLM option

### Phase 2: Advanced Features
- [ ] Historical optimization tracking
- [ ] Custom template creation UI
- [ ] Strategy backtesting
- [ ] A/B prompt testing

### Phase 3: Real-time Integration
- [ ] Live DeFi data integration
- [ ] Automatic strategy execution
- [ ] Performance analytics dashboard
- [ ] Collaborative features

## Support & Resources

- **Documentation**: `/webapp/app/prompt-optimizer/README.md`
- **Setup Guide**: `/PROMPT_OPTIMIZER_SETUP.md`
- **Types Reference**: `/webapp/app/prompt-optimizer/types/index.ts`
- **GitHub Issues**: Report bugs and request features

---

**Version**: 1.0.0  
**Last Updated**: December 19, 2025  
**Maintainer**: GXQ STUDIO
