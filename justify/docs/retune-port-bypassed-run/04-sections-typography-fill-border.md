# Retune Design Panel - Typography, Fill/Appearance, Border Sections (1:1 Port Spec)

Area: `sections-typography-fill-border`

NOTE ON A LOAD-BEARING GLYPH: several inputs use a single en-dash character (Unicode U+2013) as their placeholder. Throughout this doc that exact glyph is written as `<U+2013>` so the literal value is unambiguous. When porting, use the real U+2013 character, not a hyphen.

Source files (all under `/Users/spare3/Documents/Github/retune/packages/overlay/src`):
- `ui/sections/TypographySection.tsx`
- `ui/sections/FillSection.tsx`
- `ui/sections/BorderSection.tsx`
- `ui/font-input.tsx`

Supporting files quoted for exact values:
- `ui/section.tsx` (Section / Row / Field primitives)
- `ui/number-input.tsx`, `ui/combo-input.tsx`, `ui/select-input.tsx`, `ui/color-input.tsx`, `ui/shorthand-input.tsx`, `ui/segmented-control.tsx`, `ui/change-indicator.tsx`
- `ui/icons.tsx` (verbatim SVG path data)
- `ui/truncation-utils.ts`, `ui/gradient-utils.ts`
- `overlay/overlay.css` (all CSS class definitions and CSS custom properties)

---

## 0. Global panel context (applies to all three sections)

These sections render inside a Shadow DOM host (`:host`) styled by `overlay.css`. Root host styles (`overlay.css` lines 1-10):

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
```

`* { box-sizing: border-box; margin: 0; padding: 0; }`

The panel container `.retune-panel` is `width: 280px;` so all section math is against a 280px-wide column.

### Theme tokens used by these three sections (resolved values)

Primitives (light mode is the default `:host`; dark mode swaps semantic tokens under `:host(.dark)`):

| Token | Light value |
|---|---|
| `--retune-black` | `#1c1917` |
| `--retune-white` | `#ffffff` |
| `--retune-black-5` | `color-mix(in srgb, #1c1917 5%, transparent)` |
| `--retune-black-10` | `color-mix(in srgb, #1c1917 10%, transparent)` |
| `--retune-black-15` | `color-mix(in srgb, #1c1917 15%, transparent)` |
| `--retune-black-25` | `color-mix(in srgb, #1c1917 25%, transparent)` |
| `--retune-black-50` | `color-mix(in srgb, #1c1917 50%, transparent)` |
| `--retune-black-70` | `color-mix(in srgb, #1c1917 70%, transparent)` |
| `--retune-black-90` | `color-mix(in srgb, #1c1917 90%, transparent)` |
| `--retune-blue-500` | `#0D99FF` |
| `--retune-blue-700` | `#0768CF` |
| `--retune-blue-200` | `#E5F4FF` |
| `--retune-blue-100` | `#F2F9FF` |
| `--retune-red-500` | `#F24822` |

Semantic tokens (light):

| Token | Resolves to |
|---|---|
| `--retune-text` | `--retune-black-90` |
| `--retune-text-secondary` | `--retune-black-70` |
| `--retune-text-tertiary` | `--retune-black-50` |
| `--retune-text-disabled` | `--retune-black-25` |
| `--retune-surface` | `#ffffff` |
| `--retune-surface-hover` | `--retune-black-5` |
| `--retune-surface-active` | `--retune-black-5` |
| `--retune-input-bg` | `--retune-black-5` |
| `--retune-input-bg-hover` | `--retune-black-10` |
| `--retune-border` | `--retune-black-10` |
| `--retune-border-hover` | `--retune-black-15` |
| `--retune-border-subtle` | `--retune-black-5` |
| `--retune-blue` | `--retune-blue-500` = `#0D99FF` |
| `--retune-blue-text` | `--retune-blue-700` = `#0768CF` |
| `--retune-blue-bg` | `--retune-blue-200` = `#E5F4FF` |
| `--retune-blue-bg-hover` | `--retune-blue-100` = `#F2F9FF` |
| `--retune-always-white` | `#ffffff` |
| `--retune-always-black` | `#1c1917` |

---

## 1. Layout primitives (`ui/section.tsx`)

These components wrap every row. Exact JSX:

### `Section`
```jsx
<div className="retune-section">
  <div className="retune-section-header">
    <span className="retune-section-title">{label}</span>
    {action}
  </div>
  {children && (
    <div className="retune-section-body" style={gap != null ? { gap } : undefined}>
      {children}
    </div>
  )}
</div>
```
Props: `label: string`, `gap?: number` (inline `gap` override on the body), `action?: ReactNode`, `children?: ReactNode`. When `children` is falsy the body div is omitted entirely (used by SVG Stroke section with no fill, and CSS Fill section with no fill).

### `Row`
Two variants depending on `label`:
- With `label`:
  ```jsx
  <div className="retune-row-group">
    <div className="retune-group-label-inline">{label}</div>
    {children}
  </div>
  ```
- Without `label`:
  ```jsx
  <div className="retune-section-row">
    <div className="retune-row">
      {children}
    </div>
  </div>
  ```

### `Field`
```jsx
<div className="retune-field">
  <span className="retune-field-label">{label}</span>
  {children}
</div>
```

### CSS for primitives (`overlay.css`)

```css
.retune-section {
  border-bottom: 1px solid var(--retune-border);
  user-select: none;
}
.retune-section:last-child { border-bottom: none; }
.retune-section:has(+ :not(.retune-section)) { border-bottom: none; }

.retune-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 16px;
  height: 44px;
}
.retune-section-title {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: var(--retune-text);
}
.retune-section-action {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: none; border-radius: 8px;
  background: transparent; color: var(--retune-text);
  cursor: pointer; padding: 0;
}
.retune-section-action:hover { background: var(--retune-surface-hover); color: var(--retune-text); }

.retune-section-body {
  display: flex;
  flex-direction: column;
  gap: 12px;            /* default; overridden inline to 8 by CSS Fill section */
  padding-bottom: 16px;
}

.retune-section-row { padding: 0 48px 0 16px; }
.retune-section-row:has(.retune-split-btn),
.retune-section-row:has(.retune-row-action) { padding-right: 8px; }

.retune-row-group {
  display: flex; flex-direction: column; gap: 4px;
  padding: 0 48px 0 16px;
}
.retune-row-group:has(.retune-split-btn),
.retune-row-group:has(.retune-row-action) { padding-right: 8px; }
.retune-row-group > .retune-row + .retune-row { margin-top: 4px; }

.retune-row {
  display: flex;
  align-items: flex-end;   /* labels sit above inputs; inputs bottom-aligned */
  gap: 8px;
}
.retune-row > .retune-prop,
.retune-row > .retune-combo,
.retune-row > .retune-select,
.retune-row > .retune-text-input,
.retune-row > .retune-font-input,
.retune-row > .retune-slider { flex: 1; min-width: 0; }

.retune-field {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.retune-field-label {
  font-size: 11px; font-weight: 400; letter-spacing: -0.005em;
  color: var(--retune-text-tertiary); line-height: 16px;
}
.retune-group-label-inline {
  font-size: 11px; font-weight: 400; letter-spacing: -0.005em;
  color: var(--retune-text-tertiary); line-height: 16px;
  display: flex; align-items: center; justify-content: space-between;
}
```

Key spatial facts:
- Section header is 44px tall, left-padded 16px, right 8px (the action's 32px box sits 8px from the right edge).
- Body rows: a label-less `Row` pads `0 48px 0 16px` (the 48px right gutter is where split/row-action buttons would overflow); with a split button present the right padding collapses to 8px so the 32px button reaches the edge.
- Inputs in a multi-field Row are separated by `gap: 8px` and bottom-aligned (`align-items: flex-end`).

---

## 2. Shared controls used across the three sections

### 2.1 `NumberInput` (`ui/number-input.tsx`)

Wrapper JSX:
```jsx
<div className={`retune-prop${variableMatch ? " retune-prop-variable-applied" : ""}`}>
  <ChangeIndicator isChanged={isChanged ?? false} onReset={onReset ?? (() => {})} />
  {label && (
    <span ref={labelRef} className="retune-prop-label"
      onClick={handleInputClick}
      onPointerDown={...} onPointerMove={...} onPointerUp={...}>
      {label}
    </span>
  )}
  <input
    className="retune-prop-input"
    style={label ? undefined : { paddingLeft: 8 }}
    value={localValue}
    placeholder={placeholder || "<U+2013>"}   /* en-dash U+2013 */
    spellCheck={false}
    ... />
  <VariableAction .../>
</div>
```

Props: `label?: ReactNode`, `prop: string`, `value: string|undefined`, `placeholder?`, `onChange(prop,value)`, `min?: number`, `max?: number`, `step?: number` (default 1; Shift multiplies x10), token props (`variableMatch`, `property`, `onVariableSelect/Apply/Unlink`), `isChanged`/`onReset`.

CSS:
```css
.retune-prop {
  display: flex; align-items: center; gap: 0;
  height: 32px; padding: 0; border-radius: 8px;
  background: var(--retune-surface-hover); border: none;
  min-width: 0; overflow: visible; position: relative;
  transition: background-color 0.15s ease;
}
.retune-prop:hover:not(.retune-prop-variable-applied) { background: var(--retune-border); }
.retune-prop:focus-within:not(.retune-prop-variable-applied) {
  outline: 1px solid var(--retune-border); outline-offset: -1px;
  background: var(--retune-surface-hover);
}
.retune-prop-label {
  position: absolute; left: 0; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  color: var(--retune-text); flex-shrink: 0;
  user-select: none; cursor: ew-resize; z-index: 1;
}
.retune-prop-input {
  flex: 1; min-width: 0; width: 100%; height: 100%;
  border: none; background: transparent;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  font-family: inherit; color: var(--retune-text);
  outline: none; padding: 0 0 0 32px;
}
.retune-prop-input:first-child { padding-left: 12px; }  /* when no label */
.retune-prop-input::selection { background: var(--retune-blue-bg); color: var(--retune-text); }
```

Scrub / interaction math:
- Label drag (`handleLabelPointerMove`): `raw = startVal + Math.round(pixelDelta) * baseStep`, `baseStep = step ?? 1`. Rounds to step precision (`precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0`), clamps to `[min,max]`, re-appends trailing unit captured by `/[a-z%]+$/i`.
- No-label case: left 16px of the input is a scrub zone (`SCRUB_ZONE = 16`); pointer in that zone shows `cursor: ew-resize` and drags the value.
- Arrow keys: ArrowUp/Down step `baseStep` (Shift x10); ignored if value is non-numeric (e.g. "normal").
- Blur/Enter commits `clampCssValue(inferCssUnit(localValue, value, prop), min, max)`.

### 2.2 `ComboInput` (`ui/combo-input.tsx`)

Editable number/keyword input + dropdown of presets. JSX (non-variable case):
```jsx
<div className="retune-combo" ref={containerRef}>
  <ChangeIndicator .../>
  {label && <span className="retune-combo-label" ...>{label}</span>}
  <input className="retune-combo-input" style={label ? undefined : { paddingLeft: 8 }}
    value={displayValue} placeholder="<U+2013>" spellCheck={false} ... />
  <button type="button" className="retune-combo-trigger" aria-label="Toggle options"><ChevronDown /></button>
  {open && menuPos && <div className="retune-combo-dropdown-anchor" .../>}
</div>
```
`displayValue`: if the current value matches an option `value`, the option `label` is shown; else the raw value. So `fontWeight: "400"` displays "Regular".

CSS:
```css
.retune-combo { display: flex; align-items: center; height: 32px; min-width: 0; overflow: visible; position: relative; gap: 1px; }
.retune-combo-label {
  position: absolute; left: 0; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  color: var(--retune-text-tertiary); flex-shrink: 0;
  user-select: none; cursor: ew-resize; z-index: 1;
}
.retune-combo-input {
  flex: 1; min-width: 0; height: 100%;
  border: none; background: var(--retune-surface-hover);
  border-radius: 8px 0 0 8px;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  font-family: inherit; color: var(--retune-text);
  outline: none; padding: 0 0 0 32px;
  transition: background-color 0.15s ease;
}
.retune-combo-input:hover:not(.retune-combo-variable-applied) { background: var(--retune-border); }
.retune-combo-input:focus { outline: 1px solid var(--retune-border); outline-offset: -1px; }
.retune-combo-trigger {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: var(--retune-surface-hover); border-radius: 0 8px 8px 0;
  border: none; cursor: pointer; color: var(--retune-text-secondary);
  flex-shrink: 0; padding: 0;
  transition: background-color 0.15s ease, color 0.12s ease;
}
.retune-combo-trigger:hover { background: var(--retune-border); color: var(--retune-text); }
.retune-combo-dropdown-anchor { position: fixed; z-index: 2147483647; }
```
Note the `gap: 1px` between input and trigger plus the split border-radius creates a hairline seam: the input rounds the left corners, the trigger the right.

Interaction: typing matches options by label or value (case-insensitive). Arrow keys when closed step the numeric value (Shift x10). Enter with a highlighted dropdown row selects it. When `hasVariablesForProperty(property||prop)` and no `variableMatch`, an extra option `{ value: "__add_variable__", label: "Add variable", separatorBefore: true }` is appended.

### 2.3 `SelectInput` (`ui/select-input.tsx`)

Read-only dropdown (no typing). Options are plain strings, displayed via `sentenceCase` (`charAt(0).toUpperCase() + rest.replace(/-/g," ")`), so `"line-through"` -> "Line through".

JSX:
```jsx
<div className="retune-select" ref={containerRef}>
  <ChangeIndicator .../>
  <button type="button" className="retune-select-button" ...>
    {label && <span className="retune-select-label">{label}</span>}
    <span className="retune-select-value" style={label ? undefined : { paddingLeft: 8 }}>{sentenceCase(localValue)}</span>
    <span className="retune-select-chevron"><ChevronDown /></span>
  </button>
  {open && menuPos && <div className="retune-select-dropdown-anchor" .../>}
</div>
```

CSS:
```css
.retune-select { position: relative; min-width: 0; overflow: visible; }
.retune-select-button {
  display: flex; align-items: center; width: 100%; height: 32px;
  border-radius: 8px; background: var(--retune-surface-hover);
  border: none; cursor: pointer; font-family: inherit; padding: 0;
  transition: background-color 0.15s ease; position: relative;
}
.retune-select-button:hover { background: var(--retune-border); }
.retune-select-label {
  position: absolute; left: 0; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  color: var(--retune-text-tertiary); flex-shrink: 0;
}
.retune-select-value {
  flex: 1; min-width: 0;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  color: var(--retune-text); text-align: left;
  padding-left: 32px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.retune-select-chevron {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  color: var(--retune-text-secondary); flex-shrink: 0;
}
.retune-select-dropdown-anchor { position: fixed; z-index: 2147483647; width: max-content; }
```
In these sections SelectInput is always used WITHOUT a `label` (the field label lives in the `Field` above it), so the value text gets `paddingLeft: 8` and the absolute label slot is empty.

### 2.4 `ColorInput` (`ui/color-input.tsx`)

Layout: `[swatch | hex] [opacity %]`. JSX:
```jsx
<div className="retune-color-row">
  <ChangeIndicator .../>
  <div className={`retune-color-hex-section${variableMatch ? " retune-color-variable-applied" : ""}`}>
    <div ref={swatchRef} className="retune-color-swatch" onClick={...}>
      <div className="retune-color-swatch-inner" style={swatchStyle}>
        {isNone && (
          <svg width="100%" height="100%" viewBox="0 0 16 16" style={{position:"absolute",top:0,left:0}}>
            <line x1="3" y1="13" x2="13" y2="3" stroke="var(--retune-red-500)" strokeWidth="1" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
    <input className="retune-color-hex-input" value={isNone ? "None" : variableMatch ? formatVarName(...) : hexLocal} spellCheck={false} ... />
    <VariableAction .../>
  </div>
  {!variableMatch && (
    <div className="retune-color-opacity-section">
      <input className="retune-color-opacity-input" inputMode="numeric" value={opacityLocal} ... />
      <span className="retune-color-opacity-unit">%</span>
    </div>
  )}
  {pickerOpen && anchorRect && <ColorPicker .../>}
</div>
```

CSS:
```css
.retune-color-row { display: flex; gap: 1px; flex: 1; min-width: 0; position: relative; }
.retune-color-hex-section {
  display: flex; align-items: center; flex: 1; min-width: 0;
  height: 32px; position: relative;
  background: var(--retune-surface-hover); border-radius: 8px 0 0 8px;
}
.retune-color-swatch {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; cursor: pointer;
}
.retune-color-swatch-inner { width: 20px; height: 20px; border-radius: 2px; position: relative; overflow: hidden; }
.retune-color-hex-input {
  flex: 1; min-width: 0; height: 32px; background: transparent; border: none;
  font-family: inherit; font-size: 11px; font-weight: 500;
  color: var(--retune-text); outline: none; padding: 0;
}
.retune-color-hex-section:focus-within { outline: 1px solid var(--retune-border); outline-offset: -1px; }
.retune-color-opacity-section {
  display: flex; align-items: center; gap: 2px; padding: 0 8px 0 4px;
  height: 32px; background: var(--retune-surface-hover);
  border-radius: 0 8px 8px 0; flex-shrink: 0;
}
.retune-color-opacity-input {
  width: 28px; height: 32px; background: transparent; border: none;
  font-family: inherit; font-size: 11px; font-weight: 500;
  color: var(--retune-text); text-align: center; outline: none; padding: 0;
  -moz-appearance: textfield;
}
.retune-color-opacity-unit { font-size: 10px; font-weight: 500; color: var(--retune-text-tertiary); }
```

Swatch rendering (`swatchStyle`):
- `isNone` (`!value || value==="none" || value==="transparent" || (#000000 @ 0% opacity)`): white background + `inset 0 0 0 1px rgba(0,0,0,0.1)`, plus a red diagonal slash SVG above.
- Opacity >= 100: `backgroundColor: hex` + the inset border.
- Opacity < 100: split swatch (left half solid hex, right half hex-with-alpha over checkerboard):
  ```
  backgroundImage: `linear-gradient(to right, ${hex} 50%, ${rgba} 50%), linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%), linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)`
  backgroundSize: "100% 100%, 4px 4px, 4px 4px"
  backgroundPosition: "0 0, 0 0, 2px 2px"
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"
  ```
- Hex input shows uppercase 6-digit hex without `#`; opacity input is 0-100 integer with `%` suffix; ArrowUp/Down step 1 (Shift 10), clamped 0-100. Clicking the swatch opens the `ColorPicker` floating dialog (Custom tab).

### 2.5 `ShorthandInput` (`ui/shorthand-input.tsx`)

Same wrapper/visuals as `NumberInput` (`.retune-prop` / `.retune-prop-input`) but drives an array of props at once. Props: `label?`, `props: string[]`, `values: string[]`, `onChange`, `min?`, `max?`. Display: all values equal -> single value; else comma-joined. Typing "10" sets all; "10, 20" maps comma parts to props (cycling). Arrow keys step all numeric parts (Shift x10). Default unit fallback `"px"`. Placeholder `"<U+2013>"`.

### 2.6 `SegmentedControl` (`ui/segmented-control.tsx`)

iOS-style sliding pill toggle. JSX:
```jsx
<div ref={containerRef} className="retune-segmented" style={disabled ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
  <div ref={pillRef} className="retune-segmented-pill" />
  {options.map(opt => (
    <button className={`retune-segmented-item${selected?" selected":""}${opt.disabled?" disabled":""}`}
      disabled={opt.disabled || disabled} aria-label={opt.label} aria-pressed={selected}>
      {opt.icon || <span className="retune-segmented-text">{opt.label}</span>}
    </button>
  ))}
</div>
```
Each icon+label option is wrapped in a `Tooltip` (content = `opt.label`).

CSS:
```css
.retune-segmented {
  display: flex; position: relative; height: 32px;
  background: var(--retune-surface-hover); border-radius: 8px;
  overflow: hidden; flex: 1;
}
.retune-segmented-pill {
  position: absolute; top: 0; left: 0; height: 100%;
  border-radius: 8px; background: var(--retune-surface);
  border: 1px solid var(--retune-border); box-sizing: border-box;
  transition: transform 200ms cubic-bezier(0.77, 0, 0.175, 1);
  will-change: transform; pointer-events: none; z-index: 0;
}
.retune-segmented-item {
  display: flex; align-items: center; justify-content: center; flex: 1;
  height: 32px; border: none; border-radius: 8px; background: transparent;
  cursor: pointer; padding: 0; color: var(--retune-text);
  transition: color 150ms ease; position: relative; z-index: 1;
}
.retune-segmented-item:hover:not(.disabled) { color: var(--retune-text-secondary); }
.retune-segmented-item.selected { color: var(--retune-text); }
.retune-segmented-item.disabled { opacity: 0.3; cursor: not-allowed; }
.retune-segmented-item svg { width: 24px; height: 24px; display: block; }
.retune-segmented-text { font-size: 11px; font-weight: 500; letter-spacing: -0.005em; }
```
Pill positioning computed via `getBoundingClientRect`: pill width = selected button width, `transform: translateX(offsetX)` where `offsetX = btnRect.left - containerRect.left`. First render skips the transition (sets `transition:"none"`, forces reflow, restores). If `value` matches no option, pill `opacity:0`.

### 2.7 `ChangeIndicator` (`ui/change-indicator.tsx`)

Renders nothing unless `isChanged`. When changed:
```jsx
<Tooltip content="Reset property" side="top" delay={200}>
  <span className="retune-change-dot"><span className="retune-change-dot-inner" /></span>
</Tooltip>
```
CSS:
```css
.retune-change-dot {
  position: absolute; top: -8px; right: -8px; width: 16px; height: 16px;
  z-index: 3; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.retune-change-dot-inner {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--retune-blue);                 /* #0D99FF */
  box-shadow: 0 0 0 3px var(--retune-surface);
  pointer-events: none;
}
```
Click resets the property (native pointerdown for Shadow DOM). Wiring comes from `changeProps(prop) -> { isChanged, onReset }` and `shorthandChangeProps(props)`.

### 2.8 `VariableAction` (token hexagon / unlink icon)

Appears at the right edge (32x32) of `.retune-prop`, `.retune-color-hex-section`, etc. CSS:
```css
.retune-variable-action {
  position: absolute; right: 0; top: 0; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: transparent; transition: color 0.15s ease; cursor: pointer; z-index: 2;
}
.retune-prop:hover .retune-variable-action:not(.retune-variable-unlink),
.retune-color-hex-section:hover .retune-variable-action:not(.retune-variable-unlink) { color: var(--retune-text-secondary); }
.retune-variable-action:hover:not(.retune-variable-unlink) { color: var(--retune-text) !important; }
```
Variable-applied input states (`.retune-prop-variable-applied`, `.retune-combo-variable-applied`, `.retune-color-variable-applied`) switch the background to `--retune-surface` with a `1px solid var(--retune-border)` outline (`outline-offset:-1px`). Most ports will not need tokens; render the bare inputs.

### 2.9 Split toggle button (`.retune-split-btn`)

Used by the corner-radius and border-width expand/collapse toggles and the typography "More options" toggle.
```css
.retune-row-action, .retune-split-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px;
  background: transparent; color: var(--retune-text); cursor: pointer;
  padding: 0; flex-shrink: 0; transition: background 0.15s ease, color 0.15s ease;
}
.retune-row-action:hover, .retune-split-btn:hover { background: var(--retune-surface-active); color: var(--retune-text); }
.retune-row-action.active, .retune-split-btn.active { color: var(--retune-text); background: var(--retune-input-bg-hover); }
```

---

## 3. ICONS - verbatim 24x24 path data (`ui/icons.tsx`)

All icons wrap with:
```jsx
function I({ size = 24, children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>;
}
```
Each path uses `fill="currentColor" fillOpacity={0.9}`. Within `.retune-segmented-item svg` and `.retune-section-action`/`.retune-split-btn` the SVG renders at 24x24. Copy the `d` exactly.

**TextAlignLeft** - `d="M5 7.5C5 7.22386 5.22386 7 5.5 7H18.5C18.7761 7 19 7.22386 19 7.5C19 7.77614 18.7761 8 18.5 8H5.5C5.22386 8 5 7.77614 5 7.5ZM5 11.5C5 11.2239 5.22386 11 5.5 11H12.5C12.7761 11 13 11.2239 13 11.5C13 11.7761 12.7761 12 12.5 12H5.5C5.22386 12 5 11.7761 5 11.5ZM5.5 15C5.22386 15 5 15.2239 5 15.5C5 15.7761 5.22386 16 5.5 16H14.5C14.7761 16 15 15.7761 15 15.5C15 15.2239 14.7761 15 14.5 15H5.5Z"`

**TextAlignCenter** - `d="M5 7.5C5 7.22386 5.22386 7 5.5 7H18.5C18.7761 7 19 7.22386 19 7.5C19 7.77614 18.7761 8 18.5 8H5.5C5.22386 8 5 7.77614 5 7.5ZM8 11.5C8 11.2239 8.22386 11 8.5 11H15.5C15.7761 11 16 11.2239 16 11.5C16 11.7761 15.7761 12 15.5 12H8.5C8.22386 12 8 11.7761 8 11.5ZM7.5 15C7.22386 15 7 15.2239 7 15.5C7 15.7761 7.22386 16 7.5 16H16.5C16.7761 16 17 15.7761 17 15.5C17 15.2239 16.7761 15 16.5 15H7.5Z"`

**TextAlignRight** - `d="M19 7.5C19 7.22386 18.7761 7 18.5 7H5.5C5.22386 7 5 7.22386 5 7.5C5 7.77614 5.22386 8 5.5 8H18.5C18.7761 8 19 7.77614 19 7.5ZM19 11.5C19 11.2239 18.7761 11 18.5 11H11.5C11.2239 11 11 11.2239 11 11.5C11 11.7761 11.2239 12 11.5 12H18.5C18.7761 12 19 11.7761 19 11.5ZM18.5 15C18.7761 15 19 15.2239 19 15.5C19 15.7761 18.7761 16 18.5 16H9.5C9.22386 16 9 15.7761 9 15.5C9 15.2239 9.22386 15 9.5 15H18.5Z"`

**TextAlignTop** - `d="M5.5 5C5.22386 5 5 5.22386 5 5.5C5 5.77614 5.22386 6 5.5 6H17.5C17.7761 6 18 5.77614 18 5.5C18 5.22386 17.7761 5 17.5 5H5.5ZM11.8536 7.14645C11.6583 6.95118 11.3417 6.95118 11.1464 7.14645L8.14645 10.1464C7.95118 10.3417 7.95118 10.6583 8.14645 10.8536C8.34171 11.0488 8.65829 11.0488 8.85355 10.8536L11 8.70711V16.5C11 16.7761 11.2239 17 11.5 17C11.7761 17 12 16.7761 12 16.5V8.70711L14.1464 10.8536C14.3417 11.0488 14.6583 11.0488 14.8536 10.8536C15.0488 10.6583 15.0488 10.3417 14.8536 10.1464L11.8536 7.14645Z"`

**TextAlignMiddle** - `d="M11.8536 9.85355L13.8536 7.85355C14.0488 7.65829 14.0488 7.34171 13.8536 7.14645C13.6583 6.95118 13.3417 6.95118 13.1464 7.14645L12 8.29289V4.5C12 4.22386 11.7761 4 11.5 4C11.2239 4 11 4.22386 11 4.5V8.29289L9.85355 7.14645C9.65829 6.95118 9.34171 6.95118 9.14645 7.14645C8.95118 7.34171 8.95118 7.65829 9.14645 7.85355L11.1464 9.85355C11.3417 10.0488 11.6583 10.0488 11.8536 9.85355ZM11.8536 13.1464L13.8536 15.1464C14.0488 15.3417 14.0488 15.6583 13.8536 15.8536C13.6583 16.0488 13.3417 16.0488 13.1464 15.8536L12 14.7071V18.5C12 18.7761 11.7761 19 11.5 19C11.2239 19 11 18.7761 11 18.5V14.7071L9.85355 15.8536C9.65829 16.0488 9.34171 16.0488 9.14645 15.8536C8.95118 15.6583 8.95118 15.3417 9.14645 15.1464L11.1464 13.1464C11.3417 12.9512 11.6583 12.9512 11.8536 13.1464ZM5.5 11C5.22386 11 5 11.2239 5 11.5C5 11.7761 5.22386 12 5.5 12H17.5C17.7761 12 18 11.7761 18 11.5C18 11.2239 17.7761 11 17.5 11H5.5Z"`

**TextAlignBottom** - `d="M14.8536 13.8536L11.8536 16.8536C11.6583 17.0488 11.3417 17.0488 11.1464 16.8536L8.14645 13.8536C7.95118 13.6583 7.95118 13.3417 8.14645 13.1464C8.34171 12.9512 8.65829 12.9512 8.85355 13.1464L11 15.2929V7.5C11 7.22386 11.2239 7 11.5 7C11.7761 7 12 7.22386 12 7.5V15.2929L14.1464 13.1464C14.3417 12.9512 14.6583 12.9512 14.8536 13.1464C15.0488 13.3417 15.0488 13.6583 14.8536 13.8536ZM5.5 19C5.22386 19 5 18.7761 5 18.5C5 18.2239 5.22386 18 5.5 18H17.5C17.7761 18 18 18.2239 18 18.5C18 18.7761 17.7761 19 17.5 19H5.5Z"`

**AdjustSmall** (typography "More options" toggle) - `d="M8 5.5C8 5.22386 8.22386 5 8.5 5C8.77614 5 9 5.22386 9 5.5V12.05C10.1411 12.2816 11 13.2905 11 14.5C11 15.7095 10.1411 16.7184 9 16.95V18.5C9 18.7761 8.77614 19 8.5 19C8.22386 19 8 18.7761 8 18.5V16.95C6.85888 16.7184 6 15.7095 6 14.5C6 13.2905 6.85888 12.2816 8 12.05V5.5ZM7 14.5C7 13.6716 7.67157 13 8.5 13C9.32843 13 10 13.6716 10 14.5C10 15.3284 9.32843 16 8.5 16C7.67157 16 7 15.3284 7 14.5ZM15 18.5C15 18.7761 15.2239 19 15.5 19C15.7761 19 16 18.7761 16 18.5V11.95C17.1411 11.7184 18 10.7095 18 9.5C18 8.29052 17.1411 7.28164 16 7.05001V5.5C16 5.22386 15.7761 5 15.5 5C15.2239 5 15 5.22386 15 5.5V7.05001C13.8589 7.28164 13 8.29052 13 9.5C13 10.7095 13.8589 11.7184 15 11.95V18.5ZM14 9.5C14 10.3284 14.6716 11 15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5Z"`

**Minus** (list-style "None"; remove fill/border/stroke) - `d="M6 12C6 11.7239 6.22386 11.5 6.5 11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H6.5C6.22386 12.5 6 12.2761 6 12Z"`

**ListView** (list-style "Bullet") - `d="M6 7C6 6.44772 6.44772 6 7 6C7.55228 6 8 6.44772 8 7C8 7.55228 7.55228 8 7 8C6.44772 8 6 7.55228 6 7ZM10.5 6.5C10.2239 6.5 10 6.72386 10 7C10 7.27614 10.2239 7.5 10.5 7.5H17.5C17.7761 7.5 18 7.27614 18 7C18 6.72386 17.7761 6.5 17.5 6.5H10.5ZM10.5 16.5C10.2239 16.5 10 16.7239 10 17C10 17.2761 10.2239 17.5 10.5 17.5H17.5C17.7761 17.5 18 17.2761 18 17C18 16.7239 17.7761 16.5 17.5 16.5H10.5ZM10.5 11.5C10.2239 11.5 10 11.7239 10 12C10 12.2761 10.2239 12.5 10.5 12.5H17.5C17.7761 12.5 18 12.2761 18 12C18 11.7239 17.7761 11.5 17.5 11.5H10.5ZM6 12C6 11.4477 6.44772 11 7 11C7.55228 11 8 11.4477 8 12C8 12.5523 7.55228 13 7 13C6.44772 13 6 12.5523 6 12ZM7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18C7.55228 18 8 17.5523 8 17C8 16.4477 7.55228 16 7 16Z"`

**NumberList** (list-style "Numbered") - `d="M11 7C11 6.72386 11.2238 6.5 11.5 6.5H17.5C17.7761 6.5 18 6.72386 18 7C18 7.27614 17.7761 7.5 17.5 7.5H11.5C11.2238 7.5 11 7.27614 11 7ZM6 7.00001C6 6.72387 6.22386 6.50001 6.5 6.50001H7.5C7.77614 6.50001 8 6.72387 8 7.00001V10.5C8 10.7762 7.77614 11 7.5 11C7.22386 11 7 10.7762 7 10.5V7.50001H6.5C6.22386 7.50001 6 7.27616 6 7.00001ZM6 13.5C6 13.2239 6.22386 13 6.5 13H8.5C8.77614 13 9 13.2239 9 13.5V15C9 15.1894 8.893 15.3625 8.72361 15.4472L7 16.309V16.5H8.5C8.77614 16.5 9 16.7239 9 17C9 17.2762 8.77614 17.5 8.5 17.5H6.5C6.22386 17.5 6 17.2762 6 17V16C6 15.8106 6.107 15.6375 6.27639 15.5528L8 14.691V14H6.5C6.22386 14 6 13.7762 6 13.5ZM11.5 16.5C11.2238 16.5 11 16.7239 11 17C11 17.2761 11.2238 17.5 11.5 17.5H17.5C17.7761 17.5 18 17.2761 18 17C18 16.7239 17.7761 16.5 17.5 16.5H11.5ZM11.5 11.5C11.2238 11.5 11 11.7239 11 12C11 12.2761 11.2238 12.5 11.5 12.5H17.5C17.7761 12.5 18 12.2761 18 12C18 11.7239 17.7761 11.5 17.5 11.5H11.5Z"`

**Plus** (add fill/border/stroke) - `d="M12 6C12.2761 6 12.5 6.22386 12.5 6.5V11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H12.5V17.5C12.5 17.7761 12.2761 18 12 18C11.7239 18 11.5 17.7761 11.5 17.5V12.5H6.5C6.22386 12.5 6 12.2761 6 12C6 11.7239 6.22386 11.5 6.5 11.5H11.5V6.5C11.5 6.22386 11.7239 6 12 6Z"`

**ChevronDown** (combo/select/font triggers) - `d="M9.64645 11.1464C9.84171 10.9512 10.1583 10.9512 10.3536 11.1464L12 12.7929L13.6464 11.1464C13.8417 10.9512 14.1583 10.9512 14.3536 11.1464C14.5488 11.3417 14.5488 11.6583 14.3536 11.8536L12.3536 13.8536C12.1583 14.0488 11.8417 14.0488 11.6464 13.8536L9.64645 11.8536C9.45118 11.6583 9.45118 11.3417 9.64645 11.1464Z"`

**AlPaddingSides** (corner-radius / border-width expand-collapse split button) - `d="M8 9.5C8 9.22385 7.77614 9 7.5 9C7.22386 9 7 9.22385 7 9.5L7 14.5C7 14.7761 7.22386 15 7.5 15C7.77614 15 8 14.7761 8 14.5V9.5ZM17 9.5C17 9.22385 16.7761 9 16.5 9C16.2239 9 16 9.22385 16 9.5V14.5C16 14.7761 16.2239 15 16.5 15C16.7761 15 17 14.7761 17 14.5V9.5ZM9 7.5C9 7.22385 9.22386 7 9.5 7H14.5C14.7761 7 15 7.22385 15 7.5C15 7.77615 14.7761 8 14.5 8H9.5C9.22386 8 9 7.77615 9 7.5ZM9.5 16C9.22386 16 9 16.2239 9 16.5C9 16.7761 9.22386 17 9.5 17H14.5C14.7761 17 15 16.7761 15 16.5C15 16.2239 14.7761 16 14.5 16H9.5Z"`

**RadiusTopLeft** - `d="M12.4781 8L12.5 8H15.5C15.7761 8 16 8.22386 16 8.5C16 8.77614 15.7761 9 15.5 9H12.5C11.7917 9 11.2905 9.00039 10.8987 9.0324C10.5128 9.06393 10.2772 9.12365 10.092 9.21799C9.71569 9.40973 9.40973 9.71569 9.21799 10.092C9.12365 10.2772 9.06393 10.5128 9.0324 10.8987C9.00039 11.2905 9 11.7917 9 12.5V15.5C9 15.7761 8.77614 16 8.5 16C8.22386 16 8 15.7761 8 15.5V12.5L8 12.4781C8 11.7966 7.99999 11.2546 8.03572 10.8173C8.07231 10.3695 8.14884 9.98765 8.32698 9.63803C8.6146 9.07354 9.07354 8.6146 9.63803 8.32698C9.98765 8.14884 10.3695 8.07231 10.8173 8.03572C11.2546 7.99999 11.7966 8 12.4781 8Z"`

**RadiusTopRight** - `d="M11.5219 8L11.5 8H8.5C8.22386 8 8 8.22386 8 8.5C8 8.77614 8.22386 9 8.5 9H11.5C12.2083 9 12.7095 9.00039 13.1013 9.0324C13.4872 9.06393 13.7228 9.12365 13.908 9.21799C14.2843 9.40973 14.5903 9.71569 14.782 10.092C14.8764 10.2772 14.9361 10.5128 14.9676 10.8987C14.9996 11.2905 15 11.7917 15 12.5V15.5C15 15.7761 15.2239 16 15.5 16C15.7761 16 16 15.7761 16 15.5V12.5V12.4781C16 11.7966 16 11.2546 15.9643 10.8173C15.9277 10.3695 15.8512 9.98765 15.673 9.63803C15.3854 9.07354 14.9265 8.6146 14.362 8.32698C14.0123 8.14884 13.6305 8.07231 13.1827 8.03572C12.7454 7.99999 12.2034 8 11.5219 8Z"`

**RadiusBottomLeft** - `d="M12.4781 16H12.5H15.5C15.7761 16 16 15.7761 16 15.5C16 15.2239 15.7761 15 15.5 15H12.5C11.7917 15 11.2905 14.9996 10.8987 14.9676C10.5128 14.9361 10.2772 14.8764 10.092 14.782C9.71569 14.5903 9.40973 14.2843 9.21799 13.908C9.12365 13.7228 9.06393 13.4872 9.0324 13.1013C9.00039 12.7095 9 12.2083 9 11.5V8.5C9 8.22386 8.77614 8 8.5 8C8.22386 8 8 8.22386 8 8.5V11.5L8 11.5219C8 12.2034 7.99999 12.7454 8.03572 13.1827C8.07231 13.6305 8.14884 14.0123 8.32698 14.362C8.6146 14.9265 9.07354 15.3854 9.63803 15.673C9.98765 15.8512 10.3695 15.9277 10.8173 15.9643C11.2546 16 11.7966 16 12.4781 16Z"`

**RadiusBottomRight** - `d="M11.5219 16H11.5H8.5C8.22386 16 8 15.7761 8 15.5C8 15.2239 8.22386 15 8.5 15H11.5C12.2083 15 12.7095 14.9996 13.1013 14.9676C13.4872 14.9361 13.7228 14.8764 13.908 14.782C14.2843 14.5903 14.5903 14.2843 14.782 13.908C14.8764 13.7228 14.9361 13.4872 14.9676 13.1013C14.9996 12.7095 15 12.2083 15 11.5V8.5C15 8.22386 15.2239 8 15.5 8C15.7761 8 16 8.22386 16 8.5V11.5V11.5219C16 12.2034 16 12.7454 15.9643 13.1827C15.9277 13.6305 15.8512 14.0123 15.673 14.362C15.3854 14.9265 14.9265 15.3854 14.362 15.673C14.0123 15.8512 13.6305 15.9277 13.1827 15.9643C12.7454 16 12.2034 16 11.5219 16Z"`

---

## 4. TypographySection (`ui/sections/TypographySection.tsx`)

### Conditional rendering
- The ENTIRE section returns `null` unless `isText` is true (`if (!isText) return null;`). `isText` is a prop supplied by the parent panel.
- Local state: `const [typoExpanded, setTypoExpanded] = useState(false);` controls the "More options" block.

### Wrapper
`<Section label="Typography">` -> header text "Typography", 44px header, no action button.

### Rows (exact order)

1. **Font** - single `Field label="Font"` containing `FontInput`:
   ```jsx
   <FontInput prop="fontFamily" value={s.fontFamily} onChange={onPropertyChange} {...changeProps("fontFamily")} />
   ```
   (See section 5.)

2. **Size / Weight** - Row, two Fields:
   - `Field label="Size"`: `<NumberInput prop="fontSize" value={s.fontSize} onChange={onPropertyChange} min={1} {...variableProps("fontSize")} {...changeProps("fontSize")} />`
   - `Field label="Weight"`: `<ComboInput prop="fontWeight" value={s.fontWeight} options={FONT_WEIGHT_OPTIONS} onChange={onPropertyChange} {...variableProps("fontWeight")} {...changeProps("fontWeight")} />`

   `FONT_WEIGHT_OPTIONS` (value -> label):
   `100 Thin`, `200 Extra Light`, `300 Light`, `400 Regular`, `500 Medium`, `600 Semibold`, `700 Bold`, `800 Extra Bold`, `900 Black`.

3. **Line height / Letter spacing** - Row, two `ComboInput` Fields:
   - `Field label="Line height"`: `ComboInput prop="lineHeight"` options `LINE_HEIGHT_OPTIONS`: `normal Normal`, `1 1`, `1.25 1.25`, `1.5 1.5`, `1.75 1.75`, `2 2`.
   - `Field label="Letter spacing"`: `ComboInput prop="letterSpacing"` options `LETTER_SPACING_OPTIONS`: `normal Normal`, `-0.05em Tight`, `0.05em Wide`, `0.1em Wider`.

4. **Color** - single `Field label="Color"`: `<ColorInput prop="color" value={s.color} onChange={onPropertyChange} {...variableProps("color")} {...changeProps("color")} />`

5. **Align / Vertical / [More-options toggle]** - Row with three children:
   - `Field label="Align"`: `SegmentedControl` with `TEXT_ALIGN_OPTIONS`, value `mapTextAlign(s.textAlign)`, `onChange={(v)=>onPropertyChange("textAlign", v)}`.
     `TEXT_ALIGN_OPTIONS = [{value:"left",icon:<TextAlignLeft/>,label:"Left"},{value:"center",icon:<TextAlignCenter/>,label:"Center"},{value:"right",icon:<TextAlignRight/>,label:"Right"}]`.
   - `Field label="Vertical"`: `SegmentedControl` with `VERTICAL_ALIGN_OPTIONS`, value `mapVerticalAlign(s.verticalAlign)`, `onChange`, plus `disabled={!hasVerticalAlign}`.
     `VERTICAL_ALIGN_OPTIONS = [{value:"top",icon:<TextAlignTop/>,label:"Top"},{value:"middle",icon:<TextAlignMiddle/>,label:"Middle"},{value:"bottom",icon:<TextAlignBottom/>,label:"Bottom"}]`.
   - bare `<div style={{ alignSelf: "flex-end" }}>` containing:
     ```jsx
     <Tooltip content={typoExpanded ? "Show less" : "More options"} side="top">
       <button className={`retune-split-btn${typoExpanded ? " active" : ""}`} onClick={() => setTypoExpanded(v => !v)}>
         <AdjustSmall />
       </button>
     </Tooltip>
     ```

   `mapTextAlign`: `undefined->"left"`, `"start"->"left"`, `"end"->"right"`, else pass through (`left|center|right|justify`).
   `mapVerticalAlign`: `undefined->"top"`; `"middle"|"center"->"middle"`; `"bottom"->"bottom"`; `"top"|"baseline"|"text-top"->"top"`; `"text-bottom"|"sub"->"bottom"`; `"super"->"top"`; default `"top"`.

### Expanded block (`typoExpanded === true`)

6. **Style / Decoration** - Row, two `SelectInput` Fields:
   - `Field label="Style"`: `SelectInput prop="fontStyle"` options `["normal","italic","oblique"]`.
   - `Field label="Decoration"`: `SelectInput prop="textDecoration"` options `["none","underline","line-through","overline"]`.

7. **Transform / White space** - Row, two Fields:
   - `Field label="Transform"`: `SelectInput prop="textTransform"` options `["none","uppercase","lowercase","capitalize"]`.
   - `Field label="White space"`: `SelectInput prop="whiteSpace"` options `["normal","nowrap","pre","pre-wrap","pre-line","break-spaces"]`.

8. **Truncate / Max lines** - inside an IIFE. `const truncation = detectTruncation(s);` and `const ctx = { currentDisplay: s.display };`
   - `Field label="Truncate"`: `SelectInput prop="truncate"` value `truncation.enabled ? "ellipsis" : "none"` options `["none","ellipsis"]`. On change: `enabled = val==="ellipsis"`, computes `computeTruncationChanges({enabled, lines:1}, ctx)`, applies each prop via `onPropertyChange`, then `fixAncestorMinWidth(enabled)`.
   - `Field label="Max lines"` shown ONLY when `truncation.enabled`: `NumberInput prop="lineClamp"` value `String(truncation.lines)`. On change `parseInt(val)||1` then `computeTruncationChanges({enabled:true, lines:n}, ctx)`. Has `{...changeProps("lineClamp")}`.

   `computeTruncationChanges` (`truncation-utils.ts`):
   - disabled -> `textOverflow:"clip"`, `overflow:"visible"`, `whiteSpace:"normal"`, `webkitLineClamp:"unset"`, `webkitBoxOrient:"unset"`, `minWidth:"0px"`, and if `currentDisplay==="-webkit-box"` also `display:"block"`.
   - enabled -> `display:"-webkit-box"`, `webkitBoxOrient:"vertical"`, `webkitLineClamp:String(lines)`, `overflow:"hidden"`, `textOverflow:"ellipsis"`, `whiteSpace:"normal"`, `minWidth:"0px"`.

   `detectTruncation` reads `styles.webkitLineClamp` (clamp if not none/unset, lines = parseInt or 2); else single-line if `textOverflow==="ellipsis" && whiteSpace==="nowrap"` (lines=1); else disabled.

   `fixAncestorMinWidth(enabled)`: walks `element.element.parentElement` up to (not including) `document.body`; for each ancestor whose parent computed `display` includes "grid" or "flex", calls `onApplyToElement(el, "minWidth", enabled ? "0px" : "")`. No-op if `onApplyToElement` undefined.

9. **Word break / List style** - Row:
   - `Field label="Word break"`: `SelectInput prop="overflowWrap"` options `["normal","break-word","anywhere"]`.
   - `Field label="List style"` shown ONLY when `["UL","OL","LI"].includes(element.tagName)`: `SegmentedControl` options `LIST_STYLE_OPTIONS`, value `s.listStyleType || "none"`, `onChange={(val)=>onPropertyChange("listStyleType", val)}`.
     `LIST_STYLE_OPTIONS = [{value:"none",icon:<Minus/>,label:"None"},{value:"disc",icon:<ListView/>,label:"Bullet"},{value:"decimal",icon:<NumberList/>,label:"Numbered"}]`.

---

## 5. FontInput (`ui/font-input.tsx`)

### Trigger JSX
```jsx
<div className="retune-font-input" ref={containerRef}>
  <ChangeIndicator isChanged={isChanged ?? false} onReset={onReset ?? (()=>{})} />
  <button type="button" className="retune-font-input-trigger" onClick={openPicker}>
    <span className="retune-font-input-value" style={{ fontFamily: primaryFont || undefined }}>{primaryFont || "<U+2013>"}</span>
    <ChevronDown />
  </button>
  {pickerOpen && anchorRect && portalTarget && createPortal(<FloatingDialog .../>, portalTarget)}
</div>
```
`primaryFont = extractPrimaryFont(value)` = first comma-segment, quotes stripped. Trigger value text rendered IN that font (`fontFamily: primaryFont`). Empty -> en-dash `<U+2013>`.

CSS:
```css
.retune-font-input {
  display: flex; align-items: center; height: 32px; border-radius: 8px;
  background: var(--retune-surface-hover); min-width: 0; overflow: visible;
  position: relative; transition: background-color 0.15s ease;
}
.retune-font-input:hover { background: var(--retune-border); }
.retune-font-input:focus-within { outline: 1px solid var(--retune-border); outline-offset: -1px; background: var(--retune-surface-hover); }
.retune-font-input-trigger {
  display: flex; align-items: center; width: 100%; height: 100%;
  border: none; background: transparent;
  font-size: 11px; font-weight: 450; letter-spacing: -0.005em;
  color: var(--retune-text); cursor: pointer; padding: 0 4px 0 8px; gap: 4px;
}
.retune-font-input-value { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.retune-font-input-trigger svg { flex-shrink: 0; color: var(--retune-text-secondary); }
```

### Picker (FloatingDialog, portaled)
Opens anchored to the closest `.retune-row` rect. `FloatingDialog title="Fonts"`, `maxHeight={400}`, `minHeight={400}`, with a search input (`placeholder="Search fonts..."`, keyboard nav). Contents:
```jsx
<div className="retune-font-filter">
  <SelectInput prop="__fontCategory" value={fontCategory} options={["all","project","system","generic"]} onChange={...} />
</div>
<div ref={listRef} className="retune-font-list">
  {/* Project fonts */}  <div className="retune-font-section-title">Project fonts</div> ...
  {/* System fonts */}   <div className="retune-font-section-title">System fonts</div> ...
  {/* Fallback fonts */} <div className="retune-font-section-title">Generic</div> ...
  {allFiltered.length === 0 && <div className="retune-font-empty">No fonts found</div>}
  {/* Load-system button or denied notice */}
</div>
```

Each font item:
```jsx
<div className={`retune-font-item${font===primaryFont?" retune-font-item-active":""}${idx===highlightedIndex?" retune-font-item-highlighted":""}`}
  data-font-name={font} data-font-index={idx} style={{ fontFamily: font }}>
  {font}
</div>
```
(Each name rendered in its own typeface.)

Load-system prompt (`systemFonts === null`):
```jsx
<div className="retune-font-system-prompt">
  <button className="retune-font-system-btn" data-font-name="__load_system">Load system fonts</button>
</div>
```
Denied state (`fontPermissionDenied`):
```jsx
<div className="retune-font-system-prompt">
  <p className="retune-font-denied">Font access denied. Allow in site settings to try again.</p>
</div>
```

CSS:
```css
.retune-font-filter { padding: 8px; border-top: 1px solid var(--retune-border); }
.retune-font-list { overflow-y: auto; padding: 2px 0 4px; scrollbar-width: none; }
.retune-font-list::-webkit-scrollbar { display: none; }
.retune-font-section-title {
  font-size: 11px; font-weight: 450; line-height: 16px; letter-spacing: -0.005em;
  color: var(--retune-text-secondary); padding: 8px 16px 8px;
}
.retune-font-item {
  display: flex; align-items: center; padding: 8px 16px; cursor: pointer;
  font-size: 13px; font-weight: 450; color: var(--retune-text);
  transition: background-color 0.08s ease; min-height: 32px; box-sizing: border-box;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.retune-font-item:hover { background: var(--retune-surface-hover); }
.retune-font-item-active { background: var(--retune-surface-hover); }
.retune-font-item-highlighted { background: var(--retune-input-bg); }
.retune-font-item-active.retune-font-item-highlighted { background: var(--retune-surface-hover); }
.retune-font-system-prompt { padding: 8px 16px 12px; }
.retune-font-system-btn {
  width: 100%; padding: 8px; border: 1px dashed var(--retune-border-hover);
  border-radius: 8px; background: transparent; font-size: 12px; font-weight: 500;
  color: var(--retune-text-secondary); cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.retune-font-system-btn:hover { background: var(--retune-surface-hover); color: var(--retune-text); }
.retune-font-denied { font-size: 11px; line-height: 16px; color: var(--retune-text-tertiary); margin: 0; }
.retune-font-empty { padding: 16px 12px; font-size: 12px; color: var(--retune-text-tertiary); text-align: center; }
```

Font sources:
- `FALLBACK_FONTS = ["system-ui","sans-serif","serif","monospace"]` (the "Generic" group).
- Project fonts via `detectProjectFonts()` - scans `document.styleSheets` CSSStyleRules for `font-family` declarations, skips `var(...)` and the fallback list, deduped+sorted; cached 10s.
- System fonts via Local Font Access API `queryLocalFonts()`; auto-loaded if permission already granted, else a "Load system fonts" button. System list excludes any font already in the project list (case-insensitive).
- Keyboard: ArrowDown/Up cycle `highlightedIndex` over the flat filtered list; Enter selects; clicking via native `pointerdown` on `[data-font-name]`. Selecting sets `localValue`, calls `onChange(prop, fontName)`, closes picker.

---

## 6. FillSection (`ui/sections/FillSection.tsx`)

Renders up to FOUR sub-sections based on `isSvgChild`, `isMedia`. Local state:
- `radiusExpanded` (false) - corner-radius 1-value vs 4-corner.
- `fillMode` = `detectFillMode(s.backgroundColor, s.backgroundImage)`, plus `initialFillMode`, `initialGradient`, `gradient`, `gradientEditingRef`, `prevBgImage`.

`FillMode = "solid" | "linear" | "radial" | "conic"`.

### 6a. Appearance section - rendered when `!isSvgChild`
`<Section label="Appearance">`

1. **Opacity / Z index** - Row, two Fields:
   - `Field label="Opacity"`: `NumberInput prop="opacity" value={s.opacity} min={0} max={1} step={0.01}` + variableProps + changeProps.
   - `Field label="Z index"`: `NumberInput prop="zIndex" value={s.zIndex}` + changeProps (no min/max/variable).

2. **Corner radius** - `<Row label="Corner radius">` (label-variant Row -> `.retune-row-group` + `.retune-group-label-inline`).
   - `radiusExpanded === false`:
     ```jsx
     <div className="retune-row">
       <ShorthandInput
         label={<Tooltip content="Corner radius (TL, TR, BR, BL)" side="top" sideOffset={14}><RadiusTopLeft /></Tooltip>}
         props={["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"]}
         values={[s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius]}
         onChange={onPropertyChange} min={0}
         {...shorthandVariableProps([...])} {...shorthandChangeProps([...])} />
       <Tooltip content="Edit individual corners" side="top">
         <button className="retune-split-btn" onClick={()=>setRadiusExpanded(true)}><AlPaddingSides /></button>
       </Tooltip>
     </div>
     ```
   - `radiusExpanded === true`: TWO `.retune-row` divs:
     - Row 1: NumberInput `borderTopLeftRadius` (label = Tooltip "Top left corner radius" + `<RadiusTopLeft/>`), NumberInput `borderTopRightRadius` (Tooltip "Top right corner radius" + `<RadiusTopRight/>`), then Tooltip "Collapse to single" wrapping `<button className="retune-split-btn active" onClick={()=>setRadiusExpanded(false)}><AlPaddingSides/></button>`.
     - Row 2: NumberInput `borderBottomLeftRadius` (Tooltip "Bottom left corner radius" + `<RadiusBottomLeft/>`), NumberInput `borderBottomRightRadius` (Tooltip "Bottom right corner radius" + `<RadiusBottomRight/>`), then spacer `<div style={{ width: 32 }} />`.
     - All four NumberInputs: `min={0}` + variableProps + changeProps. All radius tooltips use `sideOffset={14}`.

3. **Overflow** - Row, `Field label="Overflow"`: `SelectInput prop="overflow"` options `["visible","hidden","auto","scroll"]`.

### 6b. SVG Fill section - rendered when `isSvgChild`
IIFE; `hasSvgFill = s.fill && s.fill!=="none" && s.fill!=="transparent"`.
`<Section label="Fill" action={...}>`:
- action button (`.retune-section-action`): if `hasSvgFill` -> Tooltip "Remove fill" with `<Minus/>`, onClick `onPropertyChange("fill","none")`; else Tooltip "Add fill" with `<Plus/>`, onClick `onPropertyChange("fill","#000000")`.
- Body only when `hasSvgFill`: `<Row label="Color">` -> `<div className="retune-row"><ColorInput prop="fill" value={s.fill} .../></div>`.

### 6c. SVG Stroke section - rendered when `isSvgChild`
IIFE; `hasStrokeColor = s.stroke && s.stroke!=="none" && s.stroke!=="transparent"`.
`<Section label="Stroke" action={hasStrokeColor ? <Tooltip "Remove stroke"><button.retune-section-action onClick={()=>onPropertyChange("stroke","none")}><Minus/></button></Tooltip> : null}>`
Body (always rendered for SVG child):
- `<Row label="Color">` -> ColorInput prop `stroke`, value `hasStrokeColor ? s.stroke : "transparent"`. onChange also sets `strokeWidth` to "1" if it was falsy or "0".
- `<Row label="Width">` -> `NumberInput label="" prop="strokeWidth" value={s.strokeWidth||"0"} min={0} step={0.5}` + variableProps + changeProps.

### 6d. CSS Fill section - rendered when `!isMedia && !isSvgChild`
IIFE; `fillVarMatch = getVariableMatch("backgroundColor")`, `fillHasVariable = !!fillVarMatch`.
`hasFill`: true if `backgroundImage` set and not "none"; false if `backgroundColor` empty/"transparent"/"rgba(0, 0, 0, 0)"; else true.

`<Section label="Fill" gap={8} action={...}>` - note `gap={8}` overrides the default 12px body gap.

Action area:
```jsx
<div style={{ display: "flex", gap: 2, alignItems: "center" }}>
  {!fillHasVariable && <VariableAction property="backgroundColor" onVariableSelect={...} onVariableApply={...} />}
  {hasFill || fillHasVariable
    ? <Tooltip content="Remove fill" side="top"><button className="retune-section-action" onClick={handleRemoveFill}><Minus/></button></Tooltip>
    : <Tooltip content="Add fill" side="top"><button className="retune-section-action" onClick={handleAddFill}><Plus/></button></Tooltip>}
</div>
```

Body (only when `hasFill || fillHasVariable`):
1. **Fill mode** - `<Row>` with `SelectInput prop="fillMode"` value `fillMode==="solid" ? "solid" : gradient.type`, options `["solid","linear","radial","conic"]`, `onChange={handleFillModeChange}`, plus `isChanged={changeProps("backgroundImage").isChanged}` and `onReset` resetting both `backgroundImage` and `backgroundColor`.
2. If `fillMode === "solid"`: `<Row><ColorInput prop="backgroundColor" value={s.backgroundColor} .../></Row>`.
   Else: `<GradientEditor gradient={gradient} onChange={handleGradientChange} originalGradient={initialGradient ?? undefined} isNewGradient={initialFillMode === "solid"} />` (GradientEditor is out of scope here; see `ui/gradient-editor.tsx`).

Handlers:
- `handleAddFill`: `onPropertyChange("backgroundColor","#ffffff")`.
- `handleRemoveFill`: backgroundColor "transparent", backgroundImage "none", `setFillMode("solid")`.
- `handleFillModeChange(prop,value)`: if "solid" -> backgroundImage "none" + backgroundColor "#ffffff"; else set `gradient.type`, emit `gradientToCss(newGradient)` to backgroundImage, backgroundColor "transparent".
- `handleGradientChange`: sets `gradientEditingRef.current=true`, updates gradient, emits `gradientToCss` to backgroundImage.

`detectFillMode`, `gradientToCss`, `parseCssGradient`, `defaultGradient` live in `ui/gradient-utils.ts` (`FillMode` type line 21; `defaultGradient` line 25; `gradientToCss` line 38; `parseCssGradient` line 79; `detectFillMode` line 226). A bg-image sync effect re-detects fill mode whenever `s.backgroundImage` changes and we are not mid-edit.

---

## 7. BorderSection (`ui/sections/BorderSection.tsx`)

### Derived state
```js
borderSides = [
  {width: s.borderTopWidth,    style: s.borderTopStyle},
  {width: s.borderRightWidth,  style: s.borderRightStyle},
  {width: s.borderBottomWidth, style: s.borderBottomStyle},
  {width: s.borderLeftWidth,   style: s.borderLeftStyle},
];
hasBorder = borderSides.some(side => side.style !== "none" && parseFloat(side.width) > 0);
borderColors = [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor];
activeBorderColor = first side shown (style!=="none" && width>0) -> its color; else s.borderTopColor;
```
Local state `borderExpanded` (false).

### Wrapper + action
`<Section label="Border" action={...}>`:
- `hasBorder` -> Tooltip "Remove border" with `.retune-section-action` `<Minus/>`, onClick `handleRemoveBorder`.
- else -> Tooltip "Add border" with `<Plus/>`, onClick `handleAddBorder`.

`handleAddBorder`: `borderWidth "1px"`, `borderStyle "solid"`, `borderColor "#000000"`.
`handleRemoveBorder`: all four `border*Width` to "0px" and all four `border*Style` to "none".

### Body - only when `hasBorder`

1. **Color** - Row, `Field label="Color"`: `ColorInput prop="borderColor" value={activeBorderColor}` + variableProps("borderColor") + changeProps.

2. **Width**:
   - `borderExpanded === false`: `<Row label="Width">` -> `<div className="retune-row">` with `ShorthandInput props={["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"]} values={[...]} onChange={onPropertyChange} min={0}` + shorthandVariableProps + shorthandChangeProps, then Tooltip "Edit individual sides" wrapping `<button className="retune-split-btn" onClick={()=>setBorderExpanded(true)}><AlPaddingSides/></button>`.
   - `borderExpanded === true`: TWO `.retune-section-row` blocks, each with a `.retune-row`:
     - Block 1: `Field label="Top"` (NumberInput `borderTopWidth`, min 0; onChange also sets `borderTopStyle:"solid"` if `parseFloat(v)>0 && borderTopStyle==="none"`), `Field label="Right"` (NumberInput `borderRightWidth`, same solid-auto-set), then Tooltip "Collapse to shorthand" wrapping `<button className="retune-split-btn active" onClick={()=>setBorderExpanded(false)}><AlPaddingSides/></button>`.
     - Block 2: `Field label="Bottom"` (NumberInput `borderBottomWidth`), `Field label="Left"` (NumberInput `borderLeftWidth`); both with the solid-auto-set; no third button.
     - All four NumberInputs carry `{...changeProps(...)}` (no variableProps in the expanded layout).

3. **Style** - Row, `Field label="Style"`: `SelectInput prop="borderStyle"` value = first non-"none" side style (`s.borderTopStyle !== "none" ? s.borderTopStyle : ... right : ... bottom : s.borderLeftStyle`), options `["solid","dashed","dotted","double","groove","ridge"]`.

---

## 8. Props plumbing (`sections/section-props.ts`)

Callbacks passed in by the parent panel; a port needs equivalent wiring:
- `onPropertyChange(camelProp: string, value: string)` - applies a CSS prop to the selected element.
- `onApplyToElement?(element: Element, property, value)` - applies to an arbitrary element (used by truncation's `fixAncestorMinWidth`).
- `variableProps(camelProp): Record<string,any>` - spreads token-related props (`variableMatch`, `property`, `onVariableSelect/Apply/Unlink`).
- `shorthandVariableProps(camelProps[])` - same for a shorthand group.
- `changeProps(camelProp) -> { isChanged: boolean; onReset: () => void }`.
- `shorthandChangeProps(camelProps[]) -> { isChanged; onReset }`.
- TypographySection extras: `isText: boolean`, `hasVerticalAlign: boolean`, `element` (with `.element` DOM node and `.tagName`), `s` (computed-style record keyed camelCase).
- FillSection extras: `isSvgChild`, `isMedia`, `getVariableMatch(camelProp)`, `onVariableAssociate?`, `onPropertyReset?`.

`s` is a `Record<string,string>` of computed styles keyed by camelCase CSS prop (`s.fontSize`, `s.borderTopLeftRadius`, `s.webkitLineClamp`, ...).

---

## 9. Render-order summary (top to bottom)

For a TEXT element that is not SVG/media (these three sections plus others outside scope):
1. Typography (Font; Size+Weight; Line height+Letter spacing; Color; Align+Vertical+more-toggle; [expanded: Style+Decoration; Transform+White space; Truncate+Max lines; Word break+List style]).
2. Appearance (Opacity+Z index; Corner radius; Overflow).
3. Fill (mode selector + color/gradient).
4. Border (when hasBorder: Color; Width; Style).

For an SVG child shape: Appearance is hidden; instead SVG Fill (simple color) and SVG Stroke (color + width) appear. For images/videos: the CSS Fill section is hidden.
