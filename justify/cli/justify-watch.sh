#!/usr/bin/env bash
# justify-watch - present the Justify listen loop as clean, legible terminal
# output instead of a raw `for ... curl ... done; echo IDLE` block.
#
# Behaviour: polls the daemon's /prompts for up to WINDOW seconds. While idle it
# prints a single tidy "watching" line and, on timeout, one "idle" line. When a
# task arrives it prints a compact card (prompt text, id, target selector) and
# exits 0. The raw prompt JSON is written to $JUSTIFY_INBOX (default
# /tmp/justify-inbox.json) so the agent can read structured fields without the
# visible output carrying noisy JSON.
#
# Usage:  justify-watch [window_seconds] [poll_interval_seconds]
#   window_seconds  how long to watch before returning idle (default 150)
#   poll_interval   seconds between polls (default 2)
# Env: JUSTIFY_PORT (default 9223), JUSTIFY_INBOX, NO_COLOR to disable color.
set -uo pipefail

PORT="${JUSTIFY_PORT:-9223}"
BASE="http://localhost:${PORT}"
WINDOW="${1:-150}"
INTERVAL="${2:-2}"
INBOX="${JUSTIFY_INBOX:-/tmp/justify-inbox.json}"

if [ -z "${NO_COLOR:-}" ]; then
  O=$'\033[38;5;209m'   # justify orange
  D=$'\033[38;5;245m'   # dim gray
  B=$'\033[1m'          # bold
  X=$'\033[0m'          # reset
else
  O='' ; D='' ; B='' ; X=''
fi

DOT=$'·'          # middle dot separator
IDLE=$'◌'         # dotted circle (idle)
HIT=$'◉'          # fisheye (task in)
TL=$'┌'           # box top-left
BL=$'└'           # box bottom-left

stamp() { date "+%-I:%M:%S%p" | tr 'APM' 'apm'; }

if ! curl -s -o /dev/null -m 2 "${BASE}/status"; then
  printf "  %s%s%s justify daemon not responding on :%s  %s(run %sjustify-serve%s)%s\n" \
    "$O" "$IDLE" "$X" "$PORT" "$D" "$B" "$X" "$X"
  exit 2
fi

# Clear any stale inbox from a prior run so an idle window can never leave a
# previous task's JSON lying around to be mistaken for a fresh one. A real task
# this window overwrites it; an idle window leaves it empty.
rm -f "$INBOX" 2>/dev/null

printf "  %s%s%s justify  %s%s  watching for tasks ...%s\n" "$O" "$IDLE" "$X" "$D" "$DOT" "$X"

end=$(( $(date +%s) + WINDOW ))
while [ "$(date +%s)" -lt "$end" ]; do
  P="$(curl -s -m 2 "${BASE}/prompts" 2>/dev/null || true)"
  if [ -n "$P" ] && [ "$P" != "[]" ]; then
    printf '%s' "$P" > "$INBOX"
    O="$O" D="$D" B="$B" X="$X" HIT="$HIT" TL="$TL" BL="$BL" DOT="$DOT" \
      python3 - "$INBOX" <<'PY'
import os, sys, json
e = os.environ
O, D, B, X = e["O"], e["D"], e["B"], e["X"]
HIT, TL, BL, DOT = e["HIT"], e["TL"], e["BL"], e["DOT"]
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    data = []
n = len(data)
print(f"  {O}{HIT}{X} justify  {B}{DOT}  {n} task{'s' if n != 1 else ''} received{X}")
for t in data:
    sel = ""
    for ln in t.get("context", "").splitlines():
        if ln.startswith(("Selector:", "Element:")):
            sel = ln.split(":", 1)[1].strip()
            break
    print(f"  {O}{TL}{X} {t.get('prompt', '').strip()}")
    print(f"  {O}{BL}{X} {D}{t.get('id', '?')}   {sel}{X}")
PY
    exit 0
  fi
  sleep "$INTERVAL"
done

printf "  %s%s%s justify  %s%s  idle, no tasks   %s   %s%s\n" \
  "$D" "$IDLE" "$X" "$D" "$DOT" "$DOT" "$(stamp)" "$X"
exit 0
