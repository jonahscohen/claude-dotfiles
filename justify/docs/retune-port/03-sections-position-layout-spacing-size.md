# Retune Design Panel - Position / Layout / Spacing / Size Sections (1:1 Spec)

Source of truth (read in full):
- `packages/overlay/src/ui/sections/PositionSection.tsx`
- `packages/overlay/src/ui/sections/LayoutSection.tsx`
- `packages/overlay/src/ui/sections/SpacingSection.tsx`
- `packages/overlay/src/ui/sections/SizeSection.tsx`
- `packages/overlay/src/ui/sizing-utils.ts`
- `packages/overlay/src/ui/spacing-icons.tsx`
- (supporting) `packages/overlay/src/ui/sections/section-props.ts`

Conventions used throughout these sections:
- `<Section label="...">` is the titled container; `<Row label?="...">` is a labeled row group; `<Field label="...">` is a single labeled control cell.
- `s` = `element.computedStyles` (a `Record<string, string>`), camelCase CSS keys.
- `onPropertyChange(property, value)` applies a CSS change.
- `changeProps(camelProp)` returns `{ isChanged, onReset }` (change indicator + revert).
- `variableProps(camelProp)` / `shorthandVariableProps([...])` return token/variable wiring spread onto inputs.
- A bare `<div className="retune-row">` is the raw flex row used to lay out 2-3 controls side by side; the trailing `<div style={{ width: 32 }} />` is a spacer that reserves the width of the expand/collapse split button.

---

## 1. Position Section

`<Section label="Position">`. Always rendered (no gating at the section level). Internal control visibility depends on `position` and layout context.

Derived at top:
- `positionType = s.position || "static"` (DEFAULT when unset = `"static"`).
- `isSticky = positionType === "sticky"`.
- `isAbsoluteOrFixed = positionType === "absolute" || positionType === "fixed"`.
- `isFlexColumn = isFlexChild && parentFlexDir.startsWith("column")`.
- `isFlexRow = isFlexChild && !parentFlexDir.startsWith("column")`.
- `hEnabled = isAbsoluteOrFixed || isGridChild || isFlexColumn`.
- `vEnabled = isAbsoluteOrFixed || isGridChild || isFlexRow`.
- `alignSelf = s.alignSelf || "auto"`, `justifySelf = s.justifySelf || "auto"`.

### Control order (top to bottom)

#### 1.1 Alignment row (always visible)
A single `<Row>` containing a `retune-field` with label text **"Alignment"** (`<span className="retune-field-label">`), then a `retune-align-row` holding two `retune-btn-group` clusters:

- **Horizontal group** (3 buttons), wrapped in a div with inline style `{ opacity: 0.3, pointerEvents: "none" }` applied ONLY when `!hEnabled` (otherwise no style):
  1. Tooltip "Align left" -> button `retune-align-btn` (+ ` active` when `hActive === "start"`), icon `<LayoutAlignLeft />`.
  2. Tooltip "Align center horizontally" -> `retune-align-btn` (+ active when `hActive === "center"`), icon `<LayoutAlignHorizontalCenter />`.
  3. Tooltip "Align right" -> `retune-align-btn` (+ active when `hActive === "end"`), icon `<LayoutAlignRight />`.
- **Vertical group** (3 buttons), dimmed `{ opacity: 0.3, pointerEvents: "none" }` ONLY when `!vEnabled`:
  1. Tooltip "Align top" -> `retune-align-btn` (+ active when `vActive === "start"`), icon `<LayoutAlignTop />`.
  2. Tooltip "Align center vertically" -> `retune-align-btn` (+ active when `vActive === "center"`), icon `<LayoutAlignVerticalCenter />`.
  3. Tooltip "Align bottom" -> `retune-align-btn` (+ active when `vActive === "end"`), icon `<LayoutAlignBottom />`.

All tooltips `side="top"`.

Active-state derivation (`hActive` / `vActive`, each `"start" | "center" | "end" | null`):
- **Horizontal** (`getHActive`):
  - If `isFlexColumn`: reads `alignSelf` -> `flex-start`|`start`->`"start"`, `center`->`"center"`, `flex-end`|`end`->`"end"`.
  - Else if `isGridChild`: reads `justifySelf` -> `start`/`center`/`end` map 1:1.
  - Else `null`.
- **Vertical** (`getVActive`):
  - If `isFlexRow`: reads `alignSelf` -> `flex-start`|`start`->`"start"`, `center`->`"center"`, `flex-end`|`end`->`"end"`.
  - Else if `isGridChild`: reads `alignSelf` -> `start`/`center`/`end` map 1:1.
  - Else `null`.

Click behavior:
- **`onHClick(alignment)`**:
  - If `isAbsoluteOrFixed`: `start`->`alignLeft()`, `center`->`alignCenterH()`, `end`->`alignRight()` (these set `left`/`right` + transform, see below).
  - Else if `isGridChild`: `onPropertyChange("justifySelf", hActive === alignment ? "auto" : alignment)` (toggle off to `"auto"`).
  - Else if `isFlexColumn`: maps to flex value (`start`->`flex-start`, `end`->`flex-end`, `center`->`center`), `onPropertyChange("alignSelf", hActive === alignment ? "auto" : flexVal)`.
- **`onVClick(alignment)`**:
  - If `isAbsoluteOrFixed`: `start`->`alignTop()`, `center`->`alignCenterV()`, `end`->`alignBottom()`.
  - Else if `isGridChild`: `onPropertyChange("alignSelf", vActive === alignment ? "auto" : alignment)`.
  - Else if `isFlexRow`: maps to flex value, `onPropertyChange("alignSelf", vActive === alignment ? "auto" : flexVal)`.

Absolute/fixed alignment callbacks (each also calls `applyTransform()` and updates pin state):
- `alignLeft`: `left="0px"`, `right="auto"`; pins `{left:true,right:false}`; `centeredAxes.h=false`.
- `alignCenterH`: `left="50%"`, `right="auto"`; pins `{left:true,right:false}`; `centeredAxes.h=true`.
- `alignRight`: `right="0px"`, `left="auto"`; pins `{right:true,left:false}`; `centeredAxes.h=false`.
- `alignTop`: `top="0px"`, `bottom="auto"`; pins `{top:true,bottom:false}`; `centeredAxes.v=false`.
- `alignCenterV`: `top="50%"`, `bottom="auto"`; pins `{top:true,bottom:false}`; `centeredAxes.v=true`.
- `alignBottom`: `bottom="0px"`, `top="auto"`; pins `{bottom:true,top:false}`; `centeredAxes.v=false`.
- `applyTransform()`: if both `h&&v` centered -> `transform: "translate(-50%, -50%)"`; else `h` only -> `"translateX(-50%)"`; `v` only -> `"translateY(-50%)"`; neither -> `"none"`.

#### 1.2 Type (always visible)
`<Row><Field label="Type">` -> `<SelectInput prop="position" value={positionType}>` with options **exactly** `["static", "relative", "absolute", "fixed", "sticky"]`.

#### 1.3 Constraints input - only when `positionType === "absolute" || "fixed"`
`<Row>` -> `<ConstraintsInput>` with props `top={s.top}`, `right={s.right}`, `bottom={s.bottom}`, `left={s.left}`, `pins={pins}`, `centered={centered}`, `onChange={onPropertyChange}`, `onPinChange={handlePinChange}`, `onCenterChange={setCentered}`.

Pin state (`pins`, initialized once via `useState`):
- If computed `position` is NOT `absolute`/`fixed`: default `{ top: true, right: false, bottom: false, left: true }`.
- Otherwise it inspects authored values (inline `el.style[prop] !== ""` OR matching stylesheet rule where value is set and `!== "auto"`) for top/right/bottom/left and derives:
  - `top: hasTop || (!hasTop && !hasBottom)`
  - `right: hasRight && !hasLeft`
  - `bottom: hasBottom && !hasTop`
  - `left: hasLeft || (!hasLeft && !hasRight)`

#### 1.4 Offsets - only when `positionType === "relative"`
`<Row label="Offsets">` containing two `retune-row` rows of `NumberInput`s:
- Row A: label **"T"** prop `top`; label **"R"** prop `right`.
- Row B: label **"B"** prop `bottom`; label **"L"** prop `left`.
- All four: `value={s.<prop>}`, `onChange={onPropertyChange}`, spread `{...changeProps(<prop>)}`.

#### 1.5 Sticky offset - only when `isSticky`
`<Row label="Sticky offset">` with one `retune-row`:
- label **"T"** prop `top`; label **"B"** prop `bottom`. (No right/left for sticky.)

Note: For `static` and `relative`-without-anything, only Alignment + Type render. For `static`, alignment groups will be dimmed unless the element is a flex/grid child (since `hEnabled`/`vEnabled` only true via grid/flex child or absolute/fixed).

---

## 2. Layout Section

`<Section label="Layout">`. Always rendered.

Derived:
- `displayValue = s.display || "block"` (DEFAULT `"block"`).
- `isFlex = displayValue.includes("flex")`.
- `isGrid = displayValue.includes("grid")`.

### 2.1 Display (always visible)
`<Row><Field label="Display">` -> `<SegmentedControl>` with `DISPLAY_OPTIONS` (exact, in order):
1. `{ value: "block", icon: <RectangleSmall />, label: "Block" }`
2. `{ value: "flex-row", icon: <AutolayoutAddHorizontal />, label: "Flex (right-arrow U+2192)" }` (literal label in source is "Flex " followed by the right-arrow glyph)
3. `{ value: "flex-column", icon: <AutolayoutAddVertical />, label: "Flex (down-arrow U+2193)" }` (literal label is "Flex " followed by the down-arrow glyph)
4. `{ value: "grid", icon: <GridView />, label: "Grid" }`

Computed selected value:
- if `displayValue.includes("flex")` -> `(s.flexDirection || "row").startsWith("column") ? "flex-column" : "flex-row"`
- else if `displayValue.includes("grid")` -> `"grid"`
- else `"block"`.

onChange:
- `"flex-row"` -> `display="flex"`, `flexDirection="row"`.
- `"flex-column"` -> `display="flex"`, `flexDirection="column"`.
- otherwise -> `display=v` (i.e. `block` or `grid`).

### 2.2 Flex controls - only when `isFlex`
Rendered as a `retune-section-row` containing a `retune-row` with `alignItems: "flex-start"`, two halves each `flex: 1`:
- **Left half - `<Field label="Alignment">`** -> `<AlignmentGrid>` with:
  - `justifyContent={s.justifyContent || "flex-start"}` (DEFAULT `"flex-start"`)
  - `alignItems={s.alignItems || "stretch"}` (DEFAULT `"stretch"`)
  - `flexDirection={s.flexDirection || "row"}` (DEFAULT `"row"`)
  - `onChange={onPropertyChange}`
- **Right half - `<Field label="Gap">`** (wrapped with `onPointerEnter`->`onPropertyHover("gap")`, leave->`null`) -> `<NumberInput prop="gap" value={s.gap} min={0}>`.
  - Label is a Tooltip-wrapped icon: if `(s.flexDirection||"row").startsWith("column")` -> tooltip "Vertical gap between items" + `<AlSpacingVertical />`; else tooltip "Horizontal gap between items" + `<AlSpacingHorizontal />`. Tooltip `side="top" sideOffset={14}`.
  - Spread `{...changeProps("gap")}`.

Then a `<Row>` with two `<Field>`s:
- **`<Field label="Reverse">`** -> `<SelectInput prop="flexDirection">` with options **`["no", "yes"]`**; displayed value = `(s.flexDirection||"row").includes("reverse") ? "yes" : "no"`; onChange computes `base = startsWith("column") ? "column" : "row"` and sets `flexDirection` to `` `${base}-reverse` `` when "yes", else `base`.
- **`<Field label="Wrap">`** -> `<SelectInput prop="flexWrap" value={s.flexWrap}>` options **`["nowrap", "wrap", "wrap-reverse"]`**.

### 2.3 Grid controls - only when `isGrid`
A single `<Row>` with two halves (`flex: 1` each):
- **Left - `<Field label="Grid">`** -> `<GridPicker columns={parseGridCount(s.gridTemplateColumns)} rows={parseGridCount(s.gridTemplateRows)} onChange={onPropertyChange} />`.
- **Right - `<Field label="Gap">`** (wrapped with gap hover) -> a column flex (`gap: 8`) of two NumberInputs:
  - Tooltip "Horizontal gap between columns" + `<AlSpacingHorizontal />`, `prop="columnGap" value={s.columnGap} min={0}`, spread `variableProps("columnGap")` + `changeProps("columnGap")`.
  - Tooltip "Vertical gap between rows" + `<AlSpacingVertical />`, `prop="rowGap" value={s.rowGap} min={0}`, spread `variableProps("rowGap")` + `changeProps("rowGap")`.
  - Tooltips `side="top" sideOffset={14}`.

Note: when display is `block`, only the Display row renders.

---

## 3. Spacing Section

`<Section label="Spacing">`. Always rendered. Two `<Row>`s: **Padding** then **Margin**. Each has a collapsed (2-axis) and expanded (4-side) mode, toggled by an independent `useState` (`paddingExpanded`, `marginExpanded`, both DEFAULT `false` = collapsed).

The toggle button is `retune-split-btn` (gets ` active` class when expanded) with icon `<AlPaddingSides />`.

### 3.1 `<Row label="Padding">`

**Collapsed (default)** - one `retune-row`:
- Half 1 (`flex:1`, hover prop `paddingInline`): `<ShorthandInput>` label Tooltip "Horizontal padding (left, right)" + `<AlPaddingHorizontal />`; `props={["paddingLeft","paddingRight"]}`, `values={[s.paddingLeft, s.paddingRight]}`, `min={0}`; spread `shorthandVariableProps(["paddingLeft","paddingRight"])` + `shorthandChangeProps([...])`.
- Half 2 (`flex:1`, hover prop `paddingBlock`): `<ShorthandInput>` label Tooltip "Vertical padding (top, bottom)" + `<AlPaddingVertical />`; `props={["paddingTop","paddingBottom"]}`, `values={[s.paddingTop, s.paddingBottom]}`, `min={0}`.
- Trailing: Tooltip "Edit individual sides" -> `retune-split-btn` (no active) `onClick`-> expand, icon `<AlPaddingSides />`.

**Expanded** - two `retune-row`s:
- Row A:
  - `flex:1` (hover `paddingLeft`): NumberInput, label Tooltip "Padding left" + `<AlPaddingLeft />`, `prop="paddingLeft" value={s.paddingLeft} min={0}` + variable/change props.
  - `flex:1` (hover `paddingTop`): NumberInput, label Tooltip "Padding top" + `<AlPaddingTop />`, `prop="paddingTop" min={0}`.
  - Trailing: Tooltip "Collapse to axes" -> `retune-split-btn active` collapse, icon `<AlPaddingSides />`.
- Row B:
  - `flex:1` (hover `paddingRight`): NumberInput, label "Padding right" + `<AlPaddingRight />`, `prop="paddingRight" min={0}`.
  - `flex:1` (hover `paddingBottom`): NumberInput, label "Padding bottom" + `<AlPaddingBottom />`, `prop="paddingBottom" min={0}`.
  - Trailing: spacer `<div style={{ width: 32 }} />`.

All padding inputs use `min={0}`. All padding NumberInputs spread `variableProps(prop)` + `changeProps(prop)`.

### 3.2 `<Row label="Margin">`

Identical structure to Padding BUT **no `min={0}`** on any margin input (margins may be negative), and hover props are `marginInline` / `marginBlock` (collapsed) and `marginLeft/Top/Right/Bottom` (expanded). Icons reuse the padding icon set:
- Collapsed half 1: ShorthandInput Tooltip "Horizontal margin (left, right)" + `<AlPaddingHorizontal />`, `props=["marginLeft","marginRight"]`.
- Collapsed half 2: Tooltip "Vertical margin (top, bottom)" + `<AlPaddingVertical />`, `props=["marginTop","marginBottom"]`.
- Expanded Row A: "Margin left" `<AlPaddingLeft />` prop `marginLeft`; "Margin top" `<AlPaddingTop />` prop `marginTop`; collapse split-btn active.
- Expanded Row B: "Margin right" `<AlPaddingRight />` prop `marginRight`; "Margin bottom" `<AlPaddingBottom />` prop `marginBottom`; spacer `width:32`.

Tooltips throughout `side="top" sideOffset={14}` (except the bare collapse/expand buttons which use plain `side="top"`).

> Icon naming note: SpacingSection imports `AlPadding*` icons from `../icons`, NOT the components in `spacing-icons.tsx`. `spacing-icons.tsx` exports a parallel family (`IconSpacingHorizontal`, `IconSpacingVertical`, `IconSpacingHorizontalLeft/Right`, `IconSpacingVerticalTop/Bottom`, `IconGapHorizontal`, `IconGapVertical`) - all `20x20` viewBox, `stroke="currentColor" strokeWidth="1.5"`, default `size=20`. These appear to be an alternate/legacy icon set not wired into SpacingSection's current imports. (Full SVG path data in `spacing-icons.tsx` lines 11-85; mirror verbatim if porting.)

---

## 4. Size Section

`<Section label="Size">`. Two distinct modes.

### 4.A Frame mode - when `frameDimensions` prop is set
Returns early. `<Section label="Size">` with one `<Row>`:
- `<Field label="Width">` -> NumberInput `prop="width" value={`${frameDimensions.width}px`}`, `min={200}`; onChange parses int, if `>0` calls `frameDimensions.onResize(n, frameDimensions.height)`.
- `<Field label="Height">` -> NumberInput `prop="height" value={`${frameDimensions.height}px`}`, `min={200}`; onChange parses int, if `>0` calls `frameDimensions.onResize(frameDimensions.width, n)`.

### 4.B Normal mode (full sizing controls)

`<Section label="Size" action={...}>`. The section header **action** is a `retune-section-action` button (icon `<Plus />`, Tooltip "Add constraint") that toggles a fixed-positioned `<DropdownMenu>` (positioned at `top: rect.bottom+4, left: rect.right`, `transform: translateX(-100%)`, `zIndex: 2147483647`). Menu options (labels are dynamic based on whether the extra is visible):
- `{ value: "min", label: visibleSizeExtras.has("min") ? "Remove min size" : "Add min size" }`
- `{ value: "max", label: visibleSizeExtras.has("max") ? "Remove max size" : "Add max size" }`
- `showCheckmark={false}`. Selecting a visible extra resets it to defaults (`min`-> minWidth/minHeight `"0px"`; `max`-> maxWidth/maxHeight `"none"`) and removes it; selecting a hidden one adds it to the `sizeExtras` set.

Constants:
- `SIZE_OPTIONS` (exact): `{value:"__fill",label:"Fill"}`, `{value:"__hug",label:"Hug"}`, `{value:"auto",label:"Auto"}`.
- `FLEX_BASIS_OPTIONS` (exact, defined but **not used** in render): `{value:"auto",label:"Auto"}`, `{value:"0",label:"0"}`, `{value:"100%",label:"100%"}`, `{value:"fit-content",label:"Fit Content"}`.

Derived sizing:
- `sizingCtx = { isFlexChild, isGridChild, parentFlexDir, currentStyles: s }`.
- `widthMode = detectSizingMode("width", sizingCtx)`, `heightMode = detectSizingMode("height", sizingCtx)`.
- `heightCanFill = canFill("height", sizingCtx)`; `heightSizeOptions = heightCanFill ? SIZE_OPTIONS : SIZE_OPTIONS without "__fill"`.
- `widthDisplayValue = widthMode==="fill" ? "__fill" : widthMode==="hug" ? "__hug" : s.width`.
- `heightDisplayValue = heightMode==="fill" ? "__fill" : heightMode==="hug" ? "__hug" : s.height`.

`visibleSizeExtras` = the `sizeExtras` set PLUS auto-shown entries:
- add `"min"` if `(s.minWidth && s.minWidth!=="0px" && s.minWidth!=="auto")` OR same for `minHeight`.
- add `"max"` if `(s.maxWidth && s.maxWidth!=="none")` OR `(s.maxHeight && s.maxHeight!=="none")`.

#### 4.B.1 Main size `<Row>` (always)
- **`<Field label="Width">`** -> `<ComboInput prop="width" value={widthDisplayValue} options={SIZE_OPTIONS}>`, spread `changeProps("width")`. onChange:
  - `"__fill"` -> `handleSizingModeChange("width","fill")`.
  - `"__hug"` -> `handleSizingModeChange("width","hug")`.
  - else: if `isFlexChild` first `handleSizingModeChange("width","fixed")`, then `onPropertyChange("width", val)`; if `aspectLocked` and `val` numeric and ratio>0, schedule (`requestAnimationFrame`) `onPropertyChange("height", `${round(newW/ratio)}px`)`.
- **`<Field label="Height">`** -> `<ComboInput prop="height" value={heightDisplayValue} options={heightSizeOptions}>`, spread `changeProps("height")`. onChange symmetric: `"__fill"`/`"__hug"` -> mode change; else fixed (flex) + `onPropertyChange("height", val)` + aspect-lock adjusts width via `round(newH*ratio)`.
- **Aspect-ratio lock button**: Tooltip text `aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"` (side top). Button `retune-split-btn` (+ ` active` when locked). On enable: reads `getBoundingClientRect()`, sets `aspectRatioRef = width/height` (if height>0), sets attribute `data-retune-aspect-locked="true"`; on disable removes that attribute. Icon: a **closed padlock** SVG (16x16, viewBox 0 0 24 24) when locked, **open padlock** SVG when unlocked. (Exact path data in SizeSection.tsx lines 264-271; these are inline SVGs, mirror verbatim if porting - note: these are inline, not from the icon library.)

#### 4.B.2 Min size - only when `visibleSizeExtras.has("min")`
`retune-section-row` -> `retune-row`:
- `<Field label="Min W">` NumberInput `prop="minWidth"`, value `= (s.minWidth==="0px"||"auto") ? "" : s.minWidth`, `placeholder` set to the en-dash glyph (U+2013); onChange: empty->`onPropertyChange(p,"0px")`, else `onPropertyChange(p,v)`; spread `changeProps("minWidth")`.
- `<Field label="Min H">` same pattern with `minHeight`.
- Trailing: Tooltip "Remove min size" -> `retune-split-btn` icon `<Minus />`; click sets minWidth/minHeight `"0px"` and deletes `"min"` from `sizeExtras`.

#### 4.B.3 Max size - only when `visibleSizeExtras.has("max")`
`retune-section-row` -> `retune-row`:
- `<Field label="Max W">` NumberInput `prop="maxWidth"`, value `= s.maxWidth==="none" ? "" : s.maxWidth`, `placeholder` = en-dash glyph (U+2013); onChange: empty->`"none"`, else value; spread `changeProps("maxWidth")`.
- `<Field label="Max H">` same with `maxHeight` (empty->`"none"`).
- Trailing: Tooltip "Remove max size" -> `retune-split-btn` icon `<Minus />`; click sets maxWidth/maxHeight `"none"`, deletes `"max"`.

Placeholder character for empty min/max is the en-dash glyph (Unicode U+2013), passed as the literal `placeholder` value in source.

### 4.C sizing-utils.ts (exact logic backing the Fill/Hug/Fixed modes)

`SizingMode = "fill" | "hug" | "fixed"`. `computeSizingChanges(axis, mode, ctx)` returns a map of CSS props to apply. `pxValue()` = `${round(elementRect[axis])}px` if rect present, else `"200px"`.

Branching:
- **Block / non-flex, non-grid** (`computeBlockChanges`): fill->`{[axis]:"100%"}`; hug->`{[axis]:"fit-content"}`; fixed->`{[axis]:pxValue()}`.
- **Grid child** (`computeGridChildChanges`, `selfProp = width?"justifySelf":"alignSelf"`):
  - fill->`{[axis]:"auto", [selfProp]:"stretch"}`.
  - hug->`{[axis]:"fit-content"}` plus `[selfProp]:"start"` IF current self is unset/`stretch`/`auto`/`normal`.
  - fixed->`{[axis]:pxValue()}`.
- **Flex child main axis** (`isMainAxis` = width&&!column, or height&&column) (`computeFlexMainAxisChanges`):
  - fill->`{flexGrow:"1", flexShrink:"1", flexBasis:"0px", [axis]:"auto"}`.
  - hug->`{flexGrow:"0", flexShrink:"0", flexBasis:"auto", [axis]:"auto"}`.
  - fixed->`{flexGrow:"0", flexShrink:"0"}` plus `[axis]:pxValue()` only if current axis unset/`auto`.
- **Flex child cross axis** (`computeFlexCrossAxisChanges`):
  - fill->`{[axis]:"100%"}` plus `alignSelf:"stretch"` unless current axis already `"100%"`.
  - hug->`{[axis]:"auto"}` plus `alignSelf:"flex-start"` if current alignSelf unset/`auto`/`stretch`.
  - fixed->`{}` plus `[axis]:pxValue()` only if current axis unset/`auto`/`100%`.

`canFill(axis, ctx)`: width -> always `true`. height -> `true` if flex column parent, flex row parent, OR grid child; `false` for plain block (heuristic, see lines 196-211).

`detectSizingMode(axis, ctx)` (inverse, for display):
- Non-flex & non-grid: `100%`->`"fill"`, `fit-content`->`"hug"`, else `null`.
- Grid child: if axis val `auto`/unset AND self is `stretch`/`auto`/`normal`/unset -> `"fill"`; `fit-content`->`"hug"`; else `null`.
- Flex main axis: `flexGrow>0 && flexBasis in {0px,0,0%}` -> `"fill"`; `flexGrow==="0" && basis auto/unset && axis auto/unset` -> `"hug"`; else `null`.
- Flex cross axis: axis `100%`->`"fill"`; axis auto/unset && alignSelf stretch/auto/normal/unset -> `"fill"`; axis `auto` && alignSelf in {flex-start,start,center,flex-end,end} -> `"hug"`; else `null`.

---

## Open questions / notes for the build plan
1. `FLEX_BASIS_OPTIONS` is declared in SizeSection but never rendered - likely dead/future code. Confirm whether to port.
2. Size aspect-lock icons and Size frame-mode are inline SVGs, not from the icon library - flag for the icon inventory task (#8).
3. SpacingSection imports `AlPadding*` from `../icons`, not the `spacing-icons.tsx` family. The `spacing-icons.tsx` set appears unused by these four sections - confirm whether it is referenced elsewhere before porting.
4. The Alignment row in Position depends on `AlignmentGrid` (Layout flex) and several icons; the `ConstraintsInput`, `GridPicker`, `AlignmentGrid`, `SegmentedControl`, `ComboInput`, `DropdownMenu`, `NumberInput`, `ShorthandInput`, `SelectInput` primitives are specced under tasks #2/#6/#7.
