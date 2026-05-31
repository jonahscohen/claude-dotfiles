---
name: deploy - FULL feature-parity rebuild (complete control surface, not subset)
description: After the 1:1 code audit, Jonah caught that whole FEATURES were never ported (fractal-glass shipped 0 color controls vs the original's 5 presets + 7 color pickers; cobe missing its preset gallery/styles/labels). New mandate - COMPLETELY duplicate each original's full functional depth (every control, preset, style, color picker, toggle, label, upload), match or exceed. 5 agents deployed.
type: project
relates_to: [session_2026-05-31_fidelity-installer-results.md, feedback_tilt_lab_fidelity_mandate.md]
---

Collaborator: Jonah. 2026-05-31. Jonah, emphatic ("failure to match or exceed... will result in demotion"): the 1:1 audit was too narrow - it matched the captured SUBSET, not the original PRODUCT's full control surface. Whole features were never ported.

## Proven gap (evidence)
Original regent fractal-glass GlassParams (local /Users/spare3/Documents/Github/regent): scene with 5 built-in color PRESETS (each a 7-color theme) + scene=-1 CUSTOM mode with 7 color pickers (customBaseColor1-4 + customEnvColor1-3) + colorUtils (hex/HSL, deriveEnvColors) + savable themes. Our tilt-lab manifest: scene + tonal range sliders, ZERO color controls. The whole custom-color system was dropped. cobe: missing the cobe.vercel.app preset gallery / presentation styles / labels / editable markers.

## New mandate: COMPLETE duplication (match or exceed)
Every control, preset, style/mode, color PICKER (not range substitutes), toggle/select, label, and asset upload the original exposes must exist in tilt-lab. Shaders stay verbatim (prior pass verified); this pass adds the full CONTROL/FEATURE/PRESET surface. UI is manifest-driven, so completeness = correct manifest params (color/select/toggle/file types) + wiring + preset-apply logic.

## Team tilt-deploy - 5 parity agents
- parity-regent: fluid, mesh-gradient, halftone, fractal-glass, swarm. GOLD STANDARD = local /Users/spare3/Documents/Github/regent/app/(app)/tools/<tool>/ full Controls + types + presets + colorUtils.
- parity-mc-a: dithered-image, fake-3d-image, glass-slideshow, mc-globe, halo, infinite-gallery (+ image upload for the image effects).
- parity-mc-b: interactive-grid, lava-lamp, neural-noise, plasma-grid, specular-band, water-ripple.
- parity-gradients: grain-gradient, neuro-noise (paper.design full color set), animated-gradient (spell), ascii (ascii-magic full surface).
- parity-interactive: globe/cobe (cobe.vercel.app preset gallery + styles + editable markers + labels), particles, cursor-trail, aurora.

## MY verification bar this time (the last one was too shallow - "verified 1:1" hid missing features)
Do NOT accept agent self-reports. For each effect: (1) read the original's control surface myself, (2) diff the agent's new manifest param list against it - confirm color controls are `color` type, presets are real, counts match the original, (3) Chrome-verify the controls render + presets switch the look. Reject any effect still missing controls.
