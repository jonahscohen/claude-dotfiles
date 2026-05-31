---
name: parity-gradients completeness rebuild (grain-gradient, neuro-noise, animated-gradient, ascii)
description: Added missing preset selectors to all 3 gradient effects + ascii colour/animation/post-fx control surface
type: project
relates_to: [session_2026-05-31_fidelity_audit_gradients_ascii.md]
---

Collaborator: Jonah

Control/feature-completeness pass on the 4 parity-gradients effects. Shaders left verbatim (prior pass verified); this pass closed control-surface gaps vs the originals.

## What was MISSING and ADDED

### animated-gradient (spell.sh) - 6 built-in presets were entirely absent
Original ships Prism/Lava/Plasma/Pulse/Vortex/Mist (+custom). Added `preset` select (first manifest param) + PRESETS map (verbatim values incl lightColors variants) + applyPreset() wired into readParams (preset-first so explicit params override) and setParam('preset',...).

### grain-gradient (paper) - 6 presets absent
Original grainGradientPresets: Default/Wave/Dots/Truchet/Ripple/Blob. Each sets colors[] (3-4, drives colorsCount), colorBack, shape, softness, intensity, noise, scale. Added `preset` select + applyPreset (variable-length colour lists -> colorsCount; slots beyond preset kept).

### neuro-noise (paper) - 4 presets absent
Original neuroNoisePresets: Default/Sensation/Bloodstream/Ghost. Each sets colorFront/Mid/Back, brightness, contrast, scale. Added `preset` select + applyPreset.

### ascii (ascii-magic) - colour/animation/post-fx surface absent
Already had all 15 render modes + bg modes + 3d/disco/shapes knobs. Added the missing controls:
- `colorMode` (sampled/mono/palette) + `monoColor` - the "Colour" foreground control the mandate called out. Palette = 8-step channel quantize (approximation).
- `jitter`/`threshold`/`posterize` - exposed previously-hardcoded shapes/braille constants.
- Animation panel: `animated` + `animStyle` (wave/cascade/reveal/pulse) + `animSpeed`/`animIntensity`/`animRandomness`; frame now uses t for per-cell shimmer (was `_t`).
- Post-Processing stack (13 toggles): vignette, scanLines, crt, chromatic, bloom, filmGrain, glitch, rgbSplit, blur, pixelate, halftone, filmDust, lightMode. Standard canvas reimplementations (source not captured -> faithful-standard, not byte-verbatim). Applied via postProcess() with scratch fxCanvas, try/caught + headless-guarded.

## Flagged unrecoverable (not built)
- ascii **Lights** (point-light array) - no array param type in tilt-lab ParamSpec.
- ascii **Mask** (freehand drawing tool) - app-level input machinery, out of scope.
- ascii **custom charset text input** - no 'text' ParamType; index already accepts literal ramps but UI can't input one. The 4 charset presets are all present.
- Post-fx exact pixel look - ascii-magic's post-effect source is proprietary/uncaptured; ours are standard-canvas equivalents.

## Verify
- `tilt-lab/app && npx tsc --noEmit` -> 0 errors.
- `tilt-lab && npm test` -> 43 files / 170 tests pass. grain-gradient, neuro-noise, animated-gradient now 5 tests each (added preset-selector + apply-each-preset tests).

## Files touched
- runtime/effects/animated-gradient/{index.ts,manifest.json,index.test.ts}
- runtime/effects/grain-gradient/{index.ts,manifest.json,index.test.ts}
- runtime/effects/neuro-noise/{index.ts,manifest.json,index.test.ts}
- runtime/effects/ascii/{index.ts,manifest.json}
