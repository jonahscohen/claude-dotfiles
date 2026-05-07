#!/usr/bin/env bash
# UserPromptSubmit hook: detects "voice on" / "voice off" / "voice toggle" / "voice status"
# in the user's message and flips the ~/.claude/.voice-enabled flag file.

FLAG="$HOME/.claude/.voice-enabled"

prompt="$(cat)"
msg="$(echo "$prompt" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt','').strip().lower())" 2>/dev/null)"

output() {
    printf '%s\n' "{\"systemMessage\":\"$1\",\"hookSpecificOutput\":{\"hookEventName\":\"UserPromptSubmit\",\"additionalContext\":\"$1\"}}"
}

case "$msg" in
    "voice on")
        touch "$FLAG"
        output "Voice output is now ON. All responses will be spoken."
        ;;
    "voice off")
        rm -f "$FLAG"
        output "Voice output is now OFF. Responses will be text-only."
        ;;
    "voice toggle")
        if [[ -f "$FLAG" ]]; then
            rm -f "$FLAG"
            output "Voice output toggled OFF. Responses will be text-only."
        else
            touch "$FLAG"
            output "Voice output toggled ON. All responses will be spoken."
        fi
        ;;
    "voice status")
        if [[ -f "$FLAG" ]]; then
            output "Voice output is currently ON."
        else
            output "Voice output is currently OFF (muted)."
        fi
        ;;
esac
