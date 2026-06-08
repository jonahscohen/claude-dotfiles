---
name: Retune Design-panel sections spec (Position/Layout/Spacing/Size, Typography/Fill/Border, Shadow/Filters/Image/Scope)
description: 1:1 spec of 11 Retune Design-panel sections from real source, for the Justify port
type: reference
---

Collaborator: Jonah

As teammate "sections-analyst" on team retune-spec, produced exact 1:1 specs of Retune's element Design-panel sections by reading the real source under `packages/overlay/src/ui/` (Retune repo). Output written to `claude-dotfiles/justify/docs/retune-port/`.

Files written:
- `03-sections-position-layout-spacing-size.md` (task #3) - Position, Layout, Spacing, Size sections + sizing-utils.ts logic + spacing-icons note.
- `04-sections-typography-fill-border.md` (task #4) - Typography (gated on isText), Fill (Appearance/SVG Fill/SVG Stroke/background Fill), Border, plus FontInput picker.
- `05-sections-shadow-filters-image-scope.md` (task #5) - Shadow (+shadow-utils), Filters (+filter-utils config table), Image/Video/Background-Image, Scope (target pills + bridge animation + forced-state trigger).

Each spec captures: section render-gating, control order, exact labels, SelectInput/ComboInput option arrays verbatim, default/empty values, units, which control renders when, and the supporting util logic (sizing modes fill/hug/fixed, filter config min/max/step, shadow parse/serialize, truncation changes).

Key findings flagged as open questions:
- Corner-radius ShorthandInput order is TL, TR, BR, BL (clockwise), easy to mis-port.
- Image/Video controls write HTML attributes via onAttributeChange, not CSS onPropertyChange - engine needs an attribute path.
- Shadow editing supports only the first box-shadow layer.
- FLEX_BASIS_OPTIONS declared in SizeSection but never rendered (dead/future code).
- spacing-icons.tsx exports an icon family NOT imported by SpacingSection (which uses AlPadding* from ../icons) - possibly legacy.
- Size aspect-lock + frame-mode use inline SVGs, not the icon library (flag for icon inventory task #8).
- Scope bridge animation uses Web Animations API + getComputedStyle color snapshotting with midpoint freeze/unfreeze.

Process note (hook): content-guard blocked the first two Write attempts because the spec quoted Retune's literal en-dash placeholder glyph (U+2013, used as NumberInput placeholder for empty min/max) and my prose used em-dashes. Resolved by replacing all em-dashes with hyphens and referencing the en-dash placeholder by codepoint (U+2013) instead of the literal glyph. The emdash/endash content-guard fires on any em/en dash in file writes, including when documenting a third-party source's literal values.

Tasks #3, #4, #5 marked completed. All three block #12 (synthesize build plan).
