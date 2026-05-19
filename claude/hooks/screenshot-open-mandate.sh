#!/bin/bash
# PostToolUse hook for Bash and chrome MCP computer screenshot.
# When a screenshot is captured to disk, REQUIRE the agent to Read the file
# before further validation progress. The screenshot itself doesn't reach the
# user's conversation surface unless it's loaded via Read - so describing a
# screenshot that was only captured (not opened) is hollow.
#
# Strategy:
#   1. Detect screenshot capture commands and extract the output path.
#   2. Write the path to a "pending screenshot" state file.
#   3. Inject a system reminder telling the agent to Read the path.
#   4. The companion hook screenshot-open-clear.sh fires on Read; if the path
#      matches a pending screenshot, the state is cleared.
#   5. A pre-completion gate (in bash-guard) blocks claims of validation if
#      there's an unread screenshot pending.

PENDING_FILE="$HOME/.claude/.screenshot-pending"

INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get("tool_name", ""))
except:
    print("")
' 2>/dev/null)

PATH_TO_READ=""

case "$TOOL_NAME" in
  Bash)
    # cmux screenshot writes to the path after --out
    CMD=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("command", ""))
except:
    print("")
' 2>/dev/null)
    if echo "$CMD" | grep -qE 'cmux\b[^|;&]*\bscreenshot\b'; then
      # Extract --out PATH (or --out=PATH)
      PATH_TO_READ=$(echo "$CMD" | python3 -c '
import re, sys
m = re.search(r"--out[= ]+([^\s;|&]+)", sys.stdin.read())
print(m.group(1) if m else "")
' 2>/dev/null)
    fi
    ;;
  mcp__claude-in-chrome__computer)
    # chrome MCP computer screenshot action with save_to_disk
    ACTION=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    inp = d.get("tool_input", {})
    print(inp.get("action", ""))
except:
    print("")
' 2>/dev/null)
    SAVE_TO_DISK=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    inp = d.get("tool_input", {})
    print("1" if inp.get("save_to_disk") else "0")
except:
    print("0")
' 2>/dev/null)
    if [ "$ACTION" = "screenshot" ] || [ "$ACTION" = "zoom" ]; then
      if [ "$SAVE_TO_DISK" != "1" ]; then
        # Block: chrome MCP screenshot without save_to_disk leaves the user
        # without a Readable artifact. Force save_to_disk.
        MSG="REMINDER: chrome MCP screenshot called without save_to_disk:true. The user cannot see the image as a Readable artifact. Re-take with save_to_disk: true so the path is returned, then Read that path before claiming validation."
        python3 -c "import json, sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PostToolUse','additionalContext':sys.argv[1]}}))" "$MSG"
        exit 0
      fi
      # save_to_disk: true was used. Parse the tool result to extract the path.
      # Tool result structure varies; check tool_response.content for a path string.
      PATH_TO_READ=$(printf '%s' "$INPUT" | python3 -c '
import json, sys, re
try:
    d = json.load(sys.stdin)
    resp = d.get("tool_response", d.get("tool_result", {}))
    if isinstance(resp, dict):
        # Look in any string field
        for v in resp.values():
            if isinstance(v, str):
                m = re.search(r"(/(?:tmp|var)/[\w./_-]+\.(?:png|jpg|jpeg|webp))", v)
                if m:
                    print(m.group(1)); break
            elif isinstance(v, list):
                for it in v:
                    s = it if isinstance(it, str) else json.dumps(it)
                    m = re.search(r"(/(?:tmp|var)/[\w./_-]+\.(?:png|jpg|jpeg|webp))", s)
                    if m:
                        print(m.group(1)); break
    elif isinstance(resp, str):
        m = re.search(r"(/(?:tmp|var)/[\w./_-]+\.(?:png|jpg|jpeg|webp))", resp)
        if m:
            print(m.group(1))
except Exception:
    pass
' 2>/dev/null)
    fi
    ;;
esac

if [ -n "$PATH_TO_READ" ]; then
  printf '%s\n' "$PATH_TO_READ" > "$PENDING_FILE"
  MSG="MANDATORY: a screenshot was just saved to $PATH_TO_READ. You MUST Read that path before composing your next text response, taking another screenshot, or claiming any validation result. Looking at the image is the validation - capturing it without opening it proves nothing."
  python3 -c "import json, sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PostToolUse','additionalContext':sys.argv[1]}}))" "$MSG"
else
  echo '{}'
fi
