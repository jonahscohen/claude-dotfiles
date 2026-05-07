#!/bin/bash
# PostToolUse hook for Write|Edit|MultiEdit. After any code file change,
# nudges the assistant to write session memory before responding to the user.
# Memory-directory writes are excluded (they ARE the compliance).

INPUT=$(cat)
printf '%s' "$INPUT" | python3 -c '
import json, sys

try:
    data = json.load(sys.stdin)
except Exception:
    print("{}"); sys.exit(0)

file_path = data.get("tool_input", {}).get("file_path", "")

if not file_path:
    print("{}"); sys.exit(0)

if ".claude/" in file_path and "/memory/" in file_path:
    print("{}"); sys.exit(0)

if file_path.endswith("MEMORY.md"):
    print("{}"); sys.exit(0)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": "PROJECT FILE CHANGED. You are in dirty state. Write to .claude/memory/ session file BEFORE composing any text response to the user."
    }
}))
'
