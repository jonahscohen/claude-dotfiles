#!/usr/bin/env bash
# Toggle cmux auto-resume on or off.
# Usage: ~/.claude/toggle-resume.sh [on|off]
#   on   = allow cmux to auto-resume sessions (removes flag)
#   off  = block cmux auto-resume (creates flag)
#   (no arg) = toggle current state

FLAG="$HOME/.claude/.no-auto-resume"

case "${1:-}" in
    on)  rm -f "$FLAG"; echo "Auto-resume: ON" ;;
    off) touch "$FLAG";  echo "Auto-resume: OFF" ;;
    *)
        if [[ -f "$FLAG" ]]; then
            rm -f "$FLAG"
            echo "Auto-resume: ON"
        else
            touch "$FLAG"
            echo "Auto-resume: OFF"
        fi
        ;;
esac
