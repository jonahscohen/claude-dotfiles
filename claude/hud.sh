#!/usr/bin/env bash
# claude/hud.sh - sidecoach live team monitoring pane (HUD)
#
# Closes OMC gap #3 (T-0021). A bash+python3 status loop that reads the
# active cmux team's config + inbox markers and prints a formatted status
# table on a refresh interval. Designed for terminal panes - no browser,
# no server, no node.
#
# USAGE:
#   bash ~/.claude/hud.sh
#
# Launch in a dedicated cmux terminal pane:
#   cmux open --type terminal --command 'bash ~/.claude/hud.sh'
# (the exact cmux subcommand depends on the installed cmux build; the
# script itself just needs an interactive TTY.)
#
# ENVIRONMENT VARIABLES:
#   HUD_REFRESH_MS   refresh interval in milliseconds (default 5000)
#   HUD_TEAMS_DIR    teams directory to scan (default ~/.claude/teams)
#   HUD_ONCE         if set to "1", render once and exit (for CI/tests)
#   HUD_NO_CLEAR     if set to "1", skip the screen clear between renders
#                    (useful when piping output to a file)
#
# EXIT CODES:
#   0  clean exit (Ctrl+C from terminal, SIGTERM via kill, or HUD_ONCE completion)
#   1  internal error (python3 missing, etc.)
#
# SIGNAL NOTES:
#   - Ctrl+C from the controlling terminal -> SIGINT -> trap -> exit 0
#   - SIGTERM (e.g. `kill <pid>` or cmux pane close) -> trap -> exit 0
#   - External `kill -INT <pid>` to a backgrounded HUD will NOT trigger the
#     SIGINT trap on macOS bash 3.2 (known limitation: non-interactive bash
#     ignores externally-delivered SIGINT). Use SIGTERM for programmatic
#     shutdown - it routes through the same cleanup path.
#
# DATA SOURCES (read-only):
#   $HUD_TEAMS_DIR/<team>/config.json    - team members + agent IDs + prompts
#   $HUD_TEAMS_DIR/<team>/inboxes/*.json - per-member message log
#   Task ownership: parsed from member.prompt regex "T-\d{4}".
#
# T-0021 / 2026-05-28

set -u

# --- Config + env ----------------------------------------------------------

HUD_REFRESH_MS="${HUD_REFRESH_MS:-5000}"
HUD_TEAMS_DIR="${HUD_TEAMS_DIR:-$HOME/.claude/teams}"
HUD_ONCE="${HUD_ONCE:-0}"
HUD_NO_CLEAR="${HUD_NO_CLEAR:-0}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found in PATH. The HUD requires python3." >&2
  exit 1
fi

# --- Signal handling -------------------------------------------------------

# SLEEP_PID tracks the background `sleep` child so the trap can kill it
# and unblock the foreground `wait`. Without this, bash 3.2 on macOS holds
# the signal until the foreground sleep finishes (often many seconds late).
SLEEP_PID=""

cleanup() {
  if [ -n "$SLEEP_PID" ]; then
    kill "$SLEEP_PID" 2>/dev/null || true
  fi
  if [ "$HUD_NO_CLEAR" != "1" ]; then
    printf '\033[2J\033[H'
  fi
  echo "HUD stopped"
  exit 0
}
trap cleanup INT TERM

# --- Renderer body (python3) ----------------------------------------------

render_once() {
  HUD_TEAMS_DIR="$HUD_TEAMS_DIR" HUD_REFRESH_MS="$HUD_REFRESH_MS" python3 - <<'PYEOF'
import json
import os
import re
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

TEAMS_DIR = Path(os.environ.get("HUD_TEAMS_DIR", str(Path.home() / ".claude" / "teams")))
REFRESH_MS = int(os.environ.get("HUD_REFRESH_MS", "5000"))

NOW = time.time()

# Task ownership pattern: T-0001..T-9999 (matches the sidecoach TASKS.md
# convention). First match in a member's prompt is treated as "their task".
TASK_RE = re.compile(r"\bT-\d{4}\b")

# Activity thresholds (seconds since last inbox write):
ACTIVE_WINDOW = 60      # < 60s -> active
IDLE_WINDOW   = 600     # 60s..10m -> working; >10m -> idle


def find_active_team():
    """Most recently modified team directory wins. Returns Path or None."""
    if not TEAMS_DIR.is_dir():
        return None
    candidates = []
    for entry in TEAMS_DIR.iterdir():
        if not entry.is_dir():
            continue
        config = entry / "config.json"
        if not config.is_file():
            continue
        # Use the team dir's own mtime (config.json updates touch it via
        # member joins, message writes propagate to inbox files but their
        # parent dir mtime is what we want).
        try:
            mtime = max(entry.stat().st_mtime, config.stat().st_mtime)
        except OSError:
            continue
        candidates.append((mtime, entry))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


def load_team(team_dir):
    """Return parsed team config, or None on read/parse error."""
    config = team_dir / "config.json"
    try:
        with config.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def load_inbox(team_dir, member_name):
    """Return (messages_list, mtime_or_None). Empty list if no inbox."""
    inbox = team_dir / "inboxes" / f"{member_name}.json"
    if not inbox.is_file():
        return ([], None)
    try:
        mtime = inbox.stat().st_mtime
        with inbox.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return ([], mtime)
        return (data, mtime)
    except (OSError, json.JSONDecodeError):
        return ([], None)


def fmt_age(ts):
    """Format seconds-since-epoch as a short relative age."""
    if ts is None:
        return "-"
    delta = max(0, NOW - ts)
    if delta < 60:
        return f"{int(delta)}s ago"
    if delta < 3600:
        return f"{int(delta // 60)}m ago"
    if delta < 86400:
        return f"{int(delta // 3600)}h ago"
    return f"{int(delta // 86400)}d ago"


def derive_state(member, inbox_mtime):
    """Return one of: stopped, active, working, idle, ready."""
    is_active = member.get("isActive", True)
    if is_active is False:
        return "stopped"
    # team-lead has no inbox of incoming messages from itself usually
    if inbox_mtime is None:
        return "ready"
    delta = NOW - inbox_mtime
    if delta < ACTIVE_WINDOW:
        return "active"
    if delta < IDLE_WINDOW:
        return "working"
    return "idle"


def extract_task(prompt):
    """Pull the first T-XXXX reference from a prompt blob."""
    if not prompt:
        return "-"
    m = TASK_RE.search(prompt)
    return m.group(0) if m else "-"


def parse_ts(ts_str):
    """Parse an ISO-8601 timestamp into epoch seconds; return None on failure."""
    if not isinstance(ts_str, str):
        return None
    try:
        # Python 3.11+ handles trailing Z; older versions need replace
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        return datetime.fromisoformat(ts_str).timestamp()
    except (ValueError, TypeError):
        return None


def gather_recent_messages(team_dir, members, limit=5):
    """Walk every inbox file, gather all messages with sender/recipient/ts/preview."""
    msgs = []
    inboxes_dir = team_dir / "inboxes"
    if not inboxes_dir.is_dir():
        return msgs
    member_names = {m.get("name") for m in members if m.get("name")}
    for inbox in inboxes_dir.glob("*.json"):
        recipient = inbox.stem
        if recipient not in member_names:
            continue
        try:
            with inbox.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, list):
            continue
        for entry in data:
            if not isinstance(entry, dict):
                continue
            ts = parse_ts(entry.get("timestamp"))
            text = entry.get("text", "")
            if not isinstance(text, str):
                text = str(text)
            preview = " ".join(text.split())[:40]
            sender = entry.get("from", "?")
            msgs.append((ts if ts is not None else 0.0, sender, recipient, preview))
    msgs.sort(reverse=True)
    return msgs[:limit]


def render(team_dir):
    team = load_team(team_dir)
    if team is None:
        print("=== sidecoach HUD - error: could not parse team config ===")
        return

    name = team.get("name", team_dir.name)
    members = team.get("members", []) or []
    n = len(members)
    ts_now = datetime.now().strftime("%H:%M:%S")

    print(f"=== sidecoach HUD - team: {name} ({n} member{'s' if n != 1 else ''}, last update: {ts_now}) ===")

    # Column widths (truncate names that exceed; pad otherwise)
    col_member  = 16
    col_state   = 9
    col_task    = 9
    col_activity = 12

    print(f"{'Member':<{col_member}} | {'State':<{col_state}} | {'Owns Task':<{col_task}} | Last Activity")
    print("-" * (col_member + col_state + col_task + col_activity + 9))

    idle_list = []
    for m in members:
        member_name = (m.get("name") or "?")[:col_member]
        inbox_msgs, inbox_mtime = load_inbox(team_dir, member_name)
        state = derive_state(m, inbox_mtime)
        task = extract_task(m.get("prompt", ""))
        # Last activity prefers inbox mtime; falls back to joinedAt epoch-ms
        if inbox_mtime is not None:
            activity = fmt_age(inbox_mtime)
        else:
            joined_ms = m.get("joinedAt")
            if isinstance(joined_ms, (int, float)) and joined_ms > 0:
                activity = fmt_age(joined_ms / 1000.0)
            else:
                activity = "-"
        if state == "idle":
            idle_list.append(member_name)
        print(f"{member_name:<{col_member}} | {state:<{col_state}} | {task:<{col_task}} | {activity}")

    recent = gather_recent_messages(team_dir, members, limit=5)
    print()
    print("=== Recent messages (last 5) ===")
    if not recent:
        print("(none yet)")
    else:
        for ts, sender, recipient, preview in recent:
            if ts > 0:
                hhmm = datetime.fromtimestamp(ts).strftime("%H:%M:%S")
            else:
                hhmm = "?"
            print(f"[{hhmm}] {sender} -> {recipient}: {preview}")

    print()
    if idle_list:
        print(f"=== Idle teammates: {', '.join(idle_list)} ===")
    else:
        print("=== Idle teammates: none ===")
    refresh_s = REFRESH_MS / 1000.0
    print(f"=== Refresh: every {refresh_s:g}s. Ctrl+C to quit. ===")


def main():
    team_dir = find_active_team()
    if team_dir is None:
        print("=== sidecoach HUD ===")
        print("No active team detected. Run TeamCreate first.")
        print(f"(scanned: {TEAMS_DIR})")
        return
    render(team_dir)


main()
PYEOF
}

# --- Main loop -------------------------------------------------------------

if [ "$HUD_ONCE" = "1" ]; then
  render_once
  exit 0
fi

while true; do
  if [ "$HUD_NO_CLEAR" != "1" ]; then
    printf '\033[2J\033[H'
  fi
  render_once
  # Convert ms to seconds with float precision.
  sleep_s=$(awk "BEGIN { printf \"%.3f\", $HUD_REFRESH_MS / 1000.0 }")
  # Background + wait so SIGINT/SIGTERM during the idle window can fire the
  # trap immediately (bash 3.2 on macOS holds signals until a foreground
  # `sleep` returns; `wait` is the documented interruptible counterpart).
  sleep "$sleep_s" &
  SLEEP_PID=$!
  wait "$SLEEP_PID" 2>/dev/null
  SLEEP_PID=""
done
