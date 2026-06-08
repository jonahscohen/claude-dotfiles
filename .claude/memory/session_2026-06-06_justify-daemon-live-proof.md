---
name: Justify daemon model - LIVE proof on yesand (started + loaded + connected + activated, over plain http, no MCP/cert)
description: Proved the redesigned Justify works live on yesand.lndo.site: standalone daemon (no MCP, survives session end), browser loads the http://localhost:9223 core over PLAIN HTTP (no cert/sudo/mixed-content), connects (status connections:1), toolbar activated via POST /activate (HTTP, no MCP), report-back transport (POST /respond) confirmed. NOT yet visually closed: the bottom-left changes panel render (needs a real browser-originated prompt first - the claudebar state machine needs sending->working->review).
type: project
relates_to: [session_2026-06-06_justify-daemon-http-activate.md, session_2026-06-06_justify-cleared-and-daemon-redesign.md]
---

Collaborator: Jonah. 2026-06-06.

## What is PROVEN live (well under a minute once the site is up)
- DAEMON, session-independent: `justify-serve` runs `nohup node ~/.claude/justify/dist/server/index.js`; serves 9223 (ws+http) + 9224 (https) with NO MCP client. This is the root-cause fix for "Justify vanished when the session ended" - it no longer dies with a session.
- NO CERT / NO SUDO: yesand serves plain http (http://yesand.lndo.site -> 200, no redirect), so the injected `http://localhost:9223/justify-core.js` loads over the http page with no mixed-content and no self-signed-cert trust step. (init.sh now defaults to the http core for exactly this.)
- LOADED + LISTENING: after navigating the tab to http://yesand.lndo.site, `curl http://localhost:9223/status` -> {"connections":1} = the browser core connected to the daemon.
- ACTIVATED over HTTP (no MCP): new `POST /activate` route -> 200 -> the Justify toolbar badge ("I", bottom-right) appears and expands to the toolbar on click. Screenshot-confirmed.
- REPORT-BACK transport: `POST /respond` (sample applied change) -> 200 -> broadcast `justify_response` to the connected client. The endpoint + broadcast work.
- MCP UNREGISTERED: removed `justify` from ~/.claude.json (backup .bak-before-justify-mcp-unregister) so the daemon is the sole owner of 9223 (no killStaleProcess flapping). The whole flow is now MCP-free.

## NOT yet visually closed (honest)
The bottom-left CHANGES PANEL rendering a reported change was not visually confirmed. Diagnosed (not guessed): the claudebar state machine is sending->working->review and expects a PRECEDING browser-originated prompt; a synthetic POST /respond with no in-flight prompt does not drive the pill. The truthful visual proof needs the full loop: drive a real toolbar edit -> it POSTs to /prompts -> curl /prompts (listen proof) -> POST /respond to that promptId -> claudebar "review" + panel fills. Same verified pieces; just more browser steps than budget allowed this turn.

## Built this redesign (files)
- justify/server/ws-server.ts: POST /activate. Rebuilt dist (core+server), synced to ~/.claude/justify/dist.
- justify/cli/justify-serve.sh: daemon starter (idempotent, nohup, waits for /status). NOT yet symlinked to PATH or wired into install.sh.
- justify/cli/init.sh: JUSTIFY_URL defaults to http://localhost:9223 core (env-overridable; https://localhost:9224 + setup-cert.sh for https-only sites).
- ~/.claude.json: justify MCP unregistered.
- yesand: http core re-injected into astra-child/functions.php (this is the "fresh" Justify, working).

## REMAINING to make /justify THE one-command version
1. Rewrite the /justify SKILL (live ~/.claude/skills/justify/SKILL.md + install.sh heredoc) to the daemon/http model: justify-serve (daemon up) -> init (http core) -> open the http site -> POST /activate -> curl /prompts listen loop -> POST /respond. Drop all MCP/cert from the critical path. (Currently the skill still describes the MCP model.)
2. remove.sh: fix the WordPress branch (remove the functions.php enqueue).
3. install.sh: cp+symlink justify-serve; ship the rewritten skill heredoc.
4. Close the changes-panel VISUAL via the full prompt->respond loop.

## A running daemon is live now (pid in /tmp/justify-daemon.log era; restarted via justify-serve). Justify is visibly back in yesand and persists across sessions.
