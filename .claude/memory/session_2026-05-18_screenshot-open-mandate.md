---
name: session-2026-05-18-screenshot-open-mandate
description: Built a PostToolUse hook layer that requires every captured screenshot to be Read before further validation progress. Capturing without opening doesn't count.
type: project
relates_to: [session_2026-05-18_validation-trigger-guard.md, session_2026-05-18_real-input-validation.md]
---

## 2026-05-18 Screenshot-open mandate

### Why
After the validation-trigger guard forced me to use real input, I still slipped into describing screenshots without actually opening them with the Read tool. The user pointed out: a screenshot saved to disk that nobody Reads doesn't surface to the user's conversation. The verification gap is real - I can claim "the screenshot shows X" without ever loading the image.

### Enforcement

Two new PostToolUse hooks plus a bash-guard gate:

**`claude/hooks/screenshot-open-mandate.sh`** (PostToolUse for Bash, mcp__claude-in-chrome__computer):
- Detects `cmux ... screenshot --out PATH` and chrome MCP `computer screenshot` actions
- For cmux: extracts the `--out` path
- For chrome MCP: blocks (warning via additionalContext) if `save_to_disk: true` is missing; parses the response for the returned path when present
- Writes the path to `~/.claude/.screenshot-pending`
- Injects `additionalContext` with a MANDATORY message: "you MUST Read that path before composing your next text response, taking another screenshot, or claiming any validation result. Looking at the image is the validation - capturing it without opening it proves nothing."

**`claude/hooks/screenshot-open-clear.sh`** (PostToolUse for Read):
- When Read's `file_path` matches the path in `~/.claude/.screenshot-pending`, deletes the pending file
- Read of any other path is ignored

**`bash-guard.sh` extension**:
- When `~/.claude/.screenshot-pending` exists, blocks:
  - Further `cmux ... screenshot` commands (can't pile up captures without reads)
  - `git commit` (can't ship "validated" work without showing the screenshot)
- Other bash commands pass through

The gate runs BEFORE the memory-dirty / verification-pending gates, so screenshot-pending is the earliest reason a commit could be blocked.

### Wiring
`~/.claude/settings.json` PostToolUse:
- Matcher `Bash|mcp__claude-in-chrome__computer` -> screenshot-open-mandate.sh
- Matcher `Read` -> screenshot-open-clear.sh

`validation-guard.sh` is already wired separately for the chrome MCP javascript_tool boundary. `bash-guard.sh` already runs for every Bash invocation.

### Verification (real, with the new hook running)

`/tmp/test-screenshot-mandate.sh` and `/tmp/test-pending-gate.sh` simulated inputs through both hooks:

screenshot-open-mandate.sh:
- cmux screenshot --out /tmp/foo.png -> sets PENDING, injects MANDATORY reminder
- Read /tmp/foo.png -> clears PENDING
- cmux screenshot (no --out) -> no-op (no path to track)
- chrome MCP screenshot without save_to_disk -> injects REMINDER warning, does NOT set pending
- chrome MCP screenshot with save_to_disk:true and response containing path -> sets PENDING, injects MANDATORY
- Read of unrelated path -> does NOT clear pending
- plain `ls` -> no-op

bash-guard.sh gate (with PENDING set):
- New cmux screenshot -> deny
- git commit -> deny (with memory-pending also stacked)
- unrelated bash -> allow

Cleared PENDING:
- cmux screenshot -> allow

All cases passed.

### Practical effect

Going forward:
- I can't claim "the screenshot shows X" without having Read the file
- Chrome MCP screenshots will be auto-warned if I forget `save_to_disk: true`
- cmux screenshots are tracked the moment they hit disk
- Piling up screenshots without opening one is blocked
- Committing without opening the latest screenshot is blocked

### Files changed
- `claude/hooks/screenshot-open-mandate.sh` (new)
- `claude/hooks/screenshot-open-clear.sh` (new)
- `claude/hooks/bash-guard.sh` (added screenshot-pending gate)
- `~/.claude/settings.json` (PostToolUse wiring for both new hooks)
- Symlinked from `~/.claude/hooks/` to dotfiles

Collaborator: Jonah Cohen
