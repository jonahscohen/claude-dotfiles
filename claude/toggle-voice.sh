#!/usr/bin/env bash
# Toggle voice output on or off.
# Usage: ~/.claude/toggle-voice.sh [on|off]
#   on   = enable voice output (creates flag)
#   off  = mute voice output (removes flag)
#   (no arg) = toggle current state

FLAG="$HOME/.claude/.voice-enabled"

case "${1:-}" in
    on)  touch "$FLAG"; echo "Voice output: ON" ;;
    off) rm -f "$FLAG";  echo "Voice output: OFF" ;;
    *)
        if [[ -f "$FLAG" ]]; then
            rm -f "$FLAG"
            echo "Voice output: OFF"
        else
            touch "$FLAG"
            echo "Voice output: ON"
        fi
        ;;
esac
