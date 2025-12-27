#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Monitor Logs
# ==============================================================================
# Real-time log aggregation and filtering with colored output
# Usage: ./monitor-logs.sh [backend|webapp|all] [log-level]
# ==============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Parse arguments
TARGET="${1:-all}"
LOG_LEVEL="${2:-all}"

# Validate target
if [[ ! "$TARGET" =~ ^(backend|webapp|all)$ ]]; then
  echo "Usage: $0 [backend|webapp|all] [log-level]"
  echo ""
  echo "Targets:"
  echo "  backend  - Monitor backend logs only"
  echo "  webapp   - Monitor webapp logs only"
  echo "  all      - Monitor all logs (default)"
  echo ""
  echo "Log levels:"
  echo "  ERROR    - Show only errors"
  echo "  WARN     - Show warnings and errors"
  echo "  INFO     - Show info, warnings, and errors"
  echo "  DEBUG    - Show debug and all other logs"
  echo "  all      - Show all logs (default)"
  echo ""
  exit 1
fi

echo "======================================================================"
echo "📊 GXQ Smart Brain: Log Monitor"
echo "======================================================================"
echo "Target: $TARGET"
echo "Level: $LOG_LEVEL"
echo "Press Ctrl+C to stop monitoring"
echo "======================================================================"
echo ""

# Function to colorize log lines based on level
colorize_log() {
  while IFS= read -r line; do
    if echo "$line" | grep -qi "error"; then
      echo -e "${RED}[ERROR]${NC} $line"
    elif echo "$line" | grep -qi "warn"; then
      echo -e "${YELLOW}[WARN]${NC} $line"
    elif echo "$line" | grep -qi "info"; then
      echo -e "${CYAN}[INFO]${NC} $line"
    elif echo "$line" | grep -qi "debug"; then
      echo -e "${BLUE}[DEBUG]${NC} $line"
    elif echo "$line" | grep -qi "success"; then
      echo -e "${GREEN}[SUCCESS]${NC} $line"
    else
      echo "$line"
    fi
  done
}

# Function to filter by log level
filter_level() {
  case "$LOG_LEVEL" in
    ERROR)
      grep -i "error"
      ;;
    WARN)
      grep -iE "error|warn"
      ;;
    INFO)
      grep -iE "error|warn|info"
      ;;
    DEBUG)
      grep -iE "error|warn|info|debug"
      ;;
    all|*)
      cat
      ;;
  esac
}

# Function to monitor backend logs
monitor_backend() {
  echo -e "${MAGENTA}=== BACKEND LOGS ===${NC}"
  
  # Check for various backend log locations
  if [ -f "logs/backend.log" ]; then
    echo "Monitoring: logs/backend.log"
    tail -f logs/backend.log | filter_level | colorize_log
  elif [ -f "backend.log" ]; then
    echo "Monitoring: backend.log"
    tail -f backend.log | filter_level | colorize_log
  else
    echo "No backend log file found in:"
    echo "  - logs/backend.log"
    echo "  - backend.log"
    echo ""
    echo "💡 Backend logs may be sent to stdout/stderr"
    echo "   Run backend and redirect: npm run start:server 2>&1 | tee logs/backend.log"
  fi
}

# Function to monitor webapp logs
monitor_webapp() {
  echo -e "${MAGENTA}=== WEBAPP LOGS ===${NC}"
  
  # Check for Next.js logs
  if [ -d "webapp/.next/server" ]; then
    echo "Monitoring: webapp/.next/server logs"
    
    # Next.js doesn't typically create log files, so we look for running processes
    if pgrep -f "next" > /dev/null; then
      echo "Next.js process is running"
      echo "💡 View logs in the terminal where 'npm run dev' or 'npm start' is running"
    else
      echo "No Next.js process found"
    fi
  fi
  
  # Check for webapp log files
  if [ -f "logs/webapp.log" ]; then
    echo "Monitoring: logs/webapp.log"
    tail -f logs/webapp.log | filter_level | colorize_log
  elif [ -f "webapp/webapp.log" ]; then
    echo "Monitoring: webapp/webapp.log"
    tail -f webapp/webapp.log | filter_level | colorize_log
  else
    echo "No webapp log file found"
    echo ""
    echo "💡 Webapp logs are typically in the terminal where you run:"
    echo "   cd webapp && npm run dev"
  fi
}

# Function to monitor all logs
monitor_all() {
  echo -e "${MAGENTA}=== ALL LOGS ===${NC}"
  
  # Create a temporary directory for fifos
  TMPDIR=$(mktemp -d)
  trap "rm -rf $TMPDIR" EXIT
  
  BACKEND_FIFO="$TMPDIR/backend"
  WEBAPP_FIFO="$TMPDIR/webapp"
  
  mkfifo "$BACKEND_FIFO" "$WEBAPP_FIFO"
  
  # Start monitoring backend
  if [ -f "logs/backend.log" ]; then
    tail -f logs/backend.log 2>/dev/null | sed 's/^/[BACKEND] /' > "$BACKEND_FIFO" &
  elif [ -f "backend.log" ]; then
    tail -f backend.log 2>/dev/null | sed 's/^/[BACKEND] /' > "$BACKEND_FIFO" &
  else
    echo "[BACKEND] No log file found" > "$BACKEND_FIFO" &
  fi
  
  # Start monitoring webapp
  if [ -f "logs/webapp.log" ]; then
    tail -f logs/webapp.log 2>/dev/null | sed 's/^/[WEBAPP] /' > "$WEBAPP_FIFO" &
  elif [ -f "webapp/webapp.log" ]; then
    tail -f webapp/webapp.log 2>/dev/null | sed 's/^/[WEBAPP] /' > "$WEBAPP_FIFO" &
  else
    echo "[WEBAPP] No log file found" > "$WEBAPP_FIFO" &
  fi
  
  # Merge and colorize logs
  cat "$BACKEND_FIFO" "$WEBAPP_FIFO" | filter_level | colorize_log
}

# Main execution
case "$TARGET" in
  backend)
    monitor_backend
    ;;
  webapp)
    monitor_webapp
    ;;
  all)
    monitor_all
    ;;
esac

# If no logs are being monitored
echo ""
echo "======================================================================"
echo "No active log monitoring"
echo "======================================================================"
echo ""
echo "💡 To generate logs:"
echo "   Backend: npm run start:server 2>&1 | tee logs/backend.log"
echo "   Webapp:  cd webapp && npm run dev 2>&1 | tee logs/webapp.log"
echo ""
echo "💡 Then run this script again: bash scripts/monitor-logs.sh"
echo ""
