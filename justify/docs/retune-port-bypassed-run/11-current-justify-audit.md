# 11 - Current Justify Manipulate Audit (vs Retune source)

**Area:** `justify/core/manipulate/` - the entire Manipulate (Design panel) implementation
**Goal of this doc:** audit what Justify's Manipulate mode currently is, module by module, against Retune's real source, and give a concrete fresh-rewrite-vs-reconcile call per module plus an architecture recommendation for the React/TSX (Retune) -> vanilla-TS (Justify) gap.

> Sourcing note: the Retune package shipped to this repo is the published `retune` README only (`/Users/spare3/Documents/Github/retune/README.md`). The `packages/overlay/src` source referenced in the task brief is **not present** on disk - the only Retune artifact available is the README feature surface. Every "Retune says" claim below is anchored to a README line. Where Justify's own files claim verbatim extraction from a "reference design tool v0.7.6" (see `icons.ts` header), that is the closest thing to real Retune source we have, and it is flagged as such.

---

## 0. How Justify currently bundles (the architecture baseline)

`justify/build.js`:
```js
await esbuild.build({
  entryPoints: ['core/index.ts'],
  bundle: true,
  outfile: 'dist/justify-core.js',
  format: 'iife',
  globalName: 'Justify',
  minify: !dev,
  sourcemap: true,
  target: 'es2022',
});
```
- **Single esbuild IIFE**, `globalName: 'Justify'`, `target: es2022`, no JSX loader configured, no React/Preact in `entryPoints` graph. Adapters (`react`/`vue`/`svelte`) are built as separate IIFE bundles but are thin mount shims, not the UI.
- `core/index.ts` (`JustifyCore`) is **pure imperative DOM**: every UI element is `document.createElement` + `Object.assign(el.style, {...})` or `el.style.cssText = '...'`. No virtual DOM, no JSX, no component framework anywhere in core. Fonts are injected as `@font-face` for `JustifySans`/`JustifySerif`/`JustifyMono` from `http://localhost:9223/fonts/...`.
- `ManipulateMode` is constructed in `core/index.ts` `switchMode('manipulate')` with `(overlay, previewEngine, changeBuffer, transport)` and `.activate()`d.

**Implication for the port:** Justify has deliberately chosen imperative DOM as its rendering substrate for the entire overlay, not just Manipulate. Any decision to bundle Preact for the panel would make Manipulate the *only* React-shaped island in an otherwise imperative codebase. That tension is the central architecture question (Section 7).

---

## 1. `index.ts` (ManipulateMode controller) - 205 lines

### What it does
- Holds `overlay`, `preview` (`PreviewEngine`), `changeBuffer` (`ChangeBuffer`), `transport` (`Transport`).
- `activate()` wires three listeners:
  - `mousemove` -> hover highlight via `overlay.showHighlight(rect)` + a floating hover label `_hLabel` with an inline-built 14x14 SVG icon (stroke-based, `viewBox 0 0 24 24`, `stroke-width 2`) chosen by tag/role/display, and a text label `tag .firstClass` / `tag #id` / `tag (role)`. Label positioned at `clientX+12, clientY-30`.
  - `click` (capture) -> `selectElement(getElementAtPoint(x,y))`, guarded by `isJustifyElement()` (walks parentNode/shadow host looking for `[data-justify]`).
  - `scroll` (capture) -> re-show highlight on selected element.
- `selectElement(el)`: `generateSelector(el)`, `overlay.trackElement(el)`, `detectControls(el)`, `getComputedStylesSubset(el)`, then **destroys any existing panel and news a fresh `PropertyPanel(shadowRoot)`** and calls `panel.render(controls, computedStyles)`.
- `onPropertyChange((property, value) => ...)`: computes `oldValue` from `computedStyles` (camelCase fallback), calls `preview.applyChange(selector, property, value)` then `changeBuffer.add(selector, property, oldValue, value)`.
- `applyChanges()`: `transport.request('push_changes', { changes })`.

### vs Retune
- Retune README: "Click any element to inspect it" then "Adjust styles, reorder elements, edit text, delete, resize" then "Apply -> sent to your AI coding tool via MCP." Justify's select->preview->buffer->push_changes pipeline matches the **Apply** half conceptually.
- The hover-label inline SVG icons here are **hand-rolled stroke icons** (e.g. `d = 'M21 3H3v18h18V3z...'`), NOT the verbatim Figma-style icons in `icons.ts`. They duplicate icon logic and visually diverge from the panel's own iconography.

### Verdict: **RECONCILE (light).**
The controller plumbing (intercept -> select -> detect -> panel -> preview/buffer) is sound and matches Retune's flow. Two fixes:
1. The hover-label icons should be unified with `icons.ts` (or with whatever the real Retune hover badge uses) rather than a second inline icon set.
2. `selectElement` destroys + recreates the whole `PropertyPanel` on every selection. Retune (React) would re-render with new props and preserve panel scroll/tab state. Justify loses `activeTab`? No - `activeTab` lives on the new panel instance which defaults to `'design'`, so **tab selection resets on every click**. That is a behavior bug to reconcile.

---

## 2. `property-panel.ts` (the Design panel) - 2841 lines, the core of this area

This is 95% of the surface and the file most worth pinning exactly.

### 2.1 Container + theme tokens

CSS variable map (`cssVars`) and resolved `darkTheme` values (lines 134-164):

| Token var | Resolved value (dark) |
|---|---|
| `--justify-surface` | `color-mix(in srgb, #1c1917 95%, #ffffff)` |
| `--justify-surface-hover` | `color-mix(in srgb, #ffffff 5%, transparent)` |
| `--justify-text` | `color-mix(in srgb, #ffffff 90%, transparent)` |
| `--justify-text-secondary` | `color-mix(in srgb, #ffffff 70%, transparent)` |
| `--justify-text-tertiary` | `color-mix(in srgb, #ffffff 50%, transparent)` |
| `--justify-border` | `color-mix(in srgb, #ffffff 10%, transparent)` |
| `--justify-input-bg` | `color-mix(in srgb, #ffffff 5%, transparent)` |
| `--justify-blue-bg` | `color-mix(in srgb, #0768CF 50%, transparent)` |
| `--justify-blue-text` | `#0D99FF` |
| `--justify-blue-500` | `#0D99FF` |
| `--justify-surface-active` | `color-mix(in srgb, #ffffff 5%, transparent)` |
| `--justify-black` | `#1c1917` |
| `--justify-white` | `#ffffff` |

Constants: `PANEL_WIDTH = 280`, `FONT_FAMILY = "'JustifySans', system-ui, sans-serif"`, `EASING = 'cubic-bezier(0.23, 1, 0.32, 1)'`.

**Only a dark theme exists.** Retune README explicitly lists "Dark mode - Full dark mode for the overlay. Toggle in Settings or follow system preference," i.e. Retune has **both** light and dark plus a system-follow toggle. Justify hardcodes the dark palette onto the container via `setProperty` and has **no light theme map and no toggle.** Gap.

Container styles (`applyContainerStyles`, lines 195-229):
```
position: fixed; right: 16px; bottom: 68px; width: 280px;
maxHeight: calc(100vh - 84px); overflowY: auto; scrollbarWidth: none;
background: var(--justify-surface); borderRadius: 16px;
border: 1px solid var(--justify-border);
boxShadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.04);
pointerEvents: auto; fontFamily: 'JustifySans',system-ui,sans-serif; fontSize: 13px;
color: var(--justify-text); zIndex: 2147483647; opacity 0 -> 1; transform translateY(12px) -> 0;
transition: opacity 150ms EASING, transform 150ms EASING;
```
Scrollbar hidden via injected `<style>`: `:host ::-webkit-scrollbar { display:none } .justify-pp-panel::-webkit-scrollbar { display:none }`. Mounted into the overlay **shadow root** (`this.overlay.getShadowRoot()`).

### 2.2 Tab bar (lines 283-357)

- Container: `display:flex; align-items:center; padding:8px; border-bottom:1px solid var(--justify-border); position:relative`.
- Sliding **pill** behind tabs: `position:absolute; top:8px; height:calc(100% - 16px); background:var(--justify-input-bg); borderRadius:8px; transition: transform 0.2s EASING, width 0.2s EASING`. Position computed from `getBoundingClientRect` offsets in `updatePillPosition`.
- Two tabs only: **`Elements`** and **`Design`** (`id: 'elements' | 'design'`). Button style: `padding:8px 12px; fontSize:12px; fontWeight:500; color text|textTertiary; transition: color 150ms EASING`.
- A version label pinned right: `textContent 'v0.1'`, `fontSize:11px; color textTertiary; marginLeft:auto; paddingRight:8px`.
- Default `activeTab = 'design'`.

**vs Retune:** Retune's README implies more than two tabs - it describes a Design/Property surface AND an "Elements Tab" (Figma-style tree), AND "Component Props & State" view, AND "Comments." Justify exposes only Elements + Design. The version pill `v0.1` is Justify's own marker, not Retune. Reconcile (the two-tab model may be intentionally reduced scope; flag for product decision).

### 2.3 Elements tab - DOM tree (lines 383-563)

- `buildTree(document.body, 0)` recursively; `expanded: depth < 2`; skips `JUSTIFY-PANEL`, `.justify-pp-panel`, `SCRIPT/STYLE/NOSCRIPT`.
- `isFrameworkComponent`: true if any attr starts with `data-reactroot`/`data-v-`/`data-svelte`, OR tagName contains `-` (custom element).
- `getNodeDisplayName`: `.firstClass` (if <30 chars) else `#id` else truncated direct text (>30 -> 27+`...`) else tagName.
- Row: `height:32px; paddingLeft = depth*20 + 12 px; paddingRight:8px; cursor:pointer; userSelect:none; transition: background 0.12s`.
  - Selected row bg = `var(--justify-blue-bg)`; hover bg = `var(--justify-surface-hover)`.
  - **Chevron wrapper** 16x16, only if children; uses `chevronDown(16)`, rotates `0deg`/`-90deg`, color `textTertiary`, `transition: transform 0.12s`. Toggling sets next sibling `[data-tree-children]` display block/none.
  - **Dot indicator** 16x16 wrap, marginRight 6px, a 4x4 `border-radius:50%` `background:currentColor`; color = `blueText` if component else `textTertiary`.
  - **Label** span: `fontSize:13px; fontWeight:400; color text; ellipsis; flex:1; minWidth:0`.
- Click selects node -> `selectCallback` -> re-renders tab content.

**vs Retune Elements Tab:** Retune says "layout-aware icons (flex-row, flex-column, grid, block, text, image, component). SVG shapes render as mini path previews. Text elements show content preview as the layer name. Drag to reorder or reparent." Justify's tree has **only a generic dot** (component-colored), **no layout-aware icons, no SVG mini-previews, no drag-to-reorder/reparent.** Large feature gap.

### 2.4 Design tab section order (lines 569-602)

`buildDesignTab` renders in this fixed order:
1. `buildElementTagSection` (tag header + Target pill + Trigger select)
2. `buildPositionSection`
3. `buildLayoutSection` (flex/grid)
4. `buildSpacingSection`
5. `buildSizeSection`
6. `buildTypographySection` (only if `hasTypo`)
7. `buildAppearanceSection`
8. `buildFillSection`
9. `buildBorderSection`
10. `buildShadowSection`
11. `buildFiltersSection`

`getElementTag()` heuristic: `img` if image group; else if typography group, `font-size >= 28 -> h1`, `>=22 -> h2`, `>=18 -> h3`, else `p`; else `div`.

**vs Retune Property Controls table** (README lines 74-84): Retune drives section visibility off element TYPE (Any/Text/Flex/Grid/Image/Video/SVG shapes/Positioned/Background image). Justify approximates this through `control-detector` groups but is **missing: Video controls (autoplay/loop/muted/controls), SVG shape controls (fill/stroke color/stroke width), object-position/alt/loading for images, background-image controls (size/position/repeat), and the aspect-ratio lock toggle in the Size section** that Retune calls out explicitly.

### 2.5 Element-tag section (lines 608-637)

- Header = the resolved tag string.
- **Target** row: label `Target` + a single pill `'This instance'` (active=true, styled `blueBg`/`blueText`). Retune's **Scope Targeting** feature describes multiple scope pills (base class -> variant -> "This instance"), manifest-labeled. Justify hardcodes a single non-functional pill. Gap.
- **Trigger** row: a select `['None','Hover','Focus','Active']` defaulting `'None'` with an **empty callback `(_val) => {}`** - i.e. trigger switching is a dead control. Retune's "Trigger Editing" (Hover/Focus/Active) is functional. There is also a separate `state-toggle.ts` (Section 4) that is unused. Gap / dead code.

### 2.6 Position section (lines 643-904)

- Alignment row: two segmented icon groups, **Horizontal** (`layoutAlignLeft/HorizontalCenter/Right` @ 24) emitting `text-align` `left|center|right`, and **Vertical** (`layoutAlignTop/VerticalCenter/Bottom` @ 24) emitting `align-items` `flex-start|center|flex-end`. Each group: `flex:1; display:flex; background:surfaceHover; borderRadius:8px; overflow:hidden`. Enabled/disabled via opacity `1`/`0.3` + pointerEvents based on `hEnabled`/`vEnabled` computed from position/display/flex-direction. Buttons: `flex:1; height:32px; transition: background 0.15s ease`, hover bg = `var(--justify-border)`, separators `inset 1px 0 0 var(--justify-surface)`.
- **Type** select: `['static','relative','absolute','fixed','sticky']` -> emits `position`.
- Conditional offset editors:
  - `absolute`/`fixed`: a 3-column layout with L/R prop inputs and a center column holding `top` input, a **64px preview box** (`surfaceHover`, rounded 8) with a centered 24x24 inner box (`surface`, 1px border) containing a **4x4 dot colored `#D97757`** (Justify orange, hardcoded - not a token), and a `bottom` input.
  - `relative`: `Offsets` label + 2 rows of T/R and B/L prop inputs (gap 8px).
  - `sticky`: `Sticky offset` label + T/B inputs.

Note the **`#D97757` orange dot** is hardcoded RGB, while everything else is tokenized. This is the Justify brand color leaking into the panel.

### 2.7 Layout section (lines 910-1032)

- **Display** segmented control with icons: `block` (`rectangleSmall`), `flex-row` (`autolayoutAddHorizontal`), `flex-col` (`autolayoutAddVertical`), `grid` (`gridView`), all @24. Maps to `display`/`flex-direction` emits.
- If `hasFlex`:
  - Alignment column -> `makeAlignmentGrid` (3x3, Section 2.13).
  - Gap column -> `makePropInputWithIcon('gap', alSpacingHorizontal)`.
  - Reverse select `No/Yes` (rewrites flex-direction +/- `-reverse`).
  - Wrap select `Nowrap/Wrap/Wrap-reverse` -> `flex-wrap`.
- **No grid-specific controls are rendered** even though `control-detector` defines `GRID_CONTROLS` (columns/rows/gap). `buildLayoutSection` only branches on `hasFlex`. Grid is detected but not editable beyond toggling display to grid. Gap / dead detector output.

### 2.8 Spacing section (lines 1038-1074)

- **Padding** row: label `Padding` + `makePropInputWithIcon('padding-left', alPaddingHorizontal)` + `makePropInputWithIcon('padding-top', alPaddingVertical)` + `makeSplitButton()`.
- **Margin** row: identical pattern with `margin-left`/`margin-top` + split button.
- Rows are `makeSectionRowWithSplit` (`padding: 0 8px 0 16px`), `display:flex; align-items:center; gap:6px`.

The split button (`makeSplitButton`, lines 1844-1870) renders `alPaddingSides(24)` and is **purely cosmetic** - it has hover styling but **no click handler**, so "split into 4 sides" does nothing. Retune's box editing implies per-side control. Gap / dead control. Note `box-model.ts` (Section 3) renders a full 4-side box visualization but **is never imported by property-panel** - it is orphaned.

### 2.9 Size section (lines 1080-1172)

- Labels row Width/Height + 32px spacer.
- Inputs row: `makeComboInput('width')` + `makeComboInput('height')` + a **lock button** (32x32, `lockOpen(24)` default, toggles to `lockClosed(24)`, color text|textTertiary). The lock toggles a local `locked` boolean **but nothing reads it** - aspect-ratio locking is not implemented. Retune's "Aspect Ratio Lock" is a real feature ("Images and video lock by default during resize, hold Shift to unlock"). Gap.
- Max W / Max H labels + `makePropInput('max-width'/'max-height', optional=true)`.
- `makeComboInput` shows `'Fill'` literal when width is `auto`/empty; has a unit chevron (`chevronDown(24)`) that **opens no menu** (decorative). Gap.

### 2.10 Typography section (lines 1178-1302) - only when `hasTypo`

- **Font family button**: full-width 32px, `surfaceHover` bg, shows first family token + `chevronDown(24)`; hover bg `border`. **Opens nothing** - no font picker. Retune lists "font family" as an editable Text control. Gap.
- **Size + Weight** row: `makePropInput('font-size')` + weight select `100..900` -> `font-weight`.
- **Line height + Letter spacing** row: `makeComboInput('line-height', step 0.1)` + `makeComboInput('letter-spacing', step 0.1)`.
- **Color** row: `makeColorInput('color')`.
- **Text align** segmented (`textAlignLeft/Center/Right` @24) -> `text-align`.
- **Vertical** segmented (`textAlignTop/Middle/Bottom` @24) -> `vertical-align`.

### 2.11 Appearance / Fill / Border / Shadow / Filters

- **Appearance** (1308-1354): Opacity (`makePropInput('opacity', step 0.05)`) + Z-index (`step 1`); Corner radius (`makePropInputWithIcon('border-radius', radiusTopLeft)`) + split button (dead); Overflow select `visible/hidden/scroll/auto`.
- **Fill** (1360-1376): header has an **add (+) button** that emits `background-color:#ffffff`. Body (color input) only renders if `hasFill` (bg not transparent / not `rgba(0,0,0,0)`). Empty state = header + plus only. Matches Retune's add-on-demand pattern conceptually.
- **Border** (1382-1430): add button seeds `border-style:solid; border-width:1px; border-color:#333333`. When present: color input, width input + split (dead), style select `solid/dashed/dotted/double`.
- **Shadow** (1436-1607): add button seeds `0px 2px 8px 0px rgba(0,0,0,0.15)`. When present: a custom color row (swatch+hex+opacity built inline, NOT via `makeColorInput`), X/Y row, Blur/Spread row, Type select `Outside/Inside`. Uses `parseShadow`/`formatShadow`. Single shadow only (no shadow list). Retune just says "shadow" generically; single-shadow is acceptable, flag for parity.
- **Filters** (1613-1704): renders one row per parsed filter with a **click-to-set track slider** (no drag) and a value label. `maxVal` heuristics: `px->50`, `deg->360`, saturate/contrast/brightness->`200`, else `100`. Has add button seeding `blur(0px)`. The slider is **click-only, not draggable** - a polish gap vs a real range.

### 2.12 Shared primitives (exact style values)

| Primitive | Key style values |
|---|---|
| `createSection` | `borderBottom: 1px solid var(--justify-border)` |
| `makeSectionHeader` | `display:flex; justify-content:space-between; padding: 0 8px 0 16px; height:44px`; title `fontSize:12px; fontWeight:500; lineHeight:20px`; optional add btn 32x32 radius 8, `opacity 0`->`1` on header hover, `plus(24)` icon |
| `makeSectionBody` | `display:flex; flex-direction:column; gap:12px; paddingBottom:16px` |
| `makeSectionRow` | `padding: 0 48px 0 16px` |
| `makeSectionRowWithSplit` | `padding: 0 8px 0 16px` |
| `makeGroupLabelInline` / `makeFieldLabel` | `fontSize:11px; fontWeight:400; letterSpacing:-0.005em; color textTertiary; lineHeight:16px` |
| `makeSelectorPill` | `padding:4px 8px; radius 8; fontSize:11px; fontWeight:500`; active `blueBg`/`blueText`, inactive `surfaceHover`/`textSecondary` |
| `makePropInput` / `makePropInputWithIcon` | wrapper `height:32px; radius 8; bg surfaceHover; transition background-color 0.15s`; hover -> `border`; input `fontSize:11px; fontWeight:450; padding 0 8px (or 0 8px 0 32px with prefix); fontVariantNumeric:tabular-nums; letterSpacing:-0.005em`; focus -> `outline:1px solid border` + bg `border` |
| `makeComboInput` | left rounded `8px 0 0 8px`, right 32x32 chevron rounded `0 8px 8px 0`, gap 1px |
| `makeSelectControl` | wrapper 32px radius 8 bg surfaceHover; label `paddingLeft:32px`; dropdown `top:34px; bg surface; border; boxShadow 0 4px 16px rgba(0,0,0,0.3); maxHeight 200px; padding 4px`; items `padding 6px 8px; radius 6; fontSize 11`; selected `blueBg`/`blueText` |
| `makeSegmentedControlWithIcons` | wrapper 32px radius 8 bg surfaceHover overflow hidden; indicator `bg surface; border 1px; radius 8; transition transform 200ms cubic-bezier(0.77,0,0.175,1); willChange transform`; width = `100/n %`, transform `translateX(activeIdx*100%)` |
| `makeColorInput` | swatch 20x20 radius 2 + hidden `input[type=color]`; hex input `fontSize 11 fontWeight 450`; opacity input width 28 right-aligned + `%` label |
| `makeResetDot` | 4x4 radius 50% `bg blue500`, absolute `left:4px; top:50%`; shows only when current != original |

### 2.13 Alignment grid (lines 2585-2660)

3x3 grid, `gridTemplateColumns/Rows: repeat(3,1fr)`, `bg surfaceHover; radius 8; width 100%; height 72px`. 9 cells map `justify-content` x `align-items` (flex-start/center/flex-end each). Active cell uses `iconPositionLeft/CenterH/Right(16, '#0D99FF')`; inactive cells use `iconDot(16, '#a8a29e')`. **Both colors hardcoded** (`#0D99FF` active, `#a8a29e` inactive) rather than `blue500`/`textTertiary` tokens - token drift. Note: the grid only ever uses the H-position icons per row (left/centerH/right); the V-position and stretch-bar icon variants in `icons.ts` (`iconPositionTop/CenterV/Bottom`, `iconSBBar*`) are **exported but unused**.

### Verdict for property-panel.ts: **RECONCILE the structure, fresh-rewrite the dead controls.**
The layout primitives, token system, section model, scrub inputs, and segmented controls are high-quality and closely mirror a Figma/Retune-style panel. But a meaningful fraction of controls are **visually present but behaviorally dead**: Trigger select, split buttons (4), aspect-ratio lock, font-family picker, combo-input unit chevron, filter slider drag, scope pills, grid controls. Reconcile = keep the chrome, wire the dead controls to real emits + bring back the missing Retune sections (Video/SVG/background-image/object-position/scope levels/light theme).

---

## 3. `box-model.ts` - 243 lines - ORPHANED

Renders a 180x120 three-layer box-model diagram (margin/padding/content) with tabular-nums edge labels. Colors hardcoded:
- `MARGIN_BG rgba(249,115,22,0.15)`, `MARGIN_TEXT #f97316`
- `PADDING_BG rgba(34,197,94,0.15)`, `PADDING_TEXT #22c55e`
- `CONTENT_BG rgba(59,130,246,0.15)`, `CONTENT_TEXT #93c5fd`
Layers: margin `inset:0`, padding `inset:16px`, content `inset:20px`. Has `render`/`update`/`getRoot`.

**Not imported anywhere in `property-panel.ts` or `index.ts`.** It is a complete, unused component. Either Retune shows a box-model diagram (the README does not mention one explicitly, though "Spacing measurements" and the Spacing section suggest it) and this should be wired in, or it is leftover. **Verdict: DECIDE - wire-in or delete.** Color palette would need tokenizing if kept.

---

## 4. `state-toggle.ts` - 95 lines - ORPHANED + token-divergent

Renders H/F/A/V pill buttons (`hover/focus/active/visited`), 28x22, radius 5, fontSize 10, fontWeight 600. Active pill `background:#D97757; color:#fff`; inactive `background:#2a2a3e; color:#888`; container `border-bottom:1px solid #2a2a3e`.

**Problems:** (1) Not imported anywhere - the panel's own dead Trigger select (Section 2.5) overlaps its purpose. (2) Uses an **entirely different palette** (`#2a2a3e`, `#888`, `#D97757`) than the `cssVars` token system - this is from an older design pass. Retune's "Trigger Editing" is Hover/Focus/Active (no Visited). **Verdict: FRESH-REWRITE** - fold the real trigger-state behavior into the panel's Trigger row using tokens, delete this file.

---

## 5. `control-detector.ts` - 159 lines

Pure detection. Defines `BOX_CONTROLS`, `TYPOGRAPHY_CONTROLS`, `FLEX_CONTROLS`, `GRID_CONTROLS`, `IMAGE_CONTROLS`, `POSITION_CONTROLS` and `detectControls(el)` returns groups based on: always `box`; `typography` if `hasDirectText` (a 28-tag `TEXT_TAGS` set or a direct text node); `flex`/`grid` from `display`; `image` if `IMG/VIDEO/PICTURE`; `position` if positioned.

**Mismatch with how the panel actually renders:** `buildDesignTab` only consumes `groups.map(g => g.name)` to get the **set of names** (`hasTypo/hasFlex/hasGrid`) and the tag. The detailed `ControlDefinition[]` arrays (units, steps, options) are **almost entirely ignored** - the panel hardcodes its own controls/steps/options inline. So `control-detector` is half-vestigial: its group-detection is used, its control definitions are not. Also `IMAGE_CONTROLS` is defined but `getElementTag` only uses `image` to return the `'img'` tag string - **no image section is ever built** (no object-fit/object-position UI). Retune has a full Image control set.

**Verdict: RECONCILE.** Keep group detection; either make the panel consume `ControlDefinition` arrays (so detector is the single source of truth, closer to a data-driven Retune model) or strip the unused arrays. Add real Image/Video/SVG/background-image detection + sections.

---

## 6. `handles.ts` (210+ lines) and `scrub.ts` (78 lines)

### `scrub.ts` - **KEEP AS-IS (matches Retune).**
`attachScrub` math: `dx = clientX - startX; steps = round(dx/2); newValue = round((startValue + steps*effectiveStep)*1000)/1000`. Modifiers: **Shift = step*10, Alt = step*0.1.** This is exactly Retune's README spec: "Scrub-to-adjust - Click and drag on numeric values. Shift for 10x, Alt for 0.1x." Verbatim behavioral match. `parseNumericValue` regex accepts `px|rem|em|%|vw|vh|pt|ch|ex`. This module is correct and should be the canonical scrub for the port.

### `handles.ts` - **RECONCILE / verify against real Retune resize.**
On-canvas drag handles: 4 padding edges (color `rgba(34,197,94,0.30)`), 4 margin edges (`rgba(249,115,22,0.30)`, offset `MARGIN_OFFSET = 4+4`), 4 corner radius handles (`rgba(59,130,246,0.50)`, 8x8 circles). `HANDLE_WIDTH=4`, `CORNER_SIZE=8`. Drag math uses **`delta/2 * step`** for edges (note: edge step modifiers Shift=10/Alt=0.1 but the multiply is `(startValue + (delta/2)*step)` - a different shape than `scrub.ts` which does `steps*step`). Corner uses magnitude `sqrt(dx^2+dy^2)/2` with a per-corner `dirSign`.

Two concerns: (1) **`handles.ts` is not imported by `property-panel.ts` or `index.ts`** within the manipulate dir - need to confirm whether `Overlay`/another module attaches it; if nothing does, it is orphaned like box-model. (2) Its scrub math diverges from `scrub.ts` (`delta/2*step` vs `round(dx/2)*step`) - inconsistent feel. Retune README describes "Resize by dragging - Drag edges or corners to resize elements" which is **width/height resize**, whereas Justify's handles edit **padding/margin/radius**, not size. That is a semantic mismatch with Retune's resize feature. Verify intent, then reconcile (and unify the scrub math).

---

## 7. `icons.ts` - 777 lines - the verbatim asset layer

Header says: "SVG icons extracted verbatim from reference tool v0.7.6 ... All path data copied character-for-character from the reference source," mirroring "the reference tool's `I` component at line 7954." This is the strongest signal that Justify already extracted icons from the real Retune (v0.7.6) source. Icons use `viewBox 0 0 24 24` (most) or `0 0 16 16` (alignment grid + check + lock), `fill:none` svg, `fill:currentColor` paths with `fill-opacity 0.9` (primary) or `0.3` (secondary/ghost strokes).

Exact icon export names available (for verbatim re-extraction in the port):
`radiusTopLeft/TopRight/BottomLeft/BottomRight`; `alPaddingHorizontal/Vertical/Top/Bottom/Left/Right/Sides`; `alSpacingHorizontal/Vertical`; `layoutAlignLeft/Right/HorizontalCenter/Top/Bottom/VerticalCenter`; `textAlignLeft/Center/Right`; `textAlignTop/Middle/Bottom`; `rectangleSmall`; `autolayoutAddHorizontal/Vertical`; `gridView`; `chevronDown/Up`; `plus/minus`; `flipHorizontalSmall`; `adjustSmall`; `check`; `rotate`; `hexagonIcon`; `unlinkIcon`; `lockClosed/lockOpen`; `iconDot`; `iconPositionLeft/CenterH/Right/Top/CenterV/Bottom`; `iconSBBarH/HLeft/HCenter/HRight/V/VTop/VCenter/VBottom`; `listView`; `numberList`.

**Used by the panel:** radius (TL only), padding (H/V/Sides), spacing (H), layoutAlign (all 6), textAlign (L/C/R + T/M/B), rectangleSmall, autolayoutAdd (H/V), gridView, chevronDown, plus, lockClosed/Open, iconDot, iconPositionLeft/CenterH/Right.
**Exported-but-unused:** radius TR/BL/BR, alPaddingTop/Bottom/Left/Right, alSpacingVertical, chevronUp, minus, flipHorizontalSmall, adjustSmall, check, rotate, hexagonIcon, unlinkIcon, iconPositionTop/CenterV/Bottom, all `iconSBBar*`, listView, numberList.

**Verdict: KEEP.** This is the asset library and the only concrete tie to real Retune source. The unused exports are fine to retain (they map to Retune controls Justify hasn't built yet, e.g. stretch-bar icons for grid/stretch alignment, rotate/flip for transforms). When the port adds missing sections, the icons are already extracted.

---

## 8. The React/TSX vs vanilla-TS gap - architecture recommendation

### The situation
- **Retune** ships as React/TSX (README "Tech Stack: React, TypeScript ... `import { Retune } from 'retune'` - React overlay component"). The panel in real Retune is a React component tree with props/state, conditional rendering via JSX, and (per the README feature list) live re-render on selection change, manifest-driven dropdowns, scope pills, component-prop editors.
- **Justify** is committed to **imperative DOM in a single esbuild IIFE** for the *entire* overlay (toolbar, claudebar, queuebar, changes panel, prompt mode, overlay highlights), not just Manipulate. `property-panel.ts` already reimplements the whole Design panel imperatively, fairly faithfully, at 2841 lines.

### Options

**Option A - Bundle Preact and port Retune components near-verbatim.**
- Pros: if real Retune `.tsx` source becomes available, JSX ports to Preact with minimal edits; conditional rendering and prop-driven re-render come for free; selection-change re-render preserves state naturally (fixes the tab-reset and panel-recreate issues in Section 1).
- Cons: introduces a VDOM runtime (~4kb Preact) into an otherwise zero-framework IIFE; Manipulate becomes the only React-island in a codebase where toolbar/claudebar/changes-panel are all imperative - **stylistic and mental-model split-brain**; the rest of the overlay still needs the imperative knowledge anyway; esbuild config gains a JSX loader + `jsxImportSource`. Most importantly: **we do not have the Retune `.tsx` source** (only the README), so "port near-verbatim" has nothing to port from - the verbatim advantage is hypothetical right now.

**Option B - Hand-rewrite/keep as imperative DOM (current approach), reconcile gaps.**
- Pros: zero new dependencies; consistent with 100% of the rest of the overlay; the existing `property-panel.ts` is already this and is ~90% structurally complete; the dead-control and missing-section work is additive, not a rewrite; bundle stays a single small IIFE.
- Cons: imperative conditional rendering is verbose (the file is already 2841 lines and would grow with Video/SVG/scope/light-theme); re-render-on-select currently destroys/recreates the panel (state loss) and would need a manual diff/patch or explicit state-preservation layer; harder to keep in lockstep with Retune if Retune's `.tsx` later lands.

**Option C - Imperative core + a tiny declarative render helper (hyperscript, no VDOM).**
- A ~50-line `h(tag, props, ...children)` + a `patch`/`reconcile` for the panel's list of sections, keeping everything in the same build, no Preact. Bridges the verbosity problem without the framework.

### Recommendation: **Option B, with the targeted state-preservation fix from Section 1, and Option C as the verbosity escape hatch if section count grows.**

Reasoning:
1. The "port components near-verbatim" rationale for Preact **collapses because the Retune `.tsx` source is not on disk** - only the README is. There is nothing to port verbatim; we are reconstructing from a feature list and from the already-extracted icon set either way. Without the source, Preact buys us a framework but not a copy-paste shortcut.
2. Justify has already paid the imperative cost across the *entire* overlay. Adding a second paradigm for one panel creates a maintenance seam exactly where the most churn will happen (Manipulate is where Retune-parity work concentrates). One paradigm beats two.
3. `property-panel.ts` is already an imperative reconstruction at ~90% structural fidelity. The remaining work is **wiring dead controls + adding missing sections + tokenizing the few hardcoded colors + adding a light theme + fixing panel-recreate state loss** - all additive reconcile work, none of which is easier in Preact given there is no source to port.
4. If/when the real Retune `.tsx` source is obtained, re-evaluate: a verbatim port from actual source files is a genuinely different calculus and would justify Option A. **Revisit when:** Retune `packages/overlay/src` `.tsx` files are actually available locally.

### Per-module reconcile/rewrite summary

| Module | Verdict | Why |
|---|---|---|
| `index.ts` | Reconcile (light) | Plumbing sound; fix panel-recreate state loss + unify hover icons |
| `property-panel.ts` | Reconcile structure, rewrite dead controls | Chrome is excellent; ~8 controls are non-functional; missing Retune sections |
| `box-model.ts` | Decide (wire-in or delete) | Complete but orphaned; colors need tokenizing if kept |
| `state-toggle.ts` | Fresh-rewrite (fold into panel Trigger row, delete file) | Orphaned, off-palette, duplicates dead Trigger select |
| `control-detector.ts` | Reconcile | Group detection used, control defs ignored; add Image/Video/SVG/bg detection |
| `handles.ts` | Reconcile + verify | Edits padding/margin/radius not size; scrub math diverges from `scrub.ts`; confirm not orphaned |
| `scrub.ts` | Keep | Exact Retune behavioral match (Shift 10x / Alt 0.1x) |
| `icons.ts` | Keep | Verbatim-extracted from Retune v0.7.6; the canonical asset layer |
| `build.js` / `core/index.ts` | Keep imperative IIFE | Recommendation Option B; do not introduce Preact without real `.tsx` source |
