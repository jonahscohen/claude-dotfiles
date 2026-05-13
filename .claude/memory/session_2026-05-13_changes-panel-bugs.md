---
name: Changes panel bug fixes
description: Six bug fixes and enhancements to improv changes-panel.ts
type: project
---

Jonah requested 6 fixes to `/improv/core/changes-panel.ts`. All implemented:

1. **Filter non-actionable**: Added `filterEntries()` method called in `render()`. Only shows entries where `status === 'completed' && changes.length > 0` OR `status === 'needsInfo'`. Introduced `filteredEntries` array; keyboard nav and startReply use filtered list.
2. **markDone re-render**: `markDone()` already mutates the shared `entries` array by reference (find + set property), then calls `this.render()`. Confirmed entries is assigned by reference in `show()`, not copied.
3. **Scroll position preserved**: `render()` saves `this.listEl.scrollTop` before clearing children and restores it after rebuilding.
4. **Revert visual indicator**: Added `revertedPrompts` Set. On revert click, adds promptId to set and re-renders. Reverted entries get red-tinted background (`rgba(239,68,68,0.08)`), button text changes to "Reverted" (disabled).
5. **Labels and layout**: "Done" renamed to "Mark Done", "Clear done" renamed to "Clear Completed Tasks". Clear button moved from header titleWrap to a new `bottomBar` div below the list with `padding:10px 16px;border-top:1px solid rgba(255,255,255,0.1);flex-shrink:0`. Bottom bar only visible when reviewed entries exist.
6. **Before/after toggle**: Added `expandedPrompts` and `previewingPrompts` Sets. "Show Changes" button expands entry to show each change as a row (selector, property, old value strikethrough in red, arrow, new value in green). "Preview" toggle button calls `onPreviewToggleCallback(promptId, changes, showOld)` so the caller can apply old or new values. Collapsing also restores new values if previewing was active.

Also replaced unicode arrow (U+2192) with `->` in change pills to avoid potential encoding issues.

Added new callback setter: `setOnPreviewToggle()`.

Files touched:
- improv/core/changes-panel.ts
