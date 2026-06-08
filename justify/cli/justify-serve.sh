#!/usr/bin/env bash
# justify-serve - ensure the Justify server runs as a PERSISTENT background
# daemon, decoupled from any Claude session's MCP lifecycle. This is the fix for
# "Justify vanished when the session ended": the server no longer dies with a
# session. It serves 9223 (ws + http: justify-core.js, /prompts, /respond,
# /activate, /status) and 9224 (https, for https-only sites).
#
# Idempotent: if Justify already answers on :9223, does nothing. Otherwise starts
# it with nohup and waits until it responds. Run it from /justify (and anytime
# you want Justify up).
set -euo pipefail

SERVER="${JUSTIFY_SERVER:-$HOME/.claude/justify/dist/server/index.js}"
LOG="${JUSTIFY_LOG:-$HOME/.claude/justify/daemon.log}"

if curl -s -o /dev/null -m 2 "http://localhost:9223/status" 2>/dev/null; then
  echo "justify daemon already running on :9223"
  exit 0
fi

if [ ! -f "$SERVER" ]; then
  echo "ERROR: justify server not built at $SERVER - run justify/install.sh first." >&2
  exit 1
fi

mkdir -p "$(dirname "$LOG")"
nohup node "$SERVER" > "$LOG" 2>&1 &
PID=$!

for _ in $(seq 1 20); do
  if curl -s -o /dev/null -m 1 "http://localhost:9223/status" 2>/dev/null; then
    echo "justify daemon started (pid $PID) on :9223 (http) / :9224 (https)"
    exit 0
  fi
  sleep 0.3
done

echo "ERROR: justify daemon did not come up within ~6s; see $LOG" >&2
tail -5 "$LOG" 2>/dev/null || true
exit 1
