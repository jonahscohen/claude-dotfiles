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
#
# 2026-05-27 (T-0005): false-fire fix. Three patterns now PASS that previously blocked:
#  (a) Binary "X or Y?" questions (no list, just a yes/no).
#  (b) Numbered fact lists with no trailing question (opt_count >= 3 alone is not enough).
#  (c) Numbered list followed by a binary trailing question ("Want me to queue any?").
# Mechanism: precondition `opt_count >= 3 AND (trailing_q == 1 OR trailing_deflection == 1)`
# guards the option-vocabulary path; bold_label_count >= 2 stays as an independent
# strong-signal override so the original Failure 2 catch is preserved. The trailing_q
# detector now requires a "?" within ~250 chars of the last list item, and the
# question must not match a binary opener / simple "X or Y?" shape.

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

# T-0005 additions: list-item line pattern (for trailing-q window calculation) and
# interrogative-introducer pattern (for implicit-question recognition).
LIST_ITEM_LINE_PATTERN='^[[:space:]]*([0-9]+\.[[:space:]]+|-[[:space:]]+|\*\*[A-Z][A-Za-z]+[[:space:]]+[A-Z0-9])'
INTERROGATIVE_INTRO_PATTERN='^[[:space:]]*(Would you (like|prefer)|You (can|could|should|might|may)|Want me to|Should I|Do you want|What.s your).*:[[:space:]]*$'

# is_binary_question: returns 0 (true) if the question is a yes/no or simple
# "X or Y?" form; returns 1 (false) if it has multi-choice indicators or is
# otherwise multi-option.
is_binary_question() {
  local q="$1"
  q=$(printf '%s' "$q" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//')

  # Multi-choice indicators -> NOT binary.
  if [[ "$q" =~ one[[:space:]]of[[:space:]](the[[:space:]])?(others|alternatives|options|plans|approaches|paths|choices|ones) ]]; then
    return 1
  fi
  if [[ "$q" =~ which[[:space:]](one|approach|plan|path|option|choice|alternative|way|route|step) ]]; then
    return 1
  fi
  if [[ "$q" =~ (prefer|pick|choose|select)[[:space:]](a|one|an|any|the) ]]; then
    return 1
  fi
  if [[ "$q" =~ any[[:space:]]of[[:space:]](these|those|them|the) ]]; then
    return 1
  fi

  local comma_count
  comma_count=$(printf '%s' "$q" | tr -cd ',' | wc -c | tr -d ' ')
  local has_or=0
  [[ "$q" =~ [[:space:]]or[[:space:]] ]] && has_or=1

  # Enumerated alternatives ("A, B, or C?") -> NOT binary.
  if [[ $comma_count -ge 2 ]] && [[ $has_or -eq 1 ]]; then
    return 1
  fi

  # Binary openers: yes/no question shape.
  if [[ "$q" =~ ^(should|shall|want|do|does|did|is|are|can|could|would|will|may|might|have|has|ok|okay|ready|sound|good|alright)[[:space:]] ]]; then
    return 0
  fi

  # Simple "X or Y?" form.
  if [[ $comma_count -eq 0 ]] && [[ $has_or -eq 1 ]]; then
    return 0
  fi

  return 1
}

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

  # Effective opt_count = max(option_count, bold_label_count).
  local opt_count=$option_count
  [[ $bold_label_count -gt $opt_count ]] && opt_count=$bold_label_count

  # Strip fenced code blocks before trailing-question analysis.
  local non_code
  non_code=$(printf '%s\n' "$text" | sed '/^```/,/^```/d')

  # Tightened trailing_q: locate the last list-item line and require a "?"
  # within ~250 chars of that line, AND the question must not be binary.
  # Newlines are PRESERVED in the window so sentence extraction stops at line
  # boundaries; otherwise a bullet's text concatenates with a later question
  # and the binary-opener check sees the wrong starting word.
  local trailing_q=0
  local last_list_line_num
  last_list_line_num=$(printf '%s\n' "$non_code" | grep -nE "$LIST_ITEM_LINE_PATTERN" | tail -1 | cut -d: -f1)
  if [[ -n "$last_list_line_num" ]]; then
    local window window_short last_q
    window=$(printf '%s' "$non_code" | tail -n +"$last_list_line_num")
    window_short="${window:0:250}"
    if [[ "$window_short" == *\?* ]]; then
      last_q=$(python3 -c "
import re, sys
text = sys.argv[1]
matches = re.findall(r'[^.!?\n]*\?', text)
print(matches[-1].strip() if matches else '')
" "$window_short")
      if [[ -n "$last_q" ]] && ! is_binary_question "$last_q"; then
        trailing_q=1
      fi
    fi
  fi

  # Interrogative introducer is treated as a trailing question.
  if [[ $trailing_q -eq 0 ]]; then
    local has_intro
    has_intro=$(printf '%s\n' "$non_code" | grep -cE "$INTERROGATIVE_INTRO_PATTERN")
    [[ $has_intro -gt 0 ]] && trailing_q=1
  fi

  local trailing_deflection=0
  if [[ $trailing_q -eq 1 ]] && [[ $opt_count -ge 1 ]]; then
    trailing_deflection=1
  fi

  # Fire decision:
  #   - bold_label_count >= 2 is always a block (strong structural signal).
  #   - Otherwise, require opt_count >= 3 AND a trailing-question signal.
  if [[ $bold_label_count -ge 2 ]]; then
    DETECTED_REASON="opt=$opt_count bold=$bold_label_count trailing_q=$trailing_q trailing_deflection=$trailing_deflection (bold-heuristic)"
    return 0  # BLOCK
  fi
  if [[ $opt_count -ge 3 ]] && ( [[ $trailing_q -eq 1 ]] || [[ $trailing_deflection -eq 1 ]] ); then
    DETECTED_REASON="opt=$opt_count bold=$bold_label_count trailing_q=$trailing_q trailing_deflection=$trailing_deflection"
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

You offered 3 or more options in text form (with a trailing question)
without using AskUserQuestion tool, or you used 2+ bold-labeled option paragraphs.

RULE: When offering 3+ choices to the user, you MUST use the AskUserQuestion tool.
  - Binary (yes/no, X or Y) questions are allowed in plain text.
  - Mark the recommended option with "(Recommended)" when using the tool.
  - Hook detects: Option/Approach/Path/Plan/Choice/Alternative/Strategy/Way/Route/Step
  - Hook detects: 2+ paragraphs starting with **CapitalizedWord (regardless of which word)

Detected lines (first 5):
$(printf '%s' "$RESPONSE_TEXT" | grep -E "^[[:space:]]*\*\*[A-Z][A-Za-z]+[[:space:]]+[A-Z0-9]|^[[:space:]]*(Option|Approach|Path|Plan|Choice|Alternative|Strategy|Way|Route|Step)[[:space:]]+[A-Z0-9]" | head -5)

FIX: Use AskUserQuestion with your options, then compose a text response acknowledging their choice.
EOF
      exit 1
    fi
  fi
fi

exit 0
