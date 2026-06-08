---
name: tilt-lab asset delivery WIRED (the real functional gap closed)
description: asset-core wired real asset delivery into the runtime - 9 assets.ts modules, effect-assets registry, compositor/element pass real assets, esbuild dataurl loader, 10 generated sample images. tsc+vitest+both-bundlers green. Effects now receive real content instead of fallbacks.
type: project
relates_to: [session_2026-05-29_tilt-lab-asset-gap-FAILURE.md, session_2026-05-29_tilt-lab-restore-DONE.md]
superseded_by: session_2026-06-05_tilt-lab-consolidated.md
---

Collaborator: Jonah. 2026-05-29. tilt-assets team, task #1 (asset-core) done.

## Wired
- runtime/effects/<id>/assets.ts for all 9 asset effects (exact requiredAssets keys).
- runtime/effect-assets.ts: central effectAssets registry (own module = acyclic dep graph; index.ts re-exports it).
- compositor.ts + element.ts: pass `assets: effectAssets[id] ?? {}` (init + mount). Effects with no assets still get {} (procedural fallback).
- build.js: esbuild png/jpg dataurl loader -> self-contained bundle.
- KEY FIX (agent caught my brief's bad assumption): `new URL('./x.png', import.meta.url)` is NOT transformed by esbuild (any loader) -> would deliver nothing. Switched to default image imports (`import x from './assets/x.png'`) which esbuild inlines as base64 AND Vite resolves natively. Added runtime/assets.d.ts ambient png/jpg decls.
- 10 generated sample PNGs (scripts/gen-sample-assets.mjs, 384x384, distinct photo-like; fake-3d depth.png = grayscale radial depth): dithered-image/src, fake-3d color+depth, interactive-grid/image, glass-slideshow image0/1, infinite-gallery image0/1/2, water-ripple/image.

## Verified (build-level)
tsc exit 0; vitest 133/133; node build.js (17 inlined base64 PNGs, 0 broken refs); vite build app OK.

## Next
- task #2 asset-verify: make tilt-verify run canvas-paint on the 9 (no longer skip) + re-validate; report PASS counts.
- team-lead: Claude-in-Chrome REAL-CONTENT check - confirm dithered-image dithers the sphere, glass-slideshow shows ocean/desert slides, globe shows land mask, cursor-trail trails item images, etc. THEN the directive is complete.

## Chrome real-content CONFIRMED (team-lead)
Reloaded playground after asset wiring. Dithered Image now renders REAL content: the warm-sphere sample image with a visible Bayer dither dot-matrix pattern (vs the placeholder before) + full params (ditherMap/pixelSize/threshold/color/backgroundColor). Asset delivery WORKS end-to-end in the live playground. ASCII confirmed full param set incl restored 3d/disco/shapes knobs (renders black ALONE = correct, post needs a base layer beneath). asset-verify agent running the breadth canvas-paint check on all 9.

## Files
- runtime/effects/<9>/assets.ts + assets/*.png, runtime/effect-assets.ts, runtime/assets.d.ts, runtime/index.ts, runtime/compositor.ts, runtime/element.ts, build.js, scripts/gen-sample-assets.mjs
