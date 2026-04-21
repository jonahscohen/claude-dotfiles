---
name: Pause state - enforcement hooks and dotfiles infra
description: Where we stopped on 2026-04-21 after building enforcement hooks, fixing dotfiles portability, and analyzing (but not implementing) startup-check.sh improvements
type: project
---

## What was accomplished (2026-04-12 through 2026-04-21)

### Enforcement hooks - 3 of 6 built and wired

Three PreToolUse/PreCompact hooks are installed in `~/.claude/settings.json` (via symlink to claude-dotfiles). Scripts live in `~/.claude/hooks/` (also symlinked). All were pipe-tested and jq-validated before wiring. None were live-fire verified (the settings watcher requires a session restart or `/hooks` UI reload to pick up mid-session changes).

| Hook | File | Event | Type | Status |
|------|------|-------|------|--------|
| Bash guard | `~/.claude/hooks/bash-guard.sh` | PreToolUse Bash | command | Built, wired, tested |
| Content guard | `~/.claude/hooks/content-guard.sh` | PreToolUse Write/Edit | command | Built, wired, tested |
| PreCompact reminder | inline in settings.json | PreCompact | command | Built, wired, tested |
| Memory discipline | NOT BUILT | Stop | command (NOT agent - see below) | Spec only |
| Frontmatter validator | NOT BUILT | PostToolUse Write | command | Spec only |
| Visual verification nag | NOT BUILT | Stop | command | Spec only, needs cross-turn state design |

**Key schema discovery:** Stop, PreCompact, UserPromptSubmit, and SessionStart are NOT tool events. Only PreToolUse, PostToolUse, and PermissionRequest support `prompt` and `agent` hook types. The memory discipline hook at Stop MUST use `command` type. The user originally wanted `agent` type for smarter judgment - that's schema-impossible. A `command` hook that checks whether `.claude/memory/session_*.md` was modified (via git status or timestamp comparison) is the viable path.

### What the hooks block

**bash-guard.sh:** Co-Authored-By / Generated-with-Claude attribution in commands, `git push --force` to main/master, `rm -rf` against `.claude/memory`, legacy model IDs (gpt-4o, gpt-4.1, gpt-3.5, claude-3-{opus,sonnet,haiku}).

**content-guard.sh:** Same forbidden strings in Write/Edit content, plus emdash/endash (U+2014/U+2013), plus emoji unicode ranges (0x1F300-0x1FAFF, 0x1F600-0x1F64F, 0x1F680-0x1F6FF). Uses python3 for JSON parsing and emoji detection. Critical pattern: `INPUT=$(cat); printf '%s' "$INPUT" | python3 -c '...'` NOT `python3 <<'PYEOF'` (heredoc consumes stdin).

### Dotfiles portability - complete

- `discord-chat-launcher.sh`: moved into claude-dotfiles, symlinked back, install.sh has explicit `make_symlink` + `chmod +x` lines. Also auto-wires `source` line into `~/.zshrc` with path-based idempotency (grep for `discord-chat-launcher.sh` not just a marker comment - catches pre-existing manually-added lines too).
- `ghostty/config.ghostty`: repo file uses `__GHOSTTY_SHADERS_DIR__` placeholder. install.sh COPIES (not symlinks) config to ghostty app-support dir and seds placeholder in the copy. Repo file stays clean across machines. Tradeoff: edits to ghostty config require re-running install.sh on each machine.
- install.sh summary and README.md updated to reflect accurate portability model.

### startup-check.sh analysis - NOT implemented

Ran 4 full planner-reviewer-remediator-QA pipelines (v3 through v3.7). All rejected by QA. Each pass found real bugs but each remediation introduced new ones. The complexity was self-generating past ~300 lines of bash.

**Real issues confirmed in the current script:**
1. Load order inverted - MEMORY.md indexes load last, get truncated first under 9,200-char budget
2. Sort broken - `sort -t/ -k<depth>` uses depth from first path, wrong when paths span dirs of differing depth
3. Silent truncation - `|| true` and `|| break` swallow failures
4. No dedup - reference_cmux_browser.md loads twice (confirmed collision via real symlink)
5. Dead code - `count_md` never called
6. SESSION_CWD unset silently falls back to pwd

**Decision made but not acted on:** either (a) ship a minimal subset of fixes (reorder + sort fix + loud truncation + dead code removal) as a ~30-line diff, or (b) rewrite the loading section in Python. Bash portability constraints (3.2 on macOS, Linux sandboxes) generate more failure modes than they resolve.

### Other changes

- `permissions.defaultMode` set to `bypassPermissions` in `~/.claude/settings.json`.
- CLAUDE.md gained a cmux browser pane section with surface-id conventions and per-project reference file pattern.

## What to do next

1. **Verify hooks fire.** Restart Claude Code or open `/hooks` to reload settings. Try a forbidden edit (e.g., write a file with an emdash) and confirm it gets blocked.
2. **Build remaining hooks (#2, #5, #6)** per the spec in session_2026-04-13_enforcement-hooks.md. Hook #2 (memory discipline) needs the most design work since it must be command-type.
3. **Ship startup-check.sh minimal fixes OR rewrite in Python.** The 4 confirmed issues (reorder, sort, silent truncation, dead code) are small individually. A Python rewrite removes the entire bash portability blast radius but is a bigger change.
4. **Hook #3 (relevance surfacer)** was shelved due to latency. Revisit if the passive dump-everything approach keeps underperforming.

## Files to know about

- `~/.claude/settings.json` -> `claude-dotfiles/claude/settings.json` (all hook wiring lives here)
- `~/.claude/hooks/bash-guard.sh` -> `claude-dotfiles/claude/hooks/bash-guard.sh`
- `~/.claude/hooks/content-guard.sh` -> `claude-dotfiles/claude/hooks/content-guard.sh`
- `~/.claude/startup-check.sh` -> `claude-dotfiles/claude/startup-check.sh` (the script we analyzed but didn't change)
- `~/.claude/discord-chat-launcher.sh` -> `claude-dotfiles/claude/discord-chat-launcher.sh`
- `~/.claude/memory/MEMORY.md` -> `claude-dotfiles/claude/memory/MEMORY.md` (global memory index)
