#!/bin/bash

# Question Enforcement Hook (hardened 2026-05-24)
# Blocks responses where the FINAL non-code paragraph contains a question
# AND no AskUserQuestion tool was used in the response.
#
# Why "final paragraph only" instead of "any line":
# the original hook was too permissive - it flagged questions anywhere in the
# response, including rhetorical mid-paragraph ones and questions quoting the
# user. The legitimate failure pattern is a TRAILING question that expects an
# answer. By scoping to the last paragraph we catch the real deflection
# pattern without false-positives on rhetorical/quoted questions earlier in
# the response.

LOG_FILE="$HOME/.claude/.question-enforcement-blocks.log"

# Read the response from stdin
response=$(cat)

# Breadcrumb for diagnostics
echo "[question-enforcement] entry: response len=${#response}" >&2

# If response uses AskUserQuestion, allow it unconditionally
has_ask=$(printf '%s' "$response" | grep -c "AskUserQuestion")
if [[ $has_ask -gt 0 ]]; then
  printf '%s' "$response"
  exit 0
fi

# Strip code fences (questions inside code blocks are examples, not actual asks)
non_code=$(printf '%s\n' "$response" | sed '/^```/,/^```/d')

# Get the last 5 non-empty lines (the "final paragraph" region).
# If the response ends with a question to the user, those last few lines
# almost certainly contain it.
last_paragraph=$(printf '%s\n' "$non_code" | grep -v '^[[:space:]]*$' | tail -5)

# Detect a trailing question. Three ways (any triggers a block):
# 1. Last non-empty line ends with `?`
# 2. Last paragraph starts with an interrogative word AND any line in the paragraph ends with `?`
# 3. Specific deflection phrases that hit Failure 2 ("Sound right", "want B/C", "or want", "or should I")
trailing_q_mark=$(printf '%s\n' "$last_paragraph" | tail -1 | grep -cE '\?[[:space:]]*$')
interrogative=$(printf '%s\n' "$last_paragraph" | grep -cE '^[[:space:]]*(What|How|Should|Can|Is|Does|Why|When|Where|Who|Could|Would|Will|Are|Did|Have|Has|Do|Want|Pick|Confirm|Sound|Which|Want me)')
sound_right=$(printf '%s\n' "$last_paragraph" | grep -cE '(Sound right|want (B|C|D)|or want|or should I)')
has_question_mark=$(printf '%s' "$last_paragraph" | grep -c '?')

if [[ $trailing_q_mark -gt 0 ]] || ( [[ $interrogative -gt 0 ]] && [[ $has_question_mark -gt 0 ]] ) || [[ $sound_right -gt 0 ]]; then
  # Log the block
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date '+%Y-%m-%d %H:%M:%S')  BLOCK  trailing_q=$trailing_q_mark interrogative=$interrogative sound_right=$sound_right" >> "$LOG_FILE"

  cat >&2 << EOF

BLOCKED: Trailing question without AskUserQuestion

The last paragraph of your response contains a question, but you did not
use the AskUserQuestion tool. The hook now scopes detection to the final
paragraph only (less false-positive than the prior any-line check).

Last paragraph (last 5 non-empty lines):
$last_paragraph

REQUIRED: Use the AskUserQuestion tool with concrete options. If the
question was rhetorical or summarizing, rephrase as a declarative statement.

If you genuinely need a free-form answer, use AskUserQuestion with an "Other"
option (the tool always presents one automatically) so the user can type a
custom response.
EOF
  exit 1
fi

# If validation passes, output the response
printf '%s' "$response"
exit 0
