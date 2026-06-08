---
name: Retune-port spec 05 - Shadow/Filters/Image/Scope sections
description: Wrote 1:1 reference spec for the Shadow, Filters, Image/Video/Background, and Scope sections of Retune's Design panel
type: reference
relates_to: [session_2026-06-06_retune-port-current-justify-audit.md]
---

Collaborator: Jonah

Wrote `justify/docs/retune-port/05-sections-shadow-filters-image-scope.md` - exhaustive extraction spec for four Retune Design-panel sections so they can be reproduced pixel-for-pixel in another tool.

Sources read in full: `packages/overlay/src/ui/sections/{ShadowSection,FiltersSection,ImageSection,ScopeSection}.tsx`, `ui/shadow-utils.ts`, `ui/filter-utils.ts`. Also read supporting primitives to pin exact styles: `section.tsx`, `number-input.tsx`, `slider-input.tsx`, `select-input.tsx`, `combo-input.tsx`, `segmented-control.tsx`, `change-indicator.tsx`, `icons.tsx`, plus the class definitions and token table in `overlay/overlay.css`.

Key pinned values captured:
- Token table (light + dark): `--retune-black/white` opacity ramps via `color-mix`, blue ramp (`#0D99FF` 500, `#0768CF` 700, `#E5F4FF` 200), surface/border/text semantics.
- Section/Row/Field layout: header height 44px, section-body gap 12px + padding-bottom 16px, row gap 8px (align-items flex-end), row-group gap 4px, padding 0 48px 0 16px.
- ShadowSection: 4-row order (Color / X+Y offset / Blur(min0)+Spread / Type select outside|inside); defaultShadow `{0,4,8,0, rgba(0,0,0,0.15)}`; parse/serialize rules.
- FiltersSection: FILTER_CONFIG table (blur px 0-50, brightness % 0-300, etc.), layer/backdrop grouping, add-menu fixed-position math (translateX(-100%)), slider scrub math.
- ImageSection: Image/Video vs Background sub-sections, exact option lists for objectFit/objectPosition/backgroundSize/position/repeat, video SegmentedControls.
- ScopeSection: selector pills, bridge animation (DURATION 320, easing cubic-bezier(0.77,0,0.175,1), EXTEND 6px, midpoint flip at 160ms), middleTruncate(24) -> 10/13 split, Trigger pseudo-state map.
- Icons: Plus/Minus/ChevronDown verbatim 24x24 path data.

Notes on the harness: the content-guard blocked the first Write because the source's empty-value placeholder is the EN DASH glyph (U+2013) used literally in NumberInput/ComboInput. Re-authored the doc describing the glyph by codepoint rather than pasting it. The PostToolUse fix-gate also fired a "second fix in 10 min" warning - false positive; this is sequential doc-spec authoring across the retune-port set, not a bug-fix retry loop.

Files touched:
- justify/docs/retune-port/05-sections-shadow-filters-image-scope.md (new)
