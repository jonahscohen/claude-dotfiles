---
name: Improv connection detection
description: Connection-aware UX for improv - detects active Claude watcher, hides send when disconnected, shows alert banner, Claudebar Connected flash
type: project
relates_to: [session_2026-05-14_dishplayscapes-improv.md, session_2026-05-13_improv-postmortem.md, decision_improv_http_polling_watch.md]
---

Collaborator: Jonah

## Debugging findings (Claudebar silent failure - original issue)

- Server running on 9223, 1 browser connection
- 3 prompts in prompts.json (server received all 3 via push_prompt)
- prompts 2+3 are 2ms apart (batch from Send All)
- No claude-state.json exists - _persistClaudeState never ran
- Root cause not fully traced - likely _core is null in the submission context

## Connection-aware UX (implemented)

### Server: watch-status endpoint
- `lastPromptPoll` field on WsServer, set on every GET /prompts
- GET /watch-status returns `{ active: boolean, lastPoll: number, pendingCount: number }`
- Active = polled within 15 seconds

### Client: connection monitor
- Polls /watch-status every 5s from ImprovCore.init()
- Tracks `_watchActive` boolean with 3-miss threshold (15s) for disconnect
- On connect: calls `_onWatchConnected()` -> unblocks send, shows Claudebar flash
- On disconnect: calls `_onWatchDisconnected()` -> blocks send, shows alert/disconnected bar

### Send suppression (disconnected state)
- InlinePrompt.`_sendBlocked` field gates sendNowBtn visibility and `_submit()` method
- Cmd+Enter blocked when `_sendBlocked = true`
- Queue button still works (user can queue tasks while disconnected)
- Send All button hidden via `display:none` when disconnected
- Applied on PromptMode creation AND when state changes dynamically

### Alert banner (queue panel)
- Renders above Send All/Clear All in queue panel
- "Claude is not connected" (bold, 11px) + "Tell Claude `watch improv` to start receiving tasks."
- `watch improv` in monospace code style span
- Slides out (opacity + translateY) when watcher connects
- Slides in when watcher disconnects while panel is open

### Claudebar "Connected" flash (iteration 4)
- New state: 'connected' added to _claudeState union
- On _onWatchConnected: shows Claudebar with thinking sprite, "Connected" label
- Auto-dismisses after 3s via _removeClaudeBar(false)
- No persist, no 60s timeout (transient notification only)
- Cancelled if watcher disconnects during the 3s window

### Mid-session disconnect (iteration 5)
- If in sending/working/retrying when watcher drops:
  - Clears 60s retry timeout
  - Shows "Connection lost" bar (static Claude icon, pulsing orange border)
  - Hover tooltip: "Say 'watch improv' to reconnect"
- Reconnection removes disconnected bar and shows normal "Connected" flash

### Detection mechanism - three iterations
1. **v1 (lastPromptPoll on HTTP)**: tracked GET /prompts hits. Bug: MCP watch uses `improv_get_prompts` tool, never touches HTTP. Always showed disconnected.
2. **v2 (server reachability)**: if fetch to /status succeeds, Claude is live. Bug: server running != Claude watching. Gave false confidence, user submitted tasks into void.
3. **v3 (MCP activity tracking)**: `ws.recordMcpActivity()` called in `improv_get_prompts` handler. `/watch-status` returns active if MCP tool called within 30s. Client polls `/watch-status` and checks `data.active`.

### Stale state restore guard
- `_loadClaudeState` now checks `/watch-status` BEFORE restoring persisted Claudebar state
- If watch isn't active, skips restore entirely - prevents "Working" bar appearing on reload from dead sessions
- Cleared stale claude-state.json and prompts.json from prior broken sessions

### improv_working broadcast moved from push to pickup
- Was: server broadcast `improv_working` in `push_prompt` handler (instant, before anyone reads it)
- Bug: Claudebar went straight to "Working" even when no session was watching. Stuck looping.
- Fix: broadcast `improv_working` in `improv_get_prompts` handler when Claude ACTUALLY picks up prompts. Claudebar stays in "Sending" until Claude reads it. 60s timeout fires if nobody picks up.

### Polish fixes (self-audit)
- Alert banner: added info-circle SVG icon (Lucide alert-circle, #D97757 stroke) inline with title
- Blocked submit feedback: Cmd+Enter while disconnected flashes input border orange (600ms) instead of silent return
- sendNowBtn show animation: 200ms cubic-bezier transition on transform+opacity when unblocking
- Disconnected bar tooltip: full text "Claude disconnected. Say 'watch improv' to reconnect."

### Input field scroll tracking
- InlinePrompt container now repositioned in the same rAF loop as edit highlights
- Stays locked below the highlighted element during scroll
- Tracks bottom edge of element + 12px offset for positioning
- Kills CSS transition (was 200ms on left/top from show()) before rAF tracking starts - eliminates visible lag
- Viewport check: when element scrolls out of view (rect.bottom < 0 or rect.top > viewport), highlights + label + input all hide. Reappear when scrolled back into view.
- Queue item click scrolls target element to vertical center of viewport (instant scroll) before showing highlights + input
- Scroll uses behavior:'instant' to snap element to center
- Input positioned at fixed viewport center (not tracking element) - no elastic lag
- rAF loop only tracks highlight overlays, not input
- Prompt mode deactivates when entering edit mode (edit is independent, no lasso/selection)
- Activating prompt mode closes any active edit immediately
- deactivate() now clears edit highlights, resets _editingIdx, AND destroys prompt BEFORE the `if (!this.active) return` guard. Root cause: edit mode sets active=false then creates its own prompt; when switchMode calls deactivate() later, early return skipped prompt.destroy(), leaving orphaned edit input in DOM.
- Input positioned below element with transition:none set AFTER show() - locked to element via rAF without elastic lag
- Input hides when element scrolls out of view, reappears when back in view

### Unified highlight style + scroll tracking
- Edit mode highlights now use the same overlay style as prompt mode selection (semi-transparent bg + colored border + dark pill label at top-right with icon + tag name)
- Removed custom orange-border + top-left tooltip highlight (was a second inconsistent style)
- Added rAF scroll tracking (_editTracked, _editRaf) so highlights follow elements during scroll
- Label repositions to stay in viewport (flips to left side if overflows right edge)
- Overlays appended to overlay container (not document.body), cleaned up via _clearEditHighlights

### Queue edit mode rewrite
- Row click triggers edit (skips if click was on edit/delete button)
- Edit does NOT activate full prompt mode - no lasso, no element selection
- Creates InlinePrompt directly if needed, without switchMode('prompt')
- Highlights target elements with fixed-position #D97757 border + selector tooltip (data-edit-highlight)
- Highlights cleaned up on exitEditMode (confirm, delete, or Escape)
- Confirm persists queue to server; delete persists after splice
- Element label format: `tagName .lastSelectorSegment` (matches selection tooltip style)

### Queue panel UX fixes
- Queue item rows now clickable (click triggers edit, skips if click was on a button)
- _editQueueItem guarded against null prompt: switches to full prompt mode first if lightweight
- Falls back to center-screen prompt position if target element not in DOM (post-refresh)
- Element label: shows selector name for single-element items instead of "1 element"; still says "N elements" for multi

### Sticky session flag fix - require recent activity
- Previous: session flag stayed true forever once set, even when watching Claude session died
- Result: browser thought Claude was connected, prompts piled up unread
- Fix: `/watch-status` now requires BOTH `watchSessionActive` AND `lastMcpActivity` within 10s
- Watch loop polls every 500ms internally calling `recordMcpActivity`, so live watch keeps activity fresh
- When Claude session dies, activity goes stale within 10s -> active flips false even if session flag stuck
- 10s window is short enough to detect dead sessions, longer than the 500ms internal poll interval

### Clear Completed Tasks dismisses Claudebar
- onClearReviewed callback now checks for remaining actionable entries
- When empty: hides changes panel AND removes Claudebar (if state is review/review-active)
- Prevents orphaned Claudebar from showing after clearing all tasks

### Mark Done scroll preservation
- onDone/onUndoDone callbacks were calling `changesPanel.show()` which scrolls to bottom (line 209)
- Removed redundant show() calls - markDone has its own internal filterEntries+render that preserves scroll
- Undo Done button now calls render() locally instead of relying on callback to re-sync
- Scroll position now preserved when marking items done or undoing

### Spark sprite sheet sizing fix
- Sprite SVGs were squashing all frames into 18px (container's overflow:hidden ineffective because SVG was sized to fit container)
- Fix: in `_animateSpark`, after inserting SVG, force `style.width=18px`, `style.height=frameCount*18px`, `style.display=block`
- Now each frame is 18px tall, container clips to one frame, translateY cycles through them properly

### Queue listWrap padding
- listWrap container padding changed from 8px 12px to 10px 15px

### Queue list last item margin
- Queue panel rows no longer apply margin-bottom:6px on the last item
- Conditional: `idx < this._changeQueue.length - 1 ? "margin-bottom:6px;" : ""`

### Empty "Review Changes" bar guard
- _claudeToReview now checks for unreviewed entries before showing the bar - dismisses if empty
- _claudeBarClick dismisses the bar instead of silently doing nothing when no actionable entries exist
- Prevents stale "Review Changes" bar from persisted state when _changeHistory is empty

### improv_watch rewrite - zero indirection
- Combined `improv_watch` + `improv_get_prompts` into one tool call
- Watch now blocks until a prompt arrives (250ms poll interval, 120s default timeout)
- On prompt detection: immediately broadcasts `improv_working`, returns full prompt content, clears prompts.json
- Claude processes directly from watch output, calls `improv_respond`, then loops back to `improv_watch`
- Eliminates the watch->get_prompts round trip that added seconds of latency
- Idle return: `{"status":"idle"}` when timeout elapses with no prompts

### WebSocket auto-reconnect
- Transport.scheduleReconnect was fire-once: if reconnect failed after 3s, it gave up permanently
- Fix: on failure, calls scheduleReconnect() again - retries every 3s until connection restored
- This means server restarts no longer permanently kill the browser's ability to send prompts
- Combined with the persistent watch session flag, the browser stays "connected" through server restarts

### Persistent watch session (no more disconnect/reconnect)
- Added `watchSessionActive` boolean flag to WsServer (not timestamp-based)
- `improv_watch` calls `ws.setWatchSession(true)` on entry - flag stays set permanently
- New `improv_end_watch` tool calls `ws.setWatchSession(false)` - only way to explicitly disconnect
- `/watch-status` returns `active: true` if EITHER session flag is set OR recent MCP activity (120s fallback)
- No more gaps between tool calls causing disconnect. Once Claude enters watch loop, browser stays connected until explicit end.
- User says "end improv" or "stop watching" -> Claude calls `improv_end_watch` -> browser shows disconnected

### Connection drop during processing fix
- Root cause: between `improv_watch` returning and `improv_respond` being called, Claude spends 30+ seconds processing with no `recordMcpActivity` calls. The 30s staleness window expired mid-processing.
- Fix 1: `ws.recordMcpActivity()` added to ALL 13 MCP tool handlers (was only in 3). Any tool call keeps the connection alive.
- Fix 2: staleness window increased from 30s to 120s in `/watch-status` endpoint. Claude can take up to 2 minutes between tool calls without triggering disconnect.
- Key tool: `improv_respond` now calls `recordMcpActivity` so the connection stays alive through the response broadcast.

### Submit failure handling + empty queuebar
- All 3 submit paths (submitPrompt, submitFromQueue x2) now catch transport.request failures and revert Claudebar (removeClaudeBar + state=none) instead of leaving it stuck on "Sending"
- `_updateClaudeBadge` now requires BOTH queueCount > 0 AND pill has child elements to show. Prevents empty pill from displaying after Clear All removes btn/label.
- `improv_watch` tool now calls `ws.recordMcpActivity()` at start + every 500ms poll tick (was only in `improv_get_prompts`)

### Auto-detection chain (verified against source)
Full chain confirmed in code - no refresh needed:
1. `mcp-tools.ts:234+249` - `ws.recordMcpActivity()` called in BOTH `improv_watch` (at start + every 500ms poll tick) AND `improv_get_prompts`
2. `ws-server.ts:485-486` - `recordMcpActivity()` sets `this.lastMcpActivity = Date.now()`
3. `ws-server.ts:249-259` - `GET /watch-status` returns `active: true` if `lastMcpActivity` within 30s
4. `index.ts:990-1018` - `_startWatchMonitor()` polls `/watch-status` every 5s via `setInterval`
5. `index.ts:997-999` - when `data.active` flips true, sets `_watchActive = true`, calls `_onWatchConnected()`
6. `index.ts:1021-1033` - `_onWatchConnected()` calls `setWatchActive(true)` on promptMode + shows Claudebar "Connected" flash
7. `prompt/index.ts:1610-1632` - `setWatchActive(true)` unblocks send, shows Send All, fades alert banner out if panel open

### Alert banner styling polish
- Added box-shadow: 0px -10px 25px 10px #1a1a1a (covers scrolled items above)
- Heading: 11px -> 13px, margin-bottom: 4px -> 8px
- Body: 12px -> 11px

### Empty queuebar after clear-then-requeue
- Clear All removes btn/label DOM elements and nulls refs (_queueBtn, _queueLabel, _queueCount)
- When new task queued after clear, _updateQueueBadge had no elements to update
- Fix: _updateQueueBadge now recreates btn/count/label inside _actionPill when refs are null but queue has items
- Used setTimeout(50) for slide-in animation instead of nested rAF (rAF was unreliable after display:none->flex transition)

### Brand orange hardcoded - full app
- Replaced ALL `#3b82f6` with `#D97757` across every .ts file in improv/core/
- Removed marker color picker UI entirely from settings panel (swatch row, click handlers, localStorage persist)
- `onMarkerColorChange` is now a no-op, `getMarkerColor` returns hardcoded `#D97757`
- Affected files: toolbar.ts, index.ts, overlay.ts, prompt/index.ts, prompt/inline-prompt.ts, manipulate/state-toggle.ts, manipulate/property-panel.ts, annotate/lasso.ts, annotate/markers.ts, layout/index.ts, layout/palette.ts

## Files changed
- `improv/server/ws-server.ts` - lastPromptPoll field, GET /watch-status endpoint
- `improv/core/index.ts` - _watchActive, _watchPollInterval, _startWatchMonitor(), _onWatchConnected(), _onWatchDisconnected(), _showDisconnectedBar(), 'connected' state
- `improv/core/prompt/index.ts` - _watchActive, _sendAllBtn, setWatchActive(), alert banner in _toggleQueuePanel
- `improv/core/prompt/inline-prompt.ts` - _sendBlocked, setSendBlocked(), guard on _submit() and sendNowBtn show logic
- `improv/dist/improv-core.js` - rebuilt
- `~/.claude/improv/dist/server/*.js` - server rebuilt and deployed
