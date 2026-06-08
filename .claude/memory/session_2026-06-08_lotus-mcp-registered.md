---
name: Registered the Lotus Figma MCP server in settings.json
description: Added the `lotus` MCP server (Lotus Figma-plugin bridge) to ~/.claude/settings.json mcpServers so Claude Code can drive Figma; loads on next session start
type: project
---

Added `lotus` to `~/.claude/settings.json` mcpServers. IMPORTANT: settings.json is a dotfiles SYMLINK - the real target is `claude-dotfiles/claude/settings.json`; editing the symlink path is refused ("Refusing to write through symlink"), so edit the real path. Entry: `"lotus": {command:"node", args:["/Users/spare3/Documents/Github/lotus/mcp-server/dist/server.js"]}`. JSON validated; mcpServers now = voice-output, justify, peekaboo, lotus. MCP servers initialize at SESSION START, so a restart is required for the lotus tools to appear.

GOTCHA: the `claude mcp` CLI is BROKEN inside the cmux shell (`claude:29: command not found: _claude_inside_cmux`), so `claude mcp add/list` fail - register MCP servers by editing settings.json directly instead.

The Lotus plugin itself (the Chiaroscuro->Lotus rename, rebuild, and model bump to Opus 4.8 / GPT-5.5) is documented in its own repo: `lotus/.claude/memory/session_2026-06-08_chiaroscuro-to-lotus-figma-mcp.md`.

SLASH COMMAND: created `~/.claude/skills/lotus/SKILL.md` (a LOCAL skill, like /justify - not in dotfiles). `/lotus` checks the lotus tools are loaded, ensures the build, opens Figma, walks the one-time plugin connect (run Lotus -> Settings -> MCP Bridge -> 9527 -> Connect), and verifies with a live `mcp__lotus__get_page_structure` call. It shows in the skill list now. BUT the lotus MCP TOOLS also load at session START, so they are not in the session where lotus was first registered -> a one-time Claude Code restart is required before /lotus can actually drive Figma. (Separately, an official Figma MCP `mcp__plugin_figma_figma__*` is also connected - different thing from Lotus.)

Collaborator: Jonah.
