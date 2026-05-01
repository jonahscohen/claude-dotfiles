#!/bin/bash
# PreToolUse hook: auto-approve Write/Edit/MultiEdit to memory directories.
# Returns permissionDecision:allow for memory paths so the .claude/ carve-out
# in bypassPermissions mode never gets a chance to prompt.
# Content-guard.sh still runs separately and can deny if content is dirty
# (deny beats allow when both hooks fire).

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get("tool_input", {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null)

if echo "$FILE_PATH" | grep -qE '(^|/)\.claude/(memory|projects/.*/memory)/'; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Auto-approved: memory directory write"}}'
else
    echo '{}'
fi
