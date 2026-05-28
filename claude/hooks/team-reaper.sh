#!/bin/bash
# SessionStart + SessionEnd hook: reap orphaned cmux/agent team records so they
# do not linger in the FleetView/cmux UI after team work finishes.
#
# WHY: spawning teammates via the Agent tool (with or without worktree
# isolation) leaves a team record at ~/.claude/teams/<name>/ and a task list at
# ~/.claude/tasks/<name>/. These survive after every teammate terminates - and
# TeamDelete REFUSES to remove a team if any member is still marked "active",
# which happens when a teammate wedges (e.g. an API error) and never approves
# its shutdown. Those orphans accumulate and show as phantom "open" workspaces.
# This reaper force-removes them; it does not depend on member status.
#
# WHAT IT TOUCHES: ONLY ~/.claude/teams/<name> and ~/.claude/tasks/<name>.
# It NEVER touches anything under a memory/ path - session beats are sacred and
# live in .claude/memory/ and ~/.claude/projects/*/memory/, which this hook
# refuses to delete (hard guard in reap()). "Preserve memory, clean up teams."
#
# Reap rules:
#   session-end mode  : reap teams whose leadSessionId == the ending session_id
#                       (this session owned them, they are done), PLUS any team
#                       older than MAX_AGE_HOURS (abandoned-team GC).
#   session-start mode: reap teams NOT owned by the current session that are
#                       idle (newest inbox mtime older than IDLE_MINUTES) or
#                       older than MAX_AGE_HOURS. Catches orphans left by a
#                       crashed/prior session, promptly, at the next start.
#
# Tunables (env): TEAM_REAP_MAX_AGE_HOURS (default 12),
#                 TEAM_REAP_IDLE_MINUTES   (default 30),
#                 TEAM_REAP_DISABLE=1 to disable entirely.
#
# Mode comes from $1 ("session-end" | "session-start"); falls back to the
# payload's hook_event_name.

MODE="${1:-}"
INPUT=$(cat)

[ "${TEAM_REAP_DISABLE:-}" = "1" ] && { echo "{}"; exit 0; }

printf '%s' "$INPUT" | MODE="$MODE" python3 -c '
import json, sys, os, time, shutil

MAX_AGE_HOURS = float(os.environ.get("TEAM_REAP_MAX_AGE_HOURS", "12"))
IDLE_MINUTES  = float(os.environ.get("TEAM_REAP_IDLE_MINUTES", "30"))

try:
    data = json.load(sys.stdin)
except Exception:
    print("{}"); sys.exit(0)

mode = os.environ.get("MODE") or ""
if not mode:
    ev = data.get("hook_event_name", "")
    mode = "session-end" if ev == "SessionEnd" else "session-start"

session_id = data.get("session_id", "") or ""
home = os.path.expanduser("~")
teams_dir = os.path.join(home, ".claude", "teams")
tasks_dir = os.path.join(home, ".claude", "tasks")

if not os.path.isdir(teams_dir):
    print("{}"); sys.exit(0)

SAFE = __import__("re").compile(r"^[A-Za-z0-9._-]+$")

def is_memory_path(p):
    # Hard guard: never let this reaper touch a beats/memory location.
    low = p.replace("\\", "/")
    return "/memory" in low or low.rstrip("/").endswith("MEMORY.md")

def reap(name):
    """Force-remove a team dir + its task dir. Returns True if anything went."""
    if not name or name in (".", "..") or not SAFE.match(name):
        return False
    removed = False
    for base in (teams_dir, tasks_dir):
        target = os.path.join(base, name)
        # Must be a direct child of the intended base, and never a memory path.
        rp = os.path.realpath(target)
        if os.path.dirname(rp) != os.path.realpath(base):
            continue
        # Hard rails: must live under .claude/teams or .claude/tasks, and must
        # never be a memory/beats path. Refuse anything else outright.
        rp_slash = rp + "/"
        in_team_or_task = ("/.claude/teams/" in rp_slash) or ("/.claude/tasks/" in rp_slash)
        if is_memory_path(rp) or not in_team_or_task:
            continue
        if os.path.isdir(target):
            try:
                shutil.rmtree(target)
                removed = True
            except Exception as e:
                sys.stderr.write("team-reaper: failed to remove %s: %s\n" % (target, e))
    return removed

def newest_inbox_mtime(team_path):
    inbox = os.path.join(team_path, "inboxes")
    newest = 0.0
    try:
        for f in os.listdir(inbox):
            try:
                newest = max(newest, os.path.getmtime(os.path.join(inbox, f)))
            except OSError:
                pass
    except OSError:
        pass
    # Fall back to the config mtime if no inboxes.
    if newest == 0.0:
        try:
            newest = os.path.getmtime(os.path.join(team_path, "config.json"))
        except OSError:
            newest = 0.0
    return newest

now = time.time()
reaped = []
for name in os.listdir(teams_dir):
    team_path = os.path.join(teams_dir, name)
    cfg_path = os.path.join(team_path, "config.json")
    if not os.path.isfile(cfg_path):
        continue
    try:
        cfg = json.load(open(cfg_path))
    except Exception:
        cfg = {}

    lead = cfg.get("leadSessionId", "") or ""
    created_ms = cfg.get("createdAt", 0) or 0
    age_h = (now - created_ms / 1000.0) / 3600.0 if created_ms else 0.0

    should = False
    reason = ""
    if mode == "session-end":
        if session_id and lead == session_id:
            should, reason = True, "owned-by-ending-session"
        elif created_ms and age_h >= MAX_AGE_HOURS:
            should, reason = True, "age-gc(%.1fh)" % age_h
    else:  # session-start
        if session_id and lead == session_id:
            should = False  # do not reap a team the brand-new session just adopted
        elif created_ms and age_h >= MAX_AGE_HOURS:
            should, reason = True, "age-gc(%.1fh)" % age_h
        else:
            idle_min = (now - newest_inbox_mtime(team_path)) / 60.0
            if idle_min >= IDLE_MINUTES:
                should, reason = True, "idle(%.0fm)" % idle_min

    if should and reap(name):
        reaped.append("%s [%s]" % (name, reason))

if reaped:
    sys.stderr.write("team-reaper(%s): removed %d orphan team(s): %s\n" % (mode, len(reaped), ", ".join(reaped)))

print("{}")
'
