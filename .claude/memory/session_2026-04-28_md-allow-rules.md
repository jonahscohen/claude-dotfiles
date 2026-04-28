---
name: Auto-allow Write/Edit/MultiEdit on .md files
description: Added Write(**/*.md), Edit(**/*.md), and MultiEdit(**/*.md) to settings.json's permissions.allow list. defaultMode bypassPermissions was already set but Claude Code was still prompting on .md writes; explicit allow rules force-approve regardless of what's escalating.
type: project
---

Collaborator: Jonah Cohen

# What changed

`claude/settings.json` permissions.allow gained three patterns:
- `Write(**/*.md)`
- `Edit(**/*.md)`
- `MultiEdit(**/*.md)`

# Why

User reported Claude Code was asking permission every time it wanted to write to .md files even though `defaultMode: bypassPermissions` was set. Verified the active `~/.claude/settings.json` is the symlink to the repo file (so the bypass mode IS the active config). The persistent prompts suggest Anthropic added per-tool escalation that ignores `bypassPermissions` for some path categories, OR Desktop's Claude Code harness adds an extra approval layer.

Either way, explicit allow patterns short-circuit the escalation. We picked `**/*.md` glob (any depth) to cover memory files, README updates, project markdown, anywhere.

# How to apply

Live everywhere immediately on this machine because settings.json is symlinked. Other machines pick up via `git pull` (or `yesplease`). Restart of the Claude Code session may be required for the new rules to take effect.

# Why three rules and not just one

Write, Edit, and MultiEdit are three different tools. Claude Code matches permission patterns by tool name; each needs its own entry. (Glob in Bash() patterns wouldn't help.)

# What was NOT done

- Broader `Write` / `Edit` allow (i.e., approve all file writes regardless of extension). User specifically called out .md files; broader allow is a separate decision they didn't authorize. If the prompts continue on non-.md files, broaden then.

# Files touched

- `claude/settings.json` (three new allow entries)
- `.claude/memory/session_2026-04-28_md-allow-rules.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
