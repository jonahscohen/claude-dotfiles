# 06 - Core Control Primitives (EXACT spec)

Source root: `retune/packages/overlay/src/`
Scope: the reusable Design-panel control primitives. Every value below is quoted
verbatim from source (`ui/*.tsx`, `overlay/overlay.css`). The CSS lives in one
3,523-line stylesheet injected into the Shadow DOM via `overlay/overlay-css.ts`
(auto-generated from `overlay.css` - never edit the `.ts`).

> All controls are plain CSS + React, NO Tailwind / Radix / styled-components.
> All controls live inside a Shadow DOM root; several use native `pointerdown`
> listeners (not React synthetic events) for Shadow-DOM event compatibility.

---

## 0. Shared theme tokens used by these controls

From `overlay.css` `:host` (light) and `:host(.dark)` blocks. Primitives are an
opacity ramp over `--retune-black: #1c1917` and `--retune-white: #ffffff` built
with `color-mix(in srgb, <base> N%, transparent)`.

| Semantic token | Light value | Dark value |
|---|---|---|
| `--retune-text` | `black-90` (#1c1917 @ 90%) | `white-90` |
| `--retune-text-secondary` | `black-70` | `white-70` |
| `--retune-text-tertiary` | `black-50` | `white-50` |
| `--retune-text-disabled` | `black-25` | `white-25` |
| `--retune-surface` | `#ffffff` | `color-mix(in srgb, #1c1917 95%, #fff)` |
| `--retune-surface-hover` | `black-5` | `white-5` |
| `--retune-surface-active` | `black-5` | `white-5` |
| `--retune-border` | `black-10` | `white-10` |
| `--retune-border-hover` | `black-15` | `white-15` |
| `--retune-blue` | `--retune-blue-500` = `#0D99FF` | same |
| `--retune-blue-bg` | `--retune-blue-200` = `#E5F4FF` | `color-mix(in srgb, #0768CF 50%, transparent)` |

Raw blue palette: `blue-100 #F2F9FF`, `blue-200 #E5F4FF`, `blue-500 #0D99FF`, `blue-700 #0768CF`.

Host typography (inherited by every control via `font-family: inherit` / `font-size:11px`):
`font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;`
`font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;`
host `font-size: 13px; letter-spacing: -0.005em; line-height: 1.4;` - but controls
override to **11px** locally (see each). `user-select: none` globally.

Standard control geometry shared by nearly all inputs: **height 32px, border-radius 8px,
background `--retune-surface-hover`, font-size 11px, font-weight 450, letter-spacing -0.005em.**

---

## 1. NumberInput (`ui/number-input.tsx`)

Numeric input with **scrub-to-adjust** on the label (or on the input's left 16px
when label-less). Equivalent to the portfolio editor's `NumberInput`.

### Props
```ts
label?: ReactNode; prop: string; value: string | undefined; placeholder?: string;
onChange: (prop, value) => void;
min?: number; max?: number;        // clamps scrub, arrow keys, committed input
step?: number;                     // default 1; arrow+shift = step*10
variableMatch?: VariableMatch; property?: string;
onVariableSelect/onVariableApply/onVariableUnlink; isChanged?; onReset?;
```

### State sync
- `localValue` initialised to `roundCssValue(value || "")`.
- A render-phase "derived state from props" sync: if `value !== prevValue`, update,
  **but skips overwrite while a drag preview is active** (`previewActiveRef.current`).
- Live drag preview values bypass React via `usePreviewValue(prop, inputRef)` -
  writes directly to `el.value` during a preview-bridge drag.

### Scrub math (THE key behavior)
`SCRUB_ZONE = 16` px. Label pointer-down captures pointer; move handler:
```js
const pixelDelta = e.clientX - scrubRef.current.startX;
const baseStep = stepProp ?? 1;
const raw = scrubRef.current.startVal + Math.round(pixelDelta) * baseStep;
// round to step precision to avoid float drift:
const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
const clamped = clampNum(rounded, min, max);
const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
const newVal = `${clamped}${unit}`;   // setLocalValue + onChange(prop, newVal)
```
**1px of horizontal drag = 1 `step`.** Unit is preserved by regex `/[a-z%]+$/i`.
`setPointerCapture(e.pointerId)` on pointerdown; `active=false` on pointerup.

Label-less scrub: only fires when `e.clientX - rect.left <= 16`; otherwise the click
is treated as text editing. While hovering the zone (not dragging) the cursor is set
to `ew-resize`, else cleared. `e.preventDefault()` on pointerdown to block focus/selection.

### Keyboard
- `Enter` -> `commitValue(localValue)` then `blur()`.
- `ArrowUp`/`ArrowDown` -> `e.preventDefault()`, ignore if value is non-numeric keyword
  (e.g. "normal"), else `step = shiftKey ? baseStep*10 : baseStep`, apply same
  precision/clamp/unit logic as scrub. Updates localValue + onChange.

### Commit / unit inference
`commitValue` -> `clampCssValue(inferCssUnit(val, value||"", prop), min, max)`.
`inferCssUnit` (`round-css-value.ts`): a bare number gets a unit inferred from the
previous value's unit if it's a valid CSS unit, else `px`; unitless props
(`opacity, z-index, font-weight, flex-grow, flex-shrink, order, orphans, widows,
columns, column-count, tab-size`) never get a unit. `onBlur` only commits if resolved
value differs from `value`.

### Focus
`onFocus` selects all text (`e.target.select()`).

### Variable-applied transformation
When `variableMatch` is set: input is `readOnly`, all edit handlers are removed,
clicking opens the variable picker (`varPickerRef.current?.()`), wrapper gets class
`retune-prop-variable-applied`. The `<VariableAction>` slot (right 32px) shows hexagon
("Add variable") when tokens are available, or unlink icon when applied.

### Styling - `.retune-prop` (shared by NumberInput & ShorthandInput)
```css
.retune-prop {
  display:flex; align-items:center; gap:0; height:32px; padding:0;
  border-radius:8px; background:var(--retune-surface-hover); border:none;
  min-width:0; overflow:visible; position:relative;
  transition:background-color 0.15s ease;
}
.retune-prop:hover:not(.retune-prop-variable-applied){ background:var(--retune-border); }
.retune-prop:focus-within:not(.retune-prop-variable-applied){
  outline:1px solid var(--retune-border); outline-offset:-1px;
  background:var(--retune-surface-hover);
}
.retune-prop-label {
  position:absolute; left:0; width:32px; height:32px;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:450; letter-spacing:-0.005em;
  color:var(--retune-text); flex-shrink:0; user-select:none;
  cursor:ew-resize; z-index:1;
}
.retune-prop-input {
  flex:1; min-width:0; width:100%; height:100%; border:none; background:transparent;
  font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit;
  color:var(--retune-text); outline:none; padding:0 0 0 32px;   /* 32px left = label well */
}
.retune-prop-input:first-child { padding-left:12px; }            /* no label -> 12px */
.retune-prop-input::selection { background:var(--retune-blue-bg); color:var(--retune-text); }
```
Label-less variant also sets inline `style={{ paddingLeft: 8 }}` on the input.
Placeholder default is an en-dash glyph (U+2013) unless `placeholder` prop is given.

### Variable-applied styling
```css
.retune-prop-variable-applied { background:var(--retune-surface); outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-prop-variable-applied:hover { outline-color:var(--retune-border-hover); }
.retune-prop-variable-applied .retune-prop-input,
.retune-prop-variable-applied .retune-prop-label { cursor:pointer; }
```

---

## 2. SliderInput (`ui/slider-input.tsx`)

Horizontal **fill-track** slider with label + live value, hover/drag-revealed handle
and tick indicators. Equivalent to portfolio editor's `LabelSlider`.

### Props
`label: string; prop; value; min: number; max: number; step?=0.01; onChange`.

### Math
```js
numValue = parseFloat(localValue) || 0;
range = max - min;
fillPercent = range>0 ? clamp01((numValue-min)/range)*100 : 0;
precision = step<1 ? Math.max(0,-Math.floor(Math.log10(step))) : 0;
```
`computeFromX(clientX)`: ratio from track rect, `raw = min + ratio*range`,
snap `raw = Math.round(raw/step)*step`, clamp `[min,max]`, `Number(raw.toFixed(precision))`.

### Pointer
`onPointerDown`: `preventDefault`, `setIsDragging(true)`, `setPointerCapture`, jump to
value at X. `onPointerMove`: if dragging, update from X. `onPointerUp`: stop drag.

### Keyboard (element is `role="slider"`, `tabIndex=0`)
`ArrowLeft`/`ArrowDown` -> `-step` clamped to min; `ArrowRight`/`ArrowUp` -> `+step` clamped
to max; both `toFixed(precision)`.

### Display
`displayValue = step>=1 ? String(Math.round(numValue)) : numValue.toFixed(precision)`.
`showDetails = isHovered || isDragging` -> controls handle + tick visibility.
Hover state: `onPointerEnter` sets hovered; `onPointerLeave` clears **only if not dragging**.

### Tick indicators (`indicators`, memoised)
"Nice number" interval algorithm over `range/8`:
```js
rawInterval = range/8;
mag = 10**Math.floor(Math.log10(rawInterval));
normalized = rawInterval/mag;
nice = normalized<1.5?1 : normalized<3.5?2 : normalized<7.5?5 : 10;
interval = nice*mag;
// positions v from ceil(min/interval)*interval up to max, push frac=(v-min)/range
// only if 0.03 < frac < 0.97
```
Rendered as `.retune-slider-indicator` at `left:${pos*100}%`.

### Handle position
`.retune-slider-handle` `left: max(4px, calc(${fillPercent}% - 4px))`.

### ARIA
`role="slider" aria-valuemin/max/now aria-label={label}`.

### Styling
```css
.retune-slider {
  position:relative; height:32px; border-radius:8px;
  background:var(--retune-surface-hover); cursor:ew-resize; user-select:none;
  overflow:hidden; transition:background-color 0.15s ease;
}
.retune-slider:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-slider-fill { position:absolute; inset:0; right:auto; background:var(--retune-surface-active); pointer-events:none; }
.retune-slider-indicator { position:absolute; top:50%; transform:translateY(-50%); width:1px; height:4px; border-radius:1px; background:var(--retune-border); pointer-events:none; }
.retune-slider-handle { position:absolute; top:50%; transform:translateY(-50%); width:2px; height:16px; border-radius:1px; background:var(--retune-text); pointer-events:none; margin-left:-1px; }
.retune-slider-labels { position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 8px; pointer-events:none; overflow:hidden; white-space:nowrap; }
.retune-slider-label { font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-secondary); }
.retune-slider-value { font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); }
```

---

## 3. SegmentedControl (`ui/segmented-control.tsx`)

Generic icon/text toggle group with an **iOS-style sliding pill**. Used for enum
choices (e.g. flex direction). Generic over `T extends string`.

### Props
`options: SegmentedOption<T>[]` where `SegmentedOption = { value:T; icon?:ReactNode; label?:string; disabled?:boolean }`; `value?:T; onChange:(value:T)=>void; disabled?=false`.

### Pill animation
`updatePill()` (in `useLayoutEffect`): finds selected index; if none -> `pill.opacity=0`.
Else measures the selected `.retune-segmented-item` button rect, sets
`pill.style.width = btnRect.width px` and `transform: translateX(offsetX px)`
(offset = `btnRect.left - containerRect.left`). **First render skips the transition**
(`transition:"none"`, force reflow via `pill.offsetHeight`, then restore). Subsequent
changes animate via CSS transition.

### Behavior
Local optimistic `value` state; synced from prop only when the prop itself changes.
`handleClick` sets local + calls `onChange`. Disabled options pass `disabled` and a
`disabled` class. When an option has BOTH icon and label, it's wrapped in a `<Tooltip content={label}>`; label-only renders text in `.retune-segmented-text`.
ARIA: `aria-pressed={isSelected}`, `aria-label={opt.label}`.

### Styling
```css
.retune-segmented { display:flex; position:relative; height:32px; background:var(--retune-surface-hover); border-radius:8px; overflow:hidden; flex:1; }
.retune-segmented-pill {
  position:absolute; top:0; left:0; height:100%; border-radius:8px;
  background:var(--retune-surface); border:1px solid var(--retune-border); box-sizing:border-box;
  transition:transform 200ms cubic-bezier(0.77,0,0.175,1); will-change:transform;
  pointer-events:none; z-index:0;
}
.retune-segmented-item {
  display:flex; align-items:center; justify-content:center; flex:1; height:32px;
  border:none; border-radius:8px; background:transparent; cursor:pointer; padding:0;
  color:var(--retune-text); transition:color 150ms ease; position:relative; z-index:1;
}
.retune-segmented-item:hover:not(.disabled){ color:var(--retune-text-secondary); }
.retune-segmented-item.selected { color:var(--retune-text); }
.retune-segmented-item.disabled { opacity:0.3; cursor:not-allowed; }
.retune-segmented-item svg { width:24px; height:24px; display:block; }
.retune-segmented-text { font-size:11px; font-weight:500; letter-spacing:-0.005em; }
```
Disabled (whole control): inline `style={{ opacity:0.4, pointerEvents:"none" }}`.
NOTE: pill transition is `200ms cubic-bezier(0.77,0,0.175,1)`; item color is `150ms ease`.

---

## 4. SelectInput (`ui/select-input.tsx`)

Dropdown `<select>` replacement, label prefix + chevron, macOS-style positioning
(selected item aligns with the trigger). Renders options via `DropdownMenu`.

### Props
`label?; prop; value; options: string[]; onChange; isChanged?; onReset?`.

### Display
`sentenceCase(s)` = uppercase first char + rest with `-` -> spaces. Options mapped to
`{ value:opt, label:sentenceCase(opt) }`. `useScrollLock(open)` while open.

### Open positioning
`openDropdown` reads trigger rect, `selectedIndex = max(0, options.indexOf(localValue))`,
`pos = calcMenuPosition(rect, selectedIndex, options.length)` (see section 11), opens, sets
highlight to selectedIndex. Anchor div is `position:fixed`, placed with
`top: menuPos.top; right: window.innerWidth - menuPos.left - menuPos.width; minWidth: menuPos.width`.

### Close
Outside-pointerdown listener attached to the **root node** (ShadowRoot or Document)
using `e.composedPath()` containment check.

### Keyboard (on the button)
`Enter`/`Space` -> select highlighted if open+highlighted else toggle; `Escape` -> close;
`ArrowDown` -> open if closed, else move highlight down (clamped); `ArrowUp` -> move up
(only when open).

### Styling
```css
.retune-select { position:relative; min-width:0; overflow:visible; }
.retune-select-button {
  display:flex; align-items:center; width:100%; height:32px; border-radius:8px;
  background:var(--retune-surface-hover); border:none; cursor:pointer; font-family:inherit;
  padding:0; transition:background-color 0.15s ease; position:relative;
}
.retune-select-button:hover { background:var(--retune-border); }
.retune-select-button:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-select-label { position:absolute; left:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-tertiary); flex-shrink:0; }
.retune-select-value { flex:1; min-width:0; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); text-align:left; padding-left:32px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.retune-select-chevron { width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:var(--retune-text-secondary); flex-shrink:0; }
.retune-select-dropdown-anchor { position:fixed; z-index:2147483647; width:max-content; }
```
Label-less: `.retune-select-value` gets inline `paddingLeft:8`. DropdownMenu rendered
with `showCheckmark`.

---

## 5. ComboInput (`ui/combo-input.tsx`)

Number input + dropdown of keyword presets (e.g. `auto`, `fit-content`). Supports typed
numeric values w/ units AND selecting CSS keywords. Scrub-to-adjust like NumberInput.

### Props
`label?; prop; value; options: ComboOption[]` (`{value,label}`); `onChange`; variable
props; isChanged/onReset.

### Display value
If `localValue` matches an option's `value`, show that option's `label`, else show
`localValue` (already `roundCssValue`-d).

### State sync
Synced from props but skipped while **editing** (`editingRef`, set true on focus) OR
during a drag preview (`previewActiveRef`). Subscribes to `usePreviewValue`.

### Scrub math (differs from NumberInput - integer delta, no step)
```js
const delta = Math.round(e.clientX - scrubRef.current.startX);  // 1px = 1
const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
const raw = scrubRef.current.startVal + delta;
// clamp to 0 unless prop is margin/top/right/bottom/left/indent (those may go negative):
const clamped = raw<0 && !prop.includes("margin") && !prop.includes("top")
  && !prop.includes("right") && !prop.includes("bottom") && !prop.includes("left")
  && !prop.includes("indent") ? 0 : raw;
```
Label-less scrub identical, gated by `SCRUB_ZONE = 16`; cursor `ew-resize` in zone.

### Typing
`onChange` (input): sets localValue; if typed text matches an option label/value
(case-insensitive) commit immediately. `onBlur`: `inferCssUnit` the value, commit if
changed, clear `editingRef`.

### Keyboard
`Enter`: if dropdown open + highlighted -> pick that option (or open variable picker if
it's the `__add_variable__` sentinel) ; else infer unit, commit, blur. `Escape`: close
dropdown. `ArrowDown`/`ArrowUp`: if open, move highlight (clamped); **if closed, act as
numeric stepper** - `step = shiftKey ? 10 : 1`, `${num+delta}${unit}`.

### Variables
`hasVariablesForProperty(property||prop)` -> if available and not applied, append a
`{ value:"__add_variable__", label:"Add variable", separatorBefore:true }` option.
Variable picker opened via `claimDialog/releaseDialog` singleton, rendered through
`createPortal` into the shadow-root `[data-retune-container]`. Variable-applied branch
renders a `readOnly` input (class `retune-combo-variable-applied`), an inline 24x24
unlink SVG (native pointerdown), and hides the chevron trigger.

### Styling
```css
.retune-combo { display:flex; align-items:center; height:32px; min-width:0; overflow:visible; position:relative; gap:1px; }
.retune-combo-label { position:absolute; left:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-tertiary); flex-shrink:0; user-select:none; cursor:ew-resize; z-index:1; }
.retune-combo-input {
  flex:1; min-width:0; height:100%; border:none; background:var(--retune-surface-hover);
  border-radius:8px 0 0 8px; font-size:11px; font-weight:450; letter-spacing:-0.005em;
  font-family:inherit; color:var(--retune-text); outline:none; padding:0 0 0 32px;
  transition:background-color 0.15s ease;
}
.retune-combo-input:hover:not(.retune-combo-variable-applied){ background:var(--retune-border); }
.retune-combo-input:focus { outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-combo-variable-applied:focus { outline:1px solid var(--retune-border-hover); outline-offset:-1px; }
.retune-combo-trigger {
  width:32px; height:32px; display:flex; align-items:center; justify-content:center;
  background:var(--retune-surface-hover); border-radius:0 8px 8px 0; border:none; cursor:pointer;
  color:var(--retune-text-secondary); flex-shrink:0; padding:0;
  transition:background-color 0.15s ease, color 0.12s ease;
}
.retune-combo-trigger:hover { background:var(--retune-border); color:var(--retune-text); }
.retune-combo-dropdown-anchor { position:fixed; z-index:2147483647; }
```
Note the split shape: input is `8px 0 0 8px`, trigger is `0 8px 8px 0`, joined by `gap:1px`.
Variable-applied combo: white bg + 1px border, `border-radius:8px`, trigger hidden.

---

## 6. TextInput (`ui/text-input.tsx`)

Plain free-form text input for complex CSS values (e.g. `grid-template-columns/rows`)
where scrub makes no sense. NO label, NO scrub, NO units.

### Behavior
`localValue` synced from prop. `onChange` updates local only. **Commit on blur**
(`onChange(prop, localValue.trim())`) and on `Enter` (commit + blur). `spellCheck=false`.

### Styling
```css
.retune-text-input { display:flex; align-items:center; height:32px; border-radius:8px; background:var(--retune-surface-hover); min-width:0; overflow:hidden; position:relative; transition:background-color 0.15s ease; }
.retune-text-input:hover { background:var(--retune-border); }
.retune-text-input:focus-within { outline:1px solid var(--retune-border); outline-offset:-1px; background:var(--retune-surface-hover); }
.retune-text-input-field { flex:1; min-width:0; width:100%; height:100%; border:none; background:transparent; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); outline:none; padding:0 8px; }
.retune-text-input-field::selection { background:var(--retune-blue-bg); color:var(--retune-text); }
```

---

## 7. ShorthandInput (`ui/shorthand-input.tsx`)

Multi-property field (e.g. padding H/V, border-radius corners). Displays a single
merged value when all props match, else comma-separated individual values.

### Props
`label?; props: string[]; values: string[]; onChange; placeholder?; min?; max?;`
variable props; isChanged/onReset.

### Display
`computeDisplay(values)`: round each; if all equal -> the single value, else
`rounded.join(", ")`. State sync compares `values.join("\0")`.

### Scrub (drags ALL values equally)
`startVals = values.map(parseFloat)` (abort if any NaN). Move:
```js
const delta = Math.round(e.clientX - scrubRef.current.startX);
const unit = values[0]?.match(/[a-z%]+$/i)?.[0] || "px";   // default px here
const newVals = startVals.map(v => `${clampNum(v+delta, min, max)}${unit}`);
// setLocalValue(computeDisplay(newVals)); props.forEach((p,i)=>onChange(p,newVals[i]));
```
Label-less zone scrub identical (`SCRUB_ZONE=16`).

### Commit parsing
`commitValue(val)`: trim; empty -> revert to display. Split on `,` (or whitespace if no
comma). 1 part -> apply to all props (`inferCssUnit` + clamp). >1 part -> map parts to
props, **cycling** (`parts[i % parts.length]`).

### Keyboard
`Enter` -> commit + blur. `ArrowUp`/`ArrowDown` -> `step = shiftKey?10:1`; parse from
`localValue` (not stale `values`); per-part: skip non-numeric parts (e.g. `auto`) keeping
them unchanged, else `${clampNum(num+delta,min,max)}${unit}` (unit default `px`).

### Styling / variables
Reuses `.retune-prop` / `.retune-prop-label` / `.retune-prop-input` (see section 1) and
`<VariableAction>` with `relatedProperties={props}`.

---

## 8. ConstraintsInput (`ui/constraints-input.tsx`)

Visual pin box for absolute positioning: 4 edge `NumberInput`s (T/R/B/L) around a
clickable pin diagram with a center-align toggle. Pin/centered state is owned by the
**parent** (controlled).

### Props
`top/right/bottom/left: string|undefined; pins: PinState{top,right,bottom,left:boolean};
centered: boolean; onChange; onPinChange(side, pinned); onCenterChange(centered)`.

### `togglePin(side)` logic
- `onPinChange(side, !wasPinned)`.
- If currently `centered`: clears centered + `onChange("transform","none")`.
- Un-pinning -> `onChange(side, "auto")`.
- Pinning, when current value is empty/`auto` -> `onChange(side, "0px")`.

### `handleCenterClick` logic (3-way)
- If `centered` -> clear: unpin all 4, set all 4 to `auto`, `transform:none`.
- Else if `allPinned` -> center: `top:50% left:50% right:auto bottom:auto`,
  `transform:translate(-50%, -50%)`, `centered=true`.
- Else (partial) -> pin remaining sides, seed `0px` where empty/auto.

### PinLine SVG
16x16 svg; vertical sides draw a vertical line `x=8 y1=3->y2=13`, horizontal sides
`y=8 x1=3->x2=13`. `strokeWidth=2 strokeLinecap=round`, stroke `#3b82f6` when pinned
else `#d6d3d1`. (Note: these are **hard-coded hex**, not theme tokens.) Pins render
`pinned={!centered && pins.<side>}`.

### Styling
```css
.retune-constraints { display:flex; gap:4px; align-items:center; width:100%; }
.retune-constraints-side { flex:1; min-width:0; display:flex; align-items:center; }
.retune-constraints-center { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; align-items:stretch; }
.retune-pin-box { position:relative; background:var(--retune-surface-hover); border-radius:8px; width:100%; height:64px; }
.retune-pin-line { position:absolute; display:flex; align-items:center; justify-content:center; padding:0; border:none; background:transparent; cursor:pointer; width:16px; height:16px; }
.retune-pin-line.top { left:50%; transform:translateX(-50%); top:2px; }
.retune-pin-line.right { left:calc(75% - 2px); top:24px; }
.retune-pin-line.bottom { left:50%; transform:translateX(-50%); bottom:2px; }
.retune-pin-line.left { left:calc(25% - 14px); top:24px; }
.retune-pin-center-btn { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:24px; height:24px; background:var(--retune-surface); border:1px solid var(--retune-border); border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.retune-pin-center-btn:hover { border-color:var(--retune-border-hover); }
.retune-pin-center-dot { width:4px; height:4px; border-radius:50%; background:#3b82f6; }
```

---

## 9. AlignmentGrid (`ui/alignment-grid.tsx`)

3x3 visual flex alignment picker driving `justifyContent` + `alignItems`. Click a cell
to set; **double-click toggles `space-between`**; arrow keys navigate; icons are
flow-aware (vertical vs horizontal flex direction).

### Props
`justifyContent; alignItems; flexDirection; onChange`.

### Coordinate model
`COORDS_TO_POSITION[row][col]` maps to 9 named positions (`top-left` .. `bottom-right`).
`getFlow(flexDirection)` = `flexDirection.startsWith("column") ? "vertical" : "horizontal"`.
Browser-resolved values normalised: `toJustifyIdx`/`toAlignIdx` map `center->1`,
`flex-end|end->2`, everything else (`flex-start/start/normal/stretch`) ->0.

`cssToPosition`: for **vertical** flow `row=justify(main)`, `col=align(cross)`; for
**horizontal** flow `row=align(cross)`, `col=justify(main)`. `positionToCss` inverts it
using `JUSTIFY_VALUES = ALIGN_VALUES = ["flex-start","center","flex-end"]`.

### space-between
`isSpaceBetween = justifyContent === "space-between"`. Canonical SB positions only vary
on the cross axis: `SB_VERTICAL_CANONICAL = [center-left, center-center, center-right]`,
`SB_HORIZONTAL_CANONICAL = [top-center, center-center, bottom-center]`. `activeGroup` =
the cross-axis column (vertical) or row (horizontal).

### Interactions
- **Click** (`handleClick`): in SB mode set only `alignItems = ALIGN_VALUES[crossIdx]`;
  otherwise set both `justifyContent` + `alignItems` from `positionToCss(row,col,flow)`.
- **Double-click** (`handleDoubleClick`): if NOT SB -> `onChange("justifyContent","space-between")`.
  If already SB -> exit SB using the clicked cell's row/col (found by indexing the
  `.retune-alignment-cell`s within `.retune-alignment-grid`).
- **Keyboard** (`role="grid" tabIndex=0`): in SB mode only the cross-axis arrows move
  (Left/Right for vertical, Up/Down for horizontal); else all 4 arrows move within
  `[0,2]` clamped and apply css.
- **Hover**: tracks `hoveredPosition` (normal) or `hoveredGroup` (SB) for preview icons.

### Icons (all inline SVG, 16x16, hard-coded colors)
`BLUE = "#0D99FF"`, `GRAY = "#a8a29e"`. Selected cell -> flow-appropriate position icon
in BLUE; hovered -> same icon in GRAY; otherwise `IconDot` (faint, `fillOpacity 0.3`).
Distinct icon sets: vertical-flow `IconPositionLeft/CenterH/Right`, horizontal-flow
`IconPositionTop/CenterV/Bottom`, plus space-between bar icons
(`IconSBBarH/HLeft/HCenter/HRight`, `IconSBBarV/VTop/VCenter/VBottom`). Per-cell tooltip
from `CELL_TOOLTIPS["row-col"]` ("Align top left" .. "Align bottom right"), `side="bottom" delay=600`.

### Styling
```css
.retune-alignment-grid { display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); background:var(--retune-surface-hover); border-radius:8px; width:100%; height:72px; outline:none; }
.retune-alignment-grid:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-alignment-cell { display:flex; align-items:center; justify-content:center; border:none; background:transparent; padding:0; cursor:pointer; overflow:hidden; }
.retune-alignment-cell:hover { color:var(--retune-text); }
```

---

## 10. GridPicker (`ui/grid-picker.tsx`)

Visual CSS-grid size selector. Rested = compact mini-grid preview with `N x M` label;
expanded = 10x10 hover-to-preview dialog. Emits `gridTemplateColumns/Rows` as
`repeat(N, 1fr)`.

### Props / parsing
`columns: number; rows: number; onChange`. `parseGridCount(template)` (exported): `none`
or empty -> 0; matches `repeat(\d+` -> that count; else counts space-separated tracks.

### Behavior
`MAX_COLS = MAX_ROWS = 10`. `displayCols/Rows = max(1, columns||1)`. Open toggled by
clicking the preview; `useScrollLock(open)`; outside-pointerdown close via root node +
`composedPath`. Hovering a cell sets `hoverCol/hoverRow` and `isHovering`; dialog header
shows `previewCols x previewRows` (hover values when hovering, else current). Clicking the
grid (`handleSelect`) commits `repeat(hoverCol,1fr)` / `repeat(hoverRow,1fr)` if both >0,
then closes. Cell classes: `selected` when (not hovering) `col<=columns && row<=rows`;
`preview` when hovering `col<=hoverCol && row<=hoverRow`.

### Styling
```css
.retune-grid-picker-wrap { position:relative; }
.retune-grid-picker-preview { display:flex; align-items:center; gap:8px; width:100%; height:72px; padding:4px; background:var(--retune-surface-hover); border:1px solid var(--retune-border); border-radius:8px; cursor:pointer; box-sizing:border-box; }
.retune-grid-picker-preview:hover { background:#eeeceb; }   /* hard-coded */
.retune-grid-picker-mini { display:grid; gap:2px; flex:1; height:100%; position:relative; }
.retune-grid-picker-mini-cell { background:var(--retune-surface); border-radius:2px; min-width:0; min-height:0; }
.retune-grid-picker-label { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:11px; font-family:ui-monospace, monospace; color:var(--retune-text-secondary); white-space:nowrap; pointer-events:none; }
.retune-grid-picker-dialog { position:absolute; top:100%; left:0; margin-top:4px; padding:8px; background:var(--retune-surface); border:1px solid var(--retune-border); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.12); z-index:100; display:flex; flex-direction:column; gap:6px; }
.retune-grid-picker-dialog-header { font-size:11px; font-family:ui-monospace, monospace; color:var(--retune-text-secondary); text-align:center; }
.retune-grid-picker-grid { display:grid; grid-template-columns:repeat(10,18px); grid-template-rows:repeat(10,18px); gap:2px; cursor:pointer; }
.retune-grid-picker-cell { border-radius:2px; background:var(--retune-border); }
.retune-grid-picker-cell.selected { background:#3b82f6; }   /* hard-coded */
.retune-grid-picker-cell.preview  { background:#93c5fd; }   /* hard-coded */
```
Mini-grid uses inline `gridTemplateColumns/Rows: repeat(displayCols/Rows, 1fr)`.

---

## 11. DropdownMenu (`ui/dropdown-menu.tsx`) + menu positioning

Figma-style **dark** dropdown (stone-900 `#1c1917` bg even in light mode). Used by
SelectInput, ComboInput, FontInput, etc. `forwardRef<HTMLDivElement>`.

### Option model
```ts
DropdownMenuOption { value; label; disabled?; shortcut?; separatorBefore?; headingBefore?; }
```
Props: `options; value?; highlightedIndex?=-1; onSelect; onHighlight?; onItemHover?;
showCheckmark?=true; style?; minWidth?; initialScrollTop?; renderLabel?`.

### Highlight
Controlled if `onHighlight` provided (uses `highlightedIndex`), else internal state.
`onMouseEnter` -> highlight index + `onItemHover(option)`; `onMouseLeave` -> highlight -1
+ `onItemHover(null)`.

### Scroll overflow indicators
`SCROLL_SPEED = 150` px/sec. `updateOverflow` toggles top/bottom fade arrows based on
`scrollTop` and `scrollTop+clientHeight < scrollHeight-1`. Hovering an arrow starts a
`requestAnimationFrame` auto-scroll (`dt` capped at 0.05s); leaving stops it; rAF
cancelled on unmount. `initialScrollTop` applied in `useLayoutEffect` for macOS-style
selected-item alignment. Checkmark uses `<Check size={16}>`, arrows `<ChevronUp/Down size={20}>`.

### Styling
```css
.retune-menu-wrapper { position:relative; width:fit-content; min-width:max(120px,100%); border-radius:12px; overflow:hidden; user-select:none; box-shadow:0 0 0.5px rgba(0,0,0,0.12), 0 10px 16px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.15); }
.retune-menu-scroll { max-height:400px; overflow-y:auto; overflow-x:hidden; padding:6px 0; background:#1c1917; scrollbar-width:none; overscroll-behavior:none; }
.retune-menu-scroll::-webkit-scrollbar { display:none; }
.retune-menu-separator { height:16px; display:flex; align-items:center; }
.retune-menu-separator-line { width:100%; height:1px; background:#292524; }
.retune-menu-heading { padding:4px 14px; font-size:11px; font-weight:450; letter-spacing:-0.005em; line-height:16px; color:rgba(255,255,255,0.4); }
.retune-menu-item-wrap { padding:0 6px; }
.retune-menu-item { position:relative; width:100%; display:flex; align-items:center; min-height:28px; padding:4px 24px 4px 8px; border:none; background:transparent; border-radius:5px; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:#fff; text-align:left; cursor:pointer; transition:background-color 0.08s ease; }
.retune-menu-item.has-check { padding-left:28px; }
.retune-menu-item.highlighted { background:rgba(255,255,255,0.1); }
.retune-menu-item.selected { color:#fff; }
.retune-menu-item.disabled { opacity:0.5; cursor:not-allowed; }
.retune-menu-check { position:absolute; left:4px; top:50%; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; color:#fff; }
.retune-menu-item-label { line-height:16px; white-space:nowrap; }
.retune-menu-item-shortcut { margin-left:auto; padding-left:16px; color:rgba(255,255,255,0.7); white-space:nowrap; }
.retune-menu-empty { padding:4px 16px; font-size:11px; color:rgba(255,255,255,0.4); }
.retune-menu-scroll-indicator { position:absolute; left:0; right:0; z-index:10; display:flex; align-items:center; justify-content:center; height:24px; background:#1c1917; cursor:default; color:#fff; }
.retune-menu-scroll-indicator.top { top:0; border-radius:12px 12px 0 0; }
.retune-menu-scroll-indicator.bottom { bottom:0; border-radius:0 0 12px 12px; }
```

### `menu-position.ts` (macOS selected-item alignment)
Constants: `ITEM_HEIGHT = 28`, `MENU_PADDING_Y = 6`, `VIEWPORT_MARGIN = 8`,
`MAX_MENU_HEIGHT = 400`.
```js
selectedItemOffset = 6 + selectedIndex*28;
menuContentHeight  = 6*2 + optionCount*28;
menuHeight = min(menuContentHeight, 400);
triggerCenter = triggerRect.top + triggerRect.height/2;
idealTop = triggerCenter - selectedItemOffset - 28/2;
clampedTop = clamp(idealTop, 8, vh-8-menuHeight);
scrollTop  = clamp(selectedItemOffset - (triggerCenter-clampedTop-14), 0, maxScrollTop);
// returns { top:clampedTop, left:triggerRect.left, width:triggerRect.width, scrollTop }
```

---

## 12. Tooltip (`ui/tooltip.tsx`)

Dark tooltip with optional shortcut badge and a CSS caret. Portaled via
`useTooltipPortal()` context.

### Props / behavior
`content; shortcut?; side?="bottom"; sideOffset?=6; delay?=400; children`.
Show on `onPointerEnter` after `delay` ms (`setTimeout`); hide on `onPointerLeave` AND
on `onPointerDown` (clears timer). Trigger wrapper is `display:contents` so it has no
box - positioning measures `trigger.children[0]` (the first real child). Position
computed in `useLayoutEffect` after visible, clamped to viewport with 8px margins; caret
offset stored in CSS vars `--caret-x`/`--caret-y` for when the tooltip is clamped.

### Styling
```css
.retune-tooltip-trigger { display:contents; }
.retune-tooltip {
  position:fixed; z-index:2147483647; pointer-events:none; max-width:200px;
  border-radius:5px; background:#1e1e1e;
  box-shadow:0 0 0.5px rgba(0,0,0,0.15), 0 5px 12px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.1);
  padding:4px 8px; display:flex; align-items:center; gap:4px;
  font-size:11px; font-weight:500; line-height:16px; letter-spacing:-0.005em; white-space:nowrap;
  animation:retune-tooltip-in 150ms cubic-bezier(0.23,1,0.32,1) both;
}
.retune-tooltip::before { content:""; position:absolute; width:12px; height:6px; background:#1e1e1e; clip-path:polygon(50% 0%, 0% 100%, 100% 100%); }
/* caret per side: -bottom top:-6px; -top bottom:-6px rotate(180deg); -left right:-9px rotate(90deg); -right left:-9px rotate(-90deg) */
.retune-tooltip-text { color:#fff; min-width:0; flex:1; }
.retune-tooltip-shortcut { color:rgba(255,255,255,0.5); flex-shrink:0; }
@keyframes retune-tooltip-in { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
```
Tooltip bg `#1e1e1e` (distinct from the menu's `#1c1917`).

---

## 13. ChangeIndicator (`ui/change-indicator.tsx`)

Blue "modified" dot at the top-right corner of a changed input; clicking resets the
property (works with global undo/redo).

### Behavior
Renders `null` when `!isChanged`. Uses a **native `pointerdown`** listener (ref callback)
for Shadow-DOM compat: `stopPropagation`, `preventDefault`, then `onReset()`. Wrapped in
`<Tooltip content="Reset property" side="top" delay={200}>`.

### Styling
```css
.retune-change-dot { position:absolute; top:-8px; right:-8px; width:16px; height:16px; z-index:3; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.retune-change-dot-inner { width:6px; height:6px; border-radius:50%; background:var(--retune-blue); box-shadow:0 0 0 3px var(--retune-surface); pointer-events:none; }
```
(Header doc-comment says "top-left" but the CSS positions it top-right at `top:-8px; right:-8px`.)

---

## Cross-cutting supporting pieces

### `round-css-value.ts`
- `roundCssValue(val)`: rounds every decimal run to <=2 dp, strips trailing zeros
  (`1.20->1.2`, `12.00->12`). Pure-decimal strings handled separately.
- `inferCssUnit(input, prevValue, prop)`: bare number -> inherit prev unit if a valid CSS
  unit, else `px`; UNITLESS_PROPS never get a unit. `VALID_CSS_UNITS` set includes px, em,
  rem, %, vh/vw/vmin/vmax, ch/ex/cap/ic/lh/rlh, svh/lvh/dvh (+w), cm/mm/in/pt/pc/q,
  deg/rad/grad/turn, s/ms, fr.

### `use-preview-value.ts`
Subscribes an input element to the preview bridge by `prop`. During an active drag the
bridge writes straight to `el.value` (bypassing React) and sets `previewActiveRef=true`;
when preview ends, React takes over again. Number/Combo inputs use this to avoid React
re-render churn during scrub.

### `use-scroll-lock.ts`
Module-level ref-counted scroll lock (`lockCount`). On first lock: saves
`html.style.overflow`/`paddingRight`, sets `overflow:hidden`, and adds
`padding-right = scrollbarWidth` to prevent layout shift. Used by Select/Combo/GridPicker.

### `VariableAction` (`ui/variable-action.tsx`) - shared right-edge slot
Two visible states (icon hidden until parent hover): **available** = 24x24 hexagon icon
("Add variable"); **applied** = 24x24 unlink icon ("Unlink variable"). Renders nothing
when no variables exist for the property. Native pointerdown handler; opens
`VariableDialog` via `claimDialog/releaseDialog` singleton, portaled into the shadow-root
`[data-retune-container]`. CSS:
```css
.retune-variable-action { position:absolute; right:0; top:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:transparent; transition:color 0.15s ease; cursor:pointer; z-index:2; }
.retune-prop:hover .retune-variable-action:not(.retune-variable-unlink) { color:var(--retune-text-secondary); }
.retune-variable-action:hover:not(.retune-variable-unlink) { color:var(--retune-text) !important; }
```

### Icons used here (`ui/icons.tsx`, 24x24 viewBox unless noted)
- `Check` (16x16 viewBox, default size 16) - checkmark path, `fillOpacity 0.9`.
- `ChevronDown` / `ChevronUp` - chevrons centred in 24x24, `fillOpacity 0.9`.
Default icon display size is 32 (SVG scales 24x24 art natively).

---

## Open questions / port notes
1. **Hard-coded hex outside the token system** appears in: ConstraintsInput PinLine
   (`#3b82f6` / `#d6d3d1`) + center dot (`#3b82f6`), GridPicker (`#eeeceb` hover,
   `#3b82f6` selected, `#93c5fd` preview), AlignmentGrid (`BLUE #0D99FF`, `GRAY #a8a29e`).
   These do NOT follow light/dark theming. Decide whether Justify mirrors verbatim or
   tokenises them.
2. **Dark menus/tooltips are intentional in both themes** (`#1c1917` menu, `#1e1e1e`
   tooltip) - Figma-style. Confirm Justify wants the same always-dark popovers.
3. `z-index: 2147483647` is used for fixed dropdown anchors and tooltips to escape Shadow
   DOM stacking - keep if Justify also renders inside a constrained container.
4. The **preview bridge** (`usePreviewValue`) and **variables/tokens** system are deep
   dependencies of Number/Combo/Shorthand inputs. If Justify ships without tokens first,
   these inputs degrade gracefully (VariableAction renders null, preview no-ops), but the
   scrub/keyboard/commit core is fully standalone.
5. Scrub sensitivity is fixed at **1px = 1 step** (Number) / **1px = 1 unit** (Combo/
   Shorthand) - no acceleration / shift-for-fine-grain on drag (shift only affects arrow
   keys). Confirm parity is desired.
</content>
