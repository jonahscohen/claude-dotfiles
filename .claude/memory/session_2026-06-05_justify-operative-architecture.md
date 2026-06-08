---
name: Justify <60s startup + active-listener operative architecture (root cause of "struggle" = improv port conflict)
description: Jonah (2026-06-05) wants Justify to start in <60s with an ACTIVE (not passive) listener for new tasks, via his suggested pattern: an observable terminal pane in the project dir + an operative agent in another pane, while he and Claude keep talking in the main session. Proved the server is healthy now that improv is unregistered (was the 9223 conflict = the "struggle"). Architecture: a fresh claude operative (cmux claude-teams) in the project dir OWNS the justify MCP and loops justify_watch.
type: decision
relates_to: [session_2026-06-05_justify-slash-bootstrap-skill.md]
---

Collaborator: Jonah. 2026-06-05.

Choice made: the active listener is a SEPARATE fresh claude "operative" session in the project dir (not the main session), launched via cmux into an observable pane; it owns the justify MCP and runs a justify_watch loop.

**Alternatives considered:**
- Main session as operative: rejected - this session predates the justify MCP registration, and MCP servers only attach at session START, so it cannot get justify_* tools.
- Subagent (Agent tool) as operative: rejected - subagents share THIS session's MCP connections (which lack justify), and are not a persistent observable external pane.
- Standalone server daemon + non-claude watcher: rejected for the LISTENER - the justify_* tools (justify_watch/apply) only exist when the server is launched BY a claude session as an MCP server (stdio). A daemon gives the browser a connection but no MCP tools, so no agent can watch/apply. Also a daemon and an MCP-launched server fight over 9223 (killStaleProcess).

**Why this one:** a fresh claude session started NOW (post-registration, post-improv-removal) gets the justify MCP cleanly. It is the single owner of the server (9223 ws/http + 9224 https core). It can loop justify_watch = the active listener. cmux claude-teams launches it into an observable cmux split. Main session stays free for Jonah + Claude to talk and direct.

**Revisit when:** justify gains a standalone watcher mode that does not need an MCP client, or MCP servers can hot-attach mid-session.

## Proven this session
- Root cause of the "struggle": the legacy `improv` MCP server bound the same port 9223 and fought `justify` (killStaleProcess churn = the connect/disconnect flapping). improv now UNREGISTERED.
- Server health (standalone test `node ~/.claude/justify/dist/server/index.js`): listens on 9223 + 9224; `curl -sk https://localhost:9224/justify-core.js` -> HTTP 200, 280095 bytes of valid JS (`var Justify=...`). Log: "Justify WebSocket server listening on port 9223". Clean.
- cmux 0.64.13 present. `cmux claude-teams [claude-args...]` launches Claude Code with agent-teams enabled via a tmux shim -> cmux splits. `cmux <path>` opens a dir as a workspace. This is the substrate for the operative + observation.

## Plan (the <60s launcher + operative)
1. justify-go launcher (to build): from a project dir -> ensure site up (lando start if needed), justify-init (inject core), open browser to the site, then launch the operative.
2. Operative: cmux claude-teams in the project dir, seeded with a standing prompt: bootstrap (justify_status until connected - server auto-starts via its MCP - then justify_activate, confirm a connected tab), then loop justify_watch and apply incoming changes to source, reporting each. = active listener.
3. Main session (us) observes the operative's cmux pane/feed and relays; Jonah directs from here.

## Built: justify-go launcher
justify/cli/justify-go.sh (new). `justify-go [project-dir]`: (1) justify-init inject, (2) resolve site URL from .lando.yml + `lando start` if not responding, (3) open browser, (4) `exec cmux claude-teams "<operative prompt>"` to launch the active operative. The operative prompt seeds bootstrap (load justify_status via ToolSearch, poll until connected, justify_activate, confirm a connected tab, cert hint on failure) + a standing ACTIVE LISTEN LOOP (justify_watch -> justify_apply_changes -> apply diffs to source; annotations -> acknowledge; loop forever). Because the last step exec's an interactive claude-teams session, justify-go is meant to be RUN BY THE USER in their terminal/cmux - it cannot be fully run from a headless bash tool (the exec would replace the shell). Deterministic steps (init/url/lando/open) are testable; the operative launch is the user's one command.

## Installed + wired (verified)
- justify-go installed: ~/.claude/justify/justify-go.sh, symlinked /opt/homebrew/bin/justify-go (on PATH). install.sh now cp's + chmods + symlinks justify-go alongside init/remove (bash -n clean). Canonical: justify/cli/justify-go.sh.
- Deterministic steps verified: bash -n OK; URL detection from yesand .lando.yml -> name `yesand` -> https://yesand.lndo.site/ (correct). Reachability check returned HTTP 000 = the Lando site is currently DOWN (stopped during this long session) - which is exactly the branch justify-go handles by running `lando start`.
- HONEST caveat on <60s: everything except a COLD Lando boot is sub-minute. If the site is down (as now), `lando start` cold-boots Docker containers and can exceed 60s - that is inherent to WP/Lando, not Justify. When the site is already up, justify-go -> operative is well under a minute.

## Next (Jonah's one command)
- Jonah runs `justify-go` in the yesand dir (or `justify-go /Users/spare3/Documents/Github/yesandwebsite`). It injects, ensures the site is up, opens the browser, and exec's the operative (cmux claude-teams) which connects the justify MCP, activates, and enters the justify_watch active-listen loop. Then confirm justify_status shows a connected tab + the toolbar. (The operative exec is interactive, so it must be run from Jonah's terminal/cmux, not a headless tool.)
