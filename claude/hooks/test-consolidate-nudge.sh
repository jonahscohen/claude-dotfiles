#!/bin/bash
# Regression tests for the cluster detector (consolidate-nudge.sh).
#   bash ~/.claude/hooks/test-consolidate-nudge.sh
# Exercises the SessionStart nudge contract:
#   FIRES   : an over-threshold same-token cluster -> {"additionalContext": ...}
#   SILENT  : under-threshold cluster -> {}
#   COOLDOWN: after a fire it writes the cooldown file and stays silent until it
#             ages out; CONSOLIDATE_COOLDOWN=0 disables the cooldown.
#   EXCLUDE : feedback_/decision_/reference standing beats and MEMORY*.md are
#             NEVER counted toward a cluster.
#   TOKENS  : stopwords, pure-date, and sub-min-length tokens never form a
#             cluster; a token repeated in one filename counts that file once.
# Uses a temp beats dir + env overrides (CONSOLIDATE_MEMORY_DIR / _THRESHOLD /
# _COOLDOWN / _COOLDOWN_FILE) so the real corpus and real cooldown are untouched.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
NUDGE="$HOOK_DIR/consolidate-nudge.sh"
PASS=0; FAIL=0; FAILS=()

TMP=$(mktemp -d /tmp/consolidate-test-XXXX)
COOL="$TMP/cooldown"
trap 'rm -rf "$TMP"' EXIT

ok() { echo "PASS: $1"; PASS=$((PASS+1)); }
no() { echo "FAIL: $1 (got: $2)"; FAILS+=("$1"); FAIL=$((FAIL+1)); }

# run <memdir> <threshold> [cooldown_seconds] -> stdout of the hook
run() {
  local dir="$1" thr="$2" cd="${3:-0}"
  CONSOLIDATE_MEMORY_DIR="$dir" CONSOLIDATE_THRESHOLD="$thr" \
  CONSOLIDATE_COOLDOWN="$cd" CONSOLIDATE_COOLDOWN_FILE="$COOL" \
  bash "$NUDGE" 2>/dev/null
}

# make N session beats whose topic token is $2, dated sequentially.
mk_cluster() {  # mk_cluster <dir> <token> <count>
  local dir="$1" tok="$2" n="$3" i
  for ((i=1; i<=n; i++)); do
    printf -- '---\nname: %s %d\ntype: project\n---\nbody\n' "$tok" "$i" \
      > "$dir/session_2026-05-$(printf '%02d' $((i%28+1)))_${tok}-item${i}.md"
  done
}

# ---- FIRES over threshold ----
D="$TMP/fire"; mkdir -p "$D"; mk_cluster "$D" "tilt" 14
out=$(run "$D" 12)
{ echo "$out" | grep -q '"additionalContext"' && echo "$out" | grep -q 'tilt'; } \
  && ok "fires on a 14-file 'tilt' cluster at threshold 12" \
  || no "fires over threshold" "$out"

# the fired message reports the count and the /consolidate command
echo "$out" | grep -q '/consolidate tilt' \
  && ok "fired message names '/consolidate tilt'" \
  || no "message names /consolidate <topic>" "$out"

# ---- SILENT under threshold ----
D="$TMP/under"; mkdir -p "$D"; mk_cluster "$D" "tilt" 11
out=$(run "$D" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "silent on an 11-file cluster at threshold 12" \
  || no "silent under threshold" "$out"

# ---- EXACTLY at threshold fires (>= boundary) ----
D="$TMP/boundary"; mkdir -p "$D"; mk_cluster "$D" "tilt" 12
out=$(run "$D" 12)
echo "$out" | grep -q '"additionalContext"' \
  && ok "fires at exactly threshold (>= boundary)" \
  || no "fires at boundary" "$out"

# ---- COOLDOWN: first fire writes cooldown; second run is silent ----
D="$TMP/cool"; mkdir -p "$D"; mk_cluster "$D" "tilt" 14; rm -f "$COOL"
out1=$(run "$D" 12 86400)   # long cooldown
out2=$(run "$D" 12 86400)
{ echo "$out1" | grep -q 'additionalContext'; } \
  && [ "$(echo "$out2" | tr -d '[:space:]')" = '{}' ] \
  && [ -f "$COOL" ] \
  && ok "cooldown: fires once then silent while cooldown is fresh" \
  || no "cooldown suppresses second fire" "first=$out1 second=$out2 coolfile=$([ -f "$COOL" ] && echo yes || echo no)"

# cooldown=0 always eligible (never suppresses)
rm -f "$COOL"
o1=$(run "$D" 12 0); o2=$(run "$D" 12 0)
{ echo "$o1" | grep -q additionalContext && echo "$o2" | grep -q additionalContext; } \
  && ok "cooldown=0 disables suppression (fires every run)" \
  || no "cooldown=0 always fires" "first=$o1 second=$o2"

# a SILENT (under-threshold) session must NOT burn the cooldown window
D="$TMP/nocool"; mkdir -p "$D"; mk_cluster "$D" "tilt" 5; rm -f "$COOL"
out=$(run "$D" 12 86400)
[ ! -f "$COOL" ] && ok "silent session does not write the cooldown file" \
  || no "silent session leaves cooldown untouched" "coolfile written"

# ---- EXCLUDE standing beats (feedback_/decision_/reference) ----
# 8 real session 'lab' beats (under threshold) + 6 feedback_/decision_ 'lab'
# files. If standing were counted, 14 >= threshold would fire. It must stay silent.
D="$TMP/standing"; mkdir -p "$D"; mk_cluster "$D" "lab" 8
for i in 1 2 3; do printf -- '---\ntype: feedback\n---\n' > "$D/feedback_lab_rule${i}.md"; done
for i in 1 2 3; do printf -- '---\ntype: decision\n---\n' > "$D/decision_lab_choice${i}.md"; done
out=$(run "$D" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "standing feedback_/decision_ beats are NOT counted toward a cluster" \
  || no "standing beats excluded from count" "$out"

# with enough real session beats added it DOES fire (proves the 8 were real, the standing 6 inert)
mk_cluster "$D" "lab" 12   # overwrite/extend to 12 session beats
out=$(run "$D" 12)
echo "$out" | grep -q 'additionalContext' \
  && ok "same dir fires once the SESSION (non-standing) count alone crosses threshold" \
  || no "session-only count crosses threshold" "$out"

# ---- EXCLUDE standing-by-TYPE (session_ filename, but type: decision/feedback) ----
# The exact bug class: a session_-named beat that carries a standing frontmatter
# type must NOT be counted. 8 real project 'vfx' beats (under threshold) + 6
# session_-named beats whose frontmatter type is decision/feedback. If counted by
# filename alone (no standing prefix), 14 >= threshold would fire. Must stay silent.
D="$TMP/bytype"; mkdir -p "$D"; mk_cluster "$D" "vfx" 8
for i in 1 2 3; do printf -- '---\nname: x\ntype: decision\n---\nbody\n' > "$D/session_2026-06-0${i}_vfx-choice${i}.md"; done
for i in 1 2 3; do printf -- '---\nname: x\ntype: feedback\n---\nbody\n' > "$D/session_2026-06-1${i}_vfx-rule${i}.md"; done
out=$(run "$D" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "session_-named beats with standing TYPE (decision/feedback) are NOT counted" \
  || no "standing-by-type excluded" "$out"

# ---- IDEMPOTENCE: beats already carrying superseded_by are NOT counted ----
# A consolidated cluster must not re-nudge. 8 LIVE project 'flux' beats + 6
# already-merged 'flux' beats carrying superseded_by. Live count is 8 < 12, so
# the detector must stay SILENT (it would wrongly fire at 14 if it re-counted the
# already-consolidated beats).
D="$TMP/superseded"; mkdir -p "$D"; mk_cluster "$D" "flux" 8
for i in 1 2 3 4 5 6; do
  printf -- '---\nname: x\ntype: project\nsuperseded_by: session_2026-06-06_flux-consolidated.md\n---\nbody\n' \
    > "$D/session_2026-04-$(printf '%02d' $((i+1)))_flux-old${i}.md"
done
out=$(run "$D" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "beats with superseded_by are NOT counted (8 live + 6 merged < 12 -> silent)" \
  || no "superseded_by beats excluded from count" "$out"

# Same dir at threshold 8 fires with the LIVE count 8, never 14.
out=$(run "$D" 8)
echo "$out" | grep -qE '`flux` has 8 ' \
  && ok "live count excludes superseded: reports 8, not 14" \
  || no "live-only count is 8" "$out"

# An all-superseded cluster never fires, even at threshold 1.
D="$TMP/allsup"; mkdir -p "$D"
for i in 1 2 3; do
  printf -- '---\ntype: project\nsuperseded_by: canonical.md\n---\n' \
    > "$D/session_2026-04-0${i}_widget-thing${i}.md"
done
out=$(run "$D" 1)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "all-superseded cluster does not fire even at threshold 1" \
  || no "all-superseded never fires" "$out"

# A null/placeholder superseded_by does NOT count as superseded (still live).
D="$TMP/nullsup"; mkdir -p "$D"
for ((i=1;i<=12;i++)); do
  printf -- '---\ntype: project\nsuperseded_by: null\n---\n' \
    > "$D/session_2026-05-$(printf '%02d' $((i%28+1)))_flux-live${i}.md"
done
out=$(run "$D" 12)
echo "$out" | grep -q 'additionalContext' \
  && ok "superseded_by: null is treated as LIVE (placeholder, still counted)" \
  || no "null superseded_by counts as live" "$out"

# ---- EXCLUDE MEMORY.md / MEMORY-archive.md ----
D="$TMP/memfiles"; mkdir -p "$D"; mk_cluster "$D" "tilt" 11
# Add MEMORY.md + MEMORY-archive.md that contain the token in name-ish content;
# they must never count as cluster members (would make 13 and fire).
printf -- '- tilt entry\n' > "$D/MEMORY.md"
printf -- '- tilt entry\n' > "$D/MEMORY-archive.md"
out=$(run "$D" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "MEMORY.md and MEMORY-archive.md are never counted" \
  || no "MEMORY files excluded" "$out"

# ---- STOPWORDS / pure-date / short tokens do not form a cluster ----
# 14 files whose only shared tokens are the stopword 'phase' and a bare date.
D="$TMP/stop"; mkdir -p "$D"
for ((i=1;i<=14;i++)); do
  printf -- '---\ntype: project\n---\n' > "$D/session_2026-05-$(printf '%02d' $((i%28+1)))_phase.md"
done
out=$(run "$D" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "stopword-only ('phase') filenames do not form a cluster" \
  || no "stopwords excluded" "$out"

# ---- DEDUP within a filename: a token repeated in one name counts that file once ----
# 13 files each containing 'tilt' twice in the name. If double-counted, count=26;
# but it is 13 files, which is >= 12, so it SHOULD fire with count 13 (not 26).
D="$TMP/dedup"; mkdir -p "$D"
for ((i=1;i<=13;i++)); do
  printf -- '---\ntype: project\n---\n' > "$D/session_2026-05-$(printf '%02d' $((i%28+1)))_tilt-tilt-${i}.md"
done
out=$(run "$D" 12)
echo "$out" | grep -qE '`tilt` has 13 ' \
  && ok "intra-file token dedup: 13 files report count 13 (not 26)" \
  || no "intra-file dedup count" "$out"

# ---- empty / missing memory dir -> silent ----
out=$(run "$TMP/does-not-exist" 12)
[ "$(echo "$out" | tr -d '[:space:]')" = '{}' ] \
  && ok "missing memory dir -> silent {}" \
  || no "missing dir silent" "$out"

echo ""
echo "============================================================"
echo "RESULTS: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then printf '  - %s\n' "${FAILS[@]}"; exit 1; fi
echo "All consolidate-nudge detector tests pass."
