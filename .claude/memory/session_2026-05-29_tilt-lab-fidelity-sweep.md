---
name: tilt-lab fidelity sweep - mesh-gradient exemplar + continuation
description: Per-effect 1:1 fidelity restoration against originals (user mandate). mesh-gradient done as the worked exemplar (restored dropped scene presets + colorStops). 21 effects remain. The audit method + continuation plan.
type: project
relates_to: [feedback_tilt_lab_fidelity_mandate.md, session_2026-05-29_tilt-lab-ui-exec.md, session_2026-05-29_tilt-lab-compositor-bug.md]
---

Collaborator: Jonah. 2026-05-29. User chose to do the sweep sequentially (not a team - the acquisition team is what dropped the settings; the careful auditor restores). Compositor render bug already fixed (lava-lamp + aurora render full-screen).

## The audit method (per effect)
1. Read the effect's recon report `docs/superpowers/tilt-lab-recon/lane-*.md` (verbatim original + full param/uniform table). For regent effects, the ORIGINAL local source is the ground truth: `/Users/spare3/Documents/Github/regent/app/(app)/tools/<effect>/` (presets.ts/shaders.ts/types.ts).
2. Read built `tilt-lab/runtime/effects/<id>/{index.ts,manifest.json}`.
3. Diff for ANYTHING dropped/simplified/fabricated: missing params, missing presets, changed/invented defaults, omitted modes, simplified shaders.
4. Restore (additive): expose every original tunable in the manifest (add ParamType kinds if needed), use the REAL default values.
5. Verify: vitest + tsc green; visual render via cmux (pane-width permitting).

## DONE: mesh-gradient (exemplar)
Gaps found: build FABRICATED colors (#3a1c71,#d76d77,#ffaf7b,#2c3e50 - in NONE of the original presets), dropped the `scene` select (0-4) and the 5 scene presets, never exposed colorStops in the manifest (untunable). Restored from regent presets.ts: 5 SCENE_PRESETS verbatim (preset0 #8ecae6/#219ebc/#023047/#ffb703/#fb8500 ...), default now preset 0, added `scene` select param + color1..color5 color params (real defaults), wired scene/colorN into init + setParam. Test 3/3, tsc clean, manifest swatches show the correct palette. (Note: original ColorStop has position+opacity too, but the ported shader consumes colors-only via uColor[5]+uColorCount - faithful to actual render; position/opacity were UI metadata not used by the shader.)

## REMAINING (21 effects) - to audit/restore the same way
Priority suspects (agents flagged simplifications): ascii (dropped 3d/disco/shapes render modes - acquire-e), and re-check every effect's manifest exposes the FULL original param set. Effects: ascii, aurora, cursor-trail, dithered-image, fake-3d-image, fluid (GPU particle layer unwired too), fractal-glass, globe, grain-gradient, halftone, halo, interactive-grid, lava-lamp, neural-noise, neuro-noise, particles, plasma-grid, specular-band, swarm, swirl, water-ripple.
For regent ones (fluid/fractal-glass/halftone/swarm) ground truth = local regent /tools/<effect>/. For others = recon report + (paper/motion-core/cobe) upstream repos.

## mesh-gradient VISUALLY CONFIRMED in Claude-in-Chrome (preferred preview)
Switched preview to Claude-in-Chrome (chrome MCP) per user preference (cmux dropped). Wide clean view (1555x790). mesh-gradient renders a vivid orange/gold mesh gradient with light-blue (#8ecae6) showing at top = authentic preset-0 palette. Layers panel shows full restored params: scene select + color1-5 real swatches + noise/grain/dither/wireframe. RESOLVES the earlier "mesh-gradient dark" worry: it was the narrow cmux pane + the fabricated colors, NOT a three.js render failure. So three.js effects render fine; the systemic compositor fix covers Canvas2D + raw-WebGL2 + OGL + three.js. Chrome tab for tilt-lab: tabId 1827119023.

## Infra notes
- cmux browser surface:120 pane is currently NARROW (~320px) - center preview squeezed; render verification needs a wider pane (earlier lava/aurora caps were 672px and clearly showed renders). viewport-set unsupported on WKWebView.
- dev server still running: localhost:5180 (bg bash bszkd9n62).

## Files (this beat's work)
- tilt-lab/runtime/effects/mesh-gradient/index.ts (SCENE_PRESETS + scene/colorN handling), manifest.json (scene select + color1..5)
