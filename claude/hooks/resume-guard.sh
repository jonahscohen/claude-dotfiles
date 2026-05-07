#!/usr/bin/env bash
# Blocks cmux/nyx auto-resume by deleting agent-session files at session end.
# Active when ~/.claude/.no-auto-resume exists.
# Toggle via: ~/.claude/toggle-resume.sh

FLAG="$HOME/.claude/.no-auto-resume"
SESSION_DIR="$HOME/.nyx/agent-sessions"

if [[ -f "$FLAG" ]] && [[ -d "$SESSION_DIR" ]]; then
    rm -f "$SESSION_DIR"/*.json 2>/dev/null
fi
