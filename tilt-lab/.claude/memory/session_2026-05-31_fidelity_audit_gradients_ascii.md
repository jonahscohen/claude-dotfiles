---
name: Shader-fidelity audit - gradients + ascii (fid-gradients lane)
description: 1:1 fidelity audit of grain-gradient, neuro-noise, animated-gradient, ascii against recon lane briefs; restored 5 dropped ascii params
type: project
---

Collaborator: Jonah

Shader-fidelity audit of 4 tilt-lab effects against the verbatim recon sources
(docs/superpowers/tilt-lab-recon/lane-2/3/9). Goal: every shader line, uniform,
param, default 1:1 with original.

## Findings

- **neuro-noise** (paper.design): already 1:1. Fragment shader verbatim, defaults
  match (brightness 0.05, contrast 0.3, speed 1, etc.). Manifest correct.
- **grain-gradient** (paper.design): already 1:1. Fragment shader verbatim incl.
  firstFrameOffset=7, all 7 shapes, snoise/fbmR/truchet helpers, u_colors[7] +
  u_colorsCount. Defaults match (colors 7300ff/eba8ff/00bfff/2a00ff, shape corners,
  softness/intensity/noise 0.5/0.5/0.25). Wrapper models the colors[] array as
  color1..color7 + colorsCount - shader uniform preserved exactly.
- **animated-gradient** (spell.sh): already 1:1. Fragment shader verbatim, frame()
  uniform transforms match original animate() exactly (speed/100*5, swirl=0 -> 0
  iterations, offset*0.01). All 14 spell params + noise overlay (noiseOpacity,
  noiseScale) present.
- **ascii** (ascii-magic, reimplemented): FIXED. Five tunable params from the
  lane-9 `state` param surface had been dropped in the port:
  - bgMode (default 'blur'), bgBlur (8), bgOpacity (90) - background pass beneath
    glyph grid. Wired: 'solid'=black@bgOpacity, 'none'=transparent, 'blur'=sampled
    source blurred via ctx.filter at bgOpacity. Behavior documented in lane-9 render().
  - blendMode (default 'source-over') - globalCompositeOperation around the glyph/
    tile pass, distinct from overlayBlend. Wired.
  - dotGrid (default false) - faint per-cell grid lines. Wired (rgba white 0.08).
    FLAGGED: exact original dotGrid behavior not captured verbatim in lane-9;
    implemented as faithful faint grid overlay.
  Added all 5 to manifest.json with types/defaults/min/max/step.

## Why
Fidelity mandate: if original has N params, ours has N with identical names/defaults.
lane-9 `state` object is the authoritative param surface for the reimplemented ascii effect.

## Verify
- `tilt-lab && npx tsc --noEmit` -> 0 errors.
- `tilt-lab && npx vitest run` -> 43 files, 167 tests pass. Tests build params from
  manifest, so no count assertions to update.
- NOTE: tests/config live at tilt-lab ROOT (vitest.config.ts), not tilt-lab/app.
  Running vitest from app/ yields false "document is not defined" failures.

## Files touched
- tilt-lab/runtime/effects/ascii/index.ts (state + render passes)
- tilt-lab/runtime/effects/ascii/manifest.json (+5 params)
