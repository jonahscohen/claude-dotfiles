---
name: Justify daemon /justify - built + mostly proven live; ONE precise remaining gap (browser "connected" signal)
description: The daemon/HTTP redesign of /justify is built and largely proven live on yesand (persistent server, plain-http core load no-cert, connects, HTTP activate, report-back transport, command wired). The unresolved link, found by honest live testing - the browser QUEUES a prompt and gates transmission on a "Claude is connected" signal that the pure-curl model does not emit. Fixed watch-status.active (poll = heartbeat) but the browser still shows "Claude is not connected", so it reads a SEPARATE signal (likely a server->client broadcast the old MCP justify_watch sent). The browser->Claude task send is still blocked.
type: project
relates_to: [session_2026-06-06_justify-daemon-live-proof.md, session_2026-06-06_justify-daemon-http-activate.md]
superseded_by: session_2026-06-06_justify-roundtrip-CLOSED.md
---

Collaborator: Jonah. 2026-06-06. Truthful status (no overclaim): the round-trip is NOT fully closed.

## PROVEN live on yesand (http://yesand.lndo.site, no cert)
- DAEMON session-independent: justify-serve runs nohup node ~/.claude/justify/dist/server/index.js; survives session end; serves 9223/9224 with no MCP client.
- Core loads over PLAIN HTTP (http://localhost:9223/justify-core.js on the http site) -> NO cert/sudo/mixed-content. status connections:1.
- HTTP ACTIVATE: new POST /activate -> 200 -> toolbar shows + expands (comment/sliders/gear/close).
- PROMPT MODE works: selected the WORK nav element (span .menu-item-text), typed "make this WORK link uppercase and letter-spaced", submitted -> the browser QUEUED it (bottom-left "QUEUED TASK (1)" panel shows the task + selector).
- REPORT-BACK transport: POST /respond -> 200 -> justify_response broadcast to the connected client (proven earlier).
- MCP UNREGISTERED (daemon sole owner of 9223). /justify SKILL rewritten (live ~/.claude/skills/justify/SKILL.md) to the daemon/HTTP model.

## THE REMAINING GAP (precise, characterized by live test)
The browser does NOT auto-send queued tasks to the server; it gates on a "Claude is connected" signal. Its queue panel persistently shows "Claude is not connected. Tell Claude `watch justify` to start receiving tasks." even though: connections:1, and watch-status `active:True`.
- watch-status.active = this.watchSessionActive && (now - this.lastMcpActivity < 10000). Both were MCP-only. I FIXED ws-server.ts GET /prompts to set `this.watchSessionActive = true; this.lastMcpActivity = Date.now()` (a poll = the watch heartbeat) -> watch-status now reports active:True while polling. Rebuilt + synced + daemon restarted; core reconnected (connections:1).
- BUT the browser STILL shows "not connected" -> the browser's connected-detection uses a DIFFERENT signal than watch-status.active. Almost certainly a server->client WS BROADCAST that the MCP justify_watch sent (the queuebar/claudebar flips to connected on that broadcast, then transmits the queue). The pure-curl /prompts poll does not broadcast it.

## THE FIX (next step, small but needs core-reading)
1. Read the BUILT core (justify/dist/justify-core.js) / core source for how the queuebar decides "Claude is connected" - find the WS event/method it listens for (e.g., a 'watch_connected' / 'session_active' / 'justify_working' broadcast) and/or whether it polls /watch-status and which field.
2. Make the server emit that signal when a /prompts poll happens (heartbeat): `this.broadcastToClients('<the event>', {...})` in the GET /prompts handler (alongside the watchSessionActive set). Then the browser flips to connected and auto-transmits the queue -> /prompts returns it -> apply -> POST /respond -> Changes panel.
3. Re-prove the full loop live (queue auto-sends -> /prompts -> /respond -> bottom-left Changes panel renders).

## Also still pending (durable)
- install.sh: ship the rewritten skill heredoc (daemon model) + cp/symlink justify-serve; remove.sh WordPress branch fix.
- The justify_working broadcast on /prompts (claudebar "working" animation) is also lost in the curl model - same class; fold into the fix.

## Files changed this redesign
- justify/server/ws-server.ts: POST /activate; GET /prompts sets watchSessionActive+lastMcpActivity. Rebuilt+synced to ~/.claude/justify/dist.
- justify/cli/justify-serve.sh (new, symlinked to PATH); justify/cli/init.sh (http core default); ~/.claude/skills/justify/SKILL.md (daemon model); ~/.claude.json (justify MCP unregistered).
- yesand: http core injected in astra-child/functions.php (currently active; a daemon is running).
