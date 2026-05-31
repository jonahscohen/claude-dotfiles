---
name: tilt-lab regent shader fidelity audit (lane-1, 5 effects)
description: 1:1 fidelity audit+fix of fluid, mesh-gradient, halftone, fractal-glass, swarm against original regent repo
type: project
---

Collaborator: Jonah

# tilt-lab regent fidelity audit - fid-regent teammate

Task: as graphics engineer "fid-regent" on the tilt-lab shader-FIDELITY audit, make the 5 regent effects EXACTLY 1:1 with their originals (every GLSL line, uniform, param name/default/min/max/step/options, constant, render pass, per-frame computation, blend mode). Wrapper (Effect contract init/frame/resize/setParam/dispose, headless GL guard, no-own-RAF, injected pointer) stays ours; shaders/params/constants verbatim.

## OUTCOME (per effect)
- **mesh-gradient**: already 1:1. Vertex+fragment shaders match shaders.ts verbatim (snoise, displacement, layered-color loop, Bayer 4x4 table, grain), scene constants (PerspectiveCamera 35/0.1/100, pos 0,0.5,0.4, lookAt origin; PlaneGeometry 1.5x1.5x200x200 rotX -PI/2; DoubleSide; uFrequency 3,6), all 5 presets, manifest ranges (vs MeshGradientControls) all match. NO CHANGE.
- **fluid**: FIXED. Port had ALTERED the original shaders by adding uniforms the original hardcodes. Reverted to verbatim:
  - MouseForce: `v *= 0.999`, `R = 0.015`, `targetVelocity = mouseVelocity * dx` (removed uVelDissipation/uSplatRadius/uSplatForce).
  - MouseDye: hardcoded `0.9797/0.9494/0.9696` (removed uDyeDissipation + decayScale).
  - Display: `abs(texture2D(uTexture, texelCoord))` (removed uAlpha).
  - Restored original GL filter modes: velocity/pressure/divergence/particles = NEAREST, dye = LINEAR (port used LINEAR everywhere).
  - Final screen blit is now a plain copy (BLEND disabled) - port was doing additive blend over bgColor. Offscreen still clears black; bgColor stays inert (the original never reads it).
  - manifest splatForce min 0.1 -> 1 (matches FluidControls).
  - Dead params (curl/velocityDissipation/splatRadius/splatForce/dyeAlpha/dyeDissipation/bgColor) kept in manifest but inert - EXACTLY as the original ships them (FluidControls exposes sliders that the shader never reads). tsc clean (exit 0) after edits.
- **swarm**: FIXED. drawShape was simplified in the port. Restored verbatim geometry: diamond y±r*1.3; triangle moveTo y-r*1.2, lineTo ±r*1.1/+r*0.8; sparkle loop 4-point star (outer r*1.3, inner r*0.35); cross 12-point plus polygon (w=r*0.45). Physics (attract-from-HOME, cubic ease, repelMode, orbit jitter, return*0.15, friction), render (t=disp/60, radius+t*0.8, glow t>0.4), presets, and manifest ranges (vs SwarmControls) already matched. Confirmed on disk (`r*1.3` count 4).
- **halftone + fractal-glass + lib/fluid-solver.ts**: a SECOND teammate concurrently migrated these to ONE shared GPU Three.js sim (lib createFluidSim/stepFluidSim/disposeFluidSim/createBackgroundTexture) consumed by both - the lane-1 "shared module" goal. I verified that shared sim is verbatim: FLUID_SHARED_GLSL (clipToSimSpace/simToTexelSpace w/ invResolution.z, samplePressure/sampleVelocity macros, velocityBoundaryEnabled), SIMPLEX_NOISE_GLSL+curlNoise char-for-char, advect/divergence/Jacobi-pressure/gradient-subtract/paintVelocity(decay+curl+pointer drag, targetVelocity=userVelocity*dx*dt*60)/paintColor(decay toward bg). Per-effect FluidConstants match originals (halftone iter2/timeScale0.10/velDecay2.5/colorDecay4.0/spread150/curl0.035/curlScale1.5/curlChange0.025/ptrStr0.35/ptrDrag0.32/simTex0.25/phys1; FG velDecay4/colorDecay6.0/curl0.012/curlChange0.015). Halftone post shader (rotatePoint, luma lift pow0.5, saturation mix 1.5, contrast pow(1/contrast), radius=maxR*sqrt(sizeFactor), edgePx max(softness*2,0.5), baseColor lifted*0.08) verbatim. FG fluted glass (getFluteU/getSquircleZ/getSquircleNormalXZ, MAX_FLUTE_GEOMETRY_DEPTH=0.02) + onBeforeCompile injection (#include <common> + <normal_fragment_maps> flute-normal block) + procedural PMREM env map + MeshPhysicalMaterial(transmission1, ior, thickness, FrontSide) + NeutralToneMapping + environmentRotation(0,-1.73,0): verbatim.
- **fractal-glass manifest**: FIXED ranges to match FractalGlassControls - highlight/midtone/shadow max 3->2; fluteCount 10-150 -> 2-100; fluteExponent 1-8 -> 1.8-4; ior max 2.0->2.5; thickness 0-1 -> 0.01-0.5; bloomStrength max 2->1. Defaults already correct. (halftone manifest was already correct - teammate fixed it.)

## Verification
- tsc: clean (0 errors) after fluid+swarm edits and again after FG-manifest edits (manifest changes don't affect tsc).
- tests: effect index.test.ts build params from manifest and run init/resize/frame on the headless dead-path; manifest.test validates structure (not specific ranges) - range edits don't break them. (Final `npm test` run captured to /tmp/test_out.txt.)
- Visual check is owned by team-lead (Claude-in-Chrome) per the brief.

## ENVIRONMENT NOTES (for next session)
- Inside cmux with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1: the `Agent` tool is BLOCKED for silent subagents (must use TeamCreate + named teammates). My first attempt to delegate the 5-effect audit to 5 subagents was fully blocked - did the work directly instead.
- Tool results in this session delivered with a one-turn lag and occasional batching; some reads of large files returned scrambled bytes (mesh.tsx, an FG/halftone read). Cross-check with tsc/grep, never trust a single scrambled read.
- Concurrent multi-writer collision: halftone/FG/lib were edited by another teammate mid-session (observed a transient broken tsc state where halftone/FG/test imported `FluidSolver` while lib already exported `createFluidSim`). It resolved (consistent GPU sim, clean tsc). When files change under you ("File has been modified since read"), re-read before editing and check git diff to see who else is in the file.
- Original regent dir path has `(app)` parens that break Read globbing; stage clean copies to /tmp via python shutil. *Controls.tsx are the source of truth for manifest min/max/step.

## Files touched (mine)
- tilt-lab/runtime/effects/fluid/index.ts (shader reverts + filter modes + plain-copy blit)
- tilt-lab/runtime/effects/fluid/manifest.json (splatForce min)
- tilt-lab/runtime/effects/swarm/index.ts (drawShape verbatim)
- tilt-lab/runtime/effects/fractal-glass/manifest.json (6 range fixes)
- (halftone/fractal-glass/index.ts + lib/fluid-solver.ts: migrated by another teammate; verified verbatim, not edited by me)
