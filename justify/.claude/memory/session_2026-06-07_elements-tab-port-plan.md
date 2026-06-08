---
name: Elements tab (ElementTree) 1:1 port blueprint
description: Spec 12 - build plan to port Retune's Elements tab into Justify Manipulate, replacing the deferred PropertyPanel stub
type: project
relates_to: [session_2026-06-06_retune-port-build-plan.md]
---

# Elements Tab (ElementTree) Port - Build Plan (12-ELEMENTS-TAB.md)

Jonah, as PLANNER on the Elements-tab team, wrote the exhaustive build blueprint to
`justify/docs/retune-port/12-ELEMENTS-TAB.md`. Build NOT started (planning only).

## Key findings (de-risk the build)
- **Zero new icons, zero substitutions.** Every ElementTree icon (layer-type glyphs,
  caret, live SVG mini-preview, fallback) is an inline `<svg>` literal INSIDE
  `ElementTree.tsx` (lines 185-330, 430). No `ui/icons.tsx`, no `@central-icons-react`,
  no Lucide. Porting the file carries the verbatim path data - satisfies never-fabricate
  rule automatically. Biggest Design-port risk class is absent here.
- **`getDirectReactComponent` already exists** in our ported
  `core/selector/identifier.ts` (line 650), identical to Retune. No selector work.
- **All tree CSS tokens already in `panel-shell.css`** (blue-bg, blue-text, blue-500
  =#D97757, surface-hover, text-tertiary, surface=#1a1a1a dark). No new tokens.
- Net: near-mechanical React->Preact port of one 923-line file + one CSS block (overlay.css
  665-817) + wiring 3 callbacks.

## File map
- CREATE `core/manipulate/ui/ElementTree.tsx` (port React->Preact)
- CREATE `core/manipulate/styles/elements-tree.css` (verbatim from overlay.css 665-817)
- MODIFY `core/manipulate/PropertyPanel.tsx` (replace stub lines 301-305 with <ElementTree>)
- MODIFY `core/manipulate/index.ts` (register CSS in installPanelChrome; pass onElementSelect
  -> selectElement, onElementHover -> picker.highlightElement in renderPanel)
- PORT `__tests__/tree-drag.test.ts`

## Phasing (decision recorded)
- **Phase A** (ship first): tree + two-way select + hover + expand/collapse + icons +
  theme = the 1:1 navigator. Drag cleanly disabled (ElementTree early-returns when
  onTreeReorder/onTreeReparent undefined -> pointerdown falls through to click-select).
- **Phase B**: wire drag-reorder/reparent into changeBuffer/syncQueue as
  `__reorder`/`__reparent` pseudo-prop tasks. Bulk-scope propagation + undo deferred to C.

## Top risks
- R1: Phase B pipeline cost - Justify's CSS-prop pipeline lacks Retune's ChangeTracker
  pseudo-props/FLIP/bulk/undo. Recommend lean single-element B, defer bulk/undo.
- R2: Preact `e.nativeEvent` is undefined (ElementTree line 417) - guaranteed silent
  drag-break if not fixed in the port.
- R3: re-point `isRetuneElement` -> Justify `data-justify*` markers + shadow host, or
  Justify chrome shows up as tree rows.
- R4: `.retune-tree` has overflow-x only; confirm vertical scroll owner for drag auto-scroll.
- R7: keep tree labels in JustifySans (Retune uses sans) - mono would be a deviation.

## Tasks: T1 port tsx + T2 port css (parallel) -> T3 PropertyPanel + T4 index wiring +
## T5 test -> (Phase B) T6 drag->task + T7 revert gap.

## Files touched
- `justify/docs/retune-port/12-ELEMENTS-TAB.md` (created, the deliverable)
