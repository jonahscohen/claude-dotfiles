#!/bin/bash
# Regression tests for sidecoach-preamble.sh
# Run: bash ~/.claude/hooks/test-sidecoach-preamble.sh
#
# Exercises the hook against synthetic SessionStart payloads + temp-dir
# CWDs covering:
#   - Both PRODUCT.md and DESIGN.md valid -> emits additionalContext
#   - PRODUCT.md missing -> emits {}
#   - DESIGN.md missing -> emits {}
#   - PRODUCT.md is [TODO] stub -> emits {}
#   - DESIGN.md is [TODO] stub -> emits {}
#   - PRODUCT.md < 200 chars -> emits {}
#   - DESIGN.md < 200 chars -> emits {}
#   - Both files but combined content > 8KB -> truncates with marker
#   - SESSION_CWD points at a non-project dir (no files) -> emits {}
#   - SESSION_CWD points at a path that does not exist -> emits {}
#   - Binary PRODUCT.md (lots of NULs) -> emits {}
#   - Hook resolves cwd from stdin `cwd` field if SESSION_CWD unset
#   - Whitespace-only valid-looking files are rejected by 200-char gate
#
# Exits non-zero if any test fails.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HOOK_DIR/sidecoach-preamble.sh"

PASS=0
FAIL=0
FAIL_LABELS=()

TMP_ROOT="$(mktemp -d -t sidecoach-preamble-XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

run_hook() {
  # $1 = SESSION_CWD value (may be empty to test stdin fallback)
  # $2 = optional stdin JSON payload
  local cwd="$1"
  local payload="$2"
  if [ -z "$payload" ]; then
    payload='{}'
  fi
  if [ -n "$cwd" ]; then
    echo "$payload" | SESSION_CWD="$cwd" bash "$HOOK" 2>/dev/null
  else
    echo "$payload" | bash "$HOOK" 2>/dev/null
  fi
}

assert_silent() {
  local label="$1"
  local cwd="$2"
  local payload="$3"
  local out
  out=$(run_hook "$cwd" "$payload")
  # Silent = "{}" (no additionalContext key).
  if [ "$out" = "{}" ]; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected {}, got: $out)"
    FAIL_LABELS+=("$label")
    FAIL=$((FAIL + 1))
  fi
}

assert_fires() {
  local label="$1"
  local cwd="$2"
  local payload="$3"
  local out
  out=$(run_hook "$cwd" "$payload")
  if echo "$out" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    sys.exit(1)
hs = d.get("hookSpecificOutput", {})
ctx = hs.get("additionalContext", "")
if not ctx or "PRODUCT.md" not in ctx or "DESIGN.md" not in ctx:
    sys.exit(1)
sys.exit(0)
' 2>/dev/null; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected non-empty additionalContext with PRODUCT.md+DESIGN.md markers, got: $out)"
    FAIL_LABELS+=("$label")
    FAIL=$((FAIL + 1))
  fi
}

assert_truncated() {
  local label="$1"
  local cwd="$2"
  local payload="$3"
  local out
  out=$(run_hook "$cwd" "$payload")
  if echo "$out" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    sys.exit(1)
ctx = d.get("hookSpecificOutput", {}).get("additionalContext", "")
if "...[truncated]" not in ctx:
    sys.exit(1)
sys.exit(0)
' 2>/dev/null; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected ...[truncated] marker in additionalContext, got: $out)"
    FAIL_LABELS+=("$label")
    FAIL=$((FAIL + 1))
  fi
}

# Helpers to build fixture directories.
make_valid_file() {
  # $1 = path. Writes ~400 chars of varied content with no [TODO].
  cat > "$1" <<'EOF'
# Test Document

This is a long-enough valid markdown document to exceed the 200 character
threshold the sidecoach-preamble hook enforces. It does not contain the
literal stub marker, so it should be accepted by the validator. The content
here is realistic enough to mirror an actual PRODUCT.md or DESIGN.md file
shipped in a real sidecoach-enabled project.

## Register

brand

## Notes

Filler content to clear the byte threshold.
EOF
}

make_huge_file() {
  # $1 = path, $2 = approximate KB to produce.
  python3 -c '
import sys
path, kb = sys.argv[1], int(sys.argv[2])
line = "x" * 79 + "\n"  # 80 bytes per line
needed = kb * 1024
with open(path, "w") as fh:
    fh.write("# Big File\n\n")
    fh.write("This file intentionally exceeds the per-file cap.\n\n")
    written = 0
    while written < needed:
        fh.write(line)
        written += len(line)
' "$1" "$2"
}

# -----------------------------
# Test 1: Both files valid -> fires
# -----------------------------
T1="$TMP_ROOT/t1"
mkdir -p "$T1"
make_valid_file "$T1/PRODUCT.md"
make_valid_file "$T1/DESIGN.md"
assert_fires "T1: both PRODUCT.md and DESIGN.md valid -> fires" "$T1" ""

# -----------------------------
# Test 2: PRODUCT.md missing -> silent
# -----------------------------
T2="$TMP_ROOT/t2"
mkdir -p "$T2"
make_valid_file "$T2/DESIGN.md"
assert_silent "T2: PRODUCT.md missing -> silent" "$T2" ""

# -----------------------------
# Test 3: DESIGN.md missing -> silent
# -----------------------------
T3="$TMP_ROOT/t3"
mkdir -p "$T3"
make_valid_file "$T3/PRODUCT.md"
assert_silent "T3: DESIGN.md missing -> silent" "$T3" ""

# -----------------------------
# Test 4: PRODUCT.md is [TODO] stub -> silent
# -----------------------------
T4="$TMP_ROOT/t4"
mkdir -p "$T4"
{
  echo "# PRODUCT"
  echo ""
  echo "[TODO] This file is still a stub - fill it in before relying on it."
  echo "Long enough text to pass the 200-char gate if it were not for the TODO marker above."
  echo "padding padding padding padding padding padding padding padding padding padding"
  echo "padding padding padding padding padding padding padding padding padding padding"
} > "$T4/PRODUCT.md"
make_valid_file "$T4/DESIGN.md"
assert_silent "T4: PRODUCT.md [TODO] stub -> silent" "$T4" ""

# -----------------------------
# Test 5: DESIGN.md is [TODO] stub -> silent
# -----------------------------
T5="$TMP_ROOT/t5"
mkdir -p "$T5"
make_valid_file "$T5/PRODUCT.md"
{
  echo "# DESIGN"
  echo ""
  echo "Token map [TODO]."
  echo "padding padding padding padding padding padding padding padding padding padding"
  echo "padding padding padding padding padding padding padding padding padding padding"
  echo "padding padding padding padding padding padding padding padding padding padding"
} > "$T5/DESIGN.md"
assert_silent "T5: DESIGN.md [TODO] stub -> silent" "$T5" ""

# -----------------------------
# Test 6: PRODUCT.md < 200 chars -> silent
# -----------------------------
T6="$TMP_ROOT/t6"
mkdir -p "$T6"
echo "tiny" > "$T6/PRODUCT.md"
make_valid_file "$T6/DESIGN.md"
assert_silent "T6: PRODUCT.md under 200 chars -> silent" "$T6" ""

# -----------------------------
# Test 7: DESIGN.md < 200 chars -> silent
# -----------------------------
T7="$TMP_ROOT/t7"
mkdir -p "$T7"
make_valid_file "$T7/PRODUCT.md"
echo "tiny design" > "$T7/DESIGN.md"
assert_silent "T7: DESIGN.md under 200 chars -> silent" "$T7" ""

# -----------------------------
# Test 8: Combined content > 8KB -> truncates
# -----------------------------
T8="$TMP_ROOT/t8"
mkdir -p "$T8"
make_huge_file "$T8/PRODUCT.md" 20  # 20KB
make_huge_file "$T8/DESIGN.md" 20   # 20KB
assert_truncated "T8: combined content > 8KB -> truncates with marker" "$T8" ""

# -----------------------------
# Test 9: SESSION_CWD points at non-project dir (no files) -> silent
# -----------------------------
T9="$TMP_ROOT/t9-empty"
mkdir -p "$T9"
assert_silent "T9: empty SESSION_CWD dir -> silent" "$T9" ""

# -----------------------------
# Test 10: SESSION_CWD points at non-existent dir -> silent
# -----------------------------
assert_silent "T10: SESSION_CWD points at nonexistent path -> silent" "$TMP_ROOT/does-not-exist" ""

# -----------------------------
# Test 11: Binary PRODUCT.md (lots of NULs) -> silent
# -----------------------------
T11="$TMP_ROOT/t11"
mkdir -p "$T11"
python3 -c '
with open("'"$T11"'/PRODUCT.md", "wb") as fh:
    fh.write(b"\x00" * 500 + b"# Header\n" + b"\x00" * 500)
'
make_valid_file "$T11/DESIGN.md"
assert_silent "T11: binary-looking PRODUCT.md (NUL-heavy) -> silent" "$T11" ""

# -----------------------------
# Test 12: cwd resolved from stdin if SESSION_CWD unset
# -----------------------------
T12="$TMP_ROOT/t12"
mkdir -p "$T12"
make_valid_file "$T12/PRODUCT.md"
make_valid_file "$T12/DESIGN.md"
PAYLOAD=$(python3 -c 'import json,sys; print(json.dumps({"cwd": sys.argv[1]}))' "$T12")
assert_fires "T12: cwd resolved from stdin cwd field -> fires" "" "$PAYLOAD"

# -----------------------------
# Test 13: Whitespace-only file -> silent (under 200 chars after strip)
# -----------------------------
T13="$TMP_ROOT/t13"
mkdir -p "$T13"
python3 -c '
with open("'"$T13"'/PRODUCT.md", "w") as fh:
    fh.write("\n" * 300)
'
make_valid_file "$T13/DESIGN.md"
assert_silent "T13: whitespace-only PRODUCT.md -> silent" "$T13" ""

# -----------------------------
# Summary
# -----------------------------
TOTAL=$((PASS + FAIL))
echo ""
echo "============================================"
echo "Test summary: $PASS/$TOTAL passed"
if [ "$FAIL" -gt 0 ]; then
  echo "FAILED labels:"
  for label in "${FAIL_LABELS[@]}"; do
    echo "  - $label"
  done
  exit 1
fi
echo "All passing."
exit 0
