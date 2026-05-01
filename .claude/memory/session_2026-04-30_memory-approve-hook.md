---
name: Memory-approve hook
description: PreToolUse hook that returns permissionDecision allow for memory paths, bypassing the .claude/ carve-out in bypassPermissions mode
type: project
---

## Problem

`bypassPermissions` has a hardcoded carve-out for `.claude/` directories - writes to `.claude/memory/` prompt even when the mode is set to bypass everything. The exemptions only cover `.claude/commands`, `.claude/agents`, and `.claude/skills`. NOT `.claude/memory/`.

27 explicit allow rules in settings.json did not reliably override this carve-out.

## Fix

Created `claude/hooks/memory-approve.sh` - a PreToolUse hook that fires BEFORE the permission system. For any Write/Edit/MultiEdit where `file_path` matches `.claude/memory/` or `.claude/projects/*/memory/`, it returns `permissionDecision: "allow"`, which bypasses the permission check entirely.

Content-guard.sh still runs in the same hook group and can return `deny` for forbidden content (emdashes, attribution, legacy models, emojis). Per Claude Code's hook precedence: deny beats allow, so safety is preserved.

Why: the `.claude/` carve-out is enforced at the permission-system level. Allow rules in settings.json are evaluated by the SAME permission system that enforces the carve-out, so they compete. Hooks fire BEFORE the permission system, so they can pre-empt the carve-out cleanly.

How: hook reads `tool_input.file_path` from stdin JSON, greps for memory-dir patterns, returns allow or empty.

## Files touched

- `claude/hooks/memory-approve.sh` (new)
- `claude/settings.json` (added hook entry before content-guard)
- `~/.claude/hooks/memory-approve.sh` (symlinked for current session)

Collaborator: Jonah
