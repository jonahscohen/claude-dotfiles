#!/bin/bash
# Hook: UserPromptSubmit injector for multiple-choice violations.
# Reads ~/.claude/.multiple-choice-violation if present (written by the Stop-event
# detector when the previous assistant turn used plain-text options without
# AskUserQuestion). Emits a hookSpecificOutput.additionalContext block with the
# violation details so the next assistant turn sees a loud reminder before
# generating any text.
#
# Why this is wired here: Claude Code's hook taxonomy has no PreResponse event,
# so blocking the bad response is impossible. The recovery loop is:
#   1. Bad response shown to user (one-time cost per session)
#   2. Stop hook detects violation, writes flag
#   3. User submits next prompt
#   4. THIS hook reads the flag, injects loud reminder into context, clears flag
#   5. Next assistant turn sees the reminder and uses AskUserQuestion

VIOLATION_FLAG="$HOME/.claude/.multiple-choice-violation"

# No flag - pass through silently.
[[ ! -f "$VIOLATION_FLAG" ]] && exit 0

# Read the flag contents.
REASON=$(grep '^reason=' "$VIOLATION_FLAG" 2>/dev/null | head -1 | cut -d= -f2-)
TIMESTAMP=$(grep '^timestamp=' "$VIOLATION_FLAG" 2>/dev/null | head -1 | cut -d= -f2-)
MATCHED=$(awk '/^matched_lines<<MATCHEOF$/{flag=1; next} /^MATCHEOF$/{flag=0} flag' "$VIOLATION_FLAG" 2>/dev/null | head -10)

# Compose the injection. Loud, specific, with the actual matched lines so the
# assistant cannot rationalize "I didn't really do that."
ADDITIONAL_CONTEXT=$(cat <<EOF
MULTIPLE-CHOICE VIOLATION DETECTED IN PREVIOUS RESPONSE ($TIMESTAMP):

You presented options to the user in plain-text form (labeled paragraphs, bold-prefixed approaches, numbered alternatives, or similar) WITHOUT invoking the AskUserQuestion tool. This is a hard violation of the global mandate documented in CLAUDE.md and MEMORY.md.

Detected signal: $REASON

Matched lines (the actual text from your last response):
$MATCHED

REQUIRED ACTION on this turn:
1. Acknowledge the violation explicitly (one sentence).
2. Re-issue the choice using the AskUserQuestion tool with concrete options.
3. Mark the recommended option with "(Recommended)".
4. Do NOT continue with the work you were doing until the user picks via the tool.

This violation is the third multiple-choice failure on 2026-05-24. See:
- .claude/memory/feedback_multiple_choice_2026-05-24_third_failure_root_cause.md
- .claude/memory/feedback_multiple_choice_2026-05-24_double_failure.md
- .claude/memory/feedback_options_use_multiple_choice.md

If you genuinely believe the detection is a false positive (e.g. the bold-labeled
paragraphs were illustrating a concept, not asking the user to pick one), say so
plainly and explain why - but the default assumption is that the detection is
correct, because the historical failure rate is high.
EOF
)

# Emit the JSON hook response. Claude Code reads stdout from UserPromptSubmit
# hooks; the additionalContext field gets injected into the next turn.
python3 <<PYEOF
import json
payload = {
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": """$ADDITIONAL_CONTEXT"""
    }
}
print(json.dumps(payload))
PYEOF

# Clear the flag so it does not re-fire on subsequent prompts.
rm -f "$VIOLATION_FLAG"

exit 0
