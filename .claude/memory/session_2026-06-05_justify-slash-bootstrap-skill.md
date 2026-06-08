---
name: /justify self-healing bootstrap skill + Justify installed (migrated off legacy improv)
description: Jonah (2026-06-05) wanted "/justify" to start everything up in whatever project a Claude session is open in, with a self-healing path that keeps working until Justify is verified live in-browser. Discovered Justify was NOT installed (only legacy improv was). Rewrote justify/install.sh's skill heredoc into a self-healing /justify bootstrap, ran install.sh -> Justify now installed (server, core, CLI, skill, MCP registered). Two things before /justify is live: retire legacy improv (9223 conflict) and restart the session (MCP attaches at start).
type: project
relates_to: [session_2026-05-29_endow_to_justify_rename.md, session_2026-06-05_yesand-local-env-up.md]
---

Collaborator: Jonah. 2026-06-05.

## Trigger decision
/justify (explicit slash command) starts everything; skill description also catches "start/launch/wire up/fire up justify". Jonah declined the fuzzy-natural and one-passphrase options. He also required: a self-healing path - if a step fails, Claude keeps working until Justify is up, running, and VERIFIED in the browser. And "no open ended questions" - proceed, decide, act.

## Key discovery
Justify was NOT installed on this machine. The 2026-05-29 improv->justify rename touched repo SOURCE only; the live install was never migrated. Before this session: no ~/.claude/justify, no justify MCP server, nothing on 9223/9224, no justify-init; the LIVE tool was still legacy `improv` (~/.claude/improv, improv skill, improv MCP server - the toolbar that kept connecting/disconnecting this session).

## Runtime model (from source)
- The `justify` MCP server = node ~/.claude/justify/dist/server/index.js (stdio), launched by Claude Code. On start it kills stale 9223, runs WsServer on 9223 (ws+http), and an HTTPS server on 9224 (port+1) serving justify-core.js with a self-signed cert at dist/server/certs/cert.pem. The injected tag uses https://localhost:9224/justify-core.js (avoids mixed-content on https sites).
- Cert trusted once per machine via setup-cert.sh (sudo -> System Keychain).
- justify-init wires the project: WordPress -> WP_DEBUG=true + WP_DEBUG-gated wp_enqueue_script in the active non-twenty* theme functions.php; vite/next/drupal/generic -> index.html/layout/libraries.
- Activation: justify_activate MCP tool (reliable) or cmd+shift+. (init.sh) - note the OLD skill said cmd+shift+i; reconciled to use justify_activate + cmd+shift+.
- 11 MCP tools: justify_activate/status/get_selection/get_pending_changes/apply_changes/get_annotations/watch/acknowledge/get_layout/get_components/clear.

## What shipped this turn
- Rewrote the skill heredoc in justify/install.sh: was usage-only; now a self-healing /justify bootstrap (Step 1 server-up+install-if-missing+restart-prompt, Step 2 cert, Step 3 justify-init, Step 4 site running, Step 5 load+activate+VERIFY with justify_status connection AND a toolbar screenshot, plus a self-heal quick map) followed by the usage/modes/MCP-tools reference. Uses a __JUSTIFY_SRC__ placeholder substituted to $SCRIPT_DIR by a sed after the heredoc (heredoc is quoted).
- Ran bash justify/install.sh. Result: built dist/justify-core.js + dist/server/index.js, symlinked justify-init/justify-remove to /opt/homebrew/bin, registered the `justify` MCP server in ~/.claude.json, wrote ~/.claude/skills/justify/SKILL.md. Verified: 0 __JUSTIFY_SRC__ remaining; skill references the real source path; justify-init on PATH; both dist artifacts present.

## Blockers before /justify is LIVE
1. DONE (Jonah approved): legacy `improv` MCP server UNREGISTERED from ~/.claude.json (was fighting justify on 9223). Backup at ~/.claude.json.bak-before-improv-unregister. ~/.claude/improv FILES left in place (not deleted - didn't create them; can remove later if wanted). Remaining mcpServers: auggie, pencil-*, voice-output, justify. The legacy `improv` SKILL (~/.claude/skills/improv/) is also still present and could be removed for cleanliness later.
2. REMAINING: session RESTART required - MCP servers only attach at session start, so the justify_* tools go live only after a restart.
After restart: run /justify in the yesand project to validate the full self-healing bootstrap live against yesand.lndo.site.

## Files
- justify/install.sh (skill heredoc rewritten + sed substitution). Live install written to ~/.claude/justify/, ~/.claude/skills/justify/SKILL.md, ~/.claude.json (justify MCP).
