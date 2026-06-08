---
name: Retune controls spec (core primitives + color/gradient)
description: 1:1 EXACT specs for Retune Design-panel control primitives (06) and color/gradient controls (07) from real source
type: reference
relates_to: [session_2026-06-06_retune-manipulate-1to1-kickoff.md, session_2026-06-06_retune-section-framework-spec.md]
---

Collaborator: Jonah. Role on team retune-spec: controls-analyst (tasks #6 + #7).

Produced two verbatim-from-source spec docs under
`justify/docs/retune-port/` for the Retune Manipulate 1:1 port. Source read IN FULL from
`retune/packages/overlay/src/` (ui/*.tsx + the single 3,523-line `overlay/overlay.css`,
which is injected via auto-generated `overlay/overlay-css.ts`).

## 06-controls-core.md (task #6)
Specced 13 primitives + supporting helpers: NumberInput, SliderInput, SegmentedControl,
SelectInput, ComboInput, TextInput, ShorthandInput, ConstraintsInput, AlignmentGrid,
GridPicker, DropdownMenu (+ menu-position.ts), Tooltip, ChangeIndicator. Plus
round-css-value.ts, use-preview-value.ts, use-scroll-lock.ts, VariableAction, icons.
Captured exact px/colors/fonts and behavior (scrub math, keyboard, units, all states).

Key facts worth remembering:
- Shared geometry: height 32px, radius 8px, bg `--retune-surface-hover`, font 11px/450/-0.005em.
- Scrub: NumberInput 1px = 1*step (precision via -log10(step)); Combo/Shorthand 1px = 1 (integer, no step). SCRUB_ZONE=16px when label-less.
- Tokens are an opacity ramp over `#1c1917`/`#fff` via color-mix. Menus are always-dark `#1c1917`; tooltip `#1e1e1e`.
- menu-position.ts: ITEM_HEIGHT 28, PADDING_Y 6, MAX 400, macOS selected-item alignment.

## 07-controls-color-gradient.md (task #7)
Specced ColorInput, ColorPicker, color-utils.ts, FloatingDialog (shell), GradientEditor,
GradientStopBar, gradient-utils.ts, TokenPicker.

Key facts:
- color-utils: opacity is INTEGER percent (parse rounds alpha*100); hexToRgba returns hex when opacity>=100 else rgba w/ 2-dp alpha.
- ColorPicker SV/hue/alpha + GradientStopBar use document-level pointermove/up drag (dragCleanupRef), NOT setPointerCapture - differs from 06's capture model.
- emitChange auto-unlinks an applied variable on manual color edit (eyedropper + per-stop ColorInput too).
- gradientToCss output: linear `Ndeg`, radial `circle`, conic `from Ndeg`; bar preview always `to right`.
- Color-picker / gradient inputs use blue-glow focus `box-shadow 0 0 0 1.5px rgba(59,130,246,0.5)` vs 06's 1px border-token outline - flagged as an inconsistency.

## Notable finding
TokenPicker (token-picker.tsx) references `retune-token-picker*` classes that have ZERO
definitions in overlay.css (grep count 0) - it is orphaned/unstyled. The live color-token
swap path is the ColorPicker Variables tab + VariableDialog (`.retune-variable-dialog-*`).
Flagged in spec section 8 + open questions; do not port TokenPicker unless a freestanding
swap panel is needed.

## Process note (failure mode caught)
content-guard hook blocked the Write twice on en-dash/em-dash glyphs. First pass: my own
prose used em-dashes throughout (rule violation - should have used hyphens from the start).
Second pass: a single literal en-dash remained where I was quoting the source placeholder
glyph. Fix: describe such glyphs in words ("en-dash placeholder") rather than embedding the
character. Lesson: author docs ASCII-dash-only up front; quote forbidden glyphs by name.

Files touched:
- justify/docs/retune-port/06-controls-core.md (new)
- justify/docs/retune-port/07-controls-color-gradient.md (new)
</content>
