#!/usr/bin/env bash
# justify-done - send a result back to the Justify browser and clear the queue,
# printing a clean confirmation card instead of raw curl /respond + /prompts/clear.
#
# Usage:  justify-done <promptId> <summary> [comma,separated,files]
# Env:
#   JUSTIFY_STATUS   completed | needsInfo   (default completed)
#   JUSTIFY_CHANGES  JSON array of {selector,property,oldValue,newValue} (default [])
#   JUSTIFY_PORT     daemon port (default 9223)
#   NO_COLOR         disable color
set -uo pipefail

PID="${1:-}"
SUMMARY="${2:-}"
FILES="${3:-}"
if [ -z "$PID" ] || [ -z "$SUMMARY" ]; then
  echo "usage: justify-done <promptId> <summary> [comma,separated,files]" >&2
  exit 1
fi

if [ -z "${NO_COLOR:-}" ]; then
  O=$'\033[38;5;209m'; D=$'\033[38;5;245m'; B=$'\033[1m'; X=$'\033[0m'
else
  O='' ; D='' ; B='' ; X=''
fi
CHK=$'✓'; TL=$'┌'; BL=$'└'; DOT=$'·'

PORT="${JUSTIFY_PORT:-9223}" PID="$PID" SUMMARY="$SUMMARY" FILES="$FILES" \
STATUS="${JUSTIFY_STATUS:-completed}" CHANGES="${JUSTIFY_CHANGES:-[]}" \
O="$O" D="$D" B="$B" X="$X" CHK="$CHK" TL="$TL" BL="$BL" DOT="$DOT" python3 <<'PY'
import os, json, urllib.request
e = os.environ
base = f"http://localhost:{e['PORT']}"
files = [f.strip() for f in e.get("FILES", "").split(",") if f.strip()]
try:
    changes = json.loads(e.get("CHANGES") or "[]")
except Exception:
    changes = []
body = json.dumps({
    "promptId": e["PID"], "summary": e["SUMMARY"], "filesChanged": files,
    "changes": changes, "status": e["STATUS"],
}).encode()

def post(path, data=b""):
    req = urllib.request.Request(base + path, data=data,
                                 headers={"Content-Type": "application/json"}, method="POST")
    return urllib.request.urlopen(req, timeout=5).read()

O, D, B, X = e["O"], e["D"], e["B"], e["X"]
CHK, TL, BL, DOT = e["CHK"], e["TL"], e["BL"], e["DOT"]
try:
    post("/respond", body)
    post("/prompts/clear", b"")
    print(f"  {O}{CHK}{X} justify  {B}{DOT}  sent to browser{X}")
    print(f"  {O}{TL}{X} {e['SUMMARY']}")
    tail = ", ".join(files) if files else "no files changed"
    print(f"  {O}{BL}{X} {D}{tail}{X}")
except Exception as ex:
    print(f"  {O}{CHK}{X} justify  {B}{DOT}  respond FAILED{X}")
    print(f"  {O}{BL}{X} {D}{ex}{X}")
    raise SystemExit(1)
PY
