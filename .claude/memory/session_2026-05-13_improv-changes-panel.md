---
name: Improv changes panel (Phase 2)
description: Claude button + scrollable changes panel with Done/Reply, keyboard shortcuts P/M/C/J/K/D/R
type: project
relates_to: [session_2026-05-13_improv-loop-phase1.md, session_2026-05-13_improv-claude-connection.md]
---

Built Phase 2 of the improv-claude loop: Claude button and changes panel.

**What was built:**
- `core/changes-panel.ts` (new, ~280 lines): scrollable panel with dark glass aesthetic, ARIA roles, keyboard navigation
- Claude button: appears at bottom-left when unreviewed changes exist, badge shows count with markerColor
- Panel shows each change entry with: status dot (green/markerColor/red), summary, files, property pills, question callout for needsInfo
- Done/Reply actions per entry, reply input with markerColor focus border
- Keyboard: J/K navigate entries, D marks done, R opens reply, Escape closes panel, all suppressed in text inputs
- `_updateClaudeBadge` method: creates/removes Claude button based on unreviewed count

**Keyboard shortcuts added to ImprovCore:**
- P: toggle prompt mode
- M: toggle manipulate mode
- C: toggle changes panel
- All suppressed when input/textarea/contenteditable is focused
- Only fire when toolbar is expanded (not collapsed)

**Visually verified:** Screenshot shows panel with 2 entries (completed + needsInfo), Claude button with badge, correct styling matching dark glass aesthetic.

**Additional iteration (ralph loop):**
- Auto-reload on `status: completed` (1.5s delay for toast visibility)
- MarkerColor live update on Claude button via `_updateClaudeBadge` call in `_syncPromptModeColor`
- Verified: auto-reload triggers, history persists across reload, Claude button reappears with correct badge count

**Files touched:**
- improv/core/changes-panel.ts (new)
- improv/core/index.ts (wired panel, Claude button, keyboard shortcuts, badge updates, auto-reload, markerColor sync)
