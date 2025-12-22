#!/bin/bash

# Validation script for Self-Optimizing Workflow
# Checks that all necessary files and configurations are in place

set -e

echo "🔍 Validating Self-Optimizing Workflow Setup"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
ERRORS=0

# Helper functions
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file (missing)"
        ((ERRORS++))
        return 1
    fi
}

check_yaml_valid() {
    local file=$1
    local description=$2
    
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description: Valid YAML"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description: Invalid YAML syntax"
        ((ERRORS++))
        return 1
    fi
}

check_command() {
    local cmd=$1
    local description=$2
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $description: $cmd available"
        ((SUCCESS++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $description: $cmd not found (optional)"
        ((WARNINGS++))
        return 1
    fi
}

echo "1. Checking Required Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file ".github/workflows/self-optimize.yml" "Workflow file"
check_file ".github/self-optimize-config.yml" "Configuration file"
check_file ".github/SELF_OPTIMIZE_WORKFLOW.md" "Full documentation"
check_file ".github/SELF_OPTIMIZE_README.md" "Quick start guide"
check_file ".github/SELF_OPTIMIZE_INTEGRATION.md" "Integration guide"
check_file ".github/SELF_OPTIMIZE_QUICK_REF.md" "Quick reference"
check_file "scripts/local-optimize.sh" "Local optimization script"

echo ""
echo "2. Checking File Permissions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -x "scripts/local-optimize.sh" ]; then
    echo -e "${GREEN}✓${NC} Local optimization script is executable"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Local optimization script is not executable (fixing...)"
    chmod +x scripts/local-optimize.sh
    ((WARNINGS++))
fi

echo ""
echo "3. Validating YAML Syntax"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_yaml_valid ".github/workflows/self-optimize.yml" "Workflow YAML"
check_yaml_valid ".github/self-optimize-config.yml" "Config YAML"

echo ""
echo "4. Checking Package.json Scripts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q '"optimize"' package.json; then
    echo -e "${GREEN}✓${NC} npm run optimize script exists"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} npm run optimize script missing"
    ((ERRORS++))
fi

if grep -q '"optimize:fix"' package.json; then
    echo -e "${GREEN}✓${NC} npm run optimize:fix script exists"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} npm run optimize:fix script missing"
    ((ERRORS++))
fi

echo ""
echo "5. Checking .gitignore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "local-optimization-reports/" .gitignore; then
    echo -e "${GREEN}✓${NC} Local reports directory in .gitignore"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Local reports directory not in .gitignore"
    ((WARNINGS++))
fi

echo ""
echo "6. Checking Required Tools (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_command "node" "Node.js"
check_command "npm" "NPM"
check_command "git" "Git"
check_command "python3" "Python 3"
check_command "gh" "GitHub CLI"

echo ""
echo "7. Checking Workflow Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if workflow has required triggers
if grep -q "pull_request:" .github/workflows/self-optimize.yml; then
    echo -e "${GREEN}✓${NC} Workflow triggers on pull_request"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Workflow missing pull_request trigger"
    ((ERRORS++))
fi

# Check if workflow targets dev branch
if grep -q "dev" .github/workflows/self-optimize.yml; then
    echo -e "${GREEN}✓${NC} Workflow targets dev branch"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Workflow may not target dev branch"
    ((WARNINGS++))
fi

# Check if workflow has required permissions
if grep -q "contents: write" .github/workflows/self-optimize.yml; then
    echo -e "${GREEN}✓${NC} Workflow has contents:write permission"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Workflow missing contents:write permission"
    ((ERRORS++))
fi

if grep -q "pull-requests: write" .github/workflows/self-optimize.yml; then
    echo -e "${GREEN}✓${NC} Workflow has pull-requests:write permission"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} Workflow missing pull-requests:write permission"
    ((ERRORS++))
fi

echo ""
echo "8. Checking Configuration Values"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Parse config and check key values
if python3 -c "
import yaml
config = yaml.safe_load(open('.github/self-optimize-config.yml'))
assert config['auto_fix']['enabled'] == True, 'auto_fix not enabled'
assert config['coverage']['enabled'] == True, 'coverage not enabled'
assert config['security']['enabled'] == True, 'security not enabled'
print('All config values valid')
" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Configuration values are valid"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} Some configuration values may need review"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Successes: $SUCCESS${NC}"
echo -e "${YELLOW}⚠ Warnings:  $WARNINGS${NC}"
echo -e "${RED}✗ Errors:    $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Workflow is ready to use.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create a PR to the dev branch"
    echo "2. The workflow will automatically run"
    echo "3. Review the optimization report in PR comments"
    echo "4. Test locally with: npm run optimize"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the errors above.${NC}"
    exit 1
fi
