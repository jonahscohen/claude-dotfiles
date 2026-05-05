---
name: improv annotate mode rewrite
description: production-quality annotate mode - colored markers, rich popups, lasso overlays, freeze indicator
type: project
---

## Session: 2026-05-03 - Improv Annotate Mode Rewrite (Jonah)

### Changes made

- **core/annotate/markers.ts** - Full rewrite of AnnotationMarker class
  - Color-coded markers by intent: fix=#ef4444, change=#3b82f6, question=#eab308, approve=#22c55e
  - Each marker is a 24px circle with number, positioned top-right of annotated element
  - Dashed SVG connecting line (1px, same color, opacity 0.6) from marker to element center
  - Rich popup: dark panel (#1a1a2e, 300px, rounded 12px, heavy shadow)
  - Popup header: element tag+text truncated, element path in gray
  - Intent pills (4): Fix/Change/Question/Approve - colored bg, 20% opacity unselected, full opacity selected
  - Severity pills (3): Blocking=#ef4444, Important=#f97316, Suggestion=#6b7280 - same behavior
  - Textarea: dark bg (#2a2a3e), auto-height up to 120px, placeholder "Describe the issue..."
  - Action row: "Add Annotation" blue full-width button + "Cancel" text button
  - new API: `create(rect, index, intent)`, `showPopup(rect, name, path, onSubmit)`, `hidePopup()`, `updateMarkerIntent(marker, intent)`, `clear()`, `destroy()`
  - Legacy shim `showCommentInput` kept for backward compat

- **core/annotate/lasso.ts** - Full rewrite of LassoSelect class
  - Selection rectangle: dashed blue border (#3b82f6 2px dashed), rgba(59,130,246,0.08) fill
  - Live count badge at top-right of rect while dragging: "N elements" pill
  - `showSelectionOverlays(elements)`: semi-transparent blue (rgba 15%) + 1px border rect per element
  - `clearOverlays()`: removes all overlays
  - `showFreezeIndicator(onUnfreeze)`: orange pill badge fixed top-left, snowflake glyph, "Animations paused", Unfreeze button
  - `hideFreezeIndicator()`

- **core/annotate/index.ts** - Full rewrite of AnnotateMode controller
  - `activate()` now calls `freeze()` from core/freeze.ts and shows freeze indicator
  - `deactivate()` calls `unfreeze()` and hides indicator
  - `isActive()` added
  - Single element click: shows selection overlay + rich popup; on submit clears overlay, creates colored marker
  - Shift+click: accumulates multi-select, updates overlays on all selected
  - Lasso complete: shows overlays on all captured elements, shows rich popup for batch annotation
  - Text selection: passes text content as context to popup
  - Marker click after placement re-opens popup (future: editable)
  - `buildElementName()` helper: "tag - truncated text content"

### Build
- `node build.js --core-only` - passes, outputs dist/improv-core.js

### Files touched
- improv/core/annotate/markers.ts
- improv/core/annotate/lasso.ts
- improv/core/annotate/index.ts

### Key decisions
- Why SVG for connecting lines: no innerHTML rule means can't do `style.cssText` with SVG string; used createElementNS properly
- Why legacy shim in markers.ts: index.ts was the only caller but keeping the shim avoids breaking any external callers
- Pill selection uses data-attributes (data-selected, data-group, data-value) rather than class-based state to avoid needing a full stylesheet
