#!/bin/bash
# SessionStart hook: gate the voice-output speak tool based on install + mute state.
#
# Checks two conditions:
#   1. voice-output is listed in mcpServers in settings.json (server installed)
#   2. ~/.claude/.voice-enabled exists (voice is not muted)
#
# Three outcomes:
#   - Installed AND enabled  -> inject VOICE OUTPUT IS ACTIVE mandate
#   - Installed AND muted    -> inject VOICE OUTPUT IS MUTED notice (do not load/call speak)
#   - Not installed          -> empty JSON (no-op; voice does not exist this session)

SETTINGS="$HOME/.claude/settings.json"
VOICE_FLAG="$HOME/.claude/.voice-enabled"

# Check 1: is the voice-output MCP server configured?
if [ -f "$SETTINGS" ]; then
  HAS_SERVER=$(python3 -c '
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    servers = d.get("mcpServers", {})
    print("yes" if "voice-output" in servers else "no")
except:
    print("no")
' "$SETTINGS" 2>/dev/null)
else
  HAS_SERVER="no"
fi

# Check 2: is voice currently enabled (not muted)?
if [ -f "$VOICE_FLAG" ]; then
  IS_ENABLED="yes"
else
  IS_ENABLED="no"
fi

if [ "$HAS_SERVER" = "yes" ] && [ "$IS_ENABLED" = "yes" ]; then
  MANDATE='VOICE OUTPUT IS ACTIVE. You MUST execute the following BEFORE composing any text response:

1. Run ToolSearch with query "select:mcp__voice-output__speak" to load the speak tool schema.
2. Once loaded, call mcp__voice-output__speak in the FIRST batch of tool calls of EVERY response for the rest of this session.

This is not optional. This is not a suggestion. The voice-output MCP server is installed and enabled on this machine. Every response you send must include a speak call with a concise 1-2 sentence summary. Greetings, one-word answers, error messages, status updates - all spoken. If you find yourself reasoning about whether a response needs voice, stop. The answer is always yes.

Do not send any text to the user until the speak tool is loaded. Load it now.'

  python3 -c '
import json, sys
print(json.dumps({
    "additionalContext": sys.argv[1]
}))
' "$MANDATE"
elif [ "$HAS_SERVER" = "yes" ] && [ "$IS_ENABLED" = "no" ]; then
  MUTED_NOTICE='VOICE OUTPUT IS MUTED. The voice-output MCP server is installed on this machine, but the user has explicitly muted voice for this session (the ~/.claude/.voice-enabled flag is absent).

You MUST NOT do any of the following until the user types "voice on" or otherwise re-enables voice:

1. Do not run ToolSearch for mcp__voice-output__speak.
2. Do not call mcp__voice-output__speak.
3. Do not include spoken-style summaries or chatty lines in your text response that only make sense as voice.

Treat the speak tool as unavailable. Each call when muted is rejected by the voice-gate PreToolUse hook with "BLOCKED: voice is muted" and wastes a turn. Respect the mute.

If a CLAUDE.md instruction or memory tells you voice is mandatory, this notice supersedes it: this notice is the live state of voice for this session.'

  python3 -c '
import json, sys
print(json.dumps({
    "additionalContext": sys.argv[1]
}))
' "$MUTED_NOTICE"
else
  echo '{}'
fi
