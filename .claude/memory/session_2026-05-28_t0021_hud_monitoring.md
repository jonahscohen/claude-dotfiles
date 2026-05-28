---
name: T-0021 HUD monitoring pane
description: bash + python3 live team-state status loop reading ~/.claude/teams/<team>/ - closes OMC gap #3
type: project
relates_to: [session_2026-05-28_sidecoach.md]
---

# T-0021 HUD monitoring pane shipped

Closes OMC gap #3: sidecoach had team primitives (TeamCreate, SendMessage,
member configs, inbox files) but no aggregated monitoring surface. OMC ships
this via `cmux omc --watch` -> a statusline renderer with mission-board,
agents, todos, skills, rate-limits, etc. (`src/hud/`, 16+ files, ~100KB).

This session shipped the lean v1 equivalent for sidecoach.

## What landed

**`claude/hud.sh`** (10KB bash + inline python3) - the renderer itself.

**`claude/test-hud.sh`** (8KB bash) - 33-assertion test suite.

**`install.sh`** - new `make_symlink` call under the `config` component,
symlinks `claude/hud.sh -> ~/.claude/hud.sh` (mirrors the `transcribe.sh`
pattern, lives in `~/.claude/` so `bash ~/.claude/hud.sh` works from any
cwd).

**`TASKS.md`** - T-0021 entry added, Last ID bumped (parallel teammates also
bumped to T-0026; my T-0021 sits in the Active list as DONE).

## Why this design

**Option A vs B decision.** Choice A (bash + python3 text pane) over B
(node + SSE + browser pane).

Reasoning:
- cmux is text-native. A status loop renders instantly in any pane with
  zero install cost.
- OMC's own HUD is a terminal renderer, not HTML - the matching idiom is
  text in a pane.
- B would add: node process lifecycle, port binding (conflicts on multi-
  project setups), browser pane just to display what `column` already
  shows fine. Save B for a later "rich HUD" task if needed.

**Architecture details.**
- Active team selection: most-recently-modified `~/.claude/teams/*` dir
  by `max(dir.mtime, config.mtime)`. Single-team installs trivially pass;
  multi-team installs land on whichever team last had member joins or
  config writes.
- State derivation: `isActive:false` -> stopped, inbox mtime <60s ->
  active, 60s-10m -> working, >10m -> idle, no inbox -> ready. Five
  states; clear thresholds in module constants for future tuning.
- Task ownership: regex `\bT-\d{4}\b` first match on `member.prompt`.
  The brief assumed `~/.claude/tasks/<team>/*.json` for ownership data;
  reality is `~/.claude/tasks/<session-uuid>/*.json` (session-scoped, not
  team-scoped), and the task subject lives in JSON file id not prompt.
  Prompt-regex is cleaner: canonical, already populated at TeamCreate
  time, no cross-reference needed.
- Activity: inbox file mtime (falls back to joinedAt for never-messaged
  members). Inbox mtime updates whenever SendMessage writes - that is
  the cleanest "last seen" proxy without monkeying with cmux internals.
- Recent messages: walk all inbox files, gather all entries with parsable
  timestamps, sort desc, take top 5. Each entry rendered as
  `[HH:MM:SS] sender -> recipient: <40-char preview>`. Preview collapses
  whitespace runs and truncates by character count, not byte count, so
  multi-byte content does not corrupt the table.
- Env vars: `HUD_REFRESH_MS` (default 5000), `HUD_TEAMS_DIR` (default
  `~/.claude/teams`), `HUD_ONCE=1` (single-shot for CI/tests),
  `HUD_NO_CLEAR=1` (skip screen-clear when piping to file). The env
  surface keeps tests fast (HUD_ONCE) and clean (HUD_NO_CLEAR avoids
  CSI sequences ending up in log files).

## Quirks logged

**bash 3.2 macOS SIGINT swallow.** External `kill -INT <pid>` to a
non-interactive bash 3.2 process is ignored by the kernel/bash even when
a trap is installed. SIGTERM works fine. Ctrl+C from a controlling tty
works fine (that path goes through the tty driver's foreground-process-
group dispatch). Programmatic `kill -INT` to a backgrounded HUD does
NOT trigger the trap.

Documented in the script header. SIGTERM is the canonical programmatic
shutdown signal; user-facing path is Ctrl+C which works as expected.

**Loop pattern: `sleep & wait` not foreground `sleep`.** Bash 3.2 holds
queued signals until the foreground command (sleep) returns. Backgrounding
sleep and waiting on its PID makes the wait interruptible by SIGTERM, so
the trap fires within ~50ms of signal delivery rather than at the next
loop iteration. Cleanup also kills the SLEEP_PID child before exit so
no orphan sleeps survive.

## Tests - 33/33 PASS

Scenarios:
1. No active team -> "No active team detected" message (3 asserts)
2. Active team with members + tasks, no messages -> headers + member
   table + task ownership + default refresh interval (10 asserts)
3. Active team with inbox messages -> messages rendered with direction
   + preview, no empty placeholder (6 asserts)
4. Idle teammate detection -> Idle list populated when inbox is stale
   (2 asserts)
5. State derivation -> `isActive:false` renders as "stopped" (1 assert)
6. SIGTERM handling -> exit 0 with "HUD stopped" (2 asserts)
7. SIGINT trap installed -> static grep of trap line + exit 0 path
   (2 asserts; runtime SIGINT can't be tested without a PTY harness)
8. Malformed inbox JSON -> graceful degradation, no crash (3 asserts)
9. HUD_REFRESH_MS customization -> integer + fractional formatting
   (2 asserts)
10. Multi-team most-recently-modified selection -> picks newest, ignores
    older (2 asserts)

Tests run via temp fixture dirs (`mktemp -d`); the real `~/.claude/teams/`
is never touched.

## Smoke transcript - live team

Ran against the active `omc-gap-close` team (7 members) at 10:41:01:

```
=== sidecoach HUD - team: omc-gap-close (7 members, last update: 10:41:01) ===
Member           | State     | Owns Task | Last Activity
-------------------------------------------------------
team-lead        | working   | -         | 2m ago
p1-preamble      | stopped   | T-0019    | 19m ago
p2-ralph         | stopped   | T-0020    | 19m ago
p3-hud           | idle      | T-0021    | 18m ago
p4-mcp-tools     | idle      | T-0022    | 11m ago
p5-deep-intervie | stopped   | T-0023    | 17m ago
p6-subagent-gap  | stopped   | T-0024    | 17m ago

=== Recent messages (last 5) ===
[10:38:46] p5-deep-interview -> team-lead: {"type":"idle_notification","from":"p5-d
[10:38:36] p5-deep-interview -> team-lead: T-0023 DONE. Closed OMC gap #5 by enhanc
[10:34:07] p2-ralph -> team-lead: {"type":"idle_notification","from":"p2-r
[10:34:02] p2-ralph -> team-lead: T-0020 shipped. Summary, log sample, tes
[10:30:14] p4-mcp-tools -> team-lead: {"type":"idle_notification","from":"p4-m
```

Every column behaves: states match per-teammate liveness, T-XXXX ownership
extracted correctly from prompts, message previews respect the 40-char
cap, idle list correctly excludes the stopped/working members.

## Why this matters

The HUD is the missing visibility layer. Before this, "what is the team
doing right now?" required walking config.json, inbox files, and TASKS.md
by hand. Now it's one command in a cmux pane.

This also closes the OMC parity gap for monitoring without adopting OMC's
heavy statusline-renderer machinery - the v1 hits the use case in ~600
lines of bash+python instead of ~3000 lines of TS modules.

## Files touched

- `claude/hud.sh` - new (10KB)
- `claude/test-hud.sh` - new (8KB)
- `install.sh` - added 5-line block under `config` component to symlink
  `claude/hud.sh -> ~/.claude/hud.sh`
- `TASKS.md` - T-0021 entry (filed Active, marked DONE same session)
- `~/.claude/hud.sh` - symlink created manually for current-session use
  (also created at install time when users re-run install.sh)
