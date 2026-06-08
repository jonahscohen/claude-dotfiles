---
name: Retune port build plan synthesized (00-PLAN.md)
description: Task #12 synthesis - render arch, isolation, WP line, build sequence, manager decisions for the Retune Design-panel port
type: project
relates_to: [session_2026-06-06_retune-manipulate-1to1-kickoff.md, session_2026-06-06_retune-section-framework-spec.md, session_2026-06-06_retune-controls-core-color-spec.md, session_2026-05-13_property-panel-port.md]
---

# Retune Design-Panel Port - Build Plan (00-PLAN.md)

Jonah, as "synthesizer" on team retune-spec, completed task #12: read all 11 area specs
(01-11 in `justify/docs/retune-port/`) in full and wrote `00-PLAN.md`, the authoritative
build plan. Resolved cross-cutting open questions (a)-(p).

## Key calls (binding decisions)
- **Render arch: bundle Preact (~4-5KB gz), port Retune TSX near-verbatim.** Abandon the
  2840-line vanilla `property-panel.ts`. Why: exactness is the mandate + upstream tracking;
  vanilla already drifted (dark-only, inert scope, no-op Trigger, 3 orphan modules). Keep
  `picker.ts`/`identifier.ts`/inspector/engine as vanilla TS ports (no React in Retune either).
  Build change: esbuild JSX + `alias react/react-dom -> preact/compat`; output stays single IIFE.
- **Isolation: KEEP Shadow DOM, no re-homing.** Brief's premise ("Justify has no shadow root")
  is WRONG per spec-11 audit: Justify's `Overlay` already uses `attachShadow`. `:host`/`:host(.dark)`/
  `all:initial` port 1:1. This is the easier outcome.
- **WP target line:** CSS-diff + selector + style-source + scope rail + forced pseudo-state =
  fully reproducible (~95%). React-only (stub/degrade): ComponentSection, `sourceFile`, propChanges,
  token-suggestion layer. Ship Design parity WITHOUT token layer + ComponentSection first.
- **Sections: NO collapse chevron** (Retune has none; conditionally rendered). Match Retune.
- **Attribute path (j):** Image/Video write HTML attributes (loading/alt/autoplay/loop/muted/controls)
  via `onAttributeChange` -> need a `{selector,attribute,oldValue,newValue}` variant alongside the
  CSS model; rides output as `### Attribute Changes` table.
- **Mirror verbatim, don't tokenize** (o): hard-coded hex (AlignmentGrid/ConstraintsInput/GridPicker/
  gradient chit/checkerboards), both focus-ring styles (1px outline vs blue glow), always-dark menus/tooltips.
- Corner-radius order TL,TR,BR,BL (l). Shadow single-layer only (k). opacity integer-% + 2dp alpha (n).
- Skip dead code (m): FLEX_BASIS_OPTIONS, spacing-icons.tsx (not wired), TokenPicker (orphan/unstyled).
- Icons: 41 verbatim (33 filled 24x24 + 8 stroked 20x20 + Check 16) + inline SVGs (padlock, pinline,
  alignment, None-line). Copy character-for-character (satisfies never-fabricate-SVG rule).
- Browser target: modern evergreen only (color-mix, interpolate-size); dev-tool, no polyfills.

## Build sequence (Design parity, Elements tree deferred)
Ph0 build/render shell -> Ph1 selector gen + inspector (FIRST, upstream of all) -> Ph2 theme+shell+tabs
-> Ph3 section framework + control primitives -> Ph4 static sections (Position/Layout/Spacing/Size/Typo/Border)
-> Ph5 color+gradient+Fill -> Ph6 Shadow/Filters/Image+attr path -> Ph7 scope rail + forced state
-> Ph8 picker + on-element chrome + box-model overlay -> Ph9 (tail) tracker fidelity + ComponentSection + token layer.

## Verification protocol
(1) exact-value diff vs spec/source char-for-char; (2) visual side-by-side vs Retune playground at
`cd retune/playground && npm run dev` -> localhost:3002 (retune.dev secondary). Real-input only.

## Top 5 manager sign-offs (in 00-PLAN section H)
1. Adopt Preact / abandon vanilla panel. 2. Modern-evergreen browser target. 3. Ship parity without
token layer + ComponentSection first. 4. Mirror hex/focus-rings verbatim (no tokenize). 5. Defer Elements tree.

## Files touched
- `justify/docs/retune-port/00-PLAN.md` (created, the deliverable)
- Task #12 marked completed; all of #1-11 already done.
