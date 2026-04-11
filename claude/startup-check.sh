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

# --- 2. Global memory files (full content - user prefs, references) ---
# Skip environment-specific files that are now handled by detection above
if [ -d "$GLOBAL_MEMORY_DIR" ]; then
  for f in "$GLOBAL_MEMORY_DIR"/*.md; do
    [ -f "$f" ] || continue
    fname=$(basename "$f")
    [ "$fname" = "MEMORY.md" ] || [ "$fname" = "README.md" ] && continue
    # Skip browser/preview reference files - environment detection handles this now
    case "$fname" in
      *cmux*|*browser*|*preview*) continue ;;
    esac
    content=$(cat "$f" 2>/dev/null)
    append "--- GLOBAL: $fname ---
$content

" || true
  done
fi

# --- 3. Session files (newest first, across all dirs) ---
ALL_SESSIONS=""
for dir in "$ROOT_MEMORY_DIR" "$PROJECT_MEMORY_DIR" "$GLOBAL_MEMORY_DIR"; do
  [ -d "$dir" ] || continue
  sessions=$(find "$dir" -maxdepth 1 -name 'session_*.md' -type f 2>/dev/null)
  if [ -n "$sessions" ]; then
    ALL_SESSIONS="${ALL_SESSIONS}
${sessions}"
  fi
done

if [ -n "$ALL_SESSIONS" ]; then
  sorted=$(echo "$ALL_SESSIONS" | grep -v '^$' | sort -t/ -k"$(echo "$ALL_SESSIONS" | grep -v '^$' | head -1 | tr '/' '\n' | wc -l | tr -d ' ')" -r | head -20)
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    fname=$(basename "$f")
    content=$(cat "$f" 2>/dev/null)
    append "--- SESSION: $fname ---
$content

" || break
  done <<< "$sorted"
fi

# --- 4. MEMORY.md indexes ---
for dir_label in "$ROOT_MEMORY_DIR:PROJECT ROOT" "$PROJECT_MEMORY_DIR:PROJECT" "$GLOBAL_MEMORY_DIR:GLOBAL"; do
  dir="${dir_label%%:*}"
  label="${dir_label##*:}"
  if [ -f "$dir/MEMORY.md" ]; then
    content=$(cat "$dir/MEMORY.md" 2>/dev/null)
    append "=== ${label} MEMORY INDEX ($dir/) ===
$content

"
  fi
done

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
