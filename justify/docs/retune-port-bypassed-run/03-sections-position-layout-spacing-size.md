# Retune Design Panel - Sections: Position, Layout, Spacing, Size

Reference-extraction spec for 1:1 reproduction. Source: `/Users/spare3/Documents/Github/retune/packages/overlay/src`.

All four sections render inside the Shadow-DOM overlay panel. They share the layout primitives in `ui/section.tsx` and the controls in `ui/{number-input,select-input,segmented-control,combo-input,shorthand-input,constraints-input,alignment-grid,grid-picker}.tsx`. Every visible style value comes from `overlay/overlay.css`. Icons come from `ui/icons.tsx` (24x24 art) and `ui/spacing-icons.tsx` (20x20 art, NOT used by these four sections - see note).

> NOTE on placeholder glyph: the default empty-input placeholder in the source is a single EN DASH character (Unicode U+2013), written literally in the code as `placeholder || "<U+2013>"`. Reproduce it as the actual EN DASH glyph, not an ASCII hyphen. Referenced below as `[U+2013]`.

---

## 0. Global host context (applies to every element below)

From `overlay.css` `:host` (lines 1-120):

```
font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;
font-size: 13px;
letter-spacing: -0.005em;
line-height: 1.4;
color: var(--retune-text);
user-select: none; -webkit-user-select: none;
interpolate-size: allow-keywords;
all: initial;
```
`* { box-sizing: border-box; margin: 0; padding: 0; }`. Inputs/textareas/contenteditable re-enable `user-select: text`.

### Theme tokens referenced by these sections (resolved values)

Primitives:
- `--retune-black: #1c1917`; `--retune-white: #ffffff`
- Opacity ramps `--retune-black-N` / `--retune-white-N` = `color-mix(in srgb, base N%, transparent)` for N in {5,10,15,20,25,...,95}.
- Blue ramp: `--retune-blue-500: #0D99FF`, `--retune-blue-700: #0768CF`, `--retune-blue-200: #E5F4FF`, `--retune-blue-100: #F2F9FF`.

Semantic (light mode):
- `--retune-text: var(--retune-black-90)` = `color-mix(in srgb,#1c1917 90%,transparent)`
- `--retune-text-secondary: black-70`; `--retune-text-tertiary: black-50`; `--retune-text-disabled: black-25`
- `--retune-surface: #ffffff`
- `--retune-surface-hover: black-5`; `--retune-surface-active: black-5`
- `--retune-input-bg: black-5`; `--retune-input-bg-hover: black-10`
- `--retune-border: black-10`; `--retune-border-hover: black-15`; `--retune-border-subtle: black-5`; `--retune-shadow: black-10`
- `--retune-blue: #0D99FF`; `--retune-blue-text: #0768CF`; `--retune-blue-bg: #E5F4FF`; `--retune-blue-bg-hover: #F2F9FF`

Dark mode (`:host(.dark)`) swaps: text uses white ramp; `--retune-surface: color-mix(in srgb,#1c1917 95%,#ffffff)`; surfaces/inputs/borders use white ramp; `--retune-blue-text: #0D99FF`; `--retune-blue-bg: color-mix(in srgb,#0768CF 50%,transparent)`; `--retune-blue-bg-hover: color-mix(in srgb,#0768CF 75%,transparent)`.

> Hard-coded colors NOT tokenized (copy literally): `#3b82f6` (pin-line active, pin-center-dot, grid-picker selected cell), `#d6d3d1` (pin-line idle), `#93c5fd` (grid-picker preview cell), `#eeeceb` (grid-picker preview hover bg), `#0D99FF` BLUE + `#a8a29e` GRAY (alignment-grid icon constants in `alignment-grid.tsx` lines 212-213).

---

## 1. Layout primitives (`ui/section.tsx`)

### `Section({ label, gap?, action?, children })`
```jsx
<div className="retune-section">
  <div className="retune-section-header">
    <span className="retune-section-title">{label}</span>
    {action}
  </div>
  {children && <div className="retune-section-body" style={gap!=null?{gap}:undefined}>{children}</div>}
</div>
```
CSS (overlay.css 820-885):
- `.retune-section` { border-bottom: 1px solid var(--retune-border); user-select: none; }
- `.retune-section:last-child` and `.retune-section:has(+ :not(.retune-section))` set `border-bottom: none`.
- `.retune-section-header` { display:flex; align-items:center; justify-content:space-between; padding: 0 8px 0 16px; height: 44px; }
- `.retune-section-title` { font-size:12px; font-weight:500; line-height:20px; color:var(--retune-text); }
- `.retune-section-body` { display:flex; flex-direction:column; gap:12px; padding-bottom:16px; } (default gap 12px; overridden per-Section via the `gap` prop inline style)

### `Row({ label?, children })`
- With `label`: `<div className="retune-row-group"><div className="retune-group-label-inline">{label}</div>{children}</div>`
- Without: `<div className="retune-section-row"><div className="retune-row">{children}</div></div>`

CSS:
- `.retune-section-row` { padding: 0 48px 0 16px; } and if it `:has(.retune-split-btn)` or `:has(.retune-row-action)` then `padding-right: 8px`.
- `.retune-row-group` { display:flex; flex-direction:column; gap:4px; padding: 0 48px 0 16px; } same `:has` right-padding-8px override. `> .retune-row + .retune-row { margin-top: 4px; }`
- `.retune-group-label-inline` { font-size:11px; font-weight:400; letter-spacing:-0.005em; color:var(--retune-text-tertiary); line-height:16px; display:flex; align-items:center; justify-content:space-between; }
- `.retune-row` { display:flex; align-items:flex-end; gap:8px; } Direct `.retune-prop/.retune-combo/.retune-select/.retune-text-input/.retune-font-input/.retune-slider` children get `flex:1; min-width:0`.

### `Field({ label, children })`
```jsx
<div className="retune-field"><span className="retune-field-label">{label}</span>{children}</div>
```
- `.retune-field` { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
- `.retune-field-label` { font-size:11px; font-weight:400; letter-spacing:-0.005em; color:var(--retune-text-tertiary); line-height:16px; }

`RowAction` / `GroupLabel` / `RowGroup` exist but are NOT used by these four sections.

---

## 2. Shared controls (exact CSS + behavior)

### NumberInput (`ui/number-input.tsx`)
DOM:
```jsx
<div className="retune-prop{ retune-prop-variable-applied}">
  <ChangeIndicator isChanged onReset/>
  {label && <span className="retune-prop-label" ...scrub handlers>{label}</span>}
  <input className="retune-prop-input" style={label?undefined:{paddingLeft:8}}
         value={localValue} placeholder={placeholder||"[U+2013]"} readOnly={!!variableMatch} spellCheck={false}/>
  <VariableAction .../>
</div>
```
CSS (overlay.css 1309-1369):
- `.retune-prop` { display:flex; align-items:center; gap:0; height:32px; padding:0; border-radius:8px; background:var(--retune-surface-hover); border:none; min-width:0; overflow:visible; position:relative; transition:background-color .15s ease; }
- `:hover:not(.retune-prop-variable-applied)` sets background var(--retune-border).
- `:focus-within:not(.retune-prop-variable-applied)` sets outline 1px solid var(--retune-border); outline-offset -1px; background var(--retune-surface-hover).
- `.retune-prop-label` { position:absolute; left:0; width:32px; height:32px; flex center; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); cursor:ew-resize; user-select:none; z-index:1; }
- `.retune-prop-input` { flex:1; min-width:0; width:100%; height:100%; border:none; background:transparent; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); outline:none; padding: 0 0 0 32px; }
  - `:first-child` (no label) sets padding-left:12px (but JSX also sets inline `paddingLeft:8` when no label; inline 8px wins over the 12px rule).
  - `::selection` sets background var(--retune-blue-bg); color var(--retune-text).
- Placeholder default char is an EN DASH (U+2013).

Behavior:
- Scrub-to-adjust: pointerdown on label sets `{startX, startVal=parseFloat(localValue), active:true}` and `setPointerCapture`. pointermove: `pixelDelta = clientX - startX`; `raw = startVal + Math.round(pixelDelta) * baseStep` (baseStep = `step ?? 1`); precision = `step<1 ? ceil(-log10(step)) : 0`; round to precision; clamp(min,max); reattach unit (`localValue.match(/[a-z%]+$/i)?.[0] || ""`). 1px = 1 step.
- When there is NO label, scrub works from the input itself only within `SCRUB_ZONE = 16` px of the left edge; cursor becomes `ew-resize` when pointer is in-zone, `""` otherwise.
- Keyboard: Enter commits + blurs. ArrowUp/Down adjusts by +/- step (Shift x10), clamped, unit preserved; ignored when value is a non-numeric keyword. Focus selects all text.
- Commit/blur: `inferCssUnit(localValue, prevValue, prop)` then `clampCssValue`. Bare number gets unit inferred from previous value's unit (must be a valid CSS unit) else `px`. Unitless props (`opacity,z-index,font-weight,flex-grow,flex-shrink,order,orphans,widows,columns,column-count,tab-size` + camel variants) never get a unit.
- `roundCssValue`: rounds every decimal run to 2 dp, strips trailing zeros (1.20 becomes 1.2, 12.00 becomes 12).
- If `variableMatch` is set the input is read-only; clicking opens the variable picker.

### ComboInput (`ui/combo-input.tsx`) - used by SizeSection Width/Height
DOM (normal, no variable):
```jsx
<div className="retune-combo">
  <ChangeIndicator/>
  {label && <span className="retune-combo-label" ...scrub>{label}</span>}
  <input className="retune-combo-input" style={label?undefined:{paddingLeft:8}} value={displayValue} placeholder="[U+2013]" spellCheck={false}/>
  <button className="retune-combo-trigger" aria-label="Toggle options"><ChevronDown/></button>
  {open && <div className="retune-combo-dropdown-anchor" style={{top,left,width}}><DropdownMenu showCheckmark/></div>}
</div>
```
CSS (overlay.css 2357-2438):
- `.retune-combo` { display:flex; align-items:center; height:32px; min-width:0; overflow:visible; position:relative; gap:1px; }
- `.retune-combo-label` { position:absolute; left:0; width:32px; height:32px; flex center; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-tertiary); cursor:ew-resize; z-index:1; }
- `.retune-combo-input` { flex:1; min-width:0; height:100%; border:none; background:var(--retune-surface-hover); border-radius: 8px 0 0 8px; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); outline:none; padding: 0 0 0 32px; transition:background-color .15s ease; }
  - `:hover:not(.variable-applied)` sets background var(--retune-border). `:focus` sets outline 1px solid var(--retune-border); offset -1px. `::selection` blue-bg.
- `.retune-combo-trigger` { width:32px; height:32px; flex center; background:var(--retune-surface-hover); border-radius: 0 8px 8px 0; border:none; cursor:pointer; color:var(--retune-text-secondary); transition:background-color .15s, color .12s; } hover sets bg border, color text.
- `.retune-combo-dropdown-anchor` { position:fixed; z-index:2147483647; }

Behavior: same scrub math as NumberInput but uses raw `delta` (not xstep) and clamps to 0 for props NOT containing margin/top/right/bottom/left/indent. `displayValue` shows the matching option's label if `localValue` equals an option value (so `"__fill"` shows "Fill", `"__hug"` shows "Hug"). Typing a label/value that matches an option fires `onChange` with the option value. Arrow keys when closed adjust by +/-1 / +/-10. When variables are available for the property, an "Add variable" option with `separatorBefore:true` is appended. `useScrollLock(open)`.

### SelectInput (`ui/select-input.tsx`) - used by Position Type, Layout Reverse/Wrap
DOM:
```jsx
<div className="retune-select">
  <ChangeIndicator/>
  <button className="retune-select-button">
    {label && <span className="retune-select-label">{label}</span>}
    <span className="retune-select-value" style={label?undefined:{paddingLeft:8}}>{sentenceCase(localValue)}</span>
    <span className="retune-select-chevron"><ChevronDown/></span>
  </button>
  {open && <div className="retune-select-dropdown-anchor" style={{top,right,minWidth}}><DropdownMenu showCheckmark/></div>}
</div>
```
CSS (overlay.css 1984-2054):
- `.retune-select` { position:relative; min-width:0; overflow:visible; }
- `.retune-select-button` { display:flex; align-items:center; width:100%; height:32px; border-radius:8px; background:var(--retune-surface-hover); border:none; cursor:pointer; font-family:inherit; padding:0; transition:background-color .15s ease; position:relative; } hover sets bg border; focus-visible sets outline 1px solid var(--retune-text), offset -1px.
- `.retune-select-label` { position:absolute; left:0; width:32px; height:32px; flex center; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-tertiary); }
- `.retune-select-value` { flex:1; min-width:0; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); text-align:left; padding-left:32px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
- `.retune-select-chevron` { width:32px; height:32px; flex center; color:var(--retune-text-secondary); }
- `.retune-select-dropdown-anchor` { position:fixed; z-index:2147483647; width:max-content; }
- `sentenceCase(s)` = uppercase first char + rest with `-` replaced by spaces (so "wrap-reverse" becomes "Wrap reverse"). `useScrollLock(open)`. macOS-style menu positioning aligns the selected item with the trigger (via `calcMenuPosition`).

### SegmentedControl (`ui/segmented-control.tsx`) - used by Layout Display
DOM:
```jsx
<div className="retune-segmented" style={disabled?{opacity:.4,pointerEvents:'none'}:undefined}>
  <div className="retune-segmented-pill"/>
  {options.map(opt => <button className="retune-segmented-item{ selected}{ disabled}" aria-pressed aria-label>{opt.icon || <span className="retune-segmented-text">{opt.label}</span>}</button>)}
</div>
```
CSS (overlay.css 2130-2194):
- `.retune-segmented` { display:flex; position:relative; height:32px; background:var(--retune-surface-hover); border-radius:8px; overflow:hidden; flex:1; }
- `.retune-segmented-pill` { position:absolute; top:0; left:0; height:100%; border-radius:8px; background:var(--retune-surface); border:1px solid var(--retune-border); box-sizing:border-box; transition: transform 200ms cubic-bezier(0.77,0,0.175,1); will-change:transform; pointer-events:none; z-index:0; }
- `.retune-segmented-item` { flex center; flex:1; height:32px; border:none; border-radius:8px; background:transparent; cursor:pointer; padding:0; color:var(--retune-text); transition:color 150ms ease; position:relative; z-index:1; }
  - `:hover:not(.disabled)` sets color var(--retune-text-secondary). `.selected` sets color var(--retune-text). `.disabled` sets opacity .3; cursor not-allowed.
- `.retune-segmented-item svg` { width:24px; height:24px; display:block; }
- `.retune-segmented-text` { font-size:11px; font-weight:500; letter-spacing:-0.005em; }

Behavior: pill slides to the active button. Pill width = active button's measured width (px); transform `translateX(offsetX)` where offsetX = btnRect.left - containerRect.left. First render skips the transition (sets `transition:none`, forces reflow via `pill.offsetHeight`, restores). If no option matches `localValue`, pill `opacity:0`. Icon+label buttons are wrapped in `<Tooltip content={label}>`.

### ShorthandInput (`ui/shorthand-input.tsx`) - used by Spacing collapsed mode
Same DOM/CSS classes as NumberInput (`.retune-prop` / `.retune-prop-label` / `.retune-prop-input`). Displays a merged value when all props equal, else comma-joined. Commit parses "10" to all-equal; "10, 20" or "10 20" to individual (cycles if fewer parts than props). Scrub changes all values by the same `Math.round(delta)`; default unit when value has none is `px` (NumberInput uses `""`). Arrow keys +/-1 / +/-10 skip non-numeric parts. Placeholder default also U+2013.

### DropdownMenu shell (referenced by Select/Combo/Size action - `ui/dropdown-menu.tsx`, not in scope list)
CSS for the size-action menu uses `.retune-dropdown-menu` (overlay.css 1261-1306): position:absolute; top:100%; right:0; margin-top:4px; min-width:140px; background:var(--retune-surface); border-radius:10px; box-shadow: 0 4px 16px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06); padding:4px; z-index:100; entry animation `retune-dropdown-in 0.15s cubic-bezier(0.23,1,0.32,1)` (opacity 0 to 1, translateY -4px to 0, scale .97 to 1). `.retune-dropdown-item` { height:32px; gap:8px; border-radius:6px; font-size:13px; padding:0 10px; transition background .1s; } hover bg var(--retune-input-bg). (A separate menu-wrapper variant at line 2441+ uses border-radius:12px / min-width max(120px,100%).)

---

## 3. PositionSection (`ui/sections/PositionSection.tsx`)

`<Section label="Position">`. Section body gap = 12px (default).

Local state:
- `positionType = s.position || "static"`; `isSticky = positionType === "sticky"`.
- `pins: PinState` initialized from authored top/right/bottom/left detection. If computed `position` is not absolute/fixed it returns `{top:true,right:false,bottom:false,left:true}`. Else `isAuthored(prop)` checks inline style then every stylesheet rule matching the element for a non-`auto` value. Derived: `top = hasTop || (!hasTop && !hasBottom)`; `right = hasRight && !hasLeft`; `bottom = hasBottom && !hasTop`; `left = hasLeft || (!hasLeft && !hasRight)`.
- `centered` boolean; `centeredAxes = useRef({h,v})`.

### Row order (top to bottom):

Row 1 - Alignment (always rendered). Custom (not the `Field` component but identical class):
```jsx
<Row>
  <div className="retune-field">
    <span className="retune-field-label">Alignment</span>
    <div className="retune-align-row">
      <div className="retune-btn-group" style={!hEnabled?{opacity:.3,pointerEvents:'none'}:undefined}>
        <Tooltip content="Align left" side="top"><button className="retune-align-btn{ active}" onClick=onHClick('start')><LayoutAlignLeft/></button></Tooltip>
        <Tooltip content="Align center horizontally"...><button><LayoutAlignHorizontalCenter/></button></Tooltip>
        <Tooltip content="Align right"...><button><LayoutAlignRight/></button></Tooltip>
      </div>
      <div className="retune-btn-group" style={!vEnabled?{opacity:.3,...}:undefined}>
        <Tooltip content="Align top"...><button><LayoutAlignTop/></button></Tooltip>
        <Tooltip content="Align center vertically"...><button><LayoutAlignVerticalCenter/></button></Tooltip>
        <Tooltip content="Align bottom"...><button><LayoutAlignBottom/></button></Tooltip>
      </div>
    </div>
  </div>
</Row>
```
CSS (overlay.css 909-952):
- `.retune-align-row` { display:flex; gap:8px; }
- `.retune-btn-group` { display:flex; flex:1; background:var(--retune-surface-hover); border-radius:8px; overflow:hidden; }
  - `> :not(:first-child) > .retune-align-btn` sets `box-shadow: inset 1px 0 0 var(--retune-surface);` (separator between buttons).
- `.retune-align-btn` { flex center; flex:1; height:32px; border:none; background:transparent; color:var(--retune-text); cursor:pointer; padding:0; transition:background .15s; } hover sets bg var(--retune-border); `.active` sets bg var(--retune-border).

Two `.retune-btn-group` of 3 buttons each: horizontal group (left/center/right) and vertical group (top/center/bottom). Each button contains a 24x24 layout-align icon.

Enable / active logic:
- `isAbsoluteOrFixed = positionType absolute|fixed`. `isFlexColumn = isFlexChild && parentFlexDir.startsWith("column")`. `isFlexRow = isFlexChild && !column`.
- `hEnabled = isAbsoluteOrFixed || isGridChild || isFlexColumn`. `vEnabled = isAbsoluteOrFixed || isGridChild || isFlexRow`. Disabled group gets inline `opacity:0.3; pointer-events:none`.
- `hActive`/`vActive` (`"start"|"center"|"end"|null`): flex uses `alignSelf` mapping (flex-start/start to start, center to center, flex-end/end to end); grid H uses `justifySelf`, V uses `alignSelf`. Active button gets class `active`.
- `onHClick(alignment)`: absolute/fixed runs alignLeft/alignCenterH/alignRight. Grid toggles `justifySelf` (set alignment, or "auto" if already active). FlexColumn toggles `alignSelf` (flex-start/center/flex-end, or "auto").
- `onVClick(alignment)`: absolute/fixed runs alignTop/alignCenterV/alignBottom. Grid toggles `alignSelf`. FlexRow toggles `alignSelf`.
- Absolute/fixed align helpers set explicit offsets: left sets `left:0px,right:auto`; centerH sets `left:50%,right:auto` + transform; right sets `right:0px,left:auto`; top sets `top:0px,bottom:auto`; centerV sets `top:50%,bottom:auto`; bottom sets `bottom:0px,top:auto`. `applyTransform()` writes transform: both centered set `translate(-50%,-50%)`, only h sets `translateX(-50%)`, only v sets `translateY(-50%)`, none sets `none`.

Row 2 - Type (always). `<Row><Field label="Type"><SelectInput prop="position" value={positionType} options={["static","relative","absolute","fixed","sticky"]} onChange/></Field></Row>`

Row 3 - Constraints (ONLY when "absolute" or "fixed"). `<Row><ConstraintsInput top right bottom left pins centered onChange onPinChange onCenterChange/></Row>` see 3a.

Row 4 - Offsets (ONLY when "relative"). `<Row label="Offsets">` containing two `.retune-row` rows:
- Row A: NumberInput label "T" prop top; NumberInput label "R" prop right.
- Row B: NumberInput label "B" prop bottom; NumberInput label "L" prop left.
- Each NumberInput gets `{...changeProps(prop)}`.

Row 5 - Sticky offset (ONLY when "sticky"). `<Row label="Sticky offset">` containing one `.retune-row`: NumberInput "T" prop top; NumberInput "B" prop bottom.

> Only ONE of Constraints / Offsets / Sticky-offset renders, gated by position type. Static and relative-without-offset still always show Alignment + Type.

### 3a. ConstraintsInput (`ui/constraints-input.tsx`)
DOM:
```jsx
<div className="retune-constraints">
  <div className="retune-constraints-side"><NumberInput label="L" prop="left" value/></div>
  <div className="retune-constraints-center">
    <NumberInput label="T" prop="top"/>
    <div className="retune-pin-box">
      <PinLine side="top"/><PinLine side="right"/><PinLine side="bottom"/><PinLine side="left"/>
      <button className="retune-pin-center-btn" aria-label=...>{centered && <span className="retune-pin-center-dot"/>}</button>
    </div>
    <NumberInput label="B" prop="bottom"/>
  </div>
  <div className="retune-constraints-side"><NumberInput label="R" prop="right"/></div>
</div>
```
CSS (overlay.css 1080-1173):
- `.retune-constraints` { display:flex; gap:4px; align-items:center; width:100%; }
- `.retune-constraints-side` { flex:1; min-width:0; display:flex; align-items:center; }
- `.retune-constraints-center` { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; align-items:stretch; }
- `.retune-pin-box` { position:relative; background:var(--retune-surface-hover); border-radius:8px; width:100%; height:64px; }
- `.retune-pin-line` { position:absolute; flex center; padding:0; border:none; background:transparent; cursor:pointer; width:16px; height:16px; }
  - `.top` { left:50%; transform:translateX(-50%); top:2px; }
  - `.right` { left:calc(75% - 2px); top:24px; }
  - `.bottom` { left:50%; transform:translateX(-50%); bottom:2px; }
  - `.left` { left:calc(25% - 14px); top:24px; }
- `.retune-pin-center-btn` { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:24px; height:24px; background:var(--retune-surface); border:1px solid var(--retune-border); border-radius:8px; cursor:pointer; flex center; padding:0; } hover sets border-color var(--retune-border-hover).
- `.retune-pin-center-dot` { width:4px; height:4px; border-radius:50%; background:#3b82f6; }

`PinLine` renders a 16x16 SVG with a single rounded line:
- vertical (top/bottom): `<line x1="8" y1="3" x2="8" y2="13" strokeWidth="2" strokeLinecap="round"/>`
- horizontal (right/left): `<line x1="3" y1="8" x2="13" y2="8" strokeWidth="2" strokeLinecap="round"/>`
- stroke = `#3b82f6` when pinned, `#d6d3d1` when not. `aria-label` = `${pinned?"Unpin":"Pin"} ${side}`.

Behavior:
- `allPinned = top&&right&&bottom&&left`.
- `togglePin(side)`: flips pin; if `centered` clears it and sets transform:none; if was pinned sets `side:"auto"`; if newly pinned and current value empty/auto sets `side:"0px"`.
- `handleCenterClick`: if centered clears all pins, all sides "auto", transform "none". Else if allPinned sets centered=true, top/left "50%", right/bottom "auto", transform "translate(-50%,-50%)". Else pins every unpinned side (set "0px" where empty/auto).
- Pin lines render `pinned={!centered && pins.side}`. Center-button `aria-label`: centered gives "Clear center alignment"; allPinned gives "Align to center"; else "Pin all sides".

---

## 4. LayoutSection (`ui/sections/LayoutSection.tsx`)

`<Section label="Layout">`. Section body gap 12px.

`displayValue = s.display || "block"`; `isFlex = displayValue.includes("flex")`; `isGrid = displayValue.includes("grid")`.

### Row 1 - Display (always)
`<Row><Field label="Display"><SegmentedControl options={DISPLAY_OPTIONS} value=... onChange=.../></Field></Row>`

`DISPLAY_OPTIONS` (icons 24x24 from icons.tsx). The label strings contain literal arrow glyphs in source:
| value | icon | label (tooltip) |
|---|---|---|
| `block` | `<RectangleSmall/>` | "Block" |
| `flex-row` | `<AutolayoutAddHorizontal/>` | "Flex " + RIGHTWARDS ARROW (U+2192) |
| `flex-column` | `<AutolayoutAddVertical/>` | "Flex " + DOWNWARDS ARROW (U+2193) |
| `grid` | `<GridView/>` | "Grid" |

Value resolution: display includes "flex" gives (flexDirection startsWith "column" ? "flex-column" : "flex-row"); else includes "grid" gives "grid"; else "block".
onChange: "flex-row" sets display:flex + flexDirection:row; "flex-column" sets display:flex + flexDirection:column; otherwise sets display:v.

### Flex block (ONLY when `isFlex`) - wrapped in a fragment
Sub-row A (custom, not `Row`): `<div className="retune-section-row"><div className="retune-row" style={{alignItems:'flex-start'}}>` with two `flex:1` columns:
- Left: `<Field label="Alignment"><AlignmentGrid justifyContent={s.justifyContent||"flex-start"} alignItems={s.alignItems||"stretch"} flexDirection={s.flexDirection||"row"} onChange/></Field>` see 4a.
- Right (`onPointerEnter/Leave` fire `onPropertyHover("gap"|null)`): `<Field label="Gap"><NumberInput label={<Tooltip content=... side="top" sideOffset={14}>{column?<AlSpacingVertical/>:<AlSpacingHorizontal/>}</Tooltip>} prop="gap" value={s.gap} min={0} {...changeProps("gap")}/></Field>`. Tooltip text: column gives "Vertical gap between items", else "Horizontal gap between items".

Sub-row B is `<Row>` with two `Field`s:
- `<Field label="Reverse"><SelectInput prop="flexDirection" value={flexDirection.includes("reverse")?"yes":"no"} options={["no","yes"]} onChange=(base = column?"column":"row"; set `${base}-reverse` or base)/></Field>`
- `<Field label="Wrap"><SelectInput prop="flexWrap" value={s.flexWrap} options={["nowrap","wrap","wrap-reverse"]} onChange/></Field>`

### Grid block (ONLY when `isGrid`)
`<Row>` with two `flex:1` columns:
- Left: `<Field label="Grid"><GridPicker columns={parseGridCount(s.gridTemplateColumns)} rows={parseGridCount(s.gridTemplateRows)} onChange/></Field>` see 4b.
- Right (hover fires `onPropertyHover("gap")`): `<Field label="Gap"><div style={{display:'flex',flexDirection:'column',gap:8}}>` containing two stacked NumberInputs:
  - columnGap: label `<Tooltip content="Horizontal gap between columns" side="top" sideOffset={14}><AlSpacingHorizontal/></Tooltip>`, min 0, `{...variableProps("columnGap")} {...changeProps("columnGap")}`.
  - rowGap: label `<Tooltip content="Vertical gap between rows"...><AlSpacingVertical/></Tooltip>`, min 0, variableProps+changeProps for "rowGap".

> Display=block shows ONLY the Display row. Flex and grid blocks are mutually exclusive.

### 4a. AlignmentGrid (`ui/alignment-grid.tsx`)
DOM:
```jsx
<div className="retune-alignment-grid" tabIndex={0} role="grid" aria-label="Alignment grid" onKeyDown onDoubleClick>
  {3x3 cells, each} <Tooltip content={CELL_TOOLTIPS["r-c"]} side="bottom" delay={600}>
    <button className="retune-alignment-cell" tabIndex={-1} aria-label={pos.replace("-"," ")} onClick onMouseEnter onMouseLeave>{icon}</button>
  </Tooltip>
</div>
```
CSS (overlay.css 954-984):
- `.retune-alignment-grid` { display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); background:var(--retune-surface-hover); border-radius:8px; width:100%; height:72px; outline:none; } `:focus-visible` sets outline 1px solid var(--retune-text), offset -1px.
- `.retune-alignment-cell` { flex center; border:none; background:transparent; padding:0; cursor:pointer; overflow:hidden; } hover sets color var(--retune-text).

Icon colors: `BLUE = "#0D99FF"`, `GRAY = "#a8a29e"`. Each cell shows: selected cell -> flow-aware position icon in BLUE; hovered cell -> same icon in GRAY; otherwise -> `IconDot` (small dot, fillOpacity 0.3) in GRAY. In space-between mode cells show bar icons (IconSBBarH/V variants) for the active cross-axis group.

`CELL_TOOLTIPS`: `0-0` "Align top left", `0-1` "Align top center", `0-2` "Align top right", `1-0` "Align center left", `1-1` "Align center", `1-2` "Align center right", `2-0` "Align bottom left", `2-1` "Align bottom center", `2-2` "Align bottom right".

Behavior:
- `flow = flexDirection.startsWith("column") ? "vertical" : "horizontal"`.
- Vertical: row=justify(main), col=align(cross). Horizontal: row=align(cross), col=justify(main).
- Value indices: center=1, flex-end/end=2, else=0. JUSTIFY/ALIGN_VALUES = `["flex-start","center","flex-end"]`.
- Click sets justifyContent + alignItems via `positionToCss`. In space-between, click only sets `alignItems` (cross axis).
- Double-click toggles space-between: not-SB sets `justifyContent:"space-between"`; SB exits using the clicked (or selected) cell's normal position.
- Arrow keys move selection within the 3x3 (in SB only along the cross axis). Inline 16x16 SVG icons (IconDot, IconPosition*, IconSBBar*) defined verbatim in this file.

### 4b. GridPicker (`ui/grid-picker.tsx`)
DOM (rested):
```jsx
<div className="retune-grid-picker-wrap">
  <button className="retune-grid-picker-preview" aria-label={`Grid: ${cols} x ${rows}`}>
    <div className="retune-grid-picker-mini" style={{gridTemplateColumns:repeat(cols,1fr),gridTemplateRows:repeat(rows,1fr)}}>
      {cols*rows times <div className="retune-grid-picker-mini-cell"/>}
      <span className="retune-grid-picker-label">{cols} (U+00D7) {rows}</span>
    </div>
  </button>
  {open && <div className="retune-grid-picker-dialog">...</div>}
</div>
```
Dialog:
```jsx
<div className="retune-grid-picker-dialog">
  <div className="retune-grid-picker-dialog-header">{prevC>0&&prevR>0 ? `${prevC} (U+00D7) ${prevR}` : "Select grid size"}</div>
  <div className="retune-grid-picker-grid" onMouseLeave onClick={handleSelect}>
    {10x10 times <div className="retune-grid-picker-cell{ selected}{ preview}" onMouseEnter/>}
  </div>
</div>
```
(The literal label glyph between numbers is the MULTIPLICATION SIGN U+00D7, NOT the letter x; reproduce as U+00D7.)

CSS (overlay.css 986-1078):
- `.retune-grid-picker-wrap` { position:relative; }
- `.retune-grid-picker-preview` { display:flex; align-items:center; gap:8px; width:100%; height:72px; padding:4px; background:var(--retune-surface-hover); border:1px solid var(--retune-border); border-radius:8px; cursor:pointer; box-sizing:border-box; } hover sets background:#eeeceb.
- `.retune-grid-picker-mini` { display:grid; gap:2px; flex:1; height:100%; position:relative; }
- `.retune-grid-picker-mini-cell` { background:var(--retune-surface); border-radius:2px; min-width:0; min-height:0; }
- `.retune-grid-picker-label` { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:11px; font-family:ui-monospace, monospace; color:var(--retune-text-secondary); white-space:nowrap; pointer-events:none; }
- `.retune-grid-picker-dialog` { position:absolute; top:100%; left:0; margin-top:4px; padding:8px; background:var(--retune-surface); border:1px solid var(--retune-border); border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index:100; display:flex; flex-direction:column; gap:6px; }
- `.retune-grid-picker-dialog-header` { font-size:11px; font-family:ui-monospace,monospace; color:var(--retune-text-secondary); text-align:center; }
- `.retune-grid-picker-grid` { display:grid; grid-template-columns:repeat(10,18px); grid-template-rows:repeat(10,18px); gap:2px; cursor:pointer; }
- `.retune-grid-picker-cell` { border-radius:2px; background:var(--retune-border); } `.selected` gives #3b82f6; `.preview` gives #93c5fd.

Behavior: `MAX_COLS=MAX_ROWS=10`. `parseGridCount`: none/empty gives 0; `repeat(N,...)` gives N; else count of space-separated tracks. `displayCols/Rows = max(1, value||1)`. Hover sets hoverCol/hoverRow (1-based). Click in dialog runs `handleSelect`: if hoverCol>0 && hoverRow>0 set `gridTemplateColumns: repeat(C,1fr)` + `gridTemplateRows: repeat(R,1fr)`, close. Cells `selected` when not hovering and col<=columns && row<=rows; `preview` when hovering and col<=hoverCol && row<=hoverRow. `useScrollLock(open)`.

---

## 5. SpacingSection (`ui/sections/SpacingSection.tsx`)

`<Section label="Spacing">`. Section body gap 12px. Local state: `paddingExpanded`, `marginExpanded` (both default `false`).

### Row 1 - `<Row label="Padding">`
Collapsed (default, `!paddingExpanded`): one `.retune-row`:
- ShorthandInput (flex:1, hover fires `onPropertyHover("paddingInline")`): label `<Tooltip content="Horizontal padding (left, right)" side="top" sideOffset={14}><AlPaddingHorizontal/></Tooltip>`, props `["paddingLeft","paddingRight"]`, values `[s.paddingLeft,s.paddingRight]`, `min={0}`, plus `{...shorthandVariableProps([...])} {...shorthandChangeProps([...])}`.
- ShorthandInput (flex:1, hover `paddingBlock`): label `<Tooltip content="Vertical padding (top, bottom)"...><AlPaddingVertical/></Tooltip>`, props `["paddingTop","paddingBottom"]`, `min={0}`.
- `<Tooltip content="Edit individual sides" side="top"><button className="retune-split-btn" onClick=setPaddingExpanded(true)><AlPaddingSides/></button></Tooltip>`

Expanded (`paddingExpanded`): two `.retune-row` rows.
- Row A: NumberInput paddingLeft (label Tooltip "Padding left" `<AlPaddingLeft/>`, min 0) | NumberInput paddingTop ("Padding top" `<AlPaddingTop/>`, min 0) | `<Tooltip content="Collapse to axes"><button className="retune-split-btn active" onClick=setPaddingExpanded(false)><AlPaddingSides/></button></Tooltip>`.
- Row B: NumberInput paddingRight ("Padding right" `<AlPaddingRight/>`, min 0) | NumberInput paddingBottom ("Padding bottom" `<AlPaddingBottom/>`, min 0) | `<div style={{width:32}}/>` (spacer aligned under the collapse button).
- Each side NumberInput wrapped in `<div style={{flex:1}}>` with `onPointerEnter/Leave` firing `onPropertyHover(paddingLeft|paddingTop|paddingRight|paddingBottom)`. Each gets `{...variableProps(prop)} {...changeProps(prop)}`.

### Row 2 - `<Row label="Margin">`
Identical structure to Padding but for margin props and WITHOUT `min={0}` (margins may be negative):
Collapsed: ShorthandInput `["marginLeft","marginRight"]` (label `<AlPaddingHorizontal/>` "Horizontal margin (left, right)", hover "marginInline") | ShorthandInput `["marginTop","marginBottom"]` (label `<AlPaddingVertical/>` "Vertical margin (top, bottom)", hover "marginBlock") | split-btn ("Edit individual sides") `<AlPaddingSides/>` sets setMarginExpanded(true).
Expanded: Row A: marginLeft (`<AlPaddingLeft/>` "Margin left") | marginTop (`<AlPaddingTop/>` "Margin top") | split-btn.active ("Collapse to axes") `<AlPaddingSides/>`. Row B: marginRight (`<AlPaddingRight/>` "Margin right") | marginBottom (`<AlPaddingBottom/>` "Margin bottom") | `<div style={{width:32}}/>`.

Tooltips all use `side="top" sideOffset={14}`. Icons used are from icons.tsx (24x24): `AlPaddingTop, AlPaddingBottom, AlPaddingLeft, AlPaddingRight, AlPaddingHorizontal, AlPaddingVertical, AlPaddingSides`. (The `ui/spacing-icons.tsx` file's 20x20 `IconSpacing*` / `IconGap*` variants are NOT imported here; separate icon set.)

`.retune-split-btn` CSS (overlay.css 1230-1255): flex center; width/height 32px; border:none; border-radius:8px; background:transparent; color:var(--retune-text); cursor:pointer; padding:0; flex-shrink:0; transition: background .15s, color .15s. hover sets background var(--retune-surface-active). `.active` sets color var(--retune-text); background var(--retune-input-bg-hover).

---

## 6. SizeSection (`ui/sections/SizeSection.tsx`)

Two modes.

### Frame mode (ONLY when `frameDimensions` prop set; iframe sizing)
```jsx
<Section label="Size">
  <Row>
    <Field label="Width"><NumberInput prop="width" value={`${frameDimensions.width}px`} min={200} onChange=(parseInt, n>0 sets onResize(n,height))/></Field>
    <Field label="Height"><NumberInput prop="height" value={`${frameDimensions.height}px`} min={200} onChange=(n>0 sets onResize(width,n))/></Field>
  </Row>
</Section>
```
No aspect lock, no min/max, no fill/hug.

### Normal mode
`<Section label="Size" action={<>...Plus button + dropdown...</>}>`.

Section action (in header):
```jsx
<Tooltip content="Add constraint" side="top">
  <button ref className="retune-section-action" onClick=toggle><Plus/></button>
</Tooltip>
{sizeMenuOpen && sizeMenuPos && (
  <div ref style={{position:'fixed', top:sizeMenuPos.top, left:sizeMenuPos.left, transform:'translateX(-100%)', zIndex:2147483647}}>
    <DropdownMenu options={[{value:'min',label: has('min')?'Remove min size':'Add min size'},{value:'max',label: has('max')?'Remove max size':'Add max size'}]} value={undefined} showCheckmark={false} onSelect=.../>
  </div>
)}
```
- `.retune-section-action` (overlay.css 844-860): flex center; width/height 32px; border:none; border-radius:8px; background:transparent; color:var(--retune-text); cursor:pointer; padding:0. hover sets background var(--retune-surface-hover).
- Position from button rect: `top = rect.bottom + 4`, `left = rect.right`, then `transform: translateX(-100%)` so the menu's right edge aligns to the button right.
- Closes on outside pointerdown (listener attached to the shadow root). `<Plus/>` icon 24x24.
- onSelect for min/max: if currently visible, reset values (min: minWidth/minHeight "0px"; max: maxWidth/maxHeight "none") and remove from `sizeExtras`. Else add to `sizeExtras`. Close menu.

Row 1 - Width / Height / aspect-lock (always): `<Row>`:
- `<Field label="Width"><ComboInput prop="width" value={widthDisplayValue} options={SIZE_OPTIONS} onChange=... {...changeProps("width")}/></Field>`
- `<Field label="Height"><ComboInput prop="height" value={heightDisplayValue} options={heightSizeOptions} onChange=... {...changeProps("height")}/></Field>`
- `<Tooltip content={aspectLocked?"Unlock aspect ratio":"Lock aspect ratio"} side="top"><button className="retune-split-btn{ active}" onClick=...>{aspectLocked? lockedSvg : unlockedSvg}</button></Tooltip>`

`SIZE_OPTIONS` (ComboOption[]): `[{value:"__fill",label:"Fill"}, {value:"__hug",label:"Hug"}, {value:"auto",label:"Auto"}]`.
`FLEX_BASIS_OPTIONS` is declared (`[{auto,Auto},{0,0},{100%,100%},{fit-content,Fit Content}]`) but NOT used in the current render.
- `widthMode/heightMode = detectSizingMode(axis, ctx)`; `heightCanFill = canFill("height", ctx)`; `heightSizeOptions = heightCanFill ? SIZE_OPTIONS : SIZE_OPTIONS without "__fill"`.
- `widthDisplayValue = widthMode==="fill"?"__fill":widthMode==="hug"?"__hug":s.width`; same for height.

ComboInput onChange: `__fill` runs `handleSizingModeChange(axis,"fill")`; `__hug` runs `"hug"`; else: if `isFlexChild` first `handleSizingModeChange(axis,"fixed")`, then `onPropertyChange(prop,val)`; if `aspectLocked` and val parses, compute the other axis from `aspectRatioRef` and apply on next `requestAnimationFrame` (`height = round(width/ratio)` or `width = round(height*ratio)`).

Aspect-lock button: uses `.retune-split-btn` (32x32). On lock: if element height>0, `aspectRatioRef.current = rect.width/rect.height`, set attribute `data-retune-aspect-locked="true"`. On unlock: remove the attribute. Two inline 16x16 SVGs (viewBox 0 0 24 24, fill currentColor fillOpacity 0.9); locked = closed padlock, unlocked = open padlock. Verbatim path data:
- Locked: `d="M12 4C14.2091 4 16 5.79086 16 8V10H16.125C17.1605 10 18 10.8395 18 11.875V17.125C18 18.1605 17.1605 19 16.125 19H7.875C6.83947 19 6 18.1605 6 17.125V11.875C6 10.8395 6.83947 10 7.875 10H8V8C8 5.79086 9.79086 4 12 4ZM7.875 11C7.39175 11 7 11.3918 7 11.875V17.125C7 17.6082 7.39175 18 7.875 18H16.125C16.6082 18 17 17.6082 17 17.125V11.875C17 11.3918 16.6082 11 16.125 11H7.875ZM15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8V10H15V8Z"`
- Unlocked: `d="M16.125 10C17.1605 10 18 10.8395 18 11.875V17.125C18 18.1605 17.1605 19 16.125 19H7.875C6.83947 19 6 18.1605 6 17.125V11.875C6 10.8395 6.83947 10 7.875 10H8V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V7.5C16 7.77614 15.7761 8 15.5 8C15.2239 8 15 7.77614 15 7.5V7C15 5.34315 13.6569 4 12 4C10.3431 4 9 5.34315 9 7V10H16.125ZM7.875 11C7.39175 11 7 11.3918 7 11.875V17.125C7 17.6082 7.39175 18 7.875 18H16.125C16.6082 18 17 17.6082 17 17.125V11.875C17 11.3918 16.6082 11 16.125 11H7.875Z"`

Row 2 - Min size (ONLY when `visibleSizeExtras.has("min")`): `<div className="retune-section-row"><div className="retune-row">`:
- `<Field label="Min W"><NumberInput prop="minWidth" value={minWidth==="0px"||"auto"?"":minWidth} placeholder="[U+2013]" onChange=(empty sets "0px" else v) {...changeProps}/></Field>`
- `<Field label="Min H"><NumberInput prop="minHeight" ... same logic/></Field>`
- `<Tooltip content="Remove min size"><button className="retune-split-btn" onClick=(minWidth/minHeight set "0px"; remove "min")><Minus/></button></Tooltip>`

Row 3 - Max size (ONLY when `visibleSizeExtras.has("max")`): same shape:
- `<Field label="Max W"><NumberInput prop="maxWidth" value={maxWidth==="none"?"":maxWidth} placeholder="[U+2013]" onChange=(empty sets "none" else v)/></Field>`
- `<Field label="Max H"><NumberInput prop="maxHeight" .../></Field>`
- `<Tooltip content="Remove max size"><button className="retune-split-btn" onClick=(maxWidth/maxHeight set "none"; remove "max")><Minus/></button></Tooltip>`

`visibleSizeExtras` = the `sizeExtras` Set PLUS auto-added: "min" if `minWidth`/`minHeight` is set and not "0px"/"auto"; "max" if `maxWidth`/`maxHeight` is set and not "none". So min/max rows auto-appear when the element already has non-default constraints.

### Sizing math (`ui/sizing-utils.ts`)
`SizingMode = "fill"|"hug"|"fixed"`. `computeSizingChanges(axis, mode, ctx)` returns a map of CSS props to set:
- `pxValue()` = `${Math.round(elementRect[axis] ?? 200)}px` (fallback 200).
- Block (not flex/grid child): fill gives `{[axis]:"100%"}`; hug gives `{[axis]:"fit-content"}`; fixed gives `{[axis]:pxValue}`.
- Grid child: selfProp = width gives justifySelf, height gives alignSelf. fill gives `{[axis]:"auto",[selfProp]:"stretch"}`; hug gives `{[axis]:"fit-content"}` (+`[selfProp]:"start"` if current self unset/stretch/auto/normal); fixed gives `{[axis]:pxValue}`.
- Flex child main axis (axis=width & parent not column, or axis=height & parent column): fill gives `{flexGrow:"1",flexShrink:"1",flexBasis:"0px",[axis]:"auto"}`; hug gives `{flexGrow:"0",flexShrink:"0",flexBasis:"auto",[axis]:"auto"}`; fixed gives `{flexGrow:"0",flexShrink:"0"}` (+`[axis]:pxValue` if axis unset/auto).
- Flex child cross axis: fill gives `{[axis]:"100%"}` (+`alignSelf:"stretch"` if axis != "100%"); hug gives `{[axis]:"auto"}` (+`alignSelf:"flex-start"` if alignSelf unset/auto/stretch); fixed gives `{[axis]:pxValue}` if axis unset/auto/"100%".
- `canFill("width",...)` always true. `canFill("height",...)` true for flex child (any direction) or grid child; false for plain block.
- `detectSizingMode` is the inverse used to derive the displayed Fill/Hug/Fixed: block width "100%" gives fill, "fit-content" gives hug; grid uses axis+selfProp; flex main uses flexGrow>0 & basis 0px gives fill, grow 0 & basis auto & axis auto gives hug; flex cross "100%" gives fill, etc.

---

## 7. Tooltip / supporting components (referenced, defined outside scope)

- `Tooltip` (`ui/tooltip.tsx`): wraps children, props `content`, `side` ("top"/"bottom"), `sideOffset`, `delay`. Exact tooltip styling lives in tooltip.tsx / overlay.css `.retune-tooltip` (outside this file's scope; flagged for follow-up spec).
- `ChangeIndicator` (`ui/change-indicator.tsx`): rendered first inside every prop/combo/select; shows a reset affordance when `isChanged`.
- `VariableAction` (`ui/variable-action.tsx`), `DropdownMenu`/`calcMenuPosition`/`useScrollLock`/`usePreviewValue` are supporting modules referenced but not detailed here.
- `changeProps(camelProp)` returns `{isChanged, onReset}`. `variableProps(camelProp)` / `shorthandVariableProps(camelProps[])` spread token-related props onto NumberInput/ShorthandInput. `s` = `element.computedStyles` (camelCase-keyed record of resolved CSS).

---

## 8. Icon inventory (extract verbatim from `ui/icons.tsx`, 24x24 viewBox, fill currentColor fillOpacity 0.9 unless noted)

Used by these four sections:
- Position alignment: `LayoutAlignLeft`, `LayoutAlignRight`, `LayoutAlignHorizontalCenter`, `LayoutAlignTop`, `LayoutAlignBottom`, `LayoutAlignVerticalCenter` (each has a 0.9-opacity foreground + a 0.3-opacity edge bar).
- Layout display: `RectangleSmall`, `AutolayoutAddHorizontal`, `AutolayoutAddVertical`, `GridView` (GridView fill has no fillOpacity, so full opacity).
- Layout gap: `AlSpacingHorizontal`, `AlSpacingVertical`.
- Spacing: `AlPaddingTop`, `AlPaddingBottom`, `AlPaddingLeft`, `AlPaddingRight`, `AlPaddingHorizontal`, `AlPaddingVertical`, `AlPaddingSides`.
- Size: `Plus`, `Minus`, `ChevronDown` (inside Combo/Select).
Inline (defined in their component files, copy verbatim): pin-line lines (constraints-input), aspect-lock padlocks (SizeSection), AlignmentGrid icons (IconDot, IconPositionLeft/CenterH/Right/Top/CenterV/Bottom, IconSBBar* all 16x16). The `combo` unlink icon (24x24) appears only in variable-applied state.
