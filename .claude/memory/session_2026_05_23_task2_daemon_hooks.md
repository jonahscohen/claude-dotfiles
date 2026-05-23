---
name: Task 2 - Fix Daemon Hook Env Var Persistence Bug
description: Replaced env var approach with state file for Sidecoach daemon hooks - SessionStart/PostUserPromptSubmit/PostResponse
type: project
---

## Task: Fix Daemon Hook Env Var Persistence Bug

**Problem:** Three daemon hooks (SessionStart, PostUserPromptSubmit, Stop/PostResponse) shared state via env vars that don't persist between hook invocations. Each hook runs in a separate process with no shared environment.

**Solution:** Replace env var approach with a persistent state file at `~/.claude/.sidecoach-state` that all hooks read/write.

## Changes Made

### File: `claude/hooks/sidecoach-sessionstart.sh`
- Replaced env var exports with state file write
- Uses `nohup` to detach daemon from hook process (prevents trap from killing daemon on hook exit)
- Writes state file with: `ACTIVE=1`, `SESSION_ID`, `PIPE_PATH`, `SIDECOACH_ROOT`, `DAEMON_PID`
- Daemon now runs independently in background
- Removed trap cleanup (hooks are ephemeral; state file cleanup happens in PostResponse hook)

### File: `claude/hooks/sidecoach-postuserp.sh`
- Added state file source: `source "$STATE_FILE"`
- Checks `ACTIVE` flag and variables from state file instead of env vars
- Reads `PIPE_PATH` from state file to send utterance to daemon
- Works identically but with persistent state visibility

### File: `claude/hooks/sidecoach-postresponse.sh`
- Added state file source: `source "$STATE_FILE"`
- Reads `SESSION_ID` from state file to locate results directory
- Checks `ACTIVE` flag from state file
- Cleans up result files after injection
- Continues to work without trap/cleanup of its own

## Verification

**Smoke test results:**
1. SessionStart hook creates state file with all required fields ✓
   - `ACTIVE=1` ✓
   - `SESSION_ID` populated ✓
   - `PIPE_PATH` created ✓
   - `SIDECOACH_ROOT` set ✓
   - `DAEMON_PID` captured ✓
   - Daemon process running independently ✓

2. Named pipe persists and accepts writes ✓

3. PostUserPromptSubmit hook reads state and executes ✓

4. PostResponse hook reads state, injects results, cleans up ✓
   - Proper injection format: `[Sidecoach: flow-name]\nMessage\n  - Item 1\n  - Item 2` ✓
   - Result file cleaned up after processing ✓

## Key Insight

Original design had hooks setting env vars expecting children to inherit them. Bash hooks run in isolated processes - each gets a fresh environment with no access to parent's exports. The state file approach solves this by treating env state as persistent file-backed storage that's readable by any process in the session.

## Files Modified
- `claude/hooks/sidecoach-sessionstart.sh`
- `claude/hooks/sidecoach-postuserp.sh`
- `claude/hooks/sidecoach-postresponse.sh`
