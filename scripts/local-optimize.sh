#!/bin/bash

# Local Self-Optimization Script
# Runs the same optimizations as the CI workflow locally for quick feedback

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

echo -e "${BLUE}${ROCKET} Starting Local Self-Optimization${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}${CROSS} Error: package.json not found. Run this from the project root.${NC}"
    exit 1
fi

# Create reports directory
mkdir -p ./local-optimization-reports

# Install required tools if not present
echo -e "${BLUE}${INFO} Checking for required tools...${NC}"

install_if_missing() {
    local package=$1
    if ! npm list -g "$package" > /dev/null 2>&1; then
        echo -e "${YELLOW}Installing $package...${NC}"
        npm install -g "$package" || npm install --save-dev "$package"
    fi
}

# Check for tools
command -v eslint >/dev/null 2>&1 || install_if_missing "eslint"

# Install dev dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}${INFO} Installing dependencies...${NC}"
    npm ci
fi

echo -e "${GREEN}${CHECK} All tools ready${NC}"
echo ""

# Stage 1: Code Analysis
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stage 1: Code Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Running ESLint analysis..."
npx eslint 'src/**/*.ts' 'api/**/*.ts' 'scripts/**/*.ts' \
    --format json \
    --output-file ./local-optimization-reports/eslint-report.json || true

# Count issues
if [ -f "./local-optimization-reports/eslint-report.json" ]; then
    ISSUE_COUNT=$(node -e "
        const report = require('./local-optimization-reports/eslint-report.json');
        const total = report.reduce((sum, file) => sum + file.messages.length, 0);
        console.log(total);
    ")
    echo -e "${INFO} Found $ISSUE_COUNT ESLint issues"
fi

echo ""

# Stage 2: Dead Code Detection
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stage 2: Dead Code Detection${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Analyzing unused exports..."
npx ts-prune --error --json > ./local-optimization-reports/ts-prune-report.json 2>&1 || true

if [ -f "./local-optimization-reports/ts-prune-report.json" ]; then
    UNUSED_COUNT=$(wc -l < ./local-optimization-reports/ts-prune-report.json)
    echo -e "${INFO} Found $UNUSED_COUNT potentially unused exports"
fi

echo ""

# Stage 3: Dependency Check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stage 3: Dependency Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Checking for unused dependencies..."
npx depcheck --json > ./local-optimization-reports/depcheck-report.json || true

if [ -f "./local-optimization-reports/depcheck-report.json" ]; then
    echo -e "${GREEN}${CHECK} Dependency check complete${NC}"
fi

echo ""

# Stage 4: Auto-Fix (with confirmation)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stage 4: Auto-Fix (Optional)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

read -p "Apply safe auto-fixes? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Applying ESLint auto-fixes..."
    
    # Save current state
    git diff > ./local-optimization-reports/changes-before-fix.diff || true
    
    # Apply fixes
    npx eslint 'src/**/*.ts' 'api/**/*.ts' 'scripts/**/*.ts' --fix --fix-type problem,suggestion,layout || true
    
    cd webapp
    npx eslint . --fix --fix-type problem,suggestion,layout || true
    cd ..
    
    # Show what changed
    git diff > ./local-optimization-reports/changes-after-fix.diff || true
    
    echo -e "${GREEN}${CHECK} Auto-fixes applied${NC}"
    echo -e "${INFO} Review changes with: git diff"
else
    echo -e "${YELLOW}${INFO} Skipping auto-fix${NC}"
fi

echo ""

# Stage 5: Test Coverage
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stage 5: Test Coverage Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Running tests with coverage..."
npm test -- --coverage --coverageReporters=json-summary,text || true

if [ -f "coverage/coverage-summary.json" ]; then
    echo ""
    echo "Coverage Summary:"
    node -e "
        const coverage = require('./coverage/coverage-summary.json');
        const total = coverage.total;
        console.log('Lines:      ' + total.lines.pct + '%');
        console.log('Statements: ' + total.statements.pct + '%');
        console.log('Functions:  ' + total.functions.pct + '%');
        console.log('Branches:   ' + total.branches.pct + '%');
        
        // Files needing tests
        const files = Object.entries(coverage).filter(([k]) => k !== 'total');
        const lowCoverage = files.filter(([_, v]) => v.lines.pct < 80);
        
        if (lowCoverage.length > 0) {
            console.log('\\nFiles needing tests (< 80% coverage):');
            lowCoverage.slice(0, 10).forEach(([file, data]) => {
                console.log('- ' + file + ' (' + data.lines.pct + '%)');
            });
            if (lowCoverage.length > 10) {
                console.log('... and ' + (lowCoverage.length - 10) + ' more');
            }
        }
    "
fi

echo ""

# Stage 6: Security Check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stage 6: Security Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Checking for hardcoded secrets..."
git grep -n -i -E '(password|secret|api_key|private_key|token)\s*=\s*["'"'"'][^"'"'"']{8,}' -- '*.ts' '*.js' > ./local-optimization-reports/potential-secrets.txt 2>&1 || true

if [ -s "./local-optimization-reports/potential-secrets.txt" ]; then
    echo -e "${YELLOW}${WARNING} Potential secrets found:${NC}"
    head -5 ./local-optimization-reports/potential-secrets.txt
else
    echo -e "${GREEN}${CHECK} No obvious secrets found${NC}"
fi

echo ""

echo "Checking for unsafe patterns..."
git grep -n -E '(eval\(|Function\(|innerHTML\s*=|dangerouslySetInnerHTML)' -- '*.ts' '*.tsx' '*.js' > ./local-optimization-reports/unsafe-patterns.txt 2>&1 || true

if [ -s "./local-optimization-reports/unsafe-patterns.txt" ]; then
    echo -e "${YELLOW}${WARNING} Unsafe patterns found:${NC}"
    head -5 ./local-optimization-reports/unsafe-patterns.txt
else
    echo -e "${GREEN}${CHECK} No unsafe patterns found${NC}"
fi

echo ""

echo "Running npm audit..."
npm audit --json > ./local-optimization-reports/npm-audit.json 2>&1 || true

if [ -f "./local-optimization-reports/npm-audit.json" ]; then
    node -e "
        try {
            const audit = require('./local-optimization-reports/npm-audit.json');
            const vulns = audit.metadata?.vulnerabilities || {};
            const total = Object.values(vulns).reduce((a, b) => a + b, 0);
            
            if (total > 0) {
                console.log('${YELLOW}${WARNING} Found ' + total + ' vulnerabilities${NC}');
                console.log('- Critical: ' + (vulns.critical || 0));
                console.log('- High: ' + (vulns.high || 0));
                console.log('- Moderate: ' + (vulns.moderate || 0));
                console.log('- Low: ' + (vulns.low || 0));
            } else {
                console.log('${GREEN}${CHECK} No vulnerabilities found${NC}');
            }
        } catch (e) {
            console.log('${YELLOW}Could not parse audit results${NC}');
        }
    "
fi

echo ""

# Generate Summary Report
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Optimization Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > ./local-optimization-reports/summary.md << 'EOF'
# Local Optimization Summary

## Reports Generated

EOF

echo "- ESLint Report: \`local-optimization-reports/eslint-report.json\`" >> ./local-optimization-reports/summary.md
echo "- Dead Code Report: \`local-optimization-reports/ts-prune-report.json\`" >> ./local-optimization-reports/summary.md
echo "- Dependency Report: \`local-optimization-reports/depcheck-report.json\`" >> ./local-optimization-reports/summary.md
echo "- Security Report: \`local-optimization-reports/npm-audit.json\`" >> ./local-optimization-reports/summary.md

cat >> ./local-optimization-reports/summary.md << 'EOF'

## Next Steps

1. Review ESLint issues and fix manually or with auto-fix
2. Remove identified dead code
3. Add tests for low-coverage files
4. Address security vulnerabilities
5. Run `git diff` to review any auto-fix changes

## View Full Reports

```bash
# View ESLint report
cat local-optimization-reports/eslint-report.json | jq

# View coverage
open coverage/lcov-report/index.html

# View all reports
ls -la local-optimization-reports/
```
EOF

echo -e "${GREEN}${CHECK} All checks complete!${NC}"
echo ""
echo -e "${INFO} Reports saved to: ${BLUE}./local-optimization-reports/${NC}"
echo -e "${INFO} Summary: ${BLUE}./local-optimization-reports/summary.md${NC}"
echo ""

# Show summary
if [ -f "./local-optimization-reports/summary.md" ]; then
    cat ./local-optimization-reports/summary.md
fi

echo ""
echo -e "${GREEN}${ROCKET} Optimization complete!${NC}"
echo ""

# Offer to open reports
read -p "Open reports directory? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open ./local-optimization-reports/
    elif command -v open > /dev/null; then
        open ./local-optimization-reports/
    else
        echo -e "${INFO} Reports location: ./local-optimization-reports/"
    fi
fi

exit 0
