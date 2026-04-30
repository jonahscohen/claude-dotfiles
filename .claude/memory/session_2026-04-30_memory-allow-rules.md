---
name: Hard-allow rules for memory writes in claude/settings.json
description: Added six explicit Write/Edit/MultiEdit allow rules so writes to .claude/memory/ (project root) and ~/.claude/projects/*/memory/ (global auto-memory) never prompt, regardless of defaultMode. Lives in the dotfiles' canonical settings.json so every install inherits it.
type: project
---

Collaborator: Jonah Cohen

# What changed

`claude/settings.json` `permissions.allow` array gained six new patterns:

```
Write(**/.claude/memory/**)
Edit(**/.claude/memory/**)
MultiEdit(**/.claude/memory/**)
Write(/Users/*/.claude/projects/**/memory/**)
Edit(/Users/*/.claude/projects/**/memory/**)
MultiEdit(/Users/*/.claude/projects/**/memory/**)
```

Also restored the trailing newline that had gone missing on this file.

# Why

User asked for Claude to ALWAYS have permission to maintain memory, with no prompts. The existing setup already had:

- `defaultMode: bypassPermissions` (auto-approves everything)
- `Write/Edit/MultiEdit(**/*.md)` from the 04-28 md-allow-rules pass

Both of those should already cover memory writes. But:
1. They are broad and could be tightened later (e.g. someone narrows `**/*.md` to a specific repo); explicit memory-dir rules guarantee memory always works regardless.
2. `defaultMode: bypassPermissions` may not cover every flow (subagents, sandboxed tool calls, future managed-settings overrides). Explicit allow patterns are the belt to bypassPermissions's suspenders.

# How

The first pattern (`**/.claude/memory/**`) covers every project-root memory dir on any machine. The second pattern (`/Users/*/.claude/projects/**/memory/**`) covers the macOS global auto-memory location at `~/.claude/projects/<sanitized-cwd>/memory/`. Both Write, Edit, and MultiEdit are listed because Claude Code matches the tool name as part of the rule string.

The file `claude/settings.json` is the dotfiles' canonical settings file. `install.sh` symlinks it to `~/.claude/settings.json`, so anyone who installs claude-dotfiles inherits these rules. Confirmed via `ls -la ~/.claude/settings.json` showing the symlink target.

# Verification

- `jq . claude/settings.json` exits 0 (JSON valid)
- `jq -e '.permissions.allow | map(select(. | contains("memory")))'` returns the six rules
- `tail -c 1 claude/settings.json | od -c` shows `\n` (trailing newline restored)
- `~/.claude/settings.json` confirmed as symlink to repo file, so the live config matches the repo

# Files touched

- `claude/settings.json` (six allow rules + trailing newline)
- `.claude/memory/session_2026-04-30_memory-allow-rules.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)

# Open knowns

- Linux/WSL users would need a different absolute path than `/Users/*/...` for the global auto-memory rule. The `**/.claude/memory/**` rule still covers project-root memory on those platforms; only the global auto-memory pattern is macOS-shaped. If we ship dotfiles on Linux, add a `/home/*/.claude/projects/**/memory/**` variant alongside.
