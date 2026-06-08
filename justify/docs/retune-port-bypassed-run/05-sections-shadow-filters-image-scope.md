# Retune Design Panel - Sections: Shadow, Filters, Image/Video/Background, Scope

Reference-extraction spec for 1:1 reproduction. Source: `packages/overlay/src/ui/sections/{ShadowSection,FiltersSection,ImageSection,ScopeSection}.tsx`, `ui/shadow-utils.ts`, `ui/filter-utils.ts`. Supporting primitives: `ui/section.tsx`, `ui/number-input.tsx`, `ui/slider-input.tsx`, `ui/select-input.tsx`, `ui/combo-input.tsx`, `ui/segmented-control.tsx`, `ui/change-indicator.tsx`, `ui/icons.tsx`. All CSS line references are into `packages/overlay/src/overlay/overlay.css`.

> NOTE on the placeholder glyph: NumberInput and ComboInput use the EN DASH character (Unicode U+2013) as the empty-value placeholder, written in source as `placeholder={placeholder || "<U+2013>"}` and `placeholder="<U+2013>"`. Reproduce with the literal en-dash glyph, not a hyphen.

---

## 0. Shared design tokens (resolved values)

Panel renders inside a shadow root. `:host` (overlay.css:1-9):
- `font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- `font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0`
- base `font-size: 13px`, `letter-spacing: -0.005em`, `line-height: 1.4`
- `color: var(--retune-text)`, `user-select: none`

Primitive ramps are `color-mix(in srgb, <base> N%, transparent)`. `--retune-black: #1c1917`, `--retune-white: #ffffff`.

Light mode semantic tokens (overlay.css:93-119):
| Token | Resolves to |
|---|---|
| `--retune-text` | `--retune-black-90` = `color-mix(#1c1917 90%, transparent)` |
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
| `--retune-blue` | `--retune-blue-500` = `#0D99FF` |
| `--retune-blue-text` | `--retune-blue-700` = `#0768CF` |
| `--retune-blue-bg` | `--retune-blue-200` = `#E5F4FF` |
| `--retune-blue-bg-hover` | `--retune-blue-100` = `#F2F9FF` |

Dark mode (`:host(.dark)`, overlay.css:125-151) overrides:
- text -> white-90/70/50/25
- `--retune-surface: color-mix(in srgb, #1c1917 95%, #ffffff)`
- surface-hover/active/input-bg -> white-5; input-bg-hover -> white-10
- border -> white-10; border-hover -> white-15
- `--retune-blue-text: --retune-blue-500` (#0D99FF)
- `--retune-blue-bg: color-mix(in srgb, #0768CF 50%, transparent)`
- `--retune-blue-bg-hover: color-mix(in srgb, #0768CF 75%, transparent)`

Blue ramp (Figma): 100 `#F2F9FF`, 200 `#E5F4FF`, 300 `#BDE3FF`, 400 `#80CAFF`, 500 `#0D99FF`, 600 `#007BE5`, 700 `#0768CF`, 800 `#034AC1`, 900 `#093077`, 1000 `#0D193F`.

---

## 1. Layout primitives (`ui/section.tsx`)

### `Section({ label, gap?, action?, children })`
```
<div class="retune-section">
  <div class="retune-section-header">
    <span class="retune-section-title">{label}</span>
    {action}
  </div>
  {children && <div class="retune-section-body" style={gap!=null?{gap}:undefined}>{children}</div>}
</div>
```
CSS:
- `.retune-section` (820): `border-bottom: 1px solid var(--retune-border); user-select: none;`
  - `:last-child` and `:has(+ :not(.retune-section))` -> `border-bottom: none`
- `.retune-section-header` (829): `display:flex; align-items:center; justify-content:space-between; padding:0 8px 0 16px; height:44px`
- `.retune-section-title` (837): `font-size:12px; font-weight:500; line-height:20px; color:var(--retune-text)`
- `.retune-section-body` (880): `display:flex; flex-direction:column; gap:12px; padding-bottom:16px` (the `gap` prop overrides the 12px inline)

### `Row({ label?, children })`
With `label`: `<div class="retune-row-group"><div class="retune-group-label-inline">{label}</div>{children}</div>`. Without: `<div class="retune-section-row"><div class="retune-row">{children}</div></div>`.
CSS:
- `.retune-section-row` (887): `padding:0 48px 0 16px`. `:has(.retune-split-btn)` or `:has(.retune-row-action)` -> `padding-right:8px`.
- `.retune-row-group` (896): `display:flex; flex-direction:column; gap:4px; padding:0 48px 0 16px`. Same `:has` -> `padding-right:8px`. `> .retune-row + .retune-row { margin-top:4px }` (907).
- `.retune-group-label-inline` (1218): `font-size:11px; font-weight:400; letter-spacing:-0.005em; color:var(--retune-text-tertiary); line-height:16px; display:flex; align-items:center; justify-content:space-between`
- `.retune-row` (1176): `display:flex; align-items:flex-end; gap:8px`. Direct child `.retune-prop/.retune-combo/.retune-select/.retune-text-input/.retune-font-input/.retune-slider { flex:1; min-width:0 }` (1183-1188).

### `Field({ label, children })`
`<div class="retune-field"><span class="retune-field-label">{label}</span>{children}</div>`
- `.retune-field` (1191): `flex:1; min-width:0; display:flex; flex-direction:column; gap:4px`
- `.retune-field-label` (1199): `font-size:11px; font-weight:400; letter-spacing:-0.005em; color:var(--retune-text-tertiary); line-height:16px`

### Section header action button `.retune-section-action` (844)
`display:flex; align-items:center; justify-content:center; width:32px; height:32px; border:none; border-radius:8px; background:transparent; color:var(--retune-text); cursor:pointer; padding:0`. Hover (857): `background:var(--retune-surface-hover)`.

### `ChangeIndicator` (`ui/change-indicator.tsx`)
Renders only when `isChanged`. `<span class="retune-change-dot"><span class="retune-change-dot-inner"/></span>` wrapped in Tooltip "Reset property" (side top, delay 200). Native `pointerdown` listener fires `onReset`.
- `.retune-change-dot` (2649): `position:absolute; top:-8px; right:-8px; width:16px; height:16px; z-index:3; cursor:pointer; flex centered`
- `.retune-change-dot-inner` (2661): `width:6px; height:6px; border-radius:50%; background:var(--retune-blue); box-shadow:0 0 0 3px var(--retune-surface)`

---

## 2. Shared input controls used by these sections

### NumberInput (`ui/number-input.tsx`) - used by ShadowSection
Props: `label?, prop, value, placeholder?, onChange(prop,value), min?, max?, step?(default 1; shift x10), variableMatch?, property?, onVariableSelect?, onVariableApply?, onVariableUnlink?, isChanged?, onReset?`.

DOM:
```
<div class="retune-prop[ retune-prop-variable-applied]">
  <ChangeIndicator .../>
  {label && <span class="retune-prop-label" ...scrub handlers/>}
  <input class="retune-prop-input" style={label?undefined:{paddingLeft:8}} value={localValue}
         placeholder={placeholder||"<en-dash U+2013>"} readOnly={!!variableMatch} spellCheck=false />
  <VariableAction .../>
</div>
```
Note: ShadowSection always passes a `label` via the parent `Field`, so the `NumberInput` itself receives NO `label` prop (label sits above in the Field). The input thus gets `style={{paddingLeft:8}}` and the `.retune-prop-input:first-child` rule applies `padding-left:12px` (since ChangeIndicator only renders when changed, the input may be first child).

CSS:
- `.retune-prop` (1309): `display:flex; align-items:center; gap:0; height:32px; padding:0; border-radius:8px; background:var(--retune-surface-hover); border:none; min-width:0; overflow:visible; position:relative; transition:background-color .15s ease`
  - hover not variable-applied (1324): `background:var(--retune-border)`
  - focus-within not variable-applied (1325): `outline:1px solid var(--retune-border); outline-offset:-1px; background:var(--retune-surface-hover)`
- `.retune-prop-label` (1333): `position:absolute; left:0; width:32px; height:32px; flex centered; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); cursor:ew-resize; z-index:1`
- `.retune-prop-input` (1351): `flex:1; min-width:0; width:100%; height:100%; border:none; background:transparent; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); outline:none; padding:0 0 0 32px`
  - `:first-child { padding-left:12px }` (1367); `::selection { background:var(--retune-blue-bg); color:var(--retune-text) }`

Scrub math (no label, scrubs from input left edge): `SCRUB_ZONE=16px`. Pointer down only if `clientX - rect.left <= 16`. `pixelDelta = clientX - startX`; `raw = startVal + Math.round(pixelDelta) * step`. Precision = `step<1 ? ceil(-log10(step)) : 0`. Then `clampNum(rounded, min, max)`. Unit preserved via `localValue.match(/[a-z%]+$/i)`. Cursor becomes `ew-resize` while in zone.
Keyboard: ArrowUp/Down: step (shift = step*10), clamped; Enter commits + blurs. Commit path uses `inferCssUnit` + `clampCssValue`. Focus selects all.

### ColorInput - used by ShadowSection for shadow color
Referenced as `<ColorInput prop="shadowColor" value=... onChange=... {...changeProps}/>`. Defined in `ui/color-input.tsx` (outside this list - note for that spec). Renders `.retune-color-row` (split swatch + hex + opacity). Swatch CSS at overlay.css:1391-1401.

### SliderInput (`ui/slider-input.tsx`) - used by FiltersSection
Props: `label, prop, value, min, max, step?(default 0.01), onChange`.
DOM:
```
<div class="retune-slider" tabIndex=0 role="slider" aria-valuemin/max/now aria-label=label ...pointer handlers>
  <div class="retune-slider-fill" style={width:`${fillPercent}%`}/>
  {showDetails && indicators.map(pos => <div class="retune-slider-indicator" style={left:`${pos*100}%`}/>)}
  {showDetails && <div class="retune-slider-handle" style={left:`max(4px, calc(${fillPercent}% - 4px))`}/>}
  <div class="retune-slider-labels">
    <span class="retune-slider-label">{label}</span>
    <span class="retune-slider-value">{displayValue}</span>
  </div>
</div>
```
`showDetails = isHovered || isDragging` (indicators + handle only show on hover/drag).
`fillPercent = clamp01((num-min)/(max-min))*100`. `precision = step<1 ? max(0,-floor(log10(step))) : 0`. `displayValue = step>=1 ? round(num) : num.toFixed(precision)`.
`computeFromX`: ratio along track, `raw = min + ratio*range`, snap `round(raw/step)*step`, clamp, `toFixed(precision)`.
Keyboard: ArrowLeft/Down -1 step, ArrowRight/Up +1 step (clamped).
Indicators (tick marks): computed in `useMemo` - rawInterval = range/8, normalized to a "nice" 1/2/5/10 multiple of the magnitude; positions with fraction in (0.03, 0.97) are kept.
CSS:
- `.retune-slider` (2057): `position:relative; height:32px; border-radius:8px; background:var(--retune-surface-hover); cursor:ew-resize; user-select:none; overflow:hidden; transition:background-color .15s ease`. `:focus-visible { outline:1px solid var(--retune-text); outline-offset:-1px }`
- `.retune-slider-fill` (2071): `position:absolute; inset:0; right:auto; background:var(--retune-surface-active); pointer-events:none`
- `.retune-slider-indicator` (2079): `position:absolute; top:50%; transform:translateY(-50%); width:1px; height:4px; border-radius:1px; background:var(--retune-border); pointer-events:none`
- `.retune-slider-handle` (2090): `position:absolute; top:50%; transform:translateY(-50%); width:2px; height:16px; border-radius:1px; background:var(--retune-text); pointer-events:none; margin-left:-1px`
- `.retune-slider-labels` (2102): `position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 8px; pointer-events:none; overflow:hidden; white-space:nowrap`
- `.retune-slider-label` (2114): `font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-secondary)`
- `.retune-slider-value` (2121): `font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text)`

### SelectInput (`ui/select-input.tsx`) - used by ShadowSection (Type), ScopeSection (Trigger), ImageSection (Fit, Background Position/Repeat)
Props: `label?, prop, value, options:string[], onChange, isChanged?, onReset?`. Option labels rendered via `sentenceCase` = first char upper + rest with `-`->` `.
DOM:
```
<div class="retune-select">
  <ChangeIndicator .../>
  <button type="button" class="retune-select-button">
    {label && <span class="retune-select-label">{label}</span>}
    <span class="retune-select-value" style={label?undefined:{paddingLeft:8}}>{sentenceCase(localValue)}</span>
    <span class="retune-select-chevron"><ChevronDown/></span>
  </button>
  {open && <div class="retune-select-dropdown-anchor" style={top,right,minWidth}><DropdownMenu showCheckmark .../></div>}
</div>
```
CSS:
- `.retune-select` (1984): `position:relative; min-width:0; overflow:visible`
- `.retune-select-button` (1990): `display:flex; align-items:center; width:100%; height:32px; border-radius:8px; background:var(--retune-surface-hover); border:none; cursor:pointer; font-family:inherit; padding:0; transition:background-color .15s ease`. hover -> `var(--retune-border)`; focus-visible -> `outline:1px solid var(--retune-text); outline-offset:-1px`.
- `.retune-select-label` (2011): `position:absolute; left:0; width:32px; height:32px; flex centered; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-tertiary)`
- `.retune-select-value` (2026): `flex:1; min-width:0; font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text); text-align:left; padding-left:32px; ellipsis`
- `.retune-select-chevron` (2040): `width:32px; height:32px; flex centered; color:var(--retune-text-secondary)`
- `.retune-select-dropdown-anchor` (2050): `position:fixed; z-index:2147483647; width:max-content`
Keyboard: Enter/Space select/toggle, Escape close, Arrow Up/Down navigate. macOS-style positioning so selected item aligns with trigger (`calcMenuPosition`). `useScrollLock(open)`.

### ComboInput (`ui/combo-input.tsx`) - used by ImageSection (object-position, background-size)
Props: `label?, prop, value, options:{value,label}[], onChange, variableMatch?, property?, onVariable*, isChanged?, onReset?`. Editable input (type a numeric/keyword) + chevron trigger dropdown.
DOM (non-variable):
```
<div class="retune-combo">
  <ChangeIndicator .../>
  {label && <span class="retune-combo-label" ...scrub/>}
  <input class="retune-combo-input" style={label?undefined:{paddingLeft:8}} value={displayValue} placeholder="<en-dash U+2013>" .../>
  <button type="button" class="retune-combo-trigger" aria-label="Toggle options"><ChevronDown/></button>
  {open && <div class="retune-combo-dropdown-anchor" style={top,left,width}><DropdownMenu showCheckmark/></div>}
</div>
```
`displayValue`: if `localValue` matches an option value, show its label; else show raw value. When variables exist for the property and none applied, an extra option `{value:"__add_variable__", label:"Add variable", separatorBefore:true}` is appended.
CSS:
- `.retune-combo` (2357): `display:flex; align-items:center; height:32px; min-width:0; overflow:visible; position:relative; gap:1px`
- `.retune-combo-label` (2367): like prop-label but `color:var(--retune-text-tertiary)`, `cursor:ew-resize`
- `.retune-combo-input` (2385): `flex:1; min-width:0; height:100%; border:none; background:var(--retune-surface-hover); border-radius:8px 0 0 8px; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); outline:none; padding:0 0 0 32px; transition:background-color .15s ease`. hover -> border; focus -> `outline:1px solid var(--retune-border); outline-offset:-1px`.
- `.retune-combo-trigger` (2413): `width:32px; height:32px; flex centered; background:var(--retune-surface-hover); border-radius:0 8px 8px 0; border:none; cursor:pointer; color:var(--retune-text-secondary); transition`. hover -> `background:var(--retune-border); color:var(--retune-text)`.
- `.retune-combo-dropdown-anchor` (2435): `position:fixed; z-index:2147483647`
Scrub on label/left-16px-zone same math as NumberInput (clamps to 0 unless prop includes margin/top/right/bottom/left/indent). Arrow keys step 1 (shift 10) when closed.

### TextInput (`ui/text-input.tsx`) - used by ImageSection (Alt)
DOM: `.retune-text-input` (2318) wrapper > `.retune-text-input-field` (2337). Wrapper: `display:flex; align-items:center; height:32px; border-radius:8px; background:var(--retune-surface-hover); overflow:hidden; position:relative; transition`. Field: `flex:1; border:none; background:transparent; font-size:11px; font-weight:450; letter-spacing:-0.005em; font-family:inherit; color:var(--retune-text); padding:0 8px`. hover -> border; focus-within -> outline 1px border.

### SegmentedControl (`ui/segmented-control.tsx`) - used by ImageSection (Loading, Autoplay/Loop/Muted/Controls)
Props: `options:{value,icon?,label?,disabled?}[], value?, onChange, disabled?`. Sliding pill indicator.
DOM:
```
<div class="retune-segmented" style={disabled?{opacity:0.4,pointerEvents:"none"}:undefined}>
  <div class="retune-segmented-pill"/>
  {options.map(opt =>
    <button class="retune-segmented-item[ selected][ disabled]" aria-pressed disabled aria-label=opt.label>
      {opt.icon || <span class="retune-segmented-text">{opt.label}</span>}
    </button>)}
</div>
```
Pill width/transform set imperatively in `useLayoutEffect` from the selected button's rect; `translateX(offsetX)`; first render skips transition.
CSS:
- `.retune-segmented` (2130): `display:flex; position:relative; height:32px; background:var(--retune-surface-hover); border-radius:8px; overflow:hidden; flex:1`
- `.retune-segmented-pill` (2140): `position:absolute; top:0; left:0; height:100%; border-radius:8px; background:var(--retune-surface); border:1px solid var(--retune-border); transition:transform 200ms cubic-bezier(0.77,0,0.175,1); will-change:transform; pointer-events:none; z-index:0`
- `.retune-segmented-item` (2156): `flex:1; height:32px; flex centered; border:none; border-radius:8px; background:transparent; cursor:pointer; color:var(--retune-text); transition:color 150ms ease; z-index:1`. hover not disabled -> `color:var(--retune-text-secondary)`; disabled -> `opacity:0.3; cursor:not-allowed`.
- `.retune-segmented-text` (2190): `font-size:11px; font-weight:500; letter-spacing:-0.005em`

### Icons (`ui/icons.tsx`)
24x24 viewBox, `fill="none"`, default render size 24. Paths use `fill="currentColor" fillOpacity={0.9}`. Used here:
- `Plus` (icons.tsx:170): path `d="M12 6C12.2761 6 12.5 6.22386 12.5 6.5V11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H12.5V17.5C12.5 17.7761 12.2761 18 12 18C11.7239 18 11.5 17.7761 11.5 17.5V12.5H6.5C6.22386 12.5 6 12.2761 6 12C6 11.7239 6.22386 11.5 6.5 11.5H11.5V6.5C11.5 6.22386 11.7239 6 12 6Z"`
- `Minus` (174): path `d="M6 12C6 11.7239 6.22386 11.5 6.5 11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H6.5C6.22386 12.5 6 12.2761 6 12Z"`
- `ChevronDown` (162): `d="M9.64645 11.1464C9.84171 10.9512 10.1583 10.9512 10.3536 11.1464L12 12.7929L13.6464 11.1464C13.8417 10.9512 14.1583 10.9512 14.3536 11.1464C14.5488 11.3417 14.5488 11.6583 14.3536 11.8536L12.3536 13.8536C12.1583 14.0488 11.8417 14.0488 11.6464 13.8536L9.64645 11.8536C9.45118 11.6583 9.45118 11.3417 9.64645 11.1464Z"`

---

## 3. ShadowSection

File: `ui/sections/ShadowSection.tsx`. Props: `BaseSectionProps` (s, onPropertyChange, variableProps, changeProps, handleVariableSelect, handleVariableApply). Controls box-shadow via `shadow-utils.ts`.

### Derived state
- `hasShadow = s.boxShadow && s.boxShadow !== "none"`
- `shadowVarPropsObj = variableProps("boxShadow")`; `shadowVarMatch = shadowVarPropsObj.variableMatch`; `shadowHasVariable = !!shadowVarMatch`

### Section header
`<Section label="Shadow" action={...}>`. Action is `<div style={{display:"flex", gap:2, alignItems:"center"}}>` containing:
1. When NOT a variable (`!shadowHasVariable`): `<VariableAction property="boxShadow" onVariableSelect onVariableApply/>` (hexagon "add token" button - styled by `.retune-section-header .retune-variable-action` overlay.css:863: `position:static; width:32px; height:32px; border-radius:8px; background:transparent; color:transparent`; appears on section hover as `var(--retune-text-secondary)`, hover-self `var(--retune-text)` + surface-hover bg).
2. Toggle button (`.retune-section-action`):
   - If `hasShadow || shadowHasVariable`: Tooltip "Remove shadow" (side top) wrapping a button -> `<Minus/>`; onClick `handleRemoveShadow` (`onPropertyChange("boxShadow","none")`).
   - Else: Tooltip "Add shadow" (side top) wrapping button -> `<Plus/>`; onClick `handleAddShadow` (`onPropertyChange("boxShadow", shadowToCss(defaultShadow()))`).

### Body - conditional render branches
1. **`shadowHasVariable`** (token applied): single `<Row>` with `<div class="retune-prop retune-prop-variable-applied" style={{flex:1, cursor:"pointer"}} onClick=openPicker>`:
   - `<ChangeIndicator isChanged={changeProps("boxShadow").isChanged} onReset=.../>`
   - `<span class="retune-prop-input" style={{display:"flex", alignItems:"center", paddingLeft:12, color:"var(--retune-text)"}}>` showing the token name: if `className.startsWith("var(--")` show `className.slice(6,-1)` (strip `var(--` and `)`), else raw className.
   - `<VariableAction match={shadowVarMatch} property="boxShadow" onVariableSelect onVariableApply onVariableUnlink openPickerRef/>`
   - `.retune-prop-variable-applied` styling at overlay.css:2712.

2. **`hasShadow`** (literal shadow, parsed by `parseBoxShadow(s.boxShadow)`; null guard returns null): renders four Rows in this exact order:
   - **Row 1** - one `Field label="Color"` containing `ColorInput` (`prop="shadowColor"`, `value={shadow.color}`, onChange -> `handleShadowFieldChange("color", val)`, spread `changeProps("shadowColor")`).
   - **Row 2** - two Fields: `Field label="X offset"` -> `NumberInput prop="shadowOffsetX"` value `` `${shadow.offsetX}px` `` onChange `("offsetX", parseFloat(val)||0)`; `Field label="Y offset"` -> `NumberInput prop="shadowOffsetY"` value `` `${shadow.offsetY}px` `` onChange `("offsetY", ...)`.
   - **Row 3** - two Fields: `Field label="Blur"` -> `NumberInput prop="shadowBlur"` value `` `${shadow.blur}px` `` `min={0}` onChange `("blur", Math.max(0, parseFloat(val)||0))`; `Field label="Spread"` -> `NumberInput prop="shadowSpread"` value `` `${shadow.spread}px` `` onChange `("spread", ...)`.
   - **Row 4** - one `Field label="Type"` -> `SelectInput prop="shadowInset" value={shadow.inset?"inside":"outside"} options={["outside","inside"]}` onChange `("inset", val==="inside")`. (Displayed sentence-cased: "Outside"/"Inside".)

3. Else (no shadow, no variable): renders nothing (`null`).

### `handleShadowFieldChange(field, value)`
`parsed = parseBoxShadow(s.boxShadow) || defaultShadow()`; `updated = {...parsed, [field]:value}`; `onPropertyChange("boxShadow", shadowToCss(updated))`.

### `shadow-utils.ts`
`ShadowValue = { inset:boolean; offsetX:number; offsetY:number; blur:number; spread:number; color:string }`.
- `defaultShadow()` -> `{ inset:false, offsetX:0, offsetY:4, blur:8, spread:0, color:"rgba(0, 0, 0, 0.15)" }`.
- `parseShadow(raw)`: returns null for falsy/"none". `inset = trimmed.startsWith("inset")`; strips leading "inset". Color matched via `/(?:rgba?|hsla?)\([^)]+\)/` first, else hex `^(#[0-9a-fA-F]{3,8})\s` at start, else hex/named at end `/\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/`. Default color `"rgba(0, 0, 0, 1)"`. Remaining numbers `/-?[\d.]+/g`; requires >= 2; maps to offsetX, offsetY, blur, spread (missing -> 0).
- `parseBoxShadow(raw)`: splits on top-level (depth-0) commas; edits FIRST layer only.
- `shadowToCss(s)`: `[inset] {offsetX}px {offsetY}px {blur}px {spread}px {color}` joined by spaces.

---

## 4. FiltersSection

File: `ui/sections/FiltersSection.tsx`. Props: `BaseSectionProps` (uses `s`, `onPropertyChange`). Manages CSS `filter` (layer) and `backdropFilter` (backdrop) via `filter-utils.ts`.

### State
- `filterSelfUpdate` ref - skips re-sync when this component is the source of the change.
- `filters` state seeded `parseFilters(s.filter, s.backdropFilter)`.
- `prevFilter`/`prevBackdropFilter` - on external change, re-parse unless self-update.
- Menu state: `filterMenuOpen`, `filterMenuPos {top?|bottom?, left}`, refs `filterMenuBtnRef`, `filterMenuRef`, `filterSectionRef`.
- Outside-click closes menu via root `pointerdown` listener (shadow-root aware).

### DOM
Wraps in a fragment: `<Section label="Filters" action={...}>...</Section>` then `<div ref={filterSectionRef}/>` (scroll anchor; this trailing non-section element triggers `.retune-section:has(+ :not(.retune-section)){border-bottom:none}`).

### Section header action - add filter menu
`<div style={{position:"relative"}}>` containing:
- Tooltip "Add filter" (side top) wrapping `<button ref class="retune-section-action"><Plus/></button>`.
- onClick: toggle. When opening, measures button rect; `spaceBelow = innerHeight - rect.bottom - 8`, `spaceAbove = rect.top - 8`. If `spaceBelow >= spaceAbove` -> `pos={top: rect.bottom+4, left: rect.right}`; else `pos={bottom: innerHeight - rect.top + 4, left: rect.right}`.
- When open: a `position:fixed` container at `top|bottom`, `left:filterMenuPos.left`, `transform:translateX(-100%)` (right-aligned to the button), `zIndex:2147483647`, holding a `<DropdownMenu showCheckmark={false} options=... onSelect=.../>`.

### Menu options builder
- `usedLayer`/`usedBackdrop` = Set of filter types already present per target.
- `availLayer = FILTER_TYPES.filter(t => !usedLayer.has(t))`; same for backdrop.
- Push layer options first: `{value:`layer:${t}`, label: FILTER_CONFIG[t].label, headingBefore:"Layer" on i===0}`.
- Then backdrop: `{value:`backdrop:${t}`, label, headingBefore:"Backdrop" + separatorBefore:true (only if availLayer.length>0) on i===0}`.
- onSelect: split `value` on `:` into `[target,type]`, call `handleAddFilter(type, target)`.

### Body - filter rows (only when `filters.length > 0`)
- Partition into `layerFilters` (target==="layer") and `backdropFilters`.
- `renderFilterRow(f)`:
```
<div class="retune-row" key={f.id}>
  <SliderInput label={config.label} prop={f.id} value={String(f.value)}
               min={config.min} max={config.max} step={config.step}
               onChange={(_,val)=>handleFilterValueChange(f.id, parseFloat(val)||0)}/>
  <div style={{alignSelf:"center"}}>
    <Tooltip content="Remove" side="top">
      <button class="retune-split-btn" onClick={()=>handleRemoveFilter(f.id)}><Minus/></button>
    </Tooltip>
  </div>
</div>
```
  Note this manual `.retune-row` (NOT via `Row`), with the remove button as a sibling -> the parent `Row label="..."` -> `.retune-row-group:has(.retune-split-btn)` gets `padding-right:8px`.
- Render: `{layerFilters.length>0 && <Row label="Layer">{layerFilters.map(renderFilterRow)}</Row>}` then `{backdropFilters.length>0 && <Row label="Backdrop">{backdropFilters.map(renderFilterRow)}</Row>}`.

### `.retune-split-btn` (overlay.css:1230, shared with `.retune-row-action`)
`display:flex; align-items:center; justify-content:center; width:32px; height:32px; border:none; border-radius:8px; background:transparent; color:var(--retune-text); cursor:pointer; padding:0; flex-shrink:0; transition:background .15s ease, color .15s ease`. hover -> `background:var(--retune-surface-active)`; `.active` -> `background:var(--retune-input-bg-hover)`.

### Callbacks
- `applyFilters(updated)`: set self-update flag, setFilters, `css=filtersToCss(updated)`, `onPropertyChange("filter", css.filter)`, `onPropertyChange("backdropFilter", css.backdropFilter)`.
- `handleAddFilter(type,target)`: append `defaultFilter(type,target)`, close menu, then `requestAnimationFrame(() => filterSectionRef.scrollIntoView({block:"end", behavior:"smooth"}))`.
- `handleRemoveFilter(id)`: filter out by id.
- `handleFilterValueChange(id,value)`: map updating matching filter's value.

### `filter-utils.ts`
`FilterType = "blur"|"brightness"|"contrast"|"hue-rotate"|"invert"|"saturate"|"sepia"`. `FilterTarget = "layer"|"backdrop"`. `FilterItem = {id,type,value,target}`. IDs from a module counter `f1,f2,...`.
`FILTER_TYPES` order: `["blur","brightness","contrast","hue-rotate","invert","saturate","sepia"]`.
`FILTER_CONFIG` (exact):
| type | label | unit | default | min | max | step |
|---|---|---|---|---|---|---|
| blur | Blur | px | 4 | 0 | 50 | 1 |
| brightness | Brightness | % | 100 | 0 | 300 | 1 |
| contrast | Contrast | % | 100 | 0 | 200 | 1 |
| hue-rotate | Hue rotate | deg | 0 | 0 | 360 | 1 |
| invert | Invert | % | 0 | 0 | 100 | 1 |
| saturate | Saturate | % | 100 | 0 | 300 | 1 |
| sepia | Sepia | % | 0 | 0 | 100 | 1 |
- `parseFilterString(raw,target)`: regex `/(blur|brightness|contrast|hue-rotate|invert|saturate|sepia)\(([^)]+)\)/g`; value `parseFloat(m[2])||0`.
- `parseFilters(filter,backdropFilter)`: layer items first, then backdrop.
- `filterToCssFunction(item)`: `${type}(${value}${unit})`.
- `filtersToCss(items)`: layer join `" "` or `"none"`; backdrop likewise. Returns `{filter, backdropFilter}`.
- `defaultFilter(type,target)`: `{id, type, value: FILTER_CONFIG[type].defaultValue, target}`.

---

## 5. ImageSection

File: `ui/sections/ImageSection.tsx`. Props: `BaseSectionProps` plus `isImage`, `isVideo`, `hasBackgroundImage`. `isMedia = isImage || isVideo`. Renders up to two independent Sections inside a fragment.

### Section A - "Image" / "Video" (only when `isMedia`)
`<Section label={isVideo ? "Video" : "Image"}>`. Rows in order:

1. **Row** (two Fields, always for media):
   - `Field label="Fit"` -> `SelectInput prop="objectFit" value={s.objectFit||"fill"} options={["fill","contain","cover","none","scale-down"]}` onChange=onPropertyChange, spread `variableProps("objectFit")` + `changeProps("objectFit")`.
   - `Field label="Position"` -> `ComboInput prop="objectPosition" value={s.objectPosition||"50% 50%"}` options (value/label pairs, exact order): `center/Center, top/Top, bottom/Bottom, left/Left, right/Right, top left/Top Left, top right/Top Right, bottom left/Bottom Left, bottom right/Bottom Right`. onChange=onPropertyChange + variableProps + changeProps.

2. **Loading** (only `isImage && element.element`): `<Row>` `Field label="Loading"` -> `SegmentedControl options={[{value:"lazy",label:"Lazy"},{value:"eager",label:"Eager"}]}` value = `element.loading==="lazy" ? "lazy" : "eager"`. onChange sets `element.loading = v` and calls `onAttributeChange("loading", oldVal, v)` (oldVal = `element.loading || "eager"`).

3. **Alt** (only `isImage && element.element`): `<Row label="Alt"><div class="retune-row"><TextInput prop="alt" value={element.alt||""} onChange=.../></div></Row>`. onChange sets `element.alt = value` and `onAttributeChange("alt", oldVal, value)`.

4. **Video controls** (only `isVideo && element.element`) - two Rows:
   - **Row** two Fields: `Autoplay` SegmentedControl `[{value:"true",label:"Yes"},{value:"false",label:"No"}]` bound to `element.autoplay`; `Loop` same Yes/No options bound to `element.loop`.
   - **Row** two Fields: `Muted` Yes/No bound to `element.muted`; `Controls` SegmentedControl `[{value:"true",label:"Show"},{value:"false",label:"Hide"}]` bound to `element.controls`.
   - Each onChange flips the boolean property on the element, computes `oldVal` as `"true"|"false"`, and calls `onAttributeChange(name, oldVal, v==="true"?"true":"false")`.

### Section B - "Background Image" (only when `hasBackgroundImage`)
`<Section label="Background Image">`. Three labeled Rows, each `<Row label="..."><div class="retune-row">...</div></Row>`:

1. **Size**: `ComboInput label="" prop="backgroundSize" value={s.backgroundSize||"auto"}` options: `cover/Cover, contain/Contain, auto/Auto, 100% 100%/Stretch`. onChange + variableProps + changeProps.
2. **Position**: `SelectInput prop="backgroundPosition" value={s.backgroundPosition||"center center"} options={["center","top","bottom","left","right","top left","top right","bottom left","bottom right"]}` + variableProps + changeProps.
3. **Repeat**: `SelectInput prop="backgroundRepeat" value={s.backgroundRepeat||"repeat"} options={["no-repeat","repeat","repeat-x","repeat-y","space","round"]}` + variableProps + changeProps.

(SelectInput sentence-cases display: e.g. "no-repeat" -> "No repeat", "repeat-x" -> "Repeat x".)

---

## 6. ScopeSection

File: `ui/sections/ScopeSection.tsx`. Props (distinct `ScopeSectionProps`, section-props.ts:57): `element, scopeLevels:ScopeLevel[], activeLevelIndex:number, onScopeLevelChange?, onScopeLevelHover?, forcedState?, onForcedStateChange?`.
`ScopeLevel = { label:string; selector:string|null; count:number; kind?:string }`. `ForcedState = ":hover"|":focus"|":active"|null`.

### Section label
`<Section label={element.reactComponents?.[0] ? "Scope" : element.tagName.toLowerCase()}>` - "Scope" if a React component is detected, otherwise the lowercase tag name (e.g. "div").

### Row 1 - "Target" selector (only when `scopeLevels.length > 1 && onScopeLevelChange`)
`<Row label="Target"><div class="retune-selector-field" ref={fieldRef}>...</div></Row>`. Per level (`scopeLevels.map((level,index)=>`):
- `isActive = index===activeLevelIndex`
- `isElementLevel = level.selector===null`
- `activeIsElementLevel = scopeLevels[activeLevelIndex]?.selector===null`
- `isIncluded = index<activeLevelIndex && !activeIsElementLevel`
- `showBridge = bridgeVisible.has(index)`

DOM per level (Fragment keyed by `level.selector ?? "__element"`):
```
{isElementLevel && scopeLevels.length>1 && <span class="retune-selector-divider"/>}
<button class="retune-selector-tag[ active][ included]" data-level-index={index}
        onClick={()=>onScopeLevelChange(index)} onPointerEnter/Leave={onScopeLevelHover}>
  {level.label.length>24
    ? <Tooltip content={level.label} side="bottom" delay={300}><span class="retune-selector-tag-name">{middleTruncate(level.label,24)}</span></Tooltip>
    : <span class="retune-selector-tag-name">{level.label}</span>}
  {level.count>1 && <Tooltip content={`${level.count} elements match this selector`} side="bottom" delay={300}><span class="retune-selector-tag-count">{level.count}</span></Tooltip>}
</button>
{showBridge && <span class="retune-selector-bridge filled"/>}
```
`middleTruncate(str,24)`: keep = 23; start = `ceil(23*0.4)` = 10, end = `floor(23*0.6)` = 13; `str.slice(0,10) + "…" + str.slice(-13)` (the joiner is the HORIZONTAL ELLIPSIS Unicode U+2026).

### Selector field CSS
- `.retune-row-group:has(.retune-selector-field)` (468): `padding-left:0; padding-right:0`; its label inline gets `padding-left:16px` (472).
- `.retune-selector-field` (476): `display:flex; align-items:center; gap:8px; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; padding:0 16px; isolation:isolate`. webkit scrollbar hidden (517).
- `.retune-selector-tag` (519): `display:flex; align-items:center; justify-content:center; gap:6px; max-width:100%; padding:8px; border-radius:8px; border:none; background:var(--retune-surface-hover); cursor:pointer; font-size:11px; font-weight:500; letter-spacing:-0.005em; color:var(--retune-text); line-height:16px; white-space:nowrap; transition:background-color .15s ease, color .15s ease`.
  - `:hover` -> `background:var(--retune-border)`
  - `.included, .active` -> `background:var(--retune-blue-bg); color:var(--retune-blue-text)`; hover -> `var(--retune-blue-bg-hover)`
  - dark `.included/.active` -> `color:var(--retune-white)`
- `.retune-selector-tag-name` (604): `font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`.
- `.retune-selector-tag-count` (553): `flex centered; font-family:Inter stack; font-size:11px; font-weight:500; letter-spacing:-0.005em; line-height:16px; background:var(--retune-surface); color:var(--retune-text); padding:0 6px; border-radius:4px`. In active/included -> `color:var(--retune-blue-text)`; dark active/included -> `background:var(--retune-white); color:var(--retune-blue-700)`.
- `.retune-selector-divider` (609): `width:1px; height:20px; background:var(--retune-border); flex-shrink:0; align-self:center`.
- `.retune-selector-bridge` (488): `width:8px; height:16px; flex-shrink:0; position:relative; z-index:-1; margin:0 -8px`. `.filled` -> `background:var(--retune-blue-bg)`. `::before` (top): `height:5px; background:var(--retune-surface); border-radius:0 0 4px 4px`. `::after` (bottom): `height:5px; background:var(--retune-surface); border-radius:4px 4px 0 0`. (The bridge fills the gap between adjacent active/included pills with the blue color, masked top/bottom to leave a 6px connecting band.)

### Bridge animation (the signature ScopeSection motion)
Bridges connect consecutive active/included pills. `computeBridgesForLevel(level)`: empty Set when active level's selector is null ("This element"); otherwise add bridge index `i` for each adjacent pair where both selectors are non-null and `i < level && (i+1) <= level`.
- `pillColorsRef` captured after every paint: for each `[data-level-index]` pill, store `getComputedStyle` `backgroundColor` and `color`.
- On `activeLevelIndex` change: diff old vs new bridge sets into `appearing`/`disappearing`. If none, just set bridgeVisible.
- Animation constants: `DURATION = 320`ms, `EASING = 'cubic-bezier(0.77, 0, 0.175, 1)'`, `EXTEND = 6`px. `R = '8px'`, `Z = '0px'`.
- For each affected pill, freeze its pre-change bg/color inline, then run Web Animations API `pill.animate([...3 keyframes...], {duration:320, easing})` animating `boxShadow` (a horizontal `${EXTEND}px 0 0 0 ${bg}` spread toward the neighbor) and `borderRadius` (peak squares off the connected corner). Default bg fallback `#f5f5f4`.
- At `DURATION/2` (160ms) via setTimeout: unfreeze pill colors and `setBridgeVisible(newBridges)`. Cleanup clears the timer on re-change.

### Row 2 - "Trigger" pseudo-state (only when `onForcedStateChange`)
```
<Row label="Trigger">
  <div class="retune-row">
    <SelectInput prop="__state"
      value={forcedState ? {":hover":"Hover", ":focus":"Focus", ":active":"Active"}[forcedState] ?? "None" : "None"}
      options={["None","Hover","Focus","Active"]}
      onChange={(_,val)=> onForcedStateChange( {None:null, Hover:":hover", Focus:":focus", Active:":active"}[val] )}/>
  </div>
</Row>
```
Maps the SelectInput string back to a `ForcedState` (or null for "None").

---

## 7. Open questions / out-of-list references
- `ColorInput` (`ui/color-input.tsx`), `VariableAction` (`ui/variable-action.tsx`), `Tooltip` (`ui/tooltip.tsx`), `DropdownMenu` (`ui/dropdown-menu.tsx`), `menu-position.ts` (`calcMenuPosition`), `round-css-value.ts` (`roundCssValue`, `inferCssUnit`), `use-preview-value.ts`, `use-scroll-lock.ts`, and `variable-dialog.tsx` are referenced but defined outside the six files in scope - spec their exact CSS/markup separately.
- The `Tooltip` visual treatment (bubble bg, padding, arrow) is not captured here; only its props (content, side, delay) are pinned.
- `VariableAction` hexagon/unlink icon markup partially captured via ComboInput's inline unlink SVG; the hexagon "add token" icon path was not read.
- `s` is `element.computedStyles` (a `Record<string,string>` of camelCased CSS props); resolution of `objectFit`, `backgroundSize`, etc. depends on PropertyPanel feeding computed values.
- `DropdownMenu` option type `DropdownMenuOption` supports `headingBefore` and `separatorBefore` (used by the Filters add-menu) and `showCheckmark` toggle; full styling lives in overlay.css around line 1257-1306 (`.retune-dropdown-menu`, `.retune-dropdown-item`, `.retune-dropdown-heading`).
