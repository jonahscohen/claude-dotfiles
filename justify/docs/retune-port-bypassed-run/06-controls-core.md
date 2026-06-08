# Retune Port Spec - 06: Controls Core (Input Primitives)

Source: `packages/overlay/src/ui/*.tsx` and `packages/overlay/src/overlay/overlay.css`.

This document specifies the core input primitives of Retune's element Design panel for 1:1 reproduction: NumberInput, SliderInput, SegmentedControl, SelectInput, ComboInput, TextInput, ShorthandInput, ConstraintsInput, AlignmentGrid, GridPicker, DropdownMenu, Tooltip, ChangeIndicator. Helper modules (`round-css-value.ts`, `menu-position.ts`), icon source (`icons.tsx`), and the `VariableAction`/`ChangeIndicator` shared sub-components are included where they pin values or behavior.

Everything renders inside a Shadow DOM `:host`. All `--retune-*` CSS variables and the host typography below are inherited by every component.

NOTE ON THE PLACEHOLDER CHARACTER: NumberInput, ComboInput, and ShorthandInput default their `placeholder` to a single EN DASH character, Unicode codepoint U+2013, written in source as the literal glyph inside the string `"placeholder || <U+2013>"`. Reproduce that exact U+2013 character; this spec writes it as `<U+2013>` to avoid a docs lint, but the real code uses the glyph itself.

---

## 0. Global host context (inherited by all controls)

From `overlay.css` `:host` (lines 1-120):

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
  user-select: none;
  -webkit-user-select: none;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
input, textarea, [contenteditable] { user-select: text; -webkit-user-select: text; }
```

### Token resolution (light mode default)

Primitives:
- `--retune-black: #1c1917`; `--retune-white: #ffffff`. Opacity ramp `--retune-black-{5..95}` / `--retune-white-{5..95}` via `color-mix(in srgb, <base> N%, transparent)`.
- Blue ramp: `--retune-blue-100 #F2F9FF`, `-200 #E5F4FF`, `-300 #BDE3FF`, `-400 #80CAFF`, `-500 #0D99FF`, `-600 #007BE5`, `-700 #0768CF`, `-800 #034AC1`, `-900 #093077`, `-1000 #0D193F`.
- Red ramp: `-500 #F24822` (others present but unused by these controls).

Semantic (light):
- `--retune-text` = black-90, `--retune-text-secondary` = black-70, `--retune-text-tertiary` = black-50, `--retune-text-disabled` = black-25.
- `--retune-surface` = `#ffffff`, `--retune-surface-hover` = black-5, `--retune-surface-active` = black-5, `--retune-input-bg` = black-5, `--retune-input-bg-hover` = black-10.
- `--retune-border` = black-10, `--retune-border-hover` = black-15, `--retune-border-subtle` = black-5, `--retune-shadow` = black-10.
- `--retune-blue` = blue-500 (`#0D99FF`), `--retune-blue-text` = blue-700 (`#0768CF`), `--retune-blue-bg` = blue-200 (`#E5F4FF`), `--retune-blue-bg-hover` = blue-100 (`#F2F9FF`).
- `--retune-always-white #ffffff`, `--retune-always-black #1c1917`.

Semantic (dark, `:host(.dark)`):
- text = white-90/70/50/25; surface = `color-mix(in srgb, #1c1917 95%, #fff)`; surface-hover/active/input-bg = white-5, input-bg-hover = white-10; border = white-10, border-hover = white-15, border-subtle = white-5, shadow = white-5; blue-text = blue-500; blue-bg = `color-mix(in srgb, blue-700 50%, transparent)`; blue-bg-hover = `color-mix(in srgb, blue-700 75%, transparent)`.

Note: several components hardcode `#3b82f6` (Tailwind blue-500) and `#93c5fd` rather than tokens; flagged per-component below. The DropdownMenu and Tooltip use a separate fixed dark palette (`#1c1917`, `#1e1e1e`, `#292524`, `#fff`) regardless of light/dark mode.

Reduced motion: a single `@media (prefers-reduced-motion: reduce)` block exists at css:3466 (outside the captured range); note its existence when porting animations.

---

## 1. NumberInput (`number-input.tsx`)

Numeric input with scrub-to-adjust. Wrapper class `retune-prop` (shared with ShorthandInput).

### Props
`label?: ReactNode`, `prop: string`, `value: string|undefined`, `placeholder?: string`, `onChange(prop,value)`, `min?: number`, `max?: number`, `step?: number` (default 1; shift = x10), `variableMatch?`, `property?`, `onVariableSelect?`, `onVariableApply?`, `onVariableUnlink?`, `isChanged?`, `onReset?`.

### DOM
```jsx
<div class="retune-prop[ retune-prop-variable-applied]">
  <ChangeIndicator isChanged onReset />          {/* renders null unless isChanged */}
  {label && <span class="retune-prop-label" ...scrub handlers>{label}</span>}
  <input class="retune-prop-input" style={label ? undefined : {paddingLeft:8}}
         value={localValue} placeholder={placeholder||"<U+2013>"} readOnly={!!variableMatch}
         spellCheck={false} ... />
  <VariableAction match property openPickerRef ... />
</div>
```
Placeholder default is EN DASH U+2013.

### CSS (css:1308-1369)
```css
.retune-prop {
  display:flex; align-items:center; gap:0; height:32px; padding:0;
  border-radius:8px; background:var(--retune-surface-hover); border:none;
  min-width:0; overflow:visible; position:relative;
  transition:background-color 0.15s ease;
}
.retune-prop:hover:not(.retune-prop-variable-applied) { background:var(--retune-border); }
.retune-prop:focus-within:not(.retune-prop-variable-applied) {
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
  color:var(--retune-text); outline:none; padding:0 0 0 32px;
}
.retune-prop-input:first-child { padding-left:12px; }   /* when no label */
.retune-prop-input::selection { background:var(--retune-blue-bg); color:var(--retune-text); }
.retune-prop-input:focus { outline:none; }
```
When `label` is absent, the input gets inline `paddingLeft:8` (overrides the 12px first-child rule via inline-style specificity). The label, when present, overlays the left 32px; input keeps its 32px left padding so text starts after the label.

### Display formatting - `roundCssValue` (`round-css-value.ts`)
Rounds every numeric run to max 2 decimals, strips trailing zeros (`1.20` to `1.2`, `12.00` to `12`). Pure decimals like `0.85` handled specially. Applied to incoming `value` for `localValue`.

### State sync
Mirrors `value` into `localValue` via render-phase compare (`prevValue`). During an active drag-preview (`previewActiveRef.current`, from `usePreviewValue`), incoming value is NOT overwritten.

### Scrub math (label drag)
- `pointerdown`: `parseFloat(localValue)`; abort if NaN. Capture `startX = clientX`, `startVal`, `setPointerCapture`.
- `pointermove`: `pixelDelta = clientX - startX`; `baseStep = step ?? 1`; `raw = startVal + Math.round(pixelDelta) * baseStep`. Precision = `baseStep < 1 ? Math.ceil(-log10(baseStep)) : 0`; round raw to that precision. Clamp to `[min,max]`. Re-append the unit (`localValue.match(/[a-z%]+$/i)[0] || ""`). `setLocalValue` + `onChange`.
- 1 pixel of horizontal movement = 1 step.

### Scrub from input left edge (no label)
`SCRUB_ZONE = 16` px. On `pointerdown` within 16px of input's left edge: `preventDefault`, begin scrub. On `pointermove` while not scrubbing: set `cursor: ew-resize` if within zone, else `""`. Same delta math.

### Keyboard
- Enter: `commitValue(localValue)` then blur.
- ArrowUp/Down (preventDefault): if value non-numeric (e.g. "normal") ignore. `step = shiftKey ? baseStep*10 : baseStep`; delta plus/minus step; same precision-round + clamp + unit reattach.

### Commit / blur
`commitValue` = `clampCssValue(inferCssUnit(val, value||"", prop), min, max)`. `inferCssUnit` (see section 15) appends a unit to bare numbers (prev value's unit, else `px`; unitless props get no unit). `clampCssValue` clamps numeric portion to `[min,max]` only if it changed. On blur, commit only if resolved differs from value.

### Focus
`onFocus` selects all text (`e.target.select()`).

### variableMatch (token applied)
When `variableMatch` set: adds class `retune-prop-variable-applied`, input is `readOnly`, click opens variable picker (`varPickerRef.current?.()`), and all scrub/focus/change/blur/keydown handlers are disabled. See variable-applied CSS (css:2711-2723): white surface, `outline:1px solid var(--retune-border)` (hover to border-hover), pointer cursor on input + label.

---

## 2. SliderInput (`slider-input.tsx`)

Horizontal fill-track slider with label + value text. Class `retune-slider`.

### Props
`label: string`, `prop`, `value`, `min`, `max`, `step?` (default `0.01`), `onChange`.

### DOM
```jsx
<div class="retune-slider" tabIndex={0} role="slider"
     aria-valuemin aria-valuemax aria-valuenow aria-label
     ...pointer/key handlers>
  <div class="retune-slider-fill" style={{width:`${fillPercent}%`}} />
  {showDetails && indicators.map(pos => <div class="retune-slider-indicator" style={{left:`${pos*100}%`}}/>)}
  {showDetails && <div class="retune-slider-handle" style={{left:`max(4px, calc(${fillPercent}% - 4px))`}}/>}
  <div class="retune-slider-labels">
    <span class="retune-slider-label">{label}</span>
    <span class="retune-slider-value">{displayValue}</span>
  </div>
</div>
```
`showDetails = isHovered || isDragging`. Indicators + handle only render while hovering/dragging.

### CSS (css:2056-2127)
```css
.retune-slider { position:relative; height:32px; border-radius:8px;
  background:var(--retune-surface-hover); cursor:ew-resize; user-select:none;
  overflow:hidden; transition:background-color 0.15s ease; }
.retune-slider:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-slider-fill { position:absolute; inset:0; right:auto;
  background:var(--retune-surface-active); pointer-events:none; }
.retune-slider-indicator { position:absolute; top:50%; transform:translateY(-50%);
  width:1px; height:4px; border-radius:1px; background:var(--retune-border); pointer-events:none; }
.retune-slider-handle { position:absolute; top:50%; transform:translateY(-50%);
  width:2px; height:16px; border-radius:1px; background:var(--retune-text);
  pointer-events:none; margin-left:-1px; }
.retune-slider-labels { position:absolute; inset:0; display:flex; align-items:center;
  justify-content:space-between; padding:0 8px; pointer-events:none;
  overflow:hidden; white-space:nowrap; }
.retune-slider-label { font-size:11px; font-weight:450; letter-spacing:-0.005em;
  color:var(--retune-text-secondary); }
.retune-slider-value { font-size:11px; font-weight:450; letter-spacing:-0.005em;
  font-family:inherit; color:var(--retune-text); }
```

### Value / geometry math
- `numValue = parseFloat(localValue) || 0`; `range = max-min`.
- `fillPercent = range>0 ? clamp01((numValue-min)/range)*100 : 0`.
- `precision = step<1 ? max(0, -floor(log10(step))) : 0`.
- `displayValue = step>=1 ? String(round(numValue)) : numValue.toFixed(precision)`.

### Drag math (`computeFromX`)
`ratio = clamp01((clientX - trackRect.left)/trackRect.width)`; `raw = min + ratio*range`; snap `raw = round(raw/step)*step`; clamp `[min,max]`; `Number(raw.toFixed(precision))`. On `pointerdown`: preventDefault, setDragging, pointer-capture, update immediately. `pointermove` updates while dragging. `pointerup` ends drag. `updateValue` writes `String(newNum)` (no unit).

### Keyboard
ArrowLeft/Down: `numValue - step` clamped to min, `.toFixed(precision)`. ArrowRight/Up: `+ step` clamped to max. All preventDefault.

### Tick indicators (`indicators` memo)
Computes "nice" tick positions: `rawInterval = range/8`; `mag = 10^floor(log10(rawInterval))`; `normalized = rawInterval/mag`; `nice = normalized<1.5?1 : <3.5?2 : <7.5?5 : 10`; `interval = nice*mag`. Walk `v` from `ceil(min/interval)*interval` to `max`, push fractional position `(v-min)/range` only when `0.03 < frac < 0.97`. Rendered as 1px x 4px marks.

### Hover
`onPointerEnter` sets hovered; `onPointerLeave` clears hovered only if not dragging.

---

## 3. SegmentedControl (`segmented-control.tsx`)

iOS-style toggle group with sliding pill. Class `retune-segmented`.

### Props
`options: {value, icon?, label?, disabled?}[]`, `value?`, `onChange(value)`, `disabled?` (default false).

### DOM
```jsx
<div class="retune-segmented" style={disabled ? {opacity:0.4, pointerEvents:"none"} : undefined}>
  <div class="retune-segmented-pill" />   {/* JS-positioned */}
  {options.map(opt =>
    <button class="retune-segmented-item[ selected][ disabled]"
            disabled={opt.disabled||disabled} aria-label={opt.label} aria-pressed={isSelected}>
      {opt.icon || <span class="retune-segmented-text">{opt.label}</span>}
    </button>
  )}
</div>
```
If an option has BOTH `icon` and `label`, the button is wrapped in `<Tooltip content={opt.label}>`.

### CSS (css:2129-2194)
```css
.retune-segmented { display:flex; position:relative; height:32px;
  background:var(--retune-surface-hover); border-radius:8px; overflow:hidden; flex:1; }
.retune-segmented-pill { position:absolute; top:0; left:0; height:100%;
  border-radius:8px; background:var(--retune-surface); border:1px solid var(--retune-border);
  box-sizing:border-box; transition:transform 200ms cubic-bezier(0.77,0,0.175,1);
  will-change:transform; pointer-events:none; z-index:0; }
.retune-segmented-item { display:flex; align-items:center; justify-content:center;
  flex:1; height:32px; border:none; border-radius:8px; background:transparent;
  cursor:pointer; padding:0; color:var(--retune-text);
  transition:color 150ms ease; position:relative; z-index:1; }
.retune-segmented-item:hover:not(.disabled) { color:var(--retune-text-secondary); }
.retune-segmented-item.selected { color:var(--retune-text); }
.retune-segmented-item.disabled { opacity:0.3; cursor:not-allowed; }
.retune-segmented-item svg { width:24px; height:24px; display:block; }
.retune-segmented-text { font-size:11px; font-weight:500; letter-spacing:-0.005em; }
```

### Pill positioning (JS, `updatePill` via `useLayoutEffect`)
Find selected option index; if `<0` set `pill.style.opacity="0"` and return. Else query `.retune-segmented-item` buttons, measure selected button rect, `offsetX = btnRect.left - containerRect.left`. Set `pill.opacity="1"`, `pill.width = btnRect.width+"px"`, `pill.transform = translateX(offsetX)`. On first render: disable transition (`transition:"none"`), set transform, force reflow (`pill.offsetHeight`), then re-enable (`transition:""`). Subsequent: just set transform (CSS transition animates). Local value synced from prop only when prop changes.

---

## 4. SelectInput (`select-input.tsx`)

Dropdown select with label prefix, macOS-style positioning. Class `retune-select`.

### Props
`label?`, `prop`, `value`, `options: string[]`, `onChange`, `isChanged?`, `onReset?`.

### DOM
```jsx
<div class="retune-select" ref>
  <ChangeIndicator .../>
  <button class="retune-select-button" onClick onKeyDown>
    {label && <span class="retune-select-label">{label}</span>}
    <span class="retune-select-value" style={label?undefined:{paddingLeft:8}}>{sentenceCase(localValue)}</span>
    <span class="retune-select-chevron"><ChevronDown/></span>
  </button>
  {open && menuPos &&
    <div class="retune-select-dropdown-anchor"
         style={{top:menuPos.top, right: window.innerWidth - menuPos.left - menuPos.width, minWidth:menuPos.width}}>
      <DropdownMenu options value highlightedIndex onSelect onHighlight initialScrollTop showCheckmark/>
    </div>}
</div>
```
`sentenceCase(s)` = uppercase first char + rest with `-` replaced by spaces. Options mapped to `{value:opt, label:sentenceCase(opt)}`.

### CSS (css:1984-2054)
```css
.retune-select { position:relative; min-width:0; overflow:visible; }
.retune-select-button { display:flex; align-items:center; width:100%; height:32px;
  border-radius:8px; background:var(--retune-surface-hover); border:none; cursor:pointer;
  font-family:inherit; padding:0; transition:background-color 0.15s ease; position:relative; }
.retune-select-button:hover { background:var(--retune-border); }
.retune-select-button:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-select-label { position:absolute; left:0; width:32px; height:32px;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:450; letter-spacing:-0.005em;
  color:var(--retune-text-tertiary); flex-shrink:0; }
.retune-select-value { flex:1; min-width:0; font-size:11px; font-weight:450;
  letter-spacing:-0.005em; color:var(--retune-text); text-align:left; padding-left:32px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.retune-select-chevron { width:32px; height:32px; display:flex; align-items:center;
  justify-content:center; color:var(--retune-text-secondary); flex-shrink:0; }
.retune-select-dropdown-anchor { position:fixed; z-index:2147483647; width:max-content; }
```
Note the anchor is positioned via inline `right` so it right-aligns to the trigger; `minWidth` = trigger width.

### Behavior
- `useScrollLock(open)` (locks page scroll while open).
- Open: measure trigger rect, `selectedIndex = max(0, options.indexOf(localValue))`, `calcMenuPosition` (see section 16), set menuPos + open + highlightedIndex.
- Outside-click close: listens for `pointerdown` on the shadow root / document; closes if `composedPath()` does not include container.
- Keyboard (on button): Enter/Space to (if open with highlight) select; else toggle open. Escape to close. ArrowDown to open or move highlight down (clamped). ArrowUp to move highlight up (clamped, only when open).
- Select to setLocal + onChange + close.

---

## 5. ComboInput (`combo-input.tsx`)

Number input + dropdown of preset keyword options. Class `retune-combo`. Supports both typed numeric/unit values and selecting CSS keywords (auto, fit-content, etc.).

### Props
`label?`, `prop`, `value`, `options: {value,label}[]`, `onChange`, `variableMatch?`, `property?`, `onVariableSelect?`, `onVariableApply?`, `onVariableUnlink?`, `isChanged?`, `onReset?`.

### DOM (default state)
```jsx
<div class="retune-combo" ref>
  <ChangeIndicator/>
  {label && <span class="retune-combo-label" ...scrub>{label}</span>}
  <input class="retune-combo-input" style={label?undefined:{paddingLeft:8}}
         value={displayValue} placeholder="<U+2013>" spellCheck={false} ...handlers/>
  <button class="retune-combo-trigger" aria-label="Toggle options"><ChevronDown/></button>
  {open && menuPos &&
    <div class="retune-combo-dropdown-anchor" style={{top:menuPos.top, left:menuPos.left, width:menuPos.width}}>
      <DropdownMenu options={allOptions} value highlightedIndex onSelect onHighlight initialScrollTop showCheckmark/>
    </div>}
  {pickerOpen && ...createPortal(<VariableDialog .../>, portalTarget)}
</div>
```
`displayValue`: if `localValue` matches an option value, show its label; else show `localValue`.

`allOptions`: if variables exist for the property (`hasVariablesForProperty`) and no variable is applied, append `{value:"__add_variable__", label:"Add variable", separatorBefore:true}`.

### DOM (variableMatch applied)
```jsx
<div class="retune-combo" ref>
  <ChangeIndicator/>
  {label && <span class="retune-combo-label">{label}</span>}
  <input class="retune-combo-input retune-combo-variable-applied" value={displayValue}
         readOnly onClick={openVariablePicker} spellCheck={false}/>
  <Tooltip content="Unlink variable" side="top" delay={300}>
    <span class="retune-variable-action retune-variable-unlink"><svg.../></span>
  </Tooltip>
  {pickerOpen && ...VariableDialog}
</div>
```
The unlink SVG is the verbatim 24x24 unlink glyph (see section 17). The combo-trigger is hidden in this state (css:2737-2739).

### CSS (css:2356-2438)
```css
.retune-combo { display:flex; align-items:center; height:32px; min-width:0;
  overflow:visible; position:relative; gap:1px; }
.retune-combo-label { position:absolute; left:0; width:32px; height:32px;
  display:flex; align-items:center; justify-content:center; font-size:11px;
  font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-tertiary);
  flex-shrink:0; user-select:none; cursor:ew-resize; z-index:1; }
.retune-combo-input { flex:1; min-width:0; height:100%; border:none;
  background:var(--retune-surface-hover); border-radius:8px 0 0 8px;
  font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit;
  color:var(--retune-text); outline:none; padding:0 0 0 32px;
  transition:background-color 0.15s ease; }
.retune-combo-input:hover:not(.retune-combo-variable-applied) { background:var(--retune-border); }
.retune-combo-input:focus { outline:1px solid var(--retune-border); outline-offset:-1px; }
.retune-combo-variable-applied:focus { outline:1px solid var(--retune-border-hover); outline-offset:-1px; }
.retune-combo-input::selection { background:var(--retune-blue-bg); color:var(--retune-text); }
.retune-combo-trigger { width:32px; height:32px; display:flex; align-items:center;
  justify-content:center; background:var(--retune-surface-hover); border-radius:0 8px 8px 0;
  border:none; cursor:pointer; color:var(--retune-text-secondary); flex-shrink:0; padding:0;
  transition:background-color 0.15s ease, color 0.12s ease; }
.retune-combo-trigger:hover { background:var(--retune-border); color:var(--retune-text); }
.retune-combo-trigger:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-combo-dropdown-anchor { position:fixed; z-index:2147483647; }
.retune-combo-variable-applied { background:var(--retune-surface); outline:1px solid var(--retune-border);
  outline-offset:-1px; cursor:pointer; border-radius:8px; }
```
The input is the left segment (radius `8px 0 0 8px`), trigger is the right segment (`0 8px 8px 0`), joined with `gap:1px`.

### Scrub math (differs from NumberInput - integer-only, no min/max clamp, gates negatives)
`pointermove`: `delta = Math.round(clientX - startX)`; `raw = startVal + delta`. Clamp to 0 minimum ONLY when the prop is NOT margin/top/right/bottom/left/indent (so size/gap cannot go negative; offsets can). Re-append unit. Same `SCRUB_ZONE=16` input-edge behavior as NumberInput.

### Typing / matching
`onChange`: setLocalValue; if typed text case-insensitively equals an option's label or value, fire `onChange(prop, match.value)` immediately.

### Keyboard
- Enter: if dropdown open + highlighted, select that option (if `__add_variable__` then close + open variable picker; else set+commit+close). Else `inferCssUnit` resolve + onChange + blur.
- Escape: close dropdown.
- ArrowDown/Up: if open, move highlight (clamped). If closed and value numeric: `step = shiftKey?10:1`, delta plus/minus step, reattach unit, set+onChange. (No min/max/precision here; plain integer step.)

### Blur
`editingRef=false`; `inferCssUnit(localValue, value||"", prop)`; set + onChange if changed.

### Variable picker / unlink
`openVariablePicker` anchors a `VariableDialog` portaled into the shadow-root `[data-retune-container]`. Unlink uses a native `pointerdown` listener (Shadow DOM compat). `claimDialog`/`releaseDialog` manage a singleton so only one dialog is open at a time.

---

## 6. TextInput (`text-input.tsx`)

Plain free-form CSS value input (used for grid-template-columns/rows etc.). Class `retune-text-input`.

### Props
`prop`, `value`, `onChange`.

### DOM
```jsx
<div class="retune-text-input">
  <input class="retune-text-input-field" value={localValue}
         onChange onBlur onKeyDown spellCheck={false}/>
</div>
```
No label, no scrub, no token support. Commits on blur and Enter (trims). Enter also blurs.

### CSS (css:2317-2354)
```css
.retune-text-input { display:flex; align-items:center; height:32px; border-radius:8px;
  background:var(--retune-surface-hover); min-width:0; overflow:hidden; position:relative;
  transition:background-color 0.15s ease; }
.retune-text-input:hover { background:var(--retune-border); }
.retune-text-input:focus-within { outline:1px solid var(--retune-border); outline-offset:-1px;
  background:var(--retune-surface-hover); }
.retune-text-input-field { flex:1; min-width:0; width:100%; height:100%; border:none;
  background:transparent; font-size:11px; font-weight:450; letter-spacing:-0.005em;
  font-family:inherit; color:var(--retune-text); outline:none; padding:0 8px; }
.retune-text-input-field::selection { background:var(--retune-blue-bg); color:var(--retune-text); }
```

---

## 7. ShorthandInput (`shorthand-input.tsx`)

Multi-property field (e.g. padding H/V, border-radius). Shares `retune-prop` wrapper + classes with NumberInput. Displays merged value when all props equal, comma-joined values when they differ.

### Props
`label?`, `props: string[]`, `values: string[]`, `onChange(prop,value)`, `placeholder?`, `min?`, `max?`, `variableMatch?`, `property?`, variable callbacks, `isChanged?`, `onReset?`.

### DOM
Identical structure to NumberInput (`retune-prop` > ChangeIndicator > optional `retune-prop-label` > `retune-prop-input` > VariableAction). `VariableAction` receives `relatedProperties={props}` and `property={property||props[0]}`.

### Display (`computeDisplay`)
`rounded = values.map(roundCssValue)`; if all equal then single value; else `rounded.join(", ")`.

### Scrub math (label or input-edge, `SCRUB_ZONE=16`)
On down: parse each value to number; abort if any NaN. Capture `startVals[]`. On move: `delta = Math.round(clientX-startX)`; unit = first value's unit or `"px"`; each new value = `clampNum(startVal+delta, min, max)+unit`; `onChange(prop_i, newVal_i)` for all props.

### Commit (`commitValue`)
Parse input: contains `,` then split on commas (trim, filter empty); else split on whitespace.
- 1 part then resolve once (`clampCssValue(inferCssUnit(...))`), apply to ALL props.
- N parts then map to props cycling with `parts[i % parts.length]`, resolve each, apply.

### Keyboard
Enter then commit + blur. ArrowUp/Down (preventDefault): `step = shiftKey?10:1`. Parse from `localValue` (not the prop, may be stale): comma-split or replicate single value across props. Per part: if numeric, `clampNum(num+delta, min,max)+unit` (unit from part or `"px"`); non-numeric parts (e.g. "auto") kept unchanged. Apply to all props.

### Blur
Commit only if `localValue !== computeDisplay(values)`.

CSS: reuses section 1's `retune-prop*` rules exactly.

---

## 8. ConstraintsInput (`constraints-input.tsx`)

Visual pin box with T/R/B/L NumberInputs + center toggle. Class `retune-constraints`.

### Props
`top, right, bottom, left: string|undefined`, `pins: {top,right,bottom,left: boolean}`, `centered: boolean`, `onChange(prop,value)`, `onPinChange(side,pinned)`, `onCenterChange(centered)`.

### DOM
```jsx
<div class="retune-constraints">
  <div class="retune-constraints-side"><NumberInput label="L" prop="left" value={left}/></div>
  <div class="retune-constraints-center">
    <NumberInput label="T" prop="top" value={top}/>
    <div class="retune-pin-box">
      <PinLine side="top"    pinned={!centered && pins.top}/>
      <PinLine side="right"  pinned={!centered && pins.right}/>
      <PinLine side="bottom" pinned={!centered && pins.bottom}/>
      <PinLine side="left"   pinned={!centered && pins.left}/>
      <button class="retune-pin-center-btn" aria-label={...}>
        {centered && <span class="retune-pin-center-dot"/>}
      </button>
    </div>
    <NumberInput label="B" prop="bottom" value={bottom}/>
  </div>
  <div class="retune-constraints-side"><NumberInput label="R" prop="right" value={right}/></div>
</div>
```

### PinLine
```jsx
<button class="retune-pin-line {side}" aria-label="{Pin|Unpin} {side}">
  <svg width="16" height="16" viewBox="0 0 16 16">
    {vertical(top/bottom) ? <line x1=8 y1=3 x2=8 y2=13 .../> : <line x1=3 y1=8 x2=13 y2=8 .../>}
  </svg>
</button>
```
Line `stroke = pinned ? "#3b82f6" : "#d6d3d1"`, `strokeWidth="2"`, `strokeLinecap="round"`. (Hardcoded hex: `#3b82f6` is Tailwind blue-500, NOT the `--retune-blue` #0D99FF token; `#d6d3d1` is stone-300.)

### CSS (css:1080-1173)
```css
.retune-constraints { display:flex; gap:4px; align-items:center; width:100%; }
.retune-constraints-side { flex:1; min-width:0; display:flex; align-items:center; }
.retune-constraints-center { flex:1; min-width:0; display:flex; flex-direction:column;
  gap:4px; align-items:stretch; }
.retune-pin-box { position:relative; background:var(--retune-surface-hover);
  border-radius:8px; width:100%; height:64px; }
.retune-pin-line { position:absolute; display:flex; align-items:center; justify-content:center;
  padding:0; border:none; background:transparent; cursor:pointer; width:16px; height:16px; }
.retune-pin-line.top    { left:50%; transform:translateX(-50%); top:2px; }
.retune-pin-line.right  { left:calc(75% - 2px); top:24px; }
.retune-pin-line.bottom { left:50%; transform:translateX(-50%); bottom:2px; }
.retune-pin-line.left   { left:calc(25% - 14px); top:24px; }
.retune-pin-center-btn { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  width:24px; height:24px; background:var(--retune-surface); border:1px solid var(--retune-border);
  border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.retune-pin-center-btn:hover { border-color:var(--retune-border-hover); }
.retune-pin-center-dot { width:4px; height:4px; border-radius:50%; background:#3b82f6; }
```

### Logic
- `allPinned = pins.top && right && bottom && left`.
- `togglePin(side)`: flip pin. If centered then clear centered + set transform none. If was pinned then set side to `"auto"`. If newly pinning and current is empty/auto then set side to `"0px"`.
- `handleCenterClick`:
  - if centered then un-center: all pins false, all sides `"auto"`, transform `"none"`.
  - else if allPinned then center: top `50%`, left `50%`, right/bottom `auto`, transform `translate(-50%, -50%)`.
  - else (not all pinned) then pin remaining sides true and set empty/auto ones to `"0px"`.

---

## 9. AlignmentGrid (`alignment-grid.tsx`)

3x3 grid setting `justifyContent` + `alignItems`. Class `retune-alignment-grid`. Flow-aware (column flex to vertical icons, row flex to horizontal icons). Double-click toggles space-between.

### Props
`justifyContent`, `alignItems`, `flexDirection`, `onChange(prop,value)`.

### DOM
```jsx
<div class="retune-alignment-grid" tabIndex={0} role="grid" aria-label="Alignment grid"
     onKeyDown onDoubleClick>
  {3x3 cells:}
  <Tooltip content={CELL_TOOLTIPS["r-c"]} side="bottom" delay={600}>
    <button class="retune-alignment-cell" tabIndex={-1} aria-label={pos.replace("-"," ")}
            onClick onMouseEnter onMouseLeave>
      {isSpaceBetween ? renderSpaceBetweenCell(...) : renderNormalCell(...)}
    </button>
  </Tooltip>
</div>
```

### CSS (css:954-984)
```css
.retune-alignment-grid { display:grid; grid-template-columns:repeat(3,1fr);
  grid-template-rows:repeat(3,1fr); background:var(--retune-surface-hover);
  border-radius:8px; width:100%; height:72px; outline:none; }
.retune-alignment-grid:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px; }
.retune-alignment-cell { display:flex; align-items:center; justify-content:center; border:none;
  background:transparent; padding:0; cursor:pointer; overflow:hidden; }
.retune-alignment-cell:hover { color:var(--retune-text); }
```

### Colors (hardcoded in component)
`const BLUE = "#0D99FF"`, `const GRAY = "#a8a29e"` (stone-400). Selected icon = BLUE, hovered/unselected icon = GRAY.

### Coordinate to CSS mapping
`JUSTIFY_VALUES = ALIGN_VALUES = ["flex-start","center","flex-end"]`.
- `toJustifyIdx`/`toAlignIdx`: `center` to 1, `flex-end|end` to 2, else 0 (start/normal/stretch).
- Flow: `flexDirection.startsWith("column") ? "vertical" : "horizontal"`.
- vertical: row=justify(main), col=align(cross). horizontal: row=align(cross), col=justify(main).
- space-between canonical: vertical `["center-left","center-center","center-right"]`, horizontal `["top-center","center-center","bottom-center"]`.

### Interaction
- Click: if space-between then set `alignItems` to cross-axis value. Else `positionToCss` then set both justify + align.
- Double-click: if space-between then exit using clicked cell's position (find cell index in grid, derive row/col then set both). Else then set `justifyContent:"space-between"`.
- Keyboard (arrows): in space-between, only cross-axis arrow moves; else full 2D navigation, all clamped 0..2, preventDefault. Applies same as click.
- Hover: tracks `hoveredPosition` (normal) or `hoveredGroup` (space-between) for preview icon coloring.

### Cell icon rendering
- `renderNormalCell`: selected then selected-icon BLUE; hovered then selected-icon GRAY; else `IconDot` GRAY.
- `renderSpaceBetweenCell`: active group then SB icon BLUE; hovered group then SB icon GRAY; else `IconDot` GRAY.
- Icon selection helpers `getSelectedIcon` (by col for vertical / row for horizontal) and `getSpaceBetweenIcon` (edge then full bar, middle then segment by group).

### Icons (inline SVG, 16x16, viewBox 0 0 16 16) - verbatim in section 17
`IconDot` (fillOpacity 0.3), `IconPositionLeft/CenterH/Right` (vertical flow), `IconPositionTop/CenterV/Bottom` (horizontal flow), space-between bars `IconSBBarH/HLeft/HCenter/HRight` and `IconSBBarV/VTop/VCenter/VBottom`. All take a `color` prop applied to `fill`.

### Cell tooltips
`{"0-0":"Align top left", "0-1":"Align top center", "0-2":"Align top right", "1-0":"Align center left", "1-1":"Align center", "1-2":"Align center right", "2-0":"Align bottom left", "2-1":"Align bottom center", "2-2":"Align bottom right"}`.

---

## 10. GridPicker (`grid-picker.tsx`)

Visual CSS-grid size selector. Rested: compact N x M preview. Expanded: 10x10 hover-to-preview picker. Class `retune-grid-picker-wrap`.

### Props
`columns: number`, `rows: number`, `onChange(prop,value)`. `MAX_COLS = MAX_ROWS = 10`.

### DOM
```jsx
<div class="retune-grid-picker-wrap" ref>
  <button class="retune-grid-picker-preview" aria-label={`Grid: ${displayCols} x ${displayRows}`}>
    <div class="retune-grid-picker-mini" style={{gridTemplateColumns:`repeat(${displayCols},1fr)`, gridTemplateRows:`repeat(${displayRows},1fr)`}}>
      {displayCols*displayRows count of <div class="retune-grid-picker-mini-cell"/>}
      <span class="retune-grid-picker-label">{displayCols} x {displayRows}</span>
    </div>
  </button>
  {open &&
    <div class="retune-grid-picker-dialog">
      <div class="retune-grid-picker-dialog-header">{previewCols>0&&previewRows>0 ? `${previewCols} x ${previewRows}` : "Select grid size"}</div>
      <div class="retune-grid-picker-grid" onMouseLeave={()=>setIsHovering(false)} onClick={handleSelect}>
        {100 count of <div class="retune-grid-picker-cell[ selected][ preview]" onMouseEnter/>}
      </div>
    </div>}
</div>
```
`displayCols = max(1, columns||1)`, `displayRows = max(1, rows||1)`. The separator glyph between the two numbers in source is the MULTIPLICATION SIGN U+00D7 surrounded by spaces (shown here as `x`).

### CSS (css:986-1078)
```css
.retune-grid-picker-wrap { position:relative; }
.retune-grid-picker-preview { display:flex; align-items:center; gap:8px; width:100%; height:72px;
  padding:4px; background:var(--retune-surface-hover); border:1px solid var(--retune-border);
  border-radius:8px; cursor:pointer; box-sizing:border-box; }
.retune-grid-picker-preview:hover { background:#eeeceb; }     /* hardcoded stone-ish */
.retune-grid-picker-mini { display:grid; gap:2px; flex:1; height:100%; position:relative; }
.retune-grid-picker-mini-cell { background:var(--retune-surface); border-radius:2px; min-width:0; min-height:0; }
.retune-grid-picker-label { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size:11px; font-family:ui-monospace, monospace; color:var(--retune-text-secondary);
  white-space:nowrap; pointer-events:none; }
.retune-grid-picker-dialog { position:absolute; top:100%; left:0; margin-top:4px; padding:8px;
  background:var(--retune-surface); border:1px solid var(--retune-border); border-radius:8px;
  box-shadow:0 4px 12px rgba(0,0,0,0.12); z-index:100; display:flex; flex-direction:column; gap:6px; }
.retune-grid-picker-dialog-header { font-size:11px; font-family:ui-monospace, monospace;
  color:var(--retune-text-secondary); text-align:center; }
.retune-grid-picker-grid { display:grid; grid-template-columns:repeat(10,18px);
  grid-template-rows:repeat(10,18px); gap:2px; cursor:pointer; }
.retune-grid-picker-cell { border-radius:2px; background:var(--retune-border); }
.retune-grid-picker-cell.selected { background:#3b82f6; }   /* hardcoded Tailwind blue-500 */
.retune-grid-picker-cell.preview  { background:#93c5fd; }   /* hardcoded Tailwind blue-300 */
```
Dialog grid is fixed 18px cells, 2px gap, so 10x18 + 9x2 = 198px square.

### Behavior
- `useScrollLock(open)`.
- `parseGridCount(template)` (exported): `none`/empty to 0; `repeat(N` to N; else count whitespace tracks. (This converts CSS to the `columns`/`rows` props upstream.)
- Hover cell sets `isHovering`, `hoverCol/Row` (1-based). Cell `selected` = `!isHovering && col<=columns && row<=rows`; `preview` = `isHovering && col<=hoverCol && row<=hoverRow`.
- `handleSelect` (grid onClick): if `hoverCol>0 && hoverRow>0` then `onChange("gridTemplateColumns", repeat(${hoverCol}, 1fr))`, `onChange("gridTemplateRows", repeat(${hoverRow}, 1fr))`, close.
- `previewCols = isHovering ? hoverCol : columns` (same for rows) for the header label.
- Outside-click close via composedPath check on shadow root/document.

---

## 11. DropdownMenu (`dropdown-menu.tsx`)

Figma-style dark dropdown, used by SelectInput and ComboInput. Forward-ref component. Class `retune-menu-wrapper`. Always dark (own fixed palette, not theme tokens).

### Props
`options: DropdownMenuOption[]`, `value?`, `highlightedIndex?` (default -1), `onSelect`, `onHighlight?`, `onItemHover?`, `showCheckmark?` (default true), `style?`, `minWidth?`, `initialScrollTop?`, `renderLabel?`. `DropdownMenuOption = {value, label, disabled?, shortcut?, separatorBefore?, headingBefore?}`.

### DOM
```jsx
<div class="retune-menu-wrapper" style={{minWidth, ...style}}>
  <div class="retune-menu-scroll" role="listbox" aria-label="Options" onScroll={updateOverflow}>
    {options.map: }
      {option.separatorBefore && <div class="retune-menu-separator"><div class="retune-menu-separator-line"/></div>}
      {option.headingBefore && <div class="retune-menu-heading">{headingBefore}</div>}
      <div class="retune-menu-item-wrap">
        <button class="retune-menu-item[ highlighted][ selected][ disabled][ has-check]"
                role="option" aria-selected onClick onMouseEnter onMouseLeave disabled>
          {showCheckmark && isSelected && <span class="retune-menu-check"><Check size={16}/></span>}
          <span class="retune-menu-item-label">{renderLabel?renderLabel(option):option.label}</span>
          {option.shortcut && <span class="retune-menu-item-shortcut">{shortcut}</span>}
        </button>
      </div>
    {options.length===0 && <div class="retune-menu-empty">No options available</div>}
  </div>
  {showTop && <div class="retune-menu-scroll-indicator top" onMouseEnter={startScrolling("up")} onMouseLeave={stopScrolling} aria-hidden tabIndex={-1}><ChevronUp size={20}/></div>}
  {showBottom && <div class="retune-menu-scroll-indicator bottom" ...><ChevronDown size={20}/></div>}
</div>
```

### CSS (css:2440-2565) - FIXED DARK PALETTE
```css
.retune-menu-wrapper { position:relative; width:fit-content; min-width:max(120px,100%);
  border-radius:12px; overflow:hidden; user-select:none;
  box-shadow:0 0 0.5px rgba(0,0,0,0.12), 0 10px 16px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.15); }
.retune-menu-scroll { max-height:400px; overflow-y:auto; overflow-x:hidden; padding:6px 0;
  background:#1c1917; scrollbar-width:none; overscroll-behavior:none; }
.retune-menu-scroll::-webkit-scrollbar { display:none; }
.retune-menu-separator { height:16px; display:flex; align-items:center; }
.retune-menu-separator-line { width:100%; height:1px; background:#292524; }
.retune-menu-heading { padding:4px 14px; font-size:11px; font-weight:450; letter-spacing:-0.005em;
  line-height:16px; color:rgba(255,255,255,0.4); }
.retune-menu-item-wrap { padding:0 6px; }
.retune-menu-item { position:relative; width:100%; display:flex; align-items:center;
  min-height:28px; padding:4px 24px 4px 8px; border:none; background:transparent;
  border-radius:5px; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit;
  color:#fff; text-align:left; cursor:pointer; transition:background-color 0.08s ease; }
.retune-menu-item.has-check { padding-left:28px; }
.retune-menu-item.highlighted { background:rgba(255,255,255,0.1); }
.retune-menu-item.selected { color:#fff; }
.retune-menu-item.disabled { opacity:0.5; cursor:not-allowed; }
.retune-menu-check { position:absolute; left:4px; top:50%; transform:translateY(-50%);
  display:flex; align-items:center; justify-content:center; color:#fff; }
.retune-menu-item-label { line-height:16px; white-space:nowrap; }
.retune-menu-item-shortcut { margin-left:auto; padding-left:16px; color:rgba(255,255,255,0.7); white-space:nowrap; }
.retune-menu-empty { padding:4px 16px; font-size:11px; color:rgba(255,255,255,0.4); }
.retune-menu-scroll-indicator { position:absolute; left:0; right:0; z-index:10; display:flex;
  align-items:center; justify-content:center; height:24px; background:#1c1917; cursor:default; color:#fff; }
.retune-menu-scroll-indicator.top    { top:0;    border-radius:12px 12px 0 0; }
.retune-menu-scroll-indicator.bottom { bottom:0; border-radius:0 0 12px 12px; }
```

### Behavior
- `SCROLL_SPEED = 150` px/sec. Item height baseline 28px (min-height); also referenced as `ITEM_HEIGHT=28` in menu-position.
- Highlight: controlled if `onHighlight` given (uses `highlightedIndex`), else internal state.
- Overflow indicators: `updateOverflow` sets `showTop = scrollTop>1`, `showBottom = scrollTop+clientHeight < scrollHeight-1`. Hover on indicator then `startScrolling(dir)` rAF loop (`el.scrollTop += dir*150*dt`, dt capped 0.05s). Leave then `stopScrolling` (cancel rAF). Auto-stops when edge reached.
- `useLayoutEffect`: if `initialScrollTop>0`, set scrollTop, then updateOverflow. (Drives macOS in-place positioning.)
- Cleanup cancels rAF on unmount.
- Icons: Check size 16, ChevronUp/Down size 20.

---

## 12. Tooltip (`tooltip.tsx`)

Dark tooltip with optional shortcut badge, portaled. Wrapper class `retune-tooltip-trigger` (display:contents).

### Props
`content: ReactNode`, `shortcut?`, `side?` (default `"bottom"`), `sideOffset?` (default 6), `delay?` (default 400 ms), `children`.

### DOM
```jsx
<div class="retune-tooltip-trigger" onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
  {children}
  {portalTarget ? createPortal(tooltipEl, portalTarget) : tooltipEl}
</div>
tooltipEl (when visible):
<div class="retune-tooltip retune-tooltip-{side}" style={coords?{top,left,opacity:1}:{opacity:0}}>
  <span class="retune-tooltip-text">{content}</span>
  {shortcut && <span class="retune-tooltip-shortcut">{shortcut}</span>}
</div>
```

### CSS (css:2567-2645) - FIXED DARK
```css
.retune-tooltip-trigger { display:contents; }
.retune-tooltip { position:fixed; z-index:2147483647; pointer-events:none; max-width:200px;
  border-radius:5px; background:#1e1e1e;
  box-shadow:0 0 0.5px rgba(0,0,0,0.15), 0 5px 12px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.1);
  padding:4px 8px; display:flex; align-items:center; gap:4px;
  font-size:11px; font-weight:500; line-height:16px; letter-spacing:-0.005em; white-space:nowrap;
  animation:retune-tooltip-in 150ms cubic-bezier(0.23,1,0.32,1) both; }
.retune-tooltip::before { content:""; position:absolute; width:12px; height:6px; background:#1e1e1e;
  clip-path:polygon(50% 0%, 0% 100%, 100% 100%); }       /* caret triangle */
.retune-tooltip-bottom::before { top:-6px;    left:var(--caret-x,50%); transform:translateX(-50%); }
.retune-tooltip-top::before    { bottom:-6px; left:var(--caret-x,50%); transform:translateX(-50%) rotate(180deg); }
.retune-tooltip-left::before   { right:-9px;  top:var(--caret-y,50%);  transform:translateY(-50%) rotate(90deg); }
.retune-tooltip-right::before  { left:-9px;   top:var(--caret-y,50%);  transform:translateY(-50%) rotate(-90deg); }
.retune-tooltip-text { color:#fff; min-width:0; flex:1; }
.retune-tooltip-shortcut { color:rgba(255,255,255,0.5); flex-shrink:0; }
@keyframes retune-tooltip-in { from{opacity:0; transform:scale(0.95);} to{opacity:1; transform:scale(1);} }
```

### Positioning (JS `useLayoutEffect`)
- Show on `pointerEnter` after `delay` (setTimeout). Hide clears timer + sets invisible. `pointerDown` also hides.
- `display:contents` means the wrapper has no box; measures `trigger.children[0]` (first child) instead.
- bottom: `top = tr.bottom + sideOffset; left = tr.left + (tr.width - tt.width)/2`.
- top: `top = tr.top - tt.height - sideOffset; left = centered`.
- right: `top = vertically centered; left = tr.right + sideOffset`.
- left: `top = centered; left = tr.left - tt.width - sideOffset`.
- Clamp: `clampedLeft = max(8, min(left, innerWidth - tt.width - 8))`; `clampedTop = max(8, min(top, innerHeight - tt.height - 8))`.
- Caret: set CSS vars `--caret-x`/`--caret-y` = trigger-center minus clamped offset so the caret tracks the trigger when the tooltip is clamped.

Delays used by callers: SegmentedControl 400 (default), AlignmentGrid cells 600, ChangeIndicator 200, VariableAction/Unlink 300.

---

## 13. ChangeIndicator (`change-indicator.tsx`)

Blue reset dot at the corner of a changed input. Returns `null` when `!isChanged`.

### Props
`isChanged: boolean`, `onReset: () => void`.

### DOM
```jsx
<Tooltip content="Reset property" side="top" delay={200}>
  <span class="retune-change-dot" ref={dotRef}>   {/* native pointerdown listener */}
    <span class="retune-change-dot-inner"/>
  </span>
</Tooltip>
```
Native `pointerdown` (Shadow DOM compat): `stopPropagation` + `preventDefault` + `onReset()`.

### CSS (css:2648-2668)
```css
.retune-change-dot { position:absolute; top:-8px; right:-8px; width:16px; height:16px;
  z-index:3; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.retune-change-dot-inner { width:6px; height:6px; border-radius:50%; background:var(--retune-blue);
  box-shadow:0 0 0 3px var(--retune-surface); pointer-events:none; }
```
Despite the doc comment saying "top-left corner", CSS positions it at `top:-8px; right:-8px` (top-right of the relatively-positioned parent input). 6px blue (#0D99FF) dot with a 3px surface-colored ring inside a 16px hit target.

---

## 14. VariableAction (`variable-action.tsx`) - shared sub-component

Hover icon on the right edge of NumberInput / ShorthandInput / ColorInput. Renders nothing when no variables are available and none applied.

### States
- Available (variables exist, none applied): hexagon icon, `Tooltip content="Add variable"` side top delay 300, class `retune-variable-action retune-variable-add`. Click opens VariableDialog.
- Applied (`match` set): unlink icon, `Tooltip content="Unlink variable"` side top delay 300, class `retune-variable-action retune-variable-unlink`. Click detaches.

Both icons are 24x24 inline SVG (verbatim in section 17). Uses native pointerdown listeners. Dialog portaled into shadow-root `[data-retune-container]`, managed by `claimDialog`/`releaseDialog` singleton.

### CSS (css:2670-2709)
```css
.retune-variable-action { position:absolute; right:0; top:0; width:32px; height:32px;
  display:flex; align-items:center; justify-content:center; color:transparent;
  transition:color 0.15s ease; cursor:pointer; z-index:2; }
.retune-prop:hover .retune-variable-action:not(.retune-variable-unlink),
.retune-color-hex-section:hover .retune-variable-action:not(.retune-variable-unlink) {
  color:var(--retune-text-secondary); }
.retune-variable-action:hover:not(.retune-variable-unlink) { color:var(--retune-text) !important; }
.retune-variable-unlink { color:var(--retune-text); }
.retune-prop-variable-applied .retune-variable-unlink,
.retune-combo:has(.retune-combo-variable-applied) .retune-variable-unlink { color:transparent; }
.retune-prop-variable-applied:hover .retune-variable-unlink,
.retune-combo:has(.retune-combo-variable-applied):hover .retune-variable-unlink {
  color:var(--retune-text-secondary); }
.retune-variable-unlink:hover { color:var(--retune-text) !important; }
```
Icon hidden (transparent) at rest; revealed on row hover.

---

## 15. round-css-value.ts (display + unit inference)

- `roundCssValue(val)`: rounds numeric runs to 2 decimals or fewer, strips trailing zeros.
- `inferCssUnit(input, prevValue, prop)`: if input not a bare number then return trimmed as-is. If prop is unitless (`opacity, z-index, font-weight, flex-grow, flex-shrink, order, orphans, widows, columns, column-count, tab-size` and camelCase variants) then no unit. Else if prevValue ends in a valid CSS unit then append that unit. Else append `px`.
- `VALID_CSS_UNITS`: px, em, rem, %, vh, vw, vmin, vmax, ch, ex, cap, ic, lh, rlh, svh, svw, lvh, lvw, dvh, dvw, cm, mm, in, pt, pc, q, deg, rad, grad, turn, s, ms, fr.

---

## 16. menu-position.ts (macOS in-place dropdown positioning)

Constants: `ITEM_HEIGHT=28`, `MENU_PADDING_Y=6`, `VIEWPORT_MARGIN=8`, `MAX_MENU_HEIGHT=400`.

`calcMenuPosition(triggerRect, selectedIndex, optionCount)`:
- `selectedItemOffset = MENU_PADDING_Y + selectedIndex*ITEM_HEIGHT`.
- `menuContentHeight = MENU_PADDING_Y*2 + optionCount*ITEM_HEIGHT`; `menuHeight = min(content, 400)`.
- `triggerCenter = triggerRect.top + height/2`; `idealTop = triggerCenter - selectedItemOffset - ITEM_HEIGHT/2`.
- `clampedTop = max(8, min(idealTop, vh - 8 - menuHeight))`.
- `targetVisibleOffset = triggerCenter - clampedTop - ITEM_HEIGHT/2`; `scrollTop = clamp(selectedItemOffset - targetVisibleOffset, 0, max(0, content-menuHeight))`.
- Returns `{top:clampedTop, left:triggerRect.left, width:triggerRect.width, scrollTop}`.

Used by SelectInput (anchor right-aligned via `right: innerWidth - left - width`) and ComboInput (anchor left-aligned).

---

## 17. Icons (verbatim path data)

Library: custom portfolio-editor set, NOT a public library. All icons in `icons.tsx` use viewBox `0 0 24 24`, default `size=24` (except `Check` viewBox `0 0 16 16` default size 16). Most fills are `currentColor` `fillOpacity={0.9}`. Extract these byte-for-byte from `packages/overlay/src/ui/icons.tsx`.

In-scope icons referenced by these controls:
- **ChevronDown** (`icons.tsx`): used by SelectInput chevron and ComboInput trigger. Path: `M9.64645 11.1464C9.84171 10.9512 10.1583 10.9512 10.3536 11.1464L12 12.7929L13.6464 11.1464C13.8417 10.9512 14.1583 10.9512 14.3536 11.1464C14.5488 11.3417 14.5488 11.6583 14.3536 11.8536L12.3536 13.8536C12.1583 14.0488 11.8417 14.0488 11.6464 13.8536L9.64645 11.8536C9.45118 11.6583 9.45118 11.3417 9.64645 11.1464Z` (fillOpacity 0.9).
- **ChevronUp** (`icons.tsx`): DropdownMenu top scroll indicator. Path: `M11.6464 10.1464C11.8417 9.95118 12.1583 9.95118 12.3536 10.1464L14.3536 12.1464C14.5488 12.3417 14.5488 12.6583 14.3536 12.8536C14.1583 13.0488 13.8417 13.0488 13.6464 12.8536L12 11.2071L10.3536 12.8536C10.1583 13.0488 9.84171 13.0488 9.64645 12.8535C9.45118 12.6583 9.45118 12.3417 9.64645 12.1464L11.6464 10.1464Z`.
- **Check** (`icons.tsx`, 16x16): DropdownMenu selected checkmark. Path: `M11.0839 4.22268C11.2371 3.99294 11.5475 3.93087 11.7773 4.08401C12.007 4.23718 12.0691 4.5476 11.916 4.77737L7.91596 10.7774C7.83287 10.902 7.69784 10.9833 7.54877 10.9981C7.39988 11.0127 7.25223 10.9593 7.14643 10.8535L4.14643 7.85354C3.9512 7.65827 3.95118 7.34176 4.14643 7.14651C4.34168 6.95126 4.6582 6.95128 4.85346 7.14651L7.42182 9.71487L11.0839 4.22268Z`.

AlignmentGrid inline icons (16x16, viewBox `0 0 16 16`, color via `fill` prop) - all in `alignment-grid.tsx`:
- `IconDot` (fillOpacity 0.3), `IconPositionLeft`, `IconPositionCenterH`, `IconPositionRight`, `IconPositionTop`, `IconPositionCenterV`, `IconPositionBottom`, `IconSBBarH`, `IconSBBarHLeft`, `IconSBBarHCenter`, `IconSBBarHRight`, `IconSBBarV`, `IconSBBarVTop`, `IconSBBarVCenter`, `IconSBBarVBottom`. Copy path `d` attributes verbatim.

VariableAction icons (24x24) in `variable-action.tsx`:
- `HexagonIcon` (two paths: center dot + hex outline, fill currentColor).
- `UnlinkIcon` (single complex path, fillOpacity 0.9). The same unlink path is inlined again in `combo-input.tsx` for the variable-applied combo.

ConstraintsInput PinLine uses inline `<line>` elements (not paths): vertical `x1=8 y1=3 x2=8 y2=13`, horizontal `x1=3 y1=8 x2=13 y2=8`, strokeWidth 2, linecap round, stroke `#3b82f6` (pinned) / `#d6d3d1` (unpinned).

---

## 18. Cross-cutting notes for the port

- Every control is 32px tall. Standard radius is 8px. Standard hover transitions `background-color 0.15s ease`.
- Label cells, chevron cells, trigger cells, swatch cells, and variable-action cells are all 32x32 squares.
- Input font everywhere: 11px / weight 450 / letter-spacing -0.005em / family inherit. SegmentedControl text and selector tags use weight 500.
- Text selection in inputs: `::selection { background:var(--retune-blue-bg); color:var(--retune-text); }`.
- `placeholder` default for NumberInput/ComboInput/ShorthandInput is EN DASH U+2013.
- Dropdowns + tooltips render at `z-index:2147483647` and are dark-only (own palette).
- Outside-click and scroll-lock are handled by `use-scroll-lock.ts` (hook) and composedPath checks against the shadow root; required because the overlay lives in Shadow DOM. Native (not React) pointerdown listeners are used wherever Shadow DOM event retargeting would break React synthetic events (ChangeIndicator dot, VariableAction icon, combo unlink).
- Hardcoded colors that bypass tokens (port-time decision needed, match source or tokenize): `#3b82f6` (constraints pin pinned, pin-center-dot, grid-picker selected cell), `#93c5fd` (grid-picker preview cell), `#d6d3d1` (pin unpinned), `#a8a29e` (alignment GRAY), `#0D99FF` (alignment BLUE, equals --retune-blue), `#eeeceb` (grid-picker preview hover), `#1c1917`/`#1e1e1e`/`#292524`/`#fff` (menu + tooltip dark palette).
