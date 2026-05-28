#!/bin/bash
# Regression tests for multiple-choice-enforce.sh + question-enforcement.sh
# Run: bash ~/.claude/hooks/test-multiple-choice-enforce.sh
#
# Tests both hooks against synthetic responses that match today's failure
# patterns. Exits non-zero if any test fails.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
MC_HOOK="$HOOK_DIR/multiple-choice-enforce.sh"
QE_HOOK="$HOOK_DIR/question-enforcement.sh"
STOP_HOOK="$HOOK_DIR/multiple-choice-detect-stop.sh"
INJECT_HOOK="$HOOK_DIR/multiple-choice-inject-prompt.sh"

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
# T-0005 false-fire regression tests (2026-05-27)
# Patterns that previously over-fired and should now PASS:
#  (a) Binary "X or Y?" questions
#  (b) Numbered fact lists with NO trailing question
#  (c) Numbered list with a question >80 chars away from the last item
#  (d) Numbered fact list + binary trailing question ("Want me to queue any?")
# And one positive control: a genuine 3+ option question with trailing question
# must still BLOCK.
# =============================================================================

# T-0005a: Binary "should we use X or Y?" - no list, just a binary question.
BINARY_X_OR_Y="Looking at the routing options for the Discord thread.

Should we use channel-A or channel-B for this?"
mc_assert_allows "T-0005a: binary 'X or Y?' question (no list)" "$BINARY_X_OR_Y"

# T-0005b: Numbered fact list with NO trailing question (Peekaboo capabilities pattern).
FACT_LIST_NO_Q="Peekaboo can do these things today:

1. Capture full-screen screenshots
2. Crop to a region
3. List open windows
4. Switch focused app
5. Read clipboard contents

That's the current capability surface."
mc_assert_allows "T-0005b: 5-item numbered fact list with NO trailing question" "$FACT_LIST_NO_Q"

# T-0005c: Numbered list with a question elsewhere in the response but FAR from
# the last list item (the question is in the opening paragraph, the list comes
# after, and there's no question near the list itself).
FACT_LIST_FAR_Q="Do you want the full audit summary? Here it is.

Long preamble line one with extra padding to ensure distance from the list below this paragraph and onward.

1. Finding alpha
2. Finding beta
3. Finding gamma
4. Finding delta"
mc_assert_allows "T-0005c: numbered list with question >80 chars from last item" "$FACT_LIST_FAR_Q"

# T-0005d: Today's live false-fire - 5-item fact list followed by a binary
# trailing question. The trailing question is yes/no, not "pick one of the 5".
FACT_LIST_BINARY_Q="The follow-ups we tabled today:

1. Tighten the bash-guard regex on git --no-verify
2. Backport the validation-guard tests to the CI runner
3. Move the screenshot-pending flag into XDG state
4. Audit memory-nudge throttle window
5. Roll the sidecoach mandate prompt into the SKILL frontmatter

Want me to queue any?"
mc_assert_allows "T-0005d: 5-item fact list + 'Want me to queue any?' binary trailing q" "$FACT_LIST_BINARY_Q"

# T-0005e: Positive control - a genuine 3-option deflection with trailing
# question that explicitly references the options. MUST still BLOCK.
GENUINE_DEFLECTION="Three approaches I see:

1. Refactor the orchestrator to lift the validator out
2. Extract a separate validator-runner module
3. Keep the current shape but add a feature flag

Which one would you prefer?"
mc_assert_blocks "T-0005e: positive control - 3-option list + 'Which one would you prefer?'" "$GENUINE_DEFLECTION"

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
# multiple-choice-detect-stop.sh tests (Stop event, real pipeline)
# Builds synthetic transcript jsonl files + stdin JSON, runs the Stop hook,
# verifies whether the violation flag was written. This is the FIRST set of
# tests that exercise the actual wiring (vs the prior tests which just
# called the detection function with phantom RESPONSE_TEXT env vars).
# =============================================================================

# Use a sandboxed violation flag location so tests cannot interfere with the
# live system flag. Override the global location via env var read inside the
# script... but the script hard-codes $HOME/.claude/.multiple-choice-violation.
# So we point HOME at a tmp dir per test instead.

run_stop_hook() {
  local transcript="$1"
  local fake_home
  fake_home=$(mktemp -d)
  mkdir -p "$fake_home/.claude"
  printf '{"transcript_path":"%s"}' "$transcript" | HOME="$fake_home" bash "$STOP_HOOK" >/dev/null 2>&1
  # Check whether the violation flag was written.
  if [[ -f "$fake_home/.claude/.multiple-choice-violation" ]]; then
    cat "$fake_home/.claude/.multiple-choice-violation"
    rm -rf "$fake_home"
    return 0  # flag written
  fi
  rm -rf "$fake_home"
  return 1  # no flag
}

# Build a fixture transcript jsonl with a single assistant message containing
# the given text.
build_transcript_simple() {
  local out="$1"
  local text="$2"
  python3 - "$out" "$text" <<'PYEOF'
import json, sys
out_path, text = sys.argv[1], sys.argv[2]
event = {
    "type": "assistant",
    "message": {"content": [{"type": "text", "text": text}]}
}
with open(out_path, "w") as f:
    f.write(json.dumps(event) + "\n")
PYEOF
}

# Build a transcript where the assistant USED AskUserQuestion in the same turn
# (text block + tool_use block).
build_transcript_with_aq() {
  local out="$1"
  local text="$2"
  python3 - "$out" "$text" <<'PYEOF'
import json, sys
out_path, text = sys.argv[1], sys.argv[2]
event = {
    "type": "assistant",
    "message": {"content": [
        {"type": "text", "text": text},
        {"type": "tool_use", "name": "AskUserQuestion", "input": {}}
    ]}
}
with open(out_path, "w") as f:
    f.write(json.dumps(event) + "\n")
PYEOF
}

stop_assert_blocks() {
  local label="$1"
  local transcript="$2"
  if run_stop_hook "$transcript" >/dev/null; then
    echo "PASS [stop]: $label"
    ((PASS++))
  else
    echo "FAIL [stop]: $label  (expected violation flag, none written)"
    FAIL_LABELS+=("[stop] $label")
    ((FAIL++))
  fi
}

stop_assert_allows() {
  local label="$1"
  local transcript="$2"
  if run_stop_hook "$transcript" >/dev/null; then
    echo "FAIL [stop]: $label  (expected NO flag, but one was written)"
    FAIL_LABELS+=("[stop] $label")
    ((FAIL++))
  else
    echo "PASS [stop]: $label"
    ((PASS++))
  fi
}

# T17: today's third-failure pattern - bold-labeled paragraphs + trailing question.
THIRD_FAILURE_TEXT="## Three implementation approaches

**Approach A: CheckpointStore as a separate module (Recommended).** New file owns disk I/O.

**Approach B: Inline checkpoint persistence in the orchestrator.** Less ceremony.

**Approach C: Extend session-memory-writer to also write checkpoints.** Reuse infrastructure.

Does this approach land for you, or would you prefer one of the others?"
T17_FIX=$(mktemp --suffix=.jsonl 2>/dev/null || mktemp /tmp/sidecoach-test-XXXXXX.jsonl)
build_transcript_simple "$T17_FIX" "$THIRD_FAILURE_TEXT"
stop_assert_blocks "third-failure - **Approach A/B/C** + 'Does this approach land' trailing question" "$T17_FIX"
rm -f "$T17_FIX"

# T18: bold-labeled options without trailing question (still a deflection).
NO_TRAILING_Q="**Plan 1 - move fast.** Ship now.

**Plan 2 - move carefully.** Wait for sign-off."
T18_FIX=$(mktemp /tmp/sidecoach-test-XXXXXX.jsonl)
build_transcript_simple "$T18_FIX" "$NO_TRAILING_Q"
stop_assert_blocks "bold-labeled plans without trailing question (structural heuristic only)" "$T18_FIX"
rm -f "$T18_FIX"

# T19: legitimate response with NO options - must not flag.
LEGIT_TEXT="Here is the work summary:

- T1 complete.
- T2 complete.
- T3 complete.

All tests pass."
T19_FIX=$(mktemp /tmp/sidecoach-test-XXXXXX.jsonl)
build_transcript_simple "$T19_FIX" "$LEGIT_TEXT"
stop_assert_allows "legitimate work-summary response (no options, no trailing q)" "$T19_FIX"
rm -f "$T19_FIX"

# T20: assistant USED AskUserQuestion in the same turn - even if option-like prose
# appears, the hook should NOT write a violation flag.
SAME_TURN_AQ="I called AskUserQuestion below.

**Option A:** First.
**Option B:** Second."
T20_FIX=$(mktemp /tmp/sidecoach-test-XXXXXX.jsonl)
build_transcript_with_aq "$T20_FIX" "$SAME_TURN_AQ"
stop_assert_allows "assistant used AskUserQuestion in same turn (allowed even with option prose)" "$T20_FIX"
rm -f "$T20_FIX"

# T21: numbered options as prose (Failure 1 pattern) - must flag.
NUMBERED_OPTIONS="Would you like me to:
1. Commit the change.
2. Stage it for review.
3. Leave it alone."
T21_FIX=$(mktemp /tmp/sidecoach-test-XXXXXX.jsonl)
build_transcript_simple "$T21_FIX" "$NUMBERED_OPTIONS"
stop_assert_blocks "numbered-options prose (Failure 1 pattern)" "$T21_FIX"
rm -f "$T21_FIX"

# T22: trailing question alone is NOT enough to flag without option signals.
QUESTION_ONLY="The build is green. Ready to move on?"
T22_FIX=$(mktemp /tmp/sidecoach-test-XXXXXX.jsonl)
build_transcript_simple "$T22_FIX" "$QUESTION_ONLY"
stop_assert_allows "simple trailing question with no options (allowed; covered by inject-on-fail loop)" "$T22_FIX"
rm -f "$T22_FIX"

# =============================================================================
# multiple-choice-inject-prompt.sh tests (UserPromptSubmit injector)
# Verify that when a violation flag is present, the injector emits valid JSON
# with hookSpecificOutput.additionalContext containing the violation details,
# then clears the flag. When no flag exists, it emits nothing.
# =============================================================================

# T23: flag present -> JSON with additionalContext emitted, flag cleared.
inj_dir=$(mktemp -d)
mkdir -p "$inj_dir/.claude"
cat > "$inj_dir/.claude/.multiple-choice-violation" <<'EOF'
reason=opt=3 bold=3 trailing_q=1 trailing_deflection=1
timestamp=2026-05-24 17:55:00
matched_lines<<MATCHEOF
**Approach A: First option.**
**Approach B: Second option.**
**Approach C: Third option.**
MATCHEOF
EOF
inj_output=$(HOME="$inj_dir" bash "$INJECT_HOOK" 2>/dev/null)
inj_exit=$?
inj_flag_cleared=0
[[ ! -f "$inj_dir/.claude/.multiple-choice-violation" ]] && inj_flag_cleared=1
# Validate JSON parse + look for the key field.
inj_valid_json=$(printf '%s' "$inj_output" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    has_ctx = 'hookSpecificOutput' in d and 'additionalContext' in d.get('hookSpecificOutput', {})
    has_violation = 'MULTIPLE-CHOICE VIOLATION DETECTED' in d.get('hookSpecificOutput', {}).get('additionalContext', '')
    print('yes' if has_ctx and has_violation else 'no')
except Exception:
    print('no')
" 2>/dev/null)
rm -rf "$inj_dir"
if [[ "$inj_valid_json" == "yes" ]] && [[ $inj_flag_cleared -eq 1 ]] && [[ $inj_exit -eq 0 ]]; then
  echo "PASS [inj]: violation flag present -> valid JSON injection emitted, flag cleared"
  ((PASS++))
else
  echo "FAIL [inj]: violation flag present -> json_valid=$inj_valid_json flag_cleared=$inj_flag_cleared exit=$inj_exit"
  echo "  injector output was: $inj_output"
  FAIL_LABELS+=("[inj] violation flag injection")
  ((FAIL++))
fi

# T24: no flag -> injector emits nothing and exits 0.
noflag_dir=$(mktemp -d)
mkdir -p "$noflag_dir/.claude"
noflag_output=$(HOME="$noflag_dir" bash "$INJECT_HOOK" 2>/dev/null)
noflag_exit=$?
rm -rf "$noflag_dir"
if [[ -z "$noflag_output" ]] && [[ $noflag_exit -eq 0 ]]; then
  echo "PASS [inj]: no flag -> injector emits nothing, exits 0"
  ((PASS++))
else
  echo "FAIL [inj]: no flag -> output=\"$noflag_output\" exit=$noflag_exit"
  FAIL_LABELS+=("[inj] no flag silent")
  ((FAIL++))
fi

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
