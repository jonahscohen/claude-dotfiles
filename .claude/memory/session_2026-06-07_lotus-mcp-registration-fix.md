---
name: Lotus MCP never spawned - wrong config file
description: Lotus MCP tools never loaded across 3 restarts because it was registered in settings.json (not read for server defs) instead of ~/.claude.json
type: decision
relates_to: []
---

Collaborator: Jonah

## Problem
`/lotus` could not connect across THREE Claude Code restarts. `mcp__lotus__*` tools never appeared in any session.

## Root cause (traced, not guessed)
- Lotus server binary is healthy: spawned `node dist/server.js` manually with an `initialize` JSON-RPC message, it answered correctly and opened the WebSocket bridge on port 9527. Build artifacts present (`mcp-server/dist/server.js`, `dist/code.js`, rebuilt Jun 7 22:12).
- Claude Code never even attempted to spawn it: no lotus process running, port 9527 free, and NO `mcp-logs-lotus` directory under `~/Library/Caches/claude-cli-nodejs/*/` (every server Claude actually spawns gets a log dir).
- The servers that DO load (pencil, voice-output, auggie) are defined in **`~/.claude.json`** global `mcpServers` with absolute command paths and `"type":"stdio"`.
- `lotus` was defined ONLY in `claude/settings.json`'s `mcpServers` block, which the current Claude Code does not reliably read for server definitions (it never produced a process/port/log across 3 restarts).
- The only lotus-family entry in `~/.claude.json` was a stale `chiaroscuro` (old name) scoped to project `/Users/spare3` only, configured as `type:http -> http://localhost:9527` (broken: http type expects an already-running server, nothing spawns it).
- Restarting just reloaded the same broken config each time, which is why 3 restarts did nothing.

## Fix
1. Backed up `~/.claude.json` to `~/.claude.json.bak-lotus-fix`.
2. Added `lotus` to **global** `mcpServers` in `~/.claude.json` as stdio, using the **absolute** nvm node path (`/Users/spare3/.nvm/versions/node/v20.19.6/bin/node`) so it does not depend on Claude Code's spawn PATH, pointing at the absolute `server.js`.
3. Removed the stale `chiaroscuro` http entry from project `/Users/spare3`.
4. Removed the dead `lotus` block from `claude/settings.json` to prevent a duplicate-registration collision. Single authoritative definition now lives in `~/.claude.json`.

Both files validated as parseable JSON after edits.

## Why this location
~/.claude.json global is the demonstrated-working source (pencil/voice-output/auggie load from it). Global scope = available in every project, matching the skill's "one-liner each session" expectation.

## Still required
ONE final restart - MCP servers load at session start, there is no live reload. But this restart will work because the registration is now in the file Claude Code actually reads.

## Follow-up / doc debt
The `/lotus` skill doc (`~/.claude/skills/lotus/SKILL.md`) still says "registered in settings.json". That guidance is wrong for this Claude Code version - should say `~/.claude.json`. Not yet updated.

## Files touched
- `~/.claude.json` (added global lotus stdio entry, removed stale chiaroscuro)
- `claude/settings.json` (removed dead lotus mcpServers block)
- `~/.claude.json.bak-lotus-fix` (backup)
