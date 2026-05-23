---
name: Hook security and robustness fixes (2026-05-23)
description: Fixed 5 issues in sidecoach hooks - shell quoting, variable expansion, timeout protection
type: project
---

All 5 code-review findings fixed in three sidecoach hooks:

**sidecoach-sessionstart.sh**
- Line 17-18: Added pipe cleanup before mkfifo (`[[ -p "$PIPE_PATH" ]] && rm "$PIPE_PATH"`) - prevents stale pipe errors and improves error handling
- Line 29: Changed `<<EOF` to `<<'EOF'` - prevents variable expansion at write time, preserves literal `$SESSION_ID`, `$PIPE_PATH`, etc. in state file for later sourcing

**sidecoach-postresponse.sh**
- Lines 16-24: Fixed unquoted filename in JavaScript - changed direct `$LATEST` path to `LATEST_FILE="$LATEST" node -e ... process.env.LATEST_FILE` to safely handle filenames with quotes/spaces
- Line 26: Removed trailing blank line - file now ends cleanly at exit 0

**sidecoach-postuserp.sh**
- Line 14: Fixed pipe write blocking - changed `echo "$PAYLOAD" > "$PIPE_PATH" &` to `timeout 1 bash -c "echo '$PAYLOAD' > '$PIPE_PATH'" 2>/dev/null` to prevent indefinite blocking if daemon isn't reading

**Verification**
- Quoted heredoc test passed - variables remain as literal strings in file, sourced correctly later
- All three files compile without syntax errors
- State file sourcing tested and working

**Files touched**
- claude/hooks/sidecoach-sessionstart.sh
- claude/hooks/sidecoach-postresponse.sh
- claude/hooks/sidecoach-postuserp.sh

**Commit**
fix: security and robustness improvements in sidecoach hooks
