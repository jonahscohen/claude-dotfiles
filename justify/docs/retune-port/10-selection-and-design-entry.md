# 10 - Selection + Design Entry (from Retune real source)

Scope: exactly how Retune turns a pointer or a tree row into a selected element, and
exactly how/when the Design panel appears. Sourced verbatim from:

- `packages/overlay/src/selector/picker.ts` (2768 lines) - the element picker (hover, click, drag, resize, reposition, reorder)
- `packages/overlay/src/selector/identifier.ts` (1208 lines) - selector generation + class classification + React fiber extraction + ancestor scopes
- `packages/overlay/src/ui/box-model-overlay.tsx` (300 lines) - padding/margin/gap visualizer on the selected element
- `packages/overlay/src/overlay/Retune.tsx` (4391 lines) - the orchestrator React component (selection state -> panel)
- `packages/overlay/src/overlay/mount.ts` (77 lines) - shadow-DOM host + portal container

Line references below point at the real files.

---

## 0. The headline answer (what task #12 needs)

**A direct DOM click opens the Design panel immediately.** There is no "click element,
then click the Design tab" step. The panel's tab state (`panelTab`) defaults to `"design"`
(Retune.tsx:895), and the panel becomes visible the instant `selectedElement` is set while
`mode === "edit"`. The Elements tab (the DOM tree) is the *other* tab; you only land there if
you explicitly click "Elements".

Panel visibility is a single derived boolean (Retune.tsx:4037):

```
<AnimatedPanel visible={!!(active && selectedElement && !settingsOpen && !toolbarDragging && mode === "edit")}>
```

So: overlay active + an element selected + not in settings + not mid-drag + edit mode (not
comment mode) => the panel is on screen, showing the Design tab by default.

---

## 1. Picker construction and lifecycle

`createPicker(shadowRoot, callbacks)` (picker.ts:67) builds a large set of fixed-position
`<div>`s appended into the shadow root and returns an imperative handle:

```
return { activate, deactivate, destroy, hideHighlight, clearSelection, selectElement,
         highlightElement, refreshSelection, updatePinLines, suspend, resume,
         showScopeHighlights, hideScopeHighlights, setCommentMode };  // picker.ts:2766
```

Elements created up-front (all pointer-events:none unless noted):

- `highlight` + `label` (hover box + dimension badge) - picker.ts:72-78
- `selection` + `selectionLabel` (persistent selection box + badge; selection gets
  pointer-events:auto when draggable) - picker.ts:81-87
- `aspectLine` (diagonal dashed ratio-lock indicator inside selection) - picker.ts:90-95
- `parentIndicator` (dotted outline of the parent) - picker.ts:98-104
- a pool of 20 `siblingOutline` divs (dotted) - picker.ts:107-116
- a pool of 50 `scopeHighlight` divs (solid, for the active scope selector) - picker.ts:177-186
- 4 `pinLines` (dashed lines to parent edges for absolute/fixed) - picker.ts:237-243
- 8 resize handles: 4 visible corner squares + 4 invisible edge hit-zones - picker.ts:409-433
- a pool of 16 snap-guide line/label pairs - picker.ts:462-471
- spacing-measurement line/connector/label sets (h, v, and 4 parent edges) - picker.ts:2027-2049

`activate()` (picker.ts:2638): sets a global `* { cursor: default !important }` style, then
registers **capture-phase** listeners on `document`:

```
document.addEventListener("mousemove", handleMouseMove, true);
document.addEventListener("click",     handleClick,     true);
document.addEventListener("dblclick",  handleDblClick,  true);
document.addEventListener("keydown",   handleKeyDown,   true);
document.addEventListener("keyup",     handleKeyUp,     true);
startTracking();   // scroll/resize/ResizeObserver -> keep boxes glued to the element
```

`deactivate()` (picker.ts:2650) tears all of that down and clears selection state.

---

## 2. Selection by direct DOM click

`handleClick(e)` (picker.ts:2507). Flow, in order:

1. **Bail if inactive** (`if (!active) return`).
2. **Ignore clicks inside the overlay UI** (two checks):
   - `e.composedPath().includes(shadowRoot.host)` -> return (shadow-DOM retargeting). picker.ts:2512-2514
   - `shadowRoot.elementFromPoint(x,y)` hits a shadow element whose computed `pointer-events !== "none"` -> return (a real toolbar/panel control). picker.ts:2516-2520
3. **Block if a popover has unsaved edits**: `callbacks.shouldBlockClick?.()` -> preventDefault +
   stopPropagation + stopImmediatePropagation + return. picker.ts:2522-2528
4. **Swallow the page click**: `preventDefault()` + `stopPropagation()` + `stopImmediatePropagation()`.
   picker.ts:2530-2532
5. **Click-to-cycle through the z-stack** (picker.ts:2536-2556):
   - "Same spot" = within `CLICK_RADIUS` (5px) of `lastClickPos` AND `elementStack.length > 1`.
   - Same spot -> rebuild stack (DOM may have changed via HMR) and advance
     `stackIndex = (stackIndex + 1) % elementStack.length` (deepest child -> shallower ->
     wraps around).
   - New spot -> rebuild stack, `stackIndex = 0`, store `lastClickPos`.
6. `el = elementStack[stackIndex]`.
7. **Comment mode** (picker.ts:2561-2567): just `hideHighlight()` + `callbacks.onSelect(el)`;
   no selection chrome is shown.
8. **Edit mode** (picker.ts:2569-2578): set `selectedElement = el`, re-point the `ResizeObserver`
   at the new element, `showSelection()`, `hideHighlight()`, clear `hoveredElement`, then
   `callbacks.onSelect(el)`.

`buildElementStack(x, y)` (picker.ts:2491): `document.elementsFromPoint(x, y)`, drop overlay
elements, `resolveElement` each (skip BR/WBR/COL/SOURCE/TRACK/AREA/PARAM by walking to parent -
picker.ts:2400-2406), dedupe consecutive duplicates, **stop at `document.documentElement`** (you
can never select `<html>`; `<body>` is reachable but the stack stops above it).

Key detail for the port: the click never reaches the page. All page handlers are suppressed in
capture phase. The "stack cycle" is what lets a user click repeatedly to drill from a leaf up to
its containers without moving the mouse.

---

## 3. Selection from the element tree (programmatic path)

The Elements tab renders `<ElementTree onSelect={handleTreeSelect} .../>` (Retune.tsx:4063-4071).
A tree-row click calls `handleTreeSelect`, which calls the picker's **`selectElement(el)`**
(picker.ts:2694):

```
function selectElement(el) {
  selectedElement = el;
  selectionLabelHidden = false;
  resizeObserver?.disconnect(); resizeObserver?.observe(el);
  showSelection();
  hideHighlight();
  hoveredElement = null;
  callbacks.onSelect(el);     // same onSelect as the click path
}
```

So both paths converge on the same `callbacks.onSelect(el)`. The difference is purely the entry:
a click goes through `handleClick` (with stack-cycling + event suppression); the tree calls
`selectElement` directly with the exact node. The tree never cycles; it selects the precise
element the row represents.

`highlightElement(el|null)` (picker.ts:2708) is the tree's hover hook - it just shows/hides the
hover box without selecting.

---

## 4. Hover overlay (picker)

`handleMouseMove(e)` (picker.ts:2443):

- Bails while suspended or during any drag (`repositionDrag || resizeDrag || reorderDrag`).
- If the cursor is over real Retune UI inside the shadow root (and not one of the passive picker
  boxes) -> clear hover + return. picker.ts:2449-2463
- Temporarily zero `selection.style.pointerEvents`, call `document.elementFromPoint`, restore.
  picker.ts:2464-2468
- `resolveElement`, skip overlay, skip if unchanged.
- **Ancestor debounce** (picker.ts:2476-2487): if moving onto an element that *contains* the
  current hover target, wait 50ms before applying (prevents parent flashing when crossing gaps
  between siblings). Otherwise apply immediately.

`applyHover(el, altKey)` (picker.ts:2410):

- If `el === selectedElement`: hide the hover box, just keep the selection badge.
- Else: `updateHighlight(el)` (solid 1px `#0D99FF` box, no fill), and:
  - hovered element **contains** the selection -> it's an ancestor: Alt shows parent-spacing
    measurement lines, and `showSiblingOutlines` (dotted outlines on the selection's siblings).
  - sibling/unrelated -> Alt shows edge-to-edge spacing lines, and `showChildOutlines` (dotted
    outlines on the hovered element's children).
  - no selection -> `showChildOutlines(el)`.
- Always `callbacks.onHover(el, rect)`.

Visual vocabulary (consistent blue `#0D99FF`):
- **hover** = solid box, no fill, dimension badge hidden.
- **selection** = solid box + 4 corner handles + 4 edge hit-zones + dimension badge + **dotted**
  parent indicator + dashed pin lines (for absolute/fixed). picker.ts:2233-2282
- **scope highlights** = solid boxes on every element matching the active scope selector.
- **spacing** = red (`--retune-red`) dashed measurement lines + numeric labels (Alt-held).

`showSelection()` (picker.ts:2233) is the single entry that paints all selection chrome and is
re-run on scroll/resize via `trackSelection()` (picker.ts:2285, position-only fast path).

---

## 5. Selection-box interactions (drag handles live in the picker, not the panel)

These are all in picker.ts and act directly on the selected element (live preview via callbacks):

- **Resize** (8 handles): pointerdown -> `buildSnapCache` -> drag computes new w/h with
  aspect-lock rules (media + `data-retune-aspect-locked` default-locked; Shift toggles), snaps to
  sibling sizes and parent content box ("fill" => `100%`), draws snap guides, calls
  `onResizePreview` live and `onResize` on commit. picker.ts:958-1105
- **Reposition** (absolute/fixed): dragging the selection body moves top/left or bottom/right
  (axis auto-detected from inline/CSS rules or computed proximity), with center/edge alignment
  snapping to parent + siblings. `onRepositionPreview` / `onReposition`. picker.ts:1140-1336
- **Reorder / reparent** (flow elements in flex/grid/block): drag creates a styled ghost clone in
  the document, shifts siblings via transform, switches to reparent mode when the cursor leaves
  the parent, draws a drop-indicator line. `onCanvasReorder` / `onCanvasReparent`. picker.ts:1338-1986
- **Double-click** -> `onDoubleClick(deepestElement)` for inline text editing. picker.ts:1989-2010, 2581-2608
- **Escape** -> `onCancel` (unless a dialog/popover/comment is open). picker.ts:2610-2619

For the port these are large but self-contained and **already vanilla TS** - no React in
picker.ts at all.

---

## 6. identifier.ts - what `onSelect` consumes

`getSelector(el)` (identifier.ts:10) uses `@medv/finder` with a class filter that rejects hashed
classes (`_*`, `css-*`, long hashes), falling back to an nth-of-type path builder.

`getSelectorCandidates(el)` (identifier.ts:524) is the scope engine: it classifies every class as
`semantic | utility | ambiguous` using a **multi-signal** score:

- structural stylesheet analysis (`analyzeElementClasses`, identifier.ts:341): walks all
  stylesheets, counts authored property families per class (longhands collapsed via
  `getPropertyFamily`), flags `@layer utilities` as definitively utility, flags complex
  selectors as semantic.
- name-pattern scoring (`scoreNamePattern`, identifier.ts:203): Tailwind/Bootstrap stem tables,
  variant-prefix regex, BEM detection, value/color/keyword suffix tests.
- the two are blended (sheet 0.65 / name 0.35, with concordance + context adjustments).

`getAncestorScopes(el)` (identifier.ts:1144) finds compound selectors like
`.message-row--unread .subject` from matching CSS rules and humanizes the ancestor part
(`humanizeAncestorPart`, identifier.ts:1036 - ARIA/data/BEM/state aware).

React fiber extraction (identifier.ts:608-1004): `getReactComponentHierarchy`,
`getDirectReactComponent` (only when the element is the component's root DOM node),
`getDirectReactProps`, `getDirectReactState`, `getReactSource` (`_debugSource`),
`setReactProp` / `setReactState` (via DevTools hook or pendingProps + dispatch).
Framework internals are filtered (`isFrameworkInternal`, identifier.ts:744).

> Port note: identifier.ts is framework-agnostic vanilla TS *except* the React-fiber functions,
> which are React-specific introspection. For a generic tool these become no-ops / optional.

---

## 7. The `onSelect` handler (Retune.tsx) - this is "Design entry"

Registered when the picker is created (Retune.tsx:1307-1310). Edit-mode body
(Retune.tsx:1346-1420):

1. `inspectElement(element)` -> `InspectedElement` (selector, tag, classes, computed styles,
   react components/props, source file, etc).
2. Clear any forced pseudo-state inline styles if switching elements (1348-1350).
3. `setStyleSources(getStyleSources(element))` - which selector authored each property.
4. `getSelectorCandidates` + `getAncestorScopes` -> `buildScopeLevels(...)` (Retune.tsx:227) to
   build the **scope rail** (broadest class scope -> ancestor scopes -> "This instance").
5. `setScopeLevels(levels)` and pick a default: `defaultIndex = levels.length - 2` (i.e. the
   narrowest *class* level just above "This instance"), Retune.tsx:1360.
6. If the default level has a selector, `pickerRef.current.showScopeHighlights(selector, element)`
   to paint all matching elements.
7. If the default is a class selector (not parent-scoped, no space), compute `getScopedStyles` so
   the panel edits the *rule* rather than the instance, and set `ownedProperties`.
8. Overlay any pending preview changes onto `inspected.computedStyles` so re-selecting an edited
   element shows edited values (Retune.tsx:1385-1395).
9. `setSelectedElement(inspected)` + eagerly set `selectedElementRef.current` (so the MCP bridge
   sees it before React re-renders) + `tracker.track(...)` to register the element with the
   change tracker (Retune.tsx:1397-1420).
10. Close settings if open.

The moment `setSelectedElement` lands, the `AnimatedPanel` visibility condition flips true and
the panel mounts on the Design tab.

Comment mode (Retune.tsx:1312-1344): `onSelect` instead builds a `commentDraft` (selector path,
anchor offset, element info) and opens the comment popover; no Design panel.

---

## 8. Panel structure once open (Retune.tsx:4037-4212)

```
AnimatedPanel
  .retune-panel
    .retune-tab-bar           // sliding pill, version badge
       [Elements] [Design]    // panelTab; Design is the DEFAULT (895)
    .retune-panel-body
       panelTab === "elements" -> <ElementTree .../>          // DOM tree
       panelTab === "design"   -> <ComponentSection/> + <PropertyPanel/>
```

The Design tab body = `ComponentSection` (React props/variants from the manifest) followed by the
big `PropertyPanel` (keyed by `selectedElement.selector` so it remounts per element). PropertyPanel
receives scopeLevels/activeLevelIndex/styleSources/forcedState/ownedProperties plus a wall of
callbacks (`onPropertyChange`, `onScopeLevelChange`, `onForcedStateChange`,
`onPinLinesChange -> picker.updatePinLines`, `onPropertyHover -> setHoveredBoxModel`, etc).

The tab-pill animation effect (Retune.tsx:2245-2268) measures the active button rect and slides
the pill; first render is instant, subsequent are transitioned.

---

## 9. Box-model overlay (box-model-overlay.tsx)

`<BoxModelOverlay element hoveredProperty revision />` (box-model-overlay.tsx:227). Driven by the
panel: hovering a spacing/gap input sets `hoveredBoxModel`, which is passed in as `hoveredProperty`.

- Padding -> blue diagonal-stripe rects *inside* the element (`computePaddingRect`, :46).
- Margin -> orange diagonal-stripe rects *outside* the element (`computeMarginRect`, :68).
- Gap -> pink diagonal-stripe rects *between* flex/grid children (`computeGapRects`, :90; flex
  walks consecutive children subtracting margins, grid groups into rows then does column+row
  gaps, then dedupes).
- Supports per-side (`paddingTop`...), block/inline pairs, and whole-group `gap`/`columnGap`/`rowGap`.
- Renders fixed-position pointer-events:none divs at `zIndex 2147483645`; `useMemo` keyed on
  `[element, hoveredProperty, revision]`.

This is **not** the same thing as Justify's current `box-model.ts` (a 180x120 static diagram in
the panel). Retune's is a live overlay painted on the page element.

---

## 10. mount.ts - host + isolation

`mountOverlay()` (mount.ts:18):
- Injects the Inter webfont link (once).
- Creates a `data-retune-host` div, fixed, 0x0, `z-index 2147483647`, `pointer-events:none`.
- `attachShadow({ mode: "open" })`, `adoptedStyleSheets = [sheet]` from `overlay-css`.
- A `data-retune-container` div is the React `createPortal` target (createPortal needs a real
  element, not a ShadowRoot). mount.ts:51-54
- Event isolation (mount.ts:59-67): for `click/pointerdown/mousedown/focusin/focusout`, if the
  event originated *inside* the shadow root (`composedPath()[0] !== host`), `stopPropagation()` so
  app-level "close on outside click" handlers don't fire from panel interaction. Picker events
  (which start outside) pass through.
- Host appended to `document.documentElement`.

This matches Justify's `Overlay` (single shadow host via `attachShadow`, `getShadowRoot()`) - the
isolation pattern ports directly.

---

## 11. Port-relevant summary (feeds 00-PLAN.md)

- **Two selection entries, one sink.** Direct click (`handleClick`, stack-cycling, event-swallowing)
  and tree click (`selectElement`, exact node) both call `callbacks.onSelect(el)`. Build one
  `onSelect` that does inspect -> scope-levels -> setSelected -> track, and the panel keys off
  `selectedElement`.
- **Design is the default tab.** A click shows the Design panel with zero extra steps. Elements
  (the tree) is the secondary tab.
- **The picker is already vanilla TS** (picker.ts + most of identifier.ts). Port near-verbatim.
  The React surface is only the panel + orchestrator (Retune.tsx) + box-model-overlay.tsx +
  ComponentSection/ElementTree/SettingsPanel.
- **Selection chrome and on-element drag/resize/reposition/reorder live in the picker**, driven by
  preview callbacks - independent of the panel UI framework.
- **Shadow-DOM isolation + outside-click suppression** in mount.ts maps 1:1 to Justify's existing
  `Overlay`.

Collaborator: Jonah (entry-analyst).
</content>
</invoke>
