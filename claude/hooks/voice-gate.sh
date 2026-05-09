#!/bin/bash
# PreToolUse hook for mcp__voice-output__speak.
# Blocks speak calls when voice is muted (no ~/.claude/.voice-enabled file).

VOICE_FLAG="$HOME/.claude/.voice-enabled"

if [ ! -f "$VOICE_FLAG" ]; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: voice is muted. Do not call speak or load voice tools when muted. Type voice on to enable."}}'
else
  echo '{}'
fi
