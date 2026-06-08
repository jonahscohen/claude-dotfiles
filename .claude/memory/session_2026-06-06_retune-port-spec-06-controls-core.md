---
name: Retune-port spec 06 - Controls Core (input primitives)
description: 1:1 reference spec for Retune's 13 core input-primitive components for port into Justify
type: reference
relates_to: [session_2026-06-06_retune-port-spec-05-shadow-filters-image-scope.md, session_2026-06-06_retune-port-specs.md, session_2026-06-06_retune-port-current-justify-audit.md]
---

Wrote `claude-dotfiles/justify/docs/retune-port/06-controls-core.md` - exhaustive 1:1 extraction spec for the controls-core area so the primitives can be reproduced pixel-for-pixel in another tool.

Covers 13 components (all from `retune/packages/overlay/src/ui/`): NumberInput, SliderInput, SegmentedControl, SelectInput, ComboInput, TextInput, ShorthandInput, ConstraintsInput, AlignmentGrid, GridPicker, DropdownMenu, Tooltip, ChangeIndicator. Plus shared sub-components VariableAction + helper modules round-css-value.ts, menu-position.ts, and icons.tsx path data.

Key facts captured (load-bearing):
- All controls 32px tall, 8px radius, 11px/450/-0.005em input font, `background-color 0.15s ease` hover.
- Tokens resolved from overlay.css :host (black/white opacity ramps via color-mix, blue ramp, semantic light + :host(.dark) overrides).
- Scrub math: NumberInput uses step+precision+min/max clamp (1px = 1 step). ComboInput scrub is integer-only, no clamp, gates negatives unless prop is margin/top/right/bottom/left/indent. ShorthandInput scrubs all props equally.
- Slider: fillPercent, nice-tick indicator algorithm (range/8 -> 1/2/5/10 normalization), handle only on hover/drag.
- SegmentedControl pill is JS-positioned (measure btn rect, translateX, skip transition on first render via forced reflow).
- Select/Combo dropdowns use macOS in-place positioning (menu-position.ts: ITEM_HEIGHT=28, PADDING_Y=6, MAX_HEIGHT=400) and the DropdownMenu (fixed DARK palette #1c1917, not theme tokens).
- Tooltip + DropdownMenu are dark-only, z-index 2147483647, portaled. Tooltip measures children[0] because trigger is display:contents.
- Hardcoded non-token colors flagged: #3b82f6, #93c5fd, #d6d3d1, #a8a29e, #0D99FF, #eeeceb, dark palette hexes.
- Icons are a custom portfolio-editor set (NOT a public library) - spec lists ChevronDown/Up/Check verbatim paths and names all 15 AlignmentGrid inline icons + Hexagon/Unlink for verbatim extraction.

GOTCHA (content-guard): first Write was BLOCKED because the spec contained the literal EN DASH (U+2013) - which is the real default placeholder value in NumberInput/Combo/Shorthand source (`placeholder || "<en-dash>"`) - and decorative en-dashes I'd used as separators. Per Hook Override Protocol the placeholder glyph is load-bearing; I represented it as `<U+2013>` in prose with an explicit note that source uses the literal glyph, and replaced all decorative en-dashes with hyphens/rewrites. Re-write succeeded. Flagging so the team knows the guard fired on legitimate doc content.

Collaborator: Jonah (jonahscohen@gmail.com).

Files touched:
- claude-dotfiles/justify/docs/retune-port/06-controls-core.md (created)
