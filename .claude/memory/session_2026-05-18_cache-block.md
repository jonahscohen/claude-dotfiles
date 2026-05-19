---
name: session-2026-05-18-cache-block
description: Identified the root cause of the recurring "fix doesn't show up" problem. The WS server doesn't send Cache-Control headers so browsers cache the bundle aggressively. The server-source fix exists on disk but the MCP server's Node process has the old code cached and won't pick up the new code without a restart.
type: project
relates_to: [session_2026-05-18_scroll-safety-net.md, session_2026-05-18_real-input-validation.md]
---

## 2026-05-18 Cache block on real-input validation

### Symptom

Repeated user-input validation through the prompt mode showed: every time I added a task with the queue panel already open, the BADGE PILL count incremented (8 -> 9) but the PANEL HEADER stayed at the old count (8) and no new row appeared in the visible list.

This is the live-update bug the user has been reporting all day, reproduced under real input.

### Root cause

Two layers of code:
1. Browser-side: `_appendQueueRowAnimated` in `improv/core/prompt/index.ts`. My latest fix includes the WAAPI animator, the `settle()` safety net, the instant scrollTop assignment, and the header text update. Deployed to the WS server at /Users/spare3/.claude/improv/dist/improv-core.js (md5 343da52e3a3da31c0b0ad7e3c7f5a862, mtime 16:55).
2. Server-side: `ws-server.ts` source has a fix that adds `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` headers to bundle responses AND strips query strings from the URL match so `?v=...` cache-busting works. Built and synced to `~/.claude/improv/dist/server/`.

The bug: layer 2 is on disk but the MCP server process (spawned at Claude Code startup) has the OLD compiled code loaded in Node's module cache. Node doesn't hot-reload required modules. So the running server STILL serves bundles WITHOUT cache headers. Browsers cache them. Even hard-reload uses disk cache.

The browser's bundle is therefore an older version that DOESN'T include `_queueHdrText` and `_queueListEl` ref assignments and DOESN'T have the `_appendQueueRowAnimated` call site. So the badge count updates (in `_updateQueueBadge` which exists in older bundles too) but my new code path doesn't fire.

### Validation evidence

`/tmp/proof-after-autoscroll.png` (Read'd via the screenshot-open mandate):
- Panel header: `QUEUED TASKS (8)`
- Bottom-left pill: `9`
- The data layer updated to 9, but the open-panel header update path didn't fire.

This proves:
- The real-input flow works (Enter triggered the queue push, _updateQueueBadge fired and updated the pill count).
- My fix isn't running in this browser session.
- Therefore the bundle in the browser is older than what's on disk.

### What needs to happen

For my fix to actually reach the user's browser, ONE of these has to occur:
1. **The user restarts Claude Code** so the MCP server restarts and picks up the new ws-server.ts compiled output, which sends `Cache-Control: no-store`. Next page reload then gets the latest bundle.
2. We manually edit the WordPress functions.php enqueue to add a `?v=filemtime(...)` cache buster on the bundle URL. The user previously reverted this approach because it broke live refresh - but that was when I pointed it at a local path. Pointing at the WS server URL with `?v=` would work AFTER the server's URL-strip fix takes effect. Same restart dependency.
3. We patch the running MCP server's compiled `dist/server/index.js` AND restart it. Same as 1 in practice (restart still required).

There is no in-browser-only fix because the page can't override its own bundle's cache behavior once the bundle is already loaded.

### File state on disk

- `improv/core/prompt/index.ts` - has all my fixes (settle, WAAPI animator, scroll safety net, header update)
- `improv/server/ws-server.ts` - has Cache-Control and query-strip fixes
- `improv/dist/improv-core.js` - rebuilt, matches source. md5 343da52e...
- `improv/dist/server/index.js` - rebuilt, matches source. Has cache headers code.
- `~/.claude/improv/dist/improv-core.js` - synced, matches
- `~/.claude/improv/dist/server/index.js` - synced, but the running MCP server is using the OLD version (in-memory)

### Lesson

The Node module-cache pattern with MCP servers means server-source changes don't apply until Claude Code restart. The browser bundle is fine; the bottleneck is the server-side cache header fix that's stuck behind a process restart. I should have either flagged this clearly when I made the ws-server.ts edit, or built a guardrail that warns "this change won't take effect until MCP restart."

### Resolution

After the user restarted the MCP server (new PID 36820, started 5:11PM), the WS server now serves bundles with `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` and `Pragma: no-cache` headers AND accepts query strings (verified `?v=test` returns 200). One hard reload of the dishplayscapes page in chrome MCP pulled the fresh bundle.

Validation captured at `/tmp/post-restart-validation.png` (Read'd via the screenshot-open mandate). After real user input flow (toolbar prompt-mode click, "Watch, Play and Win!" heading click, inline prompt click, type "POST RESTART PROOF", press Return):
- Panel header: `QUEUED TASKS (3)` -> `QUEUED TASKS (4)` (live, no reopen)
- Pill: 3 -> 4
- New row `4 POST RESTART PROOF` visible at the bottom of the panel
- Auto-scroll worked: items 1 (cropped), 2, 3, 4 visible; row 4 at the bottom of the visible area

All three user-requested behaviors confirmed under the screenshot-open mandate AND the validation-trigger guard (both hooks active, blocking JS shortcuts). The full chain of fixes required to get here:
1. WAAPI-based row reveal animator with cubic-bezier easing
2. Padding-shorthand restoration fix in the finish handler
3. settle() safety net via setTimeout
4. Cache-Control: no-store on bundle responses
5. Query-string strip in URL matching
6. MCP server restart to load the cache-header code

Collaborator: Jonah Cohen
