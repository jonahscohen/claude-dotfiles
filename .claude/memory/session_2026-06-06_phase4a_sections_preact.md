---
name: Phase 4a - Position/Layout/Spacing/Size sections built as Preact components
description: Built + browser-verified the four Phase 4a Design-panel sections for the Justify port
type: project
relates_to: [session_2026-06-06_retune_sections_spec.md]
---

Collaborator: Jonah

Task #24 (team retune-spec). Built the four Phase 4a Design sections as standalone Preact components in `justify/core/manipulate/ui/sections/`, grounded on spec 03 + Retune source. Token/variable layer deferred per plan; isChanged/onReset (changeProps) kept.

Files created:
- `PositionSection.tsx` - alignment row (2 btn-groups, gated by hEnabled/vEnabled from flex/grid/abs context), Type select, constraints (abs/fixed) / offsets (relative) / sticky-offset, pin authored-state detection off the live DOM node with a {top,left} fallback.
- `LayoutSection.tsx` - Display SegmentedControl (block/flex-row/flex-column/grid; "Flex" + arrow glyphs U+2192/U+2193), AlignmentGrid+Gap / Reverse / Wrap for flex, GridPicker+column/rowGap for grid.
- `SpacingSection.tsx` - Padding/Margin collapsed 2-axis (ShorthandInput) vs expanded 4-side (NumberInput), per-section expand state. TRIMMED prop set (plan g): changeProps + shorthandChangeProps, no variableProps. Padding clamps min=0, margin does not.
- `SizeSection.tsx` - frame mode (iframe w/h) vs normal (ComboInput Fill/Hug/Auto via ported sizing-utils, aspect-lock with inline padlock icons, min/max extras + add-constraint DropdownMenu). En-dash (U+2013) placeholder for empty min/max.

Shared infra touched (additively, no breakage to sibling sections):
- `ui/section-icons.tsx` - a sibling (#25) created this with a `Vanilla` wrapper (renders verbatim imperative `icons.ts` SVG via dangerouslySetInnerHTML). I EXTENDED it with LayoutAlign*, RectangleSmall, AutolayoutAdd*, GridView, AlSpacing*, AlPadding* family, LockClosed/LockOpen. Single source of truth = icons.ts; no path data redrawn.
- `ui/sections/section-props.ts` - added `ShorthandChangeProps` type + `LayoutContextProps` interface (isFlexChild/isGridChild/parentFlexDir) additively. (Scope sibling #29 also appended ForcedState/ScopeLevel/ScopeSectionProps - coexists fine.)
- `styles/sections.css` - appended verbatim Retune overlay.css alignment-button rules (.retune-align-row / .retune-btn-group / .retune-align-btn). The Tooltip wrapper (display:contents) satisfies the `> :not(:first-child) >` divider selector.

Verification (real Chrome, real pointer input, temp esbuild sandbox bundled with the build.js jsx/alias config, mounted in a shadow root with adopted panel-shell/controls/sections CSS, spy onPropertyChange):
- Position: align buttons emit exactly right=0px/left=auto/transform=none (alignRight), left=0px/right=auto/transform=none (alignLeft), top=0px/bottom=auto/transform=none (alignTop). Gating confirmed: absolute->constraints pin-box (both align groups enabled); relative->offsets with align groups DIMMED (opacity 0.3); sticky->sticky offset; static flex-row child->vertical group enabled with center active, horizontal dimmed.
- Layout: Display segmented emits display=grid; AlignmentGrid center cell emits justifyContent=center + alignItems=center (no synthetic-click anomaly - registers fine with a precise center coordinate); block/flex/grid branch gating correct.
- Spacing: collapsed Padding/Margin shorthand + split buttons; split button expands to 4-side (L/T row + R/B row + active collapse).
- Size: ComboInput opens Fill/Hug/Auto, selecting Fill emits width=100% (block); min/max auto-shown when non-default; "+" add-constraint menu shows Add min size / Add max size; frame mode shows plain 1280/800 inputs.

Type-check: `tsc --noEmit --jsx react-jsx --jsxImportSource preact` clean on all 5 files (one implicit-any on the Size add-constraint onSelect option fixed by annotating DropdownMenuOption). NOTE: project tsconfig.json has no `jsx` set - tsc alone errors TS17004 on every .tsx; canonical type/build check is esbuild (build.js) or tsc with the jsx flags.

Did NOT wire into PropertyPanel - the lead composes the panel (#28/#30).

Self-analysis: first browser interaction batch logged no onPropertyChange because navigate+click+screenshot were in ONE batch - clicks fired before Preact finished mounting (only "[sbx] mounted" logged, console cleared by navigation). Fix for future browser verification: never batch navigate together with the interactions you want to measure; let the page mount, then interact in a separate call. Also learned: don't mount a sandbox with the `.retune-panel` class (position:fixed) - it clips the page at the fold and the document won't scroll; use a plain static block.

Files touched: core/manipulate/ui/sections/{PositionSection,LayoutSection,SpacingSection,SizeSection}.tsx (new); core/manipulate/ui/section-icons.tsx (extended); core/manipulate/ui/sections/section-props.ts (extended); core/manipulate/styles/sections.css (appended).
