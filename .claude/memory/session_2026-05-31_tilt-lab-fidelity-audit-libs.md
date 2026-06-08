---
name: tilt-lab shader-fidelity audit (4 library/interactive effects)
description: globe/particles/cursor-trail/aurora audited 1:1 vs original sources; all already faithful, no fixes needed
type: project
superseded_by: session_2026-06-05_tilt-lab-consolidated.md
---

Collaborator: Jonah

Fidelity audit of 4 tilt-lab library/interactive effects against their original sources (lane-4/5/6/7 recon reports + the actual cobe npm package). Verdict: all four are already 1:1 faithful; no code changes required.

## globe -> cobe (npm `cobe` v0.6.5, installed)
- Installed package is the phenomenon-based v1 API (onRender + internal RAF), NOT the v2 update()/destroy() surface the lane-4 report hypothesized. Wrapper correctly targets 0.6.5: calls `globe.toggle(false)` to kill phenomenon's RAF, drives `globe.render()` from frame(t), pushes phi/theta + pending params via the onRender bridge.
- Passes cobe's FULL COBEOptions set: width, height, devicePixelRatio, phi, theta, dark, diffuse, mapSamples, mapBrightness, mapBaseBrightness, opacity, scale, offset, baseColor, markerColor, glowColor, markers, onRender. (context is optional; cobe's own default context attrs used.)
- FIX (pass 2): manifest + init defaults were the README *demo* values, NOT cobe's library defaults. Substituting demo values violates the 1:1 mandate (lane-4 explicitly documents the code-level destructure defaults as the real defaults and labels README values as "heavier demo values"). Reverted to cobe's real defaults: mapSamples 16000->10000, mapBrightness 6->1, diffuse 1.2->1, dark 1->0, baseColor #4d4d4d->#ffffff ([1,1,1]), markerColor #1accff->#ff8000 ([1,0.5,0]). glowColor #ffffff unchanged (=[1,1,1]). phi/theta/mapBaseBrightness/opacity/scale/offset already correct. Shader is verbatim (it IS the package).
- markers: cobe library has NO markers default (required field); kept the canonical SF+NYC demo markers since dropping them would drop a feature - flagged as the one spot with no library default. `speed` is wrapper-only (cobe has no time-based speed option; demo does phi+=0.01/frame); left at 0.3.
- 15 manifest params (incl. our wrapper-only `speed` auto-rotate). `markers` kept as a config field (array, not a range/color/toggle/select param) - acceptable.

## particles -> casberry (reimplemented; proprietary, no license)
- 13 params all present + matching lane-5: count 20000, shape, renderStyle (8 styles), speed 1, morphSpeed 0.1, particleSize 0.25, hoverStrength 0.05, autoSpin true, autoSpinSpeed 2, bloomStrength 1.8, bloomRadius 0.4, bloomThreshold 0, color #00ff88.
- All 8 render-style shaders (plasma/ink/paint/steel/glass) + spark/cyber/vector MeshBasicMaterials verbatim. Geometries verbatim. Shape math (sphere/cube/helix/torus) verbatim incl. per-shape colors. Morph lerp 0.1, idle sine bob, per-style billboard/lookAt rotation all match.
- Adaptations (documented + allowed): fog dropped for transparent midground; OrbitControls autoRotate replaced by worldGroup.rotation.y advanced at autoSpinSpeed * PI/30 per sec (exact OrbitControls auto-rotate rate).

## cursor-trail -> unlumen cursor-image-trail (personal-only)
- Original = React + Framer Motion; runtime has neither, so it's a vanilla-DOM port using CSS transitions. Easing/timing verbatim: duration 400ms, cubic-bezier(0.23,1,0.32,1). Enter (op0/scale0.5/rot*1.5), animate (age scale 0.6+0.4*(1-age/trailLength)), exit (op0/scale0.3/rot*0.5/blur4px), mouseleave wipe all match.
- 4 props match exactly: itemSize 120, trailLength 8, spawnDistance 80, rotationRange 20. Implements mount()+onPointer()+onPointerLeave() per contract. Distance gate + round-robin itemIndex verbatim.

## aurora -> unlumen AuroraBlur (personal-only)
- Aurora fragment shader verbatim (hashNoise/noise2d/aurora/saturateColor). Bare WebGL2 quad replaces R3F (vertex shader is the only swap; vUv y-up preserved to match R3F plane uv). dpr capped at 2 (matches R3F).
- All 25 params present with exact defaults (speed 1.1, 4 layers color/speed/intensity, noiseScale 3.2, movementX -1.4, movementY -2.6, verticalFade 0.5, bloomIntensity 1.9, sky colors/blends, brightness 0.92, saturation 1.12, opacity 1).

## Verification
- `cd tilt-lab/app && npx tsc --noEmit`: clean for all 4 effects. ONE out-of-scope error remains: `runtime/effects/ascii/index.ts(414): TS6133 'prevComposite' declared but never read` (lane-9, another teammate's effect - flagged to team-lead, not touched).
- `npx vitest run` for the 4 effects: 13/13 pass.

Files touched: none (audit only; all four already 1:1).
