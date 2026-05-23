---
name: Sidecoach install.sh block code review
description: Pattern consistency, safety, robustness, clarity analysis of sidecoach installation block
type: project
---

## Review Summary
**Status:** PASS - Production ready. Block follows conventions, is safe and robust.

---

## 1. Pattern Consistency

### Logging & Error Handling (PASS)
- Uses `log`, `warn`, `ok` functions consistent with improv, voice-input, voice-output blocks
- npm build failure gracefully degrades with `|| warn` and manual recovery instruction
- Hook wiring script failure also handled with `|| warn` and fallback instruction
- Pattern matches voice-output's npm dependency installation (line ~1905)

### Path Construction (PASS)
- All paths properly quoted: `"$REPO_DIR"`, `"$HOME"`, `"$hook"`
- Uses `$HOME` consistently (not hardcoded `/Users/spare3`)
- Uses `$REPO_DIR` variable established at script start
- No unquoted variable expansion

### Directory/Symlink Handling (PASS)
- `mkdir -p "$HOME/.claude/skills/sidecoach"` creates directory safely (idempotent)
- `ln -sf` uses safe overwrite flag (matches voice-output pattern)
- Symlinks created in loop for 3 hooks with consistent naming
- Skill SKILL.md symlink created with -sf flag (safe)

### Comparison to Other Blocks
- **Improv** (line 2208): delegates to subshell script `bash "$REPO_DIR/improv/install.sh"` - less invasive
- **voice-input** (line 1869): uses brew with command -v checks for idempotence
- **voice-output** (line 1905): npm install with silent flag, good error handling with fallback message
- **Sidecoach**: follows voice-output's npm pattern exactly + adds hook wiring (appropriate complexity level)

---

## 2. Safety & Robustness

### npm Build (PASS)
- Silent output: `npm install --silent` prevents noise
- Chained with `&&` so build only runs if install succeeds
- Pipe failure handling: `|| warn "Sidecoach build failed - run 'cd sidecoach && npm run build' manually"`
- User gets actionable recovery instruction if build fails

### Symlinks (PASS)
- `ln -sf` safely overwrites existing symlinks without breaking things
- Loop handles all 3 hooks consistently
- `chmod +x` applied to each hook to ensure executability (critical for bash scripts)
- Paths verified: `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-*.sh` all exist and are executable

### Hook Registration (PASS)
- Node.js script parses settings.json with proper error handling
- `JSON.parse` / `writeFileSync` wrapped in try-catch equivalent (via `|| warn`)
- Idempotency check: `s.hooks[event].some(h => (h.hooks||[]).some(x => x.command && x.command.includes('sidecoach')))` prevents duplicate hook registration
- Verified: all 3 hooks (SessionStart, UserPromptSubmit, Stop) are correctly wired in settings.json
- Verified: hooks are registered with correct paths and event names

### State File Handling (PASS)
- sessionstart.sh creates named pipe with cleanup: `[[ -p "$PIPE_PATH" ]] && rm "$PIPE_PATH"`
- Daemon runs detached with `nohup ... &` so hook exit doesn't kill daemon
- State file written with proper variable substitution (using `<<'EOF'` heredoc to avoid premature expansion)
- postuserp.sh and postresponse.sh both check state file exists before proceeding
- Graceful degradation: `exit 0` on all error paths (doesn't break the session)

---

## 3. Clarity & Maintainability

### Hook Script Readability (PASS)
- Each hook has clear single-line purpose comment
- sessionstart.sh (40 lines): clear daemon startup logic, pipe creation, state persistence
- postuserp.sh (17 lines): reads utterance, serializes to JSON, sends to daemon pipe
- postresponse.sh (27 lines): reads result file, formats output, cleans up

### Lack of Magic Numbers (PASS)
- No hardcoded timeouts except explicit `timeout 1` in postuserp.sh (documented, reasonable for pipe write)
- All paths use meaningful variable names: `$SESSION_ID`, `$PIPE_PATH`, `$STATE_FILE`, `$SIDECOACH_ROOT`
- Named constants for files: `STATE_FILE="$HOME/.claude/.sidecoach-state"` is clear
- Logging output in postresponse.sh is human-readable: `[Sidecoach: <flow-name>]\n<message>\n<guidance>`

### Node.js Script (PASS)
- Inline Node.js for hook wiring is appropriate (parsing JSON, checking duplicates, writing back)
- Readable structure: define `addHook` function, then call it 3 times
- Error messages helpful: tells user to "check settings.json manually" if wiring fails
- Alternative: could be extracted to separate file, but inline keeps install.sh self-contained (acceptable for this scope)

---

## 4. Completeness

### All 3 Hooks Handled (PASS)
- `sidecoach-sessionstart.sh` - SessionStart event ✓
- `sidecoach-postuserp.sh` - UserPromptSubmit event ✓
- `sidecoach-postresponse.sh` - Stop event ✓
- Loop properly iterates over all 3: `for hook in sidecoach-sessionstart.sh sidecoach-postuserp.sh sidecoach-postresponse.sh; do`
- All 3 hooks exist in source directory
- All 3 are symlinked to `$HOME/.claude/hooks/`
- All 3 chmod +x applied

### All 3 Events Registered (PASS)
- SessionStart: `addHook('SessionStart', ...)` ✓
- UserPromptSubmit: `addHook('UserPromptSubmit', ...)` ✓
- Stop: `addHook('Stop', ...)` ✓
- Verified in settings.json: all 3 events have corresponding hook entries
- Idempotency: duplicate check prevents double-registration on re-run

### SKILL.md Symlinked (PASS)
- Line 2233-2234: `ln -sf "$REPO_DIR/claude/skills/sidecoach/SKILL.md" "$HOME/.claude/skills/sidecoach/SKILL.md"`
- Verified: symlink exists and points to correct file
- Not just mentioned in comment - actually symlinked with -sf flag

### Error Messages (PASS)
- npm build failure: "Sidecoach build failed - run 'cd sidecoach && npm run build' manually" - tells user exact recovery command
- Hook wiring failure: "Could not wire Sidecoach hooks - check settings.json manually" - directs to config file
- Both provide actionable next steps

---

## Issues Found: NONE

No critical, high, medium, or low severity issues detected.

---

## Strengths

1. **Defensive programming**: All error paths exit gracefully (exit 0), preventing cascade failures
2. **Idempotent**: Can re-run install multiple times without breaking state
3. **Consistent with codebase**: Logging, error handling, path construction all match existing patterns
4. **Clear recovery path**: Users have manual commands to fix any failure
5. **Proper daemon isolation**: daemon runs detached so hook exit doesn't kill it
6. **State persistence**: session state file enables cross-hook communication

---

## Production Readiness: YES

- All 3 hooks wired correctly
- All 3 events registered in settings.json
- Error handling comprehensive
- No safety issues
- Patterns consistent with rest of codebase
- Ready for deployment
