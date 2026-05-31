---
name: deploy - 1:1 shader fidelity audit + ampersand installer overhaul
description: Deployed 6 agents (team tilt-deploy) - 5 fidelity agents auditing all 24 source-derived tilt-lab effects 1:1 against their original sources (lane briefs + local regent/cobe), and 1 installer agent overhauling install.sh to expose all features a la carte.
type: project
relates_to: [feedback_tilt_lab_fidelity_mandate.md, session_2026-05-30_commit-push.md]
---

Collaborator: Jonah. 2026-05-31. Jonah: (1) many shaders not 1:1 with original source - must replicate 1:1 top to bottom, no deviation; (2) many features never made it into the ampersand installer - update it to accommodate ALL features a la carte. "deploy agents to handle."

## Ground truth for fidelity
Recon lanes at docs/superpowers/tilt-lab-recon/lane-N-*.md captured VERBATIM source (GLSL, params, architecture) per effect. regent original is LOCAL at /Users/spare3/Documents/Github/regent; cobe is the npm package. These are the diff references.

## Team tilt-deploy (6 agents, disjoint scopes)
- fid-regent: fluid, mesh-gradient, halftone, fractal-glass, swarm (lane-1 + local /Users/spare3/Documents/Github/regent + shared lib fluid sim)
- fid-mc-a: dithered-image, fake-3d-image, glass-slideshow, mc-globe, halo, infinite-gallery (lane-8a/8b)
- fid-mc-b: interactive-grid, lava-lamp, neural-noise, plasma-grid, specular-band, water-ripple (lane-8a/8b)
- fid-gradients: grain-gradient, neuro-noise (lane-2), animated-gradient (lane-3), ascii (lane-9)
- fid-interactive: globe/cobe (lane-4 + cobe npm), particles/casberry (lane-5), cursor-trail/unlumen (lane-6), aurora/unlumen (lane-7)
- installer: install.sh overhaul - inventory all features, add missing as a la carte components

Each fidelity agent: line-by-line compare effect vs original, fix EVERY deviation (params/uniforms/defaults/GLSL/passes/constants) to exact 1:1, keep only the tilt-lab Effect wrapper. Verify tsc 0 + npm test. Report per-effect deviations found+fixed. Lead (me) verifies in Chrome after.

## Setup snag (resolved): team-state desync - leftover tt-justify blocked TeamDelete of tilt-tasks; in-memory "leading tilt-tasks" persisted after the on-disk config cleared. First spawn batch raced (1 ok, 5 "team does not exist"). Resolved: TeamDelete cleared the stale lead state, created fresh team tilt-deploy, re-spawned all 6 clean.
