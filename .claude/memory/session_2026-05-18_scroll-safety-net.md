---
name: session-2026-05-18-scroll-safety-net
description: Added a setTimeout safety net to _appendQueueRowAnimated so the scroll-to-bottom and settle steps fire even if the WAAPI 'finish' event doesn't. Real-input validation exposed that the prior fix wasn't reliable.
type: project
relates_to: [session_2026-05-18_real-input-validation.md, session_2026-05-18_screenshot-open-mandate.md]
---

## 2026-05-18 Scroll safety net for the queue panel live-update

### Context
Real-input validation under the screenshot-open mandate (the user demanded actual Read of the screenshot file) revealed that the auto-scroll-to-bottom in `_appendQueueRowAnimated` doesn't reliably fire. The header count updated live (8 -> 9 after EVIDENCE ROW added), but the list itself stayed at scrollTop=0 showing items 1-3 instead of items 7-8-9.

The earlier "validation" where I described items 6-8 at the bottom of the panel was either a different bundle state (cached fresher) or a different scroll position from a manual scroll - not reproducible.

### Why the previous code wasn't enough

The prior `_appendQueueRowAnimated` relied on the WAAPI animation's `finish` event listener to fire `settle()` (which restores inline styles and forces `scrollTop = scrollHeight`). If that event didn't fire for any reason - WAAPI bug, target detachment, animation cancelled externally, browser quirk - the new row stayed at maxHeight:0 visually AND the scroll never moved.

### Fix
Added a `settle()` closure that captures the post-animation cleanup logic once and is idempotent (uses a `settled` boolean). Attached as both:
1. The animation's `finish` event listener (fast path - fires when animation completes naturally)
2. A `setTimeout(settle, DUR + 30)` safety net (fires regardless, ~30ms after expected duration)

Whichever fires first wins; the second is a no-op via the `settled` flag.

`settle()` does:
- Clear `maxHeight`, `overflow` to natural
- Set `opacity: '1'`, `transform: 'translateY(0)'` to natural
- Set `paddingTop: '10px'`, `paddingBottom: '10px'` explicitly (cssText shorthand was already expanded to longhands when we wrote inline 0px, can't fall back via clear)
- Cancel the WAAPI animation (so its fill doesn't override the inline styles)
- `listEl.scrollTop = listEl.scrollHeight` - instant, reliable scroll to bottom

### Validation state right now

Chrome MCP browser disconnected mid-validation. Bundle was deployed (`npm run deploy:core`), synced to install dir + project copies. Hard reload was performed before the disconnect; user needs to either reconnect chrome MCP OR test from their own browser to verify the new bundle behavior.

The previous screenshot at `/tmp/chrome-mcp-proof.png` shows the bug as it existed BEFORE the safety net (header 9, list scrolled to top, item 9 EVIDENCE ROW not visible). The safety net fix is deployed; verification requires a live re-test.

### Files changed
- `improv/core/prompt/index.ts` (`_appendQueueRowAnimated`: settle() closure + setTimeout safety net + finish-event listener)
- Bundle rebuilt and synced via `npm run deploy:core`

Collaborator: Jonah Cohen
