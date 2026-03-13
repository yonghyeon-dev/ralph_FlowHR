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
# MAX_ITERATIONS: fix_plan의 전체 WI 수 + 20% 여유 (검증 재시도 감안)
FIX_PLAN="${FIX_PLAN:-.ralph/fix_plan.md}"
if [[ -z "${MAX_ITERATIONS:-}" && -f "$FIX_PLAN" ]]; then
  _total_wi=$(awk '/^```/{f=!f} !f && /^\- \[[ x]\]/{c++} END{print c+0}' "$FIX_PLAN" 2>/dev/null)
  MAX_ITERATIONS=$(( _total_wi + _total_wi / 5 + 1 ))
  unset _total_wi
fi
MAX_ITERATIONS=${MAX_ITERATIONS:-50}
RATE_LIMIT_PER_HOUR=${RATE_LIMIT_PER_HOUR:-80}
COOLDOWN_SEC=${COOLDOWN_SEC:-5}
ERROR_COOLDOWN_SEC=${ERROR_COOLDOWN_SEC:-30}
PROMPT_FILE="${PROMPT_FILE:-.ralph/PROMPT.md}"
LOG_DIR=".ralph/logs"
ALLOWED_TOOLS="${ALLOWED_TOOLS:-Edit,Write,Read,Bash,Glob,Grep}"

# Parallel (1 = 순차, 2+ = 병렬 worktree)
PARALLEL_COUNT=${PARALLEL_COUNT:-1}
WORKTREE_DIR=".worktrees"

# State
call_count=0
loop_count=0
consecutive_no_progress=0
last_git_sha=""
last_commit_msg=""
rate_limit_start=$(date +%s)
NO_PROGRESS_LIMIT=${NO_PROGRESS_LIMIT:-3}

# Session continuity (토큰 절약)
CONTEXT_THRESHOLD=${CONTEXT_THRESHOLD:-150000}  # 75% of 200k — 이 이상이면 새 세션
current_session_id=""
total_cost_usd=0

# 상태 파일 (비정상 종료 복구용)
STATE_FILE=".ralph/loop_state.json"

save_state() {
  cat > "$STATE_FILE" <<EOF
{
  "loop_count": $loop_count,
  "call_count": $call_count,
  "session_id": "$current_session_id",
  "total_cost_usd": $total_cost_usd,
  "last_git_sha": "$last_git_sha",
  "timestamp": "$(date '+%Y-%m-%d %H:%M:%S')",
  "status": "${1:-running}"
}
EOF
}

restore_state() {
  if [[ -f "$STATE_FILE" ]]; then
    local prev_status prev_loop prev_time prev_cost prev_sha
    prev_status=$(sed -n 's/.*"status"\s*:\s*"\([^"]*\)".*/\1/p' "$STATE_FILE" 2>/dev/null || echo "unknown")
    prev_loop=$(sed -n 's/.*"loop_count"\s*:\s*\([0-9]*\).*/\1/p' "$STATE_FILE" 2>/dev/null || echo "0")
    prev_time=$(sed -n 's/.*"timestamp"\s*:\s*"\([^"]*\)".*/\1/p' "$STATE_FILE" 2>/dev/null || echo "unknown")
    prev_cost=$(sed -n 's/.*"total_cost_usd"\s*:\s*\([0-9.]*\).*/\1/p' "$STATE_FILE" 2>/dev/null || echo "0")
    prev_sha=$(sed -n 's/.*"last_git_sha"\s*:\s*"\([^"]*\)".*/\1/p' "$STATE_FILE" 2>/dev/null || echo "")

    # 현재 git SHA와 비교 → 수동 변경 감지
    local current_sha
    current_sha=$(git rev-parse HEAD 2>/dev/null || echo "none")

    if [[ "$prev_status" == "running" || "$prev_status" == "crashed" ]]; then
      log "⚠️ 이전 실행이 비정상 종료됨 (Iteration $prev_loop, $prev_time)"

      if [[ -n "$prev_sha" && "$prev_sha" != "$current_sha" ]]; then
        # 코드가 변경됨 → 세션 재활용 불가
        log "🔀 마지막 실행 이후 코드 변경 감지 (수동 작업 있음)"
        log "   이전 세션 무효화 → 새 세션으로 시작합니다"
        current_session_id=""
      else
        # 코드 변경 없음 → 이전 세션 재활용 가능
        local prev_session
        prev_session=$(sed -n 's/.*"session_id"\s*:\s*"\([^"]*\)".*/\1/p' "$STATE_FILE" 2>/dev/null || echo "")
        if [[ -n "$prev_session" ]]; then
          current_session_id="$prev_session"
          log "🔄 이전 세션 복구: ${prev_session:0:8}..."
        fi
      fi

      log "📋 fix_plan.md 기준으로 미완료 WI부터 재개합니다"
      total_cost_usd=$prev_cost
    elif [[ "$prev_status" == "completed" ]]; then
      log "✅ 이전 실행 정상 완료됨. 새로 시작합니다."
    fi
  fi
}

cleanup_worktrees() {
  if [[ -d "$WORKTREE_DIR" ]]; then
    for wt in "$WORKTREE_DIR"/worker-*; do
      [[ -d "$wt" ]] || continue
      git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
    done
    rmdir "$WORKTREE_DIR" 2>/dev/null || true
    git worktree prune 2>/dev/null || true
  fi
}

cleanup() {
  local exit_code=$?
  printf "\n"
  # Parallel worktree 정리 (잔여물 방지)
  cleanup_worktrees 2>/dev/null || true
  if [[ $exit_code -ne 0 ]]; then
    log "⚠️ 비정상 종료 (exit code: $exit_code)"
    save_state "crashed"
  fi
  # 미머지 PR 확인
  local open_prs
  open_prs=$(gh pr list --state open --json number,title 2>/dev/null || echo "")
  if [[ -n "$open_prs" && "$open_prs" != "[]" ]]; then
    log "📌 미머지 PR 있음:"
    echo "$open_prs" | sed -n 's/.*"title"\s*:\s*"\([^"]*\)".*/\1/p' | while read -r title; do
      log "  - $title"
    done
  fi
  local counts
  counts=$(count_tasks)
  local completed="${counts%% *}"
  local remaining="${counts##* }"
  log "=== Ralph Loop 종료 (${loop_count} iterations) ==="
  log "최종: ${completed} 완료, ${remaining} 남음"
  log "💡 재실행: bash ralph.sh (미완료 WI부터 자동 재개)"
}

trap cleanup EXIT

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

  # 병렬 모드: uncommitted changes 사전 검사
  if [[ ${PARALLEL_COUNT:-1} -gt 1 ]]; then
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
      echo "ERROR: 병렬 모드에서는 uncommitted changes가 있으면 안 됩니다."
      echo "       worktree 생성 시 충돌이 발생합니다. 먼저 커밋하세요."
      echo "       git status 로 변경사항을 확인하세요."
      errors=$((errors + 1))
    fi
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
    local pattern="^WI-[0-9]{3,4}-(feat|fix|docs|style|refactor|test|chore|perf|ci|revert) .+"
    local pattern_system="^WI-(chore|docs) .+"
    local pattern_merge="^Merge "
    if [[ ! "$latest_msg" =~ $pattern && ! "$latest_msg" =~ $pattern_system && ! "$latest_msg" =~ $pattern_merge ]]; then
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

get_current_wi() {
  # fix_plan.md에서 첫 번째 미완료 WI 이름 추출
  awk '/^```/{f=!f} !f && /^\- \[ \]/{sub(/^\- \[ \] /,""); sub(/ \| L1:.*$/,""); print; exit}' "$FIX_PLAN" 2>/dev/null
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
  local target_wi
  target_wi=$(get_current_wi)
  cat <<EOF
[Ralph Loop #$loop_count] Completed: $completed | Remaining: $remaining
[TARGET] ${target_wi}
[RULE] 위 TARGET 작업 1개만 처리하고 RALPH_STATUS 출력 후 즉시 종료. 다른 WI 절대 금지.
EOF
}

#--- Parallel Execution (PARALLEL_COUNT > 1) ---

get_next_n_wis() {
  local n=${1:-1}

  # 첫 번째 미완료 WI의 batch 태그 확인
  local first_batch
  first_batch=$(awk '/^```/{f=!f} !f && /^\- \[ \]/{
    if (match($0, /batch:[A-Za-z0-9]+/)) print substr($0, RSTART+6, RLENGTH-6)
    exit
  }' "$FIX_PLAN" 2>/dev/null)

  if [[ -z "$first_batch" ]]; then
    # batch 태그 없음 — 순서대로 N개 추출 (기존 동작)
    awk -v n="$n" '/^```/{f=!f} !f && /^\- \[ \]/{sub(/^\- \[ \] /,""); sub(/ \| L1:.*$/,""); print; c++; if(c>=n) exit}' "$FIX_PLAN" 2>/dev/null
  else
    # 같은 batch 내 미완료 WI만 N개 추출
    awk -v n="$n" -v batch="batch:$first_batch" '
      /^```/{f=!f}
      !f && /^\- \[ \]/ && index($0, batch) {
        sub(/^\- \[ \] /,"")
        sub(/ \| L1:.*$/,"")
        print
        c++
        if(c>=n) exit
      }
    ' "$FIX_PLAN" 2>/dev/null
  fi
}

setup_worktree() {
  local wi_name="$1"
  local idx="$2"
  local sanitized
  sanitized=$(echo "$wi_name" | sed 's/[^a-zA-Z0-9_-]/-/g' | cut -c1-40)
  local branch_name="parallel/worker-${idx}-${sanitized}"
  local worktree_path="${WORKTREE_DIR}/worker-${idx}"

  # Clean stale worktree
  if [[ -d "$worktree_path" ]]; then
    git worktree remove "$worktree_path" --force 2>/dev/null || rm -rf "$worktree_path"
  fi
  git branch -D "$branch_name" 2>/dev/null || true

  git worktree add "$worktree_path" -b "$branch_name" HEAD > /dev/null 2>&1 || {
    log "ERROR: worktree 생성 실패 - worker-${idx}"
    return 1
  }

  # Copy gitignored/untracked files needed by claude
  for f in .ralphrc; do
    [[ -f "$f" ]] && cp "$f" "$worktree_path/$f" 2>/dev/null || true
  done
  mkdir -p "$worktree_path/$LOG_DIR"

  echo "$worktree_path|$branch_name"
}

mark_wi_done() {
  # fix_plan.md에서 특정 WI 이름을 포함하는 첫 번째 미완료 항목을 완료 처리
  # 정규식 이스케이프 문제를 우회하기 위해 grep -nF (고정 문자열) + sed 라인번호 방식 사용
  local wi_name="$1"
  local line_num
  line_num=$(grep -nF "- [ ] ${wi_name}" "$FIX_PLAN" 2>/dev/null | head -1 | cut -d: -f1)
  if [[ -n "$line_num" ]]; then
    sed -i "${line_num}s/^\- \[ \]/- [x]/" "$FIX_PLAN" 2>/dev/null
  fi
}

execute_parallel() {
  local -a wis=()
  local -a pids=()
  local -a worktree_info=()
  local -a worktree_wi=()   # worktree_info와 1:1 매핑되는 WI 이름

  while IFS= read -r wi; do
    [[ -n "$wi" ]] && wis+=("$wi")
  done < <(get_next_n_wis "$PARALLEL_COUNT")

  local wi_count=${#wis[@]}
  if [[ $wi_count -eq 0 ]]; then
    return 1
  fi

  log "🔀 병렬 실행: ${wi_count}개 WI 동시 처리"

  # Setup worktrees and launch claude in each
  for i in "${!wis[@]}"; do
    local idx=$((i + 1))
    local wi="${wis[$i]}"
    log "  [Worker $idx] $wi"

    local info
    info=$(setup_worktree "$wi" "$idx") || continue
    worktree_info+=("$info")
    worktree_wi+=("$wi")

    local wt_path="${info%%|*}"

    # Build parallel context
    local counts completed unchecked total
    counts=$(count_tasks)
    completed="${counts%% *}"
    unchecked="${counts##* }"
    total=$((completed + unchecked))

    local context
    context=$(cat <<CTXEOF
[Ralph Loop #$loop_count - Worker $idx/$wi_count] Completed: $completed | Remaining: $unchecked
[TARGET] ${wi}
[RULE] 위 TARGET 작업 1개만 처리하고 RALPH_STATUS 출력 후 즉시 종료. 다른 WI 절대 금지.
[PARALLEL MODE] 이미 작업 브랜치에 있음. 별도 브랜치 생성·PR 생성 불필요. 현재 브랜치에서 직접 커밋할 것. fix_plan.md는 절대 수정하지 말 것(외부 루프가 처리).
CTXEOF
)

    local prompt_content
    prompt_content=$(cat "$PROMPT_FILE")
    local logfile="${SCRIPT_DIR}/${LOG_DIR}/claude_parallel_${loop_count}_${idx}.log"

    # Launch in worktree (background)
    (
      cd "$wt_path" || exit 1
      env -u CLAUDECODE claude -p "$prompt_content" \
        --output-format json \
        --append-system-prompt "$context" \
        --allowedTools "$ALLOWED_TOOLS" \
        > "$logfile" 2>&1
    ) &
    pids+=($!)
    log "  [Worker $idx] PID ${pids[-1]} 시작"
  done

  if [[ ${#pids[@]} -eq 0 ]]; then
    log "ERROR: 실행된 워커 없음"
    return 1
  fi

  # Wait with progress display
  log "⏳ ${#pids[@]}개 워커 대기 중..."
  local elapsed=0
  local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  while true; do
    local running=0
    for pid in "${pids[@]}"; do
      kill -0 "$pid" 2>/dev/null && running=$((running + 1))
    done
    [[ $running -eq 0 ]] && break
    local sidx=$((elapsed % 10))
    printf "\r  ${spin[$sidx]} %dm %02ds | 실행 중: %d/%d  " "$((elapsed/60))" "$((elapsed%60))" "$running" "${#pids[@]}"
    sleep 1
    elapsed=$((elapsed + 1))
  done
  printf "\r  ✅ 전체 완료 (%dm %02ds)                                    \n" "$((elapsed/60))" "$((elapsed%60))"

  # Sequential merge back to current branch
  local merged=0 failed=0 skipped=0
  for i in "${!worktree_info[@]}"; do
    local info="${worktree_info[$i]}"
    local wt_path="${info%%|*}"
    local branch="${info##*|}"
    local idx=$((i + 1))

    # Check for new commits vs base
    local wt_sha base_sha
    wt_sha=$(git -C "$wt_path" rev-parse HEAD 2>/dev/null || echo "none")
    base_sha=$(git merge-base HEAD "$branch" 2>/dev/null || echo "none")

    if [[ "$wt_sha" == "$base_sha" ]]; then
      # 워커가 "이미 구현됨"으로 완료 보고했으면 fix_plan 체크
      local worker_log="${SCRIPT_DIR}/${LOG_DIR}/claude_parallel_${loop_count}_${idx}.log"
      if grep -q 'TASKS_COMPLETED_THIS_LOOP: 1' "$worker_log" 2>/dev/null; then
        mark_wi_done "${worktree_wi[$i]}" || true
        log "  [Worker $idx] 이미 구현됨 — fix_plan 자동 체크"
      else
        log "  [Worker $idx] 변경 없음 — 스킵"
      fi
      skipped=$((skipped + 1))
    else
      log "  [Worker $idx] 머지: $branch"
      if git merge "$branch" --no-edit 2>"$LOG_DIR/merge_${idx}.log"; then
        merged=$((merged + 1))
        mark_wi_done "${worktree_wi[$i]}" || true
        log "  [Worker $idx] ✅ 머지 성공"
      else
        git merge --abort 2>/dev/null || true
        failed=$((failed + 1))
        log "  [Worker $idx] ❌ 머지 충돌 — 롤백"
        log "  [Worker $idx] 원인: $(head -3 "$LOG_DIR/merge_${idx}.log" 2>/dev/null)"
      fi
    fi

    # Cleanup worktree & branch
    git worktree remove "$wt_path" --force 2>/dev/null || rm -rf "$wt_path"
    git branch -D "$branch" 2>/dev/null || true
  done

  git worktree prune 2>/dev/null || true
  rmdir "$WORKTREE_DIR" 2>/dev/null || true

  log "🔀 병렬 결과: ${merged} 머지, ${failed} 충돌, ${skipped} 스킵"
  call_count=$((call_count + wi_count))

  # fix_plan.md 변경사항 커밋 (머지 성공한 WI가 있을 때만)
  if [[ $merged -gt 0 ]] && ! git diff --quiet "$FIX_PLAN" 2>/dev/null; then
    git add "$FIX_PLAN"
    git commit -m "WI-chore fix_plan 업데이트 (병렬 ${merged}건 완료)" --no-verify 2>/dev/null || true
  fi

  # 전부 실패면 에러
  [[ $failed -eq $wi_count ]] && return 1
  return 0
}

#--- Sequential Execution ---

execute_claude() {
  local context="$1"
  local prompt_content
  prompt_content=$(cat "$PROMPT_FILE")

  # claude -p가 git 작업 중 삭제할 수 있으므로 매번 보장
  mkdir -p "$LOG_DIR"
  local logfile="$LOG_DIR/claude_output_${loop_count}.log"

  # 세션 재활용 또는 새 세션 결정
  local session_args=()
  if [[ -n "$current_session_id" ]]; then
    session_args=(--resume "$current_session_id")
    log "🔄 세션 재활용: ${current_session_id:0:8}..."
  else
    log "🆕 새 세션 시작"
  fi

  # 백그라운드에서 claude -p 실행 (CLAUDECODE 변수를 명시적으로 제거)
  env -u CLAUDECODE claude -p "$prompt_content" \
    --output-format json \
    --append-system-prompt "$context" \
    --allowedTools "$ALLOWED_TOOLS" \
    "${session_args[@]}" \
    > "$logfile" 2>&1 &
  local pid=$!

  # 스피너 + 브랜치/파일 상태
  local elapsed=0
  local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  while kill -0 "$pid" 2>/dev/null; do
    local idx=$((elapsed % 10))
    local file_changes
    file_changes=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null || echo "main")
    printf "\r  ${spin[$idx]} %dm %02ds | %s | 파일: %s개  " "$((elapsed/60))" "$((elapsed%60))" "$current_branch" "$file_changes"
    sleep 1
    elapsed=$((elapsed + 1))
  done
  wait "$pid" || true
  printf "\r  ✅ 완료 (%dm %02ds)                                              \n" "$((elapsed/60))" "$((elapsed%60))"

  call_count=$((call_count + 1))

  # Read output from log
  local output
  output=$(cat "$logfile")

  # 세션 ID 및 토큰 사용량 추출 (sed 사용 — Git Bash 호환)
  local new_session_id iteration_cost
  new_session_id=$(echo "$output" | sed -n 's/.*"session_id"\s*:\s*"\([^"]*\)".*/\1/p' | head -1)
  iteration_cost=$(echo "$output" | sed -n 's/.*"total_cost_usd"\s*:\s*\([0-9.]*\).*/\1/p' | head -1)

  # 컨텍스트 크기 추정: cache_creation_input_tokens = 대화에 추가된 고유 콘텐츠 누적합
  # (cache_read는 매 턴마다 중복 카운트되므로 컨텍스트 크기로 사용하면 안 됨)
  local cache_creation=$(echo "$output" | sed -n 's/.*"cache_creation_input_tokens"\s*:\s*\([0-9]*\).*/\1/p' | head -1)
  local total_context_tokens=${cache_creation:-0}

  # 비용 표시: API 키 사용자만 (구독 사용자는 토큰만 표시)
  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    # API 키 사용자 → 비용 표시
    if [[ -n "$iteration_cost" ]]; then
      total_cost_usd=$(awk "BEGIN{printf \"%.2f\", $total_cost_usd + $iteration_cost}")
    fi
    log "📊 컨텍스트: ${total_context_tokens} tokens | 비용: \$${iteration_cost:-0} (누적: \$${total_cost_usd})"
  else
    # 구독(auth) 사용자 → 비용 없이 토큰만
    log "📊 컨텍스트: ${total_context_tokens} tokens (구독 플랜 — 별도 과금 없음)"
  fi

  # 컨텍스트 임계치 체크 → 세션 리셋 여부 결정
  if [[ $total_context_tokens -gt $CONTEXT_THRESHOLD ]]; then
    log "⚠️ 컨텍스트 ${total_context_tokens} > ${CONTEXT_THRESHOLD} — 다음 반복에서 새 세션 시작"
    current_session_id=""
  elif [[ -n "$new_session_id" ]]; then
    current_session_id="$new_session_id"
  fi

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

  # 이전 실행 상태 복구 확인
  restore_state

  # 병렬 모드: 이전 실행의 stale worktree/branch 정리
  if [[ $PARALLEL_COUNT -gt 1 ]]; then
    cleanup_worktrees 2>/dev/null || true
    # stale parallel branches 정리
    local stale_branches
    stale_branches=$(git branch --list 'parallel/worker-*' 2>/dev/null || true)
    if [[ -n "$stale_branches" ]]; then
      echo "$stale_branches" | while read -r b; do
        b=$(echo "$b" | tr -d ' *')
        git branch -D "$b" 2>/dev/null || true
      done
      log "🧹 이전 병렬 브랜치 정리 완료"
    fi
  fi

  log "=== Ralph Loop Started ==="
  log "Max iterations: $MAX_ITERATIONS | Rate limit: $RATE_LIMIT_PER_HOUR/hr"
  if [[ $PARALLEL_COUNT -gt 1 ]]; then
    log "Mode: 병렬 (${PARALLEL_COUNT}x worktree)"
  else
    log "Mode: 순차"
  fi
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

    if [[ $PARALLEL_COUNT -gt 1 ]]; then
      #--- Parallel mode ---
      local counts completed unchecked total pct
      counts=$(count_tasks)
      completed="${counts%% *}"
      unchecked="${counts##* }"
      total=$((completed + unchecked))
      pct=0; [[ $total -gt 0 ]] && pct=$((completed * 100 / total))
      log "📊 진행률: $completed/$total ($pct%) — 병렬 ${PARALLEL_COUNT}x 실행"

      check_rate_limit

      local result=0
      execute_parallel || result=$?

      validate_post_iteration || {
        log "Post-validation failed - check guardrails.md"
      }
      check_progress || break
      save_state "running"

      if [[ $result -ne 0 ]]; then
        sleep "$ERROR_COOLDOWN_SEC"
      else
        sleep "$COOLDOWN_SEC"
      fi
    else
      #--- Sequential mode (기존 로직) ---
      local current_wi counts completed unchecked total wi_num
      current_wi=$(get_current_wi)
      counts=$(count_tasks)
      completed="${counts%% *}"
      unchecked="${counts##* }"
      total=$((completed + unchecked))
      wi_num=$((completed + 1))
      local pct=0
      if [[ $total -gt 0 ]]; then pct=$((completed * 100 / total)); fi
      log "📋 WI #$wi_num/$total: $current_wi"
      log "📊 진행률: $completed/$total ($pct%)"

      check_rate_limit

      local context
      context=$(build_context)

      local result=0
      execute_claude "$context" || result=$?

      validate_post_iteration || {
        log "Post-validation failed - check guardrails.md"
      }
      check_progress || break
      save_state "running"

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
    fi
  done

  # 종료 이유에 따른 상태 저장
  if check_all_done 2>/dev/null; then
    save_state "completed"
  else
    save_state "stopped"
  fi
}

main "$@"
