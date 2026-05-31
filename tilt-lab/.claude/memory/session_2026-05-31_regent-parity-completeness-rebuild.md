---
name: Regent parity completeness rebuild (5 regent effects)
description: Closed control-surface gaps vs regent original for fluid, mesh-gradient, halftone, fractal-glass, swarm - named presets + Custom mode, real color pickers
type: project
---

Collaborator: Jonah

Completeness pass (not an audit) over the 5 "regent" tilt-lab effects, matching/exceeding the original regent app's full control surface (/Users/spare3/Documents/Github/regent). Shaders were already verbatim-correct from a prior pass; this pass was about CONTROL/FEATURE completeness on top.

## Per effect

**fluid** - already had verbatim shaders, 4 color pickers, quality, all sliders, scene-applies-colors logic. Gap: `scene` was numeric select `["0".."4"]`. Fixed -> named presets `[Cosmic, Regent, Inferno, Void, Monochrome, Custom]`; setParam maps name->index->applies the 4 colors; "Custom" (scene=-1) leaves pickers in control.

**mesh-gradient** - already had 5 colors, noise, grain, dither, wireframe, animFreeze. Gap: `scene` numeric. Fixed -> `[Default, Aurora, Deep Ocean, Regent, Molten, Custom]`; setParam + init both map names. (Variable color-stop count and per-stop position/opacity from the original Theme Builder are app-level; all 5 presets are uniform full-opacity 5-stops, so 5 fixed pickers reproduce every preset.)

**halftone** - REAL GAP: had ZERO color params; base colors were locked to the selected preset. Added: `scene` named `[Indicium, Violet Abyss, Emerald Depth, Crimson Forge, Regent, Custom]` + 4 base-color pickers (baseColor1-4) that feed the radial source field. Named presets seed all 4; editing any picker overrides live (= original Custom mode, scene=-1). Env colors are unused by the halftone renderer (carried for ScenePreset shape only). Rebuild key now includes base colors so edits rebuild the bg texture immediately.

**fractal-glass** - THE FLAGGED ONE: shipped ZERO color controls vs original's 5-preset + 7-picker custom system. Added: `scene` named `[Indicium, Violet Abyss, Emerald Depth, Crimson Forge, Regent, Custom]`; 4 base-color pickers (EDGE/MID-DARK/MID-BRIGHT/CENTER) -> radial background; 3 env-color pickers (-> procedural HDR env map); `autoEnv` toggle. Ported colorUtils.ts VERBATIM (hexToHSL, hslToHex, deriveEnvColors with the exact +10/+3, +15/+5, +20/+15 HSL lifts). Named presets seed all 7 literal colors. In Custom mode (scene=-1) with autoEnv on, env colors re-derive from base 1/2/3 on each base edit; derivation is guarded to Custom-only so named presets keep their literal env colors (matches original where autoEnv only affects custom mode).

**swarm** - already had all grid/attraction/physics params, dotShape select, 3 color pickers, 3 alpha sliders. Gap: `scene` numeric. Fixed -> `[Ghost Grid, Regent, Ember, Phosphor, Violet Haze, Custom]`; setParam maps name->index->applies idle/swarm/bg colors + idle/swarm/glow alphas.

## Pattern used
All effects keep the tilt-lab Effect contract (init/frame/resize/setParam/dispose, headless guard, no own RAF). Manifest defaults stay consistent with the default scene's palette so init-order seeding never clobbers. "Custom" sentinel = original scene===-1.

## Verify
- `cd tilt-lab/app && npx tsc --noEmit` -> 0 errors in the 5 effects. (Pre-existing 2 unused-var errors in ascii/index.ts belong to a different agent's in-flight work; left untouched to avoid conflict.)
- `cd tilt-lab && npx vitest run` -> 43 files, 164 tests, all green (per-effect tests build params from manifest defaults and run init/frame/dispose, exercising every new color/scene param).

## Files touched
- runtime/effects/fluid/{index.ts,manifest.json}
- runtime/effects/mesh-gradient/{index.ts,manifest.json}
- runtime/effects/halftone/{index.ts,manifest.json}
- runtime/effects/fractal-glass/{index.ts,manifest.json}
- runtime/effects/swarm/{index.ts,manifest.json}
