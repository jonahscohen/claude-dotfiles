# 11 - Current Justify Manipulate Audit + Render-Architecture Recommendation

Scope: read the entire current Justify Manipulate implementation, compare it against Retune's
real (React/TSX) source, decide per module whether to fresh-rewrite or reconcile, and give a
concrete render-architecture recommendation for the port.

Files read in full:
- `core/manipulate/index.ts` (204) - `ManipulateMode` orchestrator
- `core/manipulate/property-panel.ts` (2840) - the panel (tab bar, Design sections, Elements tree, all primitives)
- `core/manipulate/control-detector.ts` (159) - control registry + section gating
- `core/manipulate/box-model.ts` (242) - static box-model diagram widget
- `core/manipulate/handles.ts` (315) - on-element padding/margin/radius drag handles
- `core/manipulate/scrub.ts` (77) - drag-to-scrub + numeric parse/format
- `core/manipulate/state-toggle.ts` (95) - H/F/A/V pseudo-state pills
- `core/manipulate/icons.ts` (776) - verbatim SVG icon library
- `build.js` (58) - esbuild IIFE bundler
- `core/index.ts` (1707) - core entry; wires `ManipulateMode` into the overlay/toolbar/transport

---

## 1. How the current thing is wired

`core/index.ts` is a vanilla-TS orchestrator. It builds an `Overlay` (single shadow host via
`attachShadow({mode:'open'})`, exposes `getShadowRoot()`), a `Toolbar`, a `PreviewEngine`
(a `CSSStyleSheet` pushed into `document.adoptedStyleSheets`, `applyChange(selector,prop,value)`),
a `ChangeBuffer`, a `Transport` (HTTP to the daemon on :9223), and lazily constructs
`ManipulateMode` (index.ts:529). Fonts (`JustifySans/Serif/Mono`) are injected as `@font-face`
pointing at `http://localhost:9223/fonts/*` (core/index.ts:309-318). **No React, no Preact, no JSX
anywhere** - all UI is `document.createElement` + `Object.assign(el.style, {...})`.

`ManipulateMode` (manipulate/index.ts):
- `activate()` - `enableEventIntercept()`, `preview.attach()`, then **bubble-phase** `mousemove`
  (hover highlight + a hand-drawn tag-icon hint label) and **capture-phase** `click`.
- `onClick` -> `getElementAtPoint` -> `selectElement(el)`.
- `selectElement(el)` (index.ts:166): `generateSelector`, `overlay.trackElement`,
  `detectControls(el)`, `getComputedStylesSubset(el)`, destroy old panel, `new PropertyPanel(shadowRoot)`,
  `panel.render(controls, computedStyles)`, and wire `panel.onPropertyChange` ->
  `preview.applyChange` + `changeBuffer.add`.
- `applyChanges()` -> `transport.request('push_changes', {changes})`.

So the current selection model is: **single click selects the deepest element; the panel renders;
edits flow to a preview stylesheet + change buffer.** That is the entire interaction surface.

---

## 2. Gap analysis vs Retune (what's missing / divergent)

| Capability | Retune (real source) | Current Justify | Verdict |
|---|---|---|---|
| Click-to-cycle z-stack | `elementsFromPoint` stack, repeat-click drills up (picker.ts:2536) | single deepest hit only | missing |
| Hover overlay richness | box + badge + sibling/child dotted outlines + Alt spacing measurements | box + hand-drawn tag-icon hint label | divergent |
| Selection chrome | box + 8 resize handles + dotted parent indicator + dashed pin lines | highlight box only | missing |
| On-element resize | snap-to-sibling/parent, aspect lock, fill (picker.ts:958) | none | missing |
| On-element reposition (abs/fixed) | edge/center snap (picker.ts:1140) | none | missing |
| On-element reorder/reparent | ghost + sibling shift + drop line (picker.ts:1338) | none | missing |
| Scope rail (this instance / class / ancestor) | full multi-signal classifier (identifier.ts) | single "This instance" pill, inert (property-panel.ts:623) | missing |
| Forced pseudo-state | real :hover/:focus/:active via inspector | `state-toggle.ts` exists but **not wired**, "Trigger" select is a no-op (property-panel.ts:631) | stub |
| Box-model visualizer | live on-page overlay (box-model-overlay.tsx) | static 180x120 diagram (box-model.ts), **orphan** | divergent |
| Tabs | Elements (tree) + Design, Design default | same two tabs, Design-ish default but `activeTab='design'` (property-panel.ts:180) | close |
| Theme | light + dark + system (CSS vars) | dark only (`darkTheme` hardcoded, property-panel.ts:150) | divergent |
| Manifest / component props | `ComponentSection` reads design-system manifest | none | missing |
| Change tracking / undo / output fidelity | `ChangeTracker` + `formatChanges` fidelity levels | flat `ChangeBuffer` | divergent (see #09) |

The current Justify Design tab *does* already mirror Retune's section list well: ElementTag,
Position, Layout, Spacing, Size, Typography, Appearance, Fill, Border, Shadow, Filters
(property-panel.ts:569-588). The visual primitives are also a credible hand-port (number inputs
with scrub-on-icon, combo input with unit chevron, custom dropdown, segmented control with the
animated pill, 3x3 alignment grid, color input with swatch+hex+opacity, reset dot). The icons are
verbatim from the reference (icons.ts header). So the *look* is roughly there; the *interaction
depth and correctness layer* (scope, selection drag, pseudo-state, live box-model, manifest) is not.

---

## 3. Dead / orphaned modules in current Justify

Important for the rewrite decision - three of the eight manipulate modules are **not actually wired
into `ManipulateMode`**:

- `box-model.ts` - never imported by `index.ts` or `property-panel.ts`. Orphan. (Retune's
  equivalent is the live `box-model-overlay.tsx`, a different design.)
- `handles.ts` - never imported. Orphan. (Retune's on-element handles live inside `picker.ts`.)
- `state-toggle.ts` - never imported; uses the old `#D97757` accent, not the CSS-var theme. Orphan/legacy.

`control-detector.ts` is imported but its `ControlDefinition[]` arrays are largely **vestigial**:
`property-panel.buildDesignTab` only reads the *group names* (`hasTypo/hasFlex/hasGrid`,
property-panel.ts:572-581) to decide which sections to show; it builds each section's controls
directly from computed styles and ignores the per-control definitions. So `BOX_CONTROLS`,
`TYPOGRAPHY_CONTROLS`, etc. are mostly unused detail.

Active modules: `index.ts`, `property-panel.ts`, `scrub.ts`, `icons.ts`.

---

## 4. Per-module decision (fresh-rewrite vs reconcile)

| Module | Decision | Why |
|---|---|---|
| `index.ts` (ManipulateMode) | **Reconcile** | Keep the lifecycle + transport/changeBuffer/preview/overlay wiring; replace the inline hover/select internals with a port of Retune's picker + `onSelect` orchestration. The shell stays, the guts swap. |
| `property-panel.ts` | **Fresh-rewrite** | This is the big one. Re-author as a near-verbatim port of Retune's `PropertyPanel` (+ sections + scope rail + forced-state) in the chosen render framework. The 2840-line vanilla version is replaced, not patched. |
| `control-detector.ts` | **Fresh-rewrite (shrink)** | Retune gates sections from computed styles + element context inside the panel, not via a control registry. Replace with Retune's section-presence logic; drop the unused `ControlDefinition[]` tables. |
| `box-model.ts` | **Discard + replace** | Orphan and a different design. Port `box-model-overlay.tsx` (live on-page overlay) instead. |
| `handles.ts` | **Discard + replace** | Orphan. On-element resize/handles come from porting `picker.ts` (vanilla), which is richer and correct. |
| `scrub.ts` | **Keep / light reconcile** | `attachScrub` + `parseNumericValue` + `formatNumericValue` are sound and framework-agnostic. Keep; align step/precision with Retune's number-input behavior. |
| `state-toggle.ts` | **Discard + replace** | Orphan, legacy theme. Forced pseudo-state is a panel concern backed by `inspector/styles` in Retune (`ForcedState`, `getPseudoStateStyles`). Re-derive there. |
| `icons.ts` | **Keep / extend** | Verbatim icon set, reusable. May need additional glyphs to match Retune's `central-icons-react` usage; source those verbatim too. |

The picker/identifier/inspector/engine layers (covered in specs #09/#10) are **new ports of
Retune's already-vanilla TS** - they don't have a current-Justify counterpart to reconcile against.

---

## 5. RENDER-ARCHITECTURE RECOMMENDATION (the critical decision)

**Recommendation: bundle Preact (preact + preact/hooks, ~4KB gzip total) and port Retune's React
components near-verbatim. Do NOT hand-rewrite the panel as imperative vanilla DOM.**

### The two options, concretely

**Option A - Bundle Preact, port TSX near-verbatim.**
Retune's UI is React: `PropertyPanel`, `ComponentSection`, `ElementTree`, `SettingsPanel`,
`BoxModelOverlay`, plus the `RetuneInner` orchestrator with ~40 `useState`/`useRef`/`useCallback`
hooks. Preact + `preact/compat` is a drop-in for `react`/`react-dom` (including `createPortal`,
which `mount.ts` relies on). esbuild already supports JSX, so this is mostly a config + alias
change.

**Option B - Hand-rewrite as imperative vanilla DOM.**
Continue the current approach: every component becomes `createElement` + `Object.assign(style)` +
manual `addEventListener`/cleanup arrays, full subtree teardown + rebuild on any state change
(as `property-panel.ts` already does via `clearContainer()` + `renderTabContent()`).

### Why Preact wins

1. **Exactness.** The mandate is an *exact* port. Retune's panel is thousands of lines of stateful
   JSX with derived values, memoization, and effect-driven syncing (e.g. the tab-pill measure
   effect, scope-rail recompute on manifest change, forced-state cleanup on reselect). Translating
   that to imperative DOM is a lossy, error-prone re-derivation - the current vanilla panel already
   demonstrates drift (dark-only theme, inert scope pill, no-op Trigger select, orphaned modules).
   A near-verbatim JSX port preserves structure and behavior 1:1.

2. **Maintainability / upstream tracking.** Retune is an actively developed React codebase. With a
   Preact port, future Retune changes can be pulled with mechanical transforms
   (`react`->`preact/compat`, swap the icon import). With a vanilla rewrite, **every** upstream
   change must be hand-re-translated into imperative DOM - a permanent tax. The 2840-line vanilla
   `property-panel.ts` is already near the limit of what's pleasant to maintain by hand; Retune's
   real panel is larger.

3. **Bundle cost is small and bounded.** preact (~3KB gz) + preact/hooks (~1KB gz) ~= 4-5KB added
   to a tool that already injects a multi-KB IIFE over HTTP into a dev page. This is a dev-time
   overlay, not a production dependency of the host app - the size budget is generous. (Contrast:
   pulling real React + react-dom would be ~45KB gz - not proposed.)

4. **Correctness of the event path.** Preact's diffing keeps the panel's many interdependent
   controls consistent without the manual full-rebuild that the vanilla panel does on every tab
   switch / reselect (which also forces re-running all the `cleanups`). Fewer foot-guns around
   stale listeners.

### What Preact costs / the honest tradeoffs

- **Shadow-DOM rendering.** Preact renders into a normal element inside the shadow root (the
  `mount.ts` `container`), exactly like Retune's `createPortal(... , mount.container)`. Works
  unchanged. Event retargeting / outside-click suppression already handled by `mount.ts`'s host
  listeners.
- **`react`/`react-dom`/`central-icons-react` imports.** Map `react` and `react-dom` to
  `preact/compat` via esbuild `alias`; replace `@central-icons-react/...` icon imports with the
  verbatim `icons.ts` SVG functions (we already have them; add missing glyphs verbatim).
- **Some React-specific introspection in Retune is host-React-only** (`identifier.ts` fiber
  walking, `ComponentSection` manifest props). That's about the *inspected page*, not our render
  layer - unaffected by choosing Preact for our own UI. For a generic tool those features degrade
  gracefully to no-ops.
- **Two mental models** if we keep `picker.ts` vanilla (we should) while the panel is Preact. This
  is fine and matches Retune itself: picker.ts is vanilla in Retune too; only the panel/orchestrator
  are React.

### Build-system impact (`build.js` + bundling)

Current `build.js`: esbuild, `entryPoints:['core/index.ts']`, `bundle:true`, `format:'iife'`,
`globalName:'Justify'`, `target:'es2022'`, one `dist/justify-core.js`. To adopt Preact:

1. Add deps: `preact`, and rely on `preact/compat` + `preact/hooks` (no React).
2. esbuild config additions (all compatible with IIFE single-bundle output):
   - `jsx: 'automatic'`, `jsxImportSource: 'preact'` (or classic `jsxFactory:'h', jsxFragment:'Fragment'`).
   - `loader: { '.tsx': 'tsx' }` (esbuild infers from extension; explicit is fine).
   - `alias: { 'react': 'preact/compat', 'react-dom': 'preact/compat', 'react/jsx-runtime': 'preact/jsx-runtime' }`
     so verbatim-ported `import ... from "react"` lines resolve to Preact.
3. Output stays a single IIFE `dist/justify-core.js` with `globalName:'Justify'` - **no host-side
   runtime, no separate vendor chunk, no change to how the daemon serves the bundle.** Preact is
   bundled in.
4. The `assets/spark-*.svg` copy step and the adapter builds (`react/vue/svelte` host adapters -
   unrelated to our render layer) are untouched.

Net: ~one config block in `build.js` + `npm i preact`. The IIFE/global/单-bundle contract is
preserved.

### Decision boundary (when to revisit)

Choose vanilla **only** if a hard constraint forbids shipping any framework (it doesn't here -
size budget is generous and it's dev-only) or if we deliberately fork hard from Retune and stop
tracking upstream (we don't - the whole project is "port Retune exactly"). As long as the goal is
exactness + staying close to upstream, Preact is the correct call.

---

## 6. Summary for 00-PLAN.md

- Keep `core/index.ts`, `Overlay`, `Transport`, `PreviewEngine`, `ChangeBuffer`, `scrub.ts`,
  `icons.ts`. Reconcile `ManipulateMode` to host the new picker + `onSelect`.
- Fresh-rewrite `property-panel.ts` and `control-detector.ts`; **discard** `box-model.ts`,
  `handles.ts`, `state-toggle.ts` (all orphaned/legacy) and replace their function by porting
  Retune's `picker.ts` (handles), `box-model-overlay.tsx` (live overlay), and inspector-backed
  forced-state.
- **Render architecture: bundle Preact (~4-5KB gz) and port Retune's TSX near-verbatim**, mapping
  `react`/`react-dom` -> `preact/compat` and `@central-icons-react` -> verbatim `icons.ts`. Keep
  `picker.ts`/`identifier.ts` as vanilla TS ports (they have no React in Retune either). Build
  change is a small esbuild JSX+alias config addition; output stays a single IIFE bundle.

Collaborator: Jonah (entry-analyst).
</content>
</invoke>
