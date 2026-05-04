---
name: Voice mandate SessionStart hook
description: Built a SessionStart hook that mechanically enforces voice output - checks if MCP server is configured and enabled, then injects ToolSearch + speak mandate into every session
type: project
---

Collaborator: Jonah

## What happened

Voice output rule was violated again at session start (third occurrence across two sessions on 2026-05-03). The existing CLAUDE.md rule and memory feedback were not enough - the assistant kept deferring ToolSearch for the speak tool until after sending its first text-only reply.

## What was built

Created `claude/hooks/voice-mandate.sh` - a SessionStart hook that:
1. Checks if `voice-output` exists in mcpServers in settings.json (server installed)
2. Checks if `~/.claude/.voice-enabled` exists (voice not muted)
3. If both true, injects `additionalContext` mandating immediate ToolSearch load and speak-on-every-response
4. If either false, returns empty JSON (no-op)

Wired into settings.json under both SessionStart and PostCompact so the mandate survives context compaction.

## Why

Rules-on-paper failed three times. The hook makes enforcement mechanical - the mandate arrives as system context before the assistant can compose its first reply, and explicitly says "load the tool NOW before any text response."

## Files touched

- `claude/hooks/voice-mandate.sh` (new) - the hook script
- `~/.claude/hooks/voice-mandate.sh` (symlink) - active hook
- `~/.claude/settings.json` - added hook to SessionStart + PostCompact
- `~/.claude/CLAUDE.md` - added Voice Output mandatory section with team-wide scope
- `install.sh` - voice-output component now installs the hook, merges into settings.json, and cleans up on deactivation
- `~/.claude/projects/.../memory/feedback_speak_responses.md` - updated failure history
