---
name: Enforcement hooks v1 setup
description: First three Claude Code enforcement hooks installed in ~/.claude/hooks/ - PreCompact memory reminder, PreToolUse Bash guard, PreToolUse Write/Edit content guard
type: project
---

Built and wired three enforcement hooks on 2026-04-13. All validated via pipe-test before settings.json edit; none fire until session restart or `/hooks` reload.

## What was built

- **PreCompact reminder** (inline in settings.json) - emits `hookSpecificOutput.additionalContext` reminding to flush memory before context compresses.
- **PreToolUse Bash guard** (`~/.claude/hooks/bash-guard.sh`) - blocks: Co-Authored-By/Generated-with-Claude attribution in commands, force-push to main/master, rm against .claude/memory dirs, legacy model IDs (gpt-4o, gpt-4.1, gpt-3.5, claude-3-{opus,sonnet,haiku}).
- **PreToolUse Write/Edit content guard** (`~/.claude/hooks/content-guard.sh`) - blocks the same forbidden patterns inside file content being written, plus emdash/endash and emoji unicode ranges (0x1F300-0x1FAFF, 0x1F600-0x1F64F, 0x1F680-0x1F6FF).

## Hook output pattern (PreToolUse blocking)

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: <reason>"}}
```

Allow case: `{}`. The deprecated top-level `decision` field is NOT used; PreToolUse uses `hookSpecificOutput.permissionDecision`.

## Settings.json structure

`hooks.PreToolUse` is an ARRAY of objects, each with their own `matcher`. Multiple matchers (e.g., Bash and Write|Edit) coexist as separate array entries, not as a single combined matcher.

## Also done this session

- Set `permissions.defaultMode` to `bypassPermissions` in `~/.claude/settings.json` (was `default`).

## Still TODO from spec (not built)

- Hook #2: memory discipline at Stop event. Must be `command` type, NOT `agent` - Stop is not a tool event so prompt/agent hooks are schema-rejected.
- Hook #3: relevance surfacer (UserPromptSubmit prompt hook). Shelved per user - latency cost unacceptable for now.
- Hook #5: memory file frontmatter validator (PostToolUse Write filtered to .claude/memory/).
- Hook #6: visual verification nag at Stop. Needs cross-turn state file design (PostToolUse appends to /tmp state, Stop reads).

## Files touched

- `~/.claude/settings.json` (added PreToolUse Bash + Write|Edit matchers, added PreCompact)
- `~/.claude/hooks/bash-guard.sh` (new)
- `~/.claude/hooks/content-guard.sh` (new)
