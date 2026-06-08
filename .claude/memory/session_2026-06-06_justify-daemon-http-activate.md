---
name: Justify server - added POST /activate, proven as a standalone daemon (session-independent path)
description: Step 1 of the /justify daemon redesign. Added a POST /activate HTTP route to ws-server.ts (mirrors the justify_activate MCP tool's broadcast) so activation no longer needs the MCP. Rebuilt + ran the server as a standalone nohup daemon (no MCP client): listens 9223/9224, POST /activate -> 200, /status -> 200, core served. The whole /justify flow can now be pure HTTP (justify-serve daemon -> init -> POST /activate -> curl /prompts -> POST /respond), no session-tied MCP.
type: project
relates_to: [session_2026-06-06_justify-cleared-and-daemon-redesign.md]
---

Collaborator: Jonah. 2026-06-06.

## Change
justify/server/ws-server.ts: new route `POST /activate` -> `this.broadcastToClients('activate')` -> 200 {ok:true}. Mirrors mcp-tools.ts justify_activate (which did the same broadcast). This was the ONE thing that was MCP-only in the flow; now it is HTTP, so /justify needs no MCP at all.

## Verified (server/daemon level)
- node build.js (core) + tsc -p tsconfig.server.json: clean.
- Ran `nohup node dist/server/index.js` (NO MCP stdio client) -> daemon listens on 9223 (ws+http) and 9224 (https). Log: "Justify WebSocket server listening on port 9223".
- curl -X POST http://localhost:9223/activate -> {"ok":true} HTTP 200.
- curl http://localhost:9223/status -> {"server":"justify","port":9223,"connections":0} HTTP 200.
- curl -sk https://localhost:9224/justify-core.js -> HTTP 200.

## Still to do (the rest of the redesign)
- justify-serve.sh (start the daemon nohup if 9223 is free) + PATH symlink.
- /justify skill rewrite: daemon-up -> inject -> open browser -> POST /activate -> curl listen loop; NO MCP, and prefer the http://localhost:9223 core for local-dev http sites to avoid the self-signed-cert/sudo step entirely (use https://localhost:9224 only for https-only sites).
- justify/cli/remove.sh: fix the WordPress branch (it does not remove the functions.php enqueue).
- Unregister the justify MCP from ~/.claude.json so the daemon is the sole owner of 9223 (no killStaleProcess flapping).
- LIVE proof end-to-end on yesand: core connects (status connections:1), POST /activate shows the toolbar, a change round-trips (toolbar -> /prompts -> apply -> POST /respond -> Changes panel fills).

## Files
- justify/server/ws-server.ts (POST /activate); rebuilt dist/ (core + server).
- A daemon is currently running from justify/dist/server/index.js on 9223/9224 (log /tmp/justify-daemon.log).
