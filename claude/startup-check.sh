#!/bin/bash
# Claude Code startup hook: injects environment context, session history, and user prefs
#
# Stable reference docs live in project-root CLAUDE.md (no size limit, always loaded).
# This hook handles what CLAUDE.md can't:
#   1. Environment detection (how to preview, what tools are available)
#   2. Recent session files (work history)
#   3. Global memory files (user prefs beyond environment)
#   4. MEMORY.md indexes
#
# Fires on SessionStart and PostCompact.

CWD="${SESSION_CWD:-$(pwd)}"
SANITIZED=$(echo "$CWD" | sed 's|/|-|g')
GLOBAL_MEMORY_DIR="$HOME/.claude/memory"
PROJECT_MEMORY_DIR="$HOME/.claude/projects/$SANITIZED/memory"
ROOT_MEMORY_DIR="$CWD/.claude/memory"
PROJECT_NAME=$(basename "$CWD")

MAX_CHARS=9200

if ! command -v python3 &>/dev/null; then
  printf '{"systemMessage":"%s ready | ERROR: python3 not found","additionalContext":"ERROR: python3 required for startup-check.sh. Memory injection failed."}' "$PROJECT_NAME"
  exit 0
fi

# ============================================================
# ENVIRONMENT DETECTION
# ============================================================
detect_environment() {
  # Check in order of specificity
  if [ -n "$CMUX_SOCKET" ]; then
    echo "cmux"
  elif [ -n "$CURSOR_TRACE_ID" ] || [ -n "$CURSOR_CHANNEL" ] || [[ "$TERM_PROGRAM" == *"cursor"* ]]; then
    echo "cursor"
  elif [ -n "$VSCODE_PID" ] || [ -n "$VSCODE_IPC_HOOK" ] || [ "$TERM_PROGRAM" = "vscode" ]; then
    echo "vscode"
  elif [ "$CLAUDE_CODE_ENTRYPOINT" = "desktop" ]; then
    echo "desktop"
  else
    echo "cli"
  fi
}

ENV=$(detect_environment)

# Generate environment-specific preview instructions
preview_instructions() {
  case "$1" in
    cmux)
      cat << 'PREVIEW'
=== ENVIRONMENT: cmux ===
Browser preview: use the cmux built-in browser. This is your PRIMARY preview method.

Commands:
  cmux browser open <url>       Open browser split in workspace
  cmux browser navigate <url>   Navigate existing browser
  cmux browser snapshot         DOM snapshot of current page
  cmux browser screenshot       Take a screenshot
  cmux browser click <selector> Click an element
  cmux browser eval <script>    Run JS in browser

Workflow: start dev server -> curl health check -> cmux browser open <url> -> screenshot to verify
Limitations: cannot render SVG <pattern> elements or 3D CSS transforms on SVG children. If something looks wrong, verify with curl before assuming the code is broken.
Fallback: curl for quick checks, Chrome MCP only if cmux browser hits rendering limits.
PREVIEW
      ;;
    cursor)
      cat << 'PREVIEW'
=== ENVIRONMENT: Cursor ===
Browser preview: use Cursor's built-in Simple Browser for UI verification.

Workflow: start dev server -> open Simple Browser panel -> navigate to localhost URL -> verify visually
Alternative: Chrome MCP if installed, or curl for quick response checks.
PREVIEW
      ;;
    vscode)
      cat << 'PREVIEW'
=== ENVIRONMENT: VS Code ===
Browser preview: use VS Code's Simple Browser or Live Preview extension for UI verification.

Workflow: start dev server -> open Simple Browser (command palette: "Simple Browser: Show") -> navigate to localhost URL -> verify visually
Alternative: Chrome MCP if installed, or curl for quick response checks.
PREVIEW
      ;;
    desktop)
      cat << 'PREVIEW'
=== ENVIRONMENT: Claude Desktop ===
Browser preview: use the built-in embedded browser preview.

If a .claude/launch.json exists, dev servers start automatically with auto-verification.
Alternative: Chrome MCP if installed, or curl for quick response checks.
PREVIEW
      ;;
    cli)
      cat << 'PREVIEW'
=== ENVIRONMENT: CLI (terminal) ===
Browser preview: use curl for response verification. For visual verification, use Chrome MCP if available (claude --chrome).

Workflow: start dev server -> curl localhost to verify responses -> Chrome MCP for visual checks if needed.
PREVIEW
      ;;
  esac
}

# ============================================================
# STATUS LINE
# ============================================================
count_md() {
  local dir="$1"
  [ -d "$dir" ] && find "$dir" -maxdepth 1 -type f -name '*.md' ! -name 'MEMORY.md' ! -name 'README.md' 2>/dev/null | wc -l | tr -d ' ' || echo "0"
}

count_sessions() {
  local total=0
  for dir in "$ROOT_MEMORY_DIR" "$PROJECT_MEMORY_DIR" "$GLOBAL_MEMORY_DIR"; do
    [ -d "$dir" ] || continue
    n=$(find "$dir" -maxdepth 1 -name 'session_*.md' -type f 2>/dev/null | wc -l | tr -d ' ')
    total=$((total + n))
  done
  echo "$total"
}

SESSION_COUNT=$(count_sessions)
DISPLAY="$PROJECT_NAME ready | env:${ENV} | sessions:${SESSION_COUNT}"

# ============================================================
# BUILD CONTEXT
# ============================================================
CTX=""
append() {
  local new="$1"
  local combined="${CTX}${new}"
  if [ ${#combined} -lt $MAX_CHARS ]; then
    CTX="$combined"
    return 0
  fi
  return 1
}

# --- 1. Environment-specific preview instructions ---
PREVIEW_TEXT=$(preview_instructions "$ENV")
append "$PREVIEW_TEXT

"

# Loader order matches CLAUDE.md's Memory Discipline contract:
#   1. Project root memory (MEMORY.md index + session files) - canonical for THIS project
#   2. Global project memory (~/.claude/projects/<sanitized>/memory/, auto-tracked state)
#   3. Global cross-project memory (~/.claude/memory/, e.g. attribution policy, feedback)
# Within each tier, the MEMORY.md index loads first so it's never truncated out
# by the MAX_CHARS budget when newer session files are large.

emit_dir() {
  # Emit a single memory dir: MEMORY.md index, then up to N newest session files.
  local dir="$1" label="$2" max_sessions="$3"
  [ -d "$dir" ] || return 0

  if [ -f "$dir/MEMORY.md" ]; then
    local idx
    idx=$(cat "$dir/MEMORY.md" 2>/dev/null)
    append "=== ${label} MEMORY INDEX ($dir/) ===
$idx

" || return 0
  fi

  local sessions
  sessions=$(find "$dir" -maxdepth 1 -name 'session_*.md' -type f 2>/dev/null | sort -r | head -n "$max_sessions")
  [ -n "$sessions" ] || return 0

  while IFS= read -r f; do
    [ -f "$f" ] || continue
    local fname content
    fname=$(basename "$f")
    content=$(cat "$f" 2>/dev/null)
    append "--- ${label} SESSION: $fname ---
$content

" || return 0
  done <<< "$sessions"
}

# --- 2. Project root memory (highest priority per CLAUDE.md) ---
emit_dir "$ROOT_MEMORY_DIR" "PROJECT ROOT" 12

# --- 3. Global project memory (auto-tracked per-project state) ---
emit_dir "$PROJECT_MEMORY_DIR" "PROJECT" 6

# --- 4. Global cross-project memory: emit non-session files (feedback,
#       reference, etc.) for full content first, then index + newest sessions ---
if [ -d "$GLOBAL_MEMORY_DIR" ]; then
  for f in "$GLOBAL_MEMORY_DIR"/*.md; do
    [ -f "$f" ] || continue
    fname=$(basename "$f")
    [ "$fname" = "MEMORY.md" ] || [ "$fname" = "README.md" ] && continue
    case "$fname" in
      session_*) continue ;;  # sessions handled by emit_dir below
      *cmux*|*browser*|*preview*) continue ;;
    esac
    content=$(cat "$f" 2>/dev/null)
    append "--- GLOBAL: $fname ---
$content

" || true
  done
fi
emit_dir "$GLOBAL_MEMORY_DIR" "GLOBAL" 4

# --- Header ---
HEADER="SESSION CONTEXT (project reference docs are in CLAUDE.md - already loaded):
"
CTX="${HEADER}${CTX}"

# JSON encode
OUTPUT=$(python3 -c '
import sys, json
ctx = sys.stdin.read()
display = sys.argv[1]
print(json.dumps({"systemMessage": display, "additionalContext": ctx}))
' "$DISPLAY" <<< "$CTX")

printf '%s' "$OUTPUT"
exit 0
