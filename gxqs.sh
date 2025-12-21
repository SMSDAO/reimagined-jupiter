#!/usr/bin/env bash
#
# GXQS - Smart Merge Automation System
# Safely automates merging of multiple feature branches with parallel processing,
# retry mechanisms, and comprehensive reporting.
#
set -Eeuo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Parallelism and timeout configuration
MAX_PARALLEL="${MAX_PARALLEL:-4}"
MAX_RETRIES="${MAX_RETRIES:-3}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"

# File paths
LOG_FILE="${LOG_FILE:-smart-merge.log}"
WORKTREE_ROOT="${WORKTREE_ROOT:-.worktrees}"
STATE_FILE="${STATE_FILE:-.merge-state}"
REPORT_FILE="${REPORT_FILE:-merge-report.json}"

# Slack webhook (optional)
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Target branch for merging
TARGET_BRANCH="${TARGET_BRANCH:-dev}"

# Minimum merge score to accept (0-100)
MIN_MERGE_SCORE="${MIN_MERGE_SCORE:-60}"

# Command-line options
DRY_RUN=false
AUTO_SWEEP=false

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Log with timestamp
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    echo "[$timestamp] [$level] $message" >&2
}

# Run command with logging
run() {
    local cmd="$*"
    log "DEBUG" "Running: $cmd"
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY-RUN: Would execute: $cmd"
        return 0
    fi
    eval "$cmd" 2>&1 | tee -a "$LOG_FILE"
    return "${PIPESTATUS[0]}"
}

# Send Slack notification
notify_slack() {
    local message="$1"
    local level="${2:-info}"
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        return 0
    fi
    
    local color="good"
    case "$level" in
        error) color="danger" ;;
        warning) color="warning" ;;
    esac
    
    local payload
    payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "text": "$message",
        "footer": "Smart Merge System",
        "ts": $(date +%s)
    }]
}
EOF
)
    
    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" "$SLACK_WEBHOOK" 2>/dev/null || true
}

# Heartbeat monitoring
heartbeat() {
    local branch="$1"
    local status="$2"
    log "HEARTBEAT" "Branch: $branch | Status: $status"
}

# Progress bar
progress_bar() {
    local current="$1"
    local total="$2"
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))
    
    printf "\r["
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' ' '
    printf "] %3d%% (%d/%d)" "$percentage" "$current" "$total"
}

# Retry mechanism with exponential backoff
retry() {
    local max_attempts="$1"
    shift
    local cmd="$*"
    local attempt=1
    local delay=2
    
    while [ $attempt -le "$max_attempts" ]; do
        log "DEBUG" "Attempt $attempt/$max_attempts: $cmd"
        
        if eval "$cmd"; then
            return 0
        fi
        
        if [ $attempt -lt "$max_attempts" ]; then
            log "WARN" "Command failed, retrying in ${delay}s..."
            sleep "$delay"
            delay=$((delay * 2))
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "ERROR" "Command failed after $max_attempts attempts: $cmd"
    return 1
}

# Add entry to JSON report
json_add() {
    local branch="$1"
    local status="$2"
    local score="${3:-0}"
    local message="${4:-}"
    local conflicts="${5:-0}"
    local files_changed="${6:-0}"
    
    local entry
    entry=$(cat <<EOF
{
    "branch": "$branch",
    "status": "$status",
    "score": $score,
    "message": "$message",
    "conflicts": $conflicts,
    "files_changed": $files_changed,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
    
    # Initialize report file if it doesn't exist
    if [ ! -f "$REPORT_FILE" ]; then
        echo '{"merges":[]}' > "$REPORT_FILE"
    fi
    
    # Add entry to report
    local temp_file
    temp_file=$(mktemp)
    jq ".merges += [$entry]" "$REPORT_FILE" > "$temp_file" && mv "$temp_file" "$REPORT_FILE"
}

# Calculate merge score (0-100)
merge_score() {
    local branch="$1"
    local worktree_path="$2"
    
    # Perform test merge to assess conflicts
    cd "$worktree_path" || return 1
    
    # Get merge statistics
    local conflicts=0
    local files_changed=0
    local insertions=0
    local deletions=0
    
    # Attempt merge in test mode (without committing)
    # Note: We use --no-commit to analyze the merge without completing it
    if git merge --no-commit "$branch" 2>/dev/null; then
        # Successful merge (or merge in progress), analyze changes
        files_changed=$(git diff --cached --numstat | grep -vc "^-")
        insertions=$(git diff --cached --numstat | grep -v "^-" | awk '{sum+=$1} END {print sum+0}')
        deletions=$(git diff --cached --numstat | grep -v "^-" | awk '{sum+=$2} END {print sum+0}')
        
        # Abort the test merge
        git merge --abort 2>/dev/null || true
    else
        # Merge has conflicts
        conflicts=$(git diff --name-only --diff-filter=U | wc -l)
        files_changed=$(git diff --name-only | wc -l)
        
        # Abort the test merge
        git merge --abort 2>/dev/null || true
    fi
    
    # Calculate score based on factors
    local score=100
    
    # Deduct points for conflicts (10 points per conflict, max 50 points)
    if [ "$conflicts" -gt 0 ]; then
        local conflict_penalty=$((conflicts * 10))
        [ "$conflict_penalty" -gt 50 ] && conflict_penalty=50
        score=$((score - conflict_penalty))
    fi
    
    # Deduct points for large changes (0.1 points per file, max 20 points)
    if [ "$files_changed" -gt 0 ]; then
        local file_penalty=$((files_changed / 10))
        [ "$file_penalty" -gt 20 ] && file_penalty=20
        score=$((score - file_penalty))
    fi
    
    # Deduct points for massive code changes (max 30 points)
    local total_changes=$((insertions + deletions))
    if [ "$total_changes" -gt 1000 ]; then
        local change_penalty=$(((total_changes - 1000) / 100))
        [ "$change_penalty" -gt 30 ] && change_penalty=30
        score=$((score - change_penalty))
    fi
    
    # Ensure score is not negative
    [ "$score" -lt 0 ] && score=0
    
    echo "$score:$conflicts:$files_changed"
}

# ============================================================================
# STATE MANAGEMENT
# ============================================================================

# Save state for resumability
save_state() {
    local branch="$1"
    local status="$2"
    echo "$branch:$status:$(date +%s)" >> "$STATE_FILE"
}

# Load state
load_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    fi
}

# Clear state
clear_state() {
    rm -f "$STATE_FILE"
}

# ============================================================================
# BRANCH DISCOVERY
# ============================================================================

# Discover branches to merge
discover_branches() {
    local branches=()
    
    if [ "$AUTO_SWEEP" = true ]; then
        log "INFO" "Auto-detecting feature branches..."
        
        # Get all remote branches except main, dev, master
        while IFS= read -r branch; do
            # Remove 'origin/' prefix and trim whitespace
            branch=$(echo "$branch" | sed 's/^[[:space:]]*origin\///' | tr -d '[:space:]')
            
            # Skip if empty or matches excluded patterns
            if [ -n "$branch" ] && [[ ! "$branch" =~ ^(main|dev|master|HEAD)$ ]]; then
                branches+=("$branch")
            fi
        done < <(git branch -r | grep -v '\->' | grep '^[[:space:]]*origin/')
    else
        # Get branches from arguments
        branches=("$@")
    fi
    
    # Output each branch on a new line
    for branch in "${branches[@]}"; do
        echo "$branch"
    done
}

# ============================================================================
# WORKTREE MANAGEMENT
# ============================================================================

# Create worktree for branch
create_worktree() {
    local branch="$1"
    local worktree_path="$WORKTREE_ROOT/$branch"
    
    # Clean up existing worktree if present
    if [ -d "$worktree_path" ]; then
        log "DEBUG" "Removing existing worktree: $worktree_path"
        git worktree remove "$worktree_path" --force 2>/dev/null || true
        rm -rf "$worktree_path"
    fi
    
    # Create new worktree
    log "DEBUG" "Creating worktree for $branch at $worktree_path"
    mkdir -p "$WORKTREE_ROOT"
    
    if ! git worktree add "$worktree_path" "$TARGET_BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
        log "ERROR" "Failed to create worktree for $branch"
        return 1
    fi
    
    echo "$worktree_path"
}

# Cleanup worktree
cleanup_worktree() {
    local worktree_path="$1"
    
    if [ -d "$worktree_path" ]; then
        log "DEBUG" "Cleaning up worktree: $worktree_path"
        git worktree remove "$worktree_path" --force 2>/dev/null || true
        rm -rf "$worktree_path"
    fi
}

# ============================================================================
# MERGE WORKFLOW
# ============================================================================

# Execute merge for a single branch
merge_branch() {
    local branch="$1"
    local start_time
    start_time=$(date +%s)
    
    log "INFO" "========================================="
    log "INFO" "Starting merge for branch: $branch"
    log "INFO" "========================================="
    
    heartbeat "$branch" "started"
    
    # Create worktree
    local worktree_path
    if ! worktree_path=$(create_worktree "$branch"); then
        json_add "$branch" "failed" 0 "Failed to create worktree"
        save_state "$branch" "failed"
        heartbeat "$branch" "failed"
        return 1
    fi
    
    # Calculate merge score
    log "INFO" "Calculating merge score for $branch..."
    local score_result
    if ! score_result=$(merge_score "$branch" "$worktree_path"); then
        log "ERROR" "Failed to calculate merge score for $branch"
        cleanup_worktree "$worktree_path"
        json_add "$branch" "failed" 0 "Failed to calculate merge score"
        save_state "$branch" "failed"
        heartbeat "$branch" "failed"
        return 1
    fi
    
    local score conflicts files_changed
    IFS=':' read -r score conflicts files_changed <<< "$score_result"
    
    log "INFO" "Merge score for $branch: $score (conflicts: $conflicts, files: $files_changed)"
    
    # Check if score meets threshold
    if [ "$score" -lt "$MIN_MERGE_SCORE" ]; then
        log "WARN" "Merge score $score is below threshold $MIN_MERGE_SCORE, skipping $branch"
        cleanup_worktree "$worktree_path"
        json_add "$branch" "skipped" "$score" "Score below threshold" "$conflicts" "$files_changed"
        save_state "$branch" "skipped"
        heartbeat "$branch" "skipped"
        notify_slack "⚠️ Branch \`$branch\` skipped (score: $score, threshold: $MIN_MERGE_SCORE)" "warning"
        return 0
    fi
    
    # Perform actual merge
    cd "$worktree_path" || return 1
    
    log "INFO" "Fetching latest changes for $branch..."
    if ! retry "$MAX_RETRIES" git fetch origin "$branch"; then
        log "ERROR" "Failed to fetch $branch"
        cleanup_worktree "$worktree_path"
        json_add "$branch" "failed" "$score" "Failed to fetch" "$conflicts" "$files_changed"
        save_state "$branch" "failed"
        heartbeat "$branch" "failed"
        return 1
    fi
    
    log "INFO" "Merging $branch into $TARGET_BRANCH..."
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY-RUN: Would merge $branch (score: $score)"
        cleanup_worktree "$worktree_path"
        json_add "$branch" "dry-run" "$score" "Dry run successful" "$conflicts" "$files_changed"
        save_state "$branch" "dry-run"
        heartbeat "$branch" "dry-run"
        return 0
    fi
    
    # Perform merge with timeout
    local merge_pid
    (
        git merge --no-ff --no-edit "origin/$branch" 2>&1 | tee -a "$LOG_FILE"
    ) &
    merge_pid=$!
    
    # Wait with timeout
    local elapsed=0
    while kill -0 "$merge_pid" 2>/dev/null; do
        if [ "$elapsed" -ge "$TIMEOUT_SECONDS" ]; then
            log "ERROR" "Merge timeout for $branch (${TIMEOUT_SECONDS}s)"
            kill -9 "$merge_pid" 2>/dev/null || true
            cleanup_worktree "$worktree_path"
            json_add "$branch" "timeout" "$score" "Merge timeout" "$conflicts" "$files_changed"
            save_state "$branch" "timeout"
            heartbeat "$branch" "timeout"
            return 1
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    wait $merge_pid
    local merge_status=$?
    
    if [ $merge_status -ne 0 ]; then
        log "ERROR" "Merge failed for $branch"
        cleanup_worktree "$worktree_path"
        json_add "$branch" "failed" "$score" "Merge conflicts or errors" "$conflicts" "$files_changed"
        save_state "$branch" "failed"
        heartbeat "$branch" "failed"
        notify_slack "❌ Failed to merge branch \`$branch\`" "error"
        return 1
    fi
    
    # Push merged changes
    log "INFO" "Pushing merged changes..."
    if ! retry "$MAX_RETRIES" git push origin "$TARGET_BRANCH"; then
        log "ERROR" "Failed to push merged changes for $branch"
        cleanup_worktree "$worktree_path"
        json_add "$branch" "failed" "$score" "Failed to push" "$conflicts" "$files_changed"
        save_state "$branch" "failed"
        heartbeat "$branch" "failed"
        notify_slack "❌ Failed to push merge for branch \`$branch\`" "error"
        return 1
    fi
    
    # Delete remote branch
    log "INFO" "Deleting remote branch $branch..."
    if ! git push origin --delete "$branch" 2>&1 | tee -a "$LOG_FILE"; then
        log "WARN" "Failed to delete remote branch $branch (may not exist)"
    fi
    
    # Cleanup worktree
    cleanup_worktree "$worktree_path"
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Successfully merged $branch in ${duration}s"
    json_add "$branch" "success" "$score" "Merged successfully" "$conflicts" "$files_changed"
    save_state "$branch" "success"
    heartbeat "$branch" "success"
    notify_slack "✅ Successfully merged branch \`$branch\` (score: $score, duration: ${duration}s)"
    
    return 0
}

# ============================================================================
# PARALLEL EXECUTION
# ============================================================================

# Process branches in parallel
parallel_merge() {
    local branches=("$@")
    local total=${#branches[@]}
    local completed=0
    local pids=()
    local active=0
    
    log "INFO" "Processing $total branches with max parallelism: $MAX_PARALLEL"
    
    # Initialize report file
    echo '{"merges":[],"summary":{"total":0,"success":0,"failed":0,"skipped":0,"start_time":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}}' > "$REPORT_FILE"
    
    for branch in "${branches[@]}"; do
        # Wait if max parallel limit reached
        while [ "$active" -ge "$MAX_PARALLEL" ]; do
            # Check for completed processes
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}" 2>/dev/null || true
                    unset "pids[$i]"
                    active=$((active - 1))
                    completed=$((completed + 1))
                    progress_bar "$completed" "$total"
                fi
            done
            sleep 1
        done
        
        # Start merge in background
        merge_branch "$branch" &
        pids+=($!)
        active=$((active + 1))
    done
    
    # Wait for remaining processes
    for pid in "${pids[@]}"; do
        wait "$pid" 2>/dev/null || true
        completed=$((completed + 1))
        progress_bar "$completed" "$total"
    done
    
    echo "" # New line after progress bar
    log "INFO" "All merges completed"
}

# ============================================================================
# CLEANUP AND REPORTING
# ============================================================================

# Cleanup function
cleanup() {
    log "INFO" "Performing cleanup..."
    
    # Remove all worktrees
    if [ -d "$WORKTREE_ROOT" ]; then
        for worktree in "$WORKTREE_ROOT"/*; do
            if [ -d "$worktree" ]; then
                cleanup_worktree "$worktree"
            fi
        done
        rm -rf "$WORKTREE_ROOT"
    fi
    
    log "INFO" "Cleanup completed"
}

# Generate final report
generate_report() {
    log "INFO" "Generating final report..."
    
    if [ ! -f "$REPORT_FILE" ]; then
        log "WARN" "No report file found"
        return
    fi
    
    # Calculate summary
    local total success failed skipped timeout dry_run
    total=$(jq '.merges | length' "$REPORT_FILE")
    success=$(jq '[.merges[] | select(.status=="success")] | length' "$REPORT_FILE")
    failed=$(jq '[.merges[] | select(.status=="failed")] | length' "$REPORT_FILE")
    skipped=$(jq '[.merges[] | select(.status=="skipped")] | length' "$REPORT_FILE")
    timeout=$(jq '[.merges[] | select(.status=="timeout")] | length' "$REPORT_FILE")
    dry_run=$(jq '[.merges[] | select(.status=="dry-run")] | length' "$REPORT_FILE")
    
    # Update summary in report
    local temp_file
    temp_file=$(mktemp)
    jq ".summary.total = $total | .summary.success = $success | .summary.failed = $failed | .summary.skipped = $skipped | .summary.timeout = $timeout | .summary.dry_run = $dry_run | .summary.end_time = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$REPORT_FILE" > "$temp_file" && mv "$temp_file" "$REPORT_FILE"
    
    log "INFO" "========================================="
    log "INFO" "MERGE SUMMARY"
    log "INFO" "========================================="
    log "INFO" "Total branches: $total"
    log "INFO" "Successful: $success"
    log "INFO" "Failed: $failed"
    log "INFO" "Skipped: $skipped"
    log "INFO" "Timeout: $timeout"
    [ "$dry_run" -gt 0 ] && log "INFO" "Dry-run: $dry_run"
    log "INFO" "========================================="
    log "INFO" "Report saved to: $REPORT_FILE"
    
    # Send summary to Slack
    notify_slack "📊 Merge Summary: $success/$total successful, $failed failed, $skipped skipped"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# Parse command-line options
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                log "INFO" "Dry-run mode enabled"
                shift
                ;;
            --auto-sweep)
                AUTO_SWEEP=true
                log "INFO" "Auto-sweep mode enabled"
                shift
                ;;
            --parallel)
                MAX_PARALLEL="$2"
                log "INFO" "Max parallel set to: $MAX_PARALLEL"
                shift 2
                ;;
            --help|-h)
                # Already handled in entry point, but skip here
                shift
                ;;
            *)
                # Store branches in a global array
                BRANCHES_TO_MERGE+=("$1")
                shift
                ;;
        esac
    done
}

# Main function
main() {
    # Set up trap for cleanup
    trap cleanup EXIT INT TERM
    
    # Check if git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not a git repository"
        exit 1
    fi
    
    # Check for required commands
    for cmd in git jq curl; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Initialize global branches array
    BRANCHES_TO_MERGE=()
    
    # Parse arguments (sets global flags and BRANCHES_TO_MERGE)
    parse_args "$@"
    
    # Now log configuration after flags are set
    log "INFO" "========================================="
    log "INFO" "GXQS - Smart Merge Automation System"
    log "INFO" "========================================="
    log "INFO" "Configuration:"
    log "INFO" "  Max Parallel: $MAX_PARALLEL"
    log "INFO" "  Max Retries: $MAX_RETRIES"
    log "INFO" "  Timeout: ${TIMEOUT_SECONDS}s"
    log "INFO" "  Target Branch: $TARGET_BRANCH"
    log "INFO" "  Min Merge Score: $MIN_MERGE_SCORE"
    log "INFO" "  Dry Run: $DRY_RUN"
    log "INFO" "  Auto Sweep: $AUTO_SWEEP"
    log "INFO" "========================================="
    
    # Discover branches
    local branches=()
    if [ "$AUTO_SWEEP" = true ] || [ ${#BRANCHES_TO_MERGE[@]} -eq 0 ]; then
        mapfile -t branches < <(discover_branches "${BRANCHES_TO_MERGE[@]}")
    else
        branches=("${BRANCHES_TO_MERGE[@]}")
    fi
    
    if [ ${#branches[@]} -eq 0 ]; then
        log "ERROR" "No branches to merge"
        exit 1
    fi
    
    log "INFO" "Branches to merge: ${branches[*]}"
    
    # Execute parallel merge
    parallel_merge "${branches[@]}"
    
    # Generate final report
    generate_report
    
    # Clear state on successful completion
    if [ "$DRY_RUN" = false ]; then
        clear_state
    fi
    
    log "INFO" "========================================="
    log "INFO" "Merge automation completed"
    log "INFO" "========================================="
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Handle help before starting main
    for arg in "$@"; do
        if [[ "$arg" == "--help" || "$arg" == "-h" ]]; then
            cat <<'EOF'
GXQS - Smart Merge Automation System

Usage: gxqs.sh [OPTIONS] [BRANCHES...]

Options:
  --dry-run          Preview operations without executing
  --auto-sweep       Automatically detect and merge all feature branches
  --parallel N       Set maximum parallel merges (default: 4)
  --help, -h         Show this help message

Environment Variables:
  MAX_PARALLEL       Maximum concurrent merges (default: 4)
  MAX_RETRIES        Retry attempts for failed operations (default: 3)
  TIMEOUT_SECONDS    Timeout per branch in seconds (default: 900)
  LOG_FILE           Log file path (default: smart-merge.log)
  WORKTREE_ROOT      Worktree directory (default: .worktrees)
  STATE_FILE         State file for resume capability (default: .merge-state)
  REPORT_FILE        JSON report output (default: merge-report.json)
  SLACK_WEBHOOK      Slack webhook URL for notifications (optional)
  TARGET_BRANCH      Target branch for merging (default: dev)
  MIN_MERGE_SCORE    Minimum merge score to accept (default: 60)

Examples:
  # Merge specific branches
  gxqs.sh feature/branch1 feature/branch2

  # Auto-detect and merge all feature branches
  gxqs.sh --auto-sweep

  # Dry-run with auto-sweep
  gxqs.sh --dry-run --auto-sweep

  # Merge with custom parallelism
  gxqs.sh --parallel 8 feature/branch1 feature/branch2
EOF
            exit 0
        fi
    done
    
    main "$@"
fi
