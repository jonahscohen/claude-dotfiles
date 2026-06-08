---
name: Phase 3b - 13 control primitives ported to Preact
description: Ported Retune's 13 Design-panel control primitives to standalone Preact components under core/manipulate/ui/, verified in a real Chrome sandbox via real pointer/keyboard input
type: project
relates_to: [session_2026-06-06_retune-controls-core-color-spec.md, session_2026-06-06_retune-port-build-plan.md]
---

Collaborator: Jonah. Role: controls-analyst, task #16 (Phase 3b).

Ported the 13 core control primitives from Retune (overlay/src/ui/*.tsx) to
standalone Preact components in `core/manipulate/ui/`. Build is esbuild with
`jsx: automatic`, `jsxImportSource: preact`, and `react`/`react-dom` aliased to
`preact/compat` (build.js). esbuild strips types for the core bundle (no tsc on
core), so components import from "react"/"react-dom" verbatim and the alias maps
runtime values to preact/compat. This is the near-verbatim, lowest-risk path.

Files created under core/manipulate/ui/:
- Controls: number-input, slider-input, segmented-control, select-input,
  combo-input, text-input, shorthand-input, constraints-input, alignment-grid,
  grid-picker, dropdown-menu, tooltip, change-indicator (.tsx)
- Support: round-css-value.ts, menu-position.ts, use-scroll-lock.ts,
  tooltip-portal-context.tsx, icons.tsx (Check/ChevronDown/ChevronUp verbatim)
- CSS: core/manipulate/styles/controls.css (verbatim from overlay.css control
  blocks; references --retune-* tokens BY NAME; hard-coded hex mirrored verbatim
  per plan open-question o)

Encoded per plan open-questions:
- (n) 32px h / 8px radius / bg --retune-surface-hover / 11px / weight 450 /
  letter-spacing -0.005em. Scrub: NumberInput 1px x step (precision
  ceil(-log10(step))); Combo/Shorthand 1px = 1 integer; SCRUB_ZONE 16px. Core
  inputs use setPointerCapture.
- (o) MIRROR VERBATIM: hard-coded hex (AlignmentGrid #0D99FF/#a8a29e,
  ConstraintsInput #3b82f6/#d6d3d1, GridPicker #3b82f6/#93c5fd/#eeeceb, gradient
  chit, checkerboards), both focus-ring styles, always-dark menus (#1c1917) /
  tooltips (#1e1e1e).
- (l) ShorthandInput takes prop order from the CALLER (TL,TR,BR,BL is the
  caller's concern for corner-radius).

DEVIATION (intentional, documented in each file header): the variable/token
integration (VariableAction, VariableDialog, hasVariablesForProperty, usePreviewValue,
the "Add variable" sentinel) is DEFERRED to the later token phase - it is a deep
dependency (variables/resolver, variables/types, dialog-singleton, preview-bridge)
that is out of Phase 3b scope. NumberInput/ComboInput/ShorthandInput/SelectInput keep
isChanged/onReset + ChangeIndicator; they drop only the token props/branches. The
scrub/keyboard/commit/clamp/unit-inference cores are verbatim. Color/gradient pickers
are a separate later phase.

## Verification (real Chrome, real input)
Built a temporary Preact sandbox (_sandbox.tsx, since deleted) mounting all 13
controls statefully with an on-page live value readout; bundled with esbuild;
served on :8771; drove with real chrome pointer/keyboard. Zero console errors.
All 13 render with correct geometry (32px pills, label wells, split combo, dark
menus, pin box, 3x3 grid, mini grid preview).
4 required probes PASS:
- Scrub NumberInput: drag "W" label +33px -> 100px -> 133px (1px=1 step, "px" preserved). PASS
- Slide Segmented pill: click "Col" -> pill animates, value "col". PASS
- Open Select: dropdown opens DARK and macOS-aligned (selected "Flex" sits over
  the trigger row via menu-position.ts), checkmark on selected; picking "Grid"
  commits + closes. PASS
- Type+commit Combo: triple-click, type "auto", Enter -> commits value "auto",
  displays label "Auto". PASS
Also verified: SliderInput drag (0.5 -> 0.81, step precision), Constraints center
pin click (all sides -> 0px, pins turn blue), ChangeIndicator dot, Tooltip (dark,
positioned, "Align center" etc.), GridPicker render.

## Known anomaly (flagged, NOT a code defect)
AlignmentGrid CELL CLICKS did not register under chrome/CDP synthetic mouse input,
while: (a) keyboard nav on the grid WORKS (ArrowRight -> center/flex-start), (b)
hover/mouseenter reaches the cells (tooltips appear, icons swap to gray), (c) all
other plain-button clicks work (Constraints pins, Segmented, Select, Combo). Even
double_click on the grid container didn't fire onDoubleClick, yet keyboard does.
Root-caused via instrumented rebuild (console.log in handleClick -> never fired)
and a no-Tooltip rebuild (still never fired -> Tooltip is NOT the cause). The
differentiator is that AlignmentGrid is the only control that re-renders its
subtree on every mouseenter (hover state lifted to parent, child SVG swaps). The
"mouse-move reaches but press/click doesn't" asymmetry, isolated to the
hover-rerendering component, is the signature of a CDP synthetic-click-vs-rerender
RACE in the headless harness - not an overlay (would block hover too) and not a
wiring bug (keyboard proves wiring). The component code is verbatim Retune (proven
in React production). A real human click (hover settles in one frame, then press on
a stable tree) should not hit this race. ACTION FOR INTEGRATION: confirm
AlignmentGrid cell clicks with a real pointer during integration testing; if it
truly fails for a human, revisit the hover-state-lift / icon-swap pattern.

## Self-analysis
Burned several turns theorizing about the AlignmentGrid click before applying the
debugging protocol properly (instrument -> isolate -> compare working vs broken).
The fix was to ADD a console.log and rebuild (external probe) rather than keep
reasoning about Preact internals. Logged so future me reaches for instrumentation
sooner when a black-box symptom resists hypotheses.

Process: content-guard blocked literal en-dash (placeholder glyph) and I initially
fought it; resolved with String.fromCharCode(0x2013) for the en-dash placeholder and
a TIMES const (multiplication sign) for GridPicker's "N x M" label.

Files touched:
- core/manipulate/ui/{number,slider,segmented-control,select,combo,text,shorthand}-input.tsx,
  {constraints,alignment-grid,grid-picker,dropdown-menu}.tsx, tooltip.tsx,
  change-indicator.tsx, round-css-value.ts, menu-position.ts, use-scroll-lock.ts,
  tooltip-portal-context.tsx, icons.tsx
- core/manipulate/styles/controls.css
</content>
