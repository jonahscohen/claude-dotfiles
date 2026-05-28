---
name: team-reaper hook - auto-clean orphaned team records
description: SessionStart+SessionEnd hook that removes lingering ~/.claude/teams + ~/.claude/tasks records after team work finishes, never touching memory/beats
type: project
relates_to: [feedback_agent_worktree_isolation_unreliable.md, session_2026-05-28_task-queue-team-deploy.md]
---

Collaborator: Jonah. Built 2026-05-28 after the task-queue-0528 team left a phantom "open" workspace.

## Problem
Spawning teammates via the Agent tool leaves a team record at `~/.claude/teams/<name>/` + a task list at `~/.claude/tasks/<name>/`. These survive after every teammate terminates and show as a phantom open workspace in the cmux/FleetView UI. Worse: `TeamDelete` REFUSES to remove a team if any member is still marked "active" - which happens when a teammate wedges (API error) and never approves its shutdown. task-queue-0528's original `t0025-pyrepl` did exactly that, so TeamDelete failed ("Cannot cleanup team with 1 active member(s)") and I had to force-rm the dir. That zombie case is why a force-reaper is needed instead of relying on TeamDelete.

## Solution: claude/hooks/team-reaper.sh (SessionStart + SessionEnd)
bash + python3, mode via $1.
- **session-end mode**: reap teams whose `leadSessionId == session_id` (this session owned them, they are done) + age-GC any team older than TEAM_REAP_MAX_AGE_HOURS (default 12) for abandoned-team cleanup.
- **session-start mode**: reap teams NOT owned by the starting session that are idle (newest inbox mtime older than TEAM_REAP_IDLE_MINUTES, default 30) or older than MAX_AGE. Catches orphans left by a crashed/prior session promptly at the next start.
- Force-removes regardless of member "active" status (does what TeamDelete can't for zombies).
- Tunables: TEAM_REAP_MAX_AGE_HOURS, TEAM_REAP_IDLE_MINUTES, TEAM_REAP_DISABLE=1.

## Preserve-memory guarantee (hard rails in reap())
The hook ONLY touches `~/.claude/teams/<name>` and `~/.claude/tasks/<name>`. reap() enforces: team name must match `^[A-Za-z0-9._-]+$` (no `..`/`/`); target must be a direct child of the teams/tasks base (realpath dirname check); target path must contain `/.claude/teams/` or `/.claude/tasks/` AND must NOT be a memory path (`is_memory_path`: refuses anything containing `/memory` or ending `MEMORY.md`). So beats in `.claude/memory/` and `~/.claude/projects/*/memory/` are structurally untouchable. A regression test asserts this with a planted beat that survives a reap run.

## Why SessionEnd is the main trigger (limitation noted)
There is no harness event for "team work concluded" mid-session, so a team still lingers from when its tasks finish until the owning session ends. SessionEnd reaping guarantees no stale team survives INTO the next session (the actual recurring annoyance). SessionStart idle/age sweep is the belt-and-suspenders for crashes where SessionEnd never fired.

## Verification
- `claude/hooks/test-team-reaper.sh`: 10/10 pass (own-session reaped, fresh-other preserved, 20h age-GC, matching task dir reaped, session-start idle-reap, recent preserved, current-session kept, **memory beat + dir untouched**, TEAM_REAP_DISABLE respected). bash -n clean.
- settings.json valid JSON; team-reaper registered in SessionStart (session-start) + SessionEnd (session-end). `~/.claude/settings.json` is a symlink to the repo, so it is LIVE this session.
- install.sh: bash -n clean; added symlink + extended the cmux/teams python settings-merge to register both modes for merge-target machines.
- LIVE end-to-end through the installed `~/.claude/hooks/team-reaper.sh`: planted a throwaway orphan WITH a ghost member (mirroring the zombie that blocked TeamDelete), fired session-end with the matching session_id, hook logged "removed 1 orphan team(s): zz-reaper-livetest [owned-by-ending-session]" and removed both team + task dirs. Exit 0.

## Files
- NEW claude/hooks/team-reaper.sh, claude/hooks/test-team-reaper.sh
- MOD claude/settings.json (SessionStart + SessionEnd registration), install.sh (symlink + settings merge)
