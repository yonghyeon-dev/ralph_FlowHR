#!/usr/bin/env bash
set -euo pipefail

#==============================
# Ralph Loop - Autonomous AI Development Loop
#==============================

# UTF-8 강제 (Windows 한글 깨짐 방지)
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# Windows 콘솔 UTF-8 (Git Bash / MSYS2)
if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* ]]; then
  chcp.com 65001 > /dev/null 2>&1 || true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load config (preflight에서 존재 확인하므로 여기서는 soft fail)
if [[ -f .ralphrc ]]; then
  source .ralphrc
fi

# Defaults (위에서 .ralphrc가 설정하지 않은 값만 적용)
MAX_ITERATIONS=${MAX_ITERATIONS:-50}
RATE_LIMIT_PER_HOUR=${RATE_LIMIT_PER_HOUR:-80}
COOLDOWN_SEC=${COOLDOWN_SEC:-5}
ERROR_COOLDOWN_SEC=${ERROR_COOLDOWN_SEC:-30}
PROMPT_FILE="${PROMPT_FILE:-.ralph/PROMPT.md}"
FIX_PLAN="${FIX_PLAN:-.ralph/fix_plan.md}"
LOG_DIR=".ralph/logs"
ALLOWED_TOOLS="${ALLOWED_TOOLS:-Edit,Write,Read,Bash,Glob,Grep}"

# State
call_count=0
loop_count=0
consecutive_no_progress=0
last_git_sha=""
last_commit_msg=""
rate_limit_start=$(date +%s)
NO_PROGRESS_LIMIT=${NO_PROGRESS_LIMIT:-3}

mkdir -p "$LOG_DIR"

#--- Pre-flight checks ---

preflight() {
  local errors=0

  # claude CLI 확인
  if ! command -v claude &> /dev/null; then
    echo "ERROR: claude CLI가 설치되어 있지 않습니다."
    errors=$((errors + 1))
  fi

  # gh CLI 확인
  if ! command -v gh &> /dev/null; then
    echo "ERROR: gh CLI가 설치되어 있지 않습니다."
    errors=$((errors + 1))
  elif ! gh auth status &> /dev/null; then
    echo "ERROR: gh CLI가 인증되지 않았습니다. 'gh auth login'을 실행하세요."
    errors=$((errors + 1))
  fi

  # git 확인
  if ! git rev-parse --git-dir &> /dev/null; then
    echo "ERROR: git 저장소가 아닙니다."
    errors=$((errors + 1))
  fi

  # 필수 파일 확인
  local files=("$PROMPT_FILE" "$FIX_PLAN" ".ralph/AGENT.md" ".ralphrc" ".ralph/guardrails.md")
  for f in "${files[@]}"; do
    if [[ ! -f "$f" ]]; then
      echo "ERROR: 필수 파일 없음: $f"
      errors=$((errors + 1))
    fi
  done

  # fix_plan에 실제 WI가 있는지 확인 (빈 상태 방지)
  local unchecked
  unchecked=$(grep -c '^\- \[ \]' "$FIX_PLAN" 2>/dev/null || echo "0")
  if [[ "$unchecked" == "0" ]]; then
    echo "ERROR: fix_plan.md에 미완료 WI가 없습니다. /wi:start로 WI를 생성하세요."
    errors=$((errors + 1))
  fi

  if [[ $errors -gt 0 ]]; then
    echo ""
    echo "$errors개 오류. Ralph Loop을 시작할 수 없습니다."
    return 1
  fi
  return 0
}

#--- Functions ---

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_DIR/ralph.log"
}

check_integrity() {
  local files=("$PROMPT_FILE" "$FIX_PLAN" ".ralph/AGENT.md" ".ralphrc" ".ralph/guardrails.md")
  for f in "${files[@]}"; do
    if [[ ! -f "$f" ]]; then
      log "CRITICAL: Missing $f - halting"
      return 1
    fi
  done
  return 0
}

validate_post_iteration() {
  local violations=0

  # 1. 커밋 메시지 형식 검증
  local latest_msg
  latest_msg=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
  if [[ -n "$latest_msg" && "$latest_msg" != "$last_commit_msg" ]]; then
    local pattern="^WI-(feat|fix|docs|style|refactor|test|chore|perf|ci|revert) .+"
    if [[ ! "$latest_msg" =~ $pattern ]]; then
      log "VIOLATION: 커밋 메시지 형식 오류 - $latest_msg"
      violations=$((violations + 1))
    fi
    last_commit_msg="$latest_msg"
  fi

  # 2. .ralph/ 파일 삭제 여부 확인
  for f in "$PROMPT_FILE" "$FIX_PLAN" ".ralph/AGENT.md" ".ralph/guardrails.md"; do
    if [[ ! -f "$f" ]]; then
      log "VIOLATION: Ralph 파일 삭제됨 - $f"
      violations=$((violations + 1))
    fi
  done

  if [[ $violations -gt 0 ]]; then
    log "POST-VALIDATION: $violations violations detected"
    echo "### [$(date '+%Y-%m-%d %H:%M')] 자동 감지: $violations건 규칙 위반 (Iteration #$loop_count)" >> .ralph/guardrails.md
    return 1
  fi
  return 0
}

count_tasks() {
  # 코드블록 내부의 체크박스는 제외 (```로 둘러싸인 영역 밖만 카운트)
  local unchecked completed
  unchecked=$(awk '/^```/{f=!f} !f && /^\- \[ \]/{c++} END{print c+0}' "$FIX_PLAN" 2>/dev/null)
  completed=$(awk '/^```/{f=!f} !f && /^\- \[x\]/{c++} END{print c+0}' "$FIX_PLAN" 2>/dev/null)
  echo "$completed $unchecked"
}

check_all_done() {
  local counts
  counts=$(count_tasks)
  local completed="${counts%% *}"
  local unchecked="${counts##* }"
  # 완료 항목이 0이면서 미완료도 0이면 → 빈 상태 (완료가 아님)
  if [[ "$completed" == "0" && "$unchecked" == "0" ]]; then
    return 1
  fi
  [[ "$unchecked" == "0" ]]
}

check_progress() {
  local current_sha
  current_sha=$(git rev-parse HEAD 2>/dev/null || echo "none")

  # git diff로 uncommitted 변경도 감지
  local has_uncommitted_changes=false
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    has_uncommitted_changes=true
  fi

  if [[ "$current_sha" == "$last_git_sha" && "$has_uncommitted_changes" == "false" ]]; then
    consecutive_no_progress=$((consecutive_no_progress + 1))
    log "No progress detected ($consecutive_no_progress/$NO_PROGRESS_LIMIT)"
    if [[ $consecutive_no_progress -ge $NO_PROGRESS_LIMIT ]]; then
      log "CIRCUIT BREAKER: $NO_PROGRESS_LIMIT iterations without progress - halting"
      return 1
    fi
  else
    consecutive_no_progress=0
    last_git_sha="$current_sha"
  fi
  return 0
}

check_rate_limit() {
  if [[ $call_count -ge $RATE_LIMIT_PER_HOUR ]]; then
    local now elapsed
    now=$(date +%s)
    elapsed=$(( now - rate_limit_start ))
    if [[ $elapsed -lt 3600 ]]; then
      local wait_time=$(( 3600 - elapsed ))
      log "Rate limit ($RATE_LIMIT_PER_HOUR/hr) reached. Waiting ${wait_time}s..."
      sleep "$wait_time"
    fi
    call_count=0
    rate_limit_start=$(date +%s)
  fi
}

build_context() {
  local counts
  counts=$(count_tasks)
  local completed="${counts%% *}"
  local remaining="${counts##* }"
  echo "[Ralph Loop #$loop_count] Completed: $completed | Remaining: $remaining"
}

execute_claude() {
  local context="$1"
  local prompt_content
  prompt_content=$(cat "$PROMPT_FILE")

  local output
  output=$(claude -p "$prompt_content" \
    --output-format json \
    --append-system-prompt "$context" \
    --allowedTools "$ALLOWED_TOOLS" \
    2>&1) || true

  call_count=$((call_count + 1))

  # Save output log
  echo "$output" > "$LOG_DIR/claude_output_${loop_count}.log"

  # Check for exit signal (JSON 또는 plain text 형식 모두 감지)
  if echo "$output" | grep -qE '"EXIT_SIGNAL"\s*:\s*true|EXIT_SIGNAL:\s*true'; then
    log "EXIT_SIGNAL detected in output"
    return 2
  fi

  # Check for blocking errors
  if echo "$output" | grep -qE 'Permission denied|BLOCKED|rate_limit|Rate limit|overloaded'; then
    log "Error detected in output: $(echo "$output" | grep -oE 'Permission denied|BLOCKED|rate_limit|Rate limit|overloaded' | head -1)"
    return 1
  fi

  return 0
}

#--- Main Loop ---

main() {
  # Pre-flight checks
  preflight || exit 1

  log "=== Ralph Loop Started ==="
  log "Max iterations: $MAX_ITERATIONS | Rate limit: $RATE_LIMIT_PER_HOUR/hr"
  log "Allowed tools: $ALLOWED_TOOLS"

  last_git_sha=$(git rev-parse HEAD 2>/dev/null || echo "none")
  last_commit_msg=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")

  while [[ $loop_count -lt $MAX_ITERATIONS ]]; do
    loop_count=$((loop_count + 1))
    log "--- Iteration $loop_count/$MAX_ITERATIONS ---"

    # 1. Integrity check
    check_integrity || break

    # 2. All tasks done?
    if check_all_done; then
      log "All tasks in fix_plan.md are complete!"
      break
    fi

    # 3. Progress check (circuit breaker)
    check_progress || break

    # 4. Rate limit
    check_rate_limit

    # 5. Execute
    local context
    context=$(build_context)

    execute_claude "$context"
    local result=$?

    # 6. Post-iteration validation
    validate_post_iteration || {
      log "Post-validation failed - check guardrails.md"
    }

    case $result in
      0) sleep "$COOLDOWN_SEC" ;;
      1) sleep "$ERROR_COOLDOWN_SEC" ;;
      2) # Exit signal
         if check_all_done; then
           log "Exit signal confirmed - all tasks done"
           break
         else
           log "Exit signal but tasks remain - continuing"
           sleep "$COOLDOWN_SEC"
         fi
         ;;
    esac
  done

  log "=== Ralph Loop Ended ($loop_count iterations) ==="

  # Final status
  local counts
  counts=$(count_tasks)
  log "Final: ${counts%% *} completed, ${counts##* } remaining"

  # 미머지 PR 확인
  local open_prs
  open_prs=$(gh pr list --state open --json number,title --jq 'length' 2>/dev/null || echo "0")
  if [[ "$open_prs" -gt 0 ]]; then
    log "WARNING: $open_prs open PR(s) still pending merge:"
    gh pr list --state open --json number,title --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null || true
    log "Run 'gh pr list' to review and merge remaining PRs."
  fi
}

main "$@"
