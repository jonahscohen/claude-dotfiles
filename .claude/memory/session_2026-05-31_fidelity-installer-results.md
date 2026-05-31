---
name: RESULTS - 1:1 shader fidelity audit + installer overhaul (6-agent deploy)
description: All 6 tilt-deploy agents complete. Fidelity fixes landed on ascii/globe/mc-globe/fluid/swarm/fractal-glass; everything else verified already 1:1. Installer overhauled (skills a la carte, dangling hooks fixed, sidecoach + crash bugs fixed) + tilt-lab added as a dev component. Build green, key effects Chrome-verified.
type: project
relates_to: [session_2026-05-31_fidelity-installer-deploy.md, feedback_tilt_lab_fidelity_mandate.md, session_2026-05-31_node-options-shim-fix.md]
---

Collaborator: Jonah. 2026-05-31. team tilt-deploy (6 agents).

## Fidelity fixes (validated Jonah's concern - real breaks found)
- ascii (fid-gradients): 5 tunable params silently dropped in port (bgMode/bgBlur/bgOpacity/blendMode/dotGrid) -> restored. dotGrid behavior reimplemented (proprietary, not captured) - faint per-cell grid.
- globe/cobe (fid-interactive): defaults were README demo values, not cobe's library defaults -> corrected (mapSamples 16000->10000, mapBrightness 6->1, diffuse 1.2->1, dark 1->0, baseColor->#fff, markerColor->#ff8000). Renders light sphere (1:1). Jonah chose to KEEP true defaults.
- mc-globe (fid-mc-a): whole display-transform shader layer dropped (uDisplayScale/Offset/Rotation + helpers) + fabricated `radius` param (caused compile errors) -> restored from upstream MIT source; real scale/offsetX/offsetY/rotation props. Chrome-verified (dark globe, orange continents + atmosphere).
- fluid (fid-regent): shaders parameterized where original hardcodes + final blit changed copy->additive -> reverted verbatim (0.999/0.015/dye consts, NEAREST/LINEAR filters, copy blit).
- swarm (fid-regent): shape geometry simplified -> restored verbatim.
- fractal-glass (fid-regent): manifest ranges off -> matched FractalGlassControls.
- Already 1:1 (verified, no change): mesh-gradient, halftone, dithered-image, fake-3d-image, glass-slideshow, halo, infinite-gallery, interactive-grid, lava-lamp, neural-noise, plasma-grid, specular-band, water-ripple, grain-gradient, neuro-noise, animated-gradient, particles, cursor-trail, aurora.
- Benign supersets (not deviations): glass-slideshow 9 uniforms (brief tabled 4), plasma-grid exposes hardcoded speed. Ports (framework-adapted, verbatim params/timing/shaders): cursor-trail (React/Framer->vanilla DOM), particles (proprietary reimpl).

## Build: tsc 0, npm test 160/160 pass (from tilt-lab root). FOLLOW-UP: 7-test delta (160 vs earlier 167) from fluid-solver.test.ts reduction during the shared GPU-sim migration - confirm those tests weren't meaningful.

## Installer (installer agent)
- Found: design skills only installable as monolith bundle; QA/enforcement hooks wired in settings.json but NEVER copied to disk (dangling at runtime); sidecoach missing from detect/deactivate; 2 latent crash bugs (SETTINGS_JSON/log undefined under set -u). All fixed.
- Added 11 a la carte skill components + (per Jonah) tilt-lab as a dev component (bin/tilt-lab-launcher.sh symlinked to ~/.local/bin/tilt-lab; npm install idempotent; `tilt-lab` runs the playground at :5180; build/test/verify subcommands). 26 aligned components.
- Jonah decisions: globe keep true defaults; tilt-lab YES (added); justify KEEP --personal (untouched).
- Verified: bash -n clean, shellcheck -S error none, --dry-run --only resolves, --help lists tilt-lab.

## Also fixed this session: cmux NODE_OPTIONS restore shim (see node-options beat).
## Next: stand down 6 agents + TeamDelete; offer commit+push of all of the above.
