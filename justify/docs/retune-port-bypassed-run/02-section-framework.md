# Retune Design Panel - Area 02: Section Framework

Reference-extraction spec for the generic Section/Row/Field layout primitives and the
PropertyPanel orchestrator that composes them. Goal: 1:1 reproduction (exact px, colors,
fonts, spacing, icons, behavior).

Source files:
- `packages/overlay/src/ui/section.tsx` - layout primitives (Section, Row, Field, RowAction, GroupLabel)
- `packages/overlay/src/ui/sections/section-props.ts` - shared prop interfaces
- `packages/overlay/src/ui/ComponentSection.tsx` - Section used in 2-col grid mode (Props/State)
- `packages/overlay/src/overlay/PropertyPanel.tsx` - orchestrator that orders + composes sections
- `packages/overlay/src/overlay/overlay.css` - all class styles + theme tokens (line refs cited inline)
- `packages/overlay/src/ui/icons.tsx` - custom-ported icon set (Plus/Minus used by section actions)

IMPORTANT FRAMING: There is NO collapse/chevron in the generic `Section`. Sections are always
expanded; `children` render unconditionally when present. The "action" slot on the right of the
header is where callers put icon buttons (Plus to add a fill/border/shadow, Minus to remove). The
prompt's "collapse chevron" does not exist in this component; the "+ add button" is the
`<Plus/>` icon inside a `.retune-section-action` button passed via the `action` prop. This is
documented precisely below.

---

## 1. Host context (inherited by every section)

The whole panel lives in a shadow root whose `:host` sets the base typography. Sections inherit
all of this (none of the section classes re-declare font-family except inputs that use
`font-family: inherit`).

From `overlay.css` `:host` (lines 1-10):
```
font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;
font-size: 13px;
letter-spacing: -0.005em;
color: var(--retune-text);
line-height: 1.4;
interpolate-size: allow-keywords;
user-select: none;
-webkit-user-select: none;
```
Also `* { box-sizing: border-box; margin: 0; padding: 0; }` (line 153). So all box dimensions
below are border-box.

### Panel container the sections stack inside
`.retune-panel` (lines 377-390): `position: fixed; z-index: 2147483647; background: var(--retune-surface);
border: none; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
width: 280px; display: flex; flex-direction: column; overflow: hidden; overscroll-behavior: none;`
Height `calc(100vh - 84px)` (line 437). Docked right: `right:16px; bottom:68px` / left: `left:16px; bottom:68px`.

`.retune-panel-body` (lines 392-399) is the scroll container that holds the section stack:
`flex:1; overflow-y:auto; overflow-x:clip; scrollbar-width:none;` and
`.retune-panel-body::-webkit-scrollbar { display: none; }`. So the panel content area is
**280px wide minus nothing** (no internal padding on the body); each section manages its own
horizontal padding.

Panel enter/exit animation (lines 405-433): 0.15s `cubic-bezier(0.23, 1, 0.32, 1)`,
translateY(12px) -> 0 with opacity 0 -> 1 (and reverse on exit).

---

## 2. Theme tokens referenced by section framework (resolved values)

All section/row/field classes reference these semantic tokens. Primitives are opacity ramps over
two base colors. Resolved light + dark below.

Base primitives:
- `--retune-black: #1c1917` (line 18)
- `--retune-white: #ffffff` (line 40)
- ramps: `--retune-black-N` = `color-mix(in srgb, #1c1917 N%, transparent)` for N in 5..95
- ramps: `--retune-white-N` = `color-mix(in srgb, #ffffff N%, transparent)`
- Blue: `--retune-blue-100:#F2F9FF; -200:#E5F4FF; -500:#0D99FF; -700:#0768CF` (lines 62-71)

Semantic tokens used by THIS area (light mode, lines 94-116):
| Token | Light value | Dark value (lines 127-148) |
|---|---|---|
| `--retune-text` | `--retune-black-90` = `color-mix(in srgb, #1c1917 90%, transparent)` | `--retune-white-90` |
| `--retune-text-secondary` | `--retune-black-70` | `--retune-white-70` |
| `--retune-text-tertiary` | `--retune-black-50` | `--retune-white-50` |
| `--retune-surface` | `--retune-white` = `#ffffff` | `color-mix(in srgb, #1c1917 95%, #ffffff)` |
| `--retune-surface-hover` | `--retune-black-5` | `--retune-white-5` |
| `--retune-surface-active` | `--retune-black-5` | `--retune-white-5` |
| `--retune-input-bg-hover` | `--retune-black-10` | `--retune-white-10` |
| `--retune-border` | `--retune-black-10` = `color-mix(in srgb, #1c1917 10%, transparent)` | `--retune-white-10` |
| `--retune-blue-bg` | `--retune-blue-200` = `#E5F4FF` | `color-mix(in srgb, #0768CF 50%, transparent)` |

Dark mode is activated by `:host(.dark)` (line 125) swapping only the semantic tokens.

---

## 3. `Section` primitive (section.tsx lines 12-26)

### JSX structure
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

### Props
- `label: string` - required. Rendered verbatim in `.retune-section-title`.
- `gap?: number` - optional. If non-null, inline-sets `gap` (px) on `.retune-section-body`,
  overriding the CSS default of 12px. Used by sections that want tighter/looser row stacks.
- `action?: ReactNode` - optional. Rendered as the second child of the header (right side, due
  to `justify-content: space-between`). Callers pass icon buttons here.
- `children?: ReactNode` - optional. If falsy, the entire `.retune-section-body` is omitted
  (header-only section). This is the ONLY conditional rendering inside Section.

### Styles

`.retune-section` (overlay.css 820-827):
```
border-bottom: 1px solid var(--retune-border);
user-select: none;
```
- `.retune-section:last-child { border-bottom: none; }` (825)
- `.retune-section:has(+ :not(.retune-section)) { border-bottom: none; }` (827) - drops the
  divider when the next sibling is not a section (e.g. a scroll anchor sentinel).

So sections are separated by a single 1px hairline in `--retune-border` (black-10 / white-10).
No outer padding, no gap between sections - they butt directly against each other, divider only.

`.retune-section-header` (829-835):
```
display: flex;
align-items: center;
justify-content: space-between;
padding: 0 8px 0 16px;   /* top 0, right 8, bottom 0, left 16 */
height: 44px;
```
Fixed 44px-tall header. Label is left-aligned at 16px inset; action sits at the right with 8px
inset (the smaller right padding leaves room for the 32px-square action button to align its
visual center near the edge).

`.retune-section-title` (837-842):
```
font-size: 12px;
font-weight: 500;
line-height: 20px;
color: var(--retune-text);
```

`.retune-section-body` (880-885):
```
display: flex;
flex-direction: column;
gap: 12px;            /* overridable via the `gap` prop inline style */
padding-bottom: 16px;
```
Note: the body has NO top padding (the 44px header provides the top breathing room) and NO
horizontal padding - horizontal insets live on the row classes (`.retune-section-row`,
`.retune-row-group`) so different row types can use different right insets. Bottom padding 16px
closes out the section before the next divider.

---

## 4. Section header action button - the "+ add" / "- remove" control

The `action` prop has no wrapper styling of its own; callers supply a fully-classed button.
The canonical add/remove pattern (e.g. FillSection.tsx 212-217, BorderSection.tsx 75-81,
ShadowSection.tsx 54-68) is:
```jsx
<Section label="Fill" action={
  isAdded
    ? <Tooltip content="Remove fill" side="top"><button className="retune-section-action" onClick={...}><Minus /></button></Tooltip>
    : <Tooltip content="Add fill" side="top"><button className="retune-section-action" onClick={...}><Plus /></button></Tooltip>
}>
```

`.retune-section-action` (overlay.css 844-860):
```
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
border: none;
border-radius: 8px;
background: transparent;
color: var(--retune-text);
cursor: pointer;
padding: 0;
```
Hover (857-860): `background: var(--retune-surface-hover); color: var(--retune-text);`

There is NO active/focus/disabled rule for `.retune-section-action` - it has default (transparent)
and hover states only. The button is always rendered (no fade-in); only its icon swaps Plus/Minus
based on whether the property is currently set.

### Variant: variable action in the header (token picker)
`.retune-section-header .retune-variable-action` (863-871): a header action that is HIDDEN until
section hover.
```
position: static;
width: 32px; height: 32px;
border-radius: 8px;
background: transparent;
color: transparent;            /* invisible icon at rest */
transition: color 0.15s ease;
```
- `.retune-section:hover .retune-section-header .retune-variable-action { color: var(--retune-text-secondary); }` (872-874) - fades the icon in on section hover.
- `.retune-section-header .retune-variable-action:hover { color: var(--retune-text) !important; background: var(--retune-surface-hover); }` (875-878).

This is the actual "hover behavior" referenced in the brief: the section-level variable/token
action is transparent until you hover anywhere over the section, then it appears at
text-secondary, and brightens to full text color with a hover background when hovered directly.

### Icons (icons.tsx - custom 24x24-grid ports, NOT raw Lucide)
icons.tsx header (lines 1-13) wraps every icon in `<svg width height viewBox="0 0 24 24" fill="none">`,
default `size = 24`, but the panel renders them at the button's natural sizing (the SVG scales the
24x24 art; comment notes "Default display size is 32px"). Paths use `fill="currentColor"
fillOpacity={0.9}`.

`Plus` (icons.tsx 170-172) - exact path data (extract verbatim):
```
M12 6C12.2761 6 12.5 6.22386 12.5 6.5V11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H12.5V17.5C12.5 17.7761 12.2761 18 12 18C11.7239 18 11.5 17.7761 11.5 17.5V12.5H6.5C6.22386 12.5 6 12.2761 6 12C6 11.7239 6.22386 11.5 6.5 11.5H11.5V6.5C11.5 6.22386 11.7239 6 12 6Z
```
attrs: `fillRule="evenodd" clipRule="evenodd" fill="currentColor" fillOpacity={0.9}`

`Minus` (icons.tsx 174-176) - exact path data:
```
M6 12C6 11.7239 6.22386 11.5 6.5 11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H6.5C6.22386 12.5 6 12.2761 6 12Z
```
same attrs.

These are NOT verbatim Lucide paths - they are bespoke icons "ported from the portfolio editor."
Reproduce them from icons.tsx, not from an icon library.

---

## 5. `Row` primitive (section.tsx lines 28-44)

Two render branches depending on whether `label` is passed.

### Branch A - with label (RowGroup):
```jsx
<div className="retune-row-group">
  <div className="retune-group-label-inline">{label}</div>
  {children}
</div>
```

### Branch B - no label:
```jsx
<div className="retune-section-row">
  <div className="retune-row">
    {children}
  </div>
</div>
```

`RowGroup` (line 64) is a deprecated alias for `Row`. `GroupLabel` (67-71) is a deprecated standalone
`<div className="retune-group-label">`.

### Styles

`.retune-section-row` (overlay.css 887-893):
```
padding: 0 48px 0 16px;          /* right 48 leaves a reserved gutter, left 16 inset */
```
- When the row contains a split-button or row-action it reduces the right gutter:
  `.retune-section-row:has(.retune-split-btn), .retune-section-row:has(.retune-row-action) { padding-right: 8px; }` (890-893).
  Rationale: the 48px right gutter is reserved so plain inputs align to a column; when a 32px
  action button is present, the gutter shrinks to 8px so the button occupies that reserved space.

`.retune-row` (1176-1180):
```
display: flex;
align-items: flex-end;        /* inputs bottom-align so labels-above stay top-aligned */
gap: 8px;
```
Direct flex children grow equally (1183-1188):
```
.retune-row > .retune-prop,
.retune-row > .retune-combo,
.retune-row > .retune-select,
.retune-row > .retune-text-input,
.retune-row > .retune-font-input,
.retune-row > .retune-slider { flex: 1; min-width: 0; }
```

`.retune-row-group` (896-905):
```
display: flex;
flex-direction: column;
gap: 4px;
padding: 0 48px 0 16px;
```
- Same `:has(.retune-split-btn|.retune-row-action) { padding-right: 8px; }` reduction (902-905).
- `.retune-row-group > .retune-row + .retune-row { margin-top: 4px; }` (907) - adjacent rows inside
  a group get 4px extra top margin (on top of the 4px column gap, so the visual space between two
  `.retune-row` siblings in a group is 4px gap PLUS 4px margin = 8px).

Special case (lines 468-475, outside this area but affecting `.retune-row-group`): when a row-group
contains a `.retune-selector-field`, layout switches - note the symbol `.retune-selector-field`
lives in the Scope/selector section, reference only.

---

## 6. `Field` primitive (section.tsx lines 46-53)

```jsx
<div className="retune-field">
  <span className="retune-field-label">{label}</span>
  {children}
</div>
```
A label-above-input pair placed inside a `.retune-row`.

`.retune-field` (overlay.css 1191-1197):
```
flex: 1;
min-width: 0;
display: flex;
flex-direction: column;
gap: 4px;
```

`.retune-field-label` (1199-1205):
```
font-size: 11px;
font-weight: 400;
letter-spacing: -0.005em;
color: var(--retune-text-tertiary);
line-height: 16px;
```

`.retune-group-label-inline` (used by Row branch A, 1218-1227):
```
font-size: 11px;
font-weight: 400;
letter-spacing: -0.005em;
color: var(--retune-text-tertiary);
line-height: 16px;
display: flex;
align-items: center;
justify-content: space-between;
```

`.retune-group-label` (deprecated standalone, 1208-1215): identical type styling to the inline
variant plus `padding: 0 16px;` (it provides its own horizontal inset since it is not nested in a
padded row-group).

---

## 7. `RowAction` primitive (section.tsx lines 55-61)

```jsx
<button className={`retune-row-action${active ? " active" : ""}`} onClick={onClick}>
  {children}
</button>
```
Props: `onClick: () => void` (required), `active?: boolean` (adds `.active`), `children: ReactNode`
(the icon).

`.retune-row-action, .retune-split-btn` (overlay.css 1230-1245):
```
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
border: none;
border-radius: 8px;
background: transparent;
color: var(--retune-text);
cursor: pointer;
padding: 0;
flex-shrink: 0;
transition: background 0.15s ease, color 0.15s ease;
```
States:
- hover (1246-1250): `background: var(--retune-surface-active); color: var(--retune-text);`
- active (1251-1255): `color: var(--retune-text); background: var(--retune-input-bg-hover);`
  (input-bg-hover = black-10 light / white-10 dark - a slightly stronger fill than surface-active hover)

No focus or disabled rule defined for row-action.

---

## 8. ComponentSection - Section in 2-column grid mode (ComponentSection.tsx)

This wraps the generic `<Section>` but replaces the normal Row/Field body with a 2-col grid of
prop/state editors. It is composed by the overlay (not by PropertyPanel in the read set), but it
demonstrates the Section action slot used for metadata rather than a button.

### Header / action usage (ComponentSection.tsx 333-336)
```jsx
<Section label={componentName || "Component"} action={
  sourceFile ? <span className="retune-component-source">{sourceFile.fileName.split("/").pop()}:{sourceFile.lineNumber}</span> : undefined
}>
```
So `action` here is a text span (filename:line), not a button.

`.retune-component-source` (overlay.css 3159-3165):
```
font-size: 10px;
color: var(--retune-text-tertiary);
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

### Body grid (ComponentSection.tsx 337)
```jsx
<div className="retune-component-grid"> ... per-entry fields ... </div>
```
`.retune-component-grid` (overlay.css 3168-3173):
```
display: grid;
grid-template-columns: 1fr 1fr;
gap: 12px 8px;                 /* row-gap 12, column-gap 8 */
padding: 0 48px 4px 16px;      /* note bottom 4 (Section body already adds 16 below) */
```

`.retune-component-field` (3174-3179): `display:flex; flex-direction:column; gap:4px; min-width:0;`
`.retune-component-field-label` (3180-3185): `font-size:11px; font-weight:450; letter-spacing:-0.005em; color: var(--retune-text-tertiary);`
`.retune-component-field > .retune-prop { width: 100%; }` (3203-3205)
`.retune-component-field > .retune-select { width: 100%; }` (3206-3208)
Number inputs strip spinners (3210-3217): `-webkit-(inner|outer)-spin-button { -webkit-appearance:none; margin:0; }` and `[type=number] { -moz-appearance: textfield; }`.

### Per-entry control selection (ComponentSection.tsx 338-374)
For each entry (`allEntries`, built 324-331 from props then state):
- `valueType` via `getValueType` (28-35): boolean | number | string | function | object | null.
- If `entry.enumValues` present (manifest enum) -> `<SelectInput prop value options onChange isChanged onReset />`.
- Else if boolean (`isToggle`) -> `<SegmentedControl options=[{value:"true",label:"Yes"},{value:"false",label:"No"}] value onChange />`.
- Else -> `<ValueInput value onChange isChanged onReset />`.

`ValueInput` (ComponentSection.tsx 380-444):
- Structure: `<div className="retune-prop"><ChangeIndicator .../><input className="retune-prop-input" style={{paddingLeft:12}} ... /></div>` for editable types.
- function type -> readonly input value `"fn()"`, paddingLeft 12.
- object/null -> readonly input value `formatValue(value)`, paddingLeft 12.
- number/string -> editable. Local state mirrors `String(value)`; on number, `parseFloat` on
  change + blur, commits only when `!isNaN`. `onKeyDown`: Enter blurs; ALL keydown events
  `stopPropagation()` (so the overlay's global keyboard shortcuts do not fire while typing).
- `onFocus`/`onBlur` toggle a `focusedRef` so external value syncs are suppressed while focused
  (line 392 sync guard).

`.retune-prop` (overlay.css 1309-1322):
```
display: flex;
align-items: center;
gap: 0;
height: 32px;
padding: 0;
border-radius: 8px;
background: var(--retune-surface-hover);
border: none;
min-width: 0;
overflow: visible;
position: relative;
transition: background-color 0.15s ease;
```
- hover (1324): `.retune-prop:hover:not(.retune-prop-variable-applied) { background: var(--retune-border); }`
- focus-within (1325-1331): outline `1px solid var(--retune-border)` with `outline-offset:-1px`,
  background reset to `var(--retune-surface-hover)`.

`.retune-prop-input` (1351-1365):
```
flex: 1;
min-width: 0;
width: 100%;
height: 100%;
border: none;
background: transparent;
font-size: 11px;
font-weight: 450;
letter-spacing: -0.005em;
font-family: inherit;
color: var(--retune-text);
outline: none;
padding: 0 0 0 32px;          /* 32px left reserves room for a .retune-prop-label overlay */
```
- `.retune-prop-input:first-child { padding-left: 12px; }` (1367) - when there is no leading label
  overlay, the input text starts at 12px. (ComponentSection passes inline `paddingLeft:12` for the
  same effect on its bare inputs.)
- selection color (1368): `background: var(--retune-blue-bg); color: var(--retune-text);`

`.retune-prop-label` (1333-1349): absolutely-positioned 32x32 leading glyph (e.g. the W/H/X/Y
single-letter axis label), `font-size:11px; font-weight:450; letter-spacing:-0.005em;
color:var(--retune-text); cursor: ew-resize;` - the scrub handle. (Scrub math lives in the
NumberInput component, outside this read set; symbol reference only.)

### ComponentSection conditional rendering (early returns)
- `isFrameworkComponent(componentName)` true -> `return null` (line 201). Patterns (57-68):
  `Provider$`, `Context$`, `Config$`, `Wrapper$`, `^HOC`, `^with[A-Z]`, `^I13n`, `^Motion`,
  `^Suspense$`, `^ErrorBoundary$` (all case-insensitive except Suspense).
- Manifest exists but component not in it -> `return null` (209).
- After building prop/state entries: `if (propEntries.length === 0 && filteredState.length === 0) return null` (241).
- Prop visibility (no manifest): `isDesignerRelevantProp` (71-91) hides ALWAYS_HIDE_PROPS
  (`children, ref, key, className, style, params, searchParams, dangerouslySetInnerHTML`, lines 40-43),
  HIDE_NAME_PATTERNS (`^on[A-Z]`, `^__`, `^\$`, `^_`, `^data-`, `^aria-`, `^(i13n|ylk|track|beacon)`,
  lines 46-54), functions, null/undefined, objects/arrays, and strings longer than 80 chars.
- State visibility (235-238): only boolean | number | string(<80) hooks that `hasDispatch`.

---

## 9. PropertyPanel - section ordering and composition (PropertyPanel.tsx)

PropertyPanel is a thin orchestrator (lines 34-379). It computes `s = element.computedStyles`
(line 96-99, no Proxy), token-match helpers, change-indicator helpers, and derived booleans, then
renders sections IN THIS FIXED ORDER inside a fragment (lines 278-378):

1. **ScopeSection** - rendered only `if (!frameDimensions)` (281-291). Hidden for frame-node
   selection (body has no meaningful scope). Gets scopeLevels/activeLevelIndex/forcedState props.
2. **PositionSection** - `if (!isSvgChild)` (294-299). Passes `onPinLinesChange`.
3. **LayoutSection** - `if (!isSvgChild)` (302-306).
4. **SpacingSection** - ALWAYS rendered (309-317). Note: receives a REDUCED prop set (only
   `s, onPropertyChange, onPropertyHover, variableProps, shorthandVariableProps, changeProps,
   shorthandChangeProps`) - NOT the full `...baseProps` spread.
5. **SizeSection** - ALWAYS (320-323). `...baseProps` + `frameDimensions`.
6. **TypographySection** - `if (!isSvgChild)` (326-332). `...baseProps` + `isText` + `hasVerticalAlign`.
   (Returns null internally when `!isText`.)
7. **FillSection** - ALWAYS (335-342). `...baseProps` + `isSvgChild, isMedia, getVariableMatch,
   onVariableAssociate, onPropertyReset`.
8. **ImageSection** - `if (isImage || isVideo || hasBackgroundImage)` (345-352). `...baseProps` +
   `isImage, isVideo, hasBackgroundImage`. Positioned after Appearance/Fill, before Border.
9. **BorderSection** - `if (!isSvgChild)` (355-364). REDUCED prop set (no `...baseProps`): only
   `s, onPropertyChange, variableProps, shorthandVariableProps, changeProps, shorthandChangeProps`.
10. **ShadowSection** - ALWAYS (367-369). `...baseProps`.
11. **FiltersSection** - `if (!isSvgChild)` (372-376). `...baseProps`.

Note: ComponentSection is NOT rendered by PropertyPanel in this file - it is composed elsewhere
(the overlay shell). The read set shows PropertyPanel covers the CSS-property sections only.

### Derived booleans driving conditional rendering (PropertyPanel.tsx 226-257)
- `TEXT_TAGS` (227): P,H1-H6,SPAN,A,BUTTON,LABEL,LI,TD,TH,FIGCAPTION,BLOCKQUOTE,CITE,EM,STRONG,SMALL.
- `hasDirectText` (228-230): any child TEXT_NODE with non-empty trimmed text.
- `isText = TEXT_TAGS.includes(tagName) || hasDirectText` (231).
- `displayValue = s.display || "block"` (232); `isFlex = includes("flex")` (233); `isGrid = includes("grid")` (234).
- `positionType = s.position || "static"` (235); `isPositioned` (236); `showOffsets` = absolute|fixed|relative (237); `isSticky` (238).
- `hasVerticalAlign = isText || tag in [IMG,INPUT,SELECT,TEXTAREA] || isFlex || isGrid` (239).
- `isImage` = IMG|PICTURE|CANVAS (240); `isVideo` = VIDEO (241); `isSvg` = SVG/svg (242);
  `isSvgChild = !isSvg && element.closest("svg")` (243); `isMedia = isImage||isVideo` (244).
- `hasBackgroundImage` (245): backgroundImage set, not "none", not a linear/radial gradient.
- `isFlexChild`/`isGridChild` from parent computed `display` (248-252); `parentFlexDir` (255-257).

### baseProps bundle (PropertyPanel.tsx 260-276)
`{ element, s, onPropertyChange, onAttributeChange, onPropertyHover, onApplyToElement,
variableProps, shorthandVariableProps, changeProps, shorthandChangeProps, handleVariableSelect,
handleVariableApply, isFlexChild, isGridChild, parentFlexDir }`. Shape defined by `BaseSectionProps`
(section-props.ts 19-54).

### Helper semantics (token + change indicators)
- `getVariableMatch(camelProp)` (111-122): user-set associations win over element-scanned matches;
  `unlinkedVariables` suppress; kebab-cases the prop; skips `isRawUtility` matches.
- `variablePropsHelper` (185-192) / `shorthandVariablePropsHelper` (195-212): shorthand only shows a
  variable indicator when ALL props share the same `variable.className`.
- `changePropsHelper` (215-218): `{ isChanged: changedProperties.has(prop), onReset }`.
- `shorthandChangePropsHelper` (221-224): changed if ANY prop in the group changed; reset resets all.

---

## 10. Shared section prop interfaces (section-props.ts)

- `ForcedState = ":hover" | ":focus" | ":active" | null` (13).
- `BaseSectionProps` (19-54): the bundle above. Field-level JSDoc preserved in source.
- `ScopeSectionProps` (57-65): element, scopeLevels, activeLevelIndex, onScopeLevelChange,
  onScopeLevelHover, forcedState, onForcedStateChange. (Does NOT extend BaseSectionProps.)
- `PositionSectionProps extends BaseSectionProps` (68-75): + onPropertyHover, onPinLinesChange, onApplyToElement.
- `SizeSectionProps extends BaseSectionProps` (78-81): + `frameDimensions?: {width,height,onResize}`.
- `TypographySectionProps extends BaseSectionProps` (84-89): + `isText`, `hasVerticalAlign`.

---

## 11. Reproduction checklist (exact numbers)

- Panel width 280px; radius 16px; shadow `0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)`.
- Section divider: `1px solid var(--retune-border)`; suppressed on last + before non-section sibling.
- Header: 44px tall, padding `0 8px 0 16px`, title 12px/500/20px in `--retune-text`.
- Body: column flex, gap 12px (prop-overridable), padding-bottom 16px, no top/side padding.
- Section action button: 32x32, radius 8px, transparent -> `--retune-surface-hover` on hover.
- Variable header action: transparent at rest, `--retune-text-secondary` on section hover, full
  `--retune-text` + `--retune-surface-hover` on direct hover, `color 0.15s ease`.
- Section row inset: `0 48px 0 16px`, reduced right to 8px when a row-action/split-btn present.
- Row: flex, align-items flex-end, gap 8px; direct inputs `flex:1; min-width:0`.
- Row group: column flex, gap 4px, same insets; stacked `.retune-row` siblings get +4px margin-top.
- Field: column flex, gap 4px; field label 11px/400/16px, `-0.005em`, `--retune-text-tertiary`.
- Prop control: 32px tall, radius 8px, bg `--retune-surface-hover`; hover bg `--retune-border`;
  focus-within outline `1px solid --retune-border` offset `-1px`. Input 11px/450/`-0.005em`.
  Input padding-left 32px (with overlay label) or 12px (first-child / bare).
- Component grid: 2 equal cols, gap `12px 8px`, padding `0 48px 4px 16px`.
- Icons Plus/Minus: custom 24x24-grid SVG, currentColor @ fillOpacity 0.9, exact paths in section 4.
- Transitions: 0.15s ease (background/color); panel enter/exit `cubic-bezier(0.23,1,0.32,1)`.
- Font: InterVariable/Inter stack, host font-size 13px, letter-spacing -0.005em, line-height 1.4,
  font-feature-settings `'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0`.
