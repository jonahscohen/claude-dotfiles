#!/bin/bash
# Hook: Stop-event detector for multiple-choice deflection.
# Reads the last assistant message from the transcript_path supplied in stdin JSON.
# On detection, writes ~/.claude/.multiple-choice-violation with the matched line(s).
# UserPromptSubmit handler `multiple-choice-inject-prompt.sh` reads that flag on the
# next turn and injects a screaming reminder into the response context.
#
# Why Stop instead of PreResponse: Claude Code's hook taxonomy has no PreResponse
# event. Stop is the only event with access to the just-completed assistant text.
# This means detection is post-hoc; the bad response is already shown to the user.
# The injection-on-next-turn loop is the enforcement.

LOG_FILE="$HOME/.claude/.multiple-choice-blocks.log"
VIOLATION_FLAG="$HOME/.claude/.multiple-choice-violation"

# Read stdin JSON (Claude Code passes session_id, transcript_path, cwd, hook_event_name).
STDIN_JSON=$(cat)

# Extract transcript_path with python (no jq dependency).
TRANSCRIPT=$(printf '%s' "$STDIN_JSON" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', ''))
except Exception:
    pass
" 2>/dev/null)

[[ -z "$TRANSCRIPT" ]] && exit 0
[[ ! -f "$TRANSCRIPT" ]] && exit 0

# Extract the LAST assistant message text content from the transcript jsonl.
# Each line is a JSON event; assistant messages have type=assistant and message.content
# which is an array of content blocks. We want the concatenated text from text blocks.
ASSISTANT_TEXT=$(python3 <<PYEOF 2>/dev/null
import json, sys
try:
    with open("$TRANSCRIPT") as f:
        last_text = ""
        for line in f:
            try:
                e = json.loads(line)
            except Exception:
                continue
            if e.get("type") != "assistant":
                continue
            msg = e.get("message", {})
            content = msg.get("content", [])
            if not isinstance(content, list):
                continue
            texts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    texts.append(block.get("text", ""))
            joined = "\n".join(t for t in texts if t)
            if joined.strip():
                last_text = joined
        print(last_text)
except Exception:
    pass
PYEOF
)

# If no assistant text could be extracted, nothing to check.
[[ -z "$ASSISTANT_TEXT" ]] && exit 0

# Detection layers (same patterns as the original morning hardening, applied
# post-hoc against actual assistant text instead of phantom RESPONSE_TEXT).

OPTION_PATTERNS=(
  "^[[:space:]]*\*?\*?(Option|Approach|Path|Plan|Choice|Alternative|Strategy|Way|Route|Step)[[:space:]]+([A-Z]|[0-9]+)[[:space:]]*[:.-]"
  "^[[:space:]]*[0-9]+\.[[:space:]]+"
  "You can:"
  "You (could|should|might|may):"
  "Would you (like|prefer)"
  "Want me to"
  "What's your (choice|preference)"
)

BOLD_LABEL_PATTERN='^[[:space:]]*\*\*[A-Z][A-Za-z]+[[:space:]]+[A-Z0-9]'

option_count=0
bold_label_count=0
matched_lines=""

while IFS= read -r line; do
  matched_this_line=0
  if [[ "$line" =~ $BOLD_LABEL_PATTERN ]]; then
    ((bold_label_count++))
    matched_this_line=1
  fi
  for pattern in "${OPTION_PATTERNS[@]}"; do
    if [[ "$line" =~ $pattern ]]; then
      ((option_count++))
      matched_this_line=1
      break
    fi
  done
  if [[ $matched_this_line -eq 1 ]]; then
    matched_lines="${matched_lines}${line}"$'\n'
  fi
done <<< "$ASSISTANT_TEXT"

# Block threshold: 2+ instances of either signal.
should_block=0
if [[ $option_count -ge 2 ]] || [[ $bold_label_count -ge 2 ]]; then
  should_block=1
fi

# Trailing-question check: does the response END with a question (last 5 non-empty lines)?
# This catches the soft-deflection pattern (presenting options + asking "does this land").
non_code=$(printf '%s\n' "$ASSISTANT_TEXT" | sed '/^```/,/^```/d')
last_paragraph=$(printf '%s\n' "$non_code" | grep -v '^[[:space:]]*$' | tail -5)
trailing_q_mark=$(printf '%s\n' "$last_paragraph" | tail -1 | grep -cE '\?[[:space:]]*$')

# Combined deflection signal: labeled options + trailing question = high-confidence deflection.
trailing_deflection=0
if [[ $trailing_q_mark -gt 0 ]] && ( [[ $option_count -ge 1 ]] || [[ $bold_label_count -ge 2 ]] ); then
  trailing_deflection=1
  should_block=1
fi

# Check if the response USED AskUserQuestion already - if so, allow.
# Scan transcript for AskUserQuestion tool_use in the same assistant turn.
used_ask=$(python3 <<PYEOF 2>/dev/null
import json
try:
    last_used = False
    with open("$TRANSCRIPT") as f:
        for line in f:
            try:
                e = json.loads(line)
            except Exception:
                continue
            if e.get("type") != "assistant":
                continue
            msg = e.get("message", {})
            content = msg.get("content", [])
            if not isinstance(content, list):
                continue
            turn_used = False
            for block in content:
                if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == "AskUserQuestion":
                    turn_used = True
                    break
            if any(isinstance(b, dict) and b.get("type") == "text" and b.get("text","").strip() for b in content):
                last_used = turn_used
    print("yes" if last_used else "no")
except Exception:
    print("no")
PYEOF
)

if [[ "$used_ask" == "yes" ]]; then
  exit 0
fi

if [[ $should_block -eq 1 ]]; then
  mkdir -p "$(dirname "$LOG_FILE")"
  reason="opt=$option_count bold=$bold_label_count trailing_q=$trailing_q_mark trailing_deflection=$trailing_deflection"
  echo "$(date '+%Y-%m-%d %H:%M:%S')  STOP-DETECT  $reason" >> "$LOG_FILE"

  # Write violation flag for next-turn injection.
  {
    echo "reason=$reason"
    echo "timestamp=$(date '+%Y-%m-%d %H:%M:%S')"
    echo "matched_lines<<MATCHEOF"
    printf '%s' "$matched_lines" | head -10
    echo "MATCHEOF"
  } > "$VIOLATION_FLAG"
fi

exit 0
