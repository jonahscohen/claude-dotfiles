# Retune Design Panel - Typography / Fill / Border Sections (1:1 Spec)

Source of truth (read in full):
- `packages/overlay/src/ui/sections/TypographySection.tsx`
- `packages/overlay/src/ui/sections/FillSection.tsx`
- `packages/overlay/src/ui/sections/BorderSection.tsx`
- `packages/overlay/src/ui/font-input.tsx`
- (supporting) `packages/overlay/src/ui/truncation-utils.ts` (used by Typography)

Conventions (same as spec 03): `<Section>` / `<Row label?>` / `<Field label>` containers; `s` = `element.computedStyles`; `onPropertyChange(prop, value)`; `changeProps`/`variableProps` spreads; `retune-row` is the raw flex layout row.

---

## 1. Typography Section

`<Section label="Typography">`. **Gated: returns `null` entirely if `!isText`.** (`isText` is a derived prop from PropertyPanel.)

Internal state: `typoExpanded` (`useState(false)`, DEFAULT collapsed).

### Constants (exact, in order)

`TEXT_ALIGN_OPTIONS` (SegmentedControl):
1. `{ value: "left", icon: <TextAlignLeft />, label: "Left" }`
2. `{ value: "center", icon: <TextAlignCenter />, label: "Center" }`
3. `{ value: "right", icon: <TextAlignRight />, label: "Right" }`

`VERTICAL_ALIGN_OPTIONS` (SegmentedControl):
1. `{ value: "top", icon: <TextAlignTop />, label: "Top" }`
2. `{ value: "middle", icon: <TextAlignMiddle />, label: "Middle" }`
3. `{ value: "bottom", icon: <TextAlignBottom />, label: "Bottom" }`

`FONT_WEIGHT_OPTIONS` (ComboInput) - value -> label:
- `"100"` Thin, `"200"` Extra Light, `"300"` Light, `"400"` Regular, `"500"` Medium, `"600"` Semibold, `"700"` Bold, `"800"` Extra Bold, `"900"` Black.

`LINE_HEIGHT_OPTIONS` (ComboInput):
- `"normal"` Normal, `"1"` 1, `"1.25"` 1.25, `"1.5"` 1.5, `"1.75"` 1.75, `"2"` 2.

`LETTER_SPACING_OPTIONS` (ComboInput):
- `"normal"` Normal, `"-0.05em"` Tight, `"0.05em"` Wide, `"0.1em"` Wider.

`LIST_STYLE_OPTIONS` (SegmentedControl):
1. `{ value: "none", icon: <Minus />, label: "None" }`
2. `{ value: "disc", icon: <ListView />, label: "Bullet" }`
3. `{ value: "decimal", icon: <NumberList />, label: "Numbered" }`

### Helper mappers
- `mapTextAlign(v)`: undefined->`"left"`; `start`->`"left"`; `end`->`"right"`; else passthrough (`left`/`center`/`right`/`justify`).
- `mapVerticalAlign(v)`: undefined->`"top"`; `middle`|`center`->`"middle"`; `bottom`|`text-bottom`|`sub`->`"bottom"`; `top`|`baseline`|`text-top`|`super`->`"top"`; fallback `"top"`.

### Control order (top to bottom)

#### 1.1 Font (always)
`<Row><Field label="Font">` -> `<FontInput prop="fontFamily" value={s.fontFamily}>`, spread `changeProps("fontFamily")`. (FontInput detail in section 1.7 below.)

#### 1.2 Size + Weight (always)
`<Row>`:
- `<Field label="Size">` -> `<NumberInput prop="fontSize" value={s.fontSize} min={1}>`, spread `variableProps("fontSize")` + `changeProps("fontSize")`.
- `<Field label="Weight">` -> `<ComboInput prop="fontWeight" value={s.fontWeight} options={FONT_WEIGHT_OPTIONS}>`, spread `variableProps("fontWeight")` + `changeProps("fontWeight")`.

#### 1.3 Line height + Letter spacing (always)
`<Row>`:
- `<Field label="Line height">` -> `<ComboInput prop="lineHeight" value={s.lineHeight} options={LINE_HEIGHT_OPTIONS}>` + variable/change props.
- `<Field label="Letter spacing">` -> `<ComboInput prop="letterSpacing" value={s.letterSpacing} options={LETTER_SPACING_OPTIONS}>` + variable/change props.

#### 1.4 Color (always)
`<Row><Field label="Color">` -> `<ColorInput prop="color" value={s.color}>` + variable/change props.

#### 1.5 Align + Vertical + expand toggle (always)
`<Row>`:
- `<Field label="Align">` -> `<SegmentedControl options={TEXT_ALIGN_OPTIONS} value={mapTextAlign(s.textAlign)} onChange={v => onPropertyChange("textAlign", v)} />`.
- `<Field label="Vertical">` -> `<SegmentedControl options={VERTICAL_ALIGN_OPTIONS} value={mapVerticalAlign(s.verticalAlign)} onChange={v => onPropertyChange("verticalAlign", v)} disabled={!hasVerticalAlign} />`. (Disabled when `hasVerticalAlign` is false.)
- Trailing (in a `div style={{ alignSelf: "flex-end" }}`): Tooltip `typoExpanded ? "Show less" : "More options"` -> `retune-split-btn` (+ ` active` when expanded), icon `<AdjustSmall />`, toggles `typoExpanded`.

#### 1.6 Expanded options - only when `typoExpanded`
Four blocks:

**Row (Style + Decoration):**
- `<Field label="Style">` -> `<SelectInput prop="fontStyle" value={s.fontStyle}>` options **`["normal", "italic", "oblique"]`**.
- `<Field label="Decoration">` -> `<SelectInput prop="textDecoration" value={s.textDecoration}>` options **`["none", "underline", "line-through", "overline"]`**.

**Row (Transform + White space):**
- `<Field label="Transform">` -> `<SelectInput prop="textTransform" value={s.textTransform}>` options **`["none", "uppercase", "lowercase", "capitalize"]`**.
- `<Field label="White space">` -> `<SelectInput prop="whiteSpace" value={s.whiteSpace}>` options **`["normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"]`**.

**Row (Truncate + Max lines)** - computed via `detectTruncation(s)`:
- `<Field label="Truncate">` -> `<SelectInput prop="truncate" value={truncation.enabled ? "ellipsis" : "none"}>` options **`["none", "ellipsis"]`**. onChange: `enabled = val==="ellipsis"`, applies `computeTruncationChanges({enabled, lines:1}, {currentDisplay: s.display})` (iterating `onPropertyChange` over each), then `fixAncestorMinWidth(enabled)`.
- `<Field label="Max lines">` shown **only when `truncation.enabled`** -> `<NumberInput prop="lineClamp" value={String(truncation.lines)}>`; onChange: `n = parseInt(val) || 1`, applies `computeTruncationChanges({enabled:true, lines:n}, ctx)`; spread `changeProps("lineClamp")`.

`fixAncestorMinWidth(enabled)`: walks ancestors up to `document.body`; for each whose parent is grid/flex (`getComputedStyle(parent).display` includes "grid" or "flex"), calls `onApplyToElement(el, "minWidth", enabled ? "0px" : "")`. No-op if `onApplyToElement` missing.

**Row (Word break + List style):**
- `<Field label="Word break">` -> `<SelectInput prop="overflowWrap" value={s.overflowWrap}>` options **`["normal", "break-word", "anywhere"]`**.
- `<Field label="List style">` shown **only when `element.tagName` is one of `["UL", "OL", "LI"]`** -> `<SegmentedControl options={LIST_STYLE_OPTIONS} value={s.listStyleType || "none"} onChange={val => onPropertyChange("listStyleType", val)} />`.

### 1.7 FontInput (font-input.tsx)
A trigger button + a floating font picker (`FloatingDialog` rendered through a portal into the shadow-DOM container `[data-retune-container]`).

Trigger:
- `<div className="retune-font-input">` wrapping a `<ChangeIndicator isChanged onReset />` and a `<button className="retune-font-input-trigger">`.
- Button shows `<span className="retune-font-input-value" style={{ fontFamily: primaryFont || undefined }}>` with text `primaryFont || "(en-dash placeholder, U+2013)"` (source uses the en-dash glyph when empty), then `<ChevronDown />`.
- `primaryFont = extractPrimaryFont(value)` = first comma-segment of the font-family stack, stripped of surrounding quotes.

Picker (`FloatingDialog title="Fonts"`, `maxHeight={400} minHeight={400}`, anchored to the closest `.retune-row` rect):
- Search input placeholder `"Search fonts..."` with keyboard nav (ArrowUp/Down wraps, Enter selects highlighted).
- Category filter (`retune-font-filter`): `<SelectInput prop="__fontCategory" value={fontCategory}>` options **`["all", "project", "system", "generic"]`** (DEFAULT `"all"`).
- List (`retune-font-list`) with section titles `retune-font-section-title`:
  - **"Project fonts"** - from `getProjectFonts()` (scans stylesheets for `font-family` declarations, excludes `var(...)` and fallbacks; cached 10s).
  - **"System fonts"** - from Local Font Access API (`queryLocalFonts()`); deduplicated against project fonts (case-insensitive).
  - **"Generic"** - `FALLBACK_FONTS` = exact `["system-ui", "sans-serif", "serif", "monospace"]`.
  - Each item `retune-font-item` (+ ` retune-font-item-active` when matches `primaryFont`, + ` retune-font-item-highlighted` when keyboard-highlighted), `style={{ fontFamily: font }}`, carries `data-font-name` + `data-font-index`.
  - Empty state: `<div className="retune-font-empty">No fonts found</div>`.
  - System-fonts prompt (when category all/system): if `systemFonts === null` -> button `retune-font-system-btn` text **"Load system fonts"** (`data-font-name="__load_system"`); if permission denied -> `<p className="retune-font-denied">Font access denied. Allow in site settings to try again.</p>`.
- Selecting a font: `onChange(prop, fontName)` (sets the bare family name, not a full stack) and closes.
- Uses `claimDialog`/`releaseDialog` singleton so only one floating dialog is open at a time. Click handling is native `pointerdown` on the list (Shadow-DOM compatible).

---

## 2. Fill Section (FillSection.tsx)

This file renders **multiple sections** conditionally. It is one component returning a fragment with up to four `<Section>`s depending on element kind. Extra props beyond `BaseSectionProps`: `isSvgChild`, `isMedia`, `getVariableMatch`, `onVariableAssociate?`, `onPropertyReset?`.

### 2.1 Appearance Section - rendered when `!isSvgChild`
`<Section label="Appearance">`:
- **Row (Opacity + Z index):**
  - `<Field label="Opacity">` -> `<NumberInput prop="opacity" value={s.opacity} min={0} max={1} step={0.01}>` + variable/change props.
  - `<Field label="Z index">` -> `<NumberInput prop="zIndex" value={s.zIndex}>` + change props (no min/max).
- **Row label="Corner radius"** - collapsed/expanded via `radiusExpanded` (`useState(false)`):
  - **Collapsed:** one `retune-row`:
    - `<ShorthandInput>` label Tooltip "Corner radius (TL, TR, BR, BL)" + `<RadiusTopLeft />`; `props={["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"]}` (note order TL, TR, BR, BL), matching `values`, `min={0}` + shorthand variable/change props.
    - Trailing Tooltip "Edit individual corners" -> `retune-split-btn` expand, icon `<AlPaddingSides />`.
  - **Expanded:** two `retune-row`s:
    - Row A: NumberInput Tooltip "Top left corner radius" + `<RadiusTopLeft />` prop `borderTopLeftRadius` min0; NumberInput Tooltip "Top right corner radius" + `<RadiusTopRight />` prop `borderTopRightRadius` min0; Tooltip "Collapse to single" -> `retune-split-btn active` icon `<AlPaddingSides />`.
    - Row B: NumberInput Tooltip "Bottom left corner radius" + `<RadiusBottomLeft />` prop `borderBottomLeftRadius` min0; NumberInput Tooltip "Bottom right corner radius" + `<RadiusBottomRight />` prop `borderBottomRightRadius` min0; spacer `<div style={{ width: 32 }} />`.
  - All radius tooltips `side="top" sideOffset={14}`.
- **Row (Overflow):** `<Field label="Overflow">` -> `<SelectInput prop="overflow" value={s.overflow}>` options **`["visible", "hidden", "auto", "scroll"]`**.

### 2.2 SVG Fill Section - rendered when `isSvgChild`
`<Section label="Fill" action={...}>`:
- `hasSvgFill = s.fill && s.fill !== "none" && s.fill !== "transparent"`.
- Action: if `hasSvgFill` -> Tooltip "Remove fill" `retune-section-action` icon `<Minus />` (sets `fill="none"`); else Tooltip "Add fill" icon `<Plus />` (sets `fill="#000000"`).
- Body: only when `hasSvgFill` -> `<Row label="Color">` -> `retune-row` -> `<ColorInput prop="fill" value={s.fill}>` + variable/change props.

### 2.3 SVG Stroke Section - rendered when `isSvgChild`
`<Section label="Stroke" action={...}>`:
- `hasStrokeColor = s.stroke && s.stroke !== "none" && s.stroke !== "transparent"`.
- Action: if `hasStrokeColor` -> Tooltip "Remove stroke" icon `<Minus />` (sets `stroke="none"`); else `null` (no add button).
- **Row label="Color"** (always rendered in this section): `<ColorInput prop="stroke" value={hasStrokeColor ? s.stroke : "transparent"}>`; onChange sets stroke and, if `strokeWidth` is empty/`"0"`, also sets `strokeWidth="1"`.
- **Row label="Width"**: `<NumberInput label="" prop="strokeWidth" value={s.strokeWidth || "0"} min={0} step={0.5}>` + variable/change props.

### 2.4 Fill (background) Section - rendered when `!isMedia && !isSvgChild`
`<Section label="Fill" gap={8} action={...}>`:

Derived:
- `detectedFillMode = detectFillMode(s.backgroundColor, s.backgroundImage)`; `fillMode` state initialized to it.
- `hasFill`: true if `backgroundImage` set and != "none"; false if bg empty/`transparent`/`rgba(0, 0, 0, 0)`; else true.
- `fillVarMatch = getVariableMatch("backgroundColor")`, `fillHasVariable = !!fillVarMatch`.
- Gradient state (`gradient`, `initialGradient`, `initialFillMode`) parsed from `backgroundImage` via `parseCssGradient`, default via `defaultGradient()`. A sync block watches `s.backgroundImage` changes and re-detects mode unless we are the editing source (`gradientEditingRef`).

Action (a flex row, `gap: 2`):
- If `!fillHasVariable`: a `<VariableAction property="backgroundColor">` (token picker entry).
- If `hasFill || fillHasVariable` -> Tooltip "Remove fill" `retune-section-action` icon `<Minus />` (`handleRemoveFill`: bg `transparent`, bgImage `none`, fillMode `solid`); else Tooltip "Add fill" icon `<Plus />` (`handleAddFill`: bg `#ffffff`).

Body - only when `hasFill || fillHasVariable`:
- **Row (fill mode):** `<SelectInput prop="fillMode" value={fillMode==="solid" ? "solid" : gradient.type}>` options **`["solid", "linear", "radial", "conic"]`**; `isChanged={changeProps("backgroundImage").isChanged}`, `onReset` resets both `backgroundImage` and `backgroundColor`. onChange = `handleFillModeChange`: solid -> bgImage `none`, bg `#ffffff`; gradient -> set gradient type, `backgroundImage = gradientToCss(newGradient)`, bg `transparent`.
- If `fillMode === "solid"`: `<Row>` -> `<ColorInput prop="backgroundColor" value={s.backgroundColor}>` + variable/change props.
- Else (gradient): `<GradientEditor gradient={gradient} onChange={handleGradientChange} originalGradient={initialGradient ?? undefined} isNewGradient={initialFillMode === "solid"} />`. (GradientEditor specced under task #7.)

> Note: `handleVariableSelect`/`handleVariableApply` from BaseSectionProps wire the token picker. `gradient-utils` (`FillMode`, `GradientFill`, `detectFillMode`, `defaultGradient`, `parseCssGradient`, `gradientToCss`) is shared with the color/gradient task (#7).

---

## 3. Border Section (BorderSection.tsx)

`<Section label="Border" action={...}>`. Always rendered (the section), but body only when `hasBorder`.

Derived:
- `borderSides` = array of `{width, style}` for top/right/bottom/left (from `s.border<Side>Width` / `s.border<Side>Style`).
- `hasBorder = borderSides.some(side => side.style !== "none" && parseFloat(side.width) > 0)`.
- `borderColors` = `[s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor]`.
- `activeBorderColor` = first side color where that side has a visible border, falling back to `s.borderTopColor`.
- `borderExpanded` (`useState(false)`).

Action: if `hasBorder` -> Tooltip "Remove border" `retune-section-action` icon `<Minus />` (`handleRemoveBorder`: all four `border<Side>Width="0px"` and `border<Side>Style="none"`); else Tooltip "Add border" icon `<Plus />` (`handleAddBorder`: `borderWidth="1px"`, `borderStyle="solid"`, `borderColor="#000000"`).

Body (only when `hasBorder`):
- **Row (Color):** `<Field label="Color">` -> `<ColorInput prop="borderColor" value={activeBorderColor}>` + variable/change props.
- **Width** - collapsed/expanded by `borderExpanded`:
  - **Collapsed:** `<Row label="Width">` -> `retune-row`:
    - `<ShorthandInput props={["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"]} values={[...]} min={0}>` + shorthand variable/change props (no label icon here).
    - Trailing Tooltip "Edit individual sides" -> `retune-split-btn` expand, icon `<AlPaddingSides />`.
  - **Expanded:** two `retune-section-row` blocks each holding a `retune-row`:
    - Block A: `<Field label="Top">` NumberInput `borderTopWidth` min0; `<Field label="Right">` NumberInput `borderRightWidth` min0; Tooltip "Collapse to shorthand" -> `retune-split-btn active` icon `<AlPaddingSides />`. Each width onChange: applies the value AND if `parseFloat(v) > 0 && s.border<Side>Style === "none"` also sets `border<Side>Style="solid"`.
    - Block B: `<Field label="Bottom">` NumberInput `borderBottomWidth` min0; `<Field label="Left">` NumberInput `borderLeftWidth` min0 (same auto-solid behavior). No trailing split button in block B.
- **Row (Style):** `<Field label="Style">` -> `<SelectInput prop="borderStyle">` options **`["solid", "dashed", "dotted", "double", "groove", "ridge"]`**; displayed value is the first non-`none` of top/right/bottom/left style (in that order).

---

## Open questions / notes for the build plan
1. FillSection renders four possible sections from one component, mutually gated by `isSvgChild` / `isMedia`. Confirm the parent (PropertyPanel) is the single source of `isSvgChild`/`isMedia`/`isText`/`hasVerticalAlign` flags (these come from selection/inspector, task #9/#10).
2. Typography's empty-state font label and FontInput trigger placeholder both use the en-dash glyph (U+2013) when no value. Port verbatim.
3. Corner-radius ShorthandInput order is TL, TR, BR, BL (clockwise), NOT TL, TR, BL, BR. Easy to get wrong.
4. `GradientEditor`, `ColorInput`, `VariableAction`, `ComboInput`, `SegmentedControl`, `SelectInput`, `ShorthandInput`, `NumberInput`, `FloatingDialog`, `ChangeIndicator` primitives are specced under tasks #2/#6/#7. `gradient-utils` and `truncation-utils` are shared utilities.
5. Border style select only exposes a single shared style; per-side style is set implicitly (auto-solid) when widening a side from 0. No per-side style picker exists.
