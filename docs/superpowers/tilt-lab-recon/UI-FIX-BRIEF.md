# tilt-lab UI fix - team brief (from the sidecoach audit)

Fix the audit findings in tilt-lab/app + runtime. Full findings + rationale: .claude/memory/session_2026-05-29_tilt-lab-ui-audit.md. STRICT file ownership below - do NOT touch another agent's files (avoids edit conflicts).

## Verify (all agents): `cd tilt-lab && npx tsc --noEmit` + `npx vitest run` stay green; `vite build app` succeeds. Do NOT commit, do NOT write beats (team-lead handles). Report what you changed.

## Agent A - CSS / presentation (OWNS: app/src/styles.css ONLY)
- P0 RESPONSIVE: `.app__body` is a fixed `grid-template-columns: 280px 1fr 340px` with `height:100vh` and ZERO `@media` queries; below ~700px the center preview collapses. Add breakpoints: e.g. below ~900px narrow the side panels; below ~640px stack them or make browse/layers collapsible/overlay so the preview keeps usable width. Keep it tasteful + usable on a phone-width viewport.
- P1 FOCUS: add a `:focus-visible` ring (use `--accent`) on buttons/inputs/selects/cards; do not remove default outlines elsewhere.
- P1 PARAM-LABEL CLIP: `.param-controls__row { grid-template-columns: 5.5rem 1fr }` truncates long param names. Widen/auto the label column (or allow wrap) + `min-width:0` so controls don't clip; verify against long names like "atmosphereCoefficient".
- P2 HIT TARGETS: layer-stack up/down/remove buttons + browse role-filter pills are < 40x40px. Pad to a 40x40 minimum interactive area (can keep visual size smaller via padding/inline-flex).
- P2 REDUCED-MOTION: wrap hover/press transitions (`transform: translateY`, scale) in `@media (prefers-reduced-motion: no-preference)` or disable them under reduce.
- P3 HARDCODED HEX: 21 raw hex literals (alert colors #ff9a8c/#5a2a2a/#2a1414, button #1b1b22, text-on-accent #08080c, textarea #0e0e13, hover #232330, etc.) -> promote to `--` CSS variables in `:root`.

## Agent B - component a11y (OWNS: app/src/components/AddShaderModal.tsx + app/src/components/PreviewCanvas.tsx)
- P2 MODAL: AddShaderModal has `role="dialog"` but no focus management. Add `aria-modal="true"`, autofocus the first control on open, trap Tab focus within the panel, close on `Escape`, and close on backdrop click (not panel click). Keep its existing props/behavior.
- P3 PREVIEW ARIA: the PreviewCanvas host `<div>` has no accessible name. Add an appropriate `role`/`aria-label` (e.g. role="img" aria-label describing the live effect preview), without breaking the Compositor mount.

## Agent C - performance (OWNS: app/vite.config.ts)
- P1 BUNDLE: the app bundles ~948KB (three.js + OGL + cobe + all effects). Add `build.rollupOptions.output.manualChunks` to split heavy vendors (three, ogl, cobe) into separate chunks so the initial parse shrinks. Do NOT attempt an async effect-loading refactor (out of scope). Run `vite build app` and report the before/after chunk sizes.

## Agent D - project context (OWNS: tilt-lab/PRODUCT.md + tilt-lab/DESIGN.md - both NEW files)
- Write tilt-lab/PRODUCT.md from known facts: tilt-lab is a personal, locally-served visual-effects playground (browse ~25 catalog effects across background/midground/pointer/post roles, layer compatible ones, tune params, upload media, send a framework-agnostic web-component package to a project). Dark, utilitarian, fast, developer-facing tool. Fill the standard sections (identity, users, register, anti-references, principles).
- Write tilt-lab/DESIGN.md to the Google design.md spec (YAML token frontmatter + 6 sections: Overview, Colors, Typography, Layout, Elevation, Shapes, Components, Do's and Don'ts) by extracting the real tokens from app/src/styles.css (the --bg/--panel/--line/--text/--accent vars + type + spacing). Then run `npx @google/design.md lint DESIGN.md` from tilt-lab/ and resolve all findings.
