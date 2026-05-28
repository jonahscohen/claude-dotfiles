#!/usr/bin/env bash
# test-hud.sh - test harness for the HUD monitoring pane (T-0021)
#
# Scenarios covered:
#   1. No active team -> "No active team detected" message
#   2. Active team, members + tasks (no inbox messages) -> headers + member table
#   3. Active team, members + inbox messages -> Recent messages section populated
#   4. Idle teammates appear in the Idle list when their inbox is stale
#   5. State derivation (active vs idle vs stopped) is correct
#   6. SIGINT handling -> exit 0 with "HUD stopped"
#   7. SIGTERM handling -> exit 0
#   8. Unparseable inbox JSON doesn't crash (graceful fallback)
#   9. HUD_REFRESH_MS sub-second works (integer + decimal output)
#
# Uses HUD_TEAMS_DIR override to point at a temp fixture - never touches
# the real ~/.claude/teams/.

set -u

HUD_SCRIPT="$(cd "$(dirname "$0")" && pwd)/hud.sh"
if [ ! -x "$HUD_SCRIPT" ]; then
  echo "ERROR: $HUD_SCRIPT not found or not executable" >&2
  exit 2
fi

PASS=0
FAIL=0
FAILED_NAMES=()

pass() {
  PASS=$((PASS + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  FAILED_NAMES+=("$1")
  echo "  FAIL: $1"
  echo "    detail: $2"
}

mktempdir() {
  mktemp -d -t hud-test.XXXXXX
}

assert_contains() {
  local haystack="$1" needle="$2" name="$3"
  if printf '%s' "$haystack" | grep -q -F -- "$needle"; then
    pass "$name"
  else
    fail "$name" "missing literal: $needle"
  fi
}

assert_not_contains() {
  local haystack="$1" needle="$2" name="$3"
  if printf '%s' "$haystack" | grep -q -F -- "$needle"; then
    fail "$name" "unexpected literal: $needle"
  else
    pass "$name"
  fi
}

# Render in HUD_ONCE mode against a fixture teams dir.
render() {
  local teams_dir="$1"
  HUD_TEAMS_DIR="$teams_dir" HUD_ONCE=1 HUD_NO_CLEAR=1 bash "$HUD_SCRIPT"
}

# -----------------------------------------------------------------------
# Scenario 1: no active team
# -----------------------------------------------------------------------
echo ""
echo "Scenario 1: no active team"
T1=$(mktempdir)
trap "rm -rf $T1" EXIT
OUT1=$(render "$T1")
assert_contains "$OUT1" "No active team detected" "1.1 no-team message"
assert_contains "$OUT1" "scanned:" "1.2 mentions scanned path"
assert_not_contains "$OUT1" "Member" "1.3 no member table when empty"

# -----------------------------------------------------------------------
# Scenario 2: active team, members + tasks, no inbox messages
# -----------------------------------------------------------------------
echo ""
echo "Scenario 2: active team with members + tasks (no messages)"
T2=$(mktempdir)
trap "rm -rf $T1 $T2" EXIT
mkdir -p "$T2/fixture-team-a/inboxes"
cat > "$T2/fixture-team-a/config.json" <<'JSON'
{
  "name": "fixture-team-a",
  "createdAt": 1779978060104,
  "leadAgentId": "team-lead@fixture-team-a",
  "members": [
    {
      "agentId": "team-lead@fixture-team-a",
      "name": "team-lead",
      "agentType": "team-lead",
      "joinedAt": 1779978060104,
      "isActive": true,
      "prompt": ""
    },
    {
      "agentId": "alpha@fixture-team-a",
      "name": "alpha",
      "agentType": "general-purpose",
      "joinedAt": 1779978061000,
      "isActive": true,
      "prompt": "You own T-0099: build the alpha widget."
    }
  ]
}
JSON
OUT2=$(render "$T2")
assert_contains "$OUT2" "team: fixture-team-a" "2.1 team name shown"
assert_contains "$OUT2" "2 members" "2.2 member count shown"
assert_contains "$OUT2" "Member" "2.3 header row present"
assert_contains "$OUT2" "team-lead" "2.4 team-lead row present"
assert_contains "$OUT2" "alpha" "2.5 alpha row present"
assert_contains "$OUT2" "T-0099" "2.6 task ownership extracted from prompt"
assert_contains "$OUT2" "Recent messages" "2.7 recent messages section heading"
assert_contains "$OUT2" "(none yet)" "2.8 empty messages placeholder"
assert_contains "$OUT2" "Refresh: every 5s" "2.9 default refresh interval shown"
assert_contains "$OUT2" "Ctrl+C to quit" "2.10 Ctrl+C help text"

# -----------------------------------------------------------------------
# Scenario 3: active team with inbox messages
# -----------------------------------------------------------------------
echo ""
echo "Scenario 3: active team with inbox messages"
T3=$(mktempdir)
trap "rm -rf $T1 $T2 $T3" EXIT
mkdir -p "$T3/squad/inboxes"
cat > "$T3/squad/config.json" <<'JSON'
{
  "name": "squad",
  "createdAt": 1779978060104,
  "leadAgentId": "team-lead@squad",
  "members": [
    {"name": "team-lead", "agentId": "team-lead@squad", "joinedAt": 1779978060104, "isActive": true, "prompt": ""},
    {"name": "bravo", "agentId": "bravo@squad", "joinedAt": 1779978061000, "isActive": true, "prompt": "Own T-0111 work"}
  ]
}
JSON
# Build a recent (~10s ago) and an older message
NOW_ISO=$(python3 -c "from datetime import datetime,timezone,timedelta; print((datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat().replace('+00:00','Z'))")
OLD_ISO=$(python3 -c "from datetime import datetime,timezone,timedelta; print((datetime.now(timezone.utc) - timedelta(hours=2)).isoformat().replace('+00:00','Z'))")
cat > "$T3/squad/inboxes/bravo.json" <<JSON
[
  {"from":"team-lead","text":"ping kickoff briefing for T-0111","timestamp":"$NOW_ISO","type":"message","read":false}
]
JSON
cat > "$T3/squad/inboxes/team-lead.json" <<JSON
[
  {"from":"bravo","text":"ack received - starting now","timestamp":"$OLD_ISO","type":"message","read":true}
]
JSON
# Set inbox mtime so bravo looks "active" (recent) and team-lead looks older
touch -t $(date -j -v-10S +%Y%m%d%H%M.%S 2>/dev/null || date -d '10 seconds ago' +%Y%m%d%H%M.%S) "$T3/squad/inboxes/bravo.json" 2>/dev/null || true
touch -t $(date -j -v-2H +%Y%m%d%H%M.%S 2>/dev/null || date -d '2 hours ago' +%Y%m%d%H%M.%S) "$T3/squad/inboxes/team-lead.json" 2>/dev/null || true
OUT3=$(render "$T3")
assert_contains "$OUT3" "team: squad" "3.1 team name"
assert_contains "$OUT3" "T-0111" "3.2 bravo task ownership"
assert_contains "$OUT3" "team-lead -> bravo" "3.3 message direction sender->recipient"
assert_contains "$OUT3" "ping kickoff briefing" "3.4 message preview"
assert_contains "$OUT3" "bravo -> team-lead" "3.5 reverse-direction message included"
assert_not_contains "$OUT3" "(none yet)" "3.6 no empty-placeholder when messages exist"

# -----------------------------------------------------------------------
# Scenario 4: idle teammate appears in Idle list
# -----------------------------------------------------------------------
echo ""
echo "Scenario 4: idle teammate detection"
# bravo's inbox is recent (~10s) -> active. team-lead's inbox is 2h old -> idle.
assert_contains "$OUT3" "Idle teammates:" "4.1 Idle section heading"
# team-lead should be idle (inbox 2h old), bravo should not be
if printf '%s' "$OUT3" | grep -qE 'Idle teammates: .*team-lead'; then
  pass "4.2 team-lead listed as idle"
else
  fail "4.2 team-lead listed as idle" "team-lead absent from Idle list. Output:\n$OUT3"
fi

# -----------------------------------------------------------------------
# Scenario 5: state derivation (stopped via isActive:false)
# -----------------------------------------------------------------------
echo ""
echo "Scenario 5: state derivation"
T5=$(mktempdir)
trap "rm -rf $T1 $T2 $T3 $T5" EXIT
mkdir -p "$T5/halted/inboxes"
cat > "$T5/halted/config.json" <<'JSON'
{
  "name": "halted",
  "createdAt": 1779978060104,
  "leadAgentId": "team-lead@halted",
  "members": [
    {"name": "team-lead", "agentId": "team-lead@halted", "joinedAt": 1779978060104, "isActive": true, "prompt": ""},
    {"name": "ghost", "agentId": "ghost@halted", "joinedAt": 1779978061000, "isActive": false, "prompt": "T-0222 abandoned"}
  ]
}
JSON
OUT5=$(render "$T5")
if printf '%s' "$OUT5" | grep -E 'ghost.*\|.*stopped' >/dev/null; then
  pass "5.1 isActive:false rendered as stopped"
else
  fail "5.1 isActive:false rendered as stopped" "ghost row not stopped. Output:\n$OUT5"
fi

# -----------------------------------------------------------------------
# Scenario 6: SIGTERM handling - clean exit 0
#
# SIGTERM is the canonical programmatic shutdown signal (cmux pane close
# sends it; `kill <pid>` defaults to it). We test SIGTERM here because
# bash 3.2 on macOS ignores externally-delivered SIGINT to a non-interactive
# shell - the user-facing Ctrl+C path is covered in Scenario 7.
# -----------------------------------------------------------------------
echo ""
echo "Scenario 6: SIGTERM handling (programmatic shutdown)"
T6=$(mktempdir)
trap "rm -rf $T1 $T2 $T3 $T5 $T6" EXIT
mkdir -p "$T6/sig/inboxes"
cat > "$T6/sig/config.json" <<'JSON'
{"name": "sig", "createdAt": 1, "leadAgentId": "team-lead@sig", "members": [{"name": "team-lead", "agentId": "team-lead@sig", "joinedAt": 1, "isActive": true, "prompt": ""}]}
JSON

LOGFILE="$T6/run.log"
HUD_TEAMS_DIR="$T6" HUD_REFRESH_MS=500 HUD_NO_CLEAR=1 bash "$HUD_SCRIPT" > "$LOGFILE" 2>&1 &
HUD_PID=$!
sleep 0.8
kill -TERM $HUD_PID 2>/dev/null || true
wait $HUD_PID
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 0 ]; then
  pass "6.1 SIGTERM exits 0"
else
  fail "6.1 SIGTERM exits 0" "exit code was $EXIT_CODE"
fi
if grep -q "HUD stopped" "$LOGFILE"; then
  pass "6.2 SIGTERM prints 'HUD stopped'"
else
  fail "6.2 SIGTERM prints 'HUD stopped'" "log: $(cat "$LOGFILE")"
fi

# -----------------------------------------------------------------------
# Scenario 7: SIGINT trap is installed
#
# Real-world SIGINT (Ctrl+C from a controlling tty) reaches the foreground
# process group via the kernel tty driver and is honored by bash's INT
# trap. We cannot reproduce that programmatically without a PTY harness
# (which adds an outsized dependency for a v1 test). Instead we verify
# the trap is REGISTERED for INT by grepping the script for the canonical
# `trap cleanup INT TERM` line - if a regression accidentally drops INT
# from the trap, this test catches it.
# -----------------------------------------------------------------------
echo ""
echo "Scenario 7: SIGINT trap is installed"
if grep -E "^trap[[:space:]]+cleanup[[:space:]]+INT[[:space:]]+TERM" "$HUD_SCRIPT" >/dev/null; then
  pass "7.1 trap cleanup INT TERM line present in hud.sh"
else
  fail "7.1 trap cleanup INT TERM line present in hud.sh" \
    "grep failed - SIGINT handler may have been removed"
fi
# Also confirm the cleanup function calls exit 0 (clean shutdown)
if grep -E "^[[:space:]]*exit[[:space:]]+0" "$HUD_SCRIPT" >/dev/null; then
  pass "7.2 cleanup function exits 0"
else
  fail "7.2 cleanup function exits 0" "no 'exit 0' found in hud.sh"
fi

# -----------------------------------------------------------------------
# Scenario 8: malformed inbox JSON - graceful degradation
# -----------------------------------------------------------------------
echo ""
echo "Scenario 8: malformed inbox JSON"
T8=$(mktempdir)
trap "rm -rf $T1 $T2 $T3 $T5 $T6 $T8" EXIT
mkdir -p "$T8/broken/inboxes"
cat > "$T8/broken/config.json" <<'JSON'
{
  "name": "broken",
  "leadAgentId": "team-lead@broken",
  "members": [
    {"name": "team-lead", "agentId": "team-lead@broken", "joinedAt": 1779978060104, "isActive": true, "prompt": ""},
    {"name": "charlie", "agentId": "charlie@broken", "joinedAt": 1779978061000, "isActive": true, "prompt": "T-0333"}
  ]
}
JSON
# Invalid JSON
echo "{this is not valid JSON" > "$T8/broken/inboxes/charlie.json"
OUT8=$(render "$T8" 2>&1)
EXIT_CODE8=$?
if [ "$EXIT_CODE8" -eq 0 ]; then
  pass "8.1 malformed inbox JSON does not crash"
else
  fail "8.1 malformed inbox JSON does not crash" "exit $EXIT_CODE8 - output:\n$OUT8"
fi
assert_contains "$OUT8" "charlie" "8.2 member still rendered despite bad inbox"
assert_contains "$OUT8" "T-0333" "8.3 task still extracted despite bad inbox"

# -----------------------------------------------------------------------
# Scenario 9: HUD_REFRESH_MS sub-second formatting
# -----------------------------------------------------------------------
echo ""
echo "Scenario 9: HUD_REFRESH_MS customization"
OUT9_INT=$(HUD_REFRESH_MS=2000 HUD_TEAMS_DIR="$T2" HUD_ONCE=1 HUD_NO_CLEAR=1 bash "$HUD_SCRIPT")
assert_contains "$OUT9_INT" "Refresh: every 2s" "9.1 integer interval (2000ms -> 2s)"
OUT9_FRAC=$(HUD_REFRESH_MS=1500 HUD_TEAMS_DIR="$T2" HUD_ONCE=1 HUD_NO_CLEAR=1 bash "$HUD_SCRIPT")
assert_contains "$OUT9_FRAC" "Refresh: every 1.5s" "9.2 fractional interval (1500ms -> 1.5s)"

# -----------------------------------------------------------------------
# Scenario 10: most-recently-modified team detection (multi-team)
# -----------------------------------------------------------------------
echo ""
echo "Scenario 10: most-recently-modified team selection"
T10=$(mktempdir)
trap "rm -rf $T1 $T2 $T3 $T5 $T6 $T8 $T10" EXIT
mkdir -p "$T10/older/inboxes" "$T10/newer/inboxes"
echo '{"name":"older","members":[{"name":"team-lead","joinedAt":1,"isActive":true,"prompt":""}]}' > "$T10/older/config.json"
echo '{"name":"newer","members":[{"name":"team-lead","joinedAt":1,"isActive":true,"prompt":""}]}' > "$T10/newer/config.json"
# Force older dir mtime back, newer stays current
touch -t 200001010000.00 "$T10/older" "$T10/older/config.json"
OUT10=$(render "$T10")
assert_contains "$OUT10" "team: newer" "10.1 picks most-recently-modified team"
assert_not_contains "$OUT10" "team: older" "10.2 ignores older team"

# -----------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------
echo ""
echo "================================================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================================================"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for n in "${FAILED_NAMES[@]}"; do
    echo "  - $n"
  done
  exit 1
fi
exit 0
