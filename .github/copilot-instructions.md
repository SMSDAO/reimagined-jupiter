# GitHub Copilot Custom Instructions

This repository contains the GXQ STUDIO - Advanced Solana DeFi Platform with flash loan arbitrage, sniper bot, token launchpad, and a Next.js web application.

## Project Structure

### Backend (Root)
- **Language**: TypeScript (ES2022 modules)
- **Main Entry**: `src/index.ts`
- **Output**: `dist/` directory
- **Key Directories**:
  - `src/config/` - Configuration and token definitions
  - `src/providers/` - Flash loan provider implementations (Marginfi, Solend, Kamino, Mango, Port Finance)
  - `src/dex/` - DEX integrations (Raydium, Orca, Serum, Jupiter, etc.)
  - `src/integrations/` - QuickNode and Jupiter integrations
  - `src/services/` - Core services (airdrop, presets, auto-execution)
  - `src/strategies/` - Arbitrage strategies
  - `src/types.ts` - TypeScript type definitions

### Frontend (webapp/)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript, React 19
- **Styling**: Tailwind CSS 4
- **Key Features**: Jupiter Swap, Sniper Bot, Token Launchpad, Airdrop Checker, Staking, Flash Loan Arbitrage

## Coding Standards

### TypeScript
- Use strict TypeScript with `strict: true` in tsconfig.json
- Target ES2022 with ES2022 modules
- Always use explicit types; avoid `any` (warning level in ESLint)
- Use ESM syntax (`import`/`export`, not `require`)
- Prefix unused parameters with underscore (`_param`)

### Code Style
- Follow `.eslintrc.json` rules for backend
- Follow `eslint.config.mjs` rules for webapp
- Use 2-space indentation
- Use semicolons consistently
- Use async/await for asynchronous operations
- Use descriptive variable names (camelCase for variables, PascalCase for types/classes)

### Imports
- Group imports: external libraries, then internal modules
- Use absolute paths from `src/` for backend
- Use relative paths or aliases for webapp

## Security Requirements

### Critical Security Rules
- **Never commit private keys, mnemonics, or secrets** to source code
- All sensitive data must be loaded from environment variables
- Use `.env.example` as a template; never commit actual `.env` files
- Validate all user input before processing
- Always use type-safe Solana transaction builders

### Solana Security
- Never expose private keys in logs or error messages
- Validate all Solana addresses before transactions
- Use proper slippage protection for DEX trades
- Implement MEV protection via Jito bundles when executing arbitrage
- Always check transaction confirmations before assuming success
- Use proper priority fees to ensure transaction inclusion

### API Keys & Credentials
- Store all RPC URLs, API keys, and credentials in environment variables
- Use QuickNode RPC for production (not free public endpoints)
- Implement rate limiting for API calls
- Handle API errors gracefully with retries and exponential backoff

## Testing Requirements

### Test Coverage
- Write unit tests for new utility functions
- Write integration tests for Solana transaction logic
- Use Jest for testing framework
- Test files should be co-located or in `__tests__` directories
- Mock external API calls in tests

### Testing Patterns
- Test error handling paths
- Test edge cases (e.g., insufficient balance, failed transactions)
- Test with devnet/testnet addresses, never mainnet in tests
- Validate transaction structure before signing

## Dependencies Management

### Adding Dependencies
- Backend: Use `npm install` in root directory
- Frontend: Use `npm install` in `webapp/` directory
- Prefer well-maintained packages with active communities
- Check security advisories before adding new dependencies
- Document why new dependencies are needed in PRs

### Key Dependencies
- `@solana/web3.js` - Solana blockchain interaction
- `@jup-ag/api` - Jupiter aggregator for token swaps
- `@solana/spl-token` - SPL token operations
- `next` - Next.js framework for webapp
- `react` - React library
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management

## Build & Development

### Backend Build Process
```bash
npm install           # Install dependencies
npm run build        # TypeScript compilation to dist/
npm run lint         # Run ESLint
npm test             # Run Jest tests
npm start            # Run compiled code from dist/
npm run dev          # Run with ts-node-esm for development
```

### Webapp Build Process
```bash
cd webapp
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm start            # Start production server
```

### Common Commands
- `npm start airdrops` - Check available airdrops
- `npm start claim` - Auto-claim airdrops
- `npm start scan` - Scan for arbitrage opportunities
- `npm start start` - Start auto-execution mode
- `npm start manual` - Manual execution mode

## Architecture Guidelines

### Backend Architecture
- Use service-oriented architecture
- Keep business logic in `services/`
- Keep external integrations in `integrations/`
- Use strategy pattern for arbitrage strategies
- Implement proper error handling with try-catch blocks
- Log important events and errors

### Frontend Architecture
- Use React Server Components where possible
- Keep client components minimal (`'use client'` directive)
- Use Tailwind for styling (no custom CSS files)
- Implement proper loading states
- Use React hooks for state management
- Implement proper error boundaries

## Flash Loan & DeFi Patterns

### Flash Loan Implementation
- Check liquidity availability before attempting flash loans
- Calculate profitability including fees (0.09%-0.20% depending on provider)
- Implement atomic transaction bundling
- Always repay flash loan in same transaction
- Include safety checks for minimum profit thresholds

### DEX Integration
- Use Jupiter aggregator for best routing
- Implement proper slippage calculation
- Handle transaction failures gracefully
- Monitor for price impact
- Use versioned APIs (Jupiter v6, etc.)

### Arbitrage Strategy
- Minimum profit threshold: 0.3%-1.0% depending on risk
- Dynamic slippage based on volatility
- Support for triangular and flash loan arbitrage
- MEV protection via Jito bundles
- Dev fee system (10% of profits)

## Documentation

### Code Documentation
- Add JSDoc comments for public functions
- Document complex algorithms with inline comments
- Keep README files up to date
- Document environment variables in `.env.example`
- Update documentation when changing functionality

### API Documentation
- Document all public API endpoints
- Include request/response examples
- Document error codes and messages
- Keep OpenAPI/Swagger specs updated if applicable

## Deployment

### Vercel Deployment (Webapp)
- Set Root Directory to `webapp` in Vercel settings
- Add `NEXT_PUBLIC_RPC_URL` environment variable
- Use preview deployments for testing
- See `VERCEL_DEPLOY.md` for detailed instructions

### Environment Configuration
- Use `.env.example` as template
- Required variables: `SOLANA_RPC_URL`, `WALLET_PRIVATE_KEY`
- Optional: QuickNode configuration for advanced features
- Configure profit thresholds and slippage settings

## Solana-Specific Guidelines

### Transaction Building
- Use `@solana/web3.js` Transaction builder
- Add compute budget instructions when needed
- Set appropriate priority fees
- Always simulate transactions before sending
- Handle transaction confirmation properly

### Account Management
- Use proper account derivation (PDA)
- Check account ownership before operations
- Validate account data before reading
- Handle account creation fees (rent-exemption)

### Token Operations
- Use `@solana/spl-token` for token operations
- Check token mint addresses
- Validate token decimals
- Handle associated token accounts properly
- Check token balances before operations

## Error Handling

### Error Patterns
- Use try-catch for async operations
- Log errors with context (transaction signatures, amounts, etc.)
- Return meaningful error messages to users
- Implement retry logic with exponential backoff
- Handle network timeouts gracefully

### Common Errors to Handle
- Insufficient balance
- Transaction timeout
- RPC node errors
- Failed transaction confirmation
- Slippage exceeded
- Price impact too high

## Performance Considerations

### Backend Performance
- Use connection pooling for RPC
- Cache frequently accessed data (token prices, account info)
- Implement rate limiting to avoid RPC quota exhaustion
- Use batch requests where possible
- Monitor transaction confirmation times

### Frontend Performance
- Optimize images and assets
- Use Next.js Image component
- Implement code splitting
- Lazy load heavy components
- Minimize client-side bundle size
- Use React.memo for expensive renders

## Git & Version Control

### Commit Messages
- Use conventional commits format
- Be descriptive but concise
- Reference issue numbers when applicable

### Branch Strategy
- Create feature branches from main
- Use descriptive branch names
- Keep branches focused and small
- Squash commits before merging if needed

## Additional Guidelines

### Risk & Disclaimers
- This involves financial operations with real assets
- Always test thoroughly on devnet/testnet first
- Include appropriate risk disclaimers
- Never guarantee profitability in documentation
- Warn users about smart contract risks, volatility, and potential losses

### Monitoring & Logging
- Log all transaction attempts and results
- Monitor RPC health and switch endpoints if needed
- Track profitability metrics
- Alert on failures or anomalies

### Community & Support
- Keep issues updated with progress
- Respond to community feedback
- Document known issues and limitations
- Provide troubleshooting guides

---

**Remember**: This is a financial application dealing with real cryptocurrency. Prioritize security, accuracy, and user protection in all code changes.
