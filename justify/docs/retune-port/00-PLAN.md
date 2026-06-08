# 00 - Retune Design-Panel Port: Build Plan + Synthesis

Synthesizes specs 01-11. This is the authoritative build plan for porting Retune's
Design panel into Justify. It resolves every cross-cutting open question raised by the
area analysts, states the render-architecture call, fixes the isolation strategy, draws
the WordPress-target reproducibility line, and orders the build smallest-verifiable-first.

Scope of THIS port: the **Design panel** (the `panelTab === "design"` branch) and the
selection model that feeds it. The Elements tree (DOM tree tab) is explicitly deferred.

Collaborator: Jonah (synthesizer).

---

## A. RENDER ARCHITECTURE (the decision everything hangs on)

**Decision: bundle Preact (`preact` + `preact/hooks` + `preact/compat`, ~4-5KB gz) and
port Retune's TSX near-verbatim. Do NOT continue the imperative-vanilla `property-panel.ts`
approach.** This confirms and adopts the recommendation in spec 11 section 5.

### Why (condensed from spec 11, with the trade resolved)
1. **Exactness is the mandate.** Retune's panel is thousands of lines of stateful JSX with
   derived values, memoized effects (tab-pill measure, scope-rail recompute, forced-state
   cleanup, segmented-pill slide). The existing 2840-line vanilla `property-panel.ts`
   already demonstrates drift from translating that by hand: dark-only theme, inert scope
   pill, no-op Trigger select, three orphaned modules. A near-verbatim JSX port preserves
   structure and behavior 1:1.
2. **Upstream tracking.** Retune is actively developed React. A Preact port pulls upstream
   changes with mechanical transforms (`react` -> `preact/compat`, swap icon import). A
   vanilla rewrite taxes every future change with a hand re-translation to imperative DOM.
3. **Cost is bounded and dev-only.** ~4-5KB gz added to a dev-time overlay already injected
   as a multi-KB IIFE over HTTP. Not a production dependency of the host app. (Real
   React+react-dom would be ~45KB - not proposed.)
4. **Correct event path.** Preact diffing keeps interdependent controls consistent without
   the full subtree teardown+rebuild the vanilla panel does on every tab switch / reselect
   (which also re-runs all cleanup arrays - a stale-listener foot-gun).

### Impact on the four anchor files
- **`build.js`** (currently esbuild IIFE, single `dist/justify-core.js`, `globalName:'Justify'`,
  `target:es2022`). Add: `preact` dep; esbuild `jsx:'automatic'`, `jsxImportSource:'preact'`;
  `alias:{ react:'preact/compat', 'react-dom':'preact/compat', 'react/jsx-runtime':'preact/jsx-runtime' }`;
  `.tsx` loader. Output contract is UNCHANGED - one IIFE bundle, Preact bundled in, no vendor
  chunk, no host runtime, daemon serving unchanged. This is ~one config block + `npm i preact`.
- **`core/index.ts`** (1707 lines, vanilla orchestrator: Overlay/Toolbar/PreviewEngine/
  ChangeBuffer/Transport). **Keep.** It already owns the shadow host, the constructable-sheet
  preview engine, the change buffer, the transport to the daemon on :9223, and font injection.
  The only change: where it lazily constructs `ManipulateMode`, that mode now mounts a Preact
  tree into the shadow container instead of building DOM imperatively.
- **`core/manipulate/property-panel.ts`** (2840 lines). **Fresh-rewrite / replace** as a
  near-verbatim Preact port of Retune's `PropertyPanel.tsx` + the `ui/sections/*` + the
  `ui/section.tsx` framework + the control primitives.
- **`core/manipulate/index.ts`** (`ManipulateMode`). **Reconcile.** Keep the lifecycle +
  transport/changeBuffer/preview/overlay wiring; replace the inline hover/select internals
  with a port of Retune's `picker.ts` + the `onSelect` orchestration (spec 10).

### Render boundary (matches Retune itself)
- **Preact (our render layer):** PropertyPanel, all sections, all control primitives,
  pickers/dialogs, ComponentSection (stub on non-React hosts), SettingsPanel, BoxModelOverlay,
  the panel shell + tab bar.
- **Vanilla TS (ported near-verbatim from Retune's already-vanilla source):** `picker.ts`
  (hover/click/stack-cycle/resize/reposition/reorder), `identifier.ts` (selector generation +
  class classification; React-fiber functions become optional no-ops), `inspector/styles.ts`,
  `inspector/style-source.ts`, the engine (`live-preview`, `change-tracker`, `output`,
  `candidates`). These have no React in Retune and stay framework-free in Justify too.

---

## B. ISOLATION STRATEGY (open question d + spec 01)

**Retune isolates via Shadow DOM:** `:host { all: initial; ... }`, dark mode `:host(.dark)`,
all popovers at `z-index 2147483647` to escape stacking. **Justify ALSO already has a single
shadow host** - `core/index.ts` builds `Overlay` via `attachShadow({mode:'open'})` and exposes
`getShadowRoot()` (spec 11 section 1; spec 10 section 10 confirms `mount.ts`'s pattern "maps 1:1
to Justify's existing Overlay").

**Resolution: keep Shadow DOM. The isolation ports MECHANICALLY 1:1 - do NOT re-home to a scope
class.** The premise in the brief ("Justify injects with no shadow root") is corrected by the
spec-11 audit: Justify's `Overlay` is a shadow host today. Concrete consequences:
- `:host` / `:host(.dark)` selectors port verbatim; `.dark` is toggled on the shadow host.
- `all: initial` stays - it is what makes the panel immune to host-page CSS. Keep it.
- Preact renders into the `data-retune-container`-equivalent element inside the shadow root
  (Retune uses `createPortal(..., container)`; `preact/compat` provides `createPortal`).
- The CSS is shipped as a constructable stylesheet on `adoptedStyleSheets` (Justify's
  PreviewEngine already uses this exact mechanism for live preview - same primitive).
- Outside-click suppression: replicate `mount.ts`'s host-level `stopPropagation` for
  `click/pointerdown/mousedown/focusin/focusout` originating inside the shadow root.

**The one genuine isolation caveat to encode:** popovers/menus/tooltips/dialogs use
`position:fixed` + `z-index:2147483647` and are portaled. Inside a shadow root that is the
correct escape and ports directly. Keep the max-int z-index.

This means open question (d) resolves to "no re-homing needed" - a strictly easier outcome
than the brief assumed.

---

## C. WORDPRESS TARGET - what is fully 1:1 vs inherently React-app-only (open questions b, e)

Justify's primary target is arbitrary live pages (incl. WordPress/PHP), NOT a React dev build.
The portable core is **CSS-property diff + selector + style-source**. Some Retune features
depend on React dev instrumentation (`_debugSource`, fiber props, `propChanges`) that does not
exist on a PHP-rendered page. The line:

### Fully reproducible on ANY target (ship these)
- Every CSS-property section: Position, Layout, Spacing, Size, Typography, Fill, Image (incl.
  HTML-attribute writes), Border, Shadow, Filters. All driven by computed styles + the inspector.
- All control primitives (Number/Slider/Segmented/Select/Combo/Text/Shorthand/Constraints/
  Alignment/Grid/Dropdown/Tooltip/ChangeIndicator/Color/Gradient).
- Selection by direct DOM click (picker), hover overlay, on-element resize/reposition/reorder,
  box-model overlay.
- The engine: `getScopedStyles` (edit-the-class-not-the-element), live preview, change tracking,
  undo/redo, markdown output.
- **Scope rail** - the class/ancestor scope levels come from `identifier.ts`'s stylesheet +
  name-pattern classifier, which is **framework-agnostic vanilla TS**. The scope rail is portable.
- **Forced pseudo-state** (`:hover/:focus/:active`) - backed by `getPseudoStateStyles` reading
  the host page's stylesheets. Portable. (Resolves the wired-vs-stub half of (b): the inspector
  layer IS in scope; `getPseudoStateStyles` + `getStyleSources` + `getScopedStyles` are required
  ports, not stubs.)

### React-app-only -> stub / degrade gracefully on a WP target (open question e, p)
- **ComponentSection** (React props/state/variants from a design-system manifest). Renders only
  when `manifest + reactProps` present. On WP: `getDirectReactComponent` etc. return nothing, so
  ComponentSection returns `null`. Build it, but it is inert on non-React pages. **Ship Design
  parity WITHOUT it first** (resolves (p)).
- **`sourceFile` (`file:line:col`)** in output - empty on WP; the output formatter omits it.
- **`propChanges`** (React prop edits) - no path on WP; the attributeChanges/CSS-diff paths cover
  the real editing surface.
- **Token-suggestion layer** (`candidates.ts` recommended tokens + `tokens.ts` host-page token
  scan + variables/resolver). This degrades gracefully: VariableAction renders `null` when no
  tokens exist, scrub/commit core is fully standalone. **Defer the token layer to a later phase;
  ship raw CSS diffs first** (resolves (p)).

**Net:** Design-panel parity is ~95% reproducible on WordPress. The only inherently-absent
pieces are React-introspection niceties (component props, source-file attribution), which
degrade to no-ops without breaking the editing flow.

---

## D. RESOLVED OPEN QUESTIONS (the explicit 1:1 calls)

Each is a binding decision for the implementers.

| # | Question | Decision |
|---|---|---|
| (a) | Preact port vs keep 2840-line vanilla panel | **Preact port.** See section A. The sunk cost is abandoned; exactness + upstream tracking win. |
| (b) | Are inspector deps (`getPseudoStateStyles`/`getStyleSources`/`getScopedStyles`) in scope or stubs? | **In scope - required ports.** Scope rail + forced pseudo-state + Trigger are first-class. Only `ComponentSection`/manifest is host-React-gated (degrades to null). |
| (c) | Icon coverage gaps | **41 icons total** (33 filled 24x24 in `icons.tsx` + 8 stroked 20x20 in `spacing-icons.tsx` + Check 16x16 is among the 33). Custom Figma-style set, NOT in any stock library. Copy verbatim (spec 08). Plus the inline SVGs that are NOT in the icon files: SizeSection aspect-lock padlock (open/closed, 24x24), ConstraintsInput PinLine, AlignmentGrid position icons, ColorInput None diagonal, gradient/checkerboard art. Do a verbatim top-up pass for these. **Source EVERYTHING verbatim; the icon-source/"never fabricate SVG" rule is satisfied because these are copied character-for-character from Retune source, not redrawn.** |
| (d) | Shadow DOM vs scope class re-homing | **Keep Shadow DOM.** Justify already has a shadow host; isolation ports 1:1. No re-homing. See section B. |
| (e) | WP target: which features stub | See section C. CSS-diff + selector + style-source + scope + pseudo-state = full. ComponentSection/sourceFile/propChanges/token-suggestions = stub/defer. |
| (f) | Section collapse chevron | **No collapse. Match Retune.** There is NO collapse chevron in Retune's section framework (spec 02 section 1). Sections are conditionally rendered, never collapsed in place. Do not invent one. The only in-section expand toggles are the padding/margin/radius/border 2-axis<->4-side `retune-split-btn` and the Typography "more options" toggle - those are real and ported. |
| (g) | SpacingSection + BorderSection trimmed prop set | **Replicate exactly - keep them as the two documented exceptions.** They receive `s, onPropertyChange, onPropertyHover, variable/change helpers` only, NOT full baseProps. Do not unify; mirror Retune so behavior matches. (If a later cleanup unifies, it must be behavior-preserving and noted.) |
| (h) | Browser target (`color-mix`, `interpolate-size: allow-keywords`) | **Modern evergreen only (last ~2 years of Chrome/Edge/Safari/Firefox).** Justify is a dev-time tool the developer runs on their own machine - not shipped to end users - so a modern target is acceptable. `color-mix` is widely supported; `interpolate-size: allow-keywords` is Chromium-only and used only to animate to/from `auto` (a progressive enhancement - panel still works without it). Encode: do not polyfill; document the requirement. |
| (i) | Selector generator is upstream of everything | **First-class build item, built FIRST.** `getScopedStyles` scoping AND live-preview targeting both degrade without a robust generator. Port `identifier.ts` (`@medv/finder` + class filter rejecting hashed `_*`/`css-*`/long-hash classes + nth-of-type fallback) and `getSelectorCandidates`/`getAncestorScopes` as Phase 1. |
| (j) | Image/Video controls write HTML ATTRIBUTES not CSS | **Add an ATTRIBUTE variant to the change model.** The `{selector, property, oldValue, newValue}` CSS model needs a sibling `{selector, attribute, oldValue, newValue}` path. Source: `onAttributeChange(attr, oldVal, newVal)` writes `loading/alt/autoplay/loop/muted/controls` directly on the element. It rides the send-to-Claude pipeline via the tracker's `recordAttributeChange` -> `attributeChanges:[{attr,from,to}]` on the ElementChange -> output renders a `### Attribute Changes` (or `### SVG Attribute Changes`) table (spec 09 stage 3d/5). Keep attribute changes distinct from CSS in the buffer and in output. |
| (k) | Shadow editing only first box-shadow layer | **Match Retune: single-layer.** `parseBoxShadow` parses only the first layer; multi-layer shadows are flattened to the first on edit. Document the limitation; do not add multi-layer support in the parity port. |
| (l) | Corner-radius shorthand order | **TL, TR, BR, BL (clockwise).** Encoded for ShorthandInput props order: `["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"]`. NOT TL,TR,BL,BR. (And `expandBorderRadius` takes only the horizontal side of any `/` slash syntax.) Easy to get wrong - flagged. |
| (m) | Dead code to NOT port | Confirmed skips: **`FLEX_BASIS_OPTIONS`** (declared in SizeSection, never rendered). **`spacing-icons.tsx`** family (8 stroked icons) - NOT imported by SpacingSection (which uses `AlPadding*` from `../icons`); port the SVGs into the icon inventory for completeness but do NOT wire them - they are an alternate/legacy set. **`TokenPicker`** (`token-picker.tsx`) - orphaned/unstyled (zero CSS in overlay.css, grep=0); do NOT port. Live token-swap is the **ColorPicker Variables tab + VariableDialog** (`.retune-variable-dialog-*` / `.retune-variable-picker` classes). Also from spec 11: current-Justify `box-model.ts`, `handles.ts`, `state-toggle.ts` are orphaned and discarded (replaced by picker.ts / box-model-overlay.tsx ports); `control-detector.ts` arrays are vestigial (replaced by computed-style section gating). |
| (n) | Shared control geometry to standardize | **32px height / 8px radius / bg `--retune-surface-hover` / label 11px / weight 450 / letter-spacing -0.005em** for nearly every control. Scrub math: **NumberInput = 1px x step** (precision = `ceil(-log10(step))`); **Combo/Shorthand = 1px = 1 integer** (no step); **SCRUB_ZONE = 16px** for label-less zone scrub. **Color/gradient pickers use document-level `pointermove`/`pointerup` drag (NOT `setPointerCapture`)** with a `dragCleanupRef` on unmount - distinct from the core inputs which DO use `setPointerCapture`. **Manual color edit auto-unlinks an applied variable** (and eyedropper too; per-gradient-stop ColorInput clears its stop's variable on manual change). **opacity is integer-percent**; `hexToRgba` serializes alpha to 2dp, returns plain hex at opacity >= 100. Encode all of these verbatim. |
| (o) | Inconsistencies needing an explicit 1:1 call | **MIRROR VERBATIM, do not tokenize.** (1) Hard-coded hex outside the token system - AlignmentGrid `#0D99FF`/`#a8a29e`, ConstraintsInput PinLine `#3b82f6`/`#d6d3d1` + center dot `#3b82f6`, GridPicker `#eeeceb`/`#3b82f6`/`#93c5fd`, gradient chit `#0d99ff`, checkerboards `#ccc`/`#e0e0e0`/`#fff` - copy as-is (they intentionally do not theme). (2) **Two focus-ring styles coexist** - core inputs use `1px solid var(--retune-border)` outline; color/gradient inputs use blue glow `box-shadow:0 0 0 1.5px rgba(59,130,246,.5)` (search `0 0 0 2px rgba(59,130,246,.15)`). **Mirror both** - they are deliberate per-control treatments. (3) **Menus/tooltips are ALWAYS dark in both themes** (menu `#1c1917`, tooltip `#1e1e1e`) - Figma-style - **confirmed, keep always-dark.** Rationale for mirror-verbatim across the board: the mandate is exactness; tokenizing would be a deviation that breaks 1:1 visual parity. If the human manager wants a tokenized cleanup, that is a post-parity follow-up (see section H decision 4). |
| (p) | preview-bridge + variables/tokens degrade gracefully | **Ship Design parity WITHOUT the token-suggestion layer first.** VariableAction renders null with no tokens; preview-bridge no-ops without the bridge; scrub/keyboard/commit core is standalone. Token layer (`candidates.ts`, `tokens.ts`, variables/resolver/registry, ColorPicker Variables tab, VariableDialog) is a distinct later phase. |

### Confirmed facts encoded (from the task brief)
- **Direct DOM click opens Design IMMEDIATELY** - `panelTab` defaults to `"design"`; panel
  visible the instant `selectedElement` set in edit mode. Elements tree is the secondary tab
  (deferred from this port).
- **Section compose order (vertical):** [banners] -> ComponentSection -> **Scope, Position,
  Layout, Spacing, Size, Typography, Fill, Image, Border, Shadow, Filters.** (Image sits AFTER
  Appearance/Fill, BEFORE Border.)
- **Design-language constants:** panel **width 280px** (NOT 240; the current Justify audit and
  spec 01 both say 280 - the "280px panel width" in the brief is correct), control height 32px,
  radius 8px, section/toolbar header height 44px, `z-index 2147483647`, easing
  `cubic-bezier(0.23,1,0.32,1)`, panel anim 150ms `translateY(12px)`. Panel height
  `calc(100vh - 84px)`, anchored 16px from side, 68px from bottom. `MIN_VIEWPORT_WIDTH 768`.

---

## E. FRESH-REWRITE vs RECONCILE (per module)

| Module / area | Action | Notes |
|---|---|---|
| `core/index.ts` (Overlay, Transport, PreviewEngine, ChangeBuffer, font inject) | **Keep** | Shadow host + constructable-sheet preview + transport already correct. |
| `core/manipulate/index.ts` (`ManipulateMode`) | **Reconcile** | Keep lifecycle + wiring; swap inline hover/select for ported `picker.ts` + `onSelect`. Mounts Preact tree. |
| `core/manipulate/property-panel.ts` | **Fresh-rewrite (Preact)** | Replace 2840-line vanilla with near-verbatim port of `PropertyPanel.tsx` + sections + `section.tsx`. |
| `core/manipulate/control-detector.ts` | **Fresh-rewrite (shrink)** | Replace registry with computed-style section gating (the `isText/isFlex/isGrid/isImage/...` derived booleans). Drop `ControlDefinition[]` tables. |
| `core/manipulate/scrub.ts` | **Keep / light reconcile** | `attachScrub`/`parseNumericValue`/`formatNumericValue` sound. Align step/precision to Retune (1px x step, precision `ceil(-log10(step))`). |
| `core/manipulate/icons.ts` | **Keep / extend** | Verbatim set. Top-up missing glyphs verbatim (the 41 + inline SVGs per (c)). |
| `core/manipulate/box-model.ts` | **Discard + replace** | Orphan. Port `box-model-overlay.tsx` (live on-page overlay, zIndex 2147483645). |
| `core/manipulate/handles.ts` | **Discard + replace** | Orphan. On-element handles come from `picker.ts` port. |
| `core/manipulate/state-toggle.ts` | **Discard + replace** | Orphan, legacy `#D97757` accent. Forced state re-derived from `inspector/styles` (`getPseudoStateStyles`). |
| NEW: `selector/picker.ts` | **Fresh port (vanilla)** | From Retune's vanilla picker.ts. Hover/click/stack-cycle/resize/reposition/reorder. |
| NEW: `selector/identifier.ts` | **Fresh port (vanilla)** | Selector gen + class classifier + ancestor scopes. React-fiber fns optional no-ops. |
| NEW: `inspector/styles.ts`, `style-source.ts` | **Fresh port (vanilla)** | ALL_PROPS allowlist, `getRelevantStyles`/`getScopedStyles`/`getPseudoStateStyles`, `getStyleSources`/`findStyleSources`. |
| NEW: `engine/*` (`live-preview` exists as PreviewEngine; add `change-tracker`, `output`, `candidates`) | **Reconcile + port** | Keep PreviewEngine; add tracker (from/to diff, undo/redo, persist), output (markdown), candidates (deferred token layer). |
| ComponentSection / SettingsPanel | **Port (Preact), gated** | ComponentSection inert on non-React hosts. SettingsPanel optional (theme toggle is useful). |
| ElementTree (Elements tab) | **DEFER** | Out of scope for Design parity. |

---

## F. BUILD SEQUENCE for Design-panel parity (smallest-verifiable-first)

Each phase ends with a runnable verify. Elements tree deferred throughout. Token-suggestion
layer + ComponentSection deferred to the tail.

**Phase 0 - Build system + render shell.**
- `npm i preact`; add esbuild JSX + alias config to `build.js`; keep single IIFE output.
- Mount a trivial Preact component into the shadow container from `ManipulateMode`.
- Verify: `node build.js` produces `dist/justify-core.js`; injected page shows the Preact test
  node inside the shadow root (curl the daemon bundle; load in browser; screenshot).

**Phase 1 - Selector generator + inspector (upstream of everything; open question i).**
- Port `identifier.ts` (`getSelector`, `getSelectorCandidates`, `getAncestorScopes`; fiber fns
  no-op). Port `inspector/styles.ts` (ALL_PROPS, `getRelevantStyles`, `getScopedStyles`,
  `getPseudoStateStyles`, `expandShorthands`, `detectLayoutMode`) + `style-source.ts`.
- Verify: on a fixture page, `getSelector(el)` returns a stable selector; `getScopedStyles`
  returns `{styles, ownedProperties}` where a `.class` edit is not contaminated by a more-specific
  variant. Unit-test against known DOM (`grep`-able assertions / console probes).

**Phase 2 - Theme + panel shell + tab bar.**
- Port `:host`/`:host(.dark)` token blocks (spec 01), `.retune-panel` shell (280px,
  calc(100vh-84px), 16/68px anchor), tab bar with sliding pill, panel enter/exit anim.
- Default `panelTab="design"`; show panel when element selected in edit mode.
- Verify: select an element -> 280px panel animates in (translateY 12px, 150ms), Design tab
  active by default, dark-mode toggle swaps tokens. Screenshot light + dark.

**Phase 3 - Section framework + control primitives (the reusable substrate).**
- Port `section.tsx` (Section/Row/Field/RowAction), section CSS (44px headers, 12px body gap,
  16/48px row padding, hover-revealed `.retune-variable-action` vs always-visible `.retune-section-action`).
- Port core controls (spec 06): NumberInput, SliderInput, SegmentedControl, SelectInput,
  ComboInput, TextInput, ShorthandInput, ConstraintsInput, AlignmentGrid, GridPicker,
  DropdownMenu (+ menu-position), Tooltip, ChangeIndicator. Encode scrub math per (n).
- Verify: a primitives sandbox section renders each control; scrub a NumberInput (1px x step,
  unit preserved), slide a Segmented pill, open a Select dropdown (macOS aligned), type+commit a
  Combo. Real-input interaction screenshots per Verification Protocol.

**Phase 4 - Static-value sections (no special pipelines).**
Build in this order (each independently verifiable against a fixture element):
1. Position (alignment grid, type select, constraints, offsets, sticky).
2. Layout (display segmented, flex/grid controls, AlignmentGrid, gap).
3. Spacing (padding/margin, 2-axis<->4-side split, trimmed props per (g)).
4. Size (Fill/Hug/Fixed via sizing-utils, aspect lock inline SVG, min/max extras, frame mode).
5. Typography (gated `!isText` -> null; font input dialog, combos, align, expanded options, truncation).
6. Border (add/remove, color, width split, style; corner-radius lives in Fill/Appearance with TL,TR,BR,BL order per (l)).
- Verify per section: edit each control -> computed style changes on the live element via preview
  (`!important` constructable sheet); ChangeIndicator dot appears; reset reverts. Diff the
  emitted `{selector,property,oldValue,newValue}` against the manual edit. Screenshot each.

**Phase 5 - Color + gradient + the Fill section.**
- Port `color-utils`, ColorInput (split swatch, opacity integer-%, None detection),
  ColorPicker (SV/hue/alpha document-drag, hex/RGB, eyedropper feature-gated), FloatingDialog,
  gradient-utils, GradientEditor, GradientStopBar. Then FillSection (Appearance/Fill/SVG variants,
  fill-mode select, gradient editor). Focus-ring + hard-coded hex mirrored verbatim per (o).
- Verify: pick a color (drag SV square with real pointer events), set opacity < 100 (split swatch
  + checkerboard), build a 3-stop linear gradient, rotate/reverse. Confirm `backgroundImage`
  output string matches `gradientToCss` format. Screenshots of picker + applied gradient.

**Phase 6 - Shadow / Filters / Image (incl. attribute path j).**
- ShadowSection (single-layer per (k)), FiltersSection (layer/backdrop, add-filter menu hides
  used types), ImageSection (media fit/position + HTML-attribute writes via `onAttributeChange`).
- Add the **attribute change path** to tracker + output per (j).
- Verify: add a shadow (edit X/Y/blur/spread/color), add+remove a blur filter, toggle an `<img>`
  `loading=lazy/eager` and confirm the attribute (not a style) is written and appears in the
  `### Attribute Changes` output table. Screenshots.

**Phase 7 - Scope rail + forced pseudo-state (Scope section; open question b).**
- Port ScopeSection (Target rail with bridge animation, Trigger select), wire to
  `getSelectorCandidates`/`getAncestorScopes` -> `buildScopeLevels`, default index `length-2`,
  `showScopeHighlights`, and `getScopedStyles` (edit the rule not the instance). Wire forced
  state to `getPseudoStateStyles` + inline-style application.
- Verify: select an element with a class shared by siblings -> scope rail shows class + ancestor
  levels; switching scope repaints all matching elements (scope highlights); editing at class
  scope changes the rule (verify a sibling also updates); set Trigger=Hover -> :hover styles load
  and edit. Screenshots of rail + bridge animation + scope highlights.

**Phase 8 - Picker selection model + on-element chrome + box-model overlay.**
- Port `picker.ts`: hover overlay (box + badge + sibling/child dotted outlines + Alt spacing),
  click-to-cycle z-stack, selection chrome (8 handles, parent indicator, pin lines), on-element
  resize/reposition/reorder, double-click text, Escape cancel. Port `box-model-overlay.tsx`
  (live padding/margin/gap stripes, zIndex 2147483645) driven by `onPropertyHover`.
- Verify: click cycles deepest->shallower on repeat-click; drag a corner handle resizes with
  snap; hover a spacing input -> live stripe overlay on the element; reorder a flex child with
  ghost + drop line. Real-input screenshots; this is the richest interaction phase.

**Phase 9 (deferred tail) - Change tracker output fidelity + ComponentSection + token layer.**
- Full `change-tracker.ts` (undo/redo groups, coalescing 300ms, persistence), `output.ts`
  fidelity levels, then (optional) `candidates.ts` + `tokens.ts` + variables + ColorPicker
  Variables tab + VariableDialog. ComponentSection (inert on WP).
- Verify: make several edits -> undo/redo by group; reload page -> pending changes restored;
  `formatChanges` emits the per-element markdown table; on a token-bearing page, a value shows its
  matching `--token` in the Token column.

---

## G. VERIFICATION PROTOCOL (how to prove parity)

Two independent checks per ported unit, both mandatory:

1. **Exact-value diff vs source.** Every constant, option array, default, scrub formula, CSS
   value, and icon path is quoted verbatim in specs 01-08. Diff the port against the spec text
   (and against the Retune source it cites) character-for-character. Specifically verify: option
   arrays in source order; defaults (e.g. position `static`, display `block`, objectFit `fill`,
   objectPosition `50% 50%`, backgroundPosition `center center`, backgroundRepeat `repeat`);
   scrub precision; corner-radius prop order TL,TR,BR,BL; opacity integer-% + 2dp alpha; the 41
   icon paths + inline SVGs; the always-dark menu/tooltip hex; both focus-ring styles.

2. **Visual side-by-side vs the Retune playground.** Run Retune locally:
   `cd retune/playground && npm run dev` -> **http://localhost:3002**. Open the SAME fixture
   element in both Retune (localhost:3002) and Justify (injected via the daemon), and compare
   the panel region by region: dimensions (280px width, 32px controls, 44px headers), spacing
   (12px body gap, 16/48px row padding), typography (13px host / 11px controls, -0.005em,
   weight 450), colors (light + dark), control states (hover/focus/active/disabled), pill
   animations (segmented 200ms cubic-bezier(0.77,0,0.175,1), tab 200ms cubic-bezier(0.23,1,0.32,1)),
   and the scope-rail bridge animation (320ms cubic-bezier(0.77,0,0.175,1)). **retune.dev is the
   secondary reference** when the local playground is unavailable.

Per the team Verification Protocol: for every UI phase, drive controls with REAL pointer/keyboard
input (no synthetic events, no JS state mutation, no computed-style reads as a substitute),
screenshot the result, Read the screenshot, and describe it. Scrolling regions (the panel body)
must be wheel-scrolled and confirmed. cmux/Chrome MCP are the surfaces. For non-UI ports (inspector,
engine, selector) use console-probe assertions and curl against the daemon.

---

## H. TOP DECISIONS FOR THE HUMAN MANAGER (sign-off needed)

These are the calls with real cost/scope consequences where a manager should explicitly agree
before Phase 0. Ranked by impact.

1. **Adopt Preact and abandon the 2840-line vanilla panel.** This is the foundational call
   (open question a). It adds a ~4-5KB dev-only dependency and a build-config change, and it
   throws away the existing hand-written panel in favor of a near-verbatim TSX port. Everything
   downstream assumes this. **Recommend: yes** (exactness + upstream tracking). If the manager
   wants zero added dependencies, the alternative is a far slower, drift-prone vanilla rewrite.

2. **Target modern evergreen browsers only** (open question h). `color-mix` + (Chromium-only)
   `interpolate-size: allow-keywords` are used. Acceptable because Justify is a dev-time tool the
   developer runs locally, not shipped to end users. **Recommend: yes, no polyfills.** Manager
   should confirm no requirement to support older browsers in the dev environment.

3. **Ship Design parity WITHOUT the token-suggestion layer and WITHOUT ComponentSection first**
   (open questions e, p). The portable CSS-diff core lands first; React-introspection features
   (component props, source-file attribution) and the token-matching layer come later and are
   inert/degraded on WordPress targets anyway. **Recommend: yes** - it de-risks the critical path
   and matches the WP-primary reality. Manager should confirm the first deliverable is
   "Design-panel CSS parity," not "full Retune feature parity."

4. **Mirror Retune's hard-coded hex and dual focus-ring styles verbatim rather than tokenizing**
   (open question o). The non-themed blues/grays (AlignmentGrid, ConstraintsInput, GridPicker,
   gradient chit, checkerboards) and the two coexisting focus treatments are copied as-is for
   1:1 parity. **Recommend: mirror verbatim now; optional tokenized-cleanup pass post-parity.**
   Manager should confirm exactness is preferred over a cleaner-but-divergent token system.

5. **Defer the Elements tree (DOM tree tab) entirely** (already in the brief, but worth explicit
   sign-off). This port delivers the Design tab + selection model only. The Elements tab is a
   separate future effort. **Recommend: yes** - the brief already scopes it out; confirming
   prevents scope creep.

---

## Appendix: end-to-end change-model mapping (from spec 09)

Justify's `{selector, property, oldValue, newValue}` maps to Retune's nested
`ElementChange.selector` + `PropertyChange{property(camelCase), from, to, breakpoint?}`.
Pipeline: **select** (inspector seeds `oldValue` from `getScopedStyles`) -> **edit**
(`PreviewEngine.applyChange` paints with `!important` constructable sheet; tracker
`recordChange` records `{from,to}` with 300ms coalescing + undo groups) -> **diff**
(`getPendingChanges` -> flat rows) -> **enrich** (optional token layer) -> **output**
(`formatChanges` markdown). Keep keys camelCase internally; kebab only at preview-apply and
output. Add the **attribute** variant (j) as a parallel `{selector, attribute, oldValue, newValue}`
path through `recordAttributeChange` -> `attributeChanges` -> `### Attribute Changes` output.
Breakpoint is part of change identity (`selector + property + breakpoint`); carry it or scope
selectors per breakpoint. The single most important nuance: `getScopedStyles` + `ownedProperties`
("edit the class, not the element") - without it `oldValue` is contaminated and the diff lies.
