#!/usr/bin/env bash
# UserPromptSubmit hook: detects "resume on" / "resume off" / "resume toggle"
# in the user's message and flips the flag file.

FLAG="$HOME/.claude/.no-auto-resume"

prompt="$(cat)"
msg="$(echo "$prompt" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt','').strip().lower())" 2>/dev/null)"

output() {
    printf '%s\n' "{\"systemMessage\":\"$1\",\"hookSpecificOutput\":{\"hookEventName\":\"UserPromptSubmit\",\"additionalContext\":\"$1\"}}"
}

case "$msg" in
    "resume on")
        rm -f "$FLAG"
        output "Auto-resume is now ON. cmux will resume Claude sessions on tile reopen."
        ;;
    "resume off")
        touch "$FLAG"
        output "Auto-resume is now OFF. cmux will start fresh Claude sessions."
        ;;
    "resume toggle")
        if [[ -f "$FLAG" ]]; then
            rm -f "$FLAG"
            output "Auto-resume toggled ON. cmux will resume Claude sessions on tile reopen."
        else
            touch "$FLAG"
            output "Auto-resume toggled OFF. cmux will start fresh Claude sessions."
        fi
        ;;
    "resume status")
        if [[ -f "$FLAG" ]]; then
            output "Auto-resume is currently OFF (blocked)."
        else
            output "Auto-resume is currently ON (allowed)."
        fi
        ;;
esac
