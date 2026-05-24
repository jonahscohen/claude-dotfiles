#!/bin/bash
# Hook: Enforce multiple choice rule - block text-form options, require AskUserQuestion
# Runs on: PreResponse (before text is sent to user)
# Blocks: Any response offering 2+ distinct options without using AskUserQuestion tool
#
# Hardened 2026-05-24 after two failures showed the patterns were too narrow:
#  Failure 1 (numbered list): hook SHOULD have caught but anchoring was off
#  Failure 2 (bold-prefixed "Approach A" with long-dash): hook didn't match - vocabulary too narrow
#
# Hardening layers:
#  L1: broadened label vocabulary (Option/Approach/Path/Plan/Choice/Alternative/Strategy/Way/Route/Step)
#      plus colon/hyphen/period separators (long-dash handled via L2 structural heuristic)
#  L2: structural heuristic - 2+ paragraphs starting with **CapitalizedWord <Letter|Digit>
#      catches the "**Approach A long-dash" pattern regardless of which noun is used
#  L4: logging on every BLOCK to ~/.claude/.multiple-choice-blocks.log
#  L5: stderr breadcrumb on hook entry so silent-no-RESPONSE_TEXT failures surface

LOG_FILE="$HOME/.claude/.multiple-choice-blocks.log"

# L5 breadcrumb
echo "[multiple-choice-enforce] entry: RESPONSE_TEXT len=${#RESPONSE_TEXT}, TOOL_LOG=${TOOL_LOG:-unset}" >&2

# L1: Patterns that indicate deflection (offering labeled options in text form).
# Broadened from the original to cover synonyms for "option" and multiple separator chars.
OPTION_PATTERNS=(
  "^[[:space:]]*\*?\*?(Option|Approach|Path|Plan|Choice|Alternative|Strategy|Way|Route|Step)[[:space:]]+([A-Z]|[0-9]+)[[:space:]]*[:.-]"
  "^[[:space:]]*[0-9]+\.[[:space:]]+"
  "You can:"
  "You (could|should|might|may):"
  "Would you prefer"
  "What's your (choice|preference)"
)

# L2: Structural heuristic - count repeated bold-label paragraphs (regardless of word after **).
# Pattern: lines starting with **<CapitalizedWord>\s+<UpperLetterOrDigit>
# Catches **Approach A, **Plan 1, **Path B, **Choice C - the repeated bold-label pattern IS the signal.
BOLD_LABEL_PATTERN='^[[:space:]]*\*\*[A-Z][A-Za-z]+[[:space:]]+[A-Z0-9]'

check_for_deflection() {
  local text="$1"
  local option_count=0
  local bold_label_count=0

  while IFS= read -r line; do
    # L2: count bold-label paragraphs
    if [[ "$line" =~ $BOLD_LABEL_PATTERN ]]; then
      ((bold_label_count++))
    fi
    # L1: check option vocabulary
    for pattern in "${OPTION_PATTERNS[@]}"; do
      if [[ "$line" =~ $pattern ]]; then
        ((option_count++))
        break
      fi
    done
  done <<< "$text"

  # Block if EITHER signal fires (2+ instances)
  if [[ $option_count -ge 2 ]] || [[ $bold_label_count -ge 2 ]]; then
    DETECTED_REASON="opt=$option_count bold=$bold_label_count"
    return 0  # BLOCK
  fi

  return 1  # ALLOW
}

# Check if AskUserQuestion was already used in this response
response_has_askuserquestion() {
  local response_log="$1"
  [[ -n "$response_log" ]] || return 1
  grep -q "AskUserQuestion" "$response_log" 2>/dev/null
  return $?
}

# L4: log every BLOCK
log_block() {
  local reason="$1"
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date '+%Y-%m-%d %H:%M:%S')  BLOCK  $reason" >> "$LOG_FILE"
}

# Main check
if [[ -n "$RESPONSE_TEXT" ]]; then
  if check_for_deflection "$RESPONSE_TEXT"; then
    if ! response_has_askuserquestion "$TOOL_LOG"; then
      log_block "$DETECTED_REASON"
      cat >&2 <<EOF
BLOCKED: Multiple choice deflection detected ($DETECTED_REASON)

You offered 2 or more options in text form without using AskUserQuestion tool.

RULE: When offering choices to the user, you MUST use the AskUserQuestion tool.
  - Mark the recommended option with "(Recommended)"
  - Hook now detects: Option/Approach/Path/Plan/Choice/Alternative/Strategy/Way/Route/Step
  - Hook also detects: 2+ paragraphs starting with **CapitalizedWord (regardless of which word)

Detected lines (first 5):
$(printf '%s' "$RESPONSE_TEXT" | grep -E "^[[:space:]]*\*\*[A-Z][A-Za-z]+[[:space:]]+[A-Z0-9]|^[[:space:]]*(Option|Approach|Path|Plan|Choice|Alternative|Strategy|Way|Route|Step)[[:space:]]+[A-Z0-9]" | head -5)

FIX: Use AskUserQuestion with your options, then compose a text response acknowledging their choice.
EOF
      exit 1
    fi
  fi
fi

exit 0
