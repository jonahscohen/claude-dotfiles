---
name: Dish Playscapes improv session
description: Improv watch session on dish-playscapes.lndo.site - interior hero centering, Claude Spark sprites, Claudebar + Queuebar prototypes and production, bug fixes, timeout/retry/batching
type: project
relates_to: [session_2026-05-14_changes-panel-list-view.md, session_2026-05-13_improv-punchlist.md, session_2026-05-13_improv-postmortem.md, decision_improv_claudebar_architecture.md]
---

Collaborator: Jonah

## Changes

### Interior hero card image centering
- `.interior-hero__card-image` already had `max-width: 800px` in SCSS
- Added `margin: 0 auto` to center the image within its 1080px-wide `.interior-hero__card` parent
- Compiled SCSS to CSS via `npx sass`
- Verified in Chrome: image centered in hero section on homepage

### Claude animated spinner for improv
- Extracted the REAL Spark animation sprites from Claude desktop app (/Applications/Claude.app)
- Component is called "Spark" internally, located in `c6a992d55-D5kpo8DQ.js` and rendered by `c7d6fc21a-vP0N4hIj.js`
- Animation technique: vertical SVG sprite strips, animated with `translateY` + CSS `steps()` (stop-motion)
- 8 states extracted: thinking (9f/90ms), writing (8f/90ms), waiting (16f/600ms), tickle (7f/40ms), orbiting (18f/100ms), shimmer (15f/100ms), entrance (6f/70ms), exit (6f/70ms)
- Saved thinking + writing SVG sprites to `improv/assets/spark-thinking.svg` and `spark-writing.svg`
- Demo page at `improv/assets/claude-spinner-demo.html` with all 9 columns (static + 8 states)
- Rebuilt demo to use Web Animations API (matching real Spark component) instead of CSS keyframes
- Waiting: curated to 7 frames (3,5,8,9,12,15,16) at 80ms each
- One-shot states (tickle, entrance, exit) have Replay buttons using Web Animations API
- Updates pill component: `improv/assets/updates-pill.html` - 5 pill states in 3-col grid: Sending (thinking + ellipsis), Working (writing + ellipsis), Retrying (orbiting + ellipsis), Update Available (waiting, clickable, pulsing orange border/glow at rest), Review Changes (static icon-only, hover hint above). Active state: animation:none restores normal border. Queuebar dimensions, ImprovSans, 18px icon. Server rooted at improv/.
- Retry Send pill: Lucide Animated redo icon, hover jiggle+pathLength animation, transform-box:fill-box fix for SVG transform-origin
- Carousel playground: bottom half, 6 slides. Sending=writing sprite, Working=shimmer, Retrying=orbiting, Retry Send=redo icon, Review Changes=waiting (hover->thinking). Slide 2: icon-only entry->width grows. Text crossfades with width easing. One-time Review Changes collapse; subsequent clicks toggle active only. "Send New Changes" resets to Sending. "Dismiss All Changes" fades pill to Empty. All verified.
- Send/erase button icons resized to 18x18 (was 20x20 and 22x22) in prompt/index.ts. Built. Deployed to dishplayscapes/improv-core.js (server serves from project root, not improv/dist/).
- Queue pill prototype: `improv/assets/queue-pill.html` - number circle + "Queued Changes" label, click collapses to circle + opens panel above (slide-fade up). Panel rows match changes-panel format: numbered circles, summary, CSS targets, edit/delete icon buttons (Lucide pencil + trash-2, show on hover). Clear All + Send All buttons at bottom. Count bump animation on add. Label collapse uses explicit width capture for smooth transition.
- Dual bar prototype: `improv/assets/dual-bar.html` - Claudebar (left) + Queuebar (right) side by side in fixed tray. Claude slides in from left, queue slides in from right. Auto-progress sending->working. Claude Done triggers Review Changes state. Both collapse independently. Test controls for all scenarios.
- Production queuebar refactor: removed send/clear icon buttons from pill, added "Queued Changes" label with collapse-on-click, moved Send All/Clear All into queue panel. Panel rows: numbered circles, summary, target, edit/delete icons on hover. Panel slide-fades. Pill slide-fades in. Clear/Send animate out. Whole pill clickable. Deploy: ~/.claude/improv/dist/improv-core.js.
- Claudebar implemented in production: separate pill with Spark sprite animations (writing->shimmer->waiting). Shows "Sending to Claude..." on prompt submit, auto-transitions to "Working...", transitions to "Review Changes" on response. Click collapses to icon-only + opens changes panel. Replaces toast notifications. Sprites served via ws-server SVG route. Server rebuilt with `npx tsc --project tsconfig.server.json`.
- Root cause of queue duplication: `switchMode` creates `new PromptMode()` each toggle, so instance refs are always null. Fix: query pill DOM for `[data-queue-btn]`, `[data-queue-label]`, `[data-queue-divider]` to recover existing elements before the creation guard. Also restores `_queueCollapsed` state from label width.
- Queue persistence: server-side via `/queue` GET/POST endpoint (queue.json on disk, like responses.json). Client persists on every mutation (push, clear, splice). Loads on first activate when queue is empty. Serializes prompt + selector/tagName only (DOM refs re-queried on load).
- Bar tray: `_barTray` flex container at fixed bottom-left holds both Claudebar (left) and queuebar (right) side by side. Pills use relative positioning within the tray, not individual fixed positioning. Claudebar inserted before queuebar via `insertBefore`.
- Pill handler re-wiring: `_wirePillHandlers()` uses `.onclick`/`.onmouseenter`/`.onmouseleave` (replaceable) instead of `.addEventListener` (accumulative). Called on both fresh creation AND element recovery from DOM. Fixes stale closure bug where old PromptMode instance refs were used.
- Claudebar state persistence: server-side `/claude-state` GET/POST endpoint (claude-state.json). Persists on every state transition. On page load, restores Claudebar if mid-job. Sprites preloaded on init. Toasts fully removed.
- Queue loads on page init in index.ts (not waiting for prompt mode activation). Creates queue UI elements (btn + label) directly if they don't exist. Shows queuebar immediately with correct count and "Queued Changes" label.
- Old Claude button + divider REMOVED entirely from queuePill. Claudebar is sole feedback mechanism.
- Clear All/Send All: fade pill, remove queue UI elements (btn/label) from DOM, null refs, persist empty queue. Prevents empty bar ghost.
- Queue click: creates lightweight PromptMode (no switchMode, no overlay activation) just for panel toggle. No prompt mode UI side effects.
- _persistQueue: removed safety guard that blocked empty writes. Server is source of truth.
- Label: "Queued Task" (1) / "Queued Tasks" (2+), panel header matches. Dynamic update in _updateQueueBadge.
- Mutual exclusion: opening queue panel closes changes panel, opening changes panel closes queue panel.
- 60s timeout: if no response within 60s, Claudebar transitions to "Retry Send" (Lucide redo icon, pulsing glow, clickable). Click re-sends prompt as "Retrying..." (shimmer sprite). New 60s timeout starts. Cleared on working/review/remove.
- Server working ack: `improv_working` event broadcast from server when prompt received. Client transitions from "Sending" to "Working" on receipt. All fake 2s timers removed.
- Multi-task batching: `_pendingResponses` counter set to queue length before batch send. Each response decrements. Claudebar stays "Working" until all responses received, then transitions to "Review Changes" once.
- Prompt data stored in `_lastPromptData` at all 5 push_prompt call sites for retry capability.
- All three agents merged cleanly, built with `node build.js --core-only`, server rebuilt with `npx tsc --project tsconfig.server.json`, deployed to `~/.claude/improv/dist/`, server restarted. Verified: Claudebar renders with spark sprite, "Working.." state restored from persisted claude-state (persistence working).

### Bug fixes (resolved during session)
- **Animation name collision**: screen glow's `improv-glow-pulse` keyframe animated `filter:brightness(0.7)`, Claudebar used same name. Fix: renamed Claudebar's to `improv-claudebar-glow`.
- **SVG not rendering in pill**: DOMParser loses xmlns when parsing SVG fragments. Fix: use `insertAdjacentHTML` instead of DOMParser.
- **Font not loading**: HTTP server was rooted at `assets/`, fonts live at `../fonts/`. Fix: re-rooted server at `improv/` so `/fonts/` path resolves.
- **Revert affects all entries**: all entries had same `promptId: "prompt-1"`. Fix: server appends timestamp to promptId (`data.promptId + '-' + Date.now()`) for uniqueness.
- **Two Claude icons showing**: old Claude button (`[data-claude-btn]`) inside queuePill still showed alongside new Claudebar. Fix: removed old button entirely.
- **Empty bar after clear**: queue UI elements left in DOM after Clear All. Fix: remove btn/label from DOM in Clear All/Send All handlers, null refs.
- **Queue click activates full prompt mode**: `switchMode('prompt')` showed full overlay. Fix: create lightweight PromptMode instance directly (no switchMode, no overlay).
- **Queue not showing on reload**: race condition - `_updateClaudeBadge` hid pill before queue loaded. Fix: setTimeout 300ms delay and `hasQueueUI` guard.
- **Opacity pulsing on Claudebar**: same animation name collision as above (improv-glow-pulse). Traced via elimination.

### Changes panel improvements (this session)
- File display shows filename only (not full path), full path in title/tooltip
- Filters out compiled artifacts (.css, .min.css) when corresponding source file (.scss, .sass, .less, .styl) exists in same response
- Deduplicated diff display - identical property changes collapsed

### Direct HTTP polling watch loop
- Replaces MCP-based `improv_watch` which disconnects unreliably
- Uses `curl` to poll `http://localhost:9223/prompts` endpoint
- Never fails, never disconnects, immediate response
- Server writes prompts to `prompts.json`, watch loop reads and clears

- Hobbyist/personal use, not for public distribution

## Prototype files (in improv/assets/)
- `claude-spinner-demo.html` - all 8 Spark animation states in columns
- `waiting-frames.html` - frame picker for waiting animation curation
- `updates-pill.html` - Claudebar 5-state prototype (sending/working/retrying/update available/review changes)
- `queue-pill.html` - Queuebar with collapse-on-click, panel, count badge
- `dual-bar.html` - both bars side-by-side with test controls
- `spark-*.svg` - 8 extracted sprite SVGs (thinking, writing, waiting, shimmer, orbiting, tickle, entrance, exit)

## Files changed
- `dishplayscapes/wp-content/themes/dish-wp/blocks/interior-hero/style.scss`
- `dishplayscapes/wp-content/themes/dish-wp/blocks/interior-hero/style.css` (compiled)
- `improv/core/index.ts` - ImprovCore: Claudebar state machine, bar tray, sprite loading, persistence, timeout/retry, batching, working ack listener
- `improv/core/prompt/index.ts` - PromptMode: queue persistence, queue panel, pill handlers, data attributes, Send All/Clear All, _lastPromptData storage
- `improv/core/changes-panel.ts` - filename display, artifact filtering, dedup diffs
- `improv/server/ws-server.ts` - /queue, /claude-state, /spark-*.svg endpoints, font serving, promptId uniqueness
- `improv/server/mcp-tools.ts` - improv_working broadcast in push_prompt handler
- `improv/dist/improv-core.js` - built output
- `improv/dist/server/*.js` - server built output
- `improv/assets/spark-*.svg` - 8 sprite SVGs
- `improv/assets/*.html` - 5 prototype pages
