---
name: motion-core lane-8b control-surface parity rebuild
description: Control-completeness pass on 6 motion-core effects vs upstream wrappers; lava-lamp gained 4 transform controls, other 5 already at/above parity
type: project
relates_to: [session_2026-05-31_fidelity_audit_gradients_ascii.md]
---

Collaborator: Jonah. Role: parity-mc-b (graphics engineer).

COMPLETENESS rebuild of the 6 motion-core "canvas" effects (interactive-grid, lava-lamp, neural-noise, plasma-grid, specular-band, water-ripple). Goal: tilt-lab manifest params must be a superset-or-equal of the original's complete control surface. Source of truth = upstream Svelte wrapper props (the public control surface), enumerated via WebFetch of github.com/motion-core/motion-core `<Name>.svelte` files. The lane-8b brief was treated as a floor.

Findings per effect (upstream wrapper props vs current tilt-lab manifest):
- interactive-grid: image, grid, mouseSize, strength, relaxation -> ALREADY COMPLETE.
- neural-noise: speed only (colors are baked into the CPPN, not configurable) -> ALREADY COMPLETE.
- plasma-grid: color, highlightColor (speed hardcoded 0.5 upstream) -> tilt-lab already EXCEEDS (exposes speed too, default 0.5 reproduces original).
- specular-band: color, backgroundColor, speed, distortion, hueShift, intensity -> ALREADY COMPLETE (6/6).
- water-ripple: image (src), brushSize -> ALREADY COMPLETE.
- lava-lamp: upstream exposes color, fresnelColor, speed, fresnelPower, radius, smoothness PLUS scale, offsetX, offsetY, rotation. tilt-lab port was MISSING the 4 transform controls.

Fix (lava-lamp only):
Why: prior port dropped the SceneProps transform surface (scale/offset/rotation).
How: added GPU-side uniforms `uScale` (float) and `uOffset` (vec3 = offsetX, offsetY, rotation-in-radians) plus verbatim `transformRayPoint(p)` called as the first line of `sdf()` - matches upstream exactly:
  vec3 transformRayPoint(vec3 p) {
    vec3 translated = p - vec3(uOffset.x * 2.0, uOffset.y * 2.0, 0.0);
    return rotate(translated, vec3(0.0, 0.0, 1.0), -uOffset.z) / max(uScale, 0.001);
  }
offsetX/offsetY/rotation pack into the uOffset vec3 via a syncOffset() helper (rotation deg->rad CPU-side, like upstream's $effect). Defaults scale=1/offset=0/rot=0 make transformRayPoint a no-op, so the verified metaball look does not regress. Manifest ranges match sibling mc-globe: scale 0.1-4/0.01, offsetX/Y -1..1/0.01, rotation -180..180/1.

Verify: `tilt-lab/app npx tsc --noEmit` -> 0. `tilt-lab npm test` -> 43 files / 160 tests pass (per-effect tests build params from manifest, so they auto-cover the new params; no param-count assertions to update).

Files touched: runtime/effects/lava-lamp/index.ts, runtime/effects/lava-lamp/manifest.json.
