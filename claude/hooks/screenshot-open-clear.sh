#!/bin/bash
# PostToolUse hook for Read.
# When the agent Reads a file that matches the pending screenshot path,
# clear the pending flag. This is the only way the screenshot-open-mandate
# gate gets satisfied.

PENDING_FILE="$HOME/.claude/.screenshot-pending"

[ ! -f "$PENDING_FILE" ] && echo '{}' && exit 0

INPUT=$(cat)
READ_PATH=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("file_path", ""))
except:
    print("")
' 2>/dev/null)

PENDING=$(cat "$PENDING_FILE" 2>/dev/null)

if [ -n "$READ_PATH" ] && [ "$READ_PATH" = "$PENDING" ]; then
  rm -f "$PENDING_FILE"
fi

echo '{}'
