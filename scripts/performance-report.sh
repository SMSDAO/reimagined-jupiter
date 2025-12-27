#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Performance Report
# ==============================================================================
# Generate performance metrics and reports
# ==============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_step() {
  echo ""
  echo "======================================================================"
  echo -e "${BLUE}▶ $1${NC}"
  echo "======================================================================"
}

log_info() {
  echo -e "${CYAN}ℹ️  $1${NC}"
}

echo ""
echo "======================================================================"
echo "📈 GXQ Smart Brain: Performance Report"
echo "======================================================================"
echo "Generating performance metrics..."
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"

# Create reports directory
mkdir -p reports

REPORT_DATE=$(date '+%Y-%m-%d')
REPORT_FILE="reports/performance-$REPORT_DATE.md"
METRICS_FILE="reports/metrics.json"

# Initialize report
cat > "$REPORT_FILE" << EOF
# GXQ Studio Performance Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')

---

EOF

# Initialize metrics JSON
echo "{" > "$METRICS_FILE"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$METRICS_FILE"
echo "  \"metrics\": {" >> "$METRICS_FILE"

# Build Times
log_step "Measuring Build Times"

log_info "Building backend..."
BACKEND_START=$(date +%s)
npm run build:backend &> /tmp/backend-build.log || true
BACKEND_END=$(date +%s)
BACKEND_TIME=$((BACKEND_END - BACKEND_START))

log_info "Building webapp..."
WEBAPP_START=$(date +%s)
npm run build:webapp &> /tmp/webapp-build.log || true
WEBAPP_END=$(date +%s)
WEBAPP_TIME=$((WEBAPP_END - WEBAPP_START))

TOTAL_BUILD_TIME=$((BACKEND_TIME + WEBAPP_TIME))

cat >> "$REPORT_FILE" << EOF
## Build Times

| Component | Time (seconds) |
|-----------|----------------|
| Backend   | $BACKEND_TIME |
| Webapp    | $WEBAPP_TIME |
| **Total** | **$TOTAL_BUILD_TIME** |

EOF

echo "    \"build_times\": {" >> "$METRICS_FILE"
echo "      \"backend_seconds\": $BACKEND_TIME," >> "$METRICS_FILE"
echo "      \"webapp_seconds\": $WEBAPP_TIME," >> "$METRICS_FILE"
echo "      \"total_seconds\": $TOTAL_BUILD_TIME" >> "$METRICS_FILE"
echo "    }," >> "$METRICS_FILE"

# Bundle Sizes
log_step "Measuring Bundle Sizes"

DIST_SIZE="N/A"
WEBAPP_SIZE="N/A"

if [ -d "dist" ]; then
  DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
fi

if [ -d "webapp/.next" ]; then
  WEBAPP_SIZE=$(du -sh webapp/.next 2>/dev/null | cut -f1)
fi

cat >> "$REPORT_FILE" << EOF
## Bundle Sizes

| Component | Size |
|-----------|------|
| Backend (dist/) | $DIST_SIZE |
| Webapp (.next/) | $WEBAPP_SIZE |

EOF

echo "    \"bundle_sizes\": {" >> "$METRICS_FILE"
echo "      \"backend\": \"$DIST_SIZE\"," >> "$METRICS_FILE"
echo "      \"webapp\": \"$WEBAPP_SIZE\"" >> "$METRICS_FILE"
echo "    }," >> "$METRICS_FILE"

# Dependency Count
log_step "Counting Dependencies"

BACKEND_DEPS=$(npm ls --depth=0 2>/dev/null | grep -c "├\|└" || echo "0")
WEBAPP_DEPS=$(cd webapp && npm ls --depth=0 2>/dev/null | grep -c "├\|└" || echo "0")

cat >> "$REPORT_FILE" << EOF
## Dependencies

| Component | Count |
|-----------|-------|
| Backend   | $BACKEND_DEPS |
| Webapp    | $WEBAPP_DEPS |

EOF

echo "    \"dependencies\": {" >> "$METRICS_FILE"
echo "      \"backend\": $BACKEND_DEPS," >> "$METRICS_FILE"
echo "      \"webapp\": $WEBAPP_DEPS" >> "$METRICS_FILE"
echo "    }," >> "$METRICS_FILE"

# TypeScript Compilation Time
log_step "Measuring TypeScript Compilation"

log_info "Type-checking backend..."
TYPECHECK_START=$(date +%s)
npm run type-check &> /tmp/typecheck.log || true
TYPECHECK_END=$(date +%s)
TYPECHECK_TIME=$((TYPECHECK_END - TYPECHECK_START))

cat >> "$REPORT_FILE" << EOF
## TypeScript Compilation

| Component | Time (seconds) |
|-----------|----------------|
| Backend type-check | $TYPECHECK_TIME |

EOF

echo "    \"typescript_compilation\": {" >> "$METRICS_FILE"
echo "      \"typecheck_seconds\": $TYPECHECK_TIME" >> "$METRICS_FILE"
echo "    }," >> "$METRICS_FILE"

# Test Coverage (if available)
log_step "Checking Test Coverage"

if npm run test:coverage &> /tmp/coverage.log 2>&1; then
  COVERAGE_PERCENT=$(grep -oP '\d+\.\d+(?=%)' /tmp/coverage.log | head -1 || echo "N/A")
else
  COVERAGE_PERCENT="N/A"
fi

cat >> "$REPORT_FILE" << EOF
## Test Coverage

| Metric | Value |
|--------|-------|
| Coverage | $COVERAGE_PERCENT% |

EOF

echo "    \"test_coverage\": {" >> "$METRICS_FILE"
echo "      \"percentage\": \"$COVERAGE_PERCENT\"" >> "$METRICS_FILE"
echo "    }," >> "$METRICS_FILE"

# Memory Usage
log_step "Checking Memory Usage"

MEMORY_USAGE="N/A"
if command -v free &> /dev/null; then
  MEMORY_USAGE=$(free -h | awk '/^Mem:/ {print $3 "/" $2}')
fi

cat >> "$REPORT_FILE" << EOF
## System Resources

| Resource | Usage |
|----------|-------|
| Memory   | $MEMORY_USAGE |

EOF

echo "    \"system_resources\": {" >> "$METRICS_FILE"
echo "      \"memory\": \"$MEMORY_USAGE\"" >> "$METRICS_FILE"
echo "    }" >> "$METRICS_FILE"

# Close JSON
echo "  }" >> "$METRICS_FILE"
echo "}" >> "$METRICS_FILE"

# Add recommendations to report
cat >> "$REPORT_FILE" << EOF

---

## Recommendations

EOF

if [ "$TOTAL_BUILD_TIME" -gt 300 ]; then
  echo "- ⚠️ Build time exceeds 5 minutes. Consider optimizing build process." >> "$REPORT_FILE"
else
  echo "- ✅ Build time is acceptable (under 5 minutes)." >> "$REPORT_FILE"
fi

if [ "$BACKEND_DEPS" -gt 100 ]; then
  echo "- ⚠️ Backend has many dependencies ($BACKEND_DEPS). Consider reducing dependencies." >> "$REPORT_FILE"
else
  echo "- ✅ Backend dependency count is reasonable." >> "$REPORT_FILE"
fi

if [ "$WEBAPP_DEPS" -gt 50 ]; then
  echo "- ⚠️ Webapp has many dependencies ($WEBAPP_DEPS). Consider reducing dependencies." >> "$REPORT_FILE"
else
  echo "- ✅ Webapp dependency count is reasonable." >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

---

*Report generated by GXQ Smart Brain Performance Monitor*
EOF

# Display summary
echo ""
echo "======================================================================"
echo "📊 Performance Report Summary"
echo "======================================================================"
echo ""
cat "$REPORT_FILE"
echo ""
echo "======================================================================"
echo "✅ Report generated:"
echo "   📄 Markdown: $REPORT_FILE"
echo "   📊 JSON: $METRICS_FILE"
echo "======================================================================"
echo ""

exit 0
