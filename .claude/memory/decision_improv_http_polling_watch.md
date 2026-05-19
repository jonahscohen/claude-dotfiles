---
name: Improv uses direct HTTP polling for watch loop
description: Watch loop uses curl against HTTP API instead of MCP improv_watch tool; never disconnects, never fails
type: decision
relates_to: [session_2026-05-14_dishplayscapes-improv.md, decision_improv_shared_prompt_buffer.md, session_2026-05-13_improv-port-fix.md]
---

Watch loop polls `http://localhost:9223/prompts` via curl instead of using the MCP `improv_watch` tool.

**Alternatives considered:**
- MCP `improv_watch` tool with long-poll timeout: rejected because MCP connections disconnect unreliably, especially across sessions and when Claude Code restarts. Lost prompts silently.
- WebSocket subscription from Claude's side: rejected because Claude Code doesn't support persistent WebSocket connections from tools.

**Why direct HTTP polling:** Three requirements drove this: (1) never fails - curl against localhost is the most reliable operation possible, (2) never disconnects - each poll is a fresh HTTP request with no persistent connection to break, (3) immediate response - no MCP protocol overhead, no session negotiation, just GET and parse.

**How it works:**
1. Bash loop runs `curl -s http://localhost:9223/prompts`
2. Server reads `prompts.json`, returns contents, clears the file
3. If prompts exist, Claude processes them and calls `improv_respond`
4. Loop repeats with configurable interval

**Trade-off:** Requires the improv server to be running (it usually is). Loses the MCP abstraction layer. But reliability trumps abstraction for a dev tool where lost prompts mean lost user intent.

**Revisit when:** MCP transport gets reliable reconnection, or if polling frequency needs to change dynamically based on activity.
