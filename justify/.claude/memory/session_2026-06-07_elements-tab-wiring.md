---
name: Elements tab (ElementTree) Phase A wiring
description: Wired ported ElementTree into Manipulate mode - two-way selection + hover sync via picker public surface
type: project
---

Collaborator: Jonah

Phase A wiring of the Retune Elements tab 1:1 port into Justify's Manipulate mode.
Component (core/manipulate/ui/ElementTree.tsx) and CSS
(core/manipulate/styles/elements-tree.css) were already built/green; this session
wired them into the panel + ManipulateMode.

## T3 - PropertyPanel.tsx
- Imported `ElementTree` from `./ui/ElementTree`.
- Extended `PropertyPanelProps` with `onElementSelect?: (el: Element) => void` and
  `onElementHover?: (el: Element | null) => void`.
- Destructured both in the component signature.
- Replaced the `Elements tree (deferred)` stub (the `panelTab === 'elements'` branch)
  with `<ElementTree selectedElement={element} onSelect={...} onHover={...} />`.
  Phase A props only (no onTreeReorder/onTreeReparent -> drag stays dormant,
  pointerdown falls through to click-select).
- CRITICAL (spec 6.2): the Elements branch is a SEPARATE `panelTab === 'elements'`
  branch, NOT inside the Design branch's `<div key={selector}>` remount wrapper. The
  panel itself is unkeyed, so ElementTree's instance (and its internal `expandedSet`
  useState) persists across every renderPanel re-render. Verified by reading the body
  structure - no selector-keyed wrapper around the Elements branch.
- Reused the existing `element` prop (HTMLElement | null) for `selectedElement`
  (ElementTree accepts Element | null - compatible).

## T4 - index.ts
- Imported `elementsTreeCss from './styles/elements-tree.css'` and appended it to the
  `installPanelChrome` constructable-stylesheet array, AFTER panel-shell (so tokens
  resolve): `[panelShellCss, sectionsCss, controlsCss, colorGradientCss,
  typographyCss, elementsTreeCss]`.
- In `renderPanel`, passed two callbacks to PropertyPanel.

## Two-way-sync wiring (the core decision)
**`onElementSelect: (el) => this.picker?.setSelected(el)`** - SINGLE call.
Why: the public `Picker.setSelected(el)` (picker.ts 3036) -> internal
`selectElement(el)` (2829) which (a) `showSelection()` paints the on-page selection
chrome AND (b) fires `callbacks.onSelect(el)` -> the wrapper enriches with
`getSelector(el)` and calls `this.selectCb` -> which is ManipulateMode's
`.onSelect(({element,selector}) => this.selectElement(element, selector))` registered
in `activate()` (line 124). So setSelected drives BOTH halves through the EXACT same
callback a page-click uses: scope rail rebuild + Design tab + panel re-render +
on-page chrome. Chose this over the spec's literal "selectElement() PLUS picker
method" because calling both would run ManipulateMode.selectElement twice (once direct,
once via the callback chain) = double scope-rebuild + double renderPanel. setSelected
alone fires it exactly once. Reverse sync (page -> tree) works for free: page click ->
selectElement -> renderPanel -> ElementTree.selectedElement -> useEffect auto-expands
ancestors + scrollIntoView.

**`onElementHover: (el) => this.picker?.highlight(el)`** - public `Picker.highlight`
(3038) -> internal `highlightElement` (2843): el -> updateHighlight, null -> hideHighlight.

## Picker public methods used
- `picker.setSelected(el)` (NOT the internal `selectElement` - that's not on the public
  wrapper; the wrapper exposes `setSelected`).
- `picker.highlight(el | null)` (NOT `highlightElement` - that's the internal handle name;
  wrapper exposes `highlight`).

## Build + install
- `node build.js` -> clean, `Built: dist/justify-core.js (prod)` + adapters, no errors.
- `cp dist/justify-core.js ~/.claude/justify/dist/justify-core.js` -> installed.
- `curl -s http://localhost:9223/justify-core.js | grep -c retune-tree` -> 26 (>0,
  tree CSS + markup live in served bundle).

## For the validator to focus on
- Two-way select: tree row click -> on-page chrome + Design tab update; page click ->
  tree row highlights + auto-scrolls. Confirm NO double-flash/double-render from the
  single-setSelected approach.
- Hover sync: tree row hover -> picker box on page; leave -> clears.
- Overlay exclusion: confirm no Justify chrome (panel/highlight/labels) shows as a tree row.
- Expand state persistence: click several page elements; tree expanded nodes must NOT
  reset (validates the unkeyed-branch placement).
- Drag is dormant in Phase A (onTreeReorder/onTreeReparent omitted) - pointerdown on a
  row should select, not drag.

## Files touched
- core/manipulate/PropertyPanel.tsx
- core/manipulate/index.ts
