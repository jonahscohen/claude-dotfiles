---
name: Fixed /justify listen loop - HTTP curl polling, not the flaky MCP justify_watch (grounded in code + decision beats)
description: After Jonah's "read the code/notes" correction, traced why his changes never showed in Justify's bottom-left panel. Root cause - my /justify Step 6 told the operative to loop the MCP justify_watch, which decision_improv_http_polling_watch explicitly REJECTED (MCP long-poll disconnects, drops prompts). Rewrote Step 6 to the documented reliable loop: curl GET /prompts -> apply -> POST /respond (fills the bottom-left Changes panel) -> POST /prompts/clear -> repeat.
type: project
relates_to: [session_2026-06-05_self-analysis-blackbox-not-reading.md, session_2026-06-05_justify-is-the-one-command.md]
---

Collaborator: Jonah. 2026-06-05. This time: read first, then change code.

## What I read (the grounding I should have done at the start)
- decision_improv_http_polling_watch.md: the watch loop MUST be `curl -s http://localhost:9223/prompts` in a bash loop, NOT the MCP watch tool. MCP long-poll "disconnects unreliably... lost prompts silently." curl-against-localhost never fails/disconnects.
- decision_improv_claudebar_architecture.md: the bottom-left is a flex tray of two pills - queuebar + claudebar - plus the Changes panel. Claudebar state machine: sending -> working -> review (opens Changes panel) -> retry. Driven by server events.
- justify/core/changes-panel.ts: the Changes panel is `position:fixed;bottom:68px;left:20px`, "Changes from Claude", display:none until populated. Fed by transport `changes_applied` / `justify_response`.
- justify/server/ws-server.ts routes (9223): GET /prompts, POST /respond, POST /prompts/clear, GET /queue, GET/POST /claude-state, GET /watch-status, GET /status. prompts persist in ~/.claude/justify/prompts.json.
- justify/server/mcp-tools.ts: justify_watch (line 232) returns `idle` IMMEDIATELY when prompts.json is empty - it is a single poll, not a real block. justify_respond (331) / POST /respond -> broadcasts `justify_response` -> fills the Changes panel + claudebar "Review". justify_get_prompts reads+clears. justify_working broadcast on pickup.

## Root cause of "my changes don't show bottom-left"
The pipeline (prompt -> working -> apply -> respond -> Changes panel) never completed because the operative's listen loop used the MCP justify_watch (the rejected, flaky path) - and justify_watch returns idle instantly when empty, so "looping" it does nothing useful and the operative stalled. Nothing was polled, applied, or responded, so justify_response never fired and the bottom-left panel stayed hidden (correctly - it had nothing). NOT a panel bug.

## Fix
Rewrote /justify Step 6 in BOTH ~/.claude/skills/justify/SKILL.md and justify/install.sh (heredoc) to the documented reliable loop:
1. POLL: `for i in $(seq 1 30); do P=$(curl -s http://localhost:9223/prompts); [ "$P" != "[]" ] && [ -n "$P" ] && { printf '%s' "$P"; exit 0; }; sleep 2; done; echo IDLE` (blocks until a prompt or ~60s IDLE, then re-run).
2. APPLY the prompt to source.
3. RESPOND: `curl -s -X POST http://localhost:9223/respond -d '{promptId,summary,filesChanged,changes,status:completed}'` -> fills bottom-left Changes panel + claudebar Review.
4. CLEAR: `curl -s -X POST http://localhost:9223/prompts/clear`.
5. Re-poll. Added an explicit note: empty bottom-left = loop not running / no /respond posted - fix the loop, do not blame the panel.

## Verified (code-level)
bash -n install.sh OK; new Step 6 present in both files; old `call justify_watch (long-poll)` gone; /prompts, /respond, /prompts/clear all confirmed present in ws-server.ts. (Live end-to-end test still needs the operative re-run with the new loop.)

## Files
- ~/.claude/skills/justify/SKILL.md (Step 6 rewritten)
- justify/install.sh (heredoc Step 6 rewritten to match)
