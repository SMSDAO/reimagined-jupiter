#!/bin/bash

# Dead Code Detection and Analysis Script
# This script identifies unused exports, unreachable code, and other dead code patterns

set -e

OUTPUT_DIR="/tmp/dead-code-analysis"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Starting Dead Code Analysis..."

# Function to analyze unused exports
analyze_unused_exports() {
  echo "Analyzing unused exports..."
  
  if ! command -v ts-prune &> /dev/null; then
    npm install --no-save ts-prune
  fi
  
  npx ts-prune --error > "$OUTPUT_DIR/unused-exports.txt" 2>&1 || true
  
  UNUSED_COUNT=$(grep -c "used in module" "$OUTPUT_DIR/unused-exports.txt" 2>/dev/null || echo "0")
  echo "Found $UNUSED_COUNT unused exports"
}

# Function to detect unreachable code
detect_unreachable_code() {
  echo "Detecting unreachable code..."
  
  # Find code after return statements
  grep -rn "return" src/ --include="*.ts" -A 5 | \
    grep -v "^\-\-$" | \
    awk '/return/{getline; if($0 !~ /^[[:space:]]*}/ && $0 !~ /^[[:space:]]*$/) print}' \
    > "$OUTPUT_DIR/potentially-unreachable.txt" || true
  
  UNREACHABLE_COUNT=$(wc -l < "$OUTPUT_DIR/potentially-unreachable.txt" 2>/dev/null || echo "0")
  echo "Found $UNREACHABLE_COUNT potentially unreachable code blocks"
}

# Function to find unused imports
find_unused_imports() {
  echo "Finding unused imports..."
  
  # This is a simple heuristic - more sophisticated tools exist
  find src/ -name "*.ts" -type f | while read -r file; do
    # Extract imports
    grep "^import.*from" "$file" | sed "s/import.*{\(.*\)}.*/\1/" | tr ',' '\n' | while read -r import; do
      clean_import=$(echo "$import" | xargs)
      if [[ -n "$clean_import" ]]; then
        # Check if imported item is used in file
        if ! grep -q "$clean_import" "$file" | grep -v "^import"; then
          echo "$file: Potentially unused import: $clean_import"
        fi
      fi
    done
  done > "$OUTPUT_DIR/unused-imports.txt" 2>&1 || true
  
  UNUSED_IMPORT_COUNT=$(wc -l < "$OUTPUT_DIR/unused-imports.txt" 2>/dev/null || echo "0")
  echo "Found $UNUSED_IMPORT_COUNT potentially unused imports"
}

# Function to detect duplicate code
detect_duplicate_code() {
  echo "Detecting code duplication..."
  
  if ! command -v jscpd &> /dev/null; then
    npm install --no-save jscpd
  fi
  
  npx jscpd src/ --format json --output "$OUTPUT_DIR" --min-lines 10 --min-tokens 50 2>&1 || true
  
  if [[ -f "$OUTPUT_DIR/jscpd-report.json" ]]; then
    DUPLICATE_COUNT=$(jq '.statistics.total.duplicates // 0' "$OUTPUT_DIR/jscpd-report.json" 2>/dev/null || echo "0")
    echo "Found $DUPLICATE_COUNT code duplications"
  fi
}

# Function to analyze file size and complexity
analyze_file_metrics() {
  echo "Analyzing file metrics..."
  
  find src/ -name "*.ts" -type f | while read -r file; do
    lines=$(wc -l < "$file")
    if [[ $lines -gt 500 ]]; then
      echo "$file: $lines lines (consider splitting)"
    fi
  done | sort -t: -k2 -rn > "$OUTPUT_DIR/large-files.txt"
  
  LARGE_FILE_COUNT=$(wc -l < "$OUTPUT_DIR/large-files.txt" 2>/dev/null || echo "0")
  echo "Found $LARGE_FILE_COUNT files over 500 lines"
}

# Function to find commented code
find_commented_code() {
  echo "Finding commented code blocks..."
  
  # Look for multi-line comment blocks that contain code patterns
  find src/ -name "*.ts" -type f -exec grep -Hn "\/\*" {} \; | \
    while read -r line; do
      file=$(echo "$line" | cut -d: -f1)
      line_num=$(echo "$line" | cut -d: -f2)
      # Check next 10 lines for code patterns
      sed -n "${line_num},$((line_num + 10))p" "$file" | \
        grep -E "(const|let|var|function|class|if|for|while)" && \
        echo "$file:$line_num: Potential commented code block"
    done > "$OUTPUT_DIR/commented-code.txt" 2>&1 || true
  
  COMMENTED_COUNT=$(wc -l < "$OUTPUT_DIR/commented-code.txt" 2>/dev/null || echo "0")
  echo "Found $COMMENTED_COUNT potentially commented code blocks"
}

# Main execution
main() {
  analyze_unused_exports
  detect_unreachable_code
  find_unused_imports
  detect_duplicate_code
  analyze_file_metrics
  find_commented_code
  
  # Generate summary report
  cat > "$OUTPUT_DIR/summary.md" << EOF
# Dead Code Analysis Summary

## Overview

This report identifies potentially unused, unreachable, or redundant code in the codebase.

## Findings

### Unused Exports
- **Count**: $(grep -c "used in module" "$OUTPUT_DIR/unused-exports.txt" 2>/dev/null || echo "0")
- **Details**: See \`unused-exports.txt\`

### Unreachable Code
- **Count**: $(wc -l < "$OUTPUT_DIR/potentially-unreachable.txt" 2>/dev/null || echo "0")
- **Details**: See \`potentially-unreachable.txt\`

### Unused Imports
- **Count**: $(wc -l < "$OUTPUT_DIR/unused-imports.txt" 2>/dev/null || echo "0")
- **Details**: See \`unused-imports.txt\`

### Code Duplication
- **Count**: $(jq '.statistics.total.duplicates // 0' "$OUTPUT_DIR/jscpd-report.json" 2>/dev/null || echo "0")
- **Details**: See \`jscpd-report.json\`

### Large Files
- **Count**: $(wc -l < "$OUTPUT_DIR/large-files.txt" 2>/dev/null || echo "0")
- **Details**: See \`large-files.txt\`

### Commented Code
- **Count**: $(wc -l < "$OUTPUT_DIR/commented-code.txt" 2>/dev/null || echo "0")
- **Details**: See \`commented-code.txt\`

## Recommendations

1. **Review unused exports**: Consider removing exports that are not used anywhere
2. **Check unreachable code**: Verify if code after return statements is intentional
3. **Remove unused imports**: Clean up imports to improve bundle size
4. **Refactor duplications**: Extract common code into shared utilities
5. **Split large files**: Consider breaking down files over 500 lines
6. **Clean commented code**: Remove or document commented code blocks

## Next Steps

- Use automated tools to safely remove unused imports
- Manually review and remove unused exports
- Refactor identified duplications
- Add tests for remaining code to ensure it's actually used

---

*Generated on $(date)*
EOF

  echo "✅ Dead code analysis complete!"
  echo "📄 Reports saved to $OUTPUT_DIR/"
  cat "$OUTPUT_DIR/summary.md"
}

main "$@"
