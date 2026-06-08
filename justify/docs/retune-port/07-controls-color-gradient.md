# 07 - Color + Gradient Controls (EXACT spec)

Source root: `retune/packages/overlay/src/`
Scope: color editing (`ColorInput`, `ColorPicker`, `color-utils`), gradient editing
(`GradientEditor`, `GradientStopBar`, `gradient-utils`), and the token/variable picker
surfaces (`TokenPicker`, plus the `FloatingDialog` shell that hosts the color picker).
Every value below is quoted verbatim from source. Shared theme tokens, the Shadow-DOM /
native-pointerdown conventions, and the 32px/8px/11px control geometry are defined in
`06-controls-core.md` section 0 - not repeated here.

> Cross-references: `ColorInput` reuses `ChangeIndicator` + `VariableAction` (see 06).
> `GradientEditor` embeds `ColorInput` per stop. `ColorPicker` renders inside
> `FloatingDialog`. The variables/tokens tab reuses the `.retune-variable-dialog-*`
> classes also used by 06's `VariableDialog`.

---

## 1. color-utils.ts (conversion + parse/serialize)

Pure functions, no UI. THE canonical color math; port verbatim.

### Types
```ts
HSVA { h: 0-360; s: 0-100; v: 0-100; a: 0-100 }
RGB  { r: 0-255; g: 0-255; b: 0-255 }
```

### RGB <-> Hex
- `hexToRgb(hex)`: strips `#`, expands 3-digit shorthand to 6, regex
  `/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i`; invalid -> `{0,0,0}`.
- `rgbToHex(r,g,b)`: each channel `clamp(0,255,round)`, `.toString(16)`, left-pad to 2.

### RGB <-> HSV
- `rgbToHsv(r,g,b)`: standard max/min/delta; returns `{h:0-360, s:0-100, v:0-100}`.
- `hsvToRgb(h,s,v)`: `s,v` divided by 100; `s===0` -> gray; sextant switch on
  `i=floor(h/60)`; returns rounded 0-255.
- `hsvToHex`, `hexToHsv`, `hexToHsva(hex, alpha=100)`, `hsvaToHex(hsva)` compose the above.

### parseCssColor(color) -> `{ hex, opacity }` (opacity 0-100)
```js
if (!color) return { hex:"#000000", opacity:100 };
// hex: expand 3->6, opacity 100
// rgba(r,g,b,a): /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/
//   -> hex from rgb, opacity = Math.round(alpha*100)   (INTEGER percent by design)
// rgb(r,g,b): opacity 100
// "transparent" -> { hex:"#000000", opacity:0 }
// fallback -> { hex:"#000000", opacity:100 }
```

### hexToRgba(hex, opacity) -> CSS string
```js
const { r, g, b } = hexToRgb(hex);
if (opacity >= 100) return hex;                              // solid stays as hex
return `rgba(${r}, ${g}, ${b}, ${(opacity/100).toFixed(2)})`; // 2-dp alpha
```
NOTE: opacity is always an integer percent in the UI; alpha is serialized to 2 dp.

---

## 2. ColorInput (`ui/color-input.tsx`)

Layout: `[ swatch | hex ] [ opacity % ]`. Clicking the swatch opens a floating
`ColorPicker`. Token-applied state collapses to a single bordered pill showing the
variable name.

### Props
`prop; value; onChange; variableMatch?; property?; onVariableSelect/Apply/Unlink?; isChanged?; onReset?`.

### State
Parses `value` via `parseCssColor`. Local state: `hexLocal` (uppercase, no `#`),
`opacityLocal` (string), `pickerOpen`, `initialTab` (`"custom"|"tokens"`), `anchorRect`.
`currentHexRef`/`currentOpacityRef` track the live color for building output.
Focus guards `hexFocusedRef`/`opacityFocusedRef` prevent prop-sync from clobbering an
in-progress edit. Parent sync (render-phase) updates refs always but only updates the
two input strings when their field is not focused.

### Emit
`emitColor(hex, opacity)` -> updates refs -> `onChange(prop, hexToRgba(hex, opacity))`.

### Swatch open
`handleSwatchClick`: toggles picker; opens to `"custom"` tab. `openPicker(tab)` computes
anchor: if inside a `.retune-row`, anchor width/left spans the WHOLE row (so the dialog
centers over the row), else the swatch rect. Uses `claimDialog/releaseDialog` singleton.
Token dot / token-applied click -> `openPicker("tokens")`.

### Hex commit (`commitHex`)
Strip `#`, trim; expand 3-digit -> 6; validate `/^[a-fA-F0-9]{6}$/`. Valid -> uppercase +
`emitColor("#"+cleaned, currentOpacity)`. Invalid -> revert to current hex.
While typing, input sanitises: `e.target.value.replace(/[^a-fA-F0-9]/g,"").slice(0,6)`.
Enter blurs (commit on blur). Focus selects all.

### Opacity commit (`commitOpacity`)
`val = clamp(0,100, round(Number||0))`, set + `emitColor`. Keyboard:
- `Enter` -> blur.
- `ArrowUp`/`ArrowDown` -> `preventDefault`; read CURRENT value off the input element
  (avoid stale state), `step = shiftKey ? 10 : 1`, `clamp(0,100, current+delta)`, emit.

### "None" detection + swatch rendering
`isNone = !value || value==="none" || value==="transparent" || (hex==="#000000" && opacity===0)`.
- None -> white swatch + diagonal red line SVG (`stroke="var(--retune-red-500)"`),
  hex input shows literal `"None"`.
- opacity >= 100 -> solid `backgroundColor: hex`.
- opacity < 100 -> SPLIT swatch: left half solid hex, right half `hexToRgba(hex,op)` over
  a checkerboard:
  ```js
  backgroundImage: `linear-gradient(to right, ${hex} 50%, ${transparentColor} 50%), ${checkerboard}`,
  backgroundSize: "100% 100%, 4px 4px, 4px 4px",
  backgroundPosition: "0 0, 0 0, 2px 2px",
  // checkerboard = two 45deg linear-gradients of #ccc
  ```
All swatch variants add `boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"`.

### Variable-applied branch
When `variableMatch`: section gets `retune-color-variable-applied`; swatch click opens
tokens tab; hex input is `readOnly` and shows `formatVarName(className)`
(`var(--x)` -> `x`); `VariableAction` gets `onRequestOpen={handleTokenDotOpen}`; the
opacity section is NOT rendered.

### Styling
```css
.retune-color-row { display:flex; gap:1px; flex:1; min-width:0; position:relative; }
.retune-color-hex-section { display:flex; align-items:center; flex:1; min-width:0; height:32px; position:relative; background:var(--retune-surface-hover); border-radius:8px 0 0 8px; }
.retune-color-swatch { width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer; }
.retune-color-swatch-inner { width:20px; height:20px; border-radius:2px; position:relative; overflow:hidden; }
.retune-color-hex-input { flex:1; min-width:0; height:32px; background:transparent; border:none; font-family:inherit; font-size:11px; font-weight:500; color:var(--retune-text); outline:none; padding:0; }
.retune-color-hex-section:focus-within { outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-color-hex-input::selection { background:var(--retune-blue-bg); color:var(--retune-text); }
.retune-color-opacity-section { display:flex; align-items:center; gap:2px; padding:0 8px 0 4px; height:32px; background:var(--retune-surface-hover); border-radius:0 8px 8px 0; flex-shrink:0; }
.retune-color-opacity-input { width:28px; height:32px; background:transparent; border:none; font-family:inherit; font-size:11px; font-weight:500; color:var(--retune-text); text-align:center; outline:none; padding:0; -moz-appearance:textfield; }
.retune-color-opacity-section:focus-within { outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-color-opacity-input::-webkit-outer-spin-button,
.retune-color-opacity-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.retune-color-opacity-unit { font-size:10px; font-weight:500; color:var(--retune-text-tertiary); }
/* variable-applied */
.retune-color-variable-applied { background:var(--retune-surface); outline:1px solid var(--retune-border); outline-offset:-1px; border-radius:8px; }
.retune-color-variable-applied:hover { outline-color:var(--retune-border-hover); }
.retune-color-variable-applied .retune-color-hex-input { cursor:pointer; }
```
NOTE the split-pill shape: hex section `8px 0 0 8px`, opacity section `0 8px 8px 0`,
joined by `gap:1px`. Hex/opacity inputs use **font-weight 500** (heavier than the 450 of
06's generic inputs).

---

## 3. ColorPicker (`ui/color-picker.tsx`)

Floating picker: SV (saturation/value) square, hue slider, alpha slider, hex+RGB inputs,
optional eyedropper, and (when tokens exist for the property) a Custom/Variables tab set.
Hosted by `FloatingDialog`.

### Props
`value: string (hex); alpha?=100; onChange(hex); onAlphaChange(alpha); onClose;
anchorRect; property?; currentVariable?; onVariableSelect/Apply/Unlink?; initialTab?`.

### State / sync
`hsva` from `hexToHsva(value)`. `lastSentRef` guards against echo (don't re-sync from a
value we just emitted). `hexInput` + `rgbInputs{r,g,b}` are local strings synced from
`hsva` when not focused (`focusedRef`). `emitChange(hsva)` sets state, computes hex,
stores in `lastSentRef`, calls `onChange`, and **auto-unlinks the variable** if one was
applied (`if (currentVariable) onVariableUnlink?.()`).

### SV picker (drag)
`getSV(x,y)`: `s = clamp(0,100, (x-left)/width*100)`, `v = clamp(0,100, (1-(y-top)/height)*100)`.
`handleSVPointerDown`: `preventDefault`, immediate set, then attaches `document`-level
`pointermove`/`pointerup` (NOT pointer capture); move updates `{...hsva, s, v}` directly;
up removes listeners. `dragCleanupRef` removes listeners on unmount. Handle position:
`left = hsva.s%`, `top = (100 - hsva.v)%`.

### Hue slider
`getHue(x) = clamp(0,360,(x-left)/width*360)`. Same document-drag pattern. Handle
`left = (h/360)*100%`.

### Alpha slider
`getAlpha(x) = clamp(0,100, round((x-left)/width*100))`. Local `localAlpha` mirrors prop
`alpha`; drag calls `onAlphaChange`. Handle `left = localAlpha%`; handle inner color is
`rgba(...localAlpha/100)` when <100 else current hex.

### Hex / RGB commit
- `commitHex`: same expand-3/validate-6 logic as ColorInput; valid ->
  `hexToHsva("#"+cleaned, hsva.a)` -> `emitChange`. Invalid -> revert.
- `commitRgb`: clamp each `0-255`, `rgbToHsv` -> `emitChange({h,s,v,a:hsva.a})`.
- Enter on any input -> blur + commit (`handleInputKeyDown(commitFn)`).

### Eyedropper
Shown only when `"EyeDropper" in window`. Uses the native `EyeDropper` API; on result
`onChange(sRGBHex)`, set hsva, auto-unlink variable. Wrapped in tooltip "Pick color from
screen". (Feature-detection is the allowed read pattern.)

### Tokens tab (only when `getVariablesForProperty(property)` is non-empty)
Renders `FloatingDialog` with `tabs=[{custom},{Variables}]` + a search box. Token list
behaviors:
- `filteredVariables` filters by className OR any value substring (lowercased).
- Search keyboard: ArrowDown/Up cycle `highlightedIndex` (wrap), Enter applies/selects the
  highlighted token then closes. Native pointerdown handler on the list resolves
  `data-token-index` -> apply (or select if `currentVariable`) -> close (React delegation
  fails in Shadow DOM portals).
- Grouping: `groupByRamp` keys by `manifestGroup` or parsed ramp group (`blue-500` ->
  `blue`); ramps (>=2 items, or any manifest group) get a header and sort by shade;
  standalone items sort alphabetically and render first (no header). A flat
  `orderedVariables` array (render order) backs click + keyboard indexing.
- Auto-scroll: highlighted item `scrollIntoView({block:"nearest"})`; on tab open, active
  item `scrollIntoView({block:"center"})` via rAF.
- Header unlink button (24x24 SVG) is disabled (opacity 0.3) when no variable linked;
  enabled -> `data-dialog-action="unlink"` -> unlink + close.
Without variables: `FloatingDialog title="Color"` with just the picker content.

### Styling (color-picker content)
```css
.retune-cp-sv-wrap { padding:12px 12px 0 12px; }
.retune-cp-sv { position:relative; width:100%; aspect-ratio:1; cursor:crosshair; touch-action:none; border-radius:8px; }
.retune-cp-sv-white { position:absolute; inset:0; background:linear-gradient(to right, #fff, transparent); border-radius:inherit; }
.retune-cp-sv-black { position:absolute; inset:0; background:linear-gradient(to bottom, transparent, #000); border-radius:inherit; }
.retune-cp-handle { position:absolute; pointer-events:none; transform:translate(-50%,-50%); will-change:transform; }
.retune-cp-handle-inner { width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 0.5px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.12); }
.retune-cp-sliders { display:flex; align-items:center; gap:8px; padding:10px 12px; }
.retune-cp-eyedropper { display:flex; align-items:center; justify-content:center; width:32px; height:32px; flex-shrink:0; background:transparent; border:none; border-radius:8px; color:var(--retune-text-tertiary); cursor:pointer; padding:0; transition:background 0.15s ease, color 0.15s ease; }
.retune-cp-eyedropper:hover { color:var(--retune-text); background:var(--retune-surface-active); }
.retune-cp-slider-tracks { display:flex; flex-direction:column; gap:8px; flex:1; min-width:0; }
.retune-cp-hue { position:relative; height:14px; border-radius:7px; background:linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000); cursor:pointer; touch-action:none; overflow:visible; box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.1); }
.retune-cp-alpha { position:relative; height:14px; border-radius:7px; cursor:pointer; touch-action:none; overflow:visible; box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.1); }
.retune-cp-alpha-checker { position:absolute; inset:0; background-image:repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%); background-size:8px 8px; border-radius:7px; }
.retune-cp-alpha-gradient { position:absolute; inset:0; border-radius:7px; }   /* inline bg = linear-gradient(to right, transparent, currentHex) */
.retune-cp-inputs { display:flex; gap:4px; padding:0 12px 10px; }
.retune-cp-input-group { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.retune-cp-input-group:first-child { flex:1.8; }   /* hex wider than R/G/B */
.retune-cp-label { font-size:9px; font-weight:500; color:var(--retune-text-tertiary); text-transform:uppercase; letter-spacing:-0.005em; padding-left:2px; }
.retune-cp-input { height:32px; border-radius:8px; background:var(--retune-surface-hover); border:none; font-family:inherit; font-size:11px; font-weight:500; color:var(--retune-text); padding:0 6px; outline:none; width:100%; min-width:0; }
.retune-cp-input:focus { outline:none; box-shadow:0 0 0 1.5px rgba(59,130,246,0.5); }
```
SV square is `aspect-ratio:1` (full panel width). Handle inner is a 14px white-ringed dot.
Hue track is the canonical 6-stop rainbow; alpha track = checker + transparent->hex overlay.

---

## 4. FloatingDialog (`ui/floating-dialog.tsx`) - picker/dialog shell

Shared shell for ColorPicker and the variable dialog: anchored fixed positioning with
collision flip, header (title OR tabs + close), optional search, scrollable body, scroll
lock, Escape/outside-click close. Native pointerdown for close + `data-dialog-action`
buttons (Shadow-DOM safe).

### Props (discriminated union)
Base: `onClose; anchorRect; search?{value,onChange,placeholder?,onKeyDown?}; children;
headerActions?; onHeaderAction?; maxHeight?=400; minHeight?=400; className?`.
Either `{ title }` OR `{ tabs[], activeTab, onTabChange? }`.

### Behavior
- `useScrollLock(true)` for lifetime.
- Auto-focus search input on mount (setTimeout 0).
- Close: outside `pointerdown` (composedPath) + `Escape` (capture, on both shadow root and
  document). Listener attached after a 0ms timeout to avoid catching the opening click.
- Native button handler: `[data-dialog-close]` -> close; `[data-dialog-action]` ->
  `onHeaderAction(action)`.

### Positioning (collision)
Finds the host panel `[data-retune-host]` -> shadowRoot `.retune-panel`; centers within it:
`panelWidth = parentRect.width - 24`, `left = parentRect.left + (parentRect.width - panelWidth)/2`
(fallback: clamp near anchor). `gap=4`. Computes `spaceBelow`/`spaceAbove`; `flipUp` when
below is too small and above is larger. `maxHeight = min(maxHeightProp, available)`,
`minHeight` clamped to it. Position is `fixed` with either `top` (anchor bottom + gap) or
`bottom` (when flipped).

### Header
Single tab renders as plain bold text (`-tab-single`, no hover). Multi-tab renders
selectable buttons. Close button is a 24x24 X SVG.

### Styling
```css
.retune-floating-dialog { font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background:var(--retune-surface); border-radius:12px; box-shadow:0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08); overflow:hidden; display:flex; flex-direction:column; z-index:2147483647; pointer-events:auto; animation:retune-dialog-enter 150ms cubic-bezier(0.23,1,0.32,1); }
@keyframes retune-dialog-enter { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
.retune-floating-dialog-header { display:flex; align-items:center; justify-content:space-between; padding:8px 8px 0 12px; }
.retune-floating-dialog-title-area { display:flex; align-items:center; gap:4px; flex:1; min-width:0; }
.retune-floating-dialog-title { font-size:12px; font-weight:500; color:var(--retune-text); }
.retune-floating-dialog-tab { height:24px; padding:0 8px; border-radius:5px; font-size:11px; line-height:16px; letter-spacing:0.055px; white-space:nowrap; border:none; background:none; cursor:pointer; transition:color 0.15s, background-color 0.15s; font-weight:450; color:var(--retune-text-secondary); font-family:inherit; }
.retune-floating-dialog-tab:hover { background:var(--retune-input-bg); }
.retune-floating-dialog-tab-active { background:var(--retune-surface-hover); font-weight:550; color:var(--retune-text); }
.retune-floating-dialog-tab-single { font-weight:550; color:var(--retune-text); cursor:inherit; }
.retune-floating-dialog-close { width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--retune-text-tertiary); cursor:pointer; border-radius:8px; padding:0; flex-shrink:0; transition:background 0.15s ease, color 0.15s ease; }
.retune-floating-dialog-close:hover { color:var(--retune-text); background:var(--retune-surface-active); }
.retune-floating-dialog-search { padding:8px; }
.retune-floating-dialog-search-input { width:100%; height:32px; background:var(--retune-surface-hover); border:none; border-radius:8px; padding:0 10px; font-size:12px; font-family:inherit; color:var(--retune-text); outline:none; box-sizing:border-box; }
.retune-floating-dialog-search-input:focus { box-shadow:0 0 0 2px rgba(59,130,246,0.15); }
.retune-floating-dialog-body { flex:1; min-height:0; display:flex; flex-direction:column; }
```
Dark mode overrides exist at `:host(.dark) .retune-floating-dialog` (lines 576/585) -
mainly background/shadow swaps.

### Variables-tab list classes (shared with 06's VariableDialog)
```css
.retune-variable-dialog-list { flex:1 1 0; overflow-y:auto; padding:2px 0 4px; scrollbar-width:none; border-top:1px solid var(--retune-border); }
.retune-variable-dialog-item { display:flex; align-items:center; gap:6px; padding:8px 16px; cursor:pointer; transition:background-color 0.08s ease; min-height:32px; box-sizing:border-box; }
.retune-variable-dialog-item:hover,
.retune-variable-dialog-item-active { background:var(--retune-surface-hover); }
.retune-variable-dialog-item-highlighted { background:var(--retune-input-bg); }
.retune-variable-dialog-swatch { width:14px; height:14px; border-radius:3px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.1); }
.retune-variable-dialog-name { font-size:11px; font-weight:450; color:var(--retune-text); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.retune-variable-dialog-value { font-size:11px; color:var(--retune-text-tertiary); flex-shrink:0; }
.retune-variable-dialog-group-title { font-size:11px; font-weight:450; line-height:16px; letter-spacing:-0.005em; color:var(--retune-text-secondary); padding:8px 16px 8px; text-transform:capitalize; }
.retune-variable-dialog-empty { padding:16px 12px; font-size:12px; color:var(--retune-text-tertiary); text-align:center; }
```

---

## 5. gradient-utils.ts (types, parse, serialize, interpolate)

### Types
```ts
GradientStop { color: string /*hex*/; position: number /*0-1*/; opacity?: number /*0-100, default 100*/ }
GradientFill { type: "linear"|"radial"|"conic"; stops: GradientStop[]; angle: number /*deg*/ }
FillMode = "solid"|"linear"|"radial"|"conic"
```

### `defaultGradient()`
`linear`, `angle:180`, two stops white@0 / black@1, both opacity 100.

### `gradientToCss(gradient)` (the OUTPUT format)
`< 2 stops` -> `"none"`. Sort by position. Each stop:
`alpha=(opacity??100)/100; color = alpha<1 ? hexToRgba(hex, round(alpha*100)) : hex; "${color} ${round(position*100)}%"`.
Joined `, `. Wrap:
- linear -> `linear-gradient(${angle}deg, ${stops})`
- radial -> `radial-gradient(circle, ${stops})`
- conic  -> `conic-gradient(from ${angle}deg, ${stops})`

### `gradientBarCss(stops)`
Same stop serialization but ALWAYS `linear-gradient(to right, ...)` for the preview bar
(direction-independent).

### `parseCssGradient(css)` -> GradientFill | null
Matches `^linear-gradient\((.+)\)$` / radial / conic.
- linear: angle from `^(\d+(?:\.\d+)?)deg\s*,\s*(.+)$`, else `to <dir>` via
  `directionToAngle`, else stops only (default angle 180).
- radial: strips `circle`/`ellipse [...]` shape prefix.
- conic: angle from `from <n>deg`.
`parseStopsString`: split on top-level commas (`splitGradientStops` tracks paren depth so
`rgb(...)` is not split). Each part matched `^(.+?)\s+(\d+(?:\.\d+)?)%$` -> color+position,
else color with auto-distributed position `i/(n-1)`. Color via `parseCssColor`.
Returns null if `< 2` stops.

### `directionToAngle(dir)`
`top:0, top right:45, right:90, bottom right:135, bottom:180, bottom left:225, left:270, top left:315` (default 180).

### `interpolateColor(stops, position)` -> hex
Sort; find bracketing pair; linear-interpolate each RGB channel by `t`; `rgbToHex`.
Used for "add stop" default colors.

### `detectFillMode(bgColor, bgImage)`
If `bgImage` parses as a gradient -> its type; else `"solid"`.

---

## 6. GradientEditor (`ui/gradient-editor.tsx`)

Inline gradient editor (no dialog). Composes: `GradientStopBar`, an angle input,
reverse/rotate buttons, a "Stops" header with add button, and one row per stop
(position % + embedded `ColorInput` + remove).

### Props
`gradient: GradientFill; onChange(gradient); originalGradient?; isNewGradient?`.

### Local state
`selectedStop` (index), `angleInput` (string like `"180deg-glyph"`, i.e. the number plus
the degree symbol), `isEditingAngle`, `stopVariables: Map<index, VariableMatch>` (per-stop
token associations, NOT persisted).

### Per-stop change tracking
`isStopColorChanged(i)` / `isStopPositionChanged(i)`: false when `isNewGradient` or no
`originalGradient`; new stop -> changed; else compare `color`/`opacity` or `position`.
`resetStopColor(i)`: if original had no such stop, remove it; else restore color+opacity.
`resetStopPosition(i)`: restore position.

### Angle
Display is the number followed by the degree symbol. `handleAngleInputChange`: strip the
degree symbol, parse int, normalize `((val%360)+360)%360`, live `onChange`.
`handleAngleBlur`: re-normalize, reset display. Keyboard on the angle input: Enter blurs;
ArrowUp/Down `step = shiftKey ? 15 : 1`, normalized. When `type === "radial"`, the angle
input shows an en-dash placeholder and is `readOnly`/`disabled`
(`showAngle = type !== "radial"`).

### Reverse / rotate
- `handleReverse`: `position -> 1 - position` for each, then `.reverse()` the array.
- `handleRotate`: `angle = (angle + 45) % 360`. Disabled when `!showAngle`.

### Stops
- `handleAddStop` (header +): color = `interpolateColor(stops, 0.5)`, push `{color, position:0.5, opacity:100}`, select it.
- `handleBarAddStop` (from bar click): push `{color, position, opacity:100}`, select.
- `handleRemoveStop`: no-op if `<= 2` stops; filter; fix `selectedStop`.
- `handleStopPositionInput`: parse int, `clamp(0,100)`, store `position = clamped/100`.
- `handleStopColorChange`: `parseCssColor(cssValue)` -> set `{color:hex, opacity}`.
- Per-stop `ColorInput` is wired with `property="backgroundColor"`, `variableMatch` from
  `stopVariables`, and apply/select/unlink handlers that update the local map; manually
  changing the color clears that stop's variable.
- Stops are rendered in position-sorted order but keep original indices
  (`sortedStops = stops.map((stop,index)=>({stop,index})).sort(byPosition)`).
- Position input uses `defaultValue` + a `key` of `${index}-${round(pos*100)}` to force
  remount on external change (uncontrolled), commit on blur / Enter.

### Styling
```css
.retune-gradient-editor { display:flex; flex-direction:column; gap:8px; }
.retune-gradient-editor > * { padding:0px 8px 0px 16px; }   /* row inset; the bar overrides */
.retune-gradient-controls { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.retune-gradient-angle-input { width:64px; height:32px; border-radius:8px; background:var(--retune-surface-hover); border:none; font-family:inherit; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); padding:0 8px; text-align:left; }
.retune-gradient-angle-input:focus { outline:none; box-shadow:0 0 0 1.5px rgba(59,130,246,0.5); }
.retune-gradient-actions { display:flex; align-items:center; gap:4px; }
.retune-gradient-action-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border:none; background:transparent; border-radius:8px; color:var(--retune-text-secondary); cursor:pointer; transition:background-color 0.08s ease, color 0.08s ease; }
.retune-gradient-action-btn:hover { background:var(--retune-surface-hover); color:var(--retune-text); }
.retune-gradient-action-btn:disabled { opacity:0.3; cursor:not-allowed; }
.retune-gradient-stops-header { display:flex; align-items:center; justify-content:space-between; }
.retune-gradient-stops-label { font-size:11px; font-weight:550; letter-spacing:-0.005em; color:var(--retune-text); }
.retune-gradient-stops-list { display:flex; flex-direction:column; gap:8px; }
.retune-gradient-stop-row { display:flex; align-items:flex-start; gap:8px; padding:0; }
.retune-gradient-stop-pos { position:relative; display:flex; align-items:center; width:48px; flex-shrink:0; }
.retune-gradient-stop-pos-input { width:100%; height:32px; border-radius:8px; background:var(--retune-surface-hover); border:none; font-family:inherit; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); padding:0 18px 0 6px; text-align:left; }
.retune-gradient-stop-pos-input:focus { outline:none; box-shadow:0 0 0 1.5px rgba(59,130,246,0.5); }
.retune-gradient-stop-pos-unit { position:absolute; right:6px; font-size:11px; color:var(--retune-text-tertiary); pointer-events:none; }
.retune-gradient-stop-color { flex:1; min-width:0; }
```
Icons used: `FlipHorizontalSmall` (reverse), `Rotate`, `Plus` (add stop), `Minus` (remove).

---

## 7. GradientStopBar (`ui/gradient-stop-bar.tsx`)

Interactive gradient bar with draggable stop chits above it; click empty bar to add a stop.

### Props
`stops; selectedIndex; onSelectStop; onStopPositionChange; onAddStop; gradientCss`.

### Geometry / interaction
`getPosition(x) = clamp(0,1,(x-left)/width)`. `findClosestStop(x)`: nearest stop by
position; returns its index only if within ~20px (`pxDist < 20`), else null.
- `handlePointerDown`: if a stop is within grab range -> `stopPropagation`+`preventDefault`,
  select it, attach document `pointermove`/`pointerup`; move calls
  `onStopPositionChange(index, getPosition)`. (No pointer capture.)
- `handleBarClick`: if not dragging AND not near a stop -> `onAddStop(position, interpolateColor(stops, position))`.
The wrapper owns both handlers; the stop handles are visual only (`pointerEvents:"none"`).

### Stop chit rendering
Each stop: `left = position*100%`. Chit background is `#0d99ff` when selected else `white`
(hard-coded), with an inner `chit-color` swatch of `stop.color`. (The caret element exists
but is `display:none`.)

### Styling
```css
.retune-gradient-bar-wrap { position:relative; height:32px; cursor:crosshair; margin:0px 48px 0px 16px; padding:0 !important; }
.retune-gradient-bar { position:absolute; bottom:0; left:0; right:0; height:32px; border-radius:8px; overflow:hidden; border:1px solid var(--retune-border); }
.retune-gradient-bar-checker { position:absolute; inset:0; background-image:linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%), linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%); background-size:6px 6px; background-position:0 0, 3px 3px; }
.retune-gradient-bar-fill { position:absolute; inset:0; }   /* inline backgroundImage = gradientBarCss */
.retune-gradient-stop-handle { position:absolute; top:0px; transform:translateX(-50%); cursor:grab; touch-action:none; }
.retune-gradient-stop-handle:active { cursor:grabbing; }
.retune-gradient-stop-indicator { display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 0 0.5px rgba(0,0,0,0.18)) drop-shadow(0 2px 6px rgba(0,0,0,0.12)); }
.retune-gradient-stop-chit { display:flex; align-items:center; justify-content:center; width:20px; height:32px; border-radius:5px; }
.retune-gradient-stop-chit-color { width:12px; height:24px; border-radius:2px; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.1); }
.retune-gradient-stop-caret { display:none; }
```

---

## 8. TokenPicker (`ui/token-picker.tsx`) - WARNING: orphaned styling

A standalone floating panel for swapping a token to an alternative in the same category.
Logic is complete and Shadow-DOM-safe, BUT:

> **The `retune-token-picker*` class names have NO definitions in `overlay.css`
> (grep count = 0).** This component is effectively unstyled/orphaned in the current
> build - the actual color-token swapping in the shipping flow happens through the
> ColorPicker's Variables tab (section 3) and the `VariableDialog` (06), which use
> `.retune-variable-dialog-*` / `.retune-variable-picker` classes. Treat TokenPicker as
> legacy reference, not a control to port, unless Justify needs a freestanding swap panel.

### Behavior (for reference)
Props: `match: VariableMatch; onSelect(newToken); onClose; anchorRect`.
`getAlternativeVariables(match.property, match.variable)` lists swaps;
`getCategoryForProperty` gives the category label. Outside-pointerdown (after 0ms) +
Escape close (capture). Native pointerdown on the list resolves `data-token-index`.
Positioning: `panelWidth=200`, `itemHeight=30`, `maxItems=8`,
`panelHeight = min(count, 8)*30 + 16`; flips up when `spaceBelow < panelHeight`;
`left = max(4, anchorRect.left + width - 200)`. Color swatch shown only when
`category === "colors"`. Items show `.{className}` + a truncated (20-char) first value.

### The `.retune-variable-picker` dark panel (this IS styled - used elsewhere)
For completeness, the dark variable-swap panel that DOES have CSS (used by the
`variable-dialog`/picker flow):
```css
.retune-variable-picker { font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background:#1c1917; border-radius:10px; box-shadow:0 0 0.5px rgba(0,0,0,0.12), 0 10px 16px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.15); overflow:hidden; z-index:2147483647; pointer-events:auto; animation:retune-variable-picker-enter 150ms ease-out; }
@keyframes retune-variable-picker-enter { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
.retune-variable-picker-header { padding:8px 10px 4px; border-bottom:1px solid rgba(255,255,255,0.06); }
.retune-variable-picker-title { font-size:10px; font-weight:600; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px; }
.retune-variable-picker-list { max-height:240px; overflow-y:auto; padding:4px 0; scrollbar-width:none; }
.retune-variable-picker-item { display:flex; align-items:center; gap:6px; padding:5px 10px; cursor:pointer; transition:background-color 0.08s ease; min-height:30px; box-sizing:border-box; }
.retune-variable-picker-item:hover { background:rgba(255,255,255,0.08); }
.retune-variable-picker-item-active { background:rgba(59,130,246,0.15); cursor:default; }
.retune-variable-picker-swatch { width:14px; height:14px; border-radius:3px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(255,255,255,0.15); }
.retune-variable-picker-name { font-size:11px; font-weight:500; color:#fff; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.retune-variable-picker-value { font-size:10px; color:rgba(255,255,255,0.4); flex-shrink:0; }
```

---

## Open questions / port notes
1. **Hard-coded selected-blue**: GradientStopBar selected chit `#0d99ff` (lowercase) and
   None-swatch red line `var(--retune-red-500)`; ColorInput swatch checkerboard `#ccc`;
   alpha/SV checker `#e0e0e0/#fff`. Decide tokenise vs verbatim (same question as 06).
2. **Focus ring inconsistency**: color-picker + gradient inputs use a blue glow
   `box-shadow: 0 0 0 1.5px rgba(59,130,246,0.5)`, while 06's generic inputs use a 1px
   border-token outline. The search input uses `rgba(59,130,246,0.15)` at 2px. Confirm
   which focus treatment Justify standardises on.
3. **opacity is integer-percent everywhere** (parse rounds `alpha*100`, UI clamps to
   0-100 ints). Sub-percent alpha from external CSS is lossily rounded on first parse.
4. **TokenPicker is unstyled** (see section 8) - do not port unless a freestanding swap
   panel is needed; the ColorPicker Variables tab is the live path.
5. **Drag model differs from 06**: color picker SV/hue/alpha + gradient stop bar attach
   `document`-level `pointermove`/`pointerup` listeners (with `dragCleanupRef` for unmount)
   rather than `setPointerCapture`. Keep this pattern if porting the pickers as-is.
6. **`emitChange` auto-unlinks variables** when the user manually edits color in the
   picker (and the eyedropper does too). Per-gradient-stop `ColorInput` clears its stop's
   variable on manual change. Mirror this "manual edit detaches token" behavior.
7. Radial gradients hide the angle control (`showAngle = type !== "radial"`); conic keeps
   it (`from <angle>deg`). The fill-mode to type switch lives in the Fill section (05),
   not here.
</content>
