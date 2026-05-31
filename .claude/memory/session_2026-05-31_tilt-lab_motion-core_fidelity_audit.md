---
name: tilt-lab motion-core shader fidelity audit (6 effects)
description: 1:1 fidelity audit of dithered-image, fake-3d-image, glass-slideshow, mc-globe, halo, infinite-gallery against motion-core source; mc-globe had major dropped shader content + a fabricated param, all restored
type: project
---

Collaborator: Jonah

Shader-fidelity audit of the 6 motion-core "motion-core" effects in tilt-lab/runtime/effects/, comparing each against the lane-8a/8b recon briefs and (for the incomplete sections) the live upstream source at github.com/motion-core/motion-core (MIT, reachable, authoritative).

## Findings per effect
- halo, dithered-image, fake-3d-image: already 1:1. Verbatim fragment shaders, matching uniforms/params/defaults. No changes.
- glass-slideshow: fragment shader verbatim; all 9 glass uniforms exposed as params (brief table listed 4 of 9; the extra 5 - speedMultiplier/colorEnhancement/bubbleClarity/edgeGlow/liquidFlow - map to real verbatim uniforms with neutral 1.0 defaults, so output is identical at defaults). Superset, not a deviation. No changes.
- infinite-gallery: vertex + fragment shaders verbatim; scroll/scene-graph is the allowed widget wrapper (RAF/wheel -> frame(t)+onPointer). Params decomposed from fadeSettings/blurSettings objects with correct defaults. No changes.
- mc-globe: MAJOR deviations found and FIXED (below).

## mc-globe deviations fixed
The brief did NOT capture the globe GLSL verbatim (only structure). Pulled the real GlobeScene.svelte/Globe.svelte from upstream to verify. The port had dropped/fabricated:
1. Globe + atmosphere shaders both missing the display-transform layer: uniforms uDisplayScale/uDisplayOffset/uDisplayRotation, the rotate2() and transformUv() helpers, and the `transformUv(vUv)` call in main() (was raw `vUv`). RESTORED in both shaders.
2. Globe shader missing `uniform float uTime`; the marker loop was collapsed from the full pulse animation (markerCore/pulse/pulseRadius/pulseWidth/pulseInner/pulseOuter/markerPulse) down to a single smoothstep. RESTORED verbatim (markers stay widget-out-of-contract, uMarkerCount=0, but GLSL is now 1:1).
3. Fabricated `radius` param + `toScale(radius)` feeding uScale. Upstream has NO radius prop: uScale is the constant DEFAULT_GLOBE_SCALE=1, and the real props are scale->uDisplayScale (default 1), offsetX/offsetY->uDisplayOffset (0,0), rotation->uDisplayRotation (0). REMOVED radius/toScale; added scale/offsetX/offsetY/rotation in init, uniforms, setParam, and manifest.
4. frame() now advances uniforms.uTime.value += delta (was absent).
5. Atmosphere falloff `max(0.15, uAtmospherePower*0.09)` CONFIRMED correct against upstream (brief's simpler formula was the paraphrase); added the upstream comment line.
All other globe params (pointCount 15000, pointSize 0.05, landPointColor #f77114, fresnelColor/base #17181A, rimColor #FF6900, rimPower 6, rimIntensity 1.5, atmosphereColor #FF6900, atmosphereScale 1.1, atmospherePower 12, atmosphereCoefficient 0.9, atmosphereIntensity 1.1, autoRotate/lockedPolarAngle true) verified against upstream defaults - all correct.

## Verify
- `npm run typecheck` (tsc --noEmit): 0 errors.
- `npm test` (vitest run): 43 files / 167 tests green. mc-globe test derives params from manifest so no count update needed.

Files touched: tilt-lab/runtime/effects/mc-globe/index.ts, tilt-lab/runtime/effects/mc-globe/manifest.json.
