#!/bin/bash
# Regression tests for multiple-choice-enforce.sh + question-enforcement.sh
# Run: bash ~/.claude/hooks/test-multiple-choice-enforce.sh
#
# Tests both hooks against synthetic responses that match today's failure
# patterns. Exits non-zero if any test fails.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
MC_HOOK="$HOOK_DIR/multiple-choice-enforce.sh"
QE_HOOK="$HOOK_DIR/question-enforcement.sh"

PASS=0
FAIL=0
FAIL_LABELS=()

# ---------- multiple-choice-enforce.sh helpers ----------

# Run multiple-choice hook with given RESPONSE_TEXT and NO AskUserQuestion in tool log
run_mc_hook_no_aq() {
  local response="$1"
  local fake_log
  fake_log=$(mktemp)
  RESPONSE_TEXT="$response" TOOL_LOG="$fake_log" bash "$MC_HOOK" 2>/dev/null
  local exit_code=$?
  rm -f "$fake_log"
  return $exit_code
}

# Run multiple-choice hook WITH AskUserQuestion in tool log (should always allow)
run_mc_hook_with_aq() {
  local response="$1"
  local fake_log
  fake_log=$(mktemp)
  echo "AskUserQuestion" > "$fake_log"
  RESPONSE_TEXT="$response" TOOL_LOG="$fake_log" bash "$MC_HOOK" 2>/dev/null
  local exit_code=$?
  rm -f "$fake_log"
  return $exit_code
}

mc_assert_blocks() {
  local label="$1"
  local response="$2"
  if run_mc_hook_no_aq "$response"; then
    echo "FAIL [mc]: $label  (expected BLOCK, got ALLOW)"
    FAIL_LABELS+=("[mc] $label")
    ((FAIL++))
  else
    echo "PASS [mc]: $label"
    ((PASS++))
  fi
}

mc_assert_allows() {
  local label="$1"
  local response="$2"
  if run_mc_hook_no_aq "$response"; then
    echo "PASS [mc]: $label"
    ((PASS++))
  else
    echo "FAIL [mc]: $label  (expected ALLOW, got BLOCK)"
    FAIL_LABELS+=("[mc] $label")
    ((FAIL++))
  fi
}

mc_assert_allows_with_aq() {
  local label="$1"
  local response="$2"
  if run_mc_hook_with_aq "$response"; then
    echo "PASS [mc]: $label"
    ((PASS++))
  else
    echo "FAIL [mc]: $label  (expected ALLOW with AskUserQuestion, got BLOCK)"
    FAIL_LABELS+=("[mc] $label")
    ((FAIL++))
  fi
}

# ---------- question-enforcement.sh helpers ----------

run_qe_hook() {
  local response="$1"
  printf '%s' "$response" | bash "$QE_HOOK" >/dev/null 2>/dev/null
  return $?
}

qe_assert_blocks() {
  local label="$1"
  local response="$2"
  if run_qe_hook "$response"; then
    echo "FAIL [qe]: $label  (expected BLOCK, got ALLOW)"
    FAIL_LABELS+=("[qe] $label")
    ((FAIL++))
  else
    echo "PASS [qe]: $label"
    ((PASS++))
  fi
}

qe_assert_allows() {
  local label="$1"
  local response="$2"
  if run_qe_hook "$response"; then
    echo "PASS [qe]: $label"
    ((PASS++))
  else
    echo "FAIL [qe]: $label  (expected ALLOW, got BLOCK)"
    FAIL_LABELS+=("[qe] $label")
    ((FAIL++))
  fi
}

# =============================================================================
# multiple-choice-enforce.sh tests
# =============================================================================

# T1: Today's Failure 2 - bold "Approach" labels with hyphen separator
FAIL2_HYPHEN="**Approach A - First option description.**
Some context here.

**Approach B - Second option description.**
Another paragraph of context.

**Approach C - Third option description.**
Final paragraph."
mc_assert_blocks "Failure 2 - **Approach A/B/C with hyphen separator" "$FAIL2_HYPHEN"

# T2: Today's Failure 2 variant - long-dash (em-dash) separator
# Generate the em-dash byte sequence at runtime so this source file does not
# contain the forbidden glyph itself.
EMDASH=$'\xe2\x80\x94'
FAIL2_EMDASH="**Approach A ${EMDASH} First option.**

**Approach B ${EMDASH} Second option.**

**Approach C ${EMDASH} Third option."
mc_assert_blocks "Failure 2 - **Approach A/B/C with em-dash separator (structural heuristic)" "$FAIL2_EMDASH"

# T3: Today's Failure 1 - numbered options
FAIL1="Would you like me to:
1. Commit the extended-domain-validator bugfix + handler cleanups
2. Stage the Sprint 1 memory files into a backfill commit
3. Leave it alone for now"
mc_assert_blocks "Failure 1 - numbered options" "$FAIL1"

# T4: Original "Option A:" pattern still caught
ORIGINAL="**Option A:** First choice
**Option B:** Second choice"
mc_assert_blocks "Original - **Option A:/B:" "$ORIGINAL"

# T5: Other label vocabulary - "Path"
PATH_LABELS="**Path A:** Take the left fork.
**Path B:** Take the right fork."
mc_assert_blocks "Variant - **Path A:/B:" "$PATH_LABELS"

# T6: Other label vocabulary - "Plan"
PLAN_LABELS="**Plan 1 - move fast.**
**Plan 2 - move carefully.**"
mc_assert_blocks "Variant - **Plan 1/2 with hyphen" "$PLAN_LABELS"

# T7: Other label vocabulary - "Choice"
CHOICE_LABELS="**Choice A - go left.**
**Choice B - go right.**"
mc_assert_blocks "Variant - **Choice A/B" "$CHOICE_LABELS"

# T8: Single bold-labeled paragraph (NOT a choice) - must ALLOW
SINGLE="**Approach A - Just one option to describe.** This is the only path forward."
mc_assert_allows "Single bold-labeled paragraph" "$SINGLE"

# T9: Bold paragraphs that are NOT labeled choices - must ALLOW
LEGIT_BOLD="**Summary.** The work is done.

**Files changed.** Three files were updated.

**Next.** Moving on to the next task."
mc_assert_allows "Legitimate bold summary paragraphs (Summary/Files/Next)" "$LEGIT_BOLD"

# T10: Response with AskUserQuestion in tool log - must ALLOW even if option text present
WITH_OPTIONS="**Option A:** First
**Option B:** Second
**Option C:** Third"
mc_assert_allows_with_aq "Response with AskUserQuestion in tool log" "$WITH_OPTIONS"

# T11: "You can:" / "You could:" pattern still caught (when accompanied by 2+ option lines)
YOU_CAN="You can:
1. Take option one
2. Take option two"
mc_assert_blocks "You can: + numbered list" "$YOU_CAN"

# =============================================================================
# question-enforcement.sh tests
# =============================================================================

# T12: Failure 2 trailing question pattern
QE_FAIL2="**Approach A - first option.**

**Approach B - second option.**

I'd pick A because of X reasons.

Sound right, or want B/C instead?"
qe_assert_blocks "QE Failure 2 - 'Sound right, or want B/C instead?'" "$QE_FAIL2"

# T13: Simple trailing question with ?
QE_SIMPLE_Q="Here's my analysis of the work.

Should I commit it now?"
qe_assert_blocks "QE simple trailing question with ?" "$QE_SIMPLE_Q"

# T14: Statement-only response - must ALLOW
QE_STATEMENT="Here's what I did:
- Step 1 completed.
- Step 2 completed.

All 21 tests pass. Ready for the next task."
qe_assert_allows "QE statement-only response (no question)" "$QE_STATEMENT"

# T15: Question in code block (example) - must ALLOW
QE_CODE_Q='Here is example code:

```js
// What should we do next?
console.log("done");
```

Statement after code.'
qe_assert_allows "QE question inside code block (example)" "$QE_CODE_Q"

# T16: Response with AskUserQuestion - must ALLOW even with trailing question prose
QE_WITH_AQ="Here is the analysis.

I called AskUserQuestion above.

Want to proceed?"
qe_assert_allows "QE with AskUserQuestion in body" "$QE_WITH_AQ"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "================================================"
echo "PASS: $PASS  FAIL: $FAIL"
if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failing tests:"
  for label in "${FAIL_LABELS[@]}"; do
    echo "  - $label"
  done
  exit 1
fi
echo "All hook tests pass."
exit 0
