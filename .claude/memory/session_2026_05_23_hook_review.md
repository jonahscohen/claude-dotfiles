---
name: Shell hook review - Sidecoach daemon env var persistence
description: Code quality review of three rewritten hooks for safety, correctness, best practices
type: project
---

## Review Summary

Reviewed three rewritten hooks for Sidecoach daemon env var persistence:
- `sidecoach-sessionstart.sh` - starts daemon and writes state file
- `sidecoach-postuserp.sh` - sends utterance to daemon via named pipe
- `sidecoach-postresponse.sh` - injects daemon results into response

All three hooks passed syntax validation (`bash -n`). Node.js code snippets are valid.

## Issues Found

### CRITICAL: sidecoach-sessionstart.sh - Unquoted variable expansion in state file

**File:** `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-sessionstart.sh`
**Lines:** 28-34
**Severity:** Critical (state corruption / variable expansion failure)

```bash
cat > "$STATE_FILE" <<EOF
ACTIVE=1
SESSION_ID=$SESSION_ID
PIPE_PATH=$PIPE_PATH
SIDECOACH_ROOT=$SIDECOACH_ROOT
DAEMON_PID=$DAEMON_PID
EOF
```

**Problem:** Variables are unquoted in the heredoc. With unquoted heredoc (`<<EOF` not `<<'EOF'`), bash expands `$SESSION_ID` and similar at write time. If any of these variables contain special characters, spaces, or newlines, the state file becomes corrupted and unsourceable.

**Example:** If `SESSION_ID` contains a space or embedded quote, the state file becomes invalid shell:
```
SESSION_ID=123456789-1234 5   # ← space breaks when sourced later
```

**Fix:** Use quoted heredoc to prevent expansion during write:
```bash
cat > "$STATE_FILE" <<'EOF'
ACTIVE=1
SESSION_ID=$SESSION_ID
PIPE_PATH=$PIPE_PATH
SIDECOACH_ROOT=$SIDECOACH_ROOT
DAEMON_PID=$DAEMON_PID
EOF
```

Now variables are written literally and will be expanded when `source "$STATE_FILE"` is called in postuserp and postresponse hooks.

---

### HIGH: sidecoach-postresponse.sh - Unquoted variable in Node.js template

**File:** `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-postresponse.sh`
**Line:** 18, 23
**Severity:** High (file path injection / race condition risk)

```bash
node -e "
  const fs = require('fs');
  const result = JSON.parse(fs.readFileSync('$LATEST', 'utf8'));
  ...
  fs.unlinkSync('$LATEST');
" 2>/dev/null
```

**Problem:** `$LATEST` is a file path obtained from `ls` output (line 13) and embedded unquoted into a Node.js string literal. If the filename contains special characters or quotes, it breaks Node.js syntax.

**Example:** If a result file is named `result-O'malley.json`, the code becomes:
```javascript
fs.readFileSync('result-O'malley.json', 'utf8')
```
This is a syntax error. Also, an attacker could craft a filename with JavaScript code.

**Fix:** Quote the variable in the shell script:
```bash
node -e "
  const fs = require('fs');
  const result = JSON.parse(fs.readFileSync('$LATEST', 'utf8'));
  ...
  fs.unlinkSync('$LATEST');
" 2>/dev/null
```

Actually, better: use JSON.stringify to properly escape the path:
```bash
node -e "
  const fs = require('fs');
  const latestPath = $( node -e "console.log(JSON.stringify('$LATEST'))" );
  const result = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  ...
  fs.unlinkSync(latestPath);
" 2>/dev/null
```

Or simpler: pass the path as an env var:
```bash
LATEST_PATH="$LATEST" node -e "
  const fs = require('fs');
  const result = JSON.parse(fs.readFileSync(process.env.LATEST_PATH, 'utf8'));
  ...
  fs.unlinkSync(process.env.LATEST_PATH);
" 2>/dev/null
```

---

### MEDIUM: sidecoach-postuserp.sh - Piped write to named pipe not backgrounded

**File:** `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-postuserp.sh`
**Line:** 14
**Severity:** Medium (potential hook hang if pipe is blocked)

```bash
PAYLOAD=$(node -e "process.stdout.write(...)" "$UTTERANCE" 2>/dev/null)
echo "$PAYLOAD" > "$PIPE_PATH" &
```

**Problem:** The `echo` write to the named pipe is backgrounded with `&`, but if the daemon is not reading from the pipe, this will block until the pipe has a reader. The `&` backgrounding may prevent the hook from returning cleanly if the write hangs. Also, the hook exits before confirming the write succeeded.

**Fix:** Either:
1. Add a timeout to prevent indefinite blocking:
```bash
timeout 1 bash -c "echo '$PAYLOAD' > '$PIPE_PATH'" 2>/dev/null
```

2. Or explicitly background and suppress output:
```bash
echo "$PAYLOAD" > "$PIPE_PATH" 2>/dev/null &
```

3. Or use a non-blocking write pattern via `strace` or `dd`, but the timeout approach is simplest.

---

### MEDIUM: sidecoach-sessionstart.sh - mkfifo exits silently on error

**File:** `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-sessionstart.sh`
**Line:** 17
**Severity:** Medium (obscures real failure modes)

```bash
mkfifo "$PIPE_PATH" 2>/dev/null || exit 0
```

**Problem:** If mkfifo fails for reasons other than "file exists" (permissions, disk full, /tmp full), the hook silently exits 0. This masks real errors. The daemon starts but has no pipe to read from.

**Fix:** Distinguish between "file exists" (safe) and other errors:
```bash
mkfifo "$PIPE_PATH" 2>/dev/null
if [[ $? -ne 0 ]]; then
  # If it failed and the file doesn't exist, something is wrong
  if [[ ! -p "$PIPE_PATH" ]]; then
    exit 0  # Pipe doesn't exist - exit cleanly
  fi
fi
```

Or simpler: just check if it's already a pipe, remove it, and retry:
```bash
[[ -p "$PIPE_PATH" ]] && rm "$PIPE_PATH"
mkfifo "$PIPE_PATH" || exit 0
```

---

### LOW: sidecoach-postresponse.sh - Trailing blank line

**File:** `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-postresponse.sh`
**Line:** 27 (after line 26)
**Severity:** Low (style, no impact)

**Problem:** Line 27 is blank. Standard practice is no trailing blank lines in shell scripts.

**Fix:** Remove the blank line at EOF.

---

## Verification Checklist

**Syntax checks:**
- [x] `bash -n` passes all three scripts
- [x] No shell syntax errors

**Variable quoting:**
- [x] sessionstart: Variables quoted in shell context `"$VAR"`
- [ ] sessionstart: Variables in heredoc UNQUOTED - CRITICAL ISSUE
- [x] postuserp: Variables quoted in shell context
- [ ] postresponse: Variables in Node.js context UNQUOTED - HIGH ISSUE

**Error handling:**
- [x] sessionstart: dist check and mkfifo errors suppress silently (acceptable for hooks)
- [x] postuserp: state file missing check returns cleanly
- [ ] postresponse: Node.js variable injection lacks escaping - HIGH RISK

**State file operations:**
- [ ] sessionstart: State file write uses unquoted heredoc - CRITICAL
- [x] postuserp: State file read guarded with existence check
- [x] postresponse: State file read guarded with existence check

**Daemon operations:**
- [x] sessionstart: Daemon backgrounded with nohup and stdout redirected
- [x] postuserp: Pipe write backgrounded to avoid hook hang
- [ ] postresponse: Named pipe write not confirmed before using path

## Recommendations

1. **Fix sessionstart.sh line 28** - Change `<<EOF` to `<<'EOF'` to prevent variable expansion during write
2. **Fix postresponse.sh line 18, 23** - Quote $LATEST or pass via env var to prevent JavaScript injection
3. **Fix postuserp.sh line 14** - Add timeout to prevent indefinite blocking
4. **Improve sessionstart.sh line 17** - Better distinguish between "file exists" and real mkfifo errors
5. **Remove trailing blank line in postresponse.sh**

All other aspects are sound: shebang correct, proper error suppression, guard clauses in place, background processes handled correctly.

## Files touched
- /Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-sessionstart.sh
- /Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-postuserp.sh
- /Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/sidecoach-postresponse.sh
