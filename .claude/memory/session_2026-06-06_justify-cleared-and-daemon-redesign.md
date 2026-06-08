---
name: Cleared Justify from yesandwebsite + redesigning /justify around a persistent HTTP daemon (not session-tied MCP)
description: Jonah stopped seeing Justify in yesandwebsite. Root cause - the server ran as a Claude session's MCP, so it died when the operative session shut down. Cleared the injection (functions.php enqueue + .justify marker) and committing to rebuild /justify so the server runs as a STANDALONE DAEMON (serves 9223/9224 independent of any session) and the session talks to it purely over HTTP (curl /prompts to listen, POST /respond to report back). Goal restated by Jonah: /justify -> started + loaded in browser + listening + reporting changes back, in <60s, in ANY session, persisting after.
type: decision
relates_to: [session_2026-06-05_justify-listen-loop-http-polling-fix.md, decision_improv_http_polling_watch.md, session_2026-06-05_justify-is-the-one-command.md]
---

Collaborator: Jonah. 2026-06-06. Said yes to "can you do it" - this is the plan + the cleanup done.

## Why Justify wasn't showing (root cause)
The justify server runs as the `justify` MCP server, launched by Claude Code for the session's lifetime. When the operative/team session shut down, the MCP server process died -> nothing serving 9223 (WS) / 9224 (HTTPS justify-core.js) -> the injected justify-core in the browser had nothing to connect to -> no toolbar. Justify's uptime was tied to a session. That is the fragility to remove.

## The redesign (clean root, not a workaround)
Decouple the server from any session: run `node ~/.claude/justify/dist/server/index.js` as a PERSISTENT BACKGROUND DAEMON (it already serves 9223 ws+http and 9224 https standalone - proven earlier; the stdio MCP transport simply has no client). The Claude session interacts ENTIRELY over HTTP, no MCP dependency: justify-init injects https://localhost:9224/justify-core.js; the listen loop is `curl http://localhost:9223/prompts` (the reliable path per decision_improv_http_polling_watch); reporting back is `POST /respond`. This means /justify works in THIS session too (no MCP needed), and Justify stays up after the session ends.

**Alternatives considered:** keep the MCP-server model (rejected: ties uptime to a session, the exact bug); a launchd/managed service (rejected for now: heavier than a nohup daemon, revisit if the daemon needs to survive reboots).
**Why this one:** the curl HTTP path already exists and is the documented-reliable listener; the server already runs standalone; a daemon + curl removes the only fragile dependency in one move. **Revisit when:** the daemon should survive machine reboot (then promote to launchd).

## Cleared from yesandwebsite (done, on throwaway-test branch)
- wp-content/themes/astra-child/functions.php: removed the `// justify:dev` WP_DEBUG-gated wp_enqueue_script('justify-dev', ...) block (was lines 33-38, the file tail). Now 32 lines, 0 justify refs. Backup at /tmp/functions.before.php.
- Removed the .justify marker.
- LEFT wp-config.php WP_DEBUG=true untouched (it is the user's general dev setting; harmless without the enqueue).

## Found a real gap to fix in the rebuild
justify/cli/remove.sh is INCOMPLETE for WordPress: it removes the .justify marker, a public/justify-core.js copy, and Drupal .libraries.yml entries - but NOT the WP functions.php enqueue that init.sh's WP branch adds. So `justify-remove` alone would have left the injection. Fix remove.sh to mirror init.sh's WP branch (bounded removal of the // justify:dev block from the active theme functions.php).

## Next (the build)
1. Fix remove.sh (WordPress branch) so clearing is complete + reversible.
2. Rebuild /justify skill (+ a daemon helper): step 1 becomes "ensure the justify daemon is up (start nohup if nothing on 9223)"; keep init/cert/browser/curl-listen-loop. Drop the MCP-connection dependency from the critical path.
3. PROVE IT LIVE end-to-end (not architecturally): start daemon, inject, open browser, drive a real toolbar change, watch it flow browser -> curl /prompts -> apply -> POST /respond -> browser Changes panel. Under 60s with the site already up.

## Files
- (yesandwebsite) wp-content/themes/astra-child/functions.php (justify block removed); .justify deleted.
