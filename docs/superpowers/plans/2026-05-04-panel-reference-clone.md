# reference tool Property Panel Exact Clone

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make improv's property panel visually indistinguishable from reference tool v0.7.6's panel.

**Architecture:** Single-file rewrite of `improv/core/manipulate/property-panel.ts`. All SVG icons extracted verbatim from the reference tool's compiled source at `/tmp/reference-tool-inspect/package/dist/index.js`. All CSS values scraped from the reference tool's adopted stylesheet. No Lucide icons - reference tool uses custom filled-path SVGs in a 24x24 viewBox wrapper.

**Tech Stack:** TypeScript, DOM createElement (no JSX/React), SVG path data extracted from reference source.

**Source of truth:** `/tmp/reference-tool-inspect/package/dist/index.js` (reference tool v0.7.6)

---

### Task 1: SVG Icon Library - Extract All reference tool Icons

**Files:**
- Create: `improv/core/manipulate/icons.ts`

All icons use wrapper: `<svg width={size} height={size} viewBox="0 0 24 24" fill="none">`. the reference tool's icons use `fill="currentColor"` with `fillOpacity` values (0.9 for primary shapes, 0.3 for guide lines). This is fundamentally different from our stroke-based Lucide icons.

- [ ] **Step 1: Create icons.ts with the icon helper and all alignment icons**

Extract verbatim from reference source (lines 7954-8095):
- `I` wrapper (24x24 viewBox, fill="none")
- `LayoutAlignLeft`, `LayoutAlignRight`, `LayoutAlignHorizontalCenter`
- `LayoutAlignTop`, `LayoutAlignBottom`, `LayoutAlignVerticalCenter`
- `TextAlignLeft`, `TextAlignCenter`, `TextAlignRight`
- `TextAlignJustify`
- `VerticalAlignTop`, `VerticalAlignCenter`, `VerticalAlignBottom`

- [ ] **Step 2: Add display/layout icons**

Extract from reference source (grep for `RectangleSmall`, `AutolayoutAdd`, `GridView`, spacing icons):
- `RectangleSmall` (block display)
- `AutolayoutAddHorizontal` (flex row)
- `AutolayoutAddVertical` (flex col)
- `GridView` (grid display)
- `AlSpacingHorizontal`, `AlSpacingVertical` (gap icons)
- `AlPaddingSides` (split/expand button icon)

- [ ] **Step 3: Add alignment grid dot/position icons**

Extract from lines 9803-9847:
- `IconDot` (2px filled circle at center, opacity 0.3)
- `IconPositionLeft`, `IconPositionCenterH`, `IconPositionRight`
- `IconPositionTop`, `IconPositionCenterV`, `IconPositionBottom`
- `IconSBBarH`, `IconSBBarHLeft`, `IconSBBarHCenter`, `IconSBBarHRight`
- `IconSBBarV`, `IconSBBarVTop`, `IconSBBarVCenter`, `IconSBBarVBottom`

- [ ] **Step 4: Add radius, size, and utility icons**

Extract from lines 7957-7995:
- `RadiusTopLeft`, `RadiusTopRight`, `RadiusBottomLeft`, `RadiusBottomRight`
- `Plus`, `Minus` (section action icons)
- `ChevronDown` (select/combo trigger)
- `Link2`, `Link2Off` (aspect ratio lock)
- `AdjustSmall` (typography expand toggle)
- Padding H/V icons, Margin H/V icons

- [ ] **Step 5: Build and verify no type errors**

Run: `cd improv && node build.js --core-only`
Expected: Clean build

---

### Task 2: Rewrite Position Section with Proper Alignment Buttons

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

The Position section uses 6 alignment buttons in TWO groups (3 horizontal + 3 vertical), NOT a 3x3 grid. The 3x3 grid belongs in the Layout section for flex/grid containers.

CSS for alignment buttons:
- `.reference-tool-align-row`: `display: flex; gap: 8px`
- `.reference-tool-btn-group`: `display: flex; flex: 1; background: var(--reference-tool-surface-hover); border-radius: 8px; overflow: hidden`
- `.reference-tool-btn-group > :not(:first-child) > .reference-tool-align-btn`: `box-shadow: inset 1px 0 0 var(--reference-tool-surface)` (separator between buttons)
- `.reference-tool-align-btn`: `flex: 1; height: 32px; border: none; background: transparent; color: var(--reference-tool-text); cursor: pointer; transition: background 0.15s ease`
- `.reference-tool-align-btn:hover`: `background: var(--reference-tool-border)`
- `.reference-tool-align-btn.active`: `background: var(--reference-tool-border)`

- [ ] **Step 1: Remove the makeAlignmentGrid method and revert buildPositionSection**

Replace the 3x3 grid call with two `reference-tool-btn-group` divs containing 3 buttons each. Each button renders a reference tool alignment icon (LayoutAlignLeft etc.) imported from icons.ts.

- [ ] **Step 2: Add proper enable/disable logic**

Horizontal group enabled when: `isAbsoluteOrFixed || isGridChild || isFlexColumn`
Vertical group enabled when: `isAbsoluteOrFixed || isGridChild || isFlexRow`
Disabled: `opacity: 0.3; pointer-events: none`

- [ ] **Step 3: Build and verify**

---

### Task 3: Rewrite Layout Section with AlignmentGrid

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

The Layout section shows:
1. Display segmented control (4 icons: Block, Flex Row, Flex Col, Grid)
2. When flex: AlignmentGrid (3x3 with position icons), Gap input, Reverse select, Wrap select
3. When grid: GridPicker, Column Gap, Row Gap

The AlignmentGrid is the 3x3 grid with `IconDot` for inactive cells, `IconPositionLeft/Right/Top/Bottom/CenterH/CenterV` for selected/hovered cells, colored BLUE (#0D99FF) when selected, GRAY (#a8a29e) when hovered.

- [ ] **Step 1: Move AlignmentGrid logic into buildLayoutSection**

Create a proper `makeAlignmentGrid` that:
- Uses a CSS grid (3x3, 72px tall, surfaceHover bg, 8px radius)
- Each cell renders IconDot by default (gray, 0.3 opacity)
- Selected cell renders position-specific icon in blue (#0D99FF)
- Hovered cell renders position-specific icon in gray (#a8a29e)
- Maps row/col to justifyContent + alignItems values

- [ ] **Step 2: Fix display segmented icons**

Replace current Lucide stroke icons with the reference tool's filled icons (RectangleSmall, AutolayoutAddHorizontal, AutolayoutAddVertical, GridView).

- [ ] **Step 3: Build and verify**

---

### Task 4: Fix Color Input Structure (Hex + Opacity)

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

the reference tool's color input is split into TWO sections with 1px gap:
- Left: `.reference-tool-color-hex-section` (border-radius 8px 0 0 8px) containing 32x32 swatch area + hex text input
- Right: `.reference-tool-color-opacity-section` (border-radius 0 8px 8px 0, padding: 0 8px 0 4px) containing opacity percentage input (28px wide)

Swatch: 20x20, border-radius 2px (already fixed). Hidden native color input overlay.

- [ ] **Step 1: Rewrite makeColorRow to include opacity section**

Add the right-side opacity section with:
- Background: surfaceHover
- Border-radius: 0 8px 8px 0
- 28px wide input showing opacity as percentage
- Parse opacity from rgba alpha or separate opacity property

- [ ] **Step 2: Build and verify**

---

### Task 5: Fix Combo Input Structure (Input | Chevron Split)

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

the reference tool's combo input is visually split into two sections with 1px gap:
- Left: `.reference-tool-combo-input` (border-radius 8px 0 0 8px, padding-left 32px for label area)
- Right: `.reference-tool-combo-trigger` (32x32, border-radius 0 8px 8px 0, chevron icon)

Both have surfaceHover bg individually. The label is absolutely positioned at left with ew-resize cursor for scrubbing.

- [ ] **Step 1: Rewrite makeComboInput with split structure**

Split the input and chevron into separate visual blocks with 1px gap. Left block gets 8px 0 0 8px radius, right block gets 0 8px 8px 0 radius. Both have independent hover states.

- [ ] **Step 2: Build and verify**

---

### Task 6: Fix Select Button Structure

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

the reference tool's select has:
- `.reference-tool-select-button`: Full-width, 32px tall, surfaceHover bg, 8px radius
- `.reference-tool-select-label`: Absolutely positioned left, 32px x 32px, tertiary color, 11px/450
- `.reference-tool-select-value`: flex: 1, padding-left 32px (below label), 11px/450, text overflow ellipsis
- `.reference-tool-select-chevron`: 32px x 32px right area, secondary color

When the select has a label icon (like position Type), the label shows in the 32px left area. When no icon, padding-left is 12px instead.

- [ ] **Step 1: Rewrite makeSelectControl with proper structure**

Use the `.reference-tool-select-button` pattern: one container with absolute label, value text with padding-left, and chevron on right.

- [ ] **Step 2: Build and verify**

---

### Task 7: Fill Section with Actual Content

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

The Fill section (labeled "Appearance" for non-SVG) contains:
1. Opacity (NumberInput, min 0, max 1, step 0.01) + Z-index (NumberInput) on same row
2. Corner radius (ShorthandInput with split to 4 individual, RadiusTopLeft icon)
3. Overflow (SelectInput: visible/hidden/auto/scroll)

Below that, a separate "Fill" section contains:
1. Background color (ColorInput)

- [ ] **Step 1: Ensure Appearance section has all controls**

Already has Opacity, Z-index, Corner radius, Overflow. Verify they match the reference tool's exact layout (labels as field-label above, not inline).

- [ ] **Step 2: Build Fill section with color input**

Replace the empty collapsed "Fill" section header with a real section containing a ColorInput for backgroundColor. Add a section action (+) button that shows on hover.

- [ ] **Step 3: Build and verify**

---

### Task 8: Border Section with Actual Content

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

When a border exists (any side has style != "none" and width > 0), show:
1. Color row (ColorInput for borderColor)
2. Width row (ShorthandInput for all 4 sides, with split button to expand to individual inputs)
3. Style row (SelectInput: solid/dashed/dotted/double)

Section action: + to add border (1px solid currentColor), - to remove.

- [ ] **Step 1: Rewrite buildCollapsedSection for Border to detect and render border controls**

Check if border exists from computed styles. If yes, render Color, Width, Style rows. If no, show just the section header with + button.

- [ ] **Step 2: Build and verify**

---

### Task 9: Shadow Section with Actual Content

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

When a box-shadow exists, parse it and show:
1. Color row (ColorInput)
2. X offset + Y offset (two NumberInputs)
3. Blur + Spread (two NumberInputs, blur min: 0)
4. Type (SelectInput: outside/inside for inset toggle)

Section action: + to add shadow (0 4px 8px 0 rgba(0,0,0,0.15)), - to remove.

- [ ] **Step 1: Add shadow parsing helper**

Parse `box-shadow` CSS value into {color, x, y, blur, spread, inset} components.

- [ ] **Step 2: Rewrite Shadow section with parsed controls**

Render color, offset, blur/spread, type rows when shadow exists.

- [ ] **Step 3: Build and verify**

---

### Task 10: Filters Section with Slider Controls

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

When CSS filter or backdrop-filter exists, parse individual filter functions and show:
- Each filter as a labeled slider with value display
- Remove button per filter
- Section action + to add new filter via dropdown

Slider structure:
- `.reference-tool-slider`: Container with fill bar, handle, and labels
- Label on left, value on right
- Drag handle to adjust

- [ ] **Step 1: Add filter parsing helper**

Parse `filter` and `backdrop-filter` CSS values into array of {type, value} objects.

- [ ] **Step 2: Build slider control and Filters section**

Create a makeSliderInput helper. Render each parsed filter as a slider row.

- [ ] **Step 3: Build and verify**

---

### Task 11: Typography Section Fixes

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

Fix typography section to exactly match the reference:
1. Font picker button: full-width, surfaceHover bg (already done)
2. Size + Weight row: Size as NumberInput (min: 1), Weight as ComboInput with standard options
3. Line height + Letter spacing: Both as ComboInput
4. Color: ColorInput (with opacity section)
5. Text align: SegmentedControl (TextAlignLeft/Center/Right icons)
6. Vertical align: SegmentedControl (VerticalAlignTop/Center/Bottom icons)
7. Expand toggle: split button (AdjustSmall icon) to show extra rows
8. Expanded: Style, Decoration, Transform, White space, Truncate, Word break

- [ ] **Step 1: Replace all Lucide text-align icons with the reference tool's icons**

Swap TEXT_ALIGN_LEFT/CENTER/RIGHT paths with the reference tool's TextAlignLeft/Center/Right filled-path icons.

- [ ] **Step 2: Add expand toggle and extra typography rows**

Add a split button that reveals Style, Decoration, Transform, White space rows.

- [ ] **Step 3: Build and verify**

---

### Task 12: Spacing Section - Expand/Collapse for Individual Sides

**Files:**
- Modify: `improv/core/manipulate/property-panel.ts`

The split button on padding/margin rows should toggle between:
- Collapsed: 2 shorthand inputs (H + V)
- Expanded: 4 individual inputs in a 2x2 grid (Top, Right, Bottom, Left)

Currently our split button is non-functional. Wire it up.

- [ ] **Step 1: Add expand state tracking and toggle rendering**

Track `paddingExpanded` and `marginExpanded` booleans. When expanded, render 4 individual NumberInputs in two rows instead of 2 shorthand inputs.

- [ ] **Step 2: Build and verify**

---

### Task 13: Final Build, Deploy, and Visual Verification

**Files:**
- Build: `improv/dist/improv-core.js`
- Deploy: `~/.claude/improv/dist/improv-core.js`
- Deploy: `~/Documents/Github/dishplayscapes/improv-core.js`

- [ ] **Step 1: Full build**

Run: `cd improv && node build.js --core-only`

- [ ] **Step 2: Deploy to all locations**

Copy dist to installed server and DishPlayscapes project.

- [ ] **Step 3: Hard reload DishPlayscapes and screenshot every section**

Select an h2, scroll through entire panel, screenshot each section for comparison against reference tool.

- [ ] **Step 4: Side-by-side comparison with reference tool reference**

Open reference tool reference screenshot alongside each panel section. Document any remaining visual differences.

- [ ] **Step 5: Fix any remaining mismatches**

Address every visual gap found in step 4.
