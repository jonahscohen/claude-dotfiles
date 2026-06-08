#!/bin/bash
# memory-compact.sh
#
# PostToolUse hook. After a Write/Edit/MultiEdit whose target is a beats
# MEMORY.md, run compact-memory.py on it so the index can never teeter over the
# harness load budget (~24.4KB). No-op for any other file. Idempotent: the
# compactor only rewrites when something actually changed, so this does not
# fight an in-progress edit. Also runnable at SessionStart (no file_path -> it
# falls back to the current project's .claude/memory/MEMORY.md).

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPACTOR="$HOOK_DIR/compact-memory.py"
[[ -f "$COMPACTOR" ]] || exit 0

INPUT="$(cat 2>/dev/null)"

# Pull the edited file path from the PostToolUse payload (empty at SessionStart).
FILE="$(printf '%s' "$INPUT" | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: print(''); sys.exit(0)
ti=d.get('tool_input') or {}
print(ti.get('file_path') or ti.get('path') or '')
" 2>/dev/null)"

targets=()
if [[ -n "$FILE" ]]; then
  case "$FILE" in
    */.claude/memory/MEMORY.md|*/memory/MEMORY.md|*/MEMORY.md) targets+=("$FILE") ;;
    *) exit 0 ;;  # not a memory index write - nothing to do
  esac
else
  # SessionStart fallback: compact the current project's index if present.
  for cand in "$PWD/.claude/memory/MEMORY.md"; do
    [[ -f "$cand" ]] && targets+=("$cand")
  done
fi

for t in "${targets[@]}"; do
  python3 "$COMPACTOR" "$t" >/dev/null 2>&1 || true
done

exit 0
