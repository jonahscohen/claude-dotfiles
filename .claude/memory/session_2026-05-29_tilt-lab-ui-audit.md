---
name: tilt-lab UI audit (sidecoach flowK) + fix queue
description: 5-dimension audit of the tilt-lab playground UI. Anti-patterns clean but generic; responsive=1 (worst), a11y=2, perf=2, theming=2. P0-P3 findings + the tilt-ui fix team assignments.
type: project
relates_to: [session_2026-05-29_tilt-lab-ui-exec.md, session_2026-05-29_tilt-lab-media-and-post-pipeline.md]
superseded_by: session_2026-06-05_tilt-lab-consolidated.md
---

Collaborator: Jonah. 2026-05-29. /sidecoach audit (flowK_multi_lens_audit, conf 1) on tilt-lab/app/src. No PRODUCT.md/DESIGN.md for tilt-lab (audited on general principles).

## Scores (0-4): a11y 2, perf 2, theming 2, responsive 1, anti-patterns 3. Verdict: clean (not AI-slop) but generic + desktop-only.

## Findings -> team assignments (distinct files, no conflicts)
P0 RESPONSIVE (Agent A, styles.css): .app__body grid 280px/1fr/340px + height:100vh, 0 @media -> center collapses < ~700px. Add breakpoints (collapse/stack side panels).
P1 FOCUS (Agent A, styles.css): 0 :focus-visible rules -> add accent focus ring.
P1 PARAM-LABEL CLIP (Agent A, styles.css): .param-controls__row grid 5.5rem label clips long names (atmosphereCoefficient/shape3dCellSize). Widen/auto + min-width:0 + text-overflow.
P1 BUNDLE (Agent C, app/vite.config.ts): ~948KB; split three/ogl/cobe into vendor chunks via manualChunks (no async refactor).
P2 MODAL A11Y (Agent B, AddShaderModal.tsx): role=dialog but no focus-trap/autofocus/Escape/backdrop-close/aria-modal. Add them.
P2 HIT TARGETS (Agent A, styles.css): layer-stack up/down/remove + role pills < 40x40. Pad to 40x40 min.
P2 REDUCED-MOTION (Agent A, styles.css): hover translate/press scale ignore prefers-reduced-motion. Wrap transitions.
P3 HARDCODED HEX (Agent A, styles.css): 21 raw hex (alerts/buttons/text-on-accent) -> CSS vars.
P3 PREVIEW ARIA (Agent B, PreviewCanvas.tsx): add aria-label/role to the live-output div.
P3 PROJECT CONTEXT (Agent D): write tilt-lab PRODUCT.md (known facts) + DESIGN.md (from CSS, Google spec, lint).

## Phase 2 (after A-D, team-lead): /sidecoach critique + /sidecoach polish on the fixed UI, then Claude-in-Chrome visual verification of every fix.

Queued as T-0042. Team tilt-ui: A=styles.css, B=AddShaderModal+PreviewCanvas, C=vite.config, D=PRODUCT.md+DESIGN.md. Brief: docs/superpowers/tilt-lab-recon/UI-FIX-BRIEF.md.
