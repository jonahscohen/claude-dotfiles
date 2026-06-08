# 00 - Canonical Build Plan: Retune Design Panel -> Justify (1:1 Port)

Synthesis lead: this is the single canonical plan for porting Retune's element **Design panel** into Justify's vanilla-TS core (esbuild IIFE bundle, `core/index.ts` entry, imperative DOM throughout). It consolidates area specs 01-11. Scope for THIS plan is **Design-panel parity only**; the Elements tree, comments, and component-prop editing are explicitly deferred.

Author of record (collaborator): Jonah (git user.name).

---

## 0. Source-availability reconciliation (read this first)

There is a contradiction across the inputs that the human manager must resolve before any build starts:

- Specs **01-10** were written with verbatim line citations into `packages/overlay/src/*.tsx` and `overlay.css` (exact px, exact `d=` path data, exact CSS line numbers). They were clearly produced against **real Retune source**.
- Spec **11 (current-audit)** states the Retune `.tsx`/`overlay.css` source is **NOT on disk** at `/Users/spare3/Documents/Github/retune/` (only the published README is present), and bases its "stay imperative, do not bundle Preact" recommendation on that absence.

These cannot both be true at the same moment. The resolution that drives this plan:

- **The 01-10 specs ARE the source of truth.** They contain enough verbatim CSS/JSX/path-data to reconstruct the panel byte-faithfully whether or not the live `.tsx` tree is still on disk. We do not need the React runtime; we need the values, and we have them.
- The architecture decision (Preact vs imperative) does **not** actually hinge on source availability the way spec 11 frames it, because **the specs are structured, not the components**. There is no `.tsx` to `s/React/Preact/` and ship. Either path reconstructs from the specs. See Section 1.

**Action for manager:** confirm whether the live `packages/overlay/src` tree is retrievable. If yes, keep it as a verbatim-diff oracle (Section 4). If no, the 01-10 specs are sufficient and the plan is unchanged.

---

## 1. RENDER ARCHITECTURE recommendation

**Recommendation: Option B+ - keep imperative DOM, but introduce a tiny in-house hyperscript+keyed-reconcile helper (`h()` + `reconcile()`) used ONLY inside the Design panel. Do NOT bundle Preact.**

### The decision

| Option | What it is | Verdict |
|---|---|---|
| A | Bundle Preact (~4kb gz) + JSX loader, port components near-verbatim | **Reject** |
| B | Pure imperative `createElement`/`style.cssText`, as today | Reject as-is (verbosity + state-loss) |
| **B+** | Imperative core + ~80-line `h()` hyperscript and a keyed list reconciler, no VDOM runtime, same single IIFE | **Adopt** |

### Reasoning

1. **There is nothing to port verbatim, so Preact's headline advantage evaporates.** The win for "bundle Preact" is copy-pasting `.tsx` with minimal edits. But our inputs are *specs*, not components - even spec 01-10's JSX snippets are illustrative reconstructions, not a compilable tree. Whether we choose Preact or vanilla, an engineer reconstructs each section from the spec's "Row order / props / CSS class" tables. Preact buys a framework but not a shortcut. (Spec 11 Section 8 reaches the same conclusion from the other direction.)

2. **One paradigm beats two.** Justify's *entire* overlay - toolbar (`toolbar.ts`, 32KB), claudebar, changes-panel (`changes-panel.ts`, 47KB), prompt mode, apply-confirmation, overlay highlights (`overlay.ts`), the host `core/index.ts` (76KB) - is imperative DOM in one IIFE. Making the Design panel the only Preact island puts a framework seam exactly where the most Retune-parity churn will live. Mental-model split-brain is a real maintenance tax.

3. **`property-panel.ts` is already ~90% of this imperatively** (2841 lines, faithful tokens/sections/scrub/segmented controls per spec 11). The remaining parity work - wire dead controls, add missing sections (Video/SVG/background-image/object-position/scope levels/light theme), tokenize the few hardcoded colors, fix panel-recreate state-loss - is **additive reconcile**, not a rewrite. None of it is easier in Preact given there is no source to paste.

4. **The two real pains of pure-imperative get solved by B+, not by Preact:**
   - *Verbosity / conditional rendering*: an `h(tag, props, ...children)` helper (~50-80 lines, returns a real `HTMLElement`, supports a `style` object, `class`, event handlers, and nested arrays) collapses the `createElement`+`Object.assign` boilerplate to declarative calls without a VDOM. This is the "Option C escape hatch" from spec 11, promoted to default because the section count is large (11 sections x many rows).
   - *Re-render-on-select state loss* (spec 11 Section 1: `selectElement` destroys+recreates `PropertyPanel`, resetting `activeTab` to `design` on every click): solve with a keyed `reconcile(parent, key, renderFn)` that **preserves the panel shell + tab state across selection changes** and only re-renders the section list body keyed on `selectedElement.selector` (matching Retune's `key={selectedElement.selector}` remount-the-body-not-the-shell behavior). Tab pill position, scroll, and open dropdowns survive.

### What it means for the build

- **`build.js`**: unchanged. No JSX loader, no `jsxImportSource`, no Preact in the graph. Stays a single `core/index.ts` -> `dist/justify-core.js` IIFE, `format: iife`, `globalName: Justify`, `target: es2022`. Adapters stay thin mount shims.
- **`core/index.ts`**: unchanged entry/wiring. `ManipulateMode` still constructed in `switchMode('manipulate')` with `(overlay, previewEngine, changeBuffer, transport)`.
- **New file `core/manipulate/h.ts`** (~80 lines): the hyperscript + `reconcile` helper. Pure, no deps. This is the only structural addition.
- **`core/manipulate/property-panel.ts`**: reconcile in place. Migrate its `createElement` blocks to `h()` incrementally (section by section, as each section is reworked - not a big-bang rewrite). Keep the existing token map, primitives, and scrub.
- **`core/manipulate/index.ts`**: change `selectElement` so it does NOT destroy the panel shell; instead call `panel.update(controls, computedStyles)` which reconciles the body and preserves tab/scroll state. (Fixes the tab-reset bug.)
- **`core/manipulate/icons.ts`**: keep. Already verbatim-extracted (self-described from "reference tool v0.7.6"). Cross-check each `d=` against specs 08/06/04/03 byte-for-byte; add the currently-missing verbatim glyphs the new sections need (see Section 3).
- **`core/manipulate/scrub.ts`**: keep. Exact Retune match (1px=1 step, Shift x10, Alt x0.1). Make it the single scrub source; `handles.ts` must adopt its math (spec 11 flags `handles.ts` uses `delta/2*step`, divergent).
- **`core/manipulate/state-toggle.ts`**: delete after folding trigger-state into the Scope section's Trigger row (spec 05 Section 6).
- **`core/manipulate/box-model.ts`**: this is a *static diagram*; Retune's actual feature is the live on-element box-model **hatch overlay** driven by `onPropertyHover` (spec 10 Section 10). Replace box-model.ts's diagram with the hatch-overlay behavior, or delete it and build the hatch overlay fresh in the overlay layer.

---

## 2. FRESH vs RECONCILE per module

Verdicts are per the consolidated specs. "Fresh" = build new against spec. "Reconcile" = keep existing Justify code, wire/fix/extend to match spec.

| Module / area | Verdict | Rationale (spec ref) |
|---|---|---|
| **Panel shell** (`.retune-panel`, container, scrollbar hide, enter/exit anim) | **Reconcile** | Justify's container is ~exact (280px, radius 16, shadow, EASING) but lacks the `retune-panel-anim` entering/exiting state machine and bottom 68px math is present. Add anim wrapper + verify shadow string. (01 S5, 11 S2.1) |
| **Theme / tokens** | **Reconcile + extend** | Dark map exists and is close; **light theme + system toggle are missing entirely**. Add full light semantic table and a `:host(.dark)` equivalent toggle. Add the black/white opacity ramps as first-class tokens rather than pre-resolved values. (01 S2, 11 S2.1) |
| **Tab bar + sliding pill** | **Reconcile** | Present and faithful (8px pad, pill `input-bg`, EASING, JS-positioned). Keep; ensure first-render no-slide flag. (01 S6, 11 S2.2) |
| **Section/Row/Field primitives** | **Reconcile** | Justify's `createSection`/`makeSectionHeader`/`makeSectionBody`/rows match spec px. Keep, migrate to `h()`. Note: header has NO chevron; "+ add" is a Plus button in the action slot; variable hexagon fades in on section hover. (02 all) |
| **Section header `+`/`-` + variable hexagon** | **Reconcile** | Add the hover-reveal `.retune-variable-action` header treatment (transparent->text-secondary on section hover). (02 S4) |
| **PositionSection** | **Reconcile** | Alignment button-pairs + Type select exist. Add proper enable/active logic (flex/grid/abs derivations), ConstraintsInput pin-box, relative Offsets, sticky offset. Replace the hardcoded `#D97757` orange dot. (03 S3, 11 S2.6) |
| **LayoutSection** | **Reconcile + extend** | Display segmented + flex alignment grid + gap exist. **Grid block (GridPicker + row/col gap) is missing** though detected. Build GridPicker; wire reverse/wrap. (03 S4, 11 S2.7) |
| **SpacingSection** | **Fresh-ish reconcile** | Add collapsed (2-axis ShorthandInput) vs expanded (4-side NumberInput) modes; the split button is currently dead. Wire expand/collapse. (03 S5, 11 S2.8) |
| **SizeSection** | **Reconcile + extend** | Width/Height combo + lock exist but **aspect-lock, fill/hug detection, add-constraint min/max menu, unit chevron menu are dead/missing**. Build the sizing matrix (`sizing-utils`), constraints menu, real aspect lock. (03 S6, 11 S2.9) |
| **TypographySection** | **Reconcile + extend** | Size/weight/line-height/letter-spacing/color/align exist. **Font picker (FontInput) opens nothing**, and expanded block (style/decoration/transform/whitespace/truncate/word-break/list-style) is missing. Build FontInput + AdjustSmall expand block. (04 S4-5, 11 S2.10) |
| **FillSection / Appearance** | **Reconcile** | Add-on-demand fill matches conceptually. Wire gradient mode handoff to GradientEditor (deferred-but-stubbed; see Open Decisions). (04 S?, 11 S2.11) |
| **BorderSection** | **Reconcile** | Add seed exists; wire the width split-button (dead today) to expanded per-side; verify color/width/style. (04, 11 S2.11) |
| **ShadowSection** | **Reconcile** | Single-shadow parse/serialize present and matches `shadow-utils`. Keep; verify default `0px 4px 8px 0px rgba(0,0,0,0.15)`. (05 S3, 11 S2.11) |
| **FiltersSection** | **Reconcile + fix** | Rows exist but slider is **click-only, not draggable** and no add-menu Layer/Backdrop split. Replace with real SliderInput (drag + ticks) and the Layer/Backdrop add DropdownMenu. (05 S4, 11 S2.11) |
| **ImageSection (Image/Video/Background)** | **FRESH** | Entirely missing in Justify (no object-fit/position, no Video controls, no background-image controls). Build all three sub-sections. (05 S5, 11 S2.4) |
| **ScopeSection (selector pills + Trigger)** | **FRESH** | Justify has a single hardcoded non-functional "This instance" pill + dead Trigger select. Build the real scope-level pills, bridge animation, functional Trigger pseudo-state. Depends on identifier scoring (Section, see engine). (05 S6, 10 S11, 11 S2.5) |
| **Core controls** (NumberInput, Combo, Select, Segmented, Shorthand, Constraints, AlignmentGrid, GridPicker, TextInput, SliderInput) | **Reconcile (existing) / FRESH (missing)** | NumberInput/Combo/Select/Segmented/AlignmentGrid exist and are faithful; ShorthandInput, ConstraintsInput, GridPicker, SliderInput, TextInput need building/fixing. (06 all) |
| **DropdownMenu** (dark, fixed palette, scroll indicators, macOS position) | **FRESH** | Justify's `makeSelectControl` has an inline dropdown but not the fixed-dark `retune-menu-wrapper` with heading/separator/scroll-indicator + `calcMenuPosition`. Build it; Select/Combo/Size-menu/Filter-menu all consume it. (06 S11, S16) |
| **Tooltip** (dark, caret, portal, delay) | **FRESH** | Build the `.retune-tooltip` portal component with caret-x/y and side flipping. Used everywhere. (06 S12, 01 S9) |
| **ChangeIndicator** (reset dot) | **Reconcile** | Justify has `makeResetDot`; align to `top:-8px;right:-8px`, 6px blue dot + 3px surface ring, "Reset property" tooltip, native pointerdown. (06 S13, 04 S2.7) |
| **VariableAction / tokens** | **DEFER (stub)** | Token features (hexagon, VariableDialog, variable-applied states, TokenPicker) are deferrable for initial parity. Render bare inputs; leave hooks. (04 S2.8, 07 S8) |
| **ColorInput** | **Reconcile + extend** | Justify has a swatch+hex+opacity inline; align to `.retune-color-row` exact (split swatch <100% opacity, None slash, opacity section). (07 S1) |
| **ColorPicker** (SV/hue/alpha, eyedropper, hex/RGB) | **FRESH** | Not present. Build the floating picker + `color-utils` math. (07 S2) |
| **GradientEditor / GradientStopBar** | **DEFER** | Out of initial Design-panel parity (Fill defaults to solid). Stub the fillMode handoff. (07 S4-6, Open Decisions) |
| **FloatingDialog shell** | **FRESH** | Needed by ColorPicker (and later token/gradient dialogs). Build per 07 S3. |
| **Icons** (`icons.ts`) | **Keep + extend** | Verbatim asset layer. Cross-check against specs 03/04/06/08; add missing verbatim glyphs (pin-line, padlocks, eyedropper, unlink, close-X, slider has none). (08 all, 11 S7) |
| **Engine: live-preview** | **Reconcile** | Justify has `preview-engine.ts`; align to Constructable-sheet `!important` model + breakpoint `@media (max-width)` wrap + insertRule/rebuild semantics. (09 S4) |
| **Engine: change-tracker** | **Reconcile + extend** | Justify has `change-buffer.ts`; the canonical unit `{selector, property, from, to, breakpoint?}` + 300ms coalescing + undo/redo groups + reset/silentRevert needs building to match. (09 S5) |
| **Engine: inspector/styles** (getRelevantStyles, ALL_PROPS, expandShorthands, getScopedStyles, getPseudoStateStyles, detectLayoutMode) | **Reconcile + extend** | Justify has `getComputedStylesSubset`; align to the exact ordered `ALL_PROPS`, `normal->0px` for gaps, shorthand expansion, scoped/owned-property reads. This feeds every section's row list. (09 S1-2) |
| **Engine: style-source / candidates / output** | **DEFER (partial)** | Cascade-source + token enrichment + agent markdown output are needed for *Apply quality* but not for *panel visual parity*. Justify already pushes `{selector,property,old,new}` via transport. Defer rich enrichment; keep the basic change emit. (09 S3,6,7) |
| **Selection / picker / Design entry** | **Reconcile** | Justify's select->detect->panel flow is sound. Fix panel state-loss (Section 1). Add scope-highlight pools + box-model hatch overlay (`onPropertyHover`) + the `inspectElement` fields the panel needs (computedStyles, scopeLevels). (10 all, 11 S1) |
| **`control-detector.ts`** | **Reconcile** | Keep group detection; add Image/Video/SVG/background-image detection. Decide data-driven-vs-hardcoded (Open Decision). (11 S5) |
| **`handles.ts`** | **Reconcile + verify** | Confirm attach site (possibly orphaned); unify scrub math with `scrub.ts`; clarify resize-edits-size vs padding/margin/radius intent. (11 S6) |
| **`state-toggle.ts`** | **DELETE** | Orphaned, off-palette; fold into Scope Trigger. (11 S4) |
| **`box-model.ts`** | **REPLACE** | Static diagram -> live hatch overlay (10 S10) OR delete. (11 S3) |

---

## 3. BUILD SEQUENCE (Design-panel parity, smallest-verifiable-first)

Ordered so every step is independently verifiable against the playground before the next begins. Elements tree, comments, component-props, gradient editor, and token system are deferred (see Open Decisions). Each step ends with a verification gate (Section 4) and a per-task beat write.

1. **Hyperscript + reconcile helper** (`core/manipulate/h.ts`). Verify: unit test that `h()` builds the expected DOM and `reconcile()` preserves a keyed child across re-renders without re-creating it.
2. **Theme/tokens: full light + dark + ramps + `:host(.dark)` toggle.** Verify: computed `--justify-*` values for both modes diff-match the spec 01 tables exactly (scripted color-mix resolution check, not eyeball).
3. **Panel shell + enter/exit anim + tab bar/pill.** Verify: 280px width, radius 16, shadow string, `right:16px;bottom:68px`, `calc(100vh-84px)`; pill slides on tab change, no slide on mount; side-by-side screenshot vs playground empty panel.
4. **Core control primitives, missing/fixed ones first:** Tooltip -> DropdownMenu -> NumberInput -> ComboInput -> SelectInput -> SegmentedControl -> ShorthandInput -> SliderInput -> TextInput -> ChangeIndicator. Build/verify ONE at a time against spec 06; each gets its own screenshot + interaction (scrub, type, arrow-key, open dropdown) before the next.
5. **Inspector/styles engine** (`ALL_PROPS` ordered set, `normal->0px`, expandShorthands, detectLayoutMode, getScopedStyles). Verify: for a fixture element, the camelCase computed-style record matches the property set/order and gap normalization in spec 09.
6. **One section end-to-end as the template: SpacingSection.** It exercises Row/Field, ShorthandInput collapsed mode, NumberInput expanded mode, split-button toggle, change dots, scrub, and `onPropertyHover`->box-model. Verify: collapsed/expanded toggle, scrub all 4 sides, every px/color matches spec 03 S5, side-by-side vs playground.
7. **Box-model hatch overlay** (`onPropertyHover` -> live on-element hatch). Verify: hovering each padding/margin/gap input paints the correct region with the correct hatch color (10 S10); replaces `box-model.ts`.
8. **Remaining box-model sections in spec order:** PositionSection (incl. ConstraintsInput pin-box) -> LayoutSection (incl. GridPicker + AlignmentGrid grid block) -> SizeSection (sizing matrix + aspect lock + min/max menu). One at a time, each verified vs spec 03 + playground.
9. **TypographySection** (FontInput + expanded block) -> verify vs spec 04 S4-5.
10. **ColorInput + FloatingDialog + ColorPicker** (SV/hue/alpha/eyedropper/hex/RGB). Verify color math (`color-utils`) and visual vs spec 07; this unblocks Fill/Border/Shadow color rows.
11. **FillSection (solid only) -> BorderSection -> ShadowSection -> FiltersSection.** Filters needs the real draggable SliderInput + Layer/Backdrop add-menu. Verify each vs specs 04/05.
12. **ImageSection (Image/Video/Background)** - fresh. Verify object-fit/position, video Yes/No toggles, background size/position/repeat vs spec 05 S5, gated by `isImage||isVideo||hasBackgroundImage`.
13. **ScopeSection** - identifier scoring (`getSelectorCandidates`/`getAncestorScopes`/`buildScopeLevels` from spec 10 S11) + scope pills + bridge animation + functional Trigger pseudo-state. Delete `state-toggle.ts`. Verify pills, bridge motion, and that forcing `:hover` applies pseudo styles.
14. **PropertyPanel orchestration: exact section order + conditional guards** (spec 01 S7.1 / 02 S9). Verify the 11-section order and every render guard (`!isSvgChild`, `frameDimensions`, `isImage||isVideo||hasBackgroundImage`, `isText`, reduced prop sets for Spacing/Border).
15. **Live-preview + change-tracker reconcile** to the `{selector,property,from,to,breakpoint?}` model + 300ms coalescing + undo/redo. Verify: an edit previews via `!important` Constructable sheet, detach reverts, a scrub gesture coalesces to one undo step.
16. **Selection state-preservation fix** (`selectElement` reconciles body, preserves tab/scroll). Verify: switch selection between two elements while on a non-default state; tab and scroll persist (the spec-11 bug is gone).
17. **Claudebar integration (one-task-per-element)** - wire the panel's change emit into Justify's existing transport/changes-panel so each selected element's edits become one task. Verify: editing element A then B produces two distinct, correctly-scoped change groups in the changes panel.
18. **Hot-refresh / Changes-panel reuse** - reuse Justify's existing `changes-panel.ts` rendering for the accumulated `ElementChange[]`; confirm reset-all and per-property reset round-trip. Verify end-to-end against a live page.
19. **Reduced-motion pass** - reproduce the `@media (prefers-reduced-motion: reduce)` zeroing block (spec 01 S10, flagged unread in 06). Verify with the reduced-motion media emulation.
20. **Full-panel QA gate** (Section 4) across element types: text, flex parent, grid parent, absolute, image, video, bg-image, svg-child.

---

## 4. VERIFICATION PROTOCOL

Two independent checks must BOTH pass per step: exact-value diff against source, and visual side-by-side against the running playground. No step is "done" on a 200/renders-without-error basis.

### Playground setup (localhost:3002)

- Run the Retune playground/overlay on `http://localhost:3002` as the **primary reference**. (If the live `packages/overlay/src` is retrievable per Section 0, `npm run dev` in that package; otherwise stand up the published `retune` README's documented dev harness. The exact start command is an Open Decision pending source confirmation - capture it as a `reference_cmux_browser.md` beat for this project once confirmed.)
- `retune.dev` is the **secondary** live reference for any behavior the local harness can't reproduce.
- Record the cmux surface id + URL as a project beat before any cmux screenshotting (per the cmux reference rule).

### A. Exact-value diff (against source, not eyeball)

- **Tokens/CSS**: script the resolution of every `--justify-*` against the spec 01/03/04/05/06/07 tables (resolve `color-mix` numerically) and assert equality for BOTH light and dark. Any drift fails.
- **Dimensions/typography**: assert the literal px/weight/letter-spacing/line-height values from the specs on each built control (32px height, 8px radius, 11px/450/-0.005em input text, 44px headers, 12px/500/20px titles, 280px panel).
- **Icons**: every `d=` attribute in `icons.ts` must equal the spec 08/06/04/03 path data **byte-for-byte**. Grep-compare; any single-char diff fails (per team icon rule).
- **Behavior constants**: scrub (1px=1step, Shift x10, Alt x0.1), segmented pill transition `200ms cubic-bezier(0.77,0,0.175,1)`, panel anim `150ms cubic-bezier(0.23,1,0.32,1)`, coalesce 300ms, debounce 50ms, click-radius 5px - assert each against the spec value.
- **Load-bearing glyphs**: placeholder is EN DASH U+2013 (not hyphen); grid label is U+00D7; selection badge uses U+00D7; output strings use U+2014/U+2192/U+00D7. Assert the actual code points.

### B. Visual side-by-side (against playground:3002)

- For each built control/section: open the same element type in the playground and in Justify, screenshot both via cmux (`--out /tmp/<name>.png`), **Read each screenshot**, and describe the diff. Match border-radius, spacing, color, typography, and every state (rest/hover/focus/active/selected/disabled).
- **Interactive verification via real input only** (no synthetic events, no JS state mutation, no computed-style probing): scrub a NumberInput by dragging, type into an input, open a dropdown by clicking, slide a SliderInput by dragging, toggle a SegmentedControl, expand/collapse Spacing, hover a padding input and confirm the box-model hatch paints. Screenshot each result.
- **Scroll check**: the panel body has `overflow-y:auto`; wheel-scroll it and confirm it responds (watch for any smooth-scroll hijack).
- **Reduced-motion**: emulate `prefers-reduced-motion: reduce` and confirm animations are zeroed.

### C. Per-element-type completeness matrix (final gate)

Run the full panel against: plain text element, flex parent, flex child, grid parent, grid child, absolutely-positioned, image, video, background-image element, and an svg-child. Confirm the correct sections appear/hide per the spec 01 S7.1 guard table and that each renders 1:1.

---

## 5. TOP OPEN DECISIONS (manager sign-off before build)

1. **Source availability (BLOCKING).** Is the live Retune `packages/overlay/src` `.tsx`/`overlay.css` tree retrievable on disk? If yes -> use it as the verbatim-diff oracle and confirm the `localhost:3002` dev command. If no -> confirm the 01-10 specs are the accepted source of truth and how to stand up the playground for visual diffing. The plan proceeds either way, but the verification oracle and playground-start command depend on this.

2. **Render architecture confirmation.** Approve **Option B+ (imperative + tiny `h()`/`reconcile` helper, no Preact)**. The alternative on the table is plain imperative (B). If the manager wants Preact (A) anyway, that reverses point 11.8 and changes `build.js`; it should be an explicit override, not a default.

3. **Token / design-variable system: defer for v1?** Recommended: DEFER the entire variable layer (VariableAction hexagon, VariableDialog, ColorPicker Variables tab, TokenPicker, change-tracker variable links, candidate enrichment). It is a large surface and not required for visual panel parity. Confirm v1 ships bare inputs with stubbed hooks.

4. **Gradient editor: defer for v1?** Recommended: DEFER GradientEditor/GradientStopBar; Fill ships solid-only with the fillMode handoff stubbed. Confirm.

5. **Light theme + system toggle: in scope for v1?** Retune has light+dark+system; Justify is dark-only. Recommended: BUILD the light theme now (it is pure token work and the audit calls it a gap). Confirm it is in v1 scope vs deferred.

6. **`control-detector.ts` as single source of truth?** Either make the panel consume `ControlDefinition[]` arrays (data-driven, closer to a declarative model and a natural fit for `h()`), OR strip the unused arrays and keep hardcoded controls. Recommended: data-driven, since `h()` makes it cheap. Confirm direction before reworking sections.

7. **`handles.ts` semantics.** Retune's "resize by dragging" edits width/height; Justify's `handles.ts` edits padding/margin/radius. Is that a deliberate scope difference or a divergence to fix? Also confirm whether `handles.ts` is attached at all (possible orphan). Needed before the SizeSection/handles work.

8. **Apply-pipeline richness for v1.** The engine's cascade-source resolution, token/class candidate enrichment, and agent-markdown `output.ts` formatting are deferrable without affecting panel parity. Recommended: ship v1 with Justify's existing `{selector,property,old,new}` emit and defer rich enrichment. Confirm.

9. **Specificity fidelity.** `getScopedStyles` approximates specificity as class-token count; `style-source` sorts only by inline/!important + CSSOM order. Recommended: keep the approximations for v1 (they match Retune). Confirm we are not committing to true specificity computation now.

---

## 6. Files touched / created (forward map)

- New: `core/manipulate/h.ts` (hyperscript + reconcile).
- New: `core/manipulate/sections/` (ImageSection, ScopeSection fresh; others reconciled in place or migrated here).
- New: controls for Tooltip, DropdownMenu, SliderInput, ConstraintsInput, GridPicker, ColorPicker, FloatingDialog (location TBD: extend `property-panel.ts` or split into `core/manipulate/controls/`).
- New: `core/manipulate/inspector/` (styles/ALL_PROPS, optional style-source) and `core/manipulate/engine/` (change-tracker, align live-preview).
- Reconcile: `property-panel.ts`, `index.ts` (manipulate), `control-detector.ts`, `handles.ts`, `scrub.ts` (keep), `icons.ts` (extend), `core/preview-engine.ts`, `core/change-buffer.ts`.
- Delete: `state-toggle.ts`. Replace: `box-model.ts` (-> live hatch overlay).
- Unchanged: `build.js`, `core/index.ts` entry/wiring (only the `selectElement` reconcile fix).
