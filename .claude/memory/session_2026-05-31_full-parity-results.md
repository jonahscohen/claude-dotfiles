---
name: RESULTS - full feature-parity rebuild (5 agents) + verified + param-type follow-up
description: 5 parity agents rebuilt every effect to the original's complete control surface. Both flagged examples Chrome-verified - fractal-glass got its 7-picker+5-preset color system, cobe got 13 presets + 8 marker sets + working MAP LABELS. Remaining ceiling (per-marker editing, custom charset) handed to a paramtypes agent adding text + marker-list ParamTypes.
type: project
relates_to: [session_2026-05-31_full-feature-parity-deploy.md, feedback_tilt_lab_fidelity_mandate.md]
---

Collaborator: Jonah. 2026-05-31.

## What the 5 parity agents added (control-surface completeness)
- parity-regent: NAMED PRESET selectors + full COLOR systems. fractal-glass = the flagged case: added scene select (Indicium/Violet Abyss/Emerald Depth/Crimson Forge/Regent/Custom) + 4 base + 3 env color PICKERS + autoEnv + colorUtils verbatim. halftone (was zero colors) +4 base pickers. fluid/mesh/swarm: named-preset selects applying real color sets; fluid also quality select + showDye + bgColor + COLOR group.
- parity-mc-a: IMAGE UPLOAD controls (file params) on dithered-image/fake-3d-image/glass-slideshow(4)/infinite-gallery(6) - originals had upload, ours only had bundled defaults. mc-globe/halo already complete.
- parity-mc-b: lava-lamp +4 transform controls (scale/offset/rotation); other 5 already complete (simple shaders).
- parity-gradients: preset libraries - animated-gradient 6, grain-gradient 6, neuro-noise 4. ascii major expansion: colorMode + monoColor + animation panel (5) + 13-toggle post-processing stack.
- parity-interactive: globe 15->21 (preset select 13 looks, markerSet 8, autoRotate, MAP LABELS overlay showLabels/labelColor/labelSize - an addition beyond cobe). aurora +preset(8). particles +preset(8). cursor-trail 4->14 (every constant + preset).

## Chrome-VERIFIED by me (the two flagged examples)
- fractal-glass: BASE group shows 4 real color pickers (#030618/#1040A0/#78B0DC/#A0C4E8 = Indicium preset), ENV + FLUTE groups, scene + autoEnv. Renders. Fluid: scene preset (Cosmic), quality segmented select, showDye, bgColor, COLOR/SPLAT/DYE groups - renders (white poster was poster-gen timing, not a regression).
- globe: preset dropdown + markerSet + showLabels toggle. Enabled showLabels -> "San Francisco" + "New York" labels render at correct positions, NOT mirrored. Directly answers Jonah's cobe complaint. tsc 0, 170 tests.

## Remaining ceiling -> paramtypes agent (deployed)
ParamType was only range|color|toggle|select|file. Adding `text` (ascii custom charset) + `marker-list` (editable cobe markers, ascii lights) end to end (types.ts + validateManifest + ParamControls + TextField/MarkerListEditor primitives), wiring globe markers + ascii charset, AND fixing globe default regression (parity-interactive left demo-ish #4D4D4D/diffuse1.2/dark1; restore cobe TRUE defaults #fff/diffuse1/dark0 per Jonah's earlier choice).

## Next: verify paramtypes agent (Chrome - text input, marker add/remove, globe true-default look); then commit+push the whole parity effort.
