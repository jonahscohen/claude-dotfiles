# Retune Design Panel - Shadow / Filters / Image / Scope Sections (1:1 Spec)

Source of truth (read in full):
- `packages/overlay/src/ui/sections/ShadowSection.tsx`
- `packages/overlay/src/ui/sections/FiltersSection.tsx`
- `packages/overlay/src/ui/sections/ImageSection.tsx`
- `packages/overlay/src/ui/sections/ScopeSection.tsx`
- `packages/overlay/src/ui/shadow-utils.ts`
- `packages/overlay/src/ui/filter-utils.ts`

Conventions (same as spec 03/04). All tooltips `side="top"` unless noted.

---

## 1. Shadow Section (ShadowSection.tsx)

`<Section label="Shadow" action={...}>`. Always rendered (the section); body depends on state.

Derived:
- `hasShadow = s.boxShadow && s.boxShadow !== "none"`.
- `shadowVarPropsObj = variableProps("boxShadow")`; `shadowVarMatch = shadowVarPropsObj.variableMatch`; `shadowHasVariable = !!shadowVarMatch`.

Action (flex row, `gap: 2`):
- If `!shadowHasVariable`: `<VariableAction property="boxShadow">` (token picker entry).
- If `hasShadow || shadowHasVariable` -> Tooltip "Remove shadow" `retune-section-action` icon `<Minus />` (`handleRemoveShadow`: `boxShadow="none"`); else Tooltip "Add shadow" icon `<Plus />` (`handleAddShadow`: `boxShadow = shadowToCss(defaultShadow())`).

Body, three mutually exclusive branches:

### 1.A Variable-applied (when `shadowHasVariable`)
A single `<Row>` with a `retune-prop retune-prop-variable-applied` div (`flex: 1`, `cursor: pointer`) that on click opens the token picker (`shadowPickerRef.current?.()`):
- `<ChangeIndicator isChanged={changeProps("boxShadow").isChanged} onReset={...} />`.
- A `retune-prop-input` span (`paddingLeft: 12`, `color: var(--retune-text)`) showing the token name: if `variable.className` starts with `var(--`, strip to the inner name (`slice(6, -1)`), else the raw className.
- `<VariableAction match={shadowVarMatch} property="boxShadow" ... openPickerRef={shadowPickerRef} onVariableUnlink={...} />`.

### 1.B Editable shadow (when `hasShadow`, no variable)
`shadow = parseBoxShadow(s.boxShadow)` (first layer only). If null, renders nothing. Otherwise four rows. Each field calls `handleShadowFieldChange(field, value)` which re-parses, merges the field, and writes `boxShadow = shadowToCss(updated)`:
- **Row (Color):** `<Field label="Color">` -> `<ColorInput prop="shadowColor" value={shadow.color}>`; onChange -> `handleShadowFieldChange("color", val)`; spread `changeProps("shadowColor")`.
- **Row (X offset + Y offset):**
  - `<Field label="X offset">` -> NumberInput `prop="shadowOffsetX" value={`${shadow.offsetX}px`}`; onChange -> `handleShadowFieldChange("offsetX", parseFloat(val) || 0)`; `changeProps("shadowOffsetX")`.
  - `<Field label="Y offset">` -> NumberInput `prop="shadowOffsetY" value={`${shadow.offsetY}px`}`; onChange -> `offsetY`; `changeProps("shadowOffsetY")`.
- **Row (Blur + Spread):**
  - `<Field label="Blur">` -> NumberInput `prop="shadowBlur" value={`${shadow.blur}px`} min={0}`; onChange -> `handleShadowFieldChange("blur", Math.max(0, parseFloat(val) || 0))`; `changeProps("shadowBlur")`.
  - `<Field label="Spread">` -> NumberInput `prop="shadowSpread" value={`${shadow.spread}px`}`; onChange -> `spread` (no clamp); `changeProps("shadowSpread")`.
- **Row (Type):** `<Field label="Type">` -> `<SelectInput prop="shadowInset" value={shadow.inset ? "inside" : "outside"}>` options **`["outside", "inside"]`**; onChange -> `handleShadowFieldChange("inset", val === "inside")`.

### 1.C Otherwise: `null` (no body).

### shadow-utils.ts (exact)
`ShadowValue = { inset: boolean; offsetX: number; offsetY: number; blur: number; spread: number; color: string }`.
- `parseShadow(raw)`: returns null for empty/`none`. Detects leading `inset`. Extracts color via `rgb/rgba/hsl/hsla(...)` match, else hex at start, else hex/named at end; DEFAULT color `"rgba(0, 0, 0, 1)"`. Remaining numeric tokens map to offsetX, offsetY, blur, spread (needs >= 2 numbers or returns null).
- `parseBoxShadow(raw)`: splits on top-level commas (depth-aware), parses **first layer only**.
- `shadowToCss(s)`: `[inset] {offsetX}px {offsetY}px {blur}px {spread}px {color}` (always emits all four px values).
- `defaultShadow()`: `{ inset:false, offsetX:0, offsetY:4, blur:8, spread:0, color:"rgba(0, 0, 0, 0.15)" }`.

---

## 2. Filters Section (FiltersSection.tsx)

Renders `<Section label="Filters" action={...}>` followed by an empty `<div ref={filterSectionRef} />` (scroll anchor). Only `s` and `onPropertyChange` are used from props.

State:
- `filters` (`FilterItem[]`) initialized via `parseFilters(s.filter, s.backdropFilter)`.
- Sync block watches `s.filter`/`s.backdropFilter`; re-parses unless we are the change source (`filterSelfUpdate` ref).
- `filterMenuOpen`, `filterMenuPos` for the add-filter dropdown.

Action: Tooltip "Add filter" `retune-section-action` icon `<Plus />`. On click computes position (opens below if more space below, else above; `transform: translateX(-100%)`, `zIndex: 2147483647`) and opens a `<DropdownMenu>`.

Add-filter menu options are computed from currently-used types per target:
- For each `FILTER_TYPES` not already used in `layer`, an option `value="layer:<type>"`, `label=FILTER_CONFIG[type].label`; first one gets `headingBefore: "Layer"`.
- For each not used in `backdrop`, `value="backdrop:<type>"`, label; first gets `headingBefore: "Backdrop"` (plus `separatorBefore: true` if any layer options exist).
- `showCheckmark={false}`. onSelect splits `target:type` and calls `handleAddFilter(type, target)` -> appends `defaultFilter(type, target)`, closes menu, and `requestAnimationFrame` scrolls the anchor into view (`block:"end", behavior:"smooth"`).

Body - only when `filters.length > 0`. Filters partitioned into `layerFilters` (target "layer") and `backdropFilters` (target "backdrop"):
- If any layer filters: `<Row label="Layer">` containing one `retune-row` per filter.
- If any backdrop filters: `<Row label="Backdrop">` containing one `retune-row` per filter.

Each filter row (`renderFilterRow`):
- `<SliderInput label={config.label} prop={f.id} value={String(f.value)} min={config.min} max={config.max} step={config.step} onChange={(_p, val) => handleFilterValueChange(f.id, parseFloat(val) || 0)} />`.
- Trailing (`div style={{ alignSelf: "center" }}`): Tooltip "Remove" -> `retune-split-btn` icon `<Minus />` -> `handleRemoveFilter(f.id)`.

Apply path (`applyFilters`): sets `filterSelfUpdate=true`, updates state, then `onPropertyChange("filter", css.filter)` and `onPropertyChange("backdropFilter", css.backdropFilter)` from `filtersToCss`.

### filter-utils.ts (exact)
`FilterType = "blur" | "brightness" | "contrast" | "hue-rotate" | "invert" | "saturate" | "sepia"`.
`FilterTarget = "layer" | "backdrop"`.
`FilterItem = { id: string; type: FilterType; value: number; target: FilterTarget }`.
`FILTER_TYPES` order: blur, brightness, contrast, hue-rotate, invert, saturate, sepia.

`FILTER_CONFIG` (label, unit, defaultValue, min, max, step) - exact:
| type | label | unit | default | min | max | step |
|---|---|---|---|---|---|---|
| blur | Blur | px | 4 | 0 | 50 | 1 |
| brightness | Brightness | % | 100 | 0 | 300 | 1 |
| contrast | Contrast | % | 100 | 0 | 200 | 1 |
| hue-rotate | Hue rotate | deg | 0 | 0 | 360 | 1 |
| invert | Invert | % | 0 | 0 | 100 | 1 |
| saturate | Saturate | % | 100 | 0 | 300 | 1 |
| sepia | Sepia | % | 0 | 0 | 100 | 1 |

- `parseFilters(filter, backdropFilter)`: regex `(blur|brightness|contrast|hue-rotate|invert|saturate|sepia)\(([^)]+)\)` over each string; IDs auto-generated `f<n>`.
- `filtersToCss(items)`: joins each target's items as `type(value+unit)` with spaces; empty -> `"none"`.
- `defaultFilter(type, target)`: `{ id, type, value: FILTER_CONFIG[type].defaultValue, target }`.

---

## 3. Image Section (ImageSection.tsx)

One component returning a fragment with up to two `<Section>`s. Extra props: `isImage`, `isVideo`, `hasBackgroundImage`. `isMedia = isImage || isVideo`.

### 3.1 Media Section - rendered when `isMedia`
`<Section label={isVideo ? "Video" : "Image"}>`:
- **Row (Fit + Position):**
  - `<Field label="Fit">` -> `<SelectInput prop="objectFit" value={s.objectFit || "fill"}>` options **`["fill", "contain", "cover", "none", "scale-down"]`** + variable/change props. (DEFAULT `"fill"`.)
  - `<Field label="Position">` -> `<ComboInput prop="objectPosition" value={s.objectPosition || "50% 50%"}>` (DEFAULT `"50% 50%"`) with options (value -> label): `center`->Center, `top`->Top, `bottom`->Bottom, `left`->Left, `right`->Right, `top left`->Top Left, `top right`->Top Right, `bottom left`->Bottom Left, `bottom right`->Bottom Right + variable/change props.
- **Row (Loading)** - only when `isImage && element.element`:
  - `<Field label="Loading">` -> `<SegmentedControl options={[{value:"lazy",label:"Lazy"},{value:"eager",label:"Eager"}]} value={loading === "lazy" ? "lazy" : "eager"}>`. onChange sets the element's `.loading` attribute directly and records via `onAttributeChange("loading", oldVal, v)`. (This is an HTML attribute change, not CSS.)
- **Row label="Alt"** - only when `isImage && element.element`:
  - `<TextInput prop="alt" value={element.alt || ""}>`; onChange sets `.alt` directly and `onAttributeChange("alt", oldVal, value)`.
- **Video-only rows** - when `isVideo && element.element` (two `<Row>`s, all `<SegmentedControl>`s writing HTML attributes via `onAttributeChange`):
  - Row: `<Field label="Autoplay">` options `[{value:"true",label:"Yes"},{value:"false",label:"No"}]` value from `.autoplay`; `<Field label="Loop">` Yes/No from `.loop`.
  - Row: `<Field label="Muted">` Yes/No from `.muted`; `<Field label="Controls">` options `[{value:"true",label:"Show"},{value:"false",label:"Hide"}]` from `.controls`.
  - Each sets the boolean property on the element (`v === "true"`) and records `onAttributeChange(name, oldVal, newVal)` with `"true"`/`"false"` strings.

### 3.2 Background Image Section - rendered when `hasBackgroundImage`
`<Section label="Background Image">` (three rows, each a `<Row label>` wrapping a `retune-row`):
- **Row label="Size":** `<ComboInput label="" prop="backgroundSize" value={s.backgroundSize || "auto"}>` (DEFAULT `"auto"`) options (value->label): `cover`->Cover, `contain`->Contain, `auto`->Auto, `100% 100%`->Stretch + variable/change props.
- **Row label="Position":** `<SelectInput prop="backgroundPosition" value={s.backgroundPosition || "center center"}>` (DEFAULT `"center center"`) options **`["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"]`** + variable/change props.
- **Row label="Repeat":** `<SelectInput prop="backgroundRepeat" value={s.backgroundRepeat || "repeat"}>` (DEFAULT `"repeat"`) options **`["no-repeat", "repeat", "repeat-x", "repeat-y", "space", "round"]`** + variable/change props.

> Note: `hasBackgroundImage` is "non-gradient background-image present" (computed by the parent), so this section coexists with, but is distinct from, the gradient Fill section in FillSection.

---

## 4. Scope Section (ScopeSection.tsx)

`<Section label={element.reactComponents?.[0] ? "Scope" : element.tagName.toLowerCase()}>`. The section title is **"Scope"** when the element maps to a React component, otherwise the lowercased tag name (e.g. "div", "button"). Props: `element`, `scopeLevels`, `activeLevelIndex`, `onScopeLevelChange?`, `onScopeLevelHover?`, `forcedState?`, `onForcedStateChange?`.

`ScopeLevel = { label: string; selector: string | null; count: number; kind?: string }`.
`ForcedState = ":hover" | ":focus" | ":active" | null`.

### 4.1 Target row - only when `scopeLevels.length > 1 && onScopeLevelChange`
`<Row label="Target">` containing `<div className="retune-selector-field">`. For each level (index order):
- A `<button className="retune-selector-tag">` with modifiers: `+ " active"` when `index === activeLevelIndex`; `+ " included"` when `index < activeLevelIndex && !activeIsElementLevel`. Carries `data-level-index`.
- `isElementLevel = level.selector === null` ("This element"). When element-level AND `scopeLevels.length > 1`, a `<span className="retune-selector-divider" />` is rendered BEFORE the button.
- Tag name span `retune-selector-tag-name`: if `level.label.length > 24`, middle-truncated to 24 chars (`middleTruncate`, ellipsis U+2026, start ~40% / end ~60% of budget) wrapped in a Tooltip (`side="bottom" delay={300}`) of the full label; else the raw label.
- If `level.count > 1`: a `retune-selector-tag-count` span showing `level.count`, wrapped in Tooltip `"<count> elements match this selector"` (`side="bottom" delay={300}`).
- Click -> `onScopeLevelChange(index)`; pointer enter/leave -> `onScopeLevelHover(index)` / `(null)`.
- A `<span className="retune-selector-bridge filled" />` is rendered after a button when `bridgeVisible.has(index)`.

**Bridge animation** (between adjacent included levels):
- `computeBridgesForLevel(level)`: empty set if active level is element-level (`selector===null`); otherwise bridges connect consecutive non-null-selector levels up to the active level.
- On `activeLevelIndex` change, a 320ms animation (`cubic-bezier(0.77, 0, 0.175, 1)`, `EXTEND=6px`) animates each affected pill's `box-shadow` + `border-radius` to visually merge/split. Pill colors are frozen to pre-change appearance (captured each paint into `pillColorsRef`), then unfrozen at the midpoint (`DURATION/2`) when bridges update. `R="8px"`, `Z="0px"` are the radius endpoints. Cleanup cancels the midpoint timeout on rapid re-change.

### 4.2 Trigger row - only when `onForcedStateChange`
`<Row label="Trigger">` -> `retune-row` -> `<SelectInput prop="__state">` options **`["None", "Hover", "Focus", "Active"]`**. Displayed value maps `forcedState` via `{ ":hover":"Hover", ":focus":"Focus", ":active":"Active" }` (default "None"). onChange maps label back: `{ None:null, Hover:":hover", Focus:":focus", Active:":active" }` and calls `onForcedStateChange(...)`.

---

## Open questions / notes for the build plan
1. Shadow editing supports **only the first box-shadow layer**; multi-layer shadows are flattened to the first on edit. Confirm whether Justify needs multi-layer support.
2. Filters menu hides already-used filter types per target, so each type appears at most once per layer/backdrop. Adding a used type is impossible until it is removed.
3. Image/Video controls write **HTML attributes** (loading, alt, autoplay, loop, muted, controls) directly on the element via `onAttributeChange`, not CSS. This needs an attribute-change path in the engine (task #9), distinct from `onPropertyChange`.
4. Scope section is structural/navigation (selection model), tightly coupled to the selection + Design-entry work (task #10); `scopeLevels`, `activeLevelIndex`, `forcedState` all originate there.
5. The bridge animation uses the Web Animations API (`element.animate`) and `getComputedStyle` snapshotting for pill colors. Faithful port requires replicating the freeze/unfreeze + midpoint-swap timing.
6. `SliderInput`, `DropdownMenu`, `ComboInput`, `SelectInput`, `ColorInput`, `TextInput`, `SegmentedControl`, `VariableAction`, `ChangeIndicator`, `Tooltip` primitives are specced under tasks #2/#6/#7.
