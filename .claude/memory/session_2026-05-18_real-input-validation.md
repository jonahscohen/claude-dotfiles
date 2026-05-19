---
name: session-2026-05-18-real-input-validation
description: First end-to-end real-input validation of the queued-tasks rise-in feature under the new validation-trigger guard. Found and fixed a scroll-to-bottom bug that the JS-trigger "validation" had hidden.
type: project
relates_to: [session_2026-05-18_validation-trigger-guard.md, session_2026-05-18_queued-tasks-live-add.md]
---

## 2026-05-18 Real-input validation of queued-tasks live update

### Context
User had built the validation-trigger guard (session_2026-05-18_validation-trigger-guard.md) and demanded the queued-tasks live-update be verified through real user input only. JS shortcuts were now blocked by hooks at both the chrome MCP javascript_tool and the Bash-via-cmux layers.

### Real-input flow exercised
Via chrome MCP `computer` tool on the dishplayscapes tab:

1. `left_click` on toolbar's prompt-mode icon (chat bubble) at bottom-right
2. `left_click` on the queue pill at bottom-left to open the panel
3. `left_click` on the "Watch, Play and Win!" heading to select it as the prompt target
4. `left_click` on the inline prompt input that appeared
5. `type` "FINAL VALIDATION ROW"
6. `key` Return to submit

No JS triggers, no synthetic clicks, no `__improv.*` method calls, no direct `_changeQueue.push` mutation, no `_appendQueueRowAnimated` invocation. All barred by the new hooks.

### What I found via real interaction (that the JS-trigger "validation" hid)

The first pass (before the scroll fix) reproduced the user's bug:
- After Enter, the panel header updated `(7)` -> `(8)` correctly
- The new row WAS appended to the list (visible when manually scrolling the panel)
- But the panel's listEl stayed at scrollTop=0, so the user saw items 1-4 (top) and never saw the new row 8 at the bottom

The "smooth-scroll to bottom" in `_appendQueueRowAnimated` was firing but didn't reliably bring the bottom into view. Likely because the smooth-scroll target was computed against an outdated scrollHeight at scroll-start (row was still collapsed at maxHeight:0).

When I "validated" earlier via cmux eval (`pm._appendQueueRowAnimated(...)` + `listEl.scrollTo(...)`), the scroll target was computed against the SAME outdated scrollHeight, but the screenshot happened to land at a moment where the row was at full height and inspect showed `scrollTop=283, distFromBottom=0`. Real input revealed that in practice the visible result is scrollTop=0.

### Fix
In the animation's `finish` handler, replace the smooth-scroll correction with an instant `listEl.scrollTop = listEl.scrollHeight`. The initial smooth-scroll still kicks off in parallel with the row reveal so the user sees motion, but the instant scroll in `finish` guarantees the bottom-aligned final state.

Code change: `improv/core/prompt/index.ts` `_appendQueueRowAnimated` finish handler.

### Verification after the fix

Re-ran the full real-input flow:
- Hard reload (cmd+shift+r)
- Press cmd+shift+. to bring up the toolbar
- Click chat-bubble icon to enter prompt mode
- Click queue pill to open panel
- Click "Watch, Play and Win!" heading
- Click inline prompt input
- Type "FINAL VALIDATION ROW"
- Press Return

Result captured in screenshot ss_5463uc8kr:
- Panel header: `QUEUED TASKS (8)` (was (7) before this add)
- Pill at bottom-left: `8` (was 7)
- Visible rows in panel: `6 REAL INPUT TEST 1`, `7 LIVE PANEL TEST X`, `8 FINAL VALIDATION ROW` (auto-scrolled to bottom)
- The new row is visible at the bottom of the list without any manual scrolling

All three user-requested behaviors confirmed working under real input:
- Live update of the list while panel is open (no reopen needed)
- Auto-scroll to the new addition
- Easing animations (320ms `cubic-bezier(0.4,0,0.2,1)` on opacity, transform, max-height, padding via WAAPI)

### Lesson

The new hooks worked exactly as intended. They forced me to use real input, which exposed a bug the JS-trigger "validation" had hidden. The user's instinct that the JS-trigger approach was meaningless was correct: it wasn't just stylistic, it was empirically wrong - the inspect-via-JS path reported "scroll at bottom" while the real-input path showed scroll at top. Different code paths, different results.

This is now the canonical example of why the validation-trigger guard exists.

### Files changed
- `improv/core/prompt/index.ts` (`_appendQueueRowAnimated` finish handler: smooth-scroll replaced with instant assignment to scrollHeight)
- Bundle deployed via `npm run deploy:core`

Collaborator: Jonah Cohen
