---
name: Parity rebuild - globe / particles / cursor-trail / aurora control surfaces
description: Added preset libraries, marker sets, labels, and full prop surfaces to the 4 "interactive" effects to match/exceed cobe + casberry + unlumen
type: project
relates_to: [session_2026-05-31_fidelity_audit_gradients_ascii.md]
---

Collaborator: Jonah

Completeness rebuild of the 4 effects owned by the "parity-interactive" lane. Goal: each tilt-lab effect must match or EXCEED the full functional depth of its original (every config, preset, presentation style, color, marker, label). Source of truth: docs/superpowers/tilt-lab-recon/lane-4-cobe.md, lane-5-casberry-particles.md, lane-6-unlumen-cursor-trail.md, lane-7-unlumen-aurora.md + the installed `cobe` package + each effect's COBEOptions/prop set.

## Key constraint discovered
runtime/types.ts ParamType is ONLY `range | color | toggle | select | file` and runtime/manifest.ts validateManifest enforces it. There is NO `text`/`markers`/`vector` control type. So per-marker free-text add/remove editing is NOT possible without adding a new ParamType across runtime + the React app (app/src/components/ParamControls + controls/). Marker VARIETY and label data are therefore delivered via `select` (marker sets) + `toggle`/`color`/`range` (labels), consistent with how mc-globe already works. Flagged true per-marker editing as a scoped follow-up.

## What changed (per effect)
- globe (was 15 params -> 21): added `preset` select (13 looks: Custom + Cobe Default[canonical README values] + Day/Light, Inverted Dark, Tech Blue, Emerald, Ocean, Aurora, Magma, Sunset, Gold, Neon Night, Mono Wire), `markerSet` select (8 sets: None, SF+NYC, World Capitals, Tech Hubs, Continents, Americas, Europe, Asia Pacific - each marker carries a place-name label), `autoRotate` toggle, and a map-LABEL overlay (`showLabels`/`labelColor`/`labelSize`). Labels are a tilt-lab ADDITION (cobe ships no text labels) drawn on a 2D overlay canvas created over the GL canvas, projected from the same phi/theta the globe spins by. Still uses the real `cobe` package driven from frame(t) with its RAF off (toggle(false)). Defaults now reproduce the canonical cobe dark globe.
- aurora (was 25 -> 26): added `preset` select of 8 "presentation styles" (Custom, Blue Night, Borealis Green, Sunset, Magenta Dream, Toxic, Mono, Crimson) that retint the 4 bands + 2 sky stops. Verbatim shader untouched. (25-param surface was already complete vs lane-7.)
- particles (was 13 -> 14): added `preset` select of 8 looks bundling shape+renderStyle+color (Emerald Sphere, Plasma Torus, Helix Rainbow, Cyber Cube, Ink Cloud, Steel Sphere, Glass Torus, Paint Helix). 8 render styles + 4 shapes + bloom already matched casberry.
- cursor-trail (was 4 -> 14): exposed every constant unlumen hard-coded - `fadeDuration`, `exitBlur`, `enterScale`, `exitScale`, `scaleFloor`, `enterRotateMult`, `exitRotateMult`, `easing` select (expoOut/easeOut/linear/backOut/circOut), `wipeOnLeave` toggle - plus a `preset` select (Classic, Subtle, Wild, Dense, Slow Fade). Age-scale generalized to scaleFloor.

## Label projection caveat
globe label overlay projection uses standard orthographic globe math with LON_SIGN/PHI_SIGN constants isolated at the top of index.ts. Could not visually verify (no dev server in this lane). If labels read mirrored/rotated in Chrome, flip those one-line constants. Overlay is headless-safe (guards on document/parentElement/getContext, only activates when showLabels=true; default false so tests hit the dead/no-WebGL path).

## Verification status - VERIFIED GREEN
- `npx tsc --noEmit` -> exit 0 (clean, all 4 effects + manifests).
- `npm test` (vitest) -> Test Files 43 passed (43), Tests 170 passed (170), exit 0.
Remaining is team-lead's visual Chrome pass (cobe preset gallery + marker sets + new label overlay; particles/aurora/cursor-trail preset dropdowns).
Note: this session's per-turn tool-OUTPUT budget repeatedly truncated results (large file reads at turn start consumed it); confirmations landed via minimal end-of-turn echo flags.

## Files touched
- runtime/effects/globe/manifest.json, runtime/effects/globe/index.ts (full rewrite)
- runtime/effects/cursor-trail/manifest.json, runtime/effects/cursor-trail/index.ts (full rewrite)
- runtime/effects/aurora/manifest.json, runtime/effects/aurora/index.ts (preset additions)
- runtime/effects/particles/manifest.json, runtime/effects/particles/index.ts (preset additions)
- installed `cobe` (already a package.json dep) into node_modules
