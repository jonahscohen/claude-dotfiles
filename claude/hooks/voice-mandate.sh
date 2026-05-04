#!/bin/bash
# SessionStart hook: if voice-output MCP is enabled, inject a mandate to load
# the speak tool immediately and use it on every response.
#
# Checks two conditions:
#   1. voice-output is listed in mcpServers in settings.json (server installed)
#   2. ~/.claude/.voice-enabled exists (voice is not muted)
#
# If both are true, returns additionalContext with the behavioral mandate.
# If either is false, returns empty JSON (no-op).

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
else
  echo '{}'
fi
