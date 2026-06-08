# Retune - Selection & Design-Panel Entry (1:1 Port Spec)

Scope: how an element becomes "selected", how the Design panel opens, and every overlay that draws during hover / selection / box-model preview. Covers `selector/picker.ts`, `selector/identifier.ts`, `ui/box-model-overlay.tsx`, `ui/helpers.ts` (`inspectElement`), and the relevant wiring in `overlay/Retune.tsx` + `overlay/mount.ts`.

All overlay chrome lives inside a **Shadow DOM host** (`overlay/mount.ts`). The picker draws raw `div`s appended directly to the `ShadowRoot` (NOT the React portal container) with hard-coded inline `cssText`. The React panel renders into a separate `<div data-retune-container>` inside the same ShadowRoot via `createPortal`.

---

## 0. Mount host (mount.ts)

`mountOverlay()` returns `{ host, root, container, sheet }`.

- Loads Inter once: injects `<link rel="preconnect" href="https://rsms.me/">` and `<link rel="stylesheet" href="https://rsms.me/inter/inter.css" data-retune-font>` into `document.head` (guarded by `link[data-retune-font]`).
- `host` = `<div data-retune-host>` with inline cssText:
  ```
  position: fixed; top: 0; left: 0; width: 0; height: 0;
  z-index: 2147483647; pointer-events: none;
  ```
- `root = host.attachShadow({ mode: "open" })`.
- `sheet = new CSSStyleSheet(); sheet.replaceSync(overlayStyles); root.adoptedStyleSheets = [sheet]`.
- `container = <div data-retune-container>` appended to root, the React portal target.
- For events `["click","pointerdown","mousedown","focusin","focusout"]`, a listener on `host` calls `e.stopPropagation()` UNLESS `e.composedPath()[0] === host` (only stops events originating INSIDE the shadow root; picker click-throughs originate outside and pass).
- `host` is appended to `document.documentElement` (NOT body).
- `data-retune-host` is the marker the picker uses everywhere to exclude its own DOM (`el.closest("[data-retune-host]")`).

---

## 1. Theme tokens referenced by the picker overlays

The picker hard-codes most colors but also references two CSS variables resolved from `:host` in `overlay.css`:

| Token | Resolved value |
|---|---|
| `--retune-blue` | `--retune-blue-500` = **`#0D99FF`** |
| `--retune-red` | `--retune-red-500` = **`#F24822`** |
| `--retune-text-tertiary` | `--retune-black-50` = `color-mix(in srgb, #1c1917 50%, transparent)` |

Host base typography (`:host`): `font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;` `font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;` `font-size: 13px;` `letter-spacing: -0.005em;` `line-height: 1.4;` `all: initial;`.

**Hard-coded selection blue is literally `#0D99FF`** in picker.ts (not the token) in almost every overlay border. The red snap/spacing color uses `var(--retune-red)` in some places and the literal `#F24822` / `%23F24822` in the X-mark SVG.

z-index ladder used by picker overlays:
- scope highlights: `2147483643`
- highlight/selection boxes, parent indicator, sibling outlines, pin lines: `2147483644`
- resize handles: `2147483645`
- snap-guide lines, box-model rects, spacing measures, reparent line: `2147483645`/`2147483646`
- labels (hover/selection badge): `2147483646`
- drag ghost, reparent highlight: `2147483647`
- comment popover: `2147483647`

---

## 2. The overlay DOM the picker creates (createPicker)

All appended to `shadowRoot` unless noted. Created once at `createPicker()` time.

### 2.1 Hover highlight + label
```
highlight  = <div data-retune-highlight>
label      = <div data-retune-label>
```
`initBoxStyles(highlight, label)` sets:
- **box** cssText: `position: fixed; pointer-events: none; z-index: 2147483644; box-sizing: border-box; display: none; outline: none;`
- **label** cssText: `position: fixed; color: white; font-size: 11px; font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0; padding: 2px 6px; border-radius: 3px; pointer-events: none; z-index: 2147483646; white-space: nowrap; display: none;`

### 2.2 Selection highlight + label (persistent)
```
selection      = <div data-retune-selection>
selectionLabel = <div data-retune-selection-label>
```
Same `initBoxStyles`.

### 2.3 Aspect-ratio lock indicator
`aspectLine` is a child of `selection`:
```
position:absolute; top:0; left:0; width:100%; height:100%;
pointer-events:none; display:none; overflow:hidden;
```
innerHTML is an SVG diagonal line, exact markup:
```html
<svg width="100%" height="100%" style="position:absolute;top:0;left:0">
  <line x1="0" y1="0" x2="100%" y2="100%" stroke="#0D99FF" stroke-width="1"
        stroke-dasharray="1 3" stroke-linecap="round" opacity="0.6"/>
</svg>
```
Shown only during a resize drag when aspect lock is active.

### 2.4 Parent indicator (dotted)
`<div data-retune-parent-indicator>`:
```
position:fixed; display:none; pointer-events:none; z-index:2147483644;
border:1px dotted #0D99FF; background:none; border-radius:0;
```

### 2.5 Sibling-outline pool (20 elements)
20 `<div>`s, each:
```
position:fixed; display:none; pointer-events:none; z-index:2147483644;
border:1px dotted #0D99FF; background:none;
```

### 2.6 Scope-highlight pool (50 elements)
50 `<div>`s, each:
```
position:fixed; display:none; pointer-events:none; z-index:2147483643;
border:1px solid #0D99FF; background:none;
```

### 2.7 Pin lines (4: top/right/bottom/left)
Each `<div>` base: `position:fixed;display:none;pointer-events:none;z-index:2147483644;`. When shown they get `border-left:1px dashed #0D99FF` (vertical) or `border-top:1px dashed #0D99FF` (horizontal) with width/height = gap to parent edge.

### 2.8 Resize handles
- `HANDLE_SIZE = 8`, `HALF_HANDLE = 4`, `EDGE_HIT_SIZE = 6`.
- **4 corner handles** (`nw, ne, se, sw`), each a visible white square:
  ```
  position:fixed; pointer-events:auto; display:none; box-sizing:border-box;
  width:8px; height:8px; background:#fff; border:1px solid #0D99FF;
  border-radius:1px; z-index:2147483645; cursor:<HANDLE_CURSORS[pos]>;
  ```
- **4 edge handles** (`n, e, s, w`), invisible hit zones: `position:fixed; pointer-events:auto; display:none; z-index:2147483645; cursor:<...>;`. Edge hit zones are `EDGE_HIT_SIZE = 6px` thick, inset by `HALF_HANDLE = 4px` from corners.
- Cursors: `nw/se -> nwse-resize`, `ne/sw -> nesw-resize`, `n/s -> ns-resize`, `e/w -> ew-resize`.

### 2.9 Snap-guide pool (16 line/label pairs)
Lines get class `retune-snap-guide`, labels `retune-snap-label` (styled in overlay.css):
- `.retune-snap-guide`: `position:fixed; pointer-events:none; z-index:2147483645; background:var(--retune-red); display:none;` `.visible -> display:block`.
- `.retune-snap-label`: `position:fixed; pointer-events:none; z-index:2147483646; font-size:10px; font-weight:500; font-family:Inter...; color:#fff; white-space:nowrap; background:var(--retune-red); padding:1px 4px; border-radius:2px; opacity:0; transition:opacity 100ms ease;` `.visible -> opacity:1; transition:none`.

### 2.10 X-mark (snap corner marker)
`XMARK_SIZE = 4` (8px total). Drawn as a background SVG data-URI on a snap-guide line; stroke `%23F24822` (= `#F24822`), `stroke-width='1'`, two crossing lines, `background-size: contain`.

### 2.11 Spacing measurement (Alt-hover distances)
A `spacingContainer` (`position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483646;`) holds measure groups. Each measure = `{ line, connector, label }`.
- Line/connector base: `position:fixed;pointer-events:none;display:none;`. When drawn, `drawSegment()` sets `border-top` (horizontal) or `border-left` (vertical) `1px solid var(--retune-red)` (dashed=false in all spacing calls).
- Label cssText:
  ```
  position:fixed; pointer-events:none; display:none;
  font-size:10px; font-weight:500; font-family:Inter...;
  color:#fff; white-space:nowrap;
  background:var(--retune-red); padding:1px 4px; border-radius:2px;
  ```
- Pairs created: `hMeasure`, `vMeasure`, plus `parentMeasures.{top,right,bottom,left}`.

---

## 3. positionBox - the canonical box placement

`positionBox(box, labelEl, rect, borderStyle, bgAlpha)`:
```js
box.style.top = `${rect.top}px`;
box.style.left = `${rect.left}px`;
box.style.width = `${rect.width}px`;
box.style.height = `${rect.height}px`;
box.style.border = `1px ${borderStyle} #0D99FF`;
box.style.background = `rgba(13, 153, 255, ${bgAlpha})`;
box.style.display = "";
```
- Hover box: `positionBox(highlight, label, rect, "solid", "0")` then `label.display="none"` (hover never shows a label, see `updateHighlight`).
- Selection box: `positionBox(selection, selectionLabel, rect, "solid", "0")`, solid `1px #0D99FF`, transparent fill.

**Badge (label) placement:** below selection, horizontally centered, flips above near bottom edge:
```js
const labelY = rect.bottom + 4 + 20 < viewportH ? rect.bottom + 4 : rect.top - 24;
labelEl.style.top = `${labelY}px`;
labelEl.style.left = `${rect.left + rect.width / 2}px`;
labelEl.style.transform = "translateX(-50%)";
labelEl.style.background = "#0D99FF";
```
So the badge sits 4px under the box, or 24px above the top if it would overflow the viewport bottom.

**Selection badge text** = `formatLabel(el)` -> `formatSelectionLabel(width, height)` -> `` `${Math.round(width)} × ${Math.round(height)}` `` (the `×` is U+00D7 multiplication sign, spaces around it). Dimensions only, no tag name.

---

## 4. Activation / cursor

`activate()`:
- `active = true`.
- Injects a global cursor override `<style data-retune-cursor>` into `document.head` with text `* { cursor: default !important; }`.
- Adds capture-phase listeners on `document`: `mousemove -> handleMouseMove`, `click -> handleClick`, `dblclick -> handleDblClick`, `keydown -> handleKeyDown`, `keyup -> handleKeyUp`. **All capture phase (`true`)** to beat page handlers.
- `startTracking()` (scroll/resize/ResizeObserver, rAF-debounced).

`deactivate()` reverses all of the above and nulls `selectedElement`, clears `elementStack`/`stackIndex`, hides everything.

Comment mode (`setCommentMode(true)`) swaps the cursor override to a custom comment-bubble SVG cursor (base64 data-URI, hotspot `5 27`, fallback `pointer`) and `clearSelection()`s.

---

## 5. HOVER behavior (handleMouseMove -> applyHover)

`handleMouseMove(e)` early-returns if `!active || suspended || repositionDrag || resizeDrag || reorderDrag`.

1. **Overlay-UI guard:** `shadowRoot.elementFromPoint(x,y)`, if it hits a shadow element whose `getRootNode() === shadowRoot` AND that element is NOT one of `{selection, selectionLabel, highlight, label, parentIndicator}`, the cursor is over Retune UI (toolbar/panel) -> clear hover and return.
2. Temporarily set `selection.style.pointerEvents = "none"`, call `document.elementFromPoint(x,y)` (so the selection box does not intercept), restore.
3. `isOverlayElement(raw)` skip = `raw.closest("[data-retune-host]") || raw.closest("[data-retune-drag-ghost]")`.
4. `resolveElement(raw)` bubbles up through `SKIP_TAGS = {BR, WBR, COL, COLGROUP, SOURCE, TRACK, AREA, PARAM}` to the first useful parent.
5. If `el === hoveredElement`, return (dedupe).
6. **Ancestor debounce:** if the new `el` *contains* the current `hoveredElement`, defer `applyHover` by **50ms** (re-checking `elementFromPoint` first) to avoid flashing parents when crossing sibling gaps. Otherwise `applyHover(el, e.altKey)` immediately.

`applyHover(el, altKey)`:
- If `el === selectedElement`: hide hover box + spacing + sibling outlines, re-show the selection label.
- Else: `updateHighlight(el)` (draws solid blue hover box, no label). Then:
  - If a selection exists and `el.contains(selectedElement)` (hovered is an ancestor of the selection): if `altKey` -> `showParentSpacing(selRect, el)` (4 distance lines child->parent inner edges); else hide spacing. Plus `showSiblingOutlines(el, selectedElement)` (dotted outlines on the parent's other visible children).
  - Else if a selection exists (sibling/unrelated): if `altKey` -> `showSpacing(selRect, hoverRect)` (h+v distance with 90 deg bends, red); else hide. Plus `showChildOutlines(el)` (dotted outlines on hovered element's children).
  - Else (no selection): `showChildOutlines(el)`.
- Always calls `callbacks.onHover(el, rect)` (Retune passes a no-op `onHover`).

Sibling/child outlines use the 20-element dotted pool; filter excludes `data-retune-host`, `display:none`, `visibility:hidden`, and zero-size rects.

Alt key live toggle: `handleKeyDown`/`handleKeyUp` watch `e.key === "Alt"` and re-run `applyHover(hoveredElement, true/false)` to show/hide spacing without moving the mouse.

---

## 6. SELECTION by direct DOM click (handleClick)

`handleClick(e)` (capture phase) early-returns if `!active`.

**Overlay guard (two checks):**
1. `if (e.composedPath().includes(shadowRoot.host)) return;` (click retargeted to the host = panel/toolbar click).
2. `shadowHit = shadowRoot.elementFromPoint(x,y)`; if it belongs to the shadow root and its computed `pointer-events !== "none"`, return (interactive overlay UI).

**Popover block:** `if (callbacks.shouldBlockClick?.())` -> `preventDefault + stopPropagation + stopImmediatePropagation`, return. (Retune wires this to `shouldBlockForPopover`, blocks page clicks while an unsaved comment popover is open, shaking it.)

Then **always** `preventDefault + stopPropagation + stopImmediatePropagation` to suppress the page's own click.

**Click-to-cycle through the z-stack:**
- `CLICK_RADIUS = 5`px. `sameSpot` = within 5px of `lastClickPos` AND `elementStack.length > 1`.
- `buildElementStack(x,y)` = `document.elementsFromPoint(x,y)` filtered through `isOverlayElement` + `resolveElement`, deduped, **stopping at `document.documentElement`** (never selects `<html>`; `<body>` is the last possible entry), ordered deepest-to-shallowest.
- Same spot -> rebuild stack, advance `stackIndex = (stackIndex+1) % length` (cycles deeper, shallower, wrap).
- New spot -> rebuild stack, `stackIndex = 0`, update `lastClickPos`.
- `el = elementStack[stackIndex]`.

**Comment mode branch:** if `commentMode`, just `hideHighlight()` + `onSelect(el)` (no selection chrome).

**Edit mode (normal):**
```js
selectedElement = el;
selectionLabelHidden = false;
resizeObserver.disconnect(); resizeObserver.observe(el);   // re-target observer
showSelection();      // draws selection box, badge, handles, parent indicator, pin lines
hideHighlight();
hoveredElement = null;
callbacks.onSelect(el);   // -> Retune.onSelect -> opens Design panel
```

---

## 7. SELECTION via the Element tree, keyboard, or drag

- **Tree click** (`ElementTree onSelect -> handleTreeSelect`) calls `picker.selectElement(el)`.
  `selectElement(el)` is identical to the edit-mode tail of `handleClick`: set `selectedElement`, re-observe, `showSelection()`, `hideHighlight()`, `hoveredElement=null`, `callbacks.onSelect(el)`. **It does NOT touch `elementStack`/`lastClickPos`**, so click-cycling resets on the next direct click.
- **Tree hover** (`handleTreeHover`) -> `picker.highlightElement(el|null)` -> `updateHighlight` / `hideHighlight` (hover box only, no selection change).
- **Keyboard nav** (Retune hotkey handler, only when active + a selection exists):
  - `Shift+Enter` -> select `parentElement` (if not body) via `picker.selectElement`.
  - `Enter` -> select first visible child (skips `data-retune-host`, SCRIPT/STYLE/LINK).
  - `Tab` / `Shift+Tab` -> cycle siblings (same filter), wrapping.
  - Arrow keys -> reorder (not selection).
  - All guarded against INPUT/TEXTAREA/contentEditable targets via `composedPath()[0]`.
- **Canvas reorder click-through:** when a drag does not pass `REORDER_THRESHOLD=5`, after a **200ms** timeout the picker hides chrome, `elementFromPoint`s under the cursor, and selects the child beneath (so clicking a child of an already-selected container drills in). Double-click cancels this pending timer.

All selection paths converge on `callbacks.onSelect(element)`.

---

## 8. Retune.onSelect - what happens when an element is selected (Design entry)

`Retune.tsx` `picker.onSelect` callback (edit mode):

1. `inspected = inspectElement(element)` (helpers.ts). Returns the full `InspectedElement`:
   - `selector` = `getSelector(element)` (medv/finder; see Section 11).
   - `tagName`, direct-only `textContent` (first 100 chars), `classes` (split className), `rect`, `computedStyles = getRelevantStyles(element)`, `layoutMode = detectLayoutMode(element)`.
   - React data: `reactComponents = getReactComponentHierarchy`, `reactProps = getDirectReactProps`, `reactState = getDirectReactState`, `sourceFile = getReactSource`.
   - `stylingApproach`, `inlineStyles` (`element.style.cssText`), `elementId`, `accessibleName` (aria-label/alt/title/placeholder/name), `parentContext`, `childSummary`, `domPath`, `nearbySiblings`, `position` (rounded x/y/w/h).
2. Clears any forced pseudo-state inline styles.
3. `setStyleSources(getStyleSources(element))`.
4. `candidates = getSelectorCandidates(element)` -> `setSelectorCandidates`.
5. `ancestors = getAncestorScopes(element)`; `levels = buildScopeLevels(candidates, element, ancestors, manifest)` -> `setScopeLevels`.
6. **Default active scope level** = `levels.length >= 2 ? levels.length - 2 : 0` (the level just *above* "This instance", the narrowest class/ancestor scope, not the element-specific one). `setActiveLevelIndex(defaultIndex)`.
7. If that default level has a selector -> `picker.showScopeHighlights(selector, element)` (solid-blue outlines on all matching siblings, excluding the selected element).
8. If the default selector is a single class (no space) -> recompute `inspected.computedStyles` via `getScopedStyles` and set `ownedProperties`. Parent-scoped selectors (contain a space) skip this and clear `ownedProperties`.
9. Overlay any pending LivePreview changes onto `computedStyles` (so re-selecting an edited element shows edited values), skipping `:hover/:focus/:active` selectors.
10. `setSelectedElement(inspected)` + eagerly `selectedElementRef.current = inspected`.
11. Closes Settings; lazily loads the manifest if the element has reactProps.
12. `tracker.track(...)` the element AND every scope level's selector (for migration).

**The Design panel is not separately "opened", it renders reactively** whenever the `AnimatedPanel` visibility predicate is true (Section 9). So selecting an element in edit mode IS the entry into Design.

---

## 9. The panel container & "Design" tab (Retune.tsx JSX)

The whole panel is wrapped in `AnimatedPanel`:
```jsx
<AnimatedPanel visible={!!(active && selectedElement && !settingsOpen && !toolbarDragging && mode === "edit")}>
```
- `AnimatedPanel` state machine: `hidden -> entering -> visible -> exiting -> hidden`, each transition `PANEL_ANIMATION_MS = 150`. Wrapper `<div className="retune-panel-anim {entering|exiting|''}">`. It snapshots children while visible so the exit animation keeps content.
- So the Design panel appears **only** when: overlay active, an element is selected, settings closed, toolbar not being dragged, and mode is `"edit"`. Selecting in comment mode does NOT open it (comment mode clears selection).

Panel structure:
```jsx
<div className={`retune-panel ${side}`}>             // side = "right" | "left"
  <div className="retune-tab-bar" ref={tabBarRef}>
    <div className="retune-tab-pill" ref={tabPillRef} />
    <button className="retune-tab{ active}" onClick={()=>setPanelTab("elements")}>Elements</button>
    <button className="retune-tab{ active}" onClick={()=>setPanelTab("design")}>Design</button>
    <span style="margin-left:auto; font-size:11px; line-height:16px;
                 color:var(--retune-text-tertiary); letter-spacing:-0.005em;
                 padding-right:8px; ...">
      {updateInfo dot} v{version}
    </span>
  </div>
  <div className="retune-panel-body">
    <PanelBanner .../>            // update-available banner
    {panelTab === "elements" && <ElementTree .../>}
    {panelTab === "design" && selectedElement && (
      <> <PanelBanner manifest.../> <ComponentSection .../> <PropertyPanel .../> </>
    )}
  </div>
</div>
```
- **Default tab is `"design"`** (`useState<"elements"|"design">("design")`).
- **Tab pill animation:** measures the active button's rect vs the bar rect; `pill.style.width = btnRect.width`; `transform: translateX(offsetX)`. First render sets `transition:none` + forces reflow (`pill.offsetHeight`) then restores transition, so the pill does not slide on initial mount.
- The version chip on the right shows `v{updateInfo?.current || __RETUNE_VERSION__}`; a 4px blue dot (`background: var(--retune-blue)`) precedes it when an update is available; clicking re-shows a dismissed update banner.
- `PropertyPanel` is keyed by `selectedElement.selector` (full remount on new selection) and receives `onPropertyHover={setHoveredBoxModel}`, which is what drives the box-model overlay (Section 10).

---

## 10. Box-model overlay (box-model-overlay.tsx)

Rendered in Retune via:
```jsx
{active && selectedElement && hoveredBoxModel && (
  <BoxModelOverlay element={selectedElement.element}
                   hoveredProperty={hoveredBoxModel}
                   revision={changeRevision} />
)}
```
`hoveredBoxModel` is set by `PropertyPanel.onPropertyHover`, i.e. hovering a padding/margin/gap input in the Design panel paints the corresponding region on the live element.

`BoxModelProperty` union: `paddingTop|Right|Bottom|Left`, `paddingBlock|paddingInline`, `marginTop|Right|Bottom|Left`, `marginBlock|marginInline`, `gap|columnGap|rowGap`, or `null`.

**Colors** (diagonal hatch via `repeating-linear-gradient(-45deg, transparent, transparent 3px, <c> 3px, <c> 4px)`, `<c> = rgba(r,g,b,0.5)`):
- `PADDING_COLOR` = blue hatch `rgba(13,153,255,0.5)`.
- `MARGIN_COLOR` = orange hatch `rgba(255,168,36,0.5)`.
- `GAP_COLOR` = pink hatch `rgba(255,77,157,0.5)`.

Rect math (all relative to viewport `getBoundingClientRect`, parses computed px):
- **Padding side**: a strip inside the element along that edge; only drawn if that padding `> 0`. Top: full width x `pt` at element top. Bottom: at `bottom - pb`. Left/Right: `pl`/`pr` wide x full height.
- **Margin side**: a strip outside the element; only if margin `> 0`. Top/Bottom span `width + ml + mr` and are offset by `-ml` left. Left/Right are `ml`/`mr` wide x element height.
- **Block/Inline** variants paint two sides (Top+Bottom / Left+Right).
- **gap/columnGap/rowGap**: `computeGapRects` walks flex (per-direction) or grid (rows grouped by `top` within 5px) children whose `position` is `static`/`relative`, subtracts adjacent margins, and emits the inter-child gaps. `columnGap`/`rowGap` then filter `allGaps` by orientation (`width>=height` vs `height>=width`, inverted for column layouts). Dedup within 1px.

Each rect renders as:
```jsx
<div className="retune-box-model-rect" style={{
  position:"fixed", top, left, width, height,
  background: color, pointerEvents:"none", zIndex:2147483645 }} />
```
Recomputed via `useMemo` keyed on `[element, hoveredProperty, revision]`.

---

## 11. Identifier logic (identifier.ts)

### getSelector(element)
Uses `@medv/finder` rooted at `document.body`:
- `className` filter rejects names starting `_` or `css-`, and the hash pattern `/^[a-z]{1,3}[A-Za-z0-9_]{8,}$/`.
- `seedMinLength: 1`, `optimizedMinLength: 2`, `threshold: 1000`.
- On throw -> `buildFallbackSelector`: walk up to body, prefer `#id` (stops), else `tag` + `:nth-of-type(n)` when needed, joined by `>`.

### isHashedClass(name)
`true` if starts `_` / `css-` or matches `/^[a-z]{1,3}[A-Za-z0-9_]{8,}$/`; BUT `__`/`--` (BEM) are never hashed.

### getSelectorCandidates(element) -> SelectorCandidate[]
`{ selector, count, verdict: "semantic"|"utility"|"ambiguous" }`. Built from `analyzeElementClasses`, a multi-signal scorer combining:
- **Stylesheet structure** (`walkRules`): low authored-property count + simple single-class selectors lean utility; >=5 properties or complex selectors lean semantic; classes inside `@layer utilities` are forced utility. `countAuthoredProperties` collapses longhands via `getPropertyFamily`.
- **Name pattern** (`scoreNamePattern`): variant prefixes (`sm:`,`hover:`,...), arbitrary values `[...]`, slash-opacity, trailing `!` -> score 1.0; `UTILITY_STEMS`/`SEMANTIC_STEMS` sets; Tailwind value/color/keyword suffix detection. BEM (`__`/`--`) -> semantic.
- Combined weighted 0.65 sheet / 0.35 name; verdict thresholds: `>=0.65 utility`, `<=0.35 semantic`, else confidence-gated `ambiguous`.
- Compound-selector participants are forced to display as semantic.
- Candidates sorted: semantic, ambiguous, utility, then `count` descending (broadest first). Each `count = document.querySelectorAll(selector).length` with `selector = ".${CSS.escape(c)}"`.

### getAncestorScopes(element) -> AncestorScope[]
Walks all stylesheet rules the element `matches`, skips `:hover/:focus/:active`, splits each at the last descendant/child combinator via `parsel-js`, keeps the ancestor part if the element part matches the element's own class/tag and the ancestor is not framework noise (`[data-v-...]`, `_nghost/_ngcontent`, css-in-js hashes). `{ fullSelector, ancestorPart, label: humanizeAncestorPart(...), count }`, sorted by count desc.

### buildScopeLevels(candidates, element, ancestorScopes, manifest) -> ScopeLevel[]
`ScopeLevel = { label, selector|null, count, kind?: "class"|"ancestor"|"element" }`.
- Filters candidates to semantic (or manifest-mapped) classes.
- If none: Strategy 1 `buildCompoundFingerprint` (all non-hashed classes joined, label "All instances", only if count>1); else Strategy 2 `buildParentScopeLevel` (`.<semantic-ancestor> tag`, count 2-20); else just ancestor scopes; always ends with `{ label:"This instance", selector:null, count:1, kind:"element" }`.
- With semantic classes: accumulate each into a sorted compound selector, labelled via `humanizeScopeLabel` (BEM modifier to modifier word, BEM element to element word, contextual prefix strip, manifest prop value), then append ancestor levels, then "This instance".

### React fiber helpers
`getFiber` finds the `__reactFiber$...` key. `getReactComponentHierarchy` walks `.return` collecting non-internal component names. `getDirectReactComponent`/`getDirectReactProps`/`getDirectReactState` only return data when the element is the component's *root DOM node* (`findFirstDomFiber` equals the element). `isFrameworkInternal` filters Fragment/Suspense/Provider/Next.js/page-level/<=2-char names. Props omit `children/ref/key/params/searchParams`.

---

## 12. Selection-box interactivity (post-selection, affects entry feel)

Once selected, `updateSelectionCursor()` sets the selection box pointer-events:
- `absolute`/`fixed` element -> `pointer-events:auto; cursor:move` (drag to reposition).
- flow element in a reorderable container -> `pointer-events:auto; cursor:grab`.
- else -> `pointer-events:none; cursor:""`.

This is why `handleMouseMove`/`handleClick` temporarily set `selection.pointerEvents="none"` before `elementFromPoint`.

`selection.addEventListener("pointerdown")` forks to reposition (absolute/fixed) or reorder (flow). `selection.addEventListener("dblclick")` triggers inline text editing via `callbacks.onDoubleClick` (Retune makes the element `contentEditable`, suspends the picker).

`Escape` (when active, no open dialog/popover, not comment mode) -> `callbacks.onCancel()` -> `deactivateOverlay()`.

---

## 13. Tracking / scroll sync (entry-relevant)

- `startTracking()` adds capture-phase passive `scroll` + `resize` listeners and a `ResizeObserver` on the selected element, all rAF-debounced (`scheduleTrack` -> `trackSelection`).
- `trackSelection()` only updates position when the rect actually changed; re-positions selection box, badge, handles, parent indicator, pin lines, and refreshes scope highlights. On scroll it also clears the stale hover box.
- `suspend()` (during text editing) keeps only the selection border, hides handles/badge/indicators and removes the cursor override; `resume()` restores.

---

## Hotkey toggle (Retune.tsx)

- `DEFAULT_CONFIG.hotkey = "alt+d"`. `matchesHotkey` (helpers.ts) splits on `+`, requires exact modifier match, and on macOS Alt falls back to `e.code` (since Option mangles `e.key`).
- Pressing the hotkey calls `toggleOverlay()` which activates/deactivates the picker and `preview.attach()`.
- `activateOverlay` (toolbar collapse-button click) also activates. `V` selects edit mode, `C` selects comment mode (when active, not in an input).

---

## Open questions / out-of-file references
- `getRelevantStyles`, `detectLayoutMode`, `getStyleSources`, `getScopedStyles`, `getPseudoStateStyles` live in `inspector/styles.ts` (not read here), they define exactly which properties populate `computedStyles` and the scoped/owned-property sets shown in the Design panel.
- `detectStylingApproach`, `scanDesignTokens` in `inspector/tokens.ts`.
- `PropertyPanel`, `ComponentSection`, `ElementTree`, `SettingsPanel`, `PanelBanner`, `Tooltip` are separate components, the per-control specs (padding/margin/gap inputs, scrub math, units, scope rail UI) live there, not in the picker. `onPropertyHover` -> box-model is the only picker-relevant wiring captured here.
- Toolbar icons are from `@central-icons-react/round-outlined-radius-2-stroke-1.5`: `IconCursor1` (edit mode), `IconComment` (custom inline SVG, not the package), `IconSquareBehindSquare6` (copy), `IconCheckCircle2` (copied), `IconBroom` (reset), `IconSettingsGear2` (settings), `IconCrossMedium` (close), plus `RetuneLogo` (custom 16-rect SVG with `#retune-bloom` filter). Extract verbatim from that package for a 1:1 port.
- `overlay.css` (~82KB) holds `.retune-panel`, `.retune-tab`, `.retune-tab-pill`, `.retune-panel-anim`, `.retune-toolbar*` styling, needed for exact panel/toolbar dimensions but outside this area's five files.
