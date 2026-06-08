# Retune Design Panel - Area 07: Color, Gradient, and Token Controls

Reference extraction for 1:1 reproduction of Retune's color/gradient editing UI and token picker.

Source files (all under `packages/overlay/src/`):
- `ui/color-input.tsx` - swatch + hex + opacity row, opens the picker
- `ui/color-picker.tsx` - floating SV/hue/alpha picker + tabbed token list
- `ui/color-utils.ts` - HSV/RGB/hex math, CSS color parse/build
- `ui/gradient-editor.tsx` - inline gradient editor (bar + angle + stops list)
- `ui/gradient-stop-bar.tsx` - draggable gradient stop bar
- `ui/gradient-utils.ts` - gradient types, CSS gen/parse, interpolation
- `ui/token-picker.tsx` - standalone floating token-swap panel (dark)
- Shared shell: `ui/floating-dialog.tsx`
- Icons: `ui/icons.tsx`
- Change dot: `ui/change-indicator.tsx`
- Variable hover icon: `ui/variable-action.tsx`
- Singleton dialog manager: `ui/dialog-singleton.ts`
- All CSS: `overlay/overlay.css`

The whole overlay renders inside a Shadow DOM under a host element with `data-retune-host`; the shadow container has `[data-retune-container]`. The host `:host` carries all CSS variables. Dark mode = `:host(.dark)`.

---

## 0. Host-level base + theme tokens (overlay.css :host, lines 1-151)

```css
:host {
  all: initial;
  font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;
  font-size: 13px;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  line-height: 1.4;
  interpolate-size: allow-keywords;
  user-select: none; -webkit-user-select: none;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
input, textarea, [contenteditable] { user-select: text; -webkit-user-select: text; }
```

### Primitive palette (raw, never change)
- `--retune-black: #1c1917`; opacity ramp `--retune-black-5 .. -95` = `color-mix(in srgb, var(--retune-black) N%, transparent)` in 5% steps.
- `--retune-white: #ffffff`; ramp `--retune-white-5 .. -95` identical pattern.
- Blue (Figma blue): `--retune-blue-100 #F2F9FF`, `-200 #E5F4FF`, `-300 #BDE3FF`, `-400 #80CAFF`, `-500 #0D99FF`, `-600 #007BE5`, `-700 #0768CF`, `-800 #034AC1`, `-900 #093077`, `-1000 #0D193F`.
- Red (Tailwind-ish): `--retune-red-100 #FFF5F5`, `-200 #FFE2E0`, `-300 #FFC7C2`, `-400 #FFAFA3`, `-500 #F24822`, `-600 #DC3412`, `-700 #BD2915`, `-800 #9F1F18`, `-900 #771208`, `-1000 #660E0B`.

### Semantic tokens (LIGHT, resolved)
| Token | Value | Resolves to |
|---|---|---|
| `--retune-always-white` | `#ffffff` | |
| `--retune-always-black` | `#1c1917` | |
| `--retune-text` | `var(--retune-black-90)` | `color-mix(#1c1917 90%, transparent)` |
| `--retune-text-secondary` | `var(--retune-black-70)` | |
| `--retune-text-tertiary` | `var(--retune-black-50)` | |
| `--retune-text-disabled` | `var(--retune-black-25)` | |
| `--retune-surface` | `var(--retune-white)` | `#ffffff` |
| `--retune-surface-hover` | `var(--retune-black-5)` | |
| `--retune-surface-active` | `var(--retune-black-5)` | |
| `--retune-input-bg` | `var(--retune-black-5)` | |
| `--retune-input-bg-hover` | `var(--retune-black-10)` | |
| `--retune-border` | `var(--retune-black-10)` | |
| `--retune-border-hover` | `var(--retune-black-15)` | |
| `--retune-border-subtle` | `var(--retune-black-5)` | |
| `--retune-shadow` | `var(--retune-black-10)` | |
| `--retune-blue` | `var(--retune-blue-500)` | `#0D99FF` |
| `--retune-blue-text` | `var(--retune-blue-700)` | `#0768CF` |
| `--retune-blue-bg` | `var(--retune-blue-200)` | `#E5F4FF` |
| `--retune-blue-bg-hover` | `var(--retune-blue-100)` | `#F2F9FF` |
| `--retune-red` | `var(--retune-red-500)` | `#F24822` |

### Semantic tokens (DARK overrides, `:host(.dark)`)
- `--retune-text: var(--retune-white-90)`, `-secondary: white-70`, `-tertiary: white-50`, `-disabled: white-25`.
- `--retune-surface: color-mix(in srgb, var(--retune-black) 95%, var(--retune-white))`.
- `--retune-surface-hover/-active: var(--retune-white-5)`; `--retune-input-bg: white-5`; `--retune-input-bg-hover: white-10`.
- `--retune-border: white-10`, `-hover: white-15`, `-subtle: white-5`, `--retune-shadow: white-5`.
- `--retune-blue-text: var(--retune-blue-500)`; `--retune-blue-bg: color-mix(in srgb, var(--retune-blue-700) 50%, transparent)`; `--retune-blue-bg-hover: color-mix(in srgb, var(--retune-blue-700) 75%, transparent)`.

NOTE: hardcoded literals used in these controls that are NOT tokens: `#0d99ff` (gradient selected-stop chit/caret), `#3b82f6` / `rgba(59,130,246,*)` (input focus rings, dialog active dot), `#1c1917` (token-picker bg), checkerboard `#ccc` / `#e0e0e0` / `#fff`. These are literal in the source and must be reproduced verbatim.

---

## 1. ColorInput (`color-input.tsx`)

### Purpose / props
```ts
interface ColorInputProps {
  prop: string;
  value: string | undefined;          // any CSS color string
  onChange: (prop: string, value: string) => void;
  variableMatch?: VariableMatch;       // when a token is applied
  property?: string;                   // CSS property for token lookup
  onVariableSelect?, onVariableApply?, onVariableUnlink?;
  isChanged?: boolean;
  onReset?: () => void;
}
```

### DOM structure
```
div.retune-color-row
  <ChangeIndicator>                         (renders span.retune-change-dot only if isChanged)
  div.retune-color-hex-section[ .retune-color-variable-applied if variableMatch ]
    div.retune-color-swatch          (ref=swatchRef, onClick = token-open OR swatch-open)
      div.retune-color-swatch-inner  (style = computed swatchStyle)
        svg (only when isNone: diagonal slash, see below)
    input.retune-color-hex-input
    <VariableAction>                 (absolute right hover icon)
  div.retune-color-opacity-section   (ONLY when !variableMatch)
    input.retune-color-opacity-input
    span.retune-color-opacity-unit  "%"
  <ColorPicker>                       (only when pickerOpen && anchorRect)
```

### Value parsing / output
- On render, `parseCssColor(value || "")` -> `{ hex, opacity }`. `hexLocal` state = hex sans `#`, uppercased. `opacityLocal` = String(opacity).
- Emitting a color: `onChange(prop, hexToRgba(hex, opacity))`. `hexToRgba` returns the bare hex when opacity >= 100, else `rgba(r, g, b, (op/100).toFixed(2))`.
- Parent-value sync guarded so it won't clobber a focused hex/opacity input (`hexFocusedRef`, `opacityFocusedRef`).

### "None" / transparent detection
```
isNone = !value || value === "none" || value === "transparent"
         || (currentHex === "#000000" && currentOpacity === 0)
```
- When `isNone`: swatch-inner is `backgroundColor:#fff; boxShadow: inset 0 0 0 1px rgba(0,0,0,0.1)` and an SVG diagonal slash is overlaid:
  ```jsx
  <svg width="100%" height="100%" viewBox="0 0 16 16" style={{position:"absolute",top:0,left:0}}>
    <line x1="3" y1="13" x2="13" y2="3" stroke="var(--retune-red-500)" strokeWidth="1" strokeLinecap="round" />
  </svg>
  ```
  Hex input displays the literal string `None`.

### Swatch fill math (swatchStyle)
- Opacity >= 100: `{ backgroundColor: hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" }`.
- Opacity < 100 (split view, solid left half | transparent-over-checkerboard right half):
  ```js
  checkerboard = "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)"
  transparentColor = hexToRgba(hex, op)   // rgba(...)
  backgroundImage: `linear-gradient(to right, ${hex} 50%, ${transparentColor} 50%), ${checkerboard}`
  backgroundSize:  "100% 100%, 4px 4px, 4px 4px"
  backgroundPosition: "0 0, 0 0, 2px 2px"
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"
  ```

### Hex input behavior
- `value` = `None` if isNone, else token name (when variableMatch) via `formatVarName` (`var(--x)` -> `x`), else `hexLocal`.
- When variableMatch: `readOnly`, clicking opens picker to tokens tab. No onChange.
- When editable: onChange strips to `[a-fA-F0-9]` and slices to 6 chars. onFocus selects all + sets focused flag. onBlur = `commitHex`. Enter blurs.
- `commitHex`: strip leading `#`, trim; if length 3 expand to 6 (`abc` becomes `aabbcc`); if matches `/^[0-9a-fA-F]{6}$/` uppercase + emit `#cleaned`; else revert to current hex.

### Opacity input behavior (hidden entirely when variableMatch)
- `inputMode="numeric"`. onChange = raw string. onFocus selects + flag. onBlur = `commitOpacity`.
- `commitOpacity`: `Math.max(0, Math.min(100, Math.round(Number(val)||0)))`, then emit.
- onKeyDown: Enter blurs; ArrowUp/ArrowDown `preventDefault`, step = shift ? 10 : 1, clamp 0..100, emit immediately (reads `e.currentTarget.value` directly to avoid stale state).

### Open-picker logic (`openPicker`)
- Reads swatch `getBoundingClientRect()`. If swatch is inside a `.retune-row` ancestor, anchorRect = `{ top: rect.top, left: rowRect.left, width: rowRect.width, height: rect.height }` (full row width); else uses the swatch rect.
- Sets initialTab (`"custom"` from swatch click, `"tokens"` from token-dot/hex click when variable applied), then `claimDialog(stableClose)`.
- Clicking swatch again toggles closed via `releaseDialog`.

### CSS (overlay.css 1372-1471)
```css
.retune-color-row { display:flex; gap:1px; flex:1; min-width:0; position:relative; }
.retune-color-hex-section {
  display:flex; align-items:center; flex:1; min-width:0; height:32px; position:relative;
  background: var(--retune-surface-hover); border-radius: 8px 0 0 8px;
}
.retune-color-swatch { width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer; }
.retune-color-swatch-inner { width:20px; height:20px; border-radius:2px; position:relative; overflow:hidden; }
.retune-color-hex-input {
  flex:1; min-width:0; height:32px; background:transparent; border:none; font-family:inherit;
  font-size:11px; font-weight:500; color: var(--retune-text); outline:none; padding:0;
}
.retune-color-hex-section:focus-within { outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-color-hex-input::selection { background: var(--retune-blue-bg); color: var(--retune-text); }
.retune-color-opacity-section {
  display:flex; align-items:center; gap:2px; padding:0 8px 0 4px; height:32px;
  background: var(--retune-surface-hover); border-radius:0 8px 8px 0; flex-shrink:0;
}
.retune-color-opacity-input {
  width:28px; height:32px; background:transparent; border:none; font-family:inherit;
  font-size:11px; font-weight:500; color: var(--retune-text); text-align:center; outline:none;
  padding:0; -moz-appearance:textfield;
}
.retune-color-opacity-section:focus-within { outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-color-opacity-input::-webkit-outer-spin-button,
.retune-color-opacity-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.retune-color-opacity-unit { font-size:10px; font-weight:500; color: var(--retune-text-tertiary); }
```

### Variable-applied state CSS (overlay.css 2740-2752)
```css
.retune-color-variable-applied {
  background: var(--retune-surface);
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
  border-radius: 8px;   /* opacity section hidden -> hex section is full width, full rounding */
}
.retune-color-variable-applied:hover { outline-color: var(--retune-border-hover); }
.retune-color-variable-applied .retune-color-hex-input { cursor: pointer; }
```

---

## 2. ColorPicker (`color-picker.tsx`)

Rendered as the body of a `FloatingDialog`. Two modes:
- No variables for property (`hasVariables` false): `<FloatingDialog title="Color">` with just the picker content.
- Variables exist: tabbed dialog `Custom` | `Variables` (the second label is always the constant string `categoryLabel = "Variables"`). `minHeight = activeTab === "custom" ? undefined : 400`.

### Props
```ts
interface ColorPickerProps {
  value: string;            // hex
  alpha?: number;           // 0-100, default 100
  onChange: (hex: string) => void;
  onAlphaChange?: (alpha: number) => void;
  onClose: () => void;
  anchorRect: { top; left; width; height };
  property?, currentVariable?, onVariableSelect?, onVariableApply?, onVariableUnlink?;
  initialTab?: "custom" | "tokens";
}
```

### Picker content DOM (`pickerContent`)
```
<>
  div.retune-cp-sv-wrap
    div.retune-cp-sv  (ref=svRef, style backgroundColor: hsl(h,100%,50%), onPointerDown)
      div.retune-cp-sv-white
      div.retune-cp-sv-black
      div.retune-cp-handle  (style left: s%, top: (100-v)%)
        div.retune-cp-handle-inner (style backgroundColor: currentHex)
  div.retune-cp-sliders
    [if EyeDropper supported] button.retune-cp-eyedropper (eyedropper icon, Tooltip "Pick color from screen")
    div.retune-cp-slider-tracks
      div.retune-cp-hue (ref=hueRef, onPointerDown)
        div.retune-cp-handle (left: (h/360)*100%, top:50%)
          div.retune-cp-handle-inner (backgroundColor: hsl(h,100%,50%))
      div.retune-cp-alpha (ref=alphaSliderRef, onPointerDown)
        div.retune-cp-alpha-checker
        div.retune-cp-alpha-gradient (style background: linear-gradient(to right, transparent, currentHex))
        div.retune-cp-handle (left: localAlpha%, top:50%)
          div.retune-cp-handle-inner (backgroundColor: alpha<100 ? rgba(r,g,b,alpha/100) : currentHex)
  div.retune-cp-inputs
    div.retune-cp-input-group  (label "Hex", input.retune-cp-input -> hexInput)
    div.retune-cp-input-group  (label "R", input numeric)
    div.retune-cp-input-group  (label "G", input numeric)
    div.retune-cp-input-group  (label "B", input numeric)
</>
```

### State / math
- `hsva` HSVA state, init `hexToHsva(value || "#000000")`. `handleLeft = hsva.s`, `handleTop = 100 - hsva.v`.
- SV pick: `s = clamp(((clientX - rect.left)/rect.width)*100, 0, 100)`, `v = clamp((1 - (clientY - rect.top)/rect.height)*100, 0, 100)`. cursor crosshair, `touch-action:none`.
- Hue pick: `h = clamp(((clientX-rect.left)/rect.width)*360, 0, 360)`.
- Alpha pick: `a = clamp(Math.round(((clientX-rect.left)/rect.width)*100), 0, 100)`.
- All three use document-level `pointermove`/`pointerup` drag loops; cleanup stored in `dragCleanupRef`, removed on unmount.
- `emitChange`: set hsva, `onChange(hsvaToHex(...))`, and if a `currentVariable` is set, auto-call `onVariableUnlink?.()` (manually picking a color detaches the token). Same auto-unlink in EyeDropper path.
- Hex commit: same 3-to-6 expand + 6-hex validation as ColorInput; on success `hexToHsva(#cleaned, hsva.a)` then emit.
- RGB commit: each channel `clamp(round(Number||0),0,255)`, `rgbToHsv`, emit with preserved `a`.
- Inputs sync from hsva only when not focused (`focusedRef`). Enter blurs + commits.

### EyeDropper
- Gated by `"EyeDropper" in window`. Uses native `new window.EyeDropper().open()`; on `result.sRGBHex`, `onChange(hex)`, set hsva, auto-unlink variable. Swallows errors (cancel).

### Eyedropper icon (inline 24x24 in component, lines 525-527), path d verbatim:
```
M14.5156 5.76709C15.5386 4.73901 17.203 4.7367 18.2285 5.76221C19.25 6.78399 19.2513 8.43996 18.2324 9.46436L16.6602 11.0435C17.0848 11.771 16.9869 12.7196 16.3633 13.3433L16.3438 13.3638C15.6018 14.1055 14.3982 14.1054 13.6562 13.3638L13.5 13.2075L8.43945 18.2642C7.97069 18.7324 7.33447 18.9956 6.67188 18.9956L5.50391 18.9946C5.22841 18.9944 5.00451 18.7712 5.00391 18.4956L5.00195 17.3315C5.00057 16.6668 5.26346 16.0282 5.7334 15.5581L10.792 10.4995L10.6367 10.3433C9.89467 9.60127 9.8947 8.39778 10.6367 7.65576L10.6562 7.63623C11.2789 7.01362 12.2251 6.91514 12.9521 7.3374L14.5156 5.76709ZM6.44043 16.2661C6.15876 16.5481 6.00112 16.931 6.00195 17.3296L6.00391 17.9937L6.67188 17.9956C7.06948 17.9956 7.45115 17.8372 7.73242 17.5562L12.793 12.5005L11.499 11.2065L6.44043 16.2661ZM17.5205 6.46924C16.8863 5.8355 15.8572 5.83673 15.2246 6.47217L13.3545 8.35205L13.001 8.70752L12.6367 8.34326C12.2852 7.99183 11.7147 7.99181 11.3633 8.34326L11.3438 8.36279C10.9923 8.71427 10.9923 9.28476 11.3438 9.63623L14.3633 12.6558C14.7147 13.0073 15.2852 13.0072 15.6367 12.6558L15.6562 12.6362C16.0077 12.2848 16.0077 11.7143 15.6562 11.3628L15.2939 11.0005L15.6455 10.647L17.5234 8.75928C18.1538 8.12571 18.1523 7.10128 17.5205 6.46924Z
```

### Unlink button (header action; only shown when picker has tabs/variables)
- `<Tooltip>` wraps `<button.retune-floating-dialog-close data-dialog-action="unlink">`. Disabled (no current variable): `{opacity:0.3, cursor:"default"}` and no data-action. SVG path d (verbatim, fill currentColor):
```
M8.14694 12.1475C8.3422 11.9522 8.65871 11.9522 8.85397 12.1475C9.04903 12.3427 9.04916 12.6593 8.85397 12.8545L7.35397 14.3545C6.72133 14.9876 6.72123 16.0134 7.35397 16.6465C7.98708 17.2796 9.01376 17.2795 9.64694 16.6465L11.1469 15.1465C11.3421 14.9517 11.6588 14.9517 11.854 15.1465C12.0491 15.3416 12.0488 15.6582 11.854 15.8535L10.354 17.3535C9.33027 18.377 7.67057 18.3771 6.64694 17.3535C5.62359 16.3299 5.6235 14.6701 6.64694 13.6465L8.14694 12.1475ZM14.5005 15.5C14.7764 15.5001 15.0004 15.724 15.0005 16V17.5C15.0005 17.7761 14.7765 17.9999 14.5005 18C14.2243 18 14.0005 17.7761 14.0005 17.5V16C14.0005 15.7239 14.2244 15.5 14.5005 15.5ZM17.5005 14C17.7764 14.0001 18.0004 14.224 18.0005 14.5C18.0005 14.7761 17.7765 14.9999 17.5005 15H16.0005C15.7243 15 15.5005 14.7761 15.5005 14.5C15.5005 14.2239 15.7244 14 16.0005 14H17.5005ZM13.6469 6.64648C14.6706 5.62308 16.3303 5.62301 17.354 6.64648C18.3774 7.6701 18.3774 9.32986 17.354 10.3535L15.854 11.8535C15.6587 12.0487 15.3422 12.0487 15.1469 11.8535C14.9517 11.6583 14.9518 11.3417 15.1469 11.1465L16.6469 9.64648C17.2798 9.01335 17.2799 7.98661 16.6469 7.35351C16.0138 6.72057 14.9871 6.72064 14.354 7.35351L12.854 8.85351C12.6588 9.04859 12.3422 9.04843 12.1469 8.85351C11.952 8.65825 11.9519 8.34165 12.1469 8.14648L13.6469 6.64648ZM8.00045 9C8.27642 9.00014 8.50036 9.22402 8.50045 9.5C8.50045 9.77605 8.27647 9.99985 8.00045 10H6.50045C6.22431 10 6.00045 9.77614 6.00045 9.5C6.00054 9.22393 6.22437 9 6.50045 9H8.00045ZM9.50045 6C9.77642 6.00014 10.0004 6.22402 10.0005 6.5V8C10.0005 8.27605 9.77647 8.49985 9.50045 8.5C9.22431 8.5 9.00045 8.27614 9.00045 8V6.5C9.00054 6.22393 9.22437 6 9.50045 6Z
```

### Token tab content (`tokenContent`)
- Variables fetched via `getVariablesForProperty(property)` (from `variables/resolver`). Category from `getCategoryForProperty(property)` after camelCase to kebab (`property.replace(/[A-Z]/g, c => "-"+c.toLowerCase())`). Symbols defined outside the file list.
- Grouping: `groupByRamp` keys on `t.manifestGroup` else parsed ramp group (`blue-500` becomes `blue`). Ramps (2+ items OR any manifestGroup) get a header and are shade-sorted ascending; standalone items (single, no manifest group) listed first sorted alphabetically; ramps sorted alphabetically after.
- Render: `div.retune-variable-dialog-list` (ref) containing optional `.retune-variable-dialog-empty` ("No variables found"), then standalone items, then each ramp as `<div>` with `.retune-variable-dialog-group-title` (`groupName.replace(/-/g," ")`, CSS capitalizes) then its items.
- Each item:
  ```
  div.retune-variable-dialog-item[ -active if currentVariable matches ][ -highlighted if keyboard idx ]  data-token-index=N
    span.retune-variable-dialog-swatch (style backgroundColor: getSwatchColor(v) || "transparent")
    span.retune-variable-dialog-name   (getDisplayName: strip var(--) or property prefix bg-/text-/border-/fill-/stroke-/outline-/ring-)
  ```
  Note: dialog items render swatch + name only (no value text), unlike TokenPicker which adds a value.
- Clicks handled by a NATIVE `pointerdown` listener on the list (React delegation fails in Shadow DOM), re-attached on tab change. Click -> `onVariableSelect(current,new,props)` if a variable applied else `onVariableApply(new,props)`, then close. `props = property ? [property] : []`.
- Search (in dialog header when on tokens tab): filters by className or any value substring (case-insensitive). Keyboard: ArrowDown/Up cycle `highlightedIndex` (mod count), Enter applies highlighted. Highlight resets on filter change; highlighted item `scrollIntoView({block:"nearest"})`. On tab open, active item `scrollIntoView({block:"center"})` via rAF.

### Picker CSS (overlay.css 1603-1782)
```css
.retune-cp-sv-wrap { padding: 12px 12px 0 12px; }
.retune-cp-sv { position:relative; width:100%; aspect-ratio:1; cursor:crosshair; touch-action:none; border-radius:8px; }
.retune-cp-sv-white, .retune-cp-sv-black { border-radius: inherit; }
.retune-cp-sv-white { position:absolute; inset:0; background: linear-gradient(to right, #fff, transparent); }
.retune-cp-sv-black { position:absolute; inset:0; background: linear-gradient(to bottom, transparent, #000); }
.retune-cp-handle { position:absolute; pointer-events:none; transform: translate(-50%,-50%); will-change: transform; }
.retune-cp-handle-inner {
  width:14px; height:14px; border-radius:50%; border:3px solid white;
  box-shadow: 0 0 0.5px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.12);
}
.retune-cp-sliders { display:flex; align-items:center; gap:8px; padding:10px 12px; }
.retune-cp-eyedropper {
  display:flex; align-items:center; justify-content:center; width:32px; height:32px; flex-shrink:0;
  background:transparent; border:none; border-radius:8px; color: var(--retune-text-tertiary);
  cursor:pointer; padding:0; transition: background .15s ease, color .15s ease;
}
.retune-cp-eyedropper:hover { color: var(--retune-text); background: var(--retune-surface-active); }
.retune-cp-slider-tracks { display:flex; flex-direction:column; gap:8px; flex:1; min-width:0; }
.retune-cp-hue {
  position:relative; height:14px; border-radius:7px;
  background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  cursor:pointer; touch-action:none; overflow:visible; box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.1);
}
.retune-cp-alpha { position:relative; height:14px; border-radius:7px; cursor:pointer; touch-action:none; overflow:visible; box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.1); }
.retune-cp-alpha-checker { position:absolute; inset:0; background-image: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%); background-size:8px 8px; border-radius:7px; }
.retune-cp-alpha-gradient { position:absolute; inset:0; border-radius:7px; }
.retune-cp-inputs { display:flex; gap:4px; padding:0 12px 10px; }
.retune-cp-input-group { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.retune-cp-input-group:first-child { flex:1.8; }   /* Hex group wider */
.retune-cp-label { font-size:9px; font-weight:500; color: var(--retune-text-tertiary); text-transform:uppercase; letter-spacing:-0.005em; padding-left:2px; }
.retune-cp-input { height:32px; border-radius:8px; background: var(--retune-surface-hover); border:none; font-family:inherit; font-size:11px; font-weight:500; color: var(--retune-text); padding:0 6px; outline:none; width:100%; min-width:0; }
.retune-cp-input:focus { outline:none; box-shadow: 0 0 0 1.5px rgba(59,130,246,0.5); }
.retune-cp-input::selection { background: var(--retune-blue-bg); color: var(--retune-text); }
```
(There are unused `.retune-cp-preview-checker` / `.retune-cp-preview` rules in the CSS not referenced by the current JSX - ignore for the port.)

---

## 3. FloatingDialog (shared shell, `floating-dialog.tsx`)

### Positioning
- Looks up host (`[data-retune-host]`) -> shadowRoot `.retune-panel` parent. `panelWidth = parentRect.width - 24` (fallback 240). `left = parentRect.left + (parentRect.width - panelWidth)/2` (centered in panel; fallback clamps to anchor/viewport).
- `gap = 4`. `spaceBelow = innerHeight - anchor.top - anchor.height - 4`; `spaceAbove = anchor.top - 4`. `flipUp = spaceBelow < maxHeight(400) && spaceAbove > spaceBelow`.
- `maxHeight = min(400, flipUp ? spaceAbove : spaceBelow)`; `minHeight` clamped to maxHeight.
- Below: `position:fixed; top: anchor.top+anchor.height+4; left; width:panelWidth; maxHeight; minHeight`. Flipped: `bottom: innerHeight - anchor.top + 4` instead of top.

### DOM
```
div.retune-floating-dialog[ +className ]
  div.retune-floating-dialog-header
    div.retune-floating-dialog-title-area
      [tabs] button.retune-floating-dialog-tab[ -active | -single ]   OR   span.retune-floating-dialog-title
    {headerActions}
    button.retune-floating-dialog-close[data-dialog-close]  (X icon)
  [search] div.retune-floating-dialog-search > input.retune-floating-dialog-search-input
  div.retune-floating-dialog-body > {children}
```
- Single tab renders as plain `-single` text (no selected style). Close + header actions use NATIVE pointerdown via `data-dialog-close` / `data-dialog-action`. Closes on outside pointerdown (composedPath check) and Escape. `useScrollLock(true)`. Search auto-focuses on mount (setTimeout 0).

### Close (X) icon path d (verbatim, 24x24, fill currentColor)
```
M16.6464 6.64645C16.8417 6.45118 17.1582 6.45118 17.3535 6.64645C17.5487 6.84171 17.5487 7.15822 17.3535 7.35348L12.707 12L17.3535 16.6464C17.5487 16.8417 17.5487 17.1582 17.3535 17.3535C17.1582 17.5487 16.8417 17.5487 16.6464 17.3535L12 12.707L7.35348 17.3535C7.15822 17.5487 6.84171 17.5487 6.64645 17.3535C6.45118 17.1582 6.45118 16.8417 6.64645 16.6464L11.2929 12L6.64645 7.35348C6.45123 7.15821 6.4512 6.84169 6.64645 6.64645C6.8417 6.45125 7.15823 6.45125 7.35348 6.64645L12 11.2929L16.6464 6.64645Z
```

### CSS (overlay.css 1474-1601, plus dark 585-591)
```css
.retune-floating-dialog {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--retune-surface); border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08);
  overflow:hidden; display:flex; flex-direction:column; z-index:2147483647; pointer-events:auto;
  animation: retune-dialog-enter 150ms cubic-bezier(0.23,1,0.32,1);
}
@keyframes retune-dialog-enter { from { opacity:0; transform:scale(0.97);} to { opacity:1; transform:scale(1);} }
.retune-floating-dialog-header { display:flex; align-items:center; justify-content:space-between; padding:8px 8px 0 12px; }
.retune-floating-dialog-title-area { display:flex; align-items:center; gap:4px; flex:1; min-width:0; }
.retune-floating-dialog-title { font-size:12px; font-weight:500; color: var(--retune-text); }
.retune-floating-dialog-tab {
  height:24px; padding:0 8px; border-radius:5px; font-size:11px; line-height:16px; letter-spacing:0.055px;
  white-space:nowrap; border:none; background:none; cursor:pointer;
  transition: color .15s, background-color .15s; font-weight:450; color: var(--retune-text-secondary); font-family:inherit;
}
.retune-floating-dialog-tab:hover { background: var(--retune-input-bg); }
.retune-floating-dialog-tab-active { background: var(--retune-surface-hover); font-weight:550; color: var(--retune-text); }
.retune-floating-dialog-tab-active:hover { background: var(--retune-surface-hover); }
.retune-floating-dialog-tab-single { font-weight:550; color: var(--retune-text); cursor:inherit; }
.retune-floating-dialog-tab-single:hover { background:none; }
.retune-floating-dialog-close {
  width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:transparent;
  border:none; color: var(--retune-text-tertiary); cursor:pointer; border-radius:8px; padding:0; flex-shrink:0;
  transition: background .15s ease, color .15s ease;
}
.retune-floating-dialog-close:hover { color: var(--retune-text); background: var(--retune-surface-active); }
.retune-floating-dialog-search { padding:8px; }
.retune-floating-dialog-search-input {
  width:100%; height:32px; background: var(--retune-surface-hover); border:none; border-radius:8px;
  padding:0 10px; font-size:12px; font-family:inherit; color: var(--retune-text); outline:none; box-sizing:border-box;
}
.retune-floating-dialog-search-input::placeholder { color: var(--retune-text-tertiary); }
.retune-floating-dialog-search-input:focus { box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
.retune-floating-dialog-body { flex:1; min-height:0; display:flex; flex-direction:column; }

:host(.dark) .retune-floating-dialog {
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 10%),
    0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08);
}
```

### Variable dialog list CSS (used by tokens tab; overlay.css 2841-2915, 3137-3145)
```css
.retune-variable-dialog-list { flex:1 1 0; overflow-y:auto; padding:2px 0 4px; scrollbar-width:none; border-top:1px solid var(--retune-border); }
.retune-variable-dialog-list::-webkit-scrollbar { display:none; }
.retune-variable-dialog-item { display:flex; align-items:center; gap:6px; padding:8px 16px; cursor:pointer; transition:background-color .08s ease; min-height:32px; box-sizing:border-box; }
.retune-variable-dialog-item:hover { background: var(--retune-surface-hover); }
.retune-variable-dialog-item-active { background: var(--retune-surface-hover); }
.retune-variable-dialog-item-active:hover { background: var(--retune-surface-hover); }
.retune-variable-dialog-item-highlighted { background: var(--retune-input-bg); }
.retune-variable-dialog-item-active.retune-variable-dialog-item-highlighted { background: var(--retune-surface-hover); }
.retune-variable-dialog-active-dot { width:5px; height:5px; border-radius:50%; background:#3b82f6; flex-shrink:0; }
.retune-variable-dialog-swatch { width:14px; height:14px; border-radius:3px; flex-shrink:0; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1); }
.retune-variable-dialog-name { font-size:11px; font-weight:450; color: var(--retune-text); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.retune-variable-dialog-value { font-size:11px; color: var(--retune-text-tertiary); flex-shrink:0; }
.retune-variable-dialog-empty { padding:16px 12px; font-size:12px; color: var(--retune-text-tertiary); text-align:center; }
.retune-variable-dialog-group-title { font-size:11px; font-weight:450; line-height:16px; letter-spacing:-0.005em; color: var(--retune-text-secondary); padding:8px 16px 8px; text-transform:capitalize; }
```

---

## 4. GradientEditor (`gradient-editor.tsx`)

### Props
```ts
interface GradientEditorProps {
  gradient: GradientFill;                  // {type, stops[], angle}
  onChange: (g: GradientFill) => void;
  originalGradient?: GradientFill;         // for per-stop change dots
  isNewGradient?: boolean;                 // switched from solid -> suppress per-stop dots
}
```

### DOM
```
div.retune-gradient-editor
  <GradientStopBar stops selectedIndex onSelectStop onStopPositionChange onAddStop gradientCss={gradientBarCss(stops)} />
  div.retune-gradient-controls
    input.retune-gradient-angle-input
    div.retune-gradient-actions
      <Tooltip "Reverse gradient direction"> button.retune-gradient-action-btn (<FlipHorizontalSmall/>)
      <Tooltip "Rotate gradient 45"> button.retune-gradient-action-btn[disabled=!showAngle] (<Rotate/>)
  div.retune-gradient-stops-header
    span.retune-gradient-stops-label "Stops"
    <Tooltip "Add color stop"> button.retune-gradient-action-btn (<Plus/>)
  div.retune-gradient-stops-list
    (per sorted stop) div.retune-gradient-stop-row
      div.retune-gradient-stop-pos
        <ChangeIndicator>
        input.retune-gradient-stop-pos-input
        span.retune-gradient-stop-pos-unit "%"
      div.retune-gradient-stop-color > <ColorInput property="backgroundColor" .../>
      <Tooltip "Remove color stop"> button.retune-gradient-action-btn.remove[disabled=stops<=2] (<Minus/>)
```

### Conditional rendering / behavior
- `showAngle = gradient.type !== "radial"`. When false, angle input shows a single dash glyph, readOnly+disabled; the Rotate button is disabled.
- Stops are displayed sorted by position ascending (`sortedStops`) but each row keeps its ORIGINAL index for edits/keys.
- Angle input: displays `${angle}deg-glyph` when not editing. onFocus enters edit mode, sets raw `String(angle)`, selects via rAF. onChange strips the degree glyph, parses int, normalizes `((val%360)+360)%360`. onBlur normalizes + reformats. Keyboard: Enter blurs; ArrowUp/Down step = shift?15:1, wrap mod 360.
- Reverse: each stop `position = 1 - position`, then array reversed.
- Rotate: `angle = (angle + 45) % 360`.
- Add stop (button): color = `interpolateColor(stops, 0.5)`, new stop `{color, position:0.5, opacity:100}`, select it.
- Add stop (bar click): from GradientStopBar, color interpolated at click position.
- Remove stop: no-op if `stops.length <= 2`; adjusts selectedStop.
- Per-stop position input: `defaultValue = round(position*100)`, `key = ${index}-${round(position*100)}` (forces remount on external change). onBlur parses int, clamps 0..100, writes `position = clamped/100`. Enter blurs.
- Per-stop ColorInput: `value = hexToRgba(stop.color, stop.opacity ?? 100)`, `prop="stop-${index}"`, `property="backgroundColor"`. onChange parses CSS back to `{hex, opacity}` and writes the stop; clears any local variable state for that index. Per-stop variable associations are kept in a local `Map<number, VariableMatch>` (`stopVariables`), NOT persisted to the change tracker.
- Change dots: when `isNewGradient` or no `originalGradient`, no per-stop dots. Otherwise color-changed = color or opacity differs; position-changed = position differs. Reset color: restore original (or remove if it was a new stop). Reset position: restore original position.

### Gradient editor CSS (overlay.css 1785-1981)
```css
.retune-gradient-editor { display:flex; flex-direction:column; gap:8px; }
.retune-gradient-editor > * { padding: 0px 8px 0px 16px; }   /* every direct child */
.retune-gradient-bar-wrap { position:relative; height:32px; cursor:crosshair; margin:0px 48px 0px 16px; padding:0 !important; }
.retune-gradient-bar { position:absolute; bottom:0; left:0; right:0; height:32px; border-radius:8px; overflow:hidden; border:1px solid var(--retune-border); }
.retune-gradient-bar-checker {
  position:absolute; inset:0;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
                    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size:6px 6px; background-position:0 0, 3px 3px;
}
.retune-gradient-bar-fill { position:absolute; inset:0; }
.retune-gradient-stop-handle { position:absolute; top:0px; transform:translateX(-50%); cursor:grab; touch-action:none; }
.retune-gradient-stop-handle:active { cursor:grabbing; }
.retune-gradient-stop-indicator { display:flex; flex-direction:column; align-items:center; filter: drop-shadow(0 0 0.5px rgba(0,0,0,0.18)) drop-shadow(0 2px 6px rgba(0,0,0,0.12)); }
.retune-gradient-stop-chit { display:flex; align-items:center; justify-content:center; width:20px; height:32px; border-radius:5px; }
.retune-gradient-stop-chit-color { width:12px; height:24px; border-radius:2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1); }
.retune-gradient-stop-caret { display:none; }                 /* caret element exists in JSX but is hidden */
.retune-gradient-controls { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.retune-gradient-angle-input { width:64px; height:32px; border-radius:8px; background: var(--retune-surface-hover); border:none; font-family:inherit; font-size:11px; font-weight:450; letter-spacing:-0.005em; color: var(--retune-text); padding:0 8px; text-align:left; }
.retune-gradient-angle-input:focus { outline:none; box-shadow: 0 0 0 1.5px rgba(59,130,246,0.5); }
.retune-gradient-actions { display:flex; align-items:center; gap:4px; }
.retune-gradient-action-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border:none; background:transparent; border-radius:8px; color: var(--retune-text-secondary); cursor:pointer; transition: background-color .08s ease, color .08s ease; }
.retune-gradient-action-btn:hover { background: var(--retune-surface-hover); color: var(--retune-text); }
.retune-gradient-action-btn:disabled { opacity:0.3; cursor:not-allowed; }
.retune-gradient-action-btn:disabled:hover { background:transparent; color: var(--retune-text-secondary); }
.retune-gradient-stops-header { display:flex; align-items:center; justify-content:space-between; }
.retune-gradient-stops-label { font-size:11px; font-weight:550; letter-spacing:-0.005em; color: var(--retune-text); }
.retune-gradient-stops-list { display:flex; flex-direction:column; gap:8px; }
.retune-gradient-stop-row { display:flex; align-items:flex-start; gap:8px; padding:0; }
.retune-gradient-stop-pos { position:relative; display:flex; align-items:center; width:48px; flex-shrink:0; }
.retune-gradient-stop-pos-input { width:100%; height:32px; border-radius:8px; background: var(--retune-surface-hover); border:none; font-family:inherit; font-size:11px; font-weight:450; letter-spacing:-0.005em; color: var(--retune-text); padding:0 18px 0 6px; text-align:left; }
.retune-gradient-stop-pos-input:focus { outline:none; box-shadow: 0 0 0 1.5px rgba(59,130,246,0.5); }
.retune-gradient-stop-pos-unit { position:absolute; right:6px; font-size:11px; color: var(--retune-text-tertiary); pointer-events:none; }
.retune-gradient-stop-color { flex:1; min-width:0; }
```

NOTE on bar geometry: `.retune-gradient-editor > *` adds `padding:0 8px 0 16px` to all children, but `.retune-gradient-bar-wrap` overrides with `padding:0 !important` and uses `margin:0 48px 0 16px` instead (the 48px right margin reserves room so the rightmost stop handle/chit, 20px wide centered, isn't clipped).

---

## 5. GradientStopBar (`gradient-stop-bar.tsx`)

### Props
```ts
interface GradientStopBarProps {
  stops: GradientStop[];
  selectedIndex: number;
  onSelectStop: (i:number)=>void;
  onStopPositionChange: (i:number, position:number)=>void;
  onAddStop: (position:number, color:string)=>void;
  gradientCss: string;       // backgroundImage for the fill layer
}
```

### DOM
```
div.retune-gradient-bar-wrap  (onClick=addStop, onPointerDown=dragStop)
  div.retune-gradient-bar  (ref)
    div.retune-gradient-bar-checker
    div.retune-gradient-bar-fill  (style backgroundImage: gradientCss)
  (per stop) div.retune-gradient-stop-handle  (style left: position*100%, pointerEvents:none)
    div.retune-gradient-stop-indicator
      div.retune-gradient-stop-chit  (style backgroundColor: selected ? #0d99ff : white)
        div.retune-gradient-stop-chit-color  (style backgroundColor: stop.color)
      div.retune-gradient-stop-caret  (style backgroundColor: selected ? #0d99ff : white; but display:none)
```
- Selected stop chit/caret turn solid `#0d99ff` (hardcoded literal, not a token); unselected `white`.

### Interaction math
- `getPosition(clientX) = clamp((clientX - rect.left)/rect.width, 0, 1)` (0..1).
- `findClosestStop`: nearest stop by absolute distance; only grabbed if within 20px (`minDist * rect.width < 20`), else returns null.
- PointerDown on a near stop: `stopPropagation`+`preventDefault`, select it, then document-level pointermove updates that stop's position, pointerup ends drag.
- Click on the bar (not dragging, not near a stop): add a stop at click position with color = `interpolateColor(stops, position)`.
- Handles have `pointer-events:none`; the wrapper owns all pointer handling.

---

## 6. Gradient model + CSS utils (`gradient-utils.ts`)

```ts
interface GradientStop { color: string; position: number /*0..1*/; opacity?: number /*0..100, default 100*/; }
interface GradientFill { type: "linear"|"radial"|"conic"; stops: GradientStop[]; angle: number /*deg*/; }
type FillMode = "solid"|"linear"|"radial"|"conic";
```
- `defaultGradient()` = `{ type:"linear", angle:180, stops:[{#ffffff,0,100},{#000000,1,100}] }`.
- `gradientToCss(g)`: sorts stops by position; each `color pos%` where color = `hexToRgba(...)` if alpha<1 else hex, pos = `round(position*100)`. Output:
  - linear: `linear-gradient(${angle}deg, ${stops})`
  - radial: `radial-gradient(circle, ${stops})`
  - conic: `conic-gradient(from ${angle}deg, ${stops})`
- `gradientBarCss(stops)`: always `linear-gradient(to right, ${stops})` (used for the bar preview regardless of type/angle).
- `parseCssGradient(css)`: regex match linear/radial/conic, extract angle (`Ndeg` or `to <dir>` mapped via directionToAngle, default 180) and stops; needs >= 2 stops. `directionToAngle`: top 0, top right 45, right 90, bottom right 135, bottom 180, bottom left 225, left 270, top left 315 (default 180). Splits stops on top-level commas (paren-depth aware).
- `interpolateColor(stops, position)`: sort, find bounding pair, linear RGB lerp, return hex.
- `detectFillMode(bgColor, bgImage)`: if bgImage parses as a gradient, returns its type; else `"solid"`.

---

## 7. Color math utils (`color-utils.ts`)

```ts
interface HSVA { h /*0..360*/; s /*0..100*/; v /*0..100*/; a /*0..100*/; }
interface RGB  { r,g,b /*0..255*/ }
```
Key functions: `hexToRgb`, `rgbToHex` (clamps + pads), `rgbToHsv` / `hsvToRgb` (standard), `hsvToHex`, `hexToHsv`, `hexToHsva(hex, alpha=100)`, `hsvaToHex`.
- `parseCssColor(color)` -> `{hex, opacity}`: handles `#hex` (3 or 6, opacity 100), `rgba(r,g,b,a)` (opacity = `round(a*100)`), `rgb(r,g,b)` (100), `transparent` (`{#000000, 0}`), fallback `{#000000, 100}`.
- `hexToRgba(hex, opacity)`: returns bare hex if `opacity >= 100`, else `rgba(r, g, b, (opacity/100).toFixed(2))`.

---

## 8. TokenPicker (`token-picker.tsx`) - standalone dark swap panel

DISTINCT from the ColorPicker tokens tab. This is the dark floating list used to swap a token to a sibling token in the same category. CSS classes are `retune-token-picker*` (inline styles only for position/width; there are NO `.retune-token-picker*` rules in overlay.css). NOTE: the visually equivalent dark panel that DOES have CSS is `.retune-variable-picker*` (overlay.css 2754-2838) - it is the styled twin. The reproduction should style `retune-token-picker` using the `retune-variable-picker` ruleset below.

### Props
```ts
interface TokenPickerProps {
  match: VariableMatch;                 // current token + property
  onSelect: (newToken: DesignVariable) => void;
  onClose: () => void;
  anchorRect: { top; left; width; height };
}
```

### Positioning (inline, fixed)
- `panelWidth = 200`, `itemHeight = 30`, `padding = 8`, `maxItems = 8`.
- `itemCount = alternatives.length + 1` (current + alternatives). `panelHeight = min(itemCount, 8) * 30 + 16`.
- `spaceBelow = innerHeight - anchor.top - anchor.height - 4`. `flipUp = spaceBelow < panelHeight && anchor.top > spaceBelow`.
- `top = flipUp ? anchor.top - panelHeight - 4 : anchor.top + anchor.height + 4`.
- `left = max(4, anchor.left + anchor.width - panelWidth)` (right-aligned to anchor).
- `isColor = category === "colors"` (category from `getCategoryForProperty(match.property)`).

### DOM
```
div.retune-token-picker  (style position:fixed; top; left; width:200)
  div.retune-token-picker-header
    span.retune-token-picker-title  (category || "variables")
  div.retune-token-picker-list  (ref; native pointerdown click handler)
    div.retune-token-picker-item.retune-token-picker-item-active   (current)
      [isColor] span.retune-token-picker-swatch (bg getSwatchColor||transparent)
      span.retune-token-picker-name  ".{className}"
      span.retune-token-picker-value (formatValue: first value, truncated to 20 + ellipsis)
    (per alternative) div.retune-token-picker-item  data-token-index=i
      [isColor] span.retune-token-picker-swatch
      span.retune-token-picker-name  ".{className}"
      span.retune-token-picker-value
```
- Closes on outside pointerdown (composedPath, attached via setTimeout 0) and Escape (capture, on both shadow root and document). Item clicks via native `pointerdown` (Shadow DOM); click selects + closes.

### Styling source (`.retune-variable-picker*`, overlay.css 2754-2838) - apply to retune-token-picker
```css
/* dark panel */
{ font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#1c1917; border-radius:10px;
  box-shadow: 0 0 0.5px rgba(0,0,0,0.12), 0 10px 16px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.15);
  overflow:hidden; z-index:2147483647; pointer-events:auto; animation: retune-variable-picker-enter 150ms ease-out; }
@keyframes retune-variable-picker-enter { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
header { padding:8px 10px 4px; border-bottom:1px solid rgba(255,255,255,0.06); }
title  { font-size:10px; font-weight:600; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px; }
list   { max-height:240px; overflow-y:auto; padding:4px 0; scrollbar-width:none; }  /* ::-webkit-scrollbar display:none */
item   { display:flex; align-items:center; gap:6px; padding:5px 10px; cursor:pointer; transition:background-color .08s ease; min-height:30px; box-sizing:border-box; }
item:hover { background:rgba(255,255,255,0.08); }
item-active { background:rgba(59,130,246,0.15); cursor:default; }  /* hover same */
swatch { width:14px; height:14px; border-radius:3px; flex-shrink:0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15); }
name   { font-size:11px; font-weight:500; color:#fff; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
value  { font-size:10px; color:rgba(255,255,255,0.4); flex-shrink:0; }
```

---

## 9. ChangeIndicator (`change-indicator.tsx`) + reset dot

- Renders nothing when `!isChanged`. Otherwise a `<Tooltip content="Reset property" side="top" delay={200}>` wrapping `span.retune-change-dot > span.retune-change-dot-inner`. Native pointerdown calls `onReset` (stop+prevent).
```css
.retune-change-dot { position:absolute; top:-8px; right:-8px; width:16px; height:16px; z-index:3; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.retune-change-dot-inner { width:6px; height:6px; border-radius:50%; background: var(--retune-blue); box-shadow: 0 0 0 3px var(--retune-surface); pointer-events:none; }
```

---

## 10. VariableAction (`variable-action.tsx`) - hover icon in ColorInput

- Renders nothing if no variable applied AND no variables available for the property.
- Applied state: `span.retune-variable-action.retune-variable-unlink` with UnlinkIcon (Tooltip "Unlink variable"). Available state: `span.retune-variable-action.retune-variable-add` with HexagonIcon (Tooltip "Add variable").
- Inside ColorInput, `onRequestOpen` is wired so the icon opens the ColorPicker tokens tab instead of the internal VariableDialog. Unlink icon click detaches (checked before onRequestOpen).
```css
.retune-variable-action { position:absolute; right:0; top:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:transparent; transition: color .15s ease; cursor:pointer; z-index:2; }
.retune-color-hex-section:hover .retune-variable-action:not(.retune-variable-unlink) { color: var(--retune-text-secondary); }
.retune-variable-action:hover:not(.retune-variable-unlink) { color: var(--retune-text) !important; }
.retune-variable-unlink { color: var(--retune-text); }
.retune-color-variable-applied .retune-variable-unlink { color: transparent; }
.retune-color-variable-applied:hover .retune-variable-unlink { color: var(--retune-text-secondary); }
.retune-variable-unlink:hover { color: var(--retune-text) !important; }
```

### Hexagon icon path d (verbatim, 24x24, two paths fill currentColor)
Path 1 (center dot):
```
M12.5 11.0346C13.0522 11.0346 13.4999 11.4824 13.5 12.0346C13.5 12.5868 13.0523 13.0346 12.5 13.0346C11.9477 13.0346 11.5 12.5868 11.5 12.0346C11.5001 11.4824 11.9478 11.0346 12.5 11.0346Z
```
Path 2 (hexagon outline, fillRule evenodd):
```
M11.5 6.26795C12.1188 5.91068 12.8812 5.91068 13.5 6.26795L17 8.28846C17.6187 8.64574 18 9.30641 18 10.0209V14.0619C17.9999 14.7763 17.6187 15.4371 17 15.7943L13.5 17.8148C12.8813 18.1719 12.1187 18.1719 11.5 17.8148L8 15.7943C7.3813 15.4371 7.00013 14.7763 7 14.0619V10.0209C7 9.30641 7.38129 8.64574 8 8.28846L11.5 6.26795ZM13 7.13416C12.6906 6.95553 12.3094 6.95553 12 7.13416L8.5 9.15467L8.38965 9.22791C8.14588 9.41565 8 9.70826 8 10.0209V14.0619C8.00013 14.419 8.1907 14.7495 8.5 14.9281L12 16.9486C12.2707 17.1048 12.5965 17.1244 12.8809 17.0072L13 16.9486L16.5 14.9281C16.8093 14.7495 16.9999 14.419 17 14.0619V10.0209C17 9.70826 16.8541 9.41565 16.6104 9.22791L16.5 9.15467L13 7.13416Z
```
### Unlink icon path d (verbatim, 24x24, fillOpacity 0.9)
```
M12.3533 14.646C12.5485 14.8412 12.5484 15.1578 12.3533 15.3531L11.3534 16.353C10.3297 17.3765 8.67028 17.3766 7.64665 16.353C6.62317 15.3294 6.62317 13.6699 7.64665 12.6462L8.64654 11.6463C8.84181 11.4512 9.15844 11.4511 9.35364 11.6463C9.54883 11.8415 9.54874 12.1582 9.35364 12.3534L8.35375 13.3533C7.7208 13.9865 7.7208 15.0128 8.35375 15.6459C8.98687 16.279 10.0132 16.2789 10.6463 15.6459L11.6462 14.646C11.8414 14.451 12.1581 14.4511 12.3533 14.646ZM8.0002 9.00021C8.27634 9.00021 8.50015 9.22401 8.50015 9.50015C8.49994 9.77612 8.27622 10.0001 8.0002 10.0001H6.50036C6.22434 10.0001 6.00061 9.77612 6.00041 9.50015C6.00041 9.22401 6.22422 9.00021 6.50036 9.00021H8.0002ZM14.5002 15.5002C14.7763 15.5002 15.0001 15.724 15.0001 16.0001V17.5C15 17.776 14.7763 17.9999 14.5002 17.9999C14.2241 17.9999 14.0004 17.776 14.0002 17.5V16.0001C14.0002 15.724 14.2241 15.5002 14.5002 15.5002ZM9.50073 5.99984C9.77664 6.00011 10.0007 6.22381 10.0007 6.49978V7.99962C10.0007 8.2756 9.77664 8.4993 9.50073 8.49957C9.22459 8.49957 9.00078 8.27576 9.00078 7.99962V6.49978C9.00078 6.22364 9.22459 5.99984 9.50073 5.99984ZM17.5006 13.9997C17.7765 13.9998 18.0004 14.2237 18.0005 14.4996C18.0005 14.7757 17.7766 14.9994 17.5006 14.9996H16.0007C15.7246 14.9996 15.5008 14.7758 15.5008 14.4996C15.5009 14.2235 15.7246 13.9997 16.0007 13.9997H17.5006ZM16.3543 7.64676C17.3774 8.67043 17.3776 10.33 16.3543 11.3535L15.3544 12.3534C15.1592 12.5486 14.8426 12.5484 14.6473 12.3534C14.452 12.1582 14.452 11.8416 14.6473 11.6463L15.6472 10.6464C16.28 10.0134 16.2798 8.98702 15.6472 8.35387C15.0141 7.72075 13.9871 7.72018 13.3539 8.35317L12.354 9.35307C12.1588 9.54825 11.8422 9.54808 11.6469 9.35307C11.4519 9.15779 11.4517 8.84114 11.6469 8.64596L12.6468 7.64607C13.6705 6.62254 15.3306 6.62312 16.3543 7.64676Z
```

---

## 11. Gradient editor icons (`icons.tsx`, all 24x24, fill currentColor fillOpacity 0.9, default render size 32)

Wrapper: `<svg width=size height=size viewBox="0 0 24 24" fill="none" xmlns=...>`. Used here: `FlipHorizontalSmall`, `Rotate`, `Plus`, `Minus`.

- `Plus` d:
```
M12 6C12.2761 6 12.5 6.22386 12.5 6.5V11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H12.5V17.5C12.5 17.7761 12.2761 18 12 18C11.7239 18 11.5 17.7761 11.5 17.5V12.5H6.5C6.22386 12.5 6 12.2761 6 12C6 11.7239 6.22386 11.5 6.5 11.5H11.5V6.5C11.5 6.22386 11.7239 6 12 6Z
```
- `Minus` d:
```
M6 12C6 11.7239 6.22386 11.5 6.5 11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H6.5C6.22386 12.5 6 12.2761 6 12Z
```
- `FlipHorizontalSmall` d:
```
M12.5 6.5C12.5 6.22386 12.2761 6 12 6C11.7239 6 11.5 6.22386 11.5 6.5V17.5C11.5 17.7761 11.7239 18 12 18C12.2761 18 12.5 17.7761 12.5 17.5V6.5ZM6 9.10355C6 8.43538 6.80786 8.10075 7.28033 8.57323L10 11.2929C10.3905 11.6834 10.3905 12.3166 10 12.7071L7.28033 15.4268C6.80785 15.8993 6 15.5646 6 14.8965V9.10355ZM7 14.2929L9.29289 12L7 9.70711V14.2929ZM18 9.10355C18 8.43538 17.1921 8.10075 16.7197 8.57323L14 11.2929C13.6095 11.6834 13.6095 12.3166 14 12.7071L16.7197 15.4268C17.1922 15.8993 18 15.5646 18 14.8965V9.10355ZM17 14.2929L14.7071 12L17 9.70711V14.2929Z
```
- `Rotate` d:
```
M10.2322 6.47491C11.2085 5.4986 12.7915 5.4986 13.7678 6.47491L15.2929 8.00003H14C13.7239 8.00003 13.5 8.22389 13.5 8.50003C13.5 8.77618 13.7239 9.00003 14 9.00003H16.5C16.7761 9.00003 17 8.77618 17 8.50003V6.00003C17 5.72389 16.7761 5.50003 16.5 5.50003C16.2239 5.50003 16 5.72389 16 6.00003V7.29293L14.4749 5.7678C13.108 4.40097 10.892 4.40097 9.52513 5.7678L7.14645 8.14648C6.95118 8.34174 6.95118 8.65833 7.14645 8.85359C7.34171 9.04885 7.65829 9.04885 7.85355 8.85359L10.2322 6.47491ZM13.0607 9.64648C12.4749 9.0607 11.5251 9.06069 10.9393 9.64648L7.64645 12.9394C7.06066 13.5252 7.06066 14.4749 7.64645 15.0607L10.9393 18.3536C11.5251 18.9394 12.4749 18.9394 13.0607 18.3536L16.3536 15.0607C16.9393 14.4749 16.9393 13.5252 16.3536 12.9394L13.0607 9.64648ZM11.6464 10.3536C11.8417 10.1583 12.1583 10.1583 12.3536 10.3536L15.6464 13.6465C15.8417 13.8417 15.8417 14.1583 15.6464 14.3536L12.3536 17.6465C12.1583 17.8417 11.8417 17.8417 11.6464 17.6465L8.35355 14.3536C8.15829 14.1583 8.15829 13.8417 8.35355 13.6465L11.6464 10.3536Z
```

---

## 12. Dialog singleton (`dialog-singleton.ts`)

Module-level `activeClose`. `claimDialog(close)` calls the previous open dialog's close (if different) then stores `close`. `releaseDialog(close)` clears the slot if it matches. This enforces a single open floating dialog across all ColorInput/VariableAction instances.

---

## Reproduction checklist of exact numbers

- Row/input height: 32px everywhere. Swatch tile 32x32 with 20x20 inner, radius 2px. Handle-inner 14x14 circle, 3px white border.
- Hex/RGB/opacity input font: 11px / weight 500. CP label: 9px / 500 / uppercase / tertiary. Tab: 11px / weight 450 (active 550) / line-height 16 / letter-spacing 0.055px.
- Hue + alpha tracks: 14px tall, 7px radius. SV area: aspect-ratio 1, 8px radius. Checkerboards: SV/hue/alpha use `repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%)` at 8px; bar + swatch use 45deg `#ccc` linear-gradient pairs (bar 6px, swatch 4px).
- Focus rings: hex/cp/gradient inputs `0 0 0 1.5px rgba(59,130,246,0.5)`; section focus-within `1px solid var(--retune-border) inset (-1px offset)`; search `0 0 0 2px rgba(59,130,246,0.15)`.
- Dialog: radius 12px, enter anim 150ms cubic-bezier(0.23,1,0.32,1); token-picker dark: radius 10px, enter slide-up 4px 150ms ease-out.
- Selected gradient stop literal color `#0d99ff`; dialog active dot `#3b82f6`; token-picker bg `#1c1917`.
- Min stops = 2 (remove disabled below). Default gradient angle 180, stops white@0 / black@100.
