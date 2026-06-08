---
name: HTTP-daemon status flow, icons, and connection-banner fixes
description: Fixed Working-state, broken icons, false Disconnected, and stuck "not connected" banner in the curl/HTTP listen model
type: decision
relates_to: [session_2026-05-19_sending-to-claude-flash.md, session_2026-05-16_claudebar-timeout-retry.md]
---

Reported by Jonah: in the HTTP-daemon (curl, no-MCP) listen model the Claudebar only showed "Sending to Claude" then changes appeared silently after a refresh; a spurious "Disconnected" flashed mid-task; and the status icons were broken/blank. Collaborator: Jonah.

Four root causes, all specific to the HTTP path (the old MCP-tool path masked them):

1. **"Working" never showed.** `justify_working` was broadcast only by the MCP tools (`mcp-tools.ts` justify_watch/justify_get_prompts). The curl listen loop hits `GET /prompts`, which never broadcast it. Fix: `ws-server.ts` `GET /prompts` now broadcasts `justify_working` for each pending prompt it returns (claiming over HTTP == the watch claiming it). Browser ignores it unless state is 'sending', so re-broadcast on every poll is a no-op.

2. **Broken/blank icons.** The Claudebar fetches sprite sheets at `/spark-<name>.svg`, served from `dist/`. Nothing ever copied `assets/spark-*.svg` into `dist/` (build.js only bundled JS; install.sh never copied assets/ or fonts/), so every spark 404'd. Fix: build.js copies `assets/spark-*.svg` -> dist/; deploy.sh syncs them to the install dist; install.sh now copies `assets/` and `fonts/` into the install dir (fixes silently-missing JustifySans too).

3. **Spurious "Disconnected" mid-apply.** `/watch-status` `active` required activity within 10s, but Claude stops polling `/prompts` while applying a change -> active flips false -> browser shows "Connection lost". Fix: widened the window to 30s and bump `lastMcpActivity` on `/respond` and `/prompts/clear` too; AND in `core/index.ts` `_onWatchDisconnected`, suppress the disconnect bar while state is 'working'/'retrying' (the 60s retry timeout is the real dead-Claude backstop). Now only a stalled 'sending' (never claimed) surfaces a disconnect.

4. **Queue panel stuck on "Claude is not connected".** `PromptMode` keeps its own `_watchActive` (default false), synced only via the core's `_onWatchConnected`, which is guarded by the core's own `_watchActive`. When the panel re-creates (flag resets) while the core flag is already true, the guard skips re-sync and the banner sticks - blocking "Send All" even though watch is active. Fix: `_startWatchMonitor` now calls `promptMode.setWatchActive(this._watchActive)` every poll (debounced core flag, so no flapping).

**Verified live** on http://yesand.lndo.site (http core on http page): spark endpoints now 200; drove a real prompt via Send All and watched the pill progress Sending to Claude -> **Working** (orange radial spinner icon) -> **Review Changes** (starburst icon), no spurious Disconnected; banner correctly cleared and "Send All" appeared once watch was active under a continuous 2s poll.

Server change requires a daemon restart (kill :9223, `justify-serve`); core change is client-side (rebuild+deploy+reload). Still open: the user also asked for a "vanity" visual enhancement to make tracking clearer - deferred pending their direction on what specifically.

Also added (per Jonah): a clean terminal presentation for the listen loop, replacing the raw `for ... curl ... done; echo IDLE` / `curl /respond` blocks.
- `cli/justify-watch.sh` - poll helper. Prints orange/dim glyph status (◌ watching, ◉ task-in, ┌/└ card with prompt + id + target) and writes raw prompt JSON to $JUSTIFY_INBOX (/tmp/justify-inbox.json) so visible output stays clean. Args: [window_seconds=150] [interval=2].
- `cli/justify-done.sh` - respond helper. POSTs /respond + /prompts/clear and prints a `✓ sent to browser` card (summary + files). Args: `<promptId> <summary> [comma,files]`; env JUSTIFY_CHANGES (JSON array) / JUSTIFY_STATUS for structured diffs / needsInfo.
- Both use ANSI 256-color (Jonah confirmed the Claude Code terminal renders the color). NO_COLOR disables.
- Wired in: install.sh copies both to the install dir + symlinks `justify-watch`/`justify-done` into BIN_DIR; the installed skill `~/.claude/skills/justify/SKILL.md` Step 5 now calls them (raw curl kept as fallback). Symlinked live into /opt/homebrew/bin this session.

KNOWN DEBT (flagged, not fixed): the skill text is embedded as a heredoc inside install.sh and that copy is STALE - it still describes the old MCP/WebSocket model ("over a WebSocket", "no daemon", justify_status MCP tool), while the installed SKILL.md is the current HTTP-daemon version. A fresh `install.sh` run would overwrite the good installed skill with the stale MCP text. The heredoc needs reconciling to the HTTP model (and to include the justify-watch/justify-done loop). Out of scope for this session.

Follow-up fix (Jonah, confirmed fixed): the queue panel "Claude is not connected" banner spanned the full panel width on FIRST open (touching borders) instead of the 16px gutters its siblings use. Cause in `core/prompt/index.ts`: the banner base cssText sets `margin:0 16px 12px`, but if the panel is created while watch is active the collapse path overwrites inline margin to "0"; the reveal path in `setWatchActive(false)` then did `alert.style.margin = ""`, which clears the inline margin entirely and falls back to 0 (no stylesheet rule) -> full width. Later opens rebuild the panel with watch already inactive, so the base 16px stays (looked fine). Fix: reveal path now sets `alert.style.margin = "0 16px 12px"` explicitly instead of clearing it.

Files touched: server/ws-server.ts, core/index.ts, core/prompt/index.ts, build.js, deploy.sh, install.sh, cli/justify-watch.sh (new), cli/justify-done.sh (new), ~/.claude/skills/justify/SKILL.md (installed skill, Step 5 + watch-window number)
