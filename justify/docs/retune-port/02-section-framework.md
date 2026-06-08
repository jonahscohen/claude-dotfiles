# 02 - Section Framework (EXACT spec)

Source of truth (read in full):
- `packages/overlay/src/ui/section.tsx` - the generic Section / Row / Field / RowAction primitives
- `packages/overlay/src/ui/sections/section-props.ts` - the shared props contract every section receives
- `packages/overlay/src/ui/ComponentSection.tsx` - the React-component props/state section (uses the same `Section` wrapper, a 2-col grid body)
- `packages/overlay/src/overlay/PropertyPanel.tsx` - the section-composition orchestrator (return at line 278)
- CSS for all of this: `packages/overlay/src/overlay/overlay.css` lines 819-907 (section), 844-878 (header actions), 1176-1227 (rows/fields/labels), 1229-1255 (row actions), 2670-2709 (variable-action hover behavior)

---

## 1. The generic Section wrapper (`section.tsx`)

### `Section` (lines 12-26)
```tsx
export function Section({ label, gap, action, children }:
  { label: string; gap?: number; action?: ReactNode; children?: ReactNode }) {
  return (
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
  );
}
```
- Structure: `.retune-section` > `.retune-section-header` (title span + optional `action` node) + `.retune-section-body` (children).
- `action` is an arbitrary ReactNode rendered at the right of the header (used for +/- add/remove buttons, the VariableAction "add token" hexagon, the Size lock dropdown, the source-file label on ComponentSection).
- `gap` overrides the body's default 12px vertical gap inline. Body is omitted entirely when no children.
- There is NO collapse/chevron in this codebase. The header has a label + action only. (Sections are shown/hidden conditionally by PropertyPanel, not collapsed in place.) The "collapse chevron" mentioned in the task brief does not exist on these generic Sections; the only chevrons are the tree-arrow in ElementTree and select/combo chevrons.

### `Row` (lines 28-44)
```tsx
export function Row({ label, children }: { label?: string; children: ReactNode }) {
  if (label) {
    return (
      <div className="retune-row-group">
        <div className="retune-group-label-inline">{label}</div>
        {children}
      </div>
    );
  }
  return (
    <div className="retune-section-row">
      <div className="retune-row">{children}</div>
    </div>
  );
}
```
- Two shapes:
  - With `label`: `.retune-row-group` (column, gap 4px) with a `.retune-group-label-inline` heading on top, children stacked below.
  - Without `label`: `.retune-section-row` (horizontal padding wrapper) wrapping a `.retune-row` (flex, align-items flex-end, gap 8px) for side-by-side fields.

### `Field` (lines 46-53)
```tsx
export function Field({ label, children }) {
  return (
    <div className="retune-field">
      <span className="retune-field-label">{label}</span>
      {children}
    </div>
  );
}
```
- Label-above-input pair. `.retune-field` = flex column, gap 4px, flex:1. Used inside a `.retune-row` so multiple Fields sit side by side with equal width.

### `RowAction` (lines 55-61)
```tsx
export function RowAction({ onClick, active, children }) {
  return (
    <button className={`retune-row-action${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
```
- 32x32 trailing button on the right edge of a row (expand/collapse a sub-control, open a dialog, toggle a mode).

### Deprecated aliases (lines 63-71)
- `RowGroup = Row` (alias).
- `GroupLabel({children})` renders `.retune-group-label` (use `Row label` instead).

---

## 2. Section CSS (overlay.css)

### `.retune-section` (819-827)
```css
.retune-section { border-bottom: 1px solid var(--retune-border); user-select: none; }
.retune-section:last-child { border-bottom: none; }
.retune-section:has(+ :not(.retune-section)) { border-bottom: none; }
```
- Sections separated by a 1px bottom border. Last section (or a section followed by a non-section, e.g. a scroll anchor) drops its border.

### `.retune-section-header` (829-835) + title (837-842)
```css
.retune-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 8px 0 16px; height: 44px;
}
.retune-section-title { font-size: 12px; font-weight: 500; line-height: 20px; color: var(--retune-text); }
```
- **Header height: 44px.** Padding: 16px left, 8px right (so the 32px action button sits flush-ish to the right edge). Title 12px/500.

### `.retune-section-action` (844-860) - the +/- add/remove header button
```css
.retune-section-action {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px;
  background: transparent; color: var(--retune-text); cursor: pointer; padding: 0;
}
.retune-section-action:hover { background: var(--retune-surface-hover); color: var(--retune-text); }
```
- 32x32, radius 8px, transparent. **Always visible** (no hover-gating). This is the + (add) / - (remove) button on Shadow, Border, Fill, Stroke, Filters, plus the Size lock dropdown trigger.

### Variable-action inside the header (862-878) - the hover-revealed "add token" button
```css
.retune-section-header .retune-variable-action {
  position: static; width: 32px; height: 32px; border-radius: 8px;
  background: transparent; color: transparent; transition: color 0.15s ease;
}
.retune-section:hover .retune-section-header .retune-variable-action { color: var(--retune-text-secondary); }
.retune-section-header .retune-variable-action:hover { color: var(--retune-text) !important; background: var(--retune-surface-hover); }
```
- This is the **show-on-hover** behavior the brief calls "+ add button hover show/hide": the VariableAction (hexagon "apply token" icon) is `color: transparent` at rest and only becomes visible (`--retune-text-secondary`) when the whole `.retune-section` is hovered, then full `--retune-text` on its own hover. (The plain `.retune-section-action` +/- buttons are always visible; only the token/variable action is hover-revealed.)

### `.retune-section-body` (880-885)
```css
.retune-section-body { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; }
```
- **Vertical gap between rows: 12px. Bottom padding: 16px.** No top padding (header provides the spacing).

### Rows (887-907)
```css
.retune-section-row { padding: 0 48px 0 16px; }
.retune-section-row:has(.retune-split-btn),
.retune-section-row:has(.retune-row-action) { padding-right: 8px; }

.retune-row-group { display: flex; flex-direction: column; gap: 4px; padding: 0 48px 0 16px; }
.retune-row-group:has(.retune-split-btn),
.retune-row-group:has(.retune-row-action) { padding-right: 8px; }
.retune-row-group > .retune-row + .retune-row { margin-top: 4px; }
```
- **Default row horizontal padding: 16px left, 48px right.** The 48px right gutter reserves space so controls align to a column; when a row has a trailing action/split button the right padding shrinks to 8px (so the 32px button reaches the edge).
- Row-group inner gap 4px; consecutive rows inside a group get an extra 4px top margin.

### `.retune-row` (1176-1188)
```css
.retune-row { display: flex; align-items: flex-end; gap: 8px; }
.retune-row > .retune-prop,
.retune-row > .retune-combo,
.retune-row > .retune-select,
.retune-row > .retune-text-input,
.retune-row > .retune-font-input,
.retune-row > .retune-slider { flex: 1; min-width: 0; }
```
- Flex row, **gap 8px**, bottom-aligned (so label-above-input Fields line up on the input baseline). Direct control children flex equally.

### Field + labels (1191-1227)
```css
.retune-field { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.retune-field-label { font-size: 11px; font-weight: 400; letter-spacing: -0.005em;
  color: var(--retune-text-tertiary); line-height: 16px; }
.retune-group-label { /* same type */ padding: 0 16px; }
.retune-group-label-inline { /* same type */ display: flex; align-items: center; justify-content: space-between; }
```
- All field/group labels: **11px / weight 400 / color --retune-text-tertiary / line-height 16px**, gap 4px above their input. `group-label` has 16px horizontal padding (it lives outside a padded row); `group-label-inline` is space-between (label left, optional control right) and inherits the row-group padding.

### Row action buttons (1229-1255)
```css
.retune-row-action, .retune-split-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px;
  background: transparent; color: var(--retune-text); cursor: pointer; padding: 0; flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.retune-row-action:hover, .retune-split-btn:hover { background: var(--retune-surface-active); color: var(--retune-text); }
.retune-row-action.active, .retune-split-btn.active { color: var(--retune-text); background: var(--retune-input-bg-hover); }
```

### Selector field special-case (467-475) - the Scope pills row spans full width
```css
.retune-row-group:has(.retune-selector-field) { padding-left: 0; padding-right: 0; }
.retune-row-group:has(.retune-selector-field) > .retune-group-label-inline { padding-left: 16px; }
```

---

## 3. The `+` add button pattern (concrete example: ShadowSection)

`ui/sections/ShadowSection.tsx` lines 53-71 - canonical add/remove header action:
```tsx
<Section
  label="Shadow"
  action={
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {!shadowHasVariable && (
        <VariableAction property="boxShadow"
          onVariableSelect={handleVariableSelect}
          onVariableApply={(v, props) => handleVariableApply(v, props)} />
      )}
      {hasShadow || shadowHasVariable ? (
        <Tooltip content="Remove shadow" side="top">
          <button className="retune-section-action" onClick={handleRemoveShadow}><Minus /></button>
        </Tooltip>
      ) : (
        <Tooltip content="Add shadow" side="top">
          <button className="retune-section-action" onClick={handleAddShadow}><Plus /></button>
        </Tooltip>
      )}
    </div>
  }
>
  ...body...
</Section>
```
- Header `action` = a flex row (gap 2px) of: optional hover-revealed `<VariableAction>` (the token hexagon) + a single toggle button that is **Add (`<Plus/>`)** when the property is unset and **Remove (`<Minus/>`)** when set. Icons `Plus`/`Minus` come from `../icons`. Each wrapped in a `<Tooltip side="top">`.
- Add sets a default (`handleAddShadow` -> `shadowToCss(defaultShadow())`); Remove sets `"none"`.
- This exact pattern repeats in BorderSection (Add/Remove border), FillSection (Add/Remove fill, Add/Remove stroke, SVG fill), FiltersSection, ImageSection. SizeSection uses `.retune-section-action` for a lock/aspect dropdown trigger instead.

---

## 4. The shared section props contract (`section-props.ts`)

```ts
export type ForcedState = ":hover" | ":focus" | ":active" | null;
export type SelectorCandidate = { selector: string; count: number; verdict: "semantic" | "utility" | "ambiguous" };
export type ScopeLevel = { label: string; selector: string | null; count: number; kind?: string };
export type StyleSource = { selector: string; value: string };

interface BaseSectionProps {
  element: InspectedElement;
  s: Record<string, string>;                 // computed styles (== element.computedStyles)
  onPropertyChange: (property: string, value: string) => void;
  onAttributeChange?: (attr, oldValue, newValue) => void;
  onPropertyHover?: (property: BoxModelProperty) => void;
  onApplyToElement?: (element, property, value) => void;
  // variable/token helpers
  variableProps: (camelProp: string) => Record<string, any>;
  shorthandVariableProps: (camelProps: string[]) => Record<string, any>;
  changeProps: (camelProp: string) => { isChanged: boolean; onReset: () => void };
  shorthandChangeProps: (camelProps: string[]) => { isChanged: boolean; onReset: () => void };
  handleVariableSelect: (oldToken, newToken, fallbackProperties?) => void;
  handleVariableApply: (newToken, properties) => void;
  // derived layout context
  isFlexChild: boolean;
  isGridChild: boolean;
  parentFlexDir: string;
}
```
- Section-specific extensions: `ScopeSectionProps` (scopeLevels/activeLevelIndex/forcedState + handlers, NOT extending BaseSectionProps), `PositionSectionProps` (+ onPinLinesChange), `SizeSectionProps` (+ frameDimensions), `TypographySectionProps` (+ isText, hasVerticalAlign).
- PropertyPanel builds one `baseProps` object (PropertyPanel.tsx 260-276) and spreads it into each section.

---

## 5. Section composition order (PropertyPanel.tsx return, lines 278-378)

Sections render in this exact order inside the Design tab (each wrapped in conditional logic):

1. **ScopeSection** - hidden when `frameDimensions` is set (frame/body selection). Gets scopeLevels/forcedState.
2. **PositionSection** - hidden when `isSvgChild`. Gets `onPinLinesChange`.
3. **LayoutSection** - hidden when `isSvgChild`.
4. **SpacingSection** - always. (Note: receives a trimmed prop set - `s`, `onPropertyChange`, `onPropertyHover`, variable/change helpers - NOT the full baseProps.)
5. **SizeSection** - always. Gets `frameDimensions`.
6. **TypographySection** - hidden when `isSvgChild`; returns null internally when `!isText`. Gets `isText`, `hasVerticalAlign`.
7. **FillSection** - always. Gets `isSvgChild`, `isMedia`, `getVariableMatch`, `onVariableAssociate`, `onPropertyReset`. (Renders "Appearance" / "Fill" / SVG "Fill"+"Stroke" variants internally.)
8. **ImageSection** - only when `isImage || isVideo || hasBackgroundImage`. Rendered AFTER Appearance, BEFORE Border. Gets `isImage`, `isVideo`, `hasBackgroundImage`.
9. **BorderSection** - hidden when `isSvgChild` (SVG uses Stroke in FillSection). Trimmed prop set like Spacing.
10. **ShadowSection** - always.
11. **FiltersSection** - hidden when `isSvgChild`.

Derived booleans that gate the above (PropertyPanel.tsx 226-257):
- `isText` = tag in TEXT_TAGS (`P,H1-H6,SPAN,A,BUTTON,LABEL,LI,TD,TH,FIGCAPTION,BLOCKQUOTE,CITE,EM,STRONG,SMALL`) OR has a direct non-empty text child node.
- `isFlex`/`isGrid` from `display`; `positionType`/`isPositioned`/`showOffsets`/`isSticky` from `position`.
- `hasVerticalAlign` = isText OR tag in `IMG,INPUT,SELECT,TEXTAREA` OR isFlex/isGrid.
- `isImage` = `IMG|PICTURE|CANVAS`; `isVideo` = `VIDEO`; `isSvg`/`isSvgChild`; `isMedia` = image|video.
- `hasBackgroundImage` = backgroundImage set, not "none", not a gradient.
- `isFlexChild`/`isGridChild`/`parentFlexDir` read from the parent's computed display/flex-direction.

The Design tab in Retune.tsx (4073-4209) prepends, BEFORE the PropertyPanel sections: manifest banners + `<ComponentSection>`. So full vertical order is: [banners] -> ComponentSection -> Scope -> Position -> Layout -> Spacing -> Size -> Typography -> Fill -> Image -> Border -> Shadow -> Filters.

---

## 6. ComponentSection (the React props/state section) - `ComponentSection.tsx`

Uses the same `<Section>` wrapper with a custom 2-column grid body instead of rows.

- Header: `label = componentName || "Component"`; `action` = `<span className="retune-component-source">{file:line}</span>` when `sourceFile` known.
- Returns `null` entirely if: component matches a framework pattern (`Provider$|Context$|Config$|Wrapper$|^HOC|^with[A-Z]|^I13n|^Motion|^Suspense$|^ErrorBoundary`), OR a manifest exists but the component is not declared in it, OR there are no displayable props/state.
- Prop selection:
  - Manifest mode (component declared in manifest): show ONLY manifest-declared props; honor `hidden_unless` conditions; value = `reactProps[key] ?? def.default`.
  - Auto-filter mode (no manifest): hide `children,ref,key,className,style,params,searchParams,dangerouslySetInnerHTML`; hide name patterns `^on[A-Z] | ^__ | ^$ | ^_ | ^data- | ^aria- | ^(i13n|ylk|track|beacon)`; only simple primitives (no functions/objects/null; strings >80 chars dropped).
  - State: only `useState`-style hooks with a dispatcher (`hasDispatch`) and primitive values (string <80).
- Body: `.retune-component-grid` (CSS overlay.css 3168-3173) = `display:grid; grid-template-columns: 1fr 1fr; gap: 12px 8px; padding: 0 48px 4px 16px;`. Each cell `.retune-component-field` (column, gap 4px) with `.retune-component-field-label` (11px/450/tertiary).
- Per-entry control choice:
  - manifest enum -> `<SelectInput>`,
  - boolean -> `<SegmentedControl options=[Yes/No]>` (or a `.retune-component-toggle` 28x16 switch in toggle-row layout, CSS 3219-3247),
  - else -> `<ValueInput>` (a bare `.retune-prop` input; number vs text by value type; readonly for fn/object/null; with `<ChangeIndicator>` blue dot).
- Prop changes apply a DOM preview immediately (`applyDomPreview`): enum+class_map swaps CSS classes; string prop on a text-only element sets `textContent`. `resetRevision` bump reverts all previewed props (global "clear changes").

---

## Open questions for the build plan
- The brief mentions a "collapse chevron" on sections; this does not exist in Retune's section framework (sections are conditionally rendered, never collapsed). Confirm whether the port should ADD collapse, or match Retune (no collapse).
- SpacingSection and BorderSection receive a trimmed prop set (not full baseProps). If the port standardizes on one props object, note these two as the exceptions to replicate or unify.
- The hover-reveal applies only to `.retune-variable-action` (token apply), not to the +/- `.retune-section-action`. Keep that distinction.
