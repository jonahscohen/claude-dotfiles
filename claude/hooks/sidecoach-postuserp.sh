#!/usr/bin/env bash
# Sidecoach PostUserPromptSubmit hook - sends utterance to daemon

STATE_FILE="$HOME/.claude/.sidecoach-state"

if [[ ! -f "$STATE_FILE" ]]; then exit 0; fi
source "$STATE_FILE"
if [[ "$ACTIVE" != "1" ]]; then exit 0; fi

UTTERANCE=$(cat)
if [[ -z "$UTTERANCE" ]]; then exit 0; fi

PAYLOAD=$(node -e "process.stdout.write(JSON.stringify({utterance: process.argv[1], userId: process.env.USER || 'unknown', projectPath: process.cwd()}))" "$UTTERANCE" 2>/dev/null)
echo "$PAYLOAD" > "$PIPE_PATH" &

exit 0
