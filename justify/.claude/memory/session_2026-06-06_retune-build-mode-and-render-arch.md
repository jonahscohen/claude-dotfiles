---
name: Retune port - autonomous build mode + render architecture locked
description: Jonah granted full autonomy (no approval gates); render arch locked to Preact near-verbatim TSX port; verify-loop until EXACT 1:1
type: decision
relates_to: [session_2026-06-06_retune-manipulate-1to1-kickoff.md]
---

Jonah (2026-06-06): "I do not need you to review with me for approval on anything. Just accomplish the task as described autonomously and validate in a /loop until you have met my expectation. EXACT 1:1!" Full autonomy + trust; no Phase-2 sign-off gate anymore.

**Render architecture - LOCKED (decision made under granted authority):**
Bundle Preact (~4-5KB via preact + preact/hooks, react/react-dom -> preact/compat esbuild alias, jsx:automatic + jsxImportSource:preact) and port Retune's TSX near-verbatim. Do NOT continue the vanilla hand-port.
- Alternatives rejected: hand-rewrite as imperative vanilla DOM (current 2840-line property-panel.ts) - rejected: drift-prone (dark-only theme, inert scope pill, no-op controls already), and forces hand-retranslating every upstream Retune change forever.
- Why: exactness (thousands of lines of stateful JSX port mechanically), maintainability (pull upstream via react->preact/compat), trivial bundle cost for a dev-only HTTP-injected overlay. Unanimous team recommendation (spec #11 + all analysts).
- Consequence: most of the current vanilla property-panel.ts is discarded. picker.ts/identifier.ts stay vanilla (Retune has no React there either).
- Revisit if: Preact/compat can't faithfully render a Retune component, or bundle/runtime cost proves unacceptable in the injected context.

**Verification bench:** Retune playground (Next.js) on localhost:3002 = visual/behavioral 1:1 reference (installing in background, task bu7dy1qz7); real source = exact values; retune.dev secondary. Verify-loop: build smallest increment -> load Justify Manipulate on a test page -> side-by-side vs playground + exact-value diff -> fix -> repeat until EXACT. Screenshots must be Read after capture (prior lapse corrected).

**Orchestration:** cmux-teams mode -> build via named Agent teammates (visible splits), NEVER Workflow (guard now blocks it). Team retune-spec produced 11 area specs + 00-PLAN.md (synthesizer finishing). Build sequence per 00-PLAN, Design-panel parity first (Elements tree deferred), smallest-verifiable-first.

Key constraints to honor (from specs): direct DOM click opens Design immediately (panelTab default "design"); section order Scope,Position,Layout,Spacing,Size,Typography,Fill,Image,Border,Shadow,Filters; Image/Video edits are HTML attributes not CSS (change model needs attribute variant); Shadow-DOM isolation must be re-homed (Justify has no shadow root); on WordPress targets the React-instrumentation features (Scope/component-props/Trigger) degrade - CSS-diff+selector+style-source is the portable 1:1 core; icons are a custom 41-glyph Figma-style set to copy verbatim.
